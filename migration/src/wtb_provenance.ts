/* ============================================================
   Asseris — W-WTB·2b · Provenance impor & pratinjau dampak
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`).

   MASALAH yang ditutup: impor TB kedua MENGGANTI seluruh neraca saldo tanpa diff dan
   tanpa konfirmasi, padahal setiap angka hilir (materialitas, engine PSAK, FS, SAD)
   ikut bergerak — dan payload lama hanya menyimpan `importedAt` + `source`, tanpa
   siapa yang mengimpor, hash isi, satuan, atau periode. Modul ini menyediakan:

   1. `summarizeImport` — header provenance yang dapat diaudit untuk satu impor.
   2. `diffWtb`         — dampak penggantian: akun ditambah/dihapus/berubah, Δ total
                          aset, Δ laba, dan engine PSAK yang PADAM akibat impor baru.
   3. `pushHistory`     — riwayat header impor (terbatas) di dalam payload yang sama,
                          sehingga tak perlu endpoint server baru.
   ============================================================ */
import type { TbUnit, CoverageEngine } from './wtb_import';

export interface ImportProvenance {
  importedAt: string;          // ISO
  userId: string;
  userName: string;
  userRole: string;
  unit: TbUnit;
  unitFactor: number;
  period: string;              // periode TB (mis. 'FY2025')
  sourceName: string;          // nama berkas/asal yang diketik auditor
  /* Sidik jari TEKS PENUH yang ditempel. Diverifikasi ulang dengan menempel kembali berkas
     sumber yang sama — BUKAN dari data yang tersimpan di sini, karena hanya cuplikan yang
     disimpan (lihat `rawExcerpt`/`rawLength` pada payload impor). '' bila gagal dihitung. */
  sha256: string;
  /* Sidik jari CUPLIKAN yang benar-benar tersimpan. Inilah satu-satunya hash yang dapat
     dihitung ulang dari isi payload. Dulu hanya `sha256` yang ada dan ia ditampilkan tepat
     di sebelah cuplikan — mengesankan cuplikan itulah yang di-hash, padahal bukan. */
  sha256Excerpt: string;
  /* panjang teks penuh vs jumlah karakter yang disimpan — supaya klaim cakupan eksplisit */
  rawLength: number;
  excerptLength: number;
  rowCount: number;
  totalAssets: number;
  balanced: boolean;
}

export interface ProvenanceInput {
  importedAt: string;
  user?: { id?: string; name?: string; role?: string } | null;
  unit: TbUnit;
  unitFactor: number;
  period?: string;
  sourceName?: string;
  sha256?: string;
  sha256Excerpt?: string;
  rawLength?: number;
  excerptLength?: number;
  rowCount: number;
  totalAssets: number;
  balanced: boolean;
}

/** Berapa banyak teks mentah yang ditahan di payload impor (SA 500 — ketertelusuran sumber). */
export const RAW_EXCERPT_LIMIT = 4000;

/** Cuplikan yang disimpan; hash-nya (`sha256Excerpt`) dihitung atas NILAI INI, bukan teks penuh. */
export function rawExcerptOf(text: string, limit = RAW_EXCERPT_LIMIT): string {
  return (text || '').slice(0, limit);
}

export function summarizeImport(input: ProvenanceInput): ImportProvenance {
  const u = input.user || {};
  return {
    importedAt: input.importedAt,
    userId: u.id || '',
    userName: u.name || '(tak diketahui)',
    userRole: u.role || '',
    unit: input.unit,
    unitFactor: input.unitFactor,
    period: input.period || '',
    sourceName: input.sourceName || '',
    sha256: input.sha256 || '',
    sha256Excerpt: input.sha256Excerpt || '',
    rawLength: input.rawLength || 0,
    excerptLength: input.excerptLength || 0,
    rowCount: input.rowCount,
    totalAssets: input.totalAssets,
    balanced: input.balanced,
  };
}

/** Riwayat header impor, terbaru di depan, dibatasi `max` entri. */
export function pushHistory(history: ImportProvenance[] | undefined, entry: ImportProvenance, max = 5): ImportProvenance[] {
  return [entry, ...(history || [])].slice(0, max);
}

/* ---------------- pratinjau dampak ---------------- */

export interface DiffRowLike {
  code: string;
  name?: string;
  adj?: number;
  unadj?: number;
  aje?: number;
}

export interface ChangedAccount {
  code: string;
  name: string;
  from: number;
  to: number;
  delta: number;
}

export interface ImportDiff {
  added: ChangedAccount[];
  removed: ChangedAccount[];
  changed: ChangedAccount[];
  unchangedCount: number;
  /** total aset (kode 1-xxxx) sebelum & sesudah */
  assetsBefore: number;
  assetsAfter: number;
  deltaAssets: number;
  /** laba berjalan = Σ pendapatan(4) − Σ beban(5/6), magnitudo positif = laba */
  profitBefore: number;
  profitAfter: number;
  deltaProfit: number;
  /** engine PSAK yang tadinya menyala lalu PADAM karena akun pemicunya hilang */
  enginesLost: string[];
  enginesGained: string[];
  /** ada perubahan substantif? (false = impor identik) */
  hasChanges: boolean;
}

const adjOf = (r: DiffRowLike): number => (r.adj != null ? r.adj : (r.unadj || 0) + (r.aje || 0));
const lead1 = (code: string): string => (code || '').replace(/\s/g, '').charAt(0);

function aggregate(rows: DiffRowLike[]): { assets: number; profit: number } {
  let assets = 0, rev = 0, exp = 0;
  for (const r of rows) {
    const v = adjOf(r);
    const k = lead1(r.code);
    if (k === '1') assets += v;
    else if (k === '4') rev += -v;
    else if (k === '5' || k === '6') exp += v;
  }
  return { assets, profit: rev - exp };
}

/**
 * Bandingkan WTB berjalan dengan baris hasil impor baru.
 * `tol` = ambang Rupiah di bawah mana selisih saldo dianggap tak berubah.
 */
export function diffWtb(
  before: DiffRowLike[],
  after: DiffRowLike[],
  opts: { tol?: number; enginesBefore?: CoverageEngine[]; enginesAfter?: CoverageEngine[] } = {},
): ImportDiff {
  const tol = opts.tol != null ? opts.tol : 0.5;
  const beforeByCode = new Map<string, DiffRowLike>();
  for (const r of before) beforeByCode.set(r.code, r);
  const afterByCode = new Map<string, DiffRowLike>();
  for (const r of after) afterByCode.set(r.code, r);

  const added: ChangedAccount[] = [];
  const removed: ChangedAccount[] = [];
  const changed: ChangedAccount[] = [];
  let unchangedCount = 0;

  for (const [code, r] of afterByCode) {
    const prev = beforeByCode.get(code);
    const to = adjOf(r);
    if (!prev) {
      added.push({ code, name: r.name || code, from: 0, to, delta: to });
      continue;
    }
    const from = adjOf(prev);
    if (Math.abs(to - from) > tol) changed.push({ code, name: r.name || prev.name || code, from, to, delta: to - from });
    else unchangedCount++;
  }
  for (const [code, r] of beforeByCode) {
    if (!afterByCode.has(code)) {
      const from = adjOf(r);
      removed.push({ code, name: r.name || code, from, to: 0, delta: -from });
    }
  }

  const sortByMag = (a: ChangedAccount, b: ChangedAccount) => Math.abs(b.delta) - Math.abs(a.delta);
  added.sort(sortByMag); removed.sort(sortByMag); changed.sort(sortByMag);

  const aggBefore = aggregate(before);
  const aggAfter = aggregate(after);

  const litSet = (list?: CoverageEngine[]) => new Set((list || []).filter(e => e.lit).map(e => e.label));
  const litBefore = litSet(opts.enginesBefore);
  const litAfter = litSet(opts.enginesAfter);
  const enginesLost = [...litBefore].filter(l => !litAfter.has(l));
  const enginesGained = [...litAfter].filter(l => !litBefore.has(l));

  return {
    added, removed, changed, unchangedCount,
    assetsBefore: aggBefore.assets, assetsAfter: aggAfter.assets, deltaAssets: aggAfter.assets - aggBefore.assets,
    profitBefore: aggBefore.profit, profitAfter: aggAfter.profit, deltaProfit: aggAfter.profit - aggBefore.profit,
    enginesLost, enginesGained,
    hasChanges: added.length > 0 || removed.length > 0 || changed.length > 0,
  };
}
