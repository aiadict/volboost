'use strict';

// YouTube's fullscreen button triggers the HTML Fullscreen API, which Chrome
// blocks from reaching OS-level fullscreen while tabCapture is active.
// We intercept the click: release capture → request fullscreen → re-capture.

function patchFullscreenButton() {
  const fsButton = document.querySelector('.ytp-fullscreen-button');
  if (!fsButton || fsButton._vbPatched) return;
  fsButton._vbPatched = true;

  fsButton.addEventListener('click', async (e) => {
    const { active } = await chrome.runtime.sendMessage({ type: 'IS_BOOST_ACTIVE' })
      .catch(() => ({ active: false }));

    if (!active) return;

    e.stopImmediatePropagation();
    e.preventDefault();

    await chrome.runtime.sendMessage({ type: 'RELEASE_FOR_FULLSCREEN' }).catch(() => {});

    const player = document.querySelector('.html5-video-player');
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else if (player) {
      await player.requestFullscreen().catch(() => {});
    }

    await new Promise(resolve =>
      document.addEventListener('fullscreenchange', resolve, { once: true })
    );

    chrome.runtime.sendMessage({ type: 'RESTORE_AFTER_FULLSCREEN' }).catch(() => {});
  }, true); // capture phase — runs before YouTube's own click handler
}

const observer = new MutationObserver(patchFullscreenButton);
observer.observe(document.documentElement, { childList: true, subtree: true });
patchFullscreenButton();
