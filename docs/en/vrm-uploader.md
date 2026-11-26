## VRM Uploader

![Perxona Connect Kit: VRM 1.0 Character Upload Now Available](https://connect.perxona.ai/assets/images/connect-vrm-support.jpeg)

Perxona Connect Kit lets you add your own
**VRM** characters to the avatar catalog yourself,
with one script and no extra infrastructure. This is the fastest
path from a `.vrm` file to a live, speaking avatar —
whether it's a branded mascot, a digital presenter, or a
personal project.

🪆

Uploaded avatars are scoped to your Perxona organization
account. Any member of the same org can select them from the
Connect Kit avatar dropdown immediately after upload — no
redeploy needed.

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

   ```bash
   export PERXONA_CONNECT_SECRET_KEY=pxc_...
   ./upload-vrm.sh --gender female --heads-tall 8 my-avatar.vrm
   ```

   The script talks to
   `https://console.perxona.ai/asia` unless you
   say otherwise. Outside that region, export
   `PERXONA_API_BASE_URL` with your own base URL
   first — a key issued in one region is not accepted in
   another, and the refusal never mentions regions.

   `--gender` (`male` or
   `female`) and
   `--heads-tall` (`3`,
   `6` or `8`, the body's height in
   heads) together pick the motion set your avatar draws its
   gestures from. Clips are retargeted onto your own rig, so
   the wrong choice gives you gestures in the wrong style
   rather than a playback failure. Add
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
  look-at presets. To lip-sync with these presets, the model
  needs all five mouth shapes.
- **ARKit-52 blendshapes**: morph targets named
  with the standard ARKit names (such as `jawOpen`,
  `eyeBlinkLeft`), all 52 of them — a partial set
  does not count. Standard names are what to aim for, but a
  decorated spelling such as `Face.jawOpen` is
  recognised too — names are matched without regard to case or
  surrounding whitespace, an exact match first and a containing
  one second.

💡

**What each kind of data gives you.** With the
five mouth-shape presets, the avatar lip-syncs while it
speaks. With all 52 ARKit blendshapes, it lip-syncs and also
plays the facial animation that comes with its motions. A
model with only some of the ARKit names plays no facial
animation. If it also lacks any of the five mouth shapes, it
does not lip-sync. Whichever data it has, you can set any of
its expressions yourself with `setExpressionWeight`
(see
[Presenter Component Reference](https://connect.perxona.ai/#sdk-set-expression-weight)).

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
