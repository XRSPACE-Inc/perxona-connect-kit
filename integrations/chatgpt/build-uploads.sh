#!/usr/bin/env sh
# Builds everything an organizer uploads to ChatGPT, into integrations/chatgpt/uploads/ (git-ignored):
#   uploads/perxona-connect.zip   the perxona-connect skill, for ChatGPT's Skills page
#   uploads/project/              files for a ChatGPT Project, under the names
#                                 project-instructions.md refers to
# Run from anywhere: sh integrations/chatgpt/build-uploads.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
out="$here/uploads"

rm -rf "$out"
mkdir -p "$out/project"

# The skill is shared with Claude: one SKILL.md, same format on both platforms.
(cd "$root/integrations/claude/plugin/skills" && zip -qr "$out/perxona-connect.zip" perxona-connect -x '*.DS_Store')

cp "$root/llms-full.txt" "$out/project/llms-full.txt"
cp "$root/integrations/starter/avatar.html" "$out/project/avatar.html"
cp "$root/integrations/lovable/PerxonaAvatar.tsx" "$out/project/PerxonaAvatar.tsx"
cp "$root/integrations/lovable/supabase/functions/perxona-chat/index.ts" "$out/project/perxona-chat.ts"
cp "$root/integrations/lovable/README.md" "$out/project/lovable-README.md"

echo "Skill (ChatGPT → Plugins → Skills → Create → Upload): $out/perxona-connect.zip"
echo "Project files (ChatGPT → Projects → project files):"
ls -1 "$out/project"
