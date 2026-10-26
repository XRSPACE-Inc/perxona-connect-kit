## Connect API Reference

Connect API is the server-facing half of the kit. Unless noted
otherwise, the paths below are relative to your regional base
URL, for example
`https://console.perxona.ai/asia/api/v1/connect`.
Authenticate protected calls with a Connect API key, sent as an
`X-Connect-Key` header.

🗺️

**This is the real Connect API** — the one your
own backend calls, at `console.perxona.ai`. The
Express sample later in this handbook wraps some of these
endpoints behind its own `/api/*` routes, on a
second, separate server — see
[Express Sample Adapter API](https://connect.perxona.ai/#sample-api-adapter)
for those. If you are writing your own backend, call the
endpoints on this page directly; you do not need the sample's
routes.

💡

Send `X-Connect-Key: <your key>` on every
protected call — see
[Get Your API Credentials](https://connect.perxona.ai/#credentials) for how to
create one.

⚠️

**Never send both headers on one request.** The
API rejects `X-Connect-Key` and
`Authorization: Bearer` together with
`400`, whether you are migrating off the legacy
header or testing both.

### Usage and Subscription

⚠️

Connect Kit sign-ups are treated as Perxona Console
`Free Plan` users by default. If that
organization's credits are exhausted,
**or its subscription itself is no longer active**, metered calls — currently
`POST /api/chatbots/:id/chat` (chatbot
conversations) — fail with the same HTTP
`400` and `code: 1003`, with a body
like one of these:

```
{"code": 1003, "details": "credit_points exhausted for org_id: ..."}
```
```
{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}
```

The `details` field is what tells the two apart.
A third, separate case — no subscription record exists for
the organization at all — fails with HTTP
`403` and `code: 14005` instead:

```
{"code": 14005, "details": "No active subscription found for org_id: ..."}
```

Non-metered calls (catalog lookups, chatbot CRUD,
presentation) are **not** affected.

To check your current usage or top up credits, sign in to
[Perxona Console → Subscription](https://console.perxona.ai/asia/organization/subscription/)
(use the region matching your account). If you are building
your own app on top of the Connect API, consider detecting
`code: 1003` and `code: 14005` in the
response and showing your users a friendly message — the
sample demos in this kit show this pattern for
`1003`; the same approach applies to
`14005`.

💡

**Credit is your organization's shared usage meter, not
scoped to Connect.**
The metered calls described above (chatbot conversations)
draw from the same org-wide pool as any other billable
conversation traffic on your account. Check your
organization's current usage with a
**Secret** key:

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

These numbers refresh roughly every 10 minutes — a
background worker recalculates usage rather than updating it
on every metered call, so checking right after a
conversation may not reflect it yet.

This endpoint is **Secret-key only** — a
Publishable key gets `403`, same as every other
capability a browser-facing key doesn't hold (see the
capability table in
[Get Your API Credentials](https://connect.perxona.ai/#credentials)).

⚠️

**Authorization: Bearer authentication is deprecated, and
Connect's self-service sign-up and password recovery are no
longer supported.**
Use a Connect API key instead, and create your account on the
console — see
[Get Your API Credentials](https://connect.perxona.ai/#credentials) for
both.

### Avatar and Scene Catalog

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/assets/avatars` | List active avatars available to the authenticated organization. |
| GET | `/assets/avatars/{avatar_id}` | Read avatar detail, including its runtime configuration. |
| GET | `/assets/avatars/{avatar_id}/motions` | List motions compatible with the avatar; filter by `pose_tag` or `motion_ids` when needed. |
| GET | `/assets/scenes` `/assets/scenes/{scene_id}` | List active scenes or read one scene's detail. |
| POST | `/assets/vrm/upload` | Upload a `.vrm` file as multipart form data and publish it as an active avatar. Requires a **secret** key. Fields: `vrm_file`, `skeleton_type`, and optionally `avatar_name` and `lipsync_mode`. Returns the new `avatar_id`. See [VRM Uploader](https://connect.perxona.ai/#vrm-uploader) for the script that checks a file before sending it. **Uploading is on hold for now** — that section explains why. |

### Voices and Presentation

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/voices` `/voices/{voice_id}` | List custom voices or read a voice's public synthesis details. Each voice carries a `languages` array of the languages it speaks, as short codes (`en`, `ja`, … — never locales like `en-US`). The list supports `language` and `provider` filters; see the callout below this table. |
| POST | `/voice-tokens/tts` | Issue a provider TTS token for JSON body `{ voice_id }`. Normal `<sv-presenter>` speech manages this runtime step for you. |
| POST | `/presentation` | Generate a one-shot presentation payload. Send `avatar_id` and `message`; `voice_id`, `emotion`, and `intensity` are optional. |

💡

**Pick a voice by the languages it speaks.**
A multilingual agent needs a voice whose
`languages` cover every language it will speak.
The field uses short language codes (`en`,
`ja`, `zh`, …), never locales like
`en-US`; the full list of valid codes is the
`Language` enum in the generated OpenAPI spec. To
narrow the list server-side, pass one of those codes as the
`language` filter:

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

That body is one page, not the whole catalogue.
`page` and `size` are query parameters
(`size` defaults to 50, maximum 100), and
`pages` tells you how many pages the filter
matched — keep requesting pages until you have read them all
before concluding that no voice speaks a language.

A voice with no recorded language data returns an empty
`languages` array — treat that as "unknown", not
"supports nothing".

### Chatbots

| Method | Path | Purpose |
| --- | --- | --- |
| GET POST | `/chatbots` | List chatbots or create one. Creation uses `multipart/form-data`: `name`, optional `custom_instructions`, `knowledge_file`, and a JSON-string `tools` field. |
| GET PATCH DELETE | `/chatbots/{chat_bot_id}` | Read, partially update, or soft-delete a chatbot. Updates use `multipart/form-data`; use `remove_knowledge` to remove its knowledge file. |
| POST | `/chatbots/{chat_bot_id}/chat` | Send a JSON message history in the Connect parts format and receive `reply_text`, which can be passed to `presenter.present()`. |

### Credit

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/credit` | Read the organization's current credit usage — used, total, remaining, and the current period's start/end. Secret-key only; see [Get Your API Credentials](https://connect.perxona.ai/#credentials) for the capability breakdown. |
