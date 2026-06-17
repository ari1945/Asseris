/* ============================================================
   NeoSuite AMS — Backoffice & Firm Mgmt: data
   KAP Wijaya Hartono & Rekan (WHR). Plain JS → window.BO.
   Anchor "hari ini" = 2026-03-09 (selaras modul lain).
   ============================================================ */
(function () {
  const today = new Date('2026-03-09');
  const daysTo = (d) => Math.round((new Date(d) - today) / 864e5);

  /* ---------------- Pengadaan & Vendor (MASTER — sumber tunggal counterparty) ----------------
     Setiap vendor = satu record kanonik: identitas (NPWP/rekening), termin,
     PMPJ/diligence, kontrak tertaut (→ Legal SSOT), kinerja (SLA) & tren belanja.
     ytd = belanja tahun berjalan; modul lain MENUNJUK ke record ini, tak menyalin. */
  const VENDORS = [
    { id: 'V-018', name: 'PT Solusi Cloud Nusantara', cat: 'TI & SaaS', npwp: '02.114.557.8-013', since: 2019, ytd: 642_000_000, rating: 4.6, risk: 'Rendah', status: 'Aktif', terms: 'Net 30', pic: 'Andini R.', diligence: 'Lengkap', onboard: '2019-03-04', bank: 'BCA · 0142-557-883', email: 'billing@solusicloud.co.id', kontrak: ['OPS-LIC-02', 'OPS-LIC-04', 'OPS-LIC-05'], otp: 97, qual: 4.6, disp: 0, tr: [48, 52, 50, 55, 58, 60] },
    { id: 'V-021', name: 'CV Mitra Cetak Dokumen', cat: 'Percetakan & ATK', npwp: '01.998.220.4-007', since: 2017, ytd: 184_500_000, rating: 4.1, risk: 'Rendah', status: 'Aktif', terms: 'Net 14', pic: 'Bayu S.', diligence: 'Lengkap', onboard: '2017-06-12', bank: 'Mandiri · 1330-009-447', email: 'order@mitracetak.id', kontrak: [], otp: 92, qual: 4.0, disp: 0, tr: [14, 16, 12, 15, 17, 14] },
    { id: 'V-024', name: 'PT Sewa Gedung Sentral Plaza', cat: 'Sewa & Fasilitas', npwp: '01.445.881.2-021', since: 2015, ytd: 2_280_000_000, rating: 4.8, risk: 'Rendah', status: 'Aktif', terms: 'Tahunan', pic: 'Citra W.', diligence: 'Lengkap', onboard: '2015-01-08', bank: 'BNI · 0445-881-200', email: 'leasing@sentralplaza.co.id', kontrak: ['OPS-LEASE'], otp: 99, qual: 4.8, disp: 0, tr: [190, 190, 190, 190, 190, 190] },
    { id: 'V-029', name: 'PT Audit Tools Global', cat: 'Lisensi Software Audit', npwp: '03.221.660.9-055', since: 2020, ytd: 1_120_000_000, rating: 4.7, risk: 'Rendah', status: 'Aktif', terms: 'Tahunan', pic: 'Andini R.', diligence: 'Lengkap', onboard: '2020-02-19', bank: 'BCA · 0322-166-095', email: 'ar@audittools.com', kontrak: ['OPS-LIC-01'], otp: 98, qual: 4.7, disp: 0, tr: [93, 93, 93, 93, 94, 94] },
    { id: 'V-033', name: 'PT Travel Korpora Indonesia', cat: 'Perjalanan Dinas', npwp: '02.667.013.5-018', since: 2021, ytd: 498_000_000, rating: 3.9, risk: 'Sedang', status: 'Aktif', terms: 'Net 30', pic: 'Dwi P.', diligence: 'Perlu Reviu', onboard: '2021-04-01', bank: 'Mandiri · 2667-013-518', email: 'corporate@travelkorpora.id', kontrak: ['OPS-MOU'], otp: 88, qual: 3.8, disp: 1, tr: [38, 46, 28, 34, 52, 21] },
    { id: 'V-037', name: 'PT Sekuriti Data Prima', cat: 'Keamanan & Pemusnahan Arsip', npwp: '01.330.774.6-009', since: 2022, ytd: 156_000_000, rating: 4.3, risk: 'Sedang', status: 'Aktif', terms: 'Net 30', pic: 'Bayu S.', diligence: 'Lengkap', onboard: '2022-08-15', bank: 'BRI · 0133-077-460', email: 'ops@sekuritidata.co.id', kontrak: [], otp: 95, qual: 4.2, disp: 0, tr: [12, 14, 11, 13, 15, 12] },
    { id: 'V-041', name: 'CV Boga Rasa Catering', cat: 'Konsumsi & Acara', npwp: '01.772.118.3-004', since: 2023, ytd: 88_400_000, rating: 3.6, risk: 'Sedang', status: 'Aktif', terms: 'Net 14', pic: 'Dwi P.', diligence: 'Perlu Reviu', onboard: '2023-05-22', bank: 'BCA · 0177-211-830', email: 'sales@bogarasa.id', kontrak: [], otp: 84, qual: 3.5, disp: 0, tr: [7, 9, 6, 8, 10, 7] },
    { id: 'V-044', name: 'PT Konsultan Riset Pasar', cat: 'Riset & Database', npwp: '02.901.456.7-031', since: 2024, ytd: 312_000_000, rating: 4.0, risk: 'Sedang', status: 'Evaluasi', terms: 'Net 30', pic: 'Citra W.', diligence: 'Berjalan', onboard: '2024-01-30', bank: 'BNI · 0290-145-670', email: 'subscription@risetpasar.co.id', kontrak: [], otp: 90, qual: 4.0, disp: 0, tr: [24, 26, 22, 28, 26, 30] },
    { id: 'V-046', name: 'PT Servis Komputer Andal', cat: 'Pemeliharaan TI', npwp: '01.556.221.0-012', since: 2018, ytd: 67_800_000, rating: 3.2, risk: 'Tinggi', status: 'Diblokir', terms: 'Net 30', pic: 'Andini R.', diligence: 'Gagal — pajak', onboard: '2018-09-03', bank: 'Mandiri · 1556-221-012', email: 'support@servisandal.id', kontrak: [], otp: 71, qual: 3.0, disp: 1, tr: [9, 11, 8, 10, 6, 4] },
  ];
  /* PURCHASE_ORDERS — komitmen pengadaan. vendorId MENUNJUK ke master (bukan string lepas).
     stage menelusuri siklus procure-to-pay: requisition → PO → GRN → faktur → bayar. */
  const PURCHASE_ORDERS = [
    { id: 'PO-2026-051', vendorId: 'V-029', desc: 'Perpanjangan lisensi CaseWare IDEA (35 seat)', amount: 412_000_000, date: '2026-03-02', need: '2026-03-20', status: 'Disetujui', appr: 'Partner', dept: 'Teknis Audit', prId: 'PR-2026-088', stage: 'GRN' },
    { id: 'PO-2026-052', vendorId: 'V-018', desc: 'Langganan tahunan platform DMS & e-signature', amount: 268_000_000, date: '2026-03-04', need: '2026-03-15', status: 'Menunggu Approval', appr: 'Managing Partner', dept: 'TI & Operasi', prId: 'PR-2026-090', stage: 'Approval' },
    { id: 'PO-2026-053', vendorId: 'V-021', desc: 'Cetak laporan audit & kop surat (Q1)', amount: 24_500_000, date: '2026-03-05', need: '2026-03-12', status: 'Disetujui', appr: 'Manajer', dept: 'Umum', prId: 'PR-2026-091', stage: 'Faktur' },
    { id: 'PO-2026-054', vendorId: 'V-037', desc: 'Pemusnahan arsip jatuh tempo retensi 2018', amount: 38_000_000, date: '2026-03-06', need: '2026-03-25', status: 'Menunggu Approval', appr: 'Manajer', dept: 'Arsip & Mutu', prId: 'PR-2026-092', stage: 'Approval' },
    { id: 'PO-2026-055', vendorId: 'V-044', desc: 'Database benchmark industri (analytical review)', amount: 96_000_000, date: '2026-03-07', need: '2026-03-18', status: 'Draft', appr: '—', dept: 'Teknis Audit', prId: 'PR-2026-094', stage: 'PR' },
    { id: 'PO-2026-056', vendorId: 'V-033', desc: 'Tiket & akomodasi tim fieldwork Surabaya', amount: 73_400_000, date: '2026-03-08', need: '2026-03-11', status: 'Ditolak', appr: 'Manajer', dept: 'Audit ENG-014', prId: 'PR-2026-095', stage: 'Ditolak' },
    { id: 'PO-2026-049', vendorId: 'V-018', desc: 'Langganan DMS & e-signature (periode berjalan)', amount: 268_000_000, date: '2026-01-15', need: '2026-02-01', status: 'Disetujui', appr: 'Managing Partner', dept: 'TI & Operasi', prId: 'PR-2026-071', stage: 'Faktur' },
  ];
  /* PURCHASE_REQUISITIONS — permintaan dari departemen (hulu PO). */
  const REQUISITIONS = [
    { id: 'PR-2026-090', dept: 'TI & Operasi', requester: 'Andini R.', desc: 'Langganan DMS & e-signature', est: 268_000_000, date: '2026-03-03', status: 'Jadi PO', poId: 'PO-2026-052', budgetCat: 'TI & SaaS' },
    { id: 'PR-2026-094', dept: 'Teknis Audit', requester: 'Citra W.', desc: 'Database benchmark industri', est: 96_000_000, date: '2026-03-06', status: 'Menunggu Approval', poId: 'PO-2026-055', budgetCat: 'Riset & Database' },
    { id: 'PR-2026-096', dept: 'Umum', requester: 'Bayu S.', desc: 'Pengadaan 12 kursi ergonomis ruang kerja', est: 42_000_000, date: '2026-03-08', status: 'Menunggu Approval', poId: null, budgetCat: 'Sewa & Fasilitas' },
    { id: 'PR-2026-097', dept: 'Audit ENG-022', requester: 'Dwi P.', desc: 'Akomodasi stock opname Medan', est: 11_200_000, date: '2026-03-09', status: 'Draft', poId: null, budgetCat: 'Perjalanan Dinas' },
    { id: 'PR-2026-098', dept: 'Arsip & Mutu', requester: 'Bayu S.', desc: 'Scanner dokumen volume tinggi', est: 28_500_000, date: '2026-03-09', status: 'Draft', poId: null, budgetCat: 'TI & SaaS' },
  ];
  /* RECEIPTS (GRN) — bukti penerimaan barang/jasa, basis 3-way match. */
  const RECEIPTS = [
    { id: 'GRN-2026-061', poId: 'PO-2026-051', vendorId: 'V-029', recv: '2026-03-12', qty: '35 / 35 seat', amount: 412_000_000, by: 'Andini R.', status: 'Lengkap' },
    { id: 'GRN-2026-062', poId: 'PO-2026-053', vendorId: 'V-021', recv: '2026-03-10', qty: 'Sesuai PO', amount: 24_500_000, by: 'Bayu S.', status: 'Lengkap' },
    { id: 'GRN-2026-060', poId: 'PO-2026-049', vendorId: 'V-018', recv: '2026-02-28', qty: '90 / 90 seat', amount: 268_000_000, by: 'Andini R.', status: 'Lengkap' },
  ];
  /* BILLS — faktur vendor (terhadap PO/GRN). Menjadi utang usaha hilir (→ AP/AR & GL 2-100).
     match: hasil 3-way match (PO ↔ GRN ↔ faktur). */
  const BILLS = [
    { id: 'INV-AT-1142', vendorId: 'V-029', poId: 'PO-2026-051', grnId: 'GRN-2026-061', amount: 412_000_000, issued: '2026-03-13', due: '2026-04-12', match: '3-way OK', status: 'Outstanding' },
    { id: 'INV-MC-0775', vendorId: 'V-021', poId: 'PO-2026-053', grnId: 'GRN-2026-062', amount: 24_500_000, issued: '2026-03-11', due: '2026-03-25', match: '3-way OK', status: 'Outstanding' },
    { id: 'INV-SC-2208', vendorId: 'V-018', poId: 'PO-2026-049', grnId: 'GRN-2026-060', amount: 272_000_000, issued: '2026-03-01', due: '2026-03-31', match: 'Selisih harga', status: 'Disengketakan' },
    { id: 'INV-SK-0431', vendorId: 'V-037', poId: null, grnId: null, amount: 13_000_000, issued: '2026-03-04', due: '2026-04-03', match: 'Tanpa PO', status: 'Outstanding' },
    { id: 'INV-AT-1098', vendorId: 'V-029', poId: 'PO-2025-188', grnId: 'GRN-2025-204', amount: 540_000_000, issued: '2026-01-20', due: '2026-02-19', match: '3-way OK', status: 'Paid' },
  ];
  /* PROC_BUDGET — anggaran pengadaan per kategori (tahunan). actual DITURUNKAN dari VENDORS. */
  const PROC_BUDGET = [
    { cat: 'Sewa & Fasilitas', budget: 2_300_000_000 },
    { cat: 'Lisensi Software Audit', budget: 1_200_000_000 },
    { cat: 'TI & SaaS', budget: 600_000_000 },
    { cat: 'Perjalanan Dinas', budget: 520_000_000 },
    { cat: 'Riset & Database', budget: 280_000_000 },
    { cat: 'Percetakan & ATK', budget: 200_000_000 },
    { cat: 'Keamanan & Pemusnahan Arsip', budget: 160_000_000 },
    { cat: 'Konsumsi & Acara', budget: 90_000_000 },
    { cat: 'Pemeliharaan TI', budget: 80_000_000 },
  ];
  /* warna kanonik per kategori — dipakai chart spend (SSOT warna). */
  const CAT_COLOR = {
    'Sewa & Fasilitas': '#013a52', 'Lisensi Software Audit': '#005085', 'TI & SaaS': '#0a6b73',
    'Perjalanan Dinas': '#5b3fa6', 'Riset & Database': '#2f7bb0', 'Percetakan & ATK': '#9a6a00',
    'Keamanan & Pemusnahan Arsip': '#1f7a4d', 'Konsumsi & Acara': '#b3261e', 'Pemeliharaan TI': '#8a97a1',
  };
  /* SPEND_BY_CAT — DIturunkan dari master vendor (bukan angka kedua). Tetap diekspor
     untuk kompatibilitas; nilainya = Σ vendor.ytd per kategori → selalu rekonsiliasi. */
  const SPEND_BY_CAT = (function () {
    const by = {};
    VENDORS.forEach(v => { by[v.cat] = (by[v.cat] || 0) + v.ytd; });
    return Object.keys(by).sort((a, b) => by[b] - by[a]).map(cat => ({ cat, v: by[cat], c: CAT_COLOR[cat] || '#8a97a1' }));
  })();

  /* ---------------- Aset & Fasilitas Kantor ----------------
     Register aset = sub-ledger PSAK 16 (garis lurus, ref 1 Mar 2026).
     nbv DISELARASKAN ke mesin penyusutan (gross − akumulasi); vendorId
     menaut perolehan ke master vendor; insured menaut ke polis; gl ke akun. */
  const ASSET_GL = {
    'Perangkat TI': '1-2100', 'Infrastruktur TI': '1-2100', 'Perangkat Kantor': '1-2100',
    'Furnitur': '1-2100', 'Kendaraan': '1-2100', 'Fasilitas Gedung': '1-2100',
  };
  const FIXED_ASSETS = [
    { id: 'AST-1042', name: 'Laptop ThinkPad X1 (batch audit)', cat: 'Perangkat TI', qty: 35, acq: '2024-06-01', cost: 612_500_000, life: 4, nbv: 344_531_250, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', gl: '1-2100', status: 'Digunakan' },
    { id: 'AST-1051', name: 'Server & NAS arsip kertas kerja', cat: 'Infrastruktur TI', qty: 1, acq: '2023-02-15', cost: 285_000_000, life: 5, nbv: 109_250_000, residu: 0, loc: 'Ruang Server', custodian: 'Andini R.', vendorId: 'V-018', insured: 'POL-PRP', gl: '1-2100', status: 'Digunakan' },
    { id: 'AST-0890', name: 'Furnitur ruang kerja (workstation)', cat: 'Furnitur', qty: 64, acq: '2022-01-10', cost: 448_000_000, life: 8, nbv: 214_666_667, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Bayu S.', vendorId: null, insured: 'POL-PRP', gl: '1-2100', status: 'Digunakan' },
    { id: 'AST-1110', name: 'Kendaraan operasional (Innova)', cat: 'Kendaraan', qty: 2, acq: '2024-11-01', cost: 760_000_000, life: 8, nbv: 633_333_333, residu: 0, loc: 'Pusat — Jakarta', custodian: 'Dwi P.', vendorId: null, insured: 'POL-PRP', gl: '1-2100', status: 'Digunakan' },
    { id: 'AST-1133', name: 'Proyektor & perangkat rapat', cat: 'Perangkat Kantor', qty: 6, acq: '2025-03-20', cost: 84_000_000, life: 4, nbv: 63_000_000, residu: 0, loc: 'Ruang Rapat', custodian: 'Bayu S.', vendorId: 'V-018', insured: 'POL-PRP', gl: '1-2100', status: 'Digunakan' },
    { id: 'AST-0770', name: 'AC & sistem pendingin', cat: 'Fasilitas Gedung', qty: 12, acq: '2021-05-01', cost: 168_000_000, life: 8, nbv: 66_500_000, residu: 0, loc: 'Seluruh Lantai', custodian: 'Citra W.', vendorId: null, insured: 'POL-PRP', gl: '1-2100', status: 'Perlu Servis' },
    { id: 'AST-0655', name: 'Laptop lama (tahap pelepasan)', cat: 'Perangkat TI', qty: 18, acq: '2020-04-01', cost: 234_000_000, life: 4, nbv: 0, residu: 0, loc: 'Gudang', custodian: 'Andini R.', vendorId: 'V-018', insured: null, gl: '1-2100', status: 'Usul Hapus' },
  ];
  /* DISPOSALS — usulan pelepasan/penghapusan aset (PSAK 16 ¶¶67–72). */
  const DISPOSALS = [
    { id: 'DSP-01', assetId: 'AST-0655', asset: 'Laptop lama (18 unit)', method: 'Lelang internal & donasi', nbv: 0, proceeds: 9_000_000, reason: 'Habis umur manfaat & tak ekonomis diperbaiki', date: '2026-03-20', appr: 'Manajer GA', status: 'Menunggu Approval' },
    { id: 'DSP-00', assetId: 'AST-0512', asset: 'Printer multifungsi lama (5 unit)', method: 'Trade-in', nbv: 0, proceeds: 4_500_000, reason: 'Diganti unit baru', date: '2025-11-10', appr: 'Manajer GA', status: 'Selesai' },
  ];
  /* MAINTENANCE & K3 — vendorId menaut ke master vendor bila ada (else eksternal). */
  const MAINTENANCE = [
    { id: 'MT-031', asset: 'AC & sistem pendingin', assetId: 'AST-0770', type: 'Preventif', vendor: 'PT Servis Mekanikal', vendorId: null, due: '2026-03-15', cost: 12_000_000, status: 'Terjadwal' },
    { id: 'MT-032', asset: 'Server & NAS arsip', assetId: 'AST-1051', type: 'Preventif', vendor: 'PT Solusi Cloud Nusantara', vendorId: 'V-018', due: '2026-03-22', cost: 8_500_000, status: 'Terjadwal' },
    { id: 'MT-029', asset: 'Kendaraan operasional', assetId: 'AST-1110', type: 'Servis Berkala', vendor: 'Bengkel Resmi', vendorId: null, due: '2026-03-05', cost: 4_200_000, status: 'Terlambat' },
    { id: 'MT-028', asset: 'Lift gedung', assetId: null, type: 'Inspeksi K3', vendor: 'Disnaker / PJK3', vendorId: null, due: '2026-04-01', cost: 6_000_000, status: 'Terjadwal' },
    { id: 'MT-027', asset: 'APAR & sistem proteksi kebakaran', assetId: null, type: 'Inspeksi K3', vendor: 'PT Fire Safety', vendorId: null, due: '2026-03-30', cost: 3_800_000, status: 'Terjadwal' },
  ];
  const SOFTWARE_LICENSES = [
    { name: 'CaseWare IDEA (Data Analytics)', vendor: 'PT Audit Tools Global', seats: 35, used: 33, exp: '2026-06-30', cost: 412_000_000, status: 'Aktif' },
    { name: 'Microsoft 365 E3', vendor: 'PT Solusi Cloud Nusantara', seats: 80, used: 75, exp: '2026-12-31', cost: 288_000_000, status: 'Aktif' },
    { name: 'TeamMate+ (Audit Mgmt)', vendor: 'Wolters Kluwer (reseller)', seats: 60, used: 58, exp: '2026-05-15', cost: 540_000_000, status: 'Perpanjangan' },
    { name: 'Adobe Acrobat Pro', vendor: 'PT Solusi Cloud Nusantara', seats: 40, used: 31, exp: '2026-09-01', cost: 96_000_000, status: 'Aktif' },
    { name: 'DMS & e-Signature Platform', vendor: 'PT Solusi Cloud Nusantara', seats: 90, used: 84, exp: '2026-04-20', cost: 268_000_000, status: 'Perpanjangan' },
  ];
  const SPACE = [
    { floor: 'Lantai 12 — Operasional', seats: 48, occ: 44, area: 620 },
    { floor: 'Lantai 14 — Partner & Manajer', seats: 22, occ: 19, area: 410 },
    { floor: 'Lantai 14 — Ruang Rapat & Arsip', seats: 16, occ: 9, area: 240 },
  ];

  /* ---------------- Retensi & Arsip Dokumen (SA 230) ---------------- */
  const RETENTION_POLICY = [
    { jenis: 'Kertas Kerja Audit (final)', dasar: 'SA 230 / SPM — min. 5 thn sejak laporan', years: 7, format: 'Elektronik terenkripsi', note: 'WHR menetapkan 7 tahun (melebihi minimum).' },
    { jenis: 'File Asurans & Reviu (SPR/SJAH)', dasar: 'SPM 1', years: 7, format: 'Elektronik', note: '' },
    { jenis: 'Dokumen Perikatan & Kontrak Klien', dasar: 'Kebijakan firma', years: 10, format: 'Elektronik + fisik', note: 'Termasuk surat perikatan & representasi.' },
    { jenis: 'Dokumen Pajak & Keuangan Firma', dasar: 'UU KUP — 10 tahun', years: 10, format: 'Elektronik', note: '' },
    { jenis: 'Data Pribadi / PMPJ (AML)', dasar: 'PJK3 / POJK — 5 tahun pasca hubungan', years: 5, format: 'Elektronik terenkripsi', note: 'Tunduk UU PDP.' },
  ];
  const ARCHIVES = [
    { id: 'ARC-014', eng: 'ENG-2025-014 · PT Sentosa Makmur Tbk', tahun: 2025, arsip: '2026-02-28', musnah: '2033-02-28', size: '2,4 GB', legal: false, status: 'Terkunci' },
    { id: 'ARC-012', eng: 'ENG-2024-022 · PT Cahaya Abadi', tahun: 2024, arsip: '2025-03-15', musnah: '2032-03-15', size: '1,8 GB', legal: false, status: 'Terkunci' },
    { id: 'ARC-009', eng: 'ENG-2024-008 · PT Bina Usaha', tahun: 2024, arsip: '2025-02-20', musnah: '2032-02-20', size: '1,1 GB', legal: true, status: 'Legal Hold' },
    { id: 'ARC-003', eng: 'ENG-2019-031 · PT Lama Sejahtera', tahun: 2019, arsip: '2020-03-10', musnah: '2026-03-10', size: '0,9 GB', legal: false, status: 'Jatuh Tempo' },
    { id: 'ARC-001', eng: 'ENG-2018-014 · CV Mitra Lestari', tahun: 2018, arsip: '2019-03-05', musnah: '2026-03-05', size: '0,7 GB', legal: false, status: 'Jatuh Tempo' },
  ];
  const LEGAL_HOLDS = [
    { id: 'LH-02', subjek: 'ENG-2024-008 · PT Bina Usaha', alasan: 'Sengketa pemegang saham — potensi litigasi atas LK 2023', sejak: '2025-09-12', oleh: 'Kepala Legal', status: 'Aktif' },
    { id: 'LH-01', subjek: 'ENG-2022-019 · PT Surya Niaga', alasan: 'Permintaan keterangan regulator (OJK)', sejak: '2024-11-03', oleh: 'Managing Partner', status: 'Dicabut' },
  ];

  /* ---------------- Kontrak & Legal Firma ---------------- */
  const CONTRACTS = [
    { id: 'KTR-101', pihak: 'PT Sewa Gedung Sentral Plaza', jenis: 'Sewa Kantor', nilai: 2_280_000_000, mulai: '2024-01-01', akhir: '2026-12-31', renewal: 'Manual', owner: 'GA & Umum', status: 'Aktif' },
    { id: 'KTR-118', pihak: 'PT Audit Tools Global', jenis: 'Lisensi Software', nilai: 412_000_000, mulai: '2025-07-01', akhir: '2026-06-30', renewal: 'Auto-renew', owner: 'TI & Operasi', status: 'Perlu Reviu' },
    { id: 'KTR-122', pihak: 'PT Asuransi Profesi Mandiri', jenis: 'Polis PII', nilai: 385_000_000, mulai: '2025-04-01', akhir: '2026-03-31', renewal: 'Manual', owner: 'Risk & Legal', status: 'Jatuh Tempo' },
    { id: 'KTR-130', pihak: 'PT Travel Korpora Indonesia', jenis: 'MoU Layanan', nilai: 0, mulai: '2025-01-01', akhir: '2026-12-31', renewal: 'Manual', owner: 'GA & Umum', status: 'Aktif' },
    { id: 'KTR-141', pihak: 'PT Sentosa Makmur Tbk', jenis: 'Surat Perikatan Audit', nilai: 1_850_000_000, mulai: '2025-10-01', akhir: '2026-06-30', renewal: 'Per perikatan', owner: 'Partner Penanggung Jawab', status: 'Aktif' },
    { id: 'KTR-145', pihak: 'PT Bank Niaga Sejahtera', jenis: 'Surat Perikatan Audit', nilai: 2_400_000_000, mulai: '2025-11-01', akhir: '2026-07-31', renewal: 'Per perikatan', owner: 'Partner Penanggung Jawab', status: 'Aktif' },
  ];
  const DISPUTES = [
    { id: 'LIT-03', lawan: 'PT Bina Usaha (eks-klien)', perkara: 'Klaim atas opini WTP LK 2023 — dugaan kelalaian profesional', forum: 'Pengadilan Negeri Jakpus', exposure: 1_200_000_000, mulai: '2025-09-20', kuasa: 'Surya & Partners', status: 'Berjalan', risk: 'Tinggi' },
    { id: 'LIT-02', lawan: 'Mantan karyawan (PHK)', perkara: 'Perselisihan hubungan industrial', forum: 'PHI Jakarta', exposure: 180_000_000, mulai: '2025-06-10', kuasa: 'Internal Legal', status: 'Mediasi', risk: 'Sedang' },
    { id: 'LIT-01', lawan: 'Vendor TI (PT Servis Komputer)', perkara: 'Wanprestasi pemeliharaan & kebocoran SLA', forum: 'BANI (arbitrase)', exposure: 320_000_000, mulai: '2024-12-01', kuasa: 'Surya & Partners', status: 'Putusan', risk: 'Rendah' },
  ];

  /* ---------------- Asuransi (PII) & Risiko ----------------
     SSOT polis firma. Field tambahan (covers, policyNo, broker, retro,
     transfers, apId) memperkaya tanpa memutus konsumen lama
     (Legal.buildRegister, FAC.insurance, FIRMOPS cost driver).
     · transfers  = id risiko firma (FR-xx) yang ditransfer polis ini
     · apId       = referensi pembayaran premi (AP firma) untuk rekonsiliasi
     · covers/excl= ruang lingkup & eksklusi utama (klausul) */
  const POLICIES = [
    { id: 'POL-PII', jenis: 'Professional Indemnity (PII)', insurer: 'PT Asuransi Profesi Mandiri', broker: 'Marsh Indonesia', policyNo: 'PII/2025/0337', limit: 50_000_000_000, premi: 385_000_000, deductible: 250_000_000, mulai: '2025-04-01', akhir: '2026-03-31', status: 'Jatuh Tempo', basis: 'Claims-made', retro: '2014-04-01', runoff: '6 tahun', apId: 'AP-0039', transfers: ['FR-01'], covers: 'Kelalaian profesional, kesalahan opini & pelanggaran tugas dalam jasa atestasi/asurans.', excl: 'Tindakan curang yang disengaja, denda regulator, klaim sebelum tanggal retroaktif.' },
    { id: 'POL-DNO', jenis: "Directors' & Officers' (D&O)", insurer: 'PT Asuransi Jaya Proteksi', broker: 'Marsh Indonesia', policyNo: 'DNO/2025/0211', limit: 20_000_000_000, premi: 142_000_000, deductible: 100_000_000, mulai: '2025-07-01', akhir: '2026-06-30', status: 'Aktif', basis: 'Claims-made', retro: '2018-07-01', runoff: '3 tahun', apId: 'AP-0039', transfers: ['FR-02'], covers: 'Tanggung jawab pribadi Rekan/pengurus atas keputusan manajemen firma.', excl: 'Keuntungan pribadi ilegal, klaim antar-pengurus.' },
    { id: 'POL-CYB', jenis: 'Cyber & Data Liability', insurer: 'PT Asuransi Siber Nusantara', broker: 'Aon Indonesia', policyNo: 'CYB/2025/0098', limit: 15_000_000_000, premi: 98_000_000, deductible: 150_000_000, mulai: '2025-09-01', akhir: '2026-08-31', status: 'Aktif', basis: 'Claims-made', retro: '2023-09-01', runoff: '—', apId: 'AP-0039', transfers: ['FR-03'], covers: 'Insiden siber, kebocoran data klien, biaya forensik, notifikasi & business interruption.', excl: 'Kegagalan patch yang diketahui, perangkat tak terenkripsi.' },
    { id: 'POL-PRP', jenis: 'Property & Office All-Risk', insurer: 'PT Asuransi Wahana', broker: 'Aon Indonesia', policyNo: 'PRP/2025/0054', limit: 8_000_000_000, premi: 54_000_000, deductible: 25_000_000, mulai: '2025-01-01', akhir: '2026-12-31', status: 'Aktif', basis: 'Occurrence', retro: null, runoff: '—', apId: 'AP-0039', transfers: [], covers: 'Aset tetap kantor (TI, furnitur, kendaraan, fasilitas) terhadap kebakaran, pencurian & bencana.', excl: 'Keausan wajar, aset tak terdaftar di register.' },
  ];
  const CLAIMS = [
    { id: 'CLM-02', polis: 'PII', polisId: 'POL-PII', litId: 'LIT-03', perihal: 'Notifikasi sengketa PT Bina Usaha (potensi klaim)', insiden: '2025-09-15', diajukan: '2025-09-22', nilai: 1_200_000_000, reserve: 950_000_000, recovered: 0, status: 'Dilaporkan' },
    { id: 'CLM-01', polis: 'Cyber', polisId: 'POL-CYB', litId: null, perihal: 'Insiden phishing — pemulihan & forensik', insiden: '2025-10-08', diajukan: '2025-10-15', nilai: 240_000_000, reserve: 0, recovered: 165_000_000, status: 'Dibayar' },
  ];
  /* RISK_REGISTER — SSOT register risiko firma (entity-level, ISQM 1).
     l/i = skor RESIDUAL (setelah kontrol) — tetap dipakai konsumen lama.
     il/ii = skor INHEREN (sebelum kontrol). module = modul SSOT mitigasi.
     transferId = polis yang mentransfer risiko. kri = indikator risiko kunci. */
  const RISK_REGISTER = [
    { id: 'FR-01', risk: 'Kegagalan mutu perikatan signifikan (litigasi)', kat: 'Profesional', il: 4, ii: 5, l: 2, i: 5, mit: 'EQR wajib · PII Rp 50 M · pelatihan teknis', controls: ['EQR wajib untuk emiten & PIE', 'Pelatihan teknis & konsultasi isu sulit', 'Penerimaan & keberlanjutan klien selektif'], owner: 'Managing Partner', module: 'eqr', transferId: 'POL-PII', appetite: 'Rendah', kri: { label: 'Litigasi aktif', val: '1 perkara', tone: 'amber' }, lastReview: '2026-02-20', trend: 'naik' },
    { id: 'FR-02', risk: 'Pelanggaran independensi / rotasi AP', kat: 'Etika', il: 4, ii: 4, l: 2, i: 4, mit: 'Independence monitor · rotasi 7 thn', controls: ['Deklarasi independensi tahunan', 'Pemantauan rotasi AP (7 thn) otomatis', 'Pra-persetujuan jasa non-audit'], owner: 'Partner Etika', module: 'independence', transferId: 'POL-DNO', appetite: 'Nihil', kri: { label: 'AP mendekati batas rotasi', val: '1 dari 4', tone: 'amber' }, lastReview: '2026-01-30', trend: 'stabil' },
    { id: 'FR-03', risk: 'Kebocoran data klien (siber)', kat: 'TI', il: 4, ii: 5, l: 3, i: 4, mit: 'Enkripsi · MFA · polis Cyber · DRP', controls: ['Enkripsi AES-256 & MFA', 'Pemantauan endpoint & phishing drill', 'DRP & pengujian backup'], owner: 'CISO', module: 'integrations', transferId: 'POL-CYB', appetite: 'Rendah', kri: { label: 'Insiden siber 12 bln', val: '1 (phishing)', tone: 'red' }, lastReview: '2026-02-28', trend: 'naik' },
    { id: 'FR-04', risk: 'Konsentrasi pendapatan pada 3 klien besar', kat: 'Bisnis', il: 3, ii: 4, l: 3, i: 3, mit: 'Diversifikasi pipeline · jasa non-audit', controls: ['Diversifikasi pipeline penjualan', 'Ekspansi jasa non-audit (SPAP)', 'Pemantauan konsentrasi fee'], owner: 'Managing Partner', module: 'pipeline', transferId: null, appetite: 'Sedang', kri: { label: 'Fee 3 klien teratas', val: '38% portofolio', tone: 'amber' }, lastReview: '2026-02-10', trend: 'stabil' },
    { id: 'FR-05', risk: 'Keterlambatan pelaporan PPPK', kat: 'Regulasi', il: 3, ii: 4, l: 1, i: 4, mit: 'Kalender kepatuhan · checklist', controls: ['Kalender kepatuhan terpadu', 'Checklist & reviu pra-submit', 'Eskalasi tenggat otomatis'], owner: 'Kepala Mutu', module: 'pppk', transferId: null, appetite: 'Nihil', kri: { label: 'Tenggat terlewat 12 bln', val: '0', tone: 'green' }, lastReview: '2026-02-15', trend: 'turun' },
    { id: 'FR-06', risk: 'Kehilangan staf kunci (turnover)', kat: 'SDM', il: 3, ii: 4, l: 3, i: 3, mit: 'Suksesi · retensi · jenjang karier', controls: ['Rencana suksesi peran kunci', 'Program retensi & jenjang karier', 'Pemetaan talenta kritis'], owner: 'Kepala SDM', module: 'succession', transferId: null, appetite: 'Sedang', kri: { label: 'Turnover tahunan', val: '14%', tone: 'amber' }, lastReview: '2026-01-25', trend: 'stabil' },
  ];

  /* ---------------- Perjalanan & Reimbursement ----------------
     SUMBER KEBENARAN (SSOT):
       · Pegawai & grade  ← emp  → AMS.STAFF (HCM)          — nama/grade TIDAK ditulis di sini
       · Perikatan/klien  ← eng  → AMS.ENGAGEMENTS/CLIENTS  — lokasi = kota klien
       · Plafon (entitlement) ← kebijakan PER_DIEM + ROUTES (diturunkan window.TRAVEL)
       · Posting GL        → FIRM_COA (kontrol) lewat FIRMOPS.operatingCosts('travel')
     Field tujuan/staff/grade/appr DITURUNKAN window.TRAVEL & dilekatkan ke objek ini
     agar konsumen lama (FIRMOPS.unifiedObligations) tetap menarik satu angka. */
  const TRIPS = [
    { id: 'TRV-088', emp: 'EMP-021', eng: 'ENG-2025-031', purpose: 'Observasi panen & vouching biaya perkebunan', tgl: '2026-03-11', durasi: 4, nights: 3, route: 'PKU', est: 5_900_000, status: 'Menunggu Approval', appr: 'Anindya Pramesti' },
    { id: 'TRV-087', emp: 'EMP-022', eng: 'ENG-2025-058', purpose: 'Stock opname & cash count tutup buku', tgl: '2026-03-09', durasi: 3, nights: 2, route: 'MES', est: 5_050_000, status: 'Disetujui', appr: 'Rudi Gunawan' },
    { id: 'TRV-085', emp: 'EMP-001', eng: 'ENG-2025-014', purpose: 'Group audit komponen — Sentosa Trading Pte Ltd', tgl: '2026-03-16', durasi: 3, nights: 3, route: 'SIN', est: 26_700_000, status: 'Disetujui', appr: 'Rudi Gunawan (MP)' },
    { id: 'TRV-084', emp: 'EMP-031', eng: 'ENG-2025-022', purpose: 'Cash count & observasi armada', tgl: '2026-03-06', durasi: 2, nights: 1, route: 'SUB', est: 2_950_000, status: 'Selesai', appr: 'Bayu Saputra' },
    { id: 'TRV-082', emp: 'EMP-008', eng: 'ENG-2025-022', purpose: 'Reviu interim & konfirmasi piutang', tgl: '2026-03-04', durasi: 3, nights: 2, route: 'SUB', est: 5_420_000, status: 'Reimbursed', appr: 'Sari Dewanti' },
    { id: 'TRV-081', emp: 'EMP-007', eng: 'ENG-2025-031', purpose: 'Reviu manajer atas fieldwork', tgl: '2026-03-02', durasi: 2, nights: 1, route: 'PKU', est: 4_660_000, status: 'Reimbursed', appr: 'Hartono Wijaya' },
    { id: 'TRV-079', emp: 'EMP-032', eng: 'ENG-2025-047', purpose: 'Prosedur disepakati (AUP) di lokasi klien', tgl: '2026-02-25', durasi: 2, nights: 1, route: 'BDO', est: 1_750_000, status: 'Reimbursed', appr: 'Bayu Saputra' },
  ];
  /* klaim = Σ lines; plafon DITURUNKAN window.TRAVEL.entitlement() — tidak ditulis tangan.
     emp/trip = referensi kanonik (HCM + pengajuan perjalanan). */
  const REIMBURSEMENTS = [
    { id: 'RB-204', emp: 'EMP-031', trip: 'TRV-084', lines: { transport: 1_750_000, hotel: 560_000, perdiem: 600_000, other: 0 }, status: 'Disetujui', tgl: '2026-03-07' },
    { id: 'RB-203', emp: 'EMP-008', trip: 'TRV-082', lines: { transport: 2_000_000, hotel: 1_900_000, perdiem: 1_350_000, other: 120_000 }, status: 'Diproses', tgl: '2026-03-08' },
    { id: 'RB-201', emp: 'EMP-008', trip: '—', lines: { transport: 0, hotel: 0, perdiem: 0, other: 4_800_000 }, kategori: 'Entertainment klien — perlu Berita Acara', capOverride: 3_000_000, status: 'Ditahan', tgl: '2026-03-05' },
    { id: 'RB-199', emp: 'EMP-007', trip: 'TRV-081', lines: { transport: 2_760_000, hotel: 1_000_000, perdiem: 900_000, other: 0 }, status: 'Reimbursed', tgl: '2026-03-04' },
    { id: 'RB-198', emp: 'EMP-032', trip: 'TRV-079', lines: { transport: 600_000, hotel: 550_000, perdiem: 600_000, other: 0 }, status: 'Reimbursed', tgl: '2026-02-27' },
  ];
  /* Kebijakan plafon per grade (SSOT entitlement). classMult = pengali kelas transport. */
  const PER_DIEM = [
    { grade: 'Partner', key: 'Partner', hotel: 1_500_000, diem: 600_000, transport: 'Bisnis / fleksibel', classMult: 2.4 },
    { grade: 'Manager', key: 'Manager', hotel: 1_000_000, diem: 450_000, transport: 'Ekonomi penuh', classMult: 1.15 },
    { grade: 'Senior', key: 'Senior', hotel: 700_000, diem: 350_000, transport: 'Ekonomi', classMult: 1.0 },
    { grade: 'Junior', key: 'Junior', hotel: 550_000, diem: 300_000, transport: 'Ekonomi', classMult: 1.0 },
  ];
  /* Tarif rute pulang-pergi kelas ekonomi (dasar) — entitlement transport = fare × classMult. */
  const ROUTES = [
    { code: 'LOCAL', label: 'Dalam kota (Jabodetabek)', fare: 300_000, intl: false },
    { code: 'BDO', label: 'Bandung (darat/kereta)', fare: 600_000, intl: false },
    { code: 'SRG', label: 'Semarang', fare: 1_500_000, intl: false },
    { code: 'SUB', label: 'Surabaya', fare: 1_800_000, intl: false },
    { code: 'PKU', label: 'Pekanbaru', fare: 2_400_000, intl: false },
    { code: 'MES', label: 'Medan', fare: 2_600_000, intl: false },
    { code: 'SIN', label: 'Singapura (internasional)', fare: 8_500_000, intl: true },
  ];
  const TRAVEL_TREND = [
    { m: 'Okt', v: 142 }, { m: 'Nov', v: 168 }, { m: 'Des', v: 96 },
    { m: 'Jan', v: 121 }, { m: 'Feb', v: 184 }, { m: 'Mar', v: 73 },
  ];

  /* ---------------- Lisensi & Perizinan ---------------- */
  const FIRM_LICENSES = [
    { id: 'LIC-KAP', nama: 'Izin Usaha KAP', no: '1142/KM.1/2019', otoritas: 'Kemenkeu (PPPK)', terbit: '2019-05-14', exp: null, status: 'Berlaku', note: 'Tanpa masa berakhir; tunduk pelaporan tahunan & inspeksi.' },
    { id: 'LIC-OJK', nama: 'Terdaftar di OJK (Emiten)', no: 'STTD-AP/0142', otoritas: 'OJK', terbit: '2020-08-01', exp: '2026-08-01', status: 'Perpanjangan', note: 'Wajib untuk audit entitas pasar modal.' },
    { id: 'LIC-IAPI', nama: 'Keanggotaan Institusi (KAP)', no: 'IAPI-KAP-0337', otoritas: 'IAPI', terbit: '2019-06-01', exp: '2026-05-31', status: 'Perpanjangan', note: 'Iuran tahunan & kepatuhan PPL.' },
    { id: 'LIC-PMK', nama: 'Domisili & Izin Usaha (OSS)', no: 'NIB 0220xxxx', otoritas: 'OSS / Pemda', terbit: '2022-03-10', exp: '2027-03-10', status: 'Berlaku', note: '' },
    { id: 'LIC-CAB', nama: 'Izin Kantor Cabang KAP — Surabaya', no: 'KEP-318/KM.1/2022', otoritas: 'Kemenkeu (PPPK)', terbit: '2022-07-19', exp: null, status: 'Berlaku', note: 'Izin pembukaan kantor cabang KAP — wajib lapor & dimutakhirkan per PMK 186/2021.' },
    { id: 'LIC-OAA', nama: 'Pelaporan Afiliasi OAA/KAPA', no: 'OAA-RPT/2025/041', otoritas: 'Kemenkeu (PPPK)', terbit: '2025-04-30', exp: '2026-04-30', status: 'Dilaporkan', note: 'Afiliasi dengan Organisasi Audit Asing (OAA) / KAP Asing (KAPA) — wajib dilaporkan tahunan ke PPPK (PMK 186/2021).' },
  ];
  /* Izin Akuntan Publik — SATU baris per partner pemegang izin (emp → AMS.STAFF).
     Nama, PPL/SKP, rotasi & status DITURUNKAN window.LICENSING dari sumber kanonik:
       · nama/peran  ← AMS.STAFF (HCM)
       · PPL (SKP)   ← AMS.CPE_LOG + AMS.CPE_REQ (modul CPE/PPL)
       · rotasi      ← AMS.INDEPENDENCE (tenure/limit/klien)
     Hanya nomor izin, registrasi & masa berlaku yang otoritatif di sini. */
  const AP_LICENSES = [
    { emp: 'EMP-001', izin: 'AP.0451', terbit: '2014-05-14', exp: '2026-12-31', reg: 'PPPK + STTD OJK', emiten: true },
    { emp: 'EMP-002', izin: 'AP.0712', terbit: '2016-03-01', exp: '2028-06-30', reg: 'PPPK + STTD OJK', emiten: true },
    { emp: 'EMP-003', izin: 'AP.0883', terbit: '2018-09-30', exp: '2026-09-30', reg: 'PPPK', emiten: false },
  ];
  const MEMBERSHIPS = [
    { nama: 'IAPI — Institut Akuntan Publik Indonesia', tipe: 'Profesi (wajib)', iuran: 24_000_000, exp: '2026-05-31', status: 'Aktif' },
    { nama: 'IAI — Ikatan Akuntan Indonesia', tipe: 'Profesi', iuran: 8_500_000, exp: '2026-12-31', status: 'Aktif' },
    { nama: 'Jaringan Internasional (Member Firm)', tipe: 'Afiliasi global', iuran: 320_000_000, exp: '2026-06-30', status: 'Perpanjangan' },
    { nama: 'Kamar Dagang & Industri (Kadin)', tipe: 'Asosiasi bisnis', iuran: 12_000_000, exp: '2026-12-31', status: 'Aktif' },
  ];

  window.BO = {
    today, daysTo,
    VENDORS, PURCHASE_ORDERS, SPEND_BY_CAT, CAT_COLOR,
    REQUISITIONS, RECEIPTS, BILLS, PROC_BUDGET,
    FIXED_ASSETS, MAINTENANCE, SOFTWARE_LICENSES, SPACE, DISPOSALS, ASSET_GL,
    RETENTION_POLICY, ARCHIVES, LEGAL_HOLDS,
    CONTRACTS, DISPUTES,
    POLICIES, CLAIMS, RISK_REGISTER,
    TRIPS, REIMBURSEMENTS, PER_DIEM, ROUTES, TRAVEL_TREND,
    FIRM_LICENSES, AP_LICENSES, MEMBERSHIPS,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const BO = window.BO;
