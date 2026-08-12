/* ============================================================
   Asseris — SA 540 ¶ · TELAAH RETROSPEKTIF estimasi
   ------------------------------------------------------------
   Modul MURNI. Membandingkan estimasi periode lalu dengan realisasinya.

   Telaah retrospektif adalah bukti bias terkuat yang dimiliki auditor
   (SA 540 ¶32 + SA 240 ¶32b): ia menunjukkan apakah manajemen secara
   BERULANG meleset ke arah yang sama. Sebelum modul ini ia hidup sebagai
   teks bebas — `"CKPN PY understated 42% terhadap realisasi"` — angka
   yang tak dapat dibantah karena tak berasal dari apa pun.

   Kontrak: selisih HANYA muncul bila kedua angka ada. Tanpa keduanya,
   hasilnya `null` dan permukaan wajib berkata "tak dapat dihitung",
   bukan menampilkan persentase yang tampak berwibawa.
   ============================================================ */

import type { PlSign } from './canon_estimates';

export interface Retrospective {
  /** estimasi yang dibuat manajemen pada periode lalu (Rp juta) */
  pyEstimate?: number;
  /** realisasi yang kemudian terjadi (Rp juta) */
  actual?: number;
  /** dari mana realisasi diambil — mis. "penghapusan aktual FY2025 per buku besar" */
  source?: string;
  by?: string;
  at?: string;
}

export type VarianceDirection = 'understated' | 'overstated' | 'accurate';

export interface RetrospectiveVariance {
  /** realisasi − estimasi PY (Rp juta). Positif = estimasi PY terlalu rendah. */
  diff: number;
  /** |diff| terhadap REALISASI, desimal (0,42 = 42%) */
  pct: number;
  direction: VarianceDirection;
  /** apakah meleset ke arah yang MENGUNTUNGKAN laba periode lalu */
  favouredProfit: boolean;
}

/** Ambang selisih yang dianggap layak diperhatikan sebagai indikator bias. */
export const RETRO_MATERIAL_PCT = 0.10;

function num(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Selisih telaah retrospektif. `null` bila salah satu angka belum ada, atau
 * realisasi nol (persentase tak terdefinisi) — pemanggil WAJIB menyatakan
 * "tak dapat dihitung", bukan menampilkan 0%.
 */
export function retrospectiveVariance(r?: Retrospective | null, plSign: PlSign = -1): RetrospectiveVariance | null {
  if (!r || !num(r.pyEstimate) || !num(r.actual)) return null;
  if (r.actual === 0) return null;
  const diff = r.actual - r.pyEstimate;
  const pct = Math.abs(diff) / Math.abs(r.actual);
  const direction: VarianceDirection = diff > 0 ? 'understated' : diff < 0 ? 'overstated' : 'accurate';
  /* estimasi beban/penyisihan (plSign −1) yang TERLALU RENDAH menaikkan laba PY */
  const sign: PlSign = plSign === 1 ? 1 : -1;
  const favouredProfit = diff !== 0 && (sign === -1 ? diff > 0 : diff < 0);
  return { diff, pct, direction, favouredProfit };
}

export interface RetroBearer {
  id: string;
  name: string;
  plSign?: PlSign;
  retrospective?: Retrospective | null;
}

export interface RetroRow {
  id: string;
  name: string;
  retro: Retrospective | null;
  variance: RetrospectiveVariance | null;
  /** true bila selisihnya melewati ambang DAN menguntungkan laba — indikator ¶32 */
  flagged: boolean;
}

export function retrospectiveRows(list: RetroBearer[] | null | undefined): RetroRow[] {
  return (list || []).map(e => {
    const retro = (e && e.retrospective) || null;
    const variance = retrospectiveVariance(retro, e ? e.plSign : undefined);
    return {
      id: e.id, name: e.name, retro, variance,
      flagged: !!variance && variance.favouredProfit && variance.pct >= RETRO_MATERIAL_PCT,
    };
  });
}

export interface RetroSummary {
  rows: RetroRow[];
  /** estimasi yang selisihnya belum dapat dihitung (data PY/realisasi belum ada) */
  incomputable: RetroRow[];
  flagged: RetroRow[];
  /** pola berulang: ≥2 estimasi meleset ke arah yang menguntungkan laba (¶32) */
  systematic: boolean;
}

export function retrospectiveSummary(list: RetroBearer[] | null | undefined): RetroSummary {
  const rows = retrospectiveRows(list);
  const flagged = rows.filter(r => r.flagged);
  return {
    rows,
    incomputable: rows.filter(r => !r.variance),
    flagged,
    systematic: flagged.length >= 2,
  };
}
