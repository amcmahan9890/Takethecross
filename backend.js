/* Take the Cross - backend.js
   All communication with Supabase (accounts + database) and the optional /api/ai endpoint lives here.
   app.js only talks to window.Backend. Only the PUBLIC Supabase URL + publishable/anon key are used.
   Security comes from Row Level Security and the SQL functions in schema.sql, not from hiding this file. */
(function () {
  "use strict";

  var cfg = window.TTC_CONFIG || {};
  var B = {
    configured: !!(cfg.supabaseUrl && cfg.supabaseAnonKey && window.supabase && typeof window.supabase.createClient === "function"),
  };
  window.Backend = B;
  if (!B.configured) return;

  var sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: "ttc-auth" },
  });
  B.client = sb;

  /* ---------- helpers ---------- */
  function fail(error) {
    if (!error) return;
    var e = new Error(error.message || "Request failed");
    e.code = error.code || "";
    e.status = error.status;
    throw e;
  }
  function notSignedIn() {
    var e = new Error("not signed in");
    e.code = "not_signed_in";
    return e;
  }
  async function uid() {
    var r = await sb.auth.getSession();
    var s = r && r.data && r.data.session;
    if (!s) throw notSignedIn();
    return s.user.id;
  }
  function ms(ts) {
    var t = ts ? Date.parse(ts) : NaN;
    return isFinite(t) ? t : Date.now();
  }
  var PROFILE_COLS = "id,display_name,avatar,xp,days_done,stats";

  /* ---------- live queries ----------
     Runs the fetcher now, again when Realtime reports a change, after this user's own writes, when the tab
     becomes visible, and on a slow timer (so the data still refreshes if Realtime is switched off). */
  var watchers = new Set();
  function bump() {
    watchers.forEach(function (w) { w.soon(); });
  }
  function live(tables, fetcher, cb, opt) {
    opt = opt || {};
    var stopped = false, timer = null, running = false, again = false;
    function run() {
      if (stopped) return Promise.resolve();
      if (running) { again = true; return Promise.resolve(); }
      running = true;
      return Promise.resolve()
        .then(fetcher)
        .then(function (rows) { if (!stopped) cb(rows); })
        .catch(function () {})
        .then(function () {
          running = false;
          if (again && !stopped) { again = false; run(); }
        });
    }
    function soon() { clearTimeout(timer); timer = setTimeout(run, 200); }
    function kick() { clearTimeout(timer); timer = setTimeout(run, opt.debounce || 350); }
    var entry = { soon: soon };
    watchers.add(entry);
    run();
    var ch = null;
    try {
      ch = sb.channel("ttc-" + Math.random().toString(36).slice(2));
      tables.forEach(function (t) {
        ch.on("postgres_changes", { event: "*", schema: "public", table: t }, kick);
      });
      ch.subscribe();
    } catch (e) { ch = null; }
    var poll = setInterval(function () { if (document.visibilityState === "visible") run(); }, opt.poll || 40000);
    function vis() { if (document.visibilityState === "visible") run(); }
    document.addEventListener("visibilitychange", vis);
    return function stop() {
      stopped = true;
      watchers.delete(entry);
      clearTimeout(timer);
      clearInterval(poll);
      document.removeEventListener("visibilitychange", vis);
      try { if (ch) sb.removeChannel(ch); } catch (e) {}
    };
  }

  /* ---------- accounts ---------- */
  B.onAuth = function (cb) {
    var r = sb.auth.onAuthStateChange(function (event, session) { cb(event, session); });
    return function () { try { r.data.subscription.unsubscribe(); } catch (e) {} };
  };
  B.getSession = async function () {
    var r = await sb.auth.getSession();
    fail(r.error);
    return r.data.session;
  };
  B.sendCode = async function (email) {
    var r = await sb.auth.signInWithOtp({ email: email, options: { shouldCreateUser: true, emailRedirectTo: location.origin + "/" } });
    fail(r.error);
  };
  B.verifyCode = async function (email, token) {
    var r = await sb.auth.verifyOtp({ email: email, token: token, type: "email" });
    if (r.error) {
      var r2 = await sb.auth.verifyOtp({ email: email, token: token, type: "signup" });
      if (!r2.error) r = r2;
    }
    fail(r.error);
    return r.data.session;
  };
  B.signOut = async function () { await sb.auth.signOut(); };
  B.deleteAccount = async function () {
    var r = await sb.rpc("delete_my_account");
    fail(r.error);
  };
  B.isAdmin = async function () {
    try {
      var r = await sb.rpc("is_admin");
      return !r.error && r.data === true;
    } catch (e) { return false; }
  };
  B.publicCount = async function () {
    try {
      var r = await sb.from("profiles").select("id", { count: "exact", head: true });
      return r.error ? null : r.count;
    } catch (e) { return null; }
  };

  /* ---------- my profile + progress ---------- */
  B.loadMe = async function () {
    var id = await uid();
    var res = await Promise.all([
      sb.from("profiles").select(PROFILE_COLS).eq("id", id).maybeSingle(),
      sb.from("progress").select("data,updated_at").eq("user_id", id).maybeSingle(),
    ]);
    fail(res[0].error);
    fail(res[1].error);
    return { profile: res[0].data, data: res[1].data ? res[1].data.data : null };
  };
  B.savePlayer = async function (p) {
    var r = await sb.rpc("save_player", { p_name: p.name, p_avatar: p.avatar, p_stats: p.stats, p_data: p.data });
    fail(r.error);
    bump();
  };
  B.touch = async function () {
    var r = await sb.rpc("touch_activity");
    fail(r.error);
  };

  /* ---------- shared, live data ---------- */
  B.watchPlayers = function (cb) {
    return live(["profiles"], async function () {
      var r = await sb.from("profiles").select(PROFILE_COLS)
        .order("xp", { ascending: false }).order("days_done", { ascending: false }).limit(200);
      fail(r.error);
      return r.data || [];
    }, cb, { debounce: 1500, poll: 60000 });
  };
  B.fetchProfiles = async function (ids) {
    if (!ids || !ids.length) return [];
    var r = await sb.from("profiles").select(PROFILE_COLS).in("id", ids.slice(0, 100));
    fail(r.error);
    return r.data || [];
  };
  B.watchPrayers = function (cb) {
    return live(["prayers"], async function () {
      var r = await sb.from("prayers").select("id,user_id,body,answered,created_at")
        .order("created_at", { ascending: false }).limit(60);
      fail(r.error);
      return (r.data || []).map(function (x) {
        return { id: x.id, uid: x.user_id, text: x.body, answered: !!x.answered, at: ms(x.created_at) };
      });
    }, cb);
  };
  B.watchReactions = function (scope, cb) {
    return live(["reactions"], async function () {
      var r = await sb.from("reactions").select("target,user_id,created_at").eq("scope", scope).limit(2000);
      fail(r.error);
      return (r.data || []).map(function (x) {
        return { id: x.target + "~" + x.user_id, scope: scope, target: x.target, from: x.user_id, at: ms(x.created_at) };
      });
    }, cb);
  };
  B.watchCheers = function (date, cb) {
    return live(["cheers"], async function () {
      var r = await sb.from("cheers").select("to_user,from_user,kind,created_at").eq("sent_on", date).limit(2000);
      fail(r.error);
      return (r.data || []).map(function (x) {
        return { id: "ch~" + x.to_user + "~" + x.from_user + "~" + date, to: x.to_user, from: x.from_user, kind: x.kind, at: ms(x.created_at) };
      });
    }, cb);
  };
  B.watchDay = function (n, cb) {
    return live(["days"], async function () {
      var r = await sb.from("days").select("content").eq("day", n).maybeSingle();
      fail(r.error);
      return r.data ? r.data.content : null;
    }, cb);
  };
  B.watchComments = function (n, cb) {
    return live(["comments"], async function () {
      var r = await sb.from("comments").select("id,user_id,body,created_at").eq("day", n)
        .order("created_at", { ascending: true }).limit(200);
      fail(r.error);
      return (r.data || []).map(function (x) {
        return { id: x.id, uid: x.user_id, text: x.body, at: ms(x.created_at) };
      });
    }, cb);
  };
  B.watchAnswers = function (n, cb) {
    return live(["reflections"], async function () {
      var r = await sb.from("reflections").select("user_id,answers,takeaway,updated_at").eq("day", n).limit(500);
      fail(r.error);
      return (r.data || []).map(function (x) {
        return { uid: x.user_id, answers: Array.isArray(x.answers) ? x.answers : [], takeaway: x.takeaway || "", at: ms(x.updated_at) };
      });
    }, cb);
  };

  /* ---------- writes ---------- */
  B.saveDay = async function (n, content) {
    var r = await sb.rpc("save_day", { p_day: n, p_content: content });
    fail(r.error);
    bump();
  };
  B.getJournal = async function (n) {
    var id = await uid();
    var r = await sb.from("journal").select("data").eq("user_id", id).eq("day", n).maybeSingle();
    fail(r.error);
    return r.data ? r.data.data : null;
  };
  B.saveJournal = async function (n, data) {
    var id = await uid();
    var r = await sb.from("journal").upsert(
      { user_id: id, day: n, data: data, updated_at: new Date().toISOString() },
      { onConflict: "user_id,day" }
    );
    fail(r.error);
  };
  B.addComment = async function (day, text) {
    var id = await uid();
    var r = await sb.from("comments").insert({ day: day, user_id: id, body: text });
    fail(r.error);
    bump();
  };
  B.deleteComment = async function (cid) {
    var r = await sb.from("comments").delete().eq("id", cid);
    fail(r.error);
    bump();
  };
  B.shareAnswers = async function (day, v) {
    var id = await uid();
    var r = await sb.from("reflections").upsert(
      { day: day, user_id: id, answers: v.answers || [], takeaway: v.takeaway || "", updated_at: new Date().toISOString() },
      { onConflict: "day,user_id" }
    );
    fail(r.error);
    bump();
  };
  B.unshareAnswers = async function (day) {
    var id = await uid();
    var r = await sb.from("reflections").delete().eq("day", day).eq("user_id", id);
    fail(r.error);
    bump();
  };
  B.toggleReaction = async function (scope, target, has) {
    var id = await uid();
    var r = has
      ? await sb.from("reactions").delete().eq("target", target).eq("user_id", id)
      : await sb.from("reactions").insert({ scope: scope, target: target, user_id: id });
    fail(r.error);
    bump();
  };
  B.sendCheer = async function (to, kind, date) {
    var id = await uid();
    var r = await sb.from("cheers").upsert(
      { to_user: to, from_user: id, sent_on: date, kind: kind },
      { onConflict: "to_user,from_user,sent_on" }
    );
    fail(r.error);
    bump();
  };
  B.addPrayer = async function (text) {
    var id = await uid();
    var r = await sb.from("prayers").insert({ user_id: id, body: text });
    fail(r.error);
    bump();
  };
  B.setPrayerAnswered = async function (pid, answered) {
    var r = await sb.from("prayers").update({ answered: !!answered }).eq("id", pid);
    fail(r.error);
    bump();
  };
  B.deletePrayer = async function (pid) {
    var r = await sb.from("prayers").delete().eq("id", pid);
    fail(r.error);
    bump();
  };

  /* ---------- admin (checked again on the server by is_admin()) ---------- */
  B.adminOverview = async function () {
    var r = await sb.rpc("admin_overview");
    fail(r.error);
    return r.data;
  };
  B.adminUsers = async function (limit, offset) {
    var r = await sb.rpc("admin_users", { p_limit: limit, p_offset: offset });
    fail(r.error);
    return r.data || [];
  };

  /* ---------- optional study-guide + feedback service (/api/ai) ---------- */
  B.aiStatus = async function () {
    try {
      var res = await fetch("/api/ai", { method: "GET", cache: "no-store" });
      if (!res.ok) return false;
      var j = await res.json();
      return !!(j && j.enabled);
    } catch (e) { return false; }
  };
  async function aiCall(task, payload) {
    var session = await B.getSession();
    if (!session) throw notSignedIn();
    var res;
    try {
      res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + session.access_token },
        body: JSON.stringify(Object.assign({ task: task }, payload)),
      });
    } catch (e) {
      var off = new Error("offline");
      off.code = "offline";
      throw off;
    }
    var j = null;
    try { j = await res.json(); } catch (e) {}
    if (!res.ok || !j || j.ok === false) {
      var err = new Error((j && j.error) || "request failed");
      err.code = (j && j.error) || "http_" + res.status;
      throw err;
    }
    return j;
  }
  B.aiStudyGuide = async function (p) { return (await aiCall("study_guide", p)).data; };
  B.aiFeedback = async function (p) { return (await aiCall("feedback", p)).text; };
})();
