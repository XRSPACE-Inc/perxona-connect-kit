# Embed Demo

What the Connect Kit looks like once it is live: a product site with an avatar
answering questions on it.

There is no catalog, no picker, no settings panel — and, deliberately, nothing
anywhere on the page about its own configuration. A real site does not explain
its setup to visitors, so this one doesn't either. Everything the widget needs
arrives resolved from `GET /api/config`.

Open <http://localhost:8083/demos/embed/>. Live credentials are required, and
the account needs at least one chatbot — mock mode can supply neither.

**A new Connect organization has no chatbots**, so on a first run start with
the [Studio demo](../studio/): it opens its create form prefilled, and pressing
Save is enough. Come straight back — the next page load picks it up, no restart
needed. The sample's landing page says the same thing while it applies.

## Configuration (all of it optional)

```sh
# Blank is fine. What the server picks instead:
DEMO_FIXED_AVATAR_ID=...    # → first avatar in your catalog
DEMO_FIXED_SCENE_ID=...     # → first scene
DEMO_FIXED_VOICE_ID=...     # → first voice
DEMO_FIXED_CHATBOT_ID=...   # → first chatbot that is not disabled
```

Leave them blank and the server picks the first avatar, scene, voice and
chatbot in your account — skipping any chatbot marked `disabled`, which would
accept the selection and then reject every message — so this runs on a fresh
clone with nothing configured.
Set them to pin your own, which is what a real integration does — that is the
shape your app's config would take once you have made those choices.

Two details worth knowing:

- **A voice is part of the auto-pick but not of the pinned path.** `present()`
  fails with _"the resolved target has no configured voice"_ without one, so an
  auto-picked target always has one. A blank `DEMO_FIXED_VOICE_ID` alongside a
  pinned avatar/scene means something different: you are choosing BYO-TTS, and
  supplying audio through `presentWithAudio()` yourself. An explicit blank is a
  choice; no configuration at all is not.
- **Setting only one of avatar/scene ignores the pair** and falls back to the
  auto-pick. The server says so at startup.

## Where the errors went

None of the specifics are reported to the page — not which value was picked,
not which value is missing, not why playback failed. All of that goes to the
server log at startup and to `console.error` in the browser. The one thing the
page itself will say, if `start()` rejects or the stage fails, is a fixed sentence
in the stage — "This assistant isn't available right now" — in place of the
loading placeholder, so a visitor sees a page that explains itself rather than
a slot that silently never fills in.

The specifics staying off the page is the point, not an oversight. A demo
whose lesson is "here is how you configure it" should show its configuration.
A demo whose lesson is "here is what it looks like live" must not, because a
real site doesn't — and a visitor who sees `DEMO_FIXED_AVATAR_ID` on a product
page has learned the wrong thing about what shipping this looks like. The
honesty lives here and in the log, where the operator is; the one sentence on
the page is for the visitor, and it says only that something is wrong, never
what.

## The whole integration

```js
// Subscribe before anything can await — see "Why the order matters" below.
presenter.addEventListener("PRESENTER_STATUS", (event) => {
  if (event.detail?.status === "Failed") showStageError(event.detail.message);
  if (event.detail?.status !== "Ready") return;
  document.getElementById("stage-loading").remove(); // drop the placeholder
  chatPanel.hidden = false;
  appendMessage("assistant", GREETING); // written, not spoken — see below
});

const config = await request("/api/config");
await loadPresenterEngine(config.presenterUrl);
const { connect_key } = await request("/api/connect-key");
await presenter.initializeWithConnectKey(connect_key, config.fixedTarget);

// Then, per message. config.chatbotId is null on an account with no chatbot
// Embed can use (disabled and app-managed ones are skipped),
// which is why start() refuses to bring the widget up at all in that case —
// there is nothing to converse with, so the stage shows the fixed
// "not available" sentence instead of the chat.
await presenter.resumeAudioPlayback(); // once, on the first send
const { reply_text } = await request(`/api/chatbots/${config.chatbotId}/chat`, {
  method: "POST",
  body: { messages: toConnectMessages(history) },
});
await presenter.present(reply_text);
```

This is the shape, not a transcript — `app.js` is 171 lines because it also
handles the states this leaves out: an unresolvable config, a presenter engine
that will not load, a reply that never arrives. Read it top to bottom; nothing
in it is far from what is above.

The stage shows a placeholder until `Ready` and the chat opens with a written
greeting, because the alternative is a black rectangle and then an empty box —
both read as broken rather than as a widget waiting for you. The greeting is
written rather than spoken for the reason in the next section: nothing can be
spoken before you have said something first.

## Why the order matters

Every handler is attached **before** the first `await`. `PRESENTER_STATUS` is
the only way to learn the presenter is ready, or that its stage failed —
nothing exposes a status to read back — so one fired while the listener is
still an `await` away is lost for
good. Worse, a rejection during top-level `await` aborts module evaluation
outright: register the chat form's handler after it and a CDN failure leaves
you with a page that renders perfectly and does nothing at all. The bootstrap
here is a `start()` called last, with its rejection caught.

## Why sending a message is what unlocks the audio

**An avatar that talks on page load cannot exist.** `present()` resolves with
`AUDIO_CONTEXT_UNAVAILABLE` until `resumeAudioPlayback()` has run at least
once, and the SDK never resumes the AudioContext on your behalf — browser
autoplay policy means that only works from a real user gesture.

A live site cannot have an "enable audio" button, and it does not need one:
sending the first message _is_ a gesture. So the unlock happens in the submit
handler, before the first `present()`. The first thing you say is what
authorises the first thing it says back.

Two more things `present()` will not tell you loudly:

- It **resolves** with `{ success: false, code, message }` instead of
  rejecting. An unchecked call fails silently — this demo checks, and logs.
- It resolves when the performance is **queued**, not when it has been spoken.
  If you need to know when speech ends, listen for `ALL_PERFORMANCE_FINISHED`
  (the Studio demo does, to keep its send button locked).

## Where to go next

The [Studio demo](../studio/) is the other side of the same SDK: the console
you configure this from — catalog pickers, chatbot CRUD, knowledge files,
function tools, interrupt, a live event timeline, and a switch between a
Connect-hosted chatbot and your own LLM.
