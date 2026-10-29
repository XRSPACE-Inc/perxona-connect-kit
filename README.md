# Perxona Connect Kit

**Add a talking 3D AI avatar to your web app.** Samples and tools for the Perxona Connect SDK: drop in the `<sv-presenter>` web component, pick an avatar, scene and voice, and it speaks with lip-sync.

![A Perxona avatar speaking with lip-sync in the InterviewCoach demo](docs/demo.gif)

*Mia, the interviewer in the [InterviewCoach demo](samples/express/public/demos/interview/), asking her first question. Recorded from a stock clone of this repo. ([MP4](docs/demo.mp4))*

📘 [Developer Handbook](https://connect.perxona.ai) ([Markdown mirror](docs/en/) · [llms.txt](llms.txt)) · 💬 [Discussions](https://github.com/XRSPACE-Inc/perxona-connect-kit/discussions) · 🎭 [Showcase](https://showcase.perxona.ai)

## Quick start (5–15 minutes)

Needs Node 22+ and a free Perxona Connect account ([sign up](https://console.perxona.ai)).

```bash
git clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git
cd perxona-connect-kit/samples/express
cp .env.example .env   # add your API base URL + secret and publishable Connect API keys
npm install
npm run dev            # open http://localhost:8083
```

Create both keys in the console: open the avatar menu (top right), then **Management → Integration → Connect API keys**. Full steps in [`samples/express/README.md`](samples/express/README.md).

**No laptop setup?** Deploy the same sample to Vercel. It asks for the two keys and gives you a public URL in about a minute.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FXRSPACE-Inc%2Fperxona-connect-kit&root-directory=samples%2Fexpress&project-name=perxona-connect-kit&repository-name=perxona-connect-kit&env=PERXONA_CONNECT_SECRET_KEY%2CPERXONA_CONNECT_PUBLISHABLE_KEY&envDescription=Two%20Connect%20API%20keys%20from%20the%20Perxona%20Console%3A%20open%20the%20avatar%20menu%20%28top%20right%29%2C%20then%20Management%2C%20Integration%2C%20Connect%20API%20keys.%20Leave%20the%20secret%20key%27s%20domain%20list%20empty.&envLink=https%3A%2F%2Fgithub.com%2FXRSPACE-Inc%2Fperxona-connect-kit%2Fblob%2Fmain%2Fsamples%2Fexpress%2FREADME.md%23getting-a-connect-account&demo-title=Perxona%20Connect%20Kit&demo-description=A%20talking%203D%20AI%20avatar%20with%20lip-sync%20in%20your%20web%20app%2C%20with%20the%20Studio%2C%20Embed%20and%20InterviewCoach%20demos.)

## What you can build

Best fit: products where the avatar **is** the product, not a widget on the side.

- **Practice and training**: mock interviews, customer-service drills, exam and language practice. See [InterviewCoach](samples/express/public/demos/interview/), built on this kit.
- **Reception and concierge**: hotel check-in, clinic front desk, store greeter, answering from your own knowledge file in Japanese, English or 繁體中文. See [Maker](samples/maker/), an event concierge built on this kit.
- **A face for your agent**: your chat endpoint in, `present()` out. Give an existing LLM agent a voice and a face in about thirty lines.
- **Characters**: VTuber-style or companion characters from your own `.vrm` file ([VRM uploader](tools/vrm-uploader/)).

Community builds live on the [Showcase](https://showcase.perxona.ai).

## Plans and billing

Connect Kit sign-ups start on the Perxona Console **Free Plan**. See [pricing](https://perxona.ai/pricing). If a call returns `code: 1003` or `14005`, see [Billing errors](#billing-errors) below.

## Samples

- [`samples/express/`](samples/express/) — an Express-based starter that shows the basic Connect flow. See
  [`samples/express/README.md`](samples/express/README.md) for setup and usage.
- [`samples/express/public/demos/interview/`](samples/express/public/demos/interview/) — **InterviewCoach**, a
  mock-interview practice app built on the starter: app-driven emotions, a purpose-built chatbot created from
  code, three languages with per-language voices. Built in about 18 minutes from this repo and the handbook.
- [`samples/maker/`](samples/maker/) — **Maker**, a live 3D matchmaker for community events, by Angie Chen.
  Try it: https://perxona-maker.onrender.com

## Tools

- [`tools/vrm-uploader/`](tools/vrm-uploader/) — a shell script that checks your own `.vrm` file and
  uploads it as an avatar. See [`tools/vrm-uploader/README.md`](tools/vrm-uploader/README.md) for setup
  and usage.

## Built with Perxona

Shipped something on this kit? Add the badge to your README and post the link in
[Discussions](https://github.com/XRSPACE-Inc/perxona-connect-kit/discussions) so it can be featured on the Showcase.

[![Built with Perxona](https://img.shields.io/badge/Built%20with-Perxona-000095)](https://github.com/XRSPACE-Inc/perxona-connect-kit)

```markdown
[![Built with Perxona](https://img.shields.io/badge/Built%20with-Perxona-000095)](https://github.com/XRSPACE-Inc/perxona-connect-kit)
```

## Presenter SDK Integration FAQs

Common questions when integrating the `<sv-presenter>` Presenter SDK, across any sample in this repo. For
setup/environment issues specific to one sample, see its own README instead.

**Why doesn't the avatar speak after `present()`?** `present()` resolves with a `PresentationResult` whose `success`
is `false` — check the status message it surfaces (`code`/`message`) for why (e.g. no target resolved yet, or the
Connect API rejected the presentation request). Also confirm the presenter reached `Ready` first.

**Why doesn't a motion cued via `[MOTION ...]` markup in `present()` play?** Two common causes: the motion ID isn't
in the target avatar's motion catalog (check `GET /api/v1/connect/assets/avatars/:id/motions` for what it actually
supports); or the cue lands too close to the end of the speech — motion playback stops when its accompanying speech
finishes, so a motion cued near the end of a sentence, or in a very short utterance, may not have enough time to
play. To play a motion on its own, independent of the speech queue, call `presenter.playMotion(motionId)` instead.

## Billing errors
When credit enforcement starts, Connect Kit sign-ups are treated as Perxona Console **Free Plan** users by default. If that organization's credits are exhausted, **or its subscription itself is no longer active**, metered calls (such as chatbot chat) fail with the same HTTP `400` and `code: 1003`, with a body like one of these: `{"code": 1003, "details": "credit_points exhausted for org_id: ..."}` or
`{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}` — the `details` field is what tells the two apart. A third, separate case — **no subscription record for the org at all** — fails with HTTP `403` and `{"code": 14005, "details": "No active subscription found for org_id: ..."}` instead. At that
point, sign in to [Perxona Console](https://console.perxona.ai/asia) (use the region matching your account)
with your Connect account credentials (see [`samples/express/README.md`](samples/express/README.md#getting-a-connect-account)
for sign-up steps), open the organization management page, review **Subscription**, then top up credits or upgrade the plan.
