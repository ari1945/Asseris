/* [codemod] ESM imports */
import React from 'react';
import { useAmsPersist, useFirm } from './contexts.jsx';
import { I } from './icons.jsx';
import { SubBar } from './shell.jsx';
import { Badge, Btn, Panel, Seg } from './ui.jsx';

/* ============================================================
   Asseris — Management Letter (SA 265/260)
   Workflow: Draft → Diskusi Klien → Keputusan (Final ML / Tuntas)
   Surat akhir hanya memuat temuan ber-status 'final'.
   ============================================================ */
const { useState: useStateF3, useMemo: useMemoF3 } = React;

/* ---------------- Findings (sumber data awal) ---------------- */
const ML_FINDINGS_SEED = [
  {
    id: 'ML-01', title: 'Penilaian nilai realisasi neto (NRV) persediaan belum konsisten terdokumentasi',
    sev: 'Significant', area: 'Persediaan', ref: 'PSAK 14 ¶9, 28–33', pic: 'Manajer Akuntansi', target: 'Q2 2026', respStatus: 'Setuju',
    stage: 'final', decisionDate: '2026-03-04', decisionBy: 'Linda Wijaya (Manager)',
    decisionNote: 'Selisih NRV ~Rp 412 jt tetap tercatat pada SAD; defisiensi struktural perlu dilaporkan ke TCWG.',
    cond: 'Pengujian kami atas 14 dari 38 lini produk slow-moving (umur > 180 hari) menunjukkan perhitungan nilai realisasi neto (NRV) tidak didukung kertas kerja yang memadai. Estimasi harga jual neto disusun secara lisan oleh staf gudang tanpa referensi daftar harga terkini, dan tidak terdapat reviu berjenjang atas hasil perhitungan.',
    cause: 'Belum tersedia prosedur tertulis (SOP) untuk penilaian NRV persediaan dan belum ada penetapan ambang umur persediaan yang memicu pengujian penurunan nilai. Fungsi akuntansi dan gudang belum memiliki mekanisme pertukaran data harga jual aktual secara berkala.',
    criteria: 'PSAK 14: Persediaan (¶9, ¶28–33) mensyaratkan persediaan diukur pada nilai terendah antara biaya perolehan dan nilai realisasi neto, dengan penurunan ke NRV dilakukan butir-per-butir berdasarkan estimasi yang andal dan dapat diverifikasi.',
    effect: 'Persediaan berpotensi tersaji lebih (overstatement) karena cadangan penurunan nilai tidak dihitung secara konsisten. Atas sampel yang diuji, terdapat indikasi kurang cadang sekitar Rp 412 juta yang kami masukkan ke Summary of Audit Differences (SAD) sebagai selisih belum dikoreksi.',
    rec: 'Susun SOP penilaian NRV yang memuat: (a) ambang umur persediaan (mis. > 180 hari) sebagai pemicu reviu; (b) sumber harga jual neto yang dapat diverifikasi (daftar harga, kontrak, transaksi terkini); (c) reviu berjenjang oleh Manajer Akuntansi tiap kuartal; serta (d) pengarsipan kertas kerja perhitungan.',
    resp: 'Manajemen sepakat dengan temuan. SOP penilaian NRV akan disusun dan diberlakukan mulai Q2 2026 di bawah koordinasi Manajer Akuntansi. Reviu pertama akan mencakup seluruh persediaan slow-moving per 30 Juni 2026.',
  },
  {
    id: 'ML-02', title: 'Reviu jurnal manual oleh Controller tidak meninggalkan jejak yang dapat diaudit',
    sev: 'Significant', area: 'Pelaporan Keuangan', ref: 'SA 240 ¶32–33 · SA 315', pic: 'Controller', target: 'Q3 2026', respStatus: 'Setuju',
    stage: 'final', decisionDate: '2026-03-05', decisionBy: 'Rudi Gunawan (Partner)',
    decisionNote: 'Defisiensi signifikan atas pengendalian jurnal manual — wajib dikomunikasikan tertulis ke TCWG sesuai SA 265.9.',
    cond: 'Kontrol reviu atas jurnal manual oleh Controller berjalan, namun tidak meninggalkan bukti reviu (sign-off) yang dapat diaudit. Dari 64 jurnal manual material yang kami uji, 41 di antaranya tidak memiliki jejak persetujuan elektronik maupun paraf reviu pada cetakan.',
    cause: 'Modul persetujuan jurnal pada sistem ERP belum diaktifkan sehingga reviu dilakukan secara informal. Belum ada kebijakan yang menetapkan ambang nilai jurnal manual yang wajib melalui persetujuan berjenjang.',
    criteria: 'SA 240 (¶32–33) dan SA 315 mensyaratkan pengendalian atas jurnal entri manual — termasuk persetujuan dan reviu — sebagai respons terhadap risiko pengesampingan pengendalian oleh manajemen (management override).',
    effect: 'Defisiensi pengendalian ini meningkatkan risiko management override dan salah saji yang tidak terdeteksi melalui jurnal non-rutin. Sebagai respons, kami memperluas pengujian jurnal (journal entry testing) yang menambah lingkup dan waktu audit.',
    rec: 'Aktifkan modul persetujuan jurnal pada ERP dengan: (a) ambang nilai yang memicu persetujuan berjenjang; (b) sign-off elektronik dengan audit trail; dan (c) larangan posting tanpa reviewer yang berbeda dari preparer (pemisahan tugas).',
    resp: 'Manajemen sepakat. Konfigurasi modul persetujuan jurnal pada ERP sedang berlangsung dan ditargetkan aktif penuh pada akhir Q3 2026. Selama modul belum aktif, reviu manual akan didokumentasikan dengan paraf dan tanggal.',
  },
  {
    id: 'ML-03', title: 'Keterlambatan rekonsiliasi sub-buku besar piutang usaha',
    sev: 'Deficiency', area: 'Piutang Usaha', ref: 'SA 315 · COSO', pic: 'Manajer Keuangan', target: 'Jul 2026', respStatus: 'Setuju',
    stage: 'final', decisionDate: '2026-03-05', decisionBy: 'Linda Wijaya (Manager)',
    decisionNote: 'Defisiensi proses; tetap relevan dilaporkan untuk mendorong perbaikan tata kelola pelaporan bulanan.',
    cond: 'Rekonsiliasi sub-buku besar piutang usaha ke buku besar tertunda rata-rata 15 hari kerja dari jadwal internal (target 5 hari). Pada 4 dari 12 bulan, rekonsiliasi baru diselesaikan setelah tutup buku periode berikutnya.',
    cause: 'Beban kerja tim akuntansi piutang yang tinggi pada awal bulan, ketiadaan SLA formal, serta tidak adanya pemantauan atas ketepatan waktu penyelesaian rekonsiliasi.',
    criteria: 'Prinsip pengendalian internal yang baik (COSO — Control Activities) dan SA 315 mengharuskan rekonsiliasi akun signifikan dilakukan tepat waktu dan ditelaah oleh personel yang berwenang.',
    effect: 'Selisih rekonsiliasi tidak teridentifikasi dan tidak terkoreksi tepat waktu, meningkatkan risiko salah saji saldo piutang serta menghambat ketepatan pelaporan keuangan bulanan.',
    rec: 'Tetapkan SLA rekonsiliasi maksimal 5 hari kerja setelah tutup bulan, dilengkapi dashboard pemantauan item terbuka dan reviu bulanan oleh Manajer Keuangan atas pos rekonsiliasi yang belum selesai.',
    resp: 'Manajemen sepakat dan akan menerapkan SLA 5 hari kerja mulai periode Juli 2026. Dashboard pemantauan akan dibangun dengan memanfaatkan modul pelaporan ERP yang telah tersedia.',
  },
  {
    id: 'ML-04', title: 'Transaksi pihak berelasi belum diungkapkan secara lengkap',
    sev: 'Significant', area: 'Pengungkapan', ref: 'PSAK 7', pic: 'Sekretaris Perusahaan', target: 'Q3 2026', respStatus: 'Dalam Pembahasan',
    stage: 'diskusi', decisionDate: '', decisionBy: '', decisionNote: '',
    cond: 'Dua transaksi dengan pihak berelasi — pembelian jasa manajemen dari entitas sepengendali senilai Rp 1,8 miliar dan pinjaman dari pemegang saham senilai Rp 5,0 miliar — belum tercatat dalam daftar pengungkapan pihak berelasi yang disusun manajemen.',
    cause: 'Belum tersedia register pihak berelasi terpusat dan prosedur konfirmasi tahunan kepada manajemen kunci serta pemegang saham mengenai keberadaan transaksi pihak berelasi.',
    criteria: 'PSAK 7: Pengungkapan Pihak-pihak Berelasi mensyaratkan pengungkapan sifat hubungan, jenis, jumlah transaksi, dan saldo dengan pihak berelasi dalam catatan atas laporan keuangan.',
    effect: 'Risiko salah saji pengungkapan laporan keuangan. Atas kedua transaksi tersebut, manajemen telah menambahkan pengungkapan pada draf catatan laporan keuangan sebelum penerbitan.',
    rec: 'Bangun register pihak berelasi terpusat yang dimutakhirkan setiap ada perubahan, didukung prosedur konfirmasi tahunan kepada direksi, komisaris, dan pemegang saham utama mengenai transaksi berelasi.',
    resp: 'Manajemen menyetujui penambahan pengungkapan untuk dua transaksi yang teridentifikasi, namun masih mengevaluasi format dan kepemilikan register pihak berelasi. Keputusan final ditargetkan pada Q3 2026.',
  },
  {
    id: 'ML-05', title: 'Pengendalian akses fisik gudang belum ditinjau secara berkala',
    sev: 'Observation', area: 'Persediaan', ref: 'SA 315 · COSO', pic: 'Kepala Gudang', target: 'Q4 2026', respStatus: 'Dipertimbangkan',
    stage: 'final', decisionDate: '2026-03-05', decisionBy: 'Linda Wijaya (Manager)',
    decisionNote: 'Observasi tetap dicantumkan sebagai pengingat; risiko fisik dinilai rendah namun perlu perbaikan tata kelola akses.',
    cond: 'Log akses kartu masuk area gudang tidak ditinjau secara berkala. Pengamatan kami menemukan 3 kartu akses milik karyawan yang telah mengundurkan diri masih berstatus aktif pada sistem akses fisik.',
    cause: 'Belum ada prosedur penonaktifan akses fisik yang terintegrasi dengan proses offboarding kepegawaian, serta tidak ada reviu berkala atas daftar pemegang akses aktif.',
    criteria: 'COSO — pengendalian fisik atas aset — dan SA 315 menekankan pembatasan akses ke aset hanya kepada personel yang berwenang sebagai bagian dari pengendalian preventif.',
    effect: 'Risiko akses tidak sah atas persediaan dan potensi kehilangan aset. Dampak finansial saat ini dinilai rendah, namun kelemahan ini perlu diperbaiki untuk mencegah penyalahgunaan di masa depan.',
    rec: 'Integrasikan penonaktifan akses fisik ke dalam checklist offboarding kepegawaian dan lakukan reviu daftar pemegang akses gudang setiap bulan oleh Kepala Gudang.',
    resp: 'Penonaktifan tiga kartu akses telah dilakukan segera. Integrasi dengan proses offboarding akan dikaji bersama fungsi SDM dan keamanan.',
  },
  {
    id: 'ML-06', title: 'Dokumentasi reviu CALK sebelum penerbitan tidak tersedia bagi auditor',
    sev: 'Deficiency', area: 'Pelaporan Keuangan', ref: 'SA 315', pic: 'Direktur Keuangan', target: '—', respStatus: 'Tuntas saat Diskusi',
    stage: 'tuntas', decisionDate: '2026-02-28', decisionBy: 'Linda Wijaya (Manager)',
    decisionNote: 'Saat diskusi, manajemen menunjukkan checklist reviu CALK ber-tanda-tangan Direktur Keuangan untuk setiap penerbitan 3 periode terakhir. Dokumentasi memadai; semula tidak dibagikan ke tim audit karena masuk arsip rahasia internal. Tindak lanjut: salinan terbatas akan disertakan pada PBC. Temuan TIDAK dicantumkan pada Final Management Letter.',
    cond: 'Pada saat fieldwork, tim audit tidak memperoleh bukti dokumentasi reviu atas Catatan Atas Laporan Keuangan (CALK) sebelum penerbitan draf laporan keuangan.',
    cause: 'Diduga belum ada checklist reviu CALK formal yang ditandatangani oleh penelaah.',
    criteria: 'SA 315 — pengendalian atas penyusunan laporan keuangan, termasuk pengungkapan, harus didokumentasikan dan ditelaah.',
    effect: 'Berpotensi meningkatkan risiko salah saji pengungkapan yang tidak terdeteksi.',
    rec: 'Susun dan dokumentasikan checklist reviu CALK yang ditandatangani penelaah sebelum penerbitan.',
    resp: 'Selama diskusi tanggal 27 Feb 2026, manajemen menunjukkan checklist reviu CALK yang telah ditandatangani Direktur Keuangan untuk 3 periode terakhir. Dokumentasi memadai; checklist akan disertakan pada paket PBC ke depan.',
  },
  {
    id: 'ML-07', title: 'Cut-off pengakuan pendapatan akhir tahun perlu penegasan kebijakan',
    sev: 'Observation', area: 'Pendapatan', ref: 'PSAK 72', pic: 'Manajer Penjualan', target: '—', respStatus: 'Tuntas saat Diskusi',
    stage: 'tuntas', decisionDate: '2026-03-02', decisionBy: 'Rudi Gunawan (Partner)',
    decisionNote: 'Setelah penelusuran ulang, dua transaksi cut-off yang dipertanyakan ternyata telah diakui pada periode yang benar berdasarkan tanggal Bill of Lading. Tidak ada salah saji. Temuan ditarik dan TIDAK masuk Final Management Letter.',
    cond: 'Tiga transaksi pendapatan senilai Rp 920 juta di sekitar tanggal pelaporan diduga tercatat pada periode yang salah.',
    cause: 'Awalnya tidak teridentifikasi bukti pengiriman barang yang jelas pada paket konfirmasi awal.',
    criteria: 'PSAK 72 — pendapatan diakui ketika kendali atas barang/jasa dialihkan kepada pelanggan.',
    effect: 'Potensi salah saji cut-off pendapatan periode berjalan.',
    rec: 'Konfirmasi ulang ke ekspedisi dan periksa tanggal Bill of Lading untuk seluruh transaksi material akhir tahun.',
    resp: 'Manajemen menyediakan Bill of Lading lengkap. Dua transaksi terkonfirmasi sesuai periode; satu transaksi senilai Rp 180 juta dipindahkan ke periode berikutnya melalui AJE-07 (telah dikoreksi).',
  },
];

/* ---------------- Discussion threads (jejak diskusi klien-auditor) ---------------- */
const ML_DISCUSSIONS_SEED = {
  'ML-01': [
    { d: '2026-02-19', who: 'Citra Halim', role: 'auditor', org: 'Senior Auditor', note: 'Temuan disampaikan kepada Manajer Akuntansi pada exit meeting awal. Diminta tanggapan tertulis paling lambat 26 Feb 2026.' },
    { d: '2026-02-26', who: 'Dewi Kartika', role: 'client', org: 'Manajer Akuntansi (Klien)', note: 'Tanggapan tertulis: setuju atas temuan. SOP NRV akan disusun bersama tim pelaporan keuangan. Target implementasi Q2 2026. Mohon kalimat pada management letter tidak menggunakan kata "lemah".' },
    { d: '2026-03-01', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'Disetujui — diksi pada bagian Kondisi akan disempurnakan menjadi "belum konsisten terdokumentasi". Substansi dipertahankan.' },
    { d: '2026-03-04', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'KEPUTUSAN: Masuk Final ML. Selisih Rp 412 jt tetap pada SAD; defisiensi bersifat struktural sehingga perlu dikomunikasikan ke TCWG.' },
  ],
  'ML-02': [
    { d: '2026-02-20', who: 'Citra Halim', role: 'auditor', org: 'Senior Auditor', note: 'Disampaikan temuan reviu jurnal manual tidak meninggalkan jejak. Klien meminta waktu untuk verifikasi dengan vendor ERP.' },
    { d: '2026-02-27', who: 'Andri Pratama', role: 'client', org: 'Controller (Klien)', note: 'Vendor ERP mengonfirmasi modul persetujuan jurnal dapat diaktifkan dalam 4–6 minggu. Manajemen menargetkan aktif penuh akhir Q3 2026. Setuju temuan masuk ML.' },
    { d: '2026-03-05', who: 'Rudi Gunawan', role: 'auditor', org: 'Engagement Partner', note: 'KEPUTUSAN: Masuk Final ML. Klasifikasi Defisiensi Signifikan — wajib komunikasi tertulis ke TCWG (SA 265.9).' },
  ],
  'ML-03': [
    { d: '2026-02-21', who: 'Citra Halim', role: 'auditor', org: 'Senior Auditor', note: 'Temuan keterlambatan rekonsiliasi piutang disampaikan ke Manajer Keuangan.' },
    { d: '2026-02-28', who: 'Bambang Sutejo', role: 'client', org: 'Manajer Keuangan (Klien)', note: 'Setuju atas temuan. Rencana penerapan SLA 5 hari kerja efektif Juli 2026 setelah implementasi modul dashboard ERP. PIC: Asisten Manajer Akuntansi Piutang.' },
    { d: '2026-03-05', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'KEPUTUSAN: Masuk Final ML sebagai Defisiensi. Diperlukan untuk mendorong perbaikan tata kelola pelaporan.' },
  ],
  'ML-04': [
    { d: '2026-02-22', who: 'Citra Halim', role: 'auditor', org: 'Senior Auditor', note: 'Diidentifikasi dua transaksi pihak berelasi yang belum diungkap. Manajemen menambahkan pengungkapan ke draf CALK sebelum penerbitan.' },
    { d: '2026-03-01', who: 'Sari Wulandari', role: 'client', org: 'Sekretaris Perusahaan (Klien)', note: 'Pengungkapan telah ditambahkan pada draf CALK Note 28. Untuk register pihak berelasi terpusat, masih dalam pembahasan dengan Direktur Keuangan terkait kepemilikan register (Sekper vs Akuntansi).' },
    { d: '2026-03-06', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'Menunggu keputusan klien atas kepemilikan register. Akan diputuskan setelah diskusi internal klien tanggal 10 Mar 2026.' },
  ],
  'ML-05': [
    { d: '2026-02-24', who: 'Eko Saputra', role: 'auditor', org: 'Junior Auditor', note: 'Pengamatan akses gudang: 3 kartu akses mantan karyawan masih aktif. Disampaikan ke Kepala Gudang.' },
    { d: '2026-02-25', who: 'Hendro Wijoyo', role: 'client', org: 'Kepala Gudang (Klien)', note: 'Tiga kartu telah dinonaktifkan hari ini. Untuk integrasi dengan offboarding HR perlu koordinasi lintas fungsi.' },
    { d: '2026-03-05', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'KEPUTUSAN: Masuk Final ML sebagai Observasi. Tindakan korektif sudah dilakukan; observasi tetap dicantumkan untuk perbaikan tata kelola berkelanjutan.' },
  ],
  'ML-06': [
    { d: '2026-02-25', who: 'Eko Saputra', role: 'auditor', org: 'Junior Auditor', note: 'Pada fieldwork, tidak diperoleh bukti dokumentasi reviu CALK. Akan diangkat ke exit meeting sebagai indikasi defisiensi.' },
    { d: '2026-02-27', who: 'Tatang Hidayat', role: 'client', org: 'Direktur Keuangan (Klien)', note: 'Mohon penundaan — checklist reviu CALK ada di arsip rahasia. Akan saya tunjukkan pada meeting esok.' },
    { d: '2026-02-28', who: 'Tatang Hidayat', role: 'client', org: 'Direktur Keuangan (Klien)', note: 'Diperlihatkan checklist reviu CALK bertanda-tangan untuk LK 2023, 2024, 2025 (3 periode). Sudah dilakukan secara berjenjang. Mohon temuan ditarik.' },
    { d: '2026-02-28', who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit', note: 'KEPUTUSAN: TUNTAS. Bukti dokumentasi memadai. Temuan ditarik dari Final ML. Tindak lanjut: salinan terbatas akan dimasukkan ke PBC ke depan agar tidak terulang.' },
  ],
  'ML-07': [
    { d: '2026-02-26', who: 'Citra Halim', role: 'auditor', org: 'Senior Auditor', note: 'Tiga transaksi pendapatan akhir tahun teridentifikasi berpotensi salah cut-off (sample test).' },
    { d: '2026-02-28', who: 'Yanti Suryani', role: 'client', org: 'Manajer Penjualan (Klien)', note: 'Akan kami siapkan Bill of Lading dan invoice untuk seluruh transaksi material akhir tahun. Mohon waktu 2 hari kerja.' },
    { d: '2026-03-02', who: 'Yanti Suryani', role: 'client', org: 'Manajer Penjualan (Klien)', note: 'Bill of Lading sudah dilampirkan ke folder bersama. Mohon ditelaah.' },
    { d: '2026-03-02', who: 'Rudi Gunawan', role: 'auditor', org: 'Engagement Partner', note: 'KEPUTUSAN: TUNTAS. Dari 3 transaksi, 2 terkonfirmasi sesuai periode pengakuan; 1 (Rp 180 jt) dipindahkan via AJE-07. Tidak ada defisiensi sistemik. Temuan TIDAK masuk Final ML.' },
  ],
};

/* ---------------- Constants & helpers ---------------- */
const ML_SEV_KIND = { Significant: 'red', Deficiency: 'amber', Observation: 'blue' };
const ML_STAGE = {
  draft:   { label: 'Draft',           kind: 'gray',  desc: 'Belum dibahas dengan klien' },
  diskusi: { label: 'Diskusi Klien',   kind: 'amber', desc: 'Sedang dibahas dengan manajemen' },
  final:   { label: 'Masuk Final ML',  kind: 'blue',  desc: 'Diputuskan dicantumkan pada surat akhir' },
  tuntas:  { label: 'Tuntas',          kind: 'green', desc: 'Tuntas saat diskusi — dikeluarkan dari surat akhir' },
};
const ML_SECTIONS = [
  ['1', 'Kondisi', 'cond'],
  ['2', 'Sebab', 'cause'],
  ['3', 'Kriteria', 'criteria'],
  ['4', 'Akibat', 'effect'],
  ['5', 'Rekomendasi', 'rec'],
  ['6', 'Tanggapan Manajemen', 'resp'],
];
const idDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch (e) { return s; }
};
const today = () => new Date().toISOString().slice(0, 10);

/* ---------------- Finding body (six-section block) ---------------- */
function MLFinding({ f, editing, setField, idx, total }: any) {
  return (
    <div>
      {(typeof idx === 'number') && (
        <div className="mono" style={{ fontSize: 10, color: '#9aa7b0', letterSpacing: '.08em', marginBottom: 8 }}>TEMUAN {idx + 1} DARI {total}</div>
      )}
      <div className="row jb ac" style={{ marginBottom: 6, gap: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0c2430', lineHeight: 1.35 }}>{f.id} · {f.title}</span>
        <Badge kind={ML_SEV_KIND[f.sev]}>{f.sev}</Badge>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 20px', fontSize: 10.5, color: '#6a7a85', marginBottom: 16, paddingBottom: 13, borderBottom: '1px dashed #e0e4e8' }}>
        {[['Area', f.area], ['Acuan', f.ref], ['Penanggung Jawab', f.pic], ['Target Tindak Lanjut', f.target]].map(([l, v]) => (
          <span key={l}><span style={{ color: '#9aa7b0', textTransform: 'uppercase', letterSpacing: '.04em', fontSize: 9.5, fontWeight: 700 }}>{l} </span><b style={{ color: '#46555f', fontWeight: 600 }}>{v}</b></span>
        ))}
      </div>
      {ML_SECTIONS.map(([num, label, key]) => {
        const isResp = key === 'resp';
        return (
          <div key={key} style={{ display: 'flex', gap: 12, marginBottom: 13, alignItems: 'flex-start', ...(isResp ? { background: '#f1f6fa', border: '1px solid #dde7ef', borderRadius: 8, padding: '13px 15px', marginTop: 4 } : {}) }}>
            <div style={{ flex: '0 0 21px', width: 21, height: 21, borderRadius: '50%', background: isResp ? '#005085' : '#e3eef6', color: isResp ? '#fff' : '#005085', display: 'grid', placeItems: 'center', fontSize: 10.5, fontWeight: 800, marginTop: 1 }}>{num}</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="row ac jb" style={{ marginBottom: 3, gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#005085', textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</div>
              </div>
              <div
                contentEditable={editing}
                suppressContentEditableWarning
                onBlur={editing ? (e => setField(f.id, key, e.currentTarget.textContent)) : undefined}
                style={{ fontSize: 12, lineHeight: 1.62, color: isResp ? '#2a3a44' : '#16242c', outline: editing ? '1px dashed #9fc0d2' : 'none', borderRadius: 4, padding: editing ? '4px 7px' : 0, background: editing ? '#fffef5' : 'transparent', cursor: editing ? 'text' : 'default' }}
              >{f[key]}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- Discussion thread ---------------- */
function MLDiscussionThread({ items, onAdd }) {
  const [draft, setDraft] = useStateF3('');
  const [role, setRole] = useStateF3('auditor');
  return (
    <div>
      <div style={{ display: 'grid', gap: 10, paddingBottom: 4 }}>
        {(items || []).map((m, i) => {
          const isAud = m.role === 'auditor';
          const isDecision = /KEPUTUSAN/i.test(m.note);
          return (
            <div key={i} style={{ display: 'flex', gap: 10, justifyContent: isAud ? 'flex-start' : 'flex-end' }}>
              {isAud && <div style={{ flex: '0 0 28px', width: 28, height: 28, borderRadius: '50%', background: 'var(--blue)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800 }}>A</div>}
              <div style={{ maxWidth: '72%', background: isDecision ? 'var(--green-bg)' : (isAud ? 'var(--blue-050)' : 'var(--surface-2)'), border: '1px solid ' + (isDecision ? 'var(--green)' : 'var(--line)'), borderRadius: isAud ? '11px 11px 11px 3px' : '11px 11px 3px 11px', padding: '8px 11px' }}>
                <div className="row ac jb" style={{ gap: 8, marginBottom: 3 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: isDecision ? 'var(--green)' : (isAud ? 'var(--blue)' : 'var(--ink-2)') }}>{m.who} <span className="muted" style={{ fontWeight: 500 }}>· {m.org}</span></span>
                  <span className="mono tiny muted">{idDate(m.d)}</span>
                </div>
                <div style={{ fontSize: 11.5, lineHeight: 1.55, color: 'var(--ink-2)' }}>{m.note}</div>
              </div>
              {!isAud && <div style={{ flex: '0 0 28px', width: 28, height: 28, borderRadius: '50%', background: 'var(--surface-3)', color: 'var(--ink-2)', display: 'grid', placeItems: 'center', fontSize: 10, fontWeight: 800, border: '1px solid var(--line)' }}>K</div>}
            </div>
          );
        })}
        {!(items || []).length && <div className="tiny muted" style={{ padding: 12, textAlign: 'center' }}>Belum ada diskusi tercatat untuk temuan ini.</div>}
      </div>
      <div style={{ marginTop: 12, padding: 10, border: '1px solid var(--line)', borderRadius: 8, background: 'var(--surface)' }}>
        <div className="row ac gap8" style={{ marginBottom: 7 }}>
          <span className="tiny muted upper">Tambah Catatan Diskusi</span>
          <span style={{ flex: 1 }} />
          <Seg options={[{ value: 'auditor', label: 'Auditor' }, { value: 'client', label: 'Klien' }]} value={role} onChange={setRole} />
        </div>
        <textarea className="input" value={draft} onChange={e => setDraft(e.target.value)} placeholder="Catatan diskusi, kesepakatan, atau tanggapan tertulis…" style={{ width: '100%', minHeight: 60, padding: 9, resize: 'vertical', borderRadius: 6 }} />
        <div className="row jb ac" style={{ marginTop: 7 }}>
          <span className="tiny muted">Catatan akan terstempel waktu &amp; pengguna aktif.</span>
          <Btn sm variant="primary" onClick={() => { if (!draft.trim()) return; onAdd({ d: today(), who: role === 'auditor' ? 'Linda Wijaya' : 'Wakil Klien', role, org: role === 'auditor' ? 'Manager Audit' : 'Klien', note: draft.trim() }); setDraft(''); }}><I.send size={13} /> Catat</Btn>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Decision panel ---------------- */
function MLDecisionPanel({ f, onDecide, onReopen }) {
  const [note, setNote] = useStateF3('');
  const decided = f.stage === 'final' || f.stage === 'tuntas';
  return (
    <Panel title="Keputusan Auditor" sub="Apakah temuan dicantumkan pada Final ML?">
      {decided ? (
        <div style={{ padding: '4px 2px' }}>
          <div className="row ac gap8" style={{ marginBottom: 8 }}>
            <Badge kind={ML_STAGE[f.stage].kind}>{f.stage === 'final' ? <><I.check size={11} /> Masuk Final ML</> : <><I.x size={11} /> Tuntas — Dikeluarkan</>}</Badge>
          </div>
          <div style={{ display: 'grid', gap: 5, fontSize: 11.5, marginBottom: 10 }}>
            <div><span className="tiny muted upper">Tanggal &nbsp;</span><b>{idDate(f.decisionDate)}</b></div>
            <div><span className="tiny muted upper">Oleh &nbsp;</span><b>{f.decisionBy || '—'}</b></div>
            <div style={{ marginTop: 4, padding: 9, background: 'var(--surface-2)', border: '1px solid var(--line)', borderRadius: 6, lineHeight: 1.55, color: 'var(--ink-2)' }}>{f.decisionNote || <span className="muted">(tanpa catatan)</span>}</div>
          </div>
          <Btn sm onClick={onReopen}><I.sync size={13} /> Buka Kembali ke Diskusi</Btn>
        </div>
      ) : (
        <div style={{ padding: '4px 2px' }}>
          <div className="tiny muted" style={{ marginBottom: 9, lineHeight: 1.5 }}>
            Pilih keputusan setelah diskusi selesai. <b>Tuntas</b> berarti temuan diselesaikan saat diskusi dan <b>tidak akan dicantumkan</b> pada surat akhir.
          </div>
          <textarea className="input" value={note} onChange={e => setNote(e.target.value)} placeholder="Alasan keputusan (wajib dicatat untuk jejak audit)…" style={{ width: '100%', minHeight: 64, padding: 9, resize: 'vertical', borderRadius: 6, marginBottom: 8 }} />
          <div style={{ display: 'grid', gap: 6 }}>
            <button className="btn primary" style={{ width: '100%', justifyContent: 'center' }} disabled={!note.trim()} onClick={() => onDecide('final', note.trim())}>
              <I.check size={14} /> Masuk Final ML
            </button>
            <button className="btn" style={{ width: '100%', justifyContent: 'center', borderColor: 'var(--green)', color: 'var(--green)' }} disabled={!note.trim()} onClick={() => onDecide('tuntas', note.trim())}>
              <I.x size={14} /> Tuntas — Keluarkan dari ML
            </button>
          </div>
          {!note.trim() && <div className="tiny muted" style={{ marginTop: 7, color: 'var(--amber)' }}>Catatan keputusan wajib diisi.</div>}
        </div>
      )}
    </Panel>
  );
}

/* ---------------- Findings list (sidebar) ---------------- */
function MLFindingList({ findings, selId, onSel, filter, onFilter }) {
  const filtered = useMemoF3(() => filter === 'all' ? findings : findings.filter(f => f.stage === filter), [findings, filter]);
  return (
    <Panel title="Daftar Temuan" sub={`${findings.length} total`}>
      <div className="row gap6 ac wrap" style={{ padding: '0 0 8px', marginBottom: 4 }}>
        {[['all', 'Semua'], ['draft', 'Draft'], ['diskusi', 'Diskusi'], ['final', 'Final ML'], ['tuntas', 'Tuntas']].map(([v, l]) => (
          <button key={v} onClick={() => onFilter(v)} className="chip x" style={{ fontSize: 10.5, background: filter === v ? 'var(--blue)' : 'var(--surface-2)', color: filter === v ? '#fff' : 'var(--ink-3)', border: '1px solid ' + (filter === v ? 'var(--blue)' : 'var(--line)'), padding: '3px 9px', borderRadius: 11, fontWeight: 700 }}>{l}</button>
        ))}
      </div>
      <div style={{ display: 'grid', gap: 2 }}>
        {filtered.map(f => (
          <div key={f.id} onClick={() => onSel(f.id)} style={{ padding: '9px 10px', borderRadius: 7, cursor: 'pointer', background: f.id === selId ? 'var(--blue-050)' : 'transparent', border: '1px solid ' + (f.id === selId ? 'var(--blue)' : 'transparent') }}>
            <div className="row jb ac" style={{ marginBottom: 3 }}>
              <span className="mono tiny" style={{ fontWeight: 700, color: 'var(--blue)' }}>{f.id}</span>
              <Badge kind={ML_SEV_KIND[f.sev]}>{f.sev}</Badge>
            </div>
            <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.35, marginBottom: 4 }}>{f.title}</div>
            <div className="row jb ac">
              <span className="tiny muted">{f.area}</span>
              <Badge kind={ML_STAGE[f.stage].kind}>{ML_STAGE[f.stage].label}</Badge>
            </div>
          </div>
        ))}
        {!filtered.length && <div className="tiny muted" style={{ padding: 14, textAlign: 'center' }}>Tidak ada temuan pada filter ini.</div>}
      </div>
    </Panel>
  );
}

/* ---------------- Workflow view: discussion + decision ---------------- */
function MLWorkflowFull(props) {
  const { findings, discussions, selId, setSelId, setField, addDiscussion, setStage, filter, setFilter, editing, setEditing } = props;
  const [innerTab, setInnerTab] = useStateF3('detail');
  const sel = findings.find(f => f.id === selId);
  return (
    <div className="grid" style={{ gridTemplateColumns: '300px 1fr 320px', gap: 12, alignItems: 'start' }}>
      <MLFindingList findings={findings} selId={selId} onSel={(id) => { setSelId(id); }} filter={filter} onFilter={setFilter} />

      {sel ? (
        <Panel noBody>
          <div className="panel-h">
            <h3>{sel.id} · <span style={{ fontWeight: 500, color: 'var(--ink-2)' }}>{sel.title}</span></h3>
            <div style={{ flex: 1 }} />
            <Badge kind={ML_STAGE[sel.stage].kind}>{ML_STAGE[sel.stage].label}</Badge>
            <Btn sm onClick={() => setEditing(e => !e)} variant={editing ? 'primary' : ''}>{editing ? <><I.check size={12} /> Selesai</> : <><I.doc size={12} /> Edit Teks</>}</Btn>
          </div>
          <div style={{ borderBottom: '1px solid var(--line)', padding: '0 14px', display: 'flex', gap: 0 }}>
            {[['detail', 'Detail 6-Unsur', 'doc'], ['diskusi', `Diskusi Klien (${(discussions[selId] || []).length})`, 'mail']].map(([id, label, ic]) => (
              <button key={id} className={'tab' + (innerTab === id ? ' on' : '')} onClick={() => setInnerTab(id)}>
                <span className="row ac gap6">{I[ic] && React.createElement(I[ic], { size: 12 })} {label}</span>
              </button>
            ))}
          </div>
          <div style={{ padding: '16px 20px 20px', maxHeight: 'calc(100vh - 280px)', overflow: 'auto' }}>
            {innerTab === 'detail' && <MLFinding f={sel} editing={editing} setField={setField} />}
            {innerTab === 'diskusi' && <MLDiscussionThread items={discussions[selId]} onAdd={(m) => addDiscussion(selId, m)} />}
          </div>
        </Panel>
      ) : <Panel><div className="muted" style={{ padding: 18 }}>Pilih temuan dari daftar di kiri.</div></Panel>}

      {sel && (
        <div style={{ display: 'grid', gap: 12 }}>
          <MLDecisionPanel f={sel} onDecide={(stage, note) => setStage(sel.id, stage, note)} onReopen={() => setStage(sel.id, 'diskusi', '')} />
          <Panel title="Klasifikasi (SA 265)">
            <div style={{ display: 'grid', gap: 7, fontSize: 11.5, padding: '2px 0' }}>
              <div className="row jb ac"><span className="muted">Severitas</span><Badge kind={ML_SEV_KIND[sel.sev]}>{sel.sev}</Badge></div>
              <div className="row jb ac"><span className="muted">Area</span><b>{sel.area}</b></div>
              <div className="row jb ac"><span className="muted">Acuan</span><b className="mono tiny">{sel.ref}</b></div>
              <div className="row jb ac"><span className="muted">PIC Klien</span><b>{sel.pic}</b></div>
              <div className="row jb ac"><span className="muted">Target TL</span><b>{sel.target}</b></div>
            </div>
          </Panel>
          <Panel title="Tindakan">
            <div style={{ display: 'grid', gap: 6 }}>
              <Btn sm onClick={() => alert('Mengirim ringkasan diskusi ke ' + sel.pic + ' (mock).')}><I.send size={12} /> Kirim Ringkasan ke PIC</Btn>
              <Btn sm onClick={() => alert('Mengaitkan ke kertas kerja terkait (mock).')}><I.link2 size={12} /> Tautkan ke Kertas Kerja</Btn>
              <Btn sm onClick={() => alert('Mock: menjadwalkan exit-meeting follow-up.')}><I.calendar size={12} /> Jadwalkan Follow-up</Btn>
            </div>
          </Panel>
        </div>
      )}
    </div>
  );
}

/* ---------------- Letter preview ---------------- */
function MLLetter({ findings, activeClient, activeEngagement, viewMode, editing, setField, allFindings }) {
  const visible = viewMode === 'final' ? findings.filter(f => f.stage === 'final') : findings.filter(f => f.stage !== 'tuntas');
  const excluded = allFindings.filter(f => f.stage === 'tuntas');
  return (
    <div style={{ background: '#e7eaef', padding: 18 }}>
      <div className="doc-paper" style={{ background: '#fff', maxWidth: 760, margin: '0 auto', padding: '40px 48px', boxShadow: 'var(--shadow)', fontSize: 12, color: '#16242c', lineHeight: 1.6 }}>
        <div className="row jb" style={{ alignItems: 'flex-start', marginBottom: 22, paddingBottom: 16, borderBottom: '2px solid #0c2430', gap: 16 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0c2430', whiteSpace: 'nowrap', lineHeight: 1.25 }}>KAP Wijaya Hartono &amp; Rekan</div>
            <div style={{ fontSize: 10.5, color: '#7a8893', marginTop: 2 }}>Registered Public Accountants</div>
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: '#7a8893', textAlign: 'right', whiteSpace: 'nowrap', flex: '0 0 auto' }}>
            {activeEngagement?.id}<br />{viewMode === 'final' ? '14 Maret 2026' : 'DRAFT — ' + idDate(today())}
          </div>
        </div>
        {viewMode === 'draft' && (
          <div style={{ background: '#fff8e1', border: '1px solid #f0d27a', color: '#7a5a00', padding: '9px 13px', borderRadius: 6, fontSize: 11.5, marginBottom: 16, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <I.alert size={14} style={{ flex: '0 0 14px', marginTop: 1 }} />
            <div>
              <b>Pratinjau DRAFT.</b> Menampilkan {visible.length} temuan yang sedang dibahas/akan masuk surat akhir. {excluded.length > 0 && <>Temuan tuntas saat diskusi ({excluded.length}) telah dikeluarkan otomatis sesuai keputusan auditor.</>}
            </div>
          </div>
        )}
        <div style={{ marginBottom: 14 }}>
          Kepada Yth. <b>Dewan Komisaris &amp; Komite Audit</b><br />{activeClient?.name}<br />{activeClient?.city}
        </div>
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Perihal: Surat Manajemen (Management Letter) — Audit {activeEngagement?.fy}</div>
        <p style={{ margin: '0 0 8px' }}>
          Dalam rangka audit kami atas laporan keuangan {activeClient?.name} untuk tahun yang berakhir 31 Desember 2025, kami mengidentifikasi sejumlah hal terkait pengendalian internal dan praktik akuntansi yang ingin kami sampaikan untuk perbaikan. Sesuai SA 265 dan SA 260, setiap temuan kami uraikan menurut <b>enam unsur</b>: Kondisi, Sebab, Kriteria, Akibat, Rekomendasi, dan Tanggapan Manajemen.
        </p>
        <p style={{ margin: '0 0 8px', color: '#52616b', fontSize: 11.5 }}>
          Hal-hal berikut tidak memengaruhi opini audit kami atas laporan keuangan.
        </p>

        {/* Daftar ringkas */}
        <div style={{ background: '#f7f9fb', border: '1px solid #e0e7ee', borderRadius: 8, padding: '12px 16px', margin: '14px 0 20px' }}>
          <div style={{ fontSize: 10.5, color: '#005085', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 7 }}>Daftar Pokok Temuan</div>
          <ol style={{ margin: 0, paddingLeft: 20, fontSize: 11.5, lineHeight: 1.7 }}>
            {visible.map(f => (
              <li key={f.id} style={{ marginBottom: 2 }}>
                <b style={{ color: '#0c2430' }}>{f.title}</b> <span style={{ color: '#7a8893' }}>— {f.sev} · {f.area}</span>
              </li>
            ))}
            {!visible.length && <li style={{ color: '#a0acb5', fontStyle: 'italic' }}>Tidak ada temuan untuk dilaporkan.</li>}
          </ol>
        </div>

        {visible.map((f, i) => (
          <div key={f.id} style={{ borderTop: '1px solid #e0e4e8', paddingTop: 18, marginTop: i ? 22 : 0 }}>
            <MLFinding f={f} editing={editing} setField={setField} idx={i} total={visible.length} />
          </div>
        ))}

        {viewMode === 'draft' && excluded.length > 0 && (
          <div style={{ marginTop: 26, paddingTop: 16, borderTop: '1px dashed #c0cad3' }}>
            <div style={{ fontSize: 10.5, color: '#1f7a4d', fontWeight: 800, letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 9 }}>Tuntas Saat Diskusi — Tidak Dicantumkan pada Surat Akhir</div>
            <div style={{ display: 'grid', gap: 8 }}>
              {excluded.map(f => (
                <div key={f.id} style={{ padding: '10px 12px', background: '#f3f9f5', border: '1px solid #cfe6d8', borderRadius: 6 }}>
                  <div className="row jb ac" style={{ marginBottom: 3 }}>
                    <b style={{ fontSize: 12, color: '#0c2430' }}>{f.id} · {f.title}</b>
                    <span className="mono tiny" style={{ color: '#1f7a4d' }}>Tuntas {idDate(f.decisionDate)}</span>
                  </div>
                  <div style={{ fontSize: 11, lineHeight: 1.55, color: '#46555f' }}>{f.decisionNote}</div>
                </div>
              ))}
            </div>
            <div className="tiny" style={{ marginTop: 10, color: '#7a8893', fontStyle: 'italic' }}>
              Catatan: bagian ini hanya tampil pada mode DRAFT internal sebagai jejak audit; tidak tercetak pada surat akhir yang dikirim ke TCWG.
            </div>
          </div>
        )}

        <p style={{ margin: '22px 0 0', paddingTop: 14, borderTop: '1px solid #e0e4e8', color: '#52616b', fontSize: 11.5 }}>
          Surat ini memuat {visible.length} temuan beserta tanggapan manajemen. Kami mengapresiasi kerja sama tim manajemen dan siap membahas tindak lanjut lebih lanjut pada pertemuan terpisah.
        </p>
        <div style={{ marginTop: 18 }}>
          Hormat kami,<br /><b>{activeEngagement?.partner}</b><br /><span style={{ color: '#7a8893', fontSize: 11 }}>Engagement Partner</span>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Stat strip ---------------- */
function MLStatStrip({ findings }) {
  const c = {
    total: findings.length,
    draft: findings.filter(f => f.stage === 'draft').length,
    diskusi: findings.filter(f => f.stage === 'diskusi').length,
    final: findings.filter(f => f.stage === 'final').length,
    tuntas: findings.filter(f => f.stage === 'tuntas').length,
    sig: findings.filter(f => f.sev === 'Significant' && f.stage === 'final').length,
  };
  return (
    <Panel noBody>
      <div style={{ display: 'flex', gap: 0 }}>
        {[
          ['Total Temuan', c.total, 'var(--ink-2)'],
          ['Draft', c.draft, 'var(--ink-3)'],
          ['Diskusi Klien', c.diskusi, 'var(--amber)'],
          ['Masuk Final ML', c.final, 'var(--blue)'],
          ['Tuntas (Dikeluarkan)', c.tuntas, 'var(--green)'],
          ['Signifikan di Final', c.sig, 'var(--red)'],
        ].map(([l, n, color], i) => (
          <div key={l} style={{ flex: 1, padding: '11px 12px', textAlign: 'center', borderLeft: i ? '1px solid var(--line-soft)' : 0 }}>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{n}</div>
            <div className="tiny muted" style={{ marginTop: 3 }}>{l}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}

/* ============================================================
   Main: ManagementLetter
   ============================================================ */
function ManagementLetter() {
  const { activeClient, activeEngagement } = useFirm();
  const persist = useAmsPersist;
  const [findings, setFindings] = persist('mgmtletter.findings.v2', ML_FINDINGS_SEED);
  const [discussions, setDiscussions] = persist('mgmtletter.discussions.v2', ML_DISCUSSIONS_SEED);
  const [tab, setTab] = useStateF3('workflow');
  const [selId, setSelId] = useStateF3('ML-01');
  const [filter, setFilter] = useStateF3('all');
  const [editing, setEditing] = useStateF3(false);
  const [previewMode, setPreviewMode] = useStateF3('final');

  const setField = (id, k, v) => setFindings(list => list.map(f => f.id === id ? { ...f, [k]: v } : f));
  const setStage = (id, stage, note) => {
    setFindings(list => list.map(f => f.id === id ? {
      ...f,
      stage,
      decisionDate: stage === 'diskusi' ? '' : today(),
      decisionBy: stage === 'diskusi' ? '' : 'Linda Wijaya (Manager)',
      decisionNote: stage === 'diskusi' ? '' : note,
    } : f));
    if (stage !== 'diskusi' && note) {
      const stamp = {
        d: today(), who: 'Linda Wijaya', role: 'auditor', org: 'Manager Audit',
        note: 'KEPUTUSAN: ' + (stage === 'final' ? 'Masuk Final ML' : 'Tuntas — dikeluarkan dari surat akhir') + '. ' + note,
      };
      setDiscussions(prev => ({ ...prev, [id]: [...(prev[id] || []), stamp] }));
    }
  };
  const addDiscussion = (id, m) => setDiscussions(prev => ({ ...prev, [id]: [...(prev[id] || []), m] }));

  const finalCount = findings.filter(f => f.stage === 'final').length;
  const pendingCount = findings.filter(f => f.stage === 'diskusi' || f.stage === 'draft').length;

  return (
    <>
      <SubBar moduleId="mgmtletter" right={
        <div className="row gap8 ac">
          <Badge kind="blue">SA 265 · SA 260</Badge>
          <Badge kind={pendingCount ? 'amber' : 'green'}>{finalCount} masuk · {pendingCount} diskusi</Badge>
          {tab === 'preview' && <Seg options={[{ value: 'final', label: 'Surat Final' }, { value: 'draft', label: 'Draft Internal' }]} value={previewMode} onChange={setPreviewMode} />}
          {tab === 'preview' && <Btn sm onClick={() => window.amsPrintDoc()}><I.download size={13} /> Export PDF</Btn>}
          {tab === 'preview' && previewMode === 'final' && <Btn sm variant="primary" disabled={pendingCount > 0} title={pendingCount > 0 ? 'Selesaikan ' + pendingCount + ' temuan dalam diskusi dulu' : ''}><I.send size={14} /> Kirim ke TCWG</Btn>}
        </div>
      } />

      <div style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--line)', padding: '0 16px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {[
            ['workflow', 'Diskusi & Keputusan', 'mail', pendingCount],
            ['preview', 'Pratinjau Surat', 'doc', finalCount],
          ].map(([id, label, ic, count]) => (
            <button key={id} className={'msub-tab' + (tab === id ? ' on' : '')} onClick={() => setTab(id)}>
              <span className="row ac gap6">{I[ic] && React.createElement(I[ic], { size: 13 })} {label}</span>
              {count > 0 && <span className="mscount">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      <div className="view-scroll"><div className="view-pad">
        <div style={{ marginBottom: 12 }}><MLStatStrip findings={findings} /></div>

        {tab === 'workflow' && (
          <MLWorkflowFull
            findings={findings}
            discussions={discussions}
            selId={selId}
            setSelId={setSelId}
            setField={setField}
            addDiscussion={addDiscussion}
            setStage={setStage}
            filter={filter}
            setFilter={setFilter}
            editing={editing}
            setEditing={setEditing}
          />
        )}

        {tab === 'preview' && (
          <Panel noBody>
            <MLLetter
              findings={findings}
              allFindings={findings}
              activeClient={activeClient}
              activeEngagement={activeEngagement}
              viewMode={previewMode}
              editing={editing}
              setField={setField}
            />
          </Panel>
        )}
      </div></div>
    </>
  );
}

Object.assign(window, { ManagementLetter, ML_FINDINGS_SEED });


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export { ML_FINDINGS_SEED, ManagementLetter };
