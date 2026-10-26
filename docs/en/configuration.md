## Sample Configuration

All configuration lives in `.env`. Copy
`.env.example` → `.env` and fill in your
values. **Never commit `.env`** — it is
in `.gitignore`.

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PERXONA_API_BASE_URL` | ✅ | — | Region-specific Connect API base URL. Ask your Perxona contact. |
| `PERXONA_CONNECT_SECRET_KEY` | ✅ | — | Secret Connect API key. Authenticates the server on every upstream call; never served to a browser. **Leave its allowed domains empty** — a server sends no `Origin`, so any domain restriction refuses every call. |
| `PERXONA_CONNECT_PUBLISHABLE_KEY` | ✅ | — | Publishable Connect API key. Served to the browser on `GET /api/connect-key` and passed to the presenter. Reads the catalog, generates presentations, and mints speech tokens (the last two bill your organization); it cannot reach the chatbot routes. |
| `PORT` | — | `8083` | Port the server listens on. |
| `PRESENTER_URL` | — | `cdn.perxona.ai/…/presenter.js` | Presenter engine CDN URL. Override only if your Perxona contact provides a specific URL. |
| `LLM_API_KEY` | — | — | Set to enable the chat panel. Any OpenAI-compatible key works, including local Ollama via `LLM_BASE_URL`. |
| `LLM_BASE_URL` | — | `https://api.openai.com/v1` | LLM endpoint URL (override for Ollama or other providers). |
| `LLM_MODEL` | — | `gpt-4o-mini` | LLM model name passed to the chat endpoint. |
