## Presenter

Both demos build on the same `<sv-presenter>`
integration — the essential pattern every Connect app needs, in
vanilla JS. Two building blocks are shared by both:
**presenter initialization** (fetch the publishable
key from your server and hand it to
`initializeWithConnectKey()`) and
**driving speech** (send text to
`present()`). A third —
**catalog browsing** (fetch avatars, scenes, and
voices) — belongs to Studio only; Embed reads its target from
`.env` and never touches the catalog. Here is the
shared lifecycle — each demo's own chapter below covers exactly
when it triggers `initializeWithConnectKey()` and
`resumeAudioPlayback()`:

1. **Page load:** `app.js` calls
   `GET /api/config`, dynamically injects the
   presenter engine `<script>` from
   `presenterUrl`. Studio then loads the catalog
   (`/api/avatars`, `/api/scenes`,
   `/api/voices`) to populate its dropdown selectors;
   Embed skips this — its target came from
   `fixedTarget` in the same
   `/api/config` response.
2. **Initialize:** After fetching
   `GET /api/connect-key`, the demo calls
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`. `presenter.resumeAudioPlayback()` must also run
   from a direct user gesture to satisfy browser autoplay policy
   — see each demo's chapter for exactly when.
3. **Ready state:** The presenter fires
   `PRESENTER_STATUS` with
   `detail = "Ready"` — the UI reveals the performance
   controls.
4. **Playback:** Text is handed to
   `presenter.present(text)`, which queues the speech
   and the motion the Connect API selects for it.
