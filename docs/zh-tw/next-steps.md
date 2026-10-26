## 後續步驟

任一 demo 運行後，以下是自然的進一步方向：

- **使用你自己的 UI。**用 React、Vue
  或任何框架取代原生 JS 前端——伺服器
  API（`/api/*`）保持不變。
- **處理被拒的金鑰。**監聽
  `CONNECT_KEY_REJECTED`
  並告訴實際維運這個整合的人。沒有東西可以刷新——真正的修法是到
  console
  重新建立金鑰，所以你的程式碼能做的最有用的事，是把這件事講清楚。
- **自備語言模型。**在 `.env` 中設定
  `LLM_API_KEY`（及可選的
  `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_MODEL`）以解鎖
  `POST /api/chat`，Studio 的
  **Own LLM**
  來源即可使用。請注意這個路由沒有身分驗證，而且會花掉這把 key
  的錢——請只在 `localhost` 使用。
- **探索完整 API 合約。**參考 sample 目錄下的
  Connect API OpenAPI spec
  `docs/openapi.yaml`，並安裝
  `@perxona/presenter-types@latest` 取得 presenter
  型別宣告。
- **從 Embed 開始做，不要從 Studio。**`demos/embed/` 是模板——170 行的
  `app.js`，加上一份幾乎都是填充文案的
  `index.html`。複製它、換掉版面、留下 widget。Studio
  是工具而不是起點：1200 行的 catalog 選單、chatbot CRUD 與
  debug timeline，你的第一個小時會全花在刪掉它們。用它瀏覽
  catalog、建立 chatbot，把選好的用
  `DEMO_FIXED_*` 釘住，然後從 Embed 開始做。
- **追蹤更新並貢獻。**Star 並 Watch 下方的
  repository 以追蹤新功能和修復。

[### XRSPACE-Inc / perxona-connect-kit

在 GitHub 上 clone 範例、提交 issue 並追蹤更新。](https://github.com/XRSPACE-Inc/perxona-connect-kit)
