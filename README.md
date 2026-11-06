# X11 Pinch Zoom

Smooth, continuous touchpad **pinch-to-zoom** for Chromium-based browsers (Chrome, Opera / Opera GX, Brave, Chromium) on **Linux X11**.

On Wayland these browsers get pinch gestures natively. On X11 they don't: a pinch either does nothing or turns into stepped, jumpy page zoom. This project bridges that gap with a browser extension plus a small helper that forwards the touchpad pinch from [Touchégg](https://github.com/JoseExposito/touchegg), so the page zooms with your fingers like it does on macOS or Wayland.

It also gives every platform smooth Shift + scroll zoom.

Based on [firefox-multi-touch-zoom](https://github.com/haxiomic/firefox-multi-touch-zoom) by George Corney and the Chrome forks by NayamAmarshe, Marwane and Damianoux. Migrated to Manifest V3.

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
git clone https://github.com/Shantil-K/x11-pinch-zoom.git
cd x11-pinch-zoom
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

#### Custom shortcuts

Ctrl + Alt + ↑ / ↓ clashes with workspace switching on some desktops (Cinnamon, GNOME). To use different keys, open the extension popup, click the **Zoom in** or **Zoom out** shortcut and press the new combination (it must include Ctrl, Alt or Super).

- **Native helper installed:** the popup sends the new keys to the helper, which rewrites the Touchégg config to press them. Nothing else to do. The helper also re-syncs the config each time it starts.
- **No helper:** the popup shows a command to run, for example:
  ```bash
  ./switch-method.sh keys Control_L+Shift_L Up Control_L+Shift_L Down
  ```
  Modifiers are `Control_L`, `Alt_L`, `Shift_L`, `Super_L`, joined with `+`.

If both shortcuts use the same modifiers, reversing direction mid-pinch works. Touchégg can't change modifiers mid-gesture, so with different modifiers each pinch only zooms one way.

### Switching methods

```bash
./switch-method.sh native   # native helper (continuous)
./switch-method.sh keys     # Touchégg key presses (your saved shortcuts)
```

The script swaps `~/.config/touchegg/touchegg.conf` (backing up the old one as `touchegg.conf.bak`), tells the helper whether to act, and starts the Touchégg client if it isn't running. Touchégg reloads its config on its own, and the change applies from the next pinch; no browser restart needed.

---

## Installation

1. Clone this repository or download the ZIP:
   ```bash
   git clone https://github.com/Shantil-K/x11-pinch-zoom.git
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

Click the extension icon in your browser toolbar (or right-click and choose **Options**) to configure:
- **Key zoom shortcuts** *(default: enabled, Ctrl + Alt + ↑ / ↓)*: click a shortcut to record a new one
- **Enable SHIFT + scroll zoom** *(default: enabled)*
- **Enable CTRL / Touchpad pinch** *(default: disabled)*
- **Hide scrollbars when zooming** *(default: disabled)*
- **Zoom speed slider** *(default: 0.7x, range: 0.1x to 3.0x)*

---

## How It Works

```
 touchpad ──► libinput ──► Touchégg daemon (root, already running)
                                │  D-Bus broadcast: pinch begin / update / end + amount
                                ▼
                    native-host/pinch_host.py   (started by the browser, runs as you)
                                │  native messaging (stdin/stdout JSON)
                                ▼
                    extension/background.js     (finds the active tab of the focused window)
                                │  chrome.tabs.sendMessage
                                ▼
                    extension/pinch-zoom.js     (scales the page with a CSS transform)
```

- **Zooming the page.** The content script scales `<html>` with a CSS transform anchored at the mouse pointer, and adjusts scroll position so the point under the cursor stays put. While zooming, `will-change: transform` makes the browser stretch the existing image instead of re-rendering at every zoom step; it's removed 40 ms after movement stops for one sharp re-render.
- **Live pinch.** During a pinch only the transform changes: `translate(...) scale(...)`, where the translate stands in for scrolling. That stays on the GPU (no layout, no scroll writes per frame). When the pinch settles, the translate is swapped for the real scroll position in the same frame.
- **Continuous pinch (native helper).** Touchégg's daemon already reads the touchpad as root and broadcasts every gesture on a private D-Bus socket (`unix:abstract=touchegg`). The helper subscribes to it like any Touchégg client would, converts the pinch percentage into a scale factor relative to the start of the gesture, and passes it to the extension at ~140 updates/s. Touchégg's samples are uneven, so the page eases toward the latest pinch scale each frame (~35 ms smoothing) instead of jumping to each sample.
- **Key method.** Touchégg presses a keyboard shortcut for every pinch step (`SEND_KEYS`), and the extension animates each step over a few frames so it glides.
- **Shortcuts.** Recorded in the popup, stored in extension storage, and sent to the helper, which writes the matching Touchégg config.

---

## Problems Faced and How They Were Solved

| Problem | What was going on | Solution |
|---|---|---|
| Zoom only worked on some sites (e.g. GitHub) | The listeners ran in the bubble phase, after the page's own handlers. Many sites stop or cancel wheel/key events first. | Listen in the **capture phase** on `window`, so the extension sees events before the page. |
| Shift + scroll did nothing in Chromium on Linux | Chromium turns Shift + wheel into horizontal scrolling, so `deltaY` is 0 and the value is in `deltaX`. | Fall back to `deltaX` when `deltaY` is 0. |
| Nothing at all on Google / Bing in Opera | Opera refuses to inject extensions into search result pages. Confirmed by listing the page's script contexts over the DevTools protocol: only Opera's built-in extensions were present. | Can't be fixed from an extension. Documented, plus the Opera setting where it exists. |
| Pinch via `xdotool` felt laggy and jumpy | Touchégg started a new `xdotool` process for every step, and each fake click was a full wheel notch applied instantly. | Use Touchégg's built-in `SEND_KEYS` (no process spawn) and **animate discrete steps** (ease-out over ~0.3 s). |
| Chrome on X11 never receives pinch | Recorded the X server with `xinput test-xi2`: a pinch produced no gesture events for apps, and Chrome's X11 backend doesn't consume XInput 2.4 gestures. Wayland was not an option on the test laptop. | Bridge the gesture from outside the browser. |
| Reading the touchpad directly needs root or the `input` group | `/dev/input` isn't readable by normal users. | Listen to the **Touchégg daemon's D-Bus broadcast** instead: it already has access and publishes continuous pinch amounts. No sudo needed. |
| Gestures reach the helper even when another app is focused | The helper sees every pinch system-wide. | The background script only acts if a browser window is focused, and targets that window's active tab. |
| First pinch updates could be lost | Looking up the focused tab is async, and updates arrived meanwhile. | Chain every message of a gesture on the same promise so they are delivered in order once the tab is known. |
| MV3 service worker goes to sleep | Chrome stops idle background workers. | An open native-messaging port keeps it alive; pages also ping it on load so it reconnects if it was stopped. |
| Both methods active = double zoom | Touchégg key presses and the helper reacting to the same pinch. | `switch-method.sh` swaps the Touchégg config and writes a state file the helper checks at the start of each gesture. |
| Ctrl + Alt + arrows clash with workspace switching | Default shortcut used by Cinnamon / GNOME. | **Customizable shortcuts** in the popup; the helper regenerates the Touchégg config to match. |
| Touchégg can't change modifiers when reversing mid-pinch | `SEND_KEYS` has `decreaseKeys` but no `decreaseModifiers`. | Reversal is enabled only when both shortcuts share the same modifiers. |
| Helper must know the extension ID | Unpacked extensions get an ID derived from their folder path. | `install.sh` computes the ID the same way Chrome does (SHA-256 of the path, mapped to `a-p`). |
| Pinch stuttered | Touchégg's pinch steps are uneven (0.2–1.2 % per 7 ms sample), and the browser re-rendered the page at each new zoom level. | Ease toward the latest sample every frame, and set `will-change: transform` while zooming so the page is only re-rendered once, at the end. |
| View snapped to a different spot after lifting the fingers | The cheap `perspective/translateZ` preview transform didn't land exactly where the final `scale()` did. | Use the same `scale()` throughout. |
| Sticky bars (GitHub's README / License tabs) slid down while zoomed | The browser positions sticky elements in unzoomed pixels. | While zoomed, sticky elements are switched to `position: relative` (same layout, no sticking) and restored at 100 %. |
| Jump back, then drift to the left edge after pinching on GitHub | GitHub sets `scroll-behavior: smooth`, so setting the scroll position animated, and setting top cancelled the left scroll. Found by replaying a pinch in headless Chrome and logging the point under the cursor each frame. | Force `scroll-behavior: auto` while zoomed and set both scroll axes in one `scrollTo({ behavior: 'instant' })`. |
| Panning while zoomed went the wrong way (clockwise moved anticlockwise) | With the Synaptics touchpad driver, Cinnamon's natural scrolling only reverses vertical scrolling, so the two axes disagreed. Not an extension bug. | `xinput set-prop <touchpad> "Synaptics Scrolling Distance" -80 -80` (see Troubleshooting). |
| Automated testing in Chrome | Recent Chrome ignores `--load-extension`. | Load the extension through the DevTools protocol (`Extensions.loadUnpacked` with `--remote-debugging-pipe --enable-unsafe-extension-debugging`) and drive pages from scripts. |

---

## Drawbacks and Limitations

- **Linux X11 + Touchégg only** for pinch. The helper relies on the Touchégg daemon (tested with v2.0.16). Its D-Bus signals aren't a formal public API, so a future Touchégg release could change them.
- **Visual zoom, not reflow.** The page is scaled like an image; text doesn't re-wrap. `position: fixed` elements, full-screen web apps and pages that scroll an inner container instead of the whole document may look or pan oddly while zoomed.
- **Brief softness while zooming.** The page is stretched rather than re-rendered during movement, and sharpens ~40 ms after it stops.
- **Sticky elements don't stick while zoomed.** They sit in place like normal content until zoom returns to 100 %.
- **Pages the browser protects:** no zoom on `chrome://` / `opera://` pages, the Web Store, the new-tab page, or Google / Bing results in Opera.
- **Tabs opened before installing** need a reload before the extension works in them.
- **Main frame only.** Pinch is applied to the top-level page, not separately inside iframes.
- **The folder must stay put.** The browser runs the helper from the cloned folder, and the extension ID depends on its path. If you move it, run `./install.sh` again.
- **Approximate scale.** Touchégg reports pinch progress as a percentage, which is mapped to a scale factor. It feels 1:1 at the default speed but isn't the raw libinput scale.
- **Key method is stepwise.** It's smoothed, but it can't follow the fingers precisely, and the shortcuts are also normal keyboard shortcuts on every page.

---

## Troubleshooting

- **Panning while zoomed goes the wrong way on one axis** (e.g. circling clockwise moves the page anticlockwise): your touchpad uses the Synaptics driver, where Cinnamon's natural scrolling only reverses vertical scrolling. Check with `xinput list-props <touchpad> | grep "Scrolling Distance"`; if one value is negative and the other positive, make them match: `xinput set-prop <touchpad> "Synaptics Scrolling Distance" -80 -80`. This resets at logout, so add it to your startup applications to keep it.
- **Doesn't work on a tab that was already open:** extensions only load into pages opened after install or reload. Refresh the tab.
- **Doesn't work on Google / Bing search in Opera:** Opera blocks extensions on search results pages. Some Opera builds have an **Allow access to search page results** switch on the extension's details page; if yours doesn't, use the browser's own zoom there.
- **Doesn't work on browser pages** (`chrome://`, `opera://`, the Web Store, the start page): browsers don't allow extensions there.
- **Pinch zooms twice as fast / jumpy:** both methods are active. Run `./switch-method.sh native` or `./switch-method.sh keys` again.
