#!/bin/sh
# Builds the Chrome Web Store ZIP with extension files only (no docs/, marketing/, research/).
set -e
cd "$(dirname "$0")/.."
V=$(python3 -c "import json;print(json.load(open('manifest.json'))['version'])")
OUT="volume-booster-v$V.zip"
rm -f "$OUT"
zip -qr "$OUT" manifest.json background content offscreen popup welcome shared icons/*.png \
  $( [ -d _locales ] && echo _locales ) -x '*.DS_Store'
unzip -l "$OUT"
echo "Built $OUT. Next: git tag v$V && git push origin v$V"
