# Multi-touch Zoom (Chrome Manifest V3)

A Google Chrome extension that enables smooth, multi-touch pinch to zoom and Shift + scroll zooming on desktop.

Migrated to **Manifest V3** for full compatibility with current and future versions of Google Chrome. Includes native key simulation support for **Touchégg** on Linux.

Based on [firefox-multi-touch-zoom](https://github.com/haxiomic/firefox-multi-touch-zoom) by George Corney and forks by NayamAmarshe & Marwane.

---

## Features

- **Lag-Free Touchégg Integration**: Direct key binding for <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>↑</kbd> / <kbd>↓</kbd> via Touchégg's `SEND_KEYS`, eliminating `xdotool` subprocess lag.
- **Smooth Zooming**: Smooth CSS-based viewport zoom instead of stepped browser page zoom.
- **Shift + Scroll**: Hold <kbd>Shift</kbd> and swipe up or down with two fingers (or mouse wheel) to smoothly zoom in and out.
- **Touchpad Pinch / Ctrl + Scroll**: Optional support for touchpad pinch gestures and Ctrl+scroll.
- **Pan Viewport When Zoomed**: Hold <kbd>Shift</kbd> and move your mouse to pan around the zoomed page smoothly.
- **Reset Zoom**: Press <kbd>Ctrl</kbd> + <kbd>0</kbd> (or <kbd>Cmd</kbd> + <kbd>0</kbd> on macOS) to instantly reset the page zoom and layout.
- **Live Settings Popup**: Click the extension icon in the toolbar or options to adjust zoom speed and toggle features in real-time across open tabs.
- **Manifest V3 Compliant**: Fully updated for modern Google Chrome with clean permissions and no deprecated APIs.

---

## Linux Touchégg Setup (Pinch to Zoom without xdotool)

To get completely lag-free pinch-to-zoom using Touchégg:

1. Open or create `~/.config/touchegg/touchegg.conf`.
2. Add the following inside the `<touchégg>` section:

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

3. Restart Touchégg:
   ```bash
   killall -u "$USER" touchegg; touchegg &
   ```
   This restarts only the Touchégg *client* (the part that runs actions). The system daemon (`touchegg --daemon`, run as root) can keep running.

4. Make sure **Key zoom (Ctrl + Alt + ↑/↓)** is turned on in the extension popup.

A ready-to-use config is in [`touchegg/touchegg.conf`](touchegg/touchegg.conf). Touchégg's step size is set by `action_execute_threshold`; the extension animates each step so the zoom glides instead of jumping.

Because Touchégg emits keys natively via `SEND_KEYS` (without spawning `xdotool`), zooming is immediate and fluid.

---

## Installation

1. Clone this repository or download the ZIP:
   ```bash
   git clone https://github.com/bmarwane/chrome-multi-touch-zoom.git
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
| **Touchpad Pinch (Touchégg)** | 2-finger pinch in / out (emits <kbd>Ctrl</kbd>+<kbd>Alt</kbd>+<kbd>↑</kbd>/<kbd>↓</kbd>) |
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
