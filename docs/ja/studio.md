## Studio

![Perxona Connect Kit：Studio デモの例](assets/images/studio-example.png)

`demos/studio/`
デモはもう一方の端です：アプリケーション自体を作る場合の姿です。上記の共通統合に加えて、カタログのピッカー、chatbot
の完全な
**CRUD**、永続的な**マルチターン会話**、そして
**knowledge file** と
**function tools** を備えます。すべての応答は
`presenter.present()`
に渡されるため、アバターがリアルタイムで読み上げます。**ソース切り替え**が言語モデルの実行者を決めます——Perxona
がホストする Connect chatbot か、自分の
`LLM_API_KEY`
か。会話の途中でも切り替えられます：履歴はプロバイダー非依存の
`{ role, text }`
として保持され、呼び出し時に変換されるため、同じ会話がそのままもう一方に引き継がれます。`http://localhost:8083/demos/studio/`
を開いてください。ライフサイクルは次のとおりです：

1. **presenter を起動。**Avatar・Scene・Voice
   を選択して **Launch Presenter**
   をクリックします。このクリックが
   `presenter.resumeAudioPlayback()`
   も呼び出します——ブラウザの autoplay
   ポリシーは、音声の開始に直接のユーザー操作を要求するためです。
2. **モデルの実行者を選ぶ。**ソース切り替えには
   **Connect chatbot** と
   **Own LLM** があります。Own LLM は
   `LLM_API_KEY` を設定するまで無効のままです——`GET /api/config`
   は利用可否のみを報告し、キー自体は決して返しません。
3. **chatbot を作成または選択。**Connect
   ソースを選んだ状態で
   **+ New Chatbot**
   をクリックし、名前と任意のシステム指示を入力して
   **Save** をクリックします。chatbot は
   `POST /api/chatbots`
   で作成され、すぐに選択されます。既存の chatbot
   を編集・削除するにはドロップダウンから選びます。Own LLM
   ソースにこの手順は不要です——管理すべきサーバー側オブジェクトがありません。
4. **チャット。**メッセージを入力して送信します。モデルの処理中、アバターは
   Thinking 状態になります——Connect ソースは
   `POST /api/chatbots/:id/chat`、自分のキーは
   `POST /api/chat`
   を使います。応答はチャットログに表示され、`presenter.present(reply)`
   で読み上げられます。presenter
   が未起動でも、チャットはテキストのみで動作します。
5. **任意——Knowledge file と function tools。**
   chatbot エディタで
   `.txt`、`.pdf`、`.doc`、`.docx`、`.csv`
   のいずれかをアップロードすると、自分のコンテンツに基づいて
   chatbot が回答します。チャンク分割と embedding
   は非同期で行われ、数秒から数分かかることがあります——Studio は
   chatbot
   のステータスをポーリングし、リロード不要でバッジをリアルタイムに更新します。chatbot
   の作成・更新時に
   `tools` 配列を渡すと、会話中に外部 HTTP API
   を呼び出せます。どちらも Connect ホスト側の機能です。Own LLM
   に切り替えると使えなくなります——このトレードオフこそ、切り替えが見せようとしているものです。
