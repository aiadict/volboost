'use strict';

const STORE_URL = 'https://chromewebstore.google.com/detail/obbffbohmfndnmcmilihmjdioekchmgk';
const REVIEWS_URL = STORE_URL + '/reviews';
const HELP_URL = 'https://aiadict.github.io/volboost/help.html';

const SEND_INTERVAL = 60;  // ms between live updates while turning the knob
const DAY = 24 * 60 * 60 * 1000;

const $ = id => document.getElementById(id);
const knob = $('knob');
const vu = $('vu');
const modesGroup = $('modes');
const modeKeys = [...modesGroup.querySelectorAll('[role="radio"]')];
const resetBtn = $('resetBtn');
const limiterBtn = $('limiterBtn');
const notice = $('notice');

let tab = null;
let host = '';
let pct = 100;
let mode = 'normal';
let limiter = true;
let boosting = false;
let disabled = false;

let pending = null;   // latest level waiting to be sent
let inFlight = false; // only one BOOST/STOP at a time, so capture starts never overlap
let lastSent = 0;
let sendTimer = null;

let meterPort = null;
let noticeTimer = null;
let toastTimer = null;

// Knob, dbText, buildVu and showVu live in shared/hifi.js.
const knobUI = mountKnob({ ring: $('ring'), knob, grip: $('grip'), onInput: setLevel });

// ---------- display ----------

function render() {
  knobUI.render(pct);
  $('volumeDisplay').textContent = pct;
  $('dbDisplay').textContent = dbText(pct);

  modeKeys.forEach(k => {
    const on = k.dataset.mode === mode;
    k.setAttribute('aria-checked', String(on));
    k.tabIndex = on ? 0 : -1;
  });
  limiterBtn.setAttribute('aria-pressed', String(limiter));

  const active = pct !== 100 || mode !== 'normal';
  $('pwr').classList.toggle('on', active);
  const where = $('where');
  where.classList.toggle('idle', !active || disabled);
  if (disabled) where.textContent = 'Unavailable here';
  else if (!active) where.textContent = 'Not boosting';
  else where.textContent = (pct < 100 ? 'Quieter · ' : 'Boosting · ') + (host || 'this tab');

  if (!boosting) clearMeter();
}

function showNotice(msg, { error = false, timeout = 0 } = {}) {
  clearTimeout(noticeTimer);
  notice.textContent = msg;
  notice.classList.toggle('error', error);
  notice.hidden = false;
  if (timeout) noticeTimer = setTimeout(hideNotice, timeout);
}

function hideNotice() {
  notice.hidden = true;
}

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 1600);
}

// ---------- live meter ----------

function connectMeter() {
  if (meterPort || !boosting) return;
  try {
    meterPort = chrome.runtime.connect({ name: 'meter' });
  } catch (_) {
    meterPort = null;
    return;
  }
  meterPort.onMessage.addListener(({ bands, reduction }) => {
    showVu(vu, bands);
    showLimit($('limTag'), limiter && reduction < -1);
  });
  meterPort.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    meterPort = null;
    clearMeter();
  });
}

function clearMeter() {
  showVu(vu, null);
  showLimit($('limTag'), null);
}

// ---------- applying levels ----------

function setLevel(p) {
  if (disabled || p === pct) return;
  pct = p;
  render();
  requestApply();
}

function requestApply() {
  pending = { pct, mode };
  if (inFlight) return;
  clearTimeout(sendTimer);
  sendTimer = setTimeout(flush, Math.max(0, SEND_INTERVAL - (Date.now() - lastSent)));
}

async function flush() {
  if (pending === null || inFlight) return;
  const next = pending;
  pending = null;
  inFlight = true;
  lastSent = Date.now();
  await apply(next.pct, next.mode);
  inFlight = false;
  if (pending !== null) requestApply();
}

async function apply(p, m) {
  if (!tab?.id) {
    showNotice('Couldn’t find the current tab. Close this popup and open it again.', { error: true });
    return;
  }

  try {
    // 100% with no mode means "off": release the capture instead of boosting by 1.0.
    if (p === 100 && m === 'normal') {
      await chrome.runtime.sendMessage({ type: 'STOP', tabId: tab.id });
      boosting = false;
      clearMeter();
      return;
    }
    const response = await chrome.runtime.sendMessage({ type: 'BOOST', tabId: tab.id, pct: p, mode: m, host });
    if (!response?.ok) {
      showNotice('Couldn’t capture this tab’s audio. Reload the page, then try again.', { error: true });
      return;
    }
    boosting = true;
    hideNotice();
    connectMeter();
  } catch (_) {
    showNotice('Couldn’t capture this tab’s audio. Reload the page, then try again.', { error: true });
  }
}

// Shown once after updating from 1.0.x.
async function showWhatsNew() {
  const { whatsNew } = await chrome.storage.local.get('whatsNew');
  if (!whatsNew) return;
  showNotice('New in 1.1: turn the knob, try Voice, Bass and Night, and enjoy a limiter that stops crackle.');
  await chrome.storage.local.remove('whatsNew');
}

// ---------- rating card ----------

async function maybeShowRating() {
  const { stats, review = { state: 'none' } } = await chrome.storage.local.get(['stats', 'review']);
  if (!stats || !boosting) return;
  const enoughUse = (stats.boostDays?.length ?? 0) >= 3 && Date.now() - stats.installedAt >= 3 * DAY;
  const due = review.state === 'none' || (review.state === 'later' && Date.now() - review.laterAt >= 14 * DAY);
  if (enoughUse && due) $('rateCard').hidden = false;
}

$('rateGo').addEventListener('click', async () => {
  await chrome.storage.local.set({ review: { state: 'rated' } });
  chrome.tabs.create({ url: REVIEWS_URL });
});

$('rateLater').addEventListener('click', async () => {
  const { review = { state: 'none' } } = await chrome.storage.local.get('review');
  await chrome.storage.local.set({
    review: review.state === 'later' ? { state: 'never' } : { state: 'later', laterAt: Date.now() },
  });
  $('rateCard').hidden = true;
});

$('rateHelp').addEventListener('click', (e) => {
  e.preventDefault();
  chrome.tabs.create({ url: HELP_URL });
});

// ---------- controls ----------

modeKeys.forEach((k, i) => {
  k.addEventListener('click', () => selectMode(k.dataset.mode));
  k.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = modeKeys[(i + dir + modeKeys.length) % modeKeys.length];
    next.focus();
    selectMode(next.dataset.mode);
  });
});

function selectMode(m) {
  if (disabled || m === mode) return;
  mode = m;
  render();
  requestApply();
}

limiterBtn.addEventListener('click', async () => {
  limiter = !limiter;
  render();
  try { await chrome.runtime.sendMessage({ type: 'SET_LIMITER', limiter }); } catch (_) {}
});

resetBtn.addEventListener('click', async () => {
  pct = 100;
  mode = 'normal';
  pending = null;
  clearTimeout(sendTimer);
  boosting = false;
  render();
  try {
    if (tab?.id) await chrome.runtime.sendMessage({ type: 'STOP', tabId: tab.id });
  } catch (_) {}
});

$('shareBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(STORE_URL);
    toast('Store link copied');
  } catch (_) {
    toast('Couldn’t copy the link');
  }
});

// ---------- init ----------

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

function disableControls() {
  disabled = true;
  knob.tabIndex = -1;
  knob.setAttribute('aria-disabled', 'true');
  modeKeys.forEach(k => { k.disabled = true; });
  resetBtn.disabled = true;
}

async function init() {
  buildVu(vu);
  let state = null;
  try {
    tab = await getCurrentTab();
    const url = tab?.url ?? '';
    try { host = new URL(url).hostname.replace(/^www\./, ''); } catch (_) {}

    if (isUnsupported(url)) {
      disableControls();
      showNotice('Chrome doesn’t allow boosting on this page. Open a tab that’s playing sound and try again.');
    } else if (tab?.id) {
      state = await chrome.runtime.sendMessage({ type: 'GET_STATE', tabId: tab.id });
    }
  } catch (_) {}

  pct = state?.pct ?? 100;
  mode = state?.mode ?? 'normal';
  limiter = state?.limiter ?? true;
  boosting = !!state?.boosting;
  render();

  if (state?.otherTab) {
    const where = state.otherTab.host || 'another tab';
    showNotice(`Boost is on ${where} (${state.otherTab.pct}%). Turning the knob here moves it to this tab.`);
  } else if (!disabled) {
    showWhatsNew().catch(() => {});
  }
  connectMeter();
  maybeShowRating().catch(() => {});
}

init();
