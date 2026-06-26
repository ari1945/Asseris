/* ============================================================
   Asseris — W-WTB·3 · Pemetaan bagan akun klien → CoA standar
   ------------------------------------------------------------
   Fungsi MURNI (tanpa efek samping, tanpa `any`). Memungkinkan TB klien
   dengan bagan akun apa pun dipetakan ke kode kanonik yang dipahami canon
   (`figuresFromWTB`/`WTB_MAP`) & FSGEN — sehingga engine PSAK menyala dan
   baris LK terbentuk persis, TANPA perubahan kode canon.

   Mekanisme: editor menyimpan peta {kodeKlien → kodeStandar}; `applyMapping`
   me-relabel baris ke kode standar lalu MERGE baris yang menuju kode sama.
   ============================================================ */
import { WTB_MAP } from './canon_base';
import { computeCoverage } from './wtb_import';
import type { MappingCoverage } from './wtb_import';

export interface CoaAccount {
  code: string;
  label: string;
  group: string;
  lead: string;
  /** slot WTB_MAP bila akun ini pemicu engine PSAK (else null) */
  canonKey: string | null;
}

export interface MappedRow {
  key: string;
  code: string;            // kode standar (atau kode asli bila tak dipetakan)
  name: string;
  group: string;
  ly: number;
  unadj: number;
  aje: number;
  adj: number;
  lead: string;
  /** jejak: kode/akun klien yang digabung ke baris ini */
  srcCodes: string[];
  mapped: boolean;
}

export interface MappingCoverageResult {
  total: number;             // jumlah akun klien
  mappedCount: number;       // akun yang sudah dipetakan ke kode standar
  unmappedCodes: string[];   // kode klien belum dipetakan
  fsLinesCovered: number;    // banyak kode standar terisi
  fsLinesTotal: number;      // banyak kode standar (CoA)
  psak: MappingCoverage;     // kejujuran engine PSAK (reuse W-WTB·1)
}

/* ---------- Bagan akun standar yang dipahami canon + FSGEN ---------- */
const COA_BASE: { code: string; label: string; group: string; lead: string }[] = [
  { code: '1-1100', label: 'Kas dan Setara Kas', group: 'Aset Lancar', lead: 'A' },
  { code: '1-1200', label: 'Piutang Usaha', group: 'Aset Lancar', lead: 'B' },
  { code: '1-1210', label: 'Cadangan Kerugian Penurunan Nilai', group: 'Aset Lancar', lead: 'B' },
  { code: '1-1300', label: 'Persediaan', group: 'Aset Lancar', lead: 'C' },
  { code: '1-1400', label: 'Pajak Dibayar di Muka', group: 'Aset Lancar', lead: 'D' },
  { code: '1-1500', label: 'Biaya Dibayar di Muka', group: 'Aset Lancar', lead: 'D' },
  { code: '1-2100', label: 'Aset Tetap — Harga Perolehan', group: 'Aset Tidak Lancar', lead: 'E' },
  { code: '1-2110', label: 'Akumulasi Penyusutan', group: 'Aset Tidak Lancar', lead: 'E' },
  { code: '1-2400', label: 'Aset Takberwujud — Harga Perolehan', group: 'Aset Tidak Lancar', lead: 'EI' },
  { code: '1-2410', label: 'Akumulasi Amortisasi', group: 'Aset Tidak Lancar', lead: 'EI' },
  { code: '1-2300', label: 'Aset Hak-Guna (PSAK 73)', group: 'Aset Tidak Lancar', lead: 'F' },
  { code: '1-2500', label: 'Aset Pajak Tangguhan', group: 'Aset Tidak Lancar', lead: 'G' },
  { code: '2-1100', label: 'Utang Usaha', group: 'Liabilitas Jk. Pendek', lead: 'AA' },
  { code: '2-1200', label: 'Utang Bank Jangka Pendek', group: 'Liabilitas Jk. Pendek', lead: 'BB' },
  { code: '2-1300', label: 'Beban Akrual', group: 'Liabilitas Jk. Pendek', lead: 'CC' },
  { code: '2-1400', label: 'Utang Pajak', group: 'Liabilitas Jk. Pendek', lead: 'DD' },
  { code: '2-1500', label: 'Liabilitas Sewa — Jk. Pendek', group: 'Liabilitas Jk. Pendek', lead: 'F' },
  { code: '2-2100', label: 'Utang Bank Jangka Panjang', group: 'Liabilitas Jk. Panjang', lead: 'BB' },
  { code: '2-2200', label: 'Liabilitas Sewa — Jk. Panjang', group: 'Liabilitas Jk. Panjang', lead: 'F' },
  { code: '2-2300', label: 'Liabilitas Imbalan Kerja', group: 'Liabilitas Jk. Panjang', lead: 'H' },
  { code: '3-1100', label: 'Modal Saham', group: 'Ekuitas', lead: 'K' },
  { code: '3-2100', label: 'Saldo Laba', group: 'Ekuitas', lead: 'K' },
  { code: '4-1100', label: 'Penjualan Bersih', group: 'Pendapatan', lead: 'R' },
  { code: '5-1100', label: 'Beban Pokok Penjualan', group: 'Beban', lead: 'S' },
  { code: '5-2100', label: 'Beban Penjualan', group: 'Beban', lead: 'T' },
  { code: '5-3100', label: 'Beban Umum & Administrasi', group: 'Beban', lead: 'U' },
  { code: '5-4100', label: 'Beban Keuangan', group: 'Beban', lead: 'V' },
  { code: '5-5100', label: 'Beban Pajak Penghasilan', group: 'Beban', lead: 'W' },
];

/* kode standar → slot WTB_MAP (reverse, SSOT dari canon_base) */
const CODE_TO_CANONKEY: Record<string, string> = (() => {
  const m: Record<string, string> = {};
  for (const k of Object.keys(WTB_MAP) as (keyof typeof WTB_MAP)[]) m[WTB_MAP[k].code] = k as string;
  return m;
})();

export const STANDARD_COA: CoaAccount[] = COA_BASE.map(a => ({ ...a, canonKey: CODE_TO_CANONKEY[a.code] || null }));
const COA_CODES = new Set(STANDARD_COA.map(a => a.code));
const COA_BY_CODE: Record<string, CoaAccount> = (() => {
  const m: Record<string, CoaAccount> = {};
  for (const a of STANDARD_COA) m[a.code] = a;
  return m;
})();

const norm = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/* ---------- saran pemetaan otomatis ----------
   1) kode klien == kode standar → identitas. 2) nama ter-normalisasi cocok
   persis → kode standar itu. (Fuzzy lebih jauh = pekerjaan auditor manual.) */
export interface ImportedLike { code: string; name?: string }
export function autoMap(rows: ImportedLike[]): Record<string, string> {
  const byName: Record<string, string> = {};
  for (const a of STANDARD_COA) byName[norm(a.label)] = a.code;
  const out: Record<string, string> = {};
  for (const r of rows) {
    if (COA_CODES.has(r.code)) { out[r.code] = r.code; continue; }
    const n = norm(r.name || '');
    if (n && byName[n]) out[r.code] = byName[n];
  }
  return out;
}

/* ---------- terapkan pemetaan: relabel + merge ----------
   Baris dengan target kode standar yang sama digabung (Σ ly/unadj/aje).
   Baris tak terpetakan mempertahankan kodenya (tak hilang dari total). */
export function applyMapping(rows: { code: string; name?: string; group?: string; ly?: number; unadj?: number; aje?: number; lead?: string }[],
  mapping: Record<string, string>): MappedRow[] {
  const acc = new Map<string, MappedRow>();
  let i = 0;
  for (const r of rows) {
    const target = (mapping[r.code] && COA_CODES.has(mapping[r.code])) ? mapping[r.code] : r.code;
    const isMapped = COA_CODES.has(target);
    const std = COA_BY_CODE[target];
    const ly = r.ly || 0, unadj = r.unadj || 0, aje = r.aje || 0;
    const existing = acc.get(target);
    if (existing) {
      existing.ly += ly; existing.unadj += unadj; existing.aje += aje; existing.adj = existing.unadj + existing.aje;
      if (!existing.srcCodes.includes(r.code)) existing.srcCodes.push(r.code);
    } else {
      acc.set(target, {
        key: 'map' + (i++), code: target,
        name: isMapped ? std.label : (r.name || target),
        group: isMapped ? std.group : (r.group || 'Lainnya'),
        ly, unadj, aje, adj: unadj + aje,
        lead: isMapped ? std.lead : (r.lead || ''),
        srcCodes: [r.code], mapped: isMapped,
      });
    }
  }
  // urut sesuai CoA standar lalu sisanya
  const order = (code: string) => { const idx = STANDARD_COA.findIndex(a => a.code === code); return idx < 0 ? 999 : idx; };
  return [...acc.values()].sort((a, b) => order(a.code) - order(b.code));
}

/* ---------- ringkasan cakupan pemetaan ---------- */
export function mappingCoverage(rows: ImportedLike[], mapping: Record<string, string>): MappingCoverageResult {
  const unmappedCodes: string[] = [];
  const targetCodes = new Set<string>();
  for (const r of rows) {
    const t = mapping[r.code];
    if (t && COA_CODES.has(t)) targetCodes.add(t);
    else unmappedCodes.push(r.code);
  }
  const mappedCount = rows.length - unmappedCodes.length;
  return {
    total: rows.length,
    mappedCount,
    unmappedCodes,
    fsLinesCovered: targetCodes.size,
    fsLinesTotal: STANDARD_COA.length,
    psak: computeCoverage(targetCodes),
  };
}
