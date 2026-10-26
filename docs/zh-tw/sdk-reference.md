## Presenter 元件參考

`<sv-presenter>` 是 Connect Avatar
的瀏覽器端執行期。 載入核准的 Presenter module、將元素加入
DOM，然後透過其 JavaScript API 操作。元件接收 publishable
Connect API 金鑰與選定 asset ID；這些值如何
由應用程式後端提供，則由你的架構決定。

### 載入元件

從伺服器或 Perxona 提供的可信任應用程式設定讀取
`PRESENTER_URL`，然後僅注入一次 module script。這個
URL 不是憑證。

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

### 完整初始化流程

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

### API 成員

| Member | 說明 |
| --- | --- |
| `initializeWithConnectKey(connectKey, target)` | 啟動 presenter。將 `target`（avatarId/sceneId/voiceId）解析至 Connect API 並發放語音 token。回傳 Promise——await 後表示 presenter 已就緒。 |
| `resumeAudioPlayback()` | 解鎖瀏覽器自動播放限制。**必須從直接的使用者手勢呼叫。**回傳 Promise。在點擊處理器中於 `initializeWithConnectKey()` 之前呼叫此函式。 |
| `present(content)` | 將 `content` 合成為語音並在 avatar 上播放。回傳 `PresentationResult { success: boolean, code: string, message?: string }`。**永不 reject**——始終檢查 `result.success`。 |
| `presentWithAudio(audio, content)` | 直接在 Avatar 上播放自訂音訊，略過 Perxona TTS。傳入任何 TTS 服務或預錄音檔的 `ArrayBuffer`。Motion Director 仍根據 `content` 驅動肢體動作與表情。回傳 `PresentationResult`。**永不 reject。** |
| `interruptPresentation()` | 立即停止當前演出並清空佇列。 |
| event `PRESENTER_STATUS` | 狀態改變時觸發。`e.detail.status`：`"Uninitialized"` → `"Initializing"` → `"Ready"`。 |
| event `CONNECT_KEY_REJECTED` | 當 Connect API 拒絕金鑰時觸發：已撤銷、已過期、限定了其他網域，或從未被授予該權限。**沒有東西可以重試**——同一把金鑰會以同樣方式失敗。請到 console 重新建立，再初始化一次。 |

### 透明背景

若你初始化時指定的 scene 帶有
`background:transparent` tag，presenter 會把 3D
視圖繪製在透明畫布上，讓你的頁面從 avatar 背後透出來；沒有這個
tag 的 scene 則會畫出場景本身自帶的背景，頁面就透不出來。

決定權在
scene：沒有任何方法或屬性可以開啟透明背景，要不要透明，取決於你傳給
`initializeWithConnectKey` 的
`sceneId`。`/assets/scenes` 與
`/assets/scenes/{scene_id}` 都會回傳每個 scene 的
`tags`，所以你的選單可以據此分辨哪些 scene
是透明背景。選到這種 scene 時，想顯示在 avatar
背後的內容就放在元件本身所在的容器上——presenter
自己不會繪製任何背景。
