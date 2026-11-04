#!/usr/bin/env bash
# Switch how touchpad pinch reaches the extension (Linux / X11 + Touchégg).
#   ./switch-method.sh native   continuous pinch via the native helper (default)
#   ./switch-method.sh keys     Touchégg presses the zoom shortcuts (needs "Key zoom" on in the popup)
#   ./switch-method.sh keys IN_MODS IN_KEY OUT_MODS OUT_KEY
#        same, with custom keys, e.g.  keys Control_L+Shift_L Up Control_L+Shift_L Down
#        (set the same shortcuts in the extension popup)
set -euo pipefail
DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONF="$HOME/.config/touchegg/touchegg.conf"
STATE="$HOME/.config/multitouch-zoom"
CUSTOM_KEYS="$STATE/touchegg-keys.conf"  # written from the popup's shortcuts, via the helper

mkdir -p "$(dirname "$CONF")" "$STATE"

case "${1:-}" in
  native)
    SRC="$DIR/touchegg/touchegg-native.conf" ;;
  keys)
    if [ $# -eq 5 ]; then
      "$DIR/native-host/pinch_host.py" --write-keys-conf "$2" "$3" "$4" "$5"
    elif [ $# -ne 1 ]; then
      echo "usage: $0 keys [IN_MODS IN_KEY OUT_MODS OUT_KEY]"; exit 1
    fi
    if [ -f "$CUSTOM_KEYS" ]; then SRC="$CUSTOM_KEYS"; else SRC="$DIR/touchegg/touchegg.conf"; fi ;;
  *)
    sed -n '2,7p' "$0" | sed 's/^# \{0,1\}//'; exit 1 ;;
esac

if [ -f "$CONF" ] && ! cmp -s "$CONF" "$SRC"; then cp "$CONF" "$CONF.bak"; fi
cp "$SRC" "$CONF"                  # Touchégg reloads it automatically
echo "$1" > "$STATE/method"        # the helper reads this per gesture

pgrep -u "$USER" -x touchegg >/dev/null || (setsid touchegg >/dev/null 2>&1 < /dev/null &)
echo "pinch method: $1"
if [ "$1" = keys ]; then
  grep -o '<modifiers>[^<]*</modifiers>\|<keys>[^<]*</keys>' "$CONF" | sed 's/<[^>]*>//g' | paste -sd' ' | \
    awk '{print "  zoom in: " $1 " + " $2 "   zoom out: " $3 " + " $4}'
fi
