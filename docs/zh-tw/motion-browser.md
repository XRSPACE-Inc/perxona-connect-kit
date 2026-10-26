## Motion Browser

Motion Browser 是一個獨立的開發者工具，讓你自訂 Avatar
的動作——打招呼時揮手、說「謝謝」時鞠躬。這種細節沒辦法用猜的，所以你可以在這裡把整個動作目錄瀏覽一遍，直接在
3D Avatar
上即時預覽每個動畫，再把說話文字和動作指令混著寫成一份腳本，慢慢調到唸起來順、看起來也對為止。調好之後，**匯出給 AI 開發助手**，讓它幫你接進你自己的專案——Motion Browser
自己的程式碼不會出現在你要出貨的東西裡；這個交接的具體做法見下方「匯出給
AI 開發助手」。

**核心概念**：`<sv-presenter>` Web
Component 支援行內動作標籤。在腳本文字中任意插入
`[MOTION id:1]`，Avatar
就會在說話的對應時間點執行該動作。

```js
// Avatar 說 "I love" 的同時執行揮手動作，再繼續說話
await presenter.present("I love [MOTION wave:1] my avatar.");
```

💡

Script Composer 上有一個
**Play** 按鈕，會在 Motion Browser
裡即時預覽腳本。唸起來、看起來都對了之後，用上方頁首的
**Export**
按鈕，把你的 Avatar、Scene、Voice
和腳本一起交給正在開發你自己專案的 AI 開發助手。

### 示範

[](assets/videos/motion-browser-demo.mp4)
[↗ 開啟完整版 Motion Browser](/motion-browser/)

### 功能

- **Avatar 預覽** — 全螢幕 3D
  渲染，可從頂部選擇器即時切換角色。
- **Motion Library** —
  瀏覽、搜尋、篩選所有可用動作。點擊任一卡片即可在 Avatar
  上即時預覽。
- **Script Composer** —
  富文字編輯器，可在說話文字中混入動作 chip；按
  **Play** 在這裡預覽。
- **Export** — 頁首按鈕，把你目前的
  Avatar、Scene、Voice 和腳本組成一段 prompt 複製到剪貼簿，交給
  AI 開發助手使用。
- **場景與聲音切換** —
  底部控制列可即時切換場景與聲音，無需重新載入。

### 快速開始

💡

網頁版 Motion Browser
已經上線，不需要任何本機安裝步驟。到上方的
[取得金鑰](https://connect.perxona.ai/#credentials)
章節申請一把 publishable key，再從上面的展示連結開啟即可使用。

### 在腳本中插入動作標籤

1. #### 輸入說話文字

   在 Script Composer 中輸入 Avatar 要說的話。
2. #### 插入動作 chip

   在 Motion Library
   面板找到目標動作。將游標放在文字中想要插入動作的位置，點擊
   **+** 插入為 chip。
3. #### 按下 Play 預覽

   Avatar 說完整腳本，並在每個標記位置執行對應動作。chip
   會序列化為 `[MOTION <id>:1]` 並直接傳入
   `presenter.present()`——這是 Motion Browser
   幫你呼叫的，讓你在寫進自己的程式碼之前先聽、先看過結果。
4. #### 準備好了？匯出它

   唸起來、看起來都對了之後，使用頁首的
   **Export**
   按鈕——下方「匯出給 AI
   開發助手」說明了它會複製什麼、該怎麼用。

### 匯出給 AI 開發助手

上方頁首裡的
**Export**
按鈕，是把你的設定從 Motion Browser
帶出來、接進你自己專案的方式——Motion Browser
自己的程式碼不會出現在你要出貨的東西裡，所以這就是那個交接點。點下去，Motion
Browser 會把一段 prompt 複製到剪貼簿：你目前的
Avatar、Scene、Voice（名稱與 id），加上 Script Composer
裡的完整腳本——可以直接貼進你正在開發自己 Perxona Connect sample
專案的 AI 開發助手（Claude Code、Cursor
或類似工具）。助手會讀你專案自己的程式碼，自己決定這些值該放在哪裡；Motion
Browser 不知道你專案的結構，所以它不會替你猜。Script Composer
裡沒有任何內容（文字或動作 chip）之前，這個按鈕會是停用的。

💡

**範例**——假設你組合了一句問候語：`Hi there! [MOTION wave-1:1]`。按下 Export，再把複製到的 prompt
貼給你的助手，並加上類似這樣的指示：「幫我把這個接進我 chatbot
的
`custom_instructions`，讓它用這句問候語。」助手就能把 chatbot
自己的指示指向這句話。但要記得，最終還是由 chatbot
自己生成回覆——它會依照指示行事，但不保證每一次對話都會一字不差地覆述這句話（包含動作標籤）。實際試過、看看效果如何，再決定要不要依賴它。
