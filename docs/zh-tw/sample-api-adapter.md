## Express 範例 Adapter API

Express 伺服器公開以下路由。所有 `/api/*` 端點均回傳
JSON。伺服器以自己的 **secret** 金鑰、透過
`X-Connect-Key` header 將 catalog 讀取代理至 Connect
API——沒有登入步驟，也不需要每個請求的瀏覽器驗證。

🗺️

**下面每一個 `/api/*` 路由都是這個 sample 自己的
Express 伺服器**（`server.mjs`）——另一台獨立的 HTTP 伺服器，不是
Connect API 本身。你的瀏覽器連的是
`http://localhost:8083`（或你部署 sample
的位置）；接著呼叫[Connect API 參考](https://connect.perxona.ai/#api-reference)裡真正端點、並帶上 secret
金鑰的，是這台伺服器，不是瀏覽器。寫自己的後端代表要實作你自己那一版的這些路由，並直接呼叫[Connect API 參考](https://connect.perxona.ai/#api-reference)——不是重用這個 sample 的路徑。這頁唯一的例外是正下方的**直接呼叫 Connect API**，它會直接呼叫 Connect，完全繞過這台伺服器。

### 直接呼叫 Connect API

POST/api/v1/connect/presentation

產生單次 presentation payload。請從你的伺服器，以
**secret** 金鑰作為
`X-Connect-Key` header 直接呼叫 Connect
API；Express 範例伺服器不會代理此路由。必填欄位：
`avatar_id` 與 `message`；選填欄位：
`voice_id`、`emotion` 與
`intensity`。

```bash
curl -X POST "$CONNECT_API_BASE/presentation" \
  -H "X-Connect-Key: pxc_..." \
  -H "Content-Type: application/json" \
  -d '{
    "avatar_id": "YOUR_AVATAR_ID",
    "voice_id": "YOUR_VOICE_ID",
    "message": "Welcome to our hackathon demo!",
    "emotion": "excitement",
    "intensity": "high"
  }'
```

✨

`emotion` 指定訊息的情緒，`intensity`
指定情緒強度。兩者會引導建議動作的臉部表情選擇，並作為動作候選的軟性排序訊號。
兩者皆為選填；若兩者皆省略，則不會附加臉部表情。支援的
`emotion` 值為：`joy`、
`excitement`、`admiration`、
`caring`、`gratitude`、
`sadness`、`disappointment`、
`annoyance`、`embarrassment`、
`curiosity`、`surprise`、
`realization` 與 `confusion`；支援的
`intensity` 值為：`low`、
`neutral` 與 `high`。

### 健康檢查與設定

GET/api/health

存活檢查與上游診斷。始終回傳 `200`。回應：`{ status: "ok", upstream: "reachable" | "unreachable"
}`。每次呼叫都會探測上游 API。

GET/api/config

靜態的每個程序標誌。回應：`{ mock: boolean, chat: boolean, presenterUrl: string
}`。不探測上游——可低成本呼叫。`chat` 僅反映
`LLM_API_KEY` 的存在，不包含金鑰本身。

### Connect Key

GET/api/connect-key

把 **publishable** 金鑰交給瀏覽器。回應：`{ connect_key: string }`。直接傳入
`presenter.initializeWithConnectKey(connectKey, { avatarId,
sceneId, voiceId })`。這永遠不會是
`PERXONA_CONNECT_SECRET_KEY`——那把能對 chatbot
說話並管理它們，不該讓任何瀏覽器持有。`Cache-Control: no-store`。mock 模式下沒有金鑰可提供，回傳 `501`。

### 目錄

GET/api/avatars

列出 Avatar。回應：`Page { items: [{ id, name, thumbnail_urls, … }] }`。（`id` 從上游的
`avatar_id` 正規化。）

GET/api/avatars/:id

Avatar 詳細資訊（原始格式，含 `lod_urls`、`lipsync_configs`
等）。

GET/api/avatars/:id/motions

某個 Avatar 的動作。回應：`Page { items: […] }`。動作是 Avatar 的子資源——沒有頂層的 motions 集合端點。

GET/api/scenes

列出場景。回應：`Page { items: [{ id, name, … }] }`。（`id` 從 `scene_id` 正規化。）

GET/api/scenes/:id

場景詳細資訊。

GET/api/voices

列出聲音。回應：`Page { items: [{ id, name, … }] }`。

### Chatbot

GET/api/chatbots

列出所有 chatbot。回應：`Page { items: [{ id, name, status }] }`。

POST/api/chatbots

建立 chatbot。請求主體：`{ name: string（必填）, custom_instructions?: string,
tools?: Array }`。 回應：`ChatBotDetailResponse { id, name, status,
custom_instructions, tools }`。

GET/api/chatbots/:id

Chatbot
詳細資訊。回應：`ChatBotDetailResponse`（含
`id`、`name`、
`custom_instructions`、`status`、`tools`）。

PATCH/api/chatbots/:id

更新 chatbot。請求主體：部分欄位
`{ name?, custom_instructions?, tools? }`。
回應：更新後的 `ChatBotDetailResponse`。

DELETE/api/chatbots/:id

刪除 chatbot。回傳 `204 No Content`。

POST/api/chatbots/:id/knowledge

上傳 knowledge file。請求主體：`{ filename: string, content_base64: string, mime_type?:
string }`。
接受格式：`.txt`、`.pdf`、`.doc`、`.docx`、`.csv`（最大
1 MB）。 伺服器解碼 base64 後以 multipart 格式轉發至上游
API。切割與 embedding 會在此回應之後非同步進行——回應中的
`knowledge.status` 通常還是
`"processing"`；請輪詢
`GET /api/chatbots/:id`，直到它變成
`"ready"` 或 `"error"`。

DELETE/api/chatbots/:id/knowledge

移除 chatbot 的 knowledge file。

POST/api/chatbots/:id/chat

向 chatbot 傳送訊息。請求主體：`{ messages: Array }`——Connect parts 格式：
`[{ role: "user", parts: [{ type: "text", text: "…" }]
}]`。 回應：`{ id, status, reply_text }`。將
`reply_text` 傳入
`presenter.present()` 讓 avatar 發話。

### Chat

POST/api/chat

可選的 LLM 聊天。請求：`{ messages: Array }`（OpenAI 訊息格式）。在設定 `LLM_API_KEY` 前回傳
`501`。若 `messages` 為空或缺失則回傳
`400`。

📄

**完整合約：**上方列出的是 Express demo 的 proxy
API。如需 Connect API 本身精確的欄位格式與 schema，請參考
sample 目錄下的 OpenAPI
spec：`docs/openapi.yaml`。如需 TypeScript
presenter 型別，請安裝
`@perxona/presenter-types@latest`。
