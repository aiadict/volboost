'use strict';

let capturedTabId = null;

// Restore capturedTabId across service worker restarts.
// chrome.storage.session persists within the browser session but clears on close.
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
});

// ─── Messages from popup ──────────────────────────────────────────────────────

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

  // ─── Fullscreen bridge (content script on YouTube) ─────────────────────────

  if (msg.type === 'IS_BOOST_ACTIVE') {
    sendResponse({ active: capturedTabId !== null && capturedTabId === sender.tab?.id });
    return;
  }

  if (msg.type === 'RELEASE_FOR_FULLSCREEN') {
    releaseExistingCapture()
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === 'RESTORE_AFTER_FULLSCREEN') {
    const tabId = sender.tab?.id;
    if (tabId) {
      chrome.storage.local.get(`vb_${tabId}`)
        .then(data => {
          const pct = data[`vb_${tabId}`] ?? 150;
          return handleBoost(tabId, pct / 100);
        })
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: false }));
      return true;
    }
    sendResponse({ ok: false });
  }
});

// ─── Capture logic ────────────────────────────────────────────────────────────

async function handleBoost(tabId, gain) {
  // If already capturing this tab, try a lightweight gain update first.
  if (capturedTabId === tabId && await chrome.offscreen.hasDocument()) {
    try {
      const res = await chrome.runtime.sendMessage({
        target: 'offscreen', type: 'SET_GAIN', gain,
      });
      if (res?.ok) return; // AudioContext is alive — done.
    } catch (_) {}
    // SET_GAIN failed: offscreen AudioContext died — fall through to restart.
  }
  await startCapture(tabId, gain);
}

async function startCapture(tabId, gain) {
  // Always release any live capture before requesting a new stream ID.
  // This handles the case where capturedTabId was lost after a service worker
  // restart but the offscreen document still holds the capture lock on the tab.
  await releaseExistingCapture();

  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreenDocument();

  capturedTabId = tabId;
  chrome.storage.session.set({ capturedTabId: tabId }).catch(() => {});

  await chrome.runtime.sendMessage({
    target: 'offscreen',
    type: 'START_CAPTURE',
    streamId,
    gain,
  });
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
    if (await chrome.offscreen.hasDocument()) {
      await chrome.offscreen.closeDocument();
    }
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
