## 取得 API 憑證

兩件事，依這個順序：先有
**Perxona 帳號**，再用它建立
**兩把 Connect API 金鑰**。真正用來驗證的是金鑰；
帳號的作用只是讓你能登入 console 把金鑰發出來。

🔑

**用哪種方式登入都可以。**Perxona Console 與
Connect Kit
共用同一套帳號系統，而且你的整合是用金鑰驗證、不是用密碼，所以
**Google SSO 完全沒問題**——這個 sample 從頭到尾
不需要密碼。Motion Browser 則是直接用 Connect API key
驗證（見下方章節）。

在
**[Perxona console](https://console.perxona.ai/asia/auth/sign-up)**
註冊並登入。帳號的作用是讓你建立那兩把 API
金鑰——整合本身從頭到尾不會用到你的密碼。

⚠️

**沒有註冊 API。**Connect 的
`signup`、`confirm-signup`、`forgot-password`
與 `reset-password`
端點已棄用、不再受支援。帳號請在 console 建立；忘記密碼請用
console 登入頁的重設流程。

### 建立你的兩把 API 金鑰

以該帳號登入 Perxona console，開啟
**[Management → Integration → Connect API keys (open the avatar menu, top right)](https://console.perxona.ai/asia/organization/integration/connect-api-keys/)**。
建立**兩把**金鑰——它們不可互換，而且建立前表單就會列出各自能做什麼，下面這張表是同樣的內容：

| 建立時選的類型 | 填進哪個變數 | 允許網域 |
| --- | --- | --- |
| **Secret** | `PERXONA_CONNECT_SECRET_KEY` | **請留空。**見下方警告。 |
| **Publishable** | `PERXONA_CONNECT_PUBLISHABLE_KEY` | 確定頁面會從哪裡提供之後再設定。 |

#### 各金鑰類型能做什麼

| 能力 | Secret | Publishable |
| --- | --- | --- |
| 讀取素材（avatar、場景、動作） | ✓ | ✓ |
| 讀取語音 | ✓ | ✓ |
| 產生 presentation | ✓ | ✓ |
| 產生 TTS token | ✓ | ✓ |
| 上傳素材（VRM upload） | ✓ | — |
| 與 chatbot 對話 | ✓ | — |
| 管理 chatbot（建立、更新、刪除） | ✓ | — |
| 查詢 credit 用量 | ✓ | — |

![Perxona Console：Management → Integration → Connect API keys (open the avatar menu, top right) 頁面](assets/images/integration-page.png)

⚠️

**每把金鑰只會顯示一次，之後再也拿不到。**
Console 只存雜湊值，所以請在關掉對話框之前複製進
`.env`。弄丟了就撤銷它、再建一把——沒有辦法把它讀回來。

⚠️

**放錯變數是靜默失敗。**兩把金鑰前綴相同，上游兩邊都接受，所以把 secret 金鑰貼進
`PERXONA_CONNECT_PUBLISHABLE_KEY`
不會報錯——只是每個訪客從此拿到一把能管理你 chatbot
的金鑰。請以 console 上顯示的類型為準，不要靠字串長相判斷。

🌐

**secret 金鑰的允許網域請留空。**網域限制比對的是瀏覽器的
`Origin`
header，而伺服器對伺服器的請求根本不會送出它——所以設了網域限制的
secret 金鑰會在*每一次*呼叫都被拒絕——而錯誤訊息只會說
origin
不被允許，不會告訴你它看到的是什麼，因為根本沒有東西被送出。網域限制屬於真的會被瀏覽器使用的
publishable 金鑰。填裸主機名——不要帶
`https://`、port 或路徑。開頭的
`*.` 只涵蓋子網域，不含 apex
本身——如果頁面可能同時從兩者提供，就分別列兩筆（例如
`example.com` 與 `*.example.com`）。

✓

完成。把兩把金鑰填進 `.env`，接著照
[執行 Express 範例](https://connect.perxona.ai/#quickstart)；或直接前往
[Presenter 元件流程](https://connect.perxona.ai/#sdk-reference)
把它們接進你自己的應用程式。
