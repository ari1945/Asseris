/* ============================================================
   NeoSuite AMS — Lintas-sektor: Legal-Digital & Pelindungan Data
   ------------------------------------------------------------
   Memperluas AMS_CANON (objek modul) dengan dua domain yang sebelumnya
   menjadi gap (Evaluasi Kepatuhan G17 & G19):

     legalSeal()  · Keabsahan tanda tangan & meterai elektronik —
                    pengikatan TTE tersertifikasi (PSrE Kominfo) &
                    pembubuhan e-Meterai (Peruri) pada dokumen yang
                    dipersyaratkan. UU ITE jo. PP 71/2019 + UU 10/2020
                    Bea Meterai jo. PP 86/2021 e-Meterai. (G17)

     pdp()        · Operasionalisasi UU 27/2022 (PDP) di luar retensi:
                    registri aktivitas pemrosesan (RoPA) + dasar
                    pemrosesan/persetujuan, pemenuhan hak subjek data
                    (DSR), & notifikasi insiden kebocoran 3×24 jam ke
                    Lembaga PDP dan subjek data. (G19)

   Identitas dokumen & klien ditarik dari sumber kanonik yang sama
   (AMS.DMS_DOCS / AMS.ENGAGEMENTS / RETENTION.RETENTION_CLASSES).
   Retensi data pribadi tetap mengacu kelas 'pmpj' di window.RETENTION
   (UU PDP — 5 thn pasca berakhirnya hubungan), tidak diduplikasi.
   ============================================================ */
import { AMS as AMS_NS } from './data';
import { AMS_CANON } from './canon';

(function () {
  'use strict';
  const AMS = (): any => AMS_NS || {};
  const ASOF = '2026-03-09';

  /* =========================================================
     G17 · KEABSAHAN TTE & e-METERAI (legal-digital)
     ========================================================= */
  function legalSeal() {
    /* Penyelenggara tepercaya (PSrE berinduk Kominfo + distributor e-Meterai) */
    const providers = [
      { name: 'PrivyID', role: 'PSrE Tersertifikasi', accred: 'Terdaftar Kominfo', kind: 'tte', note: 'TTE tersertifikasi RSA-2048 / SHA-256 untuk rekan & klien.' },
      { name: 'Peruri (Perum)', role: 'PSrE Induk + e-Meterai', accred: 'PSrE Berinduk', kind: 'both', note: 'Distributor resmi e-Meterai Rp 10.000 & PSrE berinduk negara.' },
      { name: 'VIDA', role: 'PSrE Tersertifikasi', accred: 'Terdaftar Kominfo', kind: 'tte', note: 'Cadangan PSrE untuk identitas pejabat penandatangan.' },
    ];

    /* Dokumen yang memerlukan pengikatan hukum. requireMeterai = dokumen
       bersifat perdata/perjanjian (alat bukti) → wajib e-Meterai (UU 10/2020).
       Laporan auditor & reviu: TTE tersertifikasi mengikat; meterai pada
       salinan resmi bila dipersyaratkan penerima. */
    const RAW = [
      { id: 'EL-2025-063', name: 'Surat Perikatan — Graha Properti Nusantara', client: 'PT Graha Properti Nusantara', eng: 'ENG-2025-063', docType: 'Surat Perikatan',
        requireMeterai: true, tte: 'tersertifikasi', signer: 'Rudi Gunawan, CPA', signerId: 'PrivyID', signedAt: '2026-01-15',
        meterai: { status: 'affixed', serial: 'METERAI-1015-3FA2-8841', affixedAt: '2026-01-15', denom: 10000 } },
      { id: 'EL-2025-090', name: 'Surat Perikatan — Mega Group (Due Diligence)', client: 'PT Mega Investasi Nusantara', eng: 'ENG-2025-090', docType: 'Surat Perikatan',
        requireMeterai: true, tte: 'tersertifikasi', signer: 'Direktur Mega Group', signerId: 'PrivyID', signedAt: '2026-02-28',
        meterai: { status: 'affixed', serial: 'METERAI-1015-7C19-2204', affixedAt: '2026-02-28', denom: 10000 } },
      { id: 'EL-2025-014', name: 'Surat Perikatan — Sentosa Makmur Tbk', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', docType: 'Surat Perikatan',
        requireMeterai: true, tte: 'tersertifikasi', signer: 'Hartono Wijaya, CPA', signerId: 'PrivyID', signedAt: '2026-01-12',
        meterai: { status: 'pending', serial: null, affixedAt: null, denom: 10000 } },
      { id: 'EL-2025-047', name: 'Surat Perikatan — Mandiri Sejahtera Finance', client: 'PT Mandiri Sejahtera Finance', eng: 'ENG-2025-047', docType: 'Surat Perikatan',
        requireMeterai: true, tte: 'belum', signer: '—', signerId: null, signedAt: null,
        meterai: { status: 'pending', serial: null, affixedAt: null, denom: 10000 } },
      { id: 'LAI-2025-047', name: 'Laporan Auditor Independen — Mandiri Sejahtera Finance', client: 'PT Mandiri Sejahtera Finance', eng: 'ENG-2025-047', docType: 'Laporan',
        requireMeterai: false, tte: 'tersertifikasi', signer: 'Sari Dewanti, CPA', signerId: 'PrivyID', signedAt: '2026-02-22',
        meterai: { status: 'n/a', serial: null, affixedAt: null, denom: 0 } },
      { id: 'LR-2025-058', name: 'Laporan Reviu (SPR 2400) — Samudra Pangan Lestari', client: 'PT Samudra Pangan Lestari', eng: 'ENG-2025-058', docType: 'Laporan Reviu',
        requireMeterai: false, tte: 'tersertifikasi', signer: 'Bayu Saputra, CPA', signerId: 'PrivyID', signedAt: '2026-03-04',
        meterai: { status: 'n/a', serial: null, affixedAt: null, denom: 0 } },
      { id: 'SR-2025-014', name: 'Surat Representasi Manajemen — Sentosa Makmur Tbk', client: 'PT Sentosa Makmur Tbk', eng: 'ENG-2025-014', docType: 'Surat Representasi',
        requireMeterai: true, tte: 'menunggu', signer: 'Direksi Sentosa', signerId: 'PrivyID', signedAt: null,
        meterai: { status: 'pending', serial: null, affixedAt: null, denom: 10000 } },
    ];

    const docs = RAW.map(d => {
      const certified = d.tte === 'tersertifikasi';
      const meteraiOk = !d.requireMeterai || d.meterai.status === 'affixed';
      let binding, bindLabel, bindKind;
      if (d.tte === 'belum') { binding = 'lemah'; bindLabel = 'Belum mengikat'; bindKind = 'red'; }
      else if (!certified) { binding = 'menunggu'; bindLabel = 'Menunggu TTE'; bindKind = 'amber'; }
      else if (!meteraiOk) { binding = 'menunggu'; bindLabel = 'Menunggu e-Meterai'; bindKind = 'amber'; }
      else { binding = 'mengikat'; bindLabel = 'Mengikat penuh'; bindKind = 'green'; }
      const basis = [];
      if (certified) basis.push('UU ITE Ps. 11 — TTE tersertifikasi');
      basis.push('PP 71/2019 Ps. 60 — kekuatan hukum');
      if (d.requireMeterai) basis.push('UU 10/2020 — Bea Meterai (e-Meterai)');
      return { ...d, certified, meteraiOk, binding, bindLabel, bindKind, basis };
    });

    const reqMeterai = docs.filter(d => d.requireMeterai);
    const summary = {
      total: docs.length,
      bound: docs.filter(d => d.binding === 'mengikat').length,
      pending: docs.filter(d => d.binding === 'menunggu').length,
      weak: docs.filter(d => d.binding === 'lemah').length,
      certified: docs.filter(d => d.certified).length,
      meteraiReq: reqMeterai.length,
      meteraiAffixed: reqMeterai.filter(d => d.meterai.status === 'affixed').length,
      meteraiPending: reqMeterai.filter(d => d.meterai.status !== 'affixed').length,
    };

    /* Kontrol/aturan keabsahan elektronik (postur) */
    const controls = [
      { k: 'TTE memakai sertifikat PSrE berinduk Kominfo', std: 'PP 71/2019 Ps. 60', status: summary.certified === summary.total ? 'Aktif' : 'Parsial', ev: summary.certified + '/' + summary.total + ' dokumen tersertifikasi' },
      { k: 'e-Meterai dibubuhkan pada dokumen perdata/perjanjian', std: 'UU 10/2020 jo. PP 86/2021', status: summary.meteraiPending ? 'Parsial' : 'Aktif', ev: summary.meteraiAffixed + '/' + summary.meteraiReq + ' surat perikatan bermeterai' },
      { k: 'Pemeriksaan validitas sertifikat (chain & masa berlaku)', std: 'PP 71/2019', status: 'Aktif', ev: 'Verifikasi otomatis saat penandatanganan' },
      { k: 'Stempel waktu tepercaya (trusted timestamp)', std: 'ISO/IEC 18014', status: 'Aktif', ev: 'Melekat pada setiap TTE' },
      { k: 'Penyimpanan bukti segel & berita acara TTE', std: 'SA 230 / ISQM 1', status: 'Aktif', ev: 'Tertaut ke Document Management (WORM)' },
    ];

    return { asOf: ASOF, providers, docs, summary, controls };
  }

  /* =========================================================
     G19 · PELINDUNGAN DATA PRIBADI — UU 27/2022 (PDP)
     ========================================================= */
  function pdp() {
    /* Pejabat Pelindungan Data (DPO) — wajib bagi pemrosesan skala tertentu */
    const dpo = { name: 'Rudi Gunawan, CPA', role: 'Data Protection Officer (rangkap Quality Partner)', appointed: '2025-09-01', contact: 'dpo@wijayahartono.co.id' };

    /* Dasar pemrosesan yang sah — UU PDP Ps. 20 */
    const BASIS = {
      persetujuan: 'Persetujuan eksplisit subjek data',
      kontrak:     'Pelaksanaan perjanjian / pra-kontrak',
      hukum:       'Pemenuhan kewajiban hukum pengendali',
      vital:       'Pelindungan kepentingan vital',
      publik:      'Pelaksanaan tugas kepentingan umum',
      sah:         'Kepentingan yang sah (legitimate interest)',
    };

    /* RoPA — Registri Aktivitas Pemrosesan Data Pribadi (Ps. 31) */
    const ropa = [
      { id: 'PA-01', activity: 'Uji tuntas pelanggan (PMPJ / CDD)', subject: 'Klien · UBO · Direksi · PIC',
        data: ['Identitas (KTP/NPWP)', 'Data UBO & kepemilikan', 'Profil risiko'], basis: 'hukum', special: false,
        purpose: 'Kepatuhan APU-PPT (PMPJ) & penerimaan perikatan.', recipients: 'Internal · PPATK (bila STR)', retClass: 'pmpj', crossBorder: false, risk: 'Tinggi' },
      { id: 'PA-02', activity: 'Pengelolaan SDM & penggajian', subject: 'Karyawan KAP',
        data: ['Identitas & NIK', 'Rekening & pajak', 'Data kinerja & kesehatan'], basis: 'kontrak', special: true,
        purpose: 'Administrasi kepegawaian, payroll & imbalan kerja.', recipients: 'Internal · DJP · BPJS', retClass: 'pajak', crossBorder: false, risk: 'Sedang' },
      { id: 'PA-03', activity: 'Portal Klien / PBC & komunikasi perikatan', subject: 'PIC klien · kontak',
        data: ['Nama & jabatan', 'Email & telepon', 'Log akses portal'], basis: 'kontrak', special: false,
        purpose: 'Pertukaran dokumen audit (PBC) & komunikasi aman.', recipients: 'Internal · penyedia portal (PKS)', retClass: 'perikatan', crossBorder: false, risk: 'Sedang' },
      { id: 'PA-04', activity: 'Rekrutmen & seleksi kandidat', subject: 'Pelamar kerja',
        data: ['CV & riwayat', 'Ijazah & referensi'], basis: 'persetujuan', special: false,
        purpose: 'Proses rekrutmen auditor & staf.', recipients: 'Internal HCM', retClass: 'template', crossBorder: false, risk: 'Rendah' },
      { id: 'PA-05', activity: 'CRM & pemasaran jasa (pipeline)', subject: 'Prospek · kontak bisnis',
        data: ['Nama & jabatan', 'Email korporat'], basis: 'sah', special: false,
        purpose: 'Pengembangan bisnis & komunikasi penawaran.', recipients: 'Internal pemasaran', retClass: 'template', crossBorder: false, risk: 'Rendah' },
      { id: 'PA-06', activity: 'Master vendor & mitra (pengadaan)', subject: 'Vendor OP · kontak vendor',
        data: ['Identitas & NPWP/NIK', 'Rekening'], basis: 'kontrak', special: false,
        purpose: 'Pengadaan, pembayaran & pemotongan PPh 23.', recipients: 'Internal · DJP (Coretax)', retClass: 'pajak', crossBorder: false, risk: 'Rendah' },
    ];
    const basisDist = Object.keys(BASIS).map(k => ({ key: k, label: BASIS[k], n: ropa.filter(r => r.basis === k).length })).filter(x => x.n);
    const consentN = ropa.filter(r => r.basis === 'persetujuan').length;

    /* Hak Subjek Data — permintaan masuk (DSR). SLA pemenuhan 3×24 jam atas
       konfirmasi penerimaan; penyelesaian wajar (kebijakan firma: 14 hari). */
    const RESP_SLA = 14;
    const dsr = [
      { id: 'DSR-07', subject: 'Mantan karyawan (D. Raharjo)', type: 'Penghapusan', received: '2026-03-05',
        basisActivity: 'PA-02', status: 'Diproses', handler: 'HCM · DPO',
        note: 'Permintaan penghapusan data pasca masa retensi pajak; ditahan sebagian karena kewajiban UU KUP 10 thn.' },
      { id: 'DSR-06', subject: 'PIC klien (Graha Properti)', type: 'Akses & salinan', received: '2026-03-02',
        basisActivity: 'PA-03', status: 'Selesai', handler: 'DPO', closed: '2026-03-06',
        note: 'Salinan data pribadi yang diproses diberikan dalam format terstruktur.' },
      { id: 'DSR-05', subject: 'Pelamar kerja', type: 'Penarikan persetujuan', received: '2026-03-01',
        basisActivity: 'PA-04', status: 'Selesai', handler: 'HCM', closed: '2026-03-03',
        note: 'Data kandidat dihentikan pemrosesannya & dijadwalkan musnah.' },
      { id: 'DSR-04', subject: 'Kontak prospek (CRM)', type: 'Keberatan/pembatasan', received: '2026-02-26',
        basisActivity: 'PA-05', status: 'Selesai', handler: 'Pemasaran', closed: '2026-02-27',
        note: 'Opt-out komunikasi pemasaran; ditandai do-not-contact.' },
      { id: 'DSR-08', subject: 'Karyawan aktif', type: 'Perbaikan/pembaruan', received: '2026-03-08',
        basisActivity: 'PA-02', status: 'Baru', handler: 'HCM',
        note: 'Pembaruan data rekening & alamat.' },
    ].map(d => {
      const recv = new Date(d.received);
      const due = new Date(recv); due.setDate(due.getDate() + RESP_SLA);
      const dueDays = Math.round((due.getTime() - new Date(ASOF).getTime()) / 864e5);
      const ackDue = new Date(recv); ackDue.setDate(ackDue.getDate() + 3);  // 3×24 jam konfirmasi
      return { ...d, dueDate: due.toISOString().slice(0, 10), dueDays,
        ackDue: ackDue.toISOString().slice(0, 10),
        open: d.status !== 'Selesai', overdue: d.status !== 'Selesai' && dueDays < 0 };
    });

    /* Hak subjek data — katalog UU PDP Ps. 5–13 */
    const rights = [
      { ref: 'Ps. 5', t: 'Hak atas informasi pemrosesan', ok: true },
      { ref: 'Ps. 6', t: 'Hak akses & memperoleh salinan', ok: true },
      { ref: 'Ps. 7', t: 'Hak memperbaiki / memperbarui', ok: true },
      { ref: 'Ps. 8', t: 'Hak mengakhiri, menghapus & memusnahkan', ok: true },
      { ref: 'Ps. 9', t: 'Hak menarik persetujuan', ok: true },
      { ref: 'Ps. 10', t: 'Hak keberatan atas pengambilan keputusan otomatis', ok: true },
      { ref: 'Ps. 11', t: 'Hak menunda / membatasi pemrosesan', ok: true },
      { ref: 'Ps. 12', t: 'Hak menggugat & menerima ganti rugi', ok: true },
      { ref: 'Ps. 13', t: 'Hak portabilitas data', ok: true },
    ];

    /* Insiden kebocoran data — notifikasi 3×24 jam (Ps. 46 UU PDP) */
    const NOTIF_HRS = 72;
    const incidents = [
      { id: 'INS-02', title: 'Email PBC salah kirim ke alamat eksternal', detected: '2026-02-19 14:10', severity: 'Sedang',
        affected: 1, dataset: 'Lampiran dokumen 1 entitas (tanpa data sensitif)',
        notifAuthorityAt: '2026-02-20 09:00', notifSubjectAt: '2026-02-20 11:30',
        status: 'Selesai', containment: 'Recall pesan + konfirmasi pemusnahan penerima.', rootCause: 'Auto-complete alamat keliru.' },
      { id: 'INS-01', title: 'Percobaan akses tidak sah portal klien (gagal MFA)', detected: '2025-12-03 22:40', severity: 'Rendah',
        affected: 0, dataset: 'Tidak ada data terekspos (login diblokir MFA)',
        notifAuthorityAt: null, notifSubjectAt: null,
        status: 'Ditutup — tanpa kebocoran', containment: 'Pemblokiran IP + reset kredensial.', rootCause: 'Credential stuffing.' },
    ].map(i => {
      const det = new Date(i.detected.replace(' ', 'T'));
      const deadline = new Date(det.getTime() + NOTIF_HRS * 3600e3);
      const breach = i.affected > 0;
      const notifAuthHrs = i.notifAuthorityAt ? (new Date(i.notifAuthorityAt.replace(' ', 'T')).getTime() - det.getTime()) / 3600e3 : null;
      const withinDeadline = !breach ? true : (notifAuthHrs != null && notifAuthHrs <= NOTIF_HRS);
      return { ...i, breach, deadline: deadline.toISOString().slice(0, 16).replace('T', ' '),
        notifAuthHrs: notifAuthHrs != null ? Math.round(notifAuthHrs) : null, withinDeadline };
    });

    /* Prinsip pelindungan (Ps. 16) — postur kepatuhan */
    const principles = [
      { k: 'Pengumpulan terbatas & spesifik', status: 'Aktif', ev: ropa.length + ' aktivitas terdaftar (RoPA)' },
      { k: 'Dasar pemrosesan yang sah ditetapkan', status: 'Aktif', ev: basisDist.length + ' jenis dasar dipetakan (Ps. 20)' },
      { k: 'Akurasi & pembaruan data', status: 'Aktif', ev: 'Kanal perbaikan via DSR' },
      { k: 'Pembatasan retensi & pemusnahan', status: 'Aktif', ev: 'Mengacu kelas retensi (UU PDP 5 thn — PMPJ)', to: 'records' },
      { k: 'Pemenuhan hak subjek data', status: dsr.some(d => d.overdue) ? 'Parsial' : 'Aktif', ev: dsr.filter(d => d.open).length + ' permintaan berjalan' },
      { k: 'Notifikasi kebocoran ≤ 3×24 jam', status: incidents.every(i => i.withinDeadline) ? 'Aktif' : 'Gagal', ev: incidents.filter(i => i.breach).length + ' insiden ter-notifikasi tepat waktu' },
      { k: 'Keamanan & enkripsi data pribadi', status: 'Aktif', ev: 'AES-256 at-rest · TLS 1.3', to: 'crypto' },
      { k: 'Pelibatan Pejabat Pelindungan Data (DPO)', status: 'Aktif', ev: dpo.name },
    ];

    const summary = {
      ropaCount: ropa.length,
      consentN, basisCount: basisDist.length,
      dsrOpen: dsr.filter(d => d.open).length,
      dsrOverdue: dsr.filter(d => d.overdue).length,
      dsrTotal: dsr.length,
      incidentsBreach: incidents.filter(i => i.breach).length,
      breachOnTime: incidents.filter(i => i.breach && i.withinDeadline).length,
      respSla: RESP_SLA, notifHrs: NOTIF_HRS,
    };

    /* dasar hukum */
    const legal = [
      { k: 'UU 27/2022', v: 'Pelindungan Data Pribadi (PDP)' },
      { k: 'Ps. 20', v: 'Dasar pemrosesan data pribadi yang sah' },
      { k: 'Ps. 5–13', v: 'Hak subjek data pribadi' },
      { k: 'Ps. 46', v: 'Notifikasi kebocoran ≤ 3×24 jam ke subjek & Lembaga PDP' },
    ];

    return { asOf: ASOF, dpo, BASIS, ropa, basisDist, dsr, rights, incidents, principles, summary, legal };
  }

  Object.assign(AMS_CANON, { legalSeal, pdp });
})();
