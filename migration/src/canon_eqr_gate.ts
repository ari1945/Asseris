/* ============================================================
   Asseris — Gerbang Penelaahan Mutu Perikatan (EQR)
   SMM 2 / SMM 2 · SA 220.36 — SUMBER KEBENARAN TUNGGAL.
   ------------------------------------------------------------
   Aturan gerbang semula terbelah dua: `eqrStatusFor` (wp_signoff)
   memutuskan "ada/lolos", lalu `view_opinion_parts` menambahkan
   kewajiban PIE lewat `eqrRequired || gate.applicable`.

   Pembelahan itu melahirkan cacat FAIL-OPEN. Cabang "tak ada baris
   EQR" mengembalikan `{applicable:false, cleared:true}`, sehingga:

       eqrEnforced        = eqrRequired || false      // true  (PIE)
       eqrSubstantiveDone = !eqrEnforced || cleared   // true  ← LOLOS

   Artinya perikatan PIE yang belum punya SATU PUN baris EQR
   melewati gerbang — persis pada kasus di mana EQR paling wajib.
   Ketiadaan bukti diperlakukan sebagai bukti kepatuhan.

   Modul ini menyatukan aturannya dan membalik defaultnya menjadi
   GAGAL-TERTUTUP: wajib tanpa baris = TIDAK lolos, dengan alasan
   yang dapat ditampilkan (`reason`) agar pengguna tahu mengapa.

   Murni & deterministik — tanpa React, efek-samping, localStorage,
   atau pembacaan `window`. Adapter yang menyuplai datanya hidup di
   `wp_signoff.tsx`.
   ============================================================ */

/** Satu baris registri EQR (`eqrReviews.v2`). Bentuk minimal yang digerbang. */
export interface EqrReviewRow {
  eng?: string | null;
  cleared?: boolean | null;
}

/** Mengapa gerbang berada pada keadaannya — dipakai UI & jejak server. */
export type EqrGateReason =
  | 'no-engagement'   // tak ada perikatan aktif — tak ada yang digerbang
  | 'not-required'    // non-PIE tanpa baris EQR — EQR opsional sesuai kebijakan firma
  | 'missing-review'  // WAJIB tapi tak ada baris EQR sama sekali  ← dulu lolos diam-diam
  | 'open-review'     // ada baris EQR yang belum lolos gerbang
  | 'cleared';        // seluruh baris EQR lolos

export interface EqrGate {
  /** Gerbang ini mengikat penerbitan opini & transisi arsip. */
  applicable: boolean;
  /** Gerbang terpenuhi. Untuk `missing-review` SELALU false. */
  cleared: boolean;
  count: number;
  clearedCount: number;
  reason: EqrGateReason;
}

/** Kalimat siap-tampil per alasan (UI Bahasa Indonesia). */
export const EQR_GATE_LABEL: Record<EqrGateReason, string> = {
  'no-engagement': 'Tidak ada perikatan aktif.',
  'not-required': 'Klien non-PIE — EQR opsional sesuai kebijakan firma.',
  'missing-review': 'Klien tercatat (PIE) — EQR wajib, tetapi belum ada penelaahan yang terdaftar.',
  'open-review': 'Penelaahan mutu perikatan belum lolos gerbang.',
  'cleared': 'Penelaahan mutu perikatan lolos gerbang.',
};

/**
 * Keadaan gerbang EQR untuk satu perikatan.
 *
 * @param engId    perikatan yang dinilai; falsy → tak ada yang digerbang
 * @param reviews  registri EQR (seluruh firma; disaring di sini)
 * @param required EQR wajib untuk perikatan ini (PIE / kebijakan firma).
 *                 SSOT: `engMeta(engId).pie` — sama dengan `client.listed`.
 */
export function eqrGateFor(
  engId: string | null | undefined,
  reviews: readonly EqrReviewRow[] | null | undefined,
  required: boolean,
): EqrGate {
  if (!engId) {
    return { applicable: false, cleared: true, count: 0, clearedCount: 0, reason: 'no-engagement' };
  }

  const list = (reviews || []).filter((r): r is EqrReviewRow => !!r && r.eng === engId);
  const count = list.length;

  if (count === 0) {
    /* GAGAL-TERTUTUP. Sebelumnya kedua cabang mengembalikan `cleared:true`;
       untuk perikatan wajib itu berarti gerbang terbuka tanpa satu pun
       penelaahan pernah ada. */
    return required
      ? { applicable: true, cleared: false, count: 0, clearedCount: 0, reason: 'missing-review' }
      : { applicable: false, cleared: true, count: 0, clearedCount: 0, reason: 'not-required' };
  }

  const clearedCount = list.filter((r) => !!r.cleared).length;
  const cleared = clearedCount === count;
  return {
    applicable: true,
    cleared,
    count,
    clearedCount,
    reason: cleared ? 'cleared' : 'open-review',
  };
}

/** Rincian pendek untuk kriteria gerbang fase (mis. "1/2 EQR lolos gerbang"). */
export function eqrGateDetail(gate: EqrGate): string {
  if (gate.reason === 'missing-review') return 'Belum ada penelaahan EQR terdaftar (wajib PIE)';
  return `${gate.clearedCount}/${gate.count} EQR lolos gerbang`;
}
