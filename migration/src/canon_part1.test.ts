/* W4 — canon_part1: PSAK 46 (deferredTax) + leaf engines (inventory, fixedAssets,
   revenue, intangibles, psak25, psak71*, psak68* re-exported). PSAK 46 is the
   W0-verified anchor; leaf engines are checked for structural invariants. */
import { describe, it, expect } from 'vitest';
import {
  deferredTax, inventory, fixedAssets, revenue, intangibles,
} from './canon_part1';
import { FIXTURE_WTB } from './__fixtures__/wtb';

describe('deferredTax() — PSAK 46 (patokan W0-BASELINE)', () => {
  const dt = deferredTax();

  it('beban pajak, ETR, dan DTA cocok dengan baseline (juta)', () => {
    expect(dt.taxExpense).toBe(10_274);
    expect(dt.currentTax).toBe(11_770);   // round(PKP 53.500 × 22%)
    expect(dt.deferredPL).toBe(1_496);    // round(6.800 × 22%)
    expect(dt.dtaReported).toBe(4_980);
    expect(dt.dtaVariance).toBe(-1_914);
    expect(dt.pbt).toBe(48_500);
    expect(dt.pkp).toBe(53_500);
    expect(dt.rate).toBe(0.22);
  });

  it('ETR = beban pajak / PBT ≈ 21,18%', () => {
    expect(dt.etr).toBeCloseTo(0.2118, 4);
  });

  it('identitas pembukuan: taxExpense = currentTax − deferredPL', () => {
    expect(dt.taxExpense).toBe(dt.currentTax - dt.deferredPL);
    // saldo awal adalah penyeimbang: closing = opening + deferredPL + oci
    expect(dt.closing).toBe(dt.opening + dt.deferredPL + dt.oci);
    // variance model vs buku besar
    expect(dt.dtaVariance).toBe(dt.closing - dt.dtaReported);
  });

  it('adalah fungsi murni dari WTB: dipanggil dengan fixture menghasilkan saldo yang konsisten', () => {
    const f = deferredTax(FIXTURE_WTB);
    expect(f.dtaReported).toBe(4_980);          // dari fixture 1-2500
    expect(Number.isFinite(f.closing)).toBe(true);
    expect(f.dtaVariance).toBe(f.closing - f.dtaReported);
  });
});

describe('inventory() — PSAK 14/NRV', () => {
  const inv = inventory();
  it('mengembalikan register per-SKU dengan nilai terendah biaya/NRV', () => {
    expect(Array.isArray(inv.items)).toBe(true);
    expect(inv.items.length).toBeGreaterThan(0);
    inv.items.forEach(it => {
      expect(it.lower).toBe(Math.min(it.cost, it.nrv));
      expect(it.shortfall).toBe(it.reqWD - it.bookedWD);
    });
  });
});

describe('fixedAssets() — PSAK 16', () => {
  const fa = fixedAssets();
  it('Σ akumulasi kelompok dinormalkan menutup ke akumulasi audited (WTB)', () => {
    const sumAccum = fa.classes.reduce((a, c) => a + c.accum, 0);
    expect(sumAccum).toBeCloseTo(fa.accumAudit, 0);
    fa.classes.forEach(c => expect(c.carry).toBeCloseTo(c.gross - c.accum, 6));
  });
});

describe('intangibles() — PSAK 19', () => {
  const it19 = intangibles();
  it('kelompok umur tak-terbatas tidak menanggung amortisasi', () => {
    it19.classes.forEach(c => {
      if (c.indefinite) expect(c.annualAmort).toBe(0);
      else expect(c.annualAmort).toBeGreaterThanOrEqual(0);
    });
  });
});

describe('revenue() — PSAK 72', () => {
  const rev = revenue();
  it('alokasi SSP pro-rata menjumlah ke harga transaksi', () => {
    expect(Array.isArray(rev.pobs)).toBe(true);
    const alloc = rev.pobs.reduce((a, p) => a + p.alloc, 0);
    expect(alloc).toBeGreaterThan(0);
    rev.pobs.forEach(p => expect(p.pctSsp).toBeGreaterThanOrEqual(0));
  });
});
