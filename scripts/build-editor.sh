#!/usr/bin/env bash
# Phaser Editor production build → release/
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$root"

if [[ ! -d node_modules ]]; then
  npm install
fi

npm run fix:electron
# Apple Development sertifikasi DMG/zip'i Gatekeeper'da "hasarli" yapar.
# Yerel paket ad-hoc kalsin; dagitim icin Developer ID + notarize gerekir.
export CSC_IDENTITY_AUTO_DISCOVERY=false
npm run dist

app="$root/release/mac-arm64/Phaser Editor.app"
if [[ "$(uname)" == "Darwin" && -d "$app" ]]; then
  xattr -cr "$app" 2>/dev/null || true
  echo "Uygulamayi ac: open \"$app\""
  echo "(DMG/zip degil; Finder'da .app cift tikla. Ilk acilista karsilama ekrani normal.)"
else
  echo "Editor paketi: $root/release"
fi
