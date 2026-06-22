/* ============================================================
   Wedge MVP F2 — parser impor TB+GL (template tunggal D3)
   ------------------------------------------------------------
   Template = SATU workbook .xlsx/.csv dgn sheet bernama (case-insensitive):
     · "TB"      — neraca saldo: kode | nama | saldo[ _unadj/_adj/_ly ]
     · "GL"      — daftar jurnal: id | tanggal | jam | user | debit | kredit | nilai | deskripsi
     · "FISKAL"  — opsional, key→nilai (Rp JUTA): pbt/permAdd/permLess/taxExpBooked/dtaReported/taxLoss
   Toleransi format MINIMAL (PRD §5 D3) — header dicocokkan via sinonim, bukan parser universal.

   Logika MAPPING dibuat PURE atas array-of-arrays (aoa) agar dapat diuji tanpa
   berkas biner; pembacaan xlsx hanya wrapper tipis (loadXlsx).
   ============================================================ */
import type { RawGlRow } from './derive_flags';
import { parseGlDate } from './derive_flags';

export interface RawTbRow {
  code: string;
  name: string;
  unadj: number;   // saldo belum disesuaikan (debit +, kredit −)
  adj: number;     // saldo disesuaikan (default = unadj bila kolom absen)
  ly: number;      // saldo tahun lalu (0 bila absen)
}

export interface FiskalInput {
  pbt?: number; permAdd?: number; permLess?: number;
  taxExpBooked?: number; dtaReported?: number; taxLoss?: number;
}

export interface ParsedImport {
  gl: RawGlRow[];
  tb: RawTbRow[];
  fiskal: FiskalInput;
  warnings: string[];
}

/* —— pencocokan header (sinonim) —— */
function norm(s: any): string {
  return String(s == null ? '' : s).trim().toLowerCase().replace(/[\s._-]+/g, '');
}
function findCol(header: any[], synonyms: string[]): number {
  const H = header.map(norm);
  for (const syn of synonyms) {
    const i = H.indexOf(norm(syn));
    if (i >= 0) return i;
  }
  return -1;
}
function toNum(v: any): number {
  if (typeof v === 'number') return v;
  if (v == null || v === '') return 0;
  // toleransi format id-ID "1.234.567,89" & "(1.234)" (negatif kurung)
  let s = String(v).trim();
  const neg = /^\(.*\)$/.test(s);
  s = s.replace(/[()\sRp]/gi, '').replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.');
  const n = parseFloat(s);
  return (isNaN(n) ? 0 : n) * (neg ? -1 : 1);
}

/* —— GL: aoa → RawGlRow[] (PURE) —— */
export function mapGlAoa(aoa: any[][]): { rows: RawGlRow[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!aoa || aoa.length < 2) return { rows: [], warnings: ['Sheet GL kosong / tanpa baris data.'] };
  const header = aoa[0];
  const ci = {
    id: findCol(header, ['id', 'no', 'voucher', 'jurnal', 'ref']),
    date: findCol(header, ['tanggal', 'date', 'tgl', 'postingdate']),
    time: findCol(header, ['jam', 'time', 'waktu', 'postingtime']),
    user: findCol(header, ['user', 'pengguna', 'pembuat', 'createdby', 'inputby']),
    dr: findCol(header, ['debit', 'akundebit', 'dr', 'akundr']),
    cr: findCol(header, ['kredit', 'akunkredit', 'cr', 'akuncr']),
    amount: findCol(header, ['nilai', 'amount', 'jumlah', 'nominal', 'value']),
    desc: findCol(header, ['deskripsi', 'keterangan', 'description', 'memo', 'narasi']),
  };
  if (ci.date < 0 || ci.amount < 0) {
    warnings.push('Sheet GL: kolom wajib "tanggal" dan/atau "nilai" tak ditemukan.');
    return { rows: [], warnings };
  }
  const rows: RawGlRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every(c => c == null || c === '')) continue;
    const amount = toNum(row[ci.amount]);
    const dateStr = ci.date >= 0 ? String(row[ci.date] ?? '') : '';
    if (!parseGlDate(dateStr)) warnings.push(`GL baris ${r + 1}: tanggal "${dateStr}" tak terbaca.`);
    rows.push({
      id: ci.id >= 0 ? String(row[ci.id] ?? '') : 'GL-' + r,
      date: dateStr,
      time: ci.time >= 0 ? String(row[ci.time] ?? '') : '',
      user: ci.user >= 0 ? String(row[ci.user] ?? '') : '',
      amount,
      drAccount: ci.dr >= 0 ? String(row[ci.dr] ?? '') : '',
      crAccount: ci.cr >= 0 ? String(row[ci.cr] ?? '') : '',
      desc: ci.desc >= 0 ? String(row[ci.desc] ?? '') : '',
    });
  }
  return { rows, warnings };
}

/* —— TB: aoa → RawTbRow[] (PURE) —— */
export function mapTbAoa(aoa: any[][]): { rows: RawTbRow[]; warnings: string[] } {
  const warnings: string[] = [];
  if (!aoa || aoa.length < 2) return { rows: [], warnings: ['Sheet TB kosong / tanpa baris data.'] };
  const header = aoa[0];
  const ci = {
    code: findCol(header, ['kode', 'kodeakun', 'code', 'account', 'akun']),
    name: findCol(header, ['nama', 'name', 'namaakun', 'description', 'keterangan']),
    unadj: findCol(header, ['saldo', 'saldounadj', 'unadj', 'unadjusted', 'saldoawal', 'balance']),
    adj: findCol(header, ['saldoadj', 'adj', 'adjusted', 'saldoakhir']),
    ly: findCol(header, ['saldoly', 'ly', 'lastyear', 'tahunlalu', 'priorbalance']),
  };
  if (ci.code < 0 || ci.unadj < 0) {
    warnings.push('Sheet TB: kolom wajib "kode" dan/atau "saldo" tak ditemukan.');
    return { rows: [], warnings };
  }
  const rows: RawTbRow[] = [];
  for (let r = 1; r < aoa.length; r++) {
    const row = aoa[r];
    if (!row || row.every(c => c == null || c === '')) continue;
    const unadj = toNum(row[ci.unadj]);
    rows.push({
      code: String(row[ci.code] ?? ''),
      name: ci.name >= 0 ? String(row[ci.name] ?? '') : '',
      unadj,
      adj: ci.adj >= 0 ? toNum(row[ci.adj]) : unadj,
      ly: ci.ly >= 0 ? toNum(row[ci.ly]) : 0,
    });
  }
  return { rows, warnings };
}

/* —— FISKAL: aoa key→nilai (PURE) —— */
export function mapFiskalAoa(aoa: any[][]): FiskalInput {
  const out: FiskalInput = {};
  if (!aoa || !aoa.length) return out;
  const keymap: Record<string, keyof FiskalInput> = {
    pbt: 'pbt', labasebelumpajak: 'pbt',
    permadd: 'permAdd', bedapermananenpositif: 'permAdd', nondeductible: 'permAdd',
    permless: 'permLess', bedapermananennegatif: 'permLess', penghasilanfinal: 'permLess',
    taxexpbooked: 'taxExpBooked', bebanpajak: 'taxExpBooked',
    dtareported: 'dtaReported', asetpajaktangguhan: 'dtaReported',
    taxloss: 'taxLoss', rugifiskal: 'taxLoss',
  };
  for (const row of aoa) {
    if (!row || row.length < 2) continue;
    const key = keymap[norm(row[0])];
    if (key) out[key] = toNum(row[1]);
  }
  return out;
}

/* —— Gerbang control-total —— */
export interface ControlTotals {
  tbUnadjSum: number;       // Σ saldo unadj (idealnya ≈ 0 bila bertanda)
  tbBalanced: boolean;      // |Σ| ≤ toleransi
  tbTolerance: number;
  glCount: number;
  glUnparsedDates: number;
  ok: boolean;
}

export function controlTotals(parsed: ParsedImport, tolerance = 1): ControlTotals {
  const tbUnadjSum = parsed.tb.reduce((s, r) => s + (r.unadj || 0), 0);
  const tbBalanced = Math.abs(tbUnadjSum) <= tolerance;
  const glUnparsedDates = parsed.gl.filter(r => !parseGlDate(r.date)).length;
  const glCount = parsed.gl.length;
  return {
    tbUnadjSum, tbBalanced, tbTolerance: tolerance,
    glCount, glUnparsedDates,
    ok: tbBalanced && glCount > 0 && glUnparsedDates === 0,
  };
}

/* —— wrapper xlsx tipis (lazy, reuse pola export_xlsx) —— */
let _xlsx: any = null;
async function loadXlsx(): Promise<any> {
  if (_xlsx) return _xlsx;
  const mod: any = await import('xlsx');
  _xlsx = mod && mod.utils ? mod : (mod.default || mod);
  return _xlsx;
}

/** Baca workbook (ArrayBuffer) → { sheetName(lower): aoa }. */
export async function readWorkbookAoa(data: ArrayBuffer): Promise<Record<string, any[][]>> {
  const XLSX = await loadXlsx();
  const wb = XLSX.read(data, { type: 'array', cellDates: false });
  const out: Record<string, any[][]> = {};
  for (const name of wb.SheetNames) {
    out[norm(name)] = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, raw: false, defval: '' });
  }
  return out;
}

/** Orkestrator: ArrayBuffer workbook → ParsedImport (sheet TB/GL/FISKAL). */
export async function parseImportWorkbook(data: ArrayBuffer): Promise<ParsedImport> {
  const sheets = await readWorkbookAoa(data);
  const warnings: string[] = [];
  const glSheet = sheets['gl'] || sheets['jurnal'] || sheets['generalledger'];
  const tbSheet = sheets['tb'] || sheets['neracasaldo'] || sheets['trialbalance'];
  if (!glSheet) warnings.push('Sheet "GL" tak ditemukan dalam workbook.');
  if (!tbSheet) warnings.push('Sheet "TB" tak ditemukan dalam workbook.');
  const gl = glSheet ? mapGlAoa(glSheet) : { rows: [], warnings: [] };
  const tb = tbSheet ? mapTbAoa(tbSheet) : { rows: [], warnings: [] };
  const fiskal = mapFiskalAoa(sheets['fiskal'] || sheets['fiscal'] || []);
  return {
    gl: gl.rows, tb: tb.rows, fiskal,
    warnings: warnings.concat(gl.warnings, tb.warnings),
  };
}
