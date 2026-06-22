/* W4 — canon_base: foundation helpers, lease engine, WTB→figures mapping. */
import { describe, it, expect } from 'vitest';
import {
  RATE, ASOF, jt, WTB_MAP, figuresFromWTB, leaseCalc, leasePortfolio, FIG,
} from './canon_base';
import { FIXTURE_WTB, FIXTURE_FIGURES } from './__fixtures__/wtb';

describe('canon_base — konstanta & helper', () => {
  it('tarif PPh badan = 22% (UU HPP)', () => {
    expect(RATE).toBe(0.22);
  });

  it('tanggal pelaporan = 31 Des 2025', () => {
    expect(ASOF).toEqual({ y: 2025, m: 12 });
  });

  it('jt() menormalkan rupiah penuh → juta (membulatkan)', () => {
    expect(jt(13_080_000_000)).toBe(13_080);
    expect(jt(-1_980_000_000)).toBe(-1_980);
    expect(jt(499_999)).toBe(0);
    expect(jt(undefined)).toBe(0);
  });

  it('WTB_MAP memetakan tiap pos kanonik ke kode + tanda', () => {
    expect(WTB_MAP.dbo).toMatchObject({ code: '2-2300', sign: -1 });
    expect(WTB_MAP.dta).toMatchObject({ code: '1-2500', sign: 1 });
  });
});

describe('canon_base — figuresFromWTB() adalah fungsi murni dari WTB', () => {
  it('memetakan fixture WTB ke figur ber-tanda yang dihitung tangan', () => {
    const f = figuresFromWTB(FIXTURE_WTB);
    expect(f).toMatchObject(FIXTURE_FIGURES);
  });

  it('nilai tercatat neto = bruto + akumulasi (tanda negatif)', () => {
    const f = figuresFromWTB(FIXTURE_WTB);
    expect(f.ppeNetCarry).toBe(f.ppeGross + f.ppeAccum);
    expect(f.intanNetCarry).toBe(f.intanGross + f.intanAccum);
  });
});

describe('canon_base — leaseCalc() amortisasi bunga efektif', () => {
  it('PV anuitas & jadwal menutup ke ~0 di akhir masa', () => {
    const { pv, rows } = leaseCalc(60, 180_000_000, 9.5);
    expect(pv).toBeGreaterThan(0);
    expect(rows).toHaveLength(60);
    expect(rows[rows.length - 1].closing).toBeCloseTo(0, 0);
    // pembayaran = bunga + pokok tiap baris
    const r0 = rows[0];
    expect(r0.interest + r0.principal).toBeCloseTo(r0.pmt, 6);
  });

  it('bunga 0% → PV = pmt × n', () => {
    const { pv } = leaseCalc(12, 1_000_000, 0);
    expect(pv).toBe(12_000_000);
  });
});

describe('canon_base — leasePortfolio() (PSAK 73, patokan W0)', () => {
  const lp = leasePortfolio();

  it('ROU / Liabilitas / Net cocok dengan baseline W0 (rupiah penuh)', () => {
    expect(Math.round(lp.rou)).toBe(11_284_137_787);
    expect(Math.round(lp.liab)).toBe(11_758_354_678);
    expect(Math.round(lp.net)).toBe(474_216_890);
  });

  it('net = liab − rou, dan netJt dalam juta', () => {
    expect(lp.net).toBeCloseTo(lp.liab - lp.rou, 3);
    expect(lp.netJt).toBeCloseTo(lp.net / 1e6, 6);
    expect(lp.perLease).toHaveLength(3);
  });
});

describe('canon_base — FIG (figur kanonik dari WTB live)', () => {
  it('figur ber-sumber WTB cocok dengan baseline (juta)', () => {
    expect(FIG.dbo).toBe(13_080);
    expect(FIG.ckpn).toBe(1_980);
    expect(FIG.ckpnAudited).toBe(2_600);
    expect(FIG.dtaReported).toBe(4_980);
  });

  it('dasar pajak aset tetap = tercatat − beda temporer', () => {
    expect(FIG.ppeBase).toBe(FIG.ppeCarry - FIG.ppeTempDiff);
  });
});
