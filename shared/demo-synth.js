'use strict';

// Synthesized demo loop (no licensed audio) played through the real boost chain
// from shared/audio-graph.js. Used by the welcome page and the website.

const DEMO_BPM = 92;
const DEMO_STEP = 60 / DEMO_BPM / 4; // sixteenth note
const DEMO_LOOKAHEAD = 0.12;         // seconds scheduled ahead of the clock

// Am – F – C – G, one bar each.
const DEMO_CHORDS = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 261.63, 329.63],
  [196.0, 246.94, 293.66],
];
const DEMO_BASS = [110.0, 87.31, 130.81, 98.0];

// level: source loudness before boosting; deliberately quiet, like a video recorded too low.
// ctx: pass an OfflineAudioContext to render the loop to a buffer (marketing video).
function createDemoSynth({ params, level = 0.26, ctx = new AudioContext() }) {
  const src = ctx.createGain();
  src.gain.value = level;
  const nodes = buildGraph(ctx, src);
  applyGraphParams(ctx, nodes, params, true);

  const noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  let playing = false;
  let nextTime = 0;
  let step = 0;
  let timer = null;

  function env(g, t, peak, attack, decay) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
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
    g.connect(src);
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
    g.connect(src);
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
    g.connect(src);
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
    if (pos === 0 || pos === 8 || pos === 11) tone('sawtooth', DEMO_BASS[bar], t, 0.5, 0.01, DEMO_STEP * 2.5, 420);
    if (pos === 0) DEMO_CHORDS[bar].forEach(f => tone('triangle', f, t, 0.12, 0.08, DEMO_STEP * 15, 2400));
    if (pos % 3 === 0) tone('sine', DEMO_CHORDS[bar][(pos / 3) % 3] * 2, t, 0.16, 0.005, 0.35);
  }

  function scheduler() {
    while (nextTime < ctx.currentTime + DEMO_LOOKAHEAD) {
      scheduleStep(step, nextTime);
      nextTime += DEMO_STEP;
      step = (step + 1) % 64;
    }
  }

  return {
    ctx,
    nodes,
    get playing() { return playing; },
    async play() {
      if (playing) return;
      playing = true;
      await ctx.resume();
      nextTime = ctx.currentTime + 0.05;
      step = 0;
      timer = setInterval(scheduler, 25);
    },
    async pause() {
      if (!playing) return;
      playing = false;
      clearInterval(timer);
      await ctx.suspend();
    },
    setParams(p) {
      applyGraphParams(ctx, nodes, p);
    },
    // Offline use: schedules every note up to `until` seconds in one go.
    scheduleUntil(until) {
      nextTime = 0.05;
      step = 0;
      while (nextTime < until) {
        scheduleStep(step, nextTime);
        nextTime += DEMO_STEP;
        step = (step + 1) % 64;
      }
    },
    // True while the limiter is audibly working (more than 1 dB of gain reduction).
    limiting() {
      return nodes.limiter.reduction < -1 && nodes.limited.gain.value > 0.5;
    },
  };
}
