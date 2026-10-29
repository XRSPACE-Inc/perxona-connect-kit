## Presenter コンポーネントリファレンス

`<sv-presenter>` は Connect Avatar
のブラウザ実行時 コンポーネントです。承認済みの Presenter module
を読み込み、要素を DOM に追加してから JavaScript API
で操作します。コンポーネントは publishable な Connect API
キーと選択した asset ID を受け取り、それらをどう提供するかは
あなたのアプリケーションバックエンドが担います。

### コンポーネントを読み込む

サーバーまたは Perxona
が提供する信頼済みアプリケーション設定から
`PRESENTER_URL` を読み、module script として一度だけ
注入します。この URL は認証情報ではありません。

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

### 完全な初期化フロー

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

### API メンバー

| Member | 説明 |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | Presenter を起動します。`target`（avatarId/sceneId/voiceId）を Connect API に解決してスピーチトークンを発行します。Promise を返します——await 後に Presenter が準備完了となります。 |
| `resumeAudioPlayback()` | ブラウザの自動再生ポリシーをアンロックします。**直接のユーザージェスチャーから呼び出す必要があります。**Promise を返します。クリックハンドラー内で `initializeWithConnectKey()` の前に呼び出してください。 |
| `present(content)` | `content` を音声に合成してアバターで再生します。`PresentationResult { success: boolean, code: string, message?: string }` を返します。**reject しません**——常に `result.success` を確認してください。 |
| `presentWithAudio(audio, content)` | Perxona TTS を使わず、独自音声をアバターで直接再生します。任意の TTS または録音済み音声の `ArrayBuffer` を渡してください。Motion Director は `content` に基づき動きと表情を自動生成します。`PresentationResult` を返します。**reject しません。** |
| `interruptPresentation()` | 現在のパフォーマンスを停止してキューを即座にクリアします。 |
| event `PRESENTER_STATUS` | 状態変化時に発行されます。`e.detail.status`：`"Uninitialized"` → `"Initializing"` → `"Ready"`。 |
| event `CONNECT_KEY_REJECTED` | Connect API が鍵を拒否した時に発行されます：失効済み、期限切れ、他ドメインに限定、またはそのスコープが付与されていない。**リトライできるものはありません**——同じ鍵は同じように失敗します。コンソールで再発行してから、もう一度初期化してください。 |

### 透明背景

初期化に使う scene に
`background:transparent`
タグが付いている場合、Presenter は 3D
ビューを透明なキャンバスに描画するので、アバターの背後にページが透けて見えます。タグが付いていない
scene では、その scene
自身の背景が描画され、ページは透けません。

決めるのは scene
です。透明背景を有効にするメソッドや属性は存在しないため、透明にするかどうかは、どの
`sceneId` を
`initializeWithConnectKey`
に渡すかで決まります。`/assets/scenes` と
`/assets/scenes/{scene_id}` はどちらも各 scene の
`tags` を返すので、どの scene
が透明背景かはピッカー側で判別できます。その scene
を選んだときにアバターの背後に表示したいものは、要素自身のコンテナに配置してください——Presenter
自身は背景を一切描画しません。
