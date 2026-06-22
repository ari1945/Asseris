/* [codemod] ESM imports */
import { AMS } from './data';
import { BO } from './data_backoffice';

/* ============================================================
   Asseris — Kontrak & Legal: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Registri kontrak firma TIDAK lagi di-hardcode. Setiap baris
   ditarik dari modul SUMBER KEBENARAN-nya:
     · Surat Perikatan  ← Engagement Mgmt + fee Klien (CRM)   [live, reaktif]
     · Sewa Kantor      ← Pengadaan & Vendor / Fasilitas      (BO)
     · Lisensi Software ← Aset & Fasilitas / Lisensi Software (BO)
     · Polis Asuransi   ← Asuransi (PII) & Risiko             (BO)
     · Layanan/MoU      ← Pengadaan & Vendor                  (BO)

   Prinsip: nilai kontrak = nilai pada modul sumber. Satu perubahan
   fee di CRM / premi di Asuransi / biaya lisensi di Fasilitas
   mengalir konsisten ke modul Kontrak & Legal. Registri lama
   (BO.CONTRACTS) diperlakukan sebagai entri "legacy" dan
   DIREKONSILIASI terhadap SSOT untuk menandai drift & orphan.
   ============================================================ */
const LEGAL = (function () {
  const moneyJt = (v: any) => 'Rp ' + (AMS as any).fmt(v / 1e6, 0) + ' jt';

  /* metadata sumber: kind → modul tujuan navigasi + label + ikon */
  const SOURCE_META = {
    engagement: { module: 'engagement', label: 'Engagement Mgmt', icon: 'briefcase' },
    crm:        { module: 'crm',         label: 'Client CRM',      icon: 'users' },
    vendor:     { module: 'procurement', label: 'Pengadaan & Vendor', icon: 'cart' },
    license:    { module: 'facilities',  label: 'Aset & Fasilitas', icon: 'building' },
    policy:     { module: 'insurance',   label: 'Asuransi (PII) & Risiko', icon: 'umbrella' },
    billing:    { module: 'billing',     label: 'Billing & Invoicing', icon: 'receipt' },
  };

  /* status surat perikatan diturunkan dari fase engagement (konsisten) */
  const ENG_CONTRACT_STATUS = {
    Perencanaan: 'Aktif', Eksekusi: 'Aktif', Finalisasi: 'Aktif', Arsip: 'Selesai',
  };

  /* klausul standar per kategori — checklist kepatuhan kontrak */
  const CLAUSES = {
    Perikatan: [
      { k: 'Ruang lingkup & kerangka pelaporan', ok: true },
      { k: 'Independensi & rotasi (kode etik)', ok: true },
      { k: 'Tanggung jawab manajemen (SA 210)', ok: true },
      { k: 'Fee, termin & eskalasi', ok: true },
      { k: 'Batasan tanggung jawab (liability cap)', ok: true },
      { k: 'Kerahasiaan & perlindungan data (UU PDP)', ok: true },
      { k: 'Akses dokumen & retensi (SA 230 · 7 thn)', ok: true },
    ],
    Sewa: [
      { k: 'Jangka waktu & opsi perpanjangan', ok: true },
      { k: 'Eskalasi tarif tahunan', ok: true },
      { k: 'Service charge & utilitas', ok: true },
      { k: 'Klausul pengakhiran dini (early termination)', ok: false },
      { k: 'Pengakuan PSAK 73 (sewa)', ok: true },
    ],
    Lisensi: [
      { k: 'Jumlah seat & hak penggunaan', ok: true },
      { k: 'Auto-renew & notifikasi pembatalan', ok: true },
      { k: 'SLA & dukungan teknis', ok: true },
      { k: 'Keamanan data & sub-prosesor', ok: true },
      { k: 'Audit penggunaan lisensi', ok: false },
    ],
    Asuransi: [
      { k: 'Limit pertanggungan & deductible', ok: true },
      { k: 'Cakupan run-off / retroaktif', ok: true },
      { k: 'Kewajiban notifikasi klaim', ok: true },
      { k: 'Eksklusi & kondisi', ok: true },
    ],
    Layanan: [
      { k: 'Ruang lingkup layanan & KPI', ok: true },
      { k: 'Harga & mekanisme penagihan', ok: true },
      { k: 'Kerahasiaan', ok: true },
      { k: 'Pengakhiran & wanprestasi', ok: true },
    ],
  };

  /* tautan lintas-modul untuk tiap sengketa (SSOT: klaim, legal hold, risk, HR) */
  const DISPUTE_LINKS = {
    'LIT-03': [
      { module: 'insurance', icon: 'umbrella', label: 'Klaim PII · CLM-02', rel: 'Notifikasi potensi klaim Rp 1,2 M ke penanggung PII' },
      { module: 'records',   icon: 'archive',  label: 'Legal Hold · LH-02', rel: 'Penangguhan disposal arsip ENG-2024-008 (PT Bina Usaha)' },
      { module: 'insurance', icon: 'shield',   label: 'Risk Register · FR-01', rel: 'Risiko kegagalan mutu perikatan (litigasi) — kuadran tinggi' },
      { module: 'eqr',       icon: 'checkCircle', label: 'EQR Workflow', rel: 'Telaah mutu perikatan terkait sebagai mitigasi' },
    ],
    'LIT-02': [
      { module: 'hrcase', icon: 'gavel', label: 'Sanksi & Disiplin (HR)', rel: 'Perselisihan hubungan industrial — kasus SDM' },
      { module: 'payroll', icon: 'coins', label: 'Payroll', rel: 'Komponen pesangon/kompensasi PHK' },
    ],
    'LIT-01': [
      { module: 'procurement', icon: 'cart', label: 'Vendor · PT Servis Komputer', rel: 'Vendor diblokir (V-046) akibat wanprestasi & gagal diligence pajak' },
    ],
  };

  /* ---------- builder registri terpadu (dipanggil dari React dgn firm ctx) ----------
     firm: { engagements, clients, clientById }  — sumber live & reaktif. */
  function buildRegister(firm: any) {
    const out = [];

    /* 1) Surat Perikatan — satu per engagement; nilai = fee Klien (CRM). */
    (firm.engagements || []).forEach((e: any) => {
      const c = firm.clientById ? firm.clientById(e.clientId) : (firm.clients || []).find((x: any) => x.id === e.clientId);
      if (!c) return;
      out.push({
        id: 'EL-' + e.id.slice(-3),
        party: c.name,
        type: 'Surat Perikatan — ' + e.type,
        category: 'Perikatan',
        value: c.fee,                       // ← SSOT: fee tercatat di CRM
        start: e.fy === 'FY2025' ? '2025-10-01' : '2025-01-01',
        end: e.deadline,
        renewal: 'Per perikatan',
        owner: e.partner,
        status: (ENG_CONTRACT_STATUS as any)[e.phase] || 'Aktif',
        source: { kind: 'engagement', id: e.id, feeKind: 'crm', feeId: c.id },
        meta: { standard: e.standard, manager: e.manager, fy: e.fy, progress: e.progress, clientId: c.id, engId: e.id },
      });
    });

    /* 2) Sewa Kantor — dari vendor "Sewa & Fasilitas" (nilai = belanja tahunan). */
    const lease = (BO.VENDORS || []).find((v: any) => v.cat === 'Sewa & Fasilitas');
    if (lease) {
      out.push({
        id: 'OPS-LEASE', party: lease.name, type: 'Sewa Kantor (3 lantai)', category: 'Sewa',
        value: lease.ytd, start: '2024-01-01', end: '2026-12-31', renewal: 'Manual', owner: 'GA & Umum', status: 'Aktif',
        source: { kind: 'vendor', id: lease.id },
        meta: { terms: lease.terms, pic: lease.pic, rating: lease.rating, npwp: lease.npwp },
      });
    }

    /* 3) Lisensi Software — satu kontrak per lisensi (nilai = biaya tahunan). */
    (BO.SOFTWARE_LICENSES || []).forEach((l: any, i: any) => {
      out.push({
        id: 'OPS-LIC-' + String(i + 1).padStart(2, '0'),
        party: l.vendor, type: 'Lisensi — ' + l.name, category: 'Lisensi',
        value: l.cost, start: null, end: l.exp,
        renewal: l.status === 'Perpanjangan' ? 'Manual' : 'Auto-renew',
        owner: 'TI & Operasi', status: l.status === 'Perpanjangan' ? 'Perlu Reviu' : 'Aktif',
        source: { kind: 'license', id: l.name },
        meta: { seats: l.seats, used: l.used, util: Math.round(l.used / l.seats * 100) },
      });
    });

    /* 4) Polis Asuransi — sebagai kontrak (nilai = premi tahunan). */
    (BO.POLICIES || []).forEach((p: any) => {
      out.push({
        id: 'OPS-' + p.id, party: p.insurer, type: 'Polis — ' + p.jenis, category: 'Asuransi',
        value: p.premi, start: p.mulai, end: p.akhir, renewal: 'Manual', owner: 'Risk & Legal',
        status: p.status === 'Jatuh Tempo' ? 'Jatuh Tempo' : 'Aktif',
        source: { kind: 'policy', id: p.id },
        meta: { limit: p.limit, deductible: p.deductible },
      });
    });

    /* 5) MoU / Layanan vendor — perjalanan dinas (nilai 0; payung MoU). */
    const travel = (BO.VENDORS || []).find((v: any) => v.cat === 'Perjalanan Dinas');
    if (travel) {
      out.push({
        id: 'OPS-MOU', party: travel.name, type: 'MoU Layanan Perjalanan', category: 'Layanan',
        value: 0, start: '2025-01-01', end: '2026-12-31', renewal: 'Manual', owner: 'GA & Umum',
        status: travel.diligence === 'Lengkap' ? 'Aktif' : 'Perlu Reviu',
        source: { kind: 'vendor', id: travel.id },
        meta: { terms: travel.terms, pic: travel.pic, diligence: travel.diligence },
      });
    }

    return out;
  }

  /* ---------- rekonsiliasi registri legacy (BO.CONTRACTS) terhadap SSOT ----------
     Mencocokkan tiap entri lama ke sumbernya; menandai:
       ok     → nilai legacy = nilai sumber
       drift  → nilai berbeda (perlu sinkron)
       orphan → tak ada sumber (mis. klien tidak terdaftar) */
  function reconcileLegacy(firm: any) {
    const clients = firm.clients || [];
    const rows = (BO.CONTRACTS || []).map((k: any) => {
      let src = null, srcValue = null;
      if (k.jenis === 'Surat Perikatan Audit') {
        const c = clients.find((x: any) => x.name === k.pihak);
        if (c) { src = { kind: 'crm', id: c.id }; srcValue = c.fee; }
      } else if (k.jenis === 'Sewa Kantor') {
        const v = (BO.VENDORS || []).find((v: any) => v.name === k.pihak);
        if (v) { src = { kind: 'vendor', id: v.id }; srcValue = v.ytd; }
      } else if (k.jenis === 'Lisensi Software') {
        const l = (BO.SOFTWARE_LICENSES || []).find((l: any) => l.vendor === k.pihak);
        if (l) { src = { kind: 'license', id: l.name }; srcValue = l.cost; }
      } else if (k.jenis === 'Polis PII') {
        const p = (BO.POLICIES || []).find((p: any) => p.id === 'POL-PII');
        if (p) { src = { kind: 'policy', id: p.id }; srcValue = p.premi; }
      } else if (k.jenis === 'MoU Layanan') {
        const v = (BO.VENDORS || []).find((v: any) => v.cat === 'Perjalanan Dinas');
        if (v) { src = { kind: 'vendor', id: v.id }; srcValue = 0; }
      }
      let state = 'orphan';
      if (src) state = (srcValue === k.nilai) ? 'ok' : 'drift';
      return { id: k.id, party: k.pihak, type: k.jenis, recorded: k.nilai, srcValue, src, state };
    });
    return rows;
  }

  return {
    moneyJt, SOURCE_META, CLAUSES, DISPUTE_LINKS,
    buildRegister, reconcileLegacy,
    daysTo: (d: any) => BO.daysTo(d),
  };
})();


/* [codemod] ESM export (window.LEGAL dilucuti — konsumen pakai named import) */
export { LEGAL };
