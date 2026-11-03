/**
 * Multi-touch Zoom Extension for Google Chrome (Manifest V3)
 * Enables smooth pinch-to-zoom, Shift + scroll zooming, and Touchégg key zooming on desktop.
 *
 * Originally based on haxiomic/firefox-multi-touch-zoom
 * Adapted for modern Google Chrome with Manifest V3 support.
 */

// view scaling parameters and other options
const scaleMode = 1; // 0 = always high quality, 1 = low-quality while zooming
const minScale = 1.0;
const maxScale = 10;
const zoomSpeedMultiplier = 0.03 / 5;
const overflowTimeout_ms = 400;
const highQualityWait_ms = 40;
const alwaysHighQuality = false;

let horizontalOriginShift = 0; // > 0 to the right, < 0 to the left
let verticalOriginShift = 0;   // > 0 down, < 0 up

// settings (with defaults)
let shiftKeyZoom = true;
let ctrlKeyZoom = false;
let keyZoomEnabled = true;
let pinchZoomSpeed = 0.7;
let disableScrollbarsWhenZooming = false;

// state
let pageScale = 1;
let translationX = 0;
let translationY = 0;
let overflowTranslationX = 0;
let overflowTranslationY = 0;

function getPageElement() {
  return document.documentElement || document.body;
}

function getScrollBoxElement() {
  return document.scrollingElement || document.documentElement || document.body || {
    offsetLeft: 0,
    offsetTop: 0,
    scrollLeft: 0,
    scrollTop: 0,
    scrollWidth: window.innerWidth,
    scrollHeight: window.innerHeight,
    clientWidth: window.innerWidth,
    clientHeight: window.innerHeight
  };
}

// apply user settings
chrome.storage.local.get({
  mtzoom_shiftkey: true,
  mtzoom_ctrlkey: false,
  mtzoom_keyzoom: true,
  mtzoom_speed: 0.7,
  mtzoom_disableScrollbarsWhenZooming: false
}, function (res) {
  if (chrome.runtime.lastError) return;
  if (res.mtzoom_shiftkey != null) shiftKeyZoom = res.mtzoom_shiftkey;
  if (res.mtzoom_ctrlkey != null) ctrlKeyZoom = res.mtzoom_ctrlkey;
  if (res.mtzoom_keyzoom != null) keyZoomEnabled = res.mtzoom_keyzoom;
  if (res.mtzoom_speed != null) pinchZoomSpeed = parseFloat(res.mtzoom_speed);
  if (res.mtzoom_disableScrollbarsWhenZooming != null) disableScrollbarsWhenZooming = res.mtzoom_disableScrollbarsWhenZooming;
});

// listen for live setting updates from popup/options
if (chrome.storage && chrome.storage.onChanged) {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local') {
      if (changes.mtzoom_shiftkey !== undefined) shiftKeyZoom = changes.mtzoom_shiftkey.newValue;
      if (changes.mtzoom_ctrlkey !== undefined) ctrlKeyZoom = changes.mtzoom_ctrlkey.newValue;
      if (changes.mtzoom_keyzoom !== undefined) keyZoomEnabled = changes.mtzoom_keyzoom.newValue;
      if (changes.mtzoom_speed !== undefined) pinchZoomSpeed = parseFloat(changes.mtzoom_speed.newValue);
      if (changes.mtzoom_disableScrollbarsWhenZooming !== undefined) disableScrollbarsWhenZooming = changes.mtzoom_disableScrollbarsWhenZooming.newValue;
    }
  });
}

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;
let shoudFollowMouse = false;
let canFollowMouse = false;

window.addEventListener('mousemove', (e) => {
  if (!canFollowMouse) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    return;
  }

  if (shoudFollowMouse && mouseX != null && mouseY != null) {
    horizontalOriginShift += e.clientX - mouseX;
    verticalOriginShift += e.clientY - mouseY;

    let el = getPageElement();
    if (el) {
      el.style.setProperty('transform-origin', `${horizontalOriginShift}px ${verticalOriginShift}px`, 'important');
    }
  }

  // Store current position
  mouseX = e.clientX;
  mouseY = e.clientY;
}, { capture: true, passive: true });

function zoomByKeyboard(direction) {
  let scrollBox = getScrollBoxElement();
  let x = (mouseX != null ? mouseX : window.innerWidth / 2) - (scrollBox.offsetLeft || 0);
  let y = (mouseY != null ? mouseY : window.innerHeight / 2) - (scrollBox.offsetTop || 0);

  // Zoom step derived from pinchZoomSpeed (~8% step at default speed 0.7)
  let step = 1 + (0.08 * (pinchZoomSpeed / 0.7));
  let scaleBy = direction > 0 ? step : (1 / step);

  smoothZoom(scaleBy, x, y);
}

// Discrete inputs (mouse-wheel notches, xdotool clicks, key presses) arrive as big jumps.
// Instead of snapping, glide toward the target scale over a few frames.
let targetScale = null;
let smoothX = 0;
let smoothY = 0;
let smoothFrame = null;

function smoothZoom(scaleBy, x, y) {
  let base = targetScale != null ? targetScale : pageScale;
  targetScale = Math.min(Math.max(base * scaleBy, minScale), maxScale);
  smoothX = x;
  smoothY = y;
  if (smoothFrame == null) smoothFrame = requestAnimationFrame(smoothZoomStep);
}

function smoothZoomStep() {
  let remaining = targetScale / pageScale;
  if (Math.abs(remaining - 1) < 0.002) {
    applyScale(remaining, smoothX, smoothY);
    cancelSmoothZoom();
    return;
  }
  // cover ~30% of the remaining zoom each frame (ease-out)
  applyScale(Math.pow(remaining, 0.3), smoothX, smoothY);
  smoothFrame = requestAnimationFrame(smoothZoomStep);
}

function cancelSmoothZoom() {
  if (smoothFrame != null) cancelAnimationFrame(smoothFrame);
  smoothFrame = null;
  targetScale = null;
}

// Continuous pinch from the native helper (see native-host/), relayed by background.js
let pinchStartScale = 1;
let pinchX = 0;
let pinchY = 0;
let pinchLatest = null;
let pinchFrame = null;

function applyPinchFrame() {
  pinchFrame = null;
  if (pinchLatest == null) return;
  // the speed slider bends the response: 0.7 (default) = follow fingers 1:1
  let target = pinchStartScale * Math.pow(pinchLatest, pinchZoomSpeed / 0.7);
  pinchLatest = null;
  applyScale(target / pageScale, pinchX, pinchY);
}

if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((msg) => {
    if (!msg || !msg.mtzoomPinch) return;
    if (msg.mtzoomPinch === 'begin') {
      cancelSmoothZoom();
      pinchStartScale = pageScale;
      let scrollBox = getScrollBoxElement();
      pinchX = (mouseX != null ? mouseX : window.innerWidth / 2) - (scrollBox.offsetLeft || 0);
      pinchY = (mouseY != null ? mouseY : window.innerHeight / 2) - (scrollBox.offsetTop || 0);
    }
    pinchLatest = msg.s;
    // apply at most once per frame; the helper sends ~140 updates/s
    if (pinchFrame == null) pinchFrame = requestAnimationFrame(applyPinchFrame);
  });
  try { chrome.runtime.sendMessage({ mtzoomWake: true }).catch(() => {}); } catch (e) {}
}

// cmd + 0 or ctrl + 0 to restore zoom, or Ctrl + Alt + ArrowUp/ArrowDown for Touchegg
window.addEventListener('keydown', (e) => {
  if (e.key === '0' && (e.ctrlKey || e.metaKey)) {
    resetScale();
    e.preventDefault();
    return;
  }

  // Touchegg / keyboard shortcuts: Ctrl + Alt + ArrowUp/Equal (zoom in), Ctrl + Alt + ArrowDown/Minus (zoom out)
  if (keyZoomEnabled && (e.ctrlKey || e.metaKey) && e.altKey) {
    if (e.key === 'ArrowUp' || e.key === 'Up' || e.key === '=' || e.key === '+') {
      zoomByKeyboard(1);
      e.preventDefault();
      e.stopPropagation();
      return;
    } else if (e.key === 'ArrowDown' || e.key === 'Down' || e.key === '-' || e.key === '_') {
      zoomByKeyboard(-1);
      e.preventDefault();
      e.stopPropagation();
      return;
    }
  }

  shoudFollowMouse = !!e.shiftKey;
}, { capture: true });

window.addEventListener('keyup', (e) => {
  shoudFollowMouse = !!e.shiftKey;
}, { capture: true });

// because scroll top/left are handled as integers only, we only read the translation from scroll once scroll has changed
let ignoredScrollLeft = null;
let ignoredScrollTop = null;
function updateTranslationFromScroll() {
  let scrollBox = getScrollBoxElement();
  if (scrollBox.scrollLeft !== ignoredScrollLeft) {
    translationX = -scrollBox.scrollLeft;
    ignoredScrollLeft = null;
  }
  if (scrollBox.scrollTop !== ignoredScrollTop) {
    translationY = -scrollBox.scrollTop;
    ignoredScrollTop = null;
  }
}

window.addEventListener('scroll', updateTranslationFromScroll, { capture: false, passive: true });

window.addEventListener('wheel', (e) => {
  const isShiftZoom = shiftKeyZoom && e.shiftKey;
  const isCtrlZoom = ctrlKeyZoom && (e.ctrlKey || e.metaKey);

  if (isShiftZoom || isCtrlZoom) {
    let scrollBox = getScrollBoxElement();
    let x = e.clientX - (scrollBox.offsetLeft || 0);
    let y = e.clientY - (scrollBox.offsetTop || 0);

    let deltaMultiplier = pinchZoomSpeed * zoomSpeedMultiplier;

    // Chromium turns Shift + wheel into horizontal scroll, so deltaY can be 0
    let delta = e.deltaY !== 0 ? e.deltaY : e.deltaX;
    // Notches from a mouse wheel / xdotool are large; touchpad deltas are small and continuous
    let isDiscrete = e.deltaMode !== 0 || Math.abs(delta) >= 40;
    let base = isDiscrete && targetScale != null ? targetScale : pageScale;

    let newScale = base + delta * deltaMultiplier;
    if (newScale < 0.1) newScale = 0.1;
    let scaleBy = base / newScale;

    if (isDiscrete) {
      smoothZoom(scaleBy, x, y);
    } else {
      cancelSmoothZoom();
      applyScale(scaleBy, x, y);
    }

    e.preventDefault();
    e.stopPropagation();
  } else {
    restoreControl();
  }
}, { capture: true, passive: false });

window.addEventListener('mousedown', restoreControl, { capture: true, passive: true });

let controlDisabled = false;
function disableControl() {
  if (controlDisabled) return;

  let pageEl = getPageElement();
  if (disableScrollbarsWhenZooming && pageEl) {
    let verticalScrollBarWidth = window.innerWidth - pageEl.clientWidth;
    let horizontalScrollBarWidth = window.innerHeight - pageEl.clientHeight;

    pageEl.style.setProperty('overflow', 'hidden', 'important');
    pageEl.style.setProperty('margin-right', verticalScrollBarWidth + 'px', 'important');
    pageEl.style.setProperty('margin-bottom', horizontalScrollBarWidth + 'px', 'important');
  }

  controlDisabled = true;
}

function restoreControl() {
  if (!controlDisabled) return;

  let pageEl = getPageElement();
  if (pageEl) {
    pageEl.style.overflow = 'auto';
    pageEl.style.marginRight = '';
    pageEl.style.marginBottom = '';
  }
  controlDisabled = false;
}

let qualityTimeoutHandle = null;
let overflowTimeoutHandle = null;

function updateTransform(scaleModeOverride, shouldDisableControl) {
  if (shouldDisableControl == null) {
    shouldDisableControl = true;
  }

  let pageEl = getPageElement();
  if (!pageEl) return;

  let sm = scaleModeOverride == null ? scaleMode : scaleModeOverride;

  if (sm === 0 || alwaysHighQuality) {
    pageEl.style.setProperty('transform', `scaleX(${pageScale}) scaleY(${pageScale})`, 'important');
  } else {
    let p = 1;
    let z = p - p / pageScale;

    pageEl.style.setProperty('transform', `perspective(${p}px) translateZ(${z}px)`, 'important');

    window.clearTimeout(qualityTimeoutHandle);
    qualityTimeoutHandle = setTimeout(function () {
      let el = getPageElement();
      if (el) {
        el.style.setProperty('transform', `scaleX(${pageScale}) scaleY(${pageScale})`, 'important');
      }
    }, highQualityWait_ms);
  }

  pageEl.style.setProperty('transform-origin', `${horizontalOriginShift}px ${verticalOriginShift}px`, 'important');

  pageEl.style.position = 'relative';
  pageEl.style.height = '100%';

  if (minScale < 1) {
    pageEl.style.setProperty('left', `${Math.max(translationX, 0) - overflowTranslationX}px`, 'important');
    pageEl.style.setProperty('top', `${Math.max(translationY, 0) - overflowTranslationY}px`, 'important');
  }

  pageEl.style.transitionProperty = 'transform, left, top';
  pageEl.style.transitionDuration = '0s';

  if (shouldDisableControl) {
    disableControl();
    clearTimeout(overflowTimeoutHandle);
    overflowTimeoutHandle = setTimeout(function () {
      restoreControl();
    }, overflowTimeout_ms);
  }
}

function applyScale(scaleBy, x_scrollBoxElement, y_scrollBoxElement) {
  let scrollBox = getScrollBoxElement();

  function getTranslationX() { return translationX; }
  function getTranslationY() { return translationY; }

  function setTranslationX(v) {
    let maxScrollX = scrollBox.scrollWidth - scrollBox.clientWidth;
    v = Math.min(v, 0);
    v = Math.max(v, -maxScrollX);

    translationX = v;

    scrollBox.scrollLeft = Math.max(-v, 0);
    ignoredScrollLeft = scrollBox.scrollLeft;

    overflowTranslationX = v < 0 ? Math.max((-v) - maxScrollX, 0) : 0;
  }

  function setTranslationY(v) {
    let maxScrollY = scrollBox.scrollHeight - scrollBox.clientHeight;
    v = Math.min(v, 0);
    v = Math.max(v, -maxScrollY);

    translationY = v;

    scrollBox.scrollTop = Math.max(-v, 0);
    ignoredScrollTop = scrollBox.scrollTop;

    overflowTranslationY = v < 0 ? Math.max((-v) - maxScrollY, 0) : 0;
  }

  let pageScaleBefore = pageScale;
  pageScale *= scaleBy;
  pageScale = Math.min(Math.max(pageScale, minScale), maxScale);
  let effectiveScale = pageScale / pageScaleBefore;

  if (pageScale === 1) {
    canFollowMouse = false;
    horizontalOriginShift = 0;
    verticalOriginShift = 0;
  } else {
    canFollowMouse = true;
  }

  if (effectiveScale === 1) return;

  updateTransform(null, null);

  let zx = x_scrollBoxElement;
  let zy = y_scrollBoxElement;

  let tx = getTranslationX();
  tx = (tx - zx) * effectiveScale + zx;

  let ty = getTranslationY();
  ty = (ty - zy) * effectiveScale + zy;

  setTranslationX(tx);
  setTranslationY(ty);

  updateTransform(null, null);
}

function resetScale() {
  cancelSmoothZoom();
  pageScale = 1;
  translationX = 0;
  translationY = 0;
  overflowTranslationX = 0;
  overflowTranslationY = 0;
  horizontalOriginShift = 0;
  verticalOriginShift = 0;
  canFollowMouse = false;
  shoudFollowMouse = false;

  let scrollBox = getScrollBoxElement();
  let scrollLeftBefore = scrollBox.scrollLeft;
  let scrollLeftMaxBefore = scrollBox.scrollWidth - scrollBox.clientWidth;
  let scrollTopBefore = scrollBox.scrollTop;
  let scrollTopMaxBefore = scrollBox.scrollHeight - scrollBox.clientHeight;

  updateTransform(0, false);

  if (scrollLeftMaxBefore > 0) {
    scrollBox.scrollLeft = (scrollLeftBefore / scrollLeftMaxBefore) * (scrollBox.scrollWidth - scrollBox.clientWidth);
  } else {
    scrollBox.scrollLeft = 0;
  }

  if (scrollTopMaxBefore > 0) {
    scrollBox.scrollTop = (scrollTopBefore / scrollTopMaxBefore) * (scrollBox.scrollHeight - scrollBox.clientHeight);
  } else {
    scrollBox.scrollTop = 0;
  }

  updateTranslationFromScroll();

  let pageEl = getPageElement();
  if (pageEl) {
    pageEl.style.removeProperty('transform');
    pageEl.style.removeProperty('transform-origin');
    pageEl.style.removeProperty('position');
    pageEl.style.removeProperty('height');
    pageEl.style.removeProperty('left');
    pageEl.style.removeProperty('top');
    pageEl.style.removeProperty('transition-property');
    pageEl.style.removeProperty('transition-duration');
    pageEl.style.removeProperty('overflow');
    pageEl.style.removeProperty('margin-right');
    pageEl.style.removeProperty('margin-bottom');
  }
  controlDisabled = false;
}
