#!/usr/bin/env bash
# Switch how touchpad pinch reaches the extension (Linux / X11 + Touchégg).
#   ./switch-method.sh native   continuous pinch via the native helper (default)
#   ./switch-method.sh keys     Touchégg sends Ctrl+Alt+Up/Down (needs "Key zoom" on in the popup)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$HOME/.config/touchegg/touchegg.conf"

case "${1:-}" in
  native) SRC="$DIR/touchegg/touchegg-native.conf" ;;
  keys)   SRC="$DIR/touchegg/touchegg.conf" ;;
  *) echo "usage: $0 native|keys"; exit 1 ;;
esac

mkdir -p "$(dirname "$CONF")" "$HOME/.config/multitouch-zoom"
[ -f "$CONF" ] && ! cmp -s "$CONF" "$SRC" && cp "$CONF" "$CONF.bak"
cp "$SRC" "$CONF"                                   # Touchégg reloads it automatically
echo "$1" > "$HOME/.config/multitouch-zoom/method"  # the helper reads this per gesture

pgrep -u "$USER" -x touchegg >/dev/null || (setsid touchegg >/dev/null 2>&1 < /dev/null &)
echo "pinch method: $1"
