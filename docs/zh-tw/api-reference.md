## Connect API 參考

Connect API 是 Connect Kit
的伺服器端整合介面。除非另有說明，以下路徑皆相對於 區域 base
URL，例如
`https://console.perxona.ai/asia/api/v1/connect`。
受保護的呼叫以 Connect API 金鑰驗證，透過
`X-Connect-Key` header 送出。

🗺️

**這裡是真正的 Connect API**——你自己的後端要呼叫的那個，位於
`console.perxona.ai`。本手冊後面的 Express
範例把其中一部分端點包在自己的
`/api/*`
路由後面，那是另一台獨立的伺服器——見[Express 範例 Adapter API](https://connect.perxona.ai/#sample-api-adapter)。若你在寫自己的後端，請直接呼叫這頁上的端點；不需要範例的那組路由。

💡

每個受保護的呼叫都送
`X-Connect-Key: <你的金鑰>`——如何建立見[取得 API 憑證](https://connect.perxona.ai/#credentials)。

⚠️

**絕不可在同一個請求同時送出兩種 header。**不論是正在從
`Authorization: Bearer` 遷移、還是同時測試兩者，API
都會以 `400` 拒絕同時帶著
`X-Connect-Key` 與
`Authorization: Bearer` 的請求。

### 用量與訂閱

⚠️

Connect Kit 註冊使用者原則上會被視為 Perxona Console 的
`Free Plan` 使用者。若組織 credits
用量耗盡，**或訂閱本身已經失效**，計量型呼叫——目前是
`POST /api/chatbots/:id/chat`（chatbot
對話）——都會回傳同樣的 HTTP `400` 與
`code: 1003`，body 可能長這樣：

```
{"code": 1003, "details": "credit_points exhausted for org_id: ..."}
```
```
{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}
```

要分辨是哪一種，看 `details`
欄位即可。另外還有第三種、獨立的情況——組織根本沒有任何訂閱紀錄——會回傳
HTTP
`403` 與 `code: 14005`：

```
{"code": 14005, "details": "No active subscription found for org_id: ..."}
```

非計量型呼叫（catalog 查詢、chatbot
CRUD、presentation）**不受影響**。

如需查看目前用量或加值，請登入
[Perxona Console → Subscription](https://console.perxona.ai/asia/organization/subscription/)（請使用你帳號所在區域的網址）。如果你正在 Connect API
上開發自己的應用程式，建議偵測回應中的
`code: 1003` 與
`code: 14005` 並顯示友善的提示訊息——本套件的
sample demo 針對 `1003` 示範了這個做法，`14005`
可以比照處理。

💡

**Credit 是你整個組織共用的用量計量器，不只算
Connect。**上面提到的計量型呼叫（chatbot
對話）跟組織裡其他計費對話流量，共用同一個組織層級的額度。用
**Secret**
金鑰查你組織目前的用量：

```bash
curl -X GET "$CONNECT_API_BASE/credit" \
  -H "X-Connect-Key: pxc_..."
```
```
{
  "used_credit_points": 42,
  "total_credit_points": 100,
  "remaining_credit_points": 58,
  "is_quota_exceeded": false,
  "period_start": "2026-08-01T00:00:00Z",
  "period_end": "2026-09-01T00:00:00Z"
}
```

這些數字大約每 10
分鐘更新一次——由背景工作定期重新計算，不是每次計量呼叫都即時更新，所以對話結束後馬上查可能還看不到。

這支端點**只有 Secret 金鑰打得到**——Publishable
金鑰會拿到 `403`，跟其他瀏覽器端金鑰沒有的能力
一樣（見[取得 API 憑證](https://connect.perxona.ai/#credentials)的能力表）。

⚠️

**Authorization: Bearer 驗證方式已棄用，Connect
的自助註冊與密碼重設也不再受支援。**請改用 Connect API 金鑰，並到 console 註冊帳號——兩者都見[取得 API 憑證](https://connect.perxona.ai/#credentials)。

### Avatar 與 Scene Catalog

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/assets/avatars` | 列出驗證組織可用的啟用中 Avatar。 |
| GET | `/assets/avatars/{avatar_id}` | 取得 Avatar 詳細資料，包含執行期設定。加上 `include=default_motions` 會多回傳 `default_motions`：`idle`、`talking`、`listening`、`loading` 四組預設動作，以及預設表情 `facial_motions`。每個鍵一定都在，沒有動作的組回傳空陣列。`personality_trait` 依個性特質挑選預設動作與 `lower_body_pool`，見[個性特質](https://connect.perxona.ai/#personality-trait)。 |
| GET | `/assets/avatars/{avatar_id}/motions` | 列出與 Avatar 相容的 Motion；需要時可用 `pose_tag` 或 `motion_ids` 篩選。 |
| GET | `/assets/scenes` `/assets/scenes/{scene_id}` | 列出啟用中的 Scene，或讀取單一 Scene 詳情。 |
| POST | `/assets/vrm/upload` | 以 multipart form data 上傳 `.vrm` 檔案並發佈成啟用中的 Avatar。需要 **secret** 金鑰。欄位：`vrm_file`、`gender`（`male` 或 `female`）、`heads_tall`（`3`、`6` 或 `8`），以及選填的 `avatar_name` 與 `lipsync_mode`。回傳新的 `avatar_id`。送出前先檢查檔案的 script 見[VRM Uploader](https://connect.perxona.ai/#vrm-uploader)。 |

### Voice 與 Presentation

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/voices` `/voices/{voice_id}` | 列出 custom voice，或讀取 voice 的公開合成設定。每個 voice 都帶 `languages` 欄位，列出它支援的語言，值是短碼 （`en`、`ja`⋯，不是 `en-US` 這種 locale）。列表支援 `language` 與 `provider` 篩選；詳見表格下方的說明。 |
| POST | `/voice-tokens/tts` | 為 JSON 主體 `{ voice_id }` 發行 provider TTS Token。一般的 `<sv-presenter>` 語音會自行處理此執行期步驟。 |
| POST | `/presentation` | 產生單次 presentation payload。傳入 `avatar_id` 與 `message`；`voice_id`、`emotion`、`intensity` 與 `personality_trait` 為選填。不帶 `voice_id` 時不合成語音（BYO TTS mode；見 [範例：整合 Gemini Live](https://connect.perxona.ai/#gemini-live-example)）。 |
| POST | `/motion-suggestion` | 不需要 avatar，為一段文字建議動作。傳入 `gender`、`heads_tall` 與 `text`，`personality_trait` 為選填；回傳插入動作標記的文字，以及標記所指的動作 asset。 |

🎭

**個性特質。**
`GET /assets/avatars/{avatar_id}`（query
參數）、`POST /presentation` 與
`POST /motion-suggestion`（body
欄位）都接受選填的
`personality_trait`：`Casual`、`Energetic`
或 `Professional`。省略時為
`Casual`。值要照列出的大小寫寫（首字大寫）：和小寫的
`emotion`、`intensity` 不同，寫成
`casual` 或 `PROFESSIONAL` 會回
`422`。

使用 `<sv-presenter>` 時，在
`initializeWithConnectKey` 的
`target` 設定 `personalityTrait`
即可，presenter 取得 avatar detail 與每次呼叫
`/presentation` 時都會帶上。自己呼叫
`/motion-suggestion` 的 app 要自己帶
`personality_trait`，值與交給 presenter 的相同。

三種結果套用個性特質的方式不同，出現不符的動作不一定是 bug：

- `default_motions`：每一組只留帶該個性特質的動作；該組一支都沒有時，回該組的全部動作。所以帶
  `Professional` 仍可能播到不是 Professional 的
  idle。
- `lower_body_pool`（presenter
  在手勢下共用的下半身動作）：只留帶該個性特質的動作；一支都沒有時為空陣列。空陣列也可能是沒有動作符合
  avatar
  的骨架，或組織關閉了下半身混合；這時手勢會播全身動作。
- `/presentation` 與
  `/motion-suggestion`
  建議的手勢：只選帶該個性特質的動作，沒有標個性特質的動作也排除。因此某些
  avatar 在某個個性特質下可能完全沒有手勢。

`facial_motions` 不受個性特質影響。

💡

**用語音支援的語言來挑 voice。**多語 Agent
需要一個 `languages` 涵蓋它所有會講語言的
voice。這個欄位用語言短碼
（`en`、`ja`、`zh`⋯），不是
`en-US` 這種 locale；完整的合法值清單是產生出來的
OpenAPI spec 裡的 `Language`
enum。想在伺服器端先過濾，把其中一個短碼傳給
`language` 篩選參數：

```bash
curl -X GET "$CONNECT_API_BASE/voices?language=ja" \
  -H "X-Connect-Key: pxc_..."
```
```
{
  "items": [
    {
      "id": "8f14e45f-...",
      "name": "Sakura",
      "description": null,
      "languages": ["ja"],
      "provider": "azure"
    }
  ],
  "total": 1,
  "page": 1,
  "size": 50,
  "pages": 1
}
```

這個回應只是一頁，不是全部。`page` 與
`size` 是查詢參數（`size` 預設
50、上限 100），`pages`
則告訴你這個篩選共有幾頁——要判斷「沒有 voice
支援某語言」之前，請把所有頁都讀完。

voice 沒有語言資料時，`languages`
會是空陣列——請當成「未知」，而不是「不支援任何語言」。

### Chatbots

| Method | Path | 用途 |
| --- | --- | --- |
| GET POST | `/chatbots` | 列出或建立 chatbot。建立時使用 `multipart/form-data`：`name`、選填 `custom_instructions`、`knowledge_file` 與 JSON 字串 `tools` 欄位。 |
| GET PATCH DELETE | `/chatbots/{chat_bot_id}` | 讀取、部分更新或 soft-delete chatbot。更新使用 `multipart/form-data`；使用 `remove_knowledge` 移除 knowledge file。 |
| POST | `/chatbots/{chat_bot_id}/chat` | 以 Connect parts 格式傳送 JSON 訊息歷程，取得可傳入 `presenter.present()` 的 `reply_text`。 |

### Credit

| Method | Path | 用途 |
| --- | --- | --- |
| GET | `/credit` | 讀取組織目前的 credit 用量——已用、總量、剩餘，以及當期起訖時間。只有 Secret 金鑰打得到；能力表見[取得 API 憑證](https://connect.perxona.ai/#credentials)。 |
