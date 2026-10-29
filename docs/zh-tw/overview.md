## 你能用 Connect Kit 做什麼？

不到 15 分鐘，一個會說話的 3D
虛擬人就能上線——還有完整的平台供你持續擴展。以下是現在可用的功能，以及即將推出的能力。

1 — 開箱即用

打造生動虛擬人體驗所需的一切——選好設定，立即上線。

🧑‍🎨

#### Avatar 目錄

精選的寫實人物、卡通風格、VRM
角色，從目錄挑選一個，幾分鐘內就在螢幕上。

🎙️

#### 語音 — Azure & Google TTS

來自 Azure 與 Google TTS
的豐富真人語音。語音自動驅動角色的口型同步（Lip-sync）——無需額外設定。

🤖

#### Chatbot

上傳 knowledge file、設定簡單的 tool call，搭配 3D Avatar
打造全語音 AI 代理——不需要自建後端。

🌐

#### 隨處穩定運作

你只需專注在打造自己的產品，其餘的我們來處理。所有功能穩定運作在
Chrome、Safari、Edge
的桌機與手機上，無需任何平台相容性處理。

2 — 與自有系統整合

🧠

#### 接入你的 LLM

使用任何 LLM。透過 Markup Motion Language
在對話文字中內嵌動作指令，讓角色肢體語言與對話同步。

🔊

#### 接入你的語音

透過
`presenter.presentWithAudio()`
直接傳入自己的音訊（任何 TTS 服務或預錄音檔的
`ArrayBuffer`）。 Avatar 對你的音訊做
口型同步，Motion Director
仍根據文字驅動肢體動作與表情——不需要 Perxona TTS。

🪆

#### 接入你的 Avatar（VRM 1.0）

上傳 VRM 1.0
角色，讓你的產品更貼近你的品牌與客戶需求。目前暫停上傳，詳見
[VRM Uploader](https://connect.perxona.ai/#vrm-uploader)。

3 — 表演引擎

即時串流的角色表演——不用像影片串流或遊戲引擎一樣事先下載大型檔案。呼叫
`present()` 的瞬間，角色立即回應。

🎬

#### 內建 Motion Director

引擎讀取文字語意，自動挑選最合適的肢體動作與臉部表情——角色的表情和動作會配合說話內容即時反應。

✏️

#### 自訂 Motion Director

透過 Markup Motion Language
在句子層級自訂動作時間點——用純文字就能完全掌控角色表演。

```js
// 表演引擎 — 現在就可以用
const presenter = document.querySelector("sv-presenter");

button.addEventListener("click", async () => {
  await presenter.resumeAudioPlayback();
  await presenter.initializeWithConnectKey(connectKey, { avatarId, sceneId, voiceId });
  presenter.present("我想要吃早餐。");
});
```

[→ Presenter 元件](https://connect.perxona.ai/#sdk-reference)
