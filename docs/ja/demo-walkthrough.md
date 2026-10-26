## Presenter

どちらのデモも同じ
`<sv-presenter>`
統合の上に成り立っています——すべての Connect
アプリに必要な基本パターンを、バニラ JS
で示します。両方に共通する基礎要素は 2 つ：**presenter の初期化**（サーバーから publishable キーを取得して
`initializeWithConnectKey()`
に渡す）、そして**発話の駆動**（テキストを
`present()`
に送る）。3
つ目の**カタログの閲覧**（avatar・scene・voice
の取得）は Studio だけのものです——Embed はターゲットを
`.env`
から読み込むため、カタログには一切触れません。以下は共通のライフサイクルです——`initializeWithConnectKey()`
と `resumeAudioPlayback()`
を実際にいつ呼ぶかは、下記の各デモの章を参照してください：

1. **ページ読み込み：**`app.js` が
   `GET /api/config` を呼び出し、`presenterUrl`
   から presenter エンジンの
   `<script>`
   を動的に注入します。続いて Studio
   はカタログ（`/api/avatars`、`/api/scenes`、`/api/voices`）を読み込んでドロップダウンを設定します。Embed
   はこれを行いません——ターゲットは同じ
   `/api/config` レスポンスの
   `fixedTarget` から得ています。
2. **初期化：**`GET /api/connect-key`
   を取得した後、デモは
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`
   を呼び出します。`presenter.resumeAudioPlayback()`
   もブラウザの自動再生ポリシーを満たすため直接のユーザー操作から実行する必要があります——正確なタイミングは各デモの章を参照してください。
3. **準備完了状態：**presenter が
   `detail = "Ready"` で
   `PRESENTER_STATUS` を発行——UI
   がパフォーマンスコントロールを表示します。
4. **再生：**テキストが
   `presenter.present(text)`
   に渡され、音声と Connect API が選択した motion
   がキューに入ります。
