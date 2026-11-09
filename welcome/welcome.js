'use strict';

// Welcome page: a playable demo (shared/demo-synth.js) through the real boost chain,
// controlled with the popup's knob (shared/hifi.js), plus share links.

const STORE_URL = 'https://chromewebstore.google.com/detail/obbffbohmfndnmcmilihmjdioekchmgk';
const SHARE_TEXT = 'Quiet videos? This makes any Chrome tab louder, up to 600%, without the crackle. No ads, no tracking.';

const $ = id => document.getElementById(id);
const vu = $('vu');
const modeKeys = [...$('modes').querySelectorAll('[role="radio"]')];

let params = { pct: 100, mode: 'normal', limiter: true };
let synth = null; // created on first Play (shared/demo-synth.js)

const knobUI = mountKnob({ ring: $('ring'), knob: $('knob'), grip: $('grip'), onInput: (p) => { params.pct = p; update(); } });

// ---------- demo ----------

async function togglePlay() {
  if (!synth) synth = createDemoSynth({ params });
  if (synth.playing) {
    await synth.pause();
    showVu(vu, null);
    showLimit($('limTag'), null);
  } else {
    await synth.play();
    requestAnimationFrame(meterLoop);
  }
  update();
}

function meterLoop() {
  if (!synth?.playing) return;
  showVu(vu, readBands(synth.nodes.analyser, 28));
  showLimit($('limTag'), params.limiter && synth.limiting());
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
  const playing = !!synth?.playing;
  $('playBtn').textContent = playing ? 'Pause demo' : 'Play demo';

  const active = params.pct !== 100 || params.mode !== 'normal';
  $('pwr').classList.toggle('on', playing && active);
  const where = $('where');
  where.classList.toggle('idle', !playing);
  if (!playing) where.textContent = 'Press play';
  else if (!active) where.textContent = 'Demo · too quiet? Turn the knob';
  else where.textContent = (params.pct < 100 ? 'Quieter · ' : 'Boosting · ') + 'demo track';

  synth?.setParams(params);
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
