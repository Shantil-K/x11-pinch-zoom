# Multi-touch Zoom (Chrome Manifest V3)

A Google Chrome extension that enables smooth, multi-touch pinch to zoom and Shift + scroll zooming on desktop.

Migrated to **Manifest V3** for full compatibility with current and future versions of Google Chrome. Includes native key simulation support for **Touchégg** on Linux.

Based on [firefox-multi-touch-zoom](https://github.com/haxiomic/firefox-multi-touch-zoom) by George Corney and forks by NayamAmarshe & Marwane.

---

## Features

- **Continuous Pinch on Linux X11**: A native helper forwards Touchégg's pinch gestures so the zoom follows your fingers, or use Touchégg `SEND_KEYS` key presses instead (see below).
- **Smooth Zooming**: Smooth CSS-based viewport zoom instead of stepped browser page zoom.
- **Shift + Scroll**: Hold <kbd>Shift</kbd> and swipe up or down with two fingers (or mouse wheel) to smoothly zoom in and out.
- **Touchpad Pinch / Ctrl + Scroll**: Optional support for touchpad pinch gestures and Ctrl+scroll.
- **Pan Viewport When Zoomed**: Hold <kbd>Shift</kbd> and move your mouse to pan around the zoomed page smoothly.
- **Reset Zoom**: Press <kbd>Ctrl</kbd> + <kbd>0</kbd> (or <kbd>Cmd</kbd> + <kbd>0</kbd> on macOS) to instantly reset the page zoom and layout.
- **Live Settings Popup**: Click the extension icon in the toolbar or options to adjust zoom speed and toggle features in real-time across open tabs.
- **Manifest V3 Compliant**: Fully updated for modern Google Chrome with clean permissions and no deprecated APIs.

---

## Linux Pinch to Zoom (X11 + Touchégg)

On X11, Chrome and Opera don't receive touchpad pinch gestures themselves, so something has to pass them on. There are two ways to do it. Both need the [Touchégg](https://github.com/JoseExposito/touchegg) daemon running (`touchegg --daemon`, normally started by the system). Only use one at a time; `switch-method.sh` switches between them.

### Quick install

```bash
git clone https://github.com/Shantil-K/chrome-multi-touch-zoom.git
cd chrome-multi-touch-zoom
./install.sh
```

`install.sh` checks for Touchégg and `python3-gi`, registers the pinch helper with Chrome, Chromium, Brave, Opera and Opera GX, and selects the continuous pinch method. Then load the `extension` folder as an unpacked extension (see [Installation](#installation)) and reload your tabs. Keep the folder where it is: the browser runs the helper from it, and the extension ID depends on the path (run `./install.sh` again if you move it).

The sections below explain what it sets up and how to do it by hand.

### Native helper (recommended, continuous)

A small helper ([`native-host/pinch_host.py`](native-host/pinch_host.py)) listens to the gestures that the Touchégg daemon broadcasts over D-Bus and sends the exact pinch amount to the extension through Chrome's native messaging. The zoom follows your fingers continuously, including reversing mid-pinch. It needs no sudo and no `input` group.

1. Load the extension (see [Installation](#installation)).
2. Register the helper with your browsers (Chrome, Chromium, Brave, Opera, Opera GX):
   ```bash
   native-host/install.sh
   ```
   Re-run it if you move the repository folder; the extension ID is derived from the folder path.
3. Select this method (removes Touchégg's own pinch actions so they don't zoom twice):
   ```bash
   ./switch-method.sh native
   ```
4. Reload the extension in `chrome://extensions` / `opera://extensions`, then reload your tabs.

Requires `python3-gi` (installed by default on Ubuntu / Mint). The zoom speed slider bends the response; at the default 0.7x the page follows your fingers 1:1.

### Touchégg key presses (no helper)

Touchégg presses <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> itself (`SEND_KEYS`, no `xdotool`), and the extension animates each step so the zoom glides instead of jumping.

1. Turn on **Key zoom (Ctrl + Alt + ↑/↓)** in the extension popup.
2. Select this method:
   ```bash
   ./switch-method.sh keys
   ```

The config it installs is [`touchegg/touchegg.conf`](touchegg/touchegg.conf):

```xml
  <application name="Opera,opera,Google-chrome,google-chrome,Chromium,chromium,Brave-browser">
    <gesture type="PINCH" fingers="2" direction="OUT">
      <action type="SEND_KEYS">
        <repeat>true</repeat>
        <modifiers>Control_L+Alt_L</modifiers>
        <keys>Up</keys>
        <decreaseKeys>Down</decreaseKeys>
      </action>
    </gesture>

    <gesture type="PINCH" fingers="2" direction="IN">
      <action type="SEND_KEYS">
        <repeat>true</repeat>
        <modifiers>Control_L+Alt_L</modifiers>
        <keys>Down</keys>
        <decreaseKeys>Up</decreaseKeys>
      </action>
    </gesture>
  </application>
```

Step size is set by `action_execute_threshold`.

### Switching methods

```bash
./switch-method.sh native   # native helper (continuous)
./switch-method.sh keys     # Touchégg key presses
```

The script swaps `~/.config/touchegg/touchegg.conf` (backing up the old one as `touchegg.conf.bak`), tells the helper whether to act, and starts the Touchégg client if it isn't running. Touchégg reloads its config on its own, and the change applies from the next pinch; no browser restart needed.

---

## Installation

1. Clone this repository or download the ZIP:
   ```bash
   git clone https://github.com/Shantil-K/chrome-multi-touch-zoom.git
   ```
2. Open Google Chrome and navigate to `chrome://extensions/`
3. Enable **Developer mode** using the toggle switch in the top-right corner.
4. Click the **Load unpacked** button in the top-left corner.
5. Select the `extension` folder inside this repository.
6. The extension is now active! Refresh any open tabs for the zoom functionality to take effect.

---

## How to Use

| Action | Shortcut / Gesture |
|---|---|
| **Touchpad Pinch (Linux X11)** | 2-finger pinch in / out (via the native helper or Touchégg keys, see above) |
| **Zoom In / Out** | Hold <kbd>Shift</kbd> + Scroll (or two-finger swipe up/down) |
| **Pan Viewport** | While zoomed in, hold <kbd>Shift</kbd> and move your mouse |
| **Reset Zoom** | Press <kbd>Ctrl</kbd> + <kbd>0</kbd> (or <kbd>Cmd</kbd> + <kbd>0</kbd>) |

---

## Settings & Options

Click the extension icon in your Chrome toolbar (or right-click and choose **Options**) to configure:
- **Touchégg pinch keys (Ctrl + Alt + Up/Down)** *(default: enabled)*
- **Enable SHIFT + scroll zoom** *(default: enabled)*
- **Enable CTRL / Touchpad pinch** *(default: disabled)*
- **Hide scrollbars when zooming** *(default: disabled)*
- **Zoom speed slider** *(default: 0.7x, range: 0.1x to 3.0x)*

---

## Troubleshooting

- **Doesn't work on a tab that was already open:** extensions only load into pages opened after install or reload. Refresh the tab.
- **Doesn't work on Google / Bing search in Opera:** Opera blocks extensions on search results pages. Some Opera builds have an **Allow access to search page results** switch on the extension's details page; if yours doesn't, use the browser's own zoom there.
- **Doesn't work on browser pages** (`chrome://`, `opera://`, the Web Store, the start page): browsers don't allow extensions there.
- **Pinch zooms twice as fast / jumpy:** both methods are active. Run `./switch-method.sh native` or `./switch-method.sh keys` again.
