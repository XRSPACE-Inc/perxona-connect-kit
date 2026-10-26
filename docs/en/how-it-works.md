## Integration Architecture

A Connect integration has three responsibilities. Your backend
owns credentials and access policy, the Connect API owns the
avatar resources and presentation services, and
`<sv-presenter>` owns browser-side rendering
and playback.

```
Your backend                          Browser
- stores Connect credentials          - renders your product UI
- attaches its secret key             - receives the publishable key
            |                         |
            v                         v
      Connect API  <----------------  <sv-presenter>
      assets · voices · presentation  initializes · speaks · animates
      chatbots                        handles lip-sync and playback
```

### Responsibility Boundary

- **Your backend** holds the
  **secret** Connect API key, applies your own user
  authorization, and serves the browser the
  **publishable** key — never the secret one.
- **Connect API** exposes the catalog of avatars,
  scenes, voices, and motions, plus presentation and chatbot
  operations.
- **`<sv-presenter>`** receives
  the publishable key and selected asset IDs, then communicates
  with Connect directly for the runtime services it needs.

### Runtime Flow

1. Your backend sends its **secret** key as an
   `X-Connect-Key` header on every Connect request.
   There is no login step and no token to refresh.
2. Your application lists or selects an active avatar, scene, and
   optional voice from the Connect API.
3. In a direct user gesture, call
   `presenter.resumeAudioPlayback()` to satisfy the
   browser autoplay policy.
4. Call
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`.
5. When the component reports `Ready`, call
   `presenter.present(content)` or
   `presenter.presentWithAudio(audio, content)`.

⚠️

**Only the publishable key may reach a browser.**
Anyone who opens devtools on your page can read whatever you
hand the presenter, so hand it the key that is meant to be
read. A **publishable** key can read your assets
and voices, generate presentations, and mint speech tokens —
note that the last two *bill your organization*, so an
unrestricted publishable key that someone copies off your page
keeps spending your credits through any other page's script.
Restrict its domains before you ship — that stops another
page's script, since only a real browser sends a genuine
`Origin` header. It does not stop someone who
copies the raw key into their own script:
`Origin` is just a header, and nothing outside a
browser is bound to send a truthful one. If a key leaks,
revoking it from the console is the actual stop. A
**secret** key adds everything a server needs:
writing assets, talking to your chatbots, and creating,
editing and deleting them. Keep it on your server and never
serve it on any route.

⚠️

**Putting the wrong one in the wrong variable is
silent.**
Both types share the `pxc_` prefix and the upstream
accepts either, so a secret key in
`PERXONA_CONNECT_PUBLISHABLE_KEY` does not fail —
everything works, and every visitor is handed a key that can
manage your chatbots. The console is the only place that tells
you which type a key is.

🌐

**Leave the secret key's allowed domains empty.**
A domain restriction is matched against the browser's
`Origin` header, and a server-to-server request
never sends one — so a secret key with domains configured is
refused on every call — and the error says only that the
origin is not allowed, never what it saw, because nothing was
sent. Domain restrictions belong on the publishable key, which
really is used by a browser.
