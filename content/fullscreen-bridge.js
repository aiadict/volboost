'use strict';

// Patch Element.prototype.requestFullscreen at the page JS level (MAIN world,
// document_start) so every fullscreen trigger — button click, F key,
// double-click, or any direct API call — is intercepted on every site.
//
// When tabCapture is active Chrome blocks OS-level fullscreen. Fix:
// release capture → call original requestFullscreen → re-capture after.

if (typeof chrome !== 'undefined' && chrome.runtime) {
  const _requestFullscreen = Element.prototype.requestFullscreen;

  Element.prototype.requestFullscreen = async function (...args) {
    let wasActive = false;

    try {
      const { active } = await chrome.runtime.sendMessage({ type: 'IS_BOOST_ACTIVE' });
      wasActive = !!active;
    } catch (_) {}

    if (wasActive) {
      await chrome.runtime.sendMessage({ type: 'RELEASE_FOR_FULLSCREEN' }).catch(() => {});
    }

    const result = await _requestFullscreen.apply(this, args);

    if (wasActive) {
      document.addEventListener('fullscreenchange', () => {
        chrome.runtime.sendMessage({ type: 'RESTORE_AFTER_FULLSCREEN' }).catch(() => {});
      }, { once: true });
    }

    return result;
  };
}
