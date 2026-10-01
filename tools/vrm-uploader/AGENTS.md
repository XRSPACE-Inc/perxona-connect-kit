# Repository Guidelines

The **Perxona Connect Kit — VRM Uploader** is `upload-vrm.sh`: one shell script that checks a
`.vrm` file against what the Connect API and the avatar runtime accept, then uploads it as an
avatar. It is the whole tool — there is no app, no build step and no runtime dependency beyond
`bash`, `jq` and `curl`.

## Using it from an agent

**Do not upload for now.** `<sv-presenter>` cannot display an uploaded VRM avatar yet — the
renderer that draws VRM models has not been released — so an upload would only add an avatar that
nothing can show. Until this paragraph is removed, run `--validate-only` and stop there. If the user
asks for an upload, tell them it is on hold and why instead of running it. The script itself does
not enforce this: the second command below still uploads.

```bash
./upload-vrm.sh --validate-only --json model.vrm     # decide whether to go on
PERXONA_CONNECT_SECRET_KEY=... ./upload-vrm.sh --skeleton-type female --json model.vrm
```

With `--json`, stdout carries one JSON object and nothing else; the human report is suppressed
rather than interleaved. Read `valid` and `checks[]`, not the text. Exit codes: `0` passed, `1`
usage / missing tool / missing key, `2` the file failed the checks, `3` the upload failed.

`--skeleton-type` is the only judgement call the script cannot make: it picks the motion style,
and its four values (`male`, `female`, `male_three_head`, `female_three_head`) all play, so a wrong
choice looks wrong rather than failing. Ask rather than guess.

`--avatar-name` is held to the API's 256-character limit before anything else runs, and the count
comes from jq rather than bash: `${#value}` counts bytes under a C locale, which would reject a name
of 200 Japanese characters that the API accepts.

Never pass the API key on the command line. It is read from `PERXONA_CONNECT_SECRET_KEY` precisely
so it stays out of `ps` and shell history, and there is no option to override that.

## Architecture

`upload-vrm.sh` runs in one direction: parse arguments, confirm `jq` and `curl` exist, read the
GLB header, cut out the JSON chunk, analyse that document once, walk the checks in order, then
upload if every blocking check passed.

- **One jq pass.** `analyze_document` writes `analysis.json` in the temp work directory; each
  `check_*` function reads a field out of it. Adding a check means adding a field there and a
  `check_*` that reports it — not a second traversal of the document.
- **Checks are recorded, not printed.** `record <id> <status> <message>` writes one JSON line and,
  outside `--json`, one report line. A new check needs its id in `ALL_CHECK_IDS` as well, in the
  order it runs: whatever has not run when the script stops is reported as `skipped`, so the
  report always covers every id.
- **Blocking checks return non-zero**; `run_checks` stops at the first one. `expressions` is the
  exception and always returns 0 — a model with no expression data still loads and plays motions.
- **`set -e` is off inside `run_checks`**, because bash suppresses errexit for a function called in
  a condition. Every command whose failure matters is tested explicitly.

## Checks

Blocking: `file_readable`, `file_size` (50 MB, the API's own `MAX_VRM_FILE_SIZE_MB`),
`glb_container`, `json_chunk`, `vrm_extension`, `embedded_resources`, `skinned_mesh`.
Warning only: `expressions`.

Two deliberate limits:

- **The VRM version is reported, never judged.** 1.0 and 0.x both upload, matching the API, which
  accepts either extension. Where the two spell something differently — mouth presets, humanoid
  bones, MToon, spring bones — `analyze_document` reads both spellings.
- **Skeleton checking stops at "some mesh has a skin".** Whether the skin's joints are the humanoid
  bones, whether every required bone is present, and whether the hips sit above the ground are all
  left out on purpose. They are real failure modes, and the day one of them reaches production is
  the day to add it — not before.

## The lip-sync engine

`check_expressions` sets `LIPSYNC_MODE`, which the upload sends as `lipsync_mode`. All 52 ARKit
blendshapes resolving means `xrlipsync`; anything else means `wlipsync`. There is no option for it,
because the answer is a property of the file.

The rule mirrors the runtime and must keep mirroring it — looser and the model gets an ML engine it
cannot feed, stricter and it loses one it could have used:

- Names come from `meshes[].extras.targetNames`, on meshes some node references. Not from the VRM
  `expressions` block: authoring tools vary in whether they also wrap ARKit morphs as expressions,
  and the runtime reads only the morph target names.
- A `targetNames` list whose length disagrees with the primitive's morph target count is dropped
  whole, because the glTF loader drops it.
- Matching is trim + lowercase, exact first and containing second, so `Face.jawOpen` resolves
  `jawOpen`.

## Tests

`tests/` is Vitest over the real script: `glb.mjs` assembles `.vrm` files byte by byte, `run.mjs`
executes `upload-vrm.sh` with a replaced environment so a developer's real key can never leak into
a run, and the two suites cover the checks and the upload. The upload suite answers with a local
`http.createServer` stub and asserts the raw multipart body, so there is no parser to keep in step
with `curl`; one of its cases puts a `curl` of its own ahead on `PATH` to read the argv the real one
was handed, which is the only place the "the key is never an argument" claim can be checked.

`run.mjs` honours `VRM_UPLOADER_BASH` so a run can pin the interpreter, which is how a machine
carrying a newer bash still exercises the 3.2 the script is written to.

Every blocking check owns a fixture that fails only that check, and every rule this file calls
non-negotiable owns one too — the unreferenced mesh, the mismatched name list, the decorated
spelling. Keep it that way: a claim with no fixture is a claim that can be deleted without anything
turning red.

```bash
pnpm install && pnpm test
pnpm lint
shellcheck --format=gcc upload-vrm.sh
```

Run all three plus `bash -n` before proposing a change. Shellcheck must stay at zero findings,
notes included.

Shellcheck renames findings between releases, and CI tracks whatever its runner ships. The
trap-invoked `cleanup` is the case that exists today: 0.10 calls its body unreachable (SC2317),
0.11 calls the function uncalled (SC2329), and the directive above it silences both. A finding you
cannot reproduce locally usually means your version differs from CI's, which prints its own version
before it runs.

## Coding style

Bash 3.2, because that is what macOS ships: no associative arrays, no `mapfile`, no `${var,,}`.
Two-space indent, `local` for everything inside a function, and `[ ]` over `[[ ]]` unless the test
needs more. Keep the script free of dependencies beyond `jq` and `curl`; anything that would need a
runtime belongs in a different tool.
