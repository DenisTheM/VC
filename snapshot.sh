#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")"
PROJECT_NAME=$(basename "$(pwd)")
OUTPUT="${PROJECT_NAME}-snapshot.md"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
echo "📸 Erstelle Snapshot von: $PROJECT_NAME"
{
echo "# Codebase Snapshot: $PROJECT_NAME"
echo "> Erstellt am: $TIMESTAMP"
echo ""
echo "## Verzeichnisstruktur"
echo '```'
find . -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' -not -name '*-snapshot.md' -not -name 'snapshot.sh' -type f | sort
echo '```'
echo ""
echo "---"
echo ""
find . -not -path './node_modules/*' -not -path './.next/*' -not -path './.git/*' -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.json' -o -name '*.css' -o -name '*.scss' -o -name '*.html' -o -name '*.md' -o -name '*.mdx' -o -name '*.yaml' -o -name '*.yml' -o -name '*.toml' -o -name '*.mjs' -o -name '*.svg' -o -name '.env.example' \) -not -name 'package-lock.json' -not -name 'yarn.lock' -not -name 'pnpm-lock.yaml' -not -name '*-snapshot.md' -not -name 'snapshot.sh' | sort | while IFS= read -r file; do
ext="${file##*.}"
echo "## \`$file\`"
echo ""
echo '```'"$ext"
cat "$file"
echo ""
echo '```'
echo ""
done
} > "$OUTPUT"
FILE_SIZE=$(du -h "$OUTPUT" | cut -f1)
echo "✅ Fertig! 📄 $OUTPUT ($FILE_SIZE)"
