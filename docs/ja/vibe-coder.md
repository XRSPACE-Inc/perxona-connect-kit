## Vibe Coder 入門ガイド

AI
コードエディタ（**Cursor**、**Windsurf**、**VS Code + GitHub Copilot**、**Claude Code**
など）を使って開発しているものの、GitHub
やターミナル操作にはまだ慣れていない方向けのガイドです。専門用語をわかりやすい言葉で解説し、コマンドを暗記せずにプロジェクトをダウンロード・設定する方法と、そのまま使える
AI プロンプトを紹介します。

### 1. はじめに知っておきたい 3 つの基本コンセプト

| よく出てくる言葉 | わかりやすい意味 |
| --- | --- |
| **GitHub と `Clone`** | **GitHub** は「公開されているプログラムのレシピ置き場」です。**Clone（クローン）**とは、「公式のサンプルフォルダを丸ごと自分のパソコンにコピーすること」です。自分のパソコン上のコピーなので、どれだけ書き換えても元のサンプルは壊れません。 |
| **環境変数（Environment Variables）と `.env`** | `.env` は、自分のパソコンの中だけに置いておく**「秘密の設定メモ帳（金庫）」**です。API キーはパスワードのようなものなので、Web ページのコードに直接書いて公開すると第三者に悪用されてしまいます。`.env` に入れておけば、GitHub にアップロードされるのを自動的に防げます（`.gitignore` で除外されています）。   **なぜ `.env.example` があるの？** `.env.example` は「空欄の記入見本」です。これをコピーして名前を `.env` に変え、自分のキーを書き込みます。 |
| **2 種類の API キー（`Secret` と `Publishable`）** | **API キー**は、アプリをあなたの Perxona アカウントとつなぐ通行証です。セキュリティのため信頼境界の異なる **2 つのキー**を使います：`PERXONA_CONNECT_SECRET_KEY` は**手元のサーバー内だけ**に置き、`PERXONA_CONNECT_PUBLISHABLE_KEY` は**ブラウザ側**に渡します。各キーの権限と作成手順については上の[API 認証情報を取得](https://connect.perxona.ai/#credentials)を参照してください。 |

### 2. コマンド暗記不要のセットアップのコツ

1. #### 事前準備：2 つの無料ツールをインストール（初回のみ）

   1. **AI コードエディタ**：[Cursor](https://www.cursor.com/)
   または
   [VS Code](https://code.visualstudio.com/)
   をインストールします。  
   2. **Node.js（バージョン 22 以上）**：[nodejs.org](https://nodejs.org/)
   からインストーラー（v22+
   LTS）をダウンロードしてインストールします。すでに入っているか分からない場合は、AI
   エディタのチャットで
   `「私のパソコンに Node.js 22
   以上がインストールされているか確認して」`
   と聞いてみてください。
2. #### プロジェクトをパソコンにダウンロード（3 つの方法から 1 つ選択）

   コマンドを暗記する必要はありません。やりやすい方法を選んでください：

   - **方法 A — AI エディタに任せる（Vibe Coder
     に一番おすすめ）：**
     Cursor、Windsurf、または Claude Code
     に次の文章を貼り付けます：
     ```text
     https://github.com/XRSPACE-Inc/perxona-connect-kit.git をクローンして、samples/express フォルダに入り、.env.example を .env にコピーして npm install を実行してください。
     ```
   - **方法 B — エディタのボタンを使う：**
     Cursor / VS Code の起動画面で
     **Clone Git Repository...**
     をクリックし、`https://github.com/XRSPACE-Inc/perxona-connect-kit.git`
     を貼り付けて保存先を選び、ダウンロード後に中の
     `samples/express` フォルダを開きます。
   - **方法 C — GitHub から ZIP をダウンロード：**
     [GitHub ページ](https://github.com/XRSPACE-Inc/perxona-connect-kit)右上の緑色の **<> Code** ボタン →
     **Download ZIP**
     で解凍し、中の
     `samples/express` フォルダを開きます。

   📁

   **フォルダの位置に注意：**実際に動かすサンプルアプリは一番上のフォルダではなく、`samples/express/`
   フォルダの中にあります。
3. #### `.env` ファイルを見つけて編集し、サンプルを起動する

   上の[API 認証情報を取得](https://connect.perxona.ai/#credentials)の手順で
   2 つのキーを作成し、下の[Express サンプルを実行](https://connect.perxona.ai/#quickstart)に従って
   `.env` の入力とサーバー起動を行ってください。

   💡

   **Finder やエクスプローラーで
   `.env` が見つからない？**
   ドット（`.`）で始まるファイルは Mac / Windows
   では隠しファイルになります。**Cursor / VS Code の左側のファイル一覧**なら常に表示されます。`=`
   の前後にスペースを入れず、引用符も付けず、ファイル名が
   `.env.txt` ではなく
   `.env` になっていることを確認して保存（`Cmd+S`
   / `Ctrl+S`）してください。

### 3. Vibe Coding を始めよう！（AI エディタにそのまま貼れるプロンプト）

このリポジトリには AI アシスタント向けのガイドファイル（`AGENTS.md`
と
`CLAUDE.md`）が最初から同梱されています。Cursor、Windsurf、Claude Code、VS
Code Copilot で開くだけで、AI は
`<sv-presenter>` と Connect API
の仕様を自動的に理解します。

🎯

**鉄則：アバター選びと Chatbot 作成は Studio
で行い、コードの改造は必ず
`demos/embed/` から始める！**
`demos/embed/`
は製品ページ向けのシンプルな最小テンプレートです。一方
`demos/studio/`
はカタログ選択や
CRUD、デバッグ機能を備えた開発者コンソールなので、自分のアプリを作る時は必ず
`demos/embed/` をベースにするよう AI
に指示してください。

以下のプロンプトをそのまま AI
エディタにコピー＆ペーストして使えます：

**プロンプト 1 — 自分のテーマの Web
サイトにデザイン変更する：**

```text
samples/express/public/demos/embed/ を見てください。app.js 内の <sv-presenter> の初期化とチャット処理はそのまま維持して、index.html と style.css をモダンな【例：AI ホテルコンシェルジュ／オンライン語学コーチ／ブランド案内キャスト】の Web サイトに作り変えてください。
```

**プロンプト 2 — Studio で選んだアバター・シーン・音声・Chatbot
を `.env` に固定する：**

```text
ローカルサーバーの起動ログにある自動選択 ID を読み取るか、私が Studio で選んだ Avatar・Scene・Voice・Chatbot の ID を使って、samples/express/.env の DEMO_FIXED_AVATAR_ID、DEMO_FIXED_SCENE_ID、DEMO_FIXED_VOICE_ID、DEMO_FIXED_CHATBOT_ID を設定してください。PERXONA_CONNECT_SECRET_KEY を読み取ったり出力したりせず、ローカルの /api/* ルートを公開 API として扱ったり、フロントエンドのコードに認証情報やレスポンスをハードコードしたりしないでください。
```

**プロンプト 3 —
チャット欄の上にワンクリック質問ボタンを追加する：**

```text
samples/express/public/demos/embed/ のチャット入力欄の上に、訪問者がクリックするとすぐにチャットボットへ質問を送信してアバターが音声で答える「よくある質問ボタン」を 3 つ追加してください。
```
