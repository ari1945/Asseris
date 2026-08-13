/* ============================================================
   Asseris — Rujukan Paragraf SMM 1 & SMM 2 (IAPI) · SSOT
   ------------------------------------------------------------
   Standar Manajemen Mutu (SMM) 1 & 2 diterbitkan IAPI, disahkan
   18-09-2024, berlaku efektif 31 Desember 2025. SMM 1 MENGGANTIKAN
   SPM 1 ("Standar Pengendalian Mutu 1"). ISQM 1/2 adalah standar
   IAASB yang menjadi acuan penyusunan SMM — BUKAN standar yang
   mengikat KAP Indonesia.

   Sebelum modul ini, rujukan paragraf tersebar sebagai string bebas
   di data & JSX, dan 7 dari 8 komponen salah rujuk (mis. Ketentuan
   Etika ditulis "¶31–32" padahal ¶29; Pelaksanaan Perikatan ditulis
   "¶35–36" padahal ¶31). Tidak ada yang bisa menangkapnya karena
   tidak ada sumber kebenaran untuk dibandingkan.

   Modul ini menjadi sumber itu. Murni & deterministik — tanpa React,
   efek samping, localStorage, atau pembacaan `window`.

   CATATAN HAK CIPTA: SMM 1 & SMM 2 dilindungi UU 28/2014. Judul di
   bawah adalah penanda seksi yang diringkas secara fungsional untuk
   navigasi — bukan salinan teks standar.
   ============================================================ */

/** Nomor paragraf tunggal (`28`) atau rentang inklusif (`[35, 47]`). */
export type SmmParaSpan = number | readonly [number, number];

export interface SmmSection {
  /** Penanda seksi (ringkas-fungsional, bukan kutipan standar). */
  readonly title: string;
  readonly para: SmmParaSpan;
}

/* ------------------------------------------------------------
   SMM 1 — Manajemen Mutu Bagi KAP
   ------------------------------------------------------------ */

export const SMM1_SECTIONS = {
  applyComply:      { title: 'Menerapkan & Mematuhi Ketentuan yang Relevan', para: [17, 18] },
  system:           { title: 'Sistem Manajemen Mutu',                        para: 19 },
  responsibilities: { title: 'Tanggung Jawab',                               para: [20, 22] },
  riskProcess:      { title: 'Proses Penilaian Risiko KAP',                  para: [23, 27] },
  governance:       { title: 'Tata Kelola dan Kepemimpinan',                 para: 28 },
  ethics:           { title: 'Ketentuan Etika yang Relevan',                 para: 29 },
  acceptance:       { title: 'Penerimaan dan Keberlanjutan',                 para: 30 },
  performance:      { title: 'Pelaksanaan Perikatan',                        para: 31 },
  resources:        { title: 'Sumber Daya',                                  para: 32 },
  infoComm:         { title: 'Informasi dan Komunikasi',                     para: 33 },
  specificResponses:{ title: 'Respons Spesifik',                             para: 34 },
  monitoring:       { title: 'Proses Pemantauan dan Remediasi',              para: [35, 47] },
  network:          { title: 'Ketentuan Jaringan atau Jasa Jaringan',        para: [48, 52] },
  evaluation:       { title: 'Mengevaluasi Sistem Manajemen Mutu',           para: [53, 56] },
  documentation:    { title: 'Dokumentasi',                                  para: [57, 60] },
} as const satisfies Record<string, SmmSection>;

export type Smm1SectionKey = keyof typeof SMM1_SECTIONS;

/* ------------------------------------------------------------
   SMM 2 — Penelaahan Mutu Perikatan
   ------------------------------------------------------------ */

export const SMM2_SECTIONS = {
  applyComply:       { title: 'Menerapkan & Mematuhi Ketentuan yang Relevan',   para: [14, 16] },
  appointment:       { title: 'Penugasan Tanggung Jawab atas Penunjukan',       para: 17 },
  eligibility:       { title: 'Kriteria Eligibilitas Penelaah Mutu Perikatan',  para: 18 },
  coolingOff:        { title: 'Periode Jeda Setelah Menjabat Rekan Perikatan',  para: 19 },
  assistantElig:     { title: 'Eligibilitas Individu yang Membantu Penelaah',   para: 20 },
  reviewerDuties:    { title: 'Tanggung Jawab Penelaah atas Pelaksanaan',       para: 21 },
  eligibilityLapse:  { title: 'Penurunan Eligibilitas Penelaah',                para: [22, 23] },
  performancePolicy: { title: 'Kebijakan Pelaksanaan Penelaahan',               para: 24 },
  procedures:        { title: 'Prosedur Penelaahan Mutu Perikatan',             para: 25 },
  concerns:          { title: 'Pemberitahuan Kekhawatiran Penelaah',            para: 26 },
  completion:        { title: 'Penyelesaian Penelaahan Mutu Perikatan',         para: 27 },
  documentation:     { title: 'Dokumentasi',                                    para: [28, 30] },
} as const satisfies Record<string, SmmSection>;

export type Smm2SectionKey = keyof typeof SMM2_SECTIONS;

/* ------------------------------------------------------------
   Komponen sistem manajemen mutu → paragraf SMM 1
   ------------------------------------------------------------
   SMM 1 menetapkan ENAM komponen (¶28–33) ditambah DUA proses
   (penilaian risiko ¶23–27 · pemantauan & remediasi ¶35–47).
   `QM_COMPONENTS` memodelkan kedelapannya sebagai C1–C8; peta di
   bawah mengikat tiap kode ke seksi SMM 1 yang benar.
   ------------------------------------------------------------ */

export const SMM1_COMPONENT_SECTION = {
  C1: 'governance',
  C2: 'riskProcess',
  C3: 'ethics',
  C4: 'acceptance',
  C5: 'performance',
  C6: 'resources',
  C7: 'infoComm',
  C8: 'monitoring',
} as const satisfies Record<string, Smm1SectionKey>;

export type SmmComponentCode = keyof typeof SMM1_COMPONENT_SECTION;

/** Enam komponen sesungguhnya (¶28–33) — di luar kedua proses. */
export const SMM1_SIX_COMPONENTS: readonly SmmComponentCode[] = ['C1', 'C3', 'C4', 'C5', 'C6', 'C7'];

/* ------------------------------------------------------------
   Pemformatan
   ------------------------------------------------------------ */

/** `28` → `'¶28'` · `[35,47]` → `'¶35–47'` (en dash, konvensi repo). */
export function paraLabel(para: SmmParaSpan): string {
  return typeof para === 'number' ? `¶${para}` : `¶${para[0]}–${para[1]}`;
}

/** Rujukan siap-tampil untuk seksi SMM 1, mis. `'SMM 1 ¶35–47'`. */
export function smm1Ref(key: Smm1SectionKey): string {
  return `SMM 1 ${paraLabel(SMM1_SECTIONS[key].para)}`;
}

/** Rujukan siap-tampil untuk seksi SMM 2, mis. `'SMM 2 ¶18'`. */
export function smm2Ref(key: Smm2SectionKey): string {
  return `SMM 2 ${paraLabel(SMM2_SECTIONS[key].para)}`;
}

/**
 * Label paragraf untuk kode komponen — dipakai `QM_COMPONENTS[].ref`
 * agar nilainya DITURUNKAN, bukan ditulis tangan (SSOT).
 */
export function componentParaLabel(code: SmmComponentCode): string {
  return paraLabel(SMM1_SECTIONS[SMM1_COMPONENT_SECTION[code]].para);
}

/** Apakah nomor paragraf tercakup oleh span. Dipakai uji & gerbang. */
export function paraCovers(para: SmmParaSpan, n: number): boolean {
  return typeof para === 'number' ? para === n : n >= para[0] && n <= para[1];
}
