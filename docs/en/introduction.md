Developer Handbook

# Perxona Connect Kit

Build a browser-native avatar experience.

The public integration surface for the
**Perxona Connect API** and the
`<sv-presenter>` avatar Web Component. This
handbook explains those contracts first; the Express sample
appears later as one implementation path.

## What is Perxona Connect Kit?

Connect Kit is the public integration surface for placing a
real-time 3D avatar in a web product. It separates the browser
rendering contract from the server-facing Connect API, so you
can use either with your own application architecture.

It has two complementary parts:

- **`<sv-presenter>`** — a browser
  Web Component that renders the avatar, initializes a selected
  avatar/scene/voice target, and runs speech, motion, and
  lip-sync playback.
- **Connect API** — authenticated HTTP endpoints
  for catalog assets, voices, presentations, and chatbots.
  Authenticate with a **Connect API key**, sent as
  an `X-Connect-Key` header. Keys come in two types:
  a **secret** key stays on your server, and a
  **publishable** key is the one you hand to the
  browser — it can read your catalog, generate presentations,
  and mint speech tokens, and nothing beyond that.
