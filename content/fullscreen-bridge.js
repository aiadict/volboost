'use strict';

// When tabCapture is active Chrome only grants browser-window fullscreen,
// not OS fullscreen. We can't intercept before requestFullscreen reliably,
// so we detect via fullscreenchange and correct immediately after:
// exit wrong fullscreen → release capture → re-enter → re-capture audio.

let fixing = false;

document.addEventListener('fullscreenchange', async () => {
  if (fixing || !document.fullscreenElement) return;

  const { active } = await chrome.runtime.sendMessage({ type: 'IS_BOOST_ACTIVE' })
    .catch(() => ({ active: false }));
  if (!active) return;

  // Boost was active: Chrome gave us browser-window fullscreen. Fix it.
  const el = document.fullscreenElement;
  fixing = true;

  try {
    await document.exitFullscreen().catch(() => {});
    await chrome.runtime.sendMessage({ type: 'RELEASE_FOR_FULLSCREEN' }).catch(() => {});
    await el.requestFullscreen().catch(() => {});
  } finally {
    fixing = false;
  }

  chrome.runtime.sendMessage({ type: 'RESTORE_AFTER_FULLSCREEN' }).catch(() => {});
});
