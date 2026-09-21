# Perxona Connect Kit

A minimal, self-contained sample that integrates the **Perxona Connect API** (Presentation Service) and the `<sv-presenter>`
avatar Web Component (Presenter SDK). Pick an avatar, scene, and voice, and make the avatar speak — then use it as the
starting point for your own project.

> This kit is built for a fast first run, not to cover the whole SDK or to be production-ready. The goal is to get you from
> clone to a talking avatar in **5–15 minutes**.

---

## Quick start

Need Node `>=22`. Then:

```bash
cp .env.example .env     # then open .env and set the required values:
                         #   PERXONA_API_BASE_URL             → e.g. https://console.perxona.ai/asia
                         #   PERXONA_CONNECT_SECRET_KEY       → a secret Connect API key
                         #   PERXONA_CONNECT_PUBLISHABLE_KEY  → a publishable Connect API key
npm install
npm run dev              # open the URL it prints (default http://localhost:8083)
```

Create both keys in the Perxona console under **Organization → Integration → Connect API keys**.
They are not interchangeable — see ["Auth model"](#auth-model).

Pick a demo, choose an avatar / scene / voice, click its launch button — the avatar speaks. The server authenticates with its
own key; there's no login screen.

---

## Contents

- [Perxona Connect Kit](#perxona-connect-kit)
  - [Quick start](#quick-start)
  - [Contents](#contents)
  - [1. Purpose](#1-purpose)
    - [Usage and Subscription](#usage-and-subscription)
    - [Auth model](#auth-model)
  - [2. Installation](#2-installation)
    - [Prerequisites](#prerequisites)
    - [Getting a Connect account](#getting-a-connect-account)
    - [Steps](#steps)
  - [3. Running](#3-running)
  - [4. API \& SDK integration](#4-api--sdk-integration)
    - [Backend API routes](#backend-api-routes)
    - [Direct Connect presentation API](#direct-connect-presentation-api)
    - [SDK: the `<sv-presenter>` Web Component](#sdk-the-sv-presenter-web-component)
    - [Initialization (the core flow)](#initialization-the-core-flow)
    - [Error handling](#error-handling)
    - [Contracts](#contracts)
      - [Notes for agents](#notes-for-agents)
  - [5. Acceptance](#5-acceptance)
  - [6. Known limitations](#6-known-limitations)
  - [7. Troubleshooting (FAQ)](#7-troubleshooting-faq)
  - [Next steps](#next-steps)
  - [License](#license)

---

## 1. Purpose

`server.mjs` is a thin Express backend that authenticates with a secret Connect API key and hands the browser a publishable one.
`public/` is a zero-dependency vanilla-JS frontend that drives the `<sv-presenter>` avatar Web Component loaded from Perxona's
CDN — the component talks to the Connect API directly using that publishable key. Together they demonstrate the happy path
end to end:

1. The server authenticates with its own secret Connect API key (`.env`) — no browser login.
2. Load the catalog (avatars, scenes, voices) through the server's proxy.
3. Fetch the publishable key and initialize the presenter with it plus the picked avatar/scene/voice — the presenter resolves
   the rest directly against the Connect API.
4. Make the avatar speak — one call, the presenter handles synthesis and motion playback.

Two demos ship with the sample. Both hold a multi-turn conversation the avatar speaks aloud; what differs is which side of
the work you are looking at. **Embed** is what it looks like once it is live: a product site with an avatar answering
questions on it, no controls and nothing on the page about its own configuration — the avatar and chatbot arrive already
resolved. **Studio** is the console you build that from: browse the catalog, create and edit chatbots with knowledge files
(processing is asynchronous — Studio polls and shows live status once a file is uploaded, which can take anywhere from a
few seconds to a few minutes) and function tools, interrupt mid-sentence, watch the SDK's events in a live timeline, and
switch at runtime between a Connect-hosted chatbot and your own `LLM_API_KEY` — the same conversation, answered by a
different model.

```text
.
├── server.mjs        # Express backend — proxies catalog reads and serves the publishable Connect key
├── public/
│   ├── index.html    # Landing page listing demos
│   └── demos/        # embed and studio demo UIs
└── docs/             # Reference — openapi.yaml
```

`docs/openapi.yaml` describes the Connect API — a reference for the underlying REST endpoints (open it in Swagger UI or
Postman to browse them).

### Usage and Subscription

> ⚠️ **Connect Kit is currently in Preview.** Through **2026/09/20** (subject to platform configuration), metered calls
> (chatbot conversations) are not subject to usage-credit enforcement. Put less ceremoniously: the meter exists, but nobody
> is sending you a bill yet.

When credit enforcement starts, Connect Kit sign-ups are treated as Perxona Console **Free Plan** users by default. If that
organization's credits are exhausted, **or its subscription itself is no longer active**, metered calls (such as chatbot
chat) fail with the same HTTP `400` and `code: 1003`, with a body like one of these:
`{"code": 1003, "details": "credit_points exhausted for org_id: ..."}` or
`{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}` — the `details` field is what tells the two
apart. A third, separate case — **no subscription record for the org at all** — fails with HTTP `403` and
`{"code": 14005, "details": "No active subscription found for org_id: ..."}` instead; both demos treat all three the same
way. At that
point, sign in to [Perxona Console](https://console.perxona.ai/asia) (use the region matching your account)
with your Connect account credentials (the same email and password you set during [sign-up](#getting-a-connect-account)), open
the organization management page, review **Subscription**, then top up credits or upgrade the plan.

> **Note:** `PERXONA_CONNECT_SECRET_KEY` in `.env` carries organization and billing permissions and must never reach a
> browser. The browser only ever receives `PERXONA_CONNECT_PUBLISHABLE_KEY` (via `GET /api/connect-key`), which cannot
> reach Console APIs. Keep `PERXONA_CONNECT_SECRET_KEY` out of any shared or publicly demonstrated `.env`.

### Auth model

This sample authenticates with **Connect API keys**, sent as an `X-Connect-Key` header. There is no login and no token to
refresh: a key is a credential in its own right, scoped to what it is allowed to do and revocable on its own.

It needs **two**, because they sit on opposite sides of the trust boundary:

|                                            | `PERXONA_CONNECT_SECRET_KEY` | `PERXONA_CONNECT_PUBLISHABLE_KEY` |
| ------------------------------------------ | ---------------------------- | --------------------------------- |
| Where it lives                             | this server only             | handed to the browser             |
| Read the catalog (avatars, scenes, voices) | ✅                           | ✅                                |
| Generate presentations, mint speech tokens | ✅                           | ✅                                |
| Talk to a chatbot, manage chatbots         | ✅                           | ❌                                |
| Publish an avatar into your organization   | ✅                           | ❌                                |
| Read organization credit/billing usage     | ✅                           | ❌                                |

The server sends the secret key on every upstream call it makes. `GET /api/connect-key` hands the browser the **publishable**
one, which it passes straight into `presenter.initializeWithConnectKey(connectKey, target)` (`target` is
`{ avatarId, sceneId, voiceId }`) — from that point on, `<sv-presenter>` talks to the Connect API directly for avatar/scene
resolution and speech synthesis. The secret key never reaches the browser, which is the whole reason there are two.

**Leave the secret key's allowed-domain list empty.** A domain restriction is matched against the browser's `Origin` header,
and a server-to-server request never sends one — so a secret key with domains configured is refused on every call, with an
error that says only that the origin is not allowed — it never names one, because nothing was sent. Domain restrictions
belong on the publishable key.

Nothing is retried. A key is refused only when it is revoked, expired, or was never granted the scope, and presenting the same
one again fails the same way — so the upstream status reaches you unchanged, and the presenter raises `CONNECT_KEY_REJECTED`
rather than trying to renew anything.

**What the two keys do and do not protect.** The table above describes the _keys_. It does not describe this server: the
`/api/*` routes have **no request-layer authorization at all**, and every one of them sends the secret key upstream. Anyone
who can reach this server can therefore create, edit, delete and talk to your chatbots, publish avatars into your
organization, and read your organization's credit/billing usage (`GET /api/credit`, Secret-key only upstream because it is
billing information) — through it, without ever holding the
secret key. Splitting the credential stops the key from leaking into a browser; it does not stop the _capability_ from being
reachable through the proxy. That is the demo trade this sample makes — every browser hitting it shares one upstream
identity — and it is why this is not a multi-tenant, production-grade design. Put your own authorization in front of these
routes before running it anywhere but `localhost`.

---

## 2. Installation

### Prerequisites

- **Node `>=22`** — check with `node --version`. Using nvm? Run `nvm use` in this directory (reads `.nvmrc`). If your Node is
  too old, `npm install` refuses to run and `npm run dev`/`npm start` fail with a message telling you what to upgrade to.
- **Perxona Connect account** — you sign in to the console with it to create the API keys this sample runs on. See
  [Getting a Connect account](#getting-a-connect-account) below if you do not have one yet.
- **Region-specific API base URL** — use `https://console.perxona.ai/asia` (or your region's equivalent).
- **Two Connect API keys**, one secret and one publishable, created in the console. The publishable one is what lets the
  browser read the catalog and mint speech tokens directly against the Connect API (see ["Auth model"](#auth-model)).

### Getting a Connect account

Sign up at **<https://console.perxona.ai>** and sign in. That account is what lets you create the two API
keys this sample runs on — the sample itself never uses your password.

> There is no sign-up API. The Connect `signup`, `confirm-signup`, `forgot-password` and
> `reset-password` endpoints were removed; accounts are created on the console. Password recovery
> is on the console's sign-in page.

Then open **Organization → Integration → Connect API keys** and create **two**:

| Create with type | Put it in                         | Allowed domains                                         |
| ---------------- | --------------------------------- | ------------------------------------------------------- |
| **Secret**       | `PERXONA_CONNECT_SECRET_KEY`      | **leave empty** — see ["Auth model"](#auth-model)       |
| **Publishable**  | `PERXONA_CONNECT_PUBLISHABLE_KEY` | set them if you know where the page will be served from |

The form shows what each type can do before you create it. **Each key is displayed once and never
again** — the console stores only a hash, so copy it into `.env` before closing the dialog. Lost
one? Revoke it and create another.

### Steps

```bash
cp .env.example .env     # 1. create your local config
npm install              # 2. install dependencies
```

Then open `.env` and fill in the values:

| Variable                          | Required | Description                                                                                                                                                                           |
| --------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `PERXONA_API_BASE_URL`            | ✅       | Region-specific Connect API base URL (e.g. `https://console.perxona.ai/asia`). From your Perxona contact.                                                                             |
| `PERXONA_CONNECT_SECRET_KEY`      | ✅       | Secret Connect API key. Authenticates this server; never sent to a browser. Leave its allowed-domain list empty.                                                                      |
| `PERXONA_CONNECT_PUBLISHABLE_KEY` | ✅       | Publishable Connect API key. Served to the browser on `GET /api/connect-key` and passed to the presenter.                                                                             |
| `PORT`                            | —        | Port the app serves on (default `8083`).                                                                                                                                              |
| `USE_MOCK`                        | `false`  | `true` serves a fake catalog so you can browse the UI without credentials. Cannot drive the presenter; chatbot routes return `501`.                                                   |
| `PRESENTER_URL`                   | —        | URL of the Perxona presenter engine on the CDN. **Region-specific, like `PERXONA_API_BASE_URL`** — keep the two regions matched. Omit it for the region-neutral production engine.    |
| `DEMO_FIXED_AVATAR_ID`            | —        | Pins the avatar Embed uses, reported as `fixedTarget` on `GET /api/config`. Set together with `DEMO_FIXED_SCENE_ID`. Leave both blank and the server picks the first in your catalog. |
| `DEMO_FIXED_SCENE_ID`             | —        | Pins the scene Embed uses. Takes effect only alongside `DEMO_FIXED_AVATAR_ID`.                                                                                                        |
| `DEMO_FIXED_VOICE_ID`             | —        | Pins the voice. Blank alongside a pinned avatar/scene selects BYO-TTS (`presentWithAudio()`); the auto-pick always includes a voice.                                                  |
| `DEMO_FIXED_CHATBOT_ID`           | —        | Pins the chatbot Embed converses with, reported as `chatbotId` on `GET /api/config`. Leave blank and the server picks the first non-disabled one in your account.                     |
| `LLM_API_KEY`                     | —        | API key for the selected provider. Leave blank and Studio's own-LLM source stays disabled.                                                                                            |
| `LLM_PROVIDER`                    | —        | `openai` (default) for Chat Completions, or `anthropic` for Claude Messages API.                                                                                                      |
| `LLM_BASE_URL`                    | —        | Provider base URL. OpenAI default: `https://api.openai.com/v1`; Anthropic default: `https://api.anthropic.com`.                                                                       |
| `LLM_MODEL`                       | —        | Provider model. Defaults follow `LLM_PROVIDER`: `gpt-4o-mini` for openai, `claude-sonnet-4-20250514` for anthropic.                                                                   |

The server **exits at startup** if `PERXONA_API_BASE_URL` or either key is missing — one key is not enough, and the message
names the one you left blank. If
`.env` itself doesn't exist yet (you skipped step 1), `npm run dev`/`npm start` fail immediately with a reminder to run
`cp .env.example .env`. The same commands also fail fast with an upgrade hint if your Node version doesn't meet the `>=22`
requirement. Keep `.env` out of version control; update `.env.example` when you add a new variable.

`GET /api/config` reports a `fixedTarget` and a `chatbotId` — the shape your own app would read to skip catalog selection
entirely — and the Embed demo initializes the presenter and starts its conversation from exactly those, with no picker.
**You do not have to configure any of it.** Leave every `DEMO_FIXED_*` blank and the server picks the first avatar, scene,
voice and chatbot in your account on the first `/api/config` request (memoized, so later polls cost nothing — deleting the
picked chatbot forces a re-pick on the next request instead of leaving `/api/config` serving a dead id). A **disabled**
chatbot is skipped rather than picked — it would accept the selection and then reject every message, with the failure
visible only in the browser console. Set them to
pin your own, which is what a real integration does — pinned values make no catalog call at all.

`/api/config` deliberately does **not** report whether a value was pinned or picked, and the Embed page shows neither. A
live site does not annotate its own widget; the server names what it chose in the startup log instead, which is where an
operator looks.

`DEMO_FIXED_VOICE_ID` is optional _once you pin an avatar and scene_: leaving it blank then selects BYO-TTS behavior, where
the caller supplies audio through `presentWithAudio()`. The auto-pick includes a voice instead, because `present()` fails
with _"the resolved target has no configured voice"_ without one — an explicit blank is a choice, no configuration at all
is not. Setting only _one_ of avatar/scene is the one mistake worth naming: the pair is ignored, the server warns at
startup, and the auto-pick takes over.

---

## 3. Running

```bash
npm run dev     # start with live reload (node --watch)
# or
npm start       # start without watch
```

The terminal prints the local URL (e.g. `http://localhost:8083`), the API it targets, and whether it's in live or mock mode.
In live mode, open that URL and **take the demos in the order the landing page lists them: Studio, then Embed.**
Studio is where you create the chatbot Embed answers through, so that order never dead-ends on an empty account.
Studio asks you to choose an avatar / scene / voice and click **Launch Presenter**; Embed has already been told which
avatar and chatbot to use, so you just type a message. Either way the first
line needs a user gesture before audio can start — browser autoplay policy, not a design choice — and in Embed that gesture
is the message you send. Mock mode supports catalog browsing only; it can drive neither demo's avatar.

---

## 4. API & SDK integration

The backend exposes a small proxy API for catalog reads plus one endpoint that serves the publishable Connect key; the frontend
calls it and drives the presenter SDK. See ["Auth model"](#auth-model) above for how the key flows from server to browser to
the Connect API.

### Backend API routes

| Method & path                                                        | Purpose                                                                                                       |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `GET /api/health`                                                    | Liveness + diagnostics (`upstream` reachability; reads `mock` in mock mode). Probes the backend on each call. |
| `GET /api/config`                                                    | Static per-process flags (`mock`, `chat`, `presenterUrl`) plus demo defaults. No upstream probe.              |
| `GET /api/connect-key`                                               | Hand the browser the publishable key — pass straight into `presenter.initializeWithConnectKey()`.             |
| `GET /api/voices`                                                    | List voices. Each item carries `languages` — the short codes (`en`, `ja`, …) the voice can speak.             |
| `GET /api/avatars` · `/api/avatars/:id` · `/api/avatars/:id/motions` | List / detail / motions.                                                                                      |
| `GET /api/scenes` · `/api/scenes/:id`                                | List / detail.                                                                                                |
| `GET /api/credit`                                                    | Studio's Credit Usage panel: used/total/remaining credit points and the current period's end.                 |
| `POST /api/chat`                                                     | Opt-in LLM chat. Used by Studio's own-LLM source. Returns `501` until `LLM_API_KEY` is set.                   |
| `/api/chatbots*`                                                     | Chatbot CRUD, knowledge upload, and multi-turn chat.                                                          |

### Direct Connect presentation API

`POST /api/v1/connect/presentation` generates a one-shot presentation payload. It is a **direct Connect API** endpoint, not a
route exposed by this Express sample. Send `avatar_id` and `message`; `voice_id`, `emotion`, and `intensity` are optional.

Call it from your server with your secret Connect API key. Do not put that key in browser code:

```js
const response = await fetch(
  `${process.env.PERXONA_API_BASE_URL}/api/v1/connect/presentation`,
  {
    method: "POST",
    headers: {
      "X-Connect-Key": process.env.PERXONA_CONNECT_SECRET_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      avatar_id: avatarId,
      voice_id: voiceId,
      message: "Welcome to our hackathon demo!",
      emotion: "excitement",
      intensity: "high",
    }),
  },
);
```

`emotion` sets the message tone and `intensity` sets its strength. Together, they guide facial-expression selection for
suggested motions and soft-rank motion candidates. Both fields are optional; when both are omitted, no facial expression is
attached. Use `intensity`, not `intens`. Valid `intensity` values are `low`, `neutral`, and `high`; consult
`docs/openapi.yaml` for the valid `emotion` values and complete request/response schema.

### SDK: the `<sv-presenter>` Web Component

The presenter is loaded from Perxona's CDN. `app.js` fetches `GET /api/config` on load, reads `presenterUrl`, and appends a
`<script type="module">` for it — `index.html` itself only declares the element:

```html
<sv-presenter hidden></sv-presenter>
```

`app.js` drives it through its JS API. The members used by this sample:

| Member                                                   | Role                                                                                                                             |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `presenter.initializeWithConnectKey(connectKey, target)` | Boot the presenter: resolves `target` (`{ avatarId, sceneId, voiceId }`) and mints its own speech token against the Connect API. |
| `presenter.resumeAudioPlayback()`                        | Unlock browser autoplay. **Must run from a direct user gesture** (the demo's launch button).                                     |
| `presenter.present(content)`                             | Synthesize `content` into speech and play it back on the avatar.                                                                 |
| `presenter.presentWithAudio(audio, content)`             | Play back a supplied speech audio buffer with `content` as the transcript for the performance.                                   |
| `presenter.playMotion(motionId)`                         | Resolve, preload, and play one body motion independently from the speech queue.                                                  |
| `presenter.interruptPresentation()`                      | Stop the current performance and clear the queue.                                                                                |
| event `PRESENTER_STATUS`                                 | `Uninitialized` → `Initializing` → `Ready`.                                                                                      |
| event `CONNECT_KEY_REJECTED`                             | The Connect API refused the key: revoked, expired, or missing a scope. Nothing to retry — reissue it and initialize again.       |

### Initialization (the core flow)

```js
// 1. Unlock audio from the user's launch-button click (autoplay policy).
await presenter.resumeAudioPlayback();

// 2. Fetch the publishable Connect key this server holds for the browser.
const { connect_key } = await api("/api/connect-key");

// 3. Initialize — the presenter resolves avatarId/sceneId/voiceId against the
//    Connect API itself and emits PRESENTER_STATUS as it becomes Ready.
await presenter.initializeWithConnectKey(connect_key, {
  avatarId,
  sceneId,
  voiceId, // optional — omit to use presentWithAudio() instead of present()
});
```

Once `PRESENTER_STATUS` reports `Ready`, make the avatar speak:

```js
const result = await presenter.present("Hello!");

// Play a body motion without waiting for or changing the speech queue.
const motionResult = await presenter.playMotion("known-motion-id");
```

`present()` builds the speech + motion performance internally via the Connect API, using the avatar/voice resolved by
`initializeWithConnectKey()` — there is no client-built fallback anymore.

### Error handling

The sample handles the common failure paths so you can see the patterns:

- **API errors** — the `api()` fetch wrapper throws on any non-2xx response with `status` and `data` attached, so callers can
  branch on the HTTP status. Catalog failures show a status message.
- **Refused key (server-proxied catalog calls)** — the upstream `401`/`403` reaches the browser unchanged. Nothing is retried:
  a key is refused because it is revoked, expired, or was never granted the scope, and sending it again fails identically.
  Studio's status message says so; Embed puts it in the console and renders no widget.
- **Refused key (browser-side, inside the presenter)** — once the publishable key is handed to
  `presenter.initializeWithConnectKey()`, the presenter calls the Connect API directly; if it refuses the key, the presenter
  fires `CONNECT_KEY_REJECTED` _and_ still fails the call that triggered it. There is nothing to refresh, so the event is a
  report rather than a recovery hook: fix or reissue the key and launch again. Studio listens for it and says so on the page.
- **`initializeWithConnectKey()`/`present()` failures** — the first rejects if the Connect API call to resolve the target
  fails (e.g.
  unknown avatar/scene id); the click handler catches it and shows a status message. `present()` never rejects — it resolves
  with a `PresentationResult` whose `success` is `false` and `code`/`message` explain why (e.g. no target resolved yet).

### Contracts

This README keeps shapes short on purpose. When you need exact fields, go to the source of truth:

| What                                                                                                | Where                                               |
| --------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| Presenter contract (`IPresentationWidget`, `PresentationTarget`, `PresentationResult`, event types) | `@perxona/presenter-types` (npm package, installed) |
| Perxona Connect API (the service the presenter and this proxy call)                                 | [`docs/openapi.yaml`](docs/openapi.yaml)            |
| Local `/api/*` proxy (request body · response shape · status codes)                                 | the route handlers in [`server.mjs`](server.mjs)    |

The local proxy intentionally **reshapes** a few responses, so don't assume `/api/*` matches `openapi.yaml` one-to-one:

- `GET /api/connect-key` → `{ connect_key }`.
- List endpoints normalize `avatar_id` / `scene_id` to `id`.

#### Notes for agents

- `request(path, { method, body })` (in `public/demos/studio/app.js`) is the fetch wrapper for all `/api/*` calls: it
  JSON-encodes `body`, returns parsed JSON, and throws an `Error` with `status` and `data` attached on any non-2xx response.
- `avatarId`, `sceneId`, and `voiceId` are each the `id` field from the catalog list responses (the dropdown selections) — they
  are passed straight into the `PresentationTarget` object handed to `presenter.initializeWithConnectKey()`.
- `connect_key` from `GET /api/connect-key` is the **publishable** key, safe for a browser to hold. The secret key is never
  served on any route — if you find yourself reaching for it in browser code, the answer is a server route instead (see
  ["Auth model"](#auth-model)).

---

## 5. Acceptance

You've integrated the kit correctly when:

1. `npm run dev` starts without errors and prints the local URL.
2. `GET /api/health` returns `{ "status": "ok", ... }` — check it with `curl http://localhost:8083/api/health`.
3. In `studio`, the avatar / scene / voice dropdowns populate from the catalog with no sign-in step. (`embed` has no
   dropdowns — everything it needs arrives from `GET /api/config`.)
4. In `studio`, clicking **Launch Presenter** reaches `✓ Ready` and renders the avatar; in `embed` the avatar renders and
   the chat box appears on its own, with no setup step.
5. Sending a message in either demo makes the avatar speak the reply.

---

## 6. Known limitations

- **Sample, not production.** It demonstrates the happy path; it is not hardened, scaled, or feature-complete versus the full
  SDK.
- **Shared credential model.** Every browser hitting this server shares one Connect identity (the `.env` service account) —
  there is no per-user login or per-user isolation. Fine for demos and hackathons; not a multi-tenant auth design.
- **Mock mode is catalog-only.** It supplies fake catalog data but cannot emulate the presenter’s direct Connect API calls, so
  Launch and playback are disabled until live credentials are configured.
- **LLM chat is opt-in.** `POST /api/chat` returns `501` until you set `LLM_API_KEY`; Studio disables its own-LLM source
  until then. Use `LLM_PROVIDER=openai` for Chat Completions or `LLM_PROVIDER=anthropic` for Claude's Messages API.
- **Both chat routes are unauthenticated, and they spend something.** `/api/chat` forwards whatever the browser sends to
  the provider your `LLM_API_KEY` pays for; `/api/chatbots/:id/chat` spends your Connect account's quota, and Embed makes it
  the default conversation entry point. No login, no rate limit on either — only a shared size cap (40 messages, 24 000
  characters) so one request cannot run away. Fine on `localhost`; **do not put this server on a public network.**
- **Model output goes to `present()` unfiltered.** Both demos hand the reply straight to the presenter, which interprets
  Motion Markup — `[MOTION <id>:<priority>]` — so a reply containing a mark drives the avatar's gesture instead of the
  automatic selection, for that whole utterance. Ids your account cannot see are dropped rather than rejected, and the text
  comes from your own chatbot, so the practical risk is low. If you put a model you do not control behind this, validate its
  output server-side first.
- **Minimal UI.** Plain vanilla JS with no framework or build step — intentionally, so the integration is easy to read.

---

## 7. Troubleshooting (FAQ)

**Why does `npm run dev`/`npm start` exit immediately with `.env not found`, or with
`PERXONA_API_BASE_URL is required` or a message naming one of the two Connect API keys?** The first means `.env` doesn't exist
yet; the others mean it exists but a required value is left blank. Both keys are required — one is not enough. Run
`cp .env.example .env` and fill in the API base URL and the two keys you created in the console.

**Why does the catalog fail to load with a `401`/`403` status message?** Three things do this, in rough order of
likelihood: the secret key was revoked or has expired; it has an **allowed-domain list** configured, which refuses every
server-to-server call (see ["Auth model"](#auth-model)); or `PERXONA_API_BASE_URL` points at the wrong region. The wrong
key _type_ is not one of them — reading the catalog needs only permissions both types carry, so a publishable key in
`PERXONA_CONNECT_SECRET_KEY` loads the catalog fine and fails later, on the chatbot routes. Check
`GET /api/health` — the `upstream` field shows whether the API is reachable at all.

**Chat suddenly fails with a `code` in the body?** Two codes mean a subscription issue, not a bad credential: `400` with
`{"code": 1003, ...}` means either the organization's credits ran out or its subscription is no longer active (the
`details` field tells the two apart); `403` with `{"code": 14005, ...}` means no subscription record exists for the org
at all. See [Usage and Subscription](#usage-and-subscription) to top up or upgrade the plan.

**Why doesn't the avatar appear, or why is there no sound?** Audio playback must be unlocked by a real user gesture.
Audio needs a user gesture: **Launch Presenter** in `studio`, or sending your first message in `embed`. Either one calls
`resumeAudioPlayback()`; audio won't start from page load alone, in these demos or in your own app. Watch for
`PRESENTER_STATUS` to reach `Ready`, and check the browser console — `embed` reports every failure there rather than on the
page, on purpose.

**Why is Studio's "Your own LLM" option greyed out?** `LLM_API_KEY` is unset, so `/api/chat` would return `501`. Set it,
choose `LLM_PROVIDER=openai` or `LLM_PROVIDER=anthropic`, then restart — the base URL and model both default to match the
provider, so `LLM_MODEL` is only needed when you want a different one.

**Why won't the page load, or why does it say the port is already in use?** Another process is using the port.
Change `PORT` in `.env` (default `8083`) and restart.

**Why does `npm install` or `npm run dev`/`npm start` fail with an "ERROR: Node ... is too old" message?** You're on
an older Node. This kit requires **Node `>=22`** — run `nvm use` (reads `.nvmrc`) if you use nvm, or check
`node --version` and upgrade at [nodejs.org](https://nodejs.org/).

For Presenter SDK issues not specific to this sample, see [Presenter SDK Integration
FAQs](../../README.md#presenter-sdk-integration-faqs) in the repo root README.

---

## Next steps

Once the happy path runs, make it yours:

- **Build from Embed, not from Studio.** `demos/embed/` is the template: 170 lines of `app.js` plus an `index.html` that is
  mostly filler copy — copy it, replace the layout, keep the widget. Studio is a tool, not a starting point. It is 1 200
  lines of catalog pickers, chatbot CRUD and a debug timeline, all of which you would spend your first hour deleting. Use it
  to browse the catalog and create a chatbot, pin what you chose with `DEMO_FIXED_*`, then build from Embed.
- **Get editor autocomplete.** `@perxona/presenter-types` is already installed — your IDE should pick up types and JSDoc on
  the presenter API automatically.
- **Enable Studio's own-LLM source.** Set `LLM_API_KEY` (and optionally `LLM_BASE_URL`, `LLM_MODEL`) to unlock
  `/api/chat`, then flip the switch mid-conversation to compare providers.

---

## License

Apache License 2.0 — see [`LICENSE`](../../LICENSE).
