/* ============================================================
   NeoSuite AMS — selektor kanon ber-tipe (W5)
   ------------------------------------------------------------
   Lapisan tipis & ber-tipe di atas lapisan kanon. View (JSX)
   memanggil selektor ini agar tipe WTB/Figures/Fig/Materiality
   mengalir ke modul halaman tanpa mengubah angka — nilai identik
   dengan AMS_CANON.* (sumber yang sama). Tujuan W5:
   "tipe WTB/FIG dipakai ≥3 view" dengan boundary yang type-checked.
   ============================================================ */
import { figuresFromWTB, FIG } from './canon_base';
import { materiality } from './canon_part4';
import type { WTB, Figures, Fig, MaterialityOpts, MaterialityResult } from './canon_types';

/** Figur akuntansi entitas (Rp juta) yang ditarik dari WTB. `wtb` opsional:
 *  bila diberi (mis. useAudit().wtb yang reaktif) → angka mengikuti AJE live. */
export function figures(wtb?: WTB): Figures {
  return figuresFromWTB(wtb);
}

/** Saldo akhir kanonik tiap pos (Rp juta) — figur ber-sumber WTB + fiskal. */
export function fig(): Fig {
  return FIG;
}

/** Materialitas (OM/PM/CTT) lintas-modul, identik dengan Materiality Workspace. */
export function materialityFor(opts?: MaterialityOpts): MaterialityResult {
  return materiality(opts);
}

export type { WTB, Figures, Fig, MaterialityResult };
