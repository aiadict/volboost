'use strict';

// Landing page demo: owns the demo track (shared/demo-synth.js); the embedded real popup
// controls it through window.siteDemo (see chrome-shim.js).

let synth = null;
let params = { pct: 100, mode: 'normal', limiter: true };

window.siteDemo = {
  setParams(p) {
    params = { pct: p.pct, mode: p.mode, limiter: p.limiter };
    synth?.setParams(params);
  },
  bands() {
    return synth?.playing ? readBands(synth.nodes.analyser, 28) : null;
  },
  limiting() {
    return !!synth?.playing && params.limiter && synth.limiting();
  },
};

// Fit the frame to the popup's real height.
const frame = document.querySelector('.demo iframe');
function fitFrame() {
  const body = frame.contentDocument?.body;
  if (!body || frame.dataset.fitted) return;
  frame.dataset.fitted = '1';
  const fit = () => { frame.style.height = body.scrollHeight + 'px'; };
  fit();
  new ResizeObserver(fit).observe(body);
}
if (frame) {
  frame.addEventListener('load', fitFrame);
  if (frame.contentDocument?.readyState === 'complete' && frame.contentDocument.body?.childElementCount) fitFrame();
}

const playBtn = document.getElementById('playBtn');
if (playBtn) {
  playBtn.addEventListener('click', async () => {
    if (!synth) synth = createDemoSynth({ params });
    if (synth.playing) await synth.pause();
    else await synth.play();
    playBtn.textContent = synth.playing ? 'Pause sample' : 'Play sample';
    playBtn.setAttribute('aria-pressed', String(synth.playing));
  });
}
