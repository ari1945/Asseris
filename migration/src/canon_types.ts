/* ============================================================
   Asseris — canon public type surface (W5)
   ------------------------------------------------------------
   Tipe inti yang paling bernilai untuk lapisan angka kanonik:
   WTB (buku besar), Figures (figur akuntansi ditarik dari WTB),
   Fig (saldo akhir kanonik), MaterialityResult, dan bentuk model
   FSGEN yang dikonsumsi forensic/PSAK 58. Engine lain mewarisi
   inferensi TS dari tanda-tangan fungsi — hanya permukaan paling
   bernilai yang diketik eksplisit (DoD W5).
   ============================================================ */

/* ---------- Working Trial Balance (sumber kebenaran saldo akun) ---------- */
export type WtbAmountField = 'adj' | 'unadj' | 'ly' | 'aje';

export interface WtbRow {
  code: string;
  name?: string;
  /** saldo audited (setelah AJE) — Rp penuh */
  adj?: number;
  /** saldo pra-audit (dibukukan klien) — Rp penuh */
  unadj?: number;
  /** komparatif tahun lalu (PY audited) — Rp penuh */
  ly?: number;
  /** mutasi penyesuaian audit — Rp penuh */
  aje?: number;
}

export type WTB = WtbRow[];

/** Jurnal penyesuaian audit (AMS.AJE) yang dirujuk canon. */
export interface AjeRow {
  id: string;
  amount: number;
  status?: string;
  /** Deskripsi/memo jurnal — dipakai narasi view (psak14/16/58). */
  desc?: string;
}

/* ---------- figur akuntansi entitas ditarik dari WTB (Rp juta) ---------- */
export interface Figures {
  dboBooked: number;
  ckpnBooked: number;
  ckpnAudited: number;
  ppeGross: number;
  ppeAccum: number;
  ppeNetCarry: number;
  intanGross: number;
  intanAccum: number;
  intanNetCarry: number;
  rouCarry: number;
  leaseLiab: number;
  dtaReported: number;
  taxExpBooked: number;
}

/* ---------- FIG: saldo akhir kanonik tiap pos (Rp juta) ---------- */
export interface Fig {
  dbo: number;
  ckpn: number;
  ckpnAudited: number;
  ppeCarry: number;
  rouCarry: number;
  leaseLiabWTB: number;
  dtaReported: number;
  taxExpBooked: number;
  ppeBase: number;
  ppeTempDiff: number;
  provisi: number;
  taxLoss: number;
  ociRemeasure: number;
  pbt: number;
  pkp: number;
  permAdd: number;
  permLess: number;
  fiscalTempMovement: number;
}

/* ---------- Augmentasi domain canon (W15) ----------
   Modul data domain (data_isak35/psak117/sakroadmap/syariah/ojk/legaldigital)
   meng-`Object.assign` member tambahan ke instans `AMS_CANON` yang sama. TS tak
   bisa meng-infer augmentasi lintas-modul → dideklarasikan di sini sebagai kontrak
   dan dipasang via SATU typed-cast di canon.ts (bukan 20 `(AMS_CANON as any)` tersebar;
   typo/akses non-member kini tertangkap). Member factory mengembalikan blob domain
   yang dalam — pemodelan tipe-balikan presisi DITUNDA (deep-typing leaf-view = ekor
   Non-Scope W15); karena itu `() => any`. Member non-opsional: augmenter selalu jalan
   saat load-modul sebelum view render (pola sama useAmsPersist W14). */
export interface CanonAugmentations {
  /* ISAK 35 (entitas nonlaba) — data_isak35 */
  isak35: () => any;
  ISAK35_TB: any;
  ISAK35_DISCLOSURES: any;
  /* PSAK 117 (kontrak asuransi) — data_psak117 */
  psak117: () => any;
  P117_PORTFOLIOS: any;
  /* Roadmap SAK — data_sakroadmap */
  sakHorizon: () => any;
  SAK_STANDARDS: any;
  SAK_ISAKS: any;
  /* Akuntansi syariah — data_syariah */
  syariah: () => any;
  SYARIAH_AKAD: any;
  /* OJK (POJK) — data_ojk */
  ojkSustain: () => any;
  ojkSector: () => any;
  ojkFiling: () => any;
  ojkAuditComm: () => any;
  /* Legal digital (TTE/PDP) — data_legaldigital */
  legalSeal: () => any;
  pdp: () => any;
}

/* ---------- SA 320 · Materialitas (om/pm/ctt lintas-modul) ---------- */
export interface MaterialityOpts {
  /** materialitas engagement (Rp penuh) sbg basis bila tak ada override */
  engMateriality?: number;
}

export interface MaterialityResult {
  benchId: string;
  benchLabel: string | null;
  benchValue: number | null;
  pct: number;
  pmPct: number;
  cttPct: number;
  applied: boolean;
  calcOM: number | null;
  /** nilai penuh (Rp) */
  omFull: number | null;
  pmFull: number | null;
  cttFull: number | null;
  /** Rp juta */
  om: number | null;
  pm: number | null;
  ctt: number | null;
}

/** Tabel benchmark materialitas (window.BENCHMARKS). */
export interface Benchmark {
  id: string;
  label: string;
  value: number;
}

/* ---------- model FSGEN yang dikonsumsi forensic_canon & PSAK 58 ----------
   Hanya field yang benar-benar dibaca canon diketik; sisanya dibiarkan. */
export interface FsLineItem {
  cy: number;
  [k: string]: unknown;
}

export interface FsCashLine {
  label: string;
  v: number;
  memo?: string;
}

export interface FsModel {
  is: {
    sales: FsLineItem;
    cogs: FsLineItem;
    sell: FsLineItem;
    admin: FsLineItem;
    finCost: FsLineItem;
    tax: FsLineItem;
    netIncome: FsLineItem;
    [k: string]: FsLineItem;
  };
  cf: {
    cashOpen: number;
    cashClose: number;
    cfoTotal: number;
    cfiTotal: number;
    cffTotal: number;
    netChange: number;
    ties: boolean;
    cfi: FsCashLine[];
    cff: FsCashLine[];
    [k: string]: unknown;
  };
  meta: {
    depreciation: number;
    amortization: number;
    eclProv: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
