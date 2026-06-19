/* ============================================================
   W4 — Vitest setup for the canon "number engines".
   ------------------------------------------------------------
   The canon modules read the trial balance from the `AMS` ESM singleton
   (`export const AMS` di data.js). Both `AMS` and `AMS_CANON` are now plain
   ESM exports (legacy-track slices 10/10z stripped the `AMS_CANON` then the
   `AMS` window writes); the regression test imports `AMS_CANON` directly, and canon
   reads `AMS.WTB` lazily at first FIG access via its own `import { AMS }`.

   NOTE: imports here are DYNAMIC on purpose so `globalThis.window` (and the
   BENCHMARKS stub below) are set before any engine module evaluates.
   Sequential awaits also keep data.js loading before canon.js. Neither
   module touches `window` for AMS anymore — the data flows through ESM.
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
await import('../data.js');           // evaluates the AMS ESM export (incl. WTB)
await import('../canon');          // ESM AMS_CANON export (reads AMS via import, lazily at call)
await import('../forensic_canon'); // pure-ESM (AMS_FORENSIC export; no window write)
