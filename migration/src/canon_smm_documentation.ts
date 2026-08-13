/* ============================================================
   Asseris — Dokumentasi SMM 1 ¶57–60 & SMM 2 ¶28–30 · SSOT
   ------------------------------------------------------------
   SMM 1
   ¶57 Dokumentasi harus memadai untuk (a) mendukung pemahaman yang
       konsisten, (b) mendukung implementasi & pengoperasian respons
       yang konsisten, (c) MEMBERIKAN BUKTI atas perancangan,
       pengimplementasian & pengoperasian respons.
   ¶58 Wajib mencakup: (a) identifikasi pemegang tanggung jawab
       tertinggi & operasional; (b) tujuan mutu & risiko mutu;
       (c) deskripsi respons & bagaimana ia merespons risiko;
       (d) pemantauan & remediasi — bukti aktivitas, evaluasi temuan
       & defisiensi beserta akar penyebab, tindakan remedial &
       evaluasinya, serta komunikasinya; (e) BASIS KESIMPULAN ¶54.
   ¶59 Hal-hal ¶58 yang terkait ketentuan/jasa jaringan, dan evaluasi
       ¶49(b).
   ¶60 KAP MENETAPKAN periode retensi dokumentasi sistem manajemen
       mutu — atau lebih lama bila diharuskan peraturan.

   SMM 2
   ¶28 KAP mengharuskan penelaah bertanggung jawab atas dokumentasi
       penelaahan mutu perikatan.
   ¶29 Dokumentasi itu disertakan dengan dokumentasi perikatan.
   ¶30 Penelaah menentukan bahwa dokumentasinya cukup bagi praktisi
       berpengalaman yang tak punya hubungan sebelumnya untuk memahami
       sifat, saat & luas prosedur — DAN mencakup:
       (a) nama penelaah DAN individu yang membantu;
       (b) identifikasi dokumentasi perikatan yang DITELAAH;
       (c) dasar penentuan penelaah sesuai ¶27;
       (d) pemberitahuan yang diperlukan sesuai ¶26 dan ¶27;
       (e) tanggal penyelesaian penelaahan.

   ------------------------------------------------------------
   CACAT YANG DITUTUP

   Registri EQR hanya menyimpan `clearedBy` + `clearedDate`. Tiga dari
   lima butir ¶30 tidak punya tempat sama sekali: nama pembantu
   penelaah (a), identifikasi dokumentasi perikatan yang ditelaah (b),
   dan pemberitahuan ¶26/¶27 (d). Dokumentasi yang tak memuat apa yang
   ditelaah tidak memungkinkan praktisi lain memahami luas prosedur —
   justru tujuan ¶30.

   ¶60 juga tak pernah ditetapkan: aplikasi menyebut "retensi 10 tahun
   (SMM 1)" — mengatribusikan angka kepada standar yang justru
   menyerahkan periodenya kepada KAP, dan mencampuradukkan dokumentasi
   PERIKATAN dengan dokumentasi SISTEM MANAJEMEN MUTU.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

/* ------------------------------------------------------------
   SMM 2 ¶30 — dokumentasi penelaahan mutu perikatan
   ------------------------------------------------------------ */

export type EqrDocDefect =
  | 'no-reviewer-name'        // ¶30(a)
  | 'assistants-not-named'    // ¶30(a)
  | 'no-documents-reviewed'   // ¶30(b)
  | 'no-completion-basis'     // ¶30(c)
  | 'no-notification-26'      // ¶30(d) — pemberitahuan kekhawatiran ¶26
  | 'no-notification-27'      // ¶30(d) — pemberitahuan penyelesaian ¶27
  | 'no-completion-date';     // ¶30(e)

export const EQR_DOC_DEFECT_LABEL: Record<EqrDocDefect, string> = {
  'no-reviewer-name': 'Nama penelaah mutu perikatan belum tercatat (¶30(a))',
  'assistants-not-named': 'Individu yang membantu penelaahan belum disebutkan namanya (¶30(a))',
  'no-documents-reviewed': 'Dokumentasi perikatan yang ditelaah belum diidentifikasi (¶30(b))',
  'no-completion-basis': 'Dasar penentuan bahwa penelaahan telah selesai belum tercatat (¶30(c))',
  'no-notification-26': 'Pemberitahuan kekhawatiran kepada rekan perikatan belum tercatat (¶26 · ¶30(d))',
  'no-notification-27': 'Pemberitahuan penyelesaian kepada rekan perikatan belum tercatat (¶27 · ¶30(d))',
  'no-completion-date': 'Tanggal penyelesaian penelaahan belum tercatat (¶30(e))',
};

export interface EqrDocumentation {
  readonly reviewer?: string | null;
  /** ¶30(a) — nama individu yang membantu. Array kosong = tidak ada pembantu. */
  readonly assistants?: readonly string[] | null;
  /** Apakah penelaahan memang dibantu individu lain. */
  readonly assisted?: boolean | null;
  /** ¶30(b) — identifikasi dokumentasi perikatan yang ditelaah. */
  readonly documentsReviewed?: readonly string[] | null;
  /** ¶30(c) — dasar penentuan ¶27. */
  readonly completionBasis?: string | null;
  /** ¶30(d) — pemberitahuan ¶26; null bila tak ada kekhawatiran yang diangkat. */
  readonly concernsRaised?: boolean | null;
  readonly notifiedConcerns?: string | null;
  /** ¶30(d) — pemberitahuan ¶27 kepada rekan perikatan. */
  readonly notifiedCompletion?: string | null;
  /** ¶30(e) */
  readonly completionDate?: string | null;
}

export interface EqrDocAudit {
  readonly defects: readonly EqrDocDefect[];
  readonly complete: boolean;
}

/**
 * Kelengkapan dokumentasi ¶30(a)–(e).
 *
 * Dinilai HANYA untuk penelaahan yang sudah ditutup: ¶30 berbicara
 * tentang dokumentasi penelaahan yang telah diselesaikan.
 */
export function auditEqrDocumentation(d: EqrDocumentation | null | undefined): EqrDocAudit {
  const x = d || {};
  const defects: EqrDocDefect[] = [];

  if (!(x.reviewer || '').trim()) defects.push('no-reviewer-name');

  /* ¶30(a) menuntut nama PEMBANTU bila penelaahan dibantu. Tidak dibantu
     adalah keadaan sah — yang tidak sah adalah "dibantu" tanpa nama. */
  if (x.assisted === true && (x.assistants || []).length === 0) defects.push('assistants-not-named');

  if ((x.documentsReviewed || []).length === 0) defects.push('no-documents-reviewed');
  if (!(x.completionBasis || '').trim()) defects.push('no-completion-basis');

  /* ¶26 hanya menghasilkan pemberitahuan bila ADA kekhawatiran. */
  if (x.concernsRaised === true && !(x.notifiedConcerns || '').trim()) defects.push('no-notification-26');

  if (!(x.notifiedCompletion || '').trim()) defects.push('no-notification-27');
  if (!(x.completionDate || '').trim()) defects.push('no-completion-date');

  return { defects, complete: defects.length === 0 };
}

/* ------------------------------------------------------------
   SMM 1 ¶57–59 — kelengkapan dokumentasi sistem manajemen mutu
   ------------------------------------------------------------ */

export type SmmDocElement =
  | 'responsibility-holders'  // ¶58(a)
  | 'objectives-and-risks'    // ¶58(b)
  | 'responses'               // ¶58(c)
  | 'monitoring-evidence'     // ¶58(d)(i)
  | 'findings-and-deficiencies' // ¶58(d)(ii)
  | 'remedial-actions'        // ¶58(d)(iii)
  | 'monitoring-communication'// ¶58(d)(iv)
  | 'conclusion-basis'        // ¶58(e)
  | 'network-matters';        // ¶59

export const SMM_DOC_ELEMENT_LABEL: Record<SmmDocElement, string> = {
  'responsibility-holders': 'Identifikasi pemegang tanggung jawab tertinggi & operasional (¶58(a))',
  'objectives-and-risks': 'Tujuan mutu & risiko mutu KAP (¶58(b))',
  'responses': 'Deskripsi respons dan bagaimana ia merespons risiko mutu (¶58(c))',
  'monitoring-evidence': 'Bukti aktivitas pemantauan yang dilaksanakan (¶58(d)(i))',
  'findings-and-deficiencies': 'Evaluasi temuan, defisiensi & akar penyebabnya (¶58(d)(ii))',
  'remedial-actions': 'Tindakan remedial dan evaluasi rancangan/implementasinya (¶58(d)(iii))',
  'monitoring-communication': 'Komunikasi mengenai pemantauan & remediasi (¶58(d)(iv))',
  'conclusion-basis': 'Basis kesimpulan yang dicapai berdasarkan ¶54 (¶58(e))',
  'network-matters': 'Hal ¶58 terkait ketentuan/jasa jaringan & evaluasi ¶49(b) (¶59)',
};

/** Seluruh elemen ¶58; `network-matters` hanya bila KAP bagian jaringan. */
export const SMM_DOC_ELEMENTS: readonly SmmDocElement[] = [
  'responsibility-holders', 'objectives-and-risks', 'responses',
  'monitoring-evidence', 'findings-and-deficiencies', 'remedial-actions',
  'monitoring-communication', 'conclusion-basis', 'network-matters',
];

export interface SmmDocCoverage {
  readonly present: readonly SmmDocElement[];
  readonly missing: readonly SmmDocElement[];
  readonly complete: boolean;
}

/**
 * Kelengkapan dokumentasi ¶58 (+ ¶59 bila berjaringan).
 *
 * `present` disuplai pemanggil dari keberadaan artefak nyata di modul —
 * bukan dari daftar centang manual, agar ¶57(c) ("MEMBERIKAN BUKTI")
 * tidak berubah menjadi pernyataan tentang bukti.
 */
export function smmDocCoverage(
  present: readonly SmmDocElement[] | null | undefined,
  inNetwork: boolean,
): SmmDocCoverage {
  const required = SMM_DOC_ELEMENTS.filter((e) => e !== 'network-matters' || inNetwork);
  const have = new Set(present || []);
  const got = required.filter((e) => have.has(e));
  const missing = required.filter((e) => !have.has(e));
  return { present: got, missing, complete: missing.length === 0 };
}

/* ------------------------------------------------------------
   SMM 1 ¶60 — periode retensi dokumentasi SISTEM MANAJEMEN MUTU
   ------------------------------------------------------------ */

export type RetentionDefect = 'not-established' | 'below-regulatory-minimum';

export const RETENTION_DEFECT_LABEL: Record<RetentionDefect, string> = {
  'not-established': 'Periode retensi dokumentasi sistem manajemen mutu belum ditetapkan (¶60)',
  'below-regulatory-minimum': 'Periode retensi yang ditetapkan lebih pendek dari minimum peraturan (¶60)',
};

export interface RetentionPolicy {
  /** Tahun yang DITETAPKAN KAP. ¶60 tidak menetapkan angka — KAP yang menetapkan. */
  readonly years?: number | null;
  /** Minimum yang diharuskan peraturan, bila ada. */
  readonly regulatoryMinimumYears?: number | null;
}

export interface RetentionAudit {
  readonly defects: readonly RetentionDefect[];
  readonly compliant: boolean;
  readonly years: number | null;
}

/**
 * Kepatuhan ¶60.
 *
 * CATATAN PENTING: ini retensi dokumentasi SISTEM MANAJEMEN MUTU —
 * BUKAN dokumentasi perikatan/kertas kerja, yang tunduk pada rezim
 * berbeda (SA 230 & peraturan akuntan publik). Mencampur keduanya
 * adalah kekeliruan yang sudah ada di aplikasi ("retensi 10 tahun
 * (SMM 1)"), dan ¶60 tidak menetapkan angka apa pun.
 */
export function auditRetention(p: RetentionPolicy | null | undefined): RetentionAudit {
  const years = p && typeof p.years === 'number' && p.years > 0 ? p.years : null;
  const defects: RetentionDefect[] = [];
  if (years === null) defects.push('not-established');
  else {
    const min = p && typeof p.regulatoryMinimumYears === 'number' ? p.regulatoryMinimumYears : null;
    if (min !== null && years < min) defects.push('below-regulatory-minimum');
  }
  return { defects, compliant: defects.length === 0, years };
}
