## Known Limitations

- **Sample, not production.** Demonstrates the
  happy path — not hardened, scaled, or feature-complete
  compared to the full API.
- **Shared credential model.** All browser visitors
  share one Connect identity (the two keys in
  `.env`). Fine for demos; not a multi-tenant
  production design.
- **A refused key is reported, not recovered — at startup, in
  Embed's case.**
  Studio listens for `CONNECT_KEY_REJECTED` for the
  whole session and says so on the page. Embed only catches a
  rejection during its own startup — logged to console, no
  widget rendered — and never registers the listener, so a key
  revoked mid-session goes unnoticed: the widget stays on
  screen, silent. Neither retries a rejection it does catch,
  because a key that was revoked, expired, restricted to other
  domains, or never granted the scope fails the same way every
  time — reissue it in the console and launch again.
- **Chat is opt-in.**
  `POST /api/chat` returns `501` until
  `LLM_API_KEY` is set in `.env`.
- **Minimal UI.** Intentionally framework-free
  vanilla JS — designed for readability, not production polish.
