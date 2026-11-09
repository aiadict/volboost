'use strict';

const STORE_URL = 'https://chromewebstore.google.com/detail/obbffbohmfndnmcmilihmjdioekchmgk';
const REVIEWS_URL = STORE_URL + '/reviews';
const HELP_URL = 'https://aiadict.github.io/volboost/help.html';

const SEND_INTERVAL = 60;  // ms between live updates while turning the knob
const RING_SEGMENTS = 41;
const VU_SEGMENTS = 24;
const DAY = 24 * 60 * 60 * 1000;

const $ = id => document.getElementById(id);
const knob = $('knob');
const grip = $('grip');
const ring = $('ring');
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

// ---------- display ----------

function dbText(p) {
  if (p <= 0) return '−∞ dB';
  const d = 20 * Math.log10(p / 100);
  if (Math.abs(d) < 0.05) return '0.0 dB';
  return (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' dB';
}

// Steps of 5, with a detent at 100% so "normal" is easy to hit.
function snap(p) {
  p = Math.round(p / 5) * 5;
  if (Math.abs(p - 100) <= 8) p = 100;
  return Math.max(0, Math.min(600, p));
}

function buildRing() {
  let svg = '';
  for (let i = 0; i < RING_SEGMENTS; i++) {
    const v = (i / (RING_SEGMENTS - 1)) * 600;
    const a = -135 + 270 * i / (RING_SEGMENTS - 1);
    svg += `<rect class="seg${v >= 420 ? ' hot' : ''}" x="108.3" y="22" width="3.4" height="12" rx="1.7" transform="rotate(${a.toFixed(2)} 110 110)"/>`;
  }
  for (const [v, home] of [[0], [100, true], [300], [600]]) {
    const a = (-135 + 270 * v / 600) * Math.PI / 180;
    const x = 110 + 104 * Math.sin(a);
    const y = 110 - 104 * Math.cos(a) + 3;
    svg += `<text class="ringlbl${home ? ' home' : ''}" data-v="${v}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${v}</text>`;
  }
  ring.innerHTML = svg;
  for (let i = 0; i < VU_SEGMENTS; i++) {
    const led = document.createElement('i');
    if (i >= 14) led.classList.add('mid');
    if (i >= 20) led.classList.add('top');
    vu.appendChild(led);
  }
}

function render() {
  ring.querySelectorAll('.seg').forEach((seg, i) => {
    seg.classList.toggle('lit', pct > 0 && (i / (RING_SEGMENTS - 1)) * 600 <= pct);
  });
  grip.style.setProperty('--a', (-135 + 270 * pct / 600) + 'deg');
  $('volumeDisplay').textContent = pct;
  $('dbDisplay').textContent = dbText(pct);
  knob.setAttribute('aria-valuenow', pct);
  knob.setAttribute('aria-valuetext', `${pct} percent, ${dbText(pct).replace('+', 'plus ').replace('−', 'minus ').replace('dB', 'decibels')}`);

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
    const top = [...bands].sort((a, b) => b - a);
    const level = (top[0] + top[1] + top[2]) / 3;
    const lit = Math.round(Math.max(0, Math.min(1, (level - 60) / 180)) * VU_SEGMENTS);
    vu.querySelectorAll('i').forEach((led, i) => led.classList.toggle('on', i < lit));
    $('limTag').classList.toggle('active', limiter && reduction < -1);
  });
  meterPort.onDisconnect.addListener(() => {
    void chrome.runtime.lastError;
    meterPort = null;
    clearMeter();
  });
}

function clearMeter() {
  vu.querySelectorAll('i.on').forEach(led => led.classList.remove('on'));
  $('limTag').classList.remove('active');
}

// ---------- applying levels ----------

function setLevel(p) {
  if (disabled) return;
  p = snap(p);
  if (p === pct) return;
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

let drag = null;
knob.addEventListener('pointerdown', (e) => {
  if (disabled) return;
  knob.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, p: pct };
  knob.focus();
});
knob.addEventListener('pointermove', (e) => {
  if (!drag) return;
  setLevel(drag.p + ((e.clientX - drag.x) - (e.clientY - drag.y)) * 2.2);
});
knob.addEventListener('pointerup', () => { drag = null; });
knob.addEventListener('pointercancel', () => { drag = null; });

knob.addEventListener('wheel', (e) => {
  e.preventDefault();
  setLevel(pct + (e.deltaY < 0 ? 10 : -10));
}, { passive: false });

knob.addEventListener('keydown', (e) => {
  const step = e.shiftKey ? 50 : 10;
  const moves = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: 50, PageDown: -50 };
  if (e.key in moves) setLevel(pct + moves[e.key]);
  else if (e.key === 'Home') setLevel(0);
  else if (e.key === 'End') setLevel(600);
  else return;
  e.preventDefault();
});

ring.addEventListener('click', (e) => {
  const v = e.target.closest('.ringlbl')?.dataset.v;
  if (v !== undefined) setLevel(Number(v));
});

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
  buildRing();
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
  }
  connectMeter();
  maybeShowRating().catch(() => {});
}

init();
