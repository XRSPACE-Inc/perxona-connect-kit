# Notes for coding agents

Start with [`llms.txt`](llms.txt). It summarises the Perxona Connect API and the
`<sv-presenter>` Presenter SDK and links every handbook page. `llms-full.txt` is the
whole English handbook in one file for context loading.

- Handbook pages as Markdown: [`docs/en/`](docs/en/) (also [`docs/zh-tw/`](docs/zh-tw/) and [`docs/ja/`](docs/ja/)).
- Runnable sample: [`samples/express/`](samples/express/), with its own [`AGENTS.md`](samples/express/AGENTS.md) on how to scaffold a new demo from the existing ones.
- A finished product built on the sample: [`samples/express/public/demos/interview/`](samples/express/public/demos/interview/).

Two keys exist: a secret Connect API key (server only) and a publishable key (browser).
Never put the secret key in client code or commit a `.env`.
