/* SA 540 — uji analisis sensitivitas estimasi (fungsi murni, deterministik).
   Mengunci: impact = Δ% × perPct, akumulasi titik baru, verdict dalam/luar
   rentang auditor, dan jarak pelanggaran (breach). */
import { describe, it, expect } from 'vitest';
import { estimateSensitivity, type SensDriver } from './estimate_sensitivity';

const drivers: SensDriver[] = [
  { id: 'd1', label: 'WACC', deltaPct: 0.5, perPct: -4200 },        // +0,5% → −2.100
  { id: 'd2', label: 'Pertumbuhan terminal', deltaPct: -0.5, perPct: 2800 }, // −0,5% → −1.400
];

describe('estimateSensitivity()', () => {
  it('impact per driver = Δ% × perPct (dibulatkan)', () => {
    const r = estimateSensitivity(5450, 4600, 6300, drivers);
    expect(r.drivers[0].impact).toBe(-2100);
    expect(r.drivers[1].impact).toBe(-1400);
    expect(r.totalImpact).toBe(-3500);
  });

  it('titik baru = titik + total dampak', () => {
    const r = estimateSensitivity(5450, 4600, 6300, drivers);
    expect(r.newPoint).toBe(1950);
  });

  it('keluar rentang → withinRange=false & breach = jarak ke batas bawah', () => {
    const r = estimateSensitivity(5450, 4600, 6300, drivers);
    expect(r.withinRange).toBe(false);
    expect(r.breach).toBe(4600 - 1950);
  });

  it('dalam rentang → withinRange=true & breach=0', () => {
    const r = estimateSensitivity(5450, 1000, 6300, drivers);
    expect(r.withinRange).toBe(true);
    expect(r.breach).toBe(0);
  });

  it('tanpa driver → titik tak berubah', () => {
    const r = estimateSensitivity(4870, 4600, 6300, []);
    expect(r.totalImpact).toBe(0);
    expect(r.newPoint).toBe(4870);
    expect(r.withinRange).toBe(true);
  });
});
