/* ============================================================
   NeoSuite AMS — ambient window contract (W5)
   ------------------------------------------------------------
   Sisa kontrak runtime-bus `window` yang masih dibaca lapisan
   kanonik (benchmark + reset-figures). Data master kini ESM
   (`export const AMS` di data.js, dianotasi via AmsData di bawah).
   Diketik sebagai deklarasi global agar engine .ts hijau di
   `tsc --noEmit` tanpa menyeret seluruh app ke TypeScript.
   Penyempitan/penghapusan `window` adalah arc tersendiri
   (lihat memory neosuite-ams-arc).
   ============================================================ */
import type {
  WTB,
  AjeRow,
  Benchmark,
} from '../canon_types';

/* AMS_CANON kini objek modul ber-ESM (legacy-track slice 10 melucuti
   `window.AMS_CANON`); tipe permukaannya di-infer dari canon.ts, tidak
   lagi dideklarasikan sebagai kontrak window di sini. */

/** Data master (ESM export `AMS` dari data.js) — hanya pos yang dibaca canon diketik.
   Legacy-track slice 10z melucuti tulisan `window` untuk AMS; tipe ini kini menjadi anotasi
   JSDoc `@type` pada `export const AMS` di data.js (lihat data.js). */
export interface AmsData {
  WTB: WTB;
  AJE: AjeRow[];
  /** Format angka lokal id-ID (mis. `fmt(1850, 0)` → "1.850"). Helper universal dipakai ~semua view. */
  fmt: (n: number, decimals?: number) => string;
  /** Format rupiah lokal id-ID (mis. `rp(1.85e9)` → "Rp 1.850.000.000", negatif dlm kurung). */
  rp: (n: number) => string;
  [k: string]: unknown;
}

declare global {
  interface Window {
    BENCHMARKS: Benchmark[];
    amsResetFigures?: () => void;
  }
}

export {};
