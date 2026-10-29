## Express サンプルを実行

サンプルアプリは 1 つの Node/Express サーバーで、同じ
`<sv-presenter>`
統合の上に構築された 2
つの実行可能なブラウザデモを提供します。どちらもアバターが読み上げる会話を行い、違うのは**仕事のどちら側を見ているか**です。
**Embed**は本番で動いている姿：アバターが質問に答えている製品ページで、コントロールはなく、ページ上に自身の設定について書かれたものもありません。
**Studio**はそれを作るためのコンソール：カタログを閲覧し、チャットボットを作成・編集し、発話中に割り込み、Perxona
ホストのチャットボットと自分の API
キーを会話を失わずに切り替えられます。サーバーを一度起動すれば、どちらのデモも開けます。以下の手順で、クローンからしゃべるアバターまで進めます。

⚡

クローンからしゃべるアバターまで
**5〜15 分**。**Node `>=22`**
と 2 つの Connect API キーが必要です——[API 認証情報を取得](https://connect.perxona.ai/#credentials)を参照してください。

1. #### サンプルをクローン

   ```bash
   git clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git
   cd perxona-connect-kit/samples/express
   ```
2. #### ローカル設定ファイルを作成

   ```bash
   cp .env.example .env
   ```

   `.env` を開いて 3
   つの必須値を入力してください。2
   つのキーは交換できません——secret
   はサーバーに留め、publishable がブラウザに渡す方です：

   ```bash
   PERXONA_API_BASE_URL=https://console.perxona.ai/asia
   PERXONA_CONNECT_SECRET_KEY=pxc_...
   PERXONA_CONNECT_PUBLISHABLE_KEY=pxc_...
   ```
3. #### 依存関係をインストール

   ```bash
   npm install
   ```

   Node
   `>=22` が必要です。古いバージョンの場合、`npm install`
   は明確なアップグレードメッセージとともに失敗します。
4. #### サーバーを起動

   ```bash
   npm run dev    # ライブリロード (node --watch)
   # または
   npm start      # ウォッチなし
   ```

   ターミナルにローカル
   URL（例：`http://localhost:8083`）が表示されます。
5. #### アバターを起動

   ブラウザで URL を開いてください。ランディングページには 2
   つのデモが表示されます。**Studio** では
   **Avatar**・**Scene**・**Voice**
   を選択して
   **Launch Presenter**
   をクリックします。**Embed**
   には選ぶものも設定するものもありません——アバターもチャットボットも解決済みなので、メッセージを入力するだけです。どちらの場合も最初の
   1 行にはユーザー操作が必要です：ブラウザの autoplay
   ポリシーは実際の操作からしか音声再生を許可しないため、ページ読み込み時に自分からしゃべるアバターは存在しえません。Studio
   ではその操作が起動クリック、Embed
   では送信するメッセージです。
