'use strict';

// For sites using tabCapture (Netflix, Twitch, etc.): Chrome intentionally
// blocks OS-level fullscreen while a tab is captured. The element enters
// "fullscreen-in-tab" mode (fills viewport but browser chrome stays visible).
//
// Fix: detect entry into fullscreen-in-tab via fullscreenchange, then ask the
// SW to put the browser WINDOW in fullscreen — hiding the browser chrome and
// making the video visually fill the entire screen.
//
// YouTube is handled separately (createMediaElementSource, no tabCapture),
// so IS_BOOST_ACTIVE returns false for YouTube and this bridge is a no-op there.

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
