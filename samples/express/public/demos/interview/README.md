# InterviewCoach — a practice app where the avatar is the product

A mock job interview with a face. Pick a role and a language, and Mia asks five
questions one at a time, reacts to each answer, scores it, and ends with a report.
English, 日本語 and 繁體中文.

This is what a practice-product builder (interview practice, customer-service
drills, exam prep, language practice) builds on the Connect Kit. It was scaffolded
from `demos/embed/` in about 18 minutes with an AI coding agent, using only this
repo and the public handbook.

Open it at `http://localhost:8083/demos/interview/` after `npm run dev`.

## What it shows that Studio and Embed do not

- **The app decides the emotion, not the model.** Each answer's score maps to an
  emotion and intensity passed to `presenter.present(text, { emotion, intensity })`.
  A 5 gets excitement, a 1 gets low-intensity disappointment.
- **A purpose-built chatbot created from code.** On first run the app creates a
  Connect chatbot ("InterviewCoach JSON") via `POST /api/chatbots` with
  instructions to answer in compact JSON `{ feedback, score, question, done }`.
  The app parses that, speaks the feedback and question, and keeps score itself.
- **Per-language voice retargeting.** The voice is chosen from the catalog for the
  selected language at Start, so the same avatar interviews in three languages.
- **Motions on the closing turn.** A good interview ends with the celebration
  motion, an average one with the gratitude motion, via `playMotion()`.
- **Dev stats footer.** Turns, LLM p50, send-to-voice p50 and the credit meter,
  so you can see what the stack costs in latency and credits while you build.

## Files

| File | What it does |
|---|---|
| `index.html` | Landing section, interview room with `<sv-presenter>`, report, dev-stats footer |
| `app.js` | Chatbot bootstrap, interview loop, JSON parsing, score-to-emotion map, latency capture |
| `style.css` | Product-site look, no framework |

Zero dependencies, plain ESM, no build step. Same `server.mjs` and `.env` as the
other demos.

## Notes

- Avatar, scene and voice IDs are hardcoded near the top of `app.js`. They are
  public catalog assets. Swap them for your own from `GET /api/avatars`,
  `GET /api/scenes` and `GET /api/voices`.
- The chatbot is created once per organization and reused. Delete it from the
  Studio demo or the console if you change `CUSTOM_INSTRUCTIONS`.
- Voice input uses the browser's Web Speech API where available.
