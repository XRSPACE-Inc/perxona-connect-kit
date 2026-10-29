## 整合架構

一個 Connect 整合有三種責任：後端負責憑證與存取政策，Connect API
負責 Avatar 資源與 presentation 服務，而
`<sv-presenter>` 負責瀏覽器端渲染與播放。

```
你的後端                              瀏覽器
- 保存 Connect 憑證                   - 渲染產品 UI
- 每次呼叫都帶著 secret 金鑰          - 接收 publishable 金鑰
            |                         |
            v                         v
      Connect API  <----------------  <sv-presenter>
      asset · voice · presentation    初始化 · 發話 · 動畫
      chatbot                         處理口型同步與播放
```

### 責任邊界

- **你的後端**持有 **secret**
  Connect API 金鑰，套用自己的使用者授權規則，並提供瀏覽器
  **publishable** 金鑰——絕不是 secret 那把。
- **Connect API** 提供 Avatar、Scene、Voice、Motion
  catalog，以及 presentation 與 chatbot 操作。
- **`<sv-presenter>`** 接收
  publishable 金鑰與選定 asset ID，然後直接與 Connect
  溝通取得執行時所需服務。

### 執行流程

1. 後端在每個 Connect 請求帶上自己的
   **secret** 金鑰作為 `X-Connect-Key`
   header。沒有登入步驟，也沒有需要刷新的 token。
2. 應用程式從 Connect API 列出或選擇啟用中的 Avatar、Scene 與選填
   Voice。
3. 在直接的使用者手勢中呼叫
   `presenter.resumeAudioPlayback()`，以符合瀏覽器的自動播放政策。
4. 呼叫
   `presenter.initializeWithConnectKey(connectKey, { avatarId,
   sceneId, voiceId })`。
5. 元件回報 `Ready` 後，呼叫
   `presenter.present(content)` 或
   `presenter.presentWithAudio(audio, content)`。

⚠️

**只有 publishable 金鑰可以進到瀏覽器。**
任何在你頁面上打開 devtools 的人，都讀得到你交給 presenter
的東西——所以交給它一把本來就設計成可以被讀到的。**publishable**
金鑰能讀取你的 asset 與 voice、產生 presentation、發放語音
token——注意後兩者*會對你的組織計費*，所以一把沒有網域限制、被人從頁面上抄走的
publishable 金鑰會透過別的頁面的腳本持續消耗你的
credits。上線前限制它的網域——這樣能擋掉別的頁面的腳本，因為只有真正的瀏覽器才會送出真實的
`Origin`
header。但這擋不住有人把金鑰原封不動抄進自己寫的腳本：`Origin`
只是一個
header，瀏覽器以外的東西沒有義務誠實填它。金鑰一旦外流，真正能止血的是到
console 撤銷它。**secret**
金鑰則在此之上額外具備伺服器需要的一切：寫入 asset、對你的
chatbot
說話，以及建立、修改、刪除它們。請留在伺服器上，不要在任何路由上提供它。

⚠️

**放錯欄位不會有任何錯誤。**兩種型別共用
`pxc_` 前綴，上游兩種都接受，所以把 secret 金鑰放進
`PERXONA_CONNECT_PUBLISHABLE_KEY`
不會失敗——一切照常運作，而每一位訪客都拿到一把能管理你 chatbot
的金鑰。只有 console 會告訴你某把金鑰是哪一種。

🌐

**secret 金鑰的允許網域請留空。**網域限制比對的是瀏覽器的
`Origin`
header，而伺服器對伺服器的請求根本不會送出它——所以設了網域限制的
secret 金鑰會在每一次呼叫都被拒絕——而錯誤訊息只會說 origin
不被允許，不會告訴你它看到的是什麼，因為根本沒有東西被送出。網域限制屬於真的會被瀏覽器使用的
publishable 金鑰。
