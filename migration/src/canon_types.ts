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

/* ---------- figur entitas tingkat-atas (PR-A · SSOT benchmark SA 320) ----------
   Basis penyajian. `unadj` = figur dilaporkan klien (dasar penetapan materialitas
   saat perencanaan, SA 320 ¶10); `adj` = setelah penyesuaian audit (dipakai sebagai
   PEMICU REVISI SA 320 ¶12-13, bukan untuk menghitung ulang OM — lihat PRD PR-A §11 Q2).
   `ly` = komparatif tahun lalu (PY teraudit) — dipakai menurunkan OM tahun lalu untuk
   perbandingan YoY, sehingga angka itu pun tak lagi di-hardcode. */
export type FigureBasis = 'unadj' | 'adj' | 'ly';

/** Figur entitas tingkat-atas diturunkan dari WTB. **Rp PENUH**, bukan juta —
    konsumennya (BENCHMARKS SA 320, jembatan laba AJE, rasio lancar) semua rupiah penuh.
    `null` bila WTB tak tersedia; JANGAN diganti 0 — nol adalah angka, ketiadaan bukan. */
export interface EntityFigures {
  basis: FigureBasis;
  /** false bila tak ada baris WTB sama sekali → seluruh field numerik null */
  available: boolean;
  revenue: number | null;
  cogs: number | null;
  grossProfit: number | null;
  opex: number | null;
  financeCost: number | null;
  pbt: number | null;
  taxExpense: number | null;
  netIncome: number | null;
  curAssets: number | null;
  curLiab: number | null;
  currentRatio: number | null;
  totalAssets: number | null;
  equity: number | null;
}

/** Baris tabel benchmark SA 320 — bentuknya dipertahankan dari `view_materiality.BENCHMARKS`
    agar `calcOM` dan UI Materialitas tak perlu berubah bentuk. */
export interface Benchmark {
  id: string;
  label: string;
  value: number;
  lo: number;
  hi: number;
  def: number;
  note: string;
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

/* ---------- SA 570 · Going concern (rasio solvabilitas + Altman Z) ----------
   Diturunkan PENUH dari WTB (single source of truth). Semua agregat dalam
   Rp juta; rasio unitless. Dihitung untuk dua periode (kolom `adj` = audited
   tahun berjalan, `ly` = komparatif tahun lalu) agar tren nyata, bukan fiktif. */
export interface GcAggregates {
  /* agregat neraca/laba-rugi (Rp juta) */
  currentAssets: number;
  currentLiab: number;
  inventory: number;
  totalAssets: number;
  totalLiab: number;
  equity: number;
  retainedEarnings: number;
  sales: number;
  ebit: number;
  interest: number;
  netIncome: number;
  workingCapital: number;
  /* rasio (unitless kecuali OCF & modal kerja = Rp juta) */
  currentRatio: number;
  quickRatio: number;
  der: number;
  interestCoverage: number;
  /** arus kas operasi — metode tak langsung dari mutasi WTB (Rp juta); null bila tak terhitung (mis. tanpa komparatif) */
  operatingCashFlow: number | null;
}

/** Altman Z-Score (varian asli; X4 = nilai buku ekuitas/total liabilitas — proksi pasar tak tersedia di WTB). */
export interface AltmanZ {
  x1: number; // modal kerja / total aset
  x2: number; // saldo laba / total aset
  x3: number; // EBIT / total aset
  x4: number; // ekuitas (nilai buku) / total liabilitas
  x5: number; // penjualan / total aset
  z: number;
  zone: 'safe' | 'grey' | 'distress';
}

export interface GoingConcernResult {
  /** tahun berjalan (kolom WTB `adj`, audited) */
  cy: GcAggregates;
  /** komparatif tahun lalu (kolom WTB `ly`) */
  py: GcAggregates;
  /** Altman Z tahun berjalan */
  altman: AltmanZ;
  /** Altman Z tahun lalu */
  altmanPy: AltmanZ;
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
/* AK-01 — satu baris padanan penomoran PSAK/ISAK (lama↔baru) per dokumen IAI */
export interface PsakRenumberRow { old: string; neu: string; title: string; kind: 'PSAK' | 'ISAK'; }

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
  /* AK-01 — padanan penomoran PSAK/ISAK lama↔baru (data_sakroadmap) */
  PSAK_RENUMBER: PsakRenumberRow[];
  psakRenumber: (oldCode: string) => PsakRenumberRow | null;
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

/* ---------- PSAK 25 · Item Penyajian Kembali (restatement, editable auditor) ----------
   Satu koreksi/perubahan retrospektif yang dimasukkan auditor. Estimasi DIKECUALIKAN
   (prospektif ¶36 — tak menyebabkan penyajian kembali). */
export interface RestatementItem {
  id: string;
  /** kesalahan periode lalu (¶42) · perubahan kebijakan retrospektif (¶19/22) · reklasifikasi penyajian (PSAK 1 ¶41) */
  type: 'error' | 'policy' | 'reclass';
  desc: string;
  /** periode asal koreksi, mis. 'FY2024' */
  period: string;
  /** pos LK utama terdampak (label naratif) */
  affects: string;
  /** dampak bruto ke laba sebelum pajak periode lalu (Rp juta); negatif = laba dikoreksi turun.
      Diabaikan untuk type 'reclass' (tak berdampak laba/saldo laba). */
  gross: number;
  /** dikenai gross-up pajak (RATE) — hanya relevan untuk error/policy */
  tax?: boolean;
}

/* ---------- SA 320 · Materialitas (om/pm/ctt lintas-modul) ---------- */

/** Konfigurasi materialitas yang DITETAPKAN auditan (PR-6b). Dikirim eksplisit oleh
 *  pemanggil React (`useMateriality()`), yang menariknya dari state ter-hidrasi server.
 *  Bila dikirim, `materiality()` jadi FUNGSI MURNI — tak menyentuh localStorage sama
 *  sekali, sehingga hasilnya tak lagi bergantung pada modul mana yang sudah pernah
 *  dibuka di browser itu (lihat `MaterialityResult.configSource`). */
export interface MaterialityConfig {
  benchId: string;
  pct: number;
  pmPct: number;
  cttPct: number;
  appliedOverride: number | null;
}

/** Dari mana konfigurasi yang dipakai berasal — membuat jalur basi DAPAT DIDETEKSI.
 *  `args` = dikirim pemanggil (ter-hidrasi server, reaktif) · `cache` = dibaca dari cache
 *  localStorage (jalur warisan; bisa basi bila cache dingin) · `default` = tak ada
 *  konfigurasi sama sekali, memakai default 5%/75%/5% + benchmark pertama. */
export type MaterialityConfigSource = 'args' | 'cache' | 'default';

/** PR-A — dari mana tabel benchmark SA 320 berasal. `window` menandai jalur statis
 *  buta-perikatan yang masih tersisa; `none` = tak ada benchmark → OM tak terhitung. */
export type MaterialityBenchSource = 'args' | 'window' | 'none';

export interface MaterialityOpts {
  /** konfigurasi eksplisit (PR-6b) — bila ada, tak ada pembacaan localStorage */
  config?: MaterialityConfig;
  /** Nilai `materiality` pada baris perikatan (Rp penuh). **BUKAN sumber OM** sejak
   *  PR-6·0 — dipakai HANYA sebagai pembanding untuk mendeteksi *drift* terhadap
   *  materialitas yang ditetapkan. Lihat `MaterialityResult.drift`. */
  engMateriality?: number;
  /** perikatan aktif — kunci `mat.*` berlingkup perikatan (PR-1a). Tanpa ini
   *  tier perikatan dilewati & hanya setelan firma/legacy yang terbaca. */
  engagementId?: string | null;
  /** PR-A — tabel benchmark SA 320 EKSPLISIT, lazimnya `benchmarksFromWTB(wtb)`.
   *  Bila ada, `window.BENCHMARKS` tidak dibaca sama sekali. Jalur window
   *  dipertahankan sebagai fallback untuk pemanggil non-React & uji lama, tapi
   *  ia statis & buta-perikatan — pemanggil view WAJIB mengirim ini. */
  benchmarks?: Benchmark[];
}

/** Dari mana OM yang berlaku berasal — dipakai UI untuk menyatakan basisnya (PR-6·0). */
export type MaterialityBasis = 'override' | 'benchmark' | 'none';

/** Selisih antara nilai `materiality` di baris perikatan dan OM yang ditetapkan.
 *  `null` bila salah satunya tak tersedia (tak ada yang bisa dibandingkan). */
export interface MaterialityDrift {
  /** nilai di baris perikatan (Rp penuh) */
  engValue: number;
  /** OM yang ditetapkan (Rp penuh) */
  omFull: number;
  /** engValue − omFull (Rp penuh); positif = baris perikatan lebih tinggi */
  deltaFull: number;
  /** |delta| ÷ omFull */
  ratio: number;
  /** true bila |ratio| > 0,005 (0,5%) — di bawah itu dianggap pembulatan */
  material: boolean;
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
  /** basis OM yang berlaku (PR-6·0) — satu aturan untuk SELURUH permukaan */
  basis: MaterialityBasis;
  /** asal konfigurasi (PR-6b) — `cache`/`default` pada pemanggil view = jalur basi */
  configSource: MaterialityConfigSource;
  /** PR-A — asal tabel benchmark: 'args' (dari WTB) / 'window' (statis, basi) / 'none'. */
  benchSource: MaterialityBenchSource;
  /** drift baris perikatan vs OM ditetapkan; `null` = tak ada pembanding */
  drift: MaterialityDrift | null;
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
