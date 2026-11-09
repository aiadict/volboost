'use strict';

let capturedTabId = null;
let capturedState = null; // { pct, mode, host } of the captured tab
let fsWindowId = null;
let fsPrevState = null;

const BADGE_COLOR = '#FF6A1A';

// Restore capture state across service worker restarts (storage.session is cleared on
// browser restart and extension reload, so it never outlives the offscreen document).
const ready = (async () => {
  try {
    const s = await chrome.storage.session.get(['capturedTabId', 'capturedState']);
    if (s.capturedTabId) {
      capturedTabId = s.capturedTabId;
      capturedState = s.capturedState ?? null;
    }
  } catch (_) {}
})();

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason === 'update') {
    // v1.0.x kept per-tab levels in storage.local; tab IDs don't survive restarts, so drop them.
    const all = await chrome.storage.local.get(null);
    const stale = Object.keys(all).filter(k => k.startsWith('vb_'));
    if (stale.length) await chrome.storage.local.remove(stale);
  }
  const { stats } = await chrome.storage.local.get('stats');
  if (!stats) await chrome.storage.local.set({ stats: { installedAt: Date.now(), boostCount: 0, boostDays: [] } });
});

chrome.tabs.onRemoved.addListener(async (tabId) => {
  await ready;
  if (capturedTabId === tabId) await stopCapture();
});

// Tab-specific badge text may reset on navigation; the capture itself survives it.
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
  await ready;
  if (tabId === capturedTabId && changeInfo.status === 'loading' && capturedState) {
    setBadge(tabId, capturedState.pct);
  }
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'GET_STATE') {
    getState(msg.tabId).then(sendResponse).catch(() => sendResponse(null));
    return true;
  }

  if (msg.type === 'BOOST') {
    handleBoost(msg.tabId, msg.pct, msg.mode, msg.host)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'STOP') {
    handleStop(msg.tabId)
      .then(() => sendResponse({ ok: true }))
      .catch(() => sendResponse({ ok: false }));
    return true;
  }

  if (msg.type === 'SET_LIMITER') {
    setLimiter(msg.limiter)
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

async function getLimiter() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings?.limiter ?? true;
}

async function getState(tabId) {
  await ready;
  const limiter = await getLimiter();
  const active = capturedTabId !== null && await chrome.offscreen.hasDocument();
  if (!active && capturedTabId !== null) await releaseExistingCapture();

  if (active && capturedTabId === tabId) {
    return { boosting: true, pct: capturedState?.pct ?? 100, mode: capturedState?.mode ?? 'normal', limiter, otherTab: null };
  }
  return {
    boosting: false,
    pct: 100,
    mode: 'normal',
    limiter,
    otherTab: active ? { tabId: capturedTabId, host: capturedState?.host ?? '', pct: capturedState?.pct ?? 100 } : null,
  };
}

async function handleBoost(tabId, pct, mode = 'normal', host = '') {
  await ready;
  const params = { pct, mode, limiter: await getLimiter() };

  if (capturedTabId === tabId && await chrome.offscreen.hasDocument()) {
    try {
      const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'SET_PARAMS', params });
      if (res?.ok) {
        setCaptured(tabId, { pct, mode, host: host || capturedState?.host || '' });
        return;
      }
    } catch (_) {}
  }
  await startCapture(tabId, params);
  setCaptured(tabId, { pct, mode, host });
  recordBoost().catch(() => {});
}

// Only stops when the popup's own tab is the captured one; Reset on another tab is a no-op.
async function handleStop(tabId) {
  await ready;
  if (tabId === undefined || tabId === capturedTabId) await stopCapture();
}

async function setLimiter(limiter) {
  await ready;
  const { settings = {} } = await chrome.storage.local.get('settings');
  await chrome.storage.local.set({ settings: { ...settings, limiter } });
  if (capturedTabId !== null && capturedState && await chrome.offscreen.hasDocument()) {
    await chrome.runtime.sendMessage({
      target: 'offscreen', type: 'SET_PARAMS',
      params: { pct: capturedState.pct, mode: capturedState.mode, limiter },
    }).catch(() => {});
  }
}

function setCaptured(tabId, state) {
  capturedTabId = tabId;
  capturedState = state;
  chrome.storage.session.set({ capturedTabId: tabId, capturedState: state }).catch(() => {});
  setBadge(tabId, state.pct);
}

function setBadge(tabId, pct) {
  chrome.action.setBadgeText({ tabId, text: String(pct) }).catch(() => {});
  chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR }).catch(() => {});
  chrome.action.setBadgeTextColor?.({ tabId, color: '#FFFFFF' })?.catch(() => {});
}

function clearBadge(tabId) {
  chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
}

async function recordBoost() {
  const { stats = { installedAt: Date.now(), boostCount: 0, boostDays: [] } } = await chrome.storage.local.get('stats');
  const day = new Date().toISOString().slice(0, 10);
  const days = stats.boostDays ?? [];
  if (!days.includes(day)) days.push(day);
  await chrome.storage.local.set({
    stats: { ...stats, boostCount: (stats.boostCount ?? 0) + 1, boostDays: days.slice(-10) },
  });
}

async function startCapture(tabId, params) {
  await releaseExistingCapture();
  const streamId = await chrome.tabCapture.getMediaStreamId({ targetTabId: tabId });
  await ensureOffscreenDocument();
  capturedTabId = tabId;
  chrome.storage.session.set({ capturedTabId: tabId }).catch(() => {});
  const res = await chrome.runtime.sendMessage({ target: 'offscreen', type: 'START_CAPTURE', streamId, params });
  if (!res?.ok) {
    await releaseExistingCapture();
    throw new Error(res?.error ?? 'Capture failed');
  }
  chrome.scripting.executeScript({
    target: { tabId },
    files: ['content/fullscreen-bridge.js'],
  }).catch(() => {});
}

async function releaseExistingCapture() {
  if (capturedTabId !== null) clearBadge(capturedTabId);
  capturedTabId = null;
  capturedState = null;
  chrome.storage.session.remove(['capturedTabId', 'capturedState']).catch(() => {});
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
