/* ============================================================
   Firm GL — status rekonsiliasi & model ekspor (murni, tanpa React/DOM).

   Dua hal yang dulu tidak ada di modul General Ledger firma:

   1. Tab "Laporan Keuangan" merender Laba Rugi dan Neraca firma dengan keterangan
      "dihitung dari N jurnal terposting" — dan berhenti di situ. `grep -n "reconcil"
      view_firmgl.tsx` kosong: tidak ada satu pun rujukan ke `FIRMFIN.reconciliations()`,
      padahal mesin itu ada, teruji (firm_bridge.test.ts · cash_bank_recon.test.ts), dan
      sudah dipakai Firm Finance untuk MENGUNCI ekspornya. Pembaca neraca firma karena
      itu tidak pernah diberi tahu apakah akun kontrolnya menutup.

   2. `grep -n "amsExport" view_firmgl.tsx` kosong: empat tab data — Jurnal Umum, Buku
      Besar, Neraca Saldo, Laporan Keuangan — dan tak satu pun dapat dikeluarkan sebagai
      kertas kerja tersegel.

   Modul ini menyediakan keduanya sebagai fungsi MURNI supaya dapat diuji tanpa DOM:
   angka ekspor DITURUNKAN dari objek yang sama dengan yang dirender view
   (`statements()` · `trialBalance()` · `accountLedger()` dari `firm_ledger.ts`), bukan
   disalin ulang dari tampilan.

   AMBANG: tidak ada ambang kedua di berkas ini. `status` tiap baris rekonsiliasi
   ditentukan `FIRMFIN.reconciliations()` dengan `RECON_TOLERANCE` tunggal
   (data_firmfin.ts:26). Di sini `status === 'open'` hanya DIBACA.

   KEBIJAKAN Q-2 (Ari, 2026-08-16, PRD prd-firm-erp-deepening §11): laporan keuangan
   firma yang akun kontrolnya menyisakan selisih tanpa pemilik TIDAK BOLEH keluar
   tersegel — sama seperti #239 (WIP) dan #241 (Kas) memblokir.

   PERLUASAN Q-2 (Ari, 2026-08-22): **Neraca Saldo ikut terkunci.** Alasannya bukan
   simetri, melainkan isinya: TB tersegel membawa saldo `1-200` / `1-300` / `2-100` yang
   PERSIS SAMA dengan yang dinyatakan tak menutup, jadi bila ia tetap boleh keluar,
   seorang reviewer dapat memakainya sebagai kertas kerja dan melewati peringatan yang
   hanya hidup di tab Laporan Keuangan — pemblokiran yang dapat diakali lewat pintu
   sebelah bukan pemblokiran. Jurnal Umum & Buku Besar TETAP bebas: keduanya jejak
   transaksi, bukan pernyataan posisi, dan justru dibutuhkan untuk MENELUSURI selisih
   yang mengunci keduanya.
   ============================================================ */
import type { CoaAccount, GlJournal, LedgerRow, StatementSet, TbRow } from './firm_ledger';

/** Pemformat angka id-ID (`AMS.fmt`) — disuntikkan supaya modul ini tetap murni. */
export type Fmt = (n: number, d?: number) => string;

/** Satu baris rekonsiliasi akun kontrol, sebagaimana dikembalikan `FIRMFIN.reconciliations()`. */
export interface ReconRow {
  key: string;
  label: string;
  /** Akun kontrol GL yang direkonsiliasi (mis. '1-200'). */
  glCode: string;
  ownerLabel: string;
  /** Saldo akun kontrol menurut buku besar. */
  control: number;
  /** Total sub-buku pemilik data. */
  sub: number;
  /** control - sub. */
  recon: number;
  /** Jumlah komponen jembatan BERNAMA. */
  bridgeTotal: number;
  /** Sisa yang tak dijelaskan komponen mana pun. */
  residual: number;
  /** 'tied' | 'bridged' | 'open' — ditentukan mesin rekonsiliasi, bukan di sini. */
  status: string;
}

export interface XlsxSheet {
  name: string;
  heading?: string;
  columns: string[];
  rows: string[][];
  totals?: string[];
  colWidths?: number[];
}

export interface XlsxModel {
  kind: string;
  scope: string;
  /** Ekspor lingkup firma tak punya id perikatan; JANGAN diisi 'default' — nilai
      truthy palsu itu pernah membuat artefak lolos tanpa benar-benar tersegel. */
  scopeId: undefined;
  fileName: string;
  firm: string;
  title: string;
  meta: string[];
  sheets: XlsxSheet[];
}

/** Hasil evaluasi gerbang ekspor Laporan Keuangan atas baris rekonsiliasi. */
export interface StatementGate {
  /** true bila ada baris berstatus 'open' → ekspor LK dikunci (Q-2). */
  blocked: boolean;
  /** Baris yang menyisakan selisih tanpa pemilik. */
  openRows: ReconRow[];
  /** Akun kontrol yang PUNYA register rekonsiliasi hari ini — diturunkan dari
      barisnya, bukan didaftar tangan. Akun di luar daftar ini belum direkonsiliasi
      register mana pun (mis. 1-400 Aset Tetap — PR-1/PR-2 arc firm-erp). */
  coveredCodes: string[];
  /** Alasan pemblokiran: menyebut jembatan MANA dan berapa selisihnya. '' bila lolos. */
  reason: string;
}

const jtOf = (fmt: Fmt) => (v: number) => fmt(v / 1e6, 0) + ' jt';

/** Kalimat satu baris: akun kontrol mana, sisa berapa, jembatannya siapa. */
export function reconReason(r: ReconRow, fmt: Fmt): string {
  const jt = jtOf(fmt);
  return r.label + ' (GL ' + r.glCode + ') — sisa belum dijelaskan Rp ' + jt(Math.abs(r.residual))
    + ' dari selisih kontrol-vs-sub-buku Rp ' + jt(Math.abs(r.recon))
    + '; jembatan bernama (' + r.ownerLabel + ') hanya Rp ' + jt(Math.abs(r.bridgeTotal));
}

/**
 * Gerbang Q-2. TIDAK menghitung ulang selisih dan TIDAK memakai ambang sendiri —
 * ia membaca `status` yang sudah ditentukan `FIRMFIN.reconciliations()`.
 *
 * `artefak` hanya menamai apa yang sedang dikunci ("Laporan Keuangan" / "Neraca
 * Saldo") supaya pesannya menyebut berkas yang benar — keputusan blokir/tidak
 * IDENTIK untuk keduanya, satu daftar baris terbuka, satu ambang.
 */
export function statementExportGate(rows: ReconRow[], fmt: Fmt, artefak = 'Laporan Keuangan'): StatementGate {
  const all = rows || [];
  const openRows = all.filter((r) => r.status === 'open');
  const coveredCodes = all.map((r) => r.glCode);
  const reason = openRows.length
    ? 'Ekspor ' + artefak + ' dikunci — ' + openRows.length
      + ' akun kontrol menyisakan selisih tanpa pemilik: '
      + openRows.map((r) => reconReason(r, fmt)).join(' · ')
    : '';
  return { blocked: openRows.length > 0, openRows, coveredCodes, reason };
}

/** Label Indonesia untuk status rekonsiliasi — satu tempat, dipakai layar & ekspor. */
export function reconStatusLabel(status: string): string {
  return status === 'tied' ? 'Menutup' : status === 'bridged' ? 'Terjembatani' : 'Selisih terbuka';
}

/** Lembar "Rekonsiliasi" yang ikut TERSEGEL bersama laporan keuangan. */
export function reconSheet(rows: ReconRow[], fmt: Fmt): XlsxSheet {
  const jt = jtOf(fmt);
  return {
    name: 'Rekonsiliasi',
    heading: 'Rekonsiliasi akun kontrol (Rp juta) — sumber: FIRMFIN.reconciliations()',
    columns: ['Akun kontrol', 'Pos', 'Pemilik sub-buku', 'Kontrol GL', 'Sub-buku', 'Selisih', 'Jembatan', 'Sisa', 'Status'],
    rows: (rows || []).map((r) => [
      r.glCode, r.label, r.ownerLabel,
      jt(r.control), jt(r.sub), jt(r.recon), jt(r.bridgeTotal), jt(r.residual),
      reconStatusLabel(r.status),
    ]),
    colWidths: [16, 22, 26, 14, 14, 12, 12, 12, 18],
  };
}

export interface JournalExportInput {
  gl: GlJournal[];
  acctName: (code: string) => string;
  firmName: string;
  fmt: Fmt;
}

export function buildJournalExport(i: JournalExportInput): XlsxModel {
  const fmt = i.fmt;
  const list = i.gl || [];
  const posted = list.filter((j) => j.posted);
  return {
    kind: 'firm-gl-journal', scope: 'firm', scopeId: undefined,
    fileName: 'Jurnal Umum Firma.xlsx',
    firm: i.firmName,
    title: 'Jurnal Umum Firma',
    meta: [
      list.length + ' jurnal · ' + posted.length + ' terposting · ' + (list.length - posted.length) + ' draft',
      'Jumlah dalam Rp juta',
    ],
    sheets: [{
      name: 'Jurnal Umum',
      heading: 'Jurnal umum firma (Rp juta)',
      columns: ['No. Voucher', 'Tanggal', 'Keterangan', 'Akun Debit', 'Akun Kredit', 'Jumlah', 'Status'],
      rows: list.map((j) => [
        j.id, String(j.date || ''), String(j.desc || ''),
        j.dr + ' ' + i.acctName(j.dr), j.cr + ' ' + i.acctName(j.cr),
        fmt(j.amount / 1e6, 0), j.posted ? 'Posted' : 'Draft',
      ]),
      colWidths: [12, 12, 40, 30, 30, 14, 10],
    }],
  };
}

export interface LedgerExportInput {
  acct: CoaAccount;
  opening: number;
  closing: number;
  rows: LedgerRow[];
  totalDr: number;
  totalCr: number;
  acctName: (code: string) => string;
  firmName: string;
  fmt: Fmt;
}

export function buildLedgerExport(i: LedgerExportInput): XlsxModel {
  const fmt = i.fmt;
  const drCr = (v: number) => fmt(Math.abs(v) / 1e6, 0) + (v >= 0 ? ' D' : ' K');
  return {
    kind: 'firm-gl-ledger', scope: 'firm', scopeId: undefined,
    fileName: 'Buku Besar ' + i.acct.code + '.xlsx',
    firm: i.firmName,
    title: 'Buku Besar ' + i.acct.code + ' · ' + i.acct.name,
    meta: [
      i.acct.type + ' · saldo awal ' + drCr(i.opening) + ' · saldo akhir ' + drCr(i.closing),
      'Hanya jurnal TERPOSTING · Rp juta',
    ],
    sheets: [{
      name: 'Buku Besar',
      heading: i.acct.code + ' · ' + i.acct.name + ' (Rp juta)',
      columns: ['Tanggal', 'No. Jurnal', 'Keterangan', 'Lawan Akun', 'Debit', 'Kredit', 'Saldo Berjalan'],
      rows: [
        ['', '', 'Saldo Awal Periode', '', '', '', drCr(i.opening)],
        ...(i.rows || []).map((r) => {
          const lawan = r.dr2 ? r.cr : r.dr;
          return [
            String(r.date || ''), r.id, String(r.desc || ''),
            lawan + ' ' + i.acctName(lawan),
            r.dr2 ? fmt(r.dr2 / 1e6, 0) : '—',
            r.cr2 ? fmt(r.cr2 / 1e6, 0) : '—',
            drCr(r.running),
          ];
        }),
      ],
      totals: ['', '', 'MUTASI PERIODE', '', fmt(i.totalDr / 1e6, 0), fmt(i.totalCr / 1e6, 0), drCr(i.closing)],
      colWidths: [12, 12, 40, 30, 12, 12, 16],
    }],
  };
}

/** Hasil percobaan ekspor yang tunduk Q-2. `model === null` = tak ada berkas dibuat. */
export interface GatedExportResult {
  blocked: boolean;
  /** Alasan pemblokiran (menyebut artefak, jembatan & selisih); '' bila lolos. */
  reason: string;
  model: XlsxModel | null;
}

export interface TrialBalanceExportInput {
  rows: TbRow[];
  totalDr: number;
  totalCr: number;
  balanced: boolean;
  /** Baris rekonsiliasi — Neraca Saldo ikut tunduk Q-2 (perluasan 2026-08-22). */
  recon: ReconRow[];
  postedCount: number;
  firmName: string;
  fmt: Fmt;
}

export function buildTrialBalanceExport(i: TrialBalanceExportInput): GatedExportResult {
  const fmt = i.fmt;
  const gate = statementExportGate(i.recon, fmt, 'Neraca Saldo');
  if (gate.blocked) return { blocked: true, reason: gate.reason, model: null };

  return {
    blocked: false,
    reason: '',
    model: {
      kind: 'firm-gl-tb', scope: 'firm', scopeId: undefined,
      fileName: 'Neraca Saldo Firma.xlsx',
      firm: i.firmName,
      title: 'Neraca Saldo Firma',
      meta: [
        'Dihitung dari ' + i.postedCount + ' jurnal terposting',
        i.balanced ? 'Seimbang: total debit = total kredit' : 'TIDAK SEIMBANG — total debit != total kredit',
        'Akun kontrol yang direkonsiliasi: ' + (gate.coveredCodes.join(' · ') || '—'),
        'Rp juta',
      ],
      sheets: [{
        name: 'Neraca Saldo',
        heading: 'Neraca saldo firma (Rp juta)',
        columns: ['Kode', 'Nama Akun', 'Tipe', 'Debit', 'Kredit'],
        rows: (i.rows || []).map((a) => [
          a.code, a.name, a.type,
          a.bal > 0 ? fmt(a.bal / 1e6, 0) : '—',
          a.bal < 0 ? fmt(-a.bal / 1e6, 0) : '—',
        ]),
        totals: ['TOTAL', i.balanced ? 'seimbang' : 'TIDAK SEIMBANG', '', fmt(i.totalDr / 1e6, 0), fmt(i.totalCr / 1e6, 0)],
        colWidths: [10, 34, 14, 14, 14],
      }],
    },
  };
}

export interface StatementsExportInput {
  coa: CoaAccount[];
  /** Saldo turunan jurnal terposting (`currentBalances`) — sumber yang sama dgn layar. */
  balances: Record<string, number>;
  /** Hasil `statements()` — BUKAN salinan angka dari tampilan. */
  st: StatementSet;
  recon: ReconRow[];
  postedCount: number;
  firmName: string;
  fmt: Fmt;
}

/**
 * Q-2: bila ada akun kontrol berstatus 'open', TIDAK ADA model yang dikembalikan —
 * jadi tak ada berkas yang dapat ditulis. Pemblokiran hidup di sini (fungsi murni,
 * dapat diuji), bukan hanya pada atribut `disabled` sebuah tombol.
 */
export function buildStatementsExport(i: StatementsExportInput): GatedExportResult {
  const fmt = i.fmt;
  const gate = statementExportGate(i.recon, fmt, 'Laporan Keuangan');
  if (gate.blocked) return { blocked: true, reason: gate.reason, model: null };

  const jt = (v: number) => fmt(v / 1e6, 0);
  const byType = (t: string) => (i.coa || []).filter((a) => a.type === t);
  const bal = (code: string) => i.balances[code] || 0;
  const st = i.st;

  const plRows: string[][] = [
    ['Pendapatan Jasa', jt(st.revenue), 'Akun tipe Pendapatan'],
    ...byType('Beban').map((a) => [a.name, jt(bal(a.code)), a.code]),
    ['Total Beban Usaha', jt(st.expense), 'Sigma akun tipe Beban'],
    ['LABA OPERASI', jt(st.netProfit), 'Pendapatan - Sigma beban'],
  ];
  const bsRows: string[][] = [
    ...byType('Aset').map((a) => ['Aset · ' + a.name, jt(bal(a.code)), a.code]),
    ['TOTAL ASET', jt(st.totAset), 'Sigma akun tipe Aset'],
    ...byType('Liabilitas').map((a) => ['Liabilitas · ' + a.name, jt(-bal(a.code)), a.code]),
    ['Total Liabilitas', jt(st.totLiab), 'Sigma akun tipe Liabilitas'],
    ...byType('Ekuitas').map((a) => ['Ekuitas · ' + a.name, jt(-bal(a.code)), a.code]),
    ['Ekuitas · Laba Tahun Berjalan', jt(st.netProfit), 'dari Laba Rugi'],
    ['Total Ekuitas', jt(st.totEkuitas), 'Sigma akun tipe Ekuitas + laba tahun berjalan'],
    ['TOTAL LIABILITAS & EKUITAS', jt(st.totLiab + st.totEkuitas), ''],
  ];

  return {
    blocked: false,
    reason: '',
    model: {
      kind: 'firm-gl-statements', scope: 'firm', scopeId: undefined,
      fileName: 'Laporan Keuangan Firma.xlsx',
      firm: i.firmName,
      title: 'Laporan Keuangan Firma — dari buku besar',
      meta: [
        'Dihitung dari ' + i.postedCount + ' jurnal terposting',
        st.balanced ? 'Neraca seimbang: Aset = Liabilitas + Ekuitas' : 'NERACA TIDAK SEIMBANG',
        'Akun kontrol yang direkonsiliasi: ' + (gate.coveredCodes.join(' · ') || '—'),
        'Rp juta',
      ],
      sheets: [
        { name: 'Laba Rugi', heading: 'Laporan laba rugi (Rp juta)', columns: ['Pos', 'Nilai', 'Catatan'], rows: plRows, colWidths: [34, 14, 40] },
        { name: 'Neraca', heading: 'Laporan posisi keuangan (Rp juta)', columns: ['Pos', 'Nilai', 'Catatan'], rows: bsRows, colWidths: [34, 14, 40] },
        reconSheet(i.recon, fmt),
      ],
    },
  };
}
