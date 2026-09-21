import express from "express";

// ── Config ──────────────────────────────────────────────────

const PORT = process.env.PORT || 8083;
const PERXONA_API_BASE_URL = process.env.PERXONA_API_BASE_URL;
// Only the /asia or /eu region segment is read out of PERXONA_API_BASE_URL —
// the host is always the public console, never whatever host
// PERXONA_API_BASE_URL itself points at. GET /api/config is unauthenticated
// (see the "config (unauthenticated)" tests), so forwarding
// PERXONA_API_BASE_URL through verbatim would hand any browser that asks
// whatever host this server happens to be configured against; hard-coding
// the console host and deriving only the region avoids that regardless of
// what PERXONA_API_BASE_URL is set to. Falls back to asia when no
// recognizable region segment is present (e.g. PERXONA_API_BASE_URL unset in
// mock mode) — warned about below so a guessed region is never silent.
const CONSOLE_REGION_MATCH = PERXONA_API_BASE_URL?.match(/\/(asia|eu)(?:\/|$)/);
const CONSOLE_REGION = CONSOLE_REGION_MATCH?.[1] ?? "asia";
const SUBSCRIPTION_URL = `https://console.perxona.ai/${CONSOLE_REGION}/organization/subscription/`;
if (PERXONA_API_BASE_URL && !CONSOLE_REGION_MATCH) {
  console.warn(
    `WARNING: no /asia or /eu segment found in PERXONA_API_BASE_URL, so the subscription-issue console link guesses "${CONSOLE_REGION}".\n` +
      "If this organization is in a different region, point PERXONA_API_BASE_URL at a URL containing that region segment.",
  );
}
const USE_MOCK = process.env.USE_MOCK === "true";
const PRESENTER_URL =
  process.env.PRESENTER_URL ||
  "https://cdn.perxona.ai/prod/latest/widget/entry/presenter.js";
const LLM_PROVIDER = (process.env.LLM_PROVIDER || "openai").toLowerCase();
const LLM_API_KEY = process.env.LLM_API_KEY;
const PRESENTER_TARGET = {
  avatarId: process.env.DEMO_FIXED_AVATAR_ID,
  sceneId: process.env.DEMO_FIXED_SCENE_ID,
  voiceId: process.env.DEMO_FIXED_VOICE_ID,
};
const FIXED_CHATBOT_ID = process.env.DEMO_FIXED_CHATBOT_ID;
const hasConfiguredPresenterTarget = Boolean(
  PRESENTER_TARGET.avatarId ||
    PRESENTER_TARGET.sceneId ||
    PRESENTER_TARGET.voiceId,
);
const hasCompletePresenterTarget = Boolean(
  PRESENTER_TARGET.avatarId && PRESENTER_TARGET.sceneId,
);
const fixedPresenterTarget = hasCompletePresenterTarget
  ? {
      avatarId: PRESENTER_TARGET.avatarId,
      sceneId: PRESENTER_TARGET.sceneId,
      ...(PRESENTER_TARGET.voiceId
        ? { voiceId: PRESENTER_TARGET.voiceId }
        : {}),
    }
  : null;
// Server-side credentials for the one shared Connect API identity this sample
// uses — see README "Auth model". Every browser hitting this server acts
// through the same upstream account; there is no per-user login.
//
// Two keys, on opposite sides of the trust boundary: the secret one never
// leaves this process, the publishable one is what the browser is given.
const CONNECT_SECRET_KEY = process.env.PERXONA_CONNECT_SECRET_KEY;
const CONNECT_PUBLISHABLE_KEY = process.env.PERXONA_CONNECT_PUBLISHABLE_KEY;

// All blank is fine — resolveEmbedConfig() picks from the catalog. Half-filled
// is not: it does nothing silently, so name what is missing.
if (hasConfiguredPresenterTarget && !hasCompletePresenterTarget) {
  const missing = ["DEMO_FIXED_AVATAR_ID", "DEMO_FIXED_SCENE_ID"].filter(
    (name) => !process.env[name],
  );
  console.warn(
    `WARNING: ${missing.join(" and ")} not set, so the DEMO_FIXED_* values are ignored.\n` +
      "Set DEMO_FIXED_AVATAR_ID and DEMO_FIXED_SCENE_ID together to pin a target, or clear every DEMO_FIXED_* value to let the server pick the first avatar and scene in your catalog. DEMO_FIXED_VOICE_ID is optional — blank selects BYO-TTS.",
  );
}

// Real credentials are only needed when actually calling the upstream API.
// USE_MOCK=true skips callUpstream() entirely (see api selection below), so
// don't force dummy values into these fields just to pass a startup check.
if (!USE_MOCK) {
  if (!PERXONA_API_BASE_URL) {
    console.error(
      "ERROR: PERXONA_API_BASE_URL is required. Copy .env.example to .env and fill it in.",
    );
    process.exit(1);
  }

  if (!CONNECT_SECRET_KEY || !CONNECT_PUBLISHABLE_KEY) {
    // Which side each key belongs on. Swapping them is not reported anywhere:
    // the upstream accepts either, so a secret key would simply be served to
    // the browser.
    const sides =
      "PERXONA_CONNECT_SECRET_KEY authenticates this server and must never reach a browser.\n" +
      "PERXONA_CONNECT_PUBLISHABLE_KEY is the one handed to the presenter.\n";
    const onlyOneKey =
      Boolean(CONNECT_SECRET_KEY) !== Boolean(CONNECT_PUBLISHABLE_KEY);
    const missing = CONNECT_SECRET_KEY
      ? "PERXONA_CONNECT_PUBLISHABLE_KEY"
      : "PERXONA_CONNECT_SECRET_KEY";
    // Reached only by a .env written for the login mode this sample used to
    // have. Without it that .env looks like a typo rather than a removal.
    const removedLogin =
      process.env.PERXONA_CONNECT_EMAIL || process.env.PERXONA_CONNECT_PASSWORD
        ? "PERXONA_CONNECT_EMAIL and PERXONA_CONNECT_PASSWORD are no longer read — this sample authenticates with a Connect API key instead.\n"
        : "";

    console.error(
      (onlyOneKey
        ? `ERROR: ${missing} is not set. Both Connect API keys are required — one is not enough.\n`
        : "ERROR: PERXONA_CONNECT_SECRET_KEY and PERXONA_CONNECT_PUBLISHABLE_KEY are required.\n") +
        removedLogin +
        sides +
        "Create both at https://console.perxona.ai, then copy .env.example to .env and fill them in.",
    );
    process.exit(1);
  }
}

// ── Upstream API implementation ────────────────────────────────────────────

/**
 * Send an authenticated request to the Perxona upstream API.
 *
 * X-Connect-Key is the only credential header this server sends. A request
 * carrying an Authorization as well is rejected upstream with 400, so the two
 * are never combined — here or anywhere else.
 * @param {string} path  - Upstream path, e.g. '/api/v1/connect/voices'
 * @param {object} opts  - fetch options (method, body, headers…)
 * @param {string} [credential] - Connect API key; omit for unauthenticated calls
 */
async function callUpstream(path, opts, credential) {
  const headers = { "Content-Type": "application/json", ...opts.headers };
  if (credential) headers["X-Connect-Key"] = credential;
  return fetch(`${PERXONA_API_BASE_URL}${path}`, { ...opts, headers });
}

/**
 * Parse a callUpstream() Response as JSON, throwing a structured error
 * ({ status, payload }) on any non-2xx status. Centralising this means every
 * connectApi method — not just the ones that used to check r.ok by hand —
 * surfaces the upstream status the same way, which is what lets route() map it
 * onto the response instead of collapsing it to a 502.
 * @param {Response} r
 * @param {string} label  Used in the thrown error message, e.g. "voices".
 */
async function upstreamJson(r, label) {
  if (!r.ok) {
    const payload = await r.json().catch(() => ({}));
    throw Object.assign(new Error(`upstream ${label} failed`), {
      status: r.status,
      payload,
    });
  }
  return r.json();
}

/**
 * Send an authenticated request to the upstream API without forcing Content-Type.
 * Used for multipart/form-data endpoints (chatbot create/update) where fetch must
 * set the Content-Type + boundary automatically from the FormData body.
 * @param {string} path  - Upstream path, e.g. '/api/v1/connect/chatbots'
 * @param {"POST"|"PATCH"} method
 * @param {FormData} form
 * @param {string} [credential] - Connect API key
 */
async function callUpstreamFormData(path, method, form, credential) {
  const headers = credential ? { "X-Connect-Key": credential } : {};
  return fetch(`${PERXONA_API_BASE_URL}${path}`, {
    method,
    headers,
    body: form,
  });
}

/**
 * Probe whether the presenter engine is reachable at PRESENTER_URL.
 * Non-fatal diagnostic only — a HEAD request with a short timeout so startup
 * never blocks. Catches the common "PRESENTER_URL points at a channel that
 * isn't published yet" case (404) before the browser hits a blank stage.
 * @returns {Promise<"reachable" | string>} "reachable", "unreachable (<status>)", or "unreachable"
 */
async function checkPresenter() {
  try {
    const r = await fetch(PRESENTER_URL, {
      method: "HEAD",
      signal: AbortSignal.timeout(3000),
    });
    return r.ok ? "reachable" : `unreachable (${r.status})`;
  } catch {
    return "unreachable";
  }
}

// connectApi — real upstream implementation, thin wrappers around call().
// Route handlers reference api.* and never touch USE_MOCK directly.
const connectApi = {
  async checkUpstream() {
    try {
      const r = await fetch(`${PERXONA_API_BASE_URL}/ready`);
      return r.ok ? "reachable" : "unreachable";
    } catch {
      return "unreachable";
    }
  },

  async voices(credential) {
    const r = await callUpstream("/api/v1/connect/voices", {}, credential);
    return upstreamJson(r, "voices"); // Page[ConnectVoiceResponse] — items already have { id, name, … }
  },

  async credit(credential) {
    const r = await callUpstream("/api/v1/connect/credit", {}, credential);
    return upstreamJson(r, "credit"); // ConnectCreditResponse — used verbatim, no field renaming
  },

  // Normalize avatar list: backend uses avatar_id; frontend dropdowns expect id.
  async avatars(credential) {
    const r = await callUpstream(
      "/api/v1/connect/assets/avatars",
      {},
      credential,
    );
    const page = await upstreamJson(r, "avatars");
    return {
      ...page,
      items: (page.items ?? []).map(({ avatar_id, ...rest }) => ({
        id: avatar_id,
        ...rest,
      })),
    };
  },

  // Raw avatar detail — the frontend never calls this directly; it's exposed as a
  // standalone REST resource for reference (see docs/openapi.yaml).
  async avatar(id, credential) {
    const r = await callUpstream(
      `/api/v1/connect/assets/avatars/${id}`,
      {},
      credential,
    );
    return upstreamJson(r, "avatar detail");
  },

  // Motions are a sub-resource of an avatar, not a top-level collection.
  async avatarMotions(avatarId, credential) {
    const r = await callUpstream(
      `/api/v1/connect/assets/avatars/${encodeURIComponent(avatarId)}/motions`,
      {},
      credential,
    );
    return upstreamJson(r, "avatar motions"); // Page[ConnectMotionAssetResponse]
  },

  // Normalize scene list: backend uses scene_id; frontend dropdowns expect id.
  async scenes(credential) {
    const r = await callUpstream(
      "/api/v1/connect/assets/scenes",
      {},
      credential,
    );
    const page = await upstreamJson(r, "scenes");
    return {
      ...page,
      items: (page.items ?? []).map(({ scene_id, ...rest }) => ({
        id: scene_id,
        ...rest,
      })),
    };
  },

  // Raw scene detail — the frontend never calls this directly; it's exposed as a
  // standalone REST resource for reference (see docs/openapi.yaml).
  async scene(id, credential) {
    const r = await callUpstream(
      `/api/v1/connect/assets/scenes/${id}`,
      {},
      credential,
    );
    return upstreamJson(r, "scene detail");
  },

  // ── Chatbot CRUD ──────────────────────────────────────────────────────────
  //
  // Create/update use multipart/form-data because the upstream supports an
  // optional knowledge_file upload. The Express proxy accepts plain JSON from
  // the browser and re-encodes it as FormData before forwarding. This keeps
  // the browser-facing API simple (JSON), while matching what the upstream expects.

  async listChatbots(credential) {
    const r = await callUpstream(
      "/api/v1/connect/chatbots?size=50",
      {},
      credential,
    );
    return upstreamJson(r, "chatbots");
  },

  async getChatbot(id, credential) {
    const r = await callUpstream(
      `/api/v1/connect/chatbots/${encodeURIComponent(id)}`,
      {},
      credential,
    );
    return upstreamJson(r, "chatbot detail");
  },

  async createChatbot({ name, custom_instructions, tools }, credential) {
    const form = new FormData();
    form.append("name", name);
    if (custom_instructions != null)
      form.append("custom_instructions", custom_instructions);
    if (tools !== undefined) form.append("tools", JSON.stringify(tools));
    const r = await callUpstreamFormData(
      "/api/v1/connect/chatbots",
      "POST",
      form,
      credential,
    );
    return upstreamJson(r, "create chatbot");
  },

  async updateChatbot(
    id,
    { name, custom_instructions, tools, remove_knowledge },
    credential,
  ) {
    const form = new FormData();
    if (name != null) form.append("name", name);
    if (custom_instructions !== undefined)
      form.append("custom_instructions", custom_instructions ?? "");
    if (tools !== undefined) form.append("tools", JSON.stringify(tools));
    if (remove_knowledge) form.append("remove_knowledge", "true");
    const r = await callUpstreamFormData(
      `/api/v1/connect/chatbots/${encodeURIComponent(id)}`,
      "PATCH",
      form,
      credential,
    );
    return upstreamJson(r, "update chatbot");
  },

  // Upload a knowledge file for a chatbot by PATCHing with knowledge_file.
  // The caller supplies a Buffer so this method stays independent of Express.
  async uploadChatbotKnowledge(id, fileBuffer, filename, mimeType, credential) {
    const form = new FormData();
    form.append(
      "knowledge_file",
      new Blob([fileBuffer], { type: mimeType }),
      filename,
    );
    const r = await callUpstreamFormData(
      `/api/v1/connect/chatbots/${encodeURIComponent(id)}`,
      "PATCH",
      form,
      credential,
    );
    return upstreamJson(r, "upload chatbot knowledge");
  },

  async deleteChatbot(id, credential) {
    const r = await callUpstream(
      `/api/v1/connect/chatbots/${encodeURIComponent(id)}`,
      { method: "DELETE" },
      credential,
    );
    if (!r.ok) {
      const payload = await r.json().catch(() => ({}));
      throw Object.assign(new Error("upstream delete chatbot failed"), {
        status: r.status,
        payload,
      });
    }
    // 204 No Content — intentionally returns nothing
  },

  async chatWithChatbot(id, messages, credential) {
    const r = await callUpstream(
      `/api/v1/connect/chatbots/${encodeURIComponent(id)}/chat`,
      { method: "POST", body: JSON.stringify({ messages }) },
      credential,
    );
    return upstreamJson(r, "chat with chatbot");
  },
};

// Select implementation at boot: mock (internal dev only) or real upstream.
let api;
if (USE_MOCK) {
  try {
    api = await import("./mocks/upstream.mjs");
  } catch {
    console.error(
      "ERROR: USE_MOCK=true but mocks/upstream.mjs is not present.\n" +
        "The mock implementation is internal-only and is not included in this " +
        "public sample — set USE_MOCK=false (or remove it) and fill in real " +
        "PERXONA_API_BASE_URL / PERXONA_CONNECT_SECRET_KEY / PERXONA_CONNECT_PUBLISHABLE_KEY instead.",
    );
    process.exit(1);
  }
} else {
  api = connectApi;
}

// ── Upstream identity ───────────────────────────────────────────────────────
//
// Every upstream call carries CONNECT_SECRET_KEY, shared by every browser that
// hits this server — see README "Auth model". Nothing is retried on a 401/403:
// a key is refused only when it is revoked, expired, or missing a scope, so the
// same key fails the same way and the upstream status reaches the browser
// unchanged.

/**
 * The target and chatbot the Embed demo runs on, reported on GET /api/config.
 * Pinned by DEMO_FIXED_*, otherwise the first of each in the account. Which of
 * the two happened goes to the startup log, never to the page.
 * @returns {Promise<{target: object|null, chatbotId: string|null}>}
 */
let embedConfigPromise = null;
async function resolveEmbedConfig() {
  // Mock mode's catalog cannot drive the presenter and its chatbot routes 501,
  // so auto-picking would return ids that resolve to nothing. Pinned values
  // cost no upstream call and still stand.
  if (USE_MOCK)
    return {
      target: fixedPresenterTarget,
      chatbotId: FIXED_CHATBOT_ID ?? null,
    };

  embedConfigPromise ??= (async () => {
    const [target, chatbotId] = await Promise.all([
      resolveTarget(),
      resolveChatbotId(),
    ]);
    // Cache only a complete success: the resolvers cannot tell a missing
    // credential from a one-off upstream failure, and a chatbot created later
    // must be picked up without a restart.
    if (!target || !chatbotId) embedConfigPromise = null;
    return { target, chatbotId };
  })();
  return embedConfigPromise;
}

/**
 * Forces the next resolveEmbedConfig() call to re-resolve from upstream
 * rather than keep serving a stale cached value — e.g. after a chatbot is
 * deleted. Kept next to embedConfigPromise so this is the only place that
 * assigns it; callers never touch the variable directly.
 */
function invalidateEmbedConfig() {
  embedConfigPromise = null;
}

/** Avatar + scene + voice: pinned via DEMO_FIXED_*, else first in the catalog. */
async function resolveTarget() {
  if (fixedPresenterTarget) return fixedPresenterTarget;
  try {
    const [avatars, scenes, voices] = await Promise.all([
      api.avatars(CONNECT_SECRET_KEY),
      api.scenes(CONNECT_SECRET_KEY),
      api.voices(CONNECT_SECRET_KEY),
    ]);
    const avatarId = avatars?.items?.[0]?.id;
    const sceneId = scenes?.items?.[0]?.id;
    // Auto-pick includes a voice; a pinned target does not. present() fails
    // without one, but a blank DEMO_FIXED_VOICE_ID means BYO-TTS on purpose.
    const voiceId = voices?.items?.[0]?.id;
    if (!avatarId || !sceneId) return null;
    if (!voiceId) {
      console.warn(
        "WARNING: no voices in this account's catalog, so the auto-selected target has none.\n" +
          "present() will fail — use presentWithAudio(), or set DEMO_FIXED_VOICE_ID.",
      );
    }
    console.log(
      `Auto-selected presenter target: avatar ${avatarId}, scene ${sceneId}` +
        `${voiceId ? `, voice ${voiceId}` : ""}. ` +
        "Set DEMO_FIXED_AVATAR_ID / DEMO_FIXED_SCENE_ID in .env to pin your own.",
    );
    return { avatarId, sceneId, ...(voiceId ? { voiceId } : {}) };
  } catch (err) {
    console.warn(
      `WARNING: could not auto-select a presenter target: ${err.message}`,
    );
    return null;
  }
}

/** The chatbot Embed converses against: DEMO_FIXED_CHATBOT_ID, else the first. */
async function resolveChatbotId() {
  if (FIXED_CHATBOT_ID) return FIXED_CHATBOT_ID;
  try {
    const { items } = await api.listChatbots(CONNECT_SECRET_KEY);
    // Disabled chatbots stay in the list but reject every message.
    const chatbotId =
      items?.find(({ status }) => status !== "disabled")?.id ?? null;
    if (!chatbotId) {
      console.warn(
        "No chatbots in this account yet, so the Embed demo has nothing to talk to.\n" +
          "Create one in the Studio demo (/demos/studio/) — it is picked up on the next page load,\n" +
          "no restart needed — or set DEMO_FIXED_CHATBOT_ID in .env.",
      );
      return null;
    }
    console.log(
      `Auto-selected chatbot ${chatbotId}. Set DEMO_FIXED_CHATBOT_ID in .env to pin your own.`,
    );
    return chatbotId;
  } catch (err) {
    console.warn(`WARNING: could not auto-select a chatbot: ${err.message}`);
    return null;
  }
}

// ── Express app ────────────────────────────────────────────────────────────

const app = express();
app.disable("x-powered-by");

// ── Static frontend ────────────────────────────────────────────────────────

// Disable ETags in dev so a plain browser refresh always fetches the latest
// files from disk. Production keeps ETags for efficient caching.
const IS_DEV = process.env.NODE_ENV !== "production";

// ── Middleware ─────────────────────────────────────────────────────────────

app.use(express.static("public", { etag: !IS_DEV }));

// The knowledge upload route needs a larger JSON body than the 100 KB default,
// and body-parser is a no-op once a body has already been parsed, so its parser
// must run before the global one. Mounting it by path lets Express match it the
// same way it matches the route itself (trailing slash, case-insensitive).
// base64 adds ~33% overhead, so a 1 MB file needs ~1.4 MB of JSON. The 5 MB
// limit is deliberately looser: it bounds what this process will buffer, while
// KNOWLEDGE_MAX_FILE_BYTES is the limit users are held to.
app.use(
  "/api/chatbots/:id/knowledge",
  express.json({ limit: "5mb" }),
  // body-parser answers an oversized body with an HTML stack trace; restate it
  // as the same JSON error the decoded-size check in the route returns.
  (err, _req, res, next) => {
    if (err?.type === "entity.too.large") {
      res.status(413).json({ error: KNOWLEDGE_TOO_LARGE_MESSAGE });
      return;
    }
    next(err);
  },
);
app.use(express.json());

/**
 * Wrap a route handler so any thrown error (an upstream failure surfaced by
 * upstreamJson) becomes a JSON error response instead of an
 * unhandled rejection — Express 4 does not catch async handler rejections on
 * its own.
 *
 * This is also the only place a runtime request failure is logged server-side
 * — every other console.* call in this file runs at boot. Without it, a
 * refused key, an exhausted rate limit, or a disabled chatbot leaves the
 * terminal running `npm run dev`/`npm start` silent; only the browser (and,
 * for a subscription issue, the page itself) would show anything went
 * wrong.
 * @param {(req: express.Request, res: express.Response) => Promise<void>} handler
 */
function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err.status ?? 502;
      const payload = err.payload ?? { error: String(err) };
      const reason =
        (Array.isArray(payload.detail)
          ? payload.detail[0]?.msg
          : payload.detail) ??
        payload.details ??
        payload.error ??
        err.message;
      console.error(`${req.method} ${req.path} → ${status}: ${reason}`);
      res.status(status).json(payload);
    }
  };
}

// ── Health & config ─────────────────────────────────────────────────────────

// GET /api/health → { status: "ok", upstream: "reachable"|"unreachable"|"mock" }. Always 200.
// Liveness plus the one dynamic field: `upstream` probes the backend on every
// call (and reads "mock" in mock mode). Static per-process flags (mock, chat)
// live in /api/config, which needs no network round-trip.
app.get("/api/health", async (_req, res) => {
  res.json({
    status: "ok",
    upstream: await api.checkUpstream(),
  });
});

// GET /api/config → { mock, chat, presenterUrl, fixedTarget, chatbotId, subscriptionUrl }.
// Cheap to poll: `chat` reports the presence of LLM_API_KEY, never the key, and
// resolveEmbedConfig()'s catalog lookup is memoized. No field says whether a
// value was pinned or auto-picked — nothing may render that. This route has no
// request-layer auth, so subscriptionUrl carries only the derived
// CONSOLE_REGION ("asia"/"eu"), never PERXONA_API_BASE_URL itself — that
// variable is a stage/dev host in some internal workflows, and this is the
// only field here built from a server-side env var's value rather than just
// its presence.
app.get(
  "/api/config",
  route(async (_req, res) => {
    const { target, chatbotId } = await resolveEmbedConfig();
    res.json({
      mock: USE_MOCK,
      chat: Boolean(process.env.LLM_API_KEY),
      presenterUrl: PRESENTER_URL,
      fixedTarget: target,
      chatbotId,
      subscriptionUrl: SUBSCRIPTION_URL,
    });
  }),
);

// GET /api/connect-key
// Returns: { connect_key } — the PUBLISHABLE key the browser passes into
//          presenter.initializeWithConnectKey(connectKey, target). From there,
//          <sv-presenter> talks to the Connect API directly to resolve the
//          target and mint its own speech token.
//          This is never PERXONA_CONNECT_SECRET_KEY. That keeps the secret key
//          out of the browser — it does not put the chatbot routes out of
//          reach, since the /api/* routes below have no request-layer
//          authorization of their own. See README "Auth model".
app.get(
  "/api/connect-key",
  route(async (_req, res) => {
    res.set({ "Cache-Control": "no-store", Pragma: "no-cache" });
    // Mock mode has no keys to serve. Saying so beats 200 with an empty body,
    // which is the one shape that reads as success.
    if (USE_MOCK) {
      res.status(501).json({ error: "No Connect key to serve in mock mode." });
      return;
    }
    res.json({ connect_key: CONNECT_PUBLISHABLE_KEY });
  }),
);

// ── Catalog routes ──────────────────────────────────────────────────────────
// GET  /api/voices
// GET  /api/avatars          GET  /api/avatars/:id    GET  /api/avatars/:id/motions
// GET  /api/scenes           GET  /api/scenes/:id
// GET  /api/credit
// POST /api/chat             (disabled when LLM_API_KEY is unset → 501)
//
// All routes below send CONNECT_SECRET_KEY upstream. There is no per-request
// auth check on this server either — see README "Auth model".

// Catalog — read-only lists + single items used to populate UI dropdowns.
//   GET /api/voices              → Page { items: [{ id, name, … }] }
//   GET /api/avatars             → Page { items: [{ id, name, … }] }  (id normalized from avatar_id)
//   GET /api/avatars/:id         → raw avatar detail (avatar_id, lod_urls, lipsync_configs, lipsync_mode, …)
//   GET /api/avatars/:id/motions → Page { items: [ … ] }
//   GET /api/scenes              → Page { items: [{ id, name, … }] }  (id normalized from scene_id)
//   GET /api/scenes/:id          → raw scene detail
app.get(
  "/api/voices",
  route(async (_req, res) => {
    res.json(await api.voices(CONNECT_SECRET_KEY));
  }),
);

// Studio's Credit Usage panel polls this — see its own docstring in app.js for
// the polling interval. Not a catalog resource, but proxied the same way.
//   GET /api/credit → ConnectCreditResponse (used/total/remaining_credit_points,
//                     is_quota_exceeded, period_start, period_end), verbatim.
app.get(
  "/api/credit",
  route(async (_req, res) => {
    res.json(await api.credit(CONNECT_SECRET_KEY));
  }),
);

app.get(
  "/api/avatars",
  route(async (_req, res) => {
    res.json(await api.avatars(CONNECT_SECRET_KEY));
  }),
);

app.get(
  "/api/avatars/:id",
  route(async (req, res) => {
    const id = encodeURIComponent(req.params.id);
    res.json(await api.avatar(id, CONNECT_SECRET_KEY));
  }),
);

// Motions are a sub-resource of an avatar (no top-level collection endpoint).
app.get(
  "/api/avatars/:id/motions",
  route(async (req, res) => {
    const id = encodeURIComponent(req.params.id);
    res.json(await api.avatarMotions(id, CONNECT_SECRET_KEY));
  }),
);

app.get(
  "/api/scenes",
  route(async (_req, res) => {
    res.json(await api.scenes(CONNECT_SECRET_KEY));
  }),
);

app.get(
  "/api/scenes/:id",
  route(async (req, res) => {
    const id = encodeURIComponent(req.params.id);
    res.json(await api.scene(id, CONNECT_SECRET_KEY));
  }),
);

// Base URL and model both follow LLM_PROVIDER — keep the pair together when
// adding one, or an unset LLM_MODEL sends the wrong provider's model name.
const LLM_DEFAULTS = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  anthropic: {
    baseUrl: "https://api.anthropic.com",
    model: "claude-sonnet-4-20250514",
  },
};

function llmRequestConfig(messages) {
  const fallback = LLM_DEFAULTS[LLM_PROVIDER] ?? LLM_DEFAULTS.openai;
  const model = process.env.LLM_MODEL ?? fallback.model;
  if (LLM_PROVIDER === "anthropic") {
    const system = messages
      .filter(({ role }) => role === "system")
      .map(({ content }) => content)
      .join("\n");
    const userMessages = messages
      .filter(({ role }) => role !== "system")
      .map(({ role, content }) => ({ role, content }));
    return {
      url: `${process.env.LLM_BASE_URL ?? fallback.baseUrl}/v1/messages`,
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": LLM_API_KEY,
      },
      body: {
        model,
        max_tokens: 1024,
        ...(system ? { system } : {}),
        messages: userMessages,
      },
    };
  }
  return {
    url: `${process.env.LLM_BASE_URL ?? fallback.baseUrl}/chat/completions`,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LLM_API_KEY}`,
    },
    body: { model, messages },
  };
}

async function requestLlmCompletion(messages) {
  if (LLM_PROVIDER !== "openai" && LLM_PROVIDER !== "anthropic") {
    throw Object.assign(
      new Error("LLM_PROVIDER must be either 'openai' or 'anthropic'."),
      { status: 500 },
    );
  }
  const request = llmRequestConfig(messages);
  const response = await fetch(request.url, {
    method: "POST",
    headers: request.headers,
    body: JSON.stringify(request.body),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error("LLM request failed."), {
      status: 502,
      payload,
    });
  }
  return payload;
}

function llmResponseText(payload) {
  if (LLM_PROVIDER === "anthropic") {
    return payload.content?.find(({ type }) => type === "text")?.text;
  }
  return payload.choices?.[0]?.message?.content;
}

function openAiCompatibleResponse(payload) {
  if (LLM_PROVIDER === "openai") return payload;
  return {
    choices: [
      {
        message: { role: "assistant", content: llmResponseText(payload) ?? "" },
      },
    ],
  };
}

// ── Chatbot routes ──────────────────────────────────────────────────────────
// GET    /api/chatbots              → Page { items: [{ id, name, status }] }
// POST   /api/chatbots              → ChatBotDetailResponse (201 proxied as 200)
// GET    /api/chatbots/:id          → ChatBotDetailResponse (id, name, custom_instructions, status, tools)
// PATCH  /api/chatbots/:id          → ChatBotDetailResponse
// DELETE /api/chatbots/:id          → 204 No Content
// POST   /api/chatbots/:id/chat     → { id, status, reply_text }
//
// Create and update are forwarded as multipart/form-data (see callUpstreamFormData).
// The browser sends JSON; the proxy re-encodes it before forwarding upstream.

app.get(
  "/api/chatbots",
  route(async (_req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    res.json(await api.listChatbots(CONNECT_SECRET_KEY));
  }),
);

app.post(
  "/api/chatbots",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const { name, custom_instructions, tools } = req.body ?? {};
    if (!name || typeof name !== "string") {
      res.status(400).json({ error: "'name' is required." });
      return;
    }
    const created = await api.createChatbot(
      { name, custom_instructions, tools },
      CONNECT_SECRET_KEY,
    );
    // upstream returns 201; surface as 200 for consistent demo fetch handling
    res.json(created);
  }),
);

app.get(
  "/api/chatbots/:id",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    res.json(await api.getChatbot(id, CONNECT_SECRET_KEY));
  }),
);

app.patch(
  "/api/chatbots/:id",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    const { name, custom_instructions, tools, remove_knowledge } =
      req.body ?? {};
    res.json(
      await api.updateChatbot(
        id,
        { name, custom_instructions, tools, remove_knowledge },
        CONNECT_SECRET_KEY,
      ),
    );
  }),
);

app.delete(
  "/api/chatbots/:id",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    await api.deleteChatbot(id, CONNECT_SECRET_KEY);
    // Embed's auto-picked chatbotId may be this one; force the next
    // GET /api/config to re-resolve rather than keep serving a dead id.
    invalidateEmbedConfig();
    res.status(204).end();
  }),
);

// Allowlisted file extensions and MIME types for knowledge uploads.
// Matches the frontend <input accept=".txt,.pdf,.doc,.docx,.csv"> constraint so
// the server rejects any attempt to bypass the client-side restriction.
const KNOWLEDGE_ALLOWED_EXTENSIONS = new Set([
  ".txt",
  ".pdf",
  ".doc",
  ".docx",
  ".csv",
]);
const KNOWLEDGE_ALLOWED_MIME_TYPES = new Set([
  "text/plain",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/octet-stream", // fallback when browser cannot detect MIME
]);
const BASE64_RE = /^[A-Za-z0-9+/]*={0,2}$/;
// Largest knowledge file accepted, measured after base64 decoding.
const KNOWLEDGE_MAX_FILE_BYTES = 1 * 1024 * 1024;
const KNOWLEDGE_TOO_LARGE_MESSAGE = `File is too large. Maximum size is ${KNOWLEDGE_MAX_FILE_BYTES / (1024 * 1024)} MB.`;

// POST /api/chatbots/:id/knowledge
// Body: { filename, content_base64, mime_type }
// Reads the base64-encoded file from the JSON body, converts it to a Buffer,
// and PATCHes the upstream chatbot with knowledge_file as multipart/form-data.
// Separating knowledge upload avoids needing a multipart parser on this server.
// The JSON body is parsed by the 5 MB parser mounted on this path above.
app.post(
  "/api/chatbots/:id/knowledge",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    const { filename, content_base64, mime_type } = req.body ?? {};
    if (!filename || !content_base64) {
      res
        .status(400)
        .json({ error: "'filename' and 'content_base64' are required." });
      return;
    }

    // Reject filenames containing path separators to prevent directory traversal.
    if (filename.includes("/") || filename.includes("\\")) {
      res.status(400).json({ error: "Invalid filename." });
      return;
    }

    // Enforce extension allowlist (aligns with frontend <input accept> constraint).
    const ext = filename.slice(filename.lastIndexOf(".")).toLowerCase();
    if (!KNOWLEDGE_ALLOWED_EXTENSIONS.has(ext)) {
      res.status(400).json({
        error: `File type not allowed. Accepted extensions: ${[...KNOWLEDGE_ALLOWED_EXTENSIONS].join(", ")}.`,
      });
      return;
    }

    // Validate MIME type if provided.
    const effectiveMime = mime_type || "application/octet-stream";
    if (!KNOWLEDGE_ALLOWED_MIME_TYPES.has(effectiveMime)) {
      res.status(400).json({
        error: `MIME type not allowed: ${effectiveMime}.`,
      });
      return;
    }

    // Basic base64 format check before decoding.
    if (!BASE64_RE.test(content_base64)) {
      res.status(400).json({ error: "Invalid base64 content." });
      return;
    }

    const buffer = Buffer.from(content_base64, "base64");
    if (buffer.length > KNOWLEDGE_MAX_FILE_BYTES) {
      res.status(413).json({ error: KNOWLEDGE_TOO_LARGE_MESSAGE });
      return;
    }
    res.json(
      await api.uploadChatbotKnowledge(
        id,
        buffer,
        filename,
        effectiveMime,
        CONNECT_SECRET_KEY,
      ),
    );
  }),
);

// DELETE /api/chatbots/:id/knowledge
// Sends remove_knowledge=true via PATCH to clear the chatbot's knowledge file.
app.delete(
  "/api/chatbots/:id/knowledge",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    res.json(
      await api.updateChatbot(
        id,
        { remove_knowledge: true },
        CONNECT_SECRET_KEY,
      ),
    );
  }),
);

// Both chat routes are unauthenticated and spend something — LLM_API_KEY's
// provider, or the Connect account's quota — so both carry this cap.
const CHAT_MAX_MESSAGES = 40; // Studio sends at most 21 (1 system + 20 history)
const CHAT_MAX_TOTAL_CHARS = 24_000;

/** @returns {string|null} why the payload is refused — handles `content` and `parts`. */
function chatPayloadError(messages) {
  if (!Array.isArray(messages) || messages.length === 0)
    return "'messages' must be a non-empty array.";
  if (messages.length > CHAT_MAX_MESSAGES)
    return `'messages' must contain ${CHAT_MAX_MESSAGES} entries or fewer.`;
  const totalChars = messages.reduce((sum, { content, parts }) => {
    if (typeof content === "string") return sum + content.length;
    if (content !== undefined)
      return sum + JSON.stringify(content ?? "").length;
    return sum + JSON.stringify(parts ?? "").length;
  }, 0);
  return totalChars > CHAT_MAX_TOTAL_CHARS
    ? `'messages' must total ${CHAT_MAX_TOTAL_CHARS} characters or fewer.`
    : null;
}

app.post(
  "/api/chatbots/:id/chat",
  route(async (req, res) => {
    if (USE_MOCK) {
      res
        .status(501)
        .json({ error: "Chatbot API is not available in mock mode." });
      return;
    }
    const id = req.params.id;
    const messages = req.body?.messages;
    const invalid = chatPayloadError(messages);
    if (invalid) {
      res.status(400).json({ error: invalid });
      return;
    }
    res.json(await api.chatWithChatbot(id, messages, CONNECT_SECRET_KEY));
  }),
);

// POST /api/chat
// Request: { messages: [...] } (OpenAI chat format).
// Returns: the OpenAI-compatible chat-completion JSON from the configured endpoint.
// Errors:  501 until LLM_API_KEY is set · 502 LLM upstream unreachable.
// Note: chat talks directly to the configured LLM endpoint, not the Connect API,
// so it does not send CONNECT_SECRET_KEY.
// The size caps below are the only thing standing between this route and an
// unbounded bill: it forwards whatever the browser sends to an endpoint the
// operator pays for, and there is no auth in front of it. The route the demo
// used to call (/api/demo-script) capped the prompt at 2000 characters and
// built the system message server-side; Studio's own-LLM source hands the
// browser the whole array, so the ceiling has to be re-stated here.
// A demo-grade guard, not a rate limiter — see README's Limitations.
app.post("/api/chat", async (req, res) => {
  if (!process.env.LLM_API_KEY) {
    res.status(501).json({
      error: "LLM_API_KEY not configured. Set it in .env to enable chat.",
    });
    return;
  }
  const messages = req.body?.messages;
  const invalid = chatPayloadError(messages);
  if (invalid) {
    res.status(400).json({ error: invalid });
    return;
  }
  try {
    const payload = await requestLlmCompletion(messages);
    res.json(openAiCompatibleResponse(payload));
  } catch (err) {
    // This route doesn't go through route() — it has its own try/catch
    // because requestLlmCompletion() isn't an upstreamJson() caller — so it
    // needs its own copy of the same server-console logging.
    console.error(`POST /api/chat → ${err.status ?? 502}: ${err.message}`);
    res
      .status(err.status ?? 502)
      .json({ error: "LLM upstream unreachable", message: String(err) });
  }
});

// ── Start ──────────────────────────────────────────────────────────────────

const CHECK_ICONS = { reachable: "✓", unreachable: "✗", mock: "–" };

app.listen(PORT, () => {
  console.log(`\nPerxona Connect Kit`);
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log(`  Mode : ${USE_MOCK ? "MOCK (no real API calls)" : "live"}`);
  // Deferred probes so the banner prints immediately and startup never blocks.
  // Labeled API/CDN so each line reads as that resource's reachability.
  api.checkUpstream().then((status) => {
    const icon = CHECK_ICONS[status] ?? "✗";
    const hint =
      status === "unreachable" ? " — check PERXONA_API_BASE_URL" : "";
    console.log(`  API  : ${icon} ${status}  ${PERXONA_API_BASE_URL}${hint}`);
  });
  // Fire-and-forget, so the picked ids reach the startup log and the first
  // visitor skips the catalog round-trip. Failures are handled inside.
  if (!USE_MOCK) resolveEmbedConfig();
  checkPresenter().then((status) => {
    const icon = CHECK_ICONS[status] ?? "✗";
    const hint =
      status === "reachable"
        ? ""
        : " — set PRESENTER_URL to a reachable engine (see .env)";
    console.log(`  CDN  : ${icon} ${status}  ${PRESENTER_URL}${hint}`);
  });
});
