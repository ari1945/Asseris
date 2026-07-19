/* ============================================================
   Asseris — Penilaian Risiko Perikatan Tahun Pertama / Saldo Awal (SA 510)

   Mesin murni & deterministik: penilaian berbobot atas risiko saldo awal &
   keandalan auditor pendahulu (perikatan tahun pertama), memakai model skor
   bersama (assessment_model). Juga meter kesiapan langkah komunikasi auditor
   pendahulu (SA 510 ¶6). Tidak ada angka hardcode di luar template bobot.
   ============================================================ */

import { weightedScore, verdict, type AssessmentFactor, type AssessmentVerdict } from './assessment_model';

/* Faktor risiko tahun-pertama (Σ bobot = 100). Skor 1–5 diisi auditor;
   over[] memungkinkan seed/override per-indeks. */
export function OB_RISK_FACTORS(over: Record<number, Partial<AssessmentFactor>> = {}): AssessmentFactor[] {
  return [
    { k: 'Keandalan & kompetensi auditor pendahulu', w: 20, s: 3, note: '', ...over[0] },
    { k: 'Akses & izin telaah KKP auditor pendahulu (SA 510 ¶6)', w: 20, s: 3, note: '', ...over[1] },
    { k: 'Opini & temuan pembuka (modifikasi tahun lalu)', w: 15, s: 3, note: '', ...over[2] },
    { k: 'Konsistensi kebijakan akuntansi antar-periode', w: 15, s: 3, note: '', ...over[3] },
    { k: 'Kompleksitas transisi/penyajian kembali saldo awal', w: 15, s: 3, note: '', ...over[4] },
    { k: 'Sengketa / keterbatasan ruang lingkup atas saldo awal', w: 15, s: 3, note: '', ...over[5] },
  ];
}

export function openingScore(factors: AssessmentFactor[]): number {
  return weightedScore(factors);
}

export function openingVerdict(score: number): AssessmentVerdict {
  return verdict(score, 'opening');
}

/* ---- Kesiapan komunikasi auditor pendahulu (SA 510 ¶6) ---- */

export interface PredecessorStep {
  id: string;
  label: string;
}

/* Langkah wajib komunikasi/telaah auditor pendahulu — perikatan tahun pertama. */
export const PREDECESSOR_STEPS: PredecessorStep[] = [
  { id: 'consent', label: 'Peroleh izin klien untuk berkomunikasi & mengakses KKP auditor pendahulu' },
  { id: 'review', label: 'Telaah KKP auditor pendahulu atas saldo akun signifikan & area pertimbangan' },
  { id: 'competence', label: 'Evaluasi kompetensi & independensi auditor pendahulu' },
  { id: 'inquiry', label: 'Inquiry alasan pergantian auditor & isu signifikan yang belum terselesaikan' },
];

export interface PredecessorReadiness {
  done: number;
  total: number;
  pct: number;
  ready: boolean;
}

/** Ringkas kesiapan dari peta status langkah (id → selesai?). */
export function predecessorReadiness(steps: Record<string, boolean>): PredecessorReadiness {
  const total = PREDECESSOR_STEPS.length;
  const done = PREDECESSOR_STEPS.filter((s) => !!steps[s.id]).length;
  return { done, total, pct: total ? Math.round((done / total) * 100) : 0, ready: done === total };
}
