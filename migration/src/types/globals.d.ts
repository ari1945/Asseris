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
  Figures,
  Fig,
  MaterialityOpts,
  MaterialityResult,
} from '../canon_types';

/** Permukaan AMS_CANON yang dipakai view/konsumen (sebagian diketik,
 *  sisanya dibiarkan terbuka via index signature). */
export interface AmsCanon {
  figuresFromWTB(wtb?: WTB): Figures;
  materiality(opts?: MaterialityOpts): MaterialityResult;
  FIG: Fig;
  [k: string]: unknown;
}

/** Data master (window.AMS) — hanya pos yang dibaca canon diketik. */
export interface AmsData {
  WTB: WTB;
  AJE: AjeRow[];
  [k: string]: unknown;
}

declare global {
  interface Window {
    AMS: AmsData;
    AMS_CANON: AmsCanon;
    BENCHMARKS: Benchmark[];
    amsResetFigures?: () => void;
  }
}

export {};
