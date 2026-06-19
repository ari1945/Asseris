/* ============================================================
   NeoSuite AMS — ambient window contract (W5)
   ------------------------------------------------------------
   Sisa kontrak runtime-bus `window` yang masih dibaca lapisan
   kanonik (data master, benchmark, generator LK, forensic).
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

/** Data master (window.AMS) — hanya pos yang dibaca canon diketik. */
export interface AmsData {
  WTB: WTB;
  AJE: AjeRow[];
  [k: string]: unknown;
}

declare global {
  interface Window {
    AMS: AmsData;
    BENCHMARKS: Benchmark[];
    amsResetFigures?: () => void;
  }
}

export {};
