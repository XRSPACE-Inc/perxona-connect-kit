## Embed

![Perxona Connect Kit: Embed demo example](assets/images/embed-sample.png)

The `demos/embed/` demo is what the Connect Kit looks
like once it is live: a product site with an avatar answering
questions on it. There is no catalog, no picker, no settings
panel — and, deliberately,
**nothing anywhere on the page about its own
configuration**. A real site does not explain its setup to visitors, so this
one doesn't either: everything the widget needs arrives already
resolved on `GET /api/config`, and when something is
missing the widget is simply not rendered and the reason goes to
the browser console. Open
`http://localhost:8083/demos/embed/`. Here is the
lifecycle:

1. **Nothing to configure.**
   `GET /api/config` reports a
   `fixedTarget` (avatar, scene, voice) and a
   `chatbotId`. Leave every
   `DEMO_FIXED_*` blank and the server picks the first
   of each in your account, so this runs on a fresh clone with no
   setup at all; set them to pin your own, which is what a real
   integration does. Which of the two happened is reported in the
   server's startup log, never on the page. Live credentials are
   required and the account needs at least one chatbot — mock
   mode can supply neither.
2. **Initialize on page load.**
   `app.js` fetches that config and
   `GET /api/connect-key`, then calls
   `presenter.initializeWithConnectKey(key,
   config.fixedTarget)`. No click and no catalog request are involved.
3. **Open the chat on Ready.** When
   `PRESENTER_STATUS` fires with `Ready`,
   the message box appears. The listener is attached
   *before* `initializeWithConnectKey()`: this
   event is the only way to learn the presenter is ready —
   nothing exposes a status to read back — so one fired while the
   listener is still an `await` away is lost for good.
4. **Send a message; the reply is spoken.** Each
   message goes to `POST /api/chatbots/:id/chat` with
   the last twenty turns, and the reply is passed to
   `present()`.
   **The first submit is what unlocks audio.**
   `present()` resolves with
   `AUDIO_CONTEXT_UNAVAILABLE` until
   `resumeAudioPlayback()` has run, and browser
   autoplay policy allows that only from a real user gesture — so
   a live site cannot greet you on load, and does not need a
   separate "enable audio" button either. The first thing you say
   authorises the first thing it says back.
