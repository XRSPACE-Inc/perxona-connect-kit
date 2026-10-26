## Get Your API Credentials

Two things, in this order: a **Perxona account**,
then the **two Connect API keys** you create from
it. The keys are what your integration actually authenticates
with — the account only exists so you can sign in to the console
and issue them.

🔑

**Any sign-in method works.** Perxona Console and
Connect Kit share one account system, and since your
integration authenticates with keys rather than a password,
**Google Sign-In is fine** — you never need a
password for the sample. Motion Browser authenticates with a
Connect API key instead (see its own section below).

Sign up on the
**[Perxona console](https://console.perxona.ai/asia/auth/sign-up)**
and sign in. That account is what lets you create the two API
keys — the integration itself never uses your password.

⚠️

**There is no sign-up API.** Connect's
`signup`, `confirm-signup`,
`forgot-password` and
`reset-password` endpoints are deprecated and no
longer supported. Create your account on the console instead;
password recovery is on its sign-in page.

### Create Your Two API Keys

Sign in to the Perxona console with that account and open
**[Organization → Integration → Connect API keys](https://console.perxona.ai/asia/organization/integration/connect-api-keys/)**. Create **two** keys — they are not
interchangeable, and the form shows what each type can do before
you create it — the same breakdown is below:

| Create with type | Put it in | Allowed domains |
| --- | --- | --- |
| **Secret** | `PERXONA_CONNECT_SECRET_KEY` | **Leave empty.** See the warning below. |
| **Publishable** | `PERXONA_CONNECT_PUBLISHABLE_KEY` | Set them once you know where the page is served from. |

#### What Each Key Type Can Do

| Capability | Secret | Publishable |
| --- | --- | --- |
| Read assets (avatars, scenes, motions) | ✓ | ✓ |
| Read voices | ✓ | ✓ |
| Generate presentation | ✓ | ✓ |
| Generate TTS token | ✓ | ✓ |
| Upload assets (VRM upload) | ✓ | — |
| Chat with a bot | ✓ | — |
| Manage chat bots (create, update, delete) | ✓ | — |
| Read credit usage | ✓ | — |

![Perxona Console: Organization → Integration → Connect API keys page](assets/images/integration-page.png)

⚠️

**Each key is displayed once and never again.**
The console stores only a hash, so copy it into your
`.env` before closing the dialog. Lost one? Revoke
it and create another — there is no way to read it back.

⚠️

**Putting the wrong one in the wrong variable is
silent.**
Both keys share the same prefix and the upstream accepts
either in either slot, so a secret key pasted into
`PERXONA_CONNECT_PUBLISHABLE_KEY` runs without
error — it just means every visitor is now served a key that
can manage your chatbots. Check the type shown on the console,
not the string shape.

🌐

**Leave the secret key's allowed-domain list empty.**
A domain restriction is matched against the browser's
`Origin` header, and a server-to-server request
never sends one — so a secret key with domains configured is
refused on *every* call — and the error says only that
the origin is not allowed, never what it saw, because nothing
was sent. Domain restrictions belong on the publishable key,
which really is used by a browser. Enter a bare hostname — no
`https://`, port, or path. A leading
`*.` covers subdomains only, not the apex domain
itself — list both separately if your page can be served from
either (e.g. `example.com` and
`*.example.com`).

✓

Done. Put both keys in `.env` and follow
[Run the Express Sample](https://connect.perxona.ai/#quickstart), or go
straight to the
[Presenter component flow](https://connect.perxona.ai/#sdk-reference) to wire
them into your own application.
