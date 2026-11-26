## Presenter 元件參考

`<sv-presenter>` 是 Connect Avatar
的瀏覽器端執行期。 載入核准的 Presenter module、將元素加入
DOM，然後透過其 JavaScript API 操作。元件有兩種啟動方式：Catalog
mode 以 ID 載入你從 Perxona catalog 選定的 avatar 與
scene；Direct mode 則載入你自己提供的 avatar、scene
與動作檔案——見[兩種初始化方式](https://connect.perxona.ai/#presenter-modes)。

### 載入元件

從伺服器或 Perxona 提供的可信任應用程式設定讀取
`PRESENTER_URL`，然後僅注入一次 module script。這個
URL 不是憑證，但 module
會以頁面的完整權限執行，所以注入前先確認它的 host 是 Perxona 的
CDN。

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

### 舊版 Presenter（Legacy）

Connect Kit 1.0 以前的整合從 `prod/latest/` 載入
Presenter。這個舊版 Presenter
會持續收到更新，直到停止提供。停止提供預計在 2026
年底、內建角色可在目前的 Presenter
使用之後，確切日期另行公告。新的整合請用
`prod/connect/latest/`。

- `https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js`

舊版 Presenter 自己的請求已經會帶
`X-Legacy-Presenter: 1`。若你的伺服器自行呼叫 Connect
API（catalog、`/presentation` 或
`/motion-suggestion`），也要帶上同一個
header，回應才會使用舊版 Presenter 能載入的資產。

### 兩種初始化方式

依你的資產放在哪裡來選模式。一個元素從頭到尾只會處在一種模式：初始化完成後，再呼叫另一種模式的初始化方法會失敗，要切換就建立新的
`<sv-presenter>`。

|  | Catalog mode | Direct mode |
| --- | --- | --- |
| 資產來源 | 由 Perxona 託管的 avatar、scene 與動作，以 ID 指定 | 你自己的檔案：VRM avatar、圖片 scene、VRMA 動作 |
| 初始化 | `initializeWithConnectKey` | `initializeDirectWithBlobs` |
| 表演 | `present` / `presentWithAudio` / `playMotion`。也能用 `presentDirect`，搭配你提供的動作（見 [範例：整合 Gemini Live](https://connect.perxona.ai/#gemini-live-example)）。 | `presentDirect`，搭配 Connect API 的 [`/motion-suggestion`](https://connect.perxona.ai/#api-reference)。Catalog 元素也能用 `presentDirect`。 |
| 語音 | Perxona TTS，或自備音訊 | 自備音訊 |

### Catalog mode 流程

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

### Direct mode 流程

Direct mode
從你手上的檔案啟動，不會替你查詢任何東西，所以每一句都用
`presentDirect` 表演：你自己的音訊，加上 Connect API
的
[`/motion-suggestion`](https://connect.perxona.ai/#api-reference)
為這句話回傳的動作標記與動作 asset。

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

### 範例：整合 Gemini Live

`presentDirect` 在 Catalog 與 Direct mode
都能用，動作也不必經由 Connect
API：你交給它一句話的音訊、帶動作標記的文字和動作
asset。這些可以來自 `/motion-suggestion`、不帶
`voice_id` 的
[`POST /presentation`](https://connect.perxona.ai/#api-reference)（BYO TTS mode，用於 Catalog
avatar），也可以自己產生；要怎麼把語音切成一句一句、什麼時候送進佇列，都由你決定。呼叫的順序就是播放的順序。

這個範例用
[Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
驅動 Catalog avatar。它的 native audio 模型串流 24 kHz、16-bit
的 raw PCM；開啟 `outputAudioTranscription`
後，也會串流所說內容的文字。範例在文字出現句尾之後的第一個停頓切出一句，立刻請求這句的動作並送進佇列。

- `presentDirect` 需要完整的 WAV 或 MP3 檔，不能是
  raw PCM，所以每句的 PCM 要先加上 WAV header。
- 轉錄文字會比對應的音訊早零點幾秒送達，所以範例在句尾之後的第一個停頓（150
  ms 的靜音）才切出一句，而不是一收到句尾就切。
- Gemini API key 不能進到瀏覽器：請用
  [ephemeral token](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
  連線，或經由你的伺服器轉送。
- Direct avatar 則照上面的 Direct mode 流程，從
  `/motion-suggestion` 請求動作。

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

### API 成員

#### Catalog mode

| Member | 說明 |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | 啟動 presenter。將 `target`（avatarId/sceneId/voiceId）解析至 Connect API 並發放語音 token。回傳 Promise——await 後表示 presenter 已就緒。元素已用 `initializeDirectWithBlobs` 初始化過時會 reject，請改建立新元素。在 `target` 加上 `personalityTrait` 可指定 avatar 演出的個性特質，見[個性特質](https://connect.perxona.ai/#personality-trait)。 |
| `present(content, options?)` | 將 `content` 合成為語音並在 avatar 上播放。`options.emotion` 與 `options.intensity` 設定這句話的語氣，並據此挑選臉部表情。回傳 `PresentationResult { success: boolean, code: string, message?: string }`。**永不 reject**——始終檢查 `result.success`。 |
| `presentWithAudio(audio, content, options?)` | 直接在 Avatar 上播放自訂音訊，略過 Perxona TTS。傳入任何 TTS 服務或預錄音檔的 `ArrayBuffer`。Motion Director 仍根據 `content` 驅動肢體動作與表情。與 `present` 相同，`options.emotion` 與 `options.intensity` 設定這句話的語氣，並據此挑選表情。回傳 `PresentationResult`。**永不 reject。** |
| `playMotion(motionId)` | 以 ID 播放一個肢體動作，不經過語音佇列。動作送到 avatar 時就 resolve，不等它播完；同時發出的多個呼叫不保證順序，順序重要時請逐一 await。回傳 `PresentationResult`。**永不 reject。** |

#### Direct mode

| Member | 說明 |
| --- | --- |
| `initializeDirectWithBlobs(config)` | 以你提供的 `Blob` 檔案啟動 presenter。`config`：  - `avatar`：VRM 1.0 檔案。 - `gender`：`'male'` |   `'female'`。 - `headsTall`：`3` |   `6` | `8`（頭身）。 - `scene`（選填）：畫在 avatar   背後的圖片；不傳就是透明背景。 - `motions`：依狀態分組的 VRMA   動作——`idle`、`talking`、`listening`（由   `setListening(true)`   播放）、`loading`（由   `setThinking(true)` 播放）。`idle`   或 `talking` 沒給時，會依   `gender` 與   `headsTall` 補上內建動作；`listening`   或 `loading` 沒給就沒有動作。型別也接受   `error`，但這是保留欄位，presenter   目前不會播放。  資產載入完成後 resolve 為 `PresentationResult`。載入沒有時限，請用 `ASSET_LOADING_PROGRESS` 顯示進度。`INITIALIZATION_CONFLICT` 表示這個元素已經初始化過（任一模式），要重試請建立新元素。檔案載入失敗不會回報為失敗：presenter 可能少了該檔案仍進入就緒，也可能讓這個呼叫一直停在 pending。只有在這個 presenter 版本無法從 `Blob` 載入時才會 reject。 |
| `presentDirect(payload)` | 用你已經取得的動作播放你自己的音訊，動作通常來自 Connect API 的 `/motion-suggestion`。`payload`：  - `audio`：裝著完整 WAV 或 MP3 檔案的   `ArrayBuffer`，不是 raw PCM。 - `displayText`：要顯示的文字，由   `PLAYING_SPEECH_TEXT` 回報。 - `presentationScript`：帶   `[MOTION id:priority]`   標記的文字，標記決定每個動作的時間點。 - `motions`：`{ id, type: 'body' | 'face', assetUrl,   runtimeConfig }[]`，標記所指的動作 asset。  所有呼叫共用一條佇列，依呼叫順序播放。排入佇列後就 resolve 為 `PresentationResult`，不等播完。**永不 reject。** |

#### 兩種模式共用

| Member | 說明 |
| --- | --- |
| `resumeAudioPlayback()` | 解鎖瀏覽器自動播放限制。**必須從直接的使用者手勢呼叫。**回傳 Promise。在點擊處理器中於初始化之前呼叫；在它執行過一次之前，`present`、`presentWithAudio` 與 `presentDirect` 會以 `AUDIO_CONTEXT_UNAVAILABLE` 失敗。 |
| `interruptPresentation()` | 立即停止當前演出並清空佇列。 |
| `setListening(isListening)` | 傳入 `true` 讓 avatar 表演聆聽——例如使用者正在說話時；傳入 `false` 即停止。 |
| `setThinking(isThinking)` | 傳入 `true` 讓 avatar 表演思考——例如你的應用程式在等待回覆時；傳入 `false` 即停止。 |
| `muteAudio(muted)` | 將語音靜音或取消靜音。 |
| `updateCameraAngle(angle)` | 將鏡頭設為 `'fullbody'`（全身）或 `'halfbody'`（半身）。 |
| `updateCameraFOV(offsets)` | 移動鏡頭，微調 `updateCameraAngle` 的取景。每個值是 −10 到 +10 的級數，0 表示維持原本的取景。  - `distance`：正值讓鏡頭往後拉遠，負值往前靠近。 - `horizontal`：正值讓鏡頭往右移，負值往左。 - `vertical`：正值讓鏡頭升高，負值降低。  範例：`presenter.updateCameraFOV({ distance: -3, horizontal: 0, vertical: 2 })`。呼叫 `updateCameraAngle` 會把三個值都重設為 0。 |
| `setCameraOrbit(orbit | null)` | 自由擺放 avatar 周圍的鏡頭，取代 `updateCameraAngle` 與 `updateCameraFOV` 的取景。傳入 `null` 即回到預設取景；之後再呼叫 `updateCameraAngle` 或 `updateCameraFOV` 也會解除 orbit、回到預設取景。`orbit`：  - `target`（必填）：鏡頭環繞的對象——可以是骨頭，例如   `{ bone: 'head' }`，鏡頭會隨 avatar   的動作持續跟著它；也可以是固定點   `{ point: [x, y, z] }`，單位為公尺，avatar 位於原點、面向 +Z。 - `distance`、`yaw`、`pitch`：與目標的距離（公尺），以及繞目標、高於目標的角度（度）。 - `lookAt`：鏡頭朝向的對象，寫法與   `target` 相同，預設為   `target`。 - `screenOffset`、`fov`、`roll`：選填，用來微調畫面。  骨頭名稱使用 VRM humanoid 的命名，例如 `hips`、`head`、`leftHand`。範例：`presenter.setCameraOrbit({ target: { bone: 'head' }, distance: 0.8, yaw: 30 })`。 |
| `getCameraOrbit()` | 目前的 orbit；鏡頭在預設取景時回傳 `null`。可以讀出來再微調，例如把 `yaw` 再轉一點。 |
| `getBoneTransform(bone)` | 骨頭目前的位置 `{ position: [x, y, z] }`，座標系與 `setCameraOrbit` 相同——例如要讓鏡頭對準兩手之間的中點時使用。avatar 尚未載入或沒有這根骨頭時回傳 `null`。若要讓鏡頭跟著骨頭，請把骨頭直接傳給 `setCameraOrbit`，不要每一幀讀位置再設定。 |
| `setExpressionWeight(name, weight)` | 設定表情的強度，0 是不顯示，1 是完全顯示。名稱可以用 VRM 的 preset，例如 `happy`、`sad`、`aa`、`blink`，也可以用 avatar 本身的其他表情。  只要有一個表情大於 0，整張臉就由你控制，動畫不會再帶動臉部；全部設回 0，臉部就回到動畫。眨眼例外：在你自己設定眨眼之前，avatar 會照常眨眼。  avatar 說話時，對嘴仍會疊在上面。視線也是一樣：設定 `lookUp`、`lookDown`、`lookLeft`、`lookRight` 可以設定眼睛看的方向，但 avatar 的視線主要會看向鏡頭，所以你設定的視線不一定看得出來。換 avatar 時，所有設定都會清除。 範例：`presenter.setExpressionWeight('happy', 0.8)` |
| `getExpressionWeight(name)` | 回傳你最後一次為這個表情設定的值，沒設定過就是 0。這是你設定的值，不一定是臉上現在的樣子（例如說話時）。presenter 還沒準備好，或 avatar 沒有這個表情時，回傳 `null`。 |
| `resetExpressionWeights()` | 把所有表情設回 0，臉部回到動畫。 |

#### 事件

| Member | 說明 |
| --- | --- |
| event `PRESENTER_STATUS` | 狀態改變時觸發。`e.detail.status`：`"Uninitialized"` → `"Initializing"` → `"Ready"`；stage 無法啟動時為 `"Failed"`，原因在 `e.detail.message`。再次呼叫 `initializeWithConnectKey` 即可重試。 |
| event `ASSET_LOADING_PROGRESS` | 資產載入期間觸發。`e.detail.assetType`：`"Avatar"` | `"Motion"` | `"Scene"`；`e.detail.progress`：該類資產的載入進度，範圍 0 到 1。請在呼叫 `initialize*` 之前訂閱。 |
| event `AUDIO_PLAYBACK_STATE` | 音訊環境狀態改變時觸發。`e.detail.state`：`"suspended"` | `"running"` | `"closed"`。 |
| event `PERFORMANCE_STATE` | avatar 呈現的狀態改變時觸發。`e.detail.state`：`"Idle"` | `"Listening"` | `"Thinking"` | `"Talking"`。 |
| event `PERFORMANCE_START` / `PERFORMANCE_END` | 佇列中的每一句開始播放與結束時觸發。 |
| event `ALL_PERFORMANCE_FINISHED` | 整條佇列播完時觸發一次，不是每句各觸發一次。 |
| event `PLAYING_SPEECH_TEXT` | 一句話開始播放時觸發。`e.detail.text`：正在說的文字，可用於字幕或對話泡泡——Direct mode 下就是你傳入的 `displayText`。 |
| event `CONNECT_KEY_REJECTED` | **僅 Catalog mode。**當 Connect API 拒絕金鑰時觸發：已撤銷、已過期、限定了其他網域，或從未被授予該權限。**沒有東西可以重試**——同一把金鑰會以同樣方式失敗。請到 console 重新建立，再初始化一次。 |

### 透明背景

若你初始化時指定的 scene 帶有
`background:transparent` tag，presenter 會把 3D
視圖繪製在透明畫布上，讓你的頁面從 avatar 背後透出來；沒有這個
tag 的 scene 則會畫出場景本身自帶的背景，頁面就透不出來。

在 Catalog mode，決定權在
scene：沒有任何方法或屬性可以開啟透明背景，要不要透明，取決於你傳給
`initializeWithConnectKey` 的
`sceneId`。`/assets/scenes` 與
`/assets/scenes/{scene_id}` 都會回傳每個 scene 的
`tags`，所以你的選單可以據此分辨哪些 scene
是透明背景。選到這種 scene 時，想顯示在 avatar
背後的內容就放在元件本身所在的容器上——presenter
自己不會繪製任何背景。

在 Direct mode，則由 `initializeDirectWithBlobs` 的
`scene` 決定：傳入圖片就畫在 avatar 背後；不傳
`scene` 就是透明背景。
