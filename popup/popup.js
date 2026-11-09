'use strict';

const slider = document.getElementById('volumeSlider');
const display = document.getElementById('volumeDisplay');
const label = document.getElementById('volumeLabel');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');

const SEND_INTERVAL = 60; // ms between live updates while dragging

let tab = null;
let host = '';
let mode = 'normal';

let pending = null;   // latest level waiting to be sent
let inFlight = false; // only one BOOST/STOP at a time, so capture starts never overlap
let lastSent = 0;
let sendTimer = null;

function getVolumeLabel(pct) {
  if (pct === 0) return 'Muted';
  if (pct < 100) return 'Quieter';
  if (pct === 100) return 'Normal volume';
  if (pct <= 150) return 'Slightly boosted';
  if (pct <= 250) return 'Boosted';
  if (pct <= 400) return 'Strongly boosted';
  return '🔥 Maximum boost';
}

// Snap to 100% when close, so "normal" is easy to hit.
function snap(pct) {
  return Math.abs(pct - 100) <= 8 ? 100 : pct;
}

function updateSliderFill(pct) {
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  const fillPct = ((pct - min) / (max - min)) * 100;
  slider.style.background = `linear-gradient(
    to right,
    #8b7aff 0%,
    #8b7aff ${fillPct}%,
    #1e1e2a ${fillPct}%,
    #1e1e2a 100%
  )`;
}

function updateUI(pct) {
  display.textContent = pct;
  label.textContent = getVolumeLabel(pct);
  updateSliderFill(pct);
}

function showStatus(msg, isError = false) {
  status.textContent = msg;
  status.className = 'status' + (isError ? '' : ' ok');
  setTimeout(() => { status.textContent = ''; status.className = 'status'; }, 2500);
}

function showNotice(msg) {
  status.textContent = msg;
  status.className = 'status';
}

async function getCurrentTab() {
  let [t] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!t) [t] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return t;
}

function isUnsupported(url) {
  return /^(chrome|chrome-extension|edge|about|devtools):/.test(url)
    || url.startsWith('https://chromewebstore.google.com')
    || url.startsWith('https://chrome.google.com/webstore');
}

function requestApply(pct) {
  pending = pct;
  if (inFlight) return;
  clearTimeout(sendTimer);
  sendTimer = setTimeout(flush, Math.max(0, SEND_INTERVAL - (Date.now() - lastSent)));
}

async function flush() {
  if (pending === null || inFlight) return;
  const pct = pending;
  pending = null;
  inFlight = true;
  lastSent = Date.now();
  await applyVolume(pct);
  inFlight = false;
  if (pending !== null) requestApply(pending);
}

async function applyVolume(pct) {
  if (!tab?.id) {
    showStatus('Couldn’t find the current tab. Close this popup and open it again.', true);
    return;
  }

  try {
    // 100% with no mode means "off": release the capture instead of boosting by 1.0.
    if (pct === 100 && mode === 'normal') {
      await chrome.runtime.sendMessage({ type: 'STOP', tabId: tab.id });
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: 'BOOST', tabId: tab.id, pct, mode, host });
    if (!response?.ok) showStatus('Couldn’t capture this tab’s audio. Reload the page, then try again.', true);
    else status.textContent = '';
  } catch (_) {
    showStatus('Couldn’t capture this tab’s audio. Reload the page, then try again.', true);
  }
}

async function init() {
  let state = null;
  try {
    tab = await getCurrentTab();
    const url = tab?.url ?? '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}

    if (isUnsupported(url)) {
      slider.disabled = true;
      resetBtn.disabled = true;
      updateUI(100);
      showNotice('Chrome doesn’t allow boosting on this page. Open a tab that’s playing sound and try again.');
      return;
    }
    if (tab?.id) state = await chrome.runtime.sendMessage({ type: 'GET_STATE', tabId: tab.id });
  } catch (_) {}

  const pct = state?.pct ?? 100;
  mode = state?.mode ?? 'normal';
  slider.value = pct;
  updateUI(pct);

  if (state?.otherTab) {
    const where = state.otherTab.host || 'another tab';
    showNotice(`Boost is on ${where} (${state.otherTab.pct}%). Moving the slider here moves it to this tab.`);
  }
}

slider.addEventListener('input', () => {
  const pct = snap(parseInt(slider.value));
  slider.value = pct;
  updateUI(pct);
  requestApply(pct);
});
slider.addEventListener('change', () => requestApply(snap(parseInt(slider.value))));

resetBtn.addEventListener('click', async () => {
  mode = 'normal';
  slider.value = 100;
  updateUI(100);
  pending = null;
  clearTimeout(sendTimer);

  try {
    if (tab?.id) await chrome.runtime.sendMessage({ type: 'STOP', tabId: tab.id });
  } catch (_) {}
});

init();
