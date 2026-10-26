/**
 * InterviewCoach — ICP-1 demo on the Perxona Connect Kit.
 *
 * Scaffolded from demos/embed/ per AGENTS.md. What is different from Embed:
 *  - a dedicated Connect chatbot ("InterviewCoach JSON") is created on first run
 *    via POST /api/chatbots, instructed to answer in compact JSON
 *    { feedback, score, question, done } in the chosen language;
 *  - the app, not the model, decides the avatar's emotion: score → emotion /
 *    intensity passed to presenter.present(text, { emotion, intensity });
 *  - voice is picked per language from the catalog at Start;
 *  - every turn's latency is captured (send → LLM reply → voice) for the
 *    developer-experience audit, shown in a small dev-stats footer.
 * Zero dependencies, plain ESM, no build step.
 */

/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");
const $ = (s) => document.querySelector(s);
const intro = $("#intro"), room = $("#room"), report = $("#report");
const setupForm = $("#setup"), startBtn = $("#start-btn");
const chatForm = $("#chat-form"), chatInput = $("#chat-input"), sendBtn = $("#send-btn"), micBtn = $("#mic-btn");
const chatLog = $("#chat-log"), mood = $("#mood");

const TOTAL_QUESTIONS = 5;
const CHATBOT_NAME = "InterviewCoach JSON";
const AVATAR_ID = "01K4M8T4RF9HTYE1W0M0957VSJ"; // cc007_female_hr
const SCENE_ID = "01KQEJARWBCZ781TSPWB7KVZP8"; // sova_Interior_37_Inside_Training_B01_Chloe
const VOICE_BY_LANG = {
  en: { id: "0000000000QKV4DGV4Z155GNVZ", name: "Female - warm and cheerful" },
  ja: { id: "01KT9NE031K3MWGCXMYZ078TKD", name: "Female - cheerful and clear (Japanese only)" },
  zh: { id: "01KVAGZWYB22WP19M8M5Z7SKRG", name: "Female - bright and young (Chinese only)" },
};
const LANG_NAME = { en: "English", ja: "Japanese", zh: "Traditional Chinese as used in Taiwan" };
const UI = {
  en: { q: (n) => `Question ${n} of ${TOTAL_QUESTIONS}`, done: "Interview complete", fail: "Sorry, I lost my train of thought. Could you say that again?", place: "Type your answer… (Enter to send, Shift+Enter for a new line)" },
  ja: { q: (n) => `質問 ${n} / ${TOTAL_QUESTIONS}`, done: "面接終了", fail: "すみません、もう一度お願いできますか？", place: "回答を入力…（Enterで送信、Shift+Enterで改行）" },
  zh: { q: (n) => `第 ${n} 題，共 ${TOTAL_QUESTIONS} 題`, done: "面試結束", fail: "不好意思，可以再說一次嗎？", place: "輸入你的回答…（Enter 送出，Shift+Enter 換行）" },
};
const SPEECH_LANG = { en: "en-US", ja: "ja-JP", zh: "zh-TW" };

// The app owns the emotional performance. The model only scores.
const EMOTION_BY_SCORE = {
  5: { emotion: "excitement", intensity: "high" },
  4: { emotion: "joy", intensity: "neutral" },
  3: { emotion: "caring", intensity: "neutral" },
  2: { emotion: "curiosity", intensity: "neutral" },
  1: { emotion: "disappointment", intensity: "low" },
};
const OPENING_EMOTION = { emotion: "joy", intensity: "neutral" };
const CLOSING_MOTION_GOOD = "01M27F0DWP5KFS9GC9F3RXV331"; // celebration.achievement
const CLOSING_MOTION_OK = "01M27ER02853YTCPBJ5M2HNBM6"; // gratitude.appreciation

const CUSTOM_INSTRUCTIONS = `You are Mia, a hiring manager running a mock job interview. Every user message starts with a context tag like [role=Frontend Developer lang=en question=2/5]. "question=0/5" with text START means the interview begins: greet the candidate in one short sentence and ask question 1. Otherwise the text after the tag is the candidate's answer to the current question.
Reply with ONLY a compact JSON object, no markdown, no code fence:
{"feedback": string, "score": integer 1-5 or null, "question": string, "done": boolean}
- feedback: one or two spoken sentences reacting to the answer (specific, honest, encouraging). Empty string on the opening turn.
- score: 1 (weak) to 5 (excellent) for the answer just given. null on the opening turn.
- question: the next interview question, relevant to the role, different from earlier ones. When the tag says question=5/5 and an answer was given, instead write a one-sentence closing remark and set done=true.
- done: true only on the closing turn.
Write feedback and question in the language named by lang (en=English, ja=Japanese, zh=Traditional Chinese as used in Taiwan). Spoken style, under 45 words in total. Never ask two questions at once.`;

const state = { role: "", lang: "en", q: 0, history: [], results: [], turns: [], chatbotId: null, startedAt: 0, audioUnlocked: false };
let config = null;
let pendingTurn = null;

/** GET without body, POST as JSON with it; throws on non-2xx (same wrapper as Embed). */
async function request(path, body, method) {
  const res = await fetch(path, body ? { method: method ?? "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : method ? { method } : undefined);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail) ?? data.details ?? data.error ?? res.statusText;
    throw Object.assign(new Error(message), { status: res.status, data });
  }
  return data;
}

function appendMessage(role, text) {
  const li = document.createElement("li");
  li.className = `msg msg--${role}`;
  li.textContent = text;
  chatLog.append(li);
  chatLog.scrollTop = chatLog.scrollHeight;
  return li;
}

function setProgress() {
  const n = Math.min(state.q, TOTAL_QUESTIONS);
  $("#progress-bar").style.width = `${(Math.max(n - 1, 0) / TOTAL_QUESTIONS) * 100}%`;
  $("#progress-text").textContent = state.q > TOTAL_QUESTIONS ? UI[state.lang].done : UI[state.lang].q(n);
}

function showMood({ emotion, intensity }) {
  mood.textContent = `${emotion} · ${intensity}`;
  mood.hidden = false;
}

async function loadPresenterEngine(url) {
  await new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement("script"), { type: "module", src: url, onload: resolve, onerror: () => reject(new Error(`Presenter failed to load: ${url}`)) });
    document.head.append(script);
  });
}

/** Find or create the JSON-answering chatbot. One per account; reused across sessions. */
async function ensureChatbot() {
  const list = await request("/api/chatbots");
  const items = Array.isArray(list) ? list : list.items ?? list.chatbots ?? [];
  const existing = items.find((c) => c.name === CHATBOT_NAME && c.status !== "disabled");
  if (existing) return existing.id ?? existing.chatbot_id;
  const created = await request("/api/chatbots", { name: CHATBOT_NAME, custom_instructions: CUSTOM_INSTRUCTIONS });
  return created.id ?? created.chatbot_id;
}

/** The model is asked for JSON; be forgiving if it wraps or decorates it. */
function parseReply(raw) {
  const text = String(raw ?? "").trim();
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const j = JSON.parse(text.slice(start, end + 1));
      return { feedback: String(j.feedback ?? ""), score: Number.isInteger(j.score) ? Math.min(5, Math.max(1, j.score)) : null, question: String(j.question ?? ""), done: Boolean(j.done) };
    } catch { /* fall through */ }
  }
  // Not JSON: speak it as the question, no score.
  return { feedback: "", score: null, question: text, done: false };
}

const toConnectMessages = (turns) => turns.map(({ role, text }) => ({ role, parts: [{ type: "text", text }] }));

async function askCoach(userText) {
  const tag = `[role=${state.role} lang=${state.lang} question=${state.q}/${TOTAL_QUESTIONS}]`;
  state.history.push({ role: "user", text: `${tag} ${userText}` });
  const turn = { q: state.q, tSend: performance.now(), tReply: 0, tAccepted: 0, tVoice: 0 };
  pendingTurn = turn;
  presenter.setThinking?.(true);
  const { reply_text: reply, status } = await request(`/api/chatbots/${state.chatbotId}/chat`, { messages: toConnectMessages(state.history.slice(-24)) });
  turn.tReply = performance.now();
  if (!reply) throw new Error(`chatbot returned status "${status}"`);
  state.history.push({ role: "assistant", text: reply });
  const parsed = parseReply(reply);
  presenter.setThinking?.(false);

  const tone = parsed.score ? EMOTION_BY_SCORE[parsed.score] : OPENING_EMOTION;
  const spoken = [parsed.feedback, parsed.question].filter(Boolean).join(" ");
  appendMessage("assistant", spoken);
  if (parsed.score) appendMessage("score", `score ${parsed.score}/5 · ${tone.emotion}`);
  showMood(tone);
  const result = await presenter.present(spoken, tone);
  turn.tAccepted = performance.now();
  if (!result?.success) console.error(`InterviewCoach: present() failed (${result?.code}): ${result?.message ?? ""}`);
  state.turns.push(turn);
  return parsed;
}

function updateDevStats() {
  const p50 = (xs) => { if (!xs.length) return "–"; const s = [...xs].sort((a, b) => a - b); return Math.round(s[Math.floor(s.length / 2)]); };
  const done = state.turns.filter((t) => t.tReply);
  $("#stat-turns").textContent = `turns ${done.length}`;
  $("#stat-llm").textContent = `LLM p50 ${p50(done.map((t) => t.tReply - t.tSend))} ms`;
  $("#stat-voice").textContent = `send→voice p50 ${p50(done.filter((t) => t.tVoice).map((t) => t.tVoice - t.tSend))} ms`;
}

async function refreshCredit() {
  try {
    const c = await request("/api/credit");
    const used = c.used ?? c.credits_used ?? c.usage?.used, total = c.total ?? c.credits_total ?? c.quota ?? c.usage?.total;
    $("#stat-credit").textContent = used != null ? `credits ${used}${total != null ? ` / ${total}` : ""}` : `credits ${JSON.stringify(c).slice(0, 60)}`;
  } catch (e) { $("#stat-credit").textContent = `credits n/a (${e.status ?? e.message})`; }
}

function finish() {
  const scored = state.results.filter((r) => r.score);
  const avg = scored.length ? scored.reduce((a, r) => a + r.score, 0) / scored.length : 0;
  const minutes = ((performance.now() - state.startedAt) / 60000).toFixed(1);
  $("#report-summary").textContent = `${state.role} · ${LANG_NAME[state.lang]} · average ${avg.toFixed(1)} / 5 · ${minutes} min`;
  const list = $("#report-list");
  list.innerHTML = "";
  for (const r of state.results) {
    const li = document.createElement("li");
    const cls = r.score >= 4 ? "good" : r.score >= 3 ? "mid" : "bad";
    li.innerHTML = `<b>${escapeHtml(r.question)}</b><span class="score ${cls}">${r.score ?? "–"}</span>${escapeHtml(r.answer)}<br><i>${escapeHtml(r.feedback)}</i>`;
    list.append(li);
  }
  report.hidden = false;
  chatForm.querySelectorAll("textarea,button").forEach((el) => (el.disabled = true));
  presenter.playMotion?.(avg >= 4 ? CLOSING_MOTION_GOOD : CLOSING_MOTION_OK);
  refreshCredit();
}
const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// ── presenter events: Ready gate + latency capture ─────────────────────────
presenter.addEventListener("PRESENTER_STATUS", (e) => {
  if (e.detail?.status !== "Ready" && e.status !== "Ready") return;
  $("#stage-loading")?.remove();
  startBtn.disabled = false;
  startBtn.textContent = "Start the interview";
});
presenter.addEventListener("PERFORMANCE_START", () => {
  if (pendingTurn && !pendingTurn.tVoice) { pendingTurn.tVoice = performance.now(); updateDevStats(); }
});
presenter.addEventListener("ALL_PERFORMANCE_FINISHED", () => { chatInput.focus(); });

// ── setup → start ──────────────────────────────────────────────────────────
setupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  state.role = $("#role").value;
  state.lang = $("#lang").value;
  startBtn.disabled = true;
  try {
    // Re-initialize with the language's voice. Autoplay unlock rides on this click.
    const target = { avatarId: AVATAR_ID, sceneId: SCENE_ID, voiceId: VOICE_BY_LANG[state.lang].id };
    await presenter.initializeWithConnectKey(config.connectKey, target);
    if (!state.audioUnlocked) { await presenter.resumeAudioPlayback?.(); state.audioUnlocked = true; }
    intro.hidden = true; room.hidden = false; $("#devstats").hidden = false;
    chatInput.placeholder = UI[state.lang].place;
    state.q = 0; state.history = []; state.results = []; state.turns = []; state.startedAt = performance.now();
    chatLog.innerHTML = "";
    setProgress();
    const first = await askCoach("START");
    state.q = 1; setProgress();
    state.results.push({ question: first.question, answer: "", feedback: "", score: null });
    chatInput.disabled = false; sendBtn.disabled = false; chatInput.focus();
  } catch (err) {
    console.error(`InterviewCoach: ${err.message}`);
    appendMessage("error", UI[state.lang].fail);
    startBtn.disabled = false;
  }
});

// ── answer a question ──────────────────────────────────────────────────────
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !state.chatbotId) return;
  chatInput.value = "";
  appendMessage("user", text);
  chatInput.disabled = true; sendBtn.disabled = true;
  const current = state.results.at(-1);
  current.answer = text;
  try {
    const r = await askCoach(text);
    current.feedback = r.feedback; current.score = r.score;
    if (r.done || state.q >= TOTAL_QUESTIONS) { state.q = TOTAL_QUESTIONS + 1; setProgress(); finish(); return; }
    state.q += 1; setProgress();
    state.results.push({ question: r.question, answer: "", feedback: "", score: null });
  } catch (err) {
    if (state.history.at(-1)?.role === "user") state.history.pop();
    presenter.setThinking?.(false);
    console.error(`InterviewCoach: ${err.message}`);
    const code = err.data?.code;
    appendMessage("error", code === 1003 || code === 14005 ? `Credits are used up. ${config?.subscriptionUrl ?? ""}` : UI[state.lang].fail);
  } finally {
    if (state.q <= TOTAL_QUESTIONS) { chatInput.disabled = false; sendBtn.disabled = false; }
    updateDevStats();
  }
});
chatInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); chatForm.requestSubmit(); } });
$("#again-btn").addEventListener("click", () => { report.hidden = true; room.hidden = true; intro.hidden = false; startBtn.disabled = false; });

// ── optional voice answers (Web Speech API, where the browser has it) ──────
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SR) {
  micBtn.hidden = false;
  let rec = null;
  micBtn.addEventListener("click", () => {
    if (rec) { rec.stop(); return; }
    rec = new SR(); rec.lang = SPEECH_LANG[state.lang]; rec.interimResults = true;
    micBtn.classList.add("on");
    rec.onresult = (ev) => { chatInput.value = Array.from(ev.results).map((r) => r[0].transcript).join(""); };
    rec.onend = () => { micBtn.classList.remove("on"); rec = null; if (chatInput.value.trim()) chatForm.requestSubmit(); };
    rec.onerror = () => { micBtn.classList.remove("on"); rec = null; };
    rec.start();
  });
}

// ── boot: config, engine, chatbot ──────────────────────────────────────────
async function start() {
  const cfg = await request("/api/config");
  if (cfg.mock) throw new Error("mock mode cannot drive the presenter");
  await loadPresenterEngine(cfg.presenterUrl);
  const { connect_key: connectKey } = await request("/api/connect-key");
  state.chatbotId = await ensureChatbot();
  // Warm the engine with the default voice so Start is instant; Start re-targets by language.
  await presenter.initializeWithConnectKey(connectKey, { avatarId: AVATAR_ID, sceneId: SCENE_ID, voiceId: VOICE_BY_LANG.en.id });
  return { ...cfg, connectKey };
}
config = await start().catch((err) => {
  $("#stage-loading")?.remove();
  const el = $("#stage-error"); if (el) { el.textContent = "The interviewer isn't available right now."; el.hidden = false; }
  startBtn.textContent = "Interviewer unavailable";
  console.error(`InterviewCoach: ${err.message}`);
  return {};
});
