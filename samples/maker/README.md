# Maker: a live 3D AI matchmaker for community events

[![Built with Perxona](https://img.shields.io/badge/Built%20with-Perxona-000095)](https://github.com/XRSPACE-Inc/perxona-connect-kit)

**Try it on your phone right now:** [perxona-maker.onrender.com](https://perxona-maker.onrender.com)

**Code:** [github.com/angiechen-create/maker-perxona-connect-kit](https://github.com/angiechen-create/maker-perxona-connect-kit) (MIT)

Maker is a live 3D AI host for community events, built on this kit by Angie Chen. Guests scan a QR code at the door, check in on their own phone, and ask Maker questions by voice or by typing, in 中文, English or 日本語. It also runs as a kiosk at the entrance.

- **"What's on, and where?"** Answers only from the event's own info, and says "ask the staff" instead of guessing.
- **"Which topic table should I join?"** Suggests one or two and says why.
- **"Who should I meet?"** Recommends up to three attendees *who opted in*, with their LinkedIn as a QR code on screen.

First used at **AI Tinkerers Taipei, Kickoff**, 2026-10-08, with Maker, the yellow FUN DAY avatar.

## How it uses the kit

- The avatar, its expressions, gestures and lip-sync are the `<sv-presenter>` web component, loaded from Perxona when the page opens. Nothing to download.
- The browser only ever receives the Perxona **publishable** key. The **secret** key stays on a small Node server that loads the event config, enforces per-phone and per-day question caps, and makes the server-side Connect calls.
- One LLM call per question, with replies capped at about 320 characters so speech stays short. `present()` results are checked rather than assumed.
- If the network drops, the kiosk turns into the schedule and QR codes until it comes back.
- Privacy by default: the AI only sees attendees who opted in, no emails or phones are ever stored, and nothing visitors say is kept.

## Run it yourself (demo mode, about 2 minutes)

Needs Node 22+, a Perxona Connect account ([free trial](https://console.perxona.ai)) and an Anthropic API key.

```bash
git clone https://github.com/angiechen-create/maker-perxona-connect-kit.git
cd maker-perxona-connect-kit
npm install
cp .env.example .env      # EVENT_SLUG=demo; add your Perxona Connect keys + ANTHROPIC_API_KEY
npm start                 # open http://localhost:8090/m/
```

`events/demo/` is **Builders Night**, a made-up meetup. Pick a made-up guest and try Maker as them. Without keys the check-in, program and buttons still work, and Maker says he can't connect.

Create the two Connect keys in the console: open the avatar menu (top right), then **Management → Integration → Connect API keys**. Leave the secret key's domain restriction empty; restrict the publishable key to your domain once deployed.

To run it for your own event (about 30 minutes: event folder, persona, opt-in form, rehearsal script, Render deploy), follow the [full README in the Maker repo](https://github.com/angiechen-create/maker-perxona-connect-kit#set-it-up-for-your-own-event-about-30-minutes).

Built by Angie Chen, Perxona's marketing director, as her own event companion.
