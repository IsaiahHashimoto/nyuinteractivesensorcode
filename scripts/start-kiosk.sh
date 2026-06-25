#!/usr/bin/env bash
set -euo pipefail

URL="${EARTHSEED_URL:-http://localhost:3001/p5/yes-bridge.html}"

for _ in {1..60}; do
  if command -v curl >/dev/null 2>&1 && curl -fsS "$URL" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

BROWSER=""
for candidate in chromium-browser chromium google-chrome google-chrome-stable; do
  if command -v "$candidate" >/dev/null 2>&1; then
    BROWSER="$candidate"
    break
  fi
done

if [ -z "$BROWSER" ]; then
  echo "No Chromium-compatible browser found. Install chromium-browser or chromium."
  exit 1
fi

exec "$BROWSER" \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --check-for-update-interval=31536000 \
  "$URL"
