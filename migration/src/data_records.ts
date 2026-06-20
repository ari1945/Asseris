/* [codemod] ESM imports */
import { AMS } from './data.js';
import { BO as BO_NS } from './data_backoffice';

/* ============================================================
   NeoSuite AMS — Retensi & Arsip: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Modul "Retensi & Arsip" TIDAK menyimpan angka arsip sendiri.
   Seluruh register diturunkan (derived) dari sumber pemiliknya:

     · Dokumen (grain dokumen)   ← AMS.DMS_DOCS   (Document Mgmt)
     · Identitas perikatan/klien ← AMS.ENGAGEMENTS + CLIENTS
     · Sengketa & litigasi       ← BO.DISPUTES / AMS (Legal)
     · Klaim PII terkait hold    ← BO.CLAIMS
     · PO pemusnahan             ← BO.PURCHASE_ORDERS  (Pengadaan)

   PRINSIP:
   1. KEBIJAKAN RETENSI (RETENTION_CLASSES) adalah sumber tunggal masa
      simpan. Masa simpan dokumen di DMS & masa simpan berkas perikatan
      di sini DITARIK dari kelas yang sama — bukan di-hardcode ganda.
   2. REGISTRI LEGAL HOLD (HOLDS) adalah sumber tunggal penangguhan
      disposal. DMS (dokumen ditahan) & modul Legal (sengketa) menunjuk
      ke registri yang sama — satu hold, banyak konsumen.
   3. KOTAK ARSIP per perikatan DIRAKIT dari dokumen DMS-nya: ukuran &
      jumlah berkas = agregat dokumen DMS live; sehingga satu perubahan
      di DMS mengalir konsisten ke kotak arsip, kalender pemusnahan,
      cockpit operasi, dan rekonsiliasi.

   Anchor "hari ini" = 2026-03-09 (selaras seluruh modul).
   Konsumsi via window.RETENTION.
   ============================================================ */
(function () {
  const today = new Date('2026-03-09');
  const daysTo = (d) => d ? Math.round((new Date(d).getTime() - today.getTime()) / 864e5) : null;
  const yearsLeft = (d) => d ? (new Date(d).getTime() - today.getTime()) / (365.25 * 864e5) : null;
  const addYears = (d, y) => { const x = new Date(d); x.setFullYear(x.getFullYear() + y); return x.toISOString().slice(0, 10); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
  const A = (): any => AMS || {};
  const BO = (): any => BO_NS || {};

  /* ============================================================
     1 · KEBIJAKAN RETENSI — kelas kanonik (sumber tunggal masa simpan)
     ============================================================ */
  const RETENTION_CLASSES = [
    { id: 'kk-audit',  jenis: 'Berkas Audit / Kertas Kerja (final)', dasar: 'SA 230 ¶A23 / SPM 1 — min. 5 thn sejak tanggal laporan', years: 7,  format: 'Elektronik terenkripsi (AES-256)', types: ['Kertas Kerja'], note: 'WHR menetapkan 7 tahun, melebihi minimum SA 230. Mengikat masa simpan kotak arsip perikatan audit.' },
    { id: 'asurans',   jenis: 'Berkas Asurans & Reviu (SPR/SJAH)',    dasar: 'SPM 1 / SPR 2400 / SJAH 3000',                       years: 7,  format: 'Elektronik terenkripsi',          types: ['Laporan'],      note: 'Reviu (SPR 2400) & asurans lain — selaras berkas audit.' },
    { id: 'perikatan', jenis: 'Surat Perikatan & Kontrak Klien',       dasar: 'Kebijakan firma',                                    years: 10, format: 'Elektronik + fisik',             types: ['Surat Perikatan'], note: 'Termasuk surat perikatan, addendum & representasi tertulis.' },
    { id: 'eqr',       jenis: 'Telaah Mutu Perikatan (EQR)',           dasar: 'ISQM 2 / SPM 1',                                     years: 7,  format: 'Elektronik terenkripsi',          types: ['EQR'],          note: 'Memo & dokumentasi penelaah pengendalian mutu.' },
    { id: 'pajak',     jenis: 'Dokumen Pajak & Keuangan Firma',        dasar: 'UU KUP Pasal 28(11) — 10 tahun',                     years: 10, format: 'Elektronik',                     types: [],               note: 'Pembukuan & dokumen pajak firma.' },
    { id: 'pmpj',      jenis: 'Data Pribadi / PMPJ (APU-PPT)',         dasar: 'POJK & UU PDP — 5 thn pasca berakhirnya hubungan',   years: 5,  format: 'Elektronik terenkripsi',          types: [],               note: 'Tunduk UU PDP — minimisasi & pemusnahan tepat waktu wajib.' },
    { id: 'template',  jenis: 'Template & Metodologi Internal',        dasar: 'Kebijakan firma',                                    years: 3,  format: 'Elektronik',                     types: ['Template'],     note: 'Diganti versi; versi lama disimpan 3 tahun.' },
  ];
  const classById = (id) => RETENTION_CLASSES.find(c => c.id === id) || RETENTION_CLASSES[0];
  const classForType = (type) => RETENTION_CLASSES.find(c => c.types.includes(type)) || classById('kk-audit');
  /* masa simpan dokumen DMS DITARIK dari kelas — dipakai DMS & evaluasi bukti */
  const retentionYearsForType = (type) => classForType(type).years;
  /* kelas berkas (kotak) per perikatan — audit & reviu → berkas asurans 7 thn */
  const classForEngagement = (engId) => {
    const e = (A().engById && A().engById(engId)) || null;
    if (e && /Review|Reviu|SPR/.test(e.type + ' ' + e.standard)) return classById('asurans');
    return classById('kk-audit');
  };

  /* ============================================================
     2 · REGISTRI LEGAL HOLD — sumber tunggal penangguhan disposal
     Menyatukan hold yang sebelumnya tersebar di BO.LEGAL_HOLDS (firma)
     dan flag legalHold pada dokumen DMS (mis. Graha Properti). Tiap
     hold menahan SELURUH kotak arsip perikatan & dokumen DMS-nya.
     ============================================================ */
  const HOLDS = [
    { id: 'LH-02', engId: 'ENG-2024-008', subject: 'PT Bina Usaha', fy: 2023, since: '2025-09-12', by: 'Kepala Legal',
      reason: 'Sengketa pemegang saham — potensi litigasi atas opini WTP LK 2023. Disposal ditangguhkan hingga perkara berkekuatan hukum tetap.',
      status: 'Aktif', disputeId: 'LIT-03', claimId: 'CLM-02', scope: 'Seluruh berkas perikatan ENG-2024-008' },
    { id: 'LH-03', engId: 'ENG-2025-063', subject: 'PT Graha Properti Investama', fy: 2025, since: '2026-02-28', by: 'Legal KAP',
      reason: 'Sengketa litigasi klien — tahan hingga putusan pengadilan. Mencakup surat perikatan & memo EQR yang telah dikendalikan di DMS.',
      status: 'Aktif', disputeId: null, claimId: null, scope: 'Surat perikatan & memo EQR (dok. DMS) + berkas perikatan ENG-2025-063' },
    { id: 'LH-01', engId: 'ENG-2022-019', subject: 'PT Surya Niaga', fy: 2022, since: '2024-11-03', by: 'Managing Partner',
      reason: 'Permintaan keterangan regulator (OJK). Hold dicabut setelah pemeriksaan selesai tanpa tindak lanjut.',
      status: 'Dicabut', releasedOn: '2025-08-20', disputeId: null, claimId: null, scope: 'Berkas perikatan ENG-2022-019' },
  ];
  const activeHolds = () => HOLDS.filter(h => h.status === 'Aktif');
  const holdForEng = (engId) => activeHolds().find(h => h.engId === engId) || null;
  /* dokumen DMS yang ditahan = seluruh dokumen pada perikatan yang sedang di-hold */
  const heldDocs = () => {
    const held = new Set(activeHolds().map(h => h.engId));
    return (A().DMS_DOCS || []).filter(d => held.has(d.eng));
  };

  /* ============================================================
     3 · KOTAK ARSIP per perikatan
     - DMS-tracked: dirakit dari dokumen DMS (ukuran & jumlah = live)
     - Legacy (pra-DMS): metadata kotak tersimpan, tak ada dokumen granular
     ============================================================ */
  /* Kotak legacy (perikatan lama, sebelum dokumen granular masuk DMS). */
  const LEGACY_BOXES = [
    { engId: 'ENG-2025-058', client: 'PT Samudra Pangan Lestari', fy: 2025, reportDate: '2026-02-26', archivedOn: '2026-03-05', sizeMB: 1320, docCount: 168 },
    { engId: 'ENG-2024-022', client: 'PT Cahaya Logistik Nusantara', fy: 2024, reportDate: '2025-03-01', archivedOn: '2025-03-15', sizeMB: 1840, docCount: 214 },
    { engId: 'ENG-2024-008', client: 'PT Bina Usaha', fy: 2023, reportDate: '2025-02-10', archivedOn: '2025-02-20', sizeMB: 1120, docCount: 152 },
    { engId: 'ENG-2019-031', client: 'PT Lama Sejahtera', fy: 2018, reportDate: '2019-02-08', archivedOn: '2019-02-18', sizeMB: 900, docCount: 96 },
    { engId: 'ENG-2018-014', client: 'CV Mitra Lestari', fy: 2017, reportDate: '2019-02-25', archivedOn: '2019-03-05', sizeMB: 700, docCount: 74 },
  ];
  /* PO pemusnahan (Pengadaan) → perikatan yang dimusnahkan. SSOT PO = BO. */
  const DISPOSAL_PO = { 'ENG-2018-014': 'PO-2026-054' };

  const clientFor = (engId, fallback) => {
    const e = A().engById && A().engById(engId);
    if (e) { const c = A().clientById && A().clientById(e.clientId); if (c) return c.name; }
    return fallback || '—';
  };
  const fyLabel = (engId, fallbackYear) => {
    const e = A().engById && A().engById(engId);
    return e ? e.fy : ('FY' + fallbackYear);
  };

  /* Susun satu kotak arsip dari kumpulan dokumen DMS sebuah perikatan. */
  function boxFromDocs(engId, docs) {
    const cls = classForEngagement(engId);
    const sizeMB = docs.reduce((s, d) => s + (d.sizeMB || 0), 0);
    const allArchived = docs.every(d => d.archivedOn);
    const archivedOn = allArchived ? docs.map(d => d.archivedOn).sort().slice(-1)[0] : null;
    const assembling = docs.some(d => d.assembly === 'in-progress' || d.assembly === 'pending');
    const reportDate = docs.map(d => d.opinionDate).filter(Boolean).sort()[0] || (archivedOn ? archivedOn : null);
    return finalizeBox({
      engId, client: clientFor(engId, docs[0] && docs[0].client), fy: fyLabel(engId, ''),
      classId: cls.id, sizeMB, docCount: docs.length, archivedOn, reportDate, assembling,
      source: 'DMS', docIds: docs.map(d => d.id),
    });
  }
  function boxFromLegacy(b) {
    const cls = classForEngagement(b.engId);
    return finalizeBox({
      engId: b.engId, client: clientFor(b.engId, b.client), fy: b.fy ? ('FY' + b.fy) : fyLabel(b.engId, ''),
      classId: cls.id, sizeMB: b.sizeMB, docCount: b.docCount, archivedOn: b.archivedOn, reportDate: b.reportDate,
      assembling: false, source: 'Legacy', docIds: [],
    });
  }
  /* Hitung status siklus-hidup, masa simpan & jalur disposal sebuah kotak. */
  function finalizeBox(box) {
    const cls = classById(box.classId);
    const hold = holdForEng(box.engId);
    const retentionUntil = box.archivedOn ? addYears(box.archivedOn, cls.years) : null;
    const assembleBy = box.reportDate ? addDays(box.reportDate, 60) : null; // SA 230 ¶A21 — 60 hari
    const yLeft = yearsLeft(retentionUntil);
    let status;
    if (hold) status = 'Legal Hold';
    else if (!box.archivedOn) status = 'Perakitan';
    else if (yLeft != null && yLeft <= 0) status = 'Jatuh Tempo';
    else status = 'Terkunci';
    const id = 'ARK-' + box.engId.replace('ENG-', '');
    return Object.assign({}, box, {
      id, retentionYears: cls.years, retentionUntil, assembleBy, yearsLeft: yLeft,
      hold, status,
      expiringSoon: status === 'Terkunci' && yLeft != null && yLeft < 1,
      disposalPO: DISPOSAL_PO[box.engId] || null,
    });
  }

  /* Daftar kotak arsip terpadu (DMS-derived + legacy), urut terbaru. */
  function archiveBoxes() {
    const docs = (A().DMS_DOCS || []).filter(d => d.eng && d.eng !== '—');
    const byEng = {};
    docs.forEach(d => { (byEng[d.eng] = byEng[d.eng] || []).push(d); });
    const out = Object.keys(byEng).map(engId => boxFromDocs(engId, byEng[engId]));
    LEGACY_BOXES.forEach(b => out.push(boxFromLegacy(b)));
    out.sort((a, b) => String(b.archivedOn || b.assembleBy || '9999').localeCompare(String(a.archivedOn || a.assembleBy || '9999')));
    return out;
  }

  /* Dokumen DMS milik sebuah perikatan (untuk drawer drill-down). */
  const docsForEng = (engId) => (A().DMS_DOCS || []).filter(d => d.eng === engId);

  /* ============================================================
     4 · Siklus hidup, antrean disposal, & metrik
     ============================================================ */
  function lifecycle() {
    const boxes = archiveBoxes();
    const engs = A().ENGAGEMENTS || [];
    const boxEngIds = new Set(boxes.map(b => b.engId));
    const aktif = engs.filter(e => e.status !== 'Completed' && !boxEngIds.has(e.id)).length;
    return [
      { id: 'aktif',     label: 'Perikatan Aktif',        sub: 'berkas dalam pengerjaan', count: aktif, color: '#5b3fa6', icon: 'briefcase' },
      { id: 'perakitan', label: 'Perakitan SA 230',       sub: '≤ 60 hari pasca laporan', count: boxes.filter(b => b.status === 'Perakitan').length, color: '#9a6a00', icon: 'layers' },
      { id: 'terkunci',  label: 'Terarsip & Terkunci',    sub: 'read-only, dalam retensi', count: boxes.filter(b => b.status === 'Terkunci').length, color: '#1f7a4d', icon: 'lock' },
      { id: 'hold',      label: 'Legal Hold',             sub: 'disposal ditangguhkan', count: boxes.filter(b => b.status === 'Legal Hold').length, color: '#b3261e', icon: 'gavel' },
      { id: 'due',       label: 'Jatuh Tempo Retensi',    sub: 'memenuhi syarat musnah', count: boxes.filter(b => b.status === 'Jatuh Tempo').length, color: '#005085', icon: 'trash' },
    ];
  }

  /* Antrean disposal: kotak jatuh tempo + jalur persetujuan & PO pemusnahan. */
  function disposalQueue() {
    return archiveBoxes().filter(b => b.status === 'Jatuh Tempo').map(b => ({
      ...b,
      eligible: !b.hold,
      poId: b.disposalPO,
      stage: b.disposalPO ? 'PO diterbitkan' : 'Menunggu usulan',
    }));
  }
  /* dipakai cockpit/kalender: kotak jatuh tempo (objek kalender) */
  function disposalObligations() {
    return disposalQueue().map(b => ({
      module: 'records', kind: 'Pemusnahan arsip', label: b.client + ' · ' + b.fy,
      ref: b.id, due: b.retentionUntil, amount: 0, owner: 'Kepala Mutu',
    }));
  }

  /* Registri hold yang diperkaya (untuk tab Legal Hold). */
  function holdRegistry() {
    const boxes = archiveBoxes();
    return HOLDS.map(h => {
      const box = boxes.find(b => b.engId === h.engId) || null;
      const dmsHeld = docsForEng(h.engId);
      const disp = h.disputeId ? (BO().DISPUTES || []).find(d => d.id === h.disputeId) : null;
      const claim = h.claimId ? (BO().CLAIMS || []).find(c => c.id === h.claimId) : null;
      return { ...h, box, dmsHeldCount: dmsHeld.length, dmsHeld, dispute: disp, claim };
    });
  }

  function metrics() {
    const boxes = archiveBoxes();
    const sizeMB = boxes.reduce((s, b) => s + (b.sizeMB || 0), 0);
    return {
      total: boxes.length,
      locked: boxes.filter(b => b.status === 'Terkunci').length,
      assembling: boxes.filter(b => b.status === 'Perakitan').length,
      due: boxes.filter(b => b.status === 'Jatuh Tempo').length,
      holds: boxes.filter(b => b.status === 'Legal Hold').length,
      expiringSoon: boxes.filter(b => b.expiringSoon).length,
      sizeGB: sizeMB / 1024,
      docCount: boxes.reduce((s, b) => s + (b.docCount || 0), 0),
      dmsBoxes: boxes.filter(b => b.source === 'DMS').length,
      legacyBoxes: boxes.filter(b => b.source === 'Legacy').length,
    };
  }

  /* ============================================================
     5 · Rekonsiliasi lintas-modul (bukti SSOT)
     ============================================================ */
  function reconciliations() {
    const boxes = archiveBoxes();
    const m = metrics();
    /* R1 — ukuran kotak DMS ↔ Σ ukuran dokumen DMS (harus menutup) */
    const dmsBoxSize = boxes.filter(b => b.source === 'DMS').reduce((s, b) => s + b.sizeMB, 0);
    const dmsDocSize = (A().DMS_DOCS || []).filter(d => d.eng && d.eng !== '—').reduce((s, d) => s + (d.sizeMB || 0), 0);
    /* R2 — legal hold aktif ↔ dokumen DMS ditahan + sengketa litigasi */
    const activeH = activeHolds().length;
    const heldDocCount = heldDocs().length;
    const litLinked = HOLDS.filter(h => h.status === 'Aktif' && h.disputeId).length;
    /* R3 — kotak jatuh tempo ↔ PO pemusnahan (Pengadaan) */
    const dueCount = m.due;
    const poRaised = disposalQueue().filter(b => b.poId).length;
    return [
      { id: 'r1', title: 'Ukuran Kotak Arsip ↔ Dokumen DMS', ok: Math.round(dmsBoxSize) === Math.round(dmsDocSize), to: 'dms',
        a: 'Σ kotak arsip (DMS-tracked)', av: (dmsBoxSize / 1024), b: 'Σ dokumen DMS', bv: (dmsDocSize / 1024), unit: 'GB',
        note: m.dmsBoxes + ' kotak dirakit langsung dari dokumen DMS — ukuran & jumlah berkas = agregat live. Mengubah dokumen di DMS memperbarui kotak ini otomatis.' },
      { id: 'r2', title: 'Legal Hold ↔ Dokumen Ditahan & Sengketa', ok: true, to: 'legal',
        a: 'Hold aktif', av: activeH, b: 'Dok. DMS ditahan', bv: heldDocCount, unit: 'count',
        note: activeH + ' hold aktif menahan ' + heldDocCount + ' dokumen DMS; ' + litLinked + ' tertaut ke sengketa litigasi (LIT-03) di modul Legal. Satu registri hold — DMS & Legal menunjuk ke sini.' },
      { id: 'r3', title: 'Jatuh Tempo Retensi ↔ PO Pemusnahan', ok: true, to: 'procurement',
        a: 'Kotak jatuh tempo', av: dueCount, b: 'PO pemusnahan terbit', bv: poRaised, unit: 'count',
        note: dueCount + ' kotak memenuhi syarat musnah; ' + poRaised + ' sudah diterbitkan PO ke vendor pemusnahan (PO-2026-054, V-037). Sisanya menunggu usulan & berita acara.' },
    ];
  }

  window.RETENTION = {
    today, daysTo, yearsLeft, addYears,
    RETENTION_CLASSES, classById, classForType, classForEngagement, retentionYearsForType,
    HOLDS, activeHolds, holdForEng, heldDocs, holdRegistry,
    archiveBoxes, docsForEng, LEGACY_BOXES, DISPOSAL_PO,
    lifecycle, disposalQueue, disposalObligations, metrics, reconciliations,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const RETENTION = window.RETENTION;
