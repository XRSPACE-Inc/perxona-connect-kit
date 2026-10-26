## Motion Browser

Motion Browser is a standalone developer tool for customizing
avatar motion — a wave on a greeting, a bow on "thank you". It
solves the part you cannot do by guessing: browse the full
motion catalog, preview each one live on a 3D avatar, and
compose a script that mixes free speech text with motion cues
until it reads and looks right. Then you
**export it** to an AI coding assistant, which
wires the whole thing into your own project — Motion Browser's
own code is never part of what you ship; see "Exporting to an AI
Coding Assistant" below for how that handoff works.

The **core idea**: the
`<sv-presenter>` Web Component understands
inline motion tags. Drop a `[MOTION id:1]` chip
anywhere in your script, and the avatar performs that animation
at exactly that point in the speech.

```js
// The avatar says "I love", performs the wave motion, then finishes the line
await presenter.present("I love [MOTION wave:1] my avatar.");
```

💡

The Script Composer has a **Play** button that
previews the script live inside Motion Browser. Once it reads
and looks right, use the **Export**
button in the top header to hand your avatar, scene, voice,
and script off to an AI coding assistant working on your own
project.

### Demo

[](assets/videos/motion-browser-demo.mp4)
[↗ Open the live Motion Browser](/motion-browser/)

### Features

- **Avatar Preview** — Full-screen 3D rendering;
  switch characters instantly from the top selector.
- **Motion Library** — Browse, search, and filter
  every available motion. Click any card to preview it live on
  the avatar.
- **Script Composer** — Rich-text editor where you
  mix free speech text with motion chips. Press
  **Play** to preview it here.
- **Export** — Header button that copies your
  current avatar, scene, voice, and script to your clipboard as
  one prompt, ready to hand to an AI coding assistant.
- **Scene & Voice switching** — Bottom control
  bar lets you swap scene and voice style without reloading.

### Getting Started

💡

A hosted version of Motion Browser is live — no local setup
needed. Grab a publishable key from the
[Getting Credentials](https://connect.perxona.ai/#credentials) section above,
then open it from the demo link above.

### Composing a Script with Motion Tags

1. #### Write your speech text

   Type the words you want the avatar to say in the Script
   Composer.
2. #### Insert a motion chip

   Find the motion in the Motion Library panel. Place your
   cursor at the desired point in the text, then click
   **+** to insert it as a chip.
3. #### Press Play to preview

   The avatar speaks the full script and performs each motion
   at its marked position. The chip serializes to
   `[MOTION <id>:1]` and is passed directly
   to `presenter.present()` — this is Motion
   Browser calling it for you, so you can hear and see the
   result before it goes anywhere near your own code.
4. #### Ready? Export it

   Once it reads and looks right, use the
   **Export** button in the header — see
   "Exporting to an AI Coding Assistant" below for what it
   copies and how to use it.

### Exporting to an AI Coding Assistant

The **Export** button, in the top header, is how
you get your configuration out of Motion Browser and into your
own project — Motion Browser's own code is never part of what
you ship, so this is the handoff. Click it and Motion Browser
copies one prompt to your clipboard — your current avatar,
scene, and voice (name and id), plus the full script from the
Script Composer — ready to paste into an AI coding assistant
(Claude Code, Cursor, or similar) working on your own Perxona
Connect sample project. The assistant reads your project's own
code and decides where these values belong; Motion Browser
doesn't know your project's structure, so it never guesses for
you. The button is disabled until the Script Composer has some
content — a script, a motion chip, or both.

💡

**Worked example** — say you've composed a
greeting: `Hi there! [MOTION wave-1:1]`. Press
Export, then paste the copied prompt into your assistant with
something like: "Wire this into my chatbot's
`custom_instructions` so it uses this greeting."
The assistant can point your chatbot's own instructions at
this exact line. Keep in mind that's still a chatbot
generating a reply — it follows instructions, but it isn't
guaranteed to reproduce the line verbatim, motion tag
included, on every single turn. Try it and see how it reads
before relying on it.
