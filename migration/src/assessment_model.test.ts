/* ============================================================
   Model penilaian berbobot bersama — jaring regresi.
   Mengunci matematika skor & ambang verdict yang dipakai KEDUA sisi
   (penerimaan & keberlanjutan). Terutama: kesetaraan dengan legacy
   `obAccScore`/`obAccVerdict` agar refactor penerimaan nol-regresi.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { weightedScore, verdict, type AssessmentFactor } from './assessment_model';

/* set faktor penerimaan default (ACC_FACTORS, semua s=3) — Σw=100 */
const ACC_DEFAULT: AssessmentFactor[] = [
  { k: 'Integritas & Reputasi Manajemen', w: 25, s: 3 },
  { k: 'Independensi & Konflik Kepentingan', w: 20, s: 3 },
  { k: 'Kompetensi, Waktu & Kapasitas Tim', w: 20, s: 3 },
  { k: 'Risiko Perikatan & Industri', w: 25, s: 3 },
  { k: 'Etika & Proporsionalitas Imbalan', w: 10, s: 3 },
];

/* replika formula legacy obAccScore untuk uji kesetaraan */
function legacyScore(factors: AssessmentFactor[]): number {
  const f = factors || [];
  const tw = f.reduce((s, x) => s + x.w, 0) || 1;
  return f.reduce((s, x) => s + x.s * x.w, 0) / tw;
}

describe('weightedScore', () => {
  it('semua faktor s=3 → skor 3.0', () => {
    expect(weightedScore(ACC_DEFAULT)).toBe(3);
  });

  it('rata-rata BERBOBOT, bukan rata-rata sederhana', () => {
    // s: 5 pada bobot 25, sisanya 1 → (5·25 + 1·75)/100 = 2.0
    const f: AssessmentFactor[] = [
      { k: 'a', w: 25, s: 5 }, { k: 'b', w: 20, s: 1 }, { k: 'c', w: 20, s: 1 },
      { k: 'd', w: 25, s: 1 }, { k: 'e', w: 10, s: 1 },
    ];
    expect(weightedScore(f)).toBe(2);
    // rata-rata sederhana akan 1.8 → pastikan bukan itu
    expect(weightedScore(f)).not.toBe(1.8);
  });

  it('set kosong / null / undefined → 0 (guard Σw||1)', () => {
    expect(weightedScore([])).toBe(0);
    expect(weightedScore(null)).toBe(0);
    expect(weightedScore(undefined)).toBe(0);
  });

  it('SETARA dengan formula legacy obAccScore', () => {
    const samples: AssessmentFactor[][] = [
      ACC_DEFAULT,
      [{ k: 'a', w: 25, s: 4 }, { k: 'b', w: 20, s: 5 }, { k: 'c', w: 20, s: 3 }, { k: 'd', w: 25, s: 3 }, { k: 'e', w: 10, s: 4 }],
      [{ k: 'a', w: 20, s: 2 }, { k: 'b', w: 25, s: 1 }, { k: 'c', w: 20, s: 4 }, { k: 'd', w: 15, s: 4 }, { k: 'e', w: 10, s: 3 }, { k: 'f', w: 10, s: 3 }],
    ];
    for (const s of samples) expect(weightedScore(s)).toBe(legacyScore(s));
  });
});

describe('verdict — ambang identik, label per-jenis', () => {
  it('penerimaan (default): ≥4 Terima · ≥3 Terima dengan Syarat · <3 Tolak', () => {
    expect(verdict(4.2)).toEqual({ k: 'green', l: 'Terima' });
    expect(verdict(4)).toEqual({ k: 'green', l: 'Terima' });
    expect(verdict(3.5)).toEqual({ k: 'amber', l: 'Terima dengan Syarat' });
    expect(verdict(3)).toEqual({ k: 'amber', l: 'Terima dengan Syarat' });
    expect(verdict(2.99)).toEqual({ k: 'red', l: 'Tolak' });
  });

  it('penerimaan eksplisit sama dengan default', () => {
    expect(verdict(3.5, 'acceptance')).toEqual(verdict(3.5));
  });

  it('keberlanjutan: ≥4 Lanjut · ≥3 Lanjut dengan Syarat · <3 Tidak Dilanjutkan', () => {
    expect(verdict(4, 'continuance')).toEqual({ k: 'green', l: 'Lanjut' });
    expect(verdict(3, 'continuance')).toEqual({ k: 'amber', l: 'Lanjut dengan Syarat' });
    expect(verdict(2, 'continuance')).toEqual({ k: 'red', l: 'Tidak Dilanjutkan' });
  });

  it('saldo awal (SA 510): ≥4 Andal · ≥3 Prosedur Tambahan · <3 Risiko Tinggi', () => {
    expect(verdict(4, 'opening')).toEqual({ k: 'green', l: 'Saldo Awal Andal' });
    expect(verdict(3, 'opening')).toEqual({ k: 'amber', l: 'Perlu Prosedur Tambahan' });
    expect(verdict(2, 'opening')).toEqual({ k: 'red', l: 'Risiko Tinggi — Potensi Modifikasi' });
  });

  it('warna verdict (k) identik lintas-jenis pada skor sama', () => {
    for (const sc of [4.5, 3.2, 1.1]) {
      expect(verdict(sc, 'acceptance').k).toBe(verdict(sc, 'continuance').k);
      expect(verdict(sc, 'acceptance').k).toBe(verdict(sc, 'opening').k);
    }
  });
});
