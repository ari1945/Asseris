/* ============================================================
   Asseris — Firm Finance: lapisan kanonik (SSOT)
   ------------------------------------------------------------
   Firm Finance TIDAK menyimpan angkanya sendiri. Tiap figur ditarik
   dari pemilik datanya — satu sumber kebenaran, satu lineage:
     · P&L, Neraca, pos kontrol  ← FIRM_COA  (neraca saldo firma = buku besar)
     · Anggaran vs aktual        ← FIRM_BUDGET (tiap baris terikat ke akun FIRM_COA)
     · Piutang & penagihan       ← INVOICES   (modul Billing & Faktur)
     · Utang usaha               ← FIRM_AP     (modul AP/AR)
     · WIP & pendapatan diakui   ← ENGAGEMENTS + CLIENTS (PSAK 72)
     · Portofolio fee partner    ← ENGAGEMENTS + CLIENTS
     · Kas & bank (multi-ccy)    ← BANK_ACCOUNTS + FX_RATES
     · Rincian biaya operasi     ← FIRMOPS.operatingCosts() (sub-ledger backoffice)

   PRINSIP: Buku Besar (FIRM_COA) adalah AKUN KONTROL; tiap sub-buku
   menutup ke sana lewat item rekonsiliasi yang teridentifikasi. Satu
   perubahan di pemilik data otomatis mengalir ke seluruh modul firma.
   ============================================================ */
import { AMS } from './data';
const FIRMFIN = (function () {
  const REFDATE = new Date(AMS.TODAY); /* K-02: klok SSOT */
  const BLENDED_RATE = 875_000;             // tarif blended cost/jam (biaya waktu)
  const STD_RATE = 1_250_000;               // tarif standar charge-out/jam (nilai standar WIP)
  /* matriks penyisihan WIP berbasis umur (pola ECL) — satu kebijakan, dipakai semua modul */
  /* Toleransi pembulatan rekonsiliasi — di bawah ini dianggap menutup. Dipakai bersama
     oleh jembatan AR/AP dan `reconciliations()` supaya satu ambang, satu jawaban. */
  const RECON_TOLERANCE = 1_000_000;
  const WIP_PROV_MATRIX = [
    { key: 'b30',  bucket: '0–30 hari',  lo: -1e9, hi: 30,  rate: 0.02 },
    { key: 'b60',  bucket: '31–60 hari', lo: 30,   hi: 60,  rate: 0.08 },
    { key: 'b90',  bucket: '61–90 hari', lo: 60,   hi: 90,  rate: 0.25 },
    { key: 'b90p', bucket: '> 90 hari',  lo: 90,   hi: 1e9, rate: 0.60 },
  ];

  /* ---------- Ekonomi engagement dari JAM AKTUAL (SSOT bersama Time & Budget) ----------
     Tarif charge-out/cost per-peran + roster jam-pembuka per engagement. `engagementWip`
     menghitung jam aktual (base + timesheet live `timeEntries`) → nilai standar (WIP @
     charge-out) & biaya. INI satu-satunya tempat angka ini hidup: `view_timebudget`
     memakainya untuk modelnya, dan `wip()` meng-overlay baris engagement aktif dengan
     hasilnya (param `liveByEng`) sehingga T&B ↔ WIP Valuation ↔ WIP & Realisasi tak lagi
     menyimpan jam paralel. Hanya engagement dengan roster (demo: ENG-2025-014) yang punya
     timesheet; lainnya → null (pakai seed WIP_ENG). */
  const WIP_BILL = { 'Engagement Partner': 2_500_000, 'Audit Manager': 1_200_000, 'Senior Auditor': 700_000, 'Junior Auditor': 400_000 };
  const WIP_COST = { 'Engagement Partner': 1_100_000, 'Audit Manager': 620_000, 'Senior Auditor': 360_000, 'Junior Auditor': 210_000 };
  const WIP_ROSTER_ENG = {
    'ENG-2025-014': [
      { name: 'Hartono Wijaya, CPA', role: 'Engagement Partner', budget: 120, base: 78 },
      { name: 'Anindya Pramesti',    role: 'Audit Manager',      budget: 360, base: 256.5 },
      { name: 'Dimas Raharjo',       role: 'Senior Auditor',     budget: 420, base: 304 },
      { name: 'Sinta Wulandari',     role: 'Senior Auditor',     budget: 300, base: 150.5 },
      { name: 'Fajar Nugroho',       role: 'Junior Auditor',     budget: 360, base: 189 },
      { name: 'Rina Kusuma',         role: 'Junior Auditor',     budget: 280, base: 120 },
    ],
  };
  function engagementWip(timeEntries: any, engId: any) {
    const roster0 = (WIP_ROSTER_ENG as any)[engId];
    if (!roster0) return null;                       // tak ada roster → engagement ini tak punya timesheet
    const liveByMember: any = {};
    (timeEntries || []).forEach((t: any) => { liveByMember[t.member] = (liveByMember[t.member] || 0) + t.hours; });
    const roster = roster0.map((r: any) => {
      const actual = r.base + (liveByMember[r.name] || 0);
      const bill = (WIP_BILL as any)[r.role], cost = (WIP_COST as any)[r.role];
      return { ...r, actual, bill, cost, billVal: actual * bill, costVal: actual * cost,
               variance: r.budget - actual, util: Math.round(actual / r.budget * 100) };
    });
    const actualHrs = roster.reduce((s: any, r: any) => s + r.actual, 0);
    const budgetHrs = roster.reduce((s: any, r: any) => s + r.budget, 0);
    const stdValue = roster.reduce((s: any, r: any) => s + r.billVal, 0);
    const costValue = roster.reduce((s: any, r: any) => s + r.costVal, 0);
    return { roster, actualHrs, budgetHrs, stdValue, costValue };
  }

  /* ---------- WIP belum ditagih (SUMBER: WIP_ENG × ENGAGEMENTS × CLIENTS) → tutup ke kontrol 1-300 ----------
     Satu engine: valuasi per-perikatan (std ± write-up/down = recoverable), realisasi,
     margin, aging berbasis umur, penyisihan matriks & roll-forward. Dikonsumsi oleh
     modul WIP (route `wip`), Dashboard & cockpit Firm Finance.
     `provFactor` (opsional) menstres tarif matriks untuk uji sensitivitas kebijakan.

     `adjByEng` (opsional) = write-down MANUAL per perikatan (persist `wip.adj`).
     Sebelum 2026-08-15 nilai ini hidup sebagai overlay LOKAL di view WIP & Realisasi
     yang menghitung ulang recoverable/realisasi/margin sendiri — sehingga Dashboard,
     cockpit Beranda, Firm Finance dan ekspor menampilkan angka PRA-write-down, dan di
     dalam view itu sendiri tabel (ber-adj) bertentangan dengan panel aging (tanpa adj).
     Kini ia masuk di HULU: satu penambahan pada `writeDown` sebelum SELURUH turunan
     (recoverable → unbilled → realisasi → margin → aging → penyisihan → roll-forward),
     jadi tak ada lagi konsumen yang melihat angka berbeda. */
  function wip(ctx: any, provFactor?: any, liveByEng?: any, adjByEng?: Record<string, number>) {
    const F = (provFactor == null ? 1 : provFactor);
    const engs = engOf(ctx), clients = cliOf(ctx);
    const SEED = A().WIP_ENG || [];
    const eById = (id: any) => engs.find((e: any) => e.id === id) || {};
    const cById = (id: any) => clients.find((c: any) => c.id === id) || {};
    const bucketOf = (age: any) => WIP_PROV_MATRIX.find(b => age > b.lo && age <= b.hi) || WIP_PROV_MATRIX[WIP_PROV_MATRIX.length - 1];

    const registerAll = SEED.map((w: any) => {
      const e = eById(w.id), c = cById(e.clientId);
      /* OVERLAY jam-aktual: bila view meneruskan ekonomi live (Time & Budget) untuk engagement
         ini, std & cost ditarik dari jam aktual — bukan std seed. Turunan di bawah konsisten;
         selisih ke kontrol GL 1-300 terserap oleh plug `reconciling`. */
      const live = liveByEng && liveByEng[w.id];
      const std = live ? live.std : w.std;
      const cost = live ? live.cost : w.cost;
      const writeUp = w.writeUp || 0;
      /* write-down = seed sub-buku + penyesuaian manual (wip.adj). Manual disimpan
         terpisah pada baris (`manualWriteDown`) supaya UI dapat menampilkan komposisinya
         & menawarkan Reset tanpa menghitung ulang apa pun sendiri. */
      const manualWriteDown = Math.max(0, (adjByEng && adjByEng[w.id]) || 0);
      const seedWriteDown = w.writeDown || 0;
      const writeDown = seedWriteDown + manualWriteDown;
      const recoverable = std + writeUp - writeDown;
      const unbilled = recoverable - w.billed;
      const realization = std ? recoverable / std : 0;
      const margin = recoverable ? (recoverable - cost) / recoverable : 0;
      const age = w.originDays || 0;
      const b = bucketOf(age);
      return {
        id: w.id, client: c.name || w.id, clientShort: (c.name || w.id).replace('PT ', ''),
        tier: c.tier || '—', risk: c.risk || '—', partner: (e.partner || '—').split(',')[0],
        type: e.type || '—', status: e.status || '—', phase: e.phase || '—', progress: e.progress || 0,
        std, seedStd: w.std,
        openingUnbilled: w.openingUnbilled || 0, chargedInPeriod: w.chargedInPeriod || 0,
        writeUp, writeDown, seedWriteDown, manualWriteDown, recoverable, billed: w.billed, unbilled, cost,
        realization, margin, age, bucket: b.bucket, bucketKey: b.key, provRate: b.rate * F,
        overBilled: unbilled < 0, atRisk: age > 90, live: !!live,
        hours: live ? Math.round(live.actualHrs) : (STD_RATE ? Math.round(std / STD_RATE) : 0), wipValue: std, // alias kompat
      };
    }).sort((a: any, z: any) => z.unbilled - a.unbilled);

    const register = registerAll.filter((r: any) => r.unbilled > 0);          // sub-buku aset (kompat)
    const unbilledTotal = sumf(register, (r: any) => r.unbilled);
    const deferredIncome = -sumf(registerAll.filter((r: any) => r.unbilled < 0), (r: any) => r.unbilled);
    const totStd = sumf(registerAll, (r: any) => r.std);
    const totRecoverable = sumf(registerAll, (r: any) => r.recoverable);
    const totBilled = sumf(registerAll, (r: any) => r.billed);
    const totWriteUp = sumf(registerAll, (r: any) => r.writeUp);
    const totWriteDown = sumf(registerAll, (r: any) => r.writeDown);
    const totManualWriteDown = sumf(registerAll, (r: { manualWriteDown: number }) => r.manualWriteDown);
    const totCost = sumf(registerAll, (r: any) => r.cost);
    const avgRealization = totStd ? totRecoverable / totStd : 0;
    const avgMargin = totRecoverable ? (totRecoverable - totCost) / totRecoverable : 0;
    const grossWIP = totRecoverable;

    /* aging + penyisihan — diturunkan dari register (bukan angka lepas) */
    const aging = WIP_PROV_MATRIX.map(b => {
      const rows = register.filter((r: any) => r.bucketKey === b.key);
      const value = sumf(rows, (r: any) => r.unbilled);
      const rate = b.rate * F;
      return { key: b.key, bucket: b.bucket, baseRate: b.rate, rate, value, n: rows.length, provision: Math.round(value * rate) };
    });
    const provisionTotal = sumf(aging, (a: any) => a.provision);
    const netRecoverable = unbilledTotal - provisionTotal;
    const provisionPct = unbilledTotal ? provisionTotal / unbilledTotal : 0;
    const atRiskWIP = sumf(register.filter((r: any) => r.atRisk), (r: any) => r.unbilled);

    /* ---------- roll-forward sub-buku — DAPAT GAGAL ----------
       Saldo awal & penambahan kini FAKTA seed per-perikatan (WIP_ENG), bukan turunan.
       Dulu `additions` literal 10.400 jt dan `opening` adalah plug yang didefinisikan
       agar persamaannya selalu menutup; konsekuensinya mengisi timesheet menggeser
       saldo periode LALU. Kini keduanya independen, jadi `residual` bisa ≠ 0 — dan
       ketika itu terjadi, layar WAJIB mengatakannya (lihat `reconciles`). */
    const opening = sumf(registerAll, (r: { openingUnbilled: number }) => r.openingUnbilled);
    const charged = sumf(registerAll, (r: { chargedInPeriod: number }) => r.chargedInPeriod);

    /* Selisih std seed vs std berbasis jam aktual T&B + write-down manual (`wip.adj`):
       keduanya adalah pergerakan NYATA yang belum menjadi jurnal. Dulu diserap diam-diam
       oleh plug `opening`; kini menjadi baris bernama, dan sekaligus dipakai jembatan GL
       di bawah untuk menjelaskan mengapa sub-buku bergerak sementara kontrol tidak. */
    const liveAdj = sumf(registerAll, (r: { live: boolean; std: number; seedStd: number }) => r.live ? r.std - r.seedStd : 0);

    /* Basis TERPOSTING: sub-buku sebagaimana ia sudah tercermin di GL — yakni memakai
       `std` seed & write-down seed, TANPA revaluasi jam aktual dan TANPA write-down
       manual yang jurnalnya belum dibuat. Dihitung langsung (bukan dialjabarkan dari
       basis kini), karena keduanya berbeda basis: aset menghitung baris positif saja,
       sehingga perikatan yang berpindah tanda saat direvaluasi akan salah bila
       selisihnya sekadar dikurangkan. */
    const postedAsset = sumf(registerAll, (r: { seedStd: number; writeUp: number; seedWriteDown: number; billed: number }) => {
      const unb = r.seedStd + r.writeUp - r.seedWriteDown - r.billed;
      return unb > 0 ? unb : 0;
    });
    const unpostedAdj = postedAsset - unbilledTotal;   // > 0: sub-buku turun tanpa jurnal

    /* Saldo akhir sub-buku NETO (termasuk posisi over-billed yang bernilai negatif);
       reklasifikasinya ke liabilitas ditampilkan sebagai baris tersendiri, bukan
       ikut terserap seperti sebelumnya. */
    const closingNet = sumf(registerAll, (r: { unbilled: number }) => r.unbilled);
    const rollForwardResidual = closingNet
      - (opening + charged + liveAdj + totWriteUp - totWriteDown - totBilled);

    const movement = [
      { k: 'open',  label: 'Saldo awal WIP belum ditagih',                    op: '',  value: opening, strong: true },
      { k: 'add',   label: 'Nilai standar jam ter-charge periode berjalan',   op: '+', value: charged },
      ...(liveAdj !== 0 ? [{ k: 'live', label: 'Penyesuaian nilai standar dari jam aktual (Time & Budget)', op: liveAdj > 0 ? '+' : '−', value: liveAdj, accent: liveAdj > 0 ? 'green' : 'red' }] : []),
      { k: 'wu',    label: 'Write-up — premium realisasi',                    op: '+', value: totWriteUp, accent: 'green' },
      { k: 'wd',    label: 'Write-down — penghapusan tak terpulihkan',        op: '−', value: -totWriteDown, accent: 'red' },
      { k: 'bill',  label: 'Ditransfer ke piutang usaha (difakturkan)',       op: '−', value: -totBilled },
      ...(rollForwardResidual !== 0 ? [{ k: 'resid', label: 'SELISIH BELUM DIJELASKAN — sub-buku tidak menutup', op: '±', value: rollForwardResidual, accent: 'red', strong: true, alarm: true }] : []),
      { k: 'closeNet', label: 'Saldo akhir sub-buku (neto, termasuk over-billed)', op: '=', value: closingNet, strong: true },
      ...(deferredIncome > 0 ? [{ k: 'reclass', label: 'Reklas posisi over-billed → pendapatan diterima di muka', op: '+', value: deferredIncome }] : []),
      { k: 'close', label: 'Saldo akhir WIP belum ditagih (aset)',            op: '=', value: unbilledTotal, strong: true },
    ];

    /* ---------- jembatan ke kontrol GL 1-300 — DAPAT GAGAL ----------
       Komponen jembatan kini REGISTER yang dapat dijumlah (WIP_NONMATERIAL, WIP_ACCRUAL),
       bukan `selisih × 0,82` dan `× 0,18` berlabel spesifik. Pergerakan yang belum
       menjadi jurnal dibalik lebih dulu, karena kontrol GL memang belum memuatnya —
       inilah kontrol yang sesungguhnya: "sub-buku bergerak, jurnalnya belum diposting". */
    const control = acct(coaOf(ctx), '1-300').bal;
    const nonMaterial = A().WIP_NONMATERIAL || [];
    const accruals = A().WIP_ACCRUAL || [];
    const nonMaterialTotal = sumf(nonMaterial, (r: { unbilled: number }) => r.unbilled);
    const accrualTotal = sumf(accruals, (r: { amount: number }) => r.amount);
    const glResidual = control - (postedAsset + nonMaterialTotal + accrualTotal);

    const bridge = [
      { label: 'Sub-buku WIP perikatan material (' + register.length + ' perikatan)', value: unbilledTotal, strong: true },
      ...(unpostedAdj !== 0 ? [{ label: 'Pergerakan yang BELUM diposting ke GL (revaluasi jam aktual & write-down manual)', value: unpostedAdj, accent: 'amber' }] : []),
      { label: 'WIP perikatan non-material (' + nonMaterial.length + ' perikatan, register terpisah)', value: nonMaterialTotal },
      { label: 'Akrual reimbursable & disbursement (' + accruals.length + ' item)', value: accrualTotal },
      ...(glResidual !== 0 ? [{ label: 'SELISIH BELUM DIJELASKAN', value: glResidual, accent: 'red', alarm: true }] : []),
      { label: 'Kontrol GL 1-300 · WIP Belum Ditagih', value: control, strong: true, control: true },
    ];

    /* Satu bendera untuk konsumen: bila salah satu sisi tak menutup, angka ini TIDAK
       boleh keluar sebagai berkas tersegel (keputusan Ari, Q-2 = badge merah + blokir
       ekspor). UI menggunakannya untuk memerahkan panel & mematikan tombol ekspor. */
    const reconciles = rollForwardResidual === 0 && glResidual === 0;

    /* kompat: konsumen lama (`view_firmfinance`) menyebut selisih ke kontrol sbg `reconciling` */
    const reconciling = control - unbilledTotal;

    return {
      register, registerAll, unbilledTotal, deferredIncome, grossWIP,
      rate: BLENDED_RATE, stdRate: STD_RATE, provFactor: F,
      totStd, totRecoverable, totBilled, totWriteUp, totWriteDown, totManualWriteDown, totCost,
      avgRealization, avgMargin, aging, provisionMatrix: WIP_PROV_MATRIX,
      provisionTotal, provisionPct, netRecoverable, atRiskWIP,
      movement, control, reconciling, bridge,
      opening, charged, liveAdj, unpostedAdj, postedAsset, closingNet,
      rollForwardResidual, glResidual, reconciles,
      nonMaterial, accruals, nonMaterialTotal, accrualTotal,
    };
  }

  const A = (): any => AMS || {};
  const coaOf = (ctx: any) => (ctx && ctx.coa) || A().FIRM_COA || [];
  const engOf = (ctx: any) => (ctx && ctx.engagements) || A().ENGAGEMENTS || [];
  const cliOf = (ctx: any) => (ctx && ctx.clients) || A().CLIENTS || [];
  const invOf = (ctx: any) => (ctx && ctx.invoices) || A().INVOICES || [];
  const acct = (coa: any, code: any) => coa.find((a: any) => a.code === code) || { bal: 0, name: code, code };
  const sumType = (coa: any, t: any) => coa.filter((a: any) => a.type === t).reduce((s: any, a: any) => s + a.bal, 0);
  const sumf = (arr: any, f: any) => arr.reduce((s: any, x: any) => s + f(x), 0);

  /* ---------- Laba Rugi firma (sumber: FIRM_COA) ---------- */
  function pl(ctx: any) {
    const coa = coaOf(ctx);
    const revenue = -sumType(coa, 'Pendapatan');          // 4-100
    const bebanAccts = coa.filter((a: any) => a.type === 'Beban');
    const totalExpense = sumf(bebanAccts, (a: any) => a.bal);     // Σ 5-xxx
    const salary = acct(coa, '5-100').bal;                 // beban langsung pengiriman jasa
    const directCost = salary;
    const overheadTotal = totalExpense - directCost;
    const grossProfit = revenue - directCost;
    const opProfit = revenue - totalExpense;
    return {
      revenue, totalExpense, salary, directCost, overheadTotal,
      grossProfit, grossMargin: revenue ? grossProfit / revenue : 0,
      opProfit, margin: revenue ? opProfit / revenue : 0,
      costToIncome: revenue ? totalExpense / revenue : 0,
      accounts: bebanAccts.map((a: any) => ({ code: a.code, name: a.name, bal: a.bal })),
    };
  }

  /* ---------- Neraca firma (sumber: FIRM_COA) ---------- */
  function balanceSheet(ctx: any) {
    const coa = coaOf(ctx);
    const netProfit = pl(ctx).opProfit;
    const totAset = sumType(coa, 'Aset');
    const totLiab = -sumType(coa, 'Liabilitas');
    const totEkuitas = -sumType(coa, 'Ekuitas') + netProfit;
    const ca = cashControl(coa) + acct(coa, '1-200').bal + acct(coa, '1-300').bal;
    const cl = -(acct(coa, '2-100').bal + acct(coa, '2-200').bal + acct(coa, '2-300').bal);
    return {
      assets: coa.filter((a: any) => a.type === 'Aset').map((a: any) => ({ ...a })),
      liabilities: coa.filter((a: any) => a.type === 'Liabilitas').map((a: any) => ({ ...a, bal: -a.bal })),
      equity: coa.filter((a: any) => a.type === 'Ekuitas').map((a: any) => ({ ...a, bal: -a.bal })),
      netProfit, totAset, totLiab, totEkuitas,
      balanced: Math.abs(totAset - (totLiab + totEkuitas)) < 1e6,
      currentAssets: ca, currentLiab: cl, workingCapital: ca - cl,
      currentRatio: cl ? ca / cl : 0,
    };
  }

  /* ---------- Pendapatan per lini jasa (alokasi atas pendapatan GL) ----------
     Total SELALU = pl().revenue; bauran adalah alokasi pengungkapan. */
  const SERVICE_MIX = [
    { line: 'Audit & Asurans', pct: 0.5487, color: '#005085', growth: 12 },
    { line: 'Perpajakan', pct: 0.1593, color: '#0a6b73', growth: 8 },
    { line: 'Advisory', pct: 0.2124, color: '#5b3fa6', growth: 21 },
    { line: 'Reviu & AUP', pct: 0.0796, color: '#9a6a00', growth: -4 },
  ];
  function serviceLines(ctx: any) {
    const revenue = pl(ctx).revenue;
    let acc = 0;
    const rows = SERVICE_MIX.map((m, i) => {
      let rev;
      if (i < SERVICE_MIX.length - 1) { rev = Math.round(revenue * m.pct / 1e6) * 1e6; acc += rev; }
      else { rev = revenue - acc; }
      return { ...m, rev };
    });
    return { rows, total: revenue };
  }

  /* ---------- Kontribusi partner (sumber: ENGAGEMENTS + CLIENTS) ---------- */
  function partners(ctx: any) {
    const engs = engOf(ctx), clients = cliOf(ctx), staff = A().STAFF || [];
    const utilOf = (name: any) => { const s = staff.find((x: any) => x.name === name); return s ? s.util : null; };
    const m = {};
    engs.forEach((e: any) => {
      const partner = (e.partner || '').split(',')[0].trim();
      if (!partner) return;
      const c = clients.find((x: any) => x.id === e.clientId) || {};
      ((m as any)[partner] = (m as any)[partner] || { name: partner, portfolio: 0, clients: 0, hours: 0 });
      (m as any)[partner].portfolio += (c.fee || 0);
      (m as any)[partner].clients += 1;
      (m as any)[partner].hours += (e.actualHrs || 0);
    });
    const rows = Object.values(m).map((p: any) => ({ ...p, util: utilOf(p.name) })).sort((a: any, b: any) => b.portfolio - a.portfolio);
    return { rows, total: sumf(rows, (p: any) => p.portfolio) };
  }

  /* ---------- Aging piutang (sumber: INVOICES) → tutup ke kontrol 1-200 ---------- */
  function arAging(ctx: any) {
    const inv = invOf(ctx).filter((i: any) => i.status !== 'Draft');
    const buckets = [
      { k: 'current', l: 'Belum jatuh tempo', c: '#1f7a4d', lo: -1e9, hi: 0 },
      { k: 'b30', l: '1–30 hari', c: '#5b3fa6', lo: 0, hi: 30 },
      { k: 'b60', l: '31–60 hari', c: '#9a6a00', lo: 30, hi: 60 },
      { k: 'b90', l: '> 60 hari', c: '#b3261e', lo: 60, hi: 1e9 },
    ].map((b: any) => ({ ...b, v: 0, n: 0 }));
    inv.forEach((i: any) => {
      const out = i.amount - i.paid; if (out <= 0) return;
      const d = Math.round((REFDATE.getTime() - new Date(i.due).getTime()) / 864e5);
      const b = buckets.find(x => d > x.lo && d <= x.hi) || buckets[0];
      b.v += out; b.n += 1;
    });
    const open = sumf(buckets, (b: any) => b.v);
    const overdue = sumf(buckets.filter(b => b.k !== 'current'), (b: any) => b.v);
    const control = acct(coaOf(ctx), '1-200').bal;
    buckets.forEach(b => b.pct = open ? b.v / open : 0);
    /* Jembatan ke kontrol 1-200 dari REGISTER (AR_BRIDGE), bukan `control − open`.
       Sisa yang tak tercakup register adalah `residual` — dan bila ≠ 0, ia disebut
       "belum dijelaskan", bukan diberi nama "termin/retensi" seperti dulu. */
    const bridge = A().AR_BRIDGE || [];
    const bridgeTotal = sumf(bridge, (b: { amount: number }) => b.amount);
    const residual = control - (open + bridgeTotal);
    return { buckets, open, overdue, control, bridge, bridgeTotal, residual,
      reconciles: Math.abs(residual) < RECON_TOLERANCE, reconciling: control - open };
  }

  /* ---------- Utang usaha (sumber: FIRM_AP) → tutup ke kontrol 2-100 ---------- */
  function ap(ctx: any) {
    const list = A().FIRM_AP || [];
    const openItems = list.filter((x: any) => x.status !== 'Paid');
    const open = sumf(openItems, (x: any) => x.amount - x.paid);
    const overdue = sumf(list.filter((x: any) => x.status === 'Overdue'), (x: any) => x.amount - x.paid);
    const control = -acct(coaOf(ctx), '2-100').bal;
    const byCat: any = {};
    openItems.forEach((x: any) => { byCat[x.cat] = (byCat[x.cat] || 0) + (x.amount - x.paid); });
    /* Sama seperti AR: jembatan dari register (AP_BRIDGE), bukan plug berlabel "akrual". */
    const bridge = A().AP_BRIDGE || [];
    const bridgeTotal = sumf(bridge, (b: { amount: number }) => b.amount);
    const residual = control - (open + bridgeTotal);
    return { open, overdue, control, bridge, bridgeTotal, residual,
      reconciles: Math.abs(residual) < RECON_TOLERANCE,
      reconciling: control - open, count: openItems.length,
      byCat: Object.entries(byCat).map(([cat, v]) => ({ cat, v })).sort((a: any, b: any) => b.v - a.v) };
  }


  /* ---------- Kas & bank (sumber: BANK_ACCOUNTS + FX_RATES) ---------- */
  /* ---------- Kas & bank: SATU akun buku besar per rekening ----------
     PRD cash-bank-reconciliation-register 2026-08-15.

     DULU `1-100 Kas & Bank` tunggal untuk enam rekening. Sisi BUKU dari rekonsiliasi
     bank karena itu tak dapat diturunkan untuk satu rekening pun; yang ada hanya satu
     literal `BANK_RECON.bookBalance`. Selisih Rp 2.055 jt antara Σ rekening dan kontrol
     tak punya pemilik — 97% tanpa penjelasan — dan ia sendirian mengunci ekspor LK.

     Kini tiap rekening menunjuk akunnya (`BANK_ACCOUNTS[].acct`), jadi:
       · saldo BUKU per rekening = saldo akun (turunan jurnal terposting)
       · saldo BANK per rekening = data eksternal (tetap literal — DUA sumber independen)
       · selisihnya dijelaskan item rekonsiliasi per rekening, atau MEMERAH.

     Valas: buku besar mencatat pada KURS BUKU. Perbandingan bank↔buku karena itu
     dilakukan pada kurs buku; selisih ke kurs pasar adalah REVALUASI, komponen
     tersendiri — bukan item rekonsiliasi. */
  interface BankAccountSeed { id: string; bank: string; name: string; no: string; ccy: string; acct: string; balance: number }
  interface ReconLine { id: string; account?: string; date?: string; desc?: string; amount: number; matched?: boolean; ref?: string }
  interface ReconSeed { account: string; period: string; lines: ReconLine[] }
  type Rates = Record<string, number>;

  const cashAccounts = (): string[] => (A().BANK_ACCOUNTS as BankAccountSeed[]).map((a) => a.acct);
  const cashControl = (coa: CoaLine[]): number => {
    const codes = cashAccounts();
    return coa.filter((a) => codes.includes(a.code)).reduce((s, a) => s + a.bal, 0);
  };

  /* Rekonsiliasi bank per rekening: bank ± item sisi-bank == buku ± item sisi-buku. */
  function bankRecon(ctx: unknown) {
    const coa = coaOf(ctx) as CoaLine[];
    const accts = A().BANK_ACCOUNTS as BankAccountSeed[];
    const regs = (A().BANK_RECONS || []) as ReconSeed[];
    const fx = (A().FX_RATES || { IDR: 1 }) as Rates;
    const fxBook = (A().FX_BOOK || { IDR: 1 }) as Rates;
    /* `ctx.reconLines` = daftar datar hasil `useBankRecon()` (mencakup status `matched`
       yang disunting pengguna). Tanpa penyaluran ini, mencocokkan baris di modul
       Rekonsiliasi Bank tak akan menggeser residual Kas maupun gerbang ekspor. */
    const override = (ctx as { reconLines?: ReconLine[] } | null)?.reconLines;
    const isBankSide = (l: ReconLine) => l.ref === 'outstanding' || l.ref === 'transit';
    const total = (xs: ReconLine[]) => xs.reduce((s, l) => s + l.amount, 0);
    return accts.map((a) => {
      const reg = regs.find((r) => r.account === a.id);
      const lines: ReconLine[] = override
        ? override.filter((l) => l.account === a.id)
        : ((reg && reg.lines) || []);
      const open = lines.filter((l) => !l.matched);
      const bookSide = total(open.filter((l) => !isBankSide(l)));
      const bankSide = total(open.filter(isBankSide));
      /* Dibandingkan pada KURS PENUTUP. Sejak revaluasi PSAK 10 diposting (JV-0319/0320),
         buku besar menyatakan pos valas pada kurs penutup — jadi sisi bank harus pada
         kurs yang sama, kalau tidak keduanya berbicara dalam dasar yang berbeda.
         Konsekuensi yang DIKEHENDAKI: membatalkan posting jurnal revaluasi membuat buku
         kembali ke kurs perolehan dan rekening valas itu TIDAK menutup — memang begitu
         seharusnya, sebab bukunya belum dijabarkan ulang. */
      const bookIDR = acct(coa, a.acct).bal as number;
      const bankIDR = a.balance * (fx[a.ccy] || 1);
      const adjustedBook = bookIDR + bookSide;
      const adjustedBank = bankIDR + bankSide;
      const residual = adjustedBank - adjustedBook;
      return {
        ...a, period: (reg && reg.period) || '—', lines,
        bookIDR, bankIDR, bookSide, bankSide, adjustedBook, adjustedBank, residual,
        reconciled: Math.abs(residual) < RECON_TOLERANCE,
        openCount: open.length,
        idrMarket: a.balance * (fx[a.ccy] || 1),
        reval: a.balance * ((fx[a.ccy] || 1) - (fxBook[a.ccy] || 1)),
      };
    });
  }

  function cash(ctx: unknown) {
    const coa = coaOf(ctx) as CoaLine[];
    const per = bankRecon(ctx);
    const rows = per.map((r) => ({ ...r, idr: r.idrMarket })).sort((a, b) => b.idr - a.idr);
    const sum = (f: (r: typeof per[number]) => number) => per.reduce((s, r) => s + f(r), 0);
    const totalIDR = sum((r) => r.idrMarket);   // Σ saldo bank @ kurs pasar
    const totalBankBook = sum((r) => r.bankIDR); // Σ saldo bank @ kurs buku
    const control = cashControl(coa);
    /* Komponen BERNAMA yang menjelaskan selisih kontrol ↔ Σ rekening: hanya ITEM
       REKONSILIASI, DIJUMLAH DARI BARIS REGISTER — bukan diturunkan dari selisih yang
       hendak dijelaskannya. Itu yang membuat gerbangnya dapat MERAH; bila `bridgeTotal`
       didefinisikan sebagai `−(… + (Σbank − kontrol))`, `residual` nol SECARA ALJABAR
       dan badge hijau selamanya — persis cacat `note` hardcode #240.

       Revaluasi valas TIDAK lagi menjadi komponen jembatan: sejak PSAK 10 diposting
       (JV-0319/0320) ia sudah ADA DI DALAM saldo buku. `reval` tetap dihitung sebagai
       informasi untuk tab Revaluasi Valas — bukan sebagai penjelas selisih. */
    const reval = sum((r) => r.reval);
    const reconItems = sum((r) => r.bookSide - r.bankSide);
    const bridgeTotal = -reconItems;
    const unreconciled = per.filter((r) => !r.reconciled);
    return {
      rows, per, totalIDR, totalBankBook, control,
      reval, reconItems, bridgeTotal,
      residual: (control - totalIDR) - bridgeTotal,
      unreconciled,
      diff: totalIDR - control,
    };
  }

  /* Bentuk data anggaran. `actual` SENGAJA tidak ada di baris seed — ia turunan. */
  interface BudgetSeedLine { line: string; budget: number; type: string; acct: string }
  interface CoaLine { code: string; name: string; type: string; bal: number }
  interface BudgetLine extends BudgetSeedLine { actual: number; mapped: boolean; acctName: string | null }

  /* ---------- Anggaran vs aktual — "AKTUAL" ADALAH BUKU BESAR ----------
     PRD budget-actual-ledger-derived 2026-08-15.

     DULU `FIRM_BUDGET` membawa kolom `actual` literal DI SAMPING `acct` yang menunjuk
     akun GL: dua set angka untuk satu peristiwa, dan harapan bahwa keduanya tak
     menyimpang. Harapan itu tak bertahan — memposting `JV-0307` (Rp 210 jt) membuat
     BI Kinerja, BI Industri & Treasury (yang membaca kolom itu MENTAH, tanpa lewat
     lapisan ini) menyatakan laba 2.800 jt sementara buku besar menyatakan 2.590 jt.

     Kolom itu kini tidak ada. Aktual DITURUNKAN dari saldo akun yang dipetakan —
     secara akuntansi memang begitu: "aktual" dalam laporan anggaran-vs-aktual ADALAH
     buku besar, tidak ada register aktual yang terpisah.

     KONSEKUENSI YANG HARUS DIURUS: gerbang lama ("aktual == saldo GL?") menjadi
     TAUTOLOGI — selalu hijau, tak pernah bisa merah. Membiarkannya = mengulang cacat
     `note` hardcode #240. Ia DIGANTI, bukan dibuang: yang direkonsiliasi sekarang
     adalah CAKUPAN — apakah tiap akun Pendapatan/Beban di buku besar punya tepat satu
     baris anggaran, dan tiap baris anggaran menunjuk akun yang benar-benar ada. Beban
     yang diposting tanpa pernah dianggarkan memerahkan laporan ini. Itu yang benar-benar
     berisiko, dan itu yang sekarang diuji. */
  function budget(ctx: unknown) {
    const B = (A().FIRM_BUDGET || []) as BudgetSeedLine[];
    const coa = coaOf(ctx) as CoaLine[];
    /* Konvensi tanda FIRM_COA: pendapatan bersaldo kredit (negatif) → dibalik agar
       terbaca positif. `mapped: false` bila baris menunjuk akun yang tak ada di COA —
       jangan pakai `acct()` di sini, fallback-nya menyamarkan itu jadi saldo 0. */
    const lines: BudgetLine[] = B.map((b) => {
      const ga = coa.find((a) => a.code === b.acct);
      return {
        ...b,
        actual: ga ? (b.type === 'rev' ? -ga.bal : ga.bal) : 0,
        mapped: !!ga,
        acctName: ga ? ga.name : null,
      };
    });
    const total = (arr: BudgetLine[], k: 'actual' | 'budget') => arr.reduce((s, l) => s + l[k], 0);
    const rev = lines.filter((l) => l.type === 'rev'), cost = lines.filter((l) => l.type === 'cost');
    const actRev = total(rev, 'actual'), actCost = total(cost, 'actual');
    const budRev = total(rev, 'budget'), budCost = total(cost, 'budget');

    /* --- Gerbang CAKUPAN (pengganti tie-out) --- */
    const budgeted = new Set(B.map((b) => b.acct));
    /* Akun P&L di buku besar yang TAK punya baris anggaran → laba anggaran understated. */
    const unbudgeted = coa
      .filter((a) => (a.type === 'Pendapatan' || a.type === 'Beban') && !budgeted.has(a.code))
      .map((a) => ({ code: a.code, name: a.name, type: a.type, actual: a.type === 'Pendapatan' ? -a.bal : a.bal }));
    /* Baris anggaran yang menunjuk akun tak dikenal → aktualnya mustahil diturunkan. */
    const unmapped = lines.filter((l) => !l.mapped);
    /* Σ baris anggaran vs Σ SELURUH akun P&L. Nol hanya bila pemetaan lengkap dua arah. */
    const coverageGap = (pl(ctx).opProfit as number) - (actRev - actCost);
    const covered = unbudgeted.length === 0 && unmapped.length === 0
      && Math.abs(coverageGap) < RECON_TOLERANCE;

    return {
      lines, unbudgeted, unmapped, coverageGap, covered,
      actRev, actCost, actProfit: actRev - actCost,
      budRev, budCost, budProfit: budRev - budCost,
    };
  }

  /* ---------- KPI ringkas (semua diturunkan) ---------- */
  function kpis(ctx: any) {
    const p = pl(ctx), bs = balanceSheet(ctx), arr = arAging(ctx), apr = ap(ctx), w = wip(ctx), c = cash(ctx);
    const F = A().CASH_FORECAST || [];
    const avgOutflow = F.length ? sumf(F, (r: any) => r.outflow) / F.length * 1e6 : p.totalExpense / 12;
    const cashRunwayBase = F.length ? F[0].open * 1e6 : c.control;
    const annualRevenue = p.revenue;
    const annualPurchases = p.totalExpense - p.salary;   // belanja non-staf
    return {
      revenue: p.revenue, opProfit: p.opProfit, margin: p.margin, grossMargin: p.grossMargin,
      costToIncome: p.costToIncome, totalExpense: p.totalExpense,
      cashControl: c.control, cashTotal: c.totalIDR,
      workingCapital: bs.workingCapital, currentRatio: bs.currentRatio,
      arOpen: arr.open, arOverdue: arr.overdue, apOpen: apr.open, wipUnbilled: w.unbilledTotal,
      annualRevenue, annualPurchases,
      dso: annualRevenue ? Math.round(arr.open / annualRevenue * 365) : 0,
      dpo: annualPurchases ? Math.round(apr.open / annualPurchases * 365) : 0,
      runway: avgOutflow ? cashRunwayBase / avgOutflow : 0,
    };
  }

  /* ---------- Peta Sumber Kebenaran (lineage + rekonsiliasi kontrol) ---------- */
  function reconciliations(ctx: any) {
    const c = cash(ctx), arr = arAging(ctx), w = wip(ctx), apr = ap(ctx);

    /* PRD AR/AP 2026-08-15 — status DULU:
         `|recon| < 1e6 ? 'tied' : (note ? 'bridged' : 'open')`
       Keempat baris punya `note` yang di-hardcode, sehingga `'open'` TIDAK PERNAH
       mungkin terjadi: selisih sebesar apa pun selalu mendarat di badge biru
       "Terjembatani". Yang menentukan sebuah akun kontrol dinyatakan terjembatani
       bukan apakah ada yang menjembataninya, melainkan apakah seseorang pernah
       menuliskan sebuah kalimat.

       Kini status diturunkan dari ANGKA:
         tied    — sub-buku sudah sama dengan kontrol (dalam toleransi)
         bridged — komponen jembatan BERNAMA menutup sisanya
         open    — masih ada sisa yang tak dijelaskan siapa pun → merah
       `bridged` hanya sah bila `bridgeTotal` benar-benar ada; bila komponennya nol
       sementara selisihnya tidak, statusnya `open`. */
    const mk = (
      key: any, label: any, glCode: any, owner: any, ownerLabel: any,
      control: any, sub: any, subLabel: any, note: any,
      bridgeTotal: number, residual: number,
    ) => {
      const recon = control - sub;
      const status = Math.abs(recon) < RECON_TOLERANCE ? 'tied'
        : (Math.abs(residual) < RECON_TOLERANCE && bridgeTotal !== 0 ? 'bridged' : 'open');
      return { key, label, glCode, owner, ownerLabel, control, sub, subLabel, recon,
        note, bridgeTotal, residual, status };
    };

    /* Kas: sejak PRD cash-bank-reconciliation-register komponennya DIENUMERASI
       (revaluasi valas + item rekonsiliasi per rekening), jadi barisnya bisa `bridged`.
       Yang tak dicatat siapa pun di register tetap muncul sebagai `residual` → `open`. */
    return [
      mk('cash', 'Kas & Bank', '1-101…1-106', 'cashbank', 'Kas, Bank & Rekonsiliasi',
        c.control, c.totalIDR, 'Σ saldo menurut bank (multi-mata uang, ekuiv. IDR)',
        'Revaluasi valas + item rekonsiliasi per rekening (register BANK_RECONS)',
        c.bridgeTotal, c.residual),
      mk('ar', 'Piutang Usaha', '1-200', 'apar', 'AP / AR Firma',
        arr.control, arr.open, 'Faktur terbuka (modul Billing)',
        'Termin & retensi belum difakturkan (register AR_BRIDGE)',
        arr.bridgeTotal, arr.residual),
      /* Baris WIP memakai jembatan #239 — sebelumnya ia menghitung ulang dengan logika
         lama sehingga tab ini BERTENTANGAN dengan modul WIP untuk akun yang sama. */
      mk('wip', 'WIP Belum Ditagih', '1-300', 'wip', 'WIP · Valuasi & Realisasi',
        w.control, w.unbilledTotal, 'Sub-buku WIP perikatan material',
        'Pergerakan belum diposting + WIP non-material + akrual (register)',
        w.nonMaterialTotal + w.accrualTotal + w.unpostedAdj, w.glResidual),
      mk('ap', 'Utang Usaha', '2-100', 'apar', 'AP / AR Firma',
        apr.control, apr.open, 'Tagihan vendor terbuka (FIRM_AP)',
        'Akrual & faktur vendor dalam proses (register AP_BRIDGE)',
        apr.bridgeTotal, apr.residual),
    ];
  }

  /* ---------- Provenance tiap figur headline (untuk panel lineage) ---------- */
  function provenance(ctx: any) {
    const p = pl(ctx), b = budget(ctx);
    return [
      { label: 'Pendapatan jasa', value: p.revenue, owner: 'firmgl', ownerLabel: 'General Ledger', source: 'FIRM_COA · akun 4-100', tied: true },
      { label: 'Beban langsung staf', value: p.directCost, owner: 'payroll', ownerLabel: 'Payroll & PPh 21', source: 'FIRM_COA · akun 5-100', tied: true },
      { label: 'Beban overhead & umum', value: p.overheadTotal, owner: 'firmops', ownerLabel: 'Operasi Firma', source: 'FIRM_COA · 5-200…5-500 (= sub-ledger)', tied: true },
      { label: 'Laba operasi', value: p.opProfit, owner: 'firmgl', ownerLabel: 'General Ledger', source: 'Pendapatan − Σ beban', tied: true },
      { label: 'Anggaran vs aktual', value: b.actProfit, owner: 'treasury', ownerLabel: 'Anggaran & Arus Kas', source: 'FIRM_COA (aktual = saldo akun) · anggaran FIRM_BUDGET', tied: b.covered },
      { label: 'Portofolio fee partner', value: partners(ctx).total, owner: 'profitability', ownerLabel: 'Profitability', source: 'ENGAGEMENTS × CLIENTS.fee', tied: true },
    ];
  }

  return {
    REFDATE, BLENDED_RATE, STD_RATE, WIP_PROV_MATRIX, SERVICE_MIX,
    WIP_BILL, WIP_COST, WIP_ROSTER_ENG, engagementWip,
    pl, balanceSheet, serviceLines, partners, arAging, ap, wip, cash, bankRecon, budget,
    kpis, reconciliations, provenance,
  };
})();

/* Ambang otorisasi penghapusan WIP (SA/ISQM: keputusan penghapusan aset perlu
   otorisasi berjenjang). SATU konstanta dipakai `data_platform.buildApprovals`
   untuk KEDUA jalur — write-down yang sudah ada di sub-buku seed DAN write-down
   manual (`wip.adj`) yang dilakukan lewat modul WIP. Sebelum 2026-08-15 ambang
   ini hanya literal `1e8` di data_platform dan jalur manual tak pernah lewat
   antrean persetujuan sama sekali. */
const WIP_WRITEOFF_APPROVAL_MIN = 1e8;

/* [codemod] ESM export (window.FIRMFIN dilucuti — konsumen pakai named import) */
export { FIRMFIN, WIP_WRITEOFF_APPROVAL_MIN };
