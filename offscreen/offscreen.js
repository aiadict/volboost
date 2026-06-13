'use strict';

let audioCtx = null;
let gainNode = null;
let mediaStream = null;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'START_CAPTURE') {
    startCapture(msg.streamId, msg.gain)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'SET_GAIN') {
    if (gainNode) {
      gainNode.gain.value = msg.gain;
      sendResponse({ ok: true });
    } else {
      sendResponse({ ok: false }); // no active context; caller will restart capture
    }
    return;
  }

  if (msg.type === 'STOP_CAPTURE') {
    stopCapture();
    sendResponse({ ok: true });
  }
});

async function startCapture(streamId, gain) {
  stopCapture();

  mediaStream = await navigator.mediaDevices.getUserMedia({
    audio: {
      mandatory: {
        chromeMediaSource: 'tab',
        chromeMediaSourceId: streamId,
      },
    },
    video: false,
  });

  audioCtx = new AudioContext();
  gainNode = audioCtx.createGain();
  gainNode.gain.value = gain;

  const source = audioCtx.createMediaStreamSource(mediaStream);
  source.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

function stopCapture() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
    gainNode = null;
  }
}
