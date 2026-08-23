/* ============================================================
   Asseris — KERTAS KERJA REKONSILIASI BANK (payload ekspor, MURNI)
   prompt 32-cashbank CB3.
   ------------------------------------------------------------
   Rekonsiliasi bank adalah kertas kerja paling standar dalam audit. Modul
   `cashbank` menghasilkannya per rekening — lengkap dengan item terbuka, saldo
   buku disesuaikan dan saldo bank disesuaikan — dan sampai 2026-08-22 tak ada
   satu pun cara mengeluarkannya (`grep -c amsExport migration/src/view_firmtreasury.tsx`
   di potongan `CashBank()` = 0).

   Berkas ini MURNI dan menerima BARIS DARI MESIN (`FIRMFIN.bankRecon()`), bukan
   dari tampilan. Itu yang membuat gerbangnya berarti: kalau suatu hari layar
   menghitung ulang angkanya sendiri, ekspor tidak ikut berbohong — ia akan
   berselisih dengan layar, dan ujilah yang memerah.

   GERBANG Q-2 (ekspor terkunci bila akun kontrol menyisakan selisih): kertas
   kerja ini SENGAJA TIDAK dikunci. Yang dikunci di modul Firm Finance adalah
   Neraca Saldo & Laporan Keuangan — PERNYATAAN POSISI. Rekonsiliasi bank adalah
   ALAT PENELUSURAN selisih itu: mengunci alat penelusuran justru mencabut satu-
   satunya dokumen yang menjelaskan mengapa penguncian terjadi. Ia karena itu
   MENYATAKAN keadaannya di dalam payload (`status` per rekening + baris ringkas
   "belum menutup"), bukan menolak keluar.
   ============================================================ */
import { fmt } from './data_base';

export interface ReconExportLine {
  id: string;
  date?: string;
  desc?: string;
  amount: number;
  matched?: boolean;
  ref?: string;
}

/** Bentuk baris `FIRMFIN.bankRecon()` yang dipakai kertas kerja ini. */
export interface ReconExportAccount {
  id: string;
  bank: string;
  name: string;
  no: string;
  ccy: string;
  acct: string;
  balance: number;
  period: string;
  periodEnd?: string;
  bookIDR: number;
  bankIDR: number;
  bookSide: number;
  bankSide: number;
  adjustedBook: number;
  adjustedBank: number;
  residual: number;
  reconciled: boolean;
  closingRate: number;
  fxCovered: boolean;
  fxNote: string;
  lines: ReconExportLine[];
}

export interface ExportSheet {
  name: string;
  heading?: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
  colWidths?: number[];
}

export interface ReconExportModel {
  kind: 'firm-bank-recon';
  scope: 'firm';
  fileName: string;
  firm: string;
  title: string;
  meta: string[];
  sheets: ExportSheet[];
}

/** Rupiah penuh, format id-ID, negatif dalam kurung — sama dengan konvensi ekspor lain. */
export function rpCell(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const s = fmt(Math.abs(Math.round(n)), 0);
  return n < 0 ? '(' + s + ')' : s;
}

const sideOf = (l: ReconExportLine) => (l.ref === 'outstanding' || l.ref === 'transit' ? 'Bank' : 'Buku');
const kindOf = (l: ReconExportLine) =>
  l.ref === 'outstanding' ? 'Cek beredar' : l.ref === 'transit' ? 'Setoran transit' : (l.ref || 'Belum dibukukan');

export interface ReconExportInput {
  /** Baris dari `FIRMFIN.bankRecon()` — SATU rekening, atau seluruhnya. */
  accounts: readonly ReconExportAccount[];
  /** Nama firma dari SSOT sesi (`useFirmName()` → `useAuth().firm`). Kosong = ekspor DITOLAK. */
  firmName: string;
  /** Klok SSOT (`AMS.TODAY`) — dicetak sebagai tanggal penyusunan kertas kerja. */
  preparedOn: string;
  /** Nama penyusun dari sesi nyata; kosong dibiarkan kosong, bukan diisi seed. */
  preparedBy?: string;
}

/**
 * Model workbook untuk `amsExportXlsx`.
 *
 * Melempar bila nama firma kosong: kertas kerja tanpa identitas penerbit adalah
 * dokumen yang tak dapat dipertanggungjawabkan, dan mengisinya dengan literal
 * adalah cara paling halus untuk menyegel nama firma yang salah.
 */
export function bankReconExportModel(input: ReconExportInput): ReconExportModel {
  const firm = String(input.firmName || '').trim();
  if (!firm) {
    throw new Error('bankReconExportModel: nama firma kosong — kertas kerja tidak disegel tanpa identitas penerbit.');
  }
  const accounts = input.accounts || [];
  if (!accounts.length) {
    throw new Error('bankReconExportModel: tidak ada rekening untuk diekspor.');
  }
  const one = accounts.length === 1 ? accounts[0] : null;
  const belum = accounts.filter((a) => !a.reconciled);

  const ringkas: ExportSheet = {
    name: 'Rekonsiliasi',
    heading: 'Rekonsiliasi Bank — saldo buku disesuaikan vs saldo bank disesuaikan',
    columns: [
      'Rekening', 'Bank', 'No.', 'Akun GL', 'Mata Uang', 'Periode', 'Kurs Penutup',
      'Saldo Buku (GL)', 'Item Sisi Buku', 'Saldo Buku Disesuaikan',
      'Saldo Bank', 'Item Sisi Bank', 'Saldo Bank Disesuaikan',
      'Selisih', 'Status',
    ],
    rows: accounts.map((a) => [
      a.name, a.bank, a.no, a.acct, a.ccy, a.period,
      a.ccy === 'IDR' ? '—' : rpCell(a.closingRate),
      rpCell(a.bookIDR), rpCell(a.bookSide), rpCell(a.adjustedBook),
      rpCell(a.bankIDR), rpCell(a.bankSide), rpCell(a.adjustedBank),
      rpCell(a.residual),
      a.reconciled ? 'Seimbang' : (a.fxCovered ? 'Belum menutup' : 'Kurs tak tercakup'),
    ]),
    totals: [
      'TOTAL', '', '', '', '', '', '',
      rpCell(accounts.reduce((s, a) => s + a.bookIDR, 0)),
      rpCell(accounts.reduce((s, a) => s + a.bookSide, 0)),
      rpCell(accounts.reduce((s, a) => s + a.adjustedBook, 0)),
      rpCell(accounts.reduce((s, a) => s + a.bankIDR, 0)),
      rpCell(accounts.reduce((s, a) => s + a.bankSide, 0)),
      rpCell(accounts.reduce((s, a) => s + a.adjustedBank, 0)),
      rpCell(accounts.reduce((s, a) => s + a.residual, 0)),
      belum.length ? belum.length + ' rekening belum menutup' : 'Seluruh rekening menutup',
    ],
    colWidths: [22, 12, 12, 10, 10, 14, 14, 20, 16, 22, 20, 16, 22, 16, 18],
  };

  const items: ExportSheet = {
    name: 'Item Rekonsiliasi',
    heading: 'Item per rekening — sisi BUKU = bank tahu buku belum; sisi BANK = buku tahu bank belum',
    columns: ['Rekening', 'Akun GL', 'ID', 'Tanggal', 'Keterangan', 'Sisi', 'Jenis', 'Jumlah', 'Status'],
    rows: accounts.flatMap((a) => (a.lines || []).map((l) => [
      a.name, a.acct, l.id, String(l.date || ''), String(l.desc || ''),
      sideOf(l), kindOf(l), rpCell(l.amount), l.matched ? 'Cocok' : 'Belum cocok',
    ])),
    colWidths: [22, 10, 10, 14, 46, 8, 18, 18, 14],
  };

  const meta = [
    one
      ? `${one.bank} ${one.name} (${one.id}) · GL ${one.acct} · periode ${one.period}`
      : `${accounts.length} rekening · periode ${accounts[0].period}`,
    `Disusun ${input.preparedOn}${input.preparedBy ? ' oleh ' + input.preparedBy : ''}`,
    belum.length
      ? `${belum.length} rekening BELUM menutup: ${belum.map((a) => a.id).join(', ')}`
      : 'Seluruh rekening menutup: saldo buku disesuaikan == saldo bank disesuaikan',
    'Saldo menurut bank = data eksternal (rekening koran); saldo menurut buku = saldo akun GL rekening '
    + 'ybs. (turunan jurnal terposting). Rekening valas dibandingkan pada kurs penutup periode yang '
    + 'direkonsiliasi, dipilih dari registry kurs bermasa berlaku.',
  ];

  return {
    kind: 'firm-bank-recon',
    scope: 'firm',
    fileName: one ? `Rekonsiliasi Bank — ${one.bank} ${one.name}.xlsx` : 'Rekonsiliasi Bank — seluruh rekening.xlsx',
    firm,
    title: one ? `Rekonsiliasi Bank — ${one.bank} ${one.name}` : 'Rekonsiliasi Bank — seluruh rekening',
    meta,
    sheets: [ringkas, items],
  };
}
