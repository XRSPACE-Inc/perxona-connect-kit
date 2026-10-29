## Troubleshooting

Server exits immediately:
*"PERXONA\_API\_BASE\_URL is required"*, or a message
naming one of the two Connect API keys

You haven't created `.env` or left a required
value blank. **Both keys are required** — one is
not enough, and the message names the one you left out. Run
`cp .env.example .env` and fill in the API base URL
and the two keys you created in the console. If your
`.env` still holds
`PERXONA_CONNECT_EMAIL`/`PERXONA_CONNECT_PASSWORD`, the message will say
so: that mode was removed, and this sample now authenticates
with API keys only.

Catalog fails to load — status shows `401` or
`403`

Three things do this, in rough order of likelihood. The
secret key was **revoked or has expired**. It has
an **allowed-domain list** configured — a
server-to-server request sends no `Origin`, so
every call is refused, and the error says only that the origin
is not allowed — it never names one, so do not go looking for
a hostname in it; leave that list empty on the secret key. Or
`PERXONA_API_BASE_URL` points at the wrong region.
The wrong key *type* is not one of them by itself:
reading the catalog needs only permissions both types carry,
so a publishable key in
`PERXONA_CONNECT_SECRET_KEY` usually still loads
the catalog fine — unless that publishable key also has an
allowed-domain list set, which this handbook tells you to do
before shipping. In that case the swap lands a
domain-restricted key where a server-to-server call never
sends an `Origin`, and every call fails with the
exact reason above. Check the two variables were not swapped
before you touch either key's domain list — emptying it would
make the symptom disappear while leaving an unrestricted
secret key in the browser. Check
`GET /api/health` — the `upstream` field
shows reachability.

Avatar doesn't appear after clicking Launch

Check the browser console for errors. Common causes: the
presenter engine failed to load (CORS error — verify
`PRESENTER_URL` with your Perxona contact), or
`initializeWithConnectKey()` rejected because the
selected avatar/scene IDs don't exist in your account.

Avatar appears but doesn't speak

Ensure `resumeAudioPlayback()` is called inside
the Launch button's click handler — not in a timer or after an
`await` that yields control back to the browser.
Browsers block autoplay triggered outside a synchronous user
gesture.

`npm install` fails with a Node version
error

This kit requires **Node `>=22`**. Run `node --version`. If using nvm, run
`nvm use` (reads `.nvmrc`) or
`nvm install 22`.

Chat panel doesn't appear

Set `LLM_API_KEY` in `.env` and restart
the server. The panel is hidden until the key is present —
`GET /api/config` will return
`chat: true` once it's set.

Chat suddenly fails with `400` (`code: 1003`) or `403` (`code: 14005`)

Error code `1003` means your organization's
credits have been exhausted, **or** its
subscription itself is no longer active (check the
`details` field to tell which) — it is
**not** a bad credential or a server error. Only
metered calls (chatbot conversations via
`POST /api/chatbots/:id/chat`) are affected;
catalog lookups, chatbot CRUD, and presentation calls continue
to work. Sign in to
[Perxona Console → Subscription](https://console.perxona.ai/asia/organization/subscription/)
(use the region matching your account) to review your usage
and top up credits, or your plan status. A
`403` (not `400`) from this same chat
endpoint is a different error —
`SUBSCRIPTION_NOT_ACTIVE` (`code: 14005`), meaning the organization has no subscription context at
all — not a bad credential either, despite the status code;
the fix is the same sign-in and Subscription check
above.
