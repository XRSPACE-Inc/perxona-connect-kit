## Embed

![Perxona Connect Kit：Embed デモの例](assets/images/embed-sample.png)

`demos/embed/` デモは、Connect Kit
が本番で動いている姿です：アバターが質問に答えている製品サイト。カタログもピッカーも設定パネルもなく、そして意図的に**ページ上のどこにも自身の設定について書かれていません**。実際のサイトは訪問者に自分の設定を説明しないので、これもしません。widget
に必要なものはすべて
`GET /api/config`
で解決済みで届き、足りないものがあれば widget
を描画せず、理由はブラウザのコンソールに出します。`http://localhost:8083/demos/embed/`
を開いてください。ライフサイクルは次のとおりです：

1. **設定するものはありません。**`GET /api/config` が
   `fixedTarget`（avatar・scene・voice）と
   `chatbotId` を報告します。`DEMO_FIXED_*`
   をすべて空のままにすると、サーバーがアカウント内の最初のものをそれぞれ選ぶため、クローンしただけの状態で設定なしに動きます。自分のものを固定したい場合は設定してください。実際の統合ではこちらです。どちらだったかはサーバーの起動ログにのみ出力され、ページには出ません。実際の資格情報が必要で、アカウントに
   chatbot が最低 1 つ必要です——mock
   モードはどちらも提供できません。
2. **ページ読み込み時に初期化。**`app.js` がその config と
   `GET /api/connect-key` を取得し、`presenter.initializeWithConnectKey(key,
   config.fixedTarget)`
   を呼び出します。クリックもカタログへのリクエストも発生しません。
3. **Ready でチャットを開く。**`PRESENTER_STATUS` が `Ready`
   を発行すると、メッセージ入力欄が現れます。リスナーは
   `initializeWithConnectKey()`
   の*前*に登録します：このイベントは presenter
   の準備完了を知る唯一の手段であり——読み戻せる状態はどこにも公開されていません——リスナーがまだ
   `await`
   一つ分先にある間に発火したものは永久に失われます。
4. **メッセージを送ると、返答が読み上げられます。**各メッセージは直近 20 ターンとともに
   `POST /api/chatbots/:id/chat` へ送られ、返答が
   `present()` に渡されます。**最初の送信が音声のロックを解除します。**`resumeAudioPlayback()` が実行されるまで
   `present()` は
   `AUDIO_CONTEXT_UNAVAILABLE`
   を返し、ブラウザの autoplay
   ポリシーは実際のユーザー操作からしかそれを許可しません——ですから実際のサイトは読み込み時に挨拶できず、別途「音声を有効化」ボタンも必要としません。あなたが最初に言うことが、相手が最初に返す言葉を許可します。
