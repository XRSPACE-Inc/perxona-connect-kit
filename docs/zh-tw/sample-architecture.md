## Express 範例架構

兩個 Demo 共用相同的三層基礎。
`<sv-presenter>`
是最內層的核心元件——一個 CDN Web Component，直接透過 Connect API
處理語音、動作與口型同步。Demo 以不同的應用層包裝它。

#### 共用架構

兩個 demo 都是單頁式虛擬人 presenter。各自提供 catalog UI
與輸入框，然後以 Connect token 初始化
`<sv-presenter>`——所有渲染、合成與播放都在元件內部完成。

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

在上面的共用架構之上新增完整的用戶端層。來源切換決定由誰執行模型；Chatbot
Manager 則為 Connect 來源處理 bot CRUD、knowledge file 與
function tools。Chat Panel 驅動多輪對話——每個回覆直接串接至
`<sv-presenter>` 即時發話。

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

### 驗證模型

⚠️

**僅適用於 Demo 的驗證。**每個瀏覽器訪客共用同一個 Connect 身份（`.env`
裡的兩把金鑰），而且 `/api/*`
路由**完全沒有請求層授權**——所以任何連得到這台伺服器的人，不需要持有
secret
金鑰就能做到它能做的每一件事。拆成兩把擋住的是「金鑰外流到瀏覽器」，不是「能力經由
proxy 被觸及」。適合 Demo
和黑客松——不適合生產環境的多租戶設計。

1. 伺服器從 `.env` 讀取
   `PERXONA_CONNECT_SECRET_KEY` 與
   `PERXONA_CONNECT_PUBLISHABLE_KEY`，缺任一把就拒絕啟動。
2. 每次呼叫上游都帶著 **secret** 金鑰作為
   `X-Connect-Key` header。沒有登入步驟。
3. 瀏覽器呼叫
   `GET /api/connect-key`——伺服器回傳
   **publishable** 那把。secret
   金鑰不會在任何路由上被提供。
4. 瀏覽器將它傳入
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`。
5. 從此時起，`<sv-presenter>` 直接與 Connect API
   通訊——語音和動作由元件處理，而非伺服器。
6. **不會重試。**金鑰被拒只有四種原因：已撤銷、已過期、限定了其他網域、或從未被授予該權限——所以上游的
   `401`/`403`
   會原樣傳到瀏覽器，而不是被蓋成 `502`。
