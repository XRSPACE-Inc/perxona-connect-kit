<!-- markdownlint-disable MD013 -->

# Studio Demo

The full client, for when you are building the application itself. Where the [Embed demo](../embed/) shows the smallest integration that works, this one shows everything the SDK gives you:

1. **Browse the catalog** — pick an avatar, scene, and voice from live Connect data.
2. **Choose who runs the model** — a **source switch** selects a Perxona-hosted Connect chatbot or your own `LLM_API_KEY`. Flip it mid-conversation and the same history carries over.
3. **Manage chatbots** — create, read, update, and delete chatbots through the Connect API (full CRUD), with knowledge files and function tools.
4. **Hold a multi-turn conversation** — each user message goes to the active source; the reply is displayed in the chat log.
5. **Hear every reply spoken aloud** — the reply is piped into `sv-presenter.present()`, so the avatar speaks it in real time, with an interrupt and a send lock that waits for speech to finish.

---

## File Structure

```text
demos/studio/
├── index.html   — page layout (sidebar + presenter stage + chat panel)
├── app.js       — all client-side logic (CRUD, chat, presenter integration)
├── style.css    — dark-theme styles scoped to this demo
└── README.md    — this file
```

---

## Prerequisites

> For full server setup instructions, environment variable reference, and the complete route table, see the [Express sample README](../../../README.md).

The demo shares the same Express server (`server.mjs`) as the [Embed demo](../embed/). No extra setup is needed beyond the standard `.env` configuration:

```sh
PERXONA_API_BASE_URL=https://...
PERXONA_CONNECT_SECRET_KEY=pxc_...
PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
PRESENTER_URL=https://cdn.perxona.ai/...
```

Start the server from the `express/` directory:

```bash
npm start
# or: node server.mjs
```

Then open: <http://localhost:8083/demos/studio/>

---

## Usage

### Step 1 — Launch the Presenter

Pick an **Avatar**, **Scene**, and optionally a **Voice** from the dropdowns on the left, then click **Launch Presenter**. The avatar loads in the right-hand stage and greets you before you type anything.

That greeting is the one line in this demo that hand-writes **Motion Markup** — a `[MOTION <id>:1]` tag naming the gesture to play. Everything the chatbot replies with is sent as plain text instead, because the Connect API picks motions on its own. Plain text is the normal case; markup earns its place only where a specific action has to fire at a specific moment, which is what a greeting is.

Two things to know before you copy the pattern:

- **Markup is all-or-nothing per message.** A message containing _any_ motion mark skips automatic motion selection for the whole utterance — you cannot use a tag as a hint layered on top of the automatic choice.
- **An id your account cannot see is dropped, not rejected.** The line still speaks; it just carries no gesture. Combined with the point above, the greeting shipped here is empty-handed on any account but the one its id came from. Replace it with an id from your own catalog.

### Step 2 — Choose Who Runs the Model

Pick a **Model source** in the sidebar: **Connect Chatbot** (Perxona hosts it) or **Your own LLM** (`LLM_API_KEY`). The own-LLM option is disabled until that key is set, and says so.

The remaining setup depends on which you picked. Connect needs a chatbot object — step 3. Your own LLM needs nothing further; skip to step 4.

### Step 3 — Set Up a Chatbot (Connect source only)

**A brand-new organization has no chatbots**, so the create form opens by
itself, already filled in — press **Save** and you have one. The defaults are
worth reading before you replace them: every reply is passed to `present()` and
read aloud, so the instructions ask for short replies and no markdown, which
are the two things that make a chatbot sound wrong through an avatar.

Once you have chatbots, **select one** from the dropdown, or click
**+ New Chatbot** to create another:

1. Click **+ New Chatbot** — the editor expands.
2. Enter a **Name** (required) and optional **System Instructions** that define the chatbot's persona and knowledge scope.
3. Click **Save** — the chatbot is created via `POST /api/v1/connect/chatbots` and immediately selected.

To **edit** an existing chatbot, select it from the dropdown, then expand the **Create / Edit** section. Changes are saved via `PATCH /api/v1/connect/chatbots/:id`.

To **delete** a chatbot, click the red **✕** button next to the dropdown and confirm.

### Step 4 — Chat

The chat panel appears as soon as the active source can answer — a chatbot selected for Connect, or nothing more than the key for your own LLM. Type a message and press **Send** (or Enter):

- The avatar enters **Thinking** state while the model works.
- The reply appears in the chat log, and the panel shows which source produced it.
- **Flip the source switch here and keep typing.** The next reply comes from the other provider with the same history.
- If the presenter is **Ready**, the reply is automatically passed to `presenter.present(reply)` — the avatar speaks it aloud with matching gestures. If the presenter is not yet launched, the chat still works as text-only.
- **Send stays disabled until the avatar finishes speaking.** `present()` resolves when the performance is _queued_, not when it is spoken, so the demo waits for the `ALL_PERFORMANCE_FINISHED` event instead. Press **Stop** to cut the reply short — `presenter.interruptPresentation()` — and the input comes back at once.

---

## API Flow

```text
Browser                  Express Proxy              Connect API
  │                           │                          │
  │  POST /api/chatbots        │                          │
  │  { name, instructions }   │                          │
  ├──────────────────────────►│                          │
  │                           │  POST /api/v1/connect/chatbots  (multipart/form-data)
  │                           ├─────────────────────────►│
  │                           │◄─────────────────────────┤  { id, name, status, … }
  │◄──────────────────────────┤                          │
  │                           │                          │
  │  POST /api/chatbots/:id/chat                         │
  │  { messages: [{role,parts},...] }                    │
  ├──────────────────────────►│                          │
  │                           │  POST /api/v1/connect/chatbots/:id/chat
  │                           ├─────────────────────────►│
  │                           │◄─────────────────────────┤  { status, reply_text }
  │◄──────────────────────────┤                          │
  │                           │                          │
  │  presenter.present(reply_text)  (directly via SDK)   │
  │─────────────────────────────────────────────────────►│  (Connect Presentation API)
```

---

## The Source Switch

The **Model source** control in the sidebar decides who answers:

| Source              | Route                         | Needs                            |
| ------------------- | ----------------------------- | -------------------------------- |
| **Connect Chatbot** | `POST /api/chatbots/:id/chat` | a chatbot selected in the picker |
| **Your own LLM**    | `POST /api/chat`              | `LLM_API_KEY` set in `.env`      |

The own-LLM option stays disabled until `GET /api/config` reports `chat: true`, with the reason shown inline — the server advertises whether the key is present, never the key itself.

You can flip the switch **mid-conversation**, and the reply comes back from the other provider with the same context. That is the point of the control: it is the only way to watch the two sources answer the _same_ conversation rather than two similar ones. Note that knowledge files and function tools are Connect-hosted features — switching to your own LLM leaves them behind, which is the trade the switch exists to make visible.

## Message Format

The two APIs disagree about how a message is shaped. The Connect chatbot API uses a **parts-based** format; `/api/chat` uses OpenAI's `content` string:

```js
// Connect chat API
{ role: "user", parts: [{ type: "text", text: "Hello!" }] }

// /api/chat (OpenAI-compatible, both providers)
{ role: "user", content: "Hello!" }
```

Because the switch can be flipped at any time, `chatHistory` belongs to **neither** API. It is accumulated in a provider-neutral shape:

```js
{ role: "user", text: "Hello!" }
```

and serialized at the call site by `toConnectMessages()` / `toOpenAiMessages()` — see `app.js`. That single decision is what lets one conversation survive a mid-flight switch; storing it in either wire format would have meant converting or discarding the history on every flip.

To avoid upstream timeouts caused by long prompts (Gemini has a fixed backend deadline), each call sends only the most recent 20 turns as a sliding window — 10 user, 10 assistant. The own-LLM path applies the same bound, and `/api/chat` enforces a size cap server-side as well. The full history is preserved in the chat log display.

---

## Server-side Proxy Routes

The Express server adds these routes to proxy the Connect API:

| Method   | Path                          | Upstream endpoint                                       |
| -------- | ----------------------------- | ------------------------------------------------------- |
| `GET`    | `/api/chatbots`               | `GET /api/v1/connect/chatbots`                          |
| `POST`   | `/api/chatbots`               | `POST /api/v1/connect/chatbots` (multipart)             |
| `GET`    | `/api/chatbots/:id`           | `GET /api/v1/connect/chatbots/:id`                      |
| `PATCH`  | `/api/chatbots/:id`           | `PATCH /api/v1/connect/chatbots/:id` (multipart)        |
| `DELETE` | `/api/chatbots/:id`           | `DELETE /api/v1/connect/chatbots/:id`                   |
| `POST`   | `/api/chatbots/:id/knowledge` | `PATCH /api/v1/connect/chatbots/:id` (knowledge_file)   |
| `DELETE` | `/api/chatbots/:id/knowledge` | `PATCH /api/v1/connect/chatbots/:id` (remove_knowledge) |
| `POST`   | `/api/chatbots/:id/chat`      | `POST /api/v1/connect/chatbots/:id/chat`                |

> **Why multipart?** The upstream `create` and `update` endpoints use `multipart/form-data` to support optional `knowledge_file` uploads. The Express proxy accepts plain JSON from the browser and re-encodes it as `FormData` before forwarding — so the demo client stays simple.

---

## Extending the Demo

### Add Function Tools

Chatbots can call external HTTP APIs via **function tools**. Tools are defined as a JSON array and passed in the `tools` field when creating or updating a chatbot. See [`docs/connect-chat-bot-function-tools.md`](docs/connect-chat-bot-function-tools.md) for the full specification.

Example — add a weather lookup tool when creating a chatbot via `POST /api/chatbots`:

```json
{
  "name": "Weather Bot",
  "custom_instructions": "You are a weather assistant. Use the weather_lookup tool to answer questions.",
  "tools": [
    {
      "name": "weather_lookup",
      "description": "Look up current weather for a city. Use when the user asks about the weather.",
      "settings": {
        "request": {
          "method": "get",
          "url": "https://wttr.in",
          "query_params": {
            "type": "object",
            "properties": {
              "format": {
                "type": "string",
                "description": "Response format, use '3'"
              },
              "location": {
                "type": "string",
                "description": "City name in English"
              }
            },
            "required": ["location", "format"]
          }
        },
        "auth": { "secret_type": "no_auth" },
        "response": { "body_schema": {} }
      }
    }
  ]
}
```

### Add a Knowledge File

The **Knowledge File** section in the chatbot editor is already implemented. Click **Choose file…**,
select a `.txt`, `.pdf`, `.doc`, `.docx`, or `.csv` file, then click **Save** — the file is uploaded automatically.

Under the hood:

1. The browser reads the file and base64-encodes it.
2. A `POST /api/chatbots/:id/knowledge` call sends `{ filename, content_base64, mime_type }` to the
   Express server (up to 1 MB).
3. The server converts the payload back to a `Buffer`, wraps it in `FormData`, and `PATCH`es the
   upstream chatbot with `knowledge_file`.
4. Chunking and embedding happen asynchronously on the backend and can take anywhere from a few
   seconds to a few minutes. The status badge shows `Processing…` right away, and `app.js` polls
   `GET /api/chatbots/:id` every few seconds until it flips to `Ready` (or `Error`) — no page reload
   needed. If it's still processing after several minutes, polling stops on its own and a **Check
   again** button appears to resume it manually.

To remove the knowledge file, click the **Remove** button — the server sends `PATCH` with
`remove_knowledge=true`.

### Use a Chatbot ID at launch

Not yet supported: `PresentationTarget` currently only accepts an explicit `avatarId` / `sceneId` /
`voiceId?` combination (see `@perxona/presenter-types`). Resolving a target directly from a chatbot
ID is a possible future addition, not the current contract — this demo resolves `avatarId` /
`sceneId` itself (see `app.js`) and passes those to `initializeWithConnectKey()`.
