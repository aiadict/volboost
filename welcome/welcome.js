'use strict';

// Welcome page: a playable demo of the boost chain (shared/audio-graph.js) with the
// popup's knob (shared/hifi.js), plus share links.

const STORE_URL = 'https://chromewebstore.google.com/detail/obbffbohmfndnmcmilihmjdioekchmgk';
const SHARE_TEXT = 'Quiet videos? This makes any Chrome tab louder, up to 600%, without the crackle. No ads, no tracking.';

const SOURCE_LEVEL = 0.26; // deliberately quiet, like a video recorded too low
const BPM = 92;
const STEP = 60 / BPM / 4; // sixteenth note
const LOOKAHEAD = 0.12;    // seconds scheduled ahead of the clock

// Am – F – C – G, one bar each.
const CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 261.63, 329.63],
  [196.0, 246.94, 293.66],
];
const BASS = [110.0, 87.31, 130.81, 98.0];

const $ = id => document.getElementById(id);
const vu = $('vu');
const modeKeys = [...$('modes').querySelectorAll('[role="radio"]')];

let params = { pct: 100, mode: 'normal', limiter: true };
let ctx = null;
let nodes = null;
let noise = null;
let playing = false;
let nextTime = 0;
let step = 0;
let schedTimer = null;

const knobUI = mountKnob({ ring: $('ring'), knob: $('knob'), grip: $('grip'), onInput: (p) => { params.pct = p; update(); } });

// ---------- synth ----------

function setupAudio() {
  ctx = new AudioContext();
  const src = ctx.createGain();
  src.gain.value = SOURCE_LEVEL;
  nodes = buildGraph(ctx, src);
  nodes.src = src;
  applyGraphParams(ctx, nodes, params, true);

  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function env(gainNode, t, peak, attack, decay) {
  gainNode.gain.setValueAtTime(0.0001, t);
  gainNode.gain.exponentialRampToValueAtTime(peak, t + attack);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(type, freq, t, peak, attack, decay, filterFreq) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  let last = osc;
  if (filterFreq) {
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = filterFreq;
    osc.connect(f);
    last = f;
  }
  last.connect(g);
  g.connect(nodes.src);
  env(g, t, peak, attack, decay);
  osc.start(t);
  osc.stop(t + attack + decay + 0.05);
}

function kick(t) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.setValueAtTime(140, t);
  osc.frequency.exponentialRampToValueAtTime(42, t + 0.18);
  osc.connect(g);
  g.connect(nodes.src);
  env(g, t, 1.0, 0.004, 0.32);
  osc.start(t);
  osc.stop(t + 0.4);
}

function hiss(t, freq, peak, decay) {
  const s = ctx.createBufferSource();
  const f = ctx.createBiquadFilter();
  const g = ctx.createGain();
  s.buffer = noise;
  f.type = 'highpass';
  f.frequency.value = freq;
  s.connect(f);
  f.connect(g);
  g.connect(nodes.src);
  env(g, t, peak, 0.002, decay);
  s.start(t, Math.random() * 0.5);
  s.stop(t + decay + 0.05);
}

function scheduleStep(s, t) {
  const bar = Math.floor(s / 16) % 4;
  const pos = s % 16;
  if (pos === 0 || pos === 7 || pos === 10) kick(t);
  if (pos === 4 || pos === 12) hiss(t, 1800, 0.45, 0.16);
  if (pos % 2 === 0) hiss(t, 7000, pos % 4 === 2 ? 0.18 : 0.1, 0.05);
  if (pos === 0 || pos === 8 || pos === 11) tone('sawtooth', BASS[bar], t, 0.5, 0.01, STEP * 2.5, 420);
  if (pos === 0) CHORDS[bar].forEach(f => tone('triangle', f, t, 0.12, 0.08, STEP * 15, 2400));
  if (pos % 3 === 0) tone('sine', CHORDS[bar][(pos / 3) % 3] * 2, t, 0.16, 0.005, 0.35);
}

function scheduler() {
  while (nextTime < ctx.currentTime + LOOKAHEAD) {
    scheduleStep(step, nextTime);
    nextTime += STEP;
    step = (step + 1) % 64;
  }
}

async function togglePlay() {
  if (!ctx) setupAudio();
  playing = !playing;
  if (playing) {
    await ctx.resume();
    nextTime = ctx.currentTime + 0.05;
    step = 0;
    schedTimer = setInterval(scheduler, 25);
    requestAnimationFrame(meterLoop);
  } else {
    clearInterval(schedTimer);
    await ctx.suspend();
    showVu(vu, null);
    showLimit($('limTag'), null);
  }
  update();
}

function meterLoop() {
  if (!playing) return;
  showVu(vu, readBands(nodes.analyser, 28));
  showLimit($('limTag'), params.limiter && nodes.limiter.reduction < -1 && nodes.limited.gain.value > 0.5);
  requestAnimationFrame(meterLoop);
}

// ---------- UI ----------

function update() {
  knobUI.render(params.pct);
  $('volumeDisplay').textContent = params.pct;
  $('dbDisplay').textContent = dbText(params.pct);
  modeKeys.forEach(k => {
    const on = k.dataset.mode === params.mode;
    k.setAttribute('aria-checked', String(on));
    k.tabIndex = on ? 0 : -1;
  });
  $('limiterBtn').setAttribute('aria-pressed', String(params.limiter));
  $('playBtn').textContent = playing ? 'Pause demo' : 'Play demo';

  const active = params.pct !== 100 || params.mode !== 'normal';
  $('pwr').classList.toggle('on', playing && active);
  const where = $('where');
  where.classList.toggle('idle', !playing);
  if (!playing) where.textContent = 'Press play';
  else if (!active) where.textContent = 'Demo · too quiet? Turn the knob';
  else where.textContent = (params.pct < 100 ? 'Quieter · ' : 'Boosting · ') + 'demo track';

  if (nodes) applyGraphParams(ctx, nodes, params);
}

modeKeys.forEach((k, i) => {
  k.addEventListener('click', () => { params.mode = k.dataset.mode; update(); });
  k.addEventListener('keydown', (e) => {
    const dir = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = modeKeys[(i + dir + modeKeys.length) % modeKeys.length];
    next.focus();
    params.mode = next.dataset.mode;
    update();
  });
});

$('limiterBtn').addEventListener('click', () => { params.limiter = !params.limiter; update(); });
$('playBtn').addEventListener('click', togglePlay);

// ---------- share ----------

function toast(msg) {
  const el = $('toast');
  el.textContent = msg;
  el.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => el.classList.remove('show'), 1800);
}

$('copyBtn').addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(STORE_URL);
    toast('Store link copied');
  } catch (_) {
    toast('Couldn’t copy the link');
  }
});

const enc = encodeURIComponent;
$('shareWhatsApp').href = `https://wa.me/?text=${enc(SHARE_TEXT + ' ' + STORE_URL)}`;
$('shareX').href = `https://twitter.com/intent/tweet?text=${enc(SHARE_TEXT)}&url=${enc(STORE_URL)}`;
$('shareReddit').href = `https://www.reddit.com/submit?url=${enc(STORE_URL)}&title=${enc('Volume Booster — Loud & Clear: make any Chrome tab louder, without the crackle')}`;
$('shareEmail').href = `mailto:?subject=${enc('Make quiet videos louder')}&body=${enc(SHARE_TEXT + '\n\n' + STORE_URL)}`;

buildVu(vu);
update();
