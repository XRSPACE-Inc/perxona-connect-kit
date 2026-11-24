# Build with Perxona in ChatGPT

Two ways to teach ChatGPT the kit today, plus the plugin we submit to OpenAI's public Plugins
directory.

| Way | Who sets it up | Best for |
| --- | --- | --- |
| **Skill** (recommended) | Each user, or a workspace admin | Anyone on a plan with Skills. ChatGPT's copy of the `perxona-connect` skill Claude uses. |
| **Project** | One organizer, shared with the team | Guided help for non-developers, including ready-to-paste Lovable prompts |

> [!NOTE]
> **Why not a custom GPT?** OpenAI is retiring custom GPTs: new ones can no longer be created,
> and existing ones stop working on Dec 11, 2026 (see
> [Sharing and publishing GPTs](https://help.openai.com/en/articles/8798878-sharing-and-publishing-gpts)).
> Skills and Projects are not affected.

Build the uploads first:

```bash
sh integrations/chatgpt/build-uploads.sh
```

This writes `integrations/chatgpt/uploads/` (git-ignored): `perxona-connect.zip` for the skill,
`project/` with five files for a Project, and `perxona-connect-plugin.zip` for the
[public listing](#public-listing-in-the-plugins-directory).

## Option 1 · Skill (recommended)

1. In ChatGPT, open **Plugins → Skills → Create → Upload from your computer**.
2. Pick `uploads/perxona-connect.zip`, then save and install it.
3. In any chat, ask for an avatar app. ChatGPT uses the skill when the request matches.

Skills are available on Business, Enterprise and Edu plans. Enterprise and Edu admins may need to
turn them on.

The skill ([`plugin/skills/perxona-connect/SKILL.md`](plugin/skills/perxona-connect/SKILL.md)) is
a copy of Claude's ([`SKILL.md`](../claude/plugin/skills/perxona-connect/SKILL.md)). They differ
only where OpenAI asks for it: no Claude product names, and the model never asks the user for a
key. When you change one, make the same change in the other.

## Option 2 · Project

1. In ChatGPT, create a Project named **Perxona Avatar Builder**.
2. Add the five files from `uploads/project/` as project files.
3. Paste everything in [`project-instructions.md`](project-instructions.md) into the Project
   instructions.
4. Share the Project with your team.

Rebuild and re-upload whenever the kit changes.

## Using it

Describe what you want. Examples:

> 我不會寫程式。我想做一個會說中文的 3D 店員，幫客人推薦咖啡，要用 Lovable。

> I have a Next.js app with an OpenAI chat route. Add a Perxona avatar that speaks each reply.

ChatGPT's canvas may not be able to load the avatar engine, so for HTML you get a file to
download and open in your browser.

## Public listing in the Plugins directory

[`plugin/`](plugin/) is the plugin we submit to the Plugins directory that ChatGPT and Codex
share. It contains the skill only, with no MCP server: ChatGPT writes the code, and does not call
Perxona itself. OpenAI accepts a skills-only plugin without test cases or a demo video
([Submit your Claude Code plugin to OpenAI](https://developers.openai.com/plugins/guides/submit-claude-plugin)).

| File | What it is |
| --- | --- |
| [`plugin/plugin.json`](plugin/plugin.json) | Package identity, plus the listing text, category, icon and starter prompts under `extensions.com.openai`. The portal fills in its form from these. |
| [`plugin/skills/perxona-connect/SKILL.md`](plugin/skills/perxona-connect/SKILL.md) | The skill |
| `plugin/assets/icon.png` | The listing and composer icon, the same image as the Claude plugin's |

To submit it, or an update:

1. For an update, raise `version` in `plugin/plugin.json` and rewrite
   `publication.release_notes`.
2. Run `build-uploads.sh`.
3. In the [OpenAI plugin portal](https://platform.openai.com/plugins), choose the XRSPACE
   organization, select **Upload new or existing plugin**, and upload
   `uploads/perxona-connect-plugin.zip`. You need to be an owner of that organization, or have
   Apps Management write access, and the organization needs a completed business verification.
4. Fix any findings, then select **Submit for review**. After approval, select **Publish plugin**.

See [Upload and submit your plugin](https://developers.openai.com/plugins/deploy/submission) for
the full portal flow. A hosted MCP server would let ChatGPT show the avatar inside the chat; it is
not built yet, and the listing does not need it.

## Codex

OpenAI Codex reads [`AGENTS.md`](../../AGENTS.md) at the repo root. Open a clone of this repo in
Codex and ask for what you want; no setup is needed.
