## 執行 Express 範例

範例應用是一個單一的 Node/Express 伺服器，提供兩個可執行的
browser demo，都建立在相同的
`<sv-presenter>`
整合之上。兩者的差別在於**你看的是哪一面**：兩者都會讓虛擬人開口進行多輪對話。
**Embed**是它上線之後的樣子：一個產品頁面，虛擬人在上面回答問題，沒有任何控制項，頁面上也不提自己的設定。
**Studio**則是你用來做出它的控制台：瀏覽
catalog、建立與編輯 chatbot、對話中打斷，並在 Perxona 託管的
chatbot 與你自己的 API key
之間切換而不中斷對話。伺服器只需啟動一次，即可開啟任一
demo。以下步驟帶你從 clone 到說話的虛擬人。

⚡

從 clone 到說話的虛擬人只需 **5–15 分鐘**。需要
**Node `>=22`** 與兩把 Connect API
金鑰——見[取得 API 憑證](https://connect.perxona.ai/#credentials)。

1. #### Clone 範例

   ```bash
   git clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git
   cd perxona-connect-kit/samples/express
   ```
2. #### 建立本機設定檔

   ```bash
   cp .env.example .env
   ```

   開啟 `.env`
   並填入三個必填值。兩把金鑰不可互換——secret
   留在伺服器，publishable 才是交給瀏覽器的那把：

   ```bash
   PERXONA_API_BASE_URL=https://console.perxona.ai/asia
   PERXONA_CONNECT_SECRET_KEY=pxc_...
   PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
   ```
3. #### 安裝依賴套件

   ```bash
   npm install
   ```

   需要 Node `>=22`。若版本過舊，`npm install`
   會顯示明確的升級訊息並拒絕執行。
4. #### 啟動伺服器

   ```bash
   npm run dev    # 啟動並監聽檔案變更
   # 或
   npm start      # 不監聽變更
   ```

   終端機會印出本機 URL，例如
   `http://localhost:8083`。
5. #### 啟動虛擬人

   在瀏覽器開啟該 URL。首頁提供兩個範例。在
   **Studio** 選擇
   **Avatar**、**Scene** 和
   **Voice**，再點
   **Launch Presenter**。**Embed**
   則沒有東西可選，也沒有東西要設定——虛擬人與 chatbot
   都已經幫你解析好，直接打字就行。兩者的第一句話都需要一次使用者操作：瀏覽器的
   autoplay
   政策只允許音訊從真實操作開始，所以任何虛擬人都無法在頁面載入時自己說話。在
   Studio 那個操作是啟動點擊，在 Embed 則是你送出的訊息。
