'use strict';

// MAIN world — patches Element.prototype.requestFullscreen so every fullscreen
// trigger (button, F key, double-click, any API call) is intercepted on every
// site. Communicates with the ISOLATED world bridge via window.postMessage
// because chrome.runtime is not reliably available in the MAIN world.

const _requestFullscreen = Element.prototype.requestFullscreen;

Element.prototype.requestFullscreen = async function (...args) {
  // Ask ISOLATED bridge whether boost is active on this tab.
  const active = await new Promise(resolve => {
    const id = Math.random().toString(36).slice(2);
    function handler(e) {
      if (e.source !== window || !e.data?._vb) return;
      if (e.data.type === 'VB_STATUS' && e.data.id === id) {
        window.removeEventListener('message', handler);
        resolve(!!e.data.active);
      }
    }
    window.addEventListener('message', handler);
    window.postMessage({ _vb: true, type: 'VB_CHECK', id }, '*');
  });

  if (active) {
    // Release tabCapture so Chrome allows OS-level fullscreen.
    await new Promise(resolve => {
      const id = Math.random().toString(36).slice(2);
      function handler(e) {
        if (e.source !== window || !e.data?._vb) return;
        if (e.data.type === 'VB_RELEASED' && e.data.id === id) {
          window.removeEventListener('message', handler);
          resolve();
        }
      }
      window.addEventListener('message', handler);
      window.postMessage({ _vb: true, type: 'VB_RELEASE', id }, '*');
    });
  }

  const result = await _requestFullscreen.apply(this, args);

  if (active) {
    // Re-capture audio after fullscreen transition completes.
    document.addEventListener('fullscreenchange', () => {
      window.postMessage({ _vb: true, type: 'VB_RESTORE' }, '*');
    }, { once: true });
  }

  return result;
};
