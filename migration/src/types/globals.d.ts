/* ============================================================
   Asseris — ambient window contract (W5)
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
import type {
  FirmInfo,
  UserInfo,
  ClientRow,
  EngagementRow,
  RiskRow,
  TeamMember,
  WorkpaperRow,
  ActivityItem,
  DeadlineRow,
  ReviewNote,
  TimeEntry,
  PipelineOpp,
  InvoiceRow,
  StaffRow,
} from '../ams_types';

/* AMS_CANON kini objek modul ber-ESM (legacy-track slice 10 melucuti
   `window.AMS_CANON`); tipe permukaannya di-infer dari canon.ts, tidak
   lagi dideklarasikan sebagai kontrak window di sini. */

/** Data master (ESM export `AMS` dari data.js) — hanya pos yang dibaca canon diketik.
   Legacy-track slice 10z melucuti tulisan `window` untuk AMS; tipe ini kini menjadi anotasi
   JSDoc `@type` pada `export const AMS` di data.js (lihat data.js). */
export interface AmsData {
  /* Entitas inti (core-6 + koleksi bernilai-tinggi) — W15 model nyata.
     Sisa ~60 koleksi belum dimodelkan → lolos via index signature di bawah. */
  FIRM: FirmInfo;
  USER: UserInfo;
  CLIENTS: ClientRow[];
  ENGAGEMENTS: EngagementRow[];
  WTB: WTB;
  AJE: AjeRow[];
  RISKS: RiskRow[];
  TEAM: TeamMember[];
  WORKPAPERS: WorkpaperRow[];
  ACTIVITY: ActivityItem[];
  DEADLINES: DeadlineRow[];
  REVIEW_NOTES: ReviewNote[];
  TIME_ENTRIES: TimeEntry[];
  PIPELINE: PipelineOpp[];
  INVOICES: InvoiceRow[];
  STAFF: StaffRow[];
  /** Format angka lokal id-ID (mis. `fmt(1850, 0)` → "1.850"). Helper universal dipakai ~semua view. */
  fmt: (n: number, decimals?: number) => string;
  /** Format rupiah lokal id-ID (mis. `rp(1.85e9)` → "Rp 1.850.000.000", negatif dlm kurung). */
  rp: (n: number, decimals?: number) => string;
  /** Ekor koleksi yang belum dimodelkan (W15+ akan mempersempit). */
  [k: string]: unknown;
}


declare global {
  interface Window {
    BENCHMARKS: Benchmark[];
    amsResetFigures?: () => void;
    /* Imperative runtime-bus + legacy persist/data globals yang sengaja
       dipertahankan (lihat CLAUDE.md §4 & memory neosuite-ams-window-strip).
       Diketik longgar (do-once) agar konsumen view .tsx tak perlu cast. */
    compliancePct?: (stdId: string) => any;
    __amsOpenSA?: (data: any) => void;
    loadLS?: (key: string, dflt?: any) => any;
    /* W14: non-opsional — selalu dipublikasi contexts.jsx saat load-modul,
       sebelum view mana pun render (memutus banjir SNC TS18048/TS2722 di call-site). */
    useAmsPersist: (key: string, init?: any) => any;
    clearPersisted?: () => void;
    STD_IFRS_ALIAS?: Record<string, any>;
    /* Helper kertas-kerja kanonik (dual-publish dari view_wp.jsx/sa_canonical.jsx/ui.jsx). */
    WP_REFS?: any;
    deriveWpStatus?: (ref: string, audit?: any, firm?: any) => any;
    collectWpNotes?: (...args: any[]) => any;
    openCanonicalWp?: (nav: any, ref: string) => void;
    SignoffDots?: any;
    amsPrintDoc?: any;
    /* Bus tambahan (W12 batch 2) — semua dual-publish nyata: ui.jsx (Spark),
       view_related (RP_*), related_modules_data (LINEAGE), view_opinion_parts
       (AMSOpinion), app.jsx (__amsSetSidebar), view_settings (amsApplyPrefs),
       llm_providers/api.js (AMS_LLM/amsLlmStatus). */
    Spark?: any;
    RP_TXN?: any;
    RP_PARTIES?: any;
    LINEAGE?: any;
    AMSOpinion?: any;
    __amsSetSidebar?: (...args: any[]) => any;
    amsApplyPrefs?: (s: any) => any;
    AMS_LLM?: any;
    amsLlmStatus?: (...args: any[]) => any;
    /* Self-publish view_wtb_deep (WTB deep-dive helper + default penjelasan). */
    DEFAULT_EXPL?: any;
    computeWtbSummary?: (...args: any[]) => any;
  }
}

export {};
