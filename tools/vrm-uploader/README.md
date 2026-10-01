# Perxona Connect Kit — VRM Uploader

`upload-vrm.sh` checks a `.vrm` file against what the Perxona Connect API and the avatar runtime
accept, and uploads it when it passes. The avatar appears in your organization's catalog right
away — no redeploy, and nobody at Perxona has to upload it for you.

> **Uploading is on hold — please do not upload yet.** `<sv-presenter>` cannot display an uploaded
> VRM avatar for now: the renderer that draws VRM models has not been released. An upload would add
> an avatar to your catalog that nothing can show. Until this notice is removed, run the script
> with `--validate-only` only. The checks are unaffected, so you can still get a file ready.

## Requirements

- `bash`, `jq` and `curl`. The script is written for bash 3.2, so the shell that ships with macOS
  is enough. It does not install anything for you: if `jq` or `curl` is missing it says so and
  stops.
- A Connect API key of type **secret**. Only a secret key may write assets. Create one in the
  Perxona console under Organization → Integration → Connect API keys, and leave its allowed-domain
  list empty.

## Getting the script

```bash
curl -fsSLO https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/tools/vrm-uploader/upload-vrm.sh
chmod +x upload-vrm.sh
```

Or clone the kit and use `tools/vrm-uploader/upload-vrm.sh` from your checkout.

## Checking a file

```bash
./upload-vrm.sh --validate-only my-avatar.vrm
```

```text
Checking my-avatar.vrm
  OK    file_readable       my-avatar.vrm
  OK    file_size           12.4 MB (limit 50 MB)
  OK    glb_container       glTF 2 binary, JSON chunk 231040 bytes
  OK    json_chunk          parsed
  OK    vrm_extension       VRM 1.0 (VRMC_vrm)
  OK    embedded_resources  all buffers and images are embedded
  OK    skinned_mesh        3 skinned mesh node(s)
  OK    expressions         5/5 mouth presets bound; ARKit 0/52

lipsync_mode: wlipsync (ARKit-52 does not resolve (0/52 found), so the VRM mouth presets drive the mouth)
Result: PASSED (not uploaded)
```

## Uploading

> On hold for now — see the notice at the top of this page. This section describes how the upload
> works once it opens again.

```bash
export PERXONA_CONNECT_SECRET_KEY=pxc_...
./upload-vrm.sh --skeleton-type female my-avatar.vrm
```

The checks run first; nothing is uploaded unless they all pass. On success the script prints the
new avatar's id.

### Options

| Option                   | Meaning                                                                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------ |
| `--skeleton-type <type>` | Motion style the avatar draws its gestures from: `male`, `female`, `male_three_head`, `female_three_head`. Required to upload. |
| `--avatar-name <name>`   | Display name, up to 256 characters. Defaults to the file name.                                                                 |
| `--validate-only`        | Run the checks and stop.                                                                                                       |
| `--json`                 | Print one JSON object on stdout instead of the report.                                                                         |
| `-h`, `--help`           | Usage.                                                                                                                         |

`--skeleton-type` is a style choice, not a technical constraint. Motion clips are retargeted onto
your model's own rig, so the wrong choice gives you gestures in the wrong style rather than a
playback failure. The `three_head` values are for 3-head-tall proportions; the plain `male` and
`female` values cover the 8-head-tall range, where most of the motion library lives.

### Environment variables

| Variable                     | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| `PERXONA_CONNECT_SECRET_KEY` | Your secret Connect API key. Required to upload.             |
| `PERXONA_API_BASE_URL`       | API base URL. Defaults to `https://console.perxona.ai/asia`. |

Neither is an option, so your key never lands in your shell history or in the output of `ps`.

## What is checked

Any of these stops the upload:

| Check                | What it means                                                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `file_readable`      | The file exists and can be read.                                                                                                                       |
| `file_size`          | 50 MB or under, which is the API's own limit.                                                                                                          |
| `glb_container`      | It is a well-formed GLB. A `.vrm` **is** a GLB, just with a different extension, so nothing else can be read until this holds.                         |
| `json_chunk`         | The glTF document inside parses.                                                                                                                       |
| `vrm_extension`      | It carries VRM data. Both VRM 1.0 and 0.x are accepted; the version is reported, not judged.                                                           |
| `embedded_resources` | No buffer or image points at a file outside the `.vrm`. Only this one file is uploaded, so anything external would be missing once the avatar is live. |
| `skinned_mesh`       | At least one mesh is bound to a skeleton. Without that the bones move and the body does not follow, so motions do not play.                            |

One check only ever warns:

| Check         | What it means                                                                                                                                                                                                                           |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `expressions` | Whether anything can drive the mouth: the VRM mouth presets (`aa`/`ih`/`ou`/`ee`/`oh`, or `a`/`i`/`u`/`e`/`o` on 0.x), or the full ARKit-52 blendshape set. With neither, the avatar still loads and plays motions but never lip-syncs. |

## How the lip-sync engine is chosen

The script decides, and sends its choice with the upload; there is no option for it.

If the model's morph targets cover all 52 ARKit blendshapes, the avatar gets `xrlipsync`, which
runs the ML lip-sync model. Otherwise it gets `wlipsync`, which drives the VRM's own mouth
expression presets.

The decision reads the **morph target names on the meshes**, not the VRM `expressions` block. Some
authoring tools also wrap ARKit morphs as expressions and some do not, and the runtime itself only
looks at morph target names. Two details follow the runtime exactly:

- A mesh whose `targetNames` list has a different length from its morph target count is ignored
  entirely, because the glTF loader discards that list and leaves those morphs unnamed.
- Names are matched case-insensitively, ignoring surrounding whitespace: an exact match first, then
  a containing match. So `Face.jawOpen` counts as `jawOpen`.

## Exit codes

| Code | Meaning                                                             |
| ---- | ------------------------------------------------------------------- |
| `0`  | Passed. Uploaded, unless `--validate-only`.                         |
| `1`  | Bad usage, a missing tool, or a missing key.                        |
| `2`  | The file did not pass the checks.                                   |
| `3`  | The upload failed. The API's own status and error body are printed. |

## Machine-readable output

`--json` prints one object and nothing else, so a script or a coding assistant can act on the
result:

```json
{
  "file": "my-avatar.vrm",
  "size_bytes": 13002144,
  "vrm_version": "1.0",
  "valid": true,
  "checks": [
    { "id": "file_size", "status": "pass", "message": "12.4 MB (limit 50 MB)" },
    {
      "id": "expressions",
      "status": "pass",
      "message": "5/5 mouth presets bound; ARKit 0/52"
    }
  ],
  "lipsync_mode": "wlipsync",
  "lipsync_reason": "ARKit-52 does not resolve (0/52 found), so the VRM mouth presets drive the mouth",
  "upload": { "status": "ok", "http_status": 200, "avatar_id": "01JTESTAVATAR" }
}
```

Every check appears in `checks`, in the order it runs, with a status of `pass`, `warn`, `fail` or
`skipped`. `upload.status` is `ok`, `failed` or `skipped`; a failure carries `http_status` and the
API's error body under `error`, unchanged.

## Running the tests

```bash
pnpm install
pnpm test
```

The tests build `.vrm` files byte by byte and answer the upload with a local stub server, so they
need no credentials and never reach the real API.
