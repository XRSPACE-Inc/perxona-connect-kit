## Next Steps

Once either demo is running, here are natural paths forward:

- **Bring your own UI.** Replace the vanilla JS
  frontend with React, Vue, or any framework — the server API
  (`/api/*`) stays unchanged.
- **Handle a refused key.** Listen for
  `CONNECT_KEY_REJECTED` and tell whoever operates
  the integration. There is nothing to refresh — the fix is to
  reissue the key in the console, so the useful thing your code
  can do is say so clearly.
- **Bring your own model.** Set
  `LLM_API_KEY` (and optionally
  `LLM_PROVIDER`, `LLM_BASE_URL`,
  `LLM_MODEL`) in `.env` to unlock
  `POST /api/chat`, which enables Studio's
  **Own LLM** source. Note that the route is
  unauthenticated and spends whatever the key pays for — keep it
  on `localhost`.
- **Explore the full API contract.** See the
  OpenAPI spec for the underlying Connect API at
  `docs/openapi.yaml` inside the sample directory,
  and install `@perxona/presenter-types@latest` for
  presenter type declarations.
- **Build from Embed, not from Studio.**
  `demos/embed/` is the template — 170 lines of
  `app.js` and an `index.html` that is
  mostly filler copy. Copy it, replace the layout, keep the
  widget. Studio is a tool rather than a starting point: 1 200
  lines of catalog pickers, chatbot CRUD and a debug timeline
  you would spend your first hour deleting. Use it to browse the
  catalog and create a chatbot, pin what you chose with
  `DEMO_FIXED_*`, then build from Embed.
- **Follow updates and contribute.** Star and watch
  the repository below to track new features and bugfixes.

[### XRSPACE-Inc / perxona-connect-kit

Clone the sample, open issues, and follow updates on
GitHub.](https://github.com/XRSPACE-Inc/perxona-connect-kit)
