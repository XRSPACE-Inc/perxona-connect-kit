/**
 * Perxona Connect Kit — Embed Demo
 *
 * An avatar answering questions on a page that already exists. Everything it
 * needs arrives resolved from GET /api/config; failures go to the console,
 * never the page — except a subscription issue (codes 1003 and 14005), a
 * fixed, non-technical sentence the visitor can act on. See README.md.
 * Zero dependencies — plain ESM, no build step required.
 */

/** @type {HTMLElement & import('@perxona/presenter-types').IPresentationWidget} */
const presenter = document.querySelector("sv-presenter");
/** @type {HTMLFormElement} */
const chatForm = document.querySelector("#chat-form");
/** @type {HTMLInputElement} */
const chatInput = document.querySelector("#chat-input");
/** @type {HTMLButtonElement} */
const sendBtn = document.querySelector("#send-btn");
const chatLog = document.getElementById("chat-log");
const chatPanel = document.getElementById("chat");

// Serialized at the call site: the Connect chat API takes `parts`, not `content`.
/** @type {{role: "user"|"assistant", text: string}[]} */
const history = [];
const MAX_HISTORY_TURNS = 20; // 10 user + 10 assistant
const GREETING = "Hi! Ask me anything about XRSPACE.";
const FAILURE_REPLY = "Sorry — I couldn't reach the assistant just then.";
// Shown in #stage-error when start() rejects or the stage fails, whatever the
// cause — the actual reason (bad config, unreachable presenter engine, no
// chatbot yet, an avatar that won't load) only ever reaches console.error. See README.md "Where the errors went".
const PRESENTER_UNAVAILABLE_REPLY =
  "This assistant isn't available right now. Please check back soon.";
const toConnectMessages = (turns) =>
  turns.map(({ role, text }) => ({ role, parts: [{ type: "text", text }] }));
let audioUnlocked = false;
// Assigned by start(), which runs last — the chat can open before it resolves.
let config = null;

/**
 * GET without `body`, POST as JSON with it. Throws on non-2xx with a message
 * picked from whichever error shape actually reached the browser: a FastAPI
 * validation `detail`, the real Connect API's `details` (passed through
 * unchanged by server.mjs's route()), this server's own hand-rolled `error`,
 * or the HTTP status text as a last resort.
 */
async function request(path, body) {
  const res = await fetch(
    path,
    body && {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      (Array.isArray(data.detail) ? data.detail[0]?.msg : data.detail) ??
      data.details ??
      data.error ??
      res.statusText;
    throw Object.assign(new Error(message), { status: res.status, data });
  }
  return data;
}

const CREDIT_EXHAUSTED_CODE = 1003;
const NO_SUBSCRIPTION_CODE = 14005;
// 1003 fires for two distinct backend conditions — credits run out, or the
// subscription's own status is no longer usable — and 400 either way. 14005
// is a third, separate condition with the same remedy (Console) but its own
// HTTP status (403): no subscription record exists for the org at all. All
// three share this one fixed, non-technical reply rather than naming one.
const isSubscriptionIssue = (code) =>
  code === CREDIT_EXHAUSTED_CODE || code === NO_SUBSCRIPTION_CODE;
const subscriptionIssueReply = () =>
  "Your organization's credits are used up or its subscription needs " +
  `attention. Check your usage at ${config?.subscriptionUrl}`;

function appendMessage(role, text) {
  const li = document.createElement("li");
  li.className = `msg msg--${role}`;
  li.textContent = text;
  chatLog.append(li);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function loadPresenterEngine(url) {
  // DEMO-ONLY: url is trusted without host validation. A production
  // integration should verify it against a known CDN allowlist.
  await new Promise((resolve, reject) => {
    const script = Object.assign(document.createElement("script"), {
      type: "module",
      src: url,
      onload: resolve,
      onerror: () => reject(new Error(`Presenter failed to load: ${url}`)),
    });
    document.head.append(script);
  });
}

function showStageError(reason) {
  document.getElementById("stage-loading")?.remove();
  const stageError = document.getElementById("stage-error");
  stageError.textContent = PRESENTER_UNAVAILABLE_REPLY;
  stageError.parentElement.hidden = false;
  console.error(`Embed: ${reason}`);
}

// Attach before initializing: Ready is only ever an event, never readable state.
// Failed is too: initializeWithConnectKey() settles before the stage is up.
presenter.addEventListener("PRESENTER_STATUS", (/** @type {any} */ event) => {
  if (event.detail?.status === "Failed") showStageError(event.detail.message);
  if (event.detail?.status !== "Ready") return;
  document.getElementById("stage-loading")?.remove();
  chatPanel.hidden = false;
  appendMessage("assistant", GREETING); // written, not spoken — no gesture yet
});

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !config?.chatbotId) return;

  chatInput.value = "";
  appendMessage("user", text);
  history.push({ role: "user", text });
  sendBtn.disabled = true;
  chatInput.disabled = true;
  presenter.setThinking?.(true);

  try {
    // present() returns AUDIO_CONTEXT_UNAVAILABLE until this has run, and
    // autoplay policy allows it only from a user action — this submit is one.
    if (!audioUnlocked) {
      await presenter.resumeAudioPlayback?.();
      audioUnlocked = true;
    }

    const { reply_text: reply, status } = await request(
      `/api/chatbots/${config.chatbotId}/chat`,
      { messages: toConnectMessages(history.slice(-MAX_HISTORY_TURNS)) },
    );
    if (!reply) throw new Error(`chatbot returned status "${status}"`);

    appendMessage("assistant", reply);
    history.push({ role: "assistant", text: reply });
    presenter.setThinking?.(false);
    // Resolves with { success: false, … } rather than rejecting.
    const result = await presenter.present(reply);
    if (!result?.success)
      console.error(
        `Embed: present() failed (${result?.code}): ${result?.message ?? ""}`,
      );
  } catch (err) {
    // Drop the unanswered question, not the answer that may already be pushed.
    if (history.at(-1)?.role === "user") history.pop();
    presenter.setThinking?.(false);
    // The page may not show configuration; it may say something went wrong.
    // A subscription issue is the one exception carved out above — its reply
    // is a fixed string, never err.data.details (which echoes the org id
    // back). Requires subscriptionUrl too: config is {} when start() threw
    // (e.g. no chatbot yet), and the reply would otherwise read "Check your
    // usage at undefined" instead of falling back.
    const subscriptionIssue =
      isSubscriptionIssue(err.data?.code) && config?.subscriptionUrl;
    appendMessage(
      "error",
      subscriptionIssue ? subscriptionIssueReply() : FAILURE_REPLY,
    );
    console.error(
      subscriptionIssue
        ? `Embed: subscription issue (code ${err.data?.code}): ${err.data?.details ?? ""}`
        : `Embed: ${err.message}`,
    );
  } finally {
    sendBtn.disabled = false;
    chatInput.disabled = false;
    chatInput.focus();
  }
});

// Called last: a rejection in top-level await would abort module evaluation
// and leave every handler above unregistered.
async function start() {
  const cfg = await request("/api/config");
  const blocker =
    (cfg.mock && "mock mode cannot drive the presenter") ||
    (!cfg.fixedTarget &&
      "no presenter target — see the server's startup log") ||
    (!cfg.chatbotId &&
      "no usable chatbot (disabled/app-managed ones are skipped). Create " +
        "one in the Studio demo and reload — or set DEMO_FIXED_CHATBOT_ID");
  if (blocker) throw new Error(blocker);
  await loadPresenterEngine(cfg.presenterUrl);
  const { connect_key: connectKey } = await request("/api/connect-key");
  await presenter.initializeWithConnectKey(connectKey, cfg.fixedTarget);
  return cfg;
}

config = await start().catch((err) => {
  showStageError(err.message);
  return {};
});
