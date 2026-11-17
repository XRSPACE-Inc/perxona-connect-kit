# Perxona Connect Kit

Give your AI agent a face. This plugin teaches Claude to build apps with a talking 3D avatar from
[Perxona Connect Kit](https://github.com/XRSPACE-Inc/perxona-connect-kit): the `<sv-presenter>`
web component, which speaks any text with lip-sync, emotion and gestures, and the Perxona Connect
API behind it.

## What you can ask for

- "Build a single HTML page where a talking avatar welcomes visitors to my bakery."
- "Add a Perxona avatar to my React app that speaks each reply from our `/api/chat` route."
- "Give my existing chatbot a face and a voice."
- "Write the Lovable prompts for a 3D interview coach."

Claude follows the kit's rules: which of the two API keys goes where, the order the avatar starts
up in, unlocking sound from a click, and the errors to handle.

## What it contains

One skill, `perxona-connect` ([`skills/perxona-connect/SKILL.md`](skills/perxona-connect/SKILL.md)).
It is instructions only. The plugin has no MCP server, commands, agents, hooks or scripts, and runs
nothing by itself.

## What it reads and sends

The plugin stores no data and sends nothing to any service. While helping you, Claude may read
these public files from the kit's GitHub repository, so the code it writes matches the kit:

- `llms-full.txt`, the full developer handbook
- `integrations/starter/avatar.html`, a browser-only starter page
- `integrations/lovable/PerxonaAvatar.tsx`, a React avatar component
- `integrations/lovable/supabase/functions/perxona-chat/index.ts`, a serverless chatbot relay

The code Claude writes for you calls `console.perxona.ai` and loads the avatar engine from
`cdn.perxona.ai`, using API keys you create in the Perxona Console. Do not paste keys into the
chat. The **publishable** key is meant for web pages; the **secret** key belongs on a server only.

## Requirements

A free Perxona account at [console.perxona.ai](https://console.perxona.ai), and a Connect API key
created there (avatar menu → Management → Integration → Connect API keys).

## Support

Questions and bug reports:
[github.com/XRSPACE-Inc/perxona-connect-kit/issues](https://github.com/XRSPACE-Inc/perxona-connect-kit/issues).
Developer handbook: [connect.perxona.ai](https://connect.perxona.ai).

Licensed under Apache 2.0.
