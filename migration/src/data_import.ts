/* ============================================================
   NeoSuite AMS — Impor & Integrasi Data: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Modul Impor adalah GERBANG MASUK data eksternal ke NeoSuite.
   Ia tidak menyimpan salinan terpisah: tiap berkas yang diimpor
   di-staging, divalidasi, lalu DI-POSTING ke modul PEMILIK datanya
   (sumber kebenaran). Modul hilir membaca record yang sama — tidak
   ada duplikasi.

   Rantai impor:
     Konektor eksternal → Staging → Validasi & total kontrol
       → Posting ke modul SSOT → Dikonsumsi modul hilir (live)

   KONSISTENSI: jumlah baris yang di-posting tiap dataset diturunkan
   dari AMS.PLATFORM.feedCounts() — angka LIVE yang juga dibaca modul
   tujuan. Dengan begitu "baris di-posting" SELALU = "record dikonsumsi".

   Konsumen:
     IMPORT.connectors()      → konektor diperkaya (job, posted, consumed)
     IMPORT.jobs()            → antrean impor (staging→posting)
     IMPORT.reconciliation()  → tie-out impor ↔ konsumsi SSOT
     IMPORT.summary()         → KPI
   ============================================================ */
import { AMS } from './data.js';
const IMPORT = (function () {
  const A: any = AMS;
  if (!A) return;
  const fmt = A.fmt || (n => String(n));
  const jt = (n) => 'Rp ' + fmt(Math.round((n || 0) / 1e6)) + ' jt';
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  /* ---------- konektor kanonik (SSOT definisi konektor) ----------
     target = modul PEMILIK utama (sumber kebenaran tujuan posting). */
  const CONNECTORS = [
    { id: 'coretax', name: 'DJP Coretax / e-Faktur', cat: 'Perpajakan', target: 'firmtax', desc: 'Sinkronisasi e-Bupot, e-Faktur & SPT masa dengan sistem DJP.', status: 'connected', last: '2 jam lalu', icon: 'receipt', uptime: 99.7, latency: 480, vol: 12840, schedule: 'Tiap 2 jam', endpoint: 'api.pajak.go.id/coretax/v1', auth: 'OAuth 2.0 · Sertifikat Elektronik', expiry: '2026-08-14',
      scopes: ['efaktur.read', 'ebupot.write', 'spt.submit'],
      mapping: [['NPWP Klien', 'taxpayer_id'], ['No. Faktur', 'invoice_number'], ['DPP', 'tax_base'], ['PPN', 'vat_amount'], ['Masa Pajak', 'tax_period']],
      syncs: [['2026-03-10 07:00', 'success', 312, 41], ['2026-03-10 05:00', 'success', 188, 38], ['2026-03-10 03:00', 'success', 204, 44], ['2026-03-09 23:00', 'partial', 96, 52, '4 faktur ditolak validasi']],
      webhooks: [['faktur.approved', true], ['spt.accepted', true], ['cert.expiring', true]] },
    { id: 'bank', name: 'Bank Feed (BCA · Mandiri)', cat: 'Keuangan', target: 'cashbank', desc: 'Tarik mutasi rekening firma otomatis untuk rekonsiliasi GL.', status: 'connected', last: '15 menit lalu', icon: 'building', uptime: 99.9, latency: 220, vol: 4521, schedule: 'Tiap 15 menit', endpoint: 'openapi.{bank}.co.id/v2/statements', auth: 'OAuth 2.0 · mTLS', expiry: '2026-12-01',
      scopes: ['account.balance', 'statement.read'],
      mapping: [['Tgl Transaksi', 'value_date'], ['Nominal', 'amount'], ['Berita', 'remark'], ['Rekening', 'account_no'], ['Tipe', 'dc_indicator']],
      syncs: [['2026-03-10 08:45', 'success', 18, 19], ['2026-03-10 08:30', 'success', 11, 18], ['2026-03-10 08:15', 'success', 7, 21]],
      webhooks: [['transaction.posted', true], ['balance.threshold', false]] },
    { id: 'esign', name: 'e-Signature (PrivyID)', cat: 'Dokumen', target: 'opinion', desc: 'Tanda tangan digital tersertifikasi untuk laporan & opini audit.', status: 'connected', last: 'Kemarin', icon: 'doc', uptime: 99.5, latency: 610, vol: 286, schedule: 'Real-time (webhook)', endpoint: 'api.privy.id/v3/documents', auth: 'API Key + HMAC', expiry: '2026-06-30',
      scopes: ['document.sign', 'signer.verify', 'audit.read'],
      mapping: [['ID Dokumen', 'document_token'], ['Penandatangan', 'signer_email'], ['Status', 'sign_status'], ['Sertifikat', 'cert_serial']],
      syncs: [['2026-03-09 16:48', 'success', 1, 32], ['2026-03-09 11:20', 'success', 1, 29], ['2026-03-08 14:05', 'success', 3, 41]],
      webhooks: [['document.signed', true], ['document.declined', true]] },
    { id: 'dms', name: 'Document Management (SharePoint)', cat: 'Penyimpanan', target: 'workpapers', desc: 'Arsip kertas kerja & retensi 10 tahun sesuai ISQM.', status: 'connected', last: '5 menit lalu', icon: 'layers', uptime: 99.8, latency: 350, vol: 38420, schedule: 'Real-time (delta sync)', endpoint: 'graph.microsoft.com/v1.0/sites', auth: 'OAuth 2.0 · Azure AD', expiry: '2027-01-20',
      scopes: ['Files.ReadWrite.All', 'Sites.Read.All'],
      mapping: [['Indeks WP', 'item_id'], ['Engagement', 'folder_path'], ['Versi', 'version'], ['Retensi', 'retention_label']],
      syncs: [['2026-03-10 08:55', 'success', 24, 12], ['2026-03-10 08:50', 'success', 9, 11], ['2026-03-10 08:40', 'success', 31, 14]],
      webhooks: [['file.created', true], ['retention.expiring', true]] },
    { id: 'emeterai', name: 'e-Meterai Peruri', cat: 'Dokumen', target: 'opinion', desc: 'Pembubuhan meterai elektronik pada dokumen resmi.', status: 'available', last: '—', icon: 'lock', uptime: 0, latency: 0, vol: 0, schedule: '—', endpoint: 'emeterai.peruri.co.id/api', auth: 'API Key', expiry: '—', scopes: ['meterai.affix'], mapping: [], syncs: [], webhooks: [] },
    { id: 'idx', name: 'IDX / KSEI Data Feed', cat: 'Data Pasar', target: 'crm', desc: 'Data emiten, harga saham & kepemilikan untuk klien tercatat.', status: 'available', last: '—', icon: 'trend', uptime: 0, latency: 0, vol: 0, schedule: '—', endpoint: 'api.idx.co.id/v1', auth: 'API Key', expiry: '—', scopes: ['issuer.read', 'price.read'], mapping: [], syncs: [], webhooks: [] },
    { id: 'ahu', name: 'AHU Online (Kemenkumham)', cat: 'Legal', target: 'onboarding', desc: 'Verifikasi badan hukum, akta & susunan pengurus klien.', status: 'error', last: 'Gagal 1 jam lalu', icon: 'gavel', uptime: 92.1, latency: 0, vol: 740, schedule: 'Harian 06:00', endpoint: 'ahu.go.id/api/legal-entity', auth: 'OAuth 2.0', expiry: '2026-04-05',
      scopes: ['entity.verify', 'deed.read'],
      mapping: [['No. AHU', 'ahu_number'], ['Nama Entitas', 'entity_name'], ['Pengurus', 'directors']],
      syncs: [['2026-03-10 06:00', 'failed', 0, 30, 'HTTP 503 — layanan AHU tidak tersedia'], ['2026-03-09 06:00', 'success', 12, 28], ['2026-03-08 06:00', 'success', 8, 26]],
      webhooks: [['entity.changed', true]] },
    { id: 'payroll', name: 'Payroll & HRIS', cat: 'SDM', target: 'payroll', desc: 'Sinkronisasi data karyawan, gaji & utilisasi.', status: 'available', last: '—', icon: 'users', uptime: 0, latency: 0, vol: 0, schedule: '—', endpoint: 'internal.whr-cpa.id/hris', auth: 'Service Account', expiry: '—', scopes: ['employee.read', 'payroll.read'], mapping: [], syncs: [], webhooks: [] },
  ];
  const connById = (id) => CONNECTORS.find(c => c.id === id) || null;

  /* ---------- total kontrol kanonik (live) per konektor ----------
     Gerbang posting: berkas hanya boleh di-posting bila total kontrol
     (mis. Σ PPN, saldo bank) cocok dengan angka pemilik datanya. */
  function controlTotal(id) {
    try {
      if (id === 'coretax') { const v = sum((A.EFAKTUR || []).filter(e => e.kind === 'Keluaran'), e => e.ppn); return { label: 'Σ PPN Keluaran (e-Faktur)', value: jt(v), owner: 'firmtax' }; }
      if (id === 'bank') { const v = (A.BANK_RECON || {}).bankBalance || sum((A.BANK_ACCOUNTS || []), a => a.balance); return { label: 'Saldo bank per rekening koran', value: jt(v), owner: 'cashbank' }; }
      if (id === 'esign') { const v = (A.ENGAGEMENTS || []).filter(e => e.phase === 'Finalisasi' || e.status === 'Completed').length; return { label: 'Sertifikat ↔ laporan final', value: v + ' dok', owner: 'opinion' }; }
      if (id === 'dms') { const v = (A.WORKPAPERS || []).length; return { label: 'Indeks WP ↔ arsip', value: v + ' WP', owner: 'workpapers' }; }
      if (id === 'ahu') { const v = (A.CLIENTS || []).length; return { label: 'Entitas terverifikasi', value: v + ' entitas', owner: 'onboarding' }; }
    } catch (e) { /* noop */ }
    return { label: '—', value: '—', owner: null };
  }

  function feeds(id) { return (A.PLATFORM && A.PLATFORM.feedCounts(id)) || []; }

  /* ---------- W9: server read-model overlay ----------
     The prototype computed everything below from the static feedCounts (simulated). W9 makes the
     SERVER the source of truth for the WIRED connector(s): the Integrasi view fetches the server
     reconciliation (window.AMS_API.integration.reconcile) and pushes it here via setServerData.
     When present, connectors()/reconciliation() overlay the real posted/consumed/tied figures for
     that connector (and flag it serverBacked). When the server is absent (offline / forbidden /
     pre-boot), _serverRecon stays null and the simulated blueprint is the fallback — degradasi
     anggun, persis pola W6. */
  let _serverRecon = null; // shape: { bank: { posted, consumed, tied, closingBalance }, … }
  function setServerData(d) { _serverRecon = (d && d.recon) || null; }
  function serverReconFor(id) { return (_serverRecon && _serverRecon[id]) || null; }
  function serverBacked(id) { return serverReconFor(id) != null; }

  /* ---------- antrean impor (jobs) DITURUNKAN dari feedCounts ----------
     Untuk tiap konektor terhubung, tiap umpan hilir menjadi satu job
     impor yang DI-POSTING; rows = jumlah LIVE yang dibaca modul tujuan,
     sehingga baris di-posting == record dikonsumsi (nol duplikasi).
     Lalu ditambah pengecualian terkurasi (staging tertahan / gagal)
     untuk menampilkan seluruh status pipeline. */
  const EXCEPTIONS = [
    { conn: 'coretax', dataset: 'SPT Masa PPN — berkas draf', target: 'firmtax', unit: 'faktur', rows: 96, valid: 92, rejected: 4, status: 'staged', mode: 'semi', ts: '2026-03-09 23:00', by: 'Integration Engine', note: '4 faktur ditolak: NPWP tidak valid — menunggu koreksi sebelum gerbang posting.' },
    { conn: 'ahu', dataset: 'Verifikasi badan hukum & pengurus', target: 'onboarding', unit: 'entitas', rows: 0, valid: 0, rejected: 0, status: 'failed', mode: 'auto', ts: '2026-03-10 06:00', by: 'Integration Engine', note: 'HTTP 503 — layanan AHU tidak tersedia. Staging dibatalkan, tidak ada posting.' },
  ];
  const MODE_BY_CONN = { coretax: 'auto', bank: 'auto', esign: 'auto', dms: 'auto' };

  function jobs() {
    const out = [];
    let seq = 1200;
    CONNECTORS.filter(c => c.status === 'connected').forEach(c => {
      feeds(c.id).forEach((f, i) => {
        const ts = (c.syncs[0] && c.syncs[0][0]) || A.PLATFORM.NOW;
        out.push({
          id: 'IMP-' + c.id.toUpperCase().slice(0, 3) + '-' + (seq++),
          conn: c.id, connName: c.name, dataset: f.label, target: f.module, targetLabel: f.label,
          unit: f.unit, rows: f.n, valid: f.n, rejected: 0,
          status: 'posted', mode: MODE_BY_CONN[c.id] || 'auto', ts, by: 'Integration Engine',
          control: controlTotal(c.id), gate: true,
        });
      });
    });
    EXCEPTIONS.forEach(e => {
      const c: any = connById(e.conn) || {};
      out.push({ id: 'IMP-' + e.conn.toUpperCase().slice(0, 3) + '-' + (seq++), connName: c.name, targetLabel: e.dataset, control: controlTotal(e.conn), gate: e.status === 'posted', ...e });
    });
    return out.sort((a, b) => (a.ts < b.ts ? 1 : -1));
  }
  function jobsByConnector(id) { return jobs().filter(j => j.conn === id); }

  /* ---------- konektor diperkaya ---------- */
  function connectors() {
    return CONNECTORS.map(c => {
      const js = jobsByConnector(c.id);
      const f = feeds(c.id);
      const posted = sum(js.filter(j => j.status === 'posted'), j => j.valid);
      const staged = sum(js.filter(j => j.status === 'staged'), j => j.rows);
      const failed = js.filter(j => j.status === 'failed').length;
      const rejected = sum(js, j => j.rejected);
      const consumed = sum(f, x => x.n);
      const base = { ...c, feeds: f, jobs: js, jobCount: js.length, posted, staged, failed, rejected, consumed, tied: posted === consumed && !failed };
      // W9 — overlay real server figures for the wired connector (else keep the simulated base).
      const sv = serverReconFor(c.id);
      if (sv) return { ...base, posted: sv.posted, consumed: sv.consumed, tied: sv.tied, serverBacked: true, status: 'connected', wired: true };
      return base;
    });
  }
  function connectorsSeed() { return CONNECTORS; }

  /* ---------- rekonsiliasi SSOT: impor ↔ konsumsi ----------
     Membuktikan: baris di-posting tiap konektor = record yang dibaca
     modul-modul hilir. Selisih 0 = tidak ada salinan terpisah. */
  function reconciliation() {
    return connectors().filter(c => c.status === 'connected' || c.status === 'error').map((c: any) => ({
      id: c.id, name: c.name, icon: c.icon, status: c.status,
      posted: c.posted, consumed: c.consumed, staged: c.staged, rejected: c.rejected, failed: c.failed,
      feeds: c.feeds, control: controlTotal(c.id), tied: c.tied, serverBacked: !!c.serverBacked,
    }));
  }

  function summary() {
    const cs = connectors();
    const connected = cs.filter(c => c.status === 'connected');
    const errored = cs.filter(c => c.status === 'error');
    const js = jobs();
    const postedRows = sum(js.filter(j => j.status === 'posted'), j => j.valid);
    const stagedRows = sum(js.filter(j => j.status === 'staged'), j => j.rows);
    const failedJobs = js.filter(j => j.status === 'failed');
    const consumed = sum(connected, c => c.consumed);
    const allTied = connected.every(c => c.tied);
    return { connectors: cs, connected, errored, jobs: js, postedRows, stagedRows, failedJobs, consumed, allTied, rejected: sum(js, j => j.rejected) };
  }

  const PROVENANCE = [
    { field: 'Modul tujuan (pemilik data)', source: 'AMS.PLATFORM.INTEGRATION_FEEDS', module: 'dataflow', label: 'Alur Data & Integritas' },
    { field: 'Jumlah baris di-posting', source: 'AMS.PLATFORM.feedCounts()', module: 'dataflow', label: 'feedCounts (live)' },
    { field: 'Total kontrol pajak (PPN)', source: 'AMS.EFAKTUR', module: 'firmtax', label: 'Pajak Firma' },
    { field: 'Total kontrol bank (saldo)', source: 'AMS.BANK_RECON', module: 'cashbank', label: 'Kas, Bank & Rekonsiliasi' },
    { field: 'Setiap impor → entri jejak', source: 'AMS.PLATFORM.buildAuditStream', module: 'audittrail', label: 'Audit Trail' },
    { field: 'Otorisasi & gerbang posting', source: 'AMS.PLATFORM.ROUTING_RULES', module: 'approvals', label: 'Approvals' },
  ];

  return {
    CONNECTORS, connById, connectors, connectorsSeed, jobs, jobsByConnector,
    reconciliation, summary, feeds, controlTotal, PROVENANCE,
    setServerData, serverBacked, // W9 — server read-model overlay
  };
})();

/* [codemod] ESM export (window.IMPORT dilucuti — konsumen pakai named import) */
export { IMPORT };
