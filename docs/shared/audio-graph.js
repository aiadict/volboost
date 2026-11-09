'use strict';

// Boost chain shared by the offscreen document (real tab audio) and the welcome page demo.

// Neutral values mean "off": every node stays in the graph, so switching modes never re-wires.
const MODES = {
  normal: { hp: 20,  presence: 0, shelfFreq: 250, shelf: 0,  night: false },
  voice:  { hp: 120, presence: 5, shelfFreq: 250, shelf: -3, night: false },
  bass:   { hp: 20,  presence: 0, shelfFreq: 110, shelf: 7,  night: false },
  night:  { hp: 20,  presence: 0, shelfFreq: 250, shelf: 0,  night: true },
};

const RAMP = 0.03; // seconds; smooths every parameter change (no zipper noise)

//  source → highpass → presence → shelf → night → gain ─┬→ direct ───────────────────────┬→ out → destination
//                                                       └→ limiter → softclip → limited ─┘     └→ analyser
function buildGraph(ctx, source) {
  const highpass = ctx.createBiquadFilter();
  highpass.type = 'highpass';
  highpass.Q.value = 0.707;

  const presence = ctx.createBiquadFilter();
  presence.type = 'peaking';
  presence.frequency.value = 2800;
  presence.Q.value = 0.9;

  const shelf = ctx.createBiquadFilter();
  shelf.type = 'lowshelf';

  const night = ctx.createDynamicsCompressor();
  const gain = ctx.createGain();
  const direct = ctx.createGain();

  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -4;
  limiter.knee.value = 2;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.15;

  const softclip = ctx.createWaveShaper();
  softclip.curve = softClipCurve();
  softclip.oversample = '4x';

  const limited = ctx.createGain();
  const out = ctx.createGain();

  const analyser = ctx.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = 0.7;

  source.connect(highpass);
  highpass.connect(presence);
  presence.connect(shelf);
  shelf.connect(night);
  night.connect(gain);
  gain.connect(direct);
  gain.connect(limiter);
  limiter.connect(softclip);
  softclip.connect(limited);
  direct.connect(out);
  limited.connect(out);
  out.connect(ctx.destination);
  out.connect(analyser);

  return { highpass, presence, shelf, night, gain, direct, limiter, limited, analyser };
}

// Linear below 0.9, then a tanh knee that never exceeds 1.0.
function softClipCurve() {
  const n = 2048;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 2 - 1;
    const a = Math.abs(x);
    const y = a < 0.9 ? a : 0.9 + 0.1 * Math.tanh((a - 0.9) / 0.1);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}

// params: { pct, mode, limiter }
function applyGraphParams(ctx, nodes, params, immediate = false) {
  const m = MODES[params.mode] ?? MODES.normal;
  const t = ctx.currentTime;
  const set = (param, v) => immediate ? param.setValueAtTime(v, t) : param.setTargetAtTime(v, t, RAMP);

  set(nodes.highpass.frequency, m.hp);
  set(nodes.presence.gain, m.presence);
  set(nodes.shelf.frequency, m.shelfFreq);
  set(nodes.shelf.gain, m.shelf);

  set(nodes.night.threshold, m.night ? -30 : 0);
  set(nodes.night.knee, m.night ? 12 : 0);
  set(nodes.night.ratio, m.night ? 4 : 1);
  set(nodes.night.attack, 0.01);
  set(nodes.night.release, 0.35);

  set(nodes.gain.gain, params.pct / 100);

  // The limiter only joins when the signal can exceed unity, so 100% / Normal stays bit-identical.
  const useLimiter = params.limiter && (params.pct > 100 || params.mode !== 'normal');
  set(nodes.direct.gain, useLimiter ? 0 : 1);
  set(nodes.limited.gain, useLimiter ? 1 : 0);
}

// Peak level per band (0–255), log-spaced, for LED meters.
function readBands(analyser, count) {
  const bins = new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(bins);
  const top = bins.length - 1;
  const bands = [];
  for (let b = 0; b < count; b++) {
    const lo = Math.min(top, Math.round(Math.pow(top, b / count)));
    const hi = Math.max(lo + 1, Math.min(top, Math.round(Math.pow(top, (b + 1) / count))));
    let peak = 0;
    for (let i = lo; i < hi; i++) peak = Math.max(peak, bins[i]);
    bands.push(peak);
  }
  return bands;
}
