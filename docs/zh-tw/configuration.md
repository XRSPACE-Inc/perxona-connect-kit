## 範例設定

所有設定透過 `.env` 進行。將
`.env.example` 複製為
`.env` 並填入你的值。**絕對不要提交 `.env`**——它已在 `.gitignore` 中。

| Variable | 必填 | 預設值 | 說明 |
| --- | --- | --- | --- |
| `PERXONA_API_BASE_URL` | ✅ | — | 區域專屬的 Connect API 基底 URL。向 Perxona 聯絡人取得。 |
| `PERXONA_CONNECT_SECRET_KEY` | ✅ | — | Secret Connect API 金鑰。伺服器每次呼叫上游都帶著它，絕不下放瀏覽器。**允許網域請留空**——伺服器不會送出 `Origin`，設了網域限制會讓每次呼叫都被拒絕。 |
| `PERXONA_CONNECT_PUBLISHABLE_KEY` | ✅ | — | Publishable Connect API 金鑰。經 `GET /api/connect-key` 送給瀏覽器並交給 presenter。可讀取 catalog、產生 presentation、發放語音 token（後兩者會對組織計費）；碰不到 chatbot 路由。 |
| `PORT` | — | `8083` | 伺服器監聽的連接埠。 |
| `PRESENTER_URL` | — | `cdn.perxona.ai/…/presenter.js` | Presenter 引擎 CDN URL。僅在 Perxona 聯絡人提供特定 URL 時覆蓋。 |
| `LLM_API_KEY` | — | — | 設定以啟用聊天面板。支援任何 OpenAI 相容金鑰，包括透過 `LLM_BASE_URL` 的本地 Ollama。 |
| `LLM_BASE_URL` | — | `https://api.openai.com/v1` | LLM 端點 URL（Ollama 或其他供應商時覆蓋）。 |
| `LLM_MODEL` | — | `gpt-4o-mini` | 傳遞給聊天端點的 LLM 模型名稱。 |
