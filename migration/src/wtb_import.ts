/* ============================================================
   Asseris — W-WTB·1 · Ingress Working Trial Balance (paste/CSV)
   ------------------------------------------------------------
   Parser + validator MURNI (tanpa efek samping, tanpa `any`) yang
   mengubah neraca saldo klien yang ditempel (tab/`;`/`,`-delimited
   dari Excel) menjadi baris WTB siap-pakai — bentuk identik dengan
   `AMS.WTB` (key/group/code/name/ly/unadj/aje/adj/lead) sehingga
   dikonsumsi hilir (figuresFromWTB → AMS_CANON → materialitas/GC/
   PSAK/FS) TANPA perubahan kode canon.

   Kontrak SSOT: pemetaan kode→pos kanonik di-impor dari `canon_base`
   (`WTB_MAP`), bukan diduplikasi. Asumsi angka = lokal id-ID
   (`1.850.000.000` ribuan titik, desimal koma, negatif dalam kurung).
   Konvensi tanda = Dr (+) / Cr (−) agar Σ adjusted = 0 (seimbang).
   ============================================================ */
import { WTB_MAP } from './canon_base';

/* ---------- bentuk baris hasil impor (kompatibel AMS.WTB) ---------- */
export interface ImportedWtbRow {
  key: string;
  code: string;
  name: string;
  group: string;
  ly: number;
  unadj: number;
  aje: number;
  adj: number;
  lead: string;
}

export type IssueLevel = 'error' | 'warn' | 'info';

export interface WtbIssue {
  level: IssueLevel;
  code: string;        // kode mesin, mis. 'duplicate-code'
  message: string;     // pesan id-ID untuk ditampilkan
  line?: number;       // nomor baris sumber (1-based) bila relevan
  account?: string;    // kode akun terkait bila relevan
}

export interface ParseMeta {
  delimiter: string;
  delimiterLabel: string;
  hadHeader: boolean;
  rowCount: number;
  columns: Record<string, number>;   // logical→indeks kolom sumber
  totals: { ly: number; unadj: number; aje: number; adj: number };
  totalAssets: number;
  balanceDiff: number;               // Σ adjusted (idealnya 0)
  balanceTolerance: number;
  balanced: boolean;
  source: string;
}

export interface CoverageEngine {
  id: string;
  label: string;
  lit: boolean;             // semua kode pemicunya hadir di TB
  missing: string[];        // kode kanonik yang belum ada
}

export interface MappingCoverage {
  matchedCodes: string[];   // kode WTB_MAP yang cocok di TB
  missingCodes: string[];   // kode WTB_MAP yang tak ditemukan
  matchedPct: number;       // 0..100
  engines: CoverageEngine[];
}

export interface ParseResult {
  rows: ImportedWtbRow[];
  issues: WtbIssue[];
  meta: ParseMeta;
  coverage: MappingCoverage;
  ok: boolean;              // tidak ada issue level 'error'
}

export interface ParseOptions {
  /** toleransi balance relatif terhadap total aset (default 0,01% = 0.0001) */
  tolerancePct?: number;
  /** lantai toleransi balance dalam Rupiah penuh (default 1.000) */
  toleranceFloor?: number;
}

/* ---------- sinonim header (id + en) → kolom logis ---------- */
const HEADER_SYNONYMS: Record<string, string[]> = {
  code:   ['kode', 'kode akun', 'code', 'akun', 'account', 'account code', 'no akun', 'no. akun'],
  name:   ['nama', 'nama akun', 'name', 'account name', 'description', 'keterangan', 'uraian'],
  group:  ['grup', 'group', 'kelompok', 'caption', 'klasifikasi', 'pos'],
  ly:     ['ta lalu', 'tahun lalu', 'saldo tahun lalu', 'py', 'prior', 'prior year', 'ly', 'komparatif'],
  unadj:  ['unadjusted', 'unadj', 'saldo', 'saldo buku', 'saldo dibukukan', 'balance', 'book', 'trial balance', 'tb', 'saldo kini'],
  aje:    ['aje', 'penyesuaian', 'jurnal penyesuaian', 'adjustment', 'adj'],
  debit:  ['debit', 'debet', 'dr'],
  credit: ['credit', 'kredit', 'cr'],
};

/* engine PSAK → kode kanonik yang wajib hadir agar "menyala" */
const ENGINE_REQS: { id: string; label: string; keys: (keyof typeof WTB_MAP)[] }[] = [
  { id: 'psak24', label: 'PSAK 24 · Imbalan Kerja', keys: ['dbo'] },
  { id: 'psak71', label: 'PSAK 71 · ECL Piutang', keys: ['ckpn'] },
  { id: 'psak16', label: 'PSAK 16 · Aset Tetap', keys: ['ppeGross', 'ppeAccum'] },
  { id: 'psak19', label: 'PSAK 19 · Aset Takberwujud', keys: ['intanGross', 'intanAccum'] },
  { id: 'psak73', label: 'PSAK 73 · Sewa', keys: ['rou', 'leaseST', 'leaseLT'] },
  { id: 'psak46', label: 'PSAK 46 · Pajak Tangguhan', keys: ['dta', 'taxExp'] },
];

/* ---------- helper: infer grup FS dari prefix kode ---------- */
export function groupFromCode(code: string): string {
  const c = code.replace(/\s/g, '');
  if (c.startsWith('1-1') || /^11/.test(c)) return 'Aset Lancar';
  if (c.startsWith('1-2') || /^12/.test(c)) return 'Aset Tidak Lancar';
  if (c.startsWith('2-1') || /^21/.test(c)) return 'Liabilitas Jk. Pendek';
  if (c.startsWith('2-2') || /^22/.test(c)) return 'Liabilitas Jk. Panjang';
  if (c.startsWith('3')) return 'Ekuitas';
  if (c.startsWith('4')) return 'Pendapatan';
  if (c.startsWith('5') || c.startsWith('6')) return 'Beban';
  return 'Lainnya';
}

const ASSET_GROUPS = new Set(['Aset Lancar', 'Aset Tidak Lancar']);

/* ---------- helper: parse angka lokal id-ID ----------
   Menerima: 'Rp 1.850.000.000', '(620.000.000)', '1.234,50', '—', '-'.
   Mengembalikan null bila benar-benar tak terparse (memicu issue). */
export function parseAmount(raw: string): number | null {
  let s = (raw == null ? '' : String(raw)).trim();
  if (s === '' || s === '-' || s === '–' || s === '—') return 0;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1).trim(); }
  s = s.replace(/rp/ig, '').replace(/\s/g, '');
  if (s.startsWith('+')) s = s.slice(1);
  if (s.startsWith('-')) { neg = true; s = s.slice(1); }
  if (s.endsWith('-')) { neg = true; s = s.slice(0, -1); }
  // ekor desimal = pemisah ('.'/',' ) diikuti tepat 1–2 digit di akhir
  let dec = '';
  const m = s.match(/[.,](\d{1,2})$/);
  if (m && m.index != null) { dec = m[1]; s = s.slice(0, m.index); }
  const digits = s.replace(/[.,]/g, '');
  if (digits !== '' && !/^\d+$/.test(digits)) return null;
  if (digits === '' && dec === '') return null;
  const n = parseFloat((digits === '' ? '0' : digits) + (dec ? '.' + dec : ''));
  if (Number.isNaN(n)) return null;
  return neg ? -n : n;
}

/* ---------- deteksi delimiter ---------- */
function detectDelimiter(lines: string[]): { ch: string; label: string } {
  const cand: { ch: string; label: string }[] = [
    { ch: '\t', label: 'Tab' },
    { ch: ';', label: 'Titik koma' },
    { ch: ',', label: 'Koma' },
    { ch: '|', label: 'Pipa' },
  ];
  let best = cand[0];
  let bestScore = -1;
  for (const c of cand) {
    let cols = 0, n = 0;
    for (const ln of lines.slice(0, 8)) {
      const parts = ln.split(c.ch);
      if (parts.length > 1) { cols += parts.length; n++; }
    }
    const score = n > 0 ? cols / n : 0;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

function normHeader(s: string): string {
  return s.trim().toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ');
}

/* cari kolom logis dari baris header; null bila bukan header */
function mapHeader(cells: string[]): Record<string, number> | null {
  const cols: Record<string, number> = {};
  cells.forEach((cell, i) => {
    const h = normHeader(cell);
    for (const logical of Object.keys(HEADER_SYNONYMS)) {
      if (cols[logical] != null) continue;
      if (HEADER_SYNONYMS[logical].includes(h)) { cols[logical] = i; break; }
    }
  });
  // header sah bila mengenali ≥2 kolom DAN ada kode + (saldo apa pun)
  const hasBalance = cols.unadj != null || cols.debit != null || cols.credit != null || cols.ly != null;
  if (Object.keys(cols).length >= 2 && cols.code != null && hasBalance) return cols;
  return null;
}

/* pemetaan kolom posisional bila tak ada header */
function positionalColumns(width: number): Record<string, number> {
  // urutan terdokumentasi: kode, nama, ta-lalu, unadjusted, aje
  if (width >= 5) return { code: 0, name: 1, ly: 2, unadj: 3, aje: 4 };
  if (width === 4) return { code: 0, name: 1, ly: 2, unadj: 3 };
  if (width === 3) return { code: 0, name: 1, unadj: 2 };
  return { code: 0, unadj: 1 };
}

/* ---------- parser utama ---------- */
export function parseTrialBalance(text: string, opts: ParseOptions = {}): ParseResult {
  const tolerancePct = opts.tolerancePct != null ? opts.tolerancePct : 0.0001; // 0,01%
  const toleranceFloor = opts.toleranceFloor != null ? opts.toleranceFloor : 1000;
  const issues: WtbIssue[] = [];

  const rawLines = (text || '').split(/\r?\n/).map(l => l.replace(/\s+$/, ''));
  const lines = rawLines.filter(l => l.trim() !== '');

  if (lines.length === 0) {
    issues.push({ level: 'error', code: 'empty', message: 'Tidak ada data untuk diimpor — tempel neraca saldo klien.' });
    return emptyResult(issues, '\t', 'Tab');
  }

  const delim = detectDelimiter(lines);
  const split = (l: string) => l.split(delim.ch).map(c => c.trim());

  // header vs posisional
  const firstCells = split(lines[0]);
  const headerCols = mapHeader(firstCells);
  const hadHeader = headerCols != null;
  const bodyLines = hadHeader ? lines.slice(1) : lines;
  const width = Math.max(...lines.map(l => split(l).length));
  const cols = hadHeader ? headerCols! : positionalColumns(width);

  if (cols.code == null) {
    issues.push({ level: 'error', code: 'no-code-column', message: 'Kolom kode akun tidak terdeteksi. Sertakan header (mis. "Kode") atau letakkan kode di kolom pertama.' });
  }
  const hasBalanceCol = cols.unadj != null || (cols.debit != null && cols.credit != null);
  if (!hasBalanceCol) {
    issues.push({ level: 'error', code: 'no-balance-column', message: 'Kolom saldo tidak terdeteksi. Sertakan kolom "Unadjusted"/"Saldo" atau pasangan "Debit"+"Kredit".' });
  }

  const rows: ImportedWtbRow[] = [];
  const seen = new Set<string>();
  const cellAt = (cells: string[], idx: number | undefined): string => (idx != null && idx < cells.length ? cells[idx] : '');

  const num = (cells: string[], idx: number | undefined, lineNo: number, label: string, code: string): number => {
    const raw = cellAt(cells, idx);
    if (idx == null) return 0;
    const v = parseAmount(raw);
    if (v == null) {
      issues.push({ level: 'error', code: 'bad-number', message: `Angka tak terbaca pada kolom ${label}: "${raw}".`, line: lineNo, account: code });
      return 0;
    }
    return v;
  };

  bodyLines.forEach((ln, bi) => {
    const lineNo = (hadHeader ? bi + 2 : bi + 1);
    const cells = split(ln);
    const code = cellAt(cells, cols.code).replace(/\s+/g, ' ').trim();
    if (code === '') {
      issues.push({ level: 'warn', code: 'blank-code', message: 'Baris tanpa kode akun dilewati.', line: lineNo });
      return;
    }
    if (seen.has(code)) {
      issues.push({ level: 'error', code: 'duplicate-code', message: `Kode akun ganda: ${code}.`, line: lineNo, account: code });
      return;
    }
    seen.add(code);

    let unadj: number;
    if (cols.unadj != null) {
      unadj = num(cells, cols.unadj, lineNo, 'Unadjusted', code);
    } else {
      const dr = num(cells, cols.debit, lineNo, 'Debit', code);
      const cr = num(cells, cols.credit, lineNo, 'Kredit', code);
      unadj = dr - cr;   // saldo bertanda Dr(+)/Cr(−)
    }
    const ly = num(cells, cols.ly, lineNo, 'TA Lalu', code);
    const aje = num(cells, cols.aje, lineNo, 'AJE', code);
    const name = (cellAt(cells, cols.name).trim()) || code;
    let group = (cellAt(cells, cols.group).trim());
    if (group === '') group = groupFromCode(code);
    if (group === 'Lainnya') {
      issues.push({ level: 'warn', code: 'unknown-group', message: `Grup FS tak dikenali untuk ${code} — tetapkan manual atau periksa kode.`, line: lineNo, account: code });
    }

    rows.push({ key: 'imp' + rows.length, code, name, group, ly, unadj, aje, adj: unadj + aje, lead: '' });
  });

  if (rows.length === 0 && !issues.some(i => i.level === 'error')) {
    issues.push({ level: 'error', code: 'no-rows', message: 'Tidak ada baris akun yang valid terbaca.' });
  }

  // totals + gerbang balance
  const totals = rows.reduce((a, r) => ({ ly: a.ly + r.ly, unadj: a.unadj + r.unadj, aje: a.aje + r.aje, adj: a.adj + r.adj }),
    { ly: 0, unadj: 0, aje: 0, adj: 0 });
  const totalAssets = rows.filter(r => ASSET_GROUPS.has(r.group) || r.code.startsWith('1')).reduce((s, r) => s + r.adj, 0);
  const balanceTolerance = Math.max(toleranceFloor, Math.abs(totalAssets) * tolerancePct);
  const balanceDiff = totals.adj;
  const balanced = Math.abs(balanceDiff) <= balanceTolerance;
  if (rows.length > 0 && !balanced) {
    issues.push({
      level: 'error', code: 'unbalanced',
      message: `Neraca saldo tidak seimbang — Σ saldo adjusted = ${fmtRp(balanceDiff)} (toleransi ${fmtRp(balanceTolerance)}). Periksa konvensi tanda (Dr +, Cr −) atau akun hilang.`,
    });
  }

  const coverage = computeCoverage(seen);
  const meta: ParseMeta = {
    delimiter: delim.ch, delimiterLabel: delim.label, hadHeader,
    rowCount: rows.length, columns: cols, totals, totalAssets,
    balanceDiff, balanceTolerance, balanced, source: 'paste-csv',
  };
  const ok = !issues.some(i => i.level === 'error');
  return { rows, issues, meta, coverage, ok };
}

/* ---------- cakupan pemetaan terhadap WTB_MAP (kejujuran engine PSAK) ---------- */
export function computeCoverage(codes: Set<string>): MappingCoverage {
  const keys = Object.keys(WTB_MAP) as (keyof typeof WTB_MAP)[];
  const matchedCodes: string[] = [];
  const missingCodes: string[] = [];
  for (const k of keys) {
    const code = WTB_MAP[k].code;
    if (codes.has(code)) { if (!matchedCodes.includes(code)) matchedCodes.push(code); }
    else if (!missingCodes.includes(code)) missingCodes.push(code);
  }
  const engines: CoverageEngine[] = ENGINE_REQS.map(e => {
    const missing = e.keys.map(k => WTB_MAP[k].code).filter(c => !codes.has(c));
    return { id: e.id, label: e.label, lit: missing.length === 0, missing };
  });
  const totalMapCodes = new Set(keys.map(k => WTB_MAP[k].code)).size;
  const matchedPct = totalMapCodes ? Math.round((matchedCodes.length / totalMapCodes) * 100) : 0;
  return { matchedCodes, missingCodes, matchedPct, engines };
}

/* ---------- util internal ---------- */
function fmtRp(n: number): string {
  const neg = n < 0;
  const s = Math.round(Math.abs(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return (neg ? '(' : 'Rp ') + s + (neg ? ')' : '');
}

function emptyResult(issues: WtbIssue[], delimiter: string, delimiterLabel: string): ParseResult {
  return {
    rows: [], issues,
    meta: {
      delimiter, delimiterLabel, hadHeader: false, rowCount: 0, columns: {},
      totals: { ly: 0, unadj: 0, aje: 0, adj: 0 }, totalAssets: 0,
      balanceDiff: 0, balanceTolerance: 0, balanced: false, source: 'paste-csv',
    },
    coverage: computeCoverage(new Set<string>()),
    ok: false,
  };
}
