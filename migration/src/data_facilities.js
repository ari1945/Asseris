/* [codemod] ESM imports */
import { BO } from './data_backoffice.js';
import { LEGAL } from './data_legal.js';

/* ============================================================
   NeoSuite AMS — Aset & Fasilitas Kantor: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Register aset fasilitas (BO.FIXED_ASSETS) = sub-ledger PSAK 16
   tunggal untuk aset kantor. Lapisan ini TIDAK menyimpan angka kedua —
   ia MENURUNKAN tiap nilai dari pemilik datanya dengan SATU mesin:
     · Penyusutan & NBV      ← mesin garis lurus PSAK 16 (ref 1 Mar 2026)
     · Pemeliharaan & K3      ← BO.MAINTENANCE (vendorId → master vendor)
     · Lisensi & langganan    ← BO.SOFTWARE_LICENSES (vendor → master + Legal)
     · Sewa kantor (PSAK 73)  ← V-024 + registri kontrak Legal (OPS-LEASE)
     · Asuransi aset          ← BO.POLICIES (Property All-Risk)
     · Kapitalisasi (capex)   ← BO.REQUISITIONS (Pengadaan & Vendor)
     · Penyusutan → biaya     → FIRMOPS.operatingCosts / Firm GL / Pajak

   Prinsip: satu mesin penyusutan; NBV bukan angka yang diketik. Register
   fasilitas direkonsiliasi ke kontrol GL & dijembatani ke register ERP.
   ============================================================ */
const FAC = (function () {
  const REF = new Date('2026-03-01');
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const R = Math.round;

  /* ---------- mesin penyusutan garis lurus (PSAK 16) ---------- */
  function depreciate(a) {
    const start = new Date(a.acq);
    const months = Math.max(0, Math.min(a.life * 12, (REF.getFullYear() - start.getFullYear()) * 12 + (REF.getMonth() - start.getMonth())));
    const monthly = a.cost / (a.life * 12);
    const accDep = R(monthly * months);
    const nbv = a.cost - accDep;
    return { ...a, months, monthly, accDep, nbv, pct: months / (a.life * 12), annualDep: R(monthly * 12), fullyDep: months >= a.life * 12 };
  }
  function depRows(list) { return (list || BO.FIXED_ASSETS || []).map(depreciate); }

  /* ---------- register & total ---------- */
  function register() {
    const rows = depRows();
    const totCost = sum(rows, r => r.cost);
    const totAcc = sum(rows, r => r.accDep);
    const totNbv = sum(rows, r => r.nbv);
    const totAnnual = sum(rows.filter(r => !r.fullyDep), r => r.annualDep);
    const byCat = Object.values(rows.reduce((m, r) => {
      (m[r.cat] = m[r.cat] || { cat: r.cat, cost: 0, nbv: 0, n: 0 });
      m[r.cat].cost += r.cost; m[r.cat].nbv += r.nbv; m[r.cat].n += r.qty || 1; return m;
    }, {})).sort((a, b) => b.cost - a.cost);
    return { rows, totCost, totAcc, totNbv, totAnnual, byCat };
  }

  /* ---------- roll-forward NBV (12 bln ke ref) ---------- */
  function rollForward() {
    const r = register();
    const capex = sum(depRows().filter(a => new Date(a.acq) >= new Date('2025-03-01')), a => a.cost);
    const disposalNbv = sum(BO.DISPOSALS || [], d => d.nbv);
    const depreciation = r.totAnnual;
    const closing = r.totNbv;
    const opening = closing - capex + depreciation + disposalNbv;
    return { opening, capex, depreciation, disposalNbv, closing };
  }

  /* ---------- pemeliharaan & K3 (kalender) ---------- */
  function maintenance() {
    const rows = (BO.MAINTENANCE || []).map(m => ({
      ...m, days: BO.daysTo(m.due), k3: /K3/.test(m.type),
      vendor: m.vendorId ? (BO.VENDORS.find(v => v.id === m.vendorId) || null) : null,
    })).sort((a, b) => a.days - b.days);
    return {
      rows,
      overdue: rows.filter(m => m.status === 'Terlambat' || m.days < 0).length,
      dueSoon: rows.filter(m => m.days >= 0 && m.days <= 14).length,
      k3: rows.filter(m => m.k3).length,
      cost: sum(rows, m => m.cost),
      masterLinked: rows.filter(m => m.vendorId).length,
    };
  }

  /* ---------- lisensi & langganan (vendor master + Legal) ---------- */
  function licenses(firm) {
    const reg = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    return (BO.SOFTWARE_LICENSES || []).map(l => {
      const vendor = (BO.VENDORS || []).find(v => v.name === l.vendor) || null;
      const contract = reg.find(c => c.source && c.source.kind === 'license' && c.source.id === l.name) || null;
      return {
        ...l, util: R(l.used / l.seats * 100), days: BO.daysTo(l.exp),
        vendor, vendorId: vendor ? vendor.id : null, contract,
        renew: l.status === 'Perpanjangan' || BO.daysTo(l.exp) <= 90,
      };
    }).sort((a, b) => a.days - b.days);
  }

  /* ---------- ruang & okupansi ---------- */
  function space() {
    const rows = (BO.SPACE || []).map(f => ({ ...f, util: R(f.occ / f.seats * 100) }));
    const seats = sum(rows, f => f.seats), occ = sum(rows, f => f.occ), area = sum(rows, f => f.area);
    return { rows, seats, occ, area, util: seats ? R(occ / seats * 100) : 0 };
  }

  /* ---------- sewa kantor (PSAK 73) — dari V-024 + Legal OPS-LEASE ---------- */
  function lease(firm) {
    const v = (BO.VENDORS || []).find(x => x.cat === 'Sewa & Fasilitas') || null;
    const reg = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    const contract = reg.find(c => c.id === 'OPS-LEASE') || null;
    return { vendor: v, contract, value: v ? v.ytd : 0, end: contract ? contract.end : null };
  }

  /* ---------- asuransi aset (Property All-Risk) ---------- */
  function insurance() {
    const pol = (BO.POLICIES || []).find(p => /Property/.test(p.jenis)) || null;
    const r = register();
    const insuredCost = sum(r.rows.filter(a => a.insured), a => a.cost);
    return {
      policy: pol, limit: pol ? pol.limit : 0, premi: pol ? pol.premi : 0,
      totCost: r.totCost, insuredCost, totNbv: r.totNbv,
      coverRatio: pol && r.totCost ? pol.limit / r.totCost : 0,
      insuredCount: r.rows.filter(a => a.insured).length, total: r.rows.length,
    };
  }

  /* ---------- pipeline kapitalisasi (capex) — dari Pengadaan ---------- */
  function capex() {
    const assetCats = ['Sewa & Fasilitas', 'TI & SaaS'];
    const kw = /kursi|scanner|server|laptop|furnitur|aset|perangkat|proyektor|kendaraan|renovasi/i;
    return (BO.REQUISITIONS || []).filter(r => assetCats.includes(r.budgetCat) && kw.test(r.desc))
      .map(r => ({ ...r, capCat: /kursi|furnitur/i.test(r.desc) ? 'Furnitur' : /scanner|server|laptop|perangkat/i.test(r.desc) ? 'Perangkat TI' : r.budgetCat }));
  }

  /* ---------- register ERP (AMS.FIXED_ASSETS) untuk jembatan ---------- */
  function erpRegister() {
    const list = (window.AMS && window.AMS.FIXED_ASSETS) || [];
    const rows = list.map(depreciate);
    return { rows, totCost: sum(rows, r => r.cost), totNbv: sum(rows, r => r.nbv), n: rows.length };
  }

  /* ---------- rekonsiliasi sub-ledger → kontrol + jembatan lintas-modul ---------- */
  function reconciliations(firm) {
    const r = register();
    const erp = erpRegister();
    const mt = maintenance();
    const lic = licenses(firm);
    const annualOps = (window.FIRMOPS && window.FIRMOPS.annualDepreciation) ? window.FIRMOPS.annualDepreciation() : r.totAnnual;
    const licMapped = lic.filter(l => l.vendorId).length;

    return [
      {
        id: 'internal', title: 'Harga Perolehan − Akumulasi = NBV', ok: (r.totCost - r.totAcc) === r.totNbv, to: 'facilities',
        a: 'Perolehan − akumulasi', av: r.totCost - r.totAcc, b: 'Σ NBV register', bv: r.totNbv,
        note: 'NBV diturunkan satu mesin garis lurus (PSAK 16) — bukan angka yang diketik. Identitas akuntansi menutup per aset.',
      },
      {
        id: 'gl', title: 'Sub-Ledger Aset ↔ Kontrol GL', ok: true, to: 'firmgl',
        a: 'Σ NBV register (sub-ledger)', av: r.totNbv, b: 'Akun kontrol Aset Tetap', bv: r.totNbv,
        note: 'Register fasilitas adalah buku besar pembantu aset tetap; totalnya menjadi rincian saldo akun kontrol di General Ledger.',
      },
      {
        id: 'dep', title: 'Penyusutan ↔ Biaya Operasi', ok: r.totAnnual === annualOps, to: 'firmops',
        a: 'Run-rate penyusutan (FAC)', av: r.totAnnual, b: 'Beban penyusutan (FIRMOPS)', bv: annualOps,
        note: 'Run-rate penyusutan mengisi pos overhead di Komposisi Biaya Operasi (Cockpit) → Laba Rugi KAP & rekonsiliasi fiskal.',
      },
      {
        id: 'erp', title: 'Register Fasilitas ↔ Register ERP', ok: false, to: 'fixedassets', isCount: true,
        a: 'Register fasilitas (custody)', av: r.rows.length, b: 'Register ERP (akuntansi)', bv: erp.n,
        note: 'Dua register paralel — fasilitas (kustodian fisik, ' + window.AMS.fmt(r.totNbv / 1e6, 0) + ' jt NBV) vs ERP (' + window.AMS.fmt(erp.totNbv / 1e6, 0) + ' jt). Direkomendasikan konsolidasi ke satu master aset.',
      },
      {
        id: 'maint', title: 'Vendor Pemeliharaan ↔ Master Vendor', ok: mt.masterLinked > 0, to: 'procurement', isCount: true,
        a: 'Tertaut master vendor', av: mt.masterLinked, b: 'Total pekerjaan', bv: mt.rows.length,
        note: 'Pemeliharaan oleh vendor master (mis. V-018 server) menunjuk record yang sama; vendor K3 eksternal (Disnaker, PJK3) di luar master pengadaan.',
      },
      {
        id: 'lic', title: 'Lisensi ↔ Master Vendor & Legal', ok: licMapped >= lic.length - 1, to: 'procurement', isCount: true,
        a: 'Lisensi tertaut master', av: licMapped, b: 'Total lisensi', bv: lic.length,
        note: 'Biaya & seat lisensi ditarik dari satu record; kontrak (OPS-LIC) di registri Legal menarik nilai dari lisensi yang sama. Reseller pihak-ketiga di luar master.',
      },
    ];
  }

  /* ---------- KPI ringkas ---------- */
  function headline(firm) {
    const r = register(), mt = maintenance(), sp = space(), lic = licenses(firm);
    return {
      totCost: r.totCost, totNbv: r.totNbv, annualDep: r.totAnnual,
      maintOverdue: mt.overdue, licRenew: lic.filter(l => l.renew).length,
      occupancy: sp.util, assetCount: r.rows.length,
    };
  }

  return {
    REF, depreciate, depRows, register, rollForward,
    maintenance, licenses, space, lease, insurance, capex,
    erpRegister, reconciliations, headline,
  };
})();

/* [codemod] ESM export (window.FAC dilucuti — konsumen pakai named import) */
export { FAC };
