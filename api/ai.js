// Optional: daily study guide (recap, key verse, map, quiz) and reflection feedback.
//
// This endpoint is OFF until you set AI_API_KEY and AI_MODEL in Vercel. While it is off,
// the rest of the app works normally (GET /api/ai reports { enabled: false }).
//
// It talks to any provider that offers an OpenAI-compatible "chat completions" API.
//   AI_API_KEY     your provider key (secret - lives only in Vercel)
//   AI_MODEL       the model name your provider gives you
//   AI_API_URL     optional, default https://api.openai.com/v1/chat/completions
//   AI_DAILY_LIMIT optional, max AI requests per signed-in user per day (default 20)
//
// Safety: callers must be signed in (verified against Supabase), prompts are built here on the
// server from validated inputs (callers cannot send their own prompt), and a per-user daily
// limit is enforced by the use_ai_quota() SQL function.

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "";
const AI_URL = process.env.AI_API_URL || "https://api.openai.com/v1/chat/completions";
const AI_KEY = process.env.AI_API_KEY || "";
const AI_MODEL = process.env.AI_MODEL || "";
const DAILY = Math.max(1, parseInt(process.env.AI_DAILY_LIMIT || "20", 10) || 20);

const enabled = () => !!(AI_KEY && AI_MODEL && SUPABASE_URL && SUPABASE_KEY);

function str(v, max) {
  return typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max) : "";
}
function strList(v, n, max) {
  return Array.isArray(v) ? v.slice(0, n).map((x) => str(x, max)) : [];
}

function studyGuidePrompt(day, period, readings) {
  return `A group of Christian friends (mostly Catholic, some not) listens to one episode a day of "The Bible in a Year" podcast with Fr. Mike Schmitz (Ascension), which follows the Great Adventure Bible Timeline reading plan. Build the study guide for Day ${day}, which falls in the ${period || "current"} period of the Bible Timeline.
${readings ? `The readings for Day ${day} are: ${readings}. Use exactly these passages.` : `Use the passages assigned to Day ${day} in that plan. If you're not certain which they are, give your best guess and add "(best guess)" to the readings field.`}
Everything must come from these same readings so the pieces fit together: the recap explains what happens, the key verse is the heart of it, the map shows where it happens, and the quiz and questions test and deepen the same material.

Reply with only JSON in this shape:
{"readings":"Genesis 1-2; Psalm 19",
"period":"${period || "Early World"}",
"recap":"3 to 4 plain sentences on what happens in today's readings",
"verse":{"ref":"Genesis 1:27","text":"the verse quoted from the World English Bible (public domain)"},
"verseWhy":"one sentence on why this verse is the key to today's reading",
"places":[{"name":"Mesopotamia","lat":33.0,"lon":44.0}],
"journey":false,
"placeWhy":"one sentence on why this place matters in today's reading",
"questions":["recall question","understanding question about what it reveals about God or how it points to Christ","probing personal question about applying it this week"],
"quiz":[{"q":"question","options":["A","B","C","D"],"answer":0,"why":"one sentence explanation"}]}
Rules: 1 to 3 places, first one most important, real coordinates; set journey true only if the reading follows travel from place to place, listing places in travel order. Exactly 5 quiz questions, 4 options each, answer is the 0-based index of the correct option, vary which index is correct, answerable from today's readings. Keep the tone warm and welcoming to Christians of any background.`;
}

function feedbackPrompt(b) {
  const qa = b.questions.map((q, i) => `Q${i + 1}: ${q}\nAnswer: ${b.answers[i] || "(skipped)"}`).join("\n\n");
  return `You are a warm, knowledgeable Bible study partner for a friend doing "The Bible in a Year" with Fr. Mike Schmitz. Draw on Scripture and the Catholic tradition Fr. Mike teaches from, while staying welcoming to Christians of any background.
Day ${b.day}. Readings: ${b.readings || "unspecified"}. Recap: ${b.recap}
Key verse: ${b.verseRef ? b.verseRef + " \u2014 " + b.verseText : ""}
Their answers:

${qa}

What stuck with them from Fr. Mike's episode: ${b.takeaway || "(not given)"}

Respond to them directly. Affirm what they got right, gently correct anything inaccurate, connect their thoughts to the key verse, and add one insight that deepens it. End with one probing follow-up question for them to sit with today.
Under 170 words, plain text, no headings or bullet points.`;
}

async function callModel(prompt) {
  const r = await fetch(AI_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: "Bearer " + AI_KEY },
    body: JSON.stringify({ model: AI_MODEL, messages: [{ role: "user", content: prompt }] }),
  });
  let j = null;
  try { j = await r.json(); } catch (e) { /* ignore */ }
  if (!r.ok || !j) throw new Error("provider_" + r.status);
  const t = j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  if (!t) throw new Error("provider_empty");
  return String(t);
}

function parseJson(text) {
  const a = text.indexOf("{");
  const b = text.lastIndexOf("}");
  if (a < 0 || b <= a) throw new Error("bad_output");
  return JSON.parse(text.slice(a, b + 1));
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "GET") return res.status(200).json({ enabled: enabled() });
  if (req.method !== "POST") return res.status(405).json({ ok: false, error: "method" });
  if (!enabled()) return res.status(503).json({ ok: false, error: "not_configured" });

  try {
    // 1. Must be a signed-in user (token verified by Supabase)
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "").trim();
    if (!token) return res.status(401).json({ ok: false, error: "not_signed_in" });
    const who = await fetch(SUPABASE_URL + "/auth/v1/user", {
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token },
    });
    if (!who.ok) return res.status(401).json({ ok: false, error: "not_signed_in" });

    // 2. Per-user daily limit
    const q = await fetch(SUPABASE_URL + "/rest/v1/rpc/use_ai_quota", {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: "Bearer " + token, "Content-Type": "application/json" },
      body: JSON.stringify({ p_limit: DAILY }),
    });
    const allowed = q.ok ? await q.json() : false;
    if (allowed !== true) return res.status(429).json({ ok: false, error: "quota" });

    // 3. Validate input and build the prompt on the server
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {};
    const day = parseInt(body.day, 10);
    if (!(day >= 1 && day <= 365)) return res.status(400).json({ ok: false, error: "bad_input" });

    if (body.task === "study_guide") {
      const period = str(body.period, 40).replace(/[^A-Za-z &'-]/g, "");
      const readings = str(body.readings, 200);
      const data = parseJson(await callModel(studyGuidePrompt(day, period, readings)));
      return res.status(200).json({ ok: true, data });
    }

    if (body.task === "feedback") {
      const v = body.verse && typeof body.verse === "object" ? body.verse : {};
      const input = {
        day,
        readings: str(body.readings, 200),
        recap: str(body.recap, 1200),
        verseRef: str(v.ref, 40),
        verseText: str(v.text, 600),
        questions: strList(body.questions, 5, 300),
        answers: strList(body.answers, 5, 1500),
        takeaway: str(body.takeaway, 1500),
      };
      if (!input.questions.length) return res.status(400).json({ ok: false, error: "bad_input" });
      const text = (await callModel(feedbackPrompt(input))).trim().slice(0, 2000);
      return res.status(200).json({ ok: true, text });
    }

    return res.status(400).json({ ok: false, error: "bad_input" });
  } catch (e) {
    const code = String((e && e.message) || "");
    return res.status(code === "bad_output" ? 502 : 500).json({ ok: false, error: code === "bad_output" ? "bad_output" : "unavailable" });
  }
};
