/* ============================================================
   Asseris — W-WTB·4 · Ingress buku besar (GL) + tie-out sub-ledger
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`). Mengubah ekspor buku besar
   klien (tempel/CSV) menjadi baris GL per-akun, lalu menyediakan tie-out:
   Σ baris GL sebuah akun harus = saldo unadjusted-nya. Mengganti transaksi
   SINTETIK pada drill akun dengan detail NYATA. Display-only (tak mengubah TB).

   Sadar-pemetaan W-WTB·3: pencocokan akun memakai `srcCodes` (kode klien yang
   digabung) bila ada, jadi GL ber-kode klien tetap ketemu setelah relabel.
   ============================================================ */
import { parseAmount } from './wtb_import';

export interface LedgerLine {
  code: string;
  date: string;
  desc: string;
  party: string;
  ref: string;
  amount: number;   // bertanda (Dr +, Cr −)
}

export interface LedgerIssue { level: 'error' | 'warn'; code: string; message: string; line?: number; }

export interface LedgerParseResult {
  byCode: Record<string, LedgerLine[]>;
  lineCount: number;
  codeCount: number;
  issues: LedgerIssue[];
  ok: boolean;
}

export interface LedgerTieOut {
  hasDetail: boolean;
  lines: LedgerLine[];
  total: number;     // Σ amount baris GL
  target: number;    // saldo unadjusted akun
  diff: number;      // total − target
  tied: boolean;     // |diff| ≤ tol
}

const HEADER_SYNONYMS: Record<string, string[]> = {
  code:   ['kode', 'kode akun', 'akun', 'account', 'code', 'no akun'],
  date:   ['tanggal', 'tgl', 'date', 'posting date'],
  desc:   ['uraian', 'keterangan', 'deskripsi', 'description', 'memo', 'narasi'],
  party:  ['pihak', 'lawan', 'counterparty', 'vendor', 'pelanggan', 'rekanan'],
  ref:    ['dokumen', 'document', 'ref', 'referensi', 'no bukti', 'voucher', 'no. bukti', 'bukti'],
  amount: ['jumlah', 'amount', 'nilai', 'mutasi', 'saldo'],
  debit:  ['debit', 'debet', 'dr'],
  credit: ['kredit', 'credit', 'cr'],
};

function detectDelimiter(lines: string[]): string {
  const cand = ['\t', ';', ',', '|'];
  let best = '\t', bestScore = -1;
  for (const c of cand) {
    let cols = 0, n = 0;
    for (const ln of lines.slice(0, 8)) { const p = ln.split(c); if (p.length > 1) { cols += p.length; n++; } }
    const score = n ? cols / n : 0;
    if (score > bestScore) { bestScore = score; best = c; }
  }
  return best;
}

const normH = (s: string) => s.trim().toLowerCase().replace(/[.:]/g, '').replace(/\s+/g, ' ');

function mapHeader(cells: string[]): Record<string, number> | null {
  const cols: Record<string, number> = {};
  cells.forEach((cell, i) => {
    const h = normH(cell);
    for (const logical of Object.keys(HEADER_SYNONYMS)) {
      if (cols[logical] != null) continue;
      if (HEADER_SYNONYMS[logical].includes(h)) { cols[logical] = i; break; }
    }
  });
  const hasAmount = cols.amount != null || (cols.debit != null || cols.credit != null);
  if (cols.code != null && hasAmount && Object.keys(cols).length >= 2) return cols;
  return null;
}

export function parseLedger(text: string): LedgerParseResult {
  const issues: LedgerIssue[] = [];
  const lines = (text || '').split(/\r?\n/).map(l => l.replace(/\s+$/, '')).filter(l => l.trim() !== '');
  if (!lines.length) {
    issues.push({ level: 'error', code: 'empty', message: 'Tidak ada data buku besar untuk diimpor.' });
    return { byCode: {}, lineCount: 0, codeCount: 0, issues, ok: false };
  }
  const delim = detectDelimiter(lines);
  const split = (l: string) => l.split(delim).map(c => c.trim());
  const headerCols = mapHeader(split(lines[0]));
  const hadHeader = headerCols != null;
  const body = hadHeader ? lines.slice(1) : lines;
  // posisional: kode, tanggal, uraian, dokumen, jumlah
  const cols = hadHeader ? headerCols! : { code: 0, date: 1, desc: 2, ref: 3, amount: 4 };

  if (cols.code == null) issues.push({ level: 'error', code: 'no-code', message: 'Kolom kode akun tidak terdeteksi.' });
  const hasAmount = cols.amount != null || (cols.debit != null && cols.credit != null);
  if (!hasAmount) issues.push({ level: 'error', code: 'no-amount', message: 'Kolom jumlah/mutasi (atau Debit+Kredit) tidak terdeteksi.' });

  const byCode: Record<string, LedgerLine[]> = {};
  let lineCount = 0;
  const at = (cells: string[], idx: number | undefined) => (idx != null && idx < cells.length ? cells[idx] : '');

  body.forEach((ln, bi) => {
    const lineNo = (hadHeader ? bi + 2 : bi + 1);
    const cells = split(ln);
    const code = at(cells, cols.code).replace(/\s+/g, ' ').trim();
    if (code === '') { issues.push({ level: 'warn', code: 'blank-code', message: 'Baris GL tanpa kode akun dilewati.', line: lineNo }); return; }

    let amount: number;
    if (cols.amount != null) {
      const v = parseAmount(at(cells, cols.amount));
      if (v == null) { issues.push({ level: 'error', code: 'bad-amount', message: `Jumlah tak terbaca: "${at(cells, cols.amount)}".`, line: lineNo }); return; }
      amount = v;
    } else {
      const dr = parseAmount(at(cells, cols.debit)) || 0;
      const cr = parseAmount(at(cells, cols.credit)) || 0;
      amount = dr - cr;
    }
    const line: LedgerLine = {
      code,
      date: at(cells, cols.date),
      desc: at(cells, cols.desc) || at(cells, cols.ref) || '—',
      party: at(cells, cols.party),
      ref: at(cells, cols.ref),
      amount,
    };
    (byCode[code] = byCode[code] || []).push(line);
    lineCount++;
  });

  if (lineCount === 0 && !issues.some(i => i.level === 'error')) {
    issues.push({ level: 'error', code: 'no-lines', message: 'Tidak ada baris buku besar valid.' });
  }
  return { byCode, lineCount, codeCount: Object.keys(byCode).length, issues, ok: !issues.some(i => i.level === 'error') };
}

/* Tie-out sebuah baris WTB ke detail GL-nya. `row` boleh punya `srcCodes`
   (W-WTB·3 relabel+merge) — semua kode klien dikumpulkan. Tie ke `unadj`. */
export interface LedgerRowLike { code: string; unadj?: number; srcCodes?: string[]; }
export function ledgerForRow(byCode: Record<string, LedgerLine[]>, row: LedgerRowLike, tol = 1000): LedgerTieOut {
  const codes = (row.srcCodes && row.srcCodes.length) ? row.srcCodes : [row.code];
  const lines: LedgerLine[] = [];
  for (const c of codes) if (byCode[c]) lines.push(...byCode[c]);
  const total = lines.reduce((s, l) => s + l.amount, 0);
  const target = row.unadj || 0;
  const diff = total - target;
  return { hasDetail: lines.length > 0, lines, total, target, diff, tied: Math.abs(diff) <= tol };
}
