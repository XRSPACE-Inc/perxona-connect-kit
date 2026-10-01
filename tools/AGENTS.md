# Perxona Connect Kit — Tools

This directory contains standalone tools built on the **Perxona Connect API**. Unlike `samples/`, these
are finished tools rather than minimal getting-started starters — use them as they are, or as a starting
point for your own tooling.

## Available Tools

- [`vrm-uploader/`](vrm-uploader/) — `upload-vrm.sh`, a shell script that checks a `.vrm` file against
  what the Connect API and the avatar runtime accept, then uploads it as an avatar in your organization.
  See [`vrm-uploader/README.md`](vrm-uploader/README.md) for the checks it runs and how to read its
  output, and [`vrm-uploader/AGENTS.md`](vrm-uploader/AGENTS.md) for its architecture and conventions.

## Working In This Directory

- Pick the tool that matches what you need, then work only inside that tool's own directory — tools do
  not share code or configuration with each other.
- Each tool's own `AGENTS.md` / `README.md` is the source of truth for that tool's setup, architecture,
  and coding conventions. This file only covers the top-level layout.
- New tools get their own subdirectory here, following the same self-contained shape (own `README.md`,
  own `AGENTS.md`, own dependency manifest).
