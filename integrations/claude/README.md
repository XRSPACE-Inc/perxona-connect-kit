# Build with Perxona in Claude

One skill, [`perxona-connect`](plugin/skills/perxona-connect/SKILL.md), teaches Claude the kit:
the two-key rule, the presenter's start-up order, and which starter to use. It works in
Claude Code and on claude.ai.

## Claude Code (developers)

Install the plugin from this repo's marketplace:

```bash
claude plugin marketplace add XRSPACE-Inc/perxona-connect-kit
```

```bash
claude plugin install perxona-connect@perxona
```

Inside an interactive session the same commands are `/plugin marketplace add …` and
`/plugin install …`. Then ask in plain words, in any repository:

> Add a Perxona avatar to the landing page that answers questions with our existing `/api/chat` endpoint.

> Clone perxona-connect-kit and build a hotel concierge demo from the Embed demo.

Working inside a clone of this repo? You do not need the plugin: Claude Code reads
[`AGENTS.md`](../../AGENTS.md) and [`samples/express/AGENTS.md`](../../samples/express/AGENTS.md) on its own.

## claude.ai (everyone)

**Option 1: upload the skill.** Zip the skill folder (the zip must contain the folder
`perxona-connect/` with `SKILL.md` inside):

```bash
cd integrations/claude/plugin/skills && zip -r perxona-connect.zip perxona-connect
```

Then in claude.ai: **Settings → Capabilities → Skills → Upload skill**, and pick the zip.
Code execution must be on. In any chat, ask for an avatar app and Claude uses the skill.

**Option 2: a Project.** Create a Project, add [`llms-full.txt`](../../llms-full.txt) to its
knowledge, and paste the body of [`SKILL.md`](plugin/skills/perxona-connect/SKILL.md) (below
the `---` header) into the Project instructions. Share the Project with your team.

### What to expect on claude.ai

An artifact preview usually cannot load the avatar engine from `cdn.perxona.ai`, so Claude
writes a complete `.html` file instead. Download it, put your **publishable** key in its config
block, and open it in a browser or host it anywhere static. For the hackathon, create a
dedicated publishable key and revoke it afterwards: a file opened from disk only works with a
key that has no domain restriction.

Prompt to start with:

> Using the perxona-connect skill, build me a single HTML file: a talking avatar named Leo who
> quizzes me on Japanese vocabulary. Start from the kit's `integrations/starter/avatar.html`.
