#!/usr/bin/env sh
# Collects the Custom GPT knowledge files into integrations/chatgpt/knowledge/, under the
# names gpt-instructions.md refers to. Run from anywhere: sh integrations/chatgpt/build-knowledge.sh
set -eu
here=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$here/../.." && pwd)
out="$here/knowledge"

rm -rf "$out"
mkdir -p "$out"
cp "$root/llms-full.txt" "$out/llms-full.txt"
cp "$root/integrations/starter/avatar.html" "$out/avatar.html"
cp "$root/integrations/lovable/PerxonaAvatar.tsx" "$out/PerxonaAvatar.tsx"
cp "$root/integrations/lovable/supabase/functions/perxona-chat/index.ts" "$out/perxona-chat.ts"
cp "$root/integrations/lovable/README.md" "$out/lovable-README.md"

echo "Upload these files as the GPT's Knowledge:"
ls -1 "$out"
