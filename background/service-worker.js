'use strict';

let capturedTabId = null;    // Tab using tabCapture
let ytBoostTabId = null;     // Tab using YouTube content-script boost
let fsWindowId = null;       // Window we put into fullscreen for the bridge
let fsPrevState = null;      // Window state to restore when fullscreen exits

// Restore capturedTabId across service worker restarts.
(async () => {
  try {
    const { capturedTabId: id } = await chrome.storage.session.get('capturedTabId');
    if (id) capturedTabId = id;
  } catch (_) {}
})();

// ─── Tab cleanup ──────────────────────────────────────────────────────────────

chrome.tabs.onRemoved.addListener(async (tabId) => {
  chrome.storage.local.remove(`vb_${tabId}`);
  if (capturedTabId === tabId) await stopCapture();
  if (ytBoostTabId === tabId) ytBoostTabId = null;
});

// ─── Messages ─────────────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'BOOST') {
    handleBoost(msg.tabId, msg.gain)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'STOP') {
    stopAll()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  // ─── Fullscreen bridge (content script on tabCapture sites) ───────────────

  if (msg.type === 'IS_BOOST_ACTIVE') {
    sendResponse({ active: capturedTabId !== null && capturedTabId === sender.tab?.id });
    return;
  }

  if (msg.type === 'FULLSCREEN_ENTER') {
    const windowId = sender.tab?.windowId;
    if (windowId) {
      chrome.windows.get(windowId)
        .then(win => {
          fsPrevState = win.state;
          fsWindowId = windowId;
          return chrome.windows.update(windowId, { state: 'fullscreen' });
        })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    sendResponse({ ok: false });
  }

  if (msg.type === 'FULLSCREEN_EXIT') {
    if (fsWindowId && fsPrevState && fsPrevState !== 'fullscreen') {
      chrome.windows.update(fsWindowId, { state: fsPrevState }).catch(() => {});
    }
    fsWindowId = null;
    fsPrevState = null;
    sendResponse({ ok: true });
  }
});

// ─── Routing ──────────────────────────────────────────────────────────────────

async function handleBoost(tabId, gain) {
  // Try YouTube content-script approach first.
  // chrome.tabs.sendMessage rejects immediately if the content script is not
  // present, so this is fast on non-YouTube tabs.
  try {
    if (ytBoostTabId === tabId && gainNode_alive()) {
      const res = await chrome.tabs.sendMessage(tabId, { type: 'YT_SET_GAIN', gain });
      if (res?.ok) return;
    }
    const res = await chrome.tabs.sendMessage(tabId, { type: 'YT_BOOST', gain });
    if (res?.ok) {
      if (capturedTabId) await stopCapture(); // Stop any existing tabCapture.
      ytBoostTabId = tabId;
      return;
    }
  } catch (_) {}

  // Non-YouTube tab: use tabCapture.
  ytBoostTabId = null;
  if (capturedTabId === tabId && await chrome.offscreen.hasDocument()) {
    try {
      const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'SET_GAIN', gain });
      if (res?.ok) return;
    } catch (_) {}
  }
  await startCapture(tabId, gain);
}

// ─── YouTube helpers ──────────────────────────────────────────────────────────

// Lightweight check — avoids a message round-trip when gain hasn't changed.
function gainNode_alive() {
  return ytBoostTabId !== null;
}

// ─── tabCapture logic ─────────────────────────────────────────────────────────

async function startCapture(tabId, gain) {
  await releaseExistingCapture();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreenDocument();
  capturedTabId = tabId;
  chrome.storage.session.set({ capturedTabId: tabId }).catch(() => {});
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_CAPTURE', streamId, gain });
}

async function releaseExistingCapture() {
  capturedTabId = null;
  chrome.storage.session.remove('capturedTabId').catch(() => {});
  try {
    if (await chrome.offscreen.hasDocument()) {
      await chrome.runtime.sendMessage({ target: 'offscreen', type: 'STOP_CAPTURE' });
    }
  } catch (_) {}
}

async function stopCapture() {
  await releaseExistingCapture();
  try {
    if (await chrome.offscreen.hasDocument()) await chrome.offscreen.closeDocument();
  } catch (_) {}
}

async function stopAll() {
  if (ytBoostTabId) {
    try { await chrome.tabs.sendMessage(ytBoostTabId, { type: 'YT_STOP' }); } catch (_) {}
    ytBoostTabId = null;
  }
  await stopCapture();
}

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Capture and process tab audio for volume boost',
  });
}
