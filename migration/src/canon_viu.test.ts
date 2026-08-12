/* TIER B — asumsi nilai pakai dapat dikemudikan auditor.
   Menutup K8 PRD prd-estimasi-terfalsifikasi + kendala R5 (nol perubahan angka
   tanpa override) dan kontrak penolakan (tolak, jangan jepit diam-diam). */
import { describe, it, expect } from 'vitest';
import { sanitizeViuParams, viuIsOverridden, VIU_YEARS_MAX, type ViuParams } from './canon_viu';
import { psak48 } from './canon_part2';

const BASE: ViuParams = { wacc: 0.135, growth: 0.030, terminal: 0.030, years: 5, cf1: 17800 };

describe('sanitizeViuParams — jalur normal', () => {
  it('tanpa override → params identik dengan basis', () => {
    for (const ov of [undefined, null, {}]) {
      const r = sanitizeViuParams(BASE, ov);
      expect(r.params).toEqual(BASE);
      expect(r.overridden).toEqual([]);
      expect(r.issues).toEqual([]);
      expect(r.rejected).toBe(false);
    }
  });

  it('override sah diterapkan & tercatat', () => {
    const r = sanitizeViuParams(BASE, { wacc: 0.145 });
    expect(r.params.wacc).toBe(0.145);
    expect(r.params.cf1).toBe(BASE.cf1);
    expect(r.overridden).toEqual(['wacc']);
    expect(r.rejected).toBe(false);
  });

  it('override ke nilai yang SAMA tidak dihitung sebagai perubahan', () => {
    expect(sanitizeViuParams(BASE, { wacc: 0.135 }).overridden).toEqual([]);
    expect(viuIsOverridden(BASE, { wacc: 0.135 })).toBe(false);
    expect(viuIsOverridden(BASE, { wacc: 0.145 })).toBe(true);
  });

  it('beberapa field sekaligus', () => {
    const r = sanitizeViuParams(BASE, { wacc: 0.15, cf1: 16000, years: 7 });
    expect(r.params).toEqual({ ...BASE, wacc: 0.15, cf1: 16000, years: 7 });
    expect(r.overridden.sort()).toEqual(['cf1', 'wacc', 'years']);
  });

  it('arus kas negatif diizinkan (UPK merugi) — bukan kesalahan input', () => {
    const r = sanitizeViuParams(BASE, { cf1: -500 });
    expect(r.params.cf1).toBe(-500);
    expect(r.rejected).toBe(false);
  });
});

describe('sanitizeViuParams — TOLAK, jangan jepit diam-diam', () => {
  it('bukan angka → ditolak, kembali ke basis, dengan alasan', () => {
    const r = sanitizeViuParams(BASE, { wacc: NaN });
    expect(r.params.wacc).toBe(BASE.wacc);
    expect(r.rejected).toBe(true);
    expect(r.issues[0].field).toBe('wacc');
    expect(r.issues[0].severity).toBe('reject');
  });

  it('persentase di luar −100%..100% ditolak', () => {
    expect(sanitizeViuParams(BASE, { wacc: 1.5 }).params.wacc).toBe(BASE.wacc);
    expect(sanitizeViuParams(BASE, { growth: -1 }).params.growth).toBe(BASE.growth);
  });

  it('periode proyeksi di luar 1..MAX ditolak', () => {
    expect(sanitizeViuParams(BASE, { years: 0 }).params.years).toBe(BASE.years);
    expect(sanitizeViuParams(BASE, { years: VIU_YEARS_MAX + 1 }).params.years).toBe(BASE.years);
    expect(sanitizeViuParams(BASE, { years: 7.6 }).params.years).toBe(8);   // dibulatkan, bukan ditolak
  });

  it('WACC ≤ pertumbuhan terminal → SELURUH override digugurkan', () => {
    // nilai terminal = CF/(wacc − g) tak konvergen; angka apa pun akan menyesatkan
    const r = sanitizeViuParams(BASE, { wacc: 0.02, terminal: 0.03, cf1: 99999 });
    expect(r.params).toEqual(BASE);          // cf1 yang sah pun ikut gugur
    expect(r.overridden).toEqual([]);
    expect(r.rejected).toBe(true);
    expect(r.issues.some(i => i.field === 'model' && i.severity === 'reject')).toBe(true);
  });

  it('WACC tepat sama dengan terminal juga digugurkan', () => {
    expect(sanitizeViuParams(BASE, { wacc: 0.03 }).params).toEqual(BASE);
  });

  it('selisih tipis (< 1 pp) DIPAKAI tetapi diperingatkan', () => {
    const r = sanitizeViuParams(BASE, { wacc: 0.035, terminal: 0.030 });
    expect(r.params.wacc).toBe(0.035);       // diterapkan …
    expect(r.rejected).toBe(false);
    const warn = r.issues.find(i => i.severity === 'warn');
    expect(warn).toBeTruthy();               // … tetapi tak dibiarkan senyap
    expect(warn!.msg).toContain('SA 701');
  });
});

describe('psak48 — integrasi Tier B', () => {
  it('R5 — tanpa override, seluruh angka IDENTIK dengan jalur lama', () => {
    const a = psak48();
    const b = psak48(undefined, undefined, 'reported', null);
    const c = psak48(undefined, undefined, 'reported', {});
    for (const r of [b, c]) {
      expect(r.recoverable).toBe(a.recoverable);
      expect(r.headroom).toBe(a.headroom);
      expect(r.impairLoss).toBe(a.impairLoss);
      expect(r.params).toEqual(a.params);
    }
    expect(a.viuOverridden).toEqual([]);
    expect(a.viuRejected).toBe(false);
  });

  it('menaikkan WACC 13,5% → 14,5% MEMBALIK kesimpulan penurunan nilai', () => {
    const base = psak48();
    const hi = psak48(undefined, undefined, 'reported', { wacc: 0.145 });

    expect(base.headroom).toBeGreaterThan(0);
    expect(base.impairLoss).toBe(0);          // tidak ada penurunan nilai …

    expect(hi.recoverable).toBeLessThan(base.recoverable);
    expect(hi.headroom).toBeLessThan(0);
    expect(hi.impairLoss).toBeGreaterThan(0); // … menjadi ADA
    expect(hi.viuOverridden).toEqual(['wacc']);
  });

  it('override yang ditolak tidak menggerakkan satu angka pun', () => {
    const base = psak48();
    const bad = psak48(undefined, undefined, 'reported', { wacc: 0.01, terminal: 0.05 });
    expect(bad.recoverable).toBe(base.recoverable);
    expect(bad.headroom).toBe(base.headroom);
    expect(bad.viuRejected).toBe(true);
    expect(bad.viuIssues.length).toBeGreaterThan(0);
  });

  it('basis asumsi tetap dapat dibaca terpisah dari yang berlaku', () => {
    const r = psak48(undefined, undefined, 'reported', { wacc: 0.145 });
    expect(r.paramsBase.wacc).toBe(0.135);
    expect(r.params.wacc).toBe(0.145);
  });

  it('sensitivitas ikut bergerak mengikuti asumsi yang berlaku', () => {
    const base = psak48();
    const hi = psak48(undefined, undefined, 'reported', { wacc: 0.145 });
    expect(hi.sens[0].rec).not.toBe(base.sens[0].rec);
    expect(hi.sens).toHaveLength(base.sens.length);
  });
});
