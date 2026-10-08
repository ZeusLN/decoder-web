#!/bin/sh
# Renders scripts/og-image.html to public/og-image.png (1200x630) with
# headless Chrome. Set CHROME to the browser binary if it is not the
# default macOS location.
set -e
cd "$(dirname "$0")/.."
CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --hide-scrollbars \
    --window-size=1200,630 --virtual-time-budget=3000 \
    --allow-file-access-from-files \
    --screenshot="$PWD/public/og-image.png" \
    "file://$PWD/scripts/og-image.html" >/dev/null 2>&1
echo "Wrote public/og-image.png"
