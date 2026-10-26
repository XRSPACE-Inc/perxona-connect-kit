## Express サンプルアーキテクチャ

両方のデモは同じ 3 層構成を共有しています。
`<sv-presenter>`
は最内層のコアコンポーネント —— Connect API
を通じて音声・モーション・リップシンクを直接処理する CDN Web
コンポーネントです。デモは用途に応じて異なるアプリケーション層でラップします。

#### 共通アーキテクチャ

どちらのデモも単一ページのアバター Presenter です。カタログ UI
と入力を提供し、Connect トークンで
`<sv-presenter>`
を初期化します——レンダリング・合成・再生はすべてコンポーネント内で行われます。

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

上記の共通アーキテクチャの上に完全なクライアント層を追加します。ソース切り替えがモデルの実行者を決め、Chatbot
Manager が Connect ソース向けにボットの
CRUD・ナレッジファイル・ファンクションツールを処理します。Chat
Panel がマルチターン会話を駆動し、各返答は直接
`<sv-presenter>`
に渡されてライブで発話されます。

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

### 認証モデル

⚠️

**デモ専用の認証です。**すべてのブラウザ訪問者が
1 つの Connect ID（`.env` にある 2
つのキー）を共有し、さらに `/api/*`
ルートには**リクエスト層の認可が一切ありません**——このサーバーに到達できる人は誰でも、secret
キーを持たずにそれができることをすべて実行できます。資格情報を分けることで防げるのは「キーがブラウザに漏れること」であって、「能力がプロキシ経由で到達可能であること」ではありません。デモやハッカソンには適していますが、本番のマルチテナント設計には不向きです。

1. サーバーが `.env` から
   `PERXONA_CONNECT_SECRET_KEY` と
   `PERXONA_CONNECT_PUBLISHABLE_KEY`
   を読み込みます。両方が設定されていなければ起動しません。
2. 上流へのすべての呼び出しに **secret** キーを
   `X-Connect-Key`
   ヘッダーとして付けます。ログイン手順はありません。
3. ブラウザが
   `GET /api/connect-key` を呼び出し、サーバーは
   **publishable**
   キーを返します。secret キーはどのルートでも配信されません。
4. ブラウザがそれを
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`に渡します。
5. その後、`<sv-presenter>` は Connect API
   と直接通信します——音声とモーションはコンポーネントが処理し、サーバーは関与しません。
6. **リトライはしません。**キーが拒否されるのは、失効・期限切れ・他ドメインへの限定・スコープ未付与の
   4 つだけです——ですから上流の `401`/`403`
   は
   `502`
   に潰されず、そのままブラウザに届きます。
