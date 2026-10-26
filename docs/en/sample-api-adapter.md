## Express Sample Adapter API

The Express server exposes these routes. All
`/api/*` endpoints return JSON. The server proxies
catalog reads to the Connect API with its
**secret** key, sent as an
`X-Connect-Key` header — there is no login step, and
no per-request browser auth either.

🗺️

**Every `/api/*` route below is this sample's own
Express server**
(`server.mjs`) — a second, separate HTTP server,
not the Connect API itself. Your browser talks to it at
`http://localhost:8083` (or wherever you deploy the
sample); it is this server, not the browser, that then calls
the real endpoints in
[Connect API Reference](https://connect.perxona.ai/#api-reference) with the
secret key. Writing your own backend means implementing your
own version of these routes and calling
[Connect API Reference](https://connect.perxona.ai/#api-reference) directly —
not reusing this sample's paths. The one exception on this
page is **Direct Connect API** right below, which
calls Connect itself and bypasses this server entirely.

### Direct Connect API

POST/api/v1/connect/presentation

Generate a one-shot presentation payload. Call the Connect
API directly from your server with your
**secret** key as an
`X-Connect-Key` header; this route is not proxied
by the Express sample server. Required fields:
`avatar_id` and `message`. Optional
fields: `voice_id`, `emotion`, and
`intensity`.

```bash
curl -X POST "$CONNECT_API_BASE/presentation" \
  -H "X-Connect-Key: pxc_..." \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_id": "YOUR_AVATAR_ID",
    "voice_id": "YOUR_VOICE_ID",
    "message": "Welcome to our hackathon demo!",
    "emotion": "excitement",
    "intensity": "high"
  }'
```

✨

`emotion` sets the message's emotional tone and
`intensity` sets its strength. Together, they guide
facial-expression selection for suggested motions and act as
soft ranking signals for motion candidates. Both are optional;
when both are omitted, no facial expression is attached.
Supported `emotion` values: `joy`,
`excitement`, `admiration`,
`caring`, `gratitude`,
`sadness`, `disappointment`,
`annoyance`, `embarrassment`,
`curiosity`, `surprise`,
`realization`, and `confusion`.
Supported `intensity` values: `low`,
`neutral`, and `high`.

### Health & Config

GET/api/health

Liveness + upstream diagnostics. Always returns
`200`. Response:
`{ status: "ok", upstream: "reachable" | "unreachable"
}`. Probes the upstream API on every call.

GET/api/config

Static per-process flags. Response:
`{ mock: boolean, chat: boolean, presenterUrl: string
}`. No upstream probe — cheap to call.
`chat` reflects presence of
`LLM_API_KEY` only, never the key itself.

### Connect Key

GET/api/connect-key

Serve the browser the **publishable** key.
Response: `{ connect_key: string }`. Pass it
directly into
`presenter.initializeWithConnectKey(connectKey, { avatarId,
sceneId, voiceId })`. This is never `PERXONA_CONNECT_SECRET_KEY` —
that one carries chat and chatbot management, which no browser
should hold. `Cache-Control: no-store`. Returns
`501` in mock mode, where there are no keys to
serve.

### Catalog

GET/api/avatars

List avatars. Response:
`Page { items: [{ id, name, thumbnail_urls, … }] }`. (`id` is normalized from the upstream
`avatar_id`.)

GET/api/avatars/:id

Avatar detail (raw, includes `lod_urls`,
`lipsync_configs`, etc.).

GET/api/avatars/:id/motions

Motions for an avatar. Response:
`Page { items: […] }`. Motions are a sub-resource
of an avatar — there is no top-level motions collection.

GET/api/scenes

List scenes. Response:
`Page { items: [{ id, name, … }] }`. (`id`
normalized from `scene_id`.)

GET/api/scenes/:id

Scene detail.

GET/api/voices

List voices. Response:
`Page { items: [{ id, name, … }] }`.

### Chatbot

GET/api/chatbots

List chatbots. Response:
`Page { items: [{ id, name, status }] }`.

POST/api/chatbots

Create a chatbot. Body:
`{ name: string (required), custom_instructions?: string,
tools?: Array }`. Response:
`ChatBotDetailResponse { id, name, status,
custom_instructions, tools }`.

GET/api/chatbots/:id

Chatbot detail. Response:
`ChatBotDetailResponse` (includes `id`,
`name`, `custom_instructions`,
`status`, `tools`).

PATCH/api/chatbots/:id

Update a chatbot. Body: partial
`{ name?, custom_instructions?, tools? }`.
Response: updated `ChatBotDetailResponse`.

DELETE/api/chatbots/:id

Delete a chatbot. Returns `204 No Content`.

POST/api/chatbots/:id/knowledge

Upload a knowledge file. Body:
`{ filename: string, content_base64: string, mime_type?:
string }`. Accepted types: `.txt`, `.pdf`,
`.doc`, `.docx`, `.csv` (max
1 MB). The server decodes the base64 payload and forwards it
to the upstream API as multipart. Chunking and embedding run
asynchronously after this responds — the response's
`knowledge.status` is typically still
`"processing"`; poll
`GET /api/chatbots/:id` until it becomes
`"ready"` or `"error"`.

DELETE/api/chatbots/:id/knowledge

Remove the knowledge file from a chatbot.

POST/api/chatbots/:id/chat

Send a message to the chatbot. Body:
`{ messages: Array }` — Connect parts format:
`[{ role: "user", parts: [{ type: "text", text: "…" }]
}]`. Response: `{ id, status, reply_text }`. Pass
`reply_text` to `presenter.present()` to
have the avatar speak it.

### Chat

POST/api/chat

Opt-in LLM chat. Request:
`{ messages: Array }` (OpenAI message format).
Returns `501` until `LLM_API_KEY` is
set. Returns `400` if `messages` is
empty or absent.

📄

**Full contract:** The endpoints above are the
Express demo's proxy API. For the exact field shapes and
schemas of the underlying Connect API, see the OpenAPI spec at
`docs/openapi.yaml` inside the sample directory.
For TypeScript presenter types, install
`@perxona/presenter-types@latest`.
