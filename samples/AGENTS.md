# Perxona Connect Kit — Samples

This directory contains standalone sample apps that show how to integrate the **Perxona Connect
API** and the `<sv-presenter>` avatar Web Component. Each sample is self-contained — its own
dependencies, its own docs, no shared build step or code between samples.

## Available Samples

- [`express/`](express/) — an Express-based sample with Studio and Embed demos, in that order: Studio creates the chatbot
  Embed answers through. See
  [`express/README.md`](express/README.md) for setup and usage, and
  [`express/AGENTS.md`](express/AGENTS.md) for its architecture and conventions.

## Working In This Directory

- Pick the sample that matches your stack, then work only inside that sample's own directory —
  samples do not share code or configuration with each other.
- Each sample's own `AGENTS.md` / `README.md` is the source of truth for that sample's setup,
  architecture, and coding conventions. This file only covers the top-level layout.
- New samples get their own subdirectory here, following the same self-contained shape (own
  `README.md`, own `AGENTS.md`, own dependency manifest).
- If you are adding or changing a sample to send it back to the repository, read
  [`CONTRIBUTING.md`](../CONTRIBUTING.md) first.
