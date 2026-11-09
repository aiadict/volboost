'use strict';

// Audio chain (buildGraph, applyGraphParams, readBands) lives in shared/audio-graph.js.

let audioCtx = null;
let mediaStream = null;
let nodes = null;
let params = { pct: 100, mode: 'normal', limiter: true };

const METER_BANDS = 28;

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.target !== 'offscreen') return;

  if (msg.type === 'START_CAPTURE') {
    startCapture(msg.streamId, msg.params)
      .then(() => sendResponse({ ok: true }))
      .catch(e => sendResponse({ ok: false, error: e.message }));
    return true;
  }

  if (msg.type === 'SET_PARAMS') {
    if (nodes) {
      applyParams(msg.params);
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

// Live meter for the popup: it opens a port named 'meter' while visible.
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'meter') return;
  const timer = setInterval(() => {
    try { port.postMessage(readMeter()); } catch (_) { clearInterval(timer); }
  }, 33);
  port.onDisconnect.addListener(() => clearInterval(timer));
});

async function startCapture(streamId, newParams) {
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
  nodes = buildGraph(audioCtx, audioCtx.createMediaStreamSource(mediaStream));
  applyParams(newParams, true);

  if (audioCtx.state === 'suspended') await audioCtx.resume();
}

function applyParams(newParams, immediate = false) {
  params = { ...params, ...newParams };
  applyGraphParams(audioCtx, nodes, params, immediate);
}

function readMeter() {
  if (!nodes) return { bands: new Array(METER_BANDS).fill(0), reduction: 0 };
  return { bands: readBands(nodes.analyser, METER_BANDS), reduction: nodes.limiter.reduction };
}

function stopCapture() {
  if (mediaStream) {
    mediaStream.getTracks().forEach(t => t.stop());
    mediaStream = null;
  }
  if (audioCtx) {
    audioCtx.close();
    audioCtx = null;
    nodes = null;
  }
}
