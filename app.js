
/* Take the Cross - app logic. All data access lives in backend.js (window.Backend). */
"use strict";
const APP_NAME = "Take the Cross";
const APP_URL = "https://www.takethecross.app";
/* ---------- constants ---------- */
const TOTAL = 365;
const FALLBACK_Q = [
  "What stood out to you most in today's reading?",
  "What does this reading show you about God and his plan?",
  "What is one way you can live this out today or this week?"
];
const CLASSES = [
  {id:"crusader",name:"Crusader"},{id:"friar",name:"Friar"},{id:"pilgrim",name:"Pilgrim"},{id:"priest",name:"Priest"},{id:"nun",name:"Sister"},
  {id:"disciple",name:"Disciple"},{id:"shepherd",name:"Shepherd"},{id:"fisher",name:"Fisherman"},{id:"psalmist",name:"Psalmist"},{id:"believer",name:"Believer"}
];
const COLORS = ["#A32626","#2F4F9A","#2E6B45","#6A3E8C","#8A5A2B","#1E1E26"];
const SKINS = ["#F2D2B6","#D9A77E","#A86F48","#6B4329"];
const RANKS = [[0,"Seeker"],[100,"Squire"],[400,"Knight"],[1000,"Paladin"],[2000,"Champion"],[3500,"Apostle"],[6000,"Saint"]];
const CHEERS = [{id:"amen",t:"Amen"},{id:"go",t:"Keep going"},{id:"pray",t:"Praying for you"},{id:"proud",t:"Proud of you"}];

const CARDS = [
  {id:"vigil",name:"Night Vigil",req:"Unlocked from the start",test:s=>true},
  {id:"desert",name:"Desert Road",req:"Finish 14 days",test:s=>s.done>=14},
  {id:"rose",name:"Rose Window",req:"Reach a 7-day streak",test:s=>s.best>=7},
  {id:"scholar",name:"Scribe's Desk",req:"Get 3 perfect quizzes",test:s=>s.perfects>=3},
  {id:"jubilee",name:"Jubilee Gold",req:"Reach a 30-day streak",test:s=>s.best>=30},
  {id:"kingdom",name:"Kingdom Banner",req:"Finish 60 days",test:s=>s.done>=60},
  {id:"upper",name:"Upper Room",req:"Win 3 weekly team challenges",test:s=>s.wins>=3},
  {id:"cathedral",name:"Cathedral Nave",req:"Write 25 reflections",test:s=>s.refl>=25},
  {id:"prophet",name:"Prophet's Fire",req:"Finish 150 days",test:s=>s.done>=150},
  {id:"jerusalem",name:"New Jerusalem",req:"Finish all 365 days",test:s=>s.done>=365}
];
const EMBLEMS = [
  {id:"first",name:"First Light",glyph:"\u271D\uFE0E",req:"Finish Day 1",test:s=>s.done>=1,c:"#2F4F9A"},
  {id:"s3",name:"Third Day",glyph:"III",req:"3-day streak",test:s=>s.best>=3,c:"#2E6B45"},
  {id:"think",name:"Lectio",glyph:"✎",req:"Write your first reflection",test:s=>s.refl>=1,c:"#8A5A2B"},
  {id:"sharp",name:"Sharp Mind",glyph:"5/5",req:"Get a perfect quiz",test:s=>s.perfects>=1,c:"#2E6B45"},
  {id:"s7",name:"Sabbath Keeper",glyph:"VII",req:"7-day streak",test:s=>s.best>=7,c:"#6A3E8C"},
  {id:"habit",name:"Weekly Habit",glyph:"\u2713",req:"Reach 4 weekly goals",test:s=>s.solo>=4,c:"#2E6B45"},
  {id:"team",name:"Fellowship",glyph:"\u2694\uFE0E",req:"Win a weekly team challenge",test:s=>s.wins>=1,c:"#A32626"},
  {id:"cheer",name:"Encourager",glyph:"\u2665\uFE0E",req:"Send 10 encouragements",test:s=>s.cheers>=10,c:"#8E2B5A"},
  {id:"pray",name:"Intercessor",glyph:"✦",req:"Pray for 10 requests",test:s=>s.prayed>=10,c:"#2F4F9A"},
  {id:"d40",name:"Forty Days",glyph:"XL",req:"Finish 40 days",test:s=>s.done>=40,c:"#A32626"},
  {id:"s30",name:"Faithful Month",glyph:"✠",req:"30-day streak",test:s=>s.best>=30,c:"#A32626"},
  {id:"d100",name:"Centurion",glyph:"C",req:"Finish 100 days",test:s=>s.done>=100,c:"#1E1E26"},
  {id:"half",name:"Halfway Home",glyph:"½",req:"Finish 183 days",test:s=>s.done>=183,c:"#2F4F9A"},
  {id:"s100",name:"Unbroken",glyph:"☩",req:"100-day streak",test:s=>s.best>=100,c:"#6A3E8C"},
  {id:"all",name:"Alpha and Omega",glyph:"ΑΩ",req:"Finish all 365 days",test:s=>s.done>=365,c:"#94701F"}
];
const CHALLENGES = [
  {id:"ep",t:"Finish 5 episodes",unit:"episodes",goal:5,f:a=>a.ep,tm:t=>t.ep,tt:"episodes finished together"},
  {id:"ad",t:"Read on 4 different days",unit:"days",goal:4,f:a=>a.ad,tm:t=>t.ad,tt:"reading days together"},
  {id:"rf",t:"Write 3 reflections",unit:"reflections",goal:3,f:a=>a.rf,tm:t=>t.rf,tt:"reflections written together"}
];
const MILESTONES = [[50,"50","Mustard Seed"],[100,"100","Loaves and Fishes"],[250,"250","Cloud of Witnesses"],[500,"500","Twelve Baskets"],
  [1000,"1K","Pentecost"],[2500,"2.5K","Mighty Fortress"],[5000,"5K","Cathedral"],[10000,"10K","New Jerusalem"]];

/* ---------- state ---------- */
const S = {uid:null,session:null,email:"",local:false,me:null,players:{},extra:{},tab:"today",viewDay:null,readOnly:false,booted:false,
  isAdmin:false,ai:false,authModal:null,liveStops:[],
  day:{n:null,doc:undefined,comments:[],answers:{},rx:[],unsubs:[]}, journal:{}, prayers:[], prayRx:[], cheers:[], quizSel:{},
  cheerOpen:null, redoDay:null, busy:{}, winPending:null, soloPending:null, mapView:"auto", team:null, teamCache:{}, teamLoading:{}, frozeChecked:false, saving:0};

/* ---------- utils ---------- */
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const pad=n=>String(n).padStart(2,"0");
const dstr=d=>d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());
const today=()=>dstr(new Date());
function parseD(ds){const [y,m,d]=ds.split("-").map(Number);return new Date(y,m-1,d)}
function shift(ds,n){const x=parseD(ds);x.setDate(x.getDate()+n);return dstr(x)}
function weekStart(ds){const x=parseD(ds);const wd=(x.getDay()+6)%7;x.setDate(x.getDate()-wd);return dstr(x)}
function inWeek(ds,ws){return ds>=ws&&ds<=shift(ws,6)}
function ago(t){const s=(Date.now()-t)/1000;if(s<60)return"just now";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago"}
function ytLink(n){return"https://www.youtube.com/results?search_query="+encodeURIComponent("Bible in a Year Day "+n+" Fr. Mike Schmitz 2026")}
function releaseDate(n){return new Date(2026,0,n)}
function episodeUrl(n){return releaseDate(n)<=new Date()?"https://bibleinayear.fireside.fm/day-"+n+"-2026":null}
const YT_RE=/^https?:\/\/(www\.|m\.)?(youtube\.com\/(watch\?(.*&)?v=|live\/|shorts\/)|youtu\.be\/)[\w-]{11}/;
function lsGet(k){try{const v=localStorage.getItem(k);return v?JSON.parse(v):null}catch(e){return null}}
function lsSet(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
const getP=uid=>S.players[uid]||S.extra[uid]||null;
const nameOf=uid=>(getP(uid)&&getP(uid).name)||"Someone";
const pl=(n,w)=>n+" "+w+(n===1?"":"s");

function currentStreak(dates){
  const set=new Set(dates||[]);let d=today();
  if(!set.has(d))d=shift(d,-1);
  let n=0;while(set.has(d)){n++;d=shift(d,-1)}
  return n;
}
function longestRun(dates){
  const arr=[...new Set(dates||[])].sort();let best=0,run=0,prev=null;
  for(const d of arr){run=(prev&&shift(prev,1)===d)?run+1:1;best=Math.max(best,run);prev=d}
  return best;
}
/* Other people arrive as a small public summary (p.sum). My own doc is the full private record. */
const isFull=p=>Array.isArray(p.completed);
const numIn=(v,max)=>{v=+v;return Number.isFinite(v)?Math.max(0,Math.min(max,Math.floor(v))):0};
const dateOk=v=>typeof v==="string"&&/^\d{4}-\d{2}-\d{2}$/.test(v)?v:"";
function normalizeSum(r){
  r=r&&typeof r==="object"?r:{};const wk={};
  if(r.wk&&typeof r.wk==="object")for(const k of Object.keys(r.wk).slice(0,6)){
    if(!dateOk(k))continue;const w=r.wk[k]||{};
    wk[k]={ep:numIn(w.ep,400),rf:numIn(w.rf,400),qp:numIn(w.qp,4000),ad:numIn(w.ad,7)};
  }
  return{xp:numIn(r.xp,1e6),done:numIn(r.done,365),streak:numIn(r.streak,400),streakThru:dateOk(r.streakThru),best:numIn(r.best,400),
    refl:numIn(r.refl,400),qp:numIn(r.qp,4000),perfects:numIn(r.perfects,400),wins:numIn(r.wins,60),solo:numIn(r.solo,60),cheers:numIn(r.cheers,1e6),
    prayed:numIn(r.prayed,1e6),freezes:numIn(r.freezes,3),next:Math.max(1,numIn(r.next,365)),last:dateOk(r.last),wk};
}
function statsFromSum(m){
  const alive=m.streakThru&&m.streakThru>=shift(today(),-1),streak=alive?m.streak:0;
  return{done:m.done,streak,best:Math.max(m.best,streak),refl:m.refl,qp:m.qp,perfects:m.perfects,wins:m.wins,solo:m.solo,xp:m.xp,cheers:m.cheers,prayed:m.prayed,freezes:m.freezes};
}
function computeSummary(p){
  const s0=stats(p),all=new Set([...(p.dates||[]),...(p.frozen||[])]);
  const dates=(p.dates||[]).slice().sort(),ws=weekStart(today()),wk={};
  [0,-7,-14].forEach(o=>{const w=shift(ws,o);wk[w]=weekActivity(p,w)});
  return{xp:s0.xp,done:s0.done,streak:s0.streak,streakThru:s0.streak?(all.has(today())?today():shift(today(),-1)):"",best:s0.best,refl:s0.refl,
    qp:s0.qp,perfects:s0.perfects,wins:s0.wins,solo:s0.solo,cheers:s0.cheers,prayed:s0.prayed,freezes:s0.freezes,next:nextDay(p),
    last:dates.length?dates[dates.length-1]:"",wk,card:p.card||"vigil",emblem:p.emblem||""};
}
const finishedToday=p=>isFull(p)?(p.dates||[]).includes(today()):(!!p.sum&&p.sum.last===today());
const HEX_OK=v=>typeof v==="string"&&/^#[0-9a-fA-F]{6}$/.test(v);
function playerFromRow(row){
  const av=row.avatar&&typeof row.avatar==="object"?row.avatar:{},raw=row.stats&&typeof row.stats==="object"?row.stats:{};
  const sum=normalizeSum(raw);sum.xp=numIn(row.xp,1e6);sum.done=numIn(row.days_done,365);
  return{id:row.id,name:String(row.display_name||"").slice(0,24),
    cls:CLASSES.some(c=>c.id===av.cls)?av.cls:"crusader",color:HEX_OK(av.color)?av.color:COLORS[0],skin:HEX_OK(av.skin)?av.skin:SKINS[0],
    card:CARDS.some(c=>c.id===raw.card)?raw.card:"vigil",emblem:EMBLEMS.some(e=>e.id===raw.emblem)?raw.emblem:"",sum};
}
function stats(p){
  if(!isFull(p)&&p.sum)return statsFromSum(p.sum);
  const all=[...(p.dates||[]),...(p.frozen||[])];
  const done=(p.completed||[]).length, streak=currentStreak(all);
  const best=Math.max(p.best||0,longestRun(all),streak);
  const refl=(p.reflected||[]).length;
  let qp=0,perfects=0;const q=p.quiz||{};for(const k in q){qp+=(q[k].s||0)*2;if(q[k].s===5)perfects++}
  const wins=(p.wins||[]).length,solo=(p.solo||[]).length;
  const xp=done*10+refl*5+qp+wins*25+solo*15;
  return {done,streak,best,refl,qp,perfects,wins,solo,xp,cheers:p.cheersSent||0,prayed:p.prayed||0,freezes:p.freezes||0};
}
function rankOf(xp){let i=0;for(let k=0;k<RANKS.length;k++)if(xp>=RANKS[k][0])i=k;return{name:RANKS[i][1],min:RANKS[i][0],next:RANKS[i+1]||null}}
function nextDay(p){if(!isFull(p)&&p.sum)return p.sum.next||1;const set=new Set(p.completed||[]);for(let i=1;i<=TOTAL;i++)if(!set.has(i))return i;return TOTAL}
function unlocked(p){const s=stats(p);return{cards:CARDS.filter(c=>c.test(s)).map(c=>c.id),emblems:EMBLEMS.filter(e=>e.test(s)).map(e=>e.id)}}
function weekActivity(p,ws){
  if(!isFull(p)&&p.sum)return(p.sum.wk&&p.sum.wk[ws])||{ep:0,rf:0,qp:0,ad:0};
  const ep=Object.values(p.doneOn||{}).filter(d=>inWeek(d,ws)).length;
  const rf=Object.values(p.reflOn||{}).filter(d=>inWeek(d,ws)).length;
  let qp=0;const q=p.quiz||{};for(const k in q)if(q[k].d&&inWeek(q[k].d,ws))qp+=(q[k].s||0)*2;
  const ad=(p.dates||[]).filter(d=>inWeek(d,ws)).length;
  return{ep,rf,qp,ad};
}
function currentChallenge(){return challengeFor(weekStart(today()))}
function challengeFor(ws){
  const idx=Math.floor(Math.round(parseD(ws).getTime()/864e5)/7)%CHALLENGES.length;
  return{ws,ch:CHALLENGES[(idx+CHALLENGES.length)%CHALLENGES.length]};
}
/* Team numbers are group totals only. The server never sends names with them. */
function normalizeTeam(t){
  t=t&&typeof t==="object"?t:{};
  return{members:numIn(t.members,1e7),episodes_total:numIn(t.episodes_total,1e9),active_30d:numIn(t.active_30d,1e7),readers:numIn(t.readers,1e7),
    ep:numIn(t.ep,1e8),rf:numIn(t.rf,1e8),qp:numIn(t.qp,1e9),ad:numIn(t.ad,1e8)};
}
const teamGoal=(t,ch)=>Math.max(ch.goal,Math.round(Math.max(1,t.active_30d)*ch.goal*0.6));

let toastQ=[],toastOn=false;
function toast(msg){if(toastQ.length<4)toastQ.push(msg);if(!toastOn)nextToast()}
function nextToast(){
  const msg=toastQ.shift();if(!msg){toastOn=false;return}toastOn=true;
  const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;
  document.body.appendChild(t);setTimeout(()=>{t.remove();nextToast()},toastQ.length?1700:2600);
}
/* ---------- avatars ---------- */
function face(skin,cy=36){
  return `<circle cx="40" cy="${cy}" r="11.5" fill="${skin}"/>
  <circle cx="35.8" cy="${cy-1}" r="1.4" fill="#2a1d14"/><circle cx="44.2" cy="${cy-1}" r="1.4" fill="#2a1d14"/>
  <path d="M36.5 ${cy+4.5}q3.5 2.4 7 0" stroke="#7a3d2c" stroke-width="1.3" fill="none" stroke-linecap="round"/>`;
}
function avatar(p,cls="av"){
  const c=HEX_OK(p.color)?p.color:COLORS[0], skin=HEX_OK(p.skin)?p.skin:SKINS[0], k=CLASSES.some(x=>x.id===p.cls)?p.cls:"crusader";
  let body="";
  if(k==="crusader"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="#8b939e"/>
    <path d="M24 80V58c5-3 11-4 16-4s11 1 16 4v22z" fill="#f1ede4"/>
    <path d="M37 60h6v8h8v6h-8v6h-6v-6h-8v-6h8z" fill="${c}"/>
    <rect x="25" y="13" width="30" height="38" rx="7" fill="#aeb6c0"/>
    <rect x="25" y="13" width="30" height="38" rx="7" fill="none" stroke="#6d7580" stroke-width="1.5"/>
    <rect x="27" y="28" width="26" height="3.4" rx="1.5" fill="#20242c"/>
    <rect x="38.6" y="31" width="2.8" height="16" fill="#20242c" opacity=".55"/>
    <path d="M38.5 16h3v8h-3z M35 18.5h10v3H35z" fill="${c}"/>`;
  } else if(k==="friar"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M22 50c-4-20 4-34 18-34s22 14 18 34c-5-4-11-6-18-6s-13 2-18 6z" fill="${c}"/>
    <path d="M22 50c-4-20 4-34 18-34s22 14 18 34" fill="none" stroke="rgba(0,0,0,.25)" stroke-width="1.5"/>
    ${face(skin,37)}
    <path d="M39 60h2v12h-2z M35.5 63.5h9v2h-9z" fill="#c9a050"/>
    <path d="M30 56q10 6 20 0" stroke="#d8c39a" stroke-width="1.6" fill="none"/>`;
  } else if(k==="pilgrim"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M30 54l10 10 10-10" fill="#f1ede4"/>
    <line x1="66" y1="30" x2="62" y2="80" stroke="#7a5230" stroke-width="3" stroke-linecap="round"/>
    ${face(skin,37)}
    <ellipse cx="40" cy="25" rx="25" ry="5.5" fill="#5a3b22"/>
    <path d="M29 25c0-8 5-12 11-12s11 4 11 12z" fill="#6b4729"/>
    <path d="M40 16.5c-2.6 0-4.4 2-4.4 4.6h8.8c0-2.6-1.8-4.6-4.4-4.6z" fill="#f4ecd8"/>
    <path d="M38 17.6v3.3M40 17v3.9M42 17.6v3.3" stroke="#c9b48a" stroke-width=".7"/>`;
  } else if(k==="priest"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="#1d1d26"/>
    <path d="M30 56l-4 24h6l4-23zM50 56l4 24h-6l-4-23z" fill="${c}"/>
    <rect x="35" y="51" width="10" height="5" rx="1.5" fill="#fff"/>
    ${face(skin,36)}
    <path d="M28.5 33c0-9 5-13.5 11.5-13.5S51.5 24 51.5 33c-2-4-6-6.5-11.5-6.5S30.5 29 28.5 33z" fill="#3a2a1e"/>`;
  } else if(k==="disciple"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M8 80c3-16 12-24 24-26l16 26z" fill="#d8c7a4"/>
    <path d="M27 46c-2-17 4-27 13-27s15 10 13 27z" fill="#4a3220"/>
    ${face(skin,36)}
    <path d="M29.5 38c1 9 5 13.5 10.5 13.5S49.5 47 50.5 38c-2 3-5.5 4.5-10.5 4.5S31.5 41 29.5 38z" fill="#4a3220"/>
    <path d="M28.5 33c0-9 5-13.5 11.5-13.5S51.5 24 51.5 33c-3-4-6-6-11.5-6S31.5 29 28.5 33z" fill="#4a3220"/>`;
  } else if(k==="shepherd"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M66 80V30c0-6 8-6 8 0" stroke="#7a5230" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M22 57c-3-23 5-37 18-37s21 14 18 37c-5-3-11-4-18-4s-13 1-18 4z" fill="#e8dcc0"/>
    ${face(skin,37)}
    <path d="M27 26q13-6 26 0" stroke="${c}" stroke-width="3.2" fill="none"/>`;
  } else if(k==="fisher"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="#4f5866"/>
    <path d="M32 67q8-6 16 0q-8 6-16 0zm16 0l5-3.5v7z" fill="none" stroke="#f1ede4" stroke-width="1.7" stroke-linejoin="round"/>
    ${face(skin,37)}
    <path d="M30.5 40c1 7 4.5 10.5 9.5 10.5S48.5 47 49.5 40c-2 2-5 3-9.5 3s-7.5-1-9.5-3z" fill="#6b4a2e"/>
    <path d="M28 31c0-9 5-14.5 12-14.5S52 22 52 31z" fill="${c}"/>
    <rect x="27" y="28.5" width="26" height="5.5" rx="2.5" fill="${c}"/>
    <rect x="27" y="28.5" width="26" height="5.5" rx="2.5" fill="#000" opacity=".22"/>`;
  } else if(k==="psalmist"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M51 80V63c0-6 4-8 6-10M67 80V63c0-6-4-8-6-10" stroke="#c9a050" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <path d="M53 66h12" stroke="#c9a050" stroke-width="2.2"/>
    <path d="M56 66v14M59 66v14M62 66v14" stroke="#f1ede4" stroke-width=".9"/>
    <g fill="#3a2618"><circle cx="30" cy="32" r="5"/><circle cx="50" cy="32" r="5"/><circle cx="29" cy="40" r="4.5"/><circle cx="51" cy="40" r="4.5"/><circle cx="34" cy="25" r="5"/><circle cx="46" cy="25" r="5"/><circle cx="40" cy="23" r="5"/></g>
    ${face(skin,37)}
    <path d="M31 27l3-4.5 3 3 3-5 3 5 3-3 3 4.5z" fill="#d9b45f"/>`;
  } else if(k==="believer"){
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M26 54c4 7 9 9 14 9s10-2 14-9" stroke="#000" stroke-opacity=".25" stroke-width="3.5" fill="none"/>
    <path d="M35 63v13M45 63v13" stroke="#eee" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M34 50q6 8 12 0" stroke="#d9b45f" stroke-width=".9" fill="none"/>
    <path d="M39.3 57h1.4v6h-1.4zM37.6 58.6h4.8v1.4h-4.8z" fill="#d9b45f"/>
    ${face(skin,36)}
    <path d="M28.5 34c-1-10 4-15.5 11.5-15.5S53 24 51.5 34c-2-5-6-7.5-11.5-7.5S30.5 29 28.5 34z" fill="#2f2219"/>`;
  } else {
    body=`<path d="M8 80c2-18 15-26 32-26s30 8 32 26z" fill="${c}"/>
    <path d="M20 58c-3-26 6-42 20-42s23 16 20 42c-6-3-13-4-20-4s-14 1-20 4z" fill="${c}"/>
    <path d="M27 50c-2-14 4-24 13-24s15 10 13 24c-4-2-8-3-13-3s-9 1-13 3z" fill="#f4f1ea"/>
    ${face(skin,38)}
    <path d="M39 61h2v11h-2zM35.5 64h9v2h-9z" fill="#d9b45f"/>`;
  }
  return `<svg class="${cls}" viewBox="0 0 80 80" role="img" aria-label="${esc((CLASSES.find(x=>x.id===k)||{}).name||"Avatar")}">
    <defs><clipPath id="cp"><circle cx="40" cy="40" r="40"/></clipPath></defs>
    <circle cx="40" cy="40" r="40" fill="#d9cfb8"/><circle cx="40" cy="40" r="40" fill="${c}" opacity=".18"/>
    <g clip-path="url(#cp)">${body}</g></svg>`;
}
function emblemSVG(e,locked){
  const gl=e.glyph.replace(/\uFE0E/g,""),fill=locked?"#888":e.c,fs=gl.length>2?11:gl.length>1?14:19;
  return `<svg viewBox="0 0 40 46" aria-hidden="true"><path d="M20 1.5l17 5.5v15c0 11-7.5 18.5-17 22.5C10.5 40.5 3 33 3 22V7z" fill="${fill}" stroke="#E2BD5E" stroke-width="2"/>
  <text x="20" y="${23+fs*.36}" text-anchor="middle" font-family="Alegreya SC,Georgia,serif" font-weight="800" font-size="${fs}" fill="#F8EFD8">${esc(e.glyph)}</text></svg>`;
}

/* ---------- map of the biblical world ---------- */
/* Every day's pins come from bible-plan.js (the official reading plan). Three zoom levels share one set of coordinates. */
const VIEWS={
  holy:{label:"Close-up",lon0:33.4,lat1:34.2,k:48,x0:33.4,x1:41.4,y0:29.2,y1:34.2},
  near:{label:"Region",lon0:18,lat1:42,k:12,x0:18,x1:50,y0:22,y1:42},
  wide:{label:"Wide",lon0:8,lat1:44.5,k:9.1,x0:8,x1:50.2,y0:18.1,y1:44.5}
};
const MW=384,MH=240;
const SEA=[[6,43.1],[7.3,43.7],[8,43.85],[8.6,44.3],[8.95,44.4],[9.4,44.3],[9.85,44.05],[10.25,43.85],[10.3,43.5],[10.55,42.95],[11.2,42.43],[11.8,42.1],[12.25,41.73],[12.6,41.45],[13.05,41.23],[13.57,41.2],[14.25,40.85],[14.35,40.6],[14.77,40.65],[15,40.4],[15.3,40],[15.6,40],[15.95,39.5],[16,39.3],[16.2,38.95],[15.9,38.68],[15.9,38.43],[15.65,38.1],[16.07,37.92],[16.5,38.3],[16.55,38.8],[17.1,39.05],[17.15,39.4],[16.6,39.7],[16.65,40.1],[16.85,40.35],[17.25,40.45],[17.7,40.3],[17.98,40.05],[18.36,39.8],[18.5,40.15],[17.95,40.65],[16.87,41.12],[16.1,41.9],[15,42],[14.2,42.46],[13.5,43.62],[12.55,44.06],[12.3,44.42],[12.3,46],[14,46],[14.5,45.2],[14.9,44.6],[15.2,44.1],[16,43.55],[16.45,43.5],[17.3,43],[17.8,42.75],[18.1,42.6],[18.6,42.35],[19.1,41.95],[19.45,41.3],[19.5,40.5],[19.95,39.8],[20.25,39.3],[20.75,38.95],[20.7,38.7],[21.08,38.53],[21.4,38.37],[21.73,38.25],[21.38,38.17],[21.15,37.9],[21.32,37.65],[21.67,37.25],[21.7,36.82],[22.1,36.55],[22.48,36.39],[22.8,36.5],[23.2,36.43],[23,36.9],[22.9,37.3],[22.8,37.55],[23,37.95],[23.62,37.94],[24.02,37.65],[24.05,38.2],[23.2,38.65],[23,39.35],[22.7,40.2],[22.9,40.6],[23.9,40],[24.35,40.15],[24.4,40.93],[25.5,40.85],[26.1,40.8],[26.2,40.4],[26.18,40.05],[26.13,39.76],[26.34,39.49],[26.9,39.55],[26.93,39.2],[26.75,38.67],[27.1,38.43],[26.3,38.3],[27.25,37.86],[27.27,37.38],[27.43,37.04],[27.7,36.75],[28.27,36.85],[29.1,36.62],[29.64,36.2],[30.58,36.6],[30.7,36.88],[31.39,36.77],[32,36.54],[32.8,36.07],[33.9,36.37],[34.64,36.8],[35.35,36.55],[35.78,36.77],[36.17,36.58],[35.9,36.4],[35.93,36.05],[35.78,35.52],[35.88,34.89],[35.82,34.44],[35.65,34.12],[35.5,33.9],[35.37,33.56],[35.2,33.27],[35.1,33.1],[35.07,32.93],[34.98,32.82],[34.9,32.5],[34.75,32.05],[34.55,31.67],[34.45,31.5],[34.25,31.28],[33.8,31.13],[32.3,31.26],[31.8,31.45],[30.4,31.5],[29.9,31.2],[28.8,30.9],[27.2,31.35],[25.2,31.57],[23.97,32.08],[22.65,32.77],[21.9,32.9],[20.07,32.12],[20.2,30.7],[19,30.5],[16.6,31.2],[15.1,32.4],[14.3,32.65],[13.2,32.9],[12.1,32.9],[10.9,33.8],[10.1,33.9],[10.76,34.74],[10.6,35.8],[11.05,37.05],[10.3,36.85],[9.85,37.28],[8.75,36.95],[6,36.95]];
const BLACK=[[29,41.2],[31,41.1],[33,42],[35,42],[36.5,41.4],[38.5,41],[41.5,41.5],[41.7,42.5],[40,43.5],[37.5,44.5],[35,45.5],[33.5,44.4],[32.5,45.4],[30,45.3],[29.7,44.4],[28.7,43.5],[28,42],[28.2,41.5]];
const CASPIAN=[[49,37.4],[50.5,37.3],[53,37],[53.5,39],[53,41],[51,44.5],[50,46],[48.5,46],[47.5,44],[48.3,42],[49.2,40.5],[49.4,38.5]];
const RED=[[32.55,29.95],[32.7,29.2],[33.6,27.7],[34.5,26],[35.6,24],[36.8,22],[39,22],[37.6,24.6],[36.4,26.6],[35.2,28],[34.95,29.55],[34.65,28.8],[34.3,27.8],[33.6,28.3],[32.85,29.8]];
const GULF=[[47.9,30],[48.8,30.2],[50,29.6],[50,26],[49.5,26.5],[48.5,28],[48,29.3]];
const DEAD=[[35.45,31.78],[35.55,31.7],[35.58,31.45],[35.5,31.2],[35.45,31],[35.38,31.15],[35.4,31.4],[35.4,31.65]];
const GALILEE=[[35.55,32.88],[35.62,32.85],[35.65,32.75],[35.6,32.65],[35.55,32.7],[35.52,32.8]];
const ISLES=[[[12.4,37.8],[13.4,38.2],[15.6,38.25],[15.1,37.3],[15.25,36.7],[14.6,36.8],[12.9,37.6]],
  [[8.2,41],[9.3,41.2],[9.7,40.5],[9.6,39.2],[9,38.9],[8.4,39.2],[8.4,40]],[[8.6,42.5],[9.4,43],[9.5,42.2],[9.2,41.4],[8.7,41.7]],
  [[23.5,35.3],[24.2,35.5],[25.3,35.35],[26.3,35.2],[26.2,35],[25,34.95],[24,35.1]],
  [[32.3,35.05],[33,35.4],[34,35.7],[34.6,35.7],[33.9,35],[33,34.65]]];
const NILE=[[30.9,31.4],[31.2,30.1],[31.2,29],[30.8,28],[31.2,27],[32,26],[32.7,25.5],[32.9,24],[32.4,22]];
const EUPH=[[38.5,38.5],[38.3,37],[38.6,36],[40.5,35],[41.5,34.4],[43.3,33],[44.4,32.3],[45.7,31],[47,30.8],[47.9,30.2]];
const TIGRIS=[[40.2,37.9],[42.2,37.2],[43.1,36.3],[43.6,35],[44.4,33.3],[45.5,32.5],[46.5,31.3],[47.4,30.9]];
const JORDANS=[[[35.65,33.25],[35.62,32.9]],[[35.6,32.65],[35.57,32.3],[35.55,32],[35.5,31.8]]];
const REGIONS={
  holy:[["Great Sea",33.95,32.9],["Judah",35,31.4],["Samaria",35.1,32.45],["Galilee",35.25,33.05],["Philistia",34.62,31.95],["Moab",35.95,31.25],["Ammon",36.4,31.85],["Gilead",35.95,32.35],["Edom",35.5,29.95],["Negev",34.6,30.35],["Syria",37.2,33.6]],
  near:[["Great Sea",25.5,34],["Egypt",29,26.5],["Mesopotamia",43.5,34.8],["Arabia",41,27],["Asia Minor",32.5,39.2],["Persia",46.5,39.5]],
  fit:[["Sumer",46.4,31.7],["Persian Gulf",49.1,28.8],["Aram",38.4,36.1],["Arabia",42.5,29.2]],
  wide:[["Great Sea",21,34.2],["Greece",21.6,39.5],["Asia Minor",32,39.3],["Egypt",29.5,27],["Libya",17,28.5],["Syria",38.5,35.8],["Arabia",42,27],["Mesopotamia",44,34.6],["Persia",47.5,39]]
};
const planOf=n=>BIBLE_PLAN[n-1]||["","",""];
const readingsText=n=>planOf(n).filter(Boolean).join("; ");
function checkpointOf(n){const c=CHECKPOINTS.find(x=>n>=x[0]&&n<=x[1]);return c?c[2]:""}
const isOff=g=>(g[3]&2)>0, isApprox=g=>(g[3]&1)>0;
function pinsOf(n){const dp=DAY_PINS[n-1];return dp?dp[0].map(x=>({key:x[0],note:x[1],g:GEO[x[0]]})).filter(p=>p.g):[]}
function autoView(pins){
  const pts=pins.filter(p=>!isOff(p.g));
  const fits=v=>pts.every(p=>p.g[1]>=v.x0+.15&&p.g[1]<=v.x1-.15&&p.g[2]>=v.y0+.15&&p.g[2]<=v.y1-.15);
  return fits(VIEWS.holy)?"holy":fits(VIEWS.near)?"near":"wide";
}
function fitView(pins){
  const pts=pins.filter(p=>!isOff(p.g));if(!pts.length)return null;
  const lons=pts.map(p=>p.g[1]),lats=pts.map(p=>p.g[2]);
  const mnx=Math.min(...lons),mxx=Math.max(...lons),mny=Math.min(...lats),mxy=Math.max(...lats);
  const cx=(mnx+mxx)/2,cy=(mny+mxy)/2,sx=Math.max(mxx-mnx,.2),sy=Math.max(mxy-mny,.15);
  const inHoly=cx>=33.4&&cx<=41.4&&cy>=29.2&&cy<=34.2;
  const kfit=Math.min(.7*MW/sx,.6*MH/sy);
  if(kfit<26)return null;
  const k=Math.min(kfit,inHoly?110:60),lon0=cx-MW/(2*k),lat1=cy+MH/(2*k);
  return{label:"Auto",lon0,lat1,k,x0:lon0,x1:lon0+MW/k,y0:lat1-MH/k,y1:lat1};
}
function viewObj(pins,mv){
  if(mv==="holy"||mv==="near"||mv==="wide")return VIEWS[mv];
  return fitView(pins)||(autoView(pins)==="wide"?VIEWS.wide:VIEWS.near);
}
function mapSVG(n,V){
  const pins=pinsOf(n),dp=DAY_PINS[n-1],route=(dp&&dp[1])||[];
  const X=lon=>(lon-V.lon0)*V.k,Y=lat=>(V.lat1-lat)*V.k;
  const P=a=>a.map(c=>X(c[0]).toFixed(1)+","+Y(c[1]).toFixed(1)).join(" ");
  const inV=g=>g[1]>=V.x0&&g[1]<=V.x1&&g[2]>=V.y0&&g[2]<=V.y1;
  const lbl=a=>inV([0,a[1],a[2]])?`<text x="${X(a[1]).toFixed(1)}" y="${Y(a[2]).toFixed(1)}" fill="var(--maptext)" font-size="9" font-style="italic" opacity=".65" text-anchor="middle">${a[0]}</text>`:"";
  // the story so far: a count of every place, and small dots for the most recent ones
  const mine=new Set(pins.map(p=>p.key)),seen=new Set(),recent=[];
  for(let d=n-1;d>=1;d--){const x=DAY_PINS[d-1];if(!x||!x[0].length)continue;const k=x[0][0][0];if(seen.has(k))continue;seen.add(k);
    const g=GEO[k];if(g&&!mine.has(k)&&!isOff(g)&&inV(g)&&recent.length<14)recent.push(g)}
  let dots=recent.map(g=>`<circle cx="${X(g[1]).toFixed(1)}" cy="${Y(g[2]).toFixed(1)}" r="2.6" fill="var(--gold)" opacity=".6" stroke="var(--land)" stroke-width=".8"/>`).join("");
  const XY=pins.map((p,i)=>{let x=X(p.g[1]),y=Y(p.g[2]),off=isOff(p.g);
    if(x<10){x=10;off=true}if(x>MW-10){x=MW-10;off=true}if(y<10){y=10;off=true}if(y>MH-10){y=MH-10;off=true}
    return{p,i,x,y,off}});
  const line=route.length>1?`<polyline points="${route.map(i=>XY[i]?XY[i].x.toFixed(1)+","+XY[i].y.toFixed(1):"").filter(Boolean).join(" ")}" fill="none" stroke="var(--ruby)" stroke-width="2" stroke-dasharray="5 4"/>`:"";
  const boxes=[];let marks="";
  XY.forEach(a=>{
    const label=a.p.g[0].replace(/\s*\(.*$/,"")+(a.off?" (off map)":"");
    const w=label.length*6,anchor=a.x>MW-w/2-6?"end":a.x<w/2+6?"start":"middle";
    const tx=anchor==="end"?a.x-10:anchor==="start"?a.x+10:a.x;
    const x0=anchor==="end"?tx-w:anchor==="start"?tx:tx-w/2;
    let ty=a.y-12;
    const hit=y=>boxes.some(b=>x0<b[0]+b[2]&&x0+w>b[0]&&Math.abs(y-b[1])<12);
    for(const dy of [-12,21,-25,34]){ty=a.y+dy;if(a.y+dy<9)continue;if(!hit(ty))break}
    boxes.push([x0,ty,w]);
    marks+=`<circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="7.5" fill="var(--ruby)" stroke="#fff" stroke-width="2"/>
    <text x="${a.x.toFixed(1)}" y="${(a.y+3.4).toFixed(1)}" text-anchor="middle" font-size="10" font-weight="700" fill="#fff">${a.i+1}</text>
    <text x="${tx.toFixed(1)}" y="${ty.toFixed(1)}" text-anchor="${anchor}" font-size="11" font-weight="700" fill="var(--maptext)" stroke="var(--land)" stroke-width="3.5" paint-order="stroke" stroke-linejoin="round">${esc(label)}</text>`});
  return {svg:`<svg viewBox="0 0 ${MW} ${MH}" role="img" aria-label="Map showing ${esc(pins.map(p=>p.g[0]).join(", "))}" font-family="Alegreya,Georgia,serif">
  <rect width="${MW}" height="${MH}" fill="var(--land)"/>
  <polygon points="${P(SEA)}" fill="var(--sea)"/><polygon points="${P(BLACK)}" fill="var(--sea)"/><polygon points="${P(CASPIAN)}" fill="var(--sea)"/>
  <polygon points="${P(RED)}" fill="var(--sea)"/><polygon points="${P(GULF)}" fill="var(--sea)"/>
  ${ISLES.map(a=>`<polygon points="${P(a)}" fill="var(--land)"/>`).join("")}
  <polyline points="${P(NILE)}" fill="none" stroke="var(--river)" stroke-width="1.6"/><polyline points="${P(EUPH)}" fill="none" stroke="var(--river)" stroke-width="1.6"/>
  <polyline points="${P(TIGRIS)}" fill="none" stroke="var(--river)" stroke-width="1.6"/>
  ${JORDANS.map(a=>`<polyline points="${P(a)}" fill="none" stroke="var(--river)" stroke-width="${V.k>=40?2:1.2}"/>`).join("")}
  <polygon points="${P(DEAD)}" fill="var(--sea)"/><polygon points="${P(GALILEE)}" fill="var(--sea)"/>
  ${(V.k>=30?[...REGIONS.holy,...REGIONS.near,...REGIONS.fit]:V===VIEWS.wide?REGIONS.wide:REGIONS.near).map(lbl).join("")}
  ${dots}${line}${marks}</svg>`,seen:seen.size};
}
function mapPanelHTML(n){
  const pins=pinsOf(n);if(!pins.length)return "";
  const per=periodOf(n),cp=checkpointOf(n);
  const m=mapSVG(n,viewObj(pins,S.mapView||"auto"));
  const list=pins.map((p,i)=>`<li><span class="pn">${i+1}</span><span><span class="where">${esc(p.g[0])}</span>${p.note?` <span class="note">${esc(p.note)}</span>`:""}</span></li>`).join("");
  const btn=(k,l)=>`<button data-mapview="${k}" aria-pressed="${(S.mapView||"auto")===k}"><span>${l}</span></button>`;
  return `<section class="panel" aria-labelledby="mh">
    <span class="period" style="border-color:${per.color}">${esc(cp||per.name)}</span>
    <h2 id="mh">Where we are, Day ${n}</h2>
    <p class="readings">Readings: ${esc(readingsText(n))}</p>
    <div class="map">${m.svg}</div>
    <div class="seg" role="group" aria-label="Map zoom">${btn("auto","Auto")}${btn("holy","Close-up")}${btn("near","Region")}${btn("wide","Wide")}</div>
    <ol class="pinlist">${list}</ol>
    <p class="legend"><span><i style="background:var(--ruby)"></i>Today's places</span><span><i style="background:var(--gold)"></i>Visited so far</span></p>
    <p class="small" style="margin:4px 0 0">${n>1?`${m.seen} places visited in the story so far. `:"The story begins here. "}${pins.some(p=>isApprox(p.g))?"Some places are traditional or approximate.":""}</p>
  </section>`;
}

/* ---------- writes ---------- */
function detailOf(p){const d={...p};delete d.sum;delete d.id;return d}
let saveChain=Promise.resolve(),retryTimer=null;
async function savePlayer(patch){
  const before=unlocked(S.me),rb=rankOf(stats(S.me).xp).name;
  const next={...S.me,...patch,updated:Date.now()};
  next.best=stats(next).best;
  next.sum=computeSummary(next);
  S.me=next;S.players[S.uid]=next;
  const after=unlocked(next),ra=rankOf(stats(next).xp).name;
  if(ra!==rb)toast("You've risen to "+ra+"!");
  after.cards.filter(x=>!before.cards.includes(x)).forEach(id=>toast("New calling card: "+CARDS.find(c=>c.id===id).name));
  after.emblems.filter(x=>!before.emblems.includes(x)).forEach(id=>toast("New emblem: "+EMBLEMS.find(e=>e.id===id).name));
  render();
  if(S.local){lsSet("yow-me",next);setTimeout(checkWeekly,0);return true}
  const saved=persistMe();setTimeout(checkWeekly,0);return saved;
}
function persistMe(){
  const snap=S.me;S.saving++;
  const job=()=>Backend.savePlayer({name:snap.name,avatar:{cls:snap.cls,color:snap.color,skin:snap.skin},stats:snap.sum,data:detailOf(snap)});
  saveChain=saveChain.then(job).then(()=>{S.saving--;clearTimeout(retryTimer);retryTimer=null;return true},e=>{
    S.saving--;writeFail(e,true);
    if(!retryTimer)retryTimer=setTimeout(()=>{retryTimer=null;persistMe()},8000);
    return false;
  });
  return saveChain;
}
function writeFail(e,willRetry){
  const m=String((e&&(e.message||e.code))||"");
  if(e&&(e.code==="not_signed_in"||/jwt|not signed in/i.test(m)))toast("Please sign in again to save your progress.");
  else toast(willRetry?"Couldn't save just now. We'll try again.":"Couldn't save just now. Try again in a moment.");
  return false;
}
async function dbTry(fn){try{await fn();return true}catch(e){return writeFail(e)}}
async function saveJournal(n,data){
  S.journal[n]=data;
  if(S.local)return lsSet("yow-j-"+n,data);
  try{await Backend.saveJournal(n,data)}catch(e){}
}
async function saveDayDoc(n,data){
  if(S.local){lsSet("yow-day-"+n,data);if(S.day.n===n)S.day.doc=data;return render()}
  if(S.day.n===n)S.day.doc=data;
  await dbTry(()=>Backend.saveDay(n,data));
}
function meFromRows(r){
  const pr=playerFromRow(r.profile),d=r.data&&typeof r.data==="object"?r.data:{};
  const me={completed:[],dates:[],reflected:[],card:"vigil",emblem:"",best:0,...d,name:pr.name,cls:pr.cls,color:pr.color,skin:pr.skin};
  if(!Array.isArray(me.completed))me.completed=[];
  me.sum=computeSummary(me);return me;
}
async function refreshMe(){
  if(S.local||!S.session||S.saving>0||retryTimer)return;
  try{
    const r=await Backend.loadMe();if(!r.profile||S.saving>0||retryTimer)return;
    const full=meFromRows(r);
    if(!S.me||(full.updated||0)>(S.me.updated||0)){S.me=full;S.players[S.uid]=full;scheduleRender()}
  }catch(e){}
}
let lastTouch=0;
function touchActivity(){
  if(S.local||!S.session||!S.me)return;
  if(Date.now()-lastTouch<6e5)return;
  lastTouch=Date.now();Backend.touch().catch(()=>{});
}

/* ---------- live data ---------- */
let rq=false;
function scheduleRender(){if(rq)return;rq=true;requestAnimationFrame(()=>{rq=false;render()})}
const pendingProfiles=new Set();
async function ensureProfiles(ids){
  if(S.local)return;
  const need=[...new Set(ids)].filter(id=>id&&!getP(id)&&!(id in S.extra)&&!pendingProfiles.has(id));
  if(!need.length)return;
  need.forEach(id=>pendingProfiles.add(id));
  try{
    const rows=await Backend.fetchProfiles(need),got=new Set();
    rows.forEach(r=>{S.extra[r.id]=playerFromRow(r);got.add(r.id)});
    need.forEach(id=>{if(!got.has(id))S.extra[id]=false});
  }catch(e){}
  need.forEach(id=>pendingProfiles.delete(id));scheduleRender();
}
function subscribeDay(n){
  if(S.day.n===n)return;
  S.day.unsubs.forEach(u=>{try{u()}catch(e){}});
  S.day={n,doc:undefined,comments:[],answers:{},rx:[],unsubs:[]};
  if(S.journal[n]===undefined){
    S.journal[n]=null;
    if(S.local)S.journal[n]=lsGet("yow-j-"+n);
    else Backend.getJournal(n).then(j=>{S.journal[n]=j||{};scheduleRender()}).catch(()=>{S.journal[n]={}});
  }
  if(S.local){S.day.doc=lsGet("yow-day-"+n);return}
  const mine=S.day;
  mine.unsubs.push(Backend.watchDay(n,doc=>{if(S.day!==mine)return;mine.doc=doc;scheduleRender()}));
  mine.unsubs.push(Backend.watchComments(n,rows=>{if(S.day!==mine)return;mine.comments=rows;ensureProfiles(rows.map(r=>r.uid));scheduleRender()}));
  mine.unsubs.push(Backend.watchAnswers(n,rows=>{
    if(S.day!==mine)return;const a={};rows.forEach(r=>{a[r.uid]=r});mine.answers=a;ensureProfiles(rows.map(r=>r.uid));scheduleRender();
  }));
  mine.unsubs.push(Backend.watchReactions("d"+n,rows=>{if(S.day!==mine)return;mine.rx=rows;scheduleRender()}));
}
function rxFor(list,target){return list.filter(r=>r.target===target)}
async function toggleReact(scope,target,list){
  const id=target+"~"+S.uid,has=list.some(r=>r.id===id);
  return dbTry(()=>Backend.toggleReaction(scope,target,has)).then(ok=>ok&&!has);
}

/* ---------- streak freezes ---------- */
function applyFreezes(){
  if(S.frozeChecked||!S.me)return;S.frozeChecked=true;
  const p=S.me,fz=p.freezes||0;if(!fz||!(p.dates||[]).length)return;
  const set=new Set([...(p.dates||[]),...(p.frozen||[])]);
  if(set.has(today()))return;
  let d=shift(today(),-1);const miss=[];
  while(!set.has(d)&&miss.length<=fz){miss.push(d);d=shift(d,-1)}
  if(miss.length&&miss.length<=fz&&set.has(d)){
    savePlayer({frozen:[...(p.frozen||[]),...miss],freezes:fz-miss.length});
    toast(miss.length===1?"A streak freeze covered yesterday. Your streak is safe.":"Streak freezes covered "+miss.length+" missed days.");
  }
}

/* ---------- render ---------- */
function render(){
  const v=$("#view");if(!S.booted)return;
  if(!S.local&&!S.session){v.innerHTML="";$("#tabs").hidden=true;$("#meChip").hidden=true;openAuth();return}
  if(!S.me){v.innerHTML="";$("#tabs").hidden=true;$("#meChip").hidden=true;openProfile(true);return}
  if($(".modal")&&!S.me.name)return;
  $("#tabs").hidden=false;
  const chip=$("#meChip");chip.hidden=false;
  const st=stats(S.me);
  chip.innerHTML=`<span>${streakTxt(st.streak)}</span>${avatar(S.me)}`;
  chip.setAttribute("aria-label","Edit your profile");
  document.querySelectorAll("nav.tabs button").forEach(b=>b.setAttribute("aria-current",b.dataset.tab===S.tab?"page":"false"));
  // keep anything being typed
  const keep={};let focusKey=null,sel=null;
  document.querySelectorAll("[data-keep]").forEach(el=>{keep[el.dataset.keep]=el.value;if(el===document.activeElement){focusKey=el.dataset.keep;sel=[el.selectionStart,el.selectionEnd]}});
  const html=S.tab==="today"?todayHTML():S.tab==="fellowship"?fellowshipHTML():S.tab==="prayer"?prayerHTML():armoryHTML();
  v.innerHTML=html;
  document.querySelectorAll("[data-keep]").forEach(el=>{const k=el.dataset.keep;if(k in keep)el.value=keep[k];if(k===focusKey){el.focus();try{el.setSelectionRange(sel[0],sel[1])}catch(e){}}});
  bindView();
}

function todayHTML(){
  const p=S.me,st=stats(p),n=S.viewDay||nextDay(p);S.viewDay=n;
  subscribeDay(n);
  const done=(p.completed||[]).includes(n),dd=S.day.doc,j=S.journal[n]||{},per=periodOf(n);
  const set=new Set(p.completed||[]);
  let cells="";for(let i=1;i<=TOTAL;i++)cells+=`<i class="${set.has(i)?"on":""}${i===n?" cur":""}" title="Day ${i}"></i>`;
  const notes=S.local?`<p class="notice">Progress is saved on this device. Add Take the Cross to your home screen to make daily reading easier.</p>`:"";
  const mine=S.cheers.filter(c=>c.to===S.uid);
  const cheerIn=mine.length?`<div class="cheerin" role="status">${mine.map(c=>`<p><strong>${esc(nameOf(c.from))}</strong> says: ${esc((CHEERS.find(x=>x.id===c.kind)||CHEERS[0]).t)}</p>`).join("")}</div>`:"";
  return `<div class="tgrid"><div class="tcol-a">${notes}${setupCardHTML()}${catchupHTML()}${cheerIn}${todayStripHTML()}${timelineHTML(n)}
  <section aria-label="Day ${n}">
    <div class="archrow"><button id="prevD" aria-label="Previous day" ${n<=1?"disabled":""}>‹</button>
      <div class="arch glass${S.slide>0?" in-r":S.slide<0?" in-l":""}" style="--pc:${per.color}"><div class="glasswrap">${glassSVG(per)}</div><div class="arch-txt"><p class="word">Day</p><p class="num">${n}</p></div><p class="plaque">${esc(per.name)}</p>${done?`<span class="seal">Finished</span>`:""}</div>
      <button id="nextD" aria-label="Next day" ${n>=TOTAL?"disabled":""}>›</button></div>
    <p class="swipehint">${platform()==="desktop"?"Use the arrows or your arrow keys to change days":"Swipe or use the arrows to change days"}</p>
    <p class="summary">${st.streak?`You're on a <strong>${st.streak}-day streak</strong>`:`Finish a day to start your streak`}${st.freezes?` with ${pl(st.freezes,"freeze")} saved`:""}. <strong>${st.done}</strong> of 365 days done.</p>
    <div class="actions">
      ${(()=>{const ep=episodeUrl(n),yt=dd&&dd.yt&&YT_RE.test(dd.yt)?dd.yt:null;
        const play=`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.5" fill="currentColor" opacity=".15"/><path d="M10 7.8l6.2 4.2-6.2 4.2z" fill="currentColor"/></svg>`;
        const yti=`<svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="4" fill="#C4302B"/><path d="M10 9l5 3-5 3z" fill="#fff"/></svg>`;
        let h="";
        if(ep)h+=`<a class="btn" href="${ep}" target="_blank" rel="noopener">${play}Listen to Day ${n} (official episode)</a>`;
        if(yt)h+=`<a class="btn" href="${esc(yt)}" target="_blank" rel="noopener">${yti}Watch Day ${n} on YouTube</a>`;
        else h+=`<a class="btn${ep?" done":""}" href="${ytLink(n)}" target="_blank" rel="noopener">${yti}Find Day ${n} on YouTube</a>`;
        if(!ep)h+=`<p class="small" style="margin:0;text-align:center">The 2026 episode for Day ${n} comes out ${releaseDate(n).toLocaleDateString(undefined,{month:"long",day:"numeric"})}.</p>`;
        if(S.isAdmin){
          if(S.ytEdit===n)h+=`<div class="compose" style="margin-top:0"><input type="text" id="ytIn" data-keep="yt${n}" placeholder="Paste the YouTube link for Day ${n}" value="${esc(yt||"")}" aria-label="YouTube link for Day ${n}"><button class="btn primary sm" id="saveYt">Save</button></div><p class="small" id="ytErr" role="status" style="margin:0"></p>`;
          else h+=`<p class="small" style="margin:0;text-align:center"><button class="linkbtn" id="addYt">${yt?"Change the YouTube link":"Add the exact YouTube link for everyone"}</button></p>`;
        }
        return h})()}
      ${done?`<button class="btn done" id="undo">Day ${n} finished. Tap to undo</button>`:`<button class="btn primary" id="mark" ${S.readOnly?"disabled":""}>Mark Day ${n} finished</button>`}
    </div>
  </section>
  <div class="grid365" aria-label="${st.done} of 365 days finished">${cells}</div>
  </div><div class="tcol-b">
  ${mapPanelHTML(n)}
  ${glanceHTML(n,dd)}
  ${dd&&dd.quiz?quizHTML(n,dd):""}
  ${reflectHTML(n,dd,j)}
  ${S.local?"":discussHTML(n)}</div></div>`;
}

function glanceHTML(n,dd){
  const ready=dd&&dd.recap;
  if(dd===undefined&&!S.local)return "";
  if(!ready){
    if(!S.ai)return "";
    const busy=S.busy["gen"+n];
    return `<section class="panel"><h2>Study guide for Day ${n}</h2>
    <p class="lede">Get a short recap, key verse and quiz for today's readings. The first person to do this sets it up for everyone.</p>
    <button class="btn primary" id="genDay" style="width:100%" ${busy?"disabled":""}>${busy?"Preparing Day "+n+"… (up to a minute)":"Prepare Day "+n}</button>
    <p class="small" id="genStatus" role="status">${esc(S.busy["genErr"+n]||"")}</p></section>`;
  }
  return `<section class="panel" aria-labelledby="gh">
    <h2 id="gh">Day ${n} at a glance</h2>
    <p class="recap">${esc(dd.recap)}</p>
    ${dd.verse&&dd.verse.text?`<figure class="verse"><blockquote>${esc(dd.verse.text)}</blockquote><cite>${esc(dd.verse.ref||"")}</cite>${dd.verseWhy?`<p>${esc(dd.verseWhy)}</p>`:""}</figure>`:""}
    ${S.busy["gen"+n]?`<p class="small">Rewriting this study guide…</p>`:S.isAdmin&&S.ai?`<p class="small" style="margin:10px 0 0"><button class="linkbtn" id="redo">Rewrite this study guide</button></p>`:""}
  </section>`;
}

function quizHTML(n,dd){
  const res=(S.me.quiz||{})[n],sel=S.quizSel[n]||[],taken=!!res;
  const picks=taken?res.picks||[]:sel;
  const qs=dd.quiz.map((q,i)=>`<div class="qz"><p class="qq"><span class="small">${i+1}.</span> ${esc(q.q)}</p><div class="opts">
    ${q.options.map((o,k)=>{let cls="opt";if(taken){if(k===q.answer)cls+=" right";else if(picks[i]===k)cls+=" wrong"}
      return `<button class="${cls}" data-qi="${i}" data-qk="${k}" aria-pressed="${picks[i]===k}" ${taken?"disabled":""}>${esc(o)}</button>`}).join("")}
    </div>${taken&&q.why?`<p class="why">${esc(q.why)}</p>`:""}</div>`).join("");
  const all=dd.quiz.every((_,i)=>sel[i]!==undefined);
  return `<section class="panel" aria-labelledby="qh"><h2 id="qh">Day ${n} quiz</h2>
    ${taken?`<p class="score">${res.s} of ${dd.quiz.length} right, +${res.s*2} points</p>`:`<p class="lede">Five questions on today's readings. Each right answer is worth 2 points.</p>`}
    ${qs}
    ${taken?"":`<button class="btn primary" id="submitQuiz" ${all&&!S.readOnly?"":"disabled"} style="width:100%">Submit answers</button>`}
  </section>`;
}

function reflectHTML(n,dd,j){
  if(dd===undefined&&!S.local)return "";
  const QS=(dd&&dd.questions)||FALLBACK_Q;
  const ans=j.answers||[],shared=!!S.day.answers[S.uid],busy=S.busy["fb"+n];
  return `<section class="panel" aria-labelledby="rh"><h2 id="rh">Reflect on Day ${n}</h2>
    <p class="lede">Write what you learned. Questions are the same for everyone, so you can compare.</p>
    ${QS.map((q,i)=>`<div class="q"><p><span class="n">${i+1}</span>${esc(q)}</p><textarea data-a="${i}" data-keep="a${n}-${i}" aria-label="Your answer to question ${i+1}">${esc(ans[i]||"")}</textarea></div>`).join("")}
    <div class="q"><p><span class="n">✦</span>One thing Fr. Mike said that stuck with you</p><textarea id="take" data-keep="t${n}" aria-label="Your takeaway from the episode">${esc(j.takeaway||"")}</textarea></div>
    <div class="row">
      ${S.ai&&dd&&dd.questions?`<button class="btn primary" id="fb" style="flex:2" ${busy?"disabled":""}>${busy?"Thinking…":j.feedback?"Get new feedback":"Get feedback"}</button>`:""}
      ${S.local?"":`<button class="btn" id="share" style="flex:1" ${S.readOnly?"disabled":""}>${shared?"Update shared answers":"Share with friends"}</button>`}
    </div>
    ${shared?`<p class="small" style="margin:8px 0 0">Your answers are shared. <button class="linkbtn" id="unshare">Stop sharing</button></p>`:""}
    <div class="feedback" id="fbOut" ${j.feedback||busy?"":"hidden"}>${esc(j.feedback||"")}</div>
  </section>`;
}

function discussHTML(n){
  const d=S.day,dd=d.doc;
  const others=Object.entries(d.answers).filter(([id])=>id!==S.uid).sort((a,b)=>(b[1].at||0)-(a[1].at||0));
  const amenBtn=(target)=>{const r=rxFor(d.rx,target),me=r.some(x=>x.from===S.uid);
    return `<button class="react" data-rx="${esc(target)}" aria-pressed="${me}" ${S.readOnly?"disabled":""}>Amen${r.length?" "+r.length:""}</button>`};
  const ansHTML=others.map(([id,a])=>{const p=getP(id)||{};
    return `<li class="post">${avatar(p)}<div class="body"><p class="who">${esc(nameOf(id))} <span>${ago(a.at||Date.now())}</span></p>
    ${a.takeaway?`<p class="txt">${esc(a.takeaway)}</p>`:""}
    ${(a.answers||[]).some(x=>x)?`<details><summary>Read their answers</summary><dl>${(a.answers||[]).map((x,i)=>x?`<dt>${esc(((dd&&dd.questions)||FALLBACK_Q)[i]||"Question "+(i+1))}</dt><dd>${esc(x)}</dd>`:"").join("")}</dl></details>`:""}
    <div class="bar">${amenBtn("a-"+id+"-d"+n)}</div></div></li>`}).join("");
  const cm=d.comments.map(c=>{const p=getP(c.uid)||{};
    return `<li class="post">${avatar(p)}<div class="body"><p class="who">${esc(nameOf(c.uid))} <span>${ago(c.at||Date.now())}</span></p>
    <p class="txt">${esc(c.text)}</p><div class="bar">${amenBtn("c-"+c.id)}${c.uid===S.uid?`<button class="linkbtn" data-delc="${esc(c.id)}">Delete</button>`:""}</div></div></li>`}).join("");
  return `<section class="panel" aria-labelledby="dh"><h2 id="dh">Day ${n} discussion</h2>
    ${others.length?`<h3>Shared reflections</h3><ul class="posts">${ansHTML}</ul>`:""}
    <h3>Comments</h3>
    ${cm?`<ul class="posts">${cm}</ul>`:`<p class="lede">No comments yet. Start the conversation about today's episode.</p>`}
    ${S.readOnly?"":`<div class="compose"><textarea id="cIn" data-keep="c${n}" maxlength="600" placeholder="Say something about Day ${n}" aria-label="Write a comment"></textarea><button class="btn primary sm" id="postC">Post</button></div>`}
  </section>`;
}

function fellowshipHTML(){
  const list=Object.entries(S.players).filter(([,p])=>p&&p.name).map(([id,p])=>({id,p,s:stats(p)}));
  list.sort((a,b)=>b.s.xp-a.s.xp||b.s.done-a.s.done||a.p.name.localeCompare(b.p.name));
  const rows=list.map((x,i)=>{
    const u=unlocked(x.p),em=EMBLEMS.find(e=>e.id===x.p.emblem&&u.emblems.includes(e.id));
    const card=u.cards.includes(x.p.card)?x.p.card:"vigil",rk=rankOf(x.s.xp).name;
    const got=S.cheers.filter(c=>c.to===x.id).length,you=x.id===S.uid;
    const myCheer=S.cheers.find(c=>c.to===x.id&&c.from===S.uid);
    return `<li><button class="card cc-${card}${you?" you":""}" data-profile="${esc(x.id)}" aria-label="View ${esc(x.p.name)}'s profile">
      <span class="rank">${i+1}</span>${avatar(x.p)}
      <span class="who"><p class="nm">${esc(x.p.name)}${you?" (you)":""}</p>
      <p class="st">${rk}, ${x.s.xp} XP. ${pl(x.s.done,"day")} done, ${streakTxt(x.s.streak)}${got?`. ${pl(got,"cheer")} today`:""}</p>
      <span class="pbar" style="display:block"><span style="width:${(x.s.done/TOTAL*100).toFixed(1)}%"></span></span></span>
      ${em?`<span class="em" title="${esc(em.name)}">${emblemSVG(em)}</span>`:""}
    </button>
    </li>`}).join("");
  return `<div class="fgrid"><div>
  ${teamCardHTML()}${soloCardHTML()}${communityHTML()}${recapHTML()}
  </div><div>
  <h2>Leaderboard</h2>
  <p class="lede">Tap anyone to see their profile and badges, or send encouragement.</p>
  <ol class="board">${rows||`<p class="lede">No one has joined yet.</p>`}</ol></div></div>`;
}
function daysLeftInWeek(){return 6-((new Date().getDay()+6)%7)}
const barHTML=pct=>`<div class="goalbar"><span style="width:${(Math.min(1,Math.max(0,pct))*100).toFixed(1)}%"></span></div>`;
function teamCardHTML(){
  const t=S.team;if(S.local||!t)return "";
  const C=currentChallenge(),goal=teamGoal(t,C.ch),v=C.ch.tm(t),done=v>=goal,dl=daysLeftInWeek();
  return `<section class="panel challenge" aria-labelledby="tc"><h2 id="tc">Our week together</h2>
    <p class="big-num">${v.toLocaleString()} <span>of ${goal.toLocaleString()}</span></p>
    <p style="margin:0">${esc(C.ch.tt.charAt(0).toUpperCase()+C.ch.tt.slice(1))}. ${done?"<strong>We did it! Everyone who read this week earns 25 XP.</strong>":"Every bit helps. "+(dl?pl(dl,"day")+" left.":"Last day!")}</p>
    ${barHTML(v/goal)}
    <p class="small" style="margin:0">${pl(t.readers,"reader")} joined in this week. Totals only, no names.</p></section>`;
}
function soloCardHTML(){
  if(!S.me)return "";
  const C=currentChallenge(),mine=C.ch.f(weekActivity(S.me,C.ws)),goal=C.ch.goal,done=mine>=goal;
  return `<section class="panel" aria-labelledby="sc"><h2 id="sc">Your week</h2>
    <p style="margin:0">Goal: ${esc(C.ch.t.toLowerCase())}. ${done?"<strong>You did it! +15 XP.</strong>":"Any progress counts. No rush."}</p>
    ${barHTML(mine/goal)}
    <p class="small" style="margin:0">${Math.min(mine,goal)} of ${goal} ${C.ch.unit}. Only you can see this.</p></section>`;
}
function communityHTML(){
  const t=S.team,invite=`<button class="btn" data-setup style="width:100%;margin-top:12px">Invite people and get it on your phone</button>`;
  if(S.local||!t)return `<section class="panel"><h2>Through the Bible together</h2><p class="lede" style="margin:0">Invite friends and family to read along with you.</p>${invite}</section>`;
  const total=t.episodes_total,next=MILESTONES.find(m=>total<m[0]),prev=[...MILESTONES].reverse().find(m=>total>=m[0]);
  const base=prev?prev[0]:0;
  return `<section class="panel"><h2>Through the Bible together</h2>
    <p class="lede" style="margin:0"><strong>${total.toLocaleString()}</strong> episodes finished by ${pl(t.members,"reader")} so far.</p>
    ${next?barHTML((total-base)/(next[0]-base)):barHTML(1)}
    <p class="small" style="margin:0">${next?`${(next[0]-total).toLocaleString()} more episodes to unlock “${esc(next[2])}”.`:"Every community badge is unlocked!"}</p>
    <div class="badgerow">${MILESTONES.map(m=>{const ok=total>=m[0];return `<div class="mbadge${ok?"":" off"}" title="${esc(m[2])}">${emblemSVG({glyph:m[1],c:"#94701F"},!ok)}<span>${esc(m[2])}</span></div>`}).join("")}</div>
    ${invite}</section>`;
}


function prayerHTML(){
  if(S.local)return `<h2>Prayer requests</h2><p class="lede">The prayer wall isn't available yet.</p>`;
  const items=S.prayers.map(pr=>{
    const r=rxFor(S.prayRx,"p-"+pr.id),me=r.some(x=>x.from===S.uid),p=getP(pr.uid)||{},own=pr.uid===S.uid;
    return `<li class="post prayer${pr.answered?" answered":""}">${avatar(p)}<div class="body">
      <p class="who">${esc(nameOf(pr.uid))} <span>${ago(pr.at||Date.now())}</span>${pr.answered?`<span class="tag">Answered</span>`:""}</p>
      <p class="txt">${esc(pr.text)}</p>
      <div class="bar"><button class="react" data-pray="${esc(pr.id)}" aria-pressed="${me}" ${S.readOnly?"disabled":""}>${me?"Praying":"I'll pray"}${r.length?" "+r.length:""}</button>
      ${own?`<button class="linkbtn" data-ans="${esc(pr.id)}">${pr.answered?"Mark not answered":"Mark answered"}</button><button class="linkbtn" data-delp="${esc(pr.id)}">Delete</button>`:""}</div>
    </div></li>`}).join("");
  return `<div class="narrow"><h2>Prayer requests</h2>
  <p class="lede">Share what's on your heart. Friends can tap to let you know they're praying.</p>
  ${S.readOnly?"":`<div class="panel"><label class="l" for="pIn" style="margin-top:0">Your request</label>
  <textarea id="pIn" data-keep="prayer" maxlength="600" placeholder="What can we pray for?"></textarea>
  <button class="btn primary" id="postP" style="width:100%;margin-top:10px">Post request</button></div>`}
  ${items?`<ul class="posts">${items}</ul>`:`<p class="lede">No requests yet.</p>`}</div>`;
}

function armoryHTML(){
  const p=S.me,st=stats(p),u=unlocked(p),rk=rankOf(st.xp);
  const cards=CARDS.map(c=>{const ok=u.cards.includes(c.id),eq=p.card===c.id||(!p.card&&c.id==="vigil");
    return `<li><button class="item${ok?"":" locked"}${eq?" eq":""}" data-card="${c.id}" ${ok?"":"aria-disabled=\"true\""}>
    <div class="sw cc-${c.id}"></div><div class="tx"><p class="t">${esc(c.name)}</p><p class="r">${eq?"Equipped":ok?"Tap to equip":esc(c.req)}</p></div></button></li>`}).join("");
  const ems=EMBLEMS.map(e=>{const ok=u.emblems.includes(e.id),eq=p.emblem===e.id;
    return `<li><button class="item embl${ok?"":" locked"}${eq?" eq":""}" data-emblem="${e.id}" ${ok?"":"aria-disabled=\"true\""}>
    ${emblemSVG(e,!ok)}<span><span class="t" style="display:block;font-weight:700">${esc(e.name)}</span><span class="r small">${eq?"Equipped":ok?"Tap to equip":esc(e.req)}</span></span></button></li>`}).join("");
  const pct=rk.next?Math.round((st.xp-rk.min)/(rk.next[0]-rk.min)*100):100;
  return `<div class="hero-me">${avatar(p)}<div><h2>${esc(p.name)}</h2>
    <p class="small" style="margin:0">${esc(rk.name)} ${esc((CLASSES.find(c=>c.id===p.cls)||{}).name||"")}</p>
    <button class="linkbtn" id="editMe">Change name or avatar</button></div></div>
  <section class="panel rankbox"><h2>${esc(rk.name)}, ${st.xp} XP</h2>
    <div class="goalbar"><span style="width:${pct}%"></span></div>
    <p class="small" style="margin:0 0 10px">${rk.next?`${rk.next[0]-st.xp} XP to ${rk.next[1]}`:"The highest rank. Well done, good and faithful servant."}</p>
    <p class="small" style="margin:0">Earn XP: 10 per episode, 5 per reflection, 2 per quiz answer, 15 for reaching your weekly goal, 25 when the team reaches its goal. Ranks: ${RANKS.map(r=>r[1]).join(", ")}.</p>
    <p class="small" style="margin:8px 0 0">Streak freezes: ${st.freezes} of 3. You earn one every 7 days in a row, and one is used automatically if you miss a day.</p>
  </section>
  <h2>Calling cards</h2><p class="lede">Your card is the banner behind you on the leaderboard.</p>
  <ul class="items">${cards}</ul>
  <h2>Emblems</h2><p class="lede">Equip one to show next to your name.</p>
  <ul class="items">${ems}</ul>
  ${S.isAdmin?`<section class="panel"><h2>Admin</h2><p class="lede">Visible only to you. See who has joined and how the app is being used.</p><button class="btn primary" id="adminOpen" style="width:100%">Open admin dashboard</button></section>`:""}`;
}
/* ---------- interactions ---------- */
function bindView(){
  const on=(id,fn)=>{const el=$("#"+id);if(el)el.onclick=fn};
  const all=(sel,fn)=>document.querySelectorAll(sel).forEach(b=>b.onclick=()=>fn(b));
  on("prevD",()=>changeDay(-1));
  on("nextD",()=>changeDay(1));
  all("[data-profile]",b=>openFriend(b.dataset.profile));
  all("[data-setup]",()=>openSetup());
  on("cuStart",()=>{const m=missedDays(S.me);if(!m.length)return;S.catchup=true;S.viewDay=m[0];render();window.scrollTo({top:0})});
  on("cuStop",()=>{S.catchup=false;S.viewDay=nextDay(S.me);render()});
  on("cuBulk",openBulk);
  all("[data-rw]",b=>{S.recapWeek=+b.dataset.rw;render()});
  on("rcShare",()=>shareRecap());
  on("rcCopy",e=>copyText(recapText(weekRecap(recapWs())),"Recap copied. Paste it in your group chat."));
  on("rcImg",saveRecapImage);
  all("[data-setup-hide]",()=>{try{localStorage.setItem("yow-setup-hide","1")}catch(e){}render()});
  all("[data-jump]",b=>{S.viewDay=+b.dataset.jump;S.slide=0;render()});
  on("mark",markDone);
  on("addYt",()=>{S.ytEdit=S.viewDay;render();const i=$("#ytIn");if(i)i.focus()});
  on("saveYt",async()=>{
    const inp=$("#ytIn"),v=(inp.value||"").trim(),n=S.viewDay;
    if(v&&!YT_RE.test(v)){$("#ytErr").textContent="That doesn't look like a YouTube video link.";return}
    const doc={...(S.day.doc||{})};if(v)doc.yt=v;else delete doc.yt;
    S.ytEdit=null;inp.value="";
    await saveDayDoc(n,doc);render();toast(v?"YouTube link saved for everyone.":"YouTube link removed.");
  });
  on("undo",()=>{const n=S.viewDay,doneOn={...(S.me.doneOn||{})};delete doneOn[n];savePlayer({completed:(S.me.completed||[]).filter(x=>x!==n),doneOn})});
  on("genDay",()=>genDay(S.viewDay));
  on("redo",()=>{S.redoDay=S.viewDay;genDay(S.viewDay)});
  all("[data-mapview]",b=>{S.mapView=b.dataset.mapview;render()});
  on("submitQuiz",submitQuiz);
  on("fb",()=>getFeedback(S.viewDay));
  on("share",shareAnswers);
  on("unshare",()=>dbTry(()=>Backend.unshareAnswers(S.viewDay)));
  on("adminOpen",openAdmin);
  on("postC",postComment);
  on("postP",postPrayer);
  on("editMe",()=>openProfile(false));
  all("[data-qi]",b=>{const n=S.viewDay,i=+b.dataset.qi;S.quizSel[n]=S.quizSel[n]||[];S.quizSel[n][i]=+b.dataset.qk;render()});
  all("[data-rx]",b=>toggleReact("d"+S.viewDay,b.dataset.rx,S.day.rx));
  all("[data-delc]",b=>{if(confirmDelete())dbTry(()=>Backend.deleteComment(b.dataset.delc))});
  all("[data-cheer]",b=>{S.cheerOpen=S.cheerOpen===b.dataset.cheer?null:b.dataset.cheer;render()});
  all("[data-send]",b=>sendCheer(b.dataset.to,b.dataset.send));
  all("[data-pray]",async b=>{const isNew=await toggleReact("prayers","p-"+b.dataset.pray,S.prayRx);if(isNew)savePlayer({prayed:(S.me.prayed||0)+1})});
  all("[data-ans]",b=>{const pr=S.prayers.find(x=>x.id===b.dataset.ans);if(pr)dbTry(()=>Backend.setPrayerAnswered(pr.id,!pr.answered))});
  all("[data-delp]",b=>{if(confirmDelete())dbTry(()=>Backend.deletePrayer(b.dataset.delp))});
  all("[data-card]",b=>{if(unlocked(S.me).cards.includes(b.dataset.card))savePlayer({card:b.dataset.card})});
  all("[data-emblem]",b=>{if(unlocked(S.me).emblems.includes(b.dataset.emblem))savePlayer({emblem:b.dataset.emblem})});
  document.querySelectorAll("textarea[data-a],#take").forEach(t=>t.addEventListener("change",()=>saveJournal(S.viewDay,collectJournal(S.viewDay))));
}
function confirmDelete(){try{return window.confirm("Delete this for everyone?")}catch(e){return true}}
function collectJournal(n){
  const j={...(S.journal[n]||{})};
  j.answers=[...document.querySelectorAll("textarea[data-a]")].map(t=>t.value.trim());
  const t=$("#take");if(t)j.takeaway=t.value.trim();
  return j;
}

function markDone(){
  const n=S.viewDay,p=S.me,t=today();
  const completed=[...new Set([...(p.completed||[]),n])].sort((a,b)=>a-b);
  const dates=[...new Set([...(p.dates||[]),t])];
  const doneOn={...(p.doneOn||{}),[n]:t};
  const patch={completed,dates,doneOn};
  const s=currentStreak([...dates,...(p.frozen||[])]),fz=p.freezes||0;
  if(s>0&&s%7===0&&p.freezeAward!==t&&fz<3){patch.freezes=fz+1;patch.freezeAward=t;toast("You earned a streak freeze for "+s+" days in a row.")}
  celebrate(n,s);
  savePlayer(patch);
  if(S.catchup){
    const rest=missedDays(S.me);
    if(rest.length)setTimeout(()=>{if(!S.catchup)return;S.viewDay=rest[0];S.slide=1;render();S.slide=0;window.scrollTo({top:0});toast("Next up: Day "+rest[0]+". "+pl(rest.length,"day")+" left.")},1500);
    else{S.catchup=false;setTimeout(()=>{toast("You're all caught up!");render()},1500)}
  }
}

async function genDay(n){
  if(!S.ai)return;
  const force=S.redoDay===n,readings=readingsText(n);
  S.busy["gen"+n]=true;S.busy["genErr"+n]="";render();
  try{
    const r=await Backend.aiStudyGuide({day:n,period:periodOf(n).name,readings});
    const quiz=(Array.isArray(r.quiz)?r.quiz:[]).filter(q=>q&&q.q&&Array.isArray(q.options)&&q.options.length>=2&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<q.options.length)
      .slice(0,5).map(q=>({q:String(q.q),options:q.options.map(String),answer:q.answer,why:String(q.why||"")}));
    if(!r||!r.recap||!Array.isArray(r.questions))throw{code:"bad_output"};
    const doc={readings:String(r.readings||readings||""),period:String(r.period||""),recap:String(r.recap),
      verse:r.verse&&r.verse.text?{ref:String(r.verse.ref||""),text:String(r.verse.text)}:null,verseWhy:String(r.verseWhy||""),
      questions:r.questions.slice(0,3).map(String),quiz,at:Date.now()};
    if(S.day.doc&&S.day.doc.yt)doc.yt=S.day.doc.yt;
    S.redoDay=null;S.busy["gen"+n]=false;
    await saveDayDoc(n,doc);
    render();
  }catch(e){
    S.busy["gen"+n]=false;
    const c=e&&e.code;
    S.busy["genErr"+n]=c==="quota"?"You've reached today's limit for study guides. Please try again tomorrow."
      :c==="not_signed_in"?"Please sign in again, then try once more."
      :c==="offline"?"Can't reach the server. Check your connection and try again."
      :"Couldn't prepare the day. Try again in a moment.";
    render();
  }
}

function submitQuiz(){
  const n=S.viewDay,dd=S.day.doc,sel=S.quizSel[n]||[];if(!dd||!dd.quiz)return;
  const s=dd.quiz.reduce((t,q,i)=>t+(sel[i]===q.answer?1:0),0);
  savePlayer({quiz:{...(S.me.quiz||{}),[n]:{s,d:today(),picks:sel.slice(0,dd.quiz.length)}}});
  toast(s===dd.quiz.length?"Perfect score! +"+s*2+" points":s+" right. +"+s*2+" points");
}

async function getFeedback(n){
  const dd=S.day.doc;if(!dd||!S.ai)return;
  const j=collectJournal(n);
  if(!j.answers.some(a=>a)&&!j.takeaway){toast("Write at least one answer first.");return}
  S.busy["fb"+n]=true;render();
  const out=$("#fbOut");if(out){out.hidden=false;out.textContent="Thinking…"}
  try{
    const text=await Backend.aiFeedback({day:n,readings:dd.readings||"",recap:dd.recap||"",verse:dd.verse||null,
      questions:dd.questions||[],answers:j.answers,takeaway:j.takeaway||""});
    j.feedback=text;S.busy["fb"+n]=false;
    await saveJournal(n,j);
    if(!(S.me.reflected||[]).includes(n))await savePlayer({reflected:[...(S.me.reflected||[]),n],reflOn:{...(S.me.reflOn||{}),[n]:today()}});
    else render();
  }catch(e){
    S.busy["fb"+n]=false;render();
    const c=e&&e.code;
    toast(c==="quota"?"You've reached today's feedback limit. Please try again tomorrow.":c==="offline"?"Can't reach the server. Check your connection.":"Couldn't get feedback. Try again.");
  }
}

async function shareAnswers(){
  const n=S.viewDay,j=collectJournal(n);
  if(!j.answers.some(a=>a)&&!j.takeaway){toast("Write at least one answer first.");return}
  await saveJournal(n,j);
  const ok=await dbTry(()=>Backend.shareAnswers(n,{answers:j.answers,takeaway:j.takeaway||""}));
  if(ok){toast("Shared with the fellowship.");if(!(S.me.reflected||[]).includes(n))savePlayer({reflected:[...(S.me.reflected||[]),n],reflOn:{...(S.me.reflOn||{}),[n]:today()}})}
}
async function postComment(){
  const el=$("#cIn"),text=el?el.value.trim():"";if(!text)return;
  el.value="";
  const ok=await dbTry(()=>Backend.addComment(S.viewDay,text));
  if(!ok&&el)el.value=text;
}
async function postPrayer(){
  const el=$("#pIn"),text=el?el.value.trim():"";if(!text)return;
  el.value="";
  const ok=await dbTry(()=>Backend.addPrayer(text));
  if(ok)toast("Your request is posted.");else if(el)el.value=text;
}
async function sendCheer(to,kind){
  const t=today(),existed=S.cheers.some(c=>c.to===to&&c.from===S.uid);
  const ok=await dbTry(()=>Backend.sendCheer(to,kind,t));
  if(ok){S.cheerOpen=null;toast("Sent to "+nameOf(to)+".");if(!existed)savePlayer({cheersSent:(S.me.cheersSent||0)+1});else render()}
}
function checkWeekly(){
  if(!S.me)return;
  const C=currentChallenge(),mine=C.ch.f(weekActivity(S.me,C.ws));
  if(mine>=C.ch.goal&&!(S.me.solo||[]).includes(C.ws)&&S.soloPending!==C.ws){
    S.soloPending=C.ws;toast("You reached this week's goal! +15 XP");
    savePlayer({solo:[...(S.me.solo||[]),C.ws]});
  }
  const t=S.team;
  if(!S.local&&t&&mine>0&&C.ch.tm(t)>=teamGoal(t,C.ch)&&!(S.me.wins||[]).includes(C.ws)&&S.winPending!==C.ws){
    S.winPending=C.ws;toast("Our team reached this week's goal! +25 XP");
    savePlayer({wins:[...(S.me.wins||[]),C.ws]});
  }
}

/* ---------- profile ---------- */
function privacyHTML(){
  return `<details class="privacy"><summary>What's shared, and what's private?</summary><ul>
  <li><strong>Shown to everyone:</strong> your display name, avatar, rank, XP, days finished, streak and badges, plus anything you choose to post (comments, shared reflections, prayer requests).</li>
  <li><strong>Only you:</strong> your full reading history and your private notes.</li>
  <li><strong>Only you and the app's owner:</strong> your email address. It is used only to sign you in and is never shown to other people. The owner can also see when your profile was created and when you were last active.</li></ul></details>`;
}
function openProfile(first){
  if($(".modal"))return;
  const legacy=first&&!S.local?lsGet("yow-me"):null;
  const hasLegacy=!!(legacy&&Array.isArray(legacy.completed));
  const draft={name:S.me?S.me.name:(hasLegacy&&legacy.name)||"",cls:S.me?S.me.cls:(hasLegacy&&legacy.cls)||"crusader",
    color:S.me?S.me.color:(hasLegacy&&HEX_OK(legacy.color)&&legacy.color)||COLORS[0],skin:S.me?S.me.skin:(hasLegacy&&HEX_OK(legacy.skin)&&legacy.skin)||SKINS[0]};
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ph"></div>`;
  document.body.appendChild(m);
  const sheet=$(".sheet",m);
  function draw(){
    sheet.innerHTML=`<h2 id="ph">${first?"Join the fellowship":"Your profile"}</h2>
    ${first?`<p class="lede">One episode a day, 365 days, together. Pick a name and a look. They'll show on the leaderboard.${hasLegacy?" Your progress on this device will be saved to your account.":""}</p>`:""}
    <div class="preview">${avatar(draft)}</div>
    <label class="l" for="nm">Name</label>
    <input type="text" id="nm" maxlength="24" autocomplete="nickname" value="${esc(draft.name)}" placeholder="How friends will see you">
    <label class="l">Character</label>
    <div class="pick">${CLASSES.map(c=>`<button data-cls="${c.id}" aria-pressed="${draft.cls===c.id}">${avatar({...draft,cls:c.id})}${esc(c.name)}</button>`).join("")}</div>
    <label class="l">Color</label>
    <div class="swatches">${COLORS.map(c=>`<button data-col="${c}" style="background:${c}" aria-label="Color ${c}" aria-pressed="${draft.color===c}"></button>`).join("")}</div>
    <label class="l">Skin tone</label>
    <div class="swatches">${SKINS.map(c=>`<button data-skin="${c}" style="background:${c}" aria-label="Skin tone ${c}" aria-pressed="${draft.skin===c}"></button>`).join("")}</div>
    <div class="row" style="margin-top:8px">${first?"":`<button class="btn" id="cancel" style="flex:1">Cancel</button>`}
      <button class="btn primary" id="saveP" style="flex:2">${first?"Join":"Save changes"}</button></div>
    ${S.local?"":privacyHTML()}
    ${first||S.local?"":`<div class="acct"><p class="small" style="margin:0">Signed in as <strong>${esc(S.email)}</strong></p>
      <div class="row"><button class="btn sm" id="signOut" style="flex:1">Sign out</button><button class="linkdanger" id="delAcct">Delete my account</button></div></div>`}
    ${first&&!S.local?`<div class="acct"><button class="linkbtn" id="signOutFirst">Use a different email</button></div>`:""}`;
    const nm=$("#nm",sheet);nm.oninput=()=>{draft.name=nm.value};
    sheet.querySelectorAll("[data-cls]").forEach(b=>b.onclick=()=>{draft.cls=b.dataset.cls;draw()});
    sheet.querySelectorAll("[data-col]").forEach(b=>b.onclick=()=>{draft.color=b.dataset.col;draw()});
    sheet.querySelectorAll("[data-skin]").forEach(b=>b.onclick=()=>{draft.skin=b.dataset.skin;draw()});
    const c=$("#cancel",sheet);if(c)c.onclick=()=>m.remove();
    const so=$("#signOut",sheet)||$("#signOutFirst",sheet);if(so)so.onclick=async()=>{m.remove();await doSignOut()};
    const da=$("#delAcct",sheet);if(da)da.onclick=async()=>{
      let yes=false;try{yes=window.confirm("Delete your account and all of your progress, posts and prayer requests? This cannot be undone.")}catch(e){}
      if(!yes)return;
      try{await Backend.deleteAccount()}catch(e){toast("Couldn't delete the account. Please try again.");return}
      m.remove();toast("Your account was deleted.");await doSignOut(true);
    };
    $("#saveP",sheet).onclick=async()=>{
      const name=draft.name.trim();
      if(!name){nm.focus();nm.placeholder="Enter a name to continue";return}
      m.remove();
      const wasNew=!S.me;
      if(!S.me)S.me=hasLegacy?{...legacy}:{completed:[],dates:[],reflected:[],card:"vigil",emblem:"",best:0,joined:today()};
      const ok=await savePlayer({name,cls:draft.cls,color:draft.color,skin:draft.skin});
      if(wasNew&&ok&&hasLegacy){try{localStorage.removeItem("yow-me")}catch(e){}toast("Your progress on this device was saved to your account.")}
    };
  }
  draw();
  setTimeout(()=>{const n=$("#nm",sheet);if(n&&first)n.focus()},50);
}

document.querySelectorAll("nav.tabs button").forEach(b=>b.onclick=()=>{S.tab=b.dataset.tab;S.cheerOpen=null;render();window.scrollTo(0,0)});
$("#meChip").onclick=()=>openProfile(false);

/* ---------- Bible Timeline periods (start days from Ascension's plan) ---------- */
const PERIODS=[
 {name:"Early World",start:1,color:"#2BA6A4",pal:["#2BA6A4","#7FD3CF","#1C6F7A","#E9C46A"],sym:"globe"},
 {name:"Patriarchs",start:6,color:"#8A2246",pal:["#7A1E3A","#B23A5E","#4A1024","#E2BD5E"],sym:"stars"},
 {name:"Egypt & Exodus",start:27,color:"#C0392B",pal:["#B3261E","#E0533D","#6E120E","#F2C14E"],sym:"waves"},
 {name:"Desert Wanderings",start:52,color:"#C8A26B",pal:["#C8A26B","#E6CB97","#8C6A3B","#D9622B"],sym:"fire"},
 {name:"Conquest & Judges",start:81,color:"#3D8B37",pal:["#3D8B37","#7BC06A","#22561F","#E9C46A"],sym:"trumpet"},
 {name:"Royal Kingdom",start:106,color:"#6A35A0",pal:["#5B2A86","#8E5CC2","#371652","#E2BD5E"],sym:"crown"},
 {name:"Divided Kingdom",start:162,color:"#3A3A46",pal:["#2B2B33","#4C4C5C","#15151B","#B3261E"],sym:"split"},
 {name:"Exile",start:184,color:"#7DB7E8",pal:["#7DB7E8","#B6D8F2","#3E78AE","#E2BD5E"],sym:"harp"},
 {name:"Return",start:267,color:"#E8C547",pal:["#E8C547","#F5E08C","#B08D1E","#3E78AE"],sym:"temple"},
 {name:"Maccabean Revolt",start:282,color:"#E07A2E",pal:["#E07A2E","#F2A65A","#A44E14","#2B2B33"],sym:"menorah"},
 {name:"Messianic Fulfillment",start:313,color:"#C9A227",pal:["#C9A227","#EBD27A","#8C6D10","#B3261E"],sym:"star"},
 {name:"The Church",start:322,color:"#D9D4C3",pal:["#F4F1E8","#D9D4C3","#B9B09A","#B3261E"],sym:"dove"}];
function periodOf(n){let p=PERIODS[0];for(const x of PERIODS)if(n>=x.start)p=x;return p}
function periodEnd(i){return PERIODS[i+1]?PERIODS[i+1].start-1:TOTAL}
function seeded(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function symbolSVG(k){
  const st=(x,y,r)=>`<path d="M${x} ${y-r}L${x+r*.3} ${y-r*.3}L${x+r} ${y}L${x+r*.3} ${y+r*.3}L${x} ${y+r}L${x-r*.3} ${y+r*.3}L${x-r} ${y}L${x-r*.3} ${y-r*.3}Z" stroke="none"/>`;
  switch(k){
    case "globe":return `<g fill="none" stroke-width="2.2"><circle r="17"/><ellipse rx="7.5" ry="17"/><path d="M-17 0H17M-14-9H14M-14 9H14"/></g>`;
    case "stars":return st(0,-4,11)+st(-13,9,6)+st(13,9,6)+st(-12,-13,4)+st(12,-13,4);
    case "waves":return `<g fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M-19-9q5-6 9.5 0t9.5 0t9.5 0t9.5 0"/><path d="M-19 1q5-6 9.5 0t9.5 0t9.5 0t9.5 0"/><path d="M-19 11q5-6 9.5 0t9.5 0t9.5 0t9.5 0"/></g>`;
    case "fire":return `<path stroke="none" d="M0-20C9-8 14 0 9 11C5 19-5 19-9 11C-13 2-6-3-3-9C-2-3 1 0 3-2C5-6 3-13 0-20Z"/>`;
    case "trumpet":return `<g fill="none" stroke-width="4" stroke-linecap="round"><path d="M-17 12Q-4 10 5-2Q10-10 13-16"/></g><path stroke="none" d="M9-19L19-13L16-9L7-14Z"/>`;
    case "crown":return `<path stroke="none" d="M-18 11L-18-7L-9 3L0-13L9 3L18-7L18 11Z"/><circle cx="0" cy="-15" r="2.5" stroke="none"/>`;
    case "split":return `<path stroke="none" d="M-19 11L-19-7L-11 2L-3-12L-3 11Z"/><path stroke="none" d="M3 11L3-12L11 2L19-7L19 11Z" transform="translate(2 3) rotate(8)"/>`;
    case "harp":return `<g fill="none" stroke-width="2.6" stroke-linecap="round"><path d="M-12 16V-4C-12-12-6-16-6-16M12 16V-4C12-12 6-16 6-16M-14 14H14M-12-4H12"/><path stroke-width="1.2" d="M-6-4V14M0-4V14M6-4V14"/></g>`;
    case "temple":return `<g fill="none" stroke-width="2.4" stroke-linejoin="round"><path d="M-20-3H20L0-17Z"/><path d="M-14-3V13M-5-3V13M5-3V13M14-3V13M-19 14H19"/></g>`;
    case "menorah":return `<g fill="none" stroke-width="2.2" stroke-linecap="round"><path d="M0 15V-8M-16-8Q-16 6 0 6Q16 6 16-8M-10-8Q-10 1 0 1Q10 1 10-8M-5-8Q-5-3 0-3Q5-3 5-8M-8 15H8"/></g>${[-16,-10,-5,0,5,10,16].map(x=>`<ellipse cx="${x}" cy="-12" rx="1.8" ry="3" stroke="none"/>`).join("")}`;
    case "star":return `<path stroke="none" d="${(()=>{let d="";for(let i=0;i<16;i++){const r=i%2?7:19,a=i*Math.PI/8-Math.PI/2;d+=(i?"L":"M")+(Math.cos(a)*r).toFixed(1)+" "+(Math.sin(a)*r).toFixed(1)}return d+"Z"})()}"/>`;
    default:return `<path stroke="none" d="M-19 3Q-7-3 0 3Q5-13 18-17Q11-7 9 1Q14 5 19 3Q9 13-4 10Q-12 10-19 3Z"/><circle cx="-11" cy="2" r="1.3" fill="#14110c" stroke="none"/>`;
  }
}
const glassCache={};
function glassSVG(p){
  if(glassCache[p.start])return glassCache[p.start];
  const rnd=seeded(p.start*7919);let panes="";const dx=34,dy=44;
  for(let i=-1;i<=16;i++)for(let j=-1;j<=8;j++){
    const cx=j*dx+(i%2?dx/2:0),cy=i*dy/2,c=p.pal[Math.floor(rnd()*3)],o=(.7+rnd()*.3).toFixed(2);
    panes+=`<polygon points="${cx},${cy-dy/2} ${cx+dx/2},${cy} ${cx},${cy+dy/2} ${cx-dx/2},${cy}" fill="${c}" fill-opacity="${o}"/>`;
  }
  const id="gl"+p.start;
  return glassCache[p.start]=`<svg viewBox="0 0 240 320" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
  <defs><radialGradient id="${id}" cx="50%" cy="28%" r="80%"><stop offset="0" stop-color="#fff" stop-opacity=".3"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></radialGradient></defs>
  <rect width="240" height="320" fill="${p.pal[2]}"/>
  <g stroke="#14110c" stroke-width="2.4" stroke-linejoin="round">${panes}</g>
  <rect width="240" height="320" fill="url(#${id})"/>
  <circle cx="120" cy="66" r="33" fill="${p.pal[3]}" stroke="#14110c" stroke-width="3"/>
  <circle cx="120" cy="66" r="27" fill="#14110c" fill-opacity=".6"/>
  <g transform="translate(120 66)" fill="#F8EFD8" stroke="#F8EFD8">${symbolSVG(p.sym)}</g>
  <circle cx="120" cy="190" r="75" fill="#0d0f22" fill-opacity=".74" stroke="${p.pal[3]}" stroke-width="3"/>
  </svg>`;
}

function timelineHTML(n){
  const meDay=nextDay(S.me),cur=periodOf(n),ci=PERIODS.indexOf(cur);
  const pct=x=>((x-.5)/TOTAL*100).toFixed(2);
  const segs=PERIODS.map((p,i)=>`<button class="tl-seg${p===cur?" on":""}" style="flex:${periodEnd(i)-p.start+1};background-color:${p.color}" data-jump="${p.start}" aria-label="Jump to ${esc(p.name)}, Day ${p.start}"></button>`).join("");
  const friends=Object.entries(S.players).filter(([id,p])=>p&&p.name&&id!==S.uid)
    .map(([id,p])=>`<button class="tl-dot" style="left:${pct(nextDay(p))}%" data-profile="${esc(id)}" aria-label="${esc(p.name)} is on Day ${nextDay(p)}">${avatar(p)}</button>`).join("");
  return `<section class="timeline" aria-label="Bible timeline">
    <div class="tl-row">${friends}<span class="tl-dot me" style="left:${pct(meDay)}%" title="You are on Day ${meDay}">${avatar(S.me)}</span></div>
    <div class="tl-bar">${segs}<span class="tl-view" style="left:${pct(n)}%"></span></div>
    <p class="tl-cap"><strong>${esc(cur.name)}</strong>, Days ${cur.start} to ${periodEnd(ci)}. Tap a color to jump there.</p>
  </section>`;
}
function todayStripHTML(){
  const t=today(),list=Object.entries(S.players).filter(([,p])=>p&&p.name);
  if(!list.length)return "";
  const isDone=p=>finishedToday(p);
  list.sort((a,b)=>(isDone(b[1])-isDone(a[1]))||(a[0]===S.uid?-1:b[0]===S.uid?1:0));
  const n=list.filter(([,p])=>isDone(p)).length;
  return `<section class="strip" aria-label="Who finished today">
    <p class="strip-cap"><strong>${n} of ${list.length}</strong> finished today</p>
    <div class="strip-row">${list.map(([id,p])=>{const d=isDone(p);return `<button class="strip-p${d?" done":""}" data-profile="${esc(id)}" aria-label="${esc(p.name)}, ${d?"finished today":"not yet today"}"><span class="ava">${avatar(p)}${d?`<b class="ck" aria-hidden="true">✓</b>`:""}</span><span class="nm">${id===S.uid?"You":esc(p.name.split(" ")[0])}</span></button>`}).join("")}</div>
  </section>`;
}

/* ---------- sheets ---------- */
function openSheet(html,bind){
  const old=$(".modal");if(old)old.remove();
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true">${html}</div>`;
  m.addEventListener("click",e=>{if(e.target===m)m.remove()});
  const esc2=e=>{if(e.key==="Escape"){m.remove();document.removeEventListener("keydown",esc2)}};
  document.addEventListener("keydown",esc2);
  document.body.appendChild(m);
  const sh=$(".sheet",m);if(bind)bind(sh,m);
  const f=sh.querySelector("button");if(f)f.focus();
  return m;
}
function openFriend(id){
  const p=getP(id);if(!p)return;
  const draw=()=>{
    const st=stats(p),u=unlocked(p),rk=rankOf(st.xp),you=id===S.uid;
    const card=u.cards.includes(p.card)?p.card:"vigil",doneToday=finishedToday(p);
    const ems=EMBLEMS.filter(e=>u.emblems.includes(e.id));
    const mine=S.cheers.find(c=>c.to===id&&c.from===S.uid);
    return `<div class="card cc-${card} pf-head">${avatar(p)}<div class="who"><p class="nm" style="font-size:1.3rem">${esc(p.name)}${you?" (you)":""}</p><p class="st">${esc(rk.name)} ${esc((CLASSES.find(c=>c.id===p.cls)||{}).name||"")}, ${st.xp} XP</p></div></div>
    <p style="margin:12px 0 0">${doneToday?"Finished an episode today.":"Hasn't finished an episode yet today."} On Day ${nextDay(p)}, in the ${esc(periodOf(nextDay(p)).name)} period.</p>
    <div class="pf-stats">
      <div><strong>${st.done}</strong><span>days done</span></div>
      <div><strong>${st.streak}</strong><span>day streak</span></div>
      <div><strong>${st.best}</strong><span>best streak</span></div>
      <div><strong>${st.refl}</strong><span>reflections</span></div>
      <div><strong>${st.qp}</strong><span>quiz points</span></div>
      <div><strong>${st.wins}</strong><span>team wins</span></div>
    </div>
    <h3 style="margin-top:0">Emblems earned (${ems.length} of ${EMBLEMS.length})</h3>
    ${ems.length?`<div class="pf-ems">${ems.map(e=>`<span title="${esc(e.name)}">${emblemSVG(e)}</span>`).join("")}</div>`:`<p class="lede">None yet.</p>`}
    ${!you&&!S.local&&!S.readOnly?`<h3>Send encouragement</h3><div class="row">${CHEERS.map(c=>`<button class="react" data-send2="${c.id}" aria-pressed="${mine&&mine.kind===c.id?"true":"false"}">${c.t}</button>`).join("")}</div>`:""}
    <div class="row" style="margin-top:18px">${you?`<button class="btn" id="pfEdit" style="flex:1">Edit my profile</button>`:""}<button class="btn" id="pfClose" style="flex:1">Close</button></div>`;
  };
  openSheet(draw(),function bind(sh,m){
    const wire=()=>{
      sh.querySelectorAll("[data-send2]").forEach(b=>b.onclick=async()=>{await sendCheer(id,b.dataset.send2);sh.innerHTML=draw();wire()});
      const c=$("#pfClose",sh);if(c)c.onclick=()=>m.remove();
      const e=$("#pfEdit",sh);if(e)e.onclick=()=>{m.remove();openProfile(false)};
    };wire();
  });
}
function applyDisplay(){
  const d=document.documentElement;let t="auto",z="normal";
  try{t=localStorage.getItem("yow-theme")||"auto";z=localStorage.getItem("yow-text")||"normal"}catch(e){}
  if(t==="auto")delete d.dataset.theme;else d.dataset.theme=t;
  if(z==="normal")delete d.dataset.text;else d.dataset.text=z;
  return{t,z};
}
function openDisplay(){
  const draw=()=>{const {t,z}=applyDisplay();
    const th=[["auto","Auto","linear-gradient(135deg,#E6E8EF 50%,#11142A 50%)"],["light","Light","#E6E8EF"],["dark","Dark","#11142A"],["parchment","Parchment","#E9DCBF"]];
    const tx=[["normal","Standard"],["large","Large"],["xl","Extra large"]];
    return `<h2>Display</h2>
    <label class="l">Theme</label>
    <div class="seg">${th.map(([k,l,bg])=>`<button data-th="${k}" aria-pressed="${t===k}"><span class="sw" style="background:${bg}"></span>${l}</button>`).join("")}</div>
    <label class="l">Text size</label>
    <div class="seg three">${tx.map(([k,l])=>`<button data-tx="${k}" aria-pressed="${z===k}"><span style="font-size:${k==="normal"?1:k==="large"?1.15:1.3}rem;font-weight:700">Aa</span>${l}</button>`).join("")}</div>
    <p class="small">Saved on this device only.</p>
    <button class="btn primary" id="dispDone" style="width:100%">Done</button>`;};
  openSheet(draw(),function bind(sh,m){
    const wire=()=>{
      sh.querySelectorAll("[data-th]").forEach(b=>b.onclick=()=>{try{localStorage.setItem("yow-theme",b.dataset.th)}catch(e){}sh.innerHTML=draw();wire();render()});
      sh.querySelectorAll("[data-tx]").forEach(b=>b.onclick=()=>{try{localStorage.setItem("yow-text",b.dataset.tx)}catch(e){}sh.innerHTML=draw();wire();render()});
      $("#dispDone",sh).onclick=()=>m.remove();
    };wire();
  });
}

/* ---------- celebration ---------- */
function celebrate(n,streak){
  const reduce=window.matchMedia&&matchMedia("(prefers-reduced-motion: reduce)").matches;
  const p=periodOf(n),cols=[p.pal[0],p.pal[1],p.pal[3],"#F2D27C"];
  let bits="";
  if(!reduce)for(let i=0;i<40;i++){const a=Math.random()*Math.PI*2,d=110+Math.random()*190;
    bits+=`<i class="${i%4===0?"g":""}" style="--x:${(Math.cos(a)*d).toFixed(0)}px;--y:${(Math.sin(a)*d+60).toFixed(0)}px;--r:${(Math.random()*600-300).toFixed(0)}deg;--c:${cols[i%4]};--d:${(Math.random()*.2).toFixed(2)}s">${i%4===0?"\u271D\uFE0E":""}</i>`}
  const lines=["Well done, good and faithful servant.","Another step through salvation history.","The Word is living and active.","Keep going. The story's getting good."];
  const el=document.createElement("div");el.className="celebrate";
  el.innerHTML=`<div class="cel-card" role="status"><p class="cel-day">Day ${n} done</p><p class="cel-msg">${streak>1?`${streak}-day streak! `:""}${lines[n%lines.length]}</p></div>${bits}`;
  document.body.appendChild(el);setTimeout(()=>el.remove(),2300);
}

/* ---------- day navigation + swipe ---------- */
function changeDay(d){
  const n=Math.min(TOTAL,Math.max(1,(S.viewDay||1)+d));if(n===S.viewDay)return;
  S.viewDay=n;S.slide=d;S.ytEdit=null;render();S.slide=0;
  const a=$(".archrow");if(a&&a.getBoundingClientRect().top<0)window.scrollTo({top:0});
}
(function(){
  let sw=null;const v=$("#view");
  v.addEventListener("touchstart",e=>{
    if(S.tab!=="today"||e.touches.length!==1)return;
    if(e.target.closest("textarea,input,.tl-bar,.tl-row,.strip-row,.opts"))return;
    sw={x:e.touches[0].clientX,y:e.touches[0].clientY,t:Date.now()};
  },{passive:true});
  v.addEventListener("touchend",e=>{
    if(!sw)return;const t=e.changedTouches[0],dx=t.clientX-sw.x,dy=t.clientY-sw.y,dt=Date.now()-sw.t;sw=null;
    if(Math.abs(dx)>60&&Math.abs(dx)>1.6*Math.abs(dy)&&dt<700)changeDay(dx<0?1:-1);
  },{passive:true});
  document.addEventListener("keydown",e=>{
    if(S.tab!=="today"||$(".modal")||e.target.closest("textarea,input"))return;
    if(e.key==="ArrowRight")changeDay(1);else if(e.key==="ArrowLeft")changeDay(-1);
  });
})();
$("#dispBtn").onclick=openDisplay;

/* ---------- sharing, install, reminders ---------- */
function platform(){const u=navigator.userAgent||"";return /iPhone|iPad|iPod/.test(u)||(/Macintosh/.test(u)&&navigator.maxTouchPoints>1)?"ios":/Android/.test(u)?"android":"desktop"}
function setupCardHTML(){
  let hide=false;try{hide=!!localStorage.getItem("yow-setup-hide")}catch(e){}
  if(hide)return "";
  return `<section class="panel setup" aria-labelledby="suh"><h2 id="suh">Make this a daily habit</h2>
    <p class="lede" style="margin-bottom:12px">Put the app on your home screen and set a daily reminder so it takes one tap each morning.</p>
    <div class="row"><button class="btn primary sm" data-setup style="flex:2">Set it up</button><button class="btn sm" data-setup-hide style="flex:1">Hide</button></div></section>`;
}
async function copyLink(btn){
  let ok=false;try{await navigator.clipboard.writeText(APP_URL);ok=true}catch(e){}
  if(!ok){const i=$("#appLink");if(i){i.focus();i.select();try{ok=document.execCommand("copy")}catch(e){}}}
  if(btn)btn.textContent=ok?"Copied":"Select and copy";
  toast(ok?"Link copied.":"Press and hold the link to copy it.");
}
function gcalLink(time){
  const [h,m]=(time||"07:00").split(":").map(Number);const d=new Date();d.setDate(d.getDate()+1);d.setHours(h,m,0,0);
  const f=x=>x.getFullYear()+pad(x.getMonth()+1)+pad(x.getDate())+"T"+pad(x.getHours())+pad(x.getMinutes())+"00";
  const e=new Date(d.getTime()+25*60000);
  const q=new URLSearchParams({action:"TEMPLATE",text:"Bible in a Year",details:"Today's episode, quiz and reflection:\n"+APP_URL,dates:f(d)+"/"+f(e),recur:"RRULE:FREQ=DAILY"});
  return "https://calendar.google.com/calendar/render?"+q.toString();
}
function openSetup(){
  const os=platform();
  const home={ios:`<li>Open <strong>www.takethecross.app</strong> in <strong>Safari</strong>.</li><li>Tap the <strong>Share</strong> button (the square with an up arrow).</li><li>Tap <strong>Add to Home Screen</strong>.</li><li>Tap <strong>Add</strong>.</li>`,
    android:`<li>Open <strong>www.takethecross.app</strong> in <strong>Chrome</strong>.</li><li>Tap the <strong>⋮</strong> menu in the top right.</li><li>Tap <strong>Add to Home screen</strong> (or <strong>Install app</strong>), then confirm.</li>`,
    desktop:`<li>Bookmark <strong>www.takethecross.app</strong>, or open it on your phone and add it to your home screen from there.</li>`};
  const remind={ios:`<li>Open the <strong>Reminders</strong> app and add a reminder called "Bible in a Year".</li><li>Tap <strong>ⓘ</strong>, turn on <strong>Date</strong> and <strong>Time</strong>, set <strong>Repeat</strong> to Daily, and paste the link into <strong>URL</strong>.</li>`,
    android:`<li>Use the Google Calendar button below. It adds a daily event with the link in it.</li>`,desktop:`<li>Use the Google Calendar button below. It adds a daily event with the link in it.</li>`};
  const html=`<h2>Get it on your phone</h2>
  <label class="l" for="appLink">The app's link</label>
  <div class="linkbox"><input type="text" id="appLink" value="${APP_URL}" readonly aria-label="App link"><button class="btn primary sm" id="cpy">Copy</button></div>
  ${navigator.share?`<button class="btn sm" id="shr" style="width:100%;margin:6px 0 0">Send the link…</button>`:""}

  <h3>1. Add it to your home screen<span class="ostag">${os==="ios"?"iPhone":os==="android"?"Android":"Computer"}</span></h3>
  <ol class="steps">${home[os]}</ol>
  ${os!=="desktop"?`<details><summary class="small">Steps for ${os==="ios"?"Android":"iPhone"}</summary><ol class="steps" style="margin-top:8px">${home[os==="ios"?"android":"ios"]}</ol></details>`:""}

  <h3>2. Set a daily reminder</h3>
  <ol class="steps">${remind[os]}</ol>
  <div class="row"><label class="small" for="rtime">Time</label><input type="time" id="rtime" value="07:00" style="width:auto;border:1px solid var(--line);border-radius:8px;padding:6px;background:var(--surface2)">
  <a class="btn sm" id="gcal" href="${gcalLink("07:00")}" target="_blank" rel="noopener" style="flex:1">Add to Google Calendar</a></div>

  <h3>3. Bring friends and family</h3>
  <p class="small" style="margin:0 0 6px">Send them the link above. They pick an avatar, sign in with their email, and join the leaderboard.</p>
  <button class="btn" id="setupDone" style="width:100%;margin-top:10px">Done</button>`;
  openSheet(html,(sh,m)=>{
    $("#cpy",sh).onclick=e=>copyLink(e.currentTarget);
    const shr=$("#shr",sh);if(shr)shr.onclick=async()=>{try{await navigator.share({title:APP_NAME,text:"Join me reading the Bible in a Year with Fr. Mike Schmitz!",url:APP_URL})}catch(e){if(e&&e.name!=="AbortError")copyLink()}};
    const rt=$("#rtime",sh),g=$("#gcal",sh);rt.oninput=()=>{g.href=gcalLink(rt.value)};
    $("#setupDone",sh).onclick=()=>{try{localStorage.setItem("yow-setup-hide","1")}catch(e){}m.remove();render()};
  });
}

/* ---------- catch-up mode ---------- */
function joinedOf(p){const ds=[p.joined,...(p.dates||[])].filter(Boolean).sort();return ds[0]||today()}
function daysBetween(a,b){return Math.round((parseD(b)-parseD(a))/864e5)}
function missedDays(p){
  const exp=Math.min(TOTAL,daysBetween(joinedOf(p),today()));
  const set=new Set(p.completed||[]),out=[];for(let i=1;i<=exp;i++)if(!set.has(i))out.push(i);return out;
}
function catchupHTML(){
  if(S.readOnly||!S.me)return "";
  const miss=missedDays(S.me);
  if(!miss.length){S.catchup=false;return ""}
  const list=miss.length>6?miss.slice(0,6).join(", ")+" and "+(miss.length-6)+" more":miss.join(", ");
  if(S.catchup)return `<section class="panel catchup" aria-labelledby="cuh"><h2 id="cuh">Catch-up mode</h2>
    <p class="lede">${pl(miss.length,"day")} to go: Day ${list}. Finish each one and you'll move straight to the next.</p>
    <div class="row"><button class="btn sm" id="cuBulk" style="flex:1">Mark several done</button><button class="btn sm" id="cuStop" style="flex:1">Stop catch-up</button></div></section>`;
  return `<section class="panel catchup" aria-labelledby="cuh"><h2 id="cuh">You're ${pl(miss.length,"day")} behind</h2>
    <p class="lede">As Fr. Mike says, there's no such thing as falling behind. Missed: Day ${list}. Catch-up mode walks you through them one at a time.</p>
    <div class="row"><button class="btn primary sm" id="cuStart" style="flex:2">Start catch-up</button><button class="btn sm" id="cuBulk" style="flex:1">Already listened?</button></div></section>`;
}
function openBulk(){
  const miss=missedDays(S.me);if(!miss.length)return;
  const html=`<h2>Mark days you've already heard</h2>
  <p class="lede">Listened somewhere else? Check the days you've finished.</p>
  <div class="row"><button class="linkbtn" id="bkAll">Select all</button><button class="linkbtn" id="bkNone">Clear</button></div>
  <div class="checks">${miss.map(d=>`<label><input type="checkbox" value="${d}">Day ${d}</label>`).join("")}</div>
  <div class="row"><button class="btn" id="bkCancel" style="flex:1">Cancel</button><button class="btn primary" id="bkSave" style="flex:2" disabled>Mark 0 days done</button></div>`;
  openSheet(html,(sh,m)=>{
    const boxes=[...sh.querySelectorAll("input[type=checkbox]")],btn=$("#bkSave",sh);
    const upd=()=>{const k=boxes.filter(b=>b.checked).length;btn.disabled=!k;btn.textContent="Mark "+pl(k,"day")+" done"};
    boxes.forEach(b=>b.onchange=upd);
    $("#bkAll",sh).onclick=()=>{boxes.forEach(b=>b.checked=true);upd()};
    $("#bkNone",sh).onclick=()=>{boxes.forEach(b=>b.checked=false);upd()};
    $("#bkCancel",sh).onclick=()=>m.remove();
    btn.onclick=()=>{
      const sel=boxes.filter(b=>b.checked).map(b=>+b.value),t=today(),p=S.me;
      const doneOn={...(p.doneOn||{})};sel.forEach(d=>doneOn[d]=t);
      m.remove();
      savePlayer({completed:[...new Set([...(p.completed||[]),...sel])].sort((a,b)=>a-b),dates:[...new Set([...(p.dates||[]),t])],doneOn});
      celebrate(sel[sel.length-1],currentStreak([...(S.me.dates||[]),...(S.me.frozen||[])]));
      const rest=missedDays(S.me);
      if(!rest.length){S.catchup=false;toast("You're all caught up!")}
      else if(S.catchup){S.viewDay=rest[0];render()}
    };
  });
}

/* ---------- weekly recap ---------- */
function recapWs(){
  if(S.recapWeek===undefined)S.recapWeek=((new Date().getDay()+6)%7)<2?-1:0;
  return shift(weekStart(today()),7*S.recapWeek);
}
function fmtRange(ws){
  const a=parseD(ws),b=parseD(shift(ws,6)),m=d=>d.toLocaleDateString(undefined,{month:"short"});
  return m(a)+" "+a.getDate()+"–"+(m(a)===m(b)?"":m(b)+" ")+b.getDate();
}
function weekRecap(ws){
  const we=shift(ws,6),cur=ws===weekStart(today());
  const t=cur?S.team:(S.teamCache[ws]||null);
  if(!cur&&!t&&!S.local&&!S.teamLoading[ws])loadTeamWeek(ws);
  const prayers=S.prayers.filter(pr=>{const d=dstr(new Date(pr.at||0));return d>=ws&&d<=we}).length;
  return{ws,t,mine:weekActivity(S.me,ws),st:stats(S.me),C:challengeFor(ws),current:cur,prayers};
}
async function loadTeamWeek(ws){
  S.teamLoading[ws]=true;
  try{S.teamCache[ws]=normalizeTeam(await Backend.teamTotals(ws));scheduleRender()}catch(e){}
}
function recapText(R){
  const L=[`${APP_NAME}: week of ${fmtRange(R.ws)}`];
  if(R.t)L.push(`Together we finished ${pl(R.t.ep,"episode")}, wrote ${pl(R.t.rf,"reflection")}, and ${pl(R.t.readers,"reader")} joined in.`,"");
  L.push(`My week: ${pl(R.mine.ep,"episode")}, ${streakTxt(R.st.streak)}.`);
  if(R.t){
    const g=teamGoal(R.t,R.C.ch),v=R.C.ch.tm(R.t);
    L.push(`Weekly goal (${R.C.ch.t.toLowerCase()}): ${v>=g?"our team reached it!":Math.min(100,Math.round(v/g*100))+"% of the way"+(R.current?" so far":"")}`);
    L.push(`Community total: ${R.t.episodes_total.toLocaleString()} episodes finished together.`);
  }
  if(R.prayers)L.push(`Prayer requests shared: ${R.prayers}`);
  L.push("",`Keep going, everyone! ${APP_URL}`);
  return L.join("\n").replace(/\n{3,}/g,"\n\n");
}
function recapHTML(){
  if(S.local)return "";
  const ws=recapWs(),R=weekRecap(ws);
  return `<section class="panel" aria-labelledby="rch"><h2 id="rch">Weekly recap</h2>
    <div class="seg two"><button data-rw="0" aria-pressed="${S.recapWeek===0}">This week</button><button data-rw="-1" aria-pressed="${S.recapWeek===-1}">Last week</button></div>
    <div class="recap-text">${esc(recapText(R))}</div>
    <div class="row">${navigator.share?`<button class="btn primary sm" id="rcShare" style="flex:1">Share</button>`:""}<button class="btn sm${navigator.share?"":" primary"}" id="rcCopy" style="flex:1">Copy text</button><button class="btn sm" id="rcImg" style="flex:1">Save image</button></div>
  </section>`;
}
async function copyText(t,msg){
  let ok=false;try{await navigator.clipboard.writeText(t);ok=true}catch(e){}
  if(!ok){const ta=document.createElement("textarea");ta.value=t;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();try{ok=document.execCommand("copy")}catch(e){}ta.remove()}
  toast(ok?msg:"Couldn't copy automatically. Press and hold the recap text to copy it.");
}
async function shareRecap(){
  const t=recapText(weekRecap(recapWs()));
  try{await navigator.share({title:APP_NAME+" weekly recap",text:t})}
  catch(e){if(!e||e.name!=="AbortError")copyText(t,"Recap copied. Paste it in your group chat.")}
}
function loadImg(src){return new Promise(r=>{const i=new Image();i.onload=()=>r(i);i.onerror=()=>r(null);i.src=src})}
const svgURL=(svg,w,h)=>"data:image/svg+xml;charset=utf-8,"+encodeURIComponent(svg.replace("<svg ",`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" `));
const streakTxt=n=>n?n+"-day streak":"no streak yet";
async function recapPNG(R,withImgs){
  try{await document.fonts.ready}catch(e){}
  const W=1080,H=1350,c=document.createElement("canvas");c.width=W;c.height=H;const g=c.getContext("2d");
  const per=periodOf(nextDay(S.me));
  const bg=g.createLinearGradient(0,0,0,H);bg.addColorStop(0,"#1d2348");bg.addColorStop(1,"#0b0e20");g.fillStyle=bg;g.fillRect(0,0,W,H);
  g.strokeStyle="#D9B45F";g.lineWidth=5;g.strokeRect(34,34,W-68,H-68);
  if(withImgs){const gl=await loadImg(svgURL(glassSVG(per),240,320));if(gl){g.save();g.beginPath();g.moveTo(W-300,180);g.arc(W-200,180,100,Math.PI,0);g.lineTo(W-100,347);g.lineTo(W-300,347);g.closePath();g.clip();g.drawImage(gl,W-300,80,200,267);g.restore();g.strokeStyle="#D9B45F";g.lineWidth=4;g.beginPath();g.moveTo(W-300,347);g.lineTo(W-300,180);g.arc(W-200,180,100,Math.PI,0);g.lineTo(W-100,347);g.closePath();g.stroke()}}
  const SC="'Alegreya SC', Georgia, serif",AL="Alegreya, Georgia, serif";
  g.fillStyle="#D9B45F";g.font=`800 64px ${SC}`;g.fillText(APP_NAME,86,150);
  g.fillStyle="#EEE6D3";g.font=`500 40px ${AL}`;g.fillText("Week of "+fmtRange(R.ws),86,210);
  const eps=R.t?R.t.ep:R.mine.ep;
  g.fillStyle="#F2D27C";g.font=`800 150px ${SC}`;g.fillText(String(eps),86,380);
  g.fillStyle="#EEE6D3";g.font=`500 38px ${AL}`;g.fillText(R.t?(eps===1?"episode finished together":"episodes finished together"):(eps===1?"episode finished this week":"episodes finished this week"),86,432);
  let y=540;
  if(R.t){
    const goal=teamGoal(R.t,R.C.ch),v=R.C.ch.tm(R.t),pct=Math.min(1,v/goal);
    g.fillStyle="#EEE6D3";g.font=`500 36px ${AL}`;g.fillText("Weekly goal: "+R.C.ch.t.toLowerCase(),86,y);
    g.fillStyle="rgba(255,255,255,.16)";g.fillRect(86,y+26,W-172,30);
    g.fillStyle="#D9B45F";g.fillRect(86,y+26,Math.max(8,(W-172)*pct),30);
    g.fillStyle="#B8B5C9";g.font=`400 32px ${AL}`;g.fillText(v>=goal?"Our team reached it!":Math.round(pct*100)+"% of the way",86,y+110);
    y+=190;
    g.fillStyle="#EEE6D3";g.font=`500 34px ${AL}`;g.fillText(`${pl(R.t.readers,"reader")} joined in this week`,86,y);
    y+=62;
    g.fillText(`${R.t.episodes_total.toLocaleString()} episodes finished together so far`,86,y);
    y+=110;
  }
  if(withImgs){const av=await loadImg(svgURL(avatar(S.me),96,96));if(av){g.save();g.beginPath();g.arc(134,y+48,48,0,Math.PI*2);g.clip();g.drawImage(av,86,y,96,96);g.restore()}}
  g.fillStyle="#FFFFFF";g.font=`700 42px ${AL}`;g.fillText("My week",210,y+44);
  g.fillStyle="#B8B5C9";g.font=`400 32px ${AL}`;g.fillText(`${pl(R.mine.ep,"episode")}, ${streakTxt(R.st.streak)}`,210,y+88);
  g.fillStyle="#D9B45F";g.font=`700 30px ${SC}`;g.fillText("The Bible in a Year, together",86,H-80);
  return await new Promise((res,rej)=>{try{c.toBlob(b=>b?res(b):rej(new Error("blob")),"image/png")}catch(e){rej(e)}});
}
async function saveRecapImage(){
  const btn=$("#rcImg");if(btn){btn.disabled=true;btn.textContent="Drawing…"}
  const R=weekRecap(recapWs());let blob=null;
  try{blob=await recapPNG(R,true)}catch(e){try{blob=await recapPNG(R,false)}catch(e2){}}
  if(btn){btn.disabled=false;btn.textContent="Save image"}
  if(!blob){toast("Couldn't draw the image. Try Copy text instead.");return}
  const name="take-the-cross-"+R.ws+".png";
  try{
    const file=new File([blob],name,{type:"image/png"});
    if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:APP_NAME+" weekly recap"});return}
  }catch(e){if(e&&e.name==="AbortError")return}
  try{
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);toast("Recap image saved.");
  }catch(e){toast("Couldn't save the image here. Try Copy text instead.")}
}

/* ---------- sign in ---------- */
function closeAuth(){const m=S.authModal;if(m){m.remove();S.authModal=null}}
function openAuth(){
  if($(".modal"))return;
  const m=document.createElement("div");m.className="modal";
  m.innerHTML=`<div class="sheet" role="dialog" aria-modal="true" aria-labelledby="ah"></div>`;
  document.body.appendChild(m);S.authModal=m;
  const sheet=$(".sheet",m);
  let step="email",email="",msg="",isErr=false,busy=false,cool=0,cdTimer=null,count=null;
  const friendly=e=>{const t=String((e&&(e.message||e.code))||"").toLowerCase();
    if(/rate|too many|over_email/.test(t))return"Too many tries. Please wait a minute and try again.";
    if(/expired|invalid|token|otp/.test(t))return"That code didn't work. Check it, or ask for a new one.";
    if(/fetch|network|offline/.test(t))return"Can't reach the server. Check your connection.";
    return"Something went wrong. Please try again."};
  const tick=()=>{const b=$("#resend",sheet);if(!b)return;b.disabled=cool>0;b.textContent=cool>0?"Send a new code ("+cool+")":"Send a new code"};
  const startCool=()=>{cool=60;clearInterval(cdTimer);cdTimer=setInterval(()=>{cool--;if(cool<=0){cool=0;clearInterval(cdTimer)}tick()},1000)};
  function draw(){
    if(step==="email"){
      sheet.innerHTML=`<h2 id="ah">${esc(APP_NAME)}</h2>
      <p class="lede">Read the Bible in a year with Fr. Mike Schmitz's podcast, together with friends. Sign in with your email to save your progress and join the leaderboard.</p>
      <label class="l" for="em">Email</label>
      <input type="email" id="em" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="you@example.com" value="${esc(email)}">
      <button class="btn primary" id="send" style="width:100%;margin-top:12px" ${busy?"disabled":""}>${busy?"Sending…":"Email me a code"}</button>
      <p class="auth-msg${isErr?" err":""}" role="status">${esc(msg)}</p>
      <p class="small" style="margin:0">No password needed. We'll email you a code.<span id="joined">${count>0?` ${count} ${count===1?"person has":"people have"} joined so far.`:""}</span></p>
      ${privacyHTML()}`;
      const em=$("#em",sheet);em.oninput=()=>{email=em.value};
      em.onkeydown=e=>{if(e.key==="Enter")send()};
      $("#send",sheet).onclick=send;
    }else{
      sheet.innerHTML=`<h2 id="ah">Enter your code</h2>
      <p class="lede">We emailed a code to <strong>${esc(email)}</strong>. It can take a minute to arrive. Check your spam folder too.</p>
      <label class="l" for="cd">Code</label>
      <input type="text" id="cd" class="codein" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="••••••" aria-label="Code from your email">
      <button class="btn primary" id="verify" style="width:100%;margin-top:12px" ${busy?"disabled":""}>${busy?"Checking…":"Sign in"}</button>
      <p class="auth-msg${isErr?" err":""}" role="status">${esc(msg)}</p>
      <div class="row"><button class="btn sm" id="resend" style="flex:1">Send a new code</button><button class="linkbtn" id="back">Use a different email</button></div>`;
      const cd=$("#cd",sheet);cd.onkeydown=e=>{if(e.key==="Enter")verify()};
      $("#verify",sheet).onclick=verify;$("#back",sheet).onclick=()=>{step="email";msg="";isErr=false;draw()};
      $("#resend",sheet).onclick=()=>send(true);tick();setTimeout(()=>cd.focus(),50);
    }
  }
  async function send(again){
    if(busy)return;
    const em=$("#em",sheet);if(em)email=em.value;
    email=email.trim();
    if(!/^\S+@\S+\.\S+$/.test(email)){msg="Enter a valid email address.";isErr=true;draw();const e2=$("#em",sheet);if(e2)e2.focus();return}
    busy=true;msg="";isErr=false;if(again!==true||step==="email")draw();
    try{await Backend.sendCode(email);busy=false;step="code";msg=again===true?"A new code is on its way.":"";isErr=false;draw();startCool()}
    catch(e){busy=false;msg=friendly(e);isErr=true;draw()}
  }
  async function verify(){
    if(busy)return;
    const cd=$("#cd",sheet);const code=(cd?cd.value:"").replace(/\s+/g,"");
    if(code.length<6){msg="Enter the code from your email.";isErr=true;draw();const c2=$("#cd",sheet);if(c2)c2.focus();return}
    busy=true;msg="";isErr=false;draw();
    try{const session=await Backend.verifyCode(email,code);busy=false;await handleSession(session,"VERIFIED")}
    catch(e){busy=false;msg=friendly(e);isErr=true;draw();const c3=$("#cd",sheet);if(c3)c3.focus()}
  }
  draw();
  Backend.publicCount().then(n=>{if(n!==null&&S.authModal===m){count=n;const j=$("#joined",sheet);if(j&&n>0)j.textContent=` ${n} ${n===1?"person has":"people have"} joined so far.`}});
  setTimeout(()=>{const e=$("#em",sheet);if(e)e.focus()},50);
}
async function doSignOut(afterDelete){
  try{await Backend.signOut()}catch(e){}
  await handleSession(null,"SIGNED_OUT");
  if(afterDelete)try{localStorage.removeItem("yow-me")}catch(e){}
}

/* ---------- admin dashboard (the server refuses everyone who is not an admin) ---------- */
async function openAdmin(){
  const m=openSheet(`<h2>Admin</h2><p class="lede">Loading…</p>`);
  const sh=$(".sheet",m);
  let offset=0;const PAGE=50;
  const rowHTML=u=>{
    const p=playerFromRow({id:u.id,display_name:u.display_name,avatar:u.avatar,stats:{},xp:u.xp,days_done:u.days_done});
    const joined=u.created_at?new Date(u.created_at).toLocaleDateString(undefined,{month:"short",day:"numeric",year:"numeric"}):"unknown";
    const active=u.last_active_at?ago(Date.parse(u.last_active_at)):"never";
    return `<li class="adm-row">${avatar(p)}<div><p class="nm">${esc(p.name)}</p>
      <p class="meta">Joined ${esc(joined)}. Active ${esc(active)}.</p>
      <p class="meta">${pl(numIn(u.days_done,365),"day")} done, ${numIn(u.xp,1e6)} XP, ${streakTxt(numIn(u.streak,400))}</p></div></li>`;
  };
  try{
    const [ov,users]=await Promise.all([Backend.adminOverview(),Backend.adminUsers(PAGE,0)]);
    const stat=(k,l)=>`<div><strong>${numIn(ov&&ov[k],1e9)}</strong><span>${l}</span></div>`;
    offset=users.length;
    sh.innerHTML=`<h2>Admin</h2>
    <p class="lede">Only you can see this. It is never shown to other users.</p>
    <div class="adm-grid">${stat("total_users","people joined")}${stat("new_7d","joined in 7 days")}${stat("active_24h","active in 24 hours")}${stat("active_7d","active in 7 days")}
      ${stat("active_30d","active in 30 days")}${stat("days_finished","episodes finished")}${stat("comments","comments")}${stat("prayers","prayer requests")}</div>
    <h3>People (most recently active first)</h3>
    <ul class="adm-list" id="admList">${users.map(rowHTML).join("")||`<li class="lede">No one yet.</li>`}</ul>
    <div class="row">${users.length>=PAGE?`<button class="btn sm" id="admMore" style="flex:1">Load more</button>`:""}<button class="btn" id="admClose" style="flex:1">Close</button></div>
    <p class="small">Email addresses are not shown here. You can see them in your Supabase dashboard under Authentication.</p>`;
    $("#admClose",sh).onclick=()=>m.remove();
    const more=$("#admMore",sh);
    if(more)more.onclick=async()=>{
      more.disabled=true;
      try{const next=await Backend.adminUsers(PAGE,offset);offset+=next.length;$("#admList",sh).insertAdjacentHTML("beforeend",next.map(rowHTML).join(""));if(next.length<PAGE)more.remove();else more.disabled=false}
      catch(e){more.disabled=false;toast("Couldn't load more.")}
    };
  }catch(e){
    sh.innerHTML=`<h2>Admin</h2><p class="lede">This area is only for the app's owner.</p><button class="btn" id="admClose" style="width:100%">Close</button>`;
    $("#admClose",sh).onclick=()=>m.remove();
  }
}

/* ---------- session + boot ---------- */
let sessionUid=null;
function stopLive(){S.liveStops.forEach(f=>{try{f()}catch(e){}});S.liveStops=[];S.day.unsubs.forEach(u=>{try{u()}catch(e){}});S.day={n:null,doc:undefined,comments:[],answers:{},rx:[],unsubs:[]}}
function resetAccountState(){
  stopLive();
  Object.assign(S,{session:null,uid:null,email:"",me:null,players:{},extra:{},isAdmin:false,ai:false,prayers:[],prayRx:[],cheers:[],journal:{},quizSel:{},viewDay:null,redoDay:null,busy:{},frozeChecked:false,winPending:null,soloPending:null,team:null,teamCache:{},teamLoading:{},tab:"today",saving:0});
  clearTimeout(retryTimer);retryTimer=null;saveChain=Promise.resolve();
}
function startLive(){
  stopLive();
  S.liveStops.push(Backend.watchPlayers(rows=>{
    const ps={};rows.forEach(r=>{const p=playerFromRow(r);ps[p.id]=p});
    if(S.me)ps[S.uid]=S.me;
    S.players=ps;checkWeekly();
    if(!$(".modal"))scheduleRender();
  }));
  S.liveStops.push(Backend.watchPrayers(rows=>{S.prayers=rows;ensureProfiles(rows.map(r=>r.uid));if(S.tab==="prayer")scheduleRender()}));
  S.liveStops.push(Backend.watchReactions("prayers",rows=>{S.prayRx=rows;if(S.tab==="prayer")scheduleRender()}));
  S.liveStops.push(Backend.watchCheers(today(),rows=>{S.cheers=rows;scheduleRender()}));
  S.liveStops.push(Backend.watchTeam(weekStart(today()),t=>{S.team=normalizeTeam(t);checkWeekly();if(S.tab==="fellowship")scheduleRender()}));
}
async function loadAccount(){
  const [r,adm,ai]=await Promise.all([Backend.loadMe(),Backend.isAdmin(),Backend.aiStatus()]);
  S.isAdmin=!!adm;S.ai=!!ai;
  S.me=r.profile?meFromRows(r):null;
  if(S.me)S.players[S.uid]=S.me;
  startLive();
  S.booted=true;closeAuth();
  applyFreezes();touchActivity();render();
}
async function handleSession(session,event){
  if(!session){
    if(event==="INITIAL"||sessionUid){sessionUid=null;resetAccountState();S.booted=true;closeAuth();render()}
    return;
  }
  if(sessionUid===session.user.id){S.session=session;return}
  sessionUid=session.user.id;
  S.session=session;S.uid=session.user.id;S.email=session.user.email||"";
  try{await loadAccount()}catch(e){sessionUid=null;showOffline()}
}
function showOffline(){
  S.booted=true;closeAuth();
  $("#tabs").hidden=true;$("#meChip").hidden=true;
  $("#view").innerHTML=`<div class="errbox"><h2>Can't connect right now</h2><p class="lede">Check your internet connection, then try again.</p><button class="btn primary" id="retryBoot">Try again</button></div>`;
  $("#retryBoot").onclick=()=>location.reload();
}
function startLocal(){
  S.local=true;S.uid="me";S.me=lsGet("yow-me");
  if(S.me)S.players={me:S.me};
  S.booted=true;applyFreezes();render();
}
(async function boot(){
  if(!Backend.configured)return startLocal();
  try{
    Backend.onAuth((event,session)=>{setTimeout(()=>handleSession(session,event==="INITIAL_SESSION"?"INITIAL_EVENT":event),0)});
    const session=await Backend.getSession();
    await handleSession(session,"INITIAL");
  }catch(e){showOffline()}
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible"){refreshMe();touchActivity()}});
  setInterval(()=>{if(document.visibilityState==="visible")refreshMe()},90000);
})();
