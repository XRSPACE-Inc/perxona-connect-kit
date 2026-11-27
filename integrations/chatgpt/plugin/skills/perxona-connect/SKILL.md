---
name: perxona-connect
description: Build apps and AI agents with a talking 3D avatar using Perxona Connect Kit (the <sv-presenter> web component and the Perxona Connect API). Use when the user wants to add a Perxona avatar, give an AI agent a face or voice, build a talking-avatar app, wire present() / initializeWithConnectKey(), handle Connect API keys, or build on the perxona-connect-kit repo, its Express sample, or its Lovable starter.
---

# Perxona Connect Kit

Perxona gives an AI agent a face: a 3D avatar that speaks any text with lip-sync, emotion and
gestures. The browser part is the `<sv-presenter>` web component; the server part is the Connect
API. Repo: https://github.com/XRSPACE-Inc/perxona-connect-kit

Full reference when you need exact fields:
https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/llms-full.txt

## The one rule: two keys

| Key | Where it lives | Can do |
| --- | --- | --- |
| **Publishable** | Browser. Meant to be readable. | Read avatars, scenes, voices, motions. Make the avatar speak. |
| **Secret** | Server only. Never in frontend code, chat, logs or a commit. | Everything above, plus chat with or manage Perxona chatbots, read credit usage. |

- Both start with `pxc_` and look identical. The upstream accepts either in either slot, so a
  swap fails silently. Only the Perxona Console shows the type.
- Never ask the user for a key. Write code with a placeholder (`pxc_YOUR_PUBLISHABLE_KEY`, as
  in the starter page) or an environment variable (`PERXONA_CONNECT_SECRET_KEY`,
  `PERXONA_CONNECT_PUBLISHABLE_KEY`), and tell the user where to put each key (see "First-time
  setup" below). If they paste a key into the chat anyway, do not repeat it or write it to a
  file; ask which type it is. If it is publishable, keep the placeholder and tell them the exact
  line to paste it into. If it is secret, tell them to revoke it in the Console and create
  another.
- Leave the **secret** key's allowed domains empty (server calls send no `Origin`, so a
  restricted secret key fails every call). Restrict the **publishable** key's domains before
  sharing a page: `*.example.com` covers subdomains only, not the apex.
- Keys are created in the Perxona Console: avatar menu (top right) → Management → Integration →
  Connect API keys. Each is shown once.
- Auth header is `X-Connect-Key: <key>`. Never also send `Authorization`: the API answers 400.

## Pick the path

Fetch the starter files below and keep their logic; do not rewrite the loader. If you cannot
fetch one, give the user its link and say which lines to change.

1. **A single page, no backend** (a file the user downloads, a static site, a prototype): start
   from
   <https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/starter/avatar.html>.
   Only the `PERXONA` settings at the top of its script change: region, publishable key, and
   optional avatar, scene and voice IDs.
2. **An existing web app** (React, Vite, Next.js) that already has a chat route: add the avatar
   to the frontend with only the publishable key, from
   <https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/PerxonaAvatar.tsx>.
   Pass `publishableKey` and `region` as props, and speak the text the app's own route already
   returns. In the Next.js App Router, add `"use client";` as the file's first line. No secret
   key is needed unless the brain is a Perxona chatbot.
3. **No code: Lovable.** Send the user to
   <https://github.com/XRSPACE-Inc/perxona-connect-kit/blob/main/integrations/lovable/README.md>.
   It has the Knowledge text to paste, the remix-a-template route and ready-to-paste starter
   prompts. Its default brain is Lovable AI, which needs no Perxona secret key.
4. **A Perxona chatbot as the brain, with no server of their own:** a serverless relay holds
   the secret key. Lovable is the easiest host (option C in the Lovable guide). Elsewhere, port
   https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/supabase/functions/perxona-chat/index.ts
   (a Supabase/Deno function) to the host's serverless functions. The page sends the relay
   `POST { messages: [{ role: "user" | "assistant", text }] }` and speaks `reply_text` from the
   response. In Lovable that call is
   `supabase.functions.invoke("perxona-chat", { body: { messages } })`.
5. **Starting fresh with a server** (a coding agent working in their repo): clone the kit, run
   `samples/express`, and scaffold from `samples/express/public/demos/embed/` (about 170 lines).
   Read `samples/express/AGENTS.md` first. Do not fork `demos/studio/`: it is a tool of about
   1200 lines, not a template.

A chat app's built-in preview (such as a canvas) usually cannot load the presenter engine from
`cdn.perxona.ai`. Write a complete `.html` file for the user to download and open or host, and
say so.

## First-time setup: walk the user through it

Most users arrive with no account and no key. Along with the code, give them only the steps
their path needs, as a short numbered list with these links:

1. **Account.** Sign up at https://console.perxona.ai/asia/auth/sign-up (Google sign-in works).
   A new account is on the Free Plan. Credits run out only for Perxona chatbot replies; making
   the avatar speak keeps working.
2. **Keys.** Open
   https://console.perxona.ai/asia/organization/integration/connect-api-keys/ (avatar menu, top
   right → Management → Integration → Connect API keys) and create:
   - a **Publishable** key, for every path. Its allowed domains can stay empty while the user
     tests a downloaded file on their own computer. Before sharing the page, add its host: for
     Lovable, `*.lovable.app` and `*.lovableproject.com`, plus any custom domain.
   - a **Secret** key, only for a Perxona chatbot or the Express sample. Leave its allowed
     domains empty.

   Each key is shown once, so the user copies it before closing the dialog. A lost key cannot
   be read back: revoke it and create another.
3. **Where each key goes.** Write the placeholder and tell the user where to paste the real key:

   | Where the code runs | Publishable key | Secret key |
   | --- | --- | --- |
   | One HTML file | `publishableKey` in the file, replacing `pxc_YOUR_PUBLISHABLE_KEY` | Not used |
   | The user's own web app (React, Vite, Next.js) | A config file, or a public build variable (`VITE_…`, `NEXT_PUBLIC_…`) | A server-only environment variable, never a `VITE_`/`NEXT_PUBLIC_` one |
   | Lovable | `src/config/perxona.ts` | Chatbot only: Lovable Cloud secrets `PERXONA_CONNECT_SECRET_KEY`, `PERXONA_CHATBOT_ID`, and `PERXONA_REGION` = `eu` for an EU account |
   | A page plus the relay template on another serverless host | In the page, as for one HTML file | The host's secret store, with the same names |
   | Express sample | `.env`: `PERXONA_CONNECT_PUBLISHABLE_KEY` | `.env`: `PERXONA_CONNECT_SECRET_KEY` (required) |

4. **Region.** It is the segment after the host in the user's Console address:
   `console.perxona.ai/asia/…` or `console.perxona.ai/eu/…`. The links above are for `asia`;
   swap in `eu` for an EU account. The code's `region` must match, and so must the relay's
   `PERXONA_REGION`, which defaults to `asia`.
5. **Chatbot ID** (only with a Perxona chatbot, created in the Perxona Console or the Express
   sample's Studio). The user runs this in their own terminal, with the secret key in the
   variable, and copies the ID of the chatbot they want:
   `curl -H "X-Connect-Key: $PERXONA_CONNECT_SECRET_KEY" https://console.perxona.ai/asia/api/v1/connect/chatbots`

## Integration, in order

```js
// 1. Region must match the user's Console account: "asia" or "eu". API and engine must agree.
const API = `https://console.perxona.ai/${region}/api/v1/connect`;
const PRESENTER_URL = `https://cdn.perxona.ai/${region}/prod/connect/latest/widget/entry/presenter.js`;

// 2. Declare <sv-presenter> in the DOM, then load the engine ONCE as a module script.
//    There is no npm runtime package (@perxona/presenter-types is types only).
//    The engine defines the element a moment AFTER its script's onload fires, so wait:
await customElements.whenDefined("sv-presenter"); // else initializeWithConnectKey is undefined

// 3. Listen BEFORE initializing: Ready and Failed are only ever events. Failed arrives AFTER
//    initializeWithConnectKey() resolves, when the stage cannot come up; e.detail.message says why.
presenter.addEventListener("PRESENTER_STATUS", (e) => {
  if (e.detail.status === "Ready") enableUi();
  if (e.detail.status === "Failed") showError(e.detail.message); // initialize again to retry
});
presenter.addEventListener("CONNECT_KEY_REJECTED", () => showKeyError()); // never retry

// 4. Target: avatar + scene go together; present() needs a voice. If the user gave no IDs,
//    read the first of each with the publishable key:
//    GET /assets/avatars → items[].avatar_id, GET /assets/scenes → items[].scene_id,
//    GET /voices → items[].id   (paged: ?page=&size=, size max 100)
await presenter.initializeWithConnectKey(publishableKey, { avatarId, sceneId, voiceId });

// 5. In the click/submit handler, FIRST, before any await:
await presenter.resumeAudioPlayback();
// 6. Then get the reply from any brain and speak it.
const result = await presenter.present(replyText);
if (!result.success) console.warn(result.code, result.message);
```

Facts that cause most bugs:

- An avatar that speaks on page load cannot exist. Until `resumeAudioPlayback()` has run from a
  user gesture, `present()` returns `AUDIO_CONTEXT_UNAVAILABLE`. Put a Start/Talk button first.
- `present()` never rejects. Always check `result.success`. It resolves when queued; wait for
  the `ALL_PERFORMANCE_FINISHED` event to know speech ended.
- `presenter.setThinking(true/false)` shows a thinking pose while the agent works.
- `presenter.interruptPresentation()` stops speech and clears the queue.
- `presenter.playMotion(motionId)` plays one motion now. Motion IDs come from
  `GET /assets/avatars/{id}/motions`; IDs not in that list do nothing.
- `presenter.presentWithAudio(arrayBuffer, text)` plays your own TTS audio with lip-sync.
- Transparent background comes only from a scene tagged `background:transparent`.
- The speech token refreshes inside the widget. The Connect key itself is never refreshed.

## Giving it a brain

The avatar only needs text. Any of these:

- The user's own LLM or agent, called from their backend: `present(await agent(message))`.
- In Lovable, Lovable AI through an edge function. It needs no extra keys.
- A **Perxona chatbot** (persona plus knowledge file, created in the Console or Studio):
  server-side `POST {API}/chatbots/{id}/chat` with the **secret** key, body
  `{ messages: [{ role: "user" | "assistant", parts: [{ type: "text", text }] }] }`,
  response `{ reply_text }`. Never call it from the browser. The relay template takes the
  simpler `{ role, text }` messages and converts them to this format.
- Scripted text the app already has.

Ask the LLM for plain spoken sentences (no Markdown, lists or emoji) and keep replies to one to
three sentences: everything in the reply is read aloud.

## Errors

- HTTP 400 `code: 1003`: credits exhausted or subscription not valid. HTTP 403 `code: 14005`:
  no subscription. Show a fixed, friendly sentence pointing to the Console's Subscription
  page; never show `details` (it contains the organization id). Only chatbot chat is metered.
- `CONNECT_KEY_REJECTED`: the key is revoked, expired, restricted to other domains, or was never
  granted the scope. Fix it in the Console. A secret key in a page is not rejected: it works
  and leaks, so check the type in the Console.
- A voice must speak the reply's language: `GET /voices?language=ja` (short codes, never
  `ja-JP`). An empty `languages` array means unknown, not none.

## Security checklist before you finish

- [ ] No secret key in any browser file, bundle, `VITE_*`/`NEXT_PUBLIC_*` variable, or commit.
- [ ] `.env` is git-ignored; `.env.example` lists variable names only.
- [ ] Routes that use the secret key are not publicly reachable without authorization, or the
      user knows they spend credits (fine for a hackathon demo, not for production).
- [ ] The publishable key's allowed domains are set for the deployed host.
