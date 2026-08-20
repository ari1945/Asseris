/* [codemod] ESM imports */
import { AMS } from './data';
import { BO } from './data_backoffice';
import { LEGAL } from './data_legal';
import { assetsAt, activeAssets, danglingDisposals, depreciate as depreciateOne, duplicateCandidates, rollForward as rollForwardAssets, type DisposalRef } from './data_fixedassets';

/* ============================================================
   Asseris — Aset & Fasilitas Kantor: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Register aset fasilitas = sub-ledger PSAK 16/19 TUNGGAL untuk aset kantor
   (`data_fixedassets.ts`). Lapisan ini TIDAK menyimpan angka kedua —
   ia MENURUNKAN tiap nilai dari pemilik datanya dengan SATU mesin:
     · Penyusutan & NBV      ← mesin garis lurus di `data_fixedassets`
                               (PRD firm-erp-deepening PR-1; ref = AMS.TODAY)
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
  /* K-02 — klok SSOT. DULU `new Date('2026-03-01')`: literal beku yang membuat
     lapisan ini menjawab berbeda dari modul mana pun yang memakai AMS.TODAY. */
  const REF = new Date(AMS.TODAY);
  const sum = (a: any, f: any) => a.reduce((s: any, x: any) => s + f(x), 0);
  const R = Math.round;

  /* ---------- mesin penyusutan: DIPINJAM, bukan disalin ----------
     PRD firm-erp-deepening PR-1 — berkas ini dulu membawa SALINAN KETIGA mesin
     garis lurus (setelah `view_firmtreasury` dan perhitungan di `data_firmops`).
     Tiga salinan atas dua register yang berbeda = empat jawaban untuk satu
     pertanyaan. Kini satu mesin, satu register. */
  function depreciate(a: any) { return depreciateOne(a, REF); }
  function depRows(list?: any) { return (list || BO.FIXED_ASSETS || []).map(depreciate); }

  /* ---------- register & total ---------- */
  function register() {
    /* PSAK 16 ¶67 — aset yang pelepasannya SELESAI dihentikan pengakuannya dan
       keluar dari register aktif. Pada seed sekarang tak ada satu pun (pelepasan
       yang selesai menunjuk aset di luar register), jadi ini nol-delta — tetapi
       mekanismenya kini ADA, sehingga roll-forward tak pecah saat pelepasan
       pertama yang sah terjadi. */
    const reg = assetsAt(REF, activeAssets((BO.DISPOSALS || []) as DisposalRef[]));
    const byCat = reg.byClass.map((c) => ({
      cat: c.cat, cost: c.cost, nbv: c.nbv,
      n: reg.rows.filter((r) => r.cat === c.cat).reduce((s, r) => s + (r.qty || 1), 0),
    }));
    return { rows: reg.rows, totCost: reg.totCost, totAcc: reg.totAccDep, totNbv: reg.totNbv, totAnnual: reg.totAnnualDep, byCat };
  }

  /* ---------- roll-forward NBV (12 bln ke ref) ----------
     Mesinnya ada di `data_fixedassets.rollForward` — SATU tempat, dipakai juga
     modul Aset Tetap. Lihat komentar di sana untuk alasan tiap komponen. */
  function rollForward() {
    return rollForwardAssets(REF, (BO.DISPOSALS || []) as DisposalRef[]);
  }

  /* ---------- pemeliharaan & K3 (kalender) ---------- */
  function maintenance() {
    const rows = (BO.MAINTENANCE || []).map((m: any) => ({
      ...m, days: BO.daysTo(m.due), k3: /K3/.test(m.type),
      vendor: m.vendorId ? (BO.VENDORS.find((v: any) => v.id === m.vendorId) || null) : null,
    })).sort((a: any, b: any) => a.days - b.days);
    return {
      rows,
      overdue: rows.filter((m: any) => m.status === 'Terlambat' || m.days < 0).length,
      dueSoon: rows.filter((m: any) => m.days >= 0 && m.days <= 14).length,
      k3: rows.filter((m: any) => m.k3).length,
      cost: sum(rows, (m: any) => m.cost),
      masterLinked: rows.filter((m: any) => m.vendorId).length,
    };
  }

  /* ---------- lisensi & langganan (vendor master + Legal) ---------- */
  function licenses(firm: any) {
    const reg = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    return (BO.SOFTWARE_LICENSES || []).map((l: any) => {
      const vendor = (BO.VENDORS || []).find((v: any) => v.name === l.vendor) || null;
      const contract = reg.find(c => c.source && c.source.kind === 'license' && c.source.id === l.name) || null;
      return {
        ...l, util: R(l.used / l.seats * 100), days: BO.daysTo(l.exp),
        vendor, vendorId: vendor ? vendor.id : null, contract,
        renew: l.status === 'Perpanjangan' || BO.daysTo(l.exp) <= 90,
      };
    }).sort((a: any, b: any) => a.days - b.days);
  }

  /* ---------- ruang & okupansi ---------- */
  function space() {
    const rows = (BO.SPACE || []).map((f: any) => ({ ...f, util: R(f.occ / f.seats * 100) }));
    const seats = sum(rows, (f: any) => f.seats), occ = sum(rows, (f: any) => f.occ), area = sum(rows, (f: any) => f.area);
    return { rows, seats, occ, area, util: seats ? R(occ / seats * 100) : 0 };
  }

  /* ---------- sewa kantor (PSAK 73) — dari V-024 + Legal OPS-LEASE ---------- */
  function lease(firm: any) {
    const v = (BO.VENDORS || []).find((x: any) => x.cat === 'Sewa & Fasilitas') || null;
    const reg = (LEGAL && firm) ? LEGAL.buildRegister(firm) : [];
    const contract = reg.find(c => c.id === 'OPS-LEASE') || null;
    return { vendor: v, contract, value: v ? v.ytd : 0, end: contract ? contract.end : null };
  }

  /* ---------- asuransi aset (Property All-Risk) ---------- */
  function insurance() {
    const pol = (BO.POLICIES || []).find((p: any) => /Property/.test(p.jenis)) || null;
    const r = register();
    const insuredCost = sum(r.rows.filter((a: any) => a.insured), (a: any) => a.cost);
    return {
      policy: pol, limit: pol ? pol.limit : 0, premi: pol ? pol.premi : 0,
      totCost: r.totCost, insuredCost, totNbv: r.totNbv,
      coverRatio: pol && r.totCost ? pol.limit / r.totCost : 0,
      insuredCount: r.rows.filter((a: any) => a.insured).length, total: r.rows.length,
    };
  }

  /* ---------- pipeline kapitalisasi (capex) — dari Pengadaan ---------- */
  function capex() {
    const assetCats = ['Sewa & Fasilitas', 'TI & SaaS'];
    const kw = /kursi|scanner|server|laptop|furnitur|aset|perangkat|proyektor|kendaraan|renovasi/i;
    return (BO.REQUISITIONS || []).filter((r: any) => assetCats.includes(r.budgetCat) && kw.test(r.desc))
      .map((r: any) => ({ ...r, capCat: /kursi|furnitur/i.test(r.desc) ? 'Furnitur' : /scanner|server|laptop|perangkat/i.test(r.desc) ? 'Perangkat TI' : r.budgetCat }));
  }

  /* ---------- register ERP ----------
     PR-1: `AMS.FIXED_ASSETS` dan `BO.FIXED_ASSETS` kini daftar yang SAMA, jadi
     fungsi ini mengembalikan register yang sama pula. Ia dipertahankan karena
     `view_facilities2` memakainya — dan supaya identitas itu TERUJI, bukan
     diasumsikan. */
  function erpRegister() {
    const list = (AMS && (AMS as any).FIXED_ASSETS) || [];
    const rows = list.map(depreciate);
    return { rows, totCost: sum(rows, (r: any) => r.cost), totNbv: sum(rows, (r: any) => r.nbv), n: rows.length };
  }

  /* Akun kontrol aset tetap di buku besar firma. */
  function glControl() {
    const coa = ((AMS as any).FIRM_COA || []) as Array<{ code: string; bal: number }>;
    const a = coa.find((x) => x.code === '1-400');
    return a ? a.bal : 0;
  }

  /* ---------- rekonsiliasi sub-ledger → kontrol + jembatan lintas-modul ---------- */
  function reconciliations(firm: any) {
    const r = register();
    const erp = erpRegister();
    const mt = maintenance();
    const lic = licenses(firm);
    const annualOps = (window.FIRMOPS && window.FIRMOPS.annualDepreciation) ? window.FIRMOPS.annualDepreciation() : r.totAnnual;
    const licMapped = lic.filter((l: any) => l.vendorId).length;
    const glNbv = glControl();
    const dups = duplicateCandidates();
    const dangling = danglingDisposals((BO.DISPOSALS || []) as DisposalRef[]);

    return [
      {
        id: 'internal', title: 'Harga Perolehan − Akumulasi = NBV', ok: (r.totCost - r.totAcc) === r.totNbv, to: 'facilities',
        a: 'Perolehan − akumulasi', av: r.totCost - r.totAcc, b: 'Σ NBV register', bv: r.totNbv,
        note: 'NBV diturunkan satu mesin garis lurus (PSAK 16) — bukan angka yang diketik. Identitas akuntansi menutup per aset.',
      },
      /* DULU baris ini berbunyi `av: r.totNbv, bv: r.totNbv, ok: true` dengan
         catatan "totalnya menjadi rincian saldo akun kontrol" — ia MEMBANDINGKAN
         ANGKA DENGAN DIRINYA SENDIRI dan mustahil merah. Kini sisi kanan adalah
         saldo akun `1-400` yang sesungguhnya. */
      {
        id: 'gl', title: 'Sub-Ledger Aset ↔ Kontrol GL', ok: Math.abs(glNbv - r.totNbv) < 1_000_000, to: 'firmgl',
        a: 'Σ NBV register (sub-ledger)', av: r.totNbv, b: 'Kontrol 1-400 Aset Tetap — neto', bv: glNbv,
        note: Math.abs(glNbv - r.totNbv) < 1_000_000
          ? 'Register adalah buku besar pembantu aset tetap dan totalnya menutup ke saldo akun kontrol.'
          : 'Saldo kontrol 1-400 (Rp ' + AMS.fmt(glNbv / 1e6, 0) + ' jt) TIDAK diturunkan dari register mana pun — ia literal. Selisih Rp '
            + AMS.fmt((glNbv - r.totNbv) / 1e6, 0) + ' jt belum dijelaskan. Pemisahan akun bruto/akumulasi & pembukuan beban penyusutan: PR-2.',
      },
      /* Sesudah PR-1 kedua sisi berasal dari register yang sama, jadi baris ini
         nyaris tautologi — ia dipertahankan sebagai penjaga regresi (kalau ada
         yang menyalin mesinnya lagi, ia memerah). Gerbang yang SESUNGGUHNYA
         berisiko ditambahkan di bawah: beban penyusutan vs laba rugi. */
      {
        id: 'dep', title: 'Penyusutan ↔ Biaya Operasi', ok: r.totAnnual === annualOps, to: 'firmops',
        a: 'Run-rate penyusutan (register)', av: r.totAnnual, b: 'Beban penyusutan (FIRMOPS)', bv: annualOps,
        note: 'Run-rate penyusutan mengisi pos overhead di Komposisi Biaya Operasi (Cockpit) → Laba Rugi KAP & rekonsiliasi fiskal.',
      },
      /* Baris ini dulu berbunyi `ok: false` dengan catatan "Direkomendasikan
         konsolidasi ke satu master aset". PR-1 MELAKUKAN konsolidasi itu; baris
         ini kini menjaga agar ia tak terpecah lagi. */
      {
        id: 'erp', title: 'Register Fasilitas ↔ Register ERP (konsolidasi)', ok: r.rows.length === erp.n && r.totNbv === erp.totNbv, to: 'fixedassets', isCount: true,
        a: 'Register fasilitas (custody)', av: r.rows.length, b: 'Register ERP (akuntansi)', bv: erp.n,
        note: r.rows.length === erp.n && r.totNbv === erp.totNbv
          ? 'Satu master aset — modul Fasilitas & modul Aset Tetap membaca register yang SAMA (NBV Rp ' + AMS.fmt(r.totNbv / 1e6, 0) + ' jt). Dulu dua daftar terpisah tanpa satu pun aset beririsan.'
          : 'Register terpecah lagi: fasilitas ' + r.rows.length + ' aset (Rp ' + AMS.fmt(r.totNbv / 1e6, 0) + ' jt NBV) vs ERP ' + erp.n + ' aset (Rp ' + AMS.fmt(erp.totNbv / 1e6, 0) + ' jt).',
      },
      /* Kandidat pencatatan ganda hasil penggabungan — DITANDAI, bukan dihapus. */
      {
        id: 'dup', title: 'Kandidat Pencatatan Ganda', ok: dups.length === 0, to: 'fixedassets', isCount: true,
        a: 'Pasangan ditandai', av: dups.length, b: 'Total aset', bv: r.rows.length,
        note: dups.length === 0
          ? 'Tak ada pasangan lintas-register yang sekelas dan berdekatan tanggal perolehan.'
          : dups.length + ' pasangan sekelas & diperoleh dalam 90 hari berasal dari dua register asal yang berbeda — mungkin aset fisik yang sama tercatat dua kali (nilai gabungan Rp '
            + AMS.fmt(dups.reduce((s, d) => s + d.combinedCost, 0) / 1e6, 0) + ' jt). Keputusan ada di firma; sistem tidak menghapus diam-diam.',
      },
      /* Pelepasan yang menunjuk aset di luar register — gagal DIAM-DIAM sebelum
         PR ini, persis seperti akun hantu `1-2100`. */
      {
        id: 'disp', title: 'Pelepasan ↔ Register Aset', ok: dangling.length === 0, to: 'facilities', isCount: true,
        a: 'Pelepasan menggantung', av: dangling.length, b: 'Total usulan pelepasan', bv: (BO.DISPOSALS || []).length,
        note: dangling.length === 0
          ? 'Setiap usulan pelepasan menunjuk aset yang ada di register.'
          : dangling.length + ' usulan pelepasan menunjuk aset yang TIDAK ADA di register (' + dangling.map((d) => d.id + '→' + d.assetId).join(', ')
            + '). Selama referensinya menggantung, penghentian pengakuan PSAK 16 ¶67 tak dapat dibukukan dan roll-forward tak dapat memperhitungkannya.',
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
  function headline(firm: any) {
    const r = register(), mt = maintenance(), sp = space(), lic = licenses(firm);
    return {
      totCost: r.totCost, totNbv: r.totNbv, annualDep: r.totAnnual,
      maintOverdue: mt.overdue, licRenew: lic.filter((l: any) => l.renew).length,
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
