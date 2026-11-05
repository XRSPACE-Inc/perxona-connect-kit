# Contributing to Perxona Connect Kit

This guide is for people, and the coding agents working for them, who change **this repository**
and send the change back. If you cloned a sample to build your own application, you do not need
it: start from [`AGENTS.md`](AGENTS.md) and the sample's own `README.md` instead.

## What belongs here

- **Samples stay minimal and self-contained.** Each sample and tool has its own dependencies and
  its own docs, and shares no code or build step with the others. `samples/express/` uses `npm`
  and Node 22 or newer on purpose, because that is what someone cloning it already has.
- **Demos in the Express sample are vanilla JavaScript with no build step.** Do not add a bundler
  or a framework to `samples/express/public/demos/`.
- **Write for a reader with no inside knowledge.** Before adding anything, ask whether a developer
  who has only this repository and the handbook would understand it.
- **`main` must run against production.** Every sample on `main` has to work with the production
  Connect API and the released presenter. If your change depends on something that has not been
  released yet, keep the pull request as a draft until it has.
- **Never commit a key or a `.env`.** When you add a configuration variable, add it to the
  sample's `.env.example` and its README.

## Files you do not edit by hand

| Path | Where it comes from |
| --- | --- |
| `docs/en/`, `docs/zh-tw/`, `docs/ja/`, `llms.txt`, `llms-full.txt` | Generated from the handbook at <https://connect.perxona.ai> by [`tools/handbook-to-markdown/`](tools/handbook-to-markdown/) |
| `samples/express/docs/openapi.yaml` | A copy of the Connect API contract, kept as read-only reference |

The handbook and the Connect API contract are maintained by Perxona outside this repository. If
one of them is wrong, [open an issue](https://github.com/XRSPACE-Inc/perxona-connect-kit/issues)
rather than patching the copy here.

## Sending a change

1. Fork the repository, or create a branch if you have write access.
2. Make the change and run the checks below.
3. Open a pull request against `main`. Say what behaviour changed, list the commands you ran, and
   attach a screenshot or recording for anything visible under `public/`.
4. CI must be green before the pull request can merge. No approving review is required, with one
   exception: a change to `.github/workflows/` or `.github/CODEOWNERS` needs an approval from a
   code owner. A maintainer merges pull requests that come from a fork.

Use a conventional prefix in commit subjects (`feat:`, `fix:`, `docs:`, `chore:`) and refer to
issues in this repository as `#N`.

## Checks

CI runs the same commands on every pull request. They need no key and no network access to
Perxona, so a fork gets the same result as a branch. Keep it that way: do not add a step to the
pull request workflow that needs a credential.

Express sample, from the repository root:

```bash
npm ci --prefix .github/ci
(cd samples/express && npm ci)

(cd samples/express && for f in server.mjs scripts/*.mjs public/demos/*/app.js; do node --check "$f"; done)
.github/ci/node_modules/.bin/eslint --config .github/ci/eslint.config.mjs samples
.github/ci/node_modules/.bin/tsc --noEmit --checkJs --allowJs \
  --module nodenext --moduleResolution nodenext --target es2022 --skipLibCheck \
  samples/express/public/demos/*/app.js
```

The last command checks every demo's calls into `<sv-presenter>` against
`@perxona/presenter-types`, and an event's payload where the handler names the event type.
`PRESENTER_STATUS` handlers are typed `any` for now, because the demos handle the `Failed` status
and the published types do not include it yet. The command also type-checks the rest of each
`app.js`, so annotate a DOM lookup when you use a property that only a specific element has, the
way the existing demos do.

The linter and type checker settings live in [`.github/ci/`](.github/ci/), outside the sample, so
that `npm install` in the sample stays small. Change them in a pull request like any other file.

VRM uploader, from `tools/vrm-uploader/`:

```bash
bash -n upload-vrm.sh
shellcheck --format=gcc upload-vrm.sh
pnpm install --frozen-lockfile
pnpm exec eslint .
pnpm exec vitest run
```

Follow `samples/express/.editorconfig` (UTF-8, LF line endings, two-space indentation, a final
newline) everywhere in the repository, and do not reformat lines your change does not touch.

## Correcting a fact

One fact is often written in several places, each for a different reader, and the copies rarely
share a searchable phrase. A search for the corrected wording cannot tell you that you are
finished, so open each of these and read it:

- `README.md`, including its FAQ and the "Samples and tools" list
- `AGENTS.md`, `samples/AGENTS.md` and `tools/AGENTS.md`
- the sample's or tool's own `README.md` and `AGENTS.md`
- `samples/express/.env.example`, `samples/express/public/index.html` and each demo's `README.md`
- code comments and the text of test assertions

If the same fact is also in the handbook, say so in the pull request or open an issue, so that it
is fixed there too.

Check what a key, a scope or an endpoint can do against the handbook's API reference or
`samples/express/docs/openapi.yaml` before you write it down. Do not write it from memory.

## Adding a demo, a sample or a tool

A **sample** is a standalone app for one runtime or framework, in its own directory under
`samples/`, such as `samples/express/`. A **demo** is one page inside a sample, such as Embed or
Studio in the Express sample.

**A demo in the Express sample** goes under `samples/express/public/demos/<name>/` with its script
in `app.js`, the file name the type check in CI looks for. In the same pull request, update:

- `samples/express/public/index.html`, with a link and a one-line description
- `samples/express/README.md`: the directory tree, the list of demos, and the route and
  environment variable tables if the demo adds to them
- `samples/express/AGENTS.md`: the architecture and configuration sections
- `samples/express/.env.example`, if the demo adds a variable

**A sample for a new runtime or framework** gets its own directory under `samples/` with its own
`README.md`, `AGENTS.md` and dependency manifest. Add it to `samples/AGENTS.md` and to the
"Samples and tools" list in `README.md`. It chooses its own layout and states it in its
`AGENTS.md`: the paths and file names above belong to the Express sample. A variation in the user
interface is a demo of an existing sample, not a new sample.

**A tool** follows the same rules under `tools/`, with its index in `tools/AGENTS.md`.

A new sample or tool also needs a CI job in `.github/workflows/ci.yml`.

Two existing directories are not samples or tools in this sense, and these rules do not apply to
them:

- `samples/maker/` is a page that presents a project built with the kit and links to that
  project's own repository. A page like it needs only a `README.md` and a link from the root
  `README.md`.
- `tools/handbook-to-markdown/` is the maintainers' script that generates `docs/`, `llms.txt` and
  `llms-full.txt`.

## When a sample's behaviour changes

The handbook has chapters that describe the Express sample. If you change what the sample does,
say so in the pull request so that the handbook can be updated to match.

## When something breaks

If a sample stops working against production, the presenter misbehaves, or the handbook or the
API reference is wrong,
[open an issue](https://github.com/XRSPACE-Inc/perxona-connect-kit/issues).

## For coding agents

The rules for each sample and tool are in its own `AGENTS.md`. Subdirectories carry a `CLAUDE.md`
that imports the `AGENTS.md` beside it. If your agent loads only `CLAUDE.md` files and you add
your own at the repository root, import [`AGENTS.md`](AGENTS.md) from it so that these rules are
still read.
