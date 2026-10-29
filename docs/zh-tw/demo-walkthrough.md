## Presenter

兩個 demo 都建立在同一個
`<sv-presenter>` 整合上——每個 Connect
應用都需要的核心模式，以原生 JS
呈現。兩者共用的基礎元件有兩個：**presenter 初始化**（向你的伺服器取得 publishable 金鑰並傳給
`initializeWithConnectKey()`），以及**驅動語音**（將文字傳給
`present()`）。第三個——**catalog 瀏覽**（取得 avatar、scene 與 voice）——只屬於 Studio；Embed
的目標來自 `.env`，完全不碰
catalog。以下是共用的生命週期——各自何時觸發
`initializeWithConnectKey()` 和
`resumeAudioPlayback()`，見下面各 demo 自己的章節：

1. **頁面載入：**`app.js` 呼叫
   `GET /api/config`，從
   `presenterUrl` 動態注入 presenter 引擎
   `<script>`。接著 Studio 會載入
   catalog（`/api/avatars`、`/api/scenes`、`/api/voices`）以填充下拉選單；Embed
   則跳過這一步——它的目標來自同一份
   `/api/config` 回應裡的 `fixedTarget`。
2. **初始化：**取得
   `GET /api/connect-key` 後，demo 會呼叫
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`。`presenter.resumeAudioPlayback()`
   也必須在直接的使用者操作中執行才符合瀏覽器自動播放政策——確切的觸發時機見各
   demo 自己的章節。
3. **就緒狀態：**presenter 觸發
   `PRESENTER_STATUS`，`detail = "Ready"`——UI 顯示演出控制項。
4. **播放：**文字交給
   `presenter.present(text)`，它會排入語音以及 Connect
   API 為該段語音挑選的 motion。
