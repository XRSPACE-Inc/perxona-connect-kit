# Build a Perxona avatar app in Lovable

No code and no terminal. You describe the app; Lovable builds it with a talking 3D avatar.

| File | What it is |
| --- | --- |
| [`knowledge.md`](knowledge.md) | Rules to paste into Lovable's project Knowledge |
| [`PerxonaAvatar.tsx`](PerxonaAvatar.tsx) | The React avatar component Lovable copies into your app |
| [`supabase/functions/perxona-chat/index.ts`](supabase/functions/perxona-chat/index.ts) | Optional: relay to a Perxona chatbot, keeping the secret key on the server |

> [!TIP]
> **Got a template link from your organizer?** Skip steps 2 and 3. Do step 1, then:
>
> 1. Open the link and click **Remix**. You get your own copy; the original is not affected.
> 2. Tell Lovable: `Set the publishable key in src/config/perxona.ts to <YOUR_PUBLISHABLE_KEY>.`
>    If Lovable asks to turn on Lovable Cloud, accept. If **Project settings → Knowledge** is
>    empty, paste [`knowledge.md`](knowledge.md) there.
> 3. Make it yours with the prompts in step 4.
>
> Organizers: see [Publish a remixable template](#publish-a-remixable-template) at the end.

## 1 · Get your Perxona key <sub>~2 min</sub>

1. Sign up at [console.perxona.ai](https://console.perxona.ai) (free plan).
2. Avatar menu (top right) → **Management → Integration → Connect API keys**.
3. Create a **Publishable** key. Copy it: it is shown once.
4. In that key's **allowed domains**, add `*.lovable.app` and `*.lovableproject.com`.

You only need a **Secret** key for option C below (a Perxona chatbot). Leave its allowed
domains empty.

## 2 · Set up the Lovable project <sub>~2 min</sub>

1. Create a new project at [lovable.dev](https://lovable.dev).
2. **Project settings → Knowledge**: paste the contents of [`knowledge.md`](knowledge.md)
   (everything below its line).
3. Turn on **Lovable Cloud** when Lovable offers it. Options A and C need it for an edge function.

## 3 · Paste a starter prompt

Pick one. Replace the parts in `<angle brackets>`. Chinese prompts work too.

### A · Avatar + Lovable AI (recommended)

```text
Build a single-page app where a talking 3D avatar is the host.

Avatar: copy https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/PerxonaAvatar.tsx
into src/components/PerxonaAvatar.tsx unchanged, and create src/config/perxona.ts with
publishableKey "<YOUR_PUBLISHABLE_KEY>" and region "asia".

The avatar's persona: <You are Mia, a friendly barista who helps customers pick a coffee.>

Layout: the avatar large on the left, a chat panel on the right (stacked on mobile).
A "Start" button greets the visitor out loud. After that, each message the visitor sends
gets a reply from Lovable AI using the persona above, shown in the chat and spoken by the
avatar. Follow the project Knowledge for unlockAudio(), setThinking() and errors.
```

### B · Avatar only, scripted (no AI, fastest)

```text
Build <a 5-question quiz about our product> where a talking 3D avatar reads each question
aloud and reacts to the answer. Use the PerxonaAvatar component from the project Knowledge,
with publishableKey "<YOUR_PUBLISHABLE_KEY>" and region "asia". No AI calls: the questions and
reactions are written in the code. A "Start" button begins the quiz.
```

### C · Avatar + your Perxona chatbot (persona and knowledge file from the Console)

First, in Lovable Cloud **Secrets**, add `PERXONA_CONNECT_SECRET_KEY` (your secret key) and
`PERXONA_CHATBOT_ID` (the chatbot's ID). Never paste the secret key into the chat.

```text
Build a page where a talking 3D avatar answers visitors' questions through my Perxona chatbot.
Use the PerxonaAvatar component from the project Knowledge, with publishableKey
"<YOUR_PUBLISHABLE_KEY>" and region "asia". Copy the perxona-chat edge function from
https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/integrations/lovable/supabase/functions/perxona-chat/index.ts
unchanged; the secrets PERXONA_CONNECT_SECRET_KEY and PERXONA_CHATBOT_ID are already set.
Send the whole conversation as messages and speak reply_text.
```

## 4 · Make it yours

Follow-up prompts that work well:

- "Make the avatar sound more excited when the visitor gets an answer right."
- "Add three suggested questions under the chat as buttons."
- "Use avatar `<ID>`, scene `<ID>` and voice `<ID>`." (IDs from the Express sample's Studio
  or the Perxona Console)
- "Translate the UI to Traditional Chinese and tell Lovable AI to answer in Traditional Chinese."
  The voice must speak that language.

## Troubleshooting

| You see | Fix |
| --- | --- |
| "Connect key rejected" | You used the secret key, or the domain is not allowed. Check step 1.4. Reloading does not help. |
| The avatar moves but makes no sound | The first speech must come from a click. Ask Lovable: "call unlockAudio() first in the click handler". |
| "Avatar failed to start: … HTTP 401" | The key was mistyped or revoked. Create a new publishable key. |
| "Credits are used up" | Check **Subscription** in the Perxona Console. |
| Black box, nothing loads | Wrong region. Use `"eu"` if your Console URL contains `/eu`. |

Lovable cannot open a link? Paste the file's contents into the chat instead of the URL.

## Publish a remixable template

For organizers, once. Participants then start from your link instead of from an empty project.

1. **Build it.** Do steps 1 to 3 above with prompt **A**, and a simple persona such as
   `You are a friendly assistant.` Check that the avatar speaks.
2. **Add a setup screen.** Paste this prompt:

   ```text
   When publishableKey in src/config/perxona.ts is the placeholder "pxc_YOUR_PUBLISHABLE_KEY",
   do not load the avatar. Show a setup card instead: "Add your Perxona publishable key to start.
   Get one at console.perxona.ai → avatar menu → Management → Integration → Connect API keys,
   then tell Lovable: Set the publishable key in src/config/perxona.ts to <your key>."
   Then set publishableKey back to "pxc_YOUR_PUBLISHABLE_KEY".
   ```

   Check that the setup card now shows instead of the avatar.
3. **Turn on remixing.** **Project settings → Sharing → Public remixing**: on. Copy the project link.
4. **Share the link** with participants, for example in the hackathon guide.

> [!IMPORTANT]
> Remix copies all the code. If your own key is still in `src/config/perxona.ts`, every copy
> spends **your** credits. Step 2 puts the placeholder back; check it before step 3.
> Lovable Cloud secrets are not copied, so a secret key never travels with a remix.

Each remix copies the version that exists at that moment. Changes you make afterwards do not
reach copies already made.
