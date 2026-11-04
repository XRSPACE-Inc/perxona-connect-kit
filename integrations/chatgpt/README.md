# Build with Perxona in ChatGPT

A Custom GPT, **Perxona Avatar Builder**, that knows the kit. Non-technical users get
step-by-step setup and ready-to-paste Lovable prompts; developers get complete files built
from the kit's starters.

One person sets it up once and shares the link. Everyone else just opens it.

> [!WARNING]
> OpenAI is retiring custom GPTs in favour of ChatGPT plugins. Personal accounts (Free, Go,
> Plus, Pro) can no longer create new GPTs. Existing GPTs keep working. Set this up from a
> ChatGPT **workspace** account (Business or Enterprise) that still allows GPT creation, and
> share it inside that workspace. If yours does not, use a Project instead: add the same
> knowledge files and paste [`gpt-instructions.md`](gpt-instructions.md) as the Project
> instructions. A public listing now goes through the ChatGPT plugin directory, which needs a
> hosted MCP server.

## Set up the GPT (organizer, ~10 min)

You need a ChatGPT workspace plan that can still create GPTs.

1. Collect the knowledge files:

   ```bash
   sh integrations/chatgpt/build-knowledge.sh
   ```

   This fills `integrations/chatgpt/knowledge/` (git-ignored) with five files.
2. In ChatGPT: **Explore GPTs → Create → Configure**.
3. Fill in:
   - **Name:** Perxona Avatar Builder
   - **Description:** Build an app with a talking 3D avatar using Perxona Connect Kit, with or without code.
   - **Instructions:** everything in [`gpt-instructions.md`](gpt-instructions.md).
   - **Conversation starters:**
     - I have no coding experience. Help me build an avatar app in Lovable.
     - Add a talking avatar to my React app.
     - Give my existing chatbot a face and a voice.
     - Build a single HTML page where an avatar quizzes me.
   - **Knowledge:** upload the five files from `integrations/chatgpt/knowledge/`.
   - **Capabilities:** Web search on (to read the repo on GitHub), Code Interpreter on (to
     produce downloadable files), Canvas on.
4. **Create**, then share: "Anyone with the link" for the hackathon, or your workspace only.

Rebuild and re-upload the knowledge files whenever the kit changes.

## Using it

Open the GPT and describe what you want. Examples:

> 我不會寫程式。我想做一個會說中文的 3D 店員，幫客人推薦咖啡，要用 Lovable。

> I have a Next.js app with an OpenAI chat route. Add a Perxona avatar that speaks each reply.

ChatGPT's canvas may not be able to load the avatar engine, so for HTML the GPT gives you a
file to download and open in your browser.

## Codex

OpenAI Codex reads [`AGENTS.md`](../../AGENTS.md) at the repo root. Open a clone of this repo in
Codex and ask for what you want; no setup is needed.
