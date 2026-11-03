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
