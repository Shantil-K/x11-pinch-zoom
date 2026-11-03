#!/usr/bin/env bash
# One-step setup for touchpad pinch zoom on Linux (X11 + Touchégg).
# Checks dependencies, registers the native pinch helper with your browsers,
# and selects the continuous "native" pinch method.
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

ok()   { printf '  \033[32m✓\033[0m %s\n' "$1"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$1"; }
fail() { printf '  \033[31m✗\033[0m %s\n' "$1"; missing=1; }
missing=0

echo "Checking requirements..."

if [ "${XDG_SESSION_TYPE:-}" = "wayland" ]; then
  warn "You're on Wayland. Browsers get pinch natively there; this helper is meant for X11."
else
  ok "Session: ${XDG_SESSION_TYPE:-unknown}"
fi

if command -v touchegg >/dev/null; then
  ok "Touchégg installed ($(touchegg --version 2>/dev/null | head -1 || echo '?'))"
else
  fail "Touchégg not found. Install it: sudo apt install touchegg   (or see https://github.com/JoseExposito/touchegg)"
fi

if pgrep -x touchegg -a 2>/dev/null | grep -q -- '--daemon'; then
  ok "Touchégg daemon running"
else
  fail "Touchégg daemon not running. Start it: sudo systemctl enable --now touchegg"
fi

if /usr/bin/python3 -c 'import gi; gi.require_version("Gio", "2.0"); from gi.repository import Gio' 2>/dev/null; then
  ok "python3-gi available"
else
  fail "python3-gi missing. Install it: sudo apt install python3-gi"
fi

if [ "$missing" = 1 ]; then
  echo
  echo "Fix the items above, then run ./install.sh again."
  exit 1
fi

echo
echo "Registering the pinch helper with your browsers..."
"$DIR/native-host/install.sh"

echo
echo "Selecting the continuous pinch method..."
"$DIR/switch-method.sh" native

cat <<EOF

Done. Last steps in your browser:
  1. Open chrome://extensions (or opera://extensions, brave://extensions)
  2. Turn on Developer mode, click "Load unpacked", choose:
       $DIR/extension
     (already loaded? click its reload button instead)
  3. Reload your open tabs, then pinch with two fingers.

Prefer Touchégg key presses instead?  ./switch-method.sh keys
EOF
