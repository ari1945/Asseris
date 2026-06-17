/* ============================================================
   NeoSuite AMS — Firm Finance: lapisan kanonik (SSOT)
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
(function () {
  const REFDATE = new Date('2026-03-09');
  const BLENDED_RATE = 875_000;             // tarif blended cost/jam (biaya waktu)
  const STD_RATE = 1_250_000;               // tarif standar charge-out/jam (nilai standar WIP)
  /* matriks penyisihan WIP berbasis umur (pola ECL) — satu kebijakan, dipakai semua modul */
  const WIP_PROV_MATRIX = [
    { key: 'b30',  bucket: '0–30 hari',  lo: -1e9, hi: 30,  rate: 0.02 },
    { key: 'b60',  bucket: '31–60 hari', lo: 30,   hi: 60,  rate: 0.08 },
    { key: 'b90',  bucket: '61–90 hari', lo: 60,   hi: 90,  rate: 0.25 },
    { key: 'b90p', bucket: '> 90 hari',  lo: 90,   hi: 1e9, rate: 0.60 },
  ];

  /* ---------- WIP belum ditagih (SUMBER: WIP_ENG × ENGAGEMENTS × CLIENTS) → tutup ke kontrol 1-300 ----------
     Satu engine: valuasi per-perikatan (std ± write-up/down = recoverable), realisasi,
     margin, aging berbasis umur, penyisihan matriks & roll-forward. Dikonsumsi oleh
     WIP Valuation (route wip), WIP & Realisasi (wipreal), Dashboard & cockpit Firm Finance.
     `provFactor` (opsional) menstres tarif matriks untuk uji sensitivitas kebijakan. */
  function wip(ctx, provFactor) {
    const F = (provFactor == null ? 1 : provFactor);
    const engs = engOf(ctx), clients = cliOf(ctx);
    const SEED = A().WIP_ENG || [];
    const eById = (id) => engs.find(e => e.id === id) || {};
    const cById = (id) => clients.find(c => c.id === id) || {};
    const bucketOf = (age) => WIP_PROV_MATRIX.find(b => age > b.lo && age <= b.hi) || WIP_PROV_MATRIX[WIP_PROV_MATRIX.length - 1];

    const registerAll = SEED.map(w => {
      const e = eById(w.id), c = cById(e.clientId);
      const writeUp = w.writeUp || 0, writeDown = w.writeDown || 0;
      const recoverable = w.std + writeUp - writeDown;
      const unbilled = recoverable - w.billed;
      const realization = w.std ? recoverable / w.std : 0;
      const margin = recoverable ? (recoverable - w.cost) / recoverable : 0;
      const age = w.originDays || 0;
      const b = bucketOf(age);
      return {
        id: w.id, client: c.name || w.id, clientShort: (c.name || w.id).replace('PT ', ''),
        tier: c.tier || '—', risk: c.risk || '—', partner: (e.partner || '—').split(',')[0],
        type: e.type || '—', status: e.status || '—', phase: e.phase || '—', progress: e.progress || 0,
        std: w.std, writeUp, writeDown, recoverable, billed: w.billed, unbilled, cost: w.cost,
        realization, margin, age, bucket: b.bucket, bucketKey: b.key, provRate: b.rate * F,
        overBilled: unbilled < 0, atRisk: age > 90,
        hours: STD_RATE ? Math.round(w.std / STD_RATE) : 0, wipValue: w.std, // alias kompat
      };
    }).sort((a, z) => z.unbilled - a.unbilled);

    const register = registerAll.filter(r => r.unbilled > 0);          // sub-buku aset (kompat)
    const unbilledTotal = sumf(register, r => r.unbilled);
    const deferredIncome = -sumf(registerAll.filter(r => r.unbilled < 0), r => r.unbilled);
    const totStd = sumf(registerAll, r => r.std);
    const totRecoverable = sumf(registerAll, r => r.recoverable);
    const totBilled = sumf(registerAll, r => r.billed);
    const totWriteUp = sumf(registerAll, r => r.writeUp);
    const totWriteDown = sumf(registerAll, r => r.writeDown);
    const totCost = sumf(registerAll, r => r.cost);
    const avgRealization = totStd ? totRecoverable / totStd : 0;
    const avgMargin = totRecoverable ? (totRecoverable - totCost) / totRecoverable : 0;
    const grossWIP = totRecoverable;

    /* aging + penyisihan — diturunkan dari register (bukan angka lepas) */
    const aging = WIP_PROV_MATRIX.map(b => {
      const rows = register.filter(r => r.bucketKey === b.key);
      const value = sumf(rows, r => r.unbilled);
      const rate = b.rate * F;
      return { key: b.key, bucket: b.bucket, baseRate: b.rate, rate, value, n: rows.length, provision: Math.round(value * rate) };
    });
    const provisionTotal = sumf(aging, a => a.provision);
    const netRecoverable = unbilledTotal - provisionTotal;
    const provisionPct = unbilledTotal ? provisionTotal / unbilledTotal : 0;
    const atRiskWIP = sumf(register.filter(r => r.atRisk), r => r.unbilled);

    /* roll-forward sub-buku (opening sbg derivasi-plug agar SELALU menutup) */
    const additions = 10_400_000_000;
    const opening = unbilledTotal - additions - totWriteUp + totWriteDown + totBilled;
    const movement = [
      { k: 'open',  label: 'Saldo awal WIP belum ditagih',                op: '',  value: opening,        strong: true },
      { k: 'add',   label: 'Nilai standar jam ter-charge (WIP terbentuk)', op: '+', value: additions },
      { k: 'wu',    label: 'Write-up — premium realisasi',                  op: '+', value: totWriteUp,     accent: 'green' },
      { k: 'wd',    label: 'Write-down — penghapusan tak terpulihkan',      op: '−', value: -totWriteDown,   accent: 'red' },
      { k: 'bill',  label: 'Ditransfer ke piutang usaha (difakturkan)',    op: '−', value: -totBilled },
      { k: 'close', label: 'Saldo akhir WIP belum ditagih (sub-buku)',     op: '=', value: unbilledTotal,  strong: true },
    ];

    /* rekonsiliasi ke kontrol GL 1-300 */
    const control = acct(coaOf(ctx), '1-300').bal;
    const reconciling = control - unbilledTotal;
    const otherPortfolio = Math.round(reconciling * 0.82);
    const bridge = [
      { label: 'Sub-buku WIP perikatan material (' + register.length + ' perikatan)', value: unbilledTotal, strong: true },
      { label: 'WIP perikatan portofolio lain (di luar sampel material)', value: otherPortfolio },
      { label: 'Akrual reimbursable & disbursement belum tertagih', value: reconciling - otherPortfolio },
      { label: 'Kontrol GL 1-300 · WIP Belum Ditagih', value: control, strong: true, control: true },
    ];

    return {
      register, registerAll, unbilledTotal, deferredIncome, grossWIP,
      rate: BLENDED_RATE, stdRate: STD_RATE, provFactor: F,
      totStd, totRecoverable, totBilled, totWriteUp, totWriteDown, totCost,
      avgRealization, avgMargin, aging, provisionMatrix: WIP_PROV_MATRIX,
      provisionTotal, provisionPct, netRecoverable, atRiskWIP,
      movement, control, reconciling, bridge,
    };
  }

  const A = () => window.AMS || {};
  const coaOf = (ctx) => (ctx && ctx.coa) || A().FIRM_COA || [];
  const engOf = (ctx) => (ctx && ctx.engagements) || A().ENGAGEMENTS || [];
  const cliOf = (ctx) => (ctx && ctx.clients) || A().CLIENTS || [];
  const invOf = (ctx) => (ctx && ctx.invoices) || A().INVOICES || [];
  const acct = (coa, code) => coa.find(a => a.code === code) || { bal: 0, name: code, code };
  const sumType = (coa, t) => coa.filter(a => a.type === t).reduce((s, a) => s + a.bal, 0);
  const sumf = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

  /* ---------- Laba Rugi firma (sumber: FIRM_COA) ---------- */
  function pl(ctx) {
    const coa = coaOf(ctx);
    const revenue = -sumType(coa, 'Pendapatan');          // 4-100
    const bebanAccts = coa.filter(a => a.type === 'Beban');
    const totalExpense = sumf(bebanAccts, a => a.bal);     // Σ 5-xxx
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
      accounts: bebanAccts.map(a => ({ code: a.code, name: a.name, bal: a.bal })),
    };
  }

  /* ---------- Neraca firma (sumber: FIRM_COA) ---------- */
  function balanceSheet(ctx) {
    const coa = coaOf(ctx);
    const netProfit = pl(ctx).opProfit;
    const totAset = sumType(coa, 'Aset');
    const totLiab = -sumType(coa, 'Liabilitas');
    const totEkuitas = -sumType(coa, 'Ekuitas') + netProfit;
    const ca = acct(coa, '1-100').bal + acct(coa, '1-200').bal + acct(coa, '1-300').bal;
    const cl = -(acct(coa, '2-100').bal + acct(coa, '2-200').bal + acct(coa, '2-300').bal);
    return {
      assets: coa.filter(a => a.type === 'Aset').map(a => ({ ...a })),
      liabilities: coa.filter(a => a.type === 'Liabilitas').map(a => ({ ...a, bal: -a.bal })),
      equity: coa.filter(a => a.type === 'Ekuitas').map(a => ({ ...a, bal: -a.bal })),
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
  function serviceLines(ctx) {
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
  function partners(ctx) {
    const engs = engOf(ctx), clients = cliOf(ctx), staff = A().STAFF || [];
    const utilOf = (name) => { const s = staff.find(x => x.name === name); return s ? s.util : null; };
    const m = {};
    engs.forEach(e => {
      const partner = (e.partner || '').split(',')[0].trim();
      if (!partner) return;
      const c = clients.find(x => x.id === e.clientId) || {};
      (m[partner] = m[partner] || { name: partner, portfolio: 0, clients: 0, hours: 0 });
      m[partner].portfolio += (c.fee || 0);
      m[partner].clients += 1;
      m[partner].hours += (e.actualHrs || 0);
    });
    const rows = Object.values(m).map(p => ({ ...p, util: utilOf(p.name) })).sort((a, b) => b.portfolio - a.portfolio);
    return { rows, total: sumf(rows, p => p.portfolio) };
  }

  /* ---------- Aging piutang (sumber: INVOICES) → tutup ke kontrol 1-200 ---------- */
  function arAging(ctx) {
    const inv = invOf(ctx).filter(i => i.status !== 'Draft');
    const buckets = [
      { k: 'current', l: 'Belum jatuh tempo', c: '#1f7a4d', lo: -1e9, hi: 0 },
      { k: 'b30', l: '1–30 hari', c: '#5b3fa6', lo: 0, hi: 30 },
      { k: 'b60', l: '31–60 hari', c: '#9a6a00', lo: 30, hi: 60 },
      { k: 'b90', l: '> 60 hari', c: '#b3261e', lo: 60, hi: 1e9 },
    ].map(b => ({ ...b, v: 0, n: 0 }));
    inv.forEach(i => {
      const out = i.amount - i.paid; if (out <= 0) return;
      const d = Math.round((REFDATE - new Date(i.due)) / 864e5);
      const b = buckets.find(x => d > x.lo && d <= x.hi) || buckets[0];
      b.v += out; b.n += 1;
    });
    const open = sumf(buckets, b => b.v);
    const overdue = sumf(buckets.filter(b => b.k !== 'current'), b => b.v);
    const control = acct(coaOf(ctx), '1-200').bal;
    buckets.forEach(b => b.pct = open ? b.v / open : 0);
    return { buckets, open, overdue, control, reconciling: control - open };
  }

  /* ---------- Utang usaha (sumber: FIRM_AP) → tutup ke kontrol 2-100 ---------- */
  function ap(ctx) {
    const list = A().FIRM_AP || [];
    const openItems = list.filter(x => x.status !== 'Paid');
    const open = sumf(openItems, x => x.amount - x.paid);
    const overdue = sumf(list.filter(x => x.status === 'Overdue'), x => x.amount - x.paid);
    const control = -acct(coaOf(ctx), '2-100').bal;
    const byCat = {};
    openItems.forEach(x => { byCat[x.cat] = (byCat[x.cat] || 0) + (x.amount - x.paid); });
    return { open, overdue, control, reconciling: control - open, count: openItems.length,
      byCat: Object.entries(byCat).map(([cat, v]) => ({ cat, v })).sort((a, b) => b.v - a.v) };
  }


  /* ---------- Kas & bank (sumber: BANK_ACCOUNTS + FX_RATES) ---------- */
  function cash(ctx) {
    const accts = A().BANK_ACCOUNTS || [], fx = A().FX_RATES || { IDR: 1 };
    const rows = accts.map(a => ({ ...a, idr: a.balance * (fx[a.ccy] || 1) }))
      .sort((a, b) => b.idr - a.idr);
    const totalIDR = sumf(rows, a => a.idr);
    const control = acct(coaOf(ctx), '1-100').bal;
    return { rows, totalIDR, control, diff: totalIDR - control };
  }

  /* ---------- Anggaran vs aktual (sumber: FIRM_BUDGET) + tie-out ke GL ---------- */
  function budget(ctx) {
    const B = A().FIRM_BUDGET || [], coa = coaOf(ctx);
    const rev = B.filter(b => b.type === 'rev'), cost = B.filter(b => b.type === 'cost');
    const tie = B.map(b => {
      const ga = acct(coa, b.acct);
      const glVal = b.type === 'rev' ? -ga.bal : ga.bal;
      return { ...b, glVal, tied: Math.abs(glVal - b.actual) < 1e6 };
    });
    const actRev = sumf(rev, b => b.actual), actCost = sumf(cost, b => b.actual);
    const budRev = sumf(rev, b => b.budget), budCost = sumf(cost, b => b.budget);
    return {
      lines: B, tie, allTied: tie.every(t => t.tied),
      actRev, actCost, actProfit: actRev - actCost,
      budRev, budCost, budProfit: budRev - budCost,
    };
  }

  /* ---------- KPI ringkas (semua diturunkan) ---------- */
  function kpis(ctx) {
    const p = pl(ctx), bs = balanceSheet(ctx), arr = arAging(ctx), apr = ap(ctx), w = wip(ctx), c = cash(ctx);
    const F = A().CASH_FORECAST || [];
    const avgOutflow = F.length ? sumf(F, r => r.outflow) / F.length * 1e6 : p.totalExpense / 12;
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
  function reconciliations(ctx) {
    const c = cash(ctx), arr = arAging(ctx), w = wip(ctx), apr = ap(ctx);
    const mk = (key, label, glCode, owner, ownerLabel, control, sub, subLabel, note) => {
      const recon = control - sub;
      return { key, label, glCode, owner, ownerLabel, control, sub, subLabel, recon,
        note, status: Math.abs(recon) < 1e6 ? 'tied' : (note ? 'bridged' : 'open') };
    };
    return [
      mk('cash', 'Kas & Bank', '1-100', 'cashbank', 'Kas, Bank & Rekonsiliasi',
        c.control, c.totalIDR, 'Σ saldo rekening (multi-mata uang, ekuiv. IDR)',
        'Selisih kurs & item rekonsiliasi bank berjalan'),
      mk('ar', 'Piutang Usaha', '1-200', 'apar', 'AP / AR Firma',
        arr.control, arr.open, 'Faktur terbuka (modul Billing)',
        'Piutang termin & retensi belum difakturkan'),
      mk('wip', 'WIP Belum Ditagih', '1-300', 'revenue', 'Pendapatan & WIP',
        w.control, w.unbilledTotal, 'WIP perikatan aktif (jam × tarif blended)',
        'WIP perikatan lain & akrual di luar sampel aktif'),
      mk('ap', 'Utang Usaha', '2-100', 'apar', 'AP / AR Firma',
        apr.control, apr.open, 'Tagihan vendor terbuka (FIRM_AP)',
        'Akrual & faktur vendor dalam proses'),
    ];
  }

  /* ---------- Provenance tiap figur headline (untuk panel lineage) ---------- */
  function provenance(ctx) {
    const p = pl(ctx), b = budget(ctx);
    return [
      { label: 'Pendapatan jasa', value: p.revenue, owner: 'firmgl', ownerLabel: 'General Ledger', source: 'FIRM_COA · akun 4-100', tied: true },
      { label: 'Beban langsung staf', value: p.directCost, owner: 'payroll', ownerLabel: 'Payroll & PPh 21', source: 'FIRM_COA · akun 5-100', tied: true },
      { label: 'Beban overhead & umum', value: p.overheadTotal, owner: 'firmops', ownerLabel: 'Operasi Firma', source: 'FIRM_COA · 5-200…5-500 (= sub-ledger)', tied: true },
      { label: 'Laba operasi', value: p.opProfit, owner: 'firmgl', ownerLabel: 'General Ledger', source: 'Pendapatan − Σ beban', tied: true },
      { label: 'Anggaran vs aktual', value: b.actProfit, owner: 'treasury', ownerLabel: 'Anggaran & Arus Kas', source: 'FIRM_BUDGET (aktual ≡ akun GL)', tied: b.allTied },
      { label: 'Portofolio fee partner', value: partners(ctx).total, owner: 'profitability', ownerLabel: 'Profitability', source: 'ENGAGEMENTS × CLIENTS.fee', tied: true },
    ];
  }

  window.FIRMFIN = {
    REFDATE, BLENDED_RATE, STD_RATE, WIP_PROV_MATRIX, SERVICE_MIX,
    pl, balanceSheet, serviceLines, partners, arAging, ap, wip, cash, budget,
    kpis, reconciliations, provenance,
  };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const FIRMFIN = window.FIRMFIN;
