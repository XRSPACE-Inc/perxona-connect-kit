# Maker: who should you meet tonight?

A live 3D AI matchmaker for community events, built on the Perxona Connect Kit by
Angie Chen, Perxona's marketing director, as her own event companion.

**[Try it live](https://perxona-maker.onrender.com)** (a made-up event, no sign-up)
· **[Code](https://github.com/angiechen-create/maker-perxona-connect-kit)** (MIT)

![Maker, the yellow FUN DAY avatar](https://raw.githubusercontent.com/angiechen-create/maker-perxona-connect-kit/main/events/demo/og-en.png)

## What it does

- Guests scan a QR at the door and Maker runs on their own phone: check-in, the agenda,
  "where's the bathroom?", and above all who to meet tonight, and why.
- Introduces only people who said yes, from what they wrote when they registered.
- English, 中文 and 日本語, switched on the phone; names and cards follow the language.
- Voice by ElevenLabs (optional), 3D look, gestures and lip-sync by Perxona.
- A demo mode with made-up guests, so anyone can try it.
- First used at AI Tinkerers Taipei, October 2026.

## Connect Kit features it uses

- `<sv-presenter>` with `initializeWithConnectKey` and the publishable key
- `present()` and `presentWithAudio()` (its own ElevenLabs audio, lip-synced by the avatar)
- `playMotion()` and the avatar's motion list for gestures, `muteAudio()` for a muted start
- `PRESENTER_STATUS` / `ALL_PERFORMANCE_FINISHED` events
- Server-side Connect API: avatars, scenes, voices, credit

## Run your own

Clone the repo and follow its README: about 30 minutes for your own event, or two
minutes for the demo.
