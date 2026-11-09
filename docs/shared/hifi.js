'use strict';

// Knob, LED ring and LED meter shared by the popup and the welcome page demo.

const KNOB_SEGMENTS = 41;
const VU_SEGMENTS = 24;

function dbText(p) {
  if (p <= 0) return '−∞ dB';
  const d = 20 * Math.log10(p / 100);
  if (Math.abs(d) < 0.05) return '0.0 dB';
  return (d > 0 ? '+' : '−') + Math.abs(d).toFixed(1) + ' dB';
}

function dbSpoken(p) {
  return dbText(p).replace('+', 'plus ').replace('−', 'minus ').replace('dB', 'decibels');
}

// Steps of 5, with a detent at 100% so "normal" is easy to hit.
function snapLevel(p) {
  p = Math.round(p / 5) * 5;
  if (Math.abs(p - 100) <= 8) p = 100;
  return Math.max(0, Math.min(600, p));
}

// Wires up a knob: drag, wheel, arrow keys, and clicks on the ring labels.
// onInput receives a snapped level; call render(pct) to show a level.
function mountKnob({ ring, knob, grip, onInput }) {
  let value = 100;
  let svg = '';
  for (let i = 0; i < KNOB_SEGMENTS; i++) {
    const v = (i / (KNOB_SEGMENTS - 1)) * 600;
    const a = -135 + 270 * i / (KNOB_SEGMENTS - 1);
    svg += `<rect class="seg${v >= 420 ? ' hot' : ''}" x="108.3" y="22" width="3.4" height="12" rx="1.7" transform="rotate(${a.toFixed(2)} 110 110)"/>`;
  }
  for (const [v, home] of [[0], [100, true], [300], [600]]) {
    const a = (-135 + 270 * v / 600) * Math.PI / 180;
    const x = 110 + 104 * Math.sin(a);
    const y = 110 - 104 * Math.cos(a) + 3;
    svg += `<text class="ringlbl${home ? ' home' : ''}" data-v="${v}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="middle">${v}</text>`;
  }
  ring.innerHTML = svg;
  const segs = [...ring.querySelectorAll('.seg')];

  const disabled = () => knob.getAttribute('aria-disabled') === 'true';
  const input = (p) => {
    if (disabled()) return;
    p = snapLevel(p);
    if (p !== value) onInput(p);
  };

  let drag = null;
  knob.addEventListener('pointerdown', (e) => {
    if (disabled()) return;
    knob.setPointerCapture(e.pointerId);
    drag = { x: e.clientX, y: e.clientY, p: value };
    knob.focus();
  });
  knob.addEventListener('pointermove', (e) => {
    if (drag) input(drag.p + ((e.clientX - drag.x) - (e.clientY - drag.y)) * 2.2);
  });
  knob.addEventListener('pointerup', () => { drag = null; });
  knob.addEventListener('pointercancel', () => { drag = null; });

  knob.addEventListener('wheel', (e) => {
    e.preventDefault();
    input(value + (e.deltaY < 0 ? 10 : -10));
  }, { passive: false });

  knob.addEventListener('keydown', (e) => {
    const step = e.shiftKey ? 50 : 10;
    const moves = { ArrowUp: step, ArrowRight: step, ArrowDown: -step, ArrowLeft: -step, PageUp: 50, PageDown: -50 };
    if (e.key in moves) input(value + moves[e.key]);
    else if (e.key === 'Home') input(0);
    else if (e.key === 'End') input(600);
    else return;
    e.preventDefault();
  });

  ring.addEventListener('click', (e) => {
    const v = e.target.closest('.ringlbl')?.dataset.v;
    if (v !== undefined) input(Number(v));
  });

  return {
    render(pct) {
      value = pct;
      segs.forEach((seg, i) => seg.classList.toggle('lit', pct > 0 && (i / (KNOB_SEGMENTS - 1)) * 600 <= pct));
      grip.style.setProperty('--a', (-135 + 270 * pct / 600) + 'deg');
      knob.setAttribute('aria-valuenow', pct);
      knob.setAttribute('aria-valuetext', `${pct} percent, ${dbSpoken(pct)}`);
    },
  };
}

function buildVu(el) {
  for (let i = 0; i < VU_SEGMENTS; i++) {
    const led = document.createElement('i');
    if (i >= 14) led.classList.add('mid');
    if (i >= 20) led.classList.add('top');
    el.appendChild(led);
  }
}

// bands: 0–255 peaks from readBands(); lights the LED strip from the three loudest bands.
function showVu(el, bands) {
  let lit = 0;
  if (bands) {
    const top = [...bands].sort((a, b) => b - a);
    const level = (top[0] + top[1] + top[2]) / 3;
    lit = Math.round(Math.max(0, Math.min(1, (level - 60) / 180)) * VU_SEGMENTS);
  }
  el.querySelectorAll('i').forEach((led, i) => led.classList.toggle('on', i < lit));
}

// LIMIT light: on while the limiter reduces gain, held briefly so it doesn't flicker on every beat.
function showLimit(el, on) {
  if (on) {
    el.classList.add('active');
    clearTimeout(el._hold);
    el._hold = setTimeout(() => el.classList.remove('active'), 400);
  } else if (on === null) {
    clearTimeout(el._hold);
    el.classList.remove('active');
  }
}
