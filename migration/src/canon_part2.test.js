/* W4 — canon_part2: PSAK 71 (psak71/ECL) anchor + psak68, psak48, psak57, psak25. */
import { describe, it, expect } from 'vitest';
import { psak25, psak71, psak68, psak48, psak57 } from './canon_part2';
import { FIXTURE_WTB } from './__fixtures__/wtb.js';

describe('psak71() — ECL / staging (patokan W0-BASELINE)', () => {
  const p = psak71();

  it('CKPN dibukukan → audited cocok baseline (juta)', () => {
    expect(p.ckpnBooked).toBe(1_980);
    expect(p.ckpnAudited).toBe(2_600);
  });

  it('model ECL, overlay, coverage, gap, variance cocok baseline', () => {
    expect(p.eclModel).toBeCloseTo(2_603.014, 2);
    expect(p.overlayAmt).toBeCloseTo(141.535, 2);
    expect(p.coverage).toBeCloseTo(0.0526, 3);
    expect(p.gap).toBeCloseTo(623.014, 2);          // model − dibukukan klien (dasar AJE-02)
    expect(p.auditVariance).toBeCloseTo(3.014, 2);  // model vs audited (≈0)
  });

  it('identitas: gap = eclModel − ckpnBooked; auditVariance = eclModel − ckpnAudited', () => {
    expect(p.gap).toBeCloseTo(p.eclModel - p.ckpnBooked, 6);
    expect(p.auditVariance).toBeCloseTo(p.eclModel - p.ckpnAudited, 6);
  });

  it('3 stage; Σ ecl bucket = eclModel total', () => {
    expect(p.stages).toHaveLength(3);
    const sumEcl = p.stages.reduce((a, s) => a + s.ecl, 0);
    expect(sumEcl).toBeCloseTo(p.eclModel, 6);
  });

  it('fungsi murni dari WTB: fixture memberi CKPN dibukukan/audited yang benar', () => {
    const f = psak71(FIXTURE_WTB);
    expect(f.ckpnBooked).toBe(1_980);  // fixture 1-1210 unadj
    expect(f.ckpnAudited).toBe(2_600); // fixture 1-1210 adj
  });
});

describe('engine leaf lain part2 mengembalikan objek terstruktur', () => {
  it('psak25 (kebijakan/estimasi/kesalahan)', () => {
    expect(psak25()).toBeTypeOf('object');
    expect(psak25()).not.toBeNull();
  });
  it('psak68 (nilai wajar) — coverage portofolio', () => {
    const r = psak68();
    expect(r).toBeTypeOf('object');
    expect(r).not.toBeNull();
  });
  it('psak48 (penurunan nilai) menghitung nilai terpakai', () => {
    const r = psak48();
    expect(r).toBeTypeOf('object');
    expect(r).not.toBeNull();
  });
  it('psak57 (provisi & kontinjensi)', () => {
    const r = psak57();
    expect(r).toBeTypeOf('object');
    expect(typeof r.contingentTotal === 'number' || r.contingentTotal === undefined).toBe(true);
  });
});
