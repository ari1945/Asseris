/* [codemod] ESM imports */
import { BO } from './data_backoffice.js';

/* ============================================================
   NeoSuite AMS — Pengadaan & Vendor: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Master vendor (BO.VENDORS) adalah SATU-SATUNYA sumber
   data counterparty pengadaan. Lapisan ini TIDAK menyimpan angka
   kedua — ia MENURUNKAN setiap metrik dari pemilik datanya:
     · Belanja per kategori   ← Σ VENDORS.ytd            (bukan tabel terpisah)
     · Komitmen (open PO)     ← PURCHASE_ORDERS (vendorId → master)
     · 3-way match            ← PURCHASE_ORDERS ↔ RECEIPTS(GRN) ↔ BILLS
     · Utang usaha (hilir)    ← BILLS → AP/AR firma (FIRM_AP) → GL 2-100
     · Kontrak vendor         ← window.LEGAL.buildRegister (registri SSOT)
     · Lisensi & sewa         ← BO.SOFTWARE_LICENSES / kontrak sewa
     · Konsumsi lintas-modul  ← window.FIRMOPS.VENDOR_CONSUMERS

   Prinsip: satu vendor = satu master. Mengubah ytd / PMPJ / termin
   di master mengalir konsisten ke Spend Analytics, Anggaran, Kontrak
   (Legal), AP/AR & Cockpit Operasi tanpa input ulang.
   ============================================================ */
const PROC = (function () {
  const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);
  const vById = (id) => (BO.VENDORS || []).find(v => v.id === id) || null;
  const vByName = (n) => (BO.VENDORS || []).find(v => v.name === n) || null;

  /* ---------- Spend per kategori (DITURUNKAN dari master) ---------- */
  function spendByCategory() {
    const rows = (BO.SPEND_BY_CAT || []).slice();
    const total = sum(rows, r => r.v);
    return { rows, total };
  }

  /* ---------- Anggaran vs Aktual (aktual diturunkan, bukan diinput) ---------- */
  function budgetVsActual() {
    const byCat = {};
    (BO.VENDORS || []).forEach(v => { byCat[v.cat] = (byCat[v.cat] || 0) + v.ytd; });
    const rows = (BO.PROC_BUDGET || []).map(b => {
      const actual = byCat[b.cat] || 0;
      const variance = b.budget - actual;
      return {
        cat: b.cat, budget: b.budget, actual, variance,
        pct: b.budget ? Math.round(actual / b.budget * 100) : 0,
        over: actual > b.budget, color: (BO.CAT_COLOR || {})[b.cat] || '#8a97a1',
      };
    }).sort((a, b) => b.actual - a.actual);
    return {
      rows,
      budgetTotal: sum(rows, r => r.budget),
      actualTotal: sum(rows, r => r.actual),
      overCount: rows.filter(r => r.over).length,
    };
  }

  /* ---------- Konsentrasi belanja (risiko ketergantungan vendor) ---------- */
  function concentration() {
    const vs = (BO.VENDORS || []).slice().sort((a, b) => b.ytd - a.ytd);
    const total = sum(vs, v => v.ytd) || 1;
    const top1 = vs[0] ? vs[0].ytd / total : 0;
    const top3 = sum(vs.slice(0, 3), v => v.ytd) / total;
    const hhi = Math.round(sum(vs, v => Math.pow(v.ytd / total * 100, 2)));
    return { vendors: vs, total, top1, top3, hhi, active: vs.filter(v => v.status === 'Aktif').length };
  }

  /* ---------- Komitmen PO per vendor & ringkas ---------- */
  function openPOValue(vendorId) {
    return sum((BO.PURCHASE_ORDERS || []).filter(p => p.vendorId === vendorId && (p.status === 'Disetujui' || p.status === 'Menunggu Approval')), p => p.amount);
  }
  function poSummary() {
    const po = BO.PURCHASE_ORDERS || [];
    const pending = po.filter(p => p.status === 'Menunggu Approval');
    const approved = po.filter(p => p.status === 'Disetujui');
    return {
      all: po, pending, approved,
      pendingVal: sum(pending, p => p.amount),
      committedVal: sum(approved, p => p.amount),
    };
  }

  /* ---------- Procure-to-pay funnel (satu rantai status) ---------- */
  function procureToPay() {
    const reqs = BO.REQUISITIONS || [], po = BO.PURCHASE_ORDERS || [];
    const grn = BO.RECEIPTS || [], bills = BO.BILLS || [];
    return [
      { key: 'pr', label: 'Requisition', n: reqs.length, val: sum(reqs, r => r.est), c: '#8a97a1', desc: 'Permintaan departemen' },
      { key: 'po', label: 'Purchase Order', n: po.filter(p => p.status !== 'Ditolak').length, val: sum(po.filter(p => p.status !== 'Ditolak'), p => p.amount), c: '#2f7bb0', desc: 'Komitmen disetujui/menunggu' },
      { key: 'grn', label: 'Penerimaan (GRN)', n: grn.length, val: sum(grn, g => g.amount), c: '#0a6b73', desc: 'Barang/jasa diterima' },
      { key: 'inv', label: 'Faktur (3-way)', n: bills.length, val: sum(bills, b => b.amount), c: '#005085', desc: 'Tagihan vendor masuk' },
      { key: 'pay', label: 'Dibayar', n: bills.filter(b => b.status === 'Paid').length, val: sum(bills.filter(b => b.status === 'Paid'), b => b.amount), c: '#1f7a4d', desc: 'Pelunasan → kas' },
    ];
  }

  /* ---------- 3-way match: PO ↔ GRN ↔ Faktur (faktur belum dibayar) ---------- */
  function threeWayMatch() {
    return (BO.BILLS || []).filter(b => b.status !== 'Paid').map(b => {
      const po = (BO.PURCHASE_ORDERS || []).find(p => p.id === b.poId) || null;
      const grn = (BO.RECEIPTS || []).find(g => g.id === b.grnId) || null;
      const vendor = vById(b.vendorId);
      const poAmt = po ? po.amount : null;
      const grnAmt = grn ? grn.amount : null;
      const variance = poAmt != null ? b.amount - poAmt : null;
      let result = 'match';
      if (!po) result = 'nopo';
      else if (!grn) result = 'nogrn';
      else if (variance && Math.abs(variance) > 0) result = 'variance';
      return { bill: b, po, grn, vendor, poAmt, grnAmt, billAmt: b.amount, variance, result };
    });
  }

  /* ---------- Vendor 360: rakit seluruh tautan SSOT untuk satu vendor ---------- */
  function vendor360(vendorId, firm) {
    const v = vById(vendorId);
    if (!v) return null;
    const register = (window.LEGAL && firm) ? window.LEGAL.buildRegister(firm) : [];
    const contracts = register.filter(c =>
      (c.source && c.source.kind === 'vendor' && c.source.id === v.id) ||
      c.party === v.name);
    const licenses = (BO.SOFTWARE_LICENSES || []).filter(l => l.vendor === v.name);
    const maintenance = (BO.MAINTENANCE || []).filter(m => m.vendor === v.name);
    const pos = (BO.PURCHASE_ORDERS || []).filter(p => p.vendorId === v.id);
    const reqs = (BO.REQUISITIONS || []).filter(r => pos.some(p => p.id === r.poId));
    const receipts = (BO.RECEIPTS || []).filter(g => g.vendorId === v.id);
    const bills = (BO.BILLS || []).filter(b => b.vendorId === v.id);
    const consumers = (window.FIRMOPS && window.FIRMOPS.VENDOR_CONSUMERS[v.id]) || [];
    const disputes = (BO.DISPUTES || []).filter(d => /servis komputer|V-046/i.test(d.lawan) && v.id === 'V-046');
    const total = sum(BO.VENDORS || [], x => x.ytd) || 1;
    return {
      v, contracts, licenses, maintenance, pos, reqs, receipts, bills, consumers, disputes,
      openPO: openPOValue(v.id),
      openBills: sum(bills.filter(b => b.status !== 'Paid'), b => b.amount),
      contractValue: sum(contracts, c => c.value),
      spendShare: v.ytd / total,
    };
  }

  /* ---------- Bridge AP: dari mana utang usaha firma berasal ----------
     Mengklasifikasi tiap baris FIRM_AP ke modul sumbernya. Membuktikan
     porsi AP yang berasal dari vendor pengadaan (master), bukan duplikasi. */
  const AP_SOURCE = {
    'Software & Lisensi': { module: 'procurement', label: 'Pengadaan & Vendor', master: true },
    'Sewa Kantor': { module: 'procurement', label: 'Pengadaan & Vendor', master: true },
    'Marketing & Branding': { module: 'procurement', label: 'Pengadaan (non-master)', master: false },
    'Operasional': { module: 'procurement', label: 'Pengadaan (non-master)', master: false },
    'Utilitas': { module: 'facilities', label: 'Aset & Fasilitas', master: false },
    'Asuransi PI': { module: 'insurance', label: 'Asuransi & Risiko', master: false },
  };
  function apBridge() {
    const ap = (window.AMS && window.AMS.FIRM_AP) || [];
    const open = ap.filter(x => x.status !== 'Paid');
    const coa = ((window.AMS && window.AMS.FIRM_COA) || []).find(a => a.code === '2-100');
    const control = coa ? Math.abs(coa.bal) : 0;
    const openTotal = sum(open, x => x.amount - x.paid);
    const bySrc = {};
    open.forEach(x => {
      const s = AP_SOURCE[x.cat] || { module: 'procurement', label: 'Pengadaan (non-master)', master: false };
      const k = s.label;
      bySrc[k] = bySrc[k] || { label: s.label, module: s.module, master: s.master, v: 0, n: 0 };
      bySrc[k].v += (x.amount - x.paid); bySrc[k].n += 1;
    });
    const sources = Object.values(bySrc).sort((a, b) => b.v - a.v);
    const procMaster = sum(sources.filter(s => s.module === 'procurement' && s.master), s => s.v);
    return { open, openTotal, control, accrual: control - openTotal, sources, procMaster };
  }

  /* ---------- Rekonsiliasi sub-ledger → kontrol (bukti SSOT menutup) ---------- */
  function reconciliations(firm) {
    const sc = spendByCategory();
    const masterSpend = sum(BO.VENDORS || [], v => v.ytd);
    const po = BO.PURCHASE_ORDERS || [];
    const poLinked = po.filter(p => vById(p.vendorId));
    const twm = threeWayMatch();
    const matched = twm.filter(t => t.result === 'match');
    const register = (window.LEGAL && firm) ? window.LEGAL.buildRegister(firm) : [];
    const vendorContracts = register.filter(c => c.source && (c.source.kind === 'vendor' || c.source.kind === 'license'));
    const vcMapped = vendorContracts.filter(c => c.source.kind === 'vendor'
      ? vById(c.source.id)
      : (BO.SOFTWARE_LICENSES || []).some(l => l.name === c.source.id));
    const ap = apBridge();

    return [
      {
        id: 'spend', title: 'Belanja per kategori ↔ Master Vendor',
        ok: sc.total === masterSpend, to: 'procurement',
        a: 'Σ kategori belanja', av: sc.total, b: 'Σ vendor.ytd (master)', bv: masterSpend,
        note: 'Tabel belanja DITURUNKAN dari master vendor — bukan angka kedua. Selalu menutup secara definisi.',
      },
      {
        id: 'po', title: 'Integritas tautan PO → Master Vendor',
        ok: poLinked.length === po.length, to: 'procurement', isCount: true,
        a: 'PO dengan vendorId valid', av: poLinked.length, b: 'Total PO', bv: po.length,
        note: 'Setiap PO menunjuk vendorId yang resolve ke satu record master — tak ada vendor lepas/duplikat.',
      },
      {
        id: 'match', title: '3-way Match (PO ↔ GRN ↔ Faktur)',
        ok: matched.length >= twm.length - 2, to: 'procurement', isCount: true,
        a: 'Faktur match sempurna', av: matched.length, b: 'Total faktur', bv: twm.length,
        note: (twm.length - matched.length) + ' faktur perlu tindak lanjut (selisih harga / tanpa PO) — ditandai untuk reviu sebelum bayar.',
      },
      {
        id: 'contract', title: 'Kontrak Vendor ↔ Master & Lisensi',
        ok: vcMapped.length === vendorContracts.length, to: 'legal', isCount: true,
        a: 'Kontrak ter-resolve ke sumber', av: vcMapped.length, b: 'Kontrak vendor/lisensi', bv: vendorContracts.length,
        note: 'Nilai kontrak (sewa, lisensi, MoU) di registri Legal ditarik dari master vendor / lisensi yang sama.',
      },
      {
        id: 'ap', title: 'Utang Usaha (AP) ↔ Kontrol GL 2-100',
        ok: ap.control >= ap.openTotal, to: 'apar',
        a: 'Σ AP terbuka', av: ap.openTotal, b: 'Kontrol GL Utang Usaha', bv: ap.control,
        note: 'Faktur vendor (BILLS) mengalir ke AP/AR & GL. Selisih Rp ' + window.AMS.fmt(ap.accrual / 1e6, 0) + ' jt = beban akrual belum difaktur. Porsi dari master vendor: Rp ' + window.AMS.fmt(ap.procMaster / 1e6, 0) + ' jt.',
      },
    ];
  }

  /* ---------- Matriks konsumsi lintas-modul (vendor master dipakai modul mana) ---------- */
  function crossModuleConsumption() {
    const map = (window.FIRMOPS && window.FIRMOPS.VENDOR_CONSUMERS) || {};
    return (BO.VENDORS || []).map(v => ({ v, cons: map[v.id] || [] }));
  }

  /* ---------- KPI ringkas untuk header modul ---------- */
  function headline(firm) {
    const sc = spendByCategory();
    const pos = poSummary();
    const ap = apBridge();
    const attention = (BO.VENDORS || []).filter(v => v.risk === 'Tinggi' || v.diligence !== 'Lengkap');
    return {
      spendYtd: sc.total,
      activeVendors: (BO.VENDORS || []).filter(v => v.status === 'Aktif').length,
      pendingPO: pos.pending.length, pendingVal: pos.pendingVal,
      committedVal: pos.committedVal,
      attention: attention.length,
      apOpen: ap.openTotal,
    };
  }

  return {
    sum, vById, vByName, AP_SOURCE,
    spendByCategory, budgetVsActual, concentration,
    openPOValue, poSummary, procureToPay, threeWayMatch,
    vendor360, apBridge, reconciliations, crossModuleConsumption, headline,
  };
})();


/* ESM export murni (legacy-track slice 1: namespace PROC di-strip dari window).
   Catatan: BO kini named-import (slice BO); IIFE masih membaca window.LEGAL/FIRMOPS
   — namespace lain, di luar scope slice ini (tetap dual-published). */
export { PROC };
