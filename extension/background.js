// Connects to the optional native pinch helper (native-host/) and forwards
// touchpad pinch gestures to the active tab of the focused browser window.

importScripts('shortcuts.js');

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
    pendingKeyReplies.splice(0).forEach((r) => r({ ok: false, reason: 'no-helper' }));
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

// ---- Zoom shortcuts -> Touchégg config, written by the helper ----
let pendingKeyReplies = [];

function storedToucheggKeys() {
  return new Promise((resolve) => {
    chrome.storage.local.get({ mtzoom_shortcut_in: null, mtzoom_shortcut_out: null }, (res) => {
      if (!res.mtzoom_shortcut_in || !res.mtzoom_shortcut_out) return resolve(null); // defaults: nothing to sync
      resolve({ in: mtzToTouchegg(res.mtzoom_shortcut_in), out: mtzToTouchegg(res.mtzoom_shortcut_out) });
    });
  });
}

function sendKeysToHost(keys, reply) {
  if (!port) {
    if (reply) reply({ ok: false, reason: 'no-helper' });
    return;
  }
  if (reply) pendingKeyReplies.push(reply);
  port.postMessage({ t: 'setKeys', in: keys.in, out: keys.out });
}

function onHostMessage(msg) {
  if (msg.t === 'ready') {
    retryDelay = 1000;
    // keep Touchégg in sync with the saved shortcuts whenever the helper starts
    storedToucheggKeys().then((keys) => { if (keys) sendKeysToHost(keys); });
    return;
  }
  if (msg.t === 'keysSaved' || msg.t === 'keysError') {
    const reply = pendingKeyReplies.shift();
    if (reply) reply({ ok: msg.t === 'keysSaved', active: !!msg.active, error: msg.msg });
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
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg) return;
  if (msg.mtzoomWake && !port) connect();
  if (msg.mtzoomSetKeys) {
    sendKeysToHost(msg.mtzoomSetKeys, sendResponse);
    return true; // reply comes later, from the helper
  }
});

connect();
