/* ============================================================
   Asseris — SA 500 ¶8 / SA 620 · evaluasi pekerjaan pakar
   ------------------------------------------------------------
   Modul MURNI. Satu bentuk & satu daftar langkah untuk SELURUH
   permukaan yang mengaku "mengevaluasi pakar":
     · PSAK 68 — penilai KJPP (V-2) & pakar valuasi derivatif (V-3)
     · SA 540  — estimasi ber-jalur respons 'Gunakan pakar (SA 620)'

   Sebelum modul ini keduanya menampilkan empat centang hijau yang
   DIPAKU sebagai literal: kompetensi, objektivitas, ruang lingkup,
   kewajaran temuan. Tidak ada dokumen yang dituntut, tidak ada isian
   yang tersimpan, dan tak ada keadaan yang membuatnya merah.

   Kunci persist `expertEval.v1` (engagement-scoped) — kunci pakar
   ('V-2') maupun kunci estimasi ('E-04') hidup di ruang nama yang sama
   karena pertanyaannya identik; yang berbeda hanya objeknya.

   CATATAN LINGKUP: modul ini merekam BAHWA evaluasi dilakukan. Gerbang
   yang menuntut DOKUMEN pakar ber-hash di DMS sebelum sign-off adalah
   PR-5 pada arc yang sama.
   ============================================================ */

export interface ExpertEval {
  /** SA 500 ¶8(a) / SA 620 ¶9 — kompetensi & kapabilitas pakar dievaluasi. */
  competence?: boolean;
  /** SA 500 ¶8(a) / SA 620 ¶9 — objektivitas / independensi pakar dinilai. */
  objectivity?: boolean;
  /** SA 620 ¶10-11 — ruang lingkup, metode & asumsi pakar dipahami. */
  scope?: boolean;
  /** SA 500 ¶8(c) / SA 620 ¶12 — kewajaran temuan pakar dievaluasi. */
  findings?: boolean;
  by?: string;
  at?: string;
}

export type ExpertEvalState = Record<string, ExpertEval>;

export type ExpertEvalStepKey = 'competence' | 'objectivity' | 'scope' | 'findings';

export interface ExpertEvalStep { key: ExpertEvalStepKey; ref: string; t: string }

/** Urutan & teks langkah — dirender UI dari sini, bukan dari literal per-view. */
export const EXPERT_EVAL_STEPS: ExpertEvalStep[] = [
  { key: 'competence',  ref: 'SA 500 ¶8(a)', t: 'Kompetensi & kapabilitas pakar dievaluasi' },
  { key: 'objectivity', ref: 'SA 620 ¶9',    t: 'Objektivitas / independensi pakar dinilai' },
  { key: 'scope',       ref: 'SA 620 ¶10-11', t: 'Ruang lingkup, metode & asumsi pakar dipahami' },
  { key: 'findings',    ref: 'SA 500 ¶8(c)', t: 'Kewajaran temuan pakar dievaluasi' },
];

export function expertEvalComplete(ev?: ExpertEval | null): boolean {
  if (!ev) return false;
  return EXPERT_EVAL_STEPS.every(s => ev[s.key] === true);
}

export function expertEvalDone(ev?: ExpertEval | null): number {
  if (!ev) return 0;
  return EXPERT_EVAL_STEPS.filter(s => ev[s.key] === true).length;
}

/** Rujukan pakar yang BELUM tuntas dievaluasi — dipakai gerbang kesimpulan. */
export function expertEvalMissing(state: ExpertEvalState | null | undefined, refs: string[]): string[] {
  const st = state || {};
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of refs || []) {
    if (!r || seen.has(r)) continue;
    seen.add(r);
    if (!expertEvalComplete(st[r])) out.push(r);
  }
  return out;
}

/** Rujukan pakar unik yang dipakai sekumpulan pos (mis. `psak68().items`). */
export function expertRefsOf(items: Array<{ expert?: string }> | null | undefined): string[] {
  const out: string[] = [];
  for (const it of items || []) {
    const r = it && it.expert;
    if (r && out.indexOf(r) < 0) out.push(r);
  }
  return out;
}
