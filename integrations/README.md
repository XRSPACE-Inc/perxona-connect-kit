# Build with Perxona in AI tools

Use Perxona Connect Kit from the AI tool you already use, with or without code.

| You are… | Use | Start here |
| --- | --- | --- |
| Not a developer | **Lovable**: describe the app, get a live site | [`lovable/`](lovable/README.md) |
| Not a developer, want guidance first | **ChatGPT**: the `perxona-connect` skill, or a shared Perxona Avatar Builder Project that writes your Lovable prompts | [`chatgpt/`](chatgpt/README.md) |
| A developer | **Claude Code** with the `perxona-connect` plugin, or Codex with `AGENTS.md` | [`claude/`](claude/README.md) |
| Anyone, quick prototype | **Claude or ChatGPT** writes one HTML file you open in a browser | [`starter/avatar.html`](starter/avatar.html) |

## What is in here

| Path | What it is |
| --- | --- |
| [`starter/avatar.html`](starter/avatar.html) | Browser-only starter: one HTML file, publishable key only, no server |
| [`lovable/PerxonaAvatar.tsx`](lovable/PerxonaAvatar.tsx) | The same, as a React component (Lovable, Vite, Next.js client components) |
| [`lovable/supabase/functions/perxona-chat/`](lovable/supabase/functions/perxona-chat/index.ts) | Serverless relay to a Perxona chatbot; holds the secret key |
| [`lovable/knowledge.md`](lovable/knowledge.md) | Rules for Lovable's project Knowledge |
| [`claude/plugin/`](claude/plugin/skills/perxona-connect/SKILL.md) | The `perxona-connect` skill, shared by Claude and ChatGPT, and the Claude Code plugin ([marketplace](../.claude-plugin/marketplace.json)) |
| [`chatgpt/project-instructions.md`](chatgpt/project-instructions.md) | Instructions for a Perxona Avatar Builder ChatGPT Project |

## Why no server is needed

The **publishable** Connect key is designed to be read by the browser. With it alone, a page
can read the avatar catalog and make the avatar speak, so a static page or a Lovable app is
enough. Restrict the key's allowed domains before you share the page.

The **secret** key is only needed to talk to a **Perxona chatbot** (a persona plus knowledge
file hosted by Perxona). It must stay on a server: the Express sample, or the `perxona-chat`
edge function. Bringing your own brain (Lovable AI, OpenAI, Claude, a script) needs no Perxona
secret key at all, though an LLM's own API key still belongs on a server, never in the page.
