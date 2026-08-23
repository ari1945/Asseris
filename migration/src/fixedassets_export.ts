/* ============================================================
   Asseris — KERTAS KERJA REGISTER ASET TETAP (payload ekspor, MURNI)
   prompt 33-fixedassets FA1.
   ------------------------------------------------------------
   Sampai 2026-08-22 ekspor modul ini menyusun DUA lembar: 'Register Aset' dan
   'Ringkasan Kelas'. Keduanya menjawab "apa yang kami punya". Yang TIDAK ikut
   justru satu-satunya bagian yang dapat DINYATAKAN SALAH:

     · roll-forward nilai buku beserta komponennya — dan `residual`;
     · daftar pelepasan yang menjelaskan pergerakan itu;
     · kandidat pencatatan ganda lintas-register.

   Selisih kontrol GL memang disebut satu baris di `meta`, tetapi satu baris meta
   bukan kertas kerja: pembaca berkas tidak dapat menelusuri dari saldo awal ke
   saldo akhir. Daftar aset adalah inventaris; roll-forward-lah buktinya.

   Berkas ini MURNI dan menerima HASIL MESIN (`assetsAt` · `rollForward` ·
   `duplicateCandidates`), bukan angka yang disalin dari tampilan. Itu yang
   membuat gerbangnya berarti: ia TIDAK memanggil `rollForward()` sendiri, jadi
   kalau suatu hari layar menghitung ulang angkanya, ekspor tidak ikut berbohong.

   ROLL-FORWARD YANG GAGAL TETAP KELUAR. `residual` ≠ 0 berarti ada pergerakan
   yang tak dijelaskan komponen mana pun — itu TEMUAN, bukan alasan menahan
   berkas. Ia dinyatakan di baris totalnya DAN di `meta`, dengan kalimat yang
   sama tegasnya dengan layar. Pola menahan-atau-menyatakan mengikuti
   `bank_recon_export.ts`: kertas kerja adalah alat penelusuran selisih;
   menguncinya justru mencabut dokumen yang menjelaskan selisih itu.
   ============================================================ */
import { fmt, rp } from './data_base';
import type { AssetRegister, RollForward } from './data_fixedassets';
import { DUP_VERDICT_LABEL, type DupBoard } from './fixedassets_dup_decisions';

/* Kontrak `amsExportXlsx`. Dideklarasikan lokal — tiap kertas kerja berdiri
   sendiri; menautkannya ke modul kertas kerja lain hanya demi satu interface
   membuat dua dokumen yang tak berhubungan saling mengunci bentuk. */
export interface ExportSheet {
  name: string;
  heading?: string;
  columns: string[];
  rows: (string | number)[][];
  totals?: (string | number)[];
  colWidths?: number[];
}

export interface AssetExportModel {
  kind: 'firm-fixed-assets';
  scope: 'firm';
  fileName: string;
  firm: string;
  title: string;
  meta: string[];
  sheets: ExportSheet[];
}

export interface AssetExportInput {
  /** Hasil `assetsAt(ref, activeAssets(disposals))` — register AKTIF. */
  register: AssetRegister;
  /** Hasil `rollForward(ref, disposals)` — TIDAK dihitung ulang di sini. */
  rollFwd: RollForward;
  /** Hasil `dupBoard(duplicateCandidates(), decisions)` — kandidat BESERTA
      keputusan firma atasnya (FA2). Kosong = lembarnya tidak dipaksa ada. */
  board: DupBoard;
  /** Akun kontrol aset tetap di `FIRM_COA` (`1-400` pada PR-1). */
  glCode: string;
  glBalance: number;
  /** Nama firma dari SSOT (`useFirm().firm.name`). Kosong = ekspor DITOLAK. */
  firmName: string;
  /** Klok SSOT (`AMS.TODAY`) — tanggal penyusunan kertas kerja. */
  preparedOn: string;
  /** Nama penyusun dari sesi nyata; kosong dibiarkan kosong, bukan diisi seed. */
  preparedBy?: string;
}

const tgl = (d: Date): string =>
  d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
const bulan = (iso: string): string =>
  new Date(iso).toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });

/**
 * Model workbook untuk `amsExportXlsx`.
 *
 * Melempar bila nama firma kosong: register aset tetap adalah dokumen firma yang
 * DISEGEL, dan nama firma yang salah pada dokumen bersegel memberi otoritas pada
 * isi yang keliru. Mengisinya dengan literal adalah cara paling halus melakukan itu.
 */
export function fixedAssetsExportModel(input: AssetExportInput): AssetExportModel {
  const firm = String(input.firmName || '').trim();
  if (!firm) {
    throw new Error('fixedAssetsExportModel: nama firma kosong — kertas kerja tidak disegel tanpa identitas penerbit.');
  }
  const { register: reg, rollFwd: rf, board } = input;
  const dups = board.rows;
  /* Baris usang ikut dicetak, tetapi TIDAK dihitung sebagai kandidat: ia tak lagi
     menggambarkan register. */
  const terdeteksi = dups.filter((d) => d.detected).length;
  const glGap = input.glBalance - reg.totNbv;
  const glTied = Math.abs(glGap) < 1_000_000;

  /* ---- 1 · Register aset (tidak berubah sejak PR-1) ---- */
  const assetRows: (string | number)[][] = reg.rows.map((r) => [
    r.id, r.name, r.cat, r.standar,
    r.src === 'finance' ? 'Keuangan' : 'GA/Fasilitas',
    bulan(r.acq), r.life + 'th',
    rp(r.cost), rp(r.accDep), rp(r.nbv), (r.pct * 100).toFixed(0) + '%',
  ]);
  const registerSheet: ExportSheet = {
    name: 'Register Aset',
    columns: ['Kode', 'Aset', 'Kelas', 'Standar', 'Register Asal', 'Perolehan', 'Umur', 'Harga Perolehan', 'Ak. Penyusutan', 'Nilai Buku', 'Terpakai'],
    rows: assetRows,
    totals: ['TOTAL', '', '', '', '', '', '', rp(reg.totCost), rp(reg.totAccDep), rp(reg.totNbv), ''],
    colWidths: [10, 30, 26, 10, 14, 12, 8, 20, 20, 20, 10],
  };

  /* ---- 2 · Ringkasan kelas ---- */
  const kelasSheet: ExportSheet = {
    name: 'Ringkasan Kelas',
    columns: ['Kelas Aset', 'Standar', 'Jumlah', 'Harga Perolehan', 'Nilai Buku'],
    rows: reg.byClass.map((c) => [c.cat, c.standar, c.n, rp(c.cost), rp(c.nbv)]),
    colWidths: [26, 10, 10, 20, 20],
  };

  /* ---- 3 · Roll-forward: bagian yang dapat dinyatakan salah ----
     Nilainya diambil apa adanya dari `rf`. Tak ada aritmetika di sini selain
     tanda minus untuk kolom penyusutan & pelepasan, supaya berkas terbaca
     sebagai penambahan/pengurangan. */
  const rollSheet: ExportSheet = {
    name: 'Roll-Forward NBV',
    heading: `Roll-forward nilai buku neto ${tgl(rf.from)} → ${tgl(rf.to)} — komponen DIENUMERASI dari register, bukan diturunkan dari saldo akhir`,
    columns: ['Komponen', 'Dasar', 'Nilai'],
    rows: [
      ['NBV awal periode', `NBV per ${tgl(rf.from)} atas aset yang DIMILIKI pada tanggal itu, termasuk yang kemudian dilepas`, rp(rf.opening)],
      ['+ Penambahan (capex)', 'harga perolehan aset yang diperoleh DI DALAM jendela', rp(rf.capex)],
      ['− Beban penyusutan periode', 'beban aset yang masih dimiliki, ditambah beban aset yang dilepas s/d tanggal pelepasannya', rp(-rf.depreciation)],
      ['− Pelepasan (NBV pada tanggal pelepasan)', `${rf.disposed.length} pelepasan berstatus Selesai — rinciannya di lembar 'Pelepasan'`, rp(-rf.disposalNbv)],
      ['NBV akhir menurut komponen', 'saldo awal + capex − penyusutan − pelepasan', rp(rf.computed)],
      ['NBV akhir menurut register', `Σ NBV ${reg.rows.length} aset aktif per ${tgl(rf.to)}`, rp(rf.closing)],
    ],
    totals: [
      'Selisih (residual)',
      rf.ties
        ? 'MENUTUP — dalam toleransi Rp 1.000.000'
        : 'TIDAK MENUTUP — pergerakan sebesar ini tidak dijelaskan komponen mana pun',
      rp(rf.residual),
    ],
    colWidths: [40, 78, 22],
  };

  /* ---- 4 · Pelepasan yang menjelaskan pergerakan ----
     Lembarnya SELALU ada: nihil pelepasan adalah fakta audit tersendiri, dan
     lembar yang hilang terbaca sebagai "tidak diekspor". */
  const pelepasanSheet: ExportSheet = {
    name: 'Pelepasan',
    heading: rf.disposed.length
      ? 'Pelepasan berstatus Selesai di dalam jendela — dinilai pada TANGGAL PELEPASAN, bukan pada tanggal acuan'
      : 'NIHIL — tidak ada pelepasan berstatus Selesai di dalam jendela roll-forward',
    columns: ['ID Pelepasan', 'Kode Aset', 'Tanggal', 'NBV pada Tanggal Pelepasan'],
    rows: rf.disposed.map((d) => [d.id, d.assetId, d.date, rp(d.nbv)]),
    totals: ['TOTAL', String(rf.disposed.length) + ' pelepasan', '', rp(rf.disposalNbv)],
    colWidths: [14, 14, 14, 28],
  };

  /* ---- 5 · Kandidat pencatatan ganda + KEPUTUSAN firma (FA2) ----
     Keputusan ikut ke berkas dengan pelaku, peran, tanggal dan alasannya. Baris
     yang keputusannya sudah usang (mesin tak lagi memunculkan pasangannya) TETAP
     tercetak dan ditandai — menghapusnya berarti mengoreksi satu tanggal
     perolehan diam-diam membatalkan pemeriksaan manusia. */
  const dupSheet: ExportSheet | null = dups.length ? {
    name: 'Kandidat Pencatatan Ganda',
    heading: 'Sekelas dan diperoleh berdekatan dari DUA register yang tak pernah didamaikan — sistem tidak memutuskan; firma yang memutuskan. '
      + 'Verdict "duplikat dikonfirmasi" adalah PENGUNGKAPAN: register belum dikoreksi.',
    columns: ['Kelas', 'Kode (Keuangan)', 'Aset (Keuangan)', 'Kode (GA)', 'Aset (GA)', 'Selisih Hari', 'Nilai Gabungan', 'Deteksi', 'Keputusan', 'Oleh', 'Peran', 'Tanggal', 'Alasan'],
    rows: dups.map((d) => [
      d.cat, d.finId, d.finName, d.gaId, d.gaName, d.daysApart, rp(d.combinedCost),
      d.detected ? 'Terdeteksi' : 'Tak lagi terdeteksi',
      d.decision ? DUP_VERDICT_LABEL[d.decision.verdict] : 'Belum diputuskan',
      d.decision ? d.decision.who : '',
      d.decision ? d.decision.role : '',
      d.decision ? d.decision.when : '',
      d.decision ? d.decision.reason : '',
    ]),
    totals: [
      'TOTAL', '', '', '', '', `${terdeteksi} terdeteksi`, rp(dups.reduce((s, d) => s + d.combinedCost, 0)),
      board.stale ? `${board.stale} usang` : '', `${board.open} belum diputuskan`,
      '', '', '',
      board.confirmed
        ? `${board.confirmed} dikonfirmasi duplikat — ${rp(board.confirmedCost)} harga perolehan diakui tercatat dua kali; register BELUM dikoreksi`
        : 'Tidak ada pasangan yang dikonfirmasi duplikat',
    ],
    colWidths: [26, 12, 34, 12, 34, 12, 22, 20, 22, 20, 18, 14, 60],
  } : null;

  const sheets: ExportSheet[] = [registerSheet, kelasSheet, rollSheet, pelepasanSheet];
  if (dupSheet) sheets.push(dupSheet);

  const meta = [
    `per ${tgl(rf.to)} · ${reg.rows.length} aset · NBV Rp ${fmt(reg.totNbv / 1e9, 2)} M · penyusutan Rp ${fmt(reg.totAnnualDep / 1e6, 0)} jt/th · metode garis lurus`,
    glTied
      ? `Menutup ke kontrol GL ${input.glCode}.`
      : `TIDAK menutup ke kontrol GL ${input.glCode} — selisih Rp ${fmt(glGap / 1e6, 0)} jt belum dijelaskan.`,
    rf.ties
      ? `Roll-forward MENUTUP: NBV akhir menurut komponen sama dengan menurut register (selisih ${rp(rf.residual)}).`
      : `Roll-forward TIDAK MENUTUP — selisih ${rp(rf.residual)}. Komponennya dienumerasi dari register `
        + `(perolehan, penyusutan periode, pelepasan), bukan diturunkan dari saldo akhir; karena itu ia dapat gagal, dan kali ini gagal.`,
    dups.length
      ? `${terdeteksi} pasangan kandidat pencatatan ganda lintas-register · ${board.open} belum diputuskan`
        + `${board.stale ? ` · ${board.stale} keputusan atas pasangan yang tak lagi terdeteksi` : ''}.`
      : 'Tidak ada kandidat pencatatan ganda lintas-register.',
    board.confirmed
      ? `${board.confirmed} pasangan DIKONFIRMASI duplikat oleh firma — ${rp(board.confirmedCost)} harga perolehan diakui tercatat dua kali. `
        + 'Register BELUM dikoreksi: penghentian pengakuan menggeser saldo dan merupakan pekerjaan tersendiri (PR-2). '
        + 'Sampai itu selesai, angka harga perolehan & nilai buku di kertas kerja ini LEBIH TINGGI dari aset fisik yang ada.'
      : 'Tidak ada pasangan yang dikonfirmasi duplikat oleh firma.',
    `Disusun ${input.preparedOn}${input.preparedBy ? ' oleh ' + input.preparedBy : ''}`,
  ];

  return {
    kind: 'firm-fixed-assets',
    scope: 'firm',
    fileName: 'Register Aset Tetap Kantor.xlsx',
    firm,
    title: 'Register Aset Tetap Kantor',
    meta,
    sheets,
  };
}
