## Presenter Component Reference

`<sv-presenter>` is the browser runtime for a
Connect avatar. Load the approved Presenter module, add the
element to the DOM, then interact with its JavaScript API. The
component starts in one of two modes: Catalog mode loads the
avatar and scene you pick from the Perxona catalog by ID, and
Direct mode loads avatar, scene and motion files you supply
yourself — see
[Two Ways to Initialize](https://connect.perxona.ai/#presenter-modes).

### Load the Component

Read `PRESENTER_URL` from trusted application
configuration supplied by your server or Perxona, then inject it
once as a module script. The URL is not a credential, but the
module runs with your page's full rights, so check that its host
is Perxona's CDN before injecting it.

index.html

```html
<!-- Declare the element before the Presenter module finishes loading -->
<sv-presenter hidden></sv-presenter>
```

app.js

```js
// Read this from trusted application configuration; it is not a secret.
const presenterUrl = getPresenterUrlFromAppConfig();

// The module runs with this page's full rights: load it only from a host listed
// here, over https. A build you serve on localhost may use http. Own CDN? Add it.
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const ALLOWED_PRESENTER_HOSTS = new Set(['cdn.perxona.ai', ...LOCAL_HOSTS]);
const { hostname, protocol } = new URL(presenterUrl);
const local = LOCAL_HOSTS.has(hostname) && protocol === 'http:';
if (!ALLOWED_PRESENTER_HOSTS.has(hostname) || (protocol !== 'https:' && !local)) {
  throw new Error(`Refusing the presenter engine from ${protocol}//${hostname}: see ALLOWED_PRESENTER_HOSTS`);
}

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

### Legacy Presenter

Integrations built before Connect Kit 1.0 load the Presenter
from `prod/latest/`. This legacy Presenter keeps
receiving updates until it is retired. Retirement is planned for
the end of 2026, once built-in avatars are available in the
current Presenter; the exact date will be announced separately.
New integrations use `prod/connect/latest/`.

- `https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js`

The legacy Presenter already sends
`X-Legacy-Presenter: 1` on its own requests. If your
server calls the Connect API itself — the catalog,
`/presentation` or `/motion-suggestion` —
send the same header, so the response uses assets the legacy
Presenter can load.

### Two Ways to Initialize

Pick the mode by where your assets live. An element runs in one
mode for its whole life: once it has initialized, calling the
other mode's initializer fails, so create a new
`<sv-presenter>` to switch.

|  | Catalog mode | Direct mode |
| --- | --- | --- |
| Assets | Avatar, scene and motions hosted by Perxona, chosen by ID | Your own files: a VRM avatar, an image scene, VRMA motions |
| Initialize | `initializeWithConnectKey` | `initializeDirectWithBlobs` |
| Present | `present` / `presentWithAudio` / `playMotion`. `presentDirect` also works here, with motions you supply (see [Example: Gemini Live](https://connect.perxona.ai/#gemini-live-example)). | `presentDirect`, together with the Connect API's [`/motion-suggestion`](https://connect.perxona.ai/#api-reference). `presentDirect` also works on a Catalog element. |
| Speech | Perxona TTS, or your own audio | Your own audio |

### Catalog Mode Flow

```js
// Your backend serves the publishable key. It never serves the secret one.
const getConnectKeyFromYourBackend = async () => {
  const response = await fetch('/your-backend/connect-key');
  return response.json();
};

// Listen for state changes before launching the component.
presenter.addEventListener('PRESENTER_STATUS', (e) => {
  // e.detail.status: 'Uninitialized' | 'Initializing' | 'Ready' | 'Failed'
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

### Direct Mode Flow

Direct mode boots from files you already hold and never looks
anything up for you, so each line is presented with
`presentDirect`: your own audio, plus the motion
marks and motion assets that the Connect API's
[`/motion-suggestion`](https://connect.perxona.ai/#api-reference)
returns for that line.

```js
// The avatar's body; /motion-suggestion needs the same values to pick motions for it.
const GENDER = 'female'; // 'male' | 'female'
const HEADS_TALL = 6; // 3 | 6 | 8 heads tall

launchButton.addEventListener('click', async () => {
  // Must run inside a direct user gesture to unlock autoplay.
  await presenter.resumeAudioPlayback();

  // Subscribe before initializing; loading has no deadline, so show progress.
  presenter.addEventListener('ASSET_LOADING_PROGRESS', (e) => {
    showProgress(e.detail.assetType, e.detail.progress); // 0 to 1 per asset type
  });

  // Files picked by the user or fetched by your app, e.g. from <input type="file">.
  const result = await presenter.initializeDirectWithBlobs({
    avatar: vrmFile, // VRM 1.0
    gender: GENDER,
    headsTall: HEADS_TALL,
    scene: backgroundImage, // optional; omit it for a transparent background
    // VRMA clips per state; an empty idle or talking state uses built-in motions.
    motions: {
      idle: [idleVrma],
      listening: [listeningVrma],
    },
  });
  if (!result.success) console.warn(result.code, result.message);
});

// Map a /motion-suggestion response onto the payload presentDirect() takes.
const ASSET_TYPE_TO_DIRECT_MOTION_TYPE = { motion: 'body', facial_motion: 'face' };
const toDirectPresentation = (text, suggestion, audio) => ({
  audio, // a complete WAV or MP3 file, not raw PCM
  displayText: text, // reported by PLAYING_SPEECH_TEXT
  presentationScript: suggestion.markup, // its [MOTION] marks time each motion
  motions: Object.entries(suggestion.performance_manifest)
    // Skip entries without a URL and entries that are not motions.
    .filter(([, entry]) => entry.lod0 && ASSET_TYPE_TO_DIRECT_MOTION_TYPE[entry.type])
    .map(([id, entry]) => ({
      id,
      type: ASSET_TYPE_TO_DIRECT_MOTION_TYPE[entry.type],
      assetUrl: entry.lod0,
      // configs is grouped by asset type; a motion's own config is configs.motion.
      runtimeConfig: entry.configs?.motion ?? null,
    })),
});

const speak = async (text) => {
  // Your own calls: the Connect API's /motion-suggestion, and your TTS.
  // From the browser, call /motion-suggestion with the publishable key only;
  // the secret key stays on your server.
  // Neither depends on the other, so run them in parallel.
  const [suggestion, audio] = await Promise.all([
    getMotionSuggestion({ text, gender: GENDER, heads_tall: HEADS_TALL }),
    synthesizeWithYourTts(text),
  ]);

  // Resolves once queued, not once played, and never rejects.
  const payload = toDirectPresentation(text, suggestion, audio);
  const result = await presenter.presentDirect(payload);
  if (!result.success) console.warn(result.code, result.message);
};
```

### Example: Gemini Live

`presentDirect` works in both Catalog and Direct mode
and does not depend on the Connect API for its motions: you hand
it a line's audio, its text with motion marks, and the motion
assets. Take them from `/motion-suggestion`, from
[`POST /presentation`](https://connect.perxona.ai/#api-reference)
without `voice_id` (BYO TTS mode, for a Catalog
avatar), or generate them yourself, and decide how to split the
speech into lines and when to queue each one. Calls play in the
order you make them.

This example drives a Catalog avatar from the
[Gemini Live API](https://ai.google.dev/gemini-api/docs/live). Its native-audio models stream raw 16-bit PCM at 24 kHz and,
with `outputAudioTranscription` enabled, the text of
what they say. The example cuts a line at the first pause after
each sentence end in that text, requests its motions at once,
and queues it.

- `presentDirect` takes a complete WAV or MP3 file,
  not raw PCM, so each line's PCM gets a WAV header first.
- The transcription runs a few tenths of a second ahead of its
  audio, so a line is cut at the first pause (150 ms of silence)
  after its sentence ends, not the moment the sentence end
  arrives.
- Your Gemini API key must not reach the browser: connect with
  an
  [ephemeral token](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
  or through your server.
- For a Direct avatar, request the motions from
  `/motion-suggestion` as in the Direct Mode Flow
  above.

```js
// Catalog avatar: motions from POST /presentation without voice_id (BYO TTS mode).
// Call it from the browser with the publishable key, as with /motion-suggestion, or
// from your server with the secret key. Each call is one billed motion request.
// toDirectPresentation is the mapper in the Direct Mode Flow above; getPresentation
// (your POST /presentation call), base64ToArrayBuffer and pcm16ToWav are your own.
// Give getPresentation a timeout (for example AbortSignal.timeout on its fetch):
// lines play in order, so a slow reply holds up every line after it.
const SENTENCE_END = /[.!?。！？]\s*$/; // the simplest test; an abbreviation only adds a cut
const QUIET_RMS = 400; // 16-bit PCM quieter than this counts as silence
const PAUSE_SAMPLES = 24000 * 0.15; // 150 ms of silence at 24 kHz is a pause
// The transcription puts spaces between Chinese or Japanese words; drop them.
const CJK_SPACE = /(?<=[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef])\s+(?=[\u3000-\u30ff\u3400-\u9fff\uff00-\uffef])/g;
let lineText = '';
let textAfterSentenceEnd = ''; // arrives after a sentence end but before its pause
let linePcm = [];
let sentenceEnded = false;
let spoke = false; // the line's PCM has sound in it, not only the previous pause
let quietSamples = 0; // length of the silence at the end of the PCM so far
let interruptionCount = 0; // lines queued before the latest interruption are dropped
let enqueueChain = Promise.resolve(); // settles once each line is queued, not played

const isQuiet = (samples) =>
  Math.sqrt(samples.reduce((sum, x) => sum + x * x, 0) / (samples.length || 1)) < QUIET_RMS;

// Start collecting the next line from the given text.
const startLine = (text) => {
  [lineText, textAfterSentenceEnd, linePcm, spoke] = [text, '', [], false];
  sentenceEnded = SENTENCE_END.test(lineText); // carried-over text may end a sentence
};

// Queue the line collected so far. Its motion request starts now; presentDirect
// runs after the previous line's call, so lines play in order.
const queueLine = () => {
  const text = lineText.replace(CJK_SPACE, '').trim();
  const pcm = linePcm;
  const interruptionCountAtQueue = interruptionCount;
  startLine(textAfterSentenceEnd);
  if (!text) return;
  const audio = pcm16ToWav(pcm, 24000); // join the PCM and add a WAV header
  const suggestion = getPresentation({ avatar_id: selectedAvatarId, message: text }).then(
    (response) => ({ markup: response.presentation, performance_manifest: response.performance_manifest }),
    () => ({ markup: text, performance_manifest: {} }) // no motions, but the line still plays
  );
  enqueueChain = enqueueChain
    .then(async () => {
      const motions = await suggestion;
      if (interruptionCountAtQueue !== interruptionCount) return; // interrupted while it waited
      const result = await presenter.presentDirect(toDirectPresentation(text, motions, audio));
      if (!result.success) console.warn(result.code, result.message);
    })
    .catch((error) => console.warn(error)); // a failed line must not stop the ones after it
};

// Messages of a Gemini Live session opened with responseModalities: [Modality.AUDIO]
// and outputAudioTranscription: {}. The transcription runs a little ahead of its
// audio, so a line is cut at the first pause after its sentence ends.
const onGeminiMessage = ({ serverContent: content }) => {
  if (!content) return;
  if (content.interrupted) {
    interruptionCount += 1;
    startLine('');
    presenter.interruptPresentation();
    return;
  }
  const piece = content.outputTranscription?.text ?? '';
  if (sentenceEnded) textAfterSentenceEnd += piece;
  else {
    lineText += piece;
    sentenceEnded = SENTENCE_END.test(lineText);
  }
  for (const part of content.modelTurn?.parts ?? []) {
    if (!part.inlineData?.data) continue;
    const pcm = base64ToArrayBuffer(part.inlineData.data);
    const quiet = isQuiet(new Int16Array(pcm));
    quietSamples = quiet ? quietSamples + pcm.byteLength / 2 : 0;
    spoke ||= !quiet;
    linePcm.push(pcm);
    if (sentenceEnded && spoke && quietSamples >= PAUSE_SAMPLES) queueLine();
  }
  if (content.generationComplete) {
    lineText += textAfterSentenceEnd; // no pause came after the last sentence end
    textAfterSentenceEnd = '';
    queueLine();
  }
};
```

### API Members

#### Catalog Mode

| Member | Description |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | Boot the presenter. Resolves `target` (avatarId/sceneId/voiceId) against the Connect API and mints a speech token. Returns a Promise — awaiting it means the presenter is ready. Rejects if the element was already initialized with `initializeDirectWithBlobs`; create a new element instead. Add `personalityTrait` to `target` to choose the personality the avatar plays; see [Personality trait](https://connect.perxona.ai/#personality-trait). |
| `present(content, options?)` | Synthesize `content` into speech and play it on the avatar. `options.emotion` and `options.intensity` set the line's tone, which picks its facial expression. Returns `PresentationResult { success: boolean, code: string, message?: string }`. **Never rejects** — always check `result.success`. |
| `presentWithAudio(audio, content, options?)` | Play caller-supplied audio on the avatar, bypassing Perxona TTS. Pass an `ArrayBuffer` from any TTS service or pre-recorded clip. The Motion Director still runs — gestures and expressions are driven by `content`. `options.emotion` and `options.intensity` set the line's tone, which picks its facial expression, as in `present`. Returns `PresentationResult`. **Never rejects.** |
| `playMotion(motionId)` | Play one body motion by ID, outside the speech queue. Resolves once the motion is sent to the avatar, not when it finishes; concurrent calls do not keep their order, so await each one when order matters. Returns `PresentationResult`. **Never rejects.** |

#### Direct Mode

| Member | Description |
| --- | --- |
| `initializeDirectWithBlobs(config)` | Boot the presenter from files you supply as `Blob`s. `config`:  - `avatar`: a VRM 1.0 file. - `gender`: `'male'` |   `'female'`. - `headsTall`: `3` |   `6` | `8` (heads tall). - `scene` (optional): an image drawn behind   the avatar; leave it out for a transparent   background. - `motions`: VRMA clips keyed by state —   `idle`, `talking`,   `listening` (played by   `setListening(true)`),   `loading` (played by   `setThinking(true)`). An empty   `idle` or `talking` is filled   with built-in motions matched to   `gender` and `headsTall`; an   empty `listening` or   `loading` plays nothing. The type also   accepts `error`, which is reserved: the   presenter does not play it yet.  Resolves with `PresentationResult` once the assets are loaded. There is no loading deadline, so show progress from `ASSET_LOADING_PROGRESS`. `INITIALIZATION_CONFLICT` means the element was already initialized, in either mode; create a new element to retry. A file that fails to load is not reported as a failure: the presenter may reach ready without it, or this call may stay pending. Rejects only when this presenter version cannot load from `Blob`s. |
| `presentDirect(payload)` | Play your own audio with motions you have already resolved, usually from the Connect API's `/motion-suggestion`. `payload`:  - `audio`: an   `ArrayBuffer` holding a complete WAV or   MP3 file, not raw PCM. - `displayText`: the text to show; reported   by `PLAYING_SPEECH_TEXT`. - `presentationScript`: the text with   `[MOTION id:priority]` marks that time   each motion. - `motions`:   `{ id, type: 'body' | 'face', assetUrl,   runtimeConfig }[]`, the assets the marks refer to.  Calls share one queue and play in call order. Resolves with `PresentationResult` once queued, not once played. **Never rejects.** |

#### Both Modes

| Member | Description |
| --- | --- |
| `resumeAudioPlayback()` | Unlock browser autoplay policy. **Must be called from a direct user gesture.** Returns a Promise. Call this in your click handler before initializing; until it has run once, `present`, `presentWithAudio` and `presentDirect` fail with `AUDIO_CONTEXT_UNAVAILABLE`. |
| `interruptPresentation()` | Stop the current performance and clear the queue immediately. |
| `setListening(isListening)` | Pass `true` to have the avatar act as if listening — for example, while the user speaks — and `false` to stop. |
| `setThinking(isThinking)` | Pass `true` to have the avatar act as if thinking — for example, while your app waits for a reply — and `false` to stop. |
| `muteAudio(muted)` | Mute or unmute the speech audio. |
| `updateCameraAngle(angle)` | Frame the avatar `'fullbody'` or `'halfbody'`. |
| `updateCameraFOV(offsets)` | Fine-tune the framing from `updateCameraAngle` by moving the camera. Each value is a step from −10 to +10; 0 keeps the framing as it is.  - `distance`: positive pulls the camera   back, negative moves it closer. - `horizontal`: positive moves the camera   right, negative left. - `vertical`: positive raises the camera,   negative lowers it.  Example: `presenter.updateCameraFOV({ distance: -3, horizontal: 0, vertical: 2 })`. Calling `updateCameraAngle` resets all three to 0. |
| `setCameraOrbit(orbit | null)` | Place the camera freely around the avatar, overriding `updateCameraAngle` and `updateCameraFOV`. Pass `null` to return to the default framing; a later `updateCameraAngle` or `updateCameraFOV` call does the same. `orbit`:  - `target` (required): what the camera   circles — a bone such as   `{ bone: 'head' }`, which the camera   keeps following as the avatar moves, or a fixed   point `{ point: [x, y, z] }` in metres,   with the avatar at the origin facing +Z. - `distance`, `yaw`,   `pitch`: how far from the target, in   metres, and the angle around and above it, in   degrees. - `lookAt`: what the camera faces, given   like `target`; defaults to   `target`. - `screenOffset`, `fov`,   `roll`: optional fine-tuning of the shot.  Bone names are VRM humanoid bone names, such as `hips`, `head` or `leftHand`. Example: `presenter.setCameraOrbit({ target: { bone: 'head' }, distance: 0.8, yaw: 30 })`. |
| `getCameraOrbit()` | The current orbit, or `null` when the camera is on the default framing. Read it to adjust the shot from where it is, such as turning `yaw` a little further. |
| `getBoneTransform(bone)` | A bone's current position, `{ position: [x, y, z] }`, in the same coordinates as `setCameraOrbit` — for example, to aim the camera at the midpoint between both hands. Returns `null` if the avatar is not loaded yet or has no such bone. To keep the camera on a bone, pass the bone to `setCameraOrbit` instead of reading its position every frame. |
| `setExpressionWeight(name, weight)` | Sets how strongly an expression shows, from 0 (off) to 1 (full). Use a VRM preset name such as `happy`, `sad`, `aa` or `blink`, or any other expression the avatar has.  Once any expression is above 0, you control the whole face and its animation no longer moves it. Set everything back to 0 and the animation takes over again. Blinking is the exception: the avatar keeps blinking as usual until you set a blink yourself.  Lip sync still plays on top while the avatar speaks. The eyes work the same way: setting `lookUp`, `lookDown`, `lookLeft` or `lookRight` sets where the avatar looks, but the avatar mostly looks at the camera, so your gaze shows only some of the time. Changing the avatar clears every weight. Example: `presenter.setExpressionWeight('happy', 0.8)` |
| `getExpressionWeight(name)` | Returns the weight you last set for this expression, or 0 if you haven't set it. This is your setting, not necessarily what the face shows right now (while the avatar speaks, for example). Returns `null` if the presenter isn't ready yet or the avatar doesn't have this expression. |
| `resetExpressionWeights()` | Sets every expression back to 0 and returns the face to its animation. |

#### Events

| Member | Description |
| --- | --- |
| event `PRESENTER_STATUS` | Fired as state changes. `e.detail.status`: `"Uninitialized"` → `"Initializing"` → `"Ready"`, or `"Failed"` when the stage cannot come up, with the reason in `e.detail.message`. Call `initializeWithConnectKey` again to retry. |
| event `ASSET_LOADING_PROGRESS` | Fired while assets load. `e.detail.assetType`: `"Avatar"` | `"Motion"` | `"Scene"`; `e.detail.progress`: how far that asset type has loaded, from 0 to 1. Subscribe before calling `initialize*`. |
| event `AUDIO_PLAYBACK_STATE` | Fired when the audio context changes state. `e.detail.state`: `"suspended"` | `"running"` | `"closed"`. |
| event `PERFORMANCE_STATE` | Fired when the avatar's visible state changes. `e.detail.state`: `"Idle"` | `"Listening"` | `"Thinking"` | `"Talking"`. |
| event `PERFORMANCE_START` / `PERFORMANCE_END` | Fired as each queued line starts and stops playing. |
| event `ALL_PERFORMANCE_FINISHED` | Fired once the whole queue has drained, not once per line. |
| event `PLAYING_SPEECH_TEXT` | Fired when a line starts playing. `e.detail.text`: the text being spoken, for subtitles or a chat bubble — in Direct mode, the `displayText` you passed. |
| event `CONNECT_KEY_REJECTED` | **Catalog mode only.** Fired when the Connect API refuses the key: revoked, expired, restricted to other domains, or never granted the scope. **There is nothing to retry** — the same key fails the same way. Reissue it in the console, then initialize again. |

### Transparent Background

When the scene you initialize with carries the
`background:transparent` tag, the presenter renders
the 3D view on a transparent canvas and your page shows through
behind the avatar; a scene without the tag renders its own
built-in background instead, and nothing shows through.

In Catalog mode the scene decides it: there is no method and no
attribute that switches transparency on, so whether you get it
follows from which `sceneId` you pass to
`initializeWithConnectKey`. Both
`/assets/scenes` and
`/assets/scenes/{scene_id}` return each scene's
`tags`, so your picker can tell which scenes are
transparent. When you pick one of those, whatever should show
behind the avatar belongs on the element's own container — the
presenter paints no background of its own.

In Direct mode, `initializeDirectWithBlobs` decides
it by its `scene`: pass an image and it is drawn
behind the avatar; leave `scene` out and the
background is transparent.
