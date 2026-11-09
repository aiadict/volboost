'use strict';

// Stands in for the extension APIs so the real popup (copied to docs/popup/ by
// scripts/build-site.mjs) runs on the website. Boost commands drive the demo
// track owned by the parent page (window.siteDemo in site.js).
(() => {
  const demo = () => (window.parent !== window ? window.parent.siteDemo : null);
  const local = {};
  let state = { pct: 100, mode: 'normal', limiter: true };

  function push() { demo()?.setParams(state); }

  window.chrome = {
    runtime: {
      lastError: undefined,
      async sendMessage(msg) {
        if (msg.type === 'GET_STATE') {
          return { ...state, boosting: state.pct !== 100 || state.mode !== 'normal', otherTab: null };
        }
        if (msg.type === 'BOOST') state = { ...state, pct: msg.pct, mode: msg.mode };
        if (msg.type === 'STOP') state = { ...state, pct: 100, mode: 'normal' };
        if (msg.type === 'SET_LIMITER') state = { ...state, limiter: msg.limiter };
        push();
        return { ok: true };
      },
      connect() {
        const listeners = [];
        setInterval(() => {
          const d = demo();
          const msg = { bands: d?.bands() ?? null, reduction: d?.limiting() ? -3 : 0 };
          listeners.forEach(fn => fn(msg));
        }, 33);
        return {
          onMessage: { addListener: fn => listeners.push(fn) },
          onDisconnect: { addListener() {} },
        };
      },
    },
    tabs: {
      async query() { return [{ id: 1, url: 'https://www.youtube.com/watch' }]; },
      async create({ url }) { window.open(url, '_blank', 'noopener'); },
    },
    storage: {
      local: {
        async get(keys) {
          if (keys === null) return { ...local };
          const out = {};
          [].concat(keys).forEach(k => { if (k in local) out[k] = local[k]; });
          return out;
        },
        async set(obj) { Object.assign(local, obj); },
        async remove(keys) { [].concat(keys).forEach(k => delete local[k]); },
      },
    },
  };
})();
