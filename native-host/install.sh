#!/usr/bin/env bash
# Registers the pinch helper with Chrome, Chromium, Brave and Opera (incl. Opera GX)
# for the current user. Run again if you move the repository folder.
set -euo pipefail

HOST_NAME="com.multitouchzoom.pinch"
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HOST_PATH="$DIR/pinch_host.py"
EXT_DIR="$(cd "$DIR/../extension" && pwd)"

# An unpacked extension's ID is derived from its folder path; pass an ID to override.
EXT_ID="${1:-$(printf '%s' "$EXT_DIR" | sha256sum | cut -c1-32 | tr '0-9a-f' 'a-p')}"

chmod +x "$HOST_PATH"

MANIFEST=$(cat <<EOF
{
  "name": "$HOST_NAME",
  "description": "Multi-touch Zoom pinch helper (reads gestures from Touchégg)",
  "path": "$HOST_PATH",
  "type": "stdio",
  "allowed_origins": ["chrome-extension://$EXT_ID/"]
}
EOF
)

for d in \
  "$HOME/.config/google-chrome" \
  "$HOME/.config/google-chrome-beta" \
  "$HOME/.config/chromium" \
  "$HOME/.config/BraveSoftware/Brave-Browser" \
  "$HOME/.config/opera" \
  "$HOME/.config/opera-gx"; do
  if [ -d "$d" ]; then
    mkdir -p "$d/NativeMessagingHosts"
    printf '%s\n' "$MANIFEST" > "$d/NativeMessagingHosts/$HOST_NAME.json"
    echo "registered for: $d"
  fi
done
echo "extension id: $EXT_ID"
