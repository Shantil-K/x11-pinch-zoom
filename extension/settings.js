const storageArea = chrome.storage.local;

const DEFAULTS = {
  mtzoom_shiftkey: true,
  mtzoom_ctrlkey: false,
  mtzoom_keyzoom: true,
  mtzoom_speed: 0.7,
  mtzoom_disableScrollbarsWhenZooming: false
};

function restoreOptions() {
  storageArea.get(DEFAULTS, (res) => {
    if (chrome.runtime.lastError) {
      console.error(chrome.runtime.lastError);
      return;
    }

    const shiftCheckbox = document.getElementById('mtzoom_shiftkey');
    const ctrlCheckbox = document.getElementById('mtzoom_ctrlkey');
    const keyzoomCheckbox = document.getElementById('mtzoom_keyzoom');
    const scrollbarsCheckbox = document.getElementById('mtzoom_disableScrollbarsWhenZooming');
    const speedSlider = document.getElementById('mtzoom_speed');
    const speedVal = document.getElementById('speed_value');

    if (shiftCheckbox) {
      shiftCheckbox.checked = res.mtzoom_shiftkey != null ? res.mtzoom_shiftkey : DEFAULTS.mtzoom_shiftkey;
    }

    if (ctrlCheckbox) {
      ctrlCheckbox.checked = res.mtzoom_ctrlkey != null ? res.mtzoom_ctrlkey : DEFAULTS.mtzoom_ctrlkey;
    }

    if (keyzoomCheckbox) {
      keyzoomCheckbox.checked = res.mtzoom_keyzoom != null ? res.mtzoom_keyzoom : DEFAULTS.mtzoom_keyzoom;
    }

    if (scrollbarsCheckbox) {
      scrollbarsCheckbox.checked = res.mtzoom_disableScrollbarsWhenZooming != null ? res.mtzoom_disableScrollbarsWhenZooming : DEFAULTS.mtzoom_disableScrollbarsWhenZooming;
    }

    if (speedSlider) {
      const speed = res.mtzoom_speed != null ? parseFloat(res.mtzoom_speed) : DEFAULTS.mtzoom_speed;
      speedSlider.value = speed;
      if (speedVal) {
        speedVal.textContent = speed.toFixed(1) + 'x';
      }
    }
  });
}

document.addEventListener('DOMContentLoaded', () => {
  restoreOptions();

  const shiftCheckbox = document.getElementById('mtzoom_shiftkey');
  const ctrlCheckbox = document.getElementById('mtzoom_ctrlkey');
  const keyzoomCheckbox = document.getElementById('mtzoom_keyzoom');
  const scrollbarsCheckbox = document.getElementById('mtzoom_disableScrollbarsWhenZooming');
  const speedSlider = document.getElementById('mtzoom_speed');
  const speedVal = document.getElementById('speed_value');

  if (shiftCheckbox) {
    shiftCheckbox.addEventListener('change', (e) => {
      storageArea.set({ mtzoom_shiftkey: e.target.checked });
    });
  }

  if (ctrlCheckbox) {
    ctrlCheckbox.addEventListener('change', (e) => {
      storageArea.set({ mtzoom_ctrlkey: e.target.checked });
    });
  }

  if (keyzoomCheckbox) {
    keyzoomCheckbox.addEventListener('change', (e) => {
      storageArea.set({ mtzoom_keyzoom: e.target.checked });
    });
  }

  if (scrollbarsCheckbox) {
    scrollbarsCheckbox.addEventListener('change', (e) => {
      storageArea.set({ mtzoom_disableScrollbarsWhenZooming: e.target.checked });
    });
  }

  if (speedSlider) {
    const onSpeedInput = (e) => {
      const val = parseFloat(e.target.value);
      if (speedVal) {
        speedVal.textContent = val.toFixed(1) + 'x';
      }
      storageArea.set({ mtzoom_speed: val });
    };
    speedSlider.addEventListener('input', onSpeedInput);
    speedSlider.addEventListener('change', onSpeedInput);
  }
});

// ---- Zoom key shortcuts ----
// Click a shortcut button, press the new combination; it's saved and sent to the
// native helper, which rewrites the Touchégg config to press the same keys.

let shortcuts = { in: MTZ_DEFAULT_SHORTCUTS.in, out: MTZ_DEFAULT_SHORTCUTS.out };
let recording = null; // 'in' | 'out' | null

function kbdHtml(sc) {
  return mtzKeyParts(sc).map((p) => `<kbd>${p}</kbd>`).join(' + ');
}

function renderShortcuts() {
  for (const which of ['in', 'out']) {
    const btn = document.getElementById('sc_' + which);
    if (!btn) continue;
    btn.classList.toggle('recording', recording === which);
    btn.textContent = recording === which ? 'Press keys… (Esc to cancel)' : mtzKeyParts(shortcuts[which]).join(' + ');
  }
  const guide = document.getElementById('guide_keys');
  if (guide) guide.innerHTML = `${kbdHtml(shortcuts.in)} / ${kbdHtml(shortcuts.out)} (Touchégg pinch)`;
}

function setStatus(html, isError) {
  const el = document.getElementById('sc_status');
  if (!el) return;
  el.innerHTML = html;
  el.classList.toggle('error', !!isError);
}

function sameShortcut(a, b) {
  return a.code === b.code && !!a.ctrl === !!b.ctrl && !!a.alt === !!b.alt && !!a.shift === !!b.shift && !!a.meta === !!b.meta;
}

function syncTouchegg() {
  const tin = mtzToTouchegg(shortcuts.in);
  const tout = mtzToTouchegg(shortcuts.out);
  const cmd = `./switch-method.sh keys "${tin.mods}" ${tin.key} "${tout.mods}" ${tout.key}`;
  chrome.runtime.sendMessage({ mtzoomSetKeys: { in: tin, out: tout } }, (res) => {
    void chrome.runtime.lastError;
    if (res && res.ok) {
      setStatus(res.active
        ? 'Saved. Touchégg now sends these keys for pinch.'
        : 'Saved. Touchégg will use these keys when you run <code>./switch-method.sh keys</code>.');
    } else {
      setStatus(`Saved for the browser. Pinch helper not found, so to update Touchégg run:<br><code>${cmd}</code>`);
    }
  });
}

function saveShortcuts() {
  storageArea.set({ mtzoom_shortcut_in: shortcuts.in, mtzoom_shortcut_out: shortcuts.out }, syncTouchegg);
  renderShortcuts();
}

document.addEventListener('DOMContentLoaded', () => {
  storageArea.get({ mtzoom_shortcut_in: MTZ_DEFAULT_SHORTCUTS.in, mtzoom_shortcut_out: MTZ_DEFAULT_SHORTCUTS.out }, (res) => {
    shortcuts = { in: res.mtzoom_shortcut_in, out: res.mtzoom_shortcut_out };
    renderShortcuts();
  });

  for (const which of ['in', 'out']) {
    const btn = document.getElementById('sc_' + which);
    if (btn) btn.addEventListener('click', () => {
      recording = recording === which ? null : which;
      setStatus(recording ? 'Hold Ctrl, Alt or Super and press a key.' : 'Click a shortcut to change it.');
      renderShortcuts();
    });
  }

  const reset = document.getElementById('sc_reset');
  if (reset) reset.addEventListener('click', () => {
    recording = null;
    shortcuts = { in: MTZ_DEFAULT_SHORTCUTS.in, out: MTZ_DEFAULT_SHORTCUTS.out };
    saveShortcuts();
  });

  document.addEventListener('keydown', (e) => {
    if (!recording) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.code === 'Escape') {
      recording = null;
      setStatus('Click a shortcut to change it.');
      renderShortcuts();
      return;
    }
    // wait for the actual key, not just the modifiers
    if (/^(Control|Alt|Shift|Meta|OS)(Left|Right)?$/.test(e.code)) return;

    const sc = { ctrl: e.ctrlKey, alt: e.altKey, shift: e.shiftKey, meta: e.metaKey, code: e.code };
    const err = mtzValidate(sc);
    if (err) { setStatus(err, true); return; }
    const other = recording === 'in' ? 'out' : 'in';
    if (sameShortcut(sc, shortcuts[other])) { setStatus('That\'s already the zoom ' + other + ' shortcut.', true); return; }

    shortcuts[recording] = sc;
    recording = null;
    saveShortcuts();
  }, true);
});
