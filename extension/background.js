// Connects to the optional native pinch helper (native-host/) and forwards
// touchpad pinch gestures to the active tab of the focused browser window.

const HOST_NAME = 'com.multitouchzoom.pinch';

let port = null;
let retryDelay = 1000;
let gestureTab = Promise.resolve(null); // resolves to the tab id receiving this gesture

function connect() {
  try {
    port = chrome.runtime.connectNative(HOST_NAME);
  } catch (e) {
    scheduleReconnect();
    return;
  }
  port.onMessage.addListener(onHostMessage);
  port.onDisconnect.addListener(() => {
    void chrome.runtime.lastError; // helper not installed, or it exited
    port = null;
    scheduleReconnect();
  });
}

function scheduleReconnect() {
  setTimeout(connect, retryDelay);
  retryDelay = Math.min(retryDelay * 2, 60000);
}

async function findTargetTab() {
  // Gestures reach the helper no matter which app has focus, so only act
  // when this browser's window is the focused one.
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null);
  if (!win || !win.focused) return null;
  const [tab] = await chrome.tabs.query({ active: true, windowId: win.id });
  return tab ? tab.id : null;
}

function onHostMessage(msg) {
  if (msg.t === 'ready') {
    retryDelay = 1000;
    return;
  }
  if (msg.t !== 'begin' && msg.t !== 'update' && msg.t !== 'end') return;

  if (msg.t === 'begin') gestureTab = findTargetTab().catch(() => null);

  // Chained on the same promise, so messages keep their order
  gestureTab.then((tabId) => {
    if (tabId == null) return;
    chrome.tabs.sendMessage(tabId, { mtzoomPinch: msg.t, s: msg.s }, { frameId: 0 }).catch(() => {});
  });
}

// Pages ping on load so a sleeping service worker wakes up and reconnects
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.mtzoomWake && !port) connect();
});

connect();
