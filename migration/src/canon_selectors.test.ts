/* ============================================================
   P2 — typed canon selectors (canon_selectors.ts) + branch edges.
   ------------------------------------------------------------
   canon_selectors is the typed boundary every view calls (figures/fig/
   materialityFor/goingConcernFor). It was at 0% coverage, yet a null-guard bug
   here propagates to every page. These tests pin the delegation AND drive the
   underlying engines through their uncovered edges: empty/zero/code-less WTB
   (null-guards, zero-division), the Altman safe/distress zones (default data is
   grey), and the no-benchmark materiality path.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { figures, fig, materialityFor, goingConcernFor } from './canon_selectors';
import type { WTB } from './canon_selectors';
import { FIXTURE_WTB, FIXTURE_FIGURES } from './__fixtures__/wtb';

// Crafted "healthy" balance: strong working capital, equity ≫ liabilities, fat
// margins → Altman z well above 2.99 (safe). ly omitted → prior period is all
// zeros → its ratios exercise safeDiv(·,0)=0 and altman→z=0→distress.
const r = (code: string, adj: number) => ({ code, name: code, ly: 0, unadj: adj, aje: 0, adj });
const SAFE_ROWS: Array<Record<string, unknown>> = [
  r('1-1200', 800_000_000_000),   // current assets
  r('1-1300', 100_000_000_000),   // inventory (also current)
  r('1-2100', 200_000_000_000),   // non-current assets
  r('2-1100', -100_000_000_000),  // current liabilities (negative convention)
  r('2-2200', -50_000_000_000),   // non-current liabilities
  r('3-1000', -700_000_000_000),  // equity
  r('3-2100', -300_000_000_000),  // retained earnings
  r('4-1100', -1_200_000_000_000),// sales
  r('5-1100', 600_000_000_000),   // COGS
  r('5-2100', 50_000_000_000),    // selling
  r('5-3100', 50_000_000_000),    // admin
  r('5-4100', 20_000_000_000),    // interest
  r('5-5100', 30_000_000_000),    // tax
  { name: 'tanpa kode', ly: 0, unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 }, // no `code` → ignored by sumByPrefix
];
const SAFE_WTB = SAFE_ROWS as unknown as WTB;

describe('figures()/fig() — accounting figures from WTB', () => {
  it('default (AMS.WTB) returns a populated figure object without throwing', () => {
    const f = figures();
    expect(f).toBeTruthy();
    expect(typeof f.ppeNetCarry).toBe('number');
  });
  it('is a pure function of the WTB it is handed (matches the hand-computed fixture)', () => {
    const f = figures(FIXTURE_WTB as unknown as WTB);
    expect(f.ppeNetCarry).toBe(FIXTURE_FIGURES.ppeNetCarry);   // 30_000
    expect(f.leaseLiab).toBe(FIXTURE_FIGURES.leaseLiab);       // 12_800
    expect(f.dboBooked).toBe(FIXTURE_FIGURES.dboBooked);       // 13_080
  });
  it('empty WTB is null-guarded → falls back to AMS.WTB (never a throw, never NaN)', () => {
    expect(() => figures([])).not.toThrow();
    // figuresFromWTB uses the srcWtb fallback (empty → AMS.WTB singleton), so an
    // empty hand-off yields the default figures rather than crashing or zeroing.
    expect(figures([])).toEqual(figures());
    expect(Number.isFinite(figures([]).ppeNetCarry)).toBe(true);
  });
  it('fig() returns the canonical FIG object', () => {
    expect(fig()).toBeTruthy();
  });
});

describe('materialityFor() — SA 320 single source', () => {
  it('with the pinned PBT benchmark resolves OM/PM/CTT (live calc)', () => {
    const m = materialityFor();
    expect(m.omFull).not.toBeNull();
    expect(m.calcOM).not.toBeNull();
    expect(m.applied).toBe(false);
  });
  it('engagement materiality overrides the benchmark calc when no workspace override', () => {
    const m = materialityFor({ engMateriality: 7_000_000_000 });
    expect(m.omFull).toBe(7_000_000_000);
    expect(m.pmFull).toBe(Math.round(7_000_000_000 * m.pmPct / 100));
  });
  it('no benchmark table → OM/PM/CTT collapse to null (no crash)', () => {
    const g = globalThis as { BENCHMARKS?: unknown };
    const saved = g.BENCHMARKS;
    g.BENCHMARKS = [];
    try {
      const m = materialityFor();
      expect(m.calcOM).toBeNull();
      expect(m.omFull).toBeNull();
      expect(m.om).toBeNull();
      expect(m.benchValue).toBeNull();
    } finally {
      g.BENCHMARKS = saved;
    }
  });
});

describe('goingConcernFor() — SA 570, drives Altman zone edges', () => {
  it('default WTB stays in the grey zone (≈2.69) and is deterministic', () => {
    const a = goingConcernFor();
    expect(a.altman.zone).toBe('grey');
    expect(goingConcernFor().altman.z).toBeCloseTo(a.altman.z, 6);
  });
  it('healthy crafted WTB → SAFE zone; zero prior period → DISTRESS zone', () => {
    const g = goingConcernFor(SAFE_WTB);
    expect(g.altman.zone).toBe('safe');
    expect(g.altman.z).toBeGreaterThan(2.99);
    expect(g.altmanPy.zone).toBe('distress'); // ly all zero → z=0
    // safeDiv(·,0) guard: prior-period ratios resolve to 0, not NaN/Infinity
    expect(Number.isFinite(g.py.currentRatio)).toBe(true);
    expect(g.py.currentRatio).toBe(0);
  });
  it('the code-less row is ignored by prefix aggregation (not summed into assets)', () => {
    const g = goingConcernFor(SAFE_WTB);
    // currentAssets = 800k + 100k juta only; the 5_000M code-less row must not appear
    expect(g.cy.currentAssets).toBeCloseTo(900_000, 0);
  });
  it('empty WTB falls back without throwing', () => {
    expect(() => goingConcernFor([])).not.toThrow();
  });
});
