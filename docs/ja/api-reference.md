## Connect API リファレンス

Connect API は Connect Kit
のサーバー側統合面です。特記がない限り、以下の
パスはリージョンの base URL（例：
`https://console.perxona.ai/asia/api/v1/connect`）からの相対パスです。 保護された呼び出しには Connect API
キーを `X-Connect-Key` ヘッダーとして使用します。

🗺️

**これが本物の Connect API です**——あなた自身のバックエンドが呼び出す、`console.perxona.ai`
上のものです。このハンドブック後半の Express
サンプルは、これらのエンドポイントの一部を自身の
`/api/*`
ルートの背後にラップしています。それは別の、独立したサーバーです——[Express サンプル Adapter API](https://connect.perxona.ai/#sample-api-adapter)
を参照してください。自分のバックエンドを書く場合は、このページのエンドポイントを直接呼び出してください。サンプルのルートは不要です。

💡

保護された呼び出しには毎回
`X-Connect-Key: <あなたのキー>`
を送ってください——作成方法は[API 認証情報を取得](https://connect.perxona.ai/#credentials)を参照。

⚠️

**1
つのリクエストで両方のヘッダーを送らないでください。**レガシーヘッダーから移行中でも、両方を試している最中でも、API
は `X-Connect-Key` と
`Authorization: Bearer`
を同時に含むリクエストを `400` で拒否します。

### 利用量とサブスクリプション

⚠️

Connect Kit 登録ユーザーは基本的に Perxona Console の
`Free Plan`
ユーザーとして扱われます。組織の credits
を使い切った場合、**またはサブスクリプション自体が無効になっている場合**、従量制の呼び出し——現時点では
`POST /api/chatbots/:id/chat`（チャットボットの会話）——が同じ HTTP `400` と
`code: 1003`
で失敗し、以下のいずれかのようなレスポンスを返します：

```
{"code": 1003, "details": "credit_points exhausted for org_id: ..."}
```
```
{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}
```

どちらかは
`details`
フィールドで判別できます。もう一つ、別のケースとして——組織にサブスクリプションのレコードが一切存在しない場合——こちらは
HTTP `403` と `code: 14005`
で失敗します：

```
{"code": 14005, "details": "No active subscription found for org_id: ..."}
```

非従量制の呼び出し（カタログ参照、チャットボット
CRUD、プレゼンテーション）は**影響を受けません**。

現在の利用量の確認やクレジットの追加は、
[Perxona Console → Subscription](https://console.perxona.ai/asia/organization/subscription/)
にサインインしてください（アカウントのリージョンに対応する
URL をご利用ください）。Connect API
上で独自のアプリケーションを構築している場合は、レスポンスの
`code: 1003` と `code: 14005`
を検出してユーザーにわかりやすいメッセージを表示することをお勧めします——このキットのサンプルデモは
`1003`
についてこのパターンを示しており、`14005`
にも同じ考え方を適用できます。

💡

**credit
は組織全体で共有される利用量メーターであり、Connect
に限りません。**上記の課金対象の呼び出し（チャットボットの会話）は、組織内の
他の課金対象の会話トラフィックと同じ組織単位の credit
プールを消費します。**Secret**
キーで組織の現在の利用量を確認できます：

```bash
curl -X GET "$CONNECT_API_BASE/credit" \
  -H "X-Connect-Key: pxc_..."
```
```
{
  "used_credit_points": 42,
  "total_credit_points": 100,
  "remaining_credit_points": 58,
  "is_quota_exceeded": false,
  "period_start": "2026-08-01T00:00:00Z",
  "period_end": "2026-09-01T00:00:00Z"
}
```

この数値は約 10
分ごとに更新されます——バックグラウンドのワーカーが定期的に再計算するもので、計量対象の呼び出しのたびに即時更新されるわけではないため、会話の直後に確認してもまだ反映されていないことがあります。

このエンドポイントは**Secret キー専用**です——Publishable キーは
`403`
になります。ブラウザ向けキーが持たない他の権限と同じ扱いです（[API 認証情報を取得](https://connect.perxona.ai/#credentials)の権限表を参照）。

⚠️

**Authorization: Bearer 認証は非推奨になり、Connect
のセルフサービスのサインアップとパスワード再設定もサポートされていません。**代わりに Connect API
キーを使用し、アカウントはコンソールで作成してください——両方とも[API 認証情報を取得](https://connect.perxona.ai/#credentials)を参照。

### Avatar と Scene の Catalog

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/assets/avatars` | 認証済み組織で利用できる有効な Avatar を一覧します。 |
| GET | `/assets/avatars/{avatar_id}` | 実行時設定を含む Avatar 詳細を取得します。 |
| GET | `/assets/avatars/{avatar_id}/motions` | Avatar と互換性のある Motion を一覧します。必要に応じて `pose_tag` または `motion_ids` で絞り込みます。 |
| GET | `/assets/scenes` `/assets/scenes/{scene_id}` | 有効な Scene を一覧するか、1 件の Scene 詳細を取得します。 |
| POST | `/assets/vrm/upload` | `.vrm` ファイルを multipart form data としてアップロードし、有効な Avatar として公開します。**secret** キーが必要です。フィールドは `vrm_file`、`skeleton_type`、任意で `avatar_name` と `lipsync_mode`。新しい `avatar_id` を返します。送信前にファイルを確認するスクリプトは[VRM Uploader](https://connect.perxona.ai/#vrm-uploader)を参照してください。**現在アップロードは一時停止中です**。理由は同セクションをご覧ください。 |

### Voice と Presentation

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/voices` `/voices/{voice_id}` | custom voice を一覧するか、voice の公開合成設定を取得します。各 voice には対応言語を短縮コード（`en`、`ja` など — `en-US` のようなロケールではありません）で列挙する `languages` フィールドが含まれます。一覧は `language` と `provider` で絞り込めます。詳細は表の下の説明を参照してください。 |
| POST | `/voice-tokens/tts` | JSON body `{ voice_id }` に対する provider TTS Token を発行します。通常の `<sv-presenter>` 発話では、この実行時処理はコンポーネントが行います。 |
| POST | `/presentation` | 単発の presentation payload を生成します。`avatar_id` と `message` を渡し、`voice_id`、`emotion`、`intensity` は任意です。 |

💡

**voice は対応言語で選びます。**多言語エージェントには、話すすべての言語を
`languages` がカバーする voice
が必要です。このフィールドは言語の短縮コード（`en`、`ja`、`zh`
など）を使い、`en-US`
のようなロケールではありません。有効なコードの一覧は、生成された
OpenAPI spec の `Language`
enum です。サーバー側で絞り込むには、その短縮コードを
`language` フィルタに渡します：

```bash
curl -X GET "$CONNECT_API_BASE/voices?language=ja" \
  -H "X-Connect-Key: pxc_..."
```
```
{
  "items": [
    {
      "id": "8f14e45f-...",
      "name": "Sakura",
      "description": null,
      "languages": ["ja"],
      "provider": "azure"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 50,
  "pages": 1
}
```

このレスポンスは 1 ページ分であり、全件ではありません。`page`
と `size` はクエリパラメータで（`size`
のデフォルトは 50、最大 100）、`pages`
はその絞り込みが何ページあるかを示します。「その言語に対応する
voice がない」と判断する前に、全ページを読み切ってください。

言語データが登録されていない voice では
`languages`
が空配列になります——「対応言語なし」ではなく「不明」として扱ってください。

### Chatbots

| Method | Path | 用途 |
| --- | --- | --- |
| GET POST | `/chatbots` | chatbot を一覧または作成します。作成は `multipart/form-data` を使用し、`name`、任意の `custom_instructions`、`knowledge_file`、JSON 文字列の `tools` フィールドを渡します。 |
| GET PATCH DELETE | `/chatbots/{chat_bot_id}` | chatbot の取得、部分更新、soft-delete を行います。更新は `multipart/form-data` を使用し、knowledge file の削除には `remove_knowledge` を使います。 |
| POST | `/chatbots/{chat_bot_id}/chat` | Connect parts 形式の JSON メッセージ履歴を送り、`presenter.present()` に渡せる `reply_text` を受け取ります。 |

### Credit

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/credit` | 組織の現在の credit 利用量——使用済み、合計、残り、当期の開始/終了を取得します。Secret キー専用です。権限の内訳は[API 認証情報を取得](https://connect.perxona.ai/#credentials)を参照してください。 |
