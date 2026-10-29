## 疑難排解

伺服器立即退出：*"PERXONA\_API\_BASE\_URL is required"*，或一則指名兩把 Connect API 金鑰其中一把的訊息

你尚未建立 `.env`
或必填值為空白。**兩把金鑰都要**——只有一把不夠，訊息會指出你漏了哪一把。執行
`cp .env.example .env`，填入 API 基底 URL 與你在
console 建立的兩把金鑰。若你的 `.env` 仍留著
`PERXONA_CONNECT_EMAIL`/`PERXONA_CONNECT_PASSWORD`，訊息會告訴你：那個模式已經移除，這個
sample 現在只以 API 金鑰認證。

目錄載入失敗——狀態顯示 `401` 或
`403`

有三種可能，依常見程度排序。secret
金鑰**已撤銷或已過期**。它設了**允許網域**——伺服器對伺服器的請求不會送出
`Origin`，所以每次呼叫都被拒絕，而錯誤訊息只會說
origin
不被允許、不會指名任何一個，所以別在訊息裡找主機名稱；secret
金鑰的那份清單請留空。或者
`PERXONA_API_BASE_URL`
指向錯誤的區域。金鑰*型別*放錯本身不在其中：讀取
catalog 只需要兩種型別都具備的權限，所以把 publishable
金鑰放進
`PERXONA_CONNECT_SECRET_KEY`
通常還是讀得到 catalog——除非那把 publishable
金鑰本身也設了允許網域（這正是本手冊教你上線前該做的事）。這種情況下，對調會讓一把設了網域限制的金鑰跑到伺服器對伺服器呼叫的位置，而這類呼叫從不送出
`Origin`，於是每次呼叫都會用上面同一個理由被拒絕。動網域清單之前，先確認兩個變數沒有被對調——清空清單只會讓症狀消失，卻讓一把沒有網域限制的
secret 金鑰留在瀏覽器裡。檢查
`GET /api/health`——`upstream`
欄位顯示可連線性。

點擊 Launch 後 Avatar 未出現

檢查瀏覽器控制台的錯誤。常見原因：presenter
引擎載入失敗（CORS 錯誤——向 Perxona 聯絡人確認
`PRESENTER_URL`），或
`initializeWithConnectKey()` 因所選 avatar/scene ID
在你的帳號中不存在而失敗。

Avatar 出現但不說話

確保 `resumeAudioPlayback()` 在 Launch
按鈕的點擊處理器內部呼叫——不在計時器或讓出控制的
`await`
之後。瀏覽器會阻止在同步使用者手勢之外觸發的自動播放。

`npm install` 因 Node 版本錯誤而失敗

此套件需要 **Node `>=22`**。執行 `node --version` 確認版本。若使用 nvm，執行
`nvm use`（讀取 `.nvmrc`）或
`nvm install 22`。

聊天面板未出現

在 `.env` 中設定
`LLM_API_KEY`
並重新啟動伺服器。面板在金鑰存在前是隱藏的——設定後
`GET /api/config` 將回傳
`chat: true`。

聊天突然回傳 `400`（`code: 1003`）或
`403`（`code: 14005`）

錯誤碼 `1003` 表示你的組織 credits
已經用完，**或是**訂閱本身已經失效（看
`details`
欄位可以分辨是哪一種）——這**不是**金鑰問題，也不是伺服器錯誤。只有計量型呼叫（透過
`POST /api/chatbots/:id/chat` 的 chatbot
對話）會受影響；catalog 查詢、chatbot CRUD、presentation
呼叫照常運作。請登入
[Perxona Console → Subscription](https://console.perxona.ai/asia/organization/subscription/)
（請使用你帳號所在區域的網址）查看用量、加值，或確認方案狀態。同一個
chat endpoint 若回傳的是
`403`（不是
`400`），則是另一種錯誤——`SUBSCRIPTION_NOT_ACTIVE`（`code: 14005`），代表這個組織完全沒有訂閱
context——即使狀態碼看起來像金鑰問題，這也**不是**金鑰問題，處理方式一樣是登入上面的
Console 檢查 Subscription。
