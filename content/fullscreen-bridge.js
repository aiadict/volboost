'use strict';

// Guard against double-injection when boost is re-applied on the same tab.
if (!window.__vbBridgeInstalled) {
  window.__vbBridgeInstalled = true;

  // Chrome blocks OS-level fullscreen while a tab is captured (tabCapture active).
  // The video fills the viewport but browser chrome stays visible ("fullscreen within tab").
  // Fix: on fullscreenchange, ask the service worker to put the browser window itself
  // into fullscreen via chrome.windows.update, which is a separate code path and works.

  let bridgeActive = false;

  document.addEventListener('fullscreenchange', async () => {
    if (document.fullscreenElement && !bridgeActive) {
      const { active } = await chrome.runtime.sendMessage({ type: 'IS_BOOST_ACTIVE' })
        .catch(() => ({ active: false }));
      if (!active) return;

      bridgeActive = true;
      chrome.runtime.sendMessage({ type: 'FULLSCREEN_ENTER' }).catch(() => {});

    } else if (!document.fullscreenElement && bridgeActive) {
      bridgeActive = false;
      chrome.runtime.sendMessage({ type: 'FULLSCREEN_EXIT' }).catch(() => {});
    }
  });
}
