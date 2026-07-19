/* ============================================================
   Asseris — Model Penilaian Berbobot Bersama (SSOT)
   Penerimaan (SA 220 / SA 300) & Keberlanjutan (ISQM 1 ¶33–34 / SA 220).

   Matematika skor tunggal yang dipakai KEDUA sisi: skor berbobot faktor
   (Σ s·w / Σ w) + verdict ambang. Murni, deterministik, bebas-any.
   `obAccScore`/`obAccVerdict` (penerimaan) di-refactor memakai ini —
   perilaku IDENTIK (jaga registri/angka akseptasi tak bergeser).
   Set faktor spesifik-domain (bobot/label) tetap di lapisan data
   (mis. ACC_FACTORS penerimaan, faktor keberlanjutan) — bukan di sini.
   ============================================================ */

export type AssessmentKind = 'acceptance' | 'continuance';

export interface AssessmentFactor {
  /** label faktor */
  k: string;
  /** bobot (Σ bobot per set = 100, tapi tak diwajibkan di sini) */
  w: number;
  /** skor 1..5 */
  s: number;
  /** catatan/justifikasi penilai */
  note?: string;
}

export type VerdictColor = 'green' | 'amber' | 'red';

export interface AssessmentVerdict {
  /** warna/tingkat: green=terima/lanjut, amber=bersyarat, red=tolak/tidak-lanjut */
  k: VerdictColor;
  /** label lokalisasi sesuai jenis penilaian */
  l: string;
}

/* Ambang verdict IDENTIK di kedua sisi (≥4 hijau · ≥3 amber · <3 merah).
   Hanya label yang berbeda per jenis. */
const VERDICT_LABELS: Record<AssessmentKind, Record<VerdictColor, string>> = {
  acceptance: { green: 'Terima', amber: 'Terima dengan Syarat', red: 'Tolak' },
  continuance: { green: 'Lanjut', amber: 'Lanjut dengan Syarat', red: 'Tidak Dilanjutkan' },
};

/**
 * Skor berbobot faktor: `Σ(s·w) / Σ(w)`, rentang 0..5.
 * Guard `|| 1` pada total bobot (set kosong / Σw=0 → 0) — IDENTIK legacy `obAccScore`.
 */
export function weightedScore(factors: AssessmentFactor[] | null | undefined): number {
  const f = factors || [];
  const tw = f.reduce((sum, x) => sum + x.w, 0) || 1;
  return f.reduce((sum, x) => sum + x.s * x.w, 0) / tw;
}

/**
 * Verdict dari skor. `kind` menentukan label (default `acceptance`).
 * Ambang: ≥4 → green · ≥3 → amber · else red. IDENTIK legacy `obAccVerdict`
 * untuk `acceptance` (green=Terima / amber=Terima dengan Syarat / red=Tolak).
 */
export function verdict(score: number, kind: AssessmentKind = 'acceptance'): AssessmentVerdict {
  const color: VerdictColor = score >= 4 ? 'green' : score >= 3 ? 'amber' : 'red';
  return { k: color, l: VERDICT_LABELS[kind][color] };
}
