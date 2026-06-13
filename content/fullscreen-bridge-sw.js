'use strict';

// ISOLATED world — receives window.postMessage from the MAIN world patch and
// bridges to the service worker via chrome.runtime.sendMessage.

window.addEventListener('message', async (e) => {
  if (e.source !== window || !e.data?._vb) return;

  const { type, id } = e.data;

  if (type === 'VB_CHECK') {
    const { active } = await chrome.runtime.sendMessage({ type: 'IS_BOOST_ACTIVE' })
      .catch(() => ({ active: false }));
    window.postMessage({ _vb: true, type: 'VB_STATUS', id, active }, '*');
  }

  if (type === 'VB_RELEASE') {
    await chrome.runtime.sendMessage({ type: 'RELEASE_FOR_FULLSCREEN' }).catch(() => {});
    window.postMessage({ _vb: true, type: 'VB_RELEASED', id }, '*');
  }

  if (type === 'VB_RESTORE') {
    chrome.runtime.sendMessage({ type: 'RESTORE_AFTER_FULLSCREEN' }).catch(() => {});
  }
});
