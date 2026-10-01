#!/usr/bin/env bash
#
# Perxona Connect Kit — VRM validator and uploader.
#
# Checks a .vrm file against what the Connect API and the avatar runtime accept,
# then uploads it and publishes it as an avatar in your organization.
#
# Written for bash 3.2 so it runs on a stock macOS shell: no associative arrays,
# no `mapfile`, no `${var,,}`.

set -euo pipefail

VERSION="1.0.0"

# The Connect API refuses anything larger (its own MAX_VRM_FILE_SIZE_MB).
MAX_FILE_SIZE_MB=50
BYTES_PER_MB=1048576

DEFAULT_API_BASE_URL="https://console.perxona.ai/asia"
UPLOAD_PATH="/api/v1/connect/assets/vrm/upload"

# The API's own limit on an asset name. Counted in characters, not bytes.
AVATAR_NAME_MAX_LENGTH=256

# A run driven by a script or an assistant has nobody to press Ctrl-C, so the
# upload bounds how long it will wait to connect and how long it tolerates a
# transfer moving under STALL_BYTES_PER_SECOND.
CONNECT_TIMEOUT_SECONDS=30
STALL_BYTES_PER_SECOND=1024
STALL_SECONDS=120

# A GLB starts with a 12-byte header (magic, version, total length) followed by
# chunk 0's own 8-byte header (length, type). The JSON payload begins at 20.
GLB_HEADER_BYTES=12
JSON_CHUNK_OFFSET=20
GLB_VERSION=2

# The 52 blendshapes ARKit defines, spelled the way the avatar runtime spells
# them. A model resolving all 52 gets the ML lip-sync engine; anything else is
# driven through its VRM mouth presets instead.
ARKIT_52='[
  "browInnerUp","browDownLeft","browDownRight","browOuterUpLeft","browOuterUpRight",
  "eyeLookUpLeft","eyeLookUpRight","eyeLookDownLeft","eyeLookDownRight",
  "eyeLookInLeft","eyeLookInRight","eyeLookOutLeft","eyeLookOutRight",
  "eyeBlinkLeft","eyeBlinkRight","eyeSquintLeft","eyeSquintRight",
  "eyeWideLeft","eyeWideRight",
  "cheekPuff","cheekSquintLeft","cheekSquintRight",
  "noseSneerLeft","noseSneerRight",
  "jawOpen","jawForward","jawLeft","jawRight",
  "mouthFunnel","mouthPucker","mouthLeft","mouthRight",
  "mouthRollUpper","mouthRollLower","mouthShrugUpper","mouthShrugLower",
  "mouthClose","mouthSmileLeft","mouthSmileRight","mouthFrownLeft","mouthFrownRight",
  "mouthDimpleLeft","mouthDimpleRight","mouthUpperUpLeft","mouthUpperUpRight",
  "mouthLowerDownLeft","mouthLowerDownRight","mouthPressLeft","mouthPressRight",
  "mouthStretchLeft","mouthStretchRight","tongueOut"
]'

# Every check, in the order they run. Whatever has not run by the time the
# script finishes is reported as skipped, so the report always covers all of them.
ALL_CHECK_IDS="file_readable file_size glb_container json_chunk vrm_extension embedded_resources skinned_mesh expressions"

EXIT_OK=0
EXIT_USAGE=1
EXIT_INVALID=2
EXIT_UPLOAD_FAILED=3

VRM_FILE=""
SKELETON_TYPE=""
AVATAR_NAME=""
VALIDATE_ONLY=false
JSON_MODE=false

FILE_SIZE=""
JSON_CHUNK_LENGTH=0
VRM_VERSION=""
LIPSYNC_MODE=""
LIPSYNC_REASON=""
RECORDED_IDS=""
FAILED=false
UPLOAD_JSON='{"status":"skipped","reason":"not attempted"}'

WORK_DIR=""
CHECKS_FILE=""

usage() {
  cat <<USAGE
Perxona Connect Kit — VRM validator and uploader (v${VERSION})

Usage:
  upload-vrm.sh [options] <file.vrm>

Options:
  --skeleton-type <type>   Motion style the avatar draws its gestures from.
                           One of: male, female, male_three_head, female_three_head.
                           Required unless --validate-only is given.
  --avatar-name <name>     Display name, up to ${AVATAR_NAME_MAX_LENGTH} characters.
                           Defaults to the file name.
  --validate-only          Run the checks and stop; never uploads.
  --json                   Print one JSON object on stdout instead of a report.
  -h, --help               Show this help.

Environment:
  PERXONA_CONNECT_SECRET_KEY   Connect API key of type "secret". Required to upload.
  PERXONA_API_BASE_URL         API base URL. Defaults to ${DEFAULT_API_BASE_URL}.

Exit codes:
  0  passed (uploaded, unless --validate-only)
  1  bad usage, missing tool, or missing key
  2  the file did not pass the checks
  3  the upload failed
USAGE
}

# Invoked by the EXIT trap below, which shellcheck cannot see: it reads the body
# as unreachable (SC2317) or the function as uncalled (SC2329) depending on its
# version, so both are silenced.
# shellcheck disable=SC2317,SC2329
cleanup() {
  if [ -n "$WORK_DIR" ] && [ -d "$WORK_DIR" ]; then
    rm -rf "$WORK_DIR"
  fi
}
trap cleanup EXIT

# --- output -----------------------------------------------------------------

say() {
  if [ "$JSON_MODE" = false ]; then
    printf '%s\n' "$1"
  fi
}

# Escapes a value for a JSON string. Hand-rolled because the one caller runs
# before the dependency check, so jq may not be there to do it.
json_string() {
  local value=$1
  value=${value//\\/\\\\}
  value=${value//\"/\\\"}
  # A raw control character is not legal inside a JSON string, and a file name
  # can carry one.
  printf '%s' "$value" | tr -d '\000-\037'
}

# Usage and environment problems are not check results: they abort before any
# report exists, so they carry their own minimal JSON shape.
fail_usage() {
  local message=$1
  shift
  local missing='[]'
  if [ $# -gt 0 ]; then
    missing=$1
  fi
  if [ "$JSON_MODE" = true ]; then
    printf '{"valid":false,"error":"%s","missing_dependencies":%s}\n' "$(json_string "$message")" "$missing"
  else
    printf 'error: %s\n' "$message" >&2
  fi
  exit "$EXIT_USAGE"
}

record() {
  local id=$1 status=$2 message=$3
  RECORDED_IDS="$RECORDED_IDS $id"
  if [ "$status" = "fail" ]; then
    FAILED=true
  fi

  if [ "$JSON_MODE" = false ]; then
    local marker
    case "$status" in
      pass) marker="OK  " ;;
      warn) marker="WARN" ;;
      fail) marker="FAIL" ;;
      *) marker="SKIP" ;;
    esac
    printf '  %s  %-19s %s\n' "$marker" "$id" "$message"
  fi

  jq -n --arg id "$id" --arg status "$status" --arg message "$message" \
    '{id: $id, status: $status, message: $message}' >>"$CHECKS_FILE"
}

was_recorded() {
  case " $RECORDED_IDS " in
    *" $1 "*) return 0 ;;
    *) return 1 ;;
  esac
}

# Fills in the checks that never ran so the report covers every id.
record_skipped_checks() {
  local reason=$1 id
  for id in $ALL_CHECK_IDS; do
    if ! was_recorded "$id"; then
      record "$id" "skipped" "not run: $reason"
    fi
  done
}

finish() {
  local exit_code=$1

  if [ "$JSON_MODE" = true ]; then
    jq -n \
      --arg file "$VRM_FILE" \
      --arg size "$FILE_SIZE" \
      --arg vrm_version "$VRM_VERSION" \
      --arg lipsync_mode "$LIPSYNC_MODE" \
      --arg lipsync_reason "$LIPSYNC_REASON" \
      --argjson valid "$([ "$FAILED" = true ] && echo false || echo true)" \
      --argjson upload "$UPLOAD_JSON" \
      --slurpfile checks "$CHECKS_FILE" \
      '{
         file: $file,
         size_bytes: (if $size == "" then null else ($size | tonumber) end),
         vrm_version: (if $vrm_version == "" then null else $vrm_version end),
         valid: $valid,
         checks: $checks,
         lipsync_mode: (if $lipsync_mode == "" then null else $lipsync_mode end),
         lipsync_reason: (if $lipsync_reason == "" then null else $lipsync_reason end),
         upload: $upload
       }'
  fi

  exit "$exit_code"
}

human_size() {
  local bytes=$1 tenths
  if [ "$bytes" -lt "$BYTES_PER_MB" ]; then
    tenths=$(((bytes * 10 + 512) / 1024))
    printf '%d.%d KB' "$((tenths / 10))" "$((tenths % 10))"
    return 0
  fi
  tenths=$(((bytes * 10 + BYTES_PER_MB / 2) / BYTES_PER_MB))
  printf '%d.%d MB' "$((tenths / 10))" "$((tenths % 10))"
}

# --- binary helpers ---------------------------------------------------------

# Reads a little-endian uint32, the only integer encoding a GLB header uses.
read_u32_le() {
  local file=$1 offset=$2 bytes
  bytes=$(od -A n -t u1 -N 4 -j "$offset" "$file")
  # Word splitting is what turns od's four numbers into $1..$4.
  # shellcheck disable=SC2086
  set -- $bytes
  printf '%d\n' "$(($1 + $2 * 256 + $3 * 65536 + $4 * 16777216))"
}

read_ascii4() {
  local file=$1 offset=$2
  head -c "$((offset + 4))" "$file" | tail -c 4
}

# --- argument parsing -------------------------------------------------------

parse_args() {
  while [ $# -gt 0 ]; do
    case "$1" in
      --skeleton-type)
        [ $# -ge 2 ] || fail_usage "--skeleton-type needs a value"
        SKELETON_TYPE=$2
        shift 2
        ;;
      --skeleton-type=*)
        SKELETON_TYPE=${1#*=}
        shift
        ;;
      --avatar-name)
        [ $# -ge 2 ] || fail_usage "--avatar-name needs a value"
        AVATAR_NAME=$2
        shift 2
        ;;
      --avatar-name=*)
        AVATAR_NAME=${1#*=}
        shift
        ;;
      --validate-only)
        VALIDATE_ONLY=true
        shift
        ;;
      --json)
        JSON_MODE=true
        shift
        ;;
      -h | --help)
        usage
        exit "$EXIT_OK"
        ;;
      --)
        shift
        break
        ;;
      -*)
        fail_usage "unknown option: $1"
        ;;
      *)
        [ -z "$VRM_FILE" ] || fail_usage "only one file can be given (got '$VRM_FILE' and '$1')"
        VRM_FILE=$1
        shift
        ;;
    esac
  done

  while [ $# -gt 0 ]; do
    [ -z "$VRM_FILE" ] || fail_usage "only one file can be given (got '$VRM_FILE' and '$1')"
    VRM_FILE=$1
    shift
  done

  [ -n "$VRM_FILE" ] || fail_usage "no file given; run with --help for usage"

  if [ -n "$SKELETON_TYPE" ]; then
    case "$SKELETON_TYPE" in
      male | female | male_three_head | female_three_head) ;;
      *) fail_usage "unknown --skeleton-type '$SKELETON_TYPE'; expected male, female, male_three_head or female_three_head" ;;
    esac
  fi

  # Both are needed before any work starts, so an upload never fails on a
  # missing key only after the checks have already run.
  if [ "$VALIDATE_ONLY" = false ]; then
    [ -n "$SKELETON_TYPE" ] || fail_usage "--skeleton-type is required to upload (or use --validate-only)"
    [ -n "${PERXONA_CONNECT_SECRET_KEY:-}" ] ||
      fail_usage "PERXONA_CONNECT_SECRET_KEY is not set; a Connect API key of type 'secret' is needed to upload"
  fi
}

# Runs after the dependency check because it counts with jq. bash's own
# ${#value} counts bytes under a C locale, which would reject a name of 200
# Japanese characters that the API accepts.
check_avatar_name_length() {
  [ -n "$AVATAR_NAME" ] || return 0

  local length
  length=$(jq -rn --arg name "$AVATAR_NAME" '$name | length')
  if [ "$length" -gt "$AVATAR_NAME_MAX_LENGTH" ]; then
    fail_usage "--avatar-name is $length characters; the API accepts at most $AVATAR_NAME_MAX_LENGTH"
  fi
}

require_dependencies() {
  local missing="" tool
  for tool in jq curl; do
    if ! command -v "$tool" >/dev/null 2>&1; then
      missing="$missing $tool"
    fi
  done
  [ -n "$missing" ] || return 0

  local as_json="[" first=true
  for tool in $missing; do
    [ "$first" = true ] || as_json="$as_json,"
    as_json="$as_json\"$tool\""
    first=false
  done
  as_json="$as_json]"

  if [ "$JSON_MODE" = true ]; then
    printf '{"valid":false,"error":"missing dependencies","missing_dependencies":%s}\n' "$as_json"
  else
    printf 'error: this script needs%s. Install and run again.\n' "$missing" >&2
    case "$missing" in
      *jq*) printf '  jq:   https://jqlang.github.io/jq/download/\n' >&2 ;;
    esac
    case "$missing" in
      *curl*) printf '  curl: https://curl.se/download.html\n' >&2 ;;
    esac
  fi
  exit "$EXIT_USAGE"
}

# --- checks -----------------------------------------------------------------

check_file_readable() {
  if [ ! -e "$VRM_FILE" ]; then
    record "file_readable" "fail" "no such file: $VRM_FILE"
    return 1
  fi
  if [ ! -f "$VRM_FILE" ]; then
    record "file_readable" "fail" "not a regular file: $VRM_FILE"
    return 1
  fi
  if [ ! -r "$VRM_FILE" ]; then
    record "file_readable" "fail" "cannot read: $VRM_FILE"
    return 1
  fi
  record "file_readable" "pass" "$VRM_FILE"
}

check_file_size() {
  FILE_SIZE=$(wc -c <"$VRM_FILE" | tr -d ' ')
  local limit=$((MAX_FILE_SIZE_MB * BYTES_PER_MB))
  if [ "$FILE_SIZE" -gt "$limit" ]; then
    record "file_size" "fail" "$(human_size "$FILE_SIZE") exceeds the ${MAX_FILE_SIZE_MB} MB limit"
    return 1
  fi
  record "file_size" "pass" "$(human_size "$FILE_SIZE") (limit ${MAX_FILE_SIZE_MB} MB)"
}

# A .vrm is a GLB: the same container glTF uses, with a VRM extension inside its
# JSON. Nothing below can run until the container itself reads back.
check_glb_container() {
  if [ "$FILE_SIZE" -lt "$JSON_CHUNK_OFFSET" ]; then
    record "glb_container" "fail" "file is too short to be a GLB (${FILE_SIZE} bytes)"
    return 1
  fi

  local magic
  magic=$(head -c 4 "$VRM_FILE")
  if [ "$magic" != "glTF" ]; then
    record "glb_container" "fail" "not a GLB: the file does not start with the glTF magic"
    return 1
  fi

  local version
  version=$(read_u32_le "$VRM_FILE" 4)
  if [ "$version" -ne "$GLB_VERSION" ]; then
    record "glb_container" "fail" "unsupported GLB version $version; expected $GLB_VERSION"
    return 1
  fi

  local declared_length
  declared_length=$(read_u32_le "$VRM_FILE" 8)
  # Equality, matching the API: a header under-reporting the length leaves
  # trailing bytes the API refuses, which is exactly the round trip this script
  # exists to save.
  if [ "$declared_length" -ne "$FILE_SIZE" ]; then
    record "glb_container" "fail" "the GLB header declares $declared_length bytes but the file holds $FILE_SIZE"
    return 1
  fi

  local chunk_type
  chunk_type=$(read_ascii4 "$VRM_FILE" 16)
  if [ "$chunk_type" != "JSON" ]; then
    record "glb_container" "fail" "the first GLB chunk is not JSON"
    return 1
  fi

  JSON_CHUNK_LENGTH=$(read_u32_le "$VRM_FILE" "$GLB_HEADER_BYTES")
  if [ "$JSON_CHUNK_LENGTH" -le 0 ] || [ "$((JSON_CHUNK_OFFSET + JSON_CHUNK_LENGTH))" -gt "$FILE_SIZE" ]; then
    record "glb_container" "fail" "the JSON chunk runs past the end of the file"
    return 1
  fi

  record "glb_container" "pass" "glTF 2 binary, JSON chunk $JSON_CHUNK_LENGTH bytes"
}

check_json_chunk() {
  # head first, then tail: head closes the pipe on its own terms, so neither
  # side of the pipeline is killed by SIGPIPE on a large file.
  head -c "$((JSON_CHUNK_OFFSET + JSON_CHUNK_LENGTH))" "$VRM_FILE" |
    tail -c "$JSON_CHUNK_LENGTH" >"$WORK_DIR/chunk.json"

  if ! jq empty "$WORK_DIR/chunk.json" >/dev/null 2>&1; then
    record "json_chunk" "fail" "the GLB's JSON chunk does not parse"
    return 1
  fi
  if ! analyze_document 2>"$WORK_DIR/analysis.err"; then
    record "json_chunk" "fail" "the glTF document could not be read: $(tr '\n' ' ' <"$WORK_DIR/analysis.err")"
    return 1
  fi
  record "json_chunk" "pass" "parsed"
}

# One pass over the document; every check below reads a field out of the result.
analyze_document() {
  jq --argjson arkit "$ARKIT_52" -f /dev/stdin "$WORK_DIR/chunk.json" >"$WORK_DIR/analysis.json" <<'JQ'
def trim: sub("^\\s+"; "") | sub("\\s+$"; "");
def norm: ascii_downcase | trim;

. as $doc
| (($doc.extensions // {}) | if type == "object" then . else {} end) as $ext

# Only meshes some node actually references are loaded, so only those carry
# morph targets the runtime can drive.
| ([($doc.nodes // [])[] | select(type == "object") | .mesh | select(type == "number")]
   | unique) as $used_meshes

# A name list whose length disagrees with the morph target count is dropped
# wholesale by the glTF loader, which leaves those morphs unnamed.
| ([$used_meshes[]
    | ($doc.meshes // [])[.]
    | select(type == "object")
    | select((((.extras // {}) | if type == "object" then . else {} end).targetNames | type) == "array")
    | select((.extras.targetNames | length)
             == (((((.primitives // [])[0]) // {}).targets // []) | length))
    | .extras.targetNames[]
    | select(type == "string")
    | norm]) as $morphs

| ($arkit | map(ascii_downcase)) as $wanted
| ($wanted
   | map(select(. as $want
                | ($morphs | any(. == $want)) or ($morphs | any(contains($want)))))) as $resolved

| (if ($ext.VRMC_vrm | type) == "object" then
     {present: true, flavor: "VRMC_vrm",
      version: (($ext.VRMC_vrm.specVersion | select(type == "string")) // "1.0")}
   elif ($ext.VRM | type) == "object" then
     {present: true, flavor: "VRM",
      version: (($ext.VRM.specVersion | select(type == "string")) // "0.x")}
   else
     {present: false, flavor: null, version: null}
   end) as $vrm

# VRM 1.0 keeps the mouth shapes as named presets; 0.x keeps them as blend
# shape groups tagged with a preset name. Only a preset that actually binds a
# morph target moves anything.
| (if $vrm.flavor == "VRMC_vrm" then
     [(((($ext.VRMC_vrm.expressions // {}) | if type == "object" then . else {} end).preset // {})
       | if type == "object" then . else {} end
       | to_entries[])
      | . as $entry
      | ($entry.key | ascii_downcase) as $name
      | select(["aa", "ih", "ou", "ee", "oh"] | index($name) != null)
      | select(((((($entry.value // {}) | if type == "object" then . else {} end).morphTargetBinds) // []) | length) > 0)
      | $entry.key]
   elif $vrm.flavor == "VRM" then
     [(((($ext.VRM.blendShapeMaster // {}) | if type == "object" then . else {} end).blendShapeGroups // [])[]
       | select(type == "object"))
      | . as $group
      | (($group.presetName // "") | ascii_downcase) as $name
      | select(["a", "i", "u", "e", "o"] | index($name) != null)
      | select((($group.binds // []) | length) > 0)
      | $group.presetName]
   else
     []
   end) as $mouth

| {
    vrm: $vrm,
    external_uris: [(($doc.buffers // [])[] | select(type == "object") | .uri),
                    (($doc.images // [])[] | select(type == "object") | .uri)]
                   | map(select(type == "string"))
                   | map(select(startswith("data:") | not)),
    skinned_mesh_nodes: [($doc.nodes // [])[]
                         | select(type == "object")
                         | select(has("mesh") and has("skin"))]
                        | length,
    mouth_presets: {bound: ($mouth | unique | length), expected: 5},
    arkit: {total: ($wanted | length),
            resolved: ($resolved | length),
            missing: ($wanted - $resolved)}
  }
JQ
}

analysis() {
  jq -r "$1" "$WORK_DIR/analysis.json"
}

check_vrm_extension() {
  if [ "$(analysis '.vrm.present')" != "true" ]; then
    record "vrm_extension" "fail" "not a VRM: the glTF carries neither the VRMC_vrm nor the VRM extension"
    return 1
  fi
  VRM_VERSION=$(analysis '.vrm.version')
  record "vrm_extension" "pass" "VRM $VRM_VERSION ($(analysis '.vrm.flavor'))"
}

check_embedded_resources() {
  local external_count
  external_count=$(analysis '.external_uris | length')
  if [ "$external_count" -gt 0 ]; then
    record "embedded_resources" "fail" \
      "$external_count buffer/image reference(s) point outside the file (first: $(analysis '.external_uris[0]')); only this one file is uploaded"
    return 1
  fi
  record "embedded_resources" "pass" "all buffers and images are embedded"
}

check_skinned_mesh() {
  local skinned
  skinned=$(analysis '.skinned_mesh_nodes')
  if [ "$skinned" -lt 1 ]; then
    record "skinned_mesh" "fail" "no mesh is bound to a skeleton, so the avatar cannot play motions"
    return 1
  fi
  record "skinned_mesh" "pass" "$skinned skinned mesh node(s)"
}

# The only check that never blocks an upload: a model without expression data
# still loads and plays motions, it just does not move its mouth.
check_expressions() {
  local bound resolved total
  bound=$(analysis '.mouth_presets.bound')
  resolved=$(analysis '.arkit.resolved')
  total=$(analysis '.arkit.total')

  if [ "$resolved" -eq "$total" ]; then
    LIPSYNC_MODE="xrlipsync"
    LIPSYNC_REASON="all $total ARKit blendshapes resolve"
    record "expressions" "pass" "ARKit $resolved/$total resolved; $bound/5 mouth presets bound"
    return 0
  fi

  LIPSYNC_MODE="wlipsync"

  if [ "$bound" -lt 1 ]; then
    LIPSYNC_REASON="ARKit-52 does not resolve ($resolved/$total found) and there are no mouth presets, so nothing drives the mouth"
    record "expressions" "warn" \
      "no mouth presets and ARKit $resolved/$total: this avatar will not lip-sync"
    return 0
  fi

  LIPSYNC_REASON="ARKit-52 does not resolve ($resolved/$total found), so the VRM mouth presets drive the mouth"
  record "expressions" "pass" "$bound/5 mouth presets bound; ARKit $resolved/$total"
}

run_checks() {
  say "Checking $VRM_FILE"

  check_file_readable || return 1
  check_file_size || return 1
  check_glb_container || return 1
  check_json_chunk || return 1
  check_vrm_extension || return 1
  check_embedded_resources || return 1
  check_skinned_mesh || return 1
  check_expressions
}

# --- upload -----------------------------------------------------------------

# curl quotes a value and escapes a backslash or quote inside it, in its config
# format and in a --form file name alike.
curl_quote() {
  local value=$1
  value=${value//\\/\\\\}
  printf '%s' "${value//\"/\\\"}"
}

curl_config() {
  printf 'header = "X-Connect-Key: %s"\n' "$(curl_quote "${PERXONA_CONNECT_SECRET_KEY}")"
}

upload() {
  local api_base_url=${PERXONA_API_BASE_URL:-$DEFAULT_API_BASE_URL}
  api_base_url=${api_base_url%/}
  local url="$api_base_url$UPLOAD_PATH"

  local curl_args
  curl_args=(--silent --show-error --request POST)
  curl_args+=(--config -)
  curl_args+=(--connect-timeout "$CONNECT_TIMEOUT_SECONDS")
  # A whole-run deadline would cut off a large file on a slow link; this aborts
  # only a transfer that has actually stalled.
  curl_args+=(--speed-limit "$STALL_BYTES_PER_SECOND" --speed-time "$STALL_SECONDS")
  # --form reads `;`, `@` and `<` inside a value as syntax: it would cut a name
  # at a semicolon, refuse one starting with `@`, and read a local file for one
  # starting with `<`. --form-string takes the value literally.
  #
  # The file field is the one that genuinely needs --form, so its path is
  # quoted instead: after the `@`, curl reads `,` as another file and `;` as the
  # start of a parameter, and a path holding either fails before the request is
  # ever made.
  curl_args+=(--form "vrm_file=@\"$(curl_quote "${VRM_FILE}")\";type=model/gltf-binary")
  curl_args+=(--form-string "skeleton_type=${SKELETON_TYPE}")
  curl_args+=(--form-string "lipsync_mode=${LIPSYNC_MODE}")
  if [ -n "$AVATAR_NAME" ]; then
    curl_args+=(--form-string "avatar_name=${AVATAR_NAME}")
  fi

  say ""
  say "Uploading to $url"
  say "  skeleton_type: $SKELETON_TYPE"
  say "  lipsync_mode:  $LIPSYNC_MODE"

  # The key goes in on stdin, never in argv: on Linux any user on the machine
  # can read another process's /proc/<pid>/cmdline. Nothing is written to disk
  # either, so there is no file to leak or clean up.
  local http_code=""
  local curl_status=0
  http_code=$(curl_config | curl "${curl_args[@]}" \
    --output "$WORK_DIR/response.json" \
    --write-out '%{http_code}' \
    "$url" 2>"$WORK_DIR/curl.err") || curl_status=$?

  if [ "$curl_status" -ne 0 ]; then
    local transport_error
    transport_error=$(cat "$WORK_DIR/curl.err")
    UPLOAD_JSON=$(jq -n --arg message "$transport_error" --argjson code "$curl_status" \
      '{status: "failed", http_status: null, curl_exit_code: $code, error: {message: $message}}')
    say ""
    say "Upload failed before reaching the API: $transport_error"
    return 1
  fi

  # An error body is either the API's own {code, details} or FastAPI's
  # {detail: ...} for a rejected form field. Neither is rewritten here.
  local body='null'
  if [ -s "$WORK_DIR/response.json" ] && jq empty "$WORK_DIR/response.json" >/dev/null 2>&1; then
    body=$(cat "$WORK_DIR/response.json")
  elif [ -s "$WORK_DIR/response.json" ]; then
    body=$(jq -Rs '{raw: .}' <"$WORK_DIR/response.json")
  fi

  if [ "$http_code" = "200" ]; then
    local avatar_id
    avatar_id=$(printf '%s' "$body" | jq -r '.avatar_id // empty')
    UPLOAD_JSON=$(jq -n --arg id "$avatar_id" --argjson code "$http_code" \
      '{status: "ok", http_status: $code, avatar_id: (if $id == "" then null else $id end)}')
    say ""
    say "Uploaded. avatar_id: ${avatar_id:-unknown}"
    return 0
  fi

  UPLOAD_JSON=$(jq -n --argjson code "$http_code" --argjson body "$body" \
    '{status: "failed", http_status: $code, error: $body}')
  say ""
  say "Upload failed with HTTP $http_code"
  if [ "$JSON_MODE" = false ]; then
    printf '%s\n' "$body" | jq . >&2 2>/dev/null || printf '%s\n' "$body" >&2
  fi
  return 1
}

# --- main -------------------------------------------------------------------

main() {
  parse_args "$@"
  require_dependencies
  check_avatar_name_length

  WORK_DIR=$(mktemp -d)
  CHECKS_FILE="$WORK_DIR/checks.jsonl"
  : >"$CHECKS_FILE"

  if ! run_checks; then
    record_skipped_checks "an earlier check failed"
    UPLOAD_JSON='{"status":"skipped","reason":"the file did not pass the checks"}'
    say ""
    say "Result: FAILED"
    finish "$EXIT_INVALID"
  fi

  say ""
  say "lipsync_mode: $LIPSYNC_MODE ($LIPSYNC_REASON)"

  if [ "$VALIDATE_ONLY" = true ]; then
    UPLOAD_JSON='{"status":"skipped","reason":"--validate-only"}'
    say "Result: PASSED (not uploaded)"
    finish "$EXIT_OK"
  fi

  say "Result: PASSED"

  if ! upload; then
    finish "$EXIT_UPLOAD_FAILED"
  fi

  finish "$EXIT_OK"
}

main "$@"
