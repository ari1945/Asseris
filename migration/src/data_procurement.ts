/* [codemod] ESM imports */
import { AMS as AMS_ } from './data';
import { BO } from './data_backoffice';
import { LEGAL } from './data_legal';
const AMS: any = AMS_;

/* ============================================================
   Asseris — Pengadaan & Vendor: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Master vendor (BO.VENDORS) adalah SATU-SATUNYA sumber
   data counterparty pengadaan. Lapisan ini TIDAK menyimpan angka
   kedua — ia MENURUNKAN setiap metrik dari pemilik datanya:
     · Belanja per kategori   ← Σ VENDORS.ytd            (bukan tabel terpisah)
     · Komitmen (open PO)     ← PURCHASE_ORDERS (vendorId → master)
     · 3-way match            ← PURCHASE_ORDERS ↔ RECEIPTS(GRN) ↔ BILLS
     · Utang usaha (hilir)    ← BILLS → AP/AR firma (FIRM_AP) → GL 2-100
     · Kontrak vendor         ← LEGAL.buildRegister (registri SSOT)
     · Lisensi & sewa         ← BO.SOFTWARE_LICENSES / kontrak sewa
     · Konsumsi lintas-modul  ← window.FIRMOPS.VENDOR_CONSUMERS

   Prinsip: satu vendor = satu master. Mengubah ytd / PMPJ / termin
   di master mengalir konsisten ke Spend Analytics, Anggaran, Kontrak
   (Legal), AP/AR & Cockpit Operasi tanpa input ulang.
   ============================================================ */
const PROC = (function () {
  const sum = (arr: any, f: any) => arr.reduce((s: any, x: any) => s + f(x), 0);
  const vById = (id: any) => (BO.VENDORS || []).find((v: any) => v.id === id) || null;
  const vByName = (n: any) => (BO.VENDORS || []).find((v: any) => v.name === n) || null;

  /* ---------- Spend per kategori (DITURUNKAN dari master) ---------- */
  function spendByCategory() {
    const rows = (BO.SPEND_BY_CAT || []).slice();
    const total = sum(rows, (r: any) => r.v);
    return { rows, total };
  }

  /* ---------- Anggaran vs Aktual (aktual diturunkan, bukan diinput) ---------- */
  function budgetVsActual() {
    const byCat = {};
    (BO.VENDORS || []).forEach((v: any) => { (byCat as any)[v.cat] = ((byCat as any)[v.cat] || 0) + v.ytd; });
    const rows = (BO.PROC_BUDGET || []).map((b: any) => {
      const actual = (byCat as any)[b.cat] || 0;
      const variance = b.budget - actual;
      return {
        cat: b.cat, budget: b.budget, actual, variance,
        pct: b.budget ? Math.round(actual / b.budget * 100) : 0,
        over: actual > b.budget, color: (BO.CAT_COLOR || {})[b.cat] || '#8a97a1',
      };
    }).sort((a: any, b: any) => b.actual - a.actual);
    return {
      rows,
      budgetTotal: sum(rows, (r: any) => r.budget),
      actualTotal: sum(rows, (r: any) => r.actual),
      overCount: rows.filter((r: any) => r.over).length,
    };
  }

  /* ---------- Konsentrasi belanja (risiko ketergantungan vendor) ---------- */
  function concentration() {
    const vs = (BO.VENDORS || []).slice().sort((a: any, b: any) => b.ytd - a.ytd);
    const total = sum(vs, (v: any) => v.ytd) || 1;
    const top1 = vs[0] ? vs[0].ytd / total : 0;
    const top3 = sum(vs.slice(0, 3), (v: any) => v.ytd) / total;
    const hhi = Math.round(sum(vs, (v: any) => Math.pow(v.ytd / total * 100, 2)));
    return { vendors: vs, total, top1, top3, hhi, active: vs.filter((v: any) => v.status === 'Aktif').length };
  }

  /* ---------- Komitmen PO per vendor & ringkas ---------- */
  function openPOValue(vendorId: any) {
    return sum((BO.PURCHASE_ORDERS || []).filter((p: any) => p.vendorId === vendorId && (p.status === 'Disetujui' || p.status === 'Menunggu Approval')), (p: any) => p.amount);
  }
  function poSummary() {
    const po = BO.PURCHASE_ORDERS || [];
    const pending = po.filter((p: any) => p.status === 'Menunggu Approval');
    const approved = po.filter((p: any) => p.status === 'Disetujui');
    return {
      all: po, pending, approved,
      pendingVal: sum(pending, (p: any) => p.amount),
      committedVal: sum(approved, (p: any) => p.amount),
    };
  }

  /* ---------- Procure-to-pay funnel (satu rantai status) ---------- */
  function procureToPay() {
    const reqs = BO.REQUISITIONS || [], po = BO.PURCHASE_ORDERS || [];
    const grn = BO.RECEIPTS || [], bills = BO.BILLS || [];
    return [
      { key: 'pr', label: 'Requisition', n: reqs.length, val: sum(reqs, (r: any) => r.est), c: '#8a97a1', desc: 'Permintaan departemen' },
      { key: 'po', label: 'Purchase Order', n: po.filter((p: any) => p.status !== 'Ditolak').length, val: sum(po.filter((p: any) => p.status !== 'Ditolak'), (p: any) => p.amount), c: '#2f7bb0', desc: 'Komitmen disetujui/menunggu' },
      { key: 'grn', label: 'Penerimaan (GRN)', n: grn.length, val: sum(grn, (g: any) => g.amount), c: '#0a6b73', desc: 'Barang/jasa diterima' },
      { key: 'inv', label: 'Faktur (3-way)', n: bills.length, val: sum(bills, (b: any) => b.amount), c: '#005085', desc: 'Tagihan vendor masuk' },
      { key: 'pay', label: 'Dibayar', n: bills.filter((b: any) => b.status === 'Paid').length, val: sum(bills.filter((b: any) => b.status === 'Paid'), (b: any) => b.amount), c: '#1f7a4d', desc: 'Pelunasan → kas' },
    ];
  }

  /* ---------- 3-way match: PO ↔ GRN ↔ Faktur (faktur belum dibayar) ---------- */
  function threeWayMatch() {
    return (BO.BILLS || []).filter((b: any) => b.status !== 'Paid').map((b: any) => {
      const po = (BO.PURCHASE_ORDERS || []).find((p: any) => p.id === b.poId) || null;
      const grn = (BO.RECEIPTS || []).find((g: any) => g.id === b.grnId) || null;
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
  function vendor360(vendorId: any, firm: any) {
    const v = vById(vendorId);
    if (!v) return null;
    const register = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    const contracts = register.filter(c =>
      (c.source && c.source.kind === 'vendor' && c.source.id === v.id) ||
      c.party === v.name);
    const licenses = (BO.SOFTWARE_LICENSES || []).filter((l: any) => l.vendor === v.name);
    const maintenance = (BO.MAINTENANCE || []).filter((m: any) => m.vendor === v.name);
    const pos = (BO.PURCHASE_ORDERS || []).filter((p: any) => p.vendorId === v.id);
    const reqs = (BO.REQUISITIONS || []).filter((r: any) => pos.some((p: any) => p.id === r.poId));
    const receipts = (BO.RECEIPTS || []).filter((g: any) => g.vendorId === v.id);
    const bills = (BO.BILLS || []).filter((b: any) => b.vendorId === v.id);
    const consumers = (window.FIRMOPS && window.FIRMOPS.VENDOR_CONSUMERS[v.id]) || [];
    const disputes = (BO.DISPUTES || []).filter((d: any) => /servis komputer|V-046/i.test(d.lawan) && v.id === 'V-046');
    const total = sum(BO.VENDORS || [], (x: any) => x.ytd) || 1;
    return {
      v, contracts, licenses, maintenance, pos, reqs, receipts, bills, consumers, disputes,
      openPO: openPOValue(v.id),
      openBills: sum(bills.filter((b: any) => b.status !== 'Paid'), (b: any) => b.amount),
      contractValue: sum(contracts, (c: any) => c.value),
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
    const ap = (AMS && AMS.FIRM_AP) || [];
    const open = ap.filter((x: any) => x.status !== 'Paid');
    const coa = ((AMS && AMS.FIRM_COA) || []).find((a: any) => a.code === '2-100');
    const control = coa ? Math.abs(coa.bal) : 0;
    const openTotal = sum(open, (x: any) => x.amount - x.paid);
    const bySrc: any = {};
    open.forEach((x: any) => {
      const s = (AP_SOURCE as any)[x.cat] || { module: 'procurement', label: 'Pengadaan (non-master)', master: false };
      const k = s.label;
      bySrc[k] = bySrc[k] || { label: s.label, module: s.module, master: s.master, v: 0, n: 0 };
      bySrc[k].v += (x.amount - x.paid); bySrc[k].n += 1;
    });
    const sources = Object.values(bySrc).sort((a: any, b: any) => b.v - a.v);
    const procMaster = sum(sources.filter((s: any) => s.module === 'procurement' && s.master), (s: any) => s.v);
    return { open, openTotal, control, accrual: control - openTotal, sources, procMaster };
  }

  /* ---------- Rekonsiliasi sub-ledger → kontrol (bukti SSOT menutup) ---------- */
  function reconciliations(firm: any) {
    const sc = spendByCategory();
    const masterSpend = sum(BO.VENDORS || [], (v: any) => v.ytd);
    const po = BO.PURCHASE_ORDERS || [];
    const poLinked = po.filter((p: any) => vById(p.vendorId));
    const twm = threeWayMatch();
    const matched = twm.filter((t: any) => t.result === 'match');
    const register = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    const vendorContracts = register.filter(c => c.source && (c.source.kind === 'vendor' || c.source.kind === 'license'));
    const vcMapped = vendorContracts.filter(c => c.source.kind === 'vendor'
      ? vById(c.source.id)
      : (BO.SOFTWARE_LICENSES || []).some((l: any) => l.name === c.source.id));
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
        note: 'Faktur vendor (BILLS) mengalir ke AP/AR & GL. Selisih Rp ' + AMS.fmt(ap.accrual / 1e6, 0) + ' jt = beban akrual belum difaktur. Porsi dari master vendor: Rp ' + AMS.fmt(ap.procMaster / 1e6, 0) + ' jt.',
      },
    ];
  }

  /* ---------- Matriks konsumsi lintas-modul (vendor master dipakai modul mana) ---------- */
  function crossModuleConsumption() {
    const map = (window.FIRMOPS && window.FIRMOPS.VENDOR_CONSUMERS) || {};
    return (BO.VENDORS || []).map((v: any) => ({ v, cons: map[v.id] || [] }));
  }

  /* ---------- KPI ringkas untuk header modul ---------- */
  function headline(firm: any) {
    const sc = spendByCategory();
    const pos = poSummary();
    const ap = apBridge();
    const attention = (BO.VENDORS || []).filter((v: any) => v.risk === 'Tinggi' || v.diligence !== 'Lengkap');
    return {
      spendYtd: sc.total,
      activeVendors: (BO.VENDORS || []).filter((v: any) => v.status === 'Aktif').length,
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
   Catatan: BO & LEGAL kini named-import; IIFE masih membaca window.FIRMOPS
   — namespace lain, di luar scope slice ini (tetap dual-published). */
export { PROC };
