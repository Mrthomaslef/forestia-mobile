#!/bin/bash
# Lancé par Sunshine quand on ouvre "Forestia" dans Moonlight :
# démarre Forestia dans RetroArch (cœur DOSBox Pure) si besoin, en plein écran, avec le son.
DIR="$(cd "$(dirname "$0")" && pwd)"
R="$DIR/retroarch"
if ! pgrep -f "RetroArch.app/Contents/MacOS/RetroArch" >/dev/null; then
  cd "$DIR/extracted"
  nohup /Applications/RetroArch.app/Contents/MacOS/RetroArch --config "$R/retroarch.cfg" \
    -L "$R/cores/dosbox_pure_libretro.dylib" "$DIR/extracted/FORESTIA.CUE" >/tmp/retroarch.log 2>&1 &
  sleep 4
fi
osascript -e 'tell application "RetroArch" to activate' >/dev/null 2>&1 || true
