## What Can You Build?

Connect Kit gets a talking 3D avatar on screen in under 15
minutes — and gives you a full platform to extend it as far as
you need. Here is what is available today and what is on the
roadmap.

1 — Out-of-the-Box

Everything you need for a lifelike avatar experience — ready
to deploy the moment you pick your configuration.

🧑‍🎨

#### Avatar Catalog

Curated cast of realistic humans, cartoon characters, and
VRM avatars. Pick one from the catalog and it's on-screen
in minutes.

🎙️

#### Voice — Azure & Google TTS

Rich, human-sounding voices from Azure and Google TTS.
Speech automatically drives the avatar's lip-sync — no
extra setup required.

🤖

#### Chatbot

Upload a knowledge file, wire simple tool calls, and pair
with the 3D Avatar for a fully voiced AI agent — no extra
backend required.

🌐

#### Built to Run Everywhere

Focus on building your product — we handle the rest. All
features run reliably on Chrome, Safari, and Edge across
desktop and mobile with no platform workarounds needed.

2 — Integration with Your Own

🧠

#### Bring Your Own LLM

Use any LLM. Embed motion cues inline via Markup Motion
Language so the avatar's body language matches the
conversation.

🔊

#### Bring Your Own Voice

Pass your own audio (an `ArrayBuffer` from any
TTS service or pre-recorded clip) directly via
`presenter.presentWithAudio()`. The avatar
lip-syncs to your audio and the Motion Director still
drives gestures and expressions from the text — no Perxona
TTS required.

🪆

#### Bring Your Own Avatar (VRM 1.0)

Upload a VRM 1.0 character to match your brand or audience
and make it speak.
Uploading is on hold for now — see
[VRM Uploader](https://connect.perxona.ai/#vrm-uploader).

3 — Presentation Engine

Real-time avatar performances that stream instantly — no large
file downloads, no video buffering, no game-engine install.
The avatar responds the moment you call
`present()`.

🎬

#### In-house Motion Director

The engine reads the text and selects matching body motion
and facial expressions automatically — the avatar's face
and body react to what it's saying.

✏️

#### Be your own Motion Director

Override motion timing at the sentence level using Markup
Motion Language — full creative control in plain text.

```js
// Presentation Engine — available now
const presenter = document.querySelector("sv-presenter");

button.addEventListener("click", async () => {
  await presenter.resumeAudioPlayback();
  await presenter.initializeWithConnectKey(connectKey, { avatarId, sceneId, voiceId });
  presenter.present("Hello world! I'm Perxona agent and I can talk to you.");
});
```

[→ Presenter Component](https://connect.perxona.ai/#sdk-reference)
