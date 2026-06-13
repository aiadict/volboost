'use strict';

// Boosts YouTube audio via Web Audio API directly on the <video> element.
// No tabCapture involved — fullscreen, F key, double-click all work normally.

let audioCtx = null;
let gainNode = null;
let sourceNode = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.type === 'YT_BOOST') {
    boost(msg.gain)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }
  if (msg.type === 'YT_SET_GAIN') {
    if (gainNode) { gainNode.gain.value = msg.gain; sendResponse({ ok: true }); }
    else { sendResponse({ ok: false }); }
    return;
  }
  if (msg.type === 'YT_STOP') {
    stop();
    sendResponse({ ok: true });
  }
});

async function boost(gain) {
  const video = findVideo();
  if (!video) throw new Error('No video element found');

  // Same video already connected — just update gain.
  if (gainNode && sourceNode?.mediaElement === video) {
    gainNode.gain.value = gain;
    if (audioCtx.state === 'suspended') await audioCtx.resume();
    return;
  }

  // New video (e.g. after SPA navigation) — reconnect pipeline.
  stop();
  audioCtx = new AudioContext();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;
  sourceNode = audioCtx.createMediaElementSource(video);
  sourceNode.connect(gainNode);
  gainNode.connect(audioCtx.destination);
  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

function stop() {
  try { sourceNode?.disconnect(); } catch (_) {}
  try { gainNode?.disconnect(); } catch (_) {}
  try { audioCtx?.close(); } catch (_) {}
  sourceNode = null;
  gainNode = null;
  audioCtx = null;
}

function findVideo() {
  return (
    document.querySelector('#movie_player video') ||
    document.querySelector('.html5-main-video') ||
    document.querySelector('video')
  );
}
