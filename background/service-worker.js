'use strict';

let capturedTabId = null;
let fsWindowId = null;
let fsPrevState = null;

// Restore capturedTabId across service worker restarts.
(async () => {
  try {
    const { capturedTabId: id } = await chrome.storage.session.get('capturedTabId');
    if (id) capturedTabId = id;
  } catch (_) {}
})();

chrome.tabs.onRemoved.addListener(async (tabId) => {
  chrome.storage.local.remove(`vb_${tabId}`);
  if (capturedTabId === tabId) await stopCapture();
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'BOOST') {
    handleBoost(msg.tabId, msg.gain)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'STOP') {
    stopCapture()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

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
    return;
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

async function handleBoost(tabId, gain) {
  if (capturedTabId === tabId && await chrome.offscreen.hasDocument()) {
    try {
      const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'SET_GAIN', gain });
      if (res?.ok) return;
    } catch (_) {}
  }
  await startCapture(tabId, gain);
}

async function startCapture(tabId, gain) {
  await releaseExistingCapture();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreenDocument();
  capturedTabId = tabId;
  chrome.storage.session.set({ capturedTabId: tabId }).catch(() => {});
  await chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_CAPTURE', streamId, gain });
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/fullscreen-bridge.js'],
  }).catch(() => {});
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

async function ensureOffscreenDocument() {
  if (await chrome.offscreen.hasDocument()) return;
  await chrome.offscreen.createDocument({
    url: 'offscreen/offscreen.html',
    reasons: ['USER_MEDIA', 'AUDIO_PLAYBACK'],
    justification: 'Capture and process tab audio for volume boost',
  });
}
