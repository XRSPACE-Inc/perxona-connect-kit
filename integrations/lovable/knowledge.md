# Perxona avatar: project knowledge

Paste everything below the line into Lovable: **Project settings → Knowledge**. It keeps the
AI on the rules for every prompt in this project.

---

This app shows a talking 3D avatar from Perxona Connect Kit
(https://github.com/XRSPACE-Inc/perxona-connect-kit). The avatar is the `<sv-presenter>` web
component. It speaks any text with lip-sync and emotion when you call `present(text)`.

## Files to use

- Avatar component: copy
  https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/PerxonaAvatar.tsx
  into `src/components/PerxonaAvatar.tsx` unchanged. Do not write your own presenter loader.
- Perxona chatbot relay (only if the user wants a Perxona chatbot): copy
  https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/supabase/functions/perxona-chat/index.ts
  into `supabase/functions/perxona-chat/index.ts`.
- Full reference for agents: https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/llms-full.txt

## Two keys, one rule

- The **publishable** key (starts with `pxc_`) is meant to be public. Put it in
  `src/config/perxona.ts` as `export const PERXONA = { publishableKey: "pxc_...", region: "asia" }`.
  It can read the avatar catalog and make the avatar speak.
- The **secret** key (also starts with `pxc_`) must never appear in any file under `src/`, in
  chat, or in a commit. It is only needed to talk to a Perxona chatbot, and then it is stored
  as a Lovable Cloud secret named `PERXONA_CONNECT_SECRET_KEY` and read only by the
  `perxona-chat` edge function. If the user pastes a key into the chat, do not write it to a
  file; ask which type it is, and if it is the secret one, tell them to add it as a secret.
- Both keys look the same. Only the Perxona Console shows which is which.

## How the avatar works

1. Render `<PerxonaAvatar ref={avatar} publishableKey={PERXONA.publishableKey} region={PERXONA.region} />`
   in a container with a fixed height (for example `h-[480px]`) or an aspect ratio. It loads
   the first avatar, scene and voice in the catalog unless `avatarId`, `sceneId` and
   `voiceId` are given.
2. In every click or submit handler that leads to speech, call `avatar.current?.unlockAudio()`
   as the **first line, before any `await`**. Browsers allow sound only from a user gesture.
   The avatar can never speak on page load: start with a button such as "Start" or "Talk to me".
3. Get the reply text, then `await avatar.current?.speak(reply)`. `speak()` never throws; it
   returns `{ success, code, message }`.
4. While the reply is being generated, call `avatar.current?.setThinking(true)`.
5. Show the reply as text in the chat as well. Keep spoken replies short: 1 to 3 sentences.

## Giving the avatar a brain

Choose one. Ask the user if it is unclear.

- **Lovable AI (default, no extra keys):** create an edge function that calls Lovable AI with
  the persona as the system prompt and the conversation so far, and returns the reply text.
  Tell the model to answer in plain spoken sentences: no Markdown, no lists, no emoji.
- **Perxona chatbot:** the user created a chatbot (persona and knowledge file) in the Perxona
  Console. Use the `perxona-chat` edge function. It needs the Lovable Cloud secrets
  `PERXONA_CONNECT_SECRET_KEY` and `PERXONA_CHATBOT_ID`. Call it with
  `supabase.functions.invoke("perxona-chat", { body: { messages } })`, where `messages` is
  `[{ role: "user" | "assistant", text }]`, and speak `data.reply_text`.
- **Scripted:** the app already knows what to say (a guided tour, quiz questions, a story).
  Just call `speak()` with that text.

## Errors to handle

- Avatar status `error` with "Connect key rejected": the key is not the publishable one, or
  the current domain is not in the key's allowed domains. Tell the user to add
  `*.lovable.app` and `*.lovableproject.com` (and any custom domain) in the Perxona Console.
  Retrying does not help.
- `perxona-chat` returns `code` 1003 or 14005: the organization's Perxona credits or
  subscription need attention. Show: "The avatar's credits are used up. Please check the
  Perxona Console." Never show the raw error details; they contain the organization id.
- Avatar status `error` with "Avatar failed to start": the presenter reported `Failed` because
  the stage could not come up (for example, an avatar that will not load). Show the message
  and offer a reload.
- `speak()` returns `AUDIO_CONTEXT_UNAVAILABLE`: `unlockAudio()` did not run in a user gesture.

## Do not

- Do not call `https://console.perxona.ai/.../chatbots/...` from the browser.
- Do not send an `Authorization` header to the Perxona API. Only `X-Connect-Key`.
- Do not hardcode avatar, scene or voice IDs from examples. Leave them empty or use IDs the
  user gives you.
- Do not install an npm package for the presenter. There is none; the component loads it from
  `cdn.perxona.ai`.
