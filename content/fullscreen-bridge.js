'use strict';

// MAIN world — patches Element.prototype.requestFullscreen before any page
// script runs, intercepting every fullscreen trigger (button, F key, dblclick).
//
// Chrome intentionally gives "fullscreen-in-tab" (browser-window only) when
// tabCapture is active. Fix: release capture BEFORE calling requestFullscreen,
// then re-capture after fullscreen is established.
//
// chrome.runtime is not reliably available in MAIN world, so all SW
// communication goes through the ISOLATED world bridge via window.postMessage.

const _requestFullscreen = Element.prototype.requestFullscreen;

Element.prototype.requestFullscreen = async function (...args) {
  const { active } = await msg('VB_CHECK', 'VB_STATUS').catch(() => ({ active: false }));

  if (active) {
    // Release tabCapture fully (closes offscreen document) so Chrome allows
    // OS-level fullscreen. Brief delay lets Chrome process the release.
    await msg('VB_RELEASE', 'VB_RELEASED').catch(() => {});
    await new Promise(r => setTimeout(r, 100));
  }

  const result = await _requestFullscreen.apply(this, args);

  if (active) {
    document.addEventListener('fullscreenchange', () => {
      window.postMessage({ _vb: true, type: 'VB_RESTORE' }, '*');
    }, { once: true });
  }

  return result;
};

function msg(sendType, replyType) {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2);
    const timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('vb-timeout'));
    }, 3000);

    function handler(e) {
      if (e.source !== window || !e.data?._vb) return;
      if (e.data.type === replyType && e.data.id === id) {
        clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve(e.data);
      }
    }

    window.addEventListener('message', handler);
    window.postMessage({ _vb: true, type: sendType, id }, '*');
  });
}
