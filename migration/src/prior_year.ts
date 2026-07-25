/* ============================================================
   Asseris — PR-4c · Saldo audited TA-1 sebagai sumber INDEPENDEN (SA 510)
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`).

   MASALAH yang ditutup: penelusuran saldo awal (`OBTrace` di modul `opening`) menyajikan
   kolom "Saldo Akhir TA-1 (Audited)" vs "Saldo Awal TA Kini" lalu menyimpulkan "Cocok"
   untuk setiap akun — padahal KEDUA kolom dibaca dari sumber yang sama (`r.ly`), kecuali
   segelintir akun transisi PSAK 73 yang di-hardcode. Selisihnya nol SECARA KONSTRUKSI:
   kertas kerja itu tak membuktikan apa pun. Label "TA Lalu (audited)" di WTB sama tak
   berdasarnya — apa pun yang di-paste klien menjadi basis seluruh analitis.

   SA 510 ¶6 menuntut bukti bahwa saldo awal tidak mengandung salah saji material dan
   dibawa dengan benar dari periode sebelumnya. Itu mensyaratkan pembanding di LUAR TB
   berjalan. Modul ini menyediakan tie-out terhadap sumber tersebut.
   ============================================================ */

export interface PriorYearRow {
  code: string;
  name?: string;
  /** saldo akhir audited TA-1 (Rp penuh, Dr + / Cr −) */
  amount: number;
}

export interface PriorYearSource {
  rows: PriorYearRow[];
  /** jejak asal (bentuk sama dgn ImportProvenance PR-2b) */
  provenance?: unknown;
}

export type TieStatus =
  | 'tied'        // saldo awal = saldo akhir audited TA-1
  | 'untied'      // ada sumber, tapi berbeda → SELISIH yang harus dijelaskan
  | 'missing'     // akun ada di TB berjalan, tak ada di sumber TA-1 (akun baru?)
  | 'orphan'      // akun ada di sumber TA-1, hilang dari TB berjalan
  | 'no-source';  // belum ada sumber TA-1 sama sekali

export interface TieRow {
  code: string;
  name: string;
  /** saldo akhir audited TA-1 dari sumber independen (null bila tak ada) */
  priorClose: number | null;
  /** saldo awal yang dibawa TB berjalan (kolom `ly`) */
  opening: number;
  diff: number;
  status: TieStatus;
}

export interface TieResult {
  rows: TieRow[];
  hasSource: boolean;
  tied: number;
  untied: number;
  missing: number;
  orphan: number;
  /** Σ |selisih| atas akun yang tak tie */
  totalDiff: number;
}

export interface TieRowInput { code: string; name?: string; ly?: number }

/**
 * Tie-out saldo awal TB berjalan terhadap sumber audited TA-1.
 * `tol` = ambang Rupiah di bawah mana selisih diabaikan (pembulatan penyajian).
 *
 * TANPA sumber, seluruh baris berstatus `no-source` — TIDAK dilaporkan "cocok".
 * Itu inti perbaikannya: ketiadaan bukti bukan bukti kecocokan.
 */
export function tieOutPriorYear(
  current: TieRowInput[],
  source: PriorYearSource | null | undefined,
  tol = 1000,
): TieResult {
  const src = (source && Array.isArray(source.rows)) ? source.rows : null;
  const hasSource = !!(src && src.length);
  const byCode = new Map<string, PriorYearRow>();
  if (src) for (const r of src) byCode.set(r.code, r);

  const rows: TieRow[] = [];
  let tied = 0, untied = 0, missing = 0, orphan = 0, totalDiff = 0;

  for (const r of current) {
    const opening = r.ly || 0;
    if (!hasSource) {
      rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: 0, status: 'no-source' });
      continue;
    }
    const p = byCode.get(r.code);
    if (!p) {
      missing++;
      rows.push({ code: r.code, name: r.name || r.code, priorClose: null, opening, diff: opening, status: 'missing' });
      totalDiff += Math.abs(opening);
      continue;
    }
    const diff = opening - p.amount;
    if (Math.abs(diff) <= tol) {
      tied++;
      rows.push({ code: r.code, name: r.name || p.name || r.code, priorClose: p.amount, opening, diff: 0, status: 'tied' });
    } else {
      untied++;
      totalDiff += Math.abs(diff);
      rows.push({ code: r.code, name: r.name || p.name || r.code, priorClose: p.amount, opening, diff, status: 'untied' });
    }
  }

  /* akun yang ADA di TA-1 tapi hilang dari TB berjalan — saldo awal yang tak terbawa */
  if (hasSource) {
    const currentCodes = new Set(current.map(r => r.code));
    for (const p of src as PriorYearRow[]) {
      if (currentCodes.has(p.code)) continue;
      orphan++;
      totalDiff += Math.abs(p.amount);
      rows.push({ code: p.code, name: p.name || p.code, priorClose: p.amount, opening: 0, diff: -p.amount, status: 'orphan' });
    }
  }

  return { rows, hasSource, tied, untied, missing, orphan, totalDiff };
}

/** Status tie satu akun — dipakai kolom "TA Lalu" di WTB. */
export function tieStatusFor(
  code: string,
  opening: number,
  source: PriorYearSource | null | undefined,
  tol = 1000,
): TieStatus {
  const src = (source && Array.isArray(source.rows)) ? source.rows : null;
  if (!src || !src.length) return 'no-source';
  const p = src.find(r => r.code === code);
  if (!p) return 'missing';
  return Math.abs(opening - p.amount) <= tol ? 'tied' : 'untied';
}

export const TIE_LABEL: Record<TieStatus, string> = {
  tied: 'Cocok dengan TA-1 audited',
  untied: 'SELISIH terhadap TA-1 audited',
  missing: 'Tak ada di TA-1 audited (akun baru?)',
  orphan: 'Ada di TA-1, hilang dari TB berjalan',
  'no-source': 'Belum ada sumber TA-1 audited',
};
