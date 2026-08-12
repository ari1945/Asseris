/* ============================================================
   Tahap 8 — PROGRAMME (audit programme seed) pindah KE SINI dari
   view_cockpit.tsx (yang menjadi lazy chunk). Konsumen eager
   (ai_insights, diagnostics_panel) memakainya lewat import ESM,
   bukan window.PROGRAMME yang hanya terisi setelah chunk dimuat.
   view_cockpit mengimpor + mengekspor ulang untuk kompatibilitas.
   ============================================================ */
export const PROGRAMME = [
  { riskId: 'R-01', area: 'Pendapatan', sig: true, fraud: true, procs: [
    { id: 'P-01', t: 'Pengujian pisah batas (cut-off) penjualan 10 hari sebelum/sesudah tutup buku', nat: 'ToD', asr: ['EO', 'CO'], timing: 'Akhir tahun', extent: '25 dokumen', sa: 'SA 330', wp: 'B-3', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 8, act: 7.5, exc: 1, status: 'done', concl: 'Tiga dokumen tercatat di periode salah; usulan AJE No.4 (Rp 1,9M) telah dibukukan. Cut-off memadai setelah penyesuaian.' },
    { id: 'P-02', t: 'Konfirmasi piutang positif untuk 18 saldo signifikan & rekonsiliasi selisih', nat: 'Confirm', asr: ['EO', 'RO'], timing: 'Akhir tahun', extent: '18 saldo (62% nilai)', sa: 'SA 505', wp: 'B-5', prep: 'Fajar Nugroho', rev: 'Dimas Raharjo', bud: 12, act: 9, exc: 0, status: 'progress', concl: '14 dari 18 konfirmasi kembali tanpa selisih. 4 saldo menunggu balasan — prosedur alternatif (vouching penerimaan kas) sedang berjalan.' },
    { id: 'P-03', t: 'Prosedur analitis substantif: tren margin kotor per lini produk vs ekspektasi', nat: 'SAP', asr: ['EO', 'C'], timing: 'Interim', extent: 'Disagregasi 6 lini', sa: 'SA 520', wp: 'B-2', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 4, act: 4, exc: 0, status: 'done', concl: 'Variasi margin per lini berada dalam threshold ekspektasi (±3%). Tidak ada indikasi salah saji material.' },
    { id: 'P-04', t: 'Vouching dokumen pengiriman atas penjualan signifikan akhir tahun', nat: 'ToD', asr: ['EO'], timing: 'Akhir tahun', extent: '30 transaksi', sa: 'SA 500', wp: 'B-3', prep: 'Fajar Nugroho', rev: 'Dimas Raharjo', bud: 6, act: 3, exc: 1, status: 'progress', concl: '' },
  ]},
  { riskId: 'R-02', area: 'Persediaan', sig: true, fraud: false, procs: [
    { id: 'P-05', t: 'Observasi perhitungan fisik (stock opname) & test count dua arah', nat: 'Obs', asr: ['EO', 'C'], timing: 'Akhir tahun', extent: '40 item', sa: 'SA 501', wp: 'C-1', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 10, act: 10, exc: 0, status: 'done', concl: 'Hadir saat opname 31 Des. Selisih test count nihil. Prosedur pisah batas penerimaan/pengeluaran gudang memadai.' },
    { id: 'P-06', t: 'Uji nilai realisasi neto (NRV) atas item slow-moving & usang', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: '22 SKU', sa: 'SA 540', wp: 'C-2', prep: 'Sinta Wulandari', rev: 'Dimas Raharjo', bud: 8, act: 6, exc: 2, status: 'progress', concl: '' },
    { id: 'P-07', t: 'Rekonsiliasi kuantitas perpetual vs hasil fisik & telaah penyesuaian', nat: 'ToD', asr: ['C', 'EO'], timing: 'Akhir tahun', extent: 'Populasi penuh', sa: 'SA 500', wp: 'C-3', prep: 'Fajar Nugroho', rev: 'Sinta Wulandari', bud: 5, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-03', area: 'Piutang Usaha — ECL', sig: true, fraud: false, procs: [
    { id: 'P-08', t: 'Re-perform model ECL (PSAK 71) & uji loss rate per bucket aging', nat: 'Recalc', asr: ['V'], timing: 'Akhir tahun', extent: 'Model penuh', sa: 'SA 540', wp: 'B-7', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 14, act: 13, exc: 0, status: 'review', concl: 'Re-kalkulasi independen selisih 0,4% dari angka manajemen — dalam toleransi. Menunggu review akhir partner.' },
    { id: 'P-09', t: 'Uji aging piutang ke dokumen sumber & validitas bucket', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: '35 saldo', sa: 'SA 500', wp: 'B-6', prep: 'Fajar Nugroho', rev: 'Anindya Pramesti', bud: 6, act: 6, exc: 0, status: 'done', concl: 'Seluruh sampel aging tervalidasi ke faktur & tanggal jatuh tempo. Tidak ada misclassification.' },
  ]},
  { riskId: 'R-04', area: 'Aset Tetap', sig: false, fraud: false, procs: [
    { id: 'P-10', t: 'Vouching penambahan aset & inspeksi fisik atas sampel', nat: 'ToD', asr: ['EO', 'RO'], timing: 'Akhir tahun', extent: '20 penambahan', sa: 'SA 500', wp: 'E-4', prep: 'Rina Kusuma', rev: 'Dimas Raharjo', bud: 6, act: 5, exc: 0, status: 'progress', concl: '' },
    { id: 'P-11', t: 'Uji penghentian/pelepasan aset & ketepatan penghapusbukuan', nat: 'ToD', asr: ['C', 'EO'], timing: 'Akhir tahun', extent: '12 pelepasan', sa: 'SA 500', wp: 'E-5', prep: 'Rina Kusuma', rev: 'Dimas Raharjo', bud: 4, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-05', area: 'Management Override', sig: true, fraud: true, procs: [
    { id: 'P-12', t: 'Journal Entry Testing (SA 240) atas jurnal manual berkriteria risiko', nat: 'ToD', asr: ['EO', 'V', 'P'], timing: 'Akhir tahun', extent: 'Filter risiko populasi penuh', sa: 'SA 240', wp: 'JE-1', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 12, act: 8, exc: 3, status: 'progress', concl: '' },
    { id: 'P-13', t: 'Telaah retrospektif estimasi akuntansi atas indikasi bias manajemen', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: 'Seluruh estimasi signifikan', sa: 'SA 540', wp: 'JE-2', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 8, act: 0, exc: 0, status: 'notstarted', concl: '' },
    { id: 'P-14', t: 'Evaluasi transaksi signifikan di luar kegiatan bisnis normal', nat: 'Inq', asr: ['EO', 'P'], timing: 'Akhir tahun', extent: 'Ad hoc per identifikasi', sa: 'SA 240', wp: 'JE-3', prep: 'Anindya Pramesti', rev: 'Hartono Wijaya', bud: 5, act: 0, exc: 0, status: 'notstarted', concl: '' },
  ]},
  { riskId: 'R-06', area: 'Sewa (PSAK 73)', sig: false, fraud: false, procs: [
    { id: 'P-15', t: 'Telaah kontrak sewa baru & re-kalkulasi liabilitas / aset hak-guna', nat: 'Recalc', asr: ['C', 'V'], timing: 'Interim', extent: '8 kontrak', sa: 'SA 540', wp: 'F-1', prep: 'Sinta Wulandari', rev: 'Dimas Raharjo', bud: 7, act: 7, exc: 0, status: 'done', concl: 'Seluruh kontrak baru teridentifikasi & dikapitalisasi. Re-kalkulasi sesuai dalam batas trivial.' },
  ]},
  { riskId: 'R-07', area: 'Imbalan Kerja', sig: false, fraud: false, procs: [
    { id: 'P-16', t: 'Evaluasi laporan aktuaria & kewajaran asumsi (SA 500/620)', nat: 'ToD', asr: ['V'], timing: 'Akhir tahun', extent: 'Laporan penuh', sa: 'SA 500', wp: 'H-2', prep: 'Sinta Wulandari', rev: 'Anindya Pramesti', bud: 6, act: 3, exc: 0, status: 'progress', concl: '' },
  ]},
  { riskId: 'R-08', area: 'Pihak Berelasi', sig: false, fraud: false, procs: [
    { id: 'P-17', t: 'Pengujian kelengkapan daftar & konfirmasi transaksi pihak berelasi', nat: 'Confirm', asr: ['C', 'P'], timing: 'Akhir tahun', extent: 'Daftar lengkap', sa: 'SA 550', wp: 'RP-1', prep: 'Dimas Raharjo', rev: 'Anindya Pramesti', bud: 5, act: 2, exc: 1, status: 'progress', concl: '' },
  ]},
];
