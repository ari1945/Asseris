/* ============================================================
   Gerbang Fase Engagement — logika ambang MURNI (Evaluasi isu #3)
   ------------------------------------------------------------
   Mengekstrak kriteria transisi →Finalisasi ke fungsi murni & teruji,
   terpisah dari rendering (.tsx) dan dari `wpState`/window. Konsumen
   (`engagementGate` di wp_signoff.tsx) menyuplai angka kelengkapan yang
   sudah diturunkan dari SSOT (`wpCompletenessFor`) + jumlah catatan
   review prioritas-tinggi terbuka.

   Filosofi soft-gate (P5): kriteria membimbing; penegakan/severity diatur
   pemanggil. Fungsi ini hanya menjawab "apa prasyaratnya & sudah terpenuhi
   atau belum", bukan "boleh lanjut atau tidak".
   ============================================================ */

/* Ambang masuk Finalisasi (keputusan Ari 2026-06-25):
   - kesimpulan auditor (SA 230) tercatat pada ≥80% kertas kerja kunci, DAN
   - tidak ada kertas kerja yang sama sekali belum dimulai (nol bukti & nol
     kesimpulan). */
export const FINALISATION_THRESHOLDS = { minConclusionPct: 80 } as const;

export interface FinalisationGateInput {
  /* persentase kertas kerja kunci yang sudah berkesimpulan (SA 230), 0–100 */
  conclusionPct: number;
  /* jumlah kertas kerja kunci yang nol bukti DAN nol kesimpulan */
  notStarted: number;
  /* jumlah catatan review prioritas-tinggi yang masih terbuka */
  highOpenCount: number;
}

export interface GateCriterion {
  key: string;
  label: string;
  met: boolean;
  detail: string;
  view?: string;
}

/* finalisationGateCriteria — daftar prasyarat →Finalisasi.
   Murni: tak menyentuh React/DOM/window/localStorage. Detail memuat angka
   agar auditor tahu sisa pekerjaan. */
export function finalisationGateCriteria(input: FinalisationGateInput): GateCriterion[] {
  const min = FINALISATION_THRESHOLDS.minConclusionPct;
  const pct = input.conclusionPct;
  const notStarted = input.notStarted;
  const high = input.highOpenCount;
  return [
    {
      key: 'concluded',
      label: `Kesimpulan auditor (SA 230) tercatat pada ≥${min}% kertas kerja`,
      met: pct >= min,
      detail: `${pct}% kertas kerja berkesimpulan (ambang ${min}%)`,
      view: 'wp',
    },
    {
      key: 'allStarted',
      label: 'Tidak ada kertas kerja yang belum dimulai',
      met: notStarted === 0,
      detail: notStarted === 0
        ? 'Seluruh kertas kerja kunci telah dimulai'
        : `${notStarted} kertas kerja belum dimulai (nol bukti & nol kesimpulan)`,
      view: 'wp',
    },
    {
      key: 'noHighNotes',
      label: 'Tidak ada catatan review prioritas tinggi terbuka',
      met: high === 0,
      detail: `${high} catatan prioritas tinggi terbuka`,
      view: 'cockpit',
    },
  ];
}
