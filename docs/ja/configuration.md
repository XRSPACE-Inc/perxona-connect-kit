## サンプル設定

すべての設定は `.env` で行います。`.env.example`
を `.env` にコピーして値を入力してください。**`.env` は絶対にコミットしないでください**——`.gitignore` に含まれています。

| Variable | 必須 | デフォルト | 説明 |
| --- | --- | --- | --- |
| `PERXONA_API_BASE_URL` | ✅ | — | 地域別の Connect API ベース URL。Perxona 担当者に確認してください。 |
| `PERXONA_CONNECT_SECRET_KEY` | ✅ | — | Secret の Connect API キー。サーバーが上流の呼び出しごとに付与し、ブラウザには決して渡しません。**許可ドメインは空にしてください**——サーバーは `Origin` を送らないため、ドメイン制限があるとすべての呼び出しが拒否されます。 |
| `PERXONA_CONNECT_PUBLISHABLE_KEY` | ✅ | — | Publishable の Connect API キー。`GET /api/connect-key` でブラウザに渡され、presenter に渡されます。カタログの読み取り、presentation の生成、音声トークンの発行ができ（後の 2 つは組織に課金されます）、chatbot ルートには到達できません。 |
| `PORT` | — | `8083` | サーバーがリッスンするポート。 |
| `PRESENTER_URL` | — | `cdn.perxona.ai/…/presenter.js` | Presenter エンジンの CDN URL。Perxona 担当者から特定の URL が提供された場合のみ上書きしてください。 |
| `LLM_API_KEY` | — | — | チャットパネルを有効にするために設定します。`LLM_BASE_URL` 経由のローカル Ollama を含む OpenAI 互換のキーが使えます。 |
| `LLM_BASE_URL` | — | `https://api.openai.com/v1` | LLM エンドポイント URL（Ollama 等に上書き）。 |
| `LLM_MODEL` | — | `gpt-4o-mini` | チャットエンドポイントに渡す LLM モデル名。 |
