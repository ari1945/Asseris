/* ============================================================
   W4 — Vitest setup for the canon "number engines".
   ------------------------------------------------------------
   The canon modules are buildless-era IIFE descendants: they read
   `window.AMS.WTB` (the SSOT trial balance) and publish to
   `window.AMS_CANON`. `canon_base.js` even computes SRC/FIG at LOAD
   time from `window.AMS.WTB`, so the global must exist *before* canon
   is imported.

   NOTE: imports here are DYNAMIC on purpose. Static `import` is hoisted
   above the stub assignments below, so `data.js`'s `window.AMS = {…}`
   would run before `window` exists and crash. Sequential awaits also
   guarantee data.js (sets window.AMS) loads before canon.js (reads it).
   ============================================================ */

// 1) Minimal browser globals the engines touch (no jsdom dependency).
globalThis.window = globalThis;

globalThis.localStorage = {
  _s: {},
  getItem(k) { return Object.prototype.hasOwnProperty.call(this._s, k) ? this._s[k] : null; },
  setItem(k, v) { this._s[k] = String(v); },
  removeItem(k) { delete this._s[k]; },
  clear() { this._s = {}; },
};

// materiality() reads window.BENCHMARKS (published by view_materiality.jsx in
// the live app). Pin the audit-verified PBT benchmark so the engine resolves
// the same OM/PM/CTT the running app does (see W0-BASELINE.md).
globalThis.BENCHMARKS = [
  { id: 'pbt', label: 'Laba Sebelum Pajak', value: 85_200_000_000, lo: 5, hi: 10, def: 5 },
];

// 2) Load order matters: data → canon → forensic.
await import('../data.js');           // sets window.AMS (incl. WTB)
await import('../canon.js');          // sets window.AMS_CANON (reads window.AMS at load)
await import('../forensic_canon.js'); // sets window.AMS_FORENSIC
