/* ============================================================
   AP/AR Firma — rasio umur piutang & utang (DSO / DPO), murni & dapat diuji.

   Cacat yang dipaku di sini (view_firmgl.tsx:598 sebelum perubahan):

       const FFp = (FIRMFIN && FIRMFIN.pl()) || { revenue: 11_300_000_000,
                     totalExpense: 8_500_000_000, salary: 5_420_000_000 };
       const dso = Math.round(arOutstanding / annualRev * 365);

   Tiga hal salah sekaligus:

   1. Fallback-nya adalah LAPORAN LABA RUGI KARANGAN. Bila basisnya tak tersedia,
      DSO dan DPO tetap tampil — sebagai rasio keuangan firma, tanpa satu pun
      penanda bahwa penyebutnya diketik tangan. Angka yang tidak ada dan angka yang
      salah adalah dua hal berbeda; yang kedua lebih buruk.

   2. `pl()` selalu mengembalikan objek, jadi cabang `||` itu KODE MATI hari ini —
      yang berarti literalnya tak pernah diuji siapa pun dan akan hidup diam-diam
      pada hari pertama `pl()` berubah bentuk.

   3. Pembagiannya tak menjaga penyebut: penyebut nol menghasilkan `Infinity`, dan
      `Math.round(Infinity)` tetap `Infinity` — dirender sebagai "Infinity hr".

   Karena itu: basis yang tak dapat dipakai menghasilkan `null`, dan `null` dirender
   sebagai pernyataan ketidaktersediaan — bukan sebagai angka.
   ============================================================ */

/** Bentuk minimal model laba-rugi firma (`FIRMFIN.pl`) yang dibutuhkan rasio ini. */
export interface PlBasis {
  revenue?: number;
  totalExpense?: number;
  salary?: number;
}

/** Angka yang benar-benar dapat dipakai sebagai penyebut, atau null. */
const penyebut = (v: unknown): number | null =>
  (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null);

/**
 * Basis pendapatan setahun untuk DSO. Null bila laba-rugi tak tersedia atau
 * pendapatannya nol — tak ada fallback ke angka yang diketik tangan.
 */
export function annualRevenue(pl: PlBasis | null | undefined): number | null {
  return pl ? penyebut(pl.revenue) : null;
}

/**
 * Basis pembelian setahun untuk DPO = total beban − beban gaji (beban langsung
 * pengiriman jasa tidak lewat utang usaha). Null bila salah satu komponennya tak
 * tersedia atau selisihnya bukan angka positif.
 */
export function annualPurchases(pl: PlBasis | null | undefined): number | null {
  if (!pl) return null;
  const total = pl.totalExpense, gaji = pl.salary;
  if (typeof total !== 'number' || typeof gaji !== 'number') return null;
  if (!Number.isFinite(total) || !Number.isFinite(gaji)) return null;
  return penyebut(total - gaji);
}

const hari = (outstanding: number, basis: number | null): number | null => {
  if (basis === null) return null;
  if (typeof outstanding !== 'number' || !Number.isFinite(outstanding)) return null;
  return Math.round(outstanding / basis * 365);
};

/** DSO (hari) atau null bila basis laba-rugi tak tersedia. */
export function dsoDays(arOutstanding: number, pl: PlBasis | null | undefined): number | null {
  return hari(arOutstanding, annualRevenue(pl));
}

/** DPO (hari) atau null bila basis laba-rugi tak tersedia. */
export function dpoDays(apOutstanding: number, pl: PlBasis | null | undefined): number | null {
  return hari(apOutstanding, annualPurchases(pl));
}

/**
 * Label rasio untuk layar. `null` MENYATAKAN ketidaktersediaannya dan tidak
 * mengandung satu digit pun — supaya tak ada yang membacanya sebagai nol hari.
 */
export function daysLabel(prefix: string, days: number | null): string {
  return days === null ? prefix + ' tak tersedia' : prefix + ' ' + days + ' hr';
}
