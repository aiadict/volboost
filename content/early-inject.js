(function () {
  if (window.__vbPatched) return;
  window.__vbPatched = true;

  const NativeAC = window.AudioContext || window.webkitAudioContext;
  if (!NativeAC) return;

  const nativeConnect = AudioNode.prototype.connect;

  // Maps each AudioDestinationNode → our intercepting GainNode
  const destToGain = new WeakMap();

  AudioNode.prototype.connect = function (dest, outputIndex, inputIndex) {
    const interceptGain = destToGain.get(dest);
    if (interceptGain) {
      return inputIndex !== undefined
        ? nativeConnect.call(this, interceptGain, outputIndex, inputIndex)
        : outputIndex !== undefined
        ? nativeConnect.call(this, interceptGain, outputIndex)
        : nativeConnect.call(this, interceptGain);
    }
    return inputIndex !== undefined
      ? nativeConnect.call(this, dest, outputIndex, inputIndex)
      : outputIndex !== undefined
      ? nativeConnect.call(this, dest, outputIndex)
      : nativeConnect.call(this, dest);
  };

  class PatchedAudioContext extends NativeAC {
    constructor(options) {
      super(options);
      const gain = NativeAC.prototype.createGain.call(this);
      gain.gain.value = window.__vbGainValue ?? 1;
      nativeConnect.call(gain, this.destination);
      destToGain.set(this.destination, gain);
      if (!window.__vbContexts) window.__vbContexts = [];
      window.__vbContexts.push({ ctx: this, gain });
    }
  }

  window.__vbSetGain = function (gain) {
    window.__vbGainValue = gain;
    (window.__vbContexts || []).forEach(({ ctx, gain: gn }) => {
      gn.gain.value = gain;
      if (ctx.state === 'suspended') ctx.resume();
    });
  };

  // Expose the original constructor so pageBoostFn can create an unpatched
  // AudioContext for media-element capture, avoiding a double-gain chain.
  window.__vbNativeAC = NativeAC;

  window.AudioContext = PatchedAudioContext;
  if (window.webkitAudioContext) window.webkitAudioContext = PatchedAudioContext;
})();
