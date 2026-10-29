## 統合アーキテクチャ

Connect 統合には 3 つの責務があります。バックエンドが認証情報と
アクセスポリシーを担い、Connect API がアバターリソースと
presentation サービスを担い、`<sv-presenter>`
が ブラウザ側の描画と再生を担います。

```
あなたのバックエンド                  ブラウザ
- Connect 認証情報を保存              - プロダクト UI を描画
- 毎回 secret キーを送信              - publishable キーを受信
            |                         |
            v                         v
      Connect API  <----------------  <sv-presenter>
      asset · voice · presentation    初期化 · 発話 · アニメーション
      chatbot                         リップシンクと再生を処理
```

### 責務の境界

- **あなたのバックエンド**が
  **secret** の Connect API
  キーを保持し、自身のユーザー認可を適用して、ブラウザには
  **publishable** キーを渡します——secret
  キーは決して渡しません。
- **Connect API** は Avatar、Scene、Voice、Motion
  の catalog と、presentation、chatbot 操作を提供します。
- **`<sv-presenter>`** は
  publishable キーと選択した asset ID
  を受け取り、実行時に必要なサービスのため Connect
  と直接通信します。

### 実行フロー

1. バックエンドがすべての Connect リクエストに自身の
   **secret** キーを
   `X-Connect-Key`
   ヘッダーとして付けます。ログイン手順も、更新すべきトークンもありません。
2. アプリケーションが Connect API から有効な
   Avatar、Scene、任意の Voice を一覧または選択します。
3. 直接のユーザージェスチャー内で
   `presenter.resumeAudioPlayback()`
   を呼び、ブラウザの 自動再生ポリシーを満たします。
4. `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`
   を呼びます。
5. コンポーネントが `Ready` を報告したら、
   `presenter.present(content)` または
   `presenter.presentWithAudio(audio, content)`
   を呼びます。

⚠️

**ブラウザに渡してよいのは publishable キーだけです。**
ページで devtools を開けば、presenter
に渡したものは誰でも読めます——ですから、読まれる前提で設計されたキーを渡してください。**publishable**
キーができるのは asset と voice の読み取り、presentation
の生成、音声トークンの発行です——後ろ 2
つは*組織に課金されます*。ドメイン制限のない
publishable キーは、別のページのスクリプトからコピーされて
credits
を使い続けられます。公開前にドメインを制限してください——これは別のページのスクリプトを防ぎます。本物のブラウザだけが本物の
`Origin`
ヘッダーを送るからです。ただしこれは、生のキーを自分のスクリプトにそのままコピーした相手は防げません：`Origin`
は単なるヘッダーであり、ブラウザ以外に正直に送る義務はありません。キーが漏れた場合、実際に止血できるのはコンソールでの失効だけです。**secret**
キーはサーバーに必要なものをすべて追加します：asset
の書き込み、chatbot との会話、その作成・編集・削除。サーバーに
置き、どのルートでも配信しないでください。

⚠️

**入れる変数を取り違えても、何も起きません。**どちらの型も
`pxc_`
接頭辞を共有し、上流はどちらも受け付けます。secret キーを
`PERXONA_CONNECT_PUBLISHABLE_KEY`
に入れても失敗しません——すべて正常に動き、訪問者全員が chatbot
を管理できるキーを受け取ります。どちらの型かを教えてくれるのはコンソールだけです。

🌐

**secret キーの許可ドメインは空のままにしてください。**
ドメイン制限はブラウザの `Origin`
ヘッダーと照合されますが、サーバー間リクエストはそれを送りません——そのため、ドメインを設定した
secret キーはすべての呼び出しで拒否されます——そしてエラーは
origin
が許可されていないとしか言わず、何を見たかは伝えません。何も送られていないからです。ドメイン制限は、実際にブラウザが使う
publishable キーのためのものです。
