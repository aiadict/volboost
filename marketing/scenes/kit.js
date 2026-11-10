'use strict';

// Scene helpers. Scenes are served from the repo root by render-scenes.mjs / record.mjs,
// so the real popup (docs/popup, with the Chrome API shim) loads same-origin and can be driven.

const Kit = {
  // Fake browser window markup. `badge` is the toolbar badge text ('' hides it).
  browser({ tab = 'Lecture 12 — Signals', url = 'youtube.com/watch', badge = '250', caption = '' } = {}) {
    return `
      <div class="win-bar"><span class="dots"><i></i><i></i><i></i></span><div class="tab">${tab}</div></div>
      <div class="win-tools">
        <div class="addr">${url}</div>
        <span class="tool"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M10 4.5a2 2 0 1 1 4 0V6h4v4h-1.5a2 2 0 1 0 0 4H18v4.5H6V14h1.5a2 2 0 1 0 0-4H6V6h4V4.5Z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg></span>
        <span class="tool ours"><img src="/icons/icon32.png" alt="" /><b class="badge">${badge}</b></span>
      </div>
      <div class="video" style="height: calc(100% - 86px)">
        ${caption ? `<div class="caption">${caption}</div>` : ''}
        <div class="player"><span class="play"></span><span>12:41 / 48:02</span><span class="bar"></span><span>HD</span></div>
      </div>`;
  },

  // Deterministic meter values: overall loudness 0–1 with a gentle per-band wobble at time t.
  bands(level, t = 0) {
    const out = [];
    for (let i = 0; i < 28; i++) {
      const f = i / 27;
      const wob = 0.82 + 0.18 * Math.sin(t * 7 + i * 1.7) * Math.sin(t * 3.1 + i * 0.6);
      out.push(Math.round(Math.max(0, Math.min(255, (60 + 180 * level) * (1 - 0.25 * f) * wob))));
    }
    return out;
  },

  // Embeds the real popup. Resolves to a controller once it has rendered its first state.
  popup(frame) {
    frame.src = '/docs/popup/popup.html';
    return new Promise((resolve) => {
      frame.addEventListener('load', async () => {
        const w = frame.contentWindow;
        while (!w.eval('typeof tab !== "undefined" && tab !== null')) await new Promise(r => setTimeout(r, 20));
        await w.document.fonts.ready;
        const fit = () => { frame.style.height = w.document.body.scrollHeight + 'px'; };
        fit();
        resolve({
          // pct, mode, limiter: popup state; level: meter loudness 0–1; limiting: LIMIT light; t: time for the meter wobble
          set({ pct = 100, mode = 'normal', limiter = true, level = 0, limiting = false, t = 0, notice = '' }) {
            const boosting = pct !== 100 || mode !== 'normal';
            w.eval(`pct=${pct}; mode=${JSON.stringify(mode)}; limiter=${limiter}; boosting=${boosting}; render();`);
            w.eval(`showVu(vu, ${JSON.stringify(level > 0 ? Kit.bands(level, t) : null)})`);
            w.document.getElementById('limTag').classList.toggle('active', limiting);
            w.eval(notice ? `showNotice(${JSON.stringify(notice)})` : 'hideNotice()');
            fit();
          },
        });
      }, { once: true });
    });
  },
};
