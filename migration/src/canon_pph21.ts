/* ============================================================
   Asseris — PPh 21: MESIN MURNI (PRD sdm-kepatuhan PR-5)
   ------------------------------------------------------------
   Sebelum berkas ini, tarif TER adalah DATA per-pegawai:

       'EMP-001': { gross: 92_000_000, …, ter: 0.20 }

   PMK 168/2023 mendefinisikan TER sebagai FUNGSI — kategori dari PTKP,
   lalu lapisan dari penghasilan bruto. Menyimpannya sebagai angka lepas
   punya dua akibat: kenaikan gaji tidak menggeser tarif, dan tarifnya tak
   dapat diuji terhadap peraturan yang dikutip modul itu sendiri.

   Akibat ketiga muncul di PR-4: 59 personel yang ditambahkan ke roster
   tidak punya `ter`, sehingga `base * undefined` = NaN — PPh 21 dan
   take-home mereka kosong tanpa satu pun uji yang menangkapnya. Tarif yang
   diturunkan tidak dapat "lupa diisi".

   ⚠ CATATAN PROVENANS — WAJIB DIBACA
   ----------------------------------
   `TER_TABLE.verified === false`. Lapisan di bawah DIBANGUN AGAR
   MEREPRODUKSI PERSIS kesepuluh tarif yang sudah dipakai aplikasi ini
   (nol-delta), BUKAN disalin dari Lampiran PMK 168/2023. Batas antar-titik
   observasi bersifat sementara.

   Yang sudah benar sekarang: MEKANISMEnya (kategori → lapisan → tarif) dan
   tempatnya (satu tabel yang dapat diaudit). Yang masih harus dikerjakan
   manusia: mengganti angka lapisan dengan Lampiran resmi, lalu menyetel
   `verified: true`. Sampai itu terjadi, setiap konsumen WAJIB menampilkan
   penandanya — `terRate()` mengembalikan `verified` bersama tarifnya
   supaya itu tak dapat dilupakan.

   Fungsi MURNI; tanpa React/state.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefSet } from './canon_regref';

/* ------------------------------------------------------------------
   1. Kategori TER dari PTKP
   ------------------------------------------------------------------ */

export type TerCategory = 'A' | 'B' | 'C';

/** Pemetaan PTKP → kategori TER (PMK 168/2023 Pasal 2 & Lampiran). */
export const TER_CATEGORY_OF: Record<string, TerCategory> = {
  'TK/0': 'A', 'TK/1': 'A', 'K/0': 'A',
  'TK/2': 'B', 'TK/3': 'B', 'K/1': 'B', 'K/2': 'B',
  'K/3': 'C',
};

export const PTKP_ANNUAL: Record<string, number> = {
  'TK/0': 54_000_000, 'TK/1': 58_500_000, 'TK/2': 63_000_000, 'TK/3': 67_500_000,
  'K/0': 58_500_000, 'K/1': 63_000_000, 'K/2': 67_500_000, 'K/3': 72_000_000,
};

export function terCategoryOf(ptkp: string | undefined | null): TerCategory | null {
  return TER_CATEGORY_OF[String(ptkp || '').toUpperCase().trim()] || null;
}

/* ------------------------------------------------------------------
   2. Tabel TER
   ------------------------------------------------------------------ */

/** Satu lapisan: berlaku untuk bruto ≤ `upTo` (rupiah). `upTo: null` = lapisan teratas. */
export interface TerBracket { upTo: number | null; rate: number }

export interface TerTable {
  basis: string;
  /** false = angka lapisan BELUM dicocokkan dengan Lampiran resmi. */
  verified: boolean;
  note: string;
  A: TerBracket[];
  B: TerBracket[];
  C: TerBracket[];
}

/* Titik yang DIANKER ke tarif yang sudah dipakai aplikasi (nol-delta):
     A  10,7 jt → 1,00%   11,7 jt → 1,75%   22 jt → 7,50%   23 jt → 9,00%   39,5 jt → 11,50%
     B  40,5 jt → 11,00%  44 jt → 12,00%    91,5 jt → 18,50%  93,5 jt → 19,00%
     C  100 jt → 20,00%
   Lapisan di antara & di luar titik itu SEMENTARA. */
export const TER_TABLE: TerTable = {
  basis: 'PMK 168/PMK.01/2023 — Tarif Efektif Rata-rata bulanan',
  verified: false,
  note: 'Lapisan direkonstruksi agar mereproduksi tarif yang sudah dipakai aplikasi; '
    + 'GANTI dengan Lampiran PMK 168/2023 lalu setel verified: true sebelum dipakai menghitung pajak sesungguhnya.',
  A: [
    { upTo: 5_400_000, rate: 0 },
    { upTo: 6_300_000, rate: 0.0025 },
    { upTo: 7_500_000, rate: 0.005 },
    { upTo: 9_650_000, rate: 0.0075 },
    { upTo: 10_700_000, rate: 0.01 },
    { upTo: 11_050_000, rate: 0.0125 },
    { upTo: 11_700_000, rate: 0.0175 },
    { upTo: 12_500_000, rate: 0.02 },
    { upTo: 15_100_000, rate: 0.03 },
    { upTo: 16_950_000, rate: 0.04 },
    { upTo: 19_750_000, rate: 0.05 },
    { upTo: 21_000_000, rate: 0.06 },
    { upTo: 22_000_000, rate: 0.075 },
    { upTo: 23_000_000, rate: 0.09 },
    { upTo: 26_450_000, rate: 0.095 },
    { upTo: 30_050_000, rate: 0.10 },
    { upTo: 35_400_000, rate: 0.11 },
    { upTo: 39_500_000, rate: 0.115 },
    { upTo: 47_800_000, rate: 0.13 },
    { upTo: 56_300_000, rate: 0.15 },
    { upTo: 68_600_000, rate: 0.17 },
    { upTo: 89_000_000, rate: 0.20 },
    { upTo: 125_000_000, rate: 0.23 },
    { upTo: 206_000_000, rate: 0.26 },
    { upTo: 337_000_000, rate: 0.29 },
    { upTo: null, rate: 0.34 },
  ],
  B: [
    { upTo: 6_200_000, rate: 0 },
    { upTo: 7_300_000, rate: 0.0025 },
    { upTo: 9_200_000, rate: 0.005 },
    { upTo: 10_750_000, rate: 0.0075 },
    { upTo: 11_250_000, rate: 0.01 },
    { upTo: 12_600_000, rate: 0.015 },
    { upTo: 15_000_000, rate: 0.02 },
    { upTo: 18_450_000, rate: 0.03 },
    { upTo: 22_150_000, rate: 0.04 },
    { upTo: 26_450_000, rate: 0.05 },
    { upTo: 32_400_000, rate: 0.07 },
    { upTo: 40_500_000, rate: 0.11 },
    { upTo: 44_000_000, rate: 0.12 },
    { upTo: 56_300_000, rate: 0.13 },
    { upTo: 68_600_000, rate: 0.15 },
    { upTo: 91_500_000, rate: 0.185 },
    { upTo: 93_500_000, rate: 0.19 },
    { upTo: 125_000_000, rate: 0.22 },
    { upTo: 206_000_000, rate: 0.25 },
    { upTo: 337_000_000, rate: 0.28 },
    { upTo: null, rate: 0.34 },
  ],
  C: [
    { upTo: 6_600_000, rate: 0 },
    { upTo: 7_800_000, rate: 0.0025 },
    { upTo: 9_600_000, rate: 0.005 },
    { upTo: 11_200_000, rate: 0.0075 },
    { upTo: 12_950_000, rate: 0.01 },
    { upTo: 15_100_000, rate: 0.02 },
    { upTo: 19_500_000, rate: 0.03 },
    { upTo: 24_150_000, rate: 0.04 },
    { upTo: 30_050_000, rate: 0.05 },
    { upTo: 39_100_000, rate: 0.07 },
    { upTo: 51_400_000, rate: 0.10 },
    { upTo: 68_600_000, rate: 0.13 },
    { upTo: 91_500_000, rate: 0.16 },
    { upTo: 93_500_000, rate: 0.185 },
    { upTo: 100_000_000, rate: 0.20 },
    { upTo: 125_000_000, rate: 0.21 },
    { upTo: 206_000_000, rate: 0.24 },
    { upTo: 337_000_000, rate: 0.27 },
    { upTo: null, rate: 0.34 },
  ],
};

/* ------------------------------------------------------------------
   2b. Registry bermasa berlaku (PRD regulatory-reference-annual PR-3)
   ------------------------------------------------------------------ */

/* TER, PTKP dan biaya jabatan berubah SAAT PMK-nya berubah — bukan tiap tahun,
   tetapi juga bukan tak pernah. Sampai PR-3 ketiganya konstanta telanjang tanpa
   masa berlaku, dan itu menyembunyikan kesalahan yang lebih tua daripada
   "tabelnya usang": TER hanya ada SEJAK 1 Januari 2024. Menghitung masa 2023
   dengan tabel ini bukan sekadar memakai angka yang salah — ia memakai METODE
   yang belum ada. Bentuk lama melakukannya tanpa suara.

   Registry ini TIDAK menyalin angka: `value` menunjuk objek yang sama dengan
   `TER_TABLE`/`PTKP_ANNUAL`. Satu literal, dua nama, nol duplikasi. */

export const TER_REGISTRY: RegRefSet<TerTable>[] = [{
  effectiveFrom: '2024-01-01',
  effectiveTo: null,
  basis: 'PMK 168/PMK.03/2023 — berlaku sejak 1 Januari 2024',
  sourceDoc: '',
  verified: false,
  note: TER_TABLE.note,
  value: TER_TABLE,
}];

export const PTKP_REGISTRY: RegRefSet<Record<string, number>>[] = [{
  effectiveFrom: '2016-01-01',
  effectiveTo: null,
  basis: 'PMK 101/PMK.010/2016 — PTKP berlaku sejak Tahun Pajak 2016',
  sourceDoc: 'PMK 101/PMK.010/2016',
  verified: true,
  note: '',
  value: PTKP_ANNUAL,
}];

export const TER_LABEL = 'Tarif Efektif Rata-rata (TER) PPh 21';
export const PTKP_LABEL = 'Penghasilan Tidak Kena Pajak (PTKP)';

/** Tabel TER yang berlaku pada `date`, atau penolakan. Ini pajak — `block`. */
export function terTableOn(date: string | undefined | null) {
  return regrefFor(TER_REGISTRY, String(date ?? ''), { label: TER_LABEL, enforcement: 'block' });
}

/** PTKP yang berlaku pada `date`, atau penolakan. */
export function ptkpTableOn(date: string | undefined | null) {
  return regrefFor(PTKP_REGISTRY, String(date ?? ''), { label: PTKP_LABEL, enforcement: 'block' });
}

export interface TerLookup {
  category: TerCategory | null;
  rate: number | null;
  /** Batas atas lapisan yang dipakai (null = lapisan teratas). */
  bracketUpTo: number | null;
  /** Angka lapisan sudah dicocokkan dengan Lampiran resmi? */
  verified: boolean;
  note: string;
}

/**
 * Tarif TER untuk (PTKP, bruto bulanan).
 *
 * Mengembalikan `rate: null` bila PTKP tak dikenal — bukan 0. Nol berarti
 * "tidak ada pajak", sedangkan yang terjadi adalah "tak dapat ditentukan",
 * dan kedua hal itu tak boleh tampak sama pada slip gaji.
 */
export function terRate(ptkp: string | undefined | null, bruto: number, table: TerTable = TER_TABLE): TerLookup {
  const category = terCategoryOf(ptkp);
  if (!category) {
    return {
      category: null, rate: null, bracketUpTo: null, verified: table.verified,
      note: `PTKP '${String(ptkp ?? '')}' tak dikenal — tarif TER tak dapat ditentukan.`,
    };
  }
  const brackets = table[category];
  const b = Math.max(0, Number(bruto) || 0);
  for (const br of brackets) {
    if (br.upTo === null || b <= br.upTo) {
      return { category, rate: br.rate, bracketUpTo: br.upTo, verified: table.verified, note: table.verified ? '' : table.note };
    }
  }
  const last = brackets[brackets.length - 1];
  return { category, rate: last.rate, bracketUpTo: last.upTo, verified: table.verified, note: table.verified ? '' : table.note };
}

export interface TerLookupOn extends TerLookup {
  /** true = masa itu tak dicakup registry; konsumen WAJIB menolak menghitung. */
  blocked: boolean;
}

/**
 * Tarif TER untuk (PTKP, bruto) pada MASA tertentu.
 *
 * Beda dengan `terRate()`: yang ini bertanya lebih dulu apakah TER memang
 * berlaku pada masa itu. TER baru ada sejak 1 Januari 2024; masa sebelumnya
 * memakai metode lain sama sekali, dan menghitungnya dengan tabel ini akan
 * memberi angka yang tampak sah atas dasar yang belum ada.
 */
export function terRateOn(
  ptkp: string | undefined | null,
  bruto: number,
  date: string | undefined | null,
): TerLookupOn {
  const look = terTableOn(date);
  if (!look.value) {
    return {
      category: terCategoryOf(ptkp), rate: null, bracketUpTo: null,
      verified: false, note: look.note, blocked: look.blocked,
    };
  }
  return { ...terRate(ptkp, bruto, look.value), blocked: false };
}

/* ------------------------------------------------------------------
   3. Tarif progresif Pasal 17 & rekonsiliasi Desember
   ------------------------------------------------------------------ */

/** Lapisan tarif progresif PPh OP — UU HPP Pasal 17 ayat (1) huruf a. */
export const PASAL17_BRACKETS: { upTo: number | null; rate: number }[] = [
  { upTo: 60_000_000, rate: 0.05 },
  { upTo: 250_000_000, rate: 0.15 },
  { upTo: 500_000_000, rate: 0.25 },
  { upTo: 5_000_000_000, rate: 0.30 },
  { upTo: null, rate: 0.35 },
];

/** PPh terutang atas Penghasilan Kena Pajak, berlapis. */
export function pasal17Tax(pkp: number): number {
  let sisa = Math.max(0, Math.floor(pkp / 1000) * 1000); // PKP dibulatkan ribuan ke bawah
  let prev = 0, tax = 0;
  for (const b of PASAL17_BRACKETS) {
    const cap = b.upTo === null ? Infinity : b.upTo;
    const slice = Math.min(sisa, cap - prev);
    if (slice <= 0) break;
    tax += slice * b.rate;
    sisa -= slice;
    prev = cap;
    if (sisa <= 0) break;
  }
  return Math.round(tax);
}

export interface AnnualReconciliation {
  brutoAnnual: number;
  /** Biaya jabatan 5% dari bruto, maksimal Rp 6.000.000/tahun (PMK 250/2008). */
  biayaJabatan: number;
  /** Iuran pensiun/JHT yang dibayar pekerja — pengurang penghasilan neto. */
  iuranPensiun: number;
  netoAnnual: number;
  ptkp: number;
  pkp: number;
  /** PPh setahun menurut Pasal 17. */
  annualTax: number;
  /** Σ PPh 21 yang sudah dipotong Jan–Nov dengan TER. */
  withheldToDate: number;
  /** Yang harus dipotong pada masa Desember = annualTax − withheldToDate. */
  decemberWithholding: number;
  /** Positif = kurang potong; negatif = lebih potong (dikembalikan). */
  difference: number;
  ptkpKnown: boolean;
  note: string;
}

export const BIAYA_JABATAN_RATE = 0.05;
export const BIAYA_JABATAN_CAP_ANNUAL = 6_000_000;

export interface BiayaJabatan { rate: number; capAnnual: number }

/** Biaya jabatan juga bermasa berlaku — ia berubah saat PMK-nya berubah (SC-6). */
export const BIAYA_JABATAN_REGISTRY: RegRefSet<BiayaJabatan>[] = [{
  effectiveFrom: '2009-01-01',
  effectiveTo: null,
  basis: 'PMK 250/PMK.03/2008 — biaya jabatan 5%, maksimal Rp 6.000.000/tahun',
  sourceDoc: 'PMK 250/PMK.03/2008',
  verified: true,
  note: '',
  value: { rate: BIAYA_JABATAN_RATE, capAnnual: BIAYA_JABATAN_CAP_ANNUAL },
}];

export const BIAYA_JABATAN_LABEL = 'Biaya jabatan';

export function biayaJabatanOn(date: string | undefined | null) {
  return regrefFor(BIAYA_JABATAN_REGISTRY, String(date ?? ''), {
    label: BIAYA_JABATAN_LABEL, enforcement: 'block',
  });
}

/**
 * Rekonsiliasi tahunan masa Desember.
 *
 * Footer modul Payroll SUDAH menjanjikan ini ("rekonsiliasi tahunan tarif
 * progresif Pasal 17 dilakukan pada masa Desember") tanpa satu baris kode pun
 * yang melakukannya, dan tab Bukti Potong menampilkan "Estimasi Tahunan" =
 * PPh bulanan × 12 — yang bukan kewajiban tahunan siapa pun.
 */
export function annualReconciliation(args: {
  ptkp: string | undefined | null;
  brutoMonthly: number;
  monthsWorked?: number;
  /** Iuran pensiun/JHT pekerja per bulan. */
  iuranPensiunMonthly?: number;
  /** PPh 21 terpotong Jan–Nov; bila kosong dihitung dari TER × bruto × (bulan−1). */
  withheldToDate?: number;
  table?: TerTable;
}): AnnualReconciliation {
  const months = args.monthsWorked ?? 12;
  const bruto = Math.max(0, args.brutoMonthly || 0);
  const brutoAnnual = bruto * months;
  const biayaJabatan = Math.min(Math.round(brutoAnnual * BIAYA_JABATAN_RATE), BIAYA_JABATAN_CAP_ANNUAL);
  const iuranPensiun = Math.round((args.iuranPensiunMonthly || 0) * months);
  const netoAnnual = Math.max(0, brutoAnnual - biayaJabatan - iuranPensiun);
  const key = String(args.ptkp || '').toUpperCase().trim();
  const ptkpKnown = key in PTKP_ANNUAL;
  const ptkp = PTKP_ANNUAL[key] || 0;
  const pkp = Math.max(0, netoAnnual - ptkp);
  const annualTax = ptkpKnown ? pasal17Tax(pkp) : 0;

  const look = terRate(args.ptkp, bruto, args.table);
  const withheldToDate = args.withheldToDate != null
    ? Math.max(0, args.withheldToDate)
    : (look.rate != null ? Math.round(bruto * look.rate) * Math.max(0, months - 1) : 0);

  const decemberWithholding = annualTax - withheldToDate;
  return {
    brutoAnnual, biayaJabatan, iuranPensiun, netoAnnual, ptkp, pkp, annualTax,
    withheldToDate, decemberWithholding, difference: decemberWithholding,
    ptkpKnown,
    note: !ptkpKnown
      ? `PTKP '${String(args.ptkp ?? '')}' tak dikenal — rekonsiliasi tahunan tak dapat dihitung.`
      : (look.verified ? '' : look.note),
  };
}

/* ------------------------------------------------------------------
   4. Jurnal penggajian → General Ledger
   ------------------------------------------------------------------ */

export interface PayrollJournalLine { ac: string; dr: number; cr: number; label: string }

export interface PayrollJournalInput {
  /** Σ penghasilan bruto seluruh pegawai. */
  gross: number;
  /** Σ PPh 21 dipotong. */
  pph: number;
  /** Σ iuran BPJS yang dipotong dari pekerja. */
  bpjsEmployee: number;
  /** Σ iuran BPJS yang ditanggung pemberi kerja. */
  bpjsEmployer: number;
  /** Σ take-home yang dibayarkan. */
  net: number;
}

export interface PayrollJournal {
  lines: PayrollJournalLine[];
  totalDr: number;
  totalCr: number;
  balanced: boolean;
}

/** Jurnal penggajian agregat. Seimbang SECARA KONSTRUKSI: sisi kredit adalah
 *  pemecahan dari sisi debit, bukan angka yang dicocokkan. */
export function payrollJournal(p: PayrollJournalInput): PayrollJournal {
  const employerBpjs = Math.max(0, p.bpjsEmployer || 0);
  const lines: PayrollJournalLine[] = [
    { ac: '5-100', label: 'Beban Gaji & Tunjangan', dr: p.gross, cr: 0 },
    { ac: '5-100', label: 'Beban BPJS (pemberi kerja)', dr: employerBpjs, cr: 0 },
    { ac: '2-200', label: 'Utang PPh 21', dr: 0, cr: p.pph },
    { ac: '2-200', label: 'Utang BPJS (pekerja + pemberi kerja)', dr: 0, cr: (p.bpjsEmployee || 0) + employerBpjs },
    { ac: '1-102', label: 'Kas & Bank — take-home', dr: 0, cr: p.net },
  ];
  const totalDr = lines.reduce((a, l) => a + l.dr, 0);
  const totalCr = lines.reduce((a, l) => a + l.cr, 0);
  return { lines, totalDr, totalCr, balanced: Math.abs(totalDr - totalCr) < 1 };
}

export interface GlJournalRow { id: string; date?: string; desc?: string; dr: string; cr: string; amount: number; posted?: boolean }

export interface PostCheck { ok: boolean; reason: string }

/** Nomor jurnal deterministik agar posting ganda dapat DIKENALI, bukan ditebak. */
export function payrollJournalIds(period: string): { salary: string; pph: string; bpjs: string } {
  const key = String(period).replace(/[^A-Za-z0-9]+/g, '-').toUpperCase();
  return { salary: `JV-PAY-${key}-GAJI`, pph: `JV-PAY-${key}-PPH21`, bpjs: `JV-PAY-${key}-BPJS` };
}

/**
 * Bolehkah jurnal penggajian periode ini diposting ke GL?
 *
 * Sebelumnya tombol "Posting ke General Ledger" hanya memanggil `nav('firmgl')`.
 * Ia digerbangi status payroll sehingga TAMPAK seperti kontrol; yang digerbangi
 * hanyalah navigasi, dan beban gaji tak pernah sampai ke buku besar.
 */
export function payrollPostCheck(args: {
  gl: readonly GlJournalRow[] | undefined;
  period: string;
  runStatus: string;
  canPost: boolean;
  balanced: boolean;
}): PostCheck {
  if (!args.canPost) return { ok: false, reason: 'Memerlukan kewenangan keuangan firma (CAP.FIRMFIN_EDIT).' };
  if (args.runStatus === 'draft') return { ok: false, reason: 'Setujui payroll terlebih dahulu sebelum memposting ke buku besar.' };
  if (!args.balanced) return { ok: false, reason: 'Jurnal penggajian tidak seimbang — posting ditolak.' };
  const ids = payrollJournalIds(args.period);
  const existing = new Set((args.gl || []).map((j) => j.id));
  if (existing.has(ids.salary) || existing.has(ids.pph) || existing.has(ids.bpjs)) {
    return { ok: false, reason: `Jurnal penggajian periode ${args.period} sudah diposting — posting ganda ditolak.` };
  }
  return { ok: true, reason: '' };
}

/** Baris GL untuk periode ini. Dipakai UI dan uji lewat satu pintu. */
export function payrollGlRows(j: PayrollJournal, period: string, date: string): GlJournalRow[] {
  const ids = payrollJournalIds(period);
  const salary = j.lines.filter((l) => l.ac === '5-100').reduce((a, l) => a + l.dr, 0);
  const pph = j.lines.find((l) => l.label.includes('PPh 21'))?.cr || 0;
  const bpjs = j.lines.find((l) => l.label.includes('BPJS (pekerja'))?.cr || 0;
  const net = j.lines.find((l) => l.ac === '1-102')?.cr || 0;
  return [
    { id: ids.salary, date, desc: `Beban gaji & BPJS pemberi kerja — ${period}`, dr: '5-100', cr: '1-102', amount: net, posted: true },
    { id: ids.pph, date, desc: `Utang PPh 21 karyawan — ${period}`, dr: '5-100', cr: '2-200', amount: pph, posted: true },
    { id: ids.bpjs, date, desc: `Utang BPJS (pekerja + pemberi kerja) — ${period}`, dr: '5-100', cr: '2-200', amount: bpjs, posted: true },
  ].filter((r) => r.amount > 0 && salary > 0);
}
