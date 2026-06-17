/* ============================================================
   W4 — Regression net over the whole AMS_CANON surface.
   Calls every engine function (zero-arg / optional-WTB form), deep-
   normalizes the result (numbers rounded to 3 dp, object keys sorted,
   NaN/±Inf stringified) and snapshots it. Any shift in a canonical
   figure — from a W2/W3/W6 refactor or otherwise — fails the snapshot.
   Update intentionally with `npm run test -- -u` only after verifying
   the change against an audit-confirmed example.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS_CANON } from './canon';

// Engines that legitimately require explicit arguments — exercised by the
// dedicated module tests, not by the zero-arg sweep.
const NEEDS_ARGS = new Set(['leaseCalc', 'valueInUse']);

const norm = (v, depth = 0) => {
  if (v === null || v === undefined) return v;
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) return String(v);        // NaN, Infinity
    return Math.round(v * 1000) / 1000;
  }
  if (typeof v === 'function') return '[fn]';
  if (depth > 6) return '[deep]';
  if (Array.isArray(v)) return v.map(x => norm(x, depth + 1));
  if (typeof v === 'object') {
    const out = {};
    for (const k of Object.keys(v).sort()) out[k] = norm(v[k], depth + 1);
    return out;
  }
  return v;
};

describe('AMS_CANON — fingerprint regresi', () => {
  const fnKeys = Object.keys(AMS_CANON)
    .filter(k => typeof AMS_CANON[k] === 'function' && !NEEDS_ARGS.has(k))
    .sort();

  it('mencakup banyak engine (sanity)', () => {
    expect(fnKeys.length).toBeGreaterThanOrEqual(15);
  });

  it('fingerprint seluruh engine stabil terhadap baseline (snapshot)', () => {
    const fp = {};
    for (const k of fnKeys) {
      try {
        fp[k] = norm(AMS_CANON[k]());
      } catch (e) {
        fp[k] = { __error: e && e.message ? e.message : String(e) };
      }
    }
    expect(fp).toMatchSnapshot();
  });

  it('tidak ada engine yang melempar saat dipanggil tanpa argumen', () => {
    const threw = fnKeys.filter(k => {
      try { AMS_CANON[k](); return false; } catch { return true; }
    });
    expect(threw).toEqual([]);
  });
});
