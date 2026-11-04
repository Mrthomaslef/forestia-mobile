#!/bin/bash
# Lancé par Sunshine quand on ouvre "Forestia" dans Moonlight :
# démarre DOSBox Pure si besoin, le met au premier plan et en plein écran.
DIR="$(cd "$(dirname "$0")" && pwd)"
if ! pgrep -f "DOSBoxPure.app/Contents/MacOS/DOSBoxPure" >/dev/null; then
  nohup "$DIR/lancer_forestia.sh" >/tmp/forestia_dosbox.log 2>&1 &
fi
for i in $(seq 1 30); do
  osascript >/dev/null 2>&1 <<'OSA' && exit 0
tell application "System Events" to tell (first process whose name contains "DOSBox")
  set frontmost to true
  set w to (first window whose name starts with "DOSBox Pure")
  if value of attribute "AXFullScreen" of w is false then set value of attribute "AXFullScreen" of w to true
end tell
OSA
  sleep 1
done
