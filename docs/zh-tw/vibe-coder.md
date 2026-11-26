## Vibe Coder 新手指南

正在使用 AI 程式碼編輯器（例如
**Cursor**、**Windsurf**、**VS Code + GitHub Copilot**
或
**Claude Code**），但沒有傳統軟體工程背景、也不熟悉
GitHub
與終端機嗎？本區用最白話的方式解釋核心概念、教你免背指令下載專案與尋找隱藏設定檔，並提供可直接複製給
AI 編輯器的 Prompt 範本。

### 1. 給 Vibe Coder 的 3 個白話核心觀念

| 你會看到的詞 | 白話文是什麼意思？ |
| --- | --- |
| **GitHub 與 `Clone`** | **GitHub** 就像「公開的程式碼食譜庫」；而 **Clone（複製專案）**就是「把整包官方範本下載一份到你自己的電腦裡」，這樣你在自己電腦上怎麼修改、怎麼請 AI 改版，都不會影響到原本的範本。 |
| **環境變數（Environment Variables）與 `.env`** | 把 `.env` 想成放在你電腦裡的**「私密設定小抄／保險箱」**。你的 API 金鑰就像信用卡密碼——如果直接寫在網頁程式碼裡，分享專案或上傳時就會外洩。放進 `.env` 後，它只會留在你的電腦本機（專案的 `.gitignore` 已設定自動排除 `.env`，避免被上傳）。   **為什麼會有 `.env.example`？** `.env.example` 是官方附的「空白表格範本」。你只要把它複製一份、改名為 `.env`，再把自己的金鑰填進去即可。 |
| **為什麼需要兩把 API 金鑰（`Secret` vs `Publishable`）？** | **API 金鑰（Key）**是證明這個網站屬於你 Perxona 帳號的通行證。為了安全，系統分成兩把不同信任邊界的鑰匙：`PERXONA_CONNECT_SECRET_KEY` **只留在你的伺服器後台**，而 `PERXONA_CONNECT_PUBLISHABLE_KEY` 則**交給瀏覽器前台**。兩把金鑰的權限與建立步驟請見上方的[取得 API 憑證](https://connect.perxona.ai/#credentials)。 |

### 2. 免背指令的零基礎設定技巧

1. #### 事前準備：安裝兩個免費工具（只需做一次）

   1. **AI 程式碼編輯器**：下載
   [Cursor](https://www.cursor.com/)
   或
   [VS Code](https://code.visualstudio.com/)。  
   2. **Node.js（22 以上版本）**：前往
   [nodejs.org](https://nodejs.org/)
   下載安裝（建議選 v22+
   LTS）。不確定電腦有沒有裝？直接打開編輯器裡的 AI
   對話框問：`「請幫我檢查電腦有沒有安裝 Node.js 22 以上版本」`。
2. #### 把專案下載到電腦（3 種方式任選其一，不必背指令）

   挑你覺得最順手的方式即可：

   - **方式 A — 直接請 AI 編輯器幫你做（最推薦 Vibe
     Coder）：**
     打開 Cursor、Windsurf 或 Claude Code，直接貼上這段話：
     ```text
     請幫我 clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git，進入裡面的 samples/express 資料夾，把 .env.example 複製成 .env，並執行 npm install。
     ```
   - **方式 B — 用編輯器畫面按鈕（免打指令）：**
     在 Cursor / VS Code 歡迎畫面點選
     **Clone Git Repository...**，貼上
     `https://github.com/XRSPACE-Inc/perxona-connect-kit.git`，選擇電腦上的存放位置，下載完成後開啟裡面的
     `samples/express` 資料夾。
   - **方式 C — 在 GitHub 網頁下載 ZIP：**
     前往
     [GitHub 專案頁面](https://github.com/XRSPACE-Inc/perxona-connect-kit)
     點選右上角綠色 **<> Code** 按鈕 →
     **Download ZIP** 解壓縮，並開啟裡面的
     `samples/express` 資料夾。

   📁

   **資料夾位置提醒：**真正要執行的網站範例放在
   `samples/express/`
   資料夾裡面，不是最外層的根目錄！請確認編輯器或終端機已進入
   `samples/express/`。
3. #### 找到並編輯 `.env` 設定檔，接著啟動範例

   請依上方[取得 API 憑證](https://connect.perxona.ai/#credentials)建立兩把金鑰，再照下方[執行 Express 範例](https://connect.perxona.ai/#quickstart)填入 `.env` 並啟動伺服器。

   💡

   **在 Mac Finder 或 Windows 資料夾裡找不到
   `.env`？**
   因為
   `.`
   開頭的檔案在作業系統預設是隱藏檔！請直接看
   **Cursor / VS Code 左側的檔案清單**，那裡一定看得到。填寫時請確認 `=`
   前後**不要有空白**、**不要加引號**、檔名是
   `.env`（不是
   `.env.txt`），填完記得按
   `Cmd+S`（Mac）或
   `Ctrl+S`（Windows）存檔。

### 3. 如何開始 Vibe Coding？（直接複製給 AI 編輯器的 Prompt）

本專案已內建專為 AI 助理撰寫的說明檔（`AGENTS.md` 與
`CLAUDE.md`）。當你用 Cursor、Windsurf、Claude Code
或 VS Code Copilot 打開專案時，AI 已經自動讀懂
`<sv-presenter>` 與 Connect API 的所有用法。

🎯

**黃金法則：用 Studio 挑角色與建 Chatbot，但請從
`demos/embed/` 開始改程式碼！**
`demos/embed/`
是專為改造成產品網站設計的精簡範本；而
`demos/studio/`
則是包含目錄選單、CRUD
表單與除錯面板的完整開發者控制台，千萬別叫 AI 從 Studio 改起。

你可以直接複製以下 Prompt 貼給你的 AI 編輯器：

**Prompt 1 — 把網頁改造成你自己的主題網站：**

```text
請看 samples/express/public/demos/embed/。請保留 app.js 裡 <sv-presenter> 虛擬人初始化與聊天對話的核心邏輯，並幫我把 index.html 與 style.css 重新設計成一個現代感的【填入你的主題，例如：AI 飯店禮賓顧問／線上語言家教／品牌虛擬店長】網站。
```

**Prompt 2 — 把在 Studio 挑好的角色、場景、語音與 Chatbot 釘進
`.env`：**

```text
請讀取我本機伺服器啟動 log 中的自動選取 ID（或使用我在 Studio 介面選好的 Avatar、Scene、Voice 與 Chatbot ID），幫我寫進 samples/express/.env 的 DEMO_FIXED_AVATAR_ID、DEMO_FIXED_SCENE_ID、DEMO_FIXED_VOICE_ID 與 DEMO_FIXED_CHATBOT_ID。請勿讀取或輸出 PERXONA_CONNECT_SECRET_KEY，請勿將本機 /api/* 路由當作公開 API 暴露，也不要把憑證或回應寫死在前端程式碼中。
```

**Prompt 3 — 在對話框上方加上「一鍵提問」快捷按鈕：**

```text
請在 samples/express/public/demos/embed/ 的聊天輸入框上方，新增 3 個可點擊的常見問題快捷按鈕（Starter Chips），讓訪客點擊後就自動送出問題並讓 3D 虛擬人開口回答。
```
