/* ============================================================
   Asseris — Cakupan populasi SMM 2 (EQR) · SUMBER KEBENARAN TUNGGAL
   ------------------------------------------------------------
   PR-6 (PRD Kesiapan Pemeriksaan P2PK): SMM 2 harus punya POPULASI,
   bukan sekadar daftar penelaahan yang kebetulan terisi. Sebelumnya
   modul EQR hanya menghitung baris `eqrReviews.v2` — perikatan PIE
   yang BELUM punya baris EQR sama sekali tak terlihat, sehingga
   "0 dari 1 wajib" tampak seperti "semua beres".

   `eqrCoverage` menghitung cakupan dari POPULASI perikatan vs
   registri penelaahan: berapa perikatan PIE wajib, berapa yang
   sudah direviu, dan — penting — mana yang BELUM (uncovered).

   Murni & deterministik — tanpa React, efek-samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

/** Bentuk minimal baris perikatan. */
export interface CoverageEngagement {
  id: string;
  clientId?: string | null;
}

/** Bentuk minimal baris registri EQR (`eqrReviews.v2`). */
export interface CoverageReviewRow {
  eng?: string | null;
}

/** Hasil cakupan populasi SMM 2. */
export interface EqrCoverage {
  /** Seluruh perikatan dalam populasi (perikatan audit aktif). */
  total: number;
  /** Perikatan wajib EQR (klien PIE / tercatat). */
  pieTotal: number;
  /** Perikatan yang punya ≥1 baris penelaahan terdaftar. */
  reviewed: number;
  /** Perikatan PIE yang sudah punya ≥1 baris penelaahan. */
  pieReviewed: number;
  /** Perikatan PIE TANPA satu pun baris penelaahan — inti yang dulu tak terlihat. */
  pieUncovered: Array<{ id: string; clientId?: string | null }>;
}

/**
 * Cakupan penelaahan mutu perikatan terhadap populasi.
 *
 * @param engagements  populasi perikatan audit aktif (AMS.ENGAGEMENTS).
 * @param reviews      registri penelaahan seluruh firma (`eqrReviews.v2`).
 * @param pieEngIds    id perikatan yang WAJIB EQR (klien PIE — `client.listed`,
 *                     konsisten dengan `engMeta(engId).pie` di canon_eqr_gate).
 */
export function eqrCoverage(
  engagements: readonly CoverageEngagement[] | null | undefined,
  reviews: readonly CoverageReviewRow[] | null | undefined,
  pieEngIds: ReadonlySet<string>,
): EqrCoverage {
  const engs = engagements || [];
  const rows = reviews || [];
  const reviewedIds = new Set(rows.map((r) => r.eng).filter((e): e is string => !!e));
  const reviewed = engs.filter((e) => reviewedIds.has(e.id)).length;
  const pie = engs.filter((e) => pieEngIds.has(e.id));
  const pieReviewed = pie.filter((e) => reviewedIds.has(e.id)).length;
  const pieUncovered = pie.filter((e) => !reviewedIds.has(e.id));
  return {
    total: engs.length,
    pieTotal: pie.length,
    reviewed,
    pieReviewed,
    pieUncovered,
  };
}
