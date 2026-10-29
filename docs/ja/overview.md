## Connect Kit で何が作れる？

15 分以内にしゃべる 3D
アバターをオンラインにできます——さらに必要なだけ拡張できるプラットフォームも揃っています。現在利用可能な機能と近日公開予定の機能をご紹介します。

1 — すぐに使える

リアルなアバター体験に必要なすべてが揃っています——設定を選ぶだけですぐにデプロイできます。

🧑‍🎨

#### アバターカタログ

リアル系・カートゥーン系・VRM
キャラの厳選キャスト。カタログから選ぶだけで数分で画面に登場します。

🎙️

#### 音声 — Azure & Google TTS

Azure と Google TTS
のリアルな人声。音声がアバターのリップシンクを自動駆動——追加設定は不要です。

🤖

#### チャットボット

ナレッジファイルをアップロードし、シンプルなツールコールを設定して
3D アバターと組み合わせると、フルボイスの AI
エージェントが完成——バックエンド不要。

🌐

#### どこでも安定動作

開発者は自分のプロダクト作りに集中するだけ。すべての機能が
Chrome・Safari・Edge
のデスクトップ/モバイルで安定して動作し、プラットフォームごとの対応は不要です。

2 — 自前のものを統合

🧠

#### 独自 LLM を接続

任意の LLM が使えます。Markup Motion Language
でモーションキューをテキスト中に埋め込み、会話とアバターの動きを同期させます。

🔊

#### 独自音声を使用

`presenter.presentWithAudio()` に任意の TTS
サービスや録音済み音声の
`ArrayBuffer`
を直接渡すだけ。アバターがリップシンクし、 Motion Director
がテキストから動きと表情を自動生成します——Perxona TTS
は不要です。

🪆

#### 独自アバター（VRM 1.0）

VRM 1.0
キャラをアップロードして、ブランドや顧客に合ったアバターで話させることができます。現在アップロードは一時停止中です。詳しくは
[VRM アップローダー](https://connect.perxona.ai/#vrm-uploader)をご覧ください。

3 — プレゼンテーションエンジン

リアルタイムのアバターパフォーマンスを即座にストリーミング——動画バッファリングもゲームエンジンのインストールも不要。`present()`
を呼んだ瞬間にアバターが応答します。

🎬

#### インハウス Motion Director

エンジンがテキストの意味を読み取り、最適なボディモーションと表情を自動選択——アバターの顔と体が発話内容に合わせてリアルタイムに反応します。

✏️

#### カスタム Motion Director

Markup Motion Language
を使って文単位でモーションのタイミングを制御——プレーンテキストで完全な演出が可能です。

```js
// プレゼンテーションエンジン — 今すぐ使えます
const presenter = document.querySelector("sv-presenter");

button.addEventListener("click", async () => {
  await presenter.resumeAudioPlayback();
  await presenter.initializeWithConnectKey(connectKey, { avatarId, sceneId, voiceId });
  presenter.present("朝ごはんが食べたいです。");
});
```

[→ Presenter コンポーネント](https://connect.perxona.ai/#sdk-reference)
