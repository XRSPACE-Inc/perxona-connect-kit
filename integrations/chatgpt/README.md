# Build with Perxona in ChatGPT

Two ways to teach ChatGPT the kit, plus where a public listing stands.

| Way | Who sets it up | Best for |
| --- | --- | --- |
| **Skill** (recommended) | Each user, or a workspace admin | Anyone on a plan with Skills. The same `perxona-connect` skill Claude uses. |
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

This writes `integrations/chatgpt/uploads/` (git-ignored): `perxona-connect.zip` for the skill, and
`project/` with five files for a Project.

## Option 1 · Skill (recommended)

1. In ChatGPT, open **Plugins → Skills → Create → Upload from your computer**.
2. Pick `uploads/perxona-connect.zip`, then save and install it.
3. In any chat, ask for an avatar app. ChatGPT uses the skill when the request matches.

Skills are available on Business, Enterprise and Edu plans. Enterprise and Edu admins may need to
turn them on. The skill is the same file as Claude's
([`SKILL.md`](../claude/plugin/skills/perxona-connect/SKILL.md)), so one edit updates both.

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

To appear in ChatGPT's Plugins directory next to services like Gmail and GitHub, Perxona needs a
hosted **MCP server**, which is not built yet. Listing then takes OpenAI organization
verification, domain verification, test cases and review
([submission guide](https://developers.openai.com/apps-sdk/deploy/submission)). The same server
can also be submitted to Claude's directory.

## Codex

OpenAI Codex reads [`AGENTS.md`](../../AGENTS.md) at the repo root. Open a clone of this repo in
Codex and ask for what you want; no setup is needed.
