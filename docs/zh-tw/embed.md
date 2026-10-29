## Embed

![Perxona Connect Kit：Embed demo 範例](assets/images/embed-sample.png)

`demos/embed/` demo 展示 Connect Kit
上線之後的樣子：一個產品網站，虛擬人在上面回答問題。沒有
catalog、沒有選單、沒有設定面板——而且刻意**在頁面上任何地方都不提它自己的設定**。真的網站不會向訪客解釋自己怎麼設定的，所以這個也不會：widget
需要的一切都已經在 `GET /api/config`
解析好了，缺東西的時候就乾脆不渲染 widget，原因寫進瀏覽器
console。開啟
`http://localhost:8083/demos/embed/`。生命週期如下：

1. **沒有東西需要設定。**`GET /api/config` 會回報
   `fixedTarget`（avatar、scene、voice）與
   `chatbotId`。把所有
   `DEMO_FIXED_*`
   留空，伺服器會各挑你帳號裡的第一個，所以剛 clone
   下來完全不用設定就能跑；要釘住自己的就填進去，這才是真實整合的做法。到底是哪一種，只會出現在伺服器的啟動
   log，不會出現在頁面上。這需要真實憑證，而且帳號裡至少要有一個
   chatbot——mock 模式兩者都提供不了。
2. **頁面載入即初始化。**`app.js` 取得該
   config 與 `GET /api/connect-key`，接著呼叫
   `presenter.initializeWithConnectKey(key,
   config.fixedTarget)`。沒有點擊，也沒有任何 catalog 請求。
3. **Ready 時打開聊天框。**當
   `PRESENTER_STATUS` 觸發
   `Ready`，輸入框才出現。監聽器註冊在
   `initializeWithConnectKey()`
   *之前*：這個事件是得知 presenter
   就緒的唯一途徑——沒有任何可以事後讀取的狀態——所以在監聽器還隔著一個
   `await` 時發出的事件就永遠錯過了。
4. **送出訊息，回覆會被唸出來。**每則訊息帶著最近二十輪送到
   `POST /api/chatbots/:id/chat`，回覆再交給
   `present()`。**第一次送出就是音訊的解鎖時機。**在
   `resumeAudioPlayback()` 執行前，`present()`
   一律回傳
   `AUDIO_CONTEXT_UNAVAILABLE`，而瀏覽器的 autoplay
   政策只允許真實的使用者操作觸發它——所以真的網站無法在載入時就跟你打招呼，也不需要額外的「啟用音訊」按鈕。你說的第一句話，授權了它回你的第一句話。
