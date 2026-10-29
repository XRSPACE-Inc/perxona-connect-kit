## Studio

![Perxona Connect Kit：Studio demo 範例](assets/images/studio-example.png)

`demos/studio/` demo
是光譜的另一端：你要做的是應用程式本身。在前面的共用整合基礎上，它加上了
catalog 選單、完整的 chatbot
**CRUD**、持久的**多輪對話**，以及
**knowledge file** 與
**function tools**。每則助理回覆都會傳入
`presenter.present()`，讓虛擬人即時發話。一個**來源切換**決定由誰執行語言模型——由
Perxona 託管的 Connect chatbot，或你自己的
`LLM_API_KEY`——而且可以在對話中途切換：對話歷史以
`{ role, text }`
這種與供應商無關的形式保存，只在呼叫當下轉換，所以同一段對話會直接延續到另一邊。開啟
`http://localhost:8083/demos/studio/`。生命週期如下：

1. **啟動 presenter。**選擇 Avatar、Scene 和
   Voice，點擊
   **Launch Presenter**。這個點擊同時也負責呼叫
   `presenter.resumeAudioPlayback()`——瀏覽器的
   autoplay 政策要求音訊必須從真實的使用者操作開始。
2. **選擇由誰執行模型。**來源切換提供
   **Connect chatbot** 與
   **Own LLM**。在設定
   `LLM_API_KEY` 之前，Own LLM 會是停用狀態——`GET /api/config`
   只回報它是否可用，永遠不會回傳 key 本身。
3. **建立或選取 chatbot。**在 Connect 來源下，點擊
   **+ New Chatbot**，輸入名稱和可選的系統指令，點擊
   **Save**。Chatbot 透過
   `POST /api/chatbots`
   建立並立即選取。若要編輯或刪除現有
   chatbot，從下拉選單中選取。Own LLM
   來源不需要這一步——它沒有任何伺服器端物件要管理。
4. **聊天。**輸入訊息並按送出。模型處理期間虛擬人進入 Thinking
   狀態——Connect 來源走
   `POST /api/chatbots/:id/chat`，自己的 key 走
   `POST /api/chat`。回覆會顯示在聊天記錄中，並透過
   `presenter.present(reply)` 唸出來。若 presenter
   尚未啟動，聊天仍以純文字模式運作。
5. **可選——Knowledge file 與 function tools。**在
   chatbot 編輯器中上傳 `.txt`、`.pdf`、
   `.doc`、`.docx` 或
   `.csv` 檔案，讓 chatbot 根據自有內容回答。切割與
   embedding 是非同步進行的，可能需要幾秒到幾分鐘不等——Studio
   會輪詢 chatbot
   狀態並即時更新徽章，不需要重新整理頁面。建立或更新 chatbot
   時傳入 `tools` 陣列，讓 chatbot 在對話中呼叫外部
   HTTP API。這兩者都是 Connect 託管才有的功能；切到 Own LLM
   就沒有了——而這正是這個切換要讓你看見的取捨。
