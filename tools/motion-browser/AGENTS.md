# Repository Guidelines

The **Perxona Connect Kit — Motion Browser** is a web UI for previewing and controlling Perxona avatars
through the **Connect API** and the `<sv-presenter>` avatar Web Component (Presenter SDK). Pick an
avatar/scene/voice, browse and preview motions, and make the avatar speak and perform — then use it as a
reference client or as a starting point for your own avatar control panel.

## Architecture

### Auth model

There is no login and no backend proxy. The app authenticates with a single build-time Connect
**publishable** API key (`VITE_PERXONA_CONNECT_PUBLISHABLE_KEY`, read via `lib/env.ts`), sent as an
`X-Connect-Key` header on every request — `lib/api.ts` attaches it directly, no session or token
exchange involved. The publishable key's scope (`asset:read`, `voice:read`, `presentation:write`,
`tts_token:write`) is exactly what this tool needs; it never touches chat or asset-write routes,
which is why a secret key and a server proxy (as `samples/express` uses) aren't necessary here.

### Presenter lifecycle

`hooks/use-presenter.ts` loads the `<sv-presenter>` engine script from the CDN URL returned by the API's
`getConfig()` and exposes an imperative handle to it. `hooks/use-avatar-session.ts` bridges the Connect API
and the presenter:

- `launch` calls `presenter.initializeWithConnectKey()` with the publishable key and the chosen
  avatar/scene/voice — the key is used as-is, no exchange step.
- `speak` calls `presenter.present(text)` directly — the widget builds the performance (speech + motion)
  internally against the Connect API; there is no client-side presentation-building step.
- `presenter.resumeAudioPlayback()` (wrapped as `resumeAudio()`) must run from a direct user gesture (the
  Play click) to satisfy browser autoplay policy.
- A key has no rotation, so there's nothing to refresh: on `CONNECT_KEY_REJECTED`
  `hooks/use-presenter.ts` flips a `keyRejected` state, which `components/custom/presenter-stage.tsx`
  renders as a full-screen error with no retry — retrying an already-rejected key is futile.

### Data fetching

Catalog and motion data go through TanStack Query. `hooks/use-catalog.ts` loads avatars, scenes, and voices
as independent queries (each caches/retries on its own); `hooks/use-motions.ts` loads the motion list for
the currently selected avatar.

### UI composition

`App.tsx` is the top-level layout. `components/custom/` holds the app-specific screens and
controls — avatar picker, scene/voice select, motion library, script composer, presenter stage and control
bar, app header. `components/ui/` holds shadcn/ui primitives; keep new UI on top of those rather than
introducing a different component library. `script-composer.tsx` mixes free text with motion "chips" —
the avatar performs the resulting script in sequence when you press Play.

## Project Structure

See `README.md`'s Project Structure section for the full file layout.

## Getting Started

See `README.md` for setup (`pnpm install`, `cp .env.example .env`, `pnpm dev`).

## Coding Style

TypeScript + React function components with hooks. Tailwind CSS + shadcn/ui for styling — follow the
existing component patterns rather than introducing a different styling approach. Keep the app
dependency-light; there is no backend proxy layer here to extend.

## Configuration

`VITE_PERXONA_API_BASE_URL`, `VITE_PRESENTER_URL`, and `VITE_PERXONA_CONNECT_PUBLISHABLE_KEY` — see
`README.md`'s Environment Variables section. `.env` is git-ignored; never commit real values.
