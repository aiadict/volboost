'use strict';

const slider = document.getElementById('volumeSlider');
const display = document.getElementById('volumeDisplay');
const label = document.getElementById('volumeLabel');
const resetBtn = document.getElementById('resetBtn');
const status = document.getElementById('status');

// ─── Helpers ────────────────────────────────────────────────────────────────

function getVolumeLabel(pct) {
  if (pct === 100) return 'Normal volume';
  if (pct <= 150) return 'Slightly boosted';
  if (pct <= 250) return 'Boosted';
  if (pct <= 400) return 'Strongly boosted';
  return '🔥 Maximum boost';
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

// ─── Tab helpers ─────────────────────────────────────────────────────────────

async function getCurrentTab() {
  let [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab) [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  return tab;
}

// ─── Volume control ──────────────────────────────────────────────────────────

async function applyVolume(pct) {
  const gain = pct / 100;
  let tab;

  try {
    tab = await getCurrentTab();
  } catch (_) {
    showStatus('Could not access tab.', true);
    return;
  }

  if (!tab?.id) {
    showStatus('Click anywhere on the page first, then try again.', true);
    return;
  }

  const url = tab.url ?? '';
  if (url.startsWith('chrome://') || url.startsWith('chrome-extension://') || url.startsWith('edge://') || url.startsWith('about:')) {
    showStatus('Cannot boost audio on this page.', true);
    return;
  }

  try {
    const response = await chrome.runtime.sendMessage({ type: 'BOOST', tabId: tab.id, gain });
    if (!response?.ok) {
      showStatus('Could not capture audio. Try again.', true);
      return;
    }
    await chrome.storage.local.set({ [`vb_${tab.id}`]: pct });
  } catch (e) {
    showStatus('Could not capture audio. Try again.', true);
  }
}

// ─── Initialise popup ────────────────────────────────────────────────────────

async function init() {
  let initialPct = 100;
  try {
    const tab = await getCurrentTab();
    if (tab?.id) {
      const stored = await chrome.storage.local.get(`vb_${tab.id}`);
      if (stored[`vb_${tab.id}`]) initialPct = stored[`vb_${tab.id}`];
    }
  } catch (_) {}

  slider.value = initialPct;
  updateUI(initialPct);
}

// ─── Events ──────────────────────────────────────────────────────────────────

slider.addEventListener('input', () => updateUI(parseInt(slider.value)));

slider.addEventListener('change', () => applyVolume(parseInt(slider.value)));

resetBtn.addEventListener('click', async () => {
  slider.value = 100;
  updateUI(100);

  try {
    await chrome.runtime.sendMessage({ type: 'STOP' });
    const tab = await getCurrentTab();
    if (tab?.id) await chrome.storage.local.remove(`vb_${tab.id}`);
  } catch (_) {}
});

// ─── Boot ────────────────────────────────────────────────────────────────────
init();
