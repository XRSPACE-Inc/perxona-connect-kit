## Studio

![Perxona Connect Kit: Studio demo example](assets/images/studio-example.png)

The `demos/studio/` demo is the other end of the
range: you are building the application itself. On top of the
shared integration above it adds catalog pickers, full chatbot
**CRUD**, a persistent
**multi-turn conversation**, and
**knowledge files** plus
**function tools**. Every assistant reply is piped
into `presenter.present()`, so the avatar speaks each
response in real time. A **source switch** chooses
who runs the language model — a Perxona-hosted Connect chatbot,
or your own `LLM_API_KEY` — and you can flip it
mid-conversation: the history is kept provider-neutral as
`{ role, text }` and converted at the call site, so
the same conversation carries over to the other provider. Open
`http://localhost:8083/demos/studio/`. Here is the
lifecycle:

1. **Launch the presenter.** Pick an Avatar, Scene,
   and Voice, then click **Launch Presenter**. That
   click is also what calls
   `presenter.resumeAudioPlayback()` — browser
   autoplay policy requires a direct user gesture before any
   audio can start.
2. **Choose who runs the model.** The source switch
   offers **Connect chatbot** and
   **Own LLM**. Own LLM stays disabled until
   `LLM_API_KEY` is set — `GET /api/config`
   reports whether it is available, never the key itself.
3. **Create or select a chatbot.** With the Connect
   source selected, click **+ New Chatbot**, enter a
   name and optional system instructions, and click
   **Save**. The chatbot is created via
   `POST /api/chatbots` and immediately selected. To
   edit or delete an existing chatbot, pick it from the dropdown.
   The Own LLM source needs none of this — it has no server-side
   object to manage.
4. **Chat.** Type a message and press Send. The
   avatar enters Thinking state while the model works —
   `POST /api/chatbots/:id/chat` for the Connect
   source, `POST /api/chat` for your own key. The
   reply appears in the chat log and is spoken aloud via
   `presenter.present(reply)`. If the presenter is not
   yet launched, chat still works as text-only.
5. **Optional — Knowledge file & function tools.**
   Upload a `.txt`, `.pdf`,
   `.doc`, `.docx`, or
   `.csv` file in the chatbot editor to ground the
   chatbot in your own content. Chunking and embedding happen
   asynchronously and can take anywhere from a few seconds to a
   few minutes — Studio polls the chatbot's status and updates
   the badge live, no reload needed. Add a `tools`
   array when creating or updating a chatbot to let it call
   external HTTP APIs during a conversation. Both are
   Connect-hosted features; switching to Own LLM leaves them
   behind, which is the trade the switch exists to show.
