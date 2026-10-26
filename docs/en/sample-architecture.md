## Express Sample Architecture

Both demos share the same three-layer foundation.
`<sv-presenter>` is the innermost component —
the CDN Web Component that handles all speech, motion, and
lip-sync directly via the Connect API. The demos wrap it with
different application layers depending on the use case.

#### Shared Architecture

Both demos are single-page avatar presenters. Each provides
catalog UI and an input, then initializes
`<sv-presenter>` with a Connect token — all
rendering, synthesis, and playback happen inside the component.

```
┌─ Browser ─────────────────────────────────────────────────────┐
│  ┌─ demos/<demo>/app.js ─────────────────────────────────┐    │
│  │  Catalog pickers · Launch button · Prompt/chat input  │    │
│  │                                                       │    │
│  │  ┌─ <sv-presenter>  (Web Component, CDN) ──────────┐  │    │
│  │  │  Audio synthesis  ·  Motion playback            │  │    │
│  │  │  Lip-sync rendering  ·  Token auto-refresh      │  │    │
│  │  └─────────────────────────────────────────────────┘  │    │
│  └───────────────────────────────────────────────────────┘    │
└───────────────────────────────────────────────────────────────┘
       │  /api/*  (proxy)                   │  direct (publishable key)
       ▼                                    ▼
┌─ server.mjs ────────────┐     ┌─ Connect API ─────────────┐
│  /api/config            │     │  /assets  (catalog)       │
│  /api/connect-key       │────►│  /presentation            │
│  /api/avatars           │     │  /voice-tokens/tts        │
│  /api/scenes            │     └───────────────────────────┘
│  /api/voices            │
│  /api/chat  (opt-in)    │
└─────────────────────────┘
```
```
 Browser (app.js)        server.mjs                      Connect API
       │                      │                               │
  1.   ├─ GET /api/config ───►│                               │
       │◄─ presenterUrl ──────┤                               │
  2.   ├─ load <script> from presenterUrl (CDN)               │
       │                      │                               │
  3.   ├─ GET /api/avatars ──►│                               │
       ├─ GET /api/scenes ───►│                               │
       ├─ GET /api/voices ───►│                               │
       │◄─ catalog items ─────┤                               │
  4.   ├─ GET /api/connect-key ──────────────────────────────►│
       │◄─ connect_key ───────────────────────────────────────┤
  5.   ├─ initializeWithConnectKey(key, { avatarId, … }) ────►│
       │◄─ PRESENTER_STATUS: Ready ───────────────────────────┤
  6.   ├─ presenter.present("Hello!") ───────────────────────►│
       │◄─ avatar speaks ─────────────────────────────────────┤
```

#### Studio Demo

Adds the full client layer on top of the shared foundation
above. A source switch chooses who runs the model; a Chatbot
Manager handles bot CRUD, knowledge files, and function tools
for the Connect source. The Chat Panel drives multi-turn
conversations — each reply is piped straight into
`<sv-presenter>` for live speech.

```
┌─ Browser ───────────────────────────────────────────────────────┐
│  ┌─ demos/studio/app.js ────────────────────────────────────┐   │
│  │  ┌─ Chatbot Manager ────┐  ┌─ Avatar Stage ─────────┐    │   │
│  │  │  Bot picker (CRUD)   │  │  ┌─ <sv-presenter> ─┐  │    │   │
│  │  │  Knowledge upload    │  │  │  (CDN Component) │  │    │   │
│  │  │  Function tools      │  │  │  initialize()    │  │    │   │
│  │  └──────────────────────┘  │  │  present(reply)  │  │    │   │
│  │                            │  └──────────────────┘  │    │   │
│  │  ┌─ Chat Panel ─────────┐  └────────────────────────┘    │   │
│  │  │  Multi-turn history  │                                │   │
│  │  │  User → AI reply     │                                │   │
│  │  └──────────────────────┘                                │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
       │  /api/*  (proxy)                   │  direct (publishable key)
       ▼                                    ▼
┌─ server.mjs ───────────────────┐  ┌─ Connect API ──────────────┐
│  /api/chatbots  (CRUD)         │  │  /chatbots                 │
│  /api/chatbots/:id/chat        │─►│  /chatbots/:id/chat        │
│  /api/chatbots/:id/knowledge   │  │  /assets · /presentation   │
│  /api/connect-key              │  └────────────────────────────┘
└────────────────────────────────┘
```
```
 Browser (app.js)        server.mjs        Connect API
       │                      │                 │
  1-4. ├─ [config → catalog → connect-key → initializeWithConnectKey()]
       │                      │                 │
  5.   ├─ POST /api/chatbots ──────────────────►│ create bot
       │◄─ { id, name, status } ────────────────┤
  6.   ├─ POST /api/chatbots/:id/knowledge ────►│ upload file
       │◄─ { knowledge: { status } } ───────────┤ (usually "processing" — chunking
       │                                        │  + embedding run async)
  6b.  ├─ GET /api/chatbots/:id ───────────────►│ poll until status
       │◄─ { knowledge: { status } } ───────────┤ leaves "processing"
       │                                        │  (repeated every few seconds, up to a timeout — see Studio's
       │                                        │   startKnowledgePolling in public/demos/studio/app.js)
  7.   ├─ POST /api/chatbots/:id/chat ─────────►│
       │  { messages: [{ role, parts }] }       │ AI response
       │◄─ { reply_text } ──────────────────────┤
  8.   ├─ presenter.present(reply_text) ───────►│
       │◄─ avatar speaks ───────────────────────┤
```

### Auth Model

⚠️

**Demo auth only.** Every browser visitor shares
one upstream Connect identity (the two keys in
`.env`), and the `/api/*` routes carry
**no request-layer authorization at all** — so
anyone who can reach this server can do everything the secret
key can, without ever holding it. Splitting the credential
stops the key from leaking into a browser; it does not stop
the capability from being reachable through the proxy. Fine
for demos and hackathons — not a production multi-tenant
design.

1. The server reads
   `PERXONA_CONNECT_SECRET_KEY` and
   `PERXONA_CONNECT_PUBLISHABLE_KEY` from
   `.env`, and refuses to start unless both are set.
2. Every upstream call carries the **secret** key as
   an `X-Connect-Key` header. There is no login step.
3. The browser calls `GET /api/connect-key` — the
   server returns the **publishable** key. The
   secret key is never served on any route.
4. The browser passes it into
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`.
5. From that point, `<sv-presenter>` talks to
   the Connect API directly — speech and motion are handled by
   the component, not the server.
6. **Nothing is retried.** A key is refused only
   when it is revoked, expired, restricted to other domains, or
   never granted the scope — so the upstream
   `401`/`403` reaches the browser
   unchanged instead of being flattened into a `502`.
