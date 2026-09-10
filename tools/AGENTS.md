# Perxona Connect Kit — Tools

This directory contains standalone tool apps built on the **Perxona Connect API** and the `<sv-presenter>`
avatar Web Component. Unlike `samples/`, these are full applications rather than minimal getting-started
starters — use them as reference clients or as a starting point for your own tooling.

## Available Tools

- [`motion-browser/`](motion-browser/) — a web UI for previewing and controlling Perxona avatars: pick an
  avatar/scene/voice, browse and preview motions, and make the avatar speak and perform. See
  [`motion-browser/README.md`](motion-browser/README.md) for setup and usage, and
  [`motion-browser/AGENTS.md`](motion-browser/AGENTS.md) for its architecture and conventions.

## Working In This Directory

- Pick the tool that matches what you need, then work only inside that tool's own directory — tools do
  not share code or configuration with each other.
- Each tool's own `AGENTS.md` / `README.md` is the source of truth for that tool's setup, architecture,
  and coding conventions. This file only covers the top-level layout.
- New tools get their own subdirectory here, following the same self-contained shape (own `README.md`,
  own `AGENTS.md`, own dependency manifest).
