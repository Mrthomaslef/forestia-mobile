#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
EXTRACTED_DIR="$SCRIPT_DIR/extracted"
APP_SUPPORT_DIR="$HOME/Library/Application Support/DOSBoxPure"

mkdir -p "$APP_SUPPORT_DIR/saves" "$APP_SUPPORT_DIR/system"
cp -f "$EXTRACTED_DIR/DOSBoxPure.cfg" "$APP_SUPPORT_DIR/DOSBoxPure.cfg"
cp -n "$EXTRACTED_DIR/saves/FORESTIA.pure.zip" "$APP_SUPPORT_DIR/saves/FORESTIA.pure.zip" 2>/dev/null || true
ln -sf "$EXTRACTED_DIR/system/fr_windows_98_se.img" "$APP_SUPPORT_DIR/system/fr_windows_98_se.img"

cd "$EXTRACTED_DIR"
exec "$EXTRACTED_DIR/DOSBoxPure.app/Contents/MacOS/DOSBoxPure" "$EXTRACTED_DIR/FORESTIA.CUE"
