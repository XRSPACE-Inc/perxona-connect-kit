## VRM Uploader

Perxona Connect Kit lets you add your own
**VRM** characters to the avatar catalog yourself,
with one script and no extra infrastructure. This is the fastest
path from a `.vrm` file to a live, speaking avatar —
whether it's a branded mascot, a digital presenter, or a
personal project.

⏸️

**Uploading is on hold:** please do not upload a
VRM yet. An uploaded VRM becomes a Three.js avatar, and
Connect is not serving those yet: by default the avatar
catalog does not return it, and
`<sv-presenter>`'s Three.js renderer has not
been released. The upload itself succeeds, but you cannot
list, select or display the result. Until this notice is
removed, run `upload-vrm.sh` with
`--validate-only` only. The checks are unaffected,
so you can still get your file ready. The rest of this section
describes how uploading works once it opens again.

🪆

Uploaded avatars are scoped to your Perxona organization
account. Any member of the same org can select them from the
Connect Kit avatar dropdown immediately after upload — no
redeploy needed.

⚠️

**Beta notice:** Connect Kit is currently in
closed beta. VRM avatars uploaded today are expected to expire
after one month and will no longer be maintained. Perxona
reserves the right to remove them. We will maintain VRM files
uploaded after a future Connect Kit release.

### Uploading Your VRM

`upload-vrm.sh` checks your file against everything
on this page and uploads it when it passes. It needs
`bash`, `jq` and `curl`, plus a
Connect API key of type **secret** — see
[Get Your API Credentials](https://connect.perxona.ai/#credentials). Only a
secret key may upload an asset.

1. #### Get the script

   ```bash
   curl -fsSLO https://raw.githubusercontent.com/XRSPACE-Inc/perxona-connect-kit/main/tools/vrm-uploader/upload-vrm.sh
   chmod +x upload-vrm.sh
   ```
2. #### Check the file

   ```bash
   ./upload-vrm.sh --validate-only my-avatar.vrm
   ```

   Every check prints a line. Anything marked
   `FAIL` stops the upload. The one check that can
   only warn is about expression data, because a model
   without it still loads and plays motions.
3. #### Upload it

   **On hold for now** — see the notice at the
   top of this section. Do not run this step until that
   notice is removed.

   ```bash
   export PERXONA_CONNECT_SECRET_KEY=pxc_...
   ./upload-vrm.sh --skeleton-type female my-avatar.vrm
   ```

   The script talks to
   `https://console.perxona.ai/asia` unless you
   say otherwise. Outside that region, export
   `PERXONA_API_BASE_URL` with your own base URL
   first — a key issued in one region is not accepted in
   another, and the refusal never mentions regions.

   `--skeleton-type` picks the motion style your
   avatar draws its gestures from: `male`,
   `female`, `male_three_head` or
   `female_three_head`. Clips are retargeted onto
   your own rig, so the wrong choice gives you gestures in
   the wrong style rather than a playback failure. Add
   `--avatar-name "My Avatar"` to set the display
   name; without it the file name is used.

The script prints the new avatar's id, and the character appears
in the avatar list returned by
`GET /assets/avatars`, ready to use in your project.

🤖

**Working with an AI coding assistant?** Add
`--json` to either command and the script prints
one JSON object instead of the report, carrying a
`pass`/`warn`/`fail` entry
per check. Exit codes are fixed: `0` passed,
`1` bad usage or a missing tool or key,
`2` the checks failed, `3` the upload
failed. Something like this is enough to hand over:
*"Download upload-vrm.sh from the Connect Kit repo, run it
with --validate-only --json on my .vrm, and tell me what to
fix before I upload."*

### Supported VRM Specification

Check your file against this list — every item can be verified
in common tools such as VRoid Studio or Blender. No Perxona
tooling is needed.

- **VRM 1.0 is what this list assumes.** A VRM 0.x
  file uploads too — the uploader reports which version it found
  rather than refusing one — but everything below is written
  against 1.0, so export 1.0 when you have the choice (for
  example from VRoid Studio).
- **File size up to 50 MB.**
- **Humanoid skeleton with all 15 required bones**:
  `hips`, `spine`, `head`, plus
  upper leg / lower leg / foot and upper arm / lower arm / hand
  on both sides. Other humanoid bones (chest, neck, shoulders,
  fingers, …) are optional, but once assigned they must follow
  the VRM 1.0 bone hierarchy. Bone *names* are free — we
  read the VRM humanoid mapping, not node names, so any DCC
  export works.
- **MToon materials recommended.** Non-MToon
  materials still load, but fall back to basic unlit / PBR
  shading, so the look may differ from your DCC preview. Avatars
  are rendered with built-in lighting — light sources inside the
  VRM file have no effect.

🧹

**Export only the character.** When exporting
your VRM 1.0 file, include the character itself and nothing
else. We try to strip scenes, backgrounds, props, cameras,
light sources, and embedded animations automatically during
conversion, but leftover extras can still fail the conversion
validation and block the upload.

💇

**No swing physics yet.** Spring-bone settings
(`VRMC_springBone`) are not simulated — hair,
skirts, and accessories will not sway.

### Lip-sync and Expressions

A model without expression data still loads and moves, but it
will not lip-sync or emote. Provide at least one of:

- **VRM 1.0 expression presets** (VRoid Studio
  exports these by default): mouth shapes `aa`,
  `ih`, `ou`, `ee`,
  `oh`; emotions `happy`,
  `angry`, `sad`, `relaxed`,
  `surprised`; plus `neutral`, blink and
  look-at presets.
- **ARKit-52 blendshapes**: morph targets named
  with the standard ARKit names (such as `jawOpen`,
  `eyeBlinkLeft`). Standard names are what to aim
  for, but a decorated spelling such as
  `Face.jawOpen` is recognised too — names are
  matched without regard to case or surrounding whitespace, an
  exact match first and a containing one second.

🚧

**Facial animation is not live yet.** The engine
that renders Connect-uploaded models does not yet drive
lip-sync or facial expressions. Prepare the expression data
above so your model is ready the moment it ships; a model
without it still loads and plays motions either way.

Want the full picture of the format itself? See the official
[VRM 1.0 documentation](https://vrm.dev/en/vrm1/)
(a Chinese-language community guide is also available
[here](https://docs.vrcd.org.cn/books/vrm-vrm/page/vrm-10#bkmrk-vrm-1.0-%E4%BB%8B%E7%BB%8D%E2%80%8B)).

### Reference Model: ViviPod42

Not sure what a qualifying file looks like? We verified
**ViviPod42** — a free model by
**softmind** (vTuber ホームセンター) — against our
pipeline: VRM 1.0, complete humanoid skeleton, all 18 expression
presets, and 19 of 20 materials in MToon. Download it from the
author's page on
[BOOTH](https://booth.pm/en/items/5447425)
and compare it with your own file.

©️

**ViviPod42 is not a Perxona asset.** It is
provided free of charge by its original author, for reference
only. Per the license embedded in the file: redistribution and
modification are prohibited, use is limited to personal
non-commercial purposes, and credit is required. That is also
why we link to the author's page instead of hosting the file
ourselves. Use it for local spec comparison only — do not
upload it to Connect or use it in your own project; either
would count as redistribution.

### Where to Find a VRM File

- Browse
  [BOOTH](https://booth.pm/en/)
  for VRM models — many listings are still VRM 0.x, so confirm
  the version and the license terms before downloading.
- Or build your own with
  [VRoid Studio](https://vroid.com/en/studio)
  (free) and export it as VRM 1.0.

### Questions or a Failed Upload?

Not sure whether your file qualifies, or did an upload fail?
Post the file details and the error message in our
[Discord channel](https://discord.com/channels/1509062382432026624/1514521511028068374)
and we will help you sort it out. Not on our Discord server yet?
Join first via
[this invite link](https://discord.gg/dywx2nJRE)
— the channel link above only opens for members.
