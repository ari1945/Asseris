/* ============================================================
   NeoSuite AMS — Firm Platform · Lapisan Sumber Kebenaran (SSOT)
   ------------------------------------------------------------
   Satu tempat yang MENURUNKAN seluruh umpan modul Firm Platform
   (Approvals · Integrations · Audit Trail) dari entitas kanonik
   yang sama yang dibaca modul lain — bukan seed terpisah. Dengan
   begitu nama klien, status AJE, nilai faktur, dsb. tidak pernah
   menyimpang antar-modul.

   Konsumen:
     AMS.PLATFORM.buildApprovals(ctx)   → antrean persetujuan
     AMS.PLATFORM.INTEGRATION_FEEDS     → lineage konektor → modul
     AMS.PLATFORM.feedCounts(id)        → hitung record LIVE
     AMS.PLATFORM.buildAuditStream(log) → arus jejak audit terpadu
     AMS.PLATFORM.ROUTING_RULES         → matriks otorisasi
   ============================================================ */
import { AMS } from './data';
(function () {
  const A: any = AMS;
  if (!A) return;

  const NOW = '2026-03-10 09:00';
  const fmt = A.fmt || (n => String(n));
  const jt = (n) => 'Rp ' + fmt(Math.round((n || 0) / 1e6)) + ' jt';

  /* resolver kanonik — satu jalan ke master data */
  const engById = (id) => (A.ENGAGEMENTS || []).find(e => e.id === id) || null;
  const cliById = (id) => (A.CLIENTS || []).find(c => c.id === id) || null;
  const short = A.shortName || (s => (s || '').replace(/^PT\s+/, ''));

  /* peran tetap firma (ISQM) — diisi dari penugasan kanonik bila ada */
  const MANAGING = 'Hartono Wijaya, CPA';
  const EQR_REV = 'Rudi Gunawan, CPA';
  const QUALITY = 'Rudi Gunawan, CPA';
  const FINANCE = 'Lestari Anjani';        // Finance Lead firma
  const PREPARER = 'Dimas Raharjo';        // penyusun jurnal (Senior)

  /* ---------- matriks routing (otorisasi berbasis jenis & nilai) ---------- */
  const ROUTING_RULES = [
    { kind: 'AJE / Penyesuaian', t1: '< Rp 500 jt', a1: 'Manager', t2: 'Rp 0,5–2 M', a2: 'Manager → Partner', t3: '> Rp 2 M', a3: 'Manager → Partner → EQR' },
    { kind: 'Faktur / Billing', t1: '< Rp 250 jt', a1: 'Manager', t2: 'Rp 0,25–1 M', a2: 'Manager → Finance → Partner', t3: '> Rp 1 M', a3: 'Finance → Managing Partner' },
    { kind: 'Penerimaan Klien', t1: 'Risiko Rendah', a1: 'Quality Partner', t2: 'Risiko Sedang', a2: 'QP → Managing Partner', t3: 'PIE / Tinggi', a3: 'QP → MP → Komite Risiko' },
    { kind: 'Penerbitan Opini', t1: 'Non-PIE WTP', a1: 'Engagement Partner', t2: 'Modifikasi', a2: 'EP → EQR', t3: 'PIE', a3: 'EP → EQR → Managing Partner' },
    { kind: 'WIP Write-off', t1: '< Rp 50 jt', a1: 'Manager', t2: 'Rp 50–250 jt', a2: 'Manager → MP', t3: '> Rp 250 jt', a3: 'MP → Komite' },
    { kind: 'Independensi & Rotasi', t1: 'Deklarasi', a1: 'Quality Partner', t2: 'Konflik', a2: 'QP → MP', t3: 'Rotasi wajib', a3: 'QP → MP → Komite Etika' },
  ];

  /* bangun rantai: steps = [[role,name,ts?,note?]], doneTo = jumlah langkah selesai */
  function chain(steps, doneTo) {
    return steps.map((s, i) => ({
      role: s[0], name: s[1],
      status: i < doneTo ? 'approved' : i === doneTo ? 'current' : 'pending',
      ts: i < doneTo ? (s[2] || NOW) : null,
      note: i < doneTo ? (s[3] || 'Disetujui.') : null,
    }));
  }

  /* ============================================================
     buildApprovals — antrean persetujuan DITURUNKAN dari kanonik.
     ctx = { aje, invoices, pipeline, engagements, clients, independence, wip }
     Tiap item membawa sourceModule + sourceId → dapat ditelusuri balik
     dan tidak pernah out-of-sync dengan modul sumbernya.
     ============================================================ */
  function buildApprovals(ctx) {
    ctx = ctx || {};
    const aje = ctx.aje || A.AJE || [];
    const invoices = ctx.invoices || A.INVOICES || [];
    const pipeline = ctx.pipeline || A.PIPELINE || [];
    const engs = ctx.engagements || A.ENGAGEMENTS || [];
    const indep = ctx.independence || A.INDEPENDENCE || [];
    const wip = ctx.wip || A.WIP_ENG || [];
    const out = [];

    /* ---- 1. AJE — sumber: useAudit().aje (ledger penyesuaian) ---- */
    const engA = engById('ENG-2025-014');
    const cliA = engA ? cliById(engA.clientId) : null;
    aje.forEach((a) => {
      const posted = a.status === 'Posted';
      const hi = a.amount >= 2e9, mid = a.amount >= 5e8;
      const ref = a.ref || (a.lines ? 'JE' : a.id);
      const drCode = a.dr ? a.dr.split(' ')[0] : (a.lines || []).filter(l => (+l.debit || 0) > 0).map(l => l.code)[0] || 'DR';
      const crCode = a.cr ? a.cr.split(' ')[0] : (a.lines || []).filter(l => (+l.credit || 0) > 0).map(l => l.code)[0] || 'CR';
      const steps = [['Penyusun', PREPARER, '2026-03-09 16:40', 'AJE diajukan dari kertas kerja ' + ref + '.'],
        ['Audit Manager', engA.manager], ['Engagement Partner', engA.partner]];
      if (hi) steps.push(['EQR Reviewer', EQR_REV]);
      const doneTo = posted ? steps.length : 1;
      out.push({
        id: 'APR-' + a.id, kind: 'AJE', sourceModule: 'aje', sourceRoute: 'aje', sourceId: a.id,
        ref: a.id, title: (a.desc || 'Jurnal penyesuaian') + ' · ' + jt(a.amount), from: PREPARER, role: 'Senior Auditor',
        amount: a.amount, status: posted ? 'approved' : 'pending', priority: hi ? 'high' : mid ? 'medium' : 'low',
        submitted: '2026-03-09 16:40', due: '2026-03-10 17:00', eng: engA.id, engId: engA.id,
        clientId: cliA.id, client: cliA.name, step: doneTo, chain: chain(steps, doneTo),
        prov: 'Jurnal ' + a.id + ' · ' + drCode + ' ⇄ ' + crCode + ' · WP ' + ref,
        writesBack: !posted, // approval final akan memposting AJE ke WTB (SSOT)
        thread: posted ? [] : [{ who: PREPARER, role: 'Senior', when: '09 Mar 16:42', text: 'Pendukung terlampir di WP ' + ref + ' (' + engA.id + ').' }],
      });
    });

    /* ---- 2. Faktur — sumber: AMS.INVOICES (billing) ---- */
    invoices.forEach((v) => {
      const draft = v.status === 'Draft';
      const sentBig = v.status === 'Sent' && v.amount >= 5e8;
      const pending = draft || sentBig;
      if (!pending && !(v.status === 'Sent')) return; // hanya tampilkan yang relevan otorisasi
      const eng = engById(v.eng);
      const steps = [['Audit Manager', eng ? eng.manager : 'Anindya Pramesti'],
        ['Finance Lead', FINANCE], ['Managing Partner', MANAGING]];
      const doneTo = draft ? 0 : sentBig ? 2 : 3;
      out.push({
        id: 'APR-' + v.id, kind: 'Faktur', sourceModule: 'billing', sourceRoute: 'billing', sourceId: v.id,
        ref: v.id, title: 'Penerbitan faktur ' + v.milestone + ' — ' + short(v.client), from: eng ? eng.manager : 'Anindya Pramesti',
        role: 'Audit Manager', amount: v.amount, status: pending ? 'pending' : 'approved', priority: v.amount >= 1e9 ? 'high' : 'medium',
        submitted: v.issued + ' 09:00', due: v.due + ' 17:00', eng: v.eng, engId: v.eng,
        clientId: v.clientId, client: v.client, step: doneTo, chain: chain(steps, doneTo),
        prov: 'Faktur ' + v.id + ' · ' + v.milestone + ' · ' + v.eng, thread: [],
      });
    });

    /* ---- 3. Penerimaan klien — sumber: AMS.PIPELINE ---- */
    pipeline.filter(p => ['Proposal', 'Negotiation', 'Won'].includes(p.stage)).forEach((p) => {
      const pending = p.stage !== 'Won';
      const pie = /Energi|Properti|Finance|Keuangan/i.test(p.industry);
      const steps = [['Risk & CDD', 'Sistem PMPJ', '2026-03-08 09:45', 'Skrining PEP & sanksi: bersih.'],
        ['Quality Partner', QUALITY], ['Managing Partner', MANAGING]];
      const doneTo = pending ? 1 : steps.length;
      out.push({
        id: 'APR-' + p.id, kind: 'Engagement', sourceModule: 'pipeline', sourceRoute: 'pipeline', sourceId: p.id,
        ref: p.id, title: 'Penerimaan perikatan — ' + short(p.name) + ' (' + p.service + ')', from: p.owner,
        role: 'Engagement Partner', amount: p.value, status: pending ? 'pending' : 'approved',
        priority: pie ? 'high' : 'medium', submitted: '2026-03-08 09:30', due: p.close + ' 12:00',
        eng: p.id, engId: p.id, clientId: null, client: p.name, step: doneTo, chain: chain(steps, doneTo),
        prov: 'Peluang ' + p.id + ' · tahap ' + p.stage + ' · prob ' + p.prob + '%',
        thread: [{ who: p.owner, role: 'Partner', when: '08 Mar 09:31', text: 'Independensi tim terkonfirmasi; ' + (pie ? 'EQR wajib (entitas terindikasi PIE).' : 'risiko sedang.') }],
      });
    });

    /* ---- 4. Penerbitan opini — sumber: engagements fase Finalisasi ---- */
    engs.filter(e => e.phase === 'Finalisasi' || e.status === 'Review').forEach((e) => {
      const cli = cliById(e.clientId);
      const pie = cli && cli.listed;
      const steps = [['Audit Manager', e.manager, '2026-03-09 08:05', 'Draft opini & SAD final dilampirkan.'],
        ['Engagement Partner', e.partner, '2026-03-09 14:20', 'Setuju basis opini.'],
        ['EQR Reviewer', EQR_REV]];
      if (pie) steps.push(['Managing Partner', MANAGING]);
      out.push({
        id: 'APR-OP-' + e.id, kind: 'Opini', sourceModule: 'opinion', sourceRoute: 'opinion', sourceId: e.id,
        ref: e.id, title: 'Penerbitan opini audit — ' + short(cli ? cli.name : ''), from: e.manager,
        role: 'Audit Manager', amount: 0, status: 'pending', priority: 'high',
        submitted: '2026-03-09 08:05', due: e.deadline + ' 12:00', eng: e.id, engId: e.id,
        clientId: e.clientId, client: cli ? cli.name : '', step: 2, chain: chain(steps, 2),
        prov: 'Perikatan ' + e.id + ' · progres ' + e.progress + '% · ' + (pie ? 'PIE (EQR wajib)' : 'Non-PIE'),
        thread: [{ who: e.partner.replace(', CPA', ''), role: 'Partner', when: '09 Mar 14:22', text: pie ? 'EQR wajib — emiten PIE. Mohon telaah paragraf basis opini.' : 'Telaah akhir sebelum tanda tangan.' }],
      });
    });

    /* ---- 5. Independensi & rotasi — sumber: AMS.INDEPENDENCE ---- */
    indep.forEach((d) => {
      const rotate = d.declared && d.tenure >= d.rotationLimit;
      const undeclared = !d.declared;
      if (!rotate && !undeclared) return;
      const steps = [['Quality Partner', QUALITY], ['Managing Partner', MANAGING]];
      if (rotate) steps.push(['Komite Etika', 'Komite Etika & Independensi']);
      out.push({
        id: 'APR-IND-' + d.id, kind: 'Independensi', sourceModule: 'independence', sourceRoute: 'independence', sourceId: d.id,
        ref: 'IND-' + d.id, title: rotate ? 'Rotasi partner wajib — ' + short(d.rotationClient) + ' (tenure ' + d.tenure + ' th)' : 'Deklarasi independensi tertunda — ' + d.name,
        from: d.name, role: 'Engagement Partner', amount: 0, status: 'pending',
        priority: rotate ? 'high' : 'medium', submitted: '2026-03-09 07:00', due: '2026-03-11 17:00',
        eng: '—', engId: null, clientId: null, client: rotate ? d.rotationClient : 'Internal',
        step: 0, chain: chain(steps, 0),
        prov: rotate ? 'Tenure ' + d.tenure + '/' + d.rotationLimit + ' th · batas rotasi tercapai' : 'Status deklarasi: ' + d.finInterest,
        thread: [],
      });
    });

    /* ---- 6. WIP write-off — sumber: AMS.WIP_ENG ---- */
    wip.filter(w => w.writeDown >= 1e8).forEach((w) => {
      const e = engById(w.id);
      const cli = e ? cliById(e.clientId) : null;
      const steps = [['Audit Manager', e ? e.manager : 'Anindya Pramesti'], ['Managing Partner', MANAGING]];
      out.push({
        id: 'APR-WIP-' + w.id, kind: 'WIP Write-off', sourceModule: 'wipreal', sourceRoute: 'wipreal', sourceId: w.id,
        ref: w.id, title: 'Penghapusan WIP tak tertagih ' + jt(w.writeDown) + ' — ' + short(cli ? cli.name : ''),
        from: e ? e.manager : 'Anindya Pramesti', role: 'Audit Manager', amount: w.writeDown, status: 'pending',
        priority: w.writeDown >= 25e7 ? 'high' : 'low', submitted: '2026-03-07 15:00', due: '2026-03-13 17:00',
        eng: w.id, engId: w.id, clientId: cli ? cli.id : null, client: cli ? cli.name : '',
        step: 0, chain: chain(steps, 0),
        prov: 'WIP ' + w.id + ' · standar ' + jt(w.std) + ' · ditagih ' + jt(w.billed), thread: [],
      });
    });

    /* urutkan: menunggu dulu (prioritas tinggi → rendah), lalu selesai */
    const rank = { high: 0, medium: 1, low: 2 };
    return out.sort((x, y) =>
      (x.status === 'pending' ? 0 : 1) - (y.status === 'pending' ? 0 : 1) ||
      (rank[x.priority] - rank[y.priority]));
  }

  /* ============================================================
     INTEGRATION_FEEDS — lineage konektor eksternal → modul NeoSuite
     yang MENGONSUMSI datanya. count(ctx) menghitung record LIVE dari
     entitas kanonik yang sama, sehingga "record tersinkron" pada
     konektor = jumlah yang benar-benar dibaca modul hilir.
     ============================================================ */
  const INTEGRATION_FEEDS = {
    coretax: [
      { module: 'firmtax', label: 'Pajak Firma', count: () => (A.TAX_OBLIGATIONS || []).length, unit: 'kewajiban pajak' },
      { module: 'wtb', label: 'Working Trial Balance', count: () => (A.ENGAGEMENTS || []).length, unit: 'WTB ditarik dari GL' },
      { module: 'reconcile', label: 'Rekonsiliasi Pajak', count: () => (A.EFAKTUR || []).length, unit: 'faktur pajak' },
    ],
    bank: [
      { module: 'cashbank', label: 'Kas, Bank & Rekonsiliasi', count: () => (A.BANK_ACCOUNTS || []).length, unit: 'rekening firma' },
      { module: 'reconcile', label: 'Rekonsiliasi Bank', count: () => ((A.BANK_RECON || {}).lines || []).length, unit: 'item rekonsiliasi' },
      { module: 'treasury', label: 'Anggaran & Arus Kas', count: () => (A.CASH_FORECAST || []).length, unit: 'proyeksi arus kas' },
    ],
    esign: [
      { module: 'opinion', label: 'Audit Opinion', count: () => (A.ENGAGEMENTS || []).filter(e => e.phase === 'Finalisasi' || e.status === 'Completed').length, unit: 'laporan ditandatangani' },
      { module: 'workpapers', label: 'Working Papers', count: () => (A.WORKPAPERS || []).filter(w => w.status === 'Reviewed').length, unit: 'WP final tertandatangan' },
      { module: 'pppk', label: 'Pelaporan PPPK', count: () => (A.PPPK_CLIENTS || []).length, unit: 'laporan regulator' },
    ],
    dms: [
      { module: 'workpapers', label: 'Working Papers', count: () => (A.WORKPAPERS || []).length, unit: 'indeks kertas kerja' },
      { module: 'clientportal', label: 'Portal Klien (PBC)', count: () => (A.PBC_REQUESTS || []).length, unit: 'permintaan dokumen' },
      { module: 'dms', label: 'Document Management', count: () => (A.DMS_DOCS || []).length, unit: 'dokumen terarsip' },
    ],
    ahu: [
      { module: 'onboarding', label: 'Onboarding & PMPJ', count: () => (A.CLIENTS || []).length, unit: 'entitas terverifikasi' },
      { module: 'crm', label: 'Client CRM', count: () => (A.CLIENTS || []).filter(c => c.listed).length, unit: 'badan hukum tercatat' },
    ],
    payroll: [
      { module: 'payroll', label: 'Payroll & PPh 21', count: () => (A.PAYROLL || []).length, unit: 'slip gaji' },
      { module: 'hcm', label: 'Human Capital', count: () => (A.STAFF || []).length, unit: 'master karyawan' },
    ],
    idx: [
      { module: 'crm', label: 'Client CRM', count: () => (A.CLIENTS || []).filter(c => c.listed).length, unit: 'emiten tercatat' },
      { module: 'independence', label: 'Independensi', count: () => (A.INDEPENDENCE || []).filter(d => d.listed).length, unit: 'cek kepemilikan' },
    ],
    emeterai: [
      { module: 'opinion', label: 'Audit Opinion', count: () => 0, unit: 'dokumen bermeterai' },
      { module: 'billing', label: 'Billing & Invoicing', count: () => 0, unit: 'kontrak bermeterai' },
    ],
  };

  function feedCounts(id) {
    return (INTEGRATION_FEEDS[id] || []).map(f => ({ module: f.module, label: f.label, unit: f.unit, n: (() => { try { return f.count(); } catch (e) { return 0; } })() }));
  }

  /* ============================================================
     buildAuditStream — arus jejak audit TERPADU dari tiga sumber
     kanonik: (1) log aktivitas live (useAudit().logEntries),
     (2) jejak firma kanonik (AMS.AUDIT_TRAIL), (3) seed sistem
     terkurasi yang merujuk ID kanonik. Setiap baris membawa
     sourceModule → dapat di-navigasi ke modul asal.
     ============================================================ */
  const SEED = [
    { ts: '2026-03-10 08:55', who: 'Sistem', role: 'Integration Engine', action: 'SYNC', module: 'Integrations', sourceModule: 'integrations', target: 'SharePoint DMS', detail: '24 kertas kerja diarsipkan (delta sync)', ip: '10.0.4.12', device: 'Service · Azure AD', sess: 'svc-dms-01' },
    { ts: '2026-03-09 16:48', who: 'Anindya Pramesti', role: 'Audit Manager', action: 'SIGN', module: 'Working Papers', sourceModule: 'workpapers', target: 'WP B', detail: 'WP B (Piutang & ECL) ditandatangani digital (PrivyID)', ip: '103.28.14.20', device: 'Chrome · macOS', sess: 'a1f9c2', cert: 'PRIVY-2026-8841' },
    { ts: '2026-03-09 14:22', who: 'Dimas Raharjo', role: 'Senior Auditor', action: 'UPLOAD', module: 'Confirmation Hub', sourceModule: 'confirm', target: 'CONF-BCA-014', detail: 'Konfirmasi bank BCA (ENG-2025-014) diunggah · hash terverifikasi', ip: '103.28.14.31', device: 'Chrome · Windows', sess: 'd7b3e1', hashFile: 'SHA-256: 9f2a…c41d' },
    { ts: '2026-03-09 13:10', who: 'Hartono Wijaya', role: 'Engagement Partner', action: 'APPROVE', module: 'AJE', sourceModule: 'aje', target: 'AJE-04', detail: 'AJE-04 (akrual bonus Rp 980 jt) disetujui & diposting ke WTB', ip: '103.28.14.05', device: 'Safari · iPadOS', sess: 'h0c5a8', before: 'Status: Proposed', after: 'Status: Posted' },
    { ts: '2026-03-09 11:48', who: 'Sistem', role: 'Integration Engine', action: 'SYNC', module: 'Data Flow', sourceModule: 'dataflow', target: 'WTB ENG-2025-014', detail: 'WTB ditarik dari GL klien via DJP Coretax', ip: '10.0.4.12', device: 'Service · DJP', sess: 'svc-tax-02' },
    { ts: '2026-03-08 17:30', who: 'Anindya Pramesti', role: 'Audit Manager', action: 'EDIT', module: 'Risk Assessment', sourceModule: 'risk', target: 'R-01', detail: 'Risiko Pendapatan (R-01) dinaikkan ke Significant', ip: '103.28.14.20', device: 'Chrome · macOS', sess: 'a1f9c2', before: 'Penilaian: Moderate', after: 'Penilaian: Significant' },
    { ts: '2026-03-08 15:02', who: 'Rudi Gunawan', role: 'Quality Partner', action: 'LOGIN', module: 'Auth', sourceModule: null, target: 'Sesi', detail: 'Masuk · MFA TOTP berhasil', ip: '114.79.50.18', device: 'Chrome · Windows', sess: 'r4d8f0' },
    { ts: '2026-03-08 10:05', who: 'Citra Halim', role: 'Audit Manager', action: 'SEND', module: 'Opinion', sourceModule: 'opinion', target: 'ENG-2025-063', detail: 'Draft opini ENG-2025-063 (Graha Properti) dikirim ke EQR', ip: '103.28.14.44', device: 'Edge · Windows', sess: 'c2a1b9' },
    { ts: '2026-03-07 16:20', who: 'Rina Kusuma', role: 'Junior Auditor', action: 'CREATE', module: 'Billing', sourceModule: 'billing', target: 'INV-2026-045', detail: 'Faktur INV-2026-045 (Cahaya Logistik) dibuat — status Draft', ip: '103.28.14.52', device: 'Chrome · Windows', sess: 'ri6b2c', before: '—', after: 'INV-2026-045 · Rp 360 jt' },
    { ts: '2026-03-06 13:40', who: 'Anindya Pramesti', role: 'Audit Manager', action: 'EXPORT', module: 'Audit Trail', sourceModule: 'audittrail', target: 'Log Q1', detail: 'Ekspor jejak audit Q1 2026 (PDF)', ip: '103.28.14.20', device: 'Chrome · macOS', sess: 'a1f9c2' },
    { ts: '2026-03-06 08:30', who: 'Hartono Wijaya', role: 'Engagement Partner', action: 'LOGIN', module: 'Auth', sourceModule: null, target: 'Sesi', detail: 'Masuk · MFA biometrik', ip: '103.28.14.05', device: 'Safari · iPadOS', sess: 'h0c5a8' },
  ];

  /* peta modul kanonik (dari data_fpm.AUDIT_TRAIL) → bentuk seragam */
  function canonRows() {
    return (A.AUDIT_TRAIL || []).map(r => ({
      ts: r.ts, who: r.user, role: r.user === 'Sistem' ? 'Integration Engine' : 'Sesi Tercatat',
      action: ({ 'Mengubah skor risiko': 'EDIT', 'Propagasi materialitas': 'SYNC', 'Menyetujui AJE': 'APPROVE', 'Menambah konektor': 'SYNC' }[r.action]) || 'EDIT',
      module: (window.MODULE_INDEX && window.MODULE_INDEX[r.module] || {}).label || r.module,
      sourceModule: r.module, target: r.entity, detail: r.action + ' · ' + r.entity,
      ip: r.user === 'Sistem' ? '10.0.4.12' : '103.28.14.20', device: r.user === 'Sistem' ? 'Service' : 'Chrome · macOS', sess: r.user === 'Sistem' ? 'svc' : 'sesi',
    }));
  }

  function buildAuditStream(logEntries) {
    const MI = window.MODULE_INDEX || {};
    const live = (logEntries || []).map(e => ({
      ts: e.ts || NOW, who: e.who || 'Sistem', role: 'Sesi Aktif',
      action: e.action || (e.icon ? String(e.icon).toUpperCase() : 'EDIT'),
      module: (MI[e.mod] && MI[e.mod].label) || 'Approvals', sourceModule: e.mod || 'approvals',
      target: e.target || '—', detail: e.detail || e.what || '—',
      ip: '103.28.14.20', device: 'Chrome · macOS', sess: 'live', live: true,
    }));
    /* gabung + dedup kasar berdasar ts+detail, urut terbaru dulu */
    const merged = [...live, ...SEED, ...canonRows()];
    const seen = new Set();
    return merged.filter(r => { const k = r.ts + r.detail; if (seen.has(k)) return false; seen.add(k); return true; })
      .sort((a, b) => a.ts < b.ts ? 1 : -1);
  }

  A.PLATFORM = { buildApprovals, INTEGRATION_FEEDS, feedCounts, buildAuditStream, ROUTING_RULES, NOW };
})();
