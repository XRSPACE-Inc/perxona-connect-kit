## Presenter コンポーネントリファレンス

`<sv-presenter>` は Connect Avatar
のブラウザ実行時 コンポーネントです。承認済みの Presenter module
を読み込み、要素を DOM に追加してから JavaScript API
で操作します。起動方法は 2 つあります。Catalog mode は Perxona
catalog から選んだ avatar と scene を ID で読み込み、Direct mode
はあなた自身が用意した
avatar・scene・モーションのファイルを読み込みます——[2 つの初期化方法](https://connect.perxona.ai/#presenter-modes)を参照してください。

### コンポーネントを読み込む

サーバーまたは Perxona
が提供する信頼済みアプリケーション設定から
`PRESENTER_URL` を読み、module script として一度だけ
注入します。この URL は認証情報ではありませんが、module
はページの全権限で実行されるため、注入する前に host が Perxona
の CDN であることを確認してください。

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

### レガシー Presenter

Connect Kit 1.0 より前の統合は `prod/latest/` から
Presenter を読み込みます。このレガシー Presenter
は提供終了まで更新され続けます。提供終了は 2026
年末、組み込みのアバターが現行の Presenter
で利用できるようになった後を予定しており、正確な日付は別途お知らせします。新しい統合では
`prod/connect/latest/` を使ってください。

- `https://cdn.perxona.ai/asia/prod/latest/widget/entry/presenter.js`

レガシー Presenter は自身のリクエストにすでに
`X-Legacy-Presenter: 1`
を付けています。あなたのサーバーが自身で Connect
API（catalog、`/presentation`、`/motion-suggestion`）を呼び出す場合も、同じヘッダーを付けてください。そうすると、レガシー
Presenter が読み込めるアセットが返ります。

### 2 つの初期化方法

アセットがどこにあるかでモードを選びます。1 つの要素は最後まで 1
つのモードで動作します。初期化が完了した後にもう一方のモードの初期化メソッドを呼ぶと失敗するため、切り替えるには新しい
`<sv-presenter>` を作成してください。

|  | Catalog mode | Direct mode |
| --- | --- | --- |
| アセット | Perxona がホストする avatar・scene・モーションを ID で指定 | 自分のファイル：VRM avatar、画像 scene、VRMA モーション |
| 初期化 | `initializeWithConnectKey` | `initializeDirectWithBlobs` |
| パフォーマンス | `present` / `presentWithAudio` / `playMotion`。`presentDirect` も使え、モーションは自分で指定します（[例：Gemini Live との統合](https://connect.perxona.ai/#gemini-live-example)を参照）。 | `presentDirect`（Connect API の [`/motion-suggestion`](https://connect.perxona.ai/#api-reference) と組み合わせて使用）。`presentDirect` は Catalog の要素でも使えます。 |
| 音声 | Perxona TTS、または独自音声 | 独自音声 |

### Catalog mode のフロー

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

### Direct mode のフロー

Direct mode
は手元のファイルから起動し、何も代わりに問い合わせないため、各セリフは
`presentDirect`
で再生します。渡すのは独自の音声と、Connect API の
[`/motion-suggestion`](https://connect.perxona.ai/#api-reference)
がそのセリフに対して返すモーションマークとモーション asset
です。

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

### 例：Gemini Live との統合

`presentDirect` は Catalog と Direct mode
のどちらでも使え、モーションを Connect API
に頼る必要もありません。渡すのは 1
セリフ分の音声、モーションマーク付きのテキスト、モーション asset
です。これらは `/motion-suggestion`、`voice_id`
を付けない
[`POST /presentation`](https://connect.perxona.ai/#api-reference)（BYO TTS mode、Catalog
アバター向け）から取得しても、自分で生成してもかまいません。音声をどうセリフに区切り、いつキューに入れるかも自分で決められます。呼び出した順に再生されます。

この例では
[Gemini Live API](https://ai.google.dev/gemini-api/docs/live)
で Catalog アバターを動かします。native audio モデルは 24
kHz・16-bit の raw PCM をストリーミングし、`outputAudioTranscription`
を有効にすると発話内容のテキストもストリーミングします。例ではテキストの文末の後にある最初の無音で
1
セリフを切り出し、すぐにそのモーションをリクエストしてキューに入れます。

- `presentDirect` には完全な WAV または MP3
  ファイルが必要で、raw PCM は使えないため、各セリフの PCM に
  WAV ヘッダーを付けます。
- 文字起こしは対応する音声より
  0.数秒早く届くため、例では文末が届いた瞬間ではなく、その後の最初の無音（150
  ms）でセリフを区切ります。
- Gemini の API キーをブラウザに渡してはいけません。[ephemeral token](https://ai.google.dev/gemini-api/docs/ephemeral-tokens)
  で接続するか、サーバー経由で中継します。
- Direct アバターでは、上記 Direct mode のフローのとおり
  `/motion-suggestion`
  からモーションをリクエストします。

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

### API メンバー

#### Catalog mode

| Member | 説明 |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | Presenter を起動します。`target`（avatarId/sceneId/voiceId）を Connect API に解決してスピーチトークンを発行します。Promise を返します——await 後に Presenter が準備完了となります。要素がすでに `initializeDirectWithBlobs` で初期化済みの場合は reject します。新しい要素を作成してください。`target` に `personalityTrait` を加えると、avatar が演じる性格タイプを指定できます。[性格タイプ](https://connect.perxona.ai/#personality-trait) を参照してください。 |
| `present(content, options?)` | `content` を音声に合成してアバターで再生します。`options.emotion` と `options.intensity` はセリフのトーンを指定し、表情の選択に使われます。`PresentationResult { success: boolean, code: string, message?: string }` を返します。**reject しません**——常に `result.success` を確認してください。 |
| `presentWithAudio(audio, content, options?)` | Perxona TTS を使わず、独自音声をアバターで直接再生します。任意の TTS または録音済み音声の `ArrayBuffer` を渡してください。Motion Director は `content` に基づき動きと表情を自動生成します。`present` と同様に、`options.emotion` と `options.intensity` でセリフのトーンを設定し、それに応じて表情が選ばれます。`PresentationResult` を返します。**reject しません。** |
| `playMotion(motionId)` | ID を指定してボディモーションを 1 つ、スピーチのキューとは別に再生します。モーションがアバターに送られた時点で resolve し、再生完了は待ちません。同時に呼んだ場合は順序が保証されないため、順序が重要なら 1 つずつ await してください。`PresentationResult` を返します。**reject しません。** |

#### Direct mode

| Member | 説明 |
| --- | --- |
| `initializeDirectWithBlobs(config)` | あなたが `Blob` で渡すファイルから Presenter を起動します。`config`：  - `avatar`：VRM 1.0 ファイル。 - `gender`：`'male'` |   `'female'`。 - `headsTall`：`3` |   `6` | `8`（頭身）。 - `scene`（任意）：アバターの背後に描画する画像。省略すると背景は透明になります。 - `motions`：状態ごとの VRMA   モーション——`idle`、`talking`、`listening`（`setListening(true)`   で再生）、`loading`（`setThinking(true)`   で再生）。`idle` や   `talking` が空の場合は、`gender`   と   `headsTall`   に合った内蔵モーションで補われます。`listening`   や `loading`   が空の場合は何も再生されません。型は   `error`   も受け付けますが、これは予約済みで、Presenter   はまだ再生しません。  アセットの読み込みが終わると `PresentationResult` で resolve します。読み込みに期限はないため、進捗は `ASSET_LOADING_PROGRESS` で表示してください。`INITIALIZATION_CONFLICT` は要素がすでに（どちらかのモードで）初期化済みであることを示します。やり直すには新しい要素を作成してください。ファイルの読み込み失敗は失敗として報告されません：そのファイルが欠けたまま準備完了になるか、この呼び出しが pending のままになることがあります。reject するのは、この Presenter のバージョンが `Blob` から読み込めない場合のみです。 |
| `presentDirect(payload)` | 解決済みのモーションで独自音声を再生します。モーションは通常 Connect API の `/motion-suggestion` から取得します。`payload`：  - `audio`：完全な WAV または MP3   ファイルを入れた `ArrayBuffer`。raw PCM   ではありません。 - `displayText`：表示するテキスト。`PLAYING_SPEECH_TEXT`   で通知されます。 - `presentationScript`：各モーションのタイミングを決める   `[MOTION id:priority]`   マーク付きのテキスト。 - `motions`：`{ id, type: 'body' | 'face', assetUrl,   runtimeConfig }[]`。マークが指すモーション asset。  呼び出しは 1 つのキューを共有し、呼んだ順に再生されます。キューに入った時点で `PresentationResult` で resolve し、再生完了は待ちません。**reject しません。** |

#### 両モード共通

| Member | 説明 |
| --- | --- |
| `resumeAudioPlayback()` | ブラウザの自動再生ポリシーをアンロックします。**直接のユーザージェスチャーから呼び出す必要があります。**Promise を返します。クリックハンドラー内で初期化の前に呼び出してください。一度実行されるまで、`present`、`presentWithAudio`、`presentDirect` は `AUDIO_CONTEXT_UNAVAILABLE` で失敗します。 |
| `interruptPresentation()` | 現在のパフォーマンスを停止してキューを即座にクリアします。 |
| `setListening(isListening)` | `true` を渡すとアバターが聞いている様子を演じます（ユーザーが話している間など）。`false` で停止します。 |
| `setThinking(isThinking)` | `true` を渡すとアバターが考えている様子を演じます（アプリが返答を待っている間など）。`false` で停止します。 |
| `muteAudio(muted)` | 音声をミュート、またはミュート解除します。 |
| `updateCameraAngle(angle)` | カメラを `'fullbody'`（全身）または `'halfbody'`（半身）に設定します。 |
| `updateCameraFOV(offsets)` | カメラを動かして、`updateCameraAngle` のフレーミングを微調整します。各値は −10 から +10 の段階で、0 は元のフレーミングのままです。  - `distance`：正の値でカメラを後ろに引き、負の値で近づけます。 - `horizontal`：正の値でカメラを右へ、負の値で左へ動かします。 - `vertical`：正の値でカメラを上げ、負の値で下げます。  例：`presenter.updateCameraFOV({ distance: -3, horizontal: 0, vertical: 2 })`。`updateCameraAngle` を呼ぶと 3 つの値はすべて 0 に戻ります。 |
| `setCameraOrbit(orbit | null)` | アバターの周りにカメラを自由に配置し、`updateCameraAngle` と `updateCameraFOV` のフレーミングを上書きします。`null` を渡すとデフォルトのフレーミングに戻ります。その後に `updateCameraAngle` または `updateCameraFOV` を呼んだ場合も orbit は解除され、デフォルトのフレーミングに戻ります。`orbit`：  - `target`（必須）：カメラが周回する対象——`{ bone: 'head' }`   のようなボーン（アバターの動きに合わせて追従し続けます）、または固定点   `{ point: [x, y, z] }`（メートル単位、アバターは原点で +Z   を向いています）。 - `distance`、`yaw`、`pitch`：ターゲットからの距離（メートル）と、ターゲット周り・上方向の角度（度）。 - `lookAt`：カメラが向く対象。書き方は   `target` と同じで、デフォルトは   `target`。 - `screenOffset`、`fov`、`roll`：任意。ショットの微調整に使います。  ボーン名は VRM humanoid の名前を使います（`hips`、`head`、`leftHand` など）。例：`presenter.setCameraOrbit({ target: { bone: 'head' }, distance: 0.8, yaw: 30 })`。 |
| `getCameraOrbit()` | 現在の orbit を返します。カメラがデフォルトのフレーミングのときは `null`。今のショットを少し調整したいとき（`yaw` をもう少し回すなど）に読み取って使います。 |
| `getBoneTransform(bone)` | ボーンの現在位置 `{ position: [x, y, z] }` を返します。座標系は `setCameraOrbit` と同じです——両手の中間点にカメラを向けたいときなどに使います。アバターが未読み込み、またはそのボーンがない場合は `null`。カメラをボーンに追従させたいときは、毎フレーム位置を読むのではなく、ボーンを `setCameraOrbit` に直接渡してください。 |
| `setExpressionWeight(name, weight)` | 表情の強さを 0（表示しない）から 1（最大）で設定します。名前には `happy`、`sad`、`aa`、`blink` などの VRM プリセット名か、アバターが持つほかの表情名を使えます。  どれか 1 つでも 0 より大きくすると、顔全体があなたの設定どおりになり、アニメーションは顔を動かさなくなります。すべて 0 に戻すと、アニメーションに戻ります。ただしまばたきは別で、自分でまばたきを設定するまでは、いつもどおりまばたきします。  話している間は、その上に口パクが表示されます。視線も同じで、`lookUp`、`lookDown`、`lookLeft`、`lookRight` で目の向きを設定できますが、アバターの視線は主にカメラに向くため、設定した視線がいつも見えるとは限りません。アバターを変えると、設定はすべてクリアされます。 例：`presenter.setExpressionWeight('happy', 0.8)` |
| `getExpressionWeight(name)` | この表情に最後に設定した値を返します。設定していなければ 0 です。返るのは設定した値で、顔に今表示されている状態（話している間など）とは限りません。presenter の準備がまだの場合や、アバターにその表情がない場合は `null` を返します。 |
| `resetExpressionWeights()` | すべての表情を 0 に戻し、顔をアニメーションに戻します。 |

#### イベント

| Member | 説明 |
| --- | --- |
| event `PRESENTER_STATUS` | 状態変化時に発行されます。`e.detail.status`：`"Uninitialized"` → `"Initializing"` → `"Ready"`。ステージを起動できない場合は `"Failed"` となり、理由は `e.detail.message` に入ります。`initializeWithConnectKey` を再度呼び出すと再試行できます。 |
| event `ASSET_LOADING_PROGRESS` | アセットの読み込み中に発行されます。`e.detail.assetType`：`"Avatar"` | `"Motion"` | `"Scene"`、`e.detail.progress`：その種類のアセットの読み込み進捗（0〜1）。`initialize*` を呼ぶ前に購読してください。 |
| event `AUDIO_PLAYBACK_STATE` | オーディオコンテキストの状態が変わると発行されます。`e.detail.state`：`"suspended"` | `"running"` | `"closed"`。 |
| event `PERFORMANCE_STATE` | アバターの表示状態が変わると発行されます。`e.detail.state`：`"Idle"` | `"Listening"` | `"Thinking"` | `"Talking"`。 |
| event `PERFORMANCE_START` / `PERFORMANCE_END` | キュー内の各セリフの再生開始時と終了時に発行されます。 |
| event `ALL_PERFORMANCE_FINISHED` | キュー全体の再生が終わったときに 1 回だけ発行されます（セリフごとではありません）。 |
| event `PLAYING_SPEECH_TEXT` | セリフの再生開始時に発行されます。`e.detail.text`：話しているテキスト。字幕や吹き出しに使えます——Direct mode では渡した `displayText` です。 |
| event `CONNECT_KEY_REJECTED` | **Catalog mode のみ。**Connect API が鍵を拒否した時に発行されます：失効済み、期限切れ、他ドメインに限定、またはそのスコープが付与されていない。**リトライできるものはありません**——同じ鍵は同じように失敗します。コンソールで再発行してから、もう一度初期化してください。 |

### 透明背景

初期化に使う scene に
`background:transparent`
タグが付いている場合、Presenter は 3D
ビューを透明なキャンバスに描画するので、アバターの背後にページが透けて見えます。タグが付いていない
scene では、その scene
自身の背景が描画され、ページは透けません。

Catalog mode では、決めるのは scene
です。透明背景を有効にするメソッドや属性は存在しないため、透明にするかどうかは、どの
`sceneId` を
`initializeWithConnectKey`
に渡すかで決まります。`/assets/scenes` と
`/assets/scenes/{scene_id}` はどちらも各 scene の
`tags` を返すので、どの scene
が透明背景かはピッカー側で判別できます。その scene
を選んだときにアバターの背後に表示したいものは、要素自身のコンテナに配置してください——Presenter
自身は背景を一切描画しません。

Direct mode では `initializeDirectWithBlobs` の
`scene`
で決まります。画像を渡すとアバターの背後に描画され、`scene`
を省略すると背景は透明になります。
