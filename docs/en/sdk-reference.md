## Presenter Component Reference

`<sv-presenter>` is the browser runtime for a
Connect avatar. Load the approved Presenter module, add the
element to the DOM, then interact with its JavaScript API. The
component accepts a publishable Connect API key and selected
asset IDs; your application backend owns how it supplies those
values.

### Load the Component

Read `PRESENTER_URL` from trusted application
configuration supplied by your server or Perxona, then inject it
once as a module script. The URL is not a credential.

index.html

```html
<!-- Declare the element before the Presenter module finishes loading -->
<sv-presenter hidden></sv-presenter>
```

app.js

```js
// Read this from trusted application configuration; it is not a secret.
const presenterUrl = getPresenterUrlFromAppConfig();

// Load the Presenter module once before reading the custom element.
await new Promise((resolve, reject) => {
  const script = document.createElement('script');
  script.type = 'module';
  script.src = presenterUrl;
  script.onload = resolve;
  script.onerror = () => reject(new Error('Presenter engine failed to load'));
  document.head.append(script);
});

const presenter = document.querySelector('sv-presenter');
```

### Full Initialization Flow

```js
// Your backend serves the publishable key. It never serves the secret one.
const getConnectKeyFromYourBackend = async () => {
  const response = await fetch('/your-backend/connect-key');
  return response.json();
};

// Listen for state changes before launching the component.
presenter.addEventListener('PRESENTER_STATUS', (e) => {
  // e.detail.status: 'Uninitialized' | 'Initializing' | 'Ready'
  console.log('Presenter status:', e.detail.status);
});

launchButton.addEventListener('click', async () => {
  // Must run inside a direct user gesture to unlock autoplay.
  await presenter.resumeAudioPlayback();

  const { connectKey } = await getConnectKeyFromYourBackend();
  await presenter.initializeWithConnectKey(connectKey, {
    avatarId: selectedAvatarId,
    sceneId: selectedSceneId,
    voiceId: selectedVoiceId, // optional
  });

  // present() never rejects; inspect the returned result instead.
  const result = await presenter.present('Hello from Perxona!');
  if (!result.success) console.warn(result.code, result.message);
});

// A refused key has no refresh to fall back on: it is revoked, expired,
// restricted to other domains, or was never granted the scope, and
// presenting it again fails the same way.
presenter.addEventListener('CONNECT_KEY_REJECTED', () => {
  console.error('Connect key rejected — reissue it in the console, then launch again.');
});

// Stop current playback and clear the queue when your UI needs it.
presenter.interruptPresentation();
```

### API Members

| Member | Description |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | Boot the presenter. Resolves `target` (avatarId/sceneId/voiceId) against the Connect API and mints a speech token. Returns a Promise — awaiting it means the presenter is ready. |
| `resumeAudioPlayback()` | Unlock browser autoplay policy. **Must be called from a direct user gesture.** Returns a Promise. Call this before `initializeWithConnectKey()` in your click handler. |
| `present(content)` | Synthesize `content` into speech and play it on the avatar. Returns `PresentationResult { success: boolean, code: string, message?: string }`. **Never rejects** — always check `result.success`. |
| `presentWithAudio(audio, content)` | Play caller-supplied audio on the avatar, bypassing Perxona TTS. Pass an `ArrayBuffer` from any TTS service or pre-recorded clip. The Motion Director still runs — gestures and expressions are driven by `content`. Returns `PresentationResult`. **Never rejects.** |
| `interruptPresentation()` | Stop the current performance and clear the queue immediately. |
| event `PRESENTER_STATUS` | Fired as state changes. `e.detail.status`: `"Uninitialized"` → `"Initializing"` → `"Ready"`. |
| event `CONNECT_KEY_REJECTED` | Fired when the Connect API refuses the key: revoked, expired, restricted to other domains, or never granted the scope. **There is nothing to retry** — the same key fails the same way. Reissue it in the console, then initialize again. |

### Transparent Background

When the scene you initialize with carries the
`background:transparent` tag, the presenter renders
the 3D view on a transparent canvas and your page shows through
behind the avatar; a scene without the tag renders its own
built-in background instead, and nothing shows through.

The scene decides it: there is no method and no attribute that
switches transparency on, so whether you get it follows from
which `sceneId` you pass to
`initializeWithConnectKey`. Both
`/assets/scenes` and
`/assets/scenes/{scene_id}` return each scene's
`tags`, so your picker can tell which scenes are
transparent. When you pick one of those, whatever should show
behind the avatar belongs on the element's own container — the
presenter paints no background of its own.
