# Perxona Connect Samples

Minimal sample apps for building with Perxona Connect.

> All samples in this repository use a Perxona Connect account. Sign up at <https://console.perxona.ai> — there is
> no sign-up API. See [`samples/express/README.md`](samples/express/README.md) for the full steps.

## Usage and Subscription

> ⚠️ **Connect Kit is currently in Preview.** Through **2026/09/20** (subject to platform configuration), metered calls
> (chatbot conversations) are not subject to usage-credit enforcement. Put less ceremoniously: the meter exists, but nobody
> is sending you a bill yet.

When credit enforcement starts, Connect Kit sign-ups are treated as Perxona Console **Free Plan** users by default. If that
organization's credits are exhausted, **or its subscription itself is no longer active**, metered calls (such as chatbot
chat) fail with the same HTTP `400` and `code: 1003`, with a body like one of these:
`{"code": 1003, "details": "credit_points exhausted for org_id: ..."}` or
`{"code": 1003, "details": "Subscription status is not valid for org_id: ..."}` — the `details` field is what tells the two
apart. A third, separate case — **no subscription record for the org at all** — fails with HTTP `403` and
`{"code": 14005, "details": "No active subscription found for org_id: ..."}` instead. At that
point, sign in to [Perxona Console](https://console.perxona.ai/asia) (use the region matching your account — `/asia` or `/eu`)
with your Connect account credentials (see [`samples/express/README.md`](samples/express/README.md#getting-a-connect-account)
for sign-up steps), open the organization management page, review **Subscription**, then top up credits or upgrade the plan.

## Samples

- [`samples/express/`](samples/express/) — an Express-based starter that shows the basic Connect flow. See
  [`samples/express/README.md`](samples/express/README.md) for setup and usage.

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
