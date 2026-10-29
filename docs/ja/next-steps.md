## 次のステップ

どちらかのデモが動いたら、自然な次のステップを紹介します：

- **独自の UI を使用。**バニラ JS フロントエンドを
  React、Vue、または任意のフレームワークで置き換えてください——サーバー
  API（`/api/*`）は変わりません。
- **拒否されたキーへの対応。**`CONNECT_KEY_REJECTED`
  を監視し、この統合を運用している人に伝えてください。更新できるものはありません——本当の解決策はコンソールでキーを再発行することなので、コードにできる最も有用なことは、それをはっきり伝えることです。
- **自分のモデルを使う。**`.env` に
  `LLM_API_KEY`（オプションで
  `LLM_PROVIDER`、`LLM_BASE_URL`、`LLM_MODEL`）を設定すると
  `POST /api/chat` がアンロックされ、Studio の
  **Own LLM**
  ソースが使えるようになります。このルートは認証がなく、そのキーの費用を消費する点に注意してください——`localhost`
  でのみ使用してください。
- **完全な API コントラクトを探索。**sample
  ディレクトリ内の Connect API OpenAPI spec
  `docs/openapi.yaml`
  を参照し、presenter 型宣告には
  `@perxona/presenter-types@latest`
  をインストールしてください。
- **Studio ではなく Embed から作り始める。**`demos/embed/` がテンプレートです——`app.js`
  が 170 行、`index.html`
  はほぼダミーのコピー。これを複製し、レイアウトを差し替え、widget
  だけ残してください。Studio
  は出発点ではなく道具です：カタログのピッカー、chatbot の
  CRUD、デバッグタイムラインで 1200
  行あり、最初の一時間はその削除に費やすことになります。カタログの閲覧と
  chatbot の作成に使い、選んだものを
  `DEMO_FIXED_*` で固定してから、Embed
  で作り始めてください。
- **アップデートをフォロー・貢献。**下のリポジトリをスターしてウォッチし、新機能とバグ修正を追跡してください。

[### XRSPACE-Inc / perxona-connect-kit

GitHub でサンプルをクローン、Issue
を開いてアップデートをフォローしてください。](https://github.com/XRSPACE-Inc/perxona-connect-kit)
