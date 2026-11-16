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
  swap fails silently. Only the Perxona Console shows the type. When the user hands you a key,
  ask which one it is.
- Leave the **secret** key's allowed domains empty (server calls send no `Origin`, so a
  restricted secret key fails every call). Restrict the **publishable** key's domains before
  sharing a page: `*.example.com` covers subdomains only, not the apex.
- Keys are created in the Perxona Console: avatar menu (top right) → Management → Integration →
  Connect API keys. Each is shown once.
- Auth header is `X-Connect-Key: <key>`. Never also send `Authorization`: the API answers 400.

## Pick the path

1. **The user has a server or can run Node** (Claude Code in their repo): clone the kit, run
   `samples/express`, and scaffold from `samples/express/public/demos/embed/` (about 170
   lines). Read `samples/express/AGENTS.md` first. Do not fork `demos/studio/`: it is a tool
   of about 1200 lines, not a template.
2. **No backend** (static page, Lovable, a hackathon prototype, a file the user downloads):
   use the publishable key directly in the page. Start from
   https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/starter/avatar.html
   (plain HTML) or
   https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/PerxonaAvatar.tsx
   (React). Fetch the file and keep its logic; do not rewrite the loader.
3. **They need a Perxona chatbot without a server of their own**: a serverless relay holds
   the secret key. Template:
   https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/supabase/functions/perxona-chat/index.ts
   (Supabase/Deno; port it to the user's platform if needed).

In a chat app (a claude.ai artifact or ChatGPT canvas), the preview usually cannot load the
presenter engine from `cdn.perxona.ai`. Write a complete `.html` file for the user to download
and open or host, and say so. For a no-code builder, suggest Lovable (`integrations/lovable/README.md` in the repo).

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
- A **Perxona chatbot** (persona plus knowledge file, created in the Console or Studio):
  server-side `POST {API}/chatbots/{id}/chat` with the **secret** key, body
  `{ messages: [{ role: "user" | "assistant", parts: [{ type: "text", text }] }] }`,
  response `{ reply_text }`. Never call it from the browser.
- Scripted text the app already has.

Ask the LLM for plain spoken sentences (no Markdown, lists or emoji) and keep replies to one to
three sentences: everything in the reply is read aloud.

## Errors

- HTTP 400 `code: 1003`: credits exhausted or subscription not valid. HTTP 403 `code: 14005`:
  no subscription. Show a fixed, friendly sentence pointing to the Console's Subscription
  page; never show `details` (it contains the organization id). Only chatbot chat is metered.
- `CONNECT_KEY_REJECTED`: revoked, expired, wrong domain, or wrong key type. Fix in the Console.
- A voice must speak the reply's language: `GET /voices?language=ja` (short codes, never
  `ja-JP`). An empty `languages` array means unknown, not none.

## Security checklist before you finish

- [ ] No secret key in any browser file, bundle, `VITE_*`/`NEXT_PUBLIC_*` variable, or commit.
- [ ] `.env` is git-ignored; `.env.example` lists variable names only.
- [ ] Routes that use the secret key are not publicly reachable without authorization, or the
      user knows they spend credits (fine for a hackathon demo, not for production).
- [ ] The publishable key's allowed domains are set for the deployed host.
