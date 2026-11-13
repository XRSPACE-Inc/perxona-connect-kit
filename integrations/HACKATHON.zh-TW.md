# Perxona Hackathon 參賽指南

目標：用你習慣的 AI 工具，做出一個**有 3D 臉、會說話的 AI agent**。不用會寫程式。

## 0 · 先拿到金鑰（所有人，約 2 分鐘）

1. 到 [console.perxona.ai](https://console.perxona.ai) 註冊（免費方案）。
2. 右上角頭像選單 → **Management → Integration → Connect API keys**。
3. 建立一把 **Publishable** key，馬上複製（只會顯示一次）。
4. 在這把 key 的 **allowed domains** 加上 `*.lovable.app` 和 `*.lovableproject.com`。

> **兩把 key 的規則：** Publishable key 可以放在網頁裡。Secret key 只能放在伺服器或 Lovable Cloud
> Secrets，**絕對不要**貼進任何 AI 對話、程式碼或 GitHub。兩把長得一模一樣（都是 `pxc_` 開頭），
> 只有 Console 看得出差別。不小心貼出 secret key，就到 Console 撤銷再重建。

## 1 · 選一條路

| 你是 | 用 | 做法 |
| --- | --- | --- |
| 不會寫程式（最快） | **Lovable 範本** | 打開主辦單位提供的範本連結 `<主辦單位填入 Remix 連結>`，按 **Remix** 複製一份到自己帳號，再跟 Lovable 說：`Set the publishable key in src/config/perxona.ts to <你的 publishable key>.`，avatar 就會出現。接著用一般對話把它改成你的角色 |
| 不會寫程式，想從零開始 | **Lovable** | 照 [`lovable/README.md`](lovable/README.md)：貼 Knowledge、貼一段 prompt，幾分鐘就有可以分享的網址 |
| 不會寫程式，想先有人帶 | **ChatGPT** | 打開主辦單位分享的 **Perxona Avatar Builder** Project，或安裝 `perxona-connect` skill，說你想做什麼，它會一步步教你，並寫好 Lovable prompt。詳見 [`chatgpt/README.md`](chatgpt/README.md) |
| 工程師 | **Claude Code** | 執行 `claude plugin marketplace add XRSPACE-Inc/perxona-connect-kit` 和 `claude plugin install perxona-connect@perxona`，然後直接描述需求。詳見 [`claude/README.md`](claude/README.md) |
| 想 10 分鐘做出原型 | **Claude / ChatGPT** | 請它以 [`starter/avatar.html`](starter/avatar.html) 為基礎寫一個 HTML 檔，下載後用瀏覽器打開 |

## 2 · 給 avatar 一顆大腦

avatar 只負責「臉和聲音」，要說什麼由你決定：

- **Lovable AI**（最簡單）：寫好角色設定（例如「你是 Mia，親切的咖啡師」），Lovable 會處理 AI 回覆。
- **Perxona chatbot**：在 Perxona Console 建立 chatbot，上傳知識檔（PDF、Word、CSV）。適合需要「懂特定資料」的 agent。需要 secret key，要放進 Lovable Cloud Secrets。
- **寫死的腳本**：導覽、問答遊戲、說故事。不用 AI 也很好玩。

## 3 · 常見問題

| 狀況 | 解法 |
| --- | --- |
| 出現「Connect key rejected」 | 用錯 key（用到 secret），或網域沒加進 allowed domains。重新整理也不會好，要去 Console 修改 |
| avatar 會動但沒聲音 | 瀏覽器規定第一次發聲要由使用者點擊觸發。請 AI「在按鈕的 click handler 第一行呼叫 unlockAudio()」 |
| 一片黑，什麼都沒載入 | 區域設錯。Console 網址有 `/eu` 的人，region 要設成 `"eu"` |
| 出現「credits are used up」 | 組織的 credit 用完了，請聯絡主辦單位 |
| 想換 avatar 或聲音 | 跟 AI 說「use avatar `<ID>`, scene `<ID>`, voice `<ID>`」，ID 可以向主辦單位索取 |
| 要講中文 | 跟 AI 說「回答使用繁體中文」，並確認選用的聲音支援中文（`zh`） |

## 4 · 交件

- 一個可以打開的網址（Lovable 按 **Publish**），或一個 HTML 檔。
- 一句話說明你的 agent 是誰、幫誰解決什麼問題。
- 想被收錄在 [Showcase](https://showcase.perxona.ai)？到 repo 的
  [Discussions](https://github.com/XRSPACE-Inc/perxona-connect-kit/discussions) 分享。

比賽結束後，請到 Console 撤銷這次活動用的 key。
