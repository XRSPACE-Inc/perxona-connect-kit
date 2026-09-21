# Repository Guidelines

The **Perxona Connect Kit** — a minimal, self-contained sample that integrates the Perxona Connect API and the
`<sv-presenter>` avatar Web Component.

## Which demo to build from

**Build from `public/demos/embed/`. Read `public/demos/studio/`, but do not start from it.**

If you are an AI assistant helping someone build on this kit, that sentence is the instruction. The two demos are not
interchangeable, and picking the wrong one costs an hour of deleting code:

|            | `demos/embed/`                            | `demos/studio/`                                                                                                     |
| ---------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| What it is | the **template** — copy it                | a **tool**, and a reference                                                                                         |
| `app.js`   | ~170 lines                                | ~1200 lines                                                                                                         |
| Contains   | a fixed target, a chat box, one presenter | catalog pickers, chatbot CRUD, knowledge-file upload, function-tool editor, a model-source switch, a debug timeline |
| Use it to  | start a new application                   | browse the catalog, create a chatbot, then read it when you need to see how a specific API is called                |

So: scaffold from `embed/`, keep its bootstrap order and its `request()` wrapper, replace the filler product page with the
app you are actually building. When you need chatbot CRUD or knowledge files, copy the one function you need out of
`studio/app.js` — do not fork the whole demo to get it.

Studio's extra surface exists to demonstrate the API, not because an integration needs it. A production page that talks to
an avatar looks like Embed.

## Architecture

A minimal full-stack sample: a thin Express proxy plus a zero-dependency browser UI that drives the Perxona `<sv-presenter>`
avatar Web Component.

### `server.mjs` — key serving + catalog proxy

The server does two jobs:

1. Auth — it authenticates itself with `PERXONA_CONNECT_SECRET_KEY` from `.env`, sent as an `X-Connect-Key` header on every
   upstream call; there is no browser login and no token to refresh. `GET /api/connect-key` hands the browser the _other_ key,
   `PERXONA_CONNECT_PUBLISHABLE_KEY` — from there, `<sv-presenter>` talks to the Connect API directly. Nothing is retried on a
   `401`/`403`: a refused key fails the same way every time (see "Auth model" in README).
2. Catalog proxy — `GET /api/avatars`, `/api/scenes`, `/api/voices` (+ `:id`/`:id/motions` detail routes) stay server-proxied
   purely to populate the picker dropdowns; they normalize a couple of field names (`avatar_id`/`scene_id` → `id`) but otherwise
   pass upstream responses through unchanged.
3. Credit usage proxy — `GET /api/credit` proxies the Connect API's credit-usage endpoint verbatim (no field translation).
   Studio's Credit Usage panel polls it every 5 minutes and also offers a manual refresh icon button; a failed query is
   isolated to that one panel and never blocks catalog, chatbot management, or chat.

`/api/chat` is opt-in — it returns `501` until you set `LLM_API_KEY`. Use `LLM_PROVIDER=openai` for Chat Completions
(including Ollama and other compatible endpoints), or `LLM_PROVIDER=anthropic` for Claude's Messages API — the base URL and
the model both default to match the provider, so `LLM_BASE_URL` and `LLM_MODEL` are only needed to override them. The
browser-facing
chat response stays OpenAI-shaped so both providers use the same frontend code.

**Neither chat route is authenticated, and both spend something.** `/api/chat` forwards whatever the browser sends to the
provider your key pays for; `/api/chatbots/:id/chat` spends your Connect account's quota, and Embed makes it the default
conversation entry point. No login, no rate limit on either — only one shared size cap (40 messages, 24 000 characters,
`400` beyond that) so a single request cannot run away. Fine on `localhost`; do not put this server on a public network.

Chatbot CRUD routes let you create and manage Connect chatbots from the sample server:

| Route                                | Description                                                                |
| ------------------------------------ | -------------------------------------------------------------------------- |
| `GET /api/chatbots`                  | List all chatbots                                                          |
| `POST /api/chatbots`                 | Create a chatbot (`{ name, custom_instructions?, tools? }`)                |
| `GET /api/chatbots/:id`              | Get chatbot detail including tools                                         |
| `PATCH /api/chatbots/:id`            | Update name, instructions, or tools                                        |
| `DELETE /api/chatbots/:id`           | Delete a chatbot                                                           |
| `POST /api/chatbots/:id/knowledge`   | Upload a knowledge file (`{ filename, content_base64, mime_type? }`)       |
| `DELETE /api/chatbots/:id/knowledge` | Remove the knowledge file                                                  |
| `POST /api/chatbots/:id/chat`        | Chat with a chatbot (`{ messages: [...] }`) → `{ id, status, reply_text }` |

Create and update are forwarded as `multipart/form-data` — send plain JSON from the browser; the proxy handles re-encoding.
Knowledge uploads accept `.txt`, `.pdf`, `.doc`, `.docx`, `.csv` files encoded as base64 in the JSON body. Processing is
asynchronous — the upload response's `knowledge.status` is typically still `processing`, and Studio polls
`GET /api/chatbots/:id` to pick up the transition to `ready`/`error` rather than assuming it finished by the time the
response came back.
Tools (function-calling definitions for external APIs) are documented in `public/demos/studio/docs/connect-chat-bot-function-tools.md`.

### `public/demos/*/app.js` — vanilla JS, no build step

Zero dependencies, no bundler. The presenter is a Web Component loaded from Perxona's CDN; `app.js` fetches `GET /api/config` on
load to get `presenterUrl`, dynamically appends a `<script type="module">` for it, then drives `<sv-presenter>` through its JS
API and listens for its events. `public/index.html` is a landing page linking to each demo under `public/demos/`.

Both demos hold a conversation. They split on **surface** — what the widget looks like live, versus the console you build
it from. Build from Embed: it is ~170 lines and meant to be copied. Studio is ~1200 lines of pickers, CRUD and a debug
timeline — a tool for browsing the catalog and creating a chatbot, not a starting point for your own app:

- `demos/embed/` — a product page with an avatar answering questions on it. No catalog and no pickers, and nothing anywhere
  on the page about its own configuration: the target and the chatbot arrive resolved on `GET /api/config`
  (`fixedTarget`, `chatbotId`). A live site does not explain its own setup to visitors, so this one doesn't either — with
  two deliberate exceptions, both fixed and non-technical: if the organization's credits or subscription need attention
  (`code: 1003`, or `14005` when no subscription exists for the org at all), the chat shows a sentence with a Console
  link, since that's something the visitor can actually act on; and if the widget fails to start at all (missing
  config, an unreachable presenter engine), the stage shows a generic
  "assistant isn't available" sentence instead of staying blank. Every other detail about a failure still goes only to
  `console.error`. The first message you send is what unlocks audio — no separate "enable audio" control, because a real
  site has none.
- `demos/studio/` — you are building the application itself: catalog pickers, a multi-turn conversation the avatar speaks
  aloud, interrupt. A **source switch** chooses who runs the model — a Connect-hosted chatbot
  (`POST /api/chatbots/:id/chat`) or your own key (`POST /api/chat`). The history is kept provider-neutral as
  `{ role, text }` and converted at the call site, which is why you can flip the switch mid-conversation and carry the same
  history over. The own-LLM source stays disabled until `GET /api/config` reports `chat: true`.

Three presenter details worth knowing:

- `presenter.resumeAudioPlayback()` must run from a direct user gesture to satisfy browser autoplay policy. Until it has run
  at least once, `present()` resolves with `AUDIO_CONTEXT_UNAVAILABLE`, and the widget will not resume the AudioContext for
  you — so **an avatar that speaks on page load cannot exist**, in these demos or in yours. Embed hides its button until
  `PRESENTER_STATUS: Ready` and then unlocks and speaks inside one click; Studio unlocks in its Launch click.
- `present()` resolves with `{ success: false, code, message }` rather than rejecting, so an unchecked call fails silently.
  It also resolves when the line is _queued_, not when it has finished — wait for `ALL_PERFORMANCE_FINISHED` if you need to
  know it was actually spoken (Studio's send lock does).
- `presenter.initializeWithConnectKey(connectKey, target)` resolves the avatar/scene/voice and mints its own speech
  token directly against the Connect API — that speech token's refresh cycle is entirely internal to the widget (no
  `SPEECH_TOKEN_EXPIRED` handling needed in `app.js`). The Connect key itself is never refreshed.

Both demos end at `presenter.present(text)`, where the widget builds the Performance (speech + motion) internally via the
Connect API using the avatar/voice resolved by `initializeWithConnectKey()`. There is no server-side presentation-building
route or
client-built fallback.

### Direct presentation API

`POST /api/v1/connect/presentation` is a direct Connect API endpoint; the sample deliberately does not proxy it. Its optional
`emotion` and `intensity` fields guide facial-expression selection for suggested motions and soft-rank motion candidates. When
both are omitted, no facial expression is attached. Use `intensity`, not `intens`; its accepted values are `low`, `neutral`,
and `high`. Consult `docs/openapi.yaml` for the accepted `emotion` values and complete schema. Keep direct calls server-side
so the secret key is not exposed in browser code.

### `docs/` — contract reference

`openapi.yaml` describes the Connect API — treat it as read-only reference. The presenter contract
(`IPresentationWidget`) isn't in `docs/`; it's already installed as `@perxona/presenter-types` (see `package.json`) — point
your IDE at that package for autocomplete and JSDoc on presenter methods.

## Project Structure

- `server.mjs` — Express backend. Serves the publishable key (`GET /api/connect-key`) and proxies catalog reads; it no
  longer builds presenter-ready payloads (`<sv-presenter>` resolves those itself against the Connect API using that key).
- `public/` — the browser UI: `index.html` is a landing page listing demos; each demo (`demos/embed/`, `demos/studio/`) has
  its own `index.html`, `style.css`, and `app.js` (plain ESM, no build step).
- `docs/` — reference material: `openapi.yaml` (the Connect API).

## Getting Started

Requires Node `>=22` — run `nvm use` (reads `.nvmrc`) if you use nvm, or install Node 22+ directly.

1. `cp .env.example .env`
2. Fill in `PERXONA_API_BASE_URL`, `PERXONA_CONNECT_SECRET_KEY`, and `PERXONA_CONNECT_PUBLISHABLE_KEY` — sign up on the
   Perxona console (see Getting an account below), then create both keys there under
   **Organization → Integration → Connect API keys**.
   Set `PERXONA_API_BASE_URL` to your region's URL (e.g. `https://console.perxona.ai/asia`).
3. `npm install` — fails fast if your Node version is too old (`engine-strict` in `.npmrc`).
4. `npm run dev` — runs with live reload (or `npm start` without watch). The app serves on the port from your `.env` (`8083` by
   default). If your Node is too old or you skipped step 1, `dev`/`start` fail fast with an actionable message instead of a
   cryptic error.

## Coding Style

Modern ESM JavaScript (`"type": "module"`) and Node built-ins. Follow `.editorconfig`: UTF-8, LF line endings, 2-space
indentation, trimmed trailing whitespace, and final newlines. The frontend is dependency-free vanilla JS by design — keep it
that way unless you have a concrete reason to add a build step.

## Configuration

Required (the server exits at startup if any is missing — both keys are needed, one is not enough):

- `PERXONA_API_BASE_URL` — region-specific Connect API base URL.
- `PERXONA_CONNECT_SECRET_KEY` — authenticates this server. Never served to a browser. Leave its allowed-domain list empty:
  domain restrictions match the browser's `Origin` header, which a server-to-server request never sends, so a secret key with
  domains configured is refused on every call.
- `PERXONA_CONNECT_PUBLISHABLE_KEY` — served to the browser on `GET /api/connect-key` and passed to the presenter. It can read
  the catalog, generate presentations and mint speech tokens (the last two bill the organization); it cannot reach the
  chatbot routes, publish avatars, or read the organization's credit/billing usage (`GET /api/credit` is Secret-key only
  upstream). Note that this describes the _keys_, not this
  server: the `/api/*` routes have no request-layer authorization, so anything the secret key can do is reachable by anyone
  who can reach this server. Put your own authorization in front of them before running it anywhere but `localhost`.

### Getting an account

Sign up at **<https://console.perxona.ai>** and sign in. There is no sign-up API — the Connect `signup`,
`confirm-signup`, `forgot-password` and `reset-password` endpoints were removed. Password recovery is on the console's
sign-in page.

Then open **Organization → Integration → Connect API keys** and create two keys — one **secret** for
`PERXONA_CONNECT_SECRET_KEY`, one **publishable** for `PERXONA_CONNECT_PUBLISHABLE_KEY`. Each is shown once and never again
(the console stores only a hash), so copy it straight into `.env`.

Optional: `PORT`; `DEMO_FIXED_*` (pins the avatar/scene/voice target reported as `fixedTarget` on `GET /api/config`) and
`DEMO_FIXED_CHATBOT_ID` (pins the chatbot Embed converses with, reported as `chatbotId`). Embed reads both _instead of_ a
picker. Leave them all blank and the server picks the first avatar, scene, voice and chatbot in your account instead —
skipping any chatbot whose status is `disabled`, since that one would reject every message — so
Embed runs with no configuration — a voice is included because `present()` fails without one, whereas a blank
`DEMO_FIXED_VOICE_ID` alongside a pinned avatar/scene is a deliberate BYO-TTS choice. `/api/config` does not say whether a
value was pinned or picked: the Embed page shows no configuration detail, so the server names its choices in the startup
log instead. A half-filled pair warns at startup rather than blocking it — see the env var table in
`README.md` for the full list; and
`LLM_API_KEY` (+ `LLM_PROVIDER`, `LLM_BASE_URL`, `LLM_MODEL`) to enable Studio's own-LLM source. Keep secrets in `.env` and
never commit it; update `.env.example` when you add a new variable.

## Usage and Subscription

Connect Kit is in **Preview** until **2026/09/20** (subject to platform configuration) — metered calls (chatbot
conversations) are not subject to credit enforcement during this period. When enforcement starts, Connect Kit sign-ups
default to the Perxona Console **Free Plan**. If that organization's credits are exhausted, **or its subscription itself is
no longer active**, metered calls fail with the same HTTP `400` and `code: 1003`, with a body like one of these:
`{"code": 1003, "details": "credit_points exhausted for org_id: ..."}` or
`{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}` — the `details` field is what tells the two
apart. A third, separate case — **no subscription record for the org at all** — fails with HTTP `403` and
`{"code": 14005, "details": "No active subscription found for org_id: ..."}` instead; both demos treat all three the same
way (see the `demos/embed/` bullet above). Top up or upgrade via
**Subscription** in [Perxona Console](https://console.perxona.ai/asia) (use the region matching your account). See the full
notice in [`README.md`](README.md#usage-and-subscription).
