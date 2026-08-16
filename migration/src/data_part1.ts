/* ============================================================
   Asseris — data part1 (seed + engine) (W3 split dari data.js; perilaku identik).
   ============================================================ */
import { CPE_EXT, STAFF_EXT } from './data_roster';
import { coolOffState, regimeOf as rotationRegimeOf, rotationState } from './canon_rotation';

  const FIRM = {
    name: 'KAP Wijaya Hartono & Rekan',
    short: 'WHR',
    license: 'Izin KAP No. 1142/KM.1/2019',
    /* PRD sdm-kepatuhan PR-4 — `partners: 6, managers: 11, staff: 58` DICABUT
       sebagai literal. Jumlahnya 75, sementara `HCM_ANALYTICS.gradeMix` di
       berkas sebelah berbunyi 69 dan roster nyata berisi 10: TIGA jumlah
       karyawan untuk satu firma, dan dua di antaranya tak sepakat satu sama
       lain. Kini ketiganya DITURUNKAN dari roster yang sama.

       Getter (bukan nilai) karena `STAFF` dideklarasikan setelah blok ini;
       pembacaannya selalu terjadi setelah modul selesai dimuat. */
    get partners() { return STAFF.filter((s) => s.grade === 'Partner').length; },
    get managers() { return STAFF.filter((s) => s.grade === 'Manager').length; },
    /* `staff` = personel di luar Partner & Manager. Angka lama 58 tak menutup
       ke apa pun: 6+11+58 = 75 ≠ 69 ≠ 10. */
    get staff() { return STAFF.filter((s) => s.grade !== 'Partner' && s.grade !== 'Manager').length; },
  };

  const USER = {
    name: 'Anindya Pramesti', initials: 'AP', role: 'Audit Manager',
    title: 'Audit Manager', email: 'anindya.p@whr-cpa.id', phone: '+62 812-3456-7890',
    photo: (null as any),
    employeeId: 'WHR-AM-0142',
    department: 'Jasa Asurans (Assurance)',
    office: 'Jakarta — Kantor Pusat',
    joinDate: '04 Maret 2019',
    reportsTo: 'Hartono Wijaya, CPA · Engagement Partner',
    apNumber: 'AP.1284',
    stan: 'STAN-12.3456',
    iapiNumber: 'IAPI-2284',
    cpaSince: '2017',
    cpeHours: 38, cpeTarget: 40,
    languages: 'Indonesia · English',
  };

  /* ---- Clients ---- */
  const CLIENTS = [
    { id: 'C-014', name: 'PT Sentosa Makmur Tbk', industry: 'Manufaktur · Consumer Goods', tier: 'Tier 1', risk: 'High', npwp: '01.234.567.8-045.000', city: 'Bekasi, Jawa Barat', listed: true, since: 2016, partner: 'Hartono Wijaya, CPA', fee: 1_850_000_000, status: 'Active' },
    { id: 'C-022', name: 'PT Cahaya Logistik Nusantara', industry: 'Transportasi & Logistik', tier: 'Tier 2', risk: 'Medium', npwp: '02.811.450.1-091.000', city: 'Surabaya, Jawa Timur', listed: false, since: 2019, partner: 'Sari Dewanti, CPA', fee: 720_000_000, status: 'Active' },
    { id: 'C-031', name: 'PT Bumi Hijau Agrindo', industry: 'Agribisnis · Perkebunan', tier: 'Tier 2', risk: 'High', npwp: '03.119.882.4-431.000', city: 'Pekanbaru, Riau', listed: true, since: 2020, partner: 'Hartono Wijaya, CPA', fee: 1_120_000_000, status: 'Active' },
    { id: 'C-040', name: 'PT Mandiri Sejahtera Finance', industry: 'Jasa Keuangan · Multifinance', tier: 'Tier 1', risk: 'High', npwp: '01.557.203.9-058.000', city: 'Jakarta Selatan', listed: true, since: 2017, partner: 'Rudi Gunawan, CPA', fee: 2_340_000_000, status: 'Active' },
    { id: 'C-047', name: 'PT Teknologi Andalan Digital', industry: 'Teknologi · SaaS', tier: 'Tier 3', risk: 'Medium', npwp: '04.220.118.6-013.000', city: 'Bandung, Jawa Barat', listed: false, since: 2022, partner: 'Sari Dewanti, CPA', fee: 410_000_000, status: 'Active' },
    { id: 'C-052', name: 'PT Karya Beton Perkasa', industry: 'Konstruksi & Material', tier: 'Tier 2', risk: 'Medium', npwp: '02.901.337.2-407.000', city: 'Semarang, Jawa Tengah', listed: false, since: 2021, partner: 'Hartono Wijaya, CPA', fee: 640_000_000, status: 'Proposal' },
    { id: 'C-058', name: 'PT Samudra Pangan Lestari', industry: 'Manufaktur · F&B', tier: 'Tier 2', risk: 'Low', npwp: '03.445.901.7-622.000', city: 'Medan, Sumatera Utara', listed: false, since: 2018, partner: 'Rudi Gunawan, CPA', fee: 580_000_000, status: 'Active' },
    { id: 'C-063', name: 'PT Graha Properti Investama', industry: 'Properti & Real Estate', tier: 'Tier 1', risk: 'High', npwp: '01.778.224.0-079.000', city: 'Jakarta Pusat', listed: true, since: 2015, partner: 'Rudi Gunawan, CPA', fee: 1_640_000_000, status: 'Active' },
  ];

  /* ---- Engagements ---- */
  const ENGAGEMENTS = [
    { id: 'ENG-2025-014', clientId: 'C-014', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA (ISA-converged)', status: 'Fieldwork', phase: 'Eksekusi', progress: 62, partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', /* PR-A — 4_250_000_000 ditala ke OM fantasi 4.260 jt (5% × PBT 85.200 jt yang
        di-hardcode), selisih 0,235% → tepat di bawah ambang drift 0,5%, sehingga
        satu-satunya alarm yang bisa menangkap cacat itu dibungkam. Benchmark kini
        turunan WTB: 5% × PBT unadj 29.690 jt = 1.484,5 jt → dibulatkan 1.485 jt. */
      deadline: '2026-03-31', budgetHrs: 1840, actualHrs: 1146, risk: 'High', materiality: 1_485_000_000 },
    { id: 'ENG-2025-040', clientId: 'C-040', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA + PSAK 71', status: 'Planning', phase: 'Perencanaan', progress: 28, partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', deadline: '2026-04-15', budgetHrs: 2200, actualHrs: 615, risk: 'High', materiality: 6_800_000_000 },
    { id: 'ENG-2025-031', clientId: 'C-031', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA + PSAK 73', status: 'Fieldwork', phase: 'Eksekusi', progress: 54, partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', deadline: '2026-04-30', budgetHrs: 1480, actualHrs: 812, risk: 'High', materiality: 3_100_000_000 },
    { id: 'ENG-2025-063', clientId: 'C-063', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA', status: 'Review', phase: 'Finalisasi', progress: 88, partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', deadline: '2026-03-15', budgetHrs: 1660, actualHrs: 1588, risk: 'High', materiality: 5_200_000_000 },
    { id: 'ENG-2025-022', clientId: 'C-022', type: 'Review (SPR 2400)', fy: 'FY2025', standard: 'SPR 2400', status: 'Fieldwork', phase: 'Eksekusi', progress: 45, partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', deadline: '2026-05-31', budgetHrs: 640, actualHrs: 290, risk: 'Medium', materiality: 1_400_000_000 },
    { id: 'ENG-2025-058', clientId: 'C-058', type: 'Audit Laporan Keuangan', fy: 'FY2025', standard: 'SA', status: 'Completed', phase: 'Arsip', progress: 100, partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', deadline: '2026-02-28', budgetHrs: 980, actualHrs: 945, risk: 'Low', materiality: 1_650_000_000 },
    { id: 'ENG-2025-047', clientId: 'C-047', type: 'Agreed-Upon Procedures', fy: 'FY2025', standard: 'SJAH 3000', status: 'Planning', phase: 'Perencanaan', progress: 15, partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', deadline: '2026-06-30', budgetHrs: 420, actualHrs: 48, risk: 'Medium', materiality: 720_000_000 },
  ];

  /* ---- Active engagement: PT Sentosa Makmur (ENG-2025-014) ---- */
  /* Working Trial Balance — grouped by FS caption */
  const WTB = [
    // group, code, name, ly(prior audited), unadjusted(current), aje, lead
    ['Aset Lancar', '1-1100', 'Kas dan Setara Kas', 18_420_500_000, 21_905_300_000, 0, 'A'],
    ['Aset Lancar', '1-1200', 'Piutang Usaha — Pihak Ketiga', 42_180_900_000, 51_322_400_000, -1_850_000_000, 'B'],
    ['Aset Lancar', '1-1210', 'Cadangan Kerugian Penurunan Nilai', -2_109_000_000, -1_980_000_000, -620_000_000, 'B'],
    ['Aset Lancar', '1-1300', 'Persediaan', 64_550_200_000, 78_904_100_000, -2_340_000_000, 'C'],
    ['Aset Lancar', '1-1400', 'Pajak Dibayar di Muka', 3_902_100_000, 4_551_800_000, 0, 'D'],
    ['Aset Lancar', '1-1500', 'Biaya Dibayar di Muka', 1_780_400_000, 2_104_600_000, 0, 'D'],
    ['Aset Tidak Lancar', '1-2100', 'Aset Tetap — Harga Perolehan', 183_209_000_000, 200_339_700_000, 0, 'E'],
    ['Aset Tidak Lancar', '1-2110', 'Akumulasi Penyusutan', -50_860_000_000, -57_180_000_000, -1_120_000_000, 'E'],
    ['Aset Tidak Lancar', '1-2400', 'Aset Takberwujud — Harga Perolehan', 8_400_000_000, 9_600_000_000, 0, 'EI'],
    ['Aset Tidak Lancar', '1-2410', 'Akumulasi Amortisasi', -3_360_000_000, -4_700_000_000, 0, 'EI'],
    ['Aset Tidak Lancar', '1-2300', 'Aset Hak-Guna (PSAK 73)', 0, 12_640_000_000, 0, 'F'],
    ['Aset Tidak Lancar', '1-2500', 'Aset Pajak Tangguhan', 4_110_000_000, 4_980_000_000, 0, 'G'],
    ['Liabilitas Jk. Pendek', '2-1100', 'Utang Usaha', -38_220_700_000, -44_900_300_000, 0, 'AA'],
    ['Liabilitas Jk. Pendek', '2-1200', 'Utang Bank Jangka Pendek', -25_000_000_000, -31_500_000_000, 0, 'BB'],
    ['Liabilitas Jk. Pendek', '2-1300', 'Beban Akrual', -6_440_200_000, -8_120_900_000, -980_000_000, 'CC'],
    ['Liabilitas Jk. Pendek', '2-1400', 'Utang Pajak', -4_980_300_000, -6_220_100_000, 0, 'DD'],
    ['Liabilitas Jk. Pendek', '2-1500', 'Liabilitas Sewa — Jk. Pendek', 0, -3_180_000_000, 0, 'F'],
    ['Liabilitas Jk. Panjang', '2-2100', 'Utang Bank Jangka Panjang', -42_000_000_000, -38_500_000_000, 0, 'BB'],
    ['Liabilitas Jk. Panjang', '2-2200', 'Liabilitas Sewa — Jk. Panjang', 0, -9_620_000_000, 0, 'F'],
    ['Liabilitas Jk. Panjang', '2-2300', 'Liabilitas Imbalan Kerja', -11_220_000_000, -13_080_000_000, 0, 'H'],
    ['Ekuitas', '3-1100', 'Modal Saham', -60_000_000_000, -60_000_000_000, 0, 'K'],
    /* PR-I3 Fase D — saldo laba dulu −100.456,6 jt: saldo PENUTUP (sudah memuat laba
       berjalan) sementara akun 4-/5- tetap TERBUKA. Neraca saldo karena itu tidak
       ter-foot (Σ adjusted = −11.540 jt = −laba) dan `incomeDoubleCounted` menyala pada
       data demo sendiri — yang memaksa gerbang dilonggarkan agar demo tak terkunci.
       Kini 3-2100 = saldo laba AWAL murni (= kolom TA lalu), dan selisih Rp 6.553,7 jt
       yang selama ini tak terjelaskan diakui sebagai apa adanya: PKL PSAK 24 pada akun
       ekuitasnya sendiri di bawah. Σ adjusted = 0, selisih neraca = laba berjalan —
       neraca saldo pra-tutup yang koheren. Aset & pendapatan TIDAK tersentuh, jadi
       tolok ukur materialitas tidak bergeser. */
    /* KEDUA kolom pra-tutup, supaya aturannya SERAGAM: saldo laba yang DISAJIKAN untuk
       sebuah kolom = saldo akun + laba kolom itu. TA lalu −66.852,9 + laba TA lalu
       15.510 = 82.362,9 — saldo penutup TA lalu, persis seperti sebelumnya, sehingga
       neraca komparatif tak bergeser satu rupiah pun. Kolom asimetris (satu pra-tutup,
       satu penutup) akan memaksa tiap konsumen menebak kolom mana yang perlu ditutup. */
    ['Ekuitas', '3-2100', 'Saldo Laba', -66_852_900_000, -82_362_900_000, 0, 'K'],
    /* Akumulasi PKL — pengukuran kembali imbalan kerja (PSAK 24 ¶120(c)). Dibawa sebagai
       AKUN, bukan parameter, supaya angkanya ikut bersama neraca saldo ke setiap konsumen
       FSGEN; TB klien yang tak punya akun ini ber-PKL 0, dan mutasi saldo laba di luar
       laba berjalan akan MENGGAGALKAN tie-out ekuitas alih-alih diam-diam dilabeli PKL. */
    ['Ekuitas', '3-3100', 'Penghasilan Komprehensif Lain — Pengukuran Kembali Imbalan Kerja', 0, -6_553_700_000, 0, 'K'],
    ['Pendapatan', '4-1100', 'Penjualan Bersih', -284_500_000_000, -331_900_000_000, 1_850_000_000, 'R'],
    ['Beban', '5-1100', 'Beban Pokok Penjualan', 198_420_000_000, 230_140_000_000, 3_460_000_000, 'S'],
    ['Beban', '5-2100', 'Beban Penjualan', 22_180_000_000, 26_440_000_000, 0, 'T'],
    ['Beban', '5-3100', 'Beban Umum & Administrasi', 31_990_000_000, 36_720_000_000, 1_600_000_000, 'U'],
    ['Beban', '5-4100', 'Beban Keuangan', 7_220_000_000, 8_910_000_000, 0, 'V'],
    ['Beban', '5-5100', 'Beban Pajak Penghasilan', 9_180_000_000, 11_240_000_000, 0, 'W'],
  ].map((r: any[], i) => ({
    key: 'wtb' + i, group: r[0], code: r[1], name: r[2],
    ly: r[3], unadj: r[4], aje: r[5], adj: r[4] + r[5], lead: r[6],
  }));

  /* ---- Adjusting Journal Entries ----
     PR-G1 — tiap jurnal membawa KLASIFIKASI FISKAL-nya sendiri (`taxEffect`), dengan
     dasar hukum dikutip. Sebelumnya rekonsiliasi fiskal PSAK 46 memakai movement beda
     temporer KONSTANTA (6.800 jt) yang disusun klien atas bukunya sendiri sebelum audit,
     sehingga jurnal audit terposting menggerakkan laba komersial tetapi tidak
     menggerakkan koreksi fiskalnya — separuh identitas rekonsiliasi hidup, separuh beku.

     Mengapa per-jurnal dan bukan pemetaan akun: satu akun dapat memuat pergerakan yang
     deductible dan yang tidak. `2-1300 Beban Akrual` memuat bonus, jasa, dan denda
     sekaligus; aturan tingkat-akun akan memberi satu jawaban untuk tiga pertanyaan.

     Jurnal TANPA `taxEffect` diperlakukan BELUM DIKLASIFIKASI dan dilaporkan sebagai
     demikian — bukan diam-diam dianggap "nol beda". */
  const AJE = [
    { id: 'AJE-01', desc: 'Penyesuaian cut-off penjualan akhir tahun', ref: 'B-3', status: 'Posted', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000, proposedOn: '2026-05-04 16:40', preparer: 'Rina Kusuma',
      /* Koreksi pisah batas berlaku SAMA untuk komersial & fiskal: penghasilan diakui
         atas dasar akrual (Ps. 28(5) UU KUP) dan penilaian persediaan fiskal (Ps. 10(6)
         UU PPh) sejalan dengan komersial. Laba komersial dan PKP bergerak bersama. */
      taxEffect: { kind: 'none' as const, basis: 'Ps. 10(6) UU PPh + basis akrual Ps. 28(5) UU KUP', by: 'Anindya Pramesti' } },
    { id: 'AJE-02', desc: 'Tambahan CKPN piutang sesuai PSAK 71 (ECL)', ref: 'B-7', status: 'Posted', dr: '5-3100 Beban Umum', cr: '1-1210 CKPN', amount: 620_000_000, proposedOn: '2026-05-06 09:20', preparer: 'Dimas Raharjo',
      /* Pembentukan cadangan TIDAK boleh dikurangkan (Ps. 9(1)(c) UU PPh). Pengecualian
         pasal itu terbatas pada bank, lembaga pembiayaan, asuransi, penjaminan,
         pertambangan, kehutanan, dan pengolahan limbah — PT Sentosa Makmur adalah
         manufaktur, jadi tidak termasuk. Kerugian piutang baru deductible saat
         benar-benar dihapuskan dgn syarat Ps. 6(1)(h). Karena itu BEDA TEMPORER:
         beban komersial naik 620, koreksi fiskal +620, PKP tidak bergerak. */
      taxEffect: { kind: 'temporary' as const, bucket: 'ecl' as const, amount: 620,
                   basis: 'Ps. 9(1)(c) UU PPh — cadangan tak boleh dikurangkan; realisasi Ps. 6(1)(h)',
                   by: 'Anindya Pramesti' } },
    { id: 'AJE-03', desc: 'Pembalikan piutang fiktif teridentifikasi', ref: 'B-2', status: 'Proposed', dr: '4-1100 Penjualan', cr: '1-1200 Piutang', amount: 1_850_000_000, proposedOn: '2026-05-28 15:10', preparer: 'Dimas Raharjo',
      /* Penghasilan fiktif bukan objek pajak (Ps. 4(1) UU PPh — objek adalah tambahan
         kemampuan ekonomis yang BENAR-BENAR diterima/diperoleh). Pembalikannya berlaku
         untuk kedua basis, jadi nol beda. Konsekuensi sesungguhnya ada di tempat lain:
         bila SPT sudah dilaporkan atas angka lama, ini persoalan PEMBETULAN SPT. */
      taxEffect: { kind: 'none' as const, basis: 'Ps. 4(1) UU PPh — penghasilan fiktif bukan objek pajak',
                   by: 'Anindya Pramesti',
                   note: 'Bila SPT Badan sudah dilaporkan atas angka pra-audit, koreksi ini menuntut pembetulan SPT (Ps. 8 UU KUP), bukan penyesuaian rekonsiliasi tahun berjalan.' } },
    { id: 'AJE-04', desc: 'Akrual bonus manajemen belum dicatat', ref: 'CC-1', status: 'Posted', dr: '5-3100 Beban Umum', cr: '2-1300 Akrual', amount: 980_000_000, proposedOn: '2026-05-09 11:05', preparer: 'Sinta Wulandari',
      /* Biaya untuk mendapatkan, menagih & memelihara penghasilan dikurangkan atas dasar
         AKRUAL (Ps. 6(1)(a) UU PPh; Ps. 28(5) UU KUP). Bonus yang sudah menjadi kewajiban
         pasti pada tanggal neraca karena itu deductible pada tahun diakrualkan → nol beda.
         Syarat yang membalikkannya dicatat eksplisit: bila PPh 21 atas bonus belum
         dipotong & dilaporkan, DJP lazim mengoreksinya sampai dibayar — dan klasifikasi
         ini berubah menjadi beda temporer. */
      taxEffect: { kind: 'none' as const, basis: 'Ps. 6(1)(a) UU PPh + basis akrual Ps. 28(5) UU KUP',
                   by: 'Anindya Pramesti',
                   condition: 'Sepanjang PPh 21 atas bonus dipotong & dilaporkan pada masa yang sesuai. Bila belum, menjadi beda temporer sampai bonus dibayarkan.' } },
    { id: 'AJE-05', desc: 'Koreksi penyusutan mesin produksi', ref: 'E-4', status: 'Proposed', dr: '5-1100 BPP', cr: '1-2110 Ak. Penyusutan', amount: 1_120_000_000, proposedOn: '2026-05-30 08:45', preparer: 'Dimas Raharjo',
      /* Masa manfaat komersial mesin lini-2 direvisi 10 → 8 tahun (kajian teknis, WP E-4).
         Penyusutan FISKAL tidak ikut: Ps. 11 UU PPh menetapkan kelompok & tarif secara
         undang-undang, bukan mengikuti estimasi manajemen. Selisih penyusutan komersial
         di atas fiskal adalah BEDA TEMPORER yang berbalik sepanjang sisa umur aset. */
      taxEffect: { kind: 'temporary' as const, bucket: 'ppe' as const, amount: 1120,
                   basis: 'Ps. 11 UU PPh — penyusutan fiskal mengikuti kelompok & tarif UU, bukan masa manfaat komersial',
                   by: 'Dimas Raharjo' } },
  ];

  /* ---- Risk Assessment (RoMM register) ---- */
  const RISKS = [
    { id: 'R-01', area: 'Pendapatan', assertion: 'Occurrence', desc: 'Pengakuan pendapatan dini melalui channel stuffing menjelang tutup buku', likelihood: 4, impact: 5, inherent: 'Significant', fraud: true, assertionLvl: true, response: 'Cut-off testing diperluas + konfirmasi piutang', wp: 'B-3', proc: 'psak72', owner: 'Anindya P.' },
    { id: 'R-02', area: 'Persediaan', assertion: 'Valuation', desc: 'Persediaan usang tidak diturunkan ke NRV', likelihood: 3, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Uji NRV & observasi stock opname', wp: 'C-2', proc: 'psak14', owner: 'Dimas R.' },
    { id: 'R-03', area: 'Piutang Usaha', assertion: 'Valuation', desc: 'Estimasi ECL (PSAK 71) tidak memadai', likelihood: 4, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Re-perform model ECL & uji aging', wp: 'B-7', proc: 'ecl', owner: 'Anindya P.' },
    { id: 'R-04', area: 'Aset Tetap', assertion: 'Existence', desc: 'Aset tetap dilepas namun belum dihapusbukukan', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Vouching penambahan & fisik sampling', wp: 'E-4', proc: 'psak16', owner: 'Dimas R.' },
    { id: 'R-05', area: 'Management Override', assertion: 'Multiple', desc: 'Manajemen mengesampingkan pengendalian melalui jurnal manual', likelihood: 3, impact: 5, inherent: 'Significant', fraud: true, assertionLvl: false, response: 'JE testing (SA 240) + telaah estimasi', wp: 'JE-1', proc: 'jet', owner: 'Anindya P.' },
    { id: 'R-06', area: 'Sewa (PSAK 73)', assertion: 'Completeness', desc: 'Kontrak sewa baru tidak diakui sebagai aset hak-guna', likelihood: 3, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Telaah kontrak & re-kalkulasi liabilitas sewa', wp: 'F-1', proc: 'psak73', owner: 'Sinta W.' },
    { id: 'R-07', area: 'Imbalan Kerja', assertion: 'Valuation', desc: 'Asumsi aktuaria tidak sesuai kondisi terkini', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Evaluasi pakar aktuaria (SA 500)', wp: 'H-2', proc: 'psak24', owner: 'Sinta W.' },
    { id: 'R-08', area: 'Pihak Berelasi', assertion: 'Completeness', desc: 'Transaksi pihak berelasi tidak diungkapkan lengkap', likelihood: 2, impact: 4, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Pengujian kelengkapan & konfirmasi', wp: 'RP-1', proc: 'related', owner: 'Dimas R.' },
  ].map((r) => ({ engagementId: 'ENG-2025-014', ...r }));   /* register milik perikatan demo aktif */

  /* ---- RoMM ringkas untuk perikatan lain (mengaktifkan tampilan Risiko Portofolio lintas-klien).
     Sengaja terpisah dari RISKS agar view yang membaca AMS.RISKS langsung (opini/presentasi)
     tetap melihat HANYA register perikatan aktif. Union = ENG_RISK_SEED di bawah. ---- */
  const RISKS_PORTFOLIO = [
    /* ENG-2025-040 · PT Mandiri Sejahtera Finance — Multifinance, PSAK 71 (Perencanaan) */
    { engagementId: 'ENG-2025-040', id: 'R40-1', area: 'Pembiayaan Konsumen', assertion: 'Valuation', desc: 'Cadangan kerugian penurunan nilai (ECL PSAK 71) atas piutang pembiayaan tidak memadai', likelihood: 4, impact: 5, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Re-perform model ECL & uji staging + backtesting', wp: 'B-7', proc: 'ecl', owner: 'Bayu S.' },
    { engagementId: 'ENG-2025-040', id: 'R40-2', area: 'Pendapatan Bunga', assertion: 'Occurrence', desc: 'Pengakuan pendapatan bunga efektif tidak sesuai EIR / akrual berlebih', likelihood: 3, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Re-kalkulasi EIR sampel kontrak + uji cut-off', wp: 'R-1', proc: 'psak72', owner: 'Bayu S.' },
    { engagementId: 'ENG-2025-040', id: 'R40-3', area: 'Management Override', assertion: 'Multiple', desc: 'Restrukturisasi pembiayaan dipakai menyembunyikan kredit bermasalah (evergreening)', likelihood: 3, impact: 5, inherent: 'Significant', fraud: true, assertionLvl: false, response: 'JE testing (SA 240) + telaah restrukturisasi', wp: 'JE-1', proc: 'jet', owner: 'Bayu S.' },
    { engagementId: 'ENG-2025-040', id: 'R40-4', area: 'Pihak Berelasi', assertion: 'Completeness', desc: 'Pendanaan dari pihak berelasi tidak diungkapkan lengkap', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Konfirmasi & telaah kelengkapan RPT', wp: 'RP-1', proc: 'related', owner: 'Bayu S.' },
    /* ENG-2025-031 · PT Bumi Hijau Agrindo — Agribisnis, PSAK 73 (Eksekusi) */
    { engagementId: 'ENG-2025-031', id: 'R31-1', area: 'Aset Biologis', assertion: 'Valuation', desc: 'Nilai wajar aset biologis (tanaman perkebunan) tidak ditopang asumsi yang andal', likelihood: 4, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Evaluasi pakar penilai + uji asumsi nilai wajar', wp: 'C-3', proc: 'psak16', owner: 'Anindya P.' },
    { engagementId: 'ENG-2025-031', id: 'R31-2', area: 'Sewa (PSAK 73)', assertion: 'Completeness', desc: 'Sewa lahan jangka panjang tidak diakui sebagai aset hak-guna', likelihood: 3, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Telaah kontrak sewa lahan & re-kalkulasi liabilitas', wp: 'F-1', proc: 'psak73', owner: 'Anindya P.' },
    { engagementId: 'ENG-2025-031', id: 'R31-3', area: 'Persediaan', assertion: 'Existence', desc: 'Kuantitas persediaan CPO/TBS hasil panen tidak terverifikasi memadai', likelihood: 2, impact: 3, inherent: 'Moderate', fraud: false, assertionLvl: true, response: 'Observasi stock-take + rekonsiliasi timbangan', wp: 'C-2', proc: 'psak14', owner: 'Dimas R.' },
    /* ENG-2025-063 · PT Graha Properti Investama — Properti (Finalisasi) */
    { engagementId: 'ENG-2025-063', id: 'R63-1', area: 'Pendapatan Properti', assertion: 'Occurrence', desc: 'Waktu pengakuan pendapatan penjualan unit (PSAK 72) tidak tepat (over time vs point in time)', likelihood: 3, impact: 5, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Telaah kontrak & analisis kriteria pengakuan', wp: 'R-2', proc: 'psak72', owner: 'Citra H.' },
    { engagementId: 'ENG-2025-063', id: 'R63-2', area: 'Properti Investasi', assertion: 'Valuation', desc: 'Nilai wajar properti investasi (PSAK 13) menggunakan asumsi kapitalisasi usang', likelihood: 3, impact: 4, inherent: 'Significant', fraud: false, assertionLvl: true, response: 'Telaah laporan penilai independen (SA 500/620)', wp: 'E-5', proc: 'psak16', owner: 'Citra H.' },
    { engagementId: 'ENG-2025-063', id: 'R63-3', area: 'Going Concern', assertion: 'Multiple', desc: 'Tekanan likuiditas dari jatuh tempo utang bank jangka pendek', likelihood: 2, impact: 4, inherent: 'Moderate', fraud: false, assertionLvl: false, response: 'Evaluasi rencana manajemen & proyeksi arus kas', wp: 'GC-1', proc: 'goingconcern', owner: 'Citra H.' },
  ];

  /* Union seed: dipakai agregator portofolio (view_dashboard) & seed register per-perikatan
     (contexts), di-filter per engagementId. AMS.RISKS sendiri TETAP = register ENG-2025-014. */
  const ENG_RISK_SEED = [...RISKS, ...RISKS_PORTFOLIO];

  /* ---- Team / engagement staffing ---- */
  const TEAM = [
    { name: 'Hartono Wijaya, CPA', role: 'Engagement Partner', util: 71 },
    { name: 'Anindya Pramesti', role: 'Audit Manager', util: 88 },
    { name: 'Dimas Raharjo', role: 'Senior Auditor', util: 94 },
    { name: 'Sinta Wulandari', role: 'Senior Auditor', util: 90 },
    { name: 'Fajar Nugroho', role: 'Junior Auditor', util: 82 },
    { name: 'Rina Kusuma', role: 'Junior Auditor', util: 79 },
  ];

  /* ---- Working paper index (lead schedules) ---- */
  const WORKPAPERS = [
    { ref: 'A', title: 'Kas dan Setara Kas', status: 'Reviewed', preparer: 'Fajar N.', reviewer: 'Anindya P.' },
    { ref: 'B', title: 'Piutang Usaha & ECL', status: 'In Review', preparer: 'Dimas R.', reviewer: 'Anindya P.' },
    { ref: 'C', title: 'Persediaan', status: 'In Progress', preparer: 'Fajar N.', reviewer: '—' },
    { ref: 'E', title: 'Aset Tetap', status: 'In Review', preparer: 'Dimas R.', reviewer: 'Hartono W.' },
    { ref: 'F', title: 'Sewa — PSAK 73', status: 'In Progress', preparer: 'Sinta W.', reviewer: '—' },
    { ref: 'R', title: 'Pendapatan', status: 'In Progress', preparer: 'Dimas R.', reviewer: '—' },
  ];

  /* ---- Activity feed ---- */
  const ACTIVITY = [
    { who: 'Dimas Raharjo', what: 'mengunggah konfirmasi bank BCA pada WP A-2', when: '14 menit lalu', icon: 'upload' },
    { who: 'Hartono Wijaya', what: 'me-review dan menyetujui AJE-04', when: '1 jam lalu', icon: 'check' },
    { who: 'Sistem', what: 'WTB ENG-2025-014 disinkronkan dari GL klien', when: '2 jam lalu', icon: 'sync' },
    { who: 'Anindya Pramesti', what: 'menaikkan risiko Pendapatan ke Significant', when: '3 jam lalu', icon: 'flag' },
    { who: 'Sinta Wulandari', what: 'menyelesaikan re-kalkulasi liabilitas sewa (F-1)', when: '5 jam lalu', icon: 'check' },
    { who: 'Citra Halim', what: 'mengirim draft opini ENG-2025-063 untuk EQR', when: 'Kemarin', icon: 'send' },
  ];

  /* ---- Deadlines ---- */
  // `client` HARUS sama persis dgn CLIENTS[].name (dipakai sbg kunci pencocokan exact-match
  // di deriveDeadlineTasks isolasi-klien & resolusi engagementId untuk deep-link Beranda —
  // versi singkat sebelumnya ('PT Graha Properti' dst.) tak pernah cocok dgn nama kanonik
  // ('PT Graha Properti Investama' dst.), diam-diam menghilangkan deadline ini utk siapa pun
  // yang bukan oversight ('all') DAN membuat klik "Tugas Saya" tak pernah bisa berpindah ke
  // perikatan yg tepat).
  const DEADLINES = [
    { client: 'PT Graha Properti Investama', task: 'EQR & tanda tangan opini', date: '15 Mar', days: 6, sev: 'red' },
    { client: 'PT Sentosa Makmur Tbk', task: 'Selesai fieldwork', date: '31 Mar', days: 22, sev: 'amber' },
    { client: 'PT Mandiri Sejahtera Finance', task: 'Walkthrough pengendalian', date: '02 Apr', days: 24, sev: 'gray' },
    { client: 'PT Bumi Hijau Agrindo', task: 'Konfirmasi piutang batch-2', date: '30 Apr', days: 52, sev: 'gray' },
  ];

  /* ---- Review notes (coaching/review/EQR notes, cross-module) ----
     type:  review | coaching | eqr | query
     ref:   cross-reference to a WP / procedure / AJE
     due:   ISO date the note should be cleared by (null = no SLA)
     thread: ordered conversation AFTER the originating note (note.text is msg 0)
             kind: response (preparer) | comment | clear (reviewer clearance) */
  const REVIEW_NOTES = [
    { id: 'RN-01', module: 'wtb', moduleLabel: 'Working Trial Balance', type: 'review', ref: 'C · Lead Persediaan', text: 'Mohon tambahkan referensi silang AJE-01 ke lead schedule persediaan (C). Saat ini cut-off BPP belum tertaut ke kertas kerja.', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', created: '2 jam lalu', raised: '2026-03-09', due: '2026-03-12', priority: 'high', thread: [] },
    { id: 'RN-02', module: 'icfr', moduleLabel: 'Internal Control', type: 'coaching', ref: 'WP B-7 · Model ECL', text: 'Dokumentasikan dasar loss rate Stage 3 (45%) — bandingkan dengan data historis 3 tahun & ekspektasi forward-looking PSAK 71.', author: 'Anindya Pramesti', to: 'Sinta W.', status: 'open', created: '4 jam lalu', raised: '2026-03-09', due: '2026-03-13', priority: 'medium',
      thread: [
        { author: 'Sinta W.', kind: 'response', when: '1 jam lalu', text: 'Sudah saya tarik data write-off 2022–2024; rata-rata recovery 38%. Sedang menyiapkan memo penyesuaian forward-looking, draft selesai sore ini.' },
      ] },
    { id: 'RN-03', module: 'confirm', moduleLabel: 'Confirmation Hub', type: 'review', ref: 'WP B-4 · Konfirmasi Piutang', text: 'CV Sumber Rejeki "No Reply" pada batch-1 — pastikan prosedur alternatif (uji penerimaan setelah tanggal neraca) terdokumentasi lengkap sebelum kesimpulan.', author: 'Hartono Wijaya', to: 'Dimas R.', status: 'open', created: 'Kemarin', raised: '2026-03-08', due: '2026-03-07', priority: 'high',
      thread: [
        { author: 'Dimas R.', kind: 'response', when: 'Kemarin', text: 'Sudah dikirim ulang via email & WhatsApp PIC. Bila tetap nihil sampai 11 Mar, saya jalankan subsequent receipt testing terhadap pelunasan Jan–Feb 2026.' },
        { author: 'Hartono Wijaya', kind: 'comment', when: '5 jam lalu', text: 'Setuju. Lampirkan bukti pelunasan & cocokkan ke rekening koran. Catatan tetap terbuka sampai kertas kerja alternatif diunggah.' },
      ] },
    { id: 'RN-04', module: 'risk', moduleLabel: 'Risk Assessment', type: 'review', ref: 'R-01 · Pendapatan', text: 'Setuju kenaikan risiko pendapatan ke Significant. Tautkan penilaian ini ke prosedur cut-off yang diperluas & JE testing (SA 240).', author: 'Hartono Wijaya', to: 'Anindya P.', status: 'resolved', created: '2 hari lalu', raised: '2026-03-07', due: '2026-03-09', priority: 'medium',
      thread: [
        { author: 'Anindya P.', kind: 'response', when: '2 hari lalu', text: 'Sudah ditautkan ke prosedur B-3 (cut-off) dan JE-1 (journal entry testing). Matriks RoMM diperbarui.' },
        { author: 'Hartono Wijaya', kind: 'clear', when: '1 hari lalu', text: 'Memadai. Catatan dikliring.' },
      ] },
    { id: 'RN-05', module: 'fsgen', moduleLabel: 'Financial Statement', type: 'query', ref: 'CALK 18 · Sewa', text: 'Periksa kembali pengungkapan PSAK 73 di CALK — saldo aset hak-guna Rp 12,64 M sudah cocok dengan WP F-1?', author: 'Anindya Pramesti', to: 'Sinta W.', status: 'resolved', created: '3 hari lalu', raised: '2026-03-06', due: '2026-03-08', priority: 'low',
      thread: [
        { author: 'Sinta W.', kind: 'response', when: '3 hari lalu', text: 'Cocok dengan F-1. Jatuh tempo liabilitas sewa (lancar/jk panjang) juga sudah dipisah di CALK 18.' },
        { author: 'Anindya P.', kind: 'clear', when: '2 hari lalu', text: 'Oke, dikliring.' },
      ] },
    { id: 'RN-06', module: 'jet', moduleLabel: 'Journal Entry Testing', type: 'eqr', ref: 'JE-1 · Population', text: 'EQR: pastikan kriteria seleksi jurnal manual mencakup entri akhir pekan & nominal bulat besar. Dokumentasikan rasional ambang batas.', author: 'Sari Dewanti', to: 'Anindya P.', status: 'open', created: '6 jam lalu', raised: '2026-03-09', due: '2026-03-14', priority: 'high', thread: [] },
    { id: 'RN-07', module: 'wtb', moduleLabel: 'Working Trial Balance', type: 'coaching', ref: 'A · Lead Kas', text: 'Coaching: gunakan tickmark standar firma pada rekonsiliasi bank (Ω = ditelusuri ke rekening koran). Hindari anotasi bebas.', author: 'Anindya Pramesti', to: 'Fajar N.', status: 'open', created: '8 jam lalu', raised: '2026-03-08', due: '2026-03-15', priority: 'low', thread: [] },
    { id: 'RN-08', module: 'aje', moduleLabel: 'Adjusting Entries (AJE)', type: 'review', ref: 'AJE-05 · Penyusutan', text: 'AJE-05 koreksi penyusutan mesin masih berstatus Proposed — sertakan perhitungan ulang & dasar revisi masa manfaat sebelum diajukan ke partner.', author: 'Anindya Pramesti', to: 'Dimas R.', status: 'open', created: '1 hari lalu', raised: '2026-03-08', due: '2026-03-11', priority: 'medium',
      thread: [
        { author: 'Dimas R.', kind: 'response', when: '6 jam lalu', text: 'Perhitungan ulang terlampir di E-4. Masa manfaat mesin lini-2 direvisi 10→8 thn berdasarkan kajian teknis pabrik.' },
      ] },
  ].map(n => ({ engagementId: 'ENG-2025-014', ...n }));   /* P5 Fase 2: seed milik engagement demo */

  /* ---- Time entries (timesheet) ---- */
  const TIME_ENTRIES = [
    { id: 'TE-01', member: 'Anindya Pramesti', date: '2026-03-08', phase: 'Eksekusi', task: 'Review piutang & ECL', hours: 6.5 },
    { id: 'TE-02', member: 'Dimas Raharjo', date: '2026-03-08', phase: 'Eksekusi', task: 'Vouching aset tetap', hours: 8 },
    { id: 'TE-03', member: 'Sinta Wulandari', date: '2026-03-08', phase: 'Eksekusi', task: 'Re-kalkulasi sewa PSAK 73', hours: 7.5 },
    { id: 'TE-04', member: 'Fajar Nugroho', date: '2026-03-07', phase: 'Eksekusi', task: 'Lead schedule kas & bank', hours: 7 },
    { id: 'TE-05', member: 'Dimas Raharjo', date: '2026-03-07', phase: 'Eksekusi', task: 'Cut-off testing pendapatan', hours: 8 },
    { id: 'TE-06', member: 'Anindya Pramesti', date: '2026-03-07', phase: 'Eksekusi', task: 'Walkthrough pengendalian', hours: 5 },
    { id: 'TE-07', member: 'Rina Kusuma', date: '2026-03-06', phase: 'Eksekusi', task: 'Observasi stock opname', hours: 6 },
  ];

  /* ---- D: Sales pipeline (opportunities) ----
     `history` (PRD prd-sales-pipeline-deepening PR-4) = jejak perpindahan tahap.
     Tanpa satu pun stempel waktu, umur peluang, waktu-di-tahap, deteksi macet,
     conversion rate antar-tahap, dan win rate PER PERIODE semuanya mustahil.
     Nilai di bawah adalah DATA DEMO yang di-backfill (Q-4 opsi a) agar turunan
     punya isi; `prob` pada tiap peristiwa merekam keyakinan yang berlaku saat
     berada di tahap itu, sehingga angka lama dapat dipulihkan bila peluang
     kembali dari Won/Lost. Klok demo = AMS.TODAY (2026-03-09).                */
  const PIPELINE = [
    /* Peluang yang SUDAH diputuskan pada periode lalu (PR-6). Tanpa ini, win rate
       per kuartal & analitik alasan kalah tak punya populasi: register hanya
       memuat satu Won dan dua Lost, seluruhnya di Q1 2026. `BI_WINLOSS` literal
       dulu mengaku 6 menang · 2 kalah lintas empat kuartal — angka yang tak
       pernah ada dasarnya. Baris di bawah adalah DATA DEMO yang di-backfill
       (Q-5 opsi a) supaya turunannya punya isi yang dapat diperiksa. */
    { id: 'OPP-081', name: 'PT Anugerah Sawit Lestari', service: 'Audit Laporan Keuangan', stage: 'Won', value: 880_000_000, prob: 100, owner: 'Hartono Wijaya', close: '2025-06-20', industry: 'Agribisnis',
      history: [
        { stage: 'Lead', at: '2025-02-10', by: 'Hartono Wijaya', prob: 20 },
        { stage: 'Qualified', at: '2025-03-14', by: 'Hartono Wijaya', prob: 40 },
        { stage: 'Proposal', at: '2025-04-18', by: 'Hartono Wijaya', prob: 60 },
        { stage: 'Negotiation', at: '2025-05-22', by: 'Hartono Wijaya', prob: 80 },
        { stage: 'Won', at: '2025-06-20', by: 'Hartono Wijaya', prob: 100 },
      ] },
    { id: 'OPP-082', name: 'PT Sinar Kimia Industri', service: 'Audit Laporan Keuangan', stage: 'Lost', value: 620_000_000, prob: 0, owner: 'Sari Dewanti', close: '2025-08-11', industry: 'Kimia',
      history: [
        { stage: 'Lead', at: '2025-04-02', by: 'Sari Dewanti', prob: 20 },
        { stage: 'Qualified', at: '2025-05-19', by: 'Sari Dewanti', prob: 40 },
        { stage: 'Proposal', at: '2025-06-30', by: 'Sari Dewanti', prob: 60 },
        { stage: 'Lost', at: '2025-08-11', by: 'Sari Dewanti', prob: 0, reason: 'Imbalan pesaing 18% lebih rendah; lingkup setara.' },
      ] },
    { id: 'OPP-083', name: 'PT Bahtera Niaga Samudra', service: 'Audit + Tax', stage: 'Won', value: 1_150_000_000, prob: 100, owner: 'Rudi Gunawan', close: '2025-09-30', industry: 'Perdagangan',
      history: [
        { stage: 'Lead', at: '2025-05-06', by: 'Rudi Gunawan', prob: 20 },
        { stage: 'Qualified', at: '2025-06-17', by: 'Rudi Gunawan', prob: 40 },
        { stage: 'Proposal', at: '2025-07-25', by: 'Rudi Gunawan', prob: 60 },
        { stage: 'Negotiation', at: '2025-08-28', by: 'Rudi Gunawan', prob: 75 },
        { stage: 'Won', at: '2025-09-30', by: 'Rudi Gunawan', prob: 100 },
      ] },
    { id: 'OPP-084', name: 'PT Cipta Rasa Boga', service: 'Review (SPR 2400)', stage: 'Lost', value: 340_000_000, prob: 0, owner: 'Bayu Saputra', close: '2025-11-14', industry: 'F&B',
      history: [
        { stage: 'Lead', at: '2025-08-19', by: 'Bayu Saputra', prob: 20 },
        { stage: 'Qualified', at: '2025-09-23', by: 'Bayu Saputra', prob: 40 },
        { stage: 'Lost', at: '2025-11-14', by: 'Bayu Saputra', prob: 0, reason: 'Klien menunda perikatan; rencana IPO digeser ke 2027.' },
      ] },
    { id: 'OPP-085', name: 'PT Wahana Medika Utama', service: 'Audit Laporan Keuangan', stage: 'Won', value: 760_000_000, prob: 100, owner: 'Sari Dewanti', close: '2025-12-12', industry: 'Kesehatan',
      history: [
        { stage: 'Lead', at: '2025-07-14', by: 'Sari Dewanti', prob: 20 },
        { stage: 'Qualified', at: '2025-09-01', by: 'Sari Dewanti', prob: 40 },
        { stage: 'Proposal', at: '2025-10-13', by: 'Sari Dewanti', prob: 60 },
        { stage: 'Negotiation', at: '2025-11-10', by: 'Sari Dewanti', prob: 75 },
        { stage: 'Won', at: '2025-12-12', by: 'Sari Dewanti', prob: 100 },
      ] },
    { id: 'OPP-086', name: 'PT Galuh Semen Nusantara', service: 'Audit Laporan Keuangan', stage: 'Lost', value: 1_020_000_000, prob: 0, owner: 'Rudi Gunawan', close: '2026-01-23', industry: 'Semen',
      history: [
        { stage: 'Lead', at: '2025-09-08', by: 'Rudi Gunawan', prob: 20 },
        { stage: 'Qualified', at: '2025-10-20', by: 'Rudi Gunawan', prob: 40 },
        { stage: 'Proposal', at: '2025-11-28', by: 'Rudi Gunawan', prob: 60 },
        { stage: 'Lost', at: '2026-01-23', by: 'Rudi Gunawan', prob: 0, reason: 'Rotasi wajib: KAP kami sudah 5 tahun berturut-turut (PP 20/2015).' },
      ] },
    { id: 'OPP-101', name: 'PT Karya Beton Perkasa', service: 'Audit Laporan Keuangan', stage: 'Proposal', value: 640_000_000, prob: 60, owner: 'Hartono Wijaya', close: '2026-04-30', industry: 'Konstruksi',
      buildUp: [{ grade: 'Partner', hours: 60 }, { grade: 'Manager', hours: 180 }, { grade: 'Senior', hours: 320 }, { grade: 'Junior', hours: 320 }], durationWeeks: 20, startPlanned: '2026-05-11',
      history: [
        { stage: 'Lead', at: '2025-11-18', by: 'Hartono Wijaya', prob: 20 },
        { stage: 'Qualified', at: '2025-12-08', by: 'Hartono Wijaya', prob: 40 },
        { stage: 'Proposal', at: '2026-01-14', by: 'Hartono Wijaya', prob: 60 },
      ] },
    { id: 'OPP-102', name: 'PT Digital Andalan Teknologi', service: 'Agreed-Upon Procedures', stage: 'Lead', value: 410_000_000, prob: 25, owner: 'Sari Dewanti', close: '2026-06-15', industry: 'Teknologi',
      history: [{ stage: 'Lead', at: '2026-01-22', by: 'Sari Dewanti', prob: 25 }] },
    { id: 'OPP-103', name: 'PT Pelita Energi Nusantara', service: 'Audit + Tax', stage: 'Negotiation', value: 1_280_000_000, prob: 75, owner: 'Rudi Gunawan', close: '2026-04-10', industry: 'Energi',
      buildUp: [{ grade: 'Partner', hours: 120 }, { grade: 'Manager', hours: 360 }, { grade: 'Senior', hours: 640 }, { grade: 'Junior', hours: 560 }], durationWeeks: 26, startPlanned: '2026-04-20',
      history: [
        { stage: 'Lead', at: '2025-10-06', by: 'Rudi Gunawan', prob: 20 },
        { stage: 'Qualified', at: '2025-11-10', by: 'Rudi Gunawan', prob: 40 },
        { stage: 'Proposal', at: '2025-12-19', by: 'Rudi Gunawan', prob: 60 },
        { stage: 'Negotiation', at: '2026-02-18', by: 'Rudi Gunawan', prob: 75 },
      ] },
    { id: 'OPP-104', name: 'PT Sari Boga Internasional', service: 'Audit Laporan Keuangan', stage: 'Qualified', value: 720_000_000, prob: 45, owner: 'Sari Dewanti', close: '2026-05-20', industry: 'F&B',
      buildUp: [{ grade: 'Partner', hours: 70 }, { grade: 'Manager', hours: 200 }, { grade: 'Senior', hours: 340 }, { grade: 'Junior', hours: 330 }], durationWeeks: 22, startPlanned: '2026-06-01',
      history: [
        { stage: 'Lead', at: '2025-12-02', by: 'Sari Dewanti', prob: 20 },
        { stage: 'Qualified', at: '2026-01-09', by: 'Sari Dewanti', prob: 45 },
      ] },
    { id: 'OPP-105', name: 'PT Mega Properti Sentosa', service: 'Due Diligence', stage: 'Won', value: 950_000_000, prob: 100, owner: 'Rudi Gunawan', close: '2026-03-01', industry: 'Properti',
      history: [
        { stage: 'Lead', at: '2025-09-15', by: 'Rudi Gunawan', prob: 20 },
        { stage: 'Qualified', at: '2025-10-20', by: 'Rudi Gunawan', prob: 40 },
        { stage: 'Proposal', at: '2025-11-27', by: 'Rudi Gunawan', prob: 60 },
        { stage: 'Negotiation', at: '2026-01-16', by: 'Rudi Gunawan', prob: 80 },
        { stage: 'Won', at: '2026-03-01', by: 'Rudi Gunawan', prob: 100 },
      ] },
    { id: 'OPP-106', name: 'PT Cahaya Tekstil Mandiri', service: 'Audit Laporan Keuangan', stage: 'Lost', value: 540_000_000, prob: 0, owner: 'Hartono Wijaya', close: '2026-02-15', industry: 'Manufaktur',
      history: [
        { stage: 'Lead', at: '2025-10-28', by: 'Hartono Wijaya', prob: 20 },
        { stage: 'Qualified', at: '2025-12-01', by: 'Hartono Wijaya', prob: 40 },
        { stage: 'Proposal', at: '2026-01-07', by: 'Hartono Wijaya', prob: 55 },
        { stage: 'Lost', at: '2026-02-15', by: 'Hartono Wijaya', prob: 0, reason: 'Imbalan pesaing 22% lebih rendah; lingkup setara.' },
      ] },
    { id: 'OPP-107', name: 'PT Bahari Logistik Prima', service: 'Review (SPR 2400)', stage: 'Qualified', value: 380_000_000, prob: 50, owner: 'Bayu Saputra', close: '2026-05-31', industry: 'Logistik',
      history: [
        { stage: 'Lead', at: '2025-12-15', by: 'Bayu Saputra', prob: 20 },
        { stage: 'Qualified', at: '2026-01-05', by: 'Bayu Saputra', prob: 50 },
      ] },
  ];

  /* ---- D: Invoices ---- */
  const INVOICES = [
    { id: 'INV-2026-031', clientId: 'C-014', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', issued: '2026-02-15', due: '2026-03-17', amount: 925_000_000, paid: 925_000_000, status: 'Paid', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-040', clientId: 'C-014', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', issued: '2026-03-01', due: '2026-03-31', amount: 555_000_000, paid: 0, status: 'Sent', milestone: 'Termin 2 (30%)' },
    { id: 'INV-2026-022', clientId: 'C-040', client: 'PT Mandiri Sejahtera Finance', eng: 'ENG-2025-040', issued: '2026-02-20', due: '2026-03-22', amount: 1_170_000_000, paid: 0, status: 'Overdue', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-035', clientId: 'C-031', client: 'PT Bumi Hijau Agrindo', eng: 'ENG-2025-031', issued: '2026-03-05', due: '2026-04-04', amount: 560_000_000, paid: 0, status: 'Sent', milestone: 'Termin 1 (50%)' },
    { id: 'INV-2026-018', clientId: 'C-063', client: 'PT Graha Properti Investama', eng: 'ENG-2025-063', issued: '2026-01-30', due: '2026-03-01', amount: 820_000_000, paid: 410_000_000, status: 'Partial', milestone: 'Termin 2 (50%)' },
    { id: 'INV-2026-012', clientId: 'C-058', client: 'PT Samudra Pangan Lestari', eng: 'ENG-2025-058', issued: '2026-01-15', due: '2026-02-14', amount: 1_650_000_000, paid: 1_650_000_000, status: 'Paid', milestone: 'Final (100%)' },
    { id: 'INV-2026-045', clientId: 'C-022', client: 'PT Cahaya Logistik Nusantara', eng: 'ENG-2025-022', issued: '2026-03-08', due: '2026-04-07', amount: 360_000_000, paid: 0, status: 'Draft', milestone: 'Termin 1 (50%)' },
  ];

  /* ---- D: Resource schedule (weekly allocation %) ---- */
  const SCHEDULE = [
    { member: 'Hartono Wijaya, CPA', role: 'Partner', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 8, color: '#005085' },
      { eng: 'ENG-2025-031', client: 'Bumi Hijau', hrs: 6, color: '#1f7a4d' },
    ]},
    { member: 'Anindya Pramesti', role: 'Manager', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 24, color: '#005085' },
      { eng: 'ENG-2025-031', client: 'Bumi Hijau', hrs: 11, color: '#1f7a4d' },
    ]},
    { member: 'Dimas Raharjo', role: 'Senior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 38, color: '#005085' },
    ]},
    { member: 'Sinta Wulandari', role: 'Senior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 20, color: '#005085' },
      { eng: 'ENG-2025-040', client: 'Mandiri Finance', hrs: 16, color: '#5b3fa6' },
    ]},
    { member: 'Fajar Nugroho', role: 'Junior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 33, color: '#005085' },
    ]},
    { member: 'Rina Kusuma', role: 'Junior', capacity: 40, alloc: [
      { eng: 'ENG-2025-014', client: 'Sentosa Makmur', hrs: 18, color: '#005085' },
      { eng: 'ENG-2025-022', client: 'Cahaya Logistik', hrs: 14, color: '#0a6b73' },
    ]},
    { member: 'Bayu Saputra', role: 'Manager', capacity: 40, alloc: [
      { eng: 'ENG-2025-040', client: 'Mandiri Finance', hrs: 22, color: '#5b3fa6' },
    ]},
  ];

  /* ---- E: Staff (HCM) ---- */
  /* `unit` = rumah tangga/portofolio partner (PRD Isolasi Data Personal, cakupan .viewUnit).
     UNITS memetakan unit → partner pemimpin (lead). Dipakai server unitSubtree() (eksplisit →
     fallback ORG). 3 unit demo: Komersial (Rudi), Jasa Keuangan (Sari), Kepemimpinan (Hartono). */
  const STAFF_CORE = [
    { id: 'EMP-001', name: 'Hartono Wijaya', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, CA, AP', joined: 2009, born: 1981, gender: 'L', util: 71, status: 'Aktif', email: 'hartono.w@whr-cpa.id', engagements: 3, rating: 4.6, unit: 'U-LEAD' },
    { id: 'EMP-002', name: 'Rudi Gunawan', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, AP', joined: 2011, born: 1979, gender: 'L', util: 68, status: 'Aktif', email: 'rudi.g@whr-cpa.id', engagements: 2, rating: 4.5, unit: 'U-KOM' },
    { id: 'EMP-003', name: 'Sari Dewanti', role: 'Engagement Partner', grade: 'Partner', cert: 'CPA, AP', joined: 2013, born: 1982, gender: 'P', util: 74, status: 'Aktif', email: 'sari.d@whr-cpa.id', engagements: 2, rating: 4.4, unit: 'U-JK' },
    { id: 'EMP-007', name: 'Anindya Pramesti', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2016, born: 1988, gender: 'P', util: 88, status: 'Aktif', email: 'anindya.p@whr-cpa.id', engagements: 2, rating: 4.7, unit: 'U-LEAD' },
    { id: 'EMP-008', name: 'Bayu Saputra', role: 'Audit Manager', grade: 'Manager', cert: 'CPA', joined: 2017, born: 1987, gender: 'L', util: 81, status: 'Aktif', email: 'bayu.s@whr-cpa.id', engagements: 2, rating: 4.2, unit: 'U-KOM' },
    { id: 'EMP-012', name: 'Citra Halim', role: 'Audit Manager', grade: 'Manager', cert: 'CPA, CA', joined: 2017, born: 1989, gender: 'P', util: 79, status: 'Cuti', email: 'citra.h@whr-cpa.id', engagements: 1, rating: 4.3, unit: 'U-JK' },
    { id: 'EMP-021', name: 'Dimas Raharjo', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2020, born: 1995, gender: 'L', util: 94, status: 'Aktif', email: 'dimas.r@whr-cpa.id', engagements: 1, rating: 4.5, unit: 'U-LEAD' },
    { id: 'EMP-022', name: 'Sinta Wulandari', role: 'Senior Auditor', grade: 'Senior', cert: 'CA (kandidat CPA)', joined: 2020, born: 1996, gender: 'P', util: 90, status: 'Aktif', email: 'sinta.w@whr-cpa.id', engagements: 2, rating: 4.4, unit: 'U-KOM' },
    { id: 'EMP-031', name: 'Fajar Nugroho', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2023, born: 2000, gender: 'L', util: 82, status: 'Aktif', email: 'fajar.n@whr-cpa.id', engagements: 1, rating: 4.0, unit: 'U-LEAD' },
    { id: 'EMP-032', name: 'Rina Kusuma', role: 'Junior Auditor', grade: 'Junior', cert: 'S.Ak', joined: 2024, born: 2001, gender: 'P', util: 79, status: 'Aktif', email: 'rina.k@whr-cpa.id', engagements: 2, rating: 3.9, unit: 'U-KOM' },  ];
  /* PRD sdm-kepatuhan PR-4 (Q-1 opsi b) — roster firma yang SEBENARNYA.
     Sepuluh baris di atas adalah personel inti yang punya catatan payroll/CPE/
     kinerja/independensi dan dirujuk NAMANYA lintas modul; 59 baris tambahan di
     `data_roster.ts` melengkapinya menjadi 69 orang, tepat seperti yang selama
     ini diklaim `HCM_ANALYTICS.gradeMix` tanpa satu pun orang di belakangnya. */
  const STAFF = [...STAFF_CORE, ...STAFF_EXT];

  /* ---- Register keluar (PRD sdm-kepatuhan PR-4) ----
     `annualAttrition: 16` dan `regrettable: 62` dulu konstanta di
     `HCM_ANALYTICS`, dan keduanya MUSTAHIL benar bersamaan untuk firma seukuran
     ini: pasangan bulat yang memenuhi keduanya hanya ada pada headcount 79–83
     (13 keluar, 8 regrettable) — sementara `gradeMix` di objek yang sama
     berbunyi 69. Sekarang attrition punya peristiwa di belakangnya.

     11 kepergian dalam 12 bulan terakhir ÷ 69 aktif = 16% — angka headline
     lama direproduksi. `regrettable` menjadi 64% (7 dari 11), BUKAN 62%:
     62% tak dapat dicapai oleh pecahan bulat mana pun pada 11 kepergian. */
  const EXITS = [
    { id: 'EX-2025-04', emp: 'EMP-914', name: 'Reza Alfarizi', grade: 'Senior', date: '2025-04-18', reason: 'Pindah ke korporasi (klien)', regrettable: true },
    { id: 'EX-2025-05', emp: 'EMP-915', name: 'Dinda Prameswari', grade: 'Junior', date: '2025-05-30', reason: 'Lanjut studi S2', regrettable: false },
    { id: 'EX-2025-06', emp: 'EMP-916', name: 'Yoga Pranata', grade: 'Junior', date: '2025-06-27', reason: 'Pindah KAP lain', regrettable: true },
    { id: 'EX-2025-07', emp: 'EMP-917', name: 'Mega Lestari', grade: 'Senior', date: '2025-07-31', reason: 'Pindah KAP Big-4', regrettable: true },
    { id: 'EX-2025-08', emp: 'EMP-918', name: 'Fikri Ananda', grade: 'Junior', date: '2025-08-29', reason: 'Tidak lulus masa percobaan', regrettable: false },
    { id: 'EX-2025-09', emp: 'EMP-919', name: 'Larasati Wibisono', grade: 'Manager', date: '2025-09-30', reason: 'Pindah ke industri', regrettable: true },
    { id: 'EX-2025-11', emp: 'EMP-920', name: 'Bagus Setiaji', grade: 'Junior', date: '2025-11-28', reason: 'Alasan keluarga', regrettable: false },
    { id: 'EX-2026-01', emp: 'EMP-921', name: 'Nadia Salsabila', grade: 'Senior', date: '2026-01-16', reason: 'Pindah KAP lain', regrettable: true },
    { id: 'EX-2026-01b', emp: 'EMP-922', name: 'Rizal Kurnia', grade: 'Junior', date: '2026-01-30', reason: 'Kinerja di bawah standar', regrettable: false },
    { id: 'EX-2026-02', emp: 'EMP-923', name: 'Putri Handayani', grade: 'Junior', date: '2026-02-27', reason: 'Pindah ke konsultan pajak', regrettable: true },
    { id: 'EX-2026-03', emp: 'EMP-924', name: 'Aditya Nurrahman', grade: 'Senior', date: '2026-03-06', reason: 'Pindah ke korporasi', regrettable: true },
  ];

  const UNITS = {
    'U-KOM': { name: 'Audit Komersial', lead: 'EMP-002' },
    'U-JK': { name: 'Audit Jasa Keuangan', lead: 'EMP-003' },
    'U-LEAD': { name: 'Kepemimpinan & Mutu', lead: 'EMP-001' },
  };
  /* 2026-07-06 — pegawai FIRM-OPS (non-audit): Admin & HR + Finance. SENGAJA TERPISAH dari STAFF
     (roster STAFF berbentuk audit-staffing: grade/util/engagements/cert — view HCM/Talent/Capacity
     mengindeks by grade & akan crash utk grade non-audit). Mereka TETAP karyawan KAP: punya data
     personal sendiri (PAYROLL/LEAVE_BALANCE/STAFF_PROFILE ber-id EMP-501/601) → dashboard "Data
     Personal Saya" mereka terisi. resolveEmpId (klien+server) mencari STAFF ∪ FIRM_STAFF. */
  const FIRM_STAFF = [
    { id: 'EMP-501', name: 'Yuni Marlina', role: 'Admin & HR Firma', grade: 'Staf Firma', dept: 'SDM & Umum', email: 'yuni.m@whr-cpa.id', joined: 2019, status: 'Aktif', firmOps: true },
    { id: 'EMP-601', name: 'Teguh Prasetyo', role: 'Finance Firma', grade: 'Staf Firma', dept: 'Keuangan Firma', email: 'teguh.p@whr-cpa.id', joined: 2020, status: 'Aktif', firmOps: true },
  ];

  /* ---- E: CPE/PPL requirement & records (annual 40 SKP; 20 terstruktur) ---- */
  /* PMK 186/2021 Pasal 37 — ambang SSOT ada di `canon_ppl.PPL_REQ_PMK186`.
     Nilai di sini adalah cermin untuk konsumen lama; `structured` dikoreksi
     20 → 30 (angka 20 adalah materi wajib 4+16 DI DALAM yang terstruktur,
     bukan minimum terstrukturnya). `unstructuredCap` sebelumnya tak ada
     sama sekali, sehingga SKP tidak terstruktur berlebih ikut dihitung. */
  const CPE_REQ = { annual: 40, structured: 30, unstructuredCap: 10, year: 2026 };
  /* per staff: structured + unstructured hours logged this year */
  const CPE_LOG = {
    'EMP-001': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 10, date: '2026-03-01' }],
    'EMP-002': [{ t: 'Update SA Terkini (IAPI)', type: 'Terstruktur', skp: 8, date: '2026-02-10', topic: 'akuntansi' }, { t: 'Etika Profesi & Independensi', type: 'Terstruktur', skp: 4, date: '2026-01-18', topic: 'pembinaan' }, { t: 'Pembacaan jurnal teknis', type: 'Tidak Terstruktur', skp: 6, date: '2026-03-02' }],
    'EMP-003': [{ t: 'PSAK 117 (Kontrak Asuransi)', type: 'Terstruktur', skp: 8, date: '2026-02-12', topic: 'akuntansi' }, { t: 'SMM 1 Implementation Workshop', type: 'Terstruktur', skp: 6, date: '2026-01-22', topic: 'pembinaan' }, { t: 'Audit Berbasis Risiko', type: 'Terstruktur', skp: 8, date: '2026-02-26', topic: 'akuntansi' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 9, date: '2026-03-05' }],
    'EMP-007': [{ t: 'PSAK 71 Deep Dive', type: 'Terstruktur', skp: 8, date: '2026-02-15', topic: 'akuntansi' }, { t: 'Audit Data Analytics', type: 'Terstruktur', skp: 6, date: '2026-01-30', topic: 'akuntansi' }, { t: 'Webinar Pajak Coretax', type: 'Terstruktur', skp: 4, date: '2026-03-04', topic: 'lain' }, { t: 'Self-study standar', type: 'Tidak Terstruktur', skp: 14, date: '2026-03-06' }],
    'EMP-021': [{ t: 'Audit Sampling MUS', type: 'Terstruktur', skp: 6, date: '2026-02-20', topic: 'akuntansi' }, { t: 'Self-study', type: 'Tidak Terstruktur', skp: 6, date: '2026-03-02' }],
    'EMP-031': [{ t: 'Onboarding Audit Methodology', type: 'Terstruktur', skp: 12, date: '2026-01-15', topic: 'akuntansi' }],
    ...CPE_EXT,   // PR-4 — SKP personel tambahan roster
  };


  /* ---- Register penandatanganan AP (PRD sdm-kepatuhan PR-7 · SC-23) ----
     `tenure` di `INDEPENDENCE` dulu DIKETIK (`tenure: 7`). Aplikasi punya riwayat
     perikatan tetapi tak pernah menghitung tahun berturut dari sana, dan
     `cooloff: 2` adalah data yang tak dievaluasi apa pun.

     Register ini adalah peristiwanya: satu baris per (AP × klien × tahun buku).
     `canon_rotation.consecutiveYears()` menurunkan masa tugas darinya, sehingga
     angka masa tugas berhenti dapat diketik dan masa jeda dapat diperiksa.

     Tahun disusun agar masa tugas turunan menutup ke angka lama — KECUALI
     Lestari Handayani: `tenure: 2.5` tak dapat dinyatakan oleh register
     bertahun-buku. Dibulatkan KE ATAS (3) karena untuk gerbang kepatuhan,
     mengecilkan masa tugas berarti mengecilkan risiko rotasi. */
  const ROTATION_YEAR = 2026;
  const AP_SIGNING_HISTORY = [
    { ap: 'EMP-001', client: 'PT Sentosa Makmur Tbk', year: 2022 },
    { ap: 'EMP-001', client: 'PT Sentosa Makmur Tbk', year: 2023 },
    { ap: 'EMP-001', client: 'PT Sentosa Makmur Tbk', year: 2024 },
    { ap: 'EMP-001', client: 'PT Sentosa Makmur Tbk', year: 2025 },
    { ap: 'EMP-001', client: 'PT Sentosa Makmur Tbk', year: 2026 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2020 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2021 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2022 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2023 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2024 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2025 },
    { ap: 'EMP-002', client: 'PT Graha Properti Investama', year: 2026 },
    { ap: 'EMP-003', client: 'PT Cahaya Logistik Nusantara', year: 2024 },
    { ap: 'EMP-003', client: 'PT Cahaya Logistik Nusantara', year: 2025 },
    { ap: 'EMP-003', client: 'PT Cahaya Logistik Nusantara', year: 2026 },
    { ap: 'EMP-004', client: 'PT Bank Arta Nusantara Tbk', year: 2024 },
    { ap: 'EMP-004', client: 'PT Bank Arta Nusantara Tbk', year: 2025 },
    { ap: 'EMP-004', client: 'PT Bank Arta Nusantara Tbk', year: 2026 },
    /* Rotasi lampau — dipakai menguji masa jeda: Hartono keluar dari Bumi Hijau
       setelah 2023 dan belum boleh kembali sebelum tahun buku 2026. */
    { ap: 'EMP-001', client: 'PT Bumi Hijau Agrindo', year: 2021 },
    { ap: 'EMP-001', client: 'PT Bumi Hijau Agrindo', year: 2022 },
    { ap: 'EMP-001', client: 'PT Bumi Hijau Agrindo', year: 2023 },
  ];

  /* ---- E: Independence declarations & partner rotation ----
     Ambang rotasi AP terdiferensiasi per rezim (SSOT):
       · PIE umum            → 5 th berturut  (PP 20/2015 Ps. 11)
       · Sektor jasa keuangan → 3 th berturut  (POJK 13/POJK.03/2017)
     cooling-off 2 tahun. Non-PIE: tidak ada batas statutori AP. */
  const INDEPENDENCE_BASE = [
    { id: 'EMP-001', name: 'Hartono Wijaya', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: 'PT Sentosa Makmur Tbk', rotationLimit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', listed: true },
    { id: 'EMP-002', name: 'Rudi Gunawan', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: 'PT Graha Properti Investama', rotationLimit: 5, sektorJK: false, sektor: 'PIE umum', basis: 'PP 20/2015 Ps. 11', listed: true },
    { id: 'EMP-003', name: 'Sari Dewanti', declared: true, conflicts: 1, finInterest: 'Saudara bekerja di calon klien (di-mitigasi)', rotationClient: 'PT Cahaya Logistik Nusantara', rotationLimit: 5, sektorJK: false, sektor: 'Non-PIE', basis: 'Kebijakan firma (tanpa batas statutori)', listed: false },
    { id: 'EMP-004', name: 'Lestari Handayani', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: 'PT Bank Arta Nusantara Tbk', rotationLimit: 3, sektorJK: true, sektor: 'Jasa keuangan (bank)', basis: 'POJK 13/POJK.03/2017', listed: true },
    { id: 'EMP-007', name: 'Anindya Pramesti', declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: '—', rotationLimit: 5, sektorJK: false, sektor: '—', basis: '—', listed: false },
    { id: 'EMP-008', name: 'Bayu Saputra', declared: false, conflicts: 0, finInterest: 'Belum dideklarasikan', rotationClient: '—', rotationLimit: 5, sektorJK: false, sektor: '—', basis: '—', listed: false },
  ];

  /* Masa tugas & masa jeda DITURUNKAN dari `AP_SIGNING_HISTORY` (canon_rotation),
     bukan diketik. Konsumen lama (`view_people`, `data_licensing`, `view_pppk`)
     tetap membaca `d.tenure`/`d.cooloff` seperti sebelumnya — yang berubah
     adalah dari mana angkanya berasal. */
  const INDEPENDENCE = INDEPENDENCE_BASE.map((d) => {
    const regime = rotationRegimeOf({ sektorJK: !!d.sektorJK, listed: !!d.listed });
    const st = rotationState({
      ap: d.id, client: d.rotationClient, history: AP_SIGNING_HISTORY,
      asOfYear: ROTATION_YEAR, sektorJK: !!d.sektorJK, listed: !!d.listed,
    });
    const cool = coolOffState({ ap: d.id, client: d.rotationClient, history: AP_SIGNING_HISTORY, asOfYear: ROTATION_YEAR, regime });
    return {
      ...d,
      tenure: st.tenure,
      rotationLimit: regime.limit > 0 ? regime.limit : d.rotationLimit,
      cooloff: regime.cooloff,
      rotationTier: st.tier,
      rotationBreached: st.breached,
      rotationBasis: regime.basis,
      coolOffSatisfied: cool.satisfied,
      coolOffEligibleFrom: cool.eligibleFrom,
    };
  });

  /* ---- F: Firm GL — chart of accounts ---- */
  const FIRM_COA = [
    /* KAS PER REKENING (PRD cash-bank-reconciliation-register 2026-08-15).
       Dulu SATU akun `1-100 Kas & Bank` untuk ENAM rekening. Akibatnya saldo BUKU per
       rekening tak dapat diturunkan dari mana pun — padahal itu satu sisi dari setiap
       rekonsiliasi bank. Rekonsiliasi lima rekening bukan "belum dikerjakan", ia
       MUSTAHIL dirumuskan; dan selisih Rp 2.055 jt antara Σ rekening dan kontrol GL
       tak punya pemilik (97% tanpa penjelasan).

       Kini tiap rekening punya akunnya sendiri, sehingga saldo buku DITURUNKAN dari
       jurnal terposting dan `Σ sub-akun == kontrol kas` benar SECARA KONSTRUKSI,
       bukan karena dicocokkan. Σ keenam = 8.420.000.000, persis saldo `1-100` yang
       digantikannya → nol-delta pada figur firma mana pun.

       Valas dicatat pada KURS BUKU (`FX_BOOK`); selisih ke kurs pasar adalah
       revaluasi, bukan item rekonsiliasi. Lihat `data_part2.BANK_RECONS`. */
    { code: '1-101', name: 'BCA — Operasional', type: 'Aset', bal: 4_425_000_000 },
    { code: '1-102', name: 'Mandiri — Penggajian', type: 'Aset', bal: 1_180_000_000 },
    { code: '1-103', name: 'BNI — Pajak & Escrow', type: 'Aset', bal: 940_000_000 },
    { code: '1-104', name: 'BCA — Valas USD', type: 'Aset', bal: 788_125_000 },      // USD 48.500 @ kurs penutup 16.250 (setelah JV-0319)
    { code: '1-105', name: 'DBS — Cabang Singapura', type: 'Aset', bal: 1_112_215_000 }, // SGD 92.300 @ kurs penutup 12.050 (setelah JV-0320)
    { code: '1-106', name: 'Kas Kecil', type: 'Aset', bal: 35_298_000 },
    { code: '1-200', name: 'Piutang Usaha (klien)', type: 'Aset', bal: 4_440_000_000 },
    { code: '1-300', name: 'WIP Belum Ditagih', type: 'Aset', bal: 9_300_000_000 },
    { code: '1-400', name: 'Aset Tetap — neto', type: 'Aset', bal: 6_100_000_000 },
    { code: '2-100', name: 'Utang Usaha (vendor)', type: 'Liabilitas', bal: -1_820_000_000 },
    { code: '2-200', name: 'Utang Pajak', type: 'Liabilitas', bal: -940_000_000 },
    { code: '2-300', name: 'Beban Akrual', type: 'Liabilitas', bal: -1_260_000_000 },
    { code: '3-100', name: 'Modal Rekan', type: 'Ekuitas', bal: -14_000_000_000 },
    { code: '3-200', name: 'Saldo Laba', type: 'Ekuitas', bal: -7_440_000_000 },
    { code: '4-100', name: 'Pendapatan Jasa', type: 'Pendapatan', bal: -11_300_000_000 },
    { code: '5-100', name: 'Beban Gaji & Tunjangan', type: 'Beban', bal: 5_420_000_000 },
    { code: '5-200', name: 'Beban Overhead Kantor', type: 'Beban', bal: 1_570_000_000 },
    { code: '5-300', name: 'Beban Umum & Administrasi', type: 'Beban', bal: 540_000_000 },
    { code: '5-400', name: 'Beban Pemasaran & Pengembangan', type: 'Beban', bal: 360_000_000 },
    { code: '5-500', name: 'Beban Teknologi & Lisensi', type: 'Beban', bal: 610_000_000 },
    /* PSAK 10: pos moneter valas dijabarkan ulang pada kurs penutup, selisihnya diakui
       dalam laba rugi. Sebelum ini aplikasi MENGHITUNG selisih itu (tab "Revaluasi
       Valas": +Rp 61 jt "belum terealisasi") tetapi tak pernah membukukannya — angka di
       layar yang tak ada di buku besar, kelas cacat yang sama dengan kolom `actual`
       anggaran (#242). Kini ia diposting lewat JV-0319/JV-0320.
       Bertipe `Beban` dengan saldo KREDIT (negatif) = laba neto, supaya "Pendapatan KAP
       (GL 4-100)" tetap berarti pendapatan jasa dan tidak digelembungkan selisih kurs. */
    { code: '5-600', name: 'Laba (Rugi) Selisih Kurs — neto', type: 'Beban', bal: -60_638_000 },
  ];

  /* ---- F: Firm GL — journal entries ----
     PRD budget-actual-ledger-derived 2026-08-15, Bagian B: JEJAK POSTING AKUN KONTROL.

     #239 & #240 menjembatani sub-buku WIP/AR/AP ke "akun kontrol GL". Diukur, ketiga
     akun kontrol itu hampir tak punya jejak posting sama sekali: 1-300 (WIP) NOL jurnal,
     1-200 mutasi 8% dari saldonya, 2-100 mutasi 19%. Selama itu benar, "akun kontrol"
     hanyalah nama untuk sebuah konstanta — tak ada yang bisa ditelusuri.

     JV-0313..JV-0318 memberi ketiganya riwayat operasi biasa: WIP diakui sepanjang waktu
     (PSAK 72), WIP ditagihkan menjadi piutang, faktur & pembayaran vendor.

     NOL-DELTA SECARA ALJABAR: `opening = seed − efek(seedGl)`, jadi menambah jurnal seed
     menggeser SALDO AWAL, bukan saldo kini. Tak satu angka pun di layar berubah —
     yang bertambah hanya jejaknya. (`firm_ledger.test.ts` memaku saldo awal secara
     eksplisit, jadi angka-angka itu memang bergerak di sana — dan memang harus.)

     Urutan menurun (terbaru di atas) mengikuti tampilan modul Firm GL. */
  const FIRM_GL = [
    /* Penjabaran ulang pos moneter valas pada kurs penutup (PSAK 10). Saldo awal tiap
       akun valas tetap pada kurs buku; jurnal inilah yang membawanya ke kurs penutup,
       sehingga buku besar — bukan sekadar sebuah tab — yang menyatakannya. */
    { id: 'JV-0320', date: '2026-03-31', desc: 'Revaluasi kurs penutup — DBS SGD (11.640 → 12.050)', dr: '1-105', cr: '5-600', amount: 37_843_000, posted: true },
    { id: 'JV-0319', date: '2026-03-31', desc: 'Revaluasi kurs penutup — BCA Valas USD (15.780 → 16.250)', dr: '1-104', cr: '5-600', amount: 22_795_000, posted: true },
    { id: 'JV-0318', date: '2026-03-16', desc: 'Langganan lisensi perangkat audit tahunan', dr: '5-500', cr: '2-100', amount: 240_000_000, posted: true },
    { id: 'JV-0317', date: '2026-03-14', desc: 'Beban pemasaran & pengembangan praktik', dr: '5-400', cr: '2-100', amount: 185_000_000, posted: true },
    { id: 'JV-0316', date: '2026-03-13', desc: 'Pembayaran utang vendor jatuh tempo', dr: '2-100', cr: '1-101', amount: 910_000_000, posted: true },
    { id: 'JV-0315', date: '2026-03-11', desc: 'Faktur vendor jasa profesional & langganan riset', dr: '5-300', cr: '2-100', amount: 265_000_000, posted: true },
    { id: 'JV-0314', date: '2026-03-10', desc: 'Penagihan WIP menjadi piutang klien (batch Maret)', dr: '1-200', cr: '1-300', amount: 1_640_000_000, posted: true },
    { id: 'JV-0313', date: '2026-03-09', desc: 'Pengakuan WIP jasa audit berjalan (PSAK 72 — sepanjang waktu)', dr: '1-300', cr: '4-100', amount: 2_850_000_000, posted: true },
    { id: 'JV-0312', date: '2026-03-08', desc: 'Penerimaan pembayaran INV-2026-031 (Sentosa)', dr: '1-101', cr: '1-200', amount: 925_000_000, posted: true },
    { id: 'JV-0311', date: '2026-03-07', desc: 'Pembayaran gaji staf Maret', dr: '5-100', cr: '1-102', amount: 1_820_000_000, posted: true },
    { id: 'JV-0310', date: '2026-03-05', desc: 'Faktur vendor IT & lisensi software', dr: '5-200', cr: '2-100', amount: 340_000_000, posted: true },
    { id: 'JV-0309', date: '2026-03-04', desc: 'Pengakuan pendapatan termin INV-2026-040', dr: '1-200', cr: '4-100', amount: 555_000_000, posted: true },
    { id: 'JV-0308', date: '2026-03-03', desc: 'Sewa kantor kuartal Q1', dr: '5-200', cr: '1-101', amount: 480_000_000, posted: true },
    { id: 'JV-0307', date: '2026-03-01', desc: 'Akrual PPh 21 karyawan', dr: '5-100', cr: '2-200', amount: 210_000_000, posted: false },
  ];

  /* ---- F: Firm AP — vendor payables ---- */
  /* Jembatan sub-buku → kontrol GL, DIENUMERASI (PRD AR/AP 2026-08-15).

     Sebelum ini selisih antara sub-buku dan akun kontrol adalah PLUG tunggal
     (`reconciling = control − open`) yang diberi nama di lapisan VIEW: "termin/retensi"
     untuk AR (Rp 1.745 jt = 65% sub-buku) dan "akrual" untuk AP (Rp 697 jt = 62%).
     Tak satu pun baris termin, retensi, atau akrual benar-benar ada di data. Kini
     keduanya register yang dapat dijumlah; sisa yang tak tercakup disebut "belum
     dijelaskan" dan MEMERAHKAN baris rekonsiliasi. */
  const AR_BRIDGE = [
    { id: 'ARB-TRM-014', kind: 'Termin', ref: 'ENG-2025-014', desc: 'Termin 3 (20%) — pekerjaan selesai, faktur belum terbit', amount: 370_000_000 },
    { id: 'ARB-TRM-063', kind: 'Termin', ref: 'ENG-2025-063', desc: 'Termin final — menunggu penerbitan opini', amount: 550_000_000 },
    { id: 'ARB-RET-031', kind: 'Retensi', ref: 'ENG-2025-031', desc: 'Retensi 10% ditahan klien s/d penyerahan laporan', amount: 126_000_000 },
    { id: 'ARB-RET-040', kind: 'Retensi', ref: 'ENG-2025-040', desc: 'Retensi 10% ditahan klien s/d penyerahan laporan', amount: 207_000_000 },
    { id: 'ARB-TRM-058', kind: 'Termin', ref: 'ENG-2025-058', desc: 'Termin 2 — disetujui, faktur dalam proses', amount: 492_000_000 },
  ];
  const AP_BRIDGE = [
    { id: 'APB-ACR-PPL', kind: 'Akrual', vendor: 'IAPI · PPL & keanggotaan', desc: 'Akrual iuran & PPL kuartal berjalan', amount: 185_000_000 },
    { id: 'APB-ACR-EXP', kind: 'Akrual', vendor: 'Pakar eksternal (SA 620)', desc: 'Jasa pakar terpakai, invoice belum diterima', amount: 240_000_000 },
    { id: 'APB-PRC-IT',  kind: 'Dalam proses', vendor: 'PT Solusi Teknologi Audit', desc: 'Faktur diterima, menunggu persetujuan tiga-arah', amount: 272_000_000 },
  ];

  const FIRM_AP = [
    { id: 'AP-0042', vendor: 'PT Solusi Teknologi Audit', cat: 'Software & Lisensi', issued: '2026-02-20', due: '2026-03-22', amount: 340_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0041', vendor: 'PT Properti Graha Kantor', cat: 'Sewa Kantor', issued: '2026-03-01', due: '2026-03-31', amount: 480_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0040', vendor: 'CV Cipta Kreatif Media', cat: 'Marketing & Branding', issued: '2026-02-10', due: '2026-03-12', amount: 95_000_000, paid: 0, status: 'Overdue' },
    { id: 'AP-0039', vendor: 'PT Asuransi Profesi Indonesia', cat: 'Asuransi PI', issued: '2026-01-15', due: '2026-02-14', amount: 620_000_000, paid: 620_000_000, status: 'Paid' },
    { id: 'AP-0038', vendor: 'Koperasi Karyawan WHR', cat: 'Operasional', issued: '2026-02-25', due: '2026-03-27', amount: 130_000_000, paid: 0, status: 'Outstanding' },
    { id: 'AP-0037', vendor: 'PT Listrik & Utilitas', cat: 'Utilitas', issued: '2026-03-02', due: '2026-04-01', amount: 78_000_000, paid: 0, status: 'Outstanding' },
  ];

  /* ---- Front-office: Client & Engagement Onboarding pipeline ---- */
  /* Each prospect carries 4 gates: acceptance · pmpj · letter · convert. */
  const ACC_FACTORS = (over: any = {}) => [
    { k: 'Integritas & Reputasi Manajemen', w: 25, s: 3, note: '', ...over[0] },
    { k: 'Independensi & Konflik Kepentingan', w: 20, s: 3, note: '', ...over[1] },
    { k: 'Kompetensi, Waktu & Kapasitas Tim', w: 20, s: 3, note: '', ...over[2] },
    { k: 'Risiko Perikatan & Industri', w: 25, s: 3, note: '', ...over[3] },
    { k: 'Etika & Proporsionalitas Imbalan', w: 10, s: 3, note: '', ...over[4] },
  ];
  /* Faktor penilaian KEBERLANJUTAN (SMM 1 ¶34(d) / SA 220.20–21) — paralel ACC_FACTORS,
     Σ bobot = 100; skor 1–5 + catatan diisi saat reasesmen tahunan. */
  const CONT_FACTORS = (over: Record<number, { k?: string; w?: number; s?: number; note?: string }> = {}) => [
    { k: 'Integritas & perubahan keadaan manajemen/tata kelola', w: 20, s: 3, note: '', ...over[0] },
    { k: 'Pengalaman tahun lalu: opini, temuan signifikan, kesulitan', w: 25, s: 3, note: '', ...over[1] },
    { k: 'Independensi & ancaman (rotasi/kedekatan, kepentingan pribadi/fee)', w: 20, s: 3, note: '', ...over[2] },
    { k: 'Kompetensi, kapasitas & sumber daya tahun berjalan', w: 15, s: 3, note: '', ...over[3] },
    { k: 'Risiko klien/industri & regulasi', w: 10, s: 3, note: '', ...over[4] },
    { k: 'Etika & proporsionalitas/kolektibilitas imbalan', w: 10, s: 3, note: '', ...over[5] },
  ];
  /* Pengalaman tahun lalu per klien — data REFERENSI (bukan kolom CRM klien;
     tidak melewati hidrasi server, jadi disimpan sebagai peta ber-clientId).
     Dibaca modul Keberlanjutan sebagai pemicu (SA 220.A24 / SMM 1 ¶34(d)). */
  const PRIOR_YEAR: Record<string, { fy: string; opinion: string; findings: number; findingsNote: string; uncorrected: number; changed: string; difficulties: string }> = {
    'C-014': { fy: 'FY2024', opinion: 'WTP', findings: 1, findingsNote: 'Cut-off pendapatan akhir tahun — dikoreksi', uncorrected: 0, changed: 'Tahun ke-5 partner penanggung jawab — mendekati ambang rotasi', difficulties: '' },
    'C-022': { fy: 'FY2024', opinion: 'WTP', findings: 0, findingsNote: '', uncorrected: 0, changed: '', difficulties: '' },
    'C-031': { fy: 'FY2024', opinion: 'WDP', findings: 2, findingsNote: 'Nilai wajar aset biologis kurang ditopang bukti', uncorrected: 1_800_000_000, changed: 'Ekspansi lahan perkebunan baru', difficulties: 'Akses data kebun terpencil terbatas' },
    'C-040': { fy: 'FY2024', opinion: 'WTP-EoM', findings: 1, findingsNote: 'Ketidakpastian estimasi ECL (paragraf penekanan suatu hal)', uncorrected: 0, changed: 'Regulasi OJK multifinance baru', difficulties: '' },
    'C-047': { fy: 'FY2024', opinion: 'WTP', findings: 0, findingsNote: '', uncorrected: 0, changed: 'Pertumbuhan cepat & migrasi sistem akuntansi', difficulties: '' },
    'C-058': { fy: 'FY2024', opinion: 'WTP', findings: 0, findingsNote: '', uncorrected: 0, changed: '', difficulties: '' },
    'C-063': { fy: 'FY2024', opinion: 'WTP', findings: 1, findingsNote: 'Timing pengakuan pendapatan properti', uncorrected: 900_000_000, changed: '', difficulties: '' },
  };
  const PROSPECTS = [
    {
      id: 'PROS-01', name: 'PT Pelita Energi Nusantara', industry: 'Energi · Pembangkit Listrik', city: 'Jakarta Selatan',
      listed: false, kind: 'Klien Baru', service: 'Audit LK + Jasa Pajak', standard: 'SA + PSAK 71',
      partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', fee: 1_280_000_000, materiality: 3_400_000_000,
      npwp: '02.667.881.3-091.000', fyEnd: '31 Desember 2025', deadline: '2026-05-15', budgetHrs: 1680, source: 'OPP-103',
      acceptance: {
        approved: true, decision: 'Terima dengan Syarat', approver: 'Rudi Gunawan, CPA', date: '2026-02-18',
        safeguard: 'Tambahkan spesialis industri energi & pakar pajak; EDD atas pemilik manfaat PEP.',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Penelusuran media & rekam jejak litigasi: tidak ada temuan material.' },
          1: { s: 5, note: 'Tidak ada kepentingan keuangan/keluarga; rotasi partner aman.' },
          2: { s: 3, note: 'Memerlukan spesialis industri energi & pakar pajak.' },
          3: { s: 3, note: 'Regulasi ketenagalistrikan, subsidi & PSAK 71 — risiko sedang–tinggi.' },
          4: { s: 4, note: 'Imbalan wajar, tidak ada indikasi lowballing.' },
        }),
      },
      pmpj: {
        verified: false, riskRating: 'Tinggi', cddLevel: 'Mendalam (EDD)', str: false, purpose: 'Perikatan audit & kepatuhan pajak tahunan.',
        ubo: [
          { name: 'Bambang Sutrisno', pct: 42, role: 'Komisaris Utama', idType: 'KTP', idNo: '3174••••••••0012', pep: true },
          { name: 'Pelita Holdings Pte Ltd (SG)', pct: 33, role: 'Pemegang Saham Korporasi', idType: 'Reg. SG', idNo: '2018•••••W', pep: false },
          { name: 'Dewi Anggraini', pct: 25, role: 'Direktur Utama', idType: 'KTP', idNo: '3174••••••••0024', pep: false },
        ],
        screening: [
          { name: 'Bambang Sutrisno', list: 'PEP — eks-pejabat BUMN 2019–2022', hit: true, status: 'Mitigasi: EDD + persetujuan partner' },
          { name: 'PT Pelita Energi Nusantara', list: 'DTTOT / Daftar Terduga Teroris', hit: false, status: 'Bersih' },
          { name: 'Pelita Holdings Pte Ltd', list: 'OFAC / UN Consolidated List', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai SA + jasa kepatuhan PPh Badan.', esign: ([] as any[]) },
    },
    {
      id: 'PROS-02', name: 'PT Sari Boga Internasional', industry: 'Manufaktur · F&B', city: 'Tangerang, Banten',
      listed: false, kind: 'Klien Baru', service: 'Audit Laporan Keuangan', standard: 'SA',
      partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 720_000_000, materiality: 1_600_000_000,
      npwp: '04.551.220.8-411.000', fyEnd: '31 Desember 2025', deadline: '2026-06-20', budgetHrs: 940, source: 'OPP-104',
      acceptance: {
        approved: false, decision: '', approver: '', date: '', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 3, note: 'Menunggu konfirmasi auditor pendahulu (SA 300/SA 510).' },
          1: { s: 4, note: 'Belum teridentifikasi konflik; konfirmasi independensi tim berjalan.' },
          2: { s: 4, note: 'Kapasitas tim memadai untuk skala perikatan.' },
          3: { s: 3, note: 'Risiko cut-off & retur penjualan distribusi F&B.' },
          4: { s: 3, note: 'Imbalan kompetitif; perlu uji proporsionalitas terhadap ruang lingkup.' },
        }),
      },
      pmpj: {
        verified: false, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan audit laporan keuangan tahunan.',
        ubo: [
          { name: 'Hendra Wijaya', pct: 60, role: 'Pemegang Saham Pengendali', idType: 'KTP', idNo: '3603••••••••0009', pep: false },
          { name: 'Maria Tanudjaja', pct: 40, role: 'Komisaris', idType: 'KTP', idNo: '3603••••••••0017', pep: false },
        ],
        screening: [
          { name: 'Hendra Wijaya', list: 'PEP / DTTOT', hit: false, status: 'Bersih' },
          { name: 'PT Sari Boga Internasional', list: 'Daftar Sanksi', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai Standar Audit (SA).', esign: [] },
    },
    {
      id: 'PROS-03', name: 'PT Karya Beton Perkasa', industry: 'Konstruksi & Material', city: 'Semarang, Jawa Tengah',
      listed: false, kind: 'Klien Baru', service: 'Audit Laporan Keuangan', standard: 'SA',
      partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', fee: 640_000_000, materiality: 1_350_000_000,
      npwp: '02.901.337.2-407.000', fyEnd: '31 Desember 2025', deadline: '2026-04-30', budgetHrs: 880, source: 'OPP-101', clientId: 'C-052',
      acceptance: {
        approved: true, decision: 'Terima', approver: 'Hartono Wijaya, CPA', date: '2026-02-26', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Reputasi baik; tidak ada catatan negatif.' },
          1: { s: 5, note: 'Tidak ada konflik; independensi tim dikonfirmasi.' },
          2: { s: 4, note: 'Tim & jadwal tersedia sesuai tenggat.' },
          3: { s: 3, note: 'Pengakuan pendapatan kontrak konstruksi (PSAK 72) — perhatian.' },
          4: { s: 4, note: 'Imbalan proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Perikatan audit laporan keuangan tahunan.',
        ubo: [
          { name: 'Sutopo Hadi', pct: 55, role: 'Direktur Utama / Pendiri', idType: 'KTP', idNo: '3374••••••••0003', pep: false },
          { name: 'Karya Investama (Holding)', pct: 45, role: 'Pemegang Saham Korporasi', idType: 'NIB', idNo: '8120•••••', pep: false },
        ],
        screening: [
          { name: 'Sutopo Hadi', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih' },
          { name: 'PT Karya Beton Perkasa', list: 'Daftar Sanksi', hit: false, status: 'Bersih' },
        ],
      },
      letter: { version: 1, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai Standar Audit (SA).', esign: ([] as any[]) },
    },
    {
      id: 'PROS-04', name: 'PT Sentosa Makmur Tbk', industry: 'Manufaktur · Consumer Goods', city: 'Bekasi, Jawa Barat',
      listed: true, kind: 'Keberlanjutan', service: 'Audit Laporan Keuangan', standard: 'SA (ISA-converged)',
      partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti', fee: 1_850_000_000, materiality: 4_250_000_000,
      npwp: '01.234.567.8-045.000', fyEnd: '31 Desember 2025', deadline: '2026-03-31', budgetHrs: 1840, source: 'Eksisting', clientId: 'C-014',
      priorYear: 'Opini Wajar Tanpa Modifikasian (FY2024). Tahun ke-5 partner — pantau ambang rotasi.',
      acceptance: {
        approved: false, decision: '', approver: '', date: '', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Hubungan baik; tidak ada perubahan integritas signifikan.' },
          1: { s: 3, note: 'Tahun ke-5 partner penanggung jawab — dekati ambang rotasi (7 thn).' },
          2: { s: 4, note: 'Tim eksisting memahami bisnis klien.' },
          3: { s: 4, note: 'Indikasi channel stuffing tahun lalu — risiko kecurangan pendapatan naik.' },
          4: { s: 4, note: 'Imbalan disesuaikan inflasi; proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Sedang', cddLevel: 'Standar (pembaruan tahunan)', str: false, purpose: 'Pembaruan PMPJ atas perikatan keberlanjutan.',
        ubo: [
          { name: 'Keluarga Sentosa (Trust)', pct: 51, role: 'Pengendali Utama', idType: 'Akta', idNo: 'No. 14/2016', pep: false },
          { name: 'Publik (IDX free-float)', pct: 35, role: 'Publik', idType: '—', idNo: '—', pep: false },
          { name: 'Lim Investment Ltd', pct: 14, role: 'Pemegang Saham', idType: 'Reg. SG', idNo: '2014•••••X', pep: false },
        ],
        screening: [
          { name: 'Pengurus & Pemegang Saham >25%', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih (pembaruan tahunan)' },
        ],
      },
      letter: { version: 0, status: 'draft', scope: 'Audit atas laporan keuangan FY2025 sesuai SA (perikatan keberlanjutan).', esign: ([] as any[]) },
    },
    {
      id: 'PROS-05', name: 'PT Bahari Logistik Prima', industry: 'Transportasi & Logistik', city: 'Surabaya, Jawa Timur',
      listed: false, kind: 'Klien Baru', service: 'Review (SPR 2400)', standard: 'SPR 2400',
      partner: 'Sari Dewanti, CPA', manager: 'Bayu Saputra', fee: 380_000_000, materiality: 900_000_000,
      npwp: '02.778.114.5-622.000', fyEnd: '31 Desember 2025', deadline: '2026-05-31', budgetHrs: 520, source: 'OPP-107',
      acceptance: {
        approved: true, decision: 'Terima', approver: 'Sari Dewanti, CPA', date: '2026-02-10', safeguard: '',
        factors: ACC_FACTORS({
          0: { s: 4, note: 'Reputasi & rekam jejak baik.' },
          1: { s: 5, note: 'Tidak ada konflik.' },
          2: { s: 4, note: 'Kapasitas memadai (perikatan reviu, lingkup terbatas).' },
          3: { s: 4, note: 'Risiko rendah–sedang; keyakinan terbatas.' },
          4: { s: 4, note: 'Imbalan proporsional.' },
        }),
      },
      pmpj: {
        verified: true, riskRating: 'Rendah', cddLevel: 'Sederhana', str: false, purpose: 'Perikatan reviu laporan keuangan tahunan.',
        ubo: [
          { name: 'Agus Santoso', pct: 70, role: 'Direktur Utama / Pendiri', idType: 'KTP', idNo: '3578••••••••0001', pep: false },
          { name: 'Linda Santoso', pct: 30, role: 'Komisaris', idType: 'KTP', idNo: '3578••••••••0019', pep: false },
        ],
        screening: [
          { name: 'Agus Santoso', list: 'PEP / DTTOT / OFAC', hit: false, status: 'Bersih' },
        ],
      },
      letter: {
        version: 2, status: 'signed', scope: 'Reviu atas laporan keuangan FY2025 sesuai SPR 2400 (keyakinan terbatas).',
        signedBy: 'Agus Santoso (Direktur Utama)', signedDate: '2026-03-04',
        esign: [
          { t: 'Surat dibuat (v1)', who: 'Bayu Saputra', date: '2026-02-26' },
          { t: 'Dikirim untuk tanda tangan (PrivyID)', who: 'Sistem', date: '2026-03-01' },
          { t: 'Ditandatangani klien & partner', who: 'PrivyID', date: '2026-03-04' },
        ],
      },
    },
    {
      id: 'PROS-06', name: 'PT Mega Properti Sentosa', industry: 'Properti & Real Estate', city: 'Jakarta Pusat',
      listed: false, kind: 'Klien Baru', service: 'Due Diligence', standard: 'SJAH 3000',
      partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', fee: 950_000_000, materiality: 2_000_000_000,
      npwp: '01.992.554.0-079.000', fyEnd: '31 Desember 2025', deadline: '2026-04-10', budgetHrs: 720, source: 'OPP-105',
      converted: true, convertedTo: 'ENG-2025-0X',
      acceptance: { approved: true, decision: 'Terima', approver: 'Rudi Gunawan, CPA', date: '2026-01-20', safeguard: '', factors: ACC_FACTORS({ 0: { s: 4 }, 1: { s: 5 }, 2: { s: 4 }, 3: { s: 4 }, 4: { s: 4 } }) },
      pmpj: { verified: true, riskRating: 'Sedang', cddLevel: 'Standar', str: false, purpose: 'Uji tuntas keuangan (financial due diligence).', ubo: [{ name: 'Mega Group Holding', pct: 100, role: 'Korporasi', idType: 'NIB', idNo: '9120•••••', pep: false }], screening: [{ name: 'Mega Group Holding', list: 'PEP / Sanksi', hit: false, status: 'Bersih' }] },
      letter: { version: 1, status: 'signed', scope: 'Perikatan asurans uji tuntas keuangan sesuai SJAH 3000.', signedBy: 'Direktur Mega Group', signedDate: '2026-02-28', esign: [{ t: 'Ditandatangani', who: 'PrivyID', date: '2026-02-28' }] },
    },
  ];

  /* ---- Firm Finance (ERP) — Treasury, Tax, Revenue ---- */
  /* FX rates to IDR (per 28 Feb 2026) */

export { FIRM, USER, CLIENTS, ENGAGEMENTS, WTB, AJE, RISKS, RISKS_PORTFOLIO, ENG_RISK_SEED, TEAM, WORKPAPERS, ACTIVITY, DEADLINES, REVIEW_NOTES, TIME_ENTRIES, PIPELINE, INVOICES, SCHEDULE, STAFF, EXITS, AP_SIGNING_HISTORY, UNITS, FIRM_STAFF, CPE_REQ, CPE_LOG, INDEPENDENCE, FIRM_COA, FIRM_GL, FIRM_AP, AR_BRIDGE, AP_BRIDGE, ACC_FACTORS, CONT_FACTORS, PRIOR_YEAR, PROSPECTS };
