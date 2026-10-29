## Express サンプル Adapter API

Express サーバーは以下のルートを公開します。すべての
`/api/*` エンドポイントは JSON
を返します。サーバーは自身の **secret** キーを
`X-Connect-Key` ヘッダーとして送り、Connect API
へカタログ読み取りをプロキシします——ログイン手順はなく、リクエストごとのブラウザ認証も不要です。

🗺️

**以下のすべての
`/api/*` ルートは、このサンプル自身の Express
サーバーです**（`server.mjs`）——別の、独立した HTTP
サーバーであり、Connect API
そのものではありません。ブラウザが通信するのは
`http://localhost:8083`（またはサンプルをデプロイした場所）です。secret
キーを付けて[Connect API リファレンス](https://connect.perxona.ai/#api-reference)
の実際のエンドポイントを呼び出すのは、ブラウザではなくこのサーバーです。自分のバックエンドを書くということは、これらのルートの自分自身のバージョンを実装し、[Connect API リファレンス](https://connect.perxona.ai/#api-reference)
を直接呼び出すことを意味します——このサンプルのパスを再利用するのではありません。このページで唯一の例外がすぐ下の**Direct Connect API**で、これは Connect
自体を呼び出し、このサーバーを完全に迂回します。

### Connect API を直接呼び出す

POST/api/v1/connect/presentation

ワンショットの presentation payload
を生成します。自分のサーバーから
**secret** キーを
`X-Connect-Key` ヘッダーとして付け、Connect API
を直接呼び出してください。このルートは Express
サンプルサーバーではプロキシされません。必須フィールドは
`avatar_id` と
`message`、任意フィールドは
`voice_id`、`emotion`、`intensity`
です。

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

`emotion` はメッセージの感情、`intensity`
はその強さを指定します。両者は提案モーションの表情選択を導き、モーション候補のソフトなランキングシグナルとしても使われます。どちらも任意で、両方を省略すると表情は付与されません。対応する
`emotion` の値は `joy`、
`excitement`、`admiration`、
`caring`、`gratitude`、
`sadness`、`disappointment`、
`annoyance`、`embarrassment`、
`curiosity`、`surprise`、
`realization`、`confusion` です。
`intensity` の値は `low`、
`neutral`、`high` です。

### ヘルスチェックと設定

GET/api/health

稼働状況と上流診断。常に
`200` を返します。レスポンス：`{ status: "ok", upstream: "reachable" | "unreachable"
}`。毎回上流 API にプローブを実行します。

GET/api/config

プロセスごとの静的フラグ。レスポンス：`{ mock: boolean, chat: boolean, presenterUrl: string
}`。上流探索なし——低コストで呼び出せます。`chat` は
`LLM_API_KEY`
の存在のみ反映し、キー自体は返しません。

### Connect Key

GET/api/connect-key

**publishable**
キーをブラウザに渡します。レスポンス：`{ connect_key: string }`。これを直接
`presenter.initializeWithConnectKey(connectKey, { avatarId,
sceneId, voiceId })`に渡します。これが
`PERXONA_CONNECT_SECRET_KEY`
になることはありません——そちらは chatbot
との会話と管理ができ、ブラウザが持つべきものではありません。`Cache-Control: no-store`。mock モードでは配信するキーがないため
`501` を返します。

### カタログ

GET/api/avatars

アバター一覧。レスポンス：`Page { items: [{ id, name, thumbnail_urls, … }] }`。（`id` は上流の
`avatar_id` から正規化されています。）

GET/api/avatars/:id

アバター詳細（生形式、`lod_urls`、`lipsync_configs`
など含む）。

GET/api/avatars/:id/motions

アバターのモーション。レスポンス：`Page { items: […] }`。モーションはアバターのサブリソースです——トップレベルのモーションコレクションエンドポイントはありません。

GET/api/scenes

シーン一覧。レスポンス：`Page { items: [{ id, name, … }] }`。（`id` は
`scene_id` から正規化。）

GET/api/scenes/:id

シーン詳細。

GET/api/voices

音声一覧。レスポンス：`Page { items: [{ id, name, … }] }`。

### チャットボット

GET/api/chatbots

チャットボット一覧。レスポンス：`Page { items: [{ id, name, status }] }`。

POST/api/chatbots

チャットボットを作成します。ボディ：`{ name: string（必須）, custom_instructions?: string,
tools?: Array }`。 レスポンス：`ChatBotDetailResponse { id, name, status,
custom_instructions, tools }`。

GET/api/chatbots/:id

チャットボット詳細。レスポンス：`ChatBotDetailResponse`（`id`、`name`、
`custom_instructions`、`status`、`tools`
を含む）。

PATCH/api/chatbots/:id

チャットボットを更新します。ボディ：部分フィールド
`{ name?, custom_instructions?, tools? }`。
レスポンス：更新後の
`ChatBotDetailResponse`。

DELETE/api/chatbots/:id

チャットボットを削除します。`204 No Content`
を返します。

POST/api/chatbots/:id/knowledge

ナレッジファイルをアップロードします。ボディ：`{ filename: string, content_base64: string, mime_type?:
string }`。
対応形式：`.txt`、`.pdf`、`.doc`、`.docx`、`.csv`（最大
1 MB）。 サーバーが base64 をデコードして multipart で上流 API
に転送します。チャンク分割と embedding
はこの応答の後に非同期で実行されます——応答の
`knowledge.status` は通常まだ
`"processing"` です。
`GET /api/chatbots/:id` をポーリングして
`"ready"` または
`"error"` になるまで待ってください。

DELETE/api/chatbots/:id/knowledge

チャットボットのナレッジファイルを削除します。

POST/api/chatbots/:id/chat

チャットボットにメッセージを送信します。ボディ：`{ messages: Array }`——Connect parts 形式：
`[{ role: "user", parts: [{ type: "text", text: "…" }]
}]`。 レスポンス：`{ id, status, reply_text }`。`reply_text`
を
`presenter.present()`
に渡してアバターに発話させます。

### Chat

POST/api/chat

オプションの LLM チャット。リクエスト：`{ messages: Array }`（OpenAI メッセージ形式）。`LLM_API_KEY`
が設定されるまで `501` を返します。`messages`
が空または欠如の場合は `400`。

📄

**完全なコントラクト：**上記は Express demo
のプロキシ API です。Connect API
を直接呼び出す場合の正確なフィールド形式とスキーマは、sample
ディレクトリ内の OpenAPI spec `docs/openapi.yaml`
を参照してください。TypeScript の presenter 型は
`@perxona/presenter-types@latest`
をインストールしてください。
