Developer Handbook

# Perxona Connect Kit

Build a browser-native avatar experience.

**Perxona Connect API** と
`<sv-presenter>` アバター Web
コンポーネントの公開統合面です。このハンドブックではまず両方の
契約を説明し、後半の Express
サンプルで実装方法の一例を示します。

## Perxona Connect Kit とは？

Connect Kit は、リアルタイム 3D アバターを Web
プロダクトに組み込むための公開統合面です。ブラウザのレンダリング契約と
サーバー側の Connect API
を分離しているため、自分のアプリケーション
アーキテクチャに合わせて利用できます。

相補的な 2 つの部分で構成されます：

- **`<sv-presenter>`** —
  ブラウザで アバターを描画する Web Component。選択した
  Avatar／Scene／Voice
  を初期化し、音声・モーション・リップシンク再生を実行します。
- **Connect API** — カタログ asset、voice、
  presentation、chatbot のための認証済み HTTP エンドポイント。
  **Connect API キー**で認証し、`X-Connect-Key`
  ヘッダーとして送ります。キーは 2 種類：**secret**
  はサーバーに留め、**publishable**
  がブラウザに渡す方です——カタログの読み取りと presentation
  の生成、音声トークンの発行ができ、それ以上はできません。
