## API 認証情報を取得

必要なものは 2 つ、この順番です：まず
**Perxona アカウント**、次にそれで作る
**2 つの Connect API キー**。実際に認証に使うのはキーで、
アカウントはコンソールにサインインしてキーを発行するために存在します。

🔑

**どのサインイン方法でも構いません。**Perxona
Console と Connect Kit
は同じアカウント基盤を共有しており、統合が認証に使うのはパスワードではなくキーです。ですから
**Google サインインで問題ありません**——サンプルの実行にパスワードは一切不要です。Motion Browser
は代わりに Connect API key
で認証します（下記セクション参照）。

**[Perxona コンソール](https://console.perxona.ai/asia/auth/sign-up)**でサインアップし、サインインしてください。 アカウントは 2 つの
API
キーを作るためのもので、統合そのものがパスワードを使うことはありません。

⚠️

**サインアップ API はありません。**Connect の
`signup`、`confirm-signup`、`forgot-password`、`reset-password`
エンドポイントは非推奨となり、サポートされていません。アカウントはコンソールで作成してください。パスワードの再設定はコンソールのサインイン画面から行えます。

### 2 つの API キーを作成する

そのアカウントで Perxona コンソールにサインインし、**[Organization → Integration → Connect API keys](https://console.perxona.ai/asia/organization/integration/connect-api-keys/)**
を開きます。**2 つ**のキーを作成してください——
交換はできません。作成前にフォームが各タイプの権限を表示します。同じ内容を下の表にもまとめています：

| 作成時に選ぶタイプ | 入れる変数 | 許可ドメイン |
| --- | --- | --- |
| **Secret** | `PERXONA_CONNECT_SECRET_KEY` | **空のままに。**下の警告を参照。 |
| **Publishable** | `PERXONA_CONNECT_PUBLISHABLE_KEY` | ページの配信元が決まってから設定してください。 |

#### 各キータイプでできること

| できること | Secret | Publishable |
| --- | --- | --- |
| アセットの読み取り（アバター、シーン、モーション） | ✓ | ✓ |
| 音声の読み取り | ✓ | ✓ |
| presentation の生成 | ✓ | ✓ |
| TTS token の生成 | ✓ | ✓ |
| アセットのアップロード（VRM upload） | ✓ | — |
| チャットボットとの会話 | ✓ | — |
| チャットボットの管理（作成・更新・削除） | ✓ | — |
| credit 利用量の読み取り | ✓ | — |

![Perxona コンソール：Organization → Integration → Connect API keys ページ](assets/images/integration-page.png)

⚠️

**キーは一度だけ表示され、二度と表示されません。**
コンソールはハッシュのみを保存するため、ダイアログを閉じる前に
`.env`
にコピーしてください。紛失した場合は失効させて作り直します——読み戻す方法はありません。

⚠️

**間違った変数に入れても気づけません。**両方のキーは同じプレフィックスを持ち、アップストリームはどちらのスロットでもどちらのキーも受け付けるため、secret
キーを `PERXONA_CONNECT_PUBLISHABLE_KEY`
に貼ってもエラーなく動きます——ただし、以後すべての訪問者に
chatbot
を管理できるキーが配られることになります。文字列の形ではなく、コンソールに表示される型を確認してください。

🌐

**secret キーの許可ドメインは空のままにしてください。**
ドメイン制限はブラウザの `Origin`
ヘッダーと照合されますが、サーバー間リクエストはそれを送りません——そのため、ドメインを設定した
secret
キーは*すべての*呼び出しで拒否されます——そしてエラーは
origin
が許可されていないとしか言わず、何を見たかは伝えません。何も送られていないからです。ドメイン制限は、実際にブラウザが使う
publishable
キーのためのものです。裸のホスト名を入力してください——`https://`、ポート、パスは不要です。先頭の
`*.`
はサブドメインのみをカバーし、apex
自体は含みません——ページが両方から配信される可能性がある場合は、両方を別々に列挙してください（例：`example.com`
と `*.example.com`）。

✓

完了です。両方のキーを `.env` に入れて
[Express サンプルを実行](https://connect.perxona.ai/#quickstart)
に進むか、[Presenter コンポーネントフロー](https://connect.perxona.ai/#sdk-reference)
で自分のアプリケーションに組み込んでください。
