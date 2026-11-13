# Notes for coding agents

Start with [`llms.txt`](llms.txt). It summarises the Perxona Connect API and the
`<sv-presenter>` Presenter SDK and links every handbook page. `llms-full.txt` is the
whole English handbook in one file for context loading.

- Handbook pages as Markdown: [`docs/en/`](docs/en/) (also [`docs/zh-tw/`](docs/zh-tw/) and [`docs/ja/`](docs/ja/)).
- Runnable sample: [`samples/express/`](samples/express/), with its own [`AGENTS.md`](samples/express/AGENTS.md) on how to scaffold a new demo from the existing ones.
- A finished product built on the sample: [`samples/express/public/demos/interview/`](samples/express/public/demos/interview/).
- No server, or building from Lovable, Claude or ChatGPT: [`integrations/`](integrations/README.md). Its
  [`starter/avatar.html`](integrations/starter/avatar.html) (plain HTML) and
  [`lovable/PerxonaAvatar.tsx`](integrations/lovable/PerxonaAvatar.tsx) (React) run on the publishable key alone.

Two keys exist: a secret Connect API key (server only) and a publishable key (browser).
Never put the secret key in client code or commit a `.env`.

## Contributing to this repository

If the task is to change this repository itself and send the change back, rather than to build
your own app from a sample, read [`CONTRIBUTING.md`](CONTRIBUTING.md) before you edit anything.
The rules that matter most:

- Samples stay minimal and self-contained, and `main` must run against production.
- Demos in the Express sample are vanilla JavaScript with no build step. Do not add a bundler or
  a framework to them.
- Do not hand-edit `docs/en/`, `docs/zh-tw/`, `docs/ja/`, `llms.txt` or `llms-full.txt`. They are
  generated from the handbook.
- When you correct a fact, open every file that states it. A search is not enough.
- CI must be green to merge, and it runs without credentials. Do not add a check that needs a key.
