## Vibe Coder & Beginner Guide

Building with an AI coding editor (such as
**Cursor**, **Windsurf**,
**VS Code + GitHub Copilot**, or
**Claude Code**) without a traditional software
engineering background? This guide translates every technical
term into plain language, shows how to download and configure
the project without memorizing terminal commands, and gives you
ready-to-copy AI prompts.

### 1. Three Core Concepts in Plain Language

| Term you will see | What it actually means |
| --- | --- |
| **GitHub & `Clone`** | **GitHub** is where the starter code lives online. **Cloning** simply means making a full copy of this project folder on your own computer so you can edit and experiment freely without affecting the original template. |
| **Environment Variables & `.env`** | Think of `.env` as your project's **private settings file** that stays only on your computer. Your API keys are like passwords — if you paste them directly into webpage code and share your project, anyone can take them. Putting them in `.env` keeps them out of GitHub (`.gitignore` automatically blocks `.env` from being uploaded).   **Why is there a `.env.example`?** The repository includes `.env.example` as a blank form template. You duplicate it, rename the copy to `.env`, and fill in your own keys. |
| **Two API Keys (`Secret` vs `Publishable`)** | An **API key** is a digital pass that connects the app to your Perxona account. This kit uses **two** keys on opposite sides of the trust boundary: `PERXONA_CONNECT_SECRET_KEY` stays **only on your local server**, while `PERXONA_CONNECT_PUBLISHABLE_KEY` is handed to the **web browser**. See [Get API Credentials](https://connect.perxona.ai/#credentials) above for what each key can do and how to create them. |

### 2. Zero-GitHub Setup Tips

1. #### Install two free tools (one-time setup)

   1. **An AI code editor**: Download
   [Cursor](https://www.cursor.com/)
   or
   [VS Code](https://code.visualstudio.com/).  
   2. **Node.js (version 22 or newer)**:
   Download the installer from
   [nodejs.org](https://nodejs.org/). Not sure if you already have it? Ask your AI editor:
   `"Check if Node.js 22 or newer is installed on my
   computer."`
2. #### Get the project onto your computer (Pick any 1 of 3 ways)

   You don't need to memorize terminal commands — pick
   whichever option feels easiest:

   - **Option A — Ask your AI editor to do it for you
     (Recommended):**
     Paste this into Cursor, Windsurf, or Claude Code:
     ```text
     Please clone https://github.com/XRSPACE-Inc/perxona-connect-kit.git, go into the samples/express directory, copy .env.example to .env, and run npm install for me.
     ```
   - **Option B — Use the editor button:** Click
     **Clone Git Repository...** on the welcome
     screen of Cursor / VS Code, paste
     `https://github.com/XRSPACE-Inc/perxona-connect-kit.git`, pick a folder on your computer, and then open the
     `samples/express` subfolder inside it.
   - **Option C — Download ZIP from GitHub:** On
     the
     [GitHub repository page](https://github.com/XRSPACE-Inc/perxona-connect-kit), click the green **<> Code** button
     → **Download ZIP**, unzip it, and open the
     `samples/express` folder inside it.

   📁

   **Check your folder:** The runnable web app
   lives inside `samples/express/`, not the
   top-level folder. Always open or run commands inside
   `samples/express/`.
3. #### Find and edit `.env`, then run the sample

   Follow [Get API Credentials](https://connect.perxona.ai/#credentials) to
   create your two keys, and
   [Run the Express Sample](https://connect.perxona.ai/#quickstart) below to
   fill in `.env` and start the server.

   💡

   **Can't see `.env` in Finder or File
   Explorer?**
   Files starting with a dot (`.`) are hidden by
   default on macOS and Windows. Look in the
   **left file sidebar of Cursor / VS Code**
   — it always shows `.env` files. Make sure
   there are no spaces around `=`, no quotes,
   and that the file is named `.env` (not
   `.env.txt`), then save (`Cmd+S` /
   `Ctrl+S`).

### 3. How to Vibe Code Your Own App (Ready-to-Copy AI Prompts)

This repository ships with built-in AI context files (`AGENTS.md`
and `CLAUDE.md`). When you open the project in
Cursor, Windsurf, Claude Code, or VS Code Copilot, your AI
assistant automatically knows the SDK contract and project
structure.

🎯

**The Golden Rule: Build from `demos/embed/`, not
from `demos/studio/`.**
Use **Studio** in your browser to browse avatars
and create your chatbot, but always ask your AI editor to
modify `samples/express/public/demos/embed/` (a
clean, minimal product-page template) rather than
`demos/studio/` (a full developer console with
catalog pickers, CRUD forms, and debug tools).

Copy and paste any of these prompts straight into your AI
editor:

**Prompt 1 — Redesign the product page around the
avatar:**

```text
Look at samples/express/public/demos/embed/. Keep the <sv-presenter> avatar initialization and chat logic in app.js intact, but redesign index.html and style.css into a modern [e.g. AI hotel concierge / virtual language tutor / brand ambassador] website.
```

**Prompt 2 — Pin your chosen Avatar, Scene, Voice, and Chatbot
in `.env`:**

```text
Read the auto-selected Avatar, Scene, Voice, and Chatbot IDs from my local server's startup log (or use the IDs I selected in Studio) and update DEMO_FIXED_AVATAR_ID, DEMO_FIXED_SCENE_ID, DEMO_FIXED_VOICE_ID, and DEMO_FIXED_CHATBOT_ID in samples/express/.env so the Embed demo uses my chosen character. Do not read or output PERXONA_CONNECT_SECRET_KEY, do not expose local /api/* routes as public APIs, and do not hardcode credentials or responses in frontend code.
```

**Prompt 3 — Add clickable starter question chips:**

```text
In samples/express/public/demos/embed/, add 3 clickable starter question buttons above the chat input box so visitors can click a question to immediately send it to the chatbot and have the avatar speak the answer.
```
