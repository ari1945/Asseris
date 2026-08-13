import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { evaluateSmm, isOpen, isSignificant, isPervasive, type SmmDeficiency } from './canon_smm_evaluation';

/* ============================================================
   Mesin ¶54 DI ATAS DATA NYATA (bukan fixture).

   `canon_smm_evaluation.test.ts` menguji mesinnya; berkas ini menguji
   bahwa mesin itu benar-benar terpasang pada register risiko firma,
   dan bahwa penilaian A163/A192 atas defisiensi seed menghasilkan
   kesimpulan yang bisa dipertanggungjawabkan.

   Catatan penting: sebelum PR ini, `QM_EVAL.conclusion` seed berbunyi
   `'reasonable'` (¶54(a)) sementara `QM_EVAL.statement` di baris
   berikutnya justru menarasikan kasus "kecuali untuk" (¶54(b)) —
   angka dan prosa dalam satu objek saling bertentangan. Mesin yang
   diturunkan menyelesaikan pertentangan itu ke arah yang benar.
   ============================================================ */

interface SeedRisk {
  id: string;
  comp?: string;
  deficiency?: {
    sev?: string; status?: string;
    locus?: string; compensatingResponse?: boolean; frequency?: string;
    pervasiveness?: string[]; remediated?: boolean; effectCorrected?: boolean;
  } | null;
}

const RISKS = (AMS as unknown as { SOQM_RISKS: SeedRisk[] }).SOQM_RISKS;

/** Adapter yang sama dengan yang dipakai `SoqmAnnualEval`. */
const toDeficiencies = (): SmmDeficiency[] =>
  RISKS.filter((r) => r.deficiency).map((r) => {
    const d = r.deficiency!;
    return {
      id: r.id,
      component: r.comp ?? null,
      locus: (d.locus ?? null) as SmmDeficiency['locus'],
      compensatingResponse: d.compensatingResponse ?? null,
      frequency: (d.frequency ?? null) as SmmDeficiency['frequency'],
      severity: (d.sev ?? null) as SmmDeficiency['severity'],
      pervasiveness: (d.pervasiveness || []) as SmmDeficiency['pervasiveness'],
      remediated: d.remediated ?? (d.status === 'Selesai'),
      effectCorrected: d.effectCorrected ?? false,
    };
  });

describe('defisiensi seed — penilaian A163 & A192 terekam', () => {
  const defs = toDeficiencies();

  it('terdapat tepat satu defisiensi terdaftar (QR-02)', () => {
    expect(defs.map((d) => d.id)).toEqual(['QR-02']);
  });

  it('QR-02 dinilai dengan faktor A163, bukan hanya keparahan', () => {
    const d = defs[0];
    expect(d.locus).toBe('design');            // akar masalah pada RANCANGAN
    expect(d.compensatingResponse).toBe(false);
    expect(d.frequency).toBe('recurring');
    expect(d.severity).toBe('Sedang');
  });

  it('QR-02 TIDAK dinilai pervasif — dampaknya terbatas', () => {
    /* Penilaian ini boleh berubah bila bukti berkata lain; kalau kelak
       ditambah indikator A192, kesimpulan ¶54 akan turun ke (c) dengan
       sendirinya — itulah gunanya mengikat. */
    expect(isPervasive(defs[0])).toBe(false);
  });

  it('QR-02 tetap SIGNIFIKAN lewat lantai A163 (rancangan tanpa kompensasi)', () => {
    expect(isSignificant(defs[0])).toBe(true);
  });

  it('QR-02 masih TERBUKA — remediasi berjalan, dampak belum dikoreksi', () => {
    expect(isOpen(defs[0])).toBe(true);
  });
});

describe('kesimpulan ¶54 atas data nyata', () => {
  const e = evaluateSmm(toDeficiencies());

  it('menghasilkan ¶54(b) — memadai kecuali untuk defisiensi signifikan tak pervasif', () => {
    expect(e.conclusion).toBe('reasonable-except-for');
    expect(e.paragraph).toBe('¶54(b)');
    expect(e.openSignificant).toEqual(['QR-02']);
    expect(e.openPervasive).toEqual([]);
  });

  it('menyelesaikan pertentangan angka-vs-prosa pada QM_EVAL seed', () => {
    /* `QM_EVAL.statement` seed menarasikan kasus "dengan pengecualian
       defisiensi ... yang tidak berdampak pervasif" — yaitu ¶54(b) —
       sementara `QM_EVAL.conclusion` tertulis 'reasonable' (¶54(a)).
       Mesin yang diturunkan sepakat dengan PROSA-nya. */
    const master = (AMS as unknown as { QM_EVAL: { statement: string } }).QM_EVAL;
    expect(master.statement).toMatch(/pengecualian/i);
    expect(e.conclusion).toBe('reasonable-except-for');
  });

  it('tidak ada carve-out A191 — belum ada defisiensi yang tuntas dua-syarat', () => {
    expect(e.carveOut).toEqual([]);
  });

  it('REGRESI: kesimpulan tidak lagi bergantung pada ID seed yang dihardcode', () => {
    /* Mesin lama menandai pervasif lewat `r.id === 'QR-02' || r.id === 'QR-04'`.
       Mengganti ID tidak boleh mengubah kesimpulan — hanya indikator A192 yang boleh. */
    const renamed = toDeficiencies().map((d) => ({ ...d, id: 'QR-99' }));
    expect(evaluateSmm(renamed).conclusion).toBe('reasonable-except-for');

    const withIndicator = toDeficiencies().map((d) => ({
      ...d, pervasiveness: ['most-engagements'] as const,
    }));
    expect(evaluateSmm(withIndicator).conclusion).toBe('not-reasonable');
  });
});
