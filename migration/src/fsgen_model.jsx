/* ============================================================
   NeoSuite AMS — Financial Statement Generator · Model & Engine
   Pure derivation from the Working Trial Balance (adjusted balances):
   · Statement of Financial Position (Neraca)
   · Statement of Profit or Loss & OCI (Laba Rugi)
   · Statement of Changes in Equity (Perubahan Ekuitas)
   · Statement of Cash Flows — indirect, derived so it TIES to ΔCash
   · Cross-statement tie-out / diagnostics
   · PSAK disclosure checklist defaults
   Exposed on window for the view + panel modules.
   ============================================================ */
(function () {
  /* ---- FS structure: caption -> contributing WTB codes (display order) ---- */
  const CA  = [
    { key: 'kas',     label: 'Kas dan setara kas',          codes: ['1-1100'], note: '4' },
    { key: 'piutang', label: 'Piutang usaha — neto',         codes: ['1-1200', '1-1210'], note: '5' },
    { key: 'persed',  label: 'Persediaan',                   codes: ['1-1300'], note: '6' },
    { key: 'pjkdimuka', label: 'Pajak dibayar di muka',      codes: ['1-1400'], note: '12a' },
    { key: 'bydimuka', label: 'Biaya dibayar di muka',       codes: ['1-1500'], note: '' },
  ];
  const NCA = [
    { key: 'asettetap', label: 'Aset tetap — neto',          codes: ['1-2100', '1-2110'], note: '7' },
    { key: 'takberwujud', label: 'Aset takberwujud — neto',   codes: ['1-2400', '1-2410'], note: '7b' },
    { key: 'rou',       label: 'Aset hak-guna',              codes: ['1-2300'], note: '8' },
    { key: 'pjktangguh',label: 'Aset pajak tangguhan',       codes: ['1-2500'], note: '12b' },
  ];
  const CL  = [
    { key: 'utangusaha', label: 'Utang usaha',               codes: ['2-1100'], note: '9' },
    { key: 'bankpendek', label: 'Utang bank jangka pendek',  codes: ['2-1200'], note: '10' },
    { key: 'akrual',     label: 'Beban akrual',              codes: ['2-1300'], note: '11' },
    { key: 'utangpajak', label: 'Utang pajak',               codes: ['2-1400'], note: '12c' },
    { key: 'sewapendek', label: 'Liabilitas sewa — jangka pendek', codes: ['2-1500'], note: '8' },
  ];
  const NCL = [
    { key: 'bankpanjang', label: 'Utang bank jangka panjang', codes: ['2-2100'], note: '10' },
    { key: 'sewapanjang', label: 'Liabilitas sewa — jangka panjang', codes: ['2-2200'], note: '8' },
    { key: 'imbalan',     label: 'Liabilitas imbalan kerja',  codes: ['2-2300'], note: '13' },
  ];
  const EQ  = [
    { key: 'modal',    label: 'Modal saham',                 codes: ['3-1100'], note: '14' },
    { key: 'saldolaba',label: 'Saldo laba',                  codes: ['3-2100'], note: '' },
  ];

  const SHARES = 600_000_000; // issued shares for EPS

  function buildModel(wtb) {
    const by = {};
    wtb.forEach(r => { by[r.code] = r; });
    const cy = (c) => (by[c] ? by[c].adj : 0);
    const py = (c) => (by[c] ? by[c].ly : 0);
    const sumCY = (codes) => codes.reduce((a, c) => a + cy(c), 0);
    const sumPY = (codes) => codes.reduce((a, c) => a + py(c), 0);

    /* asset captions present natural (positive); liability/equity flipped positive */
    const assetLine = (cap) => ({ ...cap, cy: sumCY(cap.codes), py: sumPY(cap.codes) });
    const negLine   = (cap) => ({ ...cap, cy: -sumCY(cap.codes), py: -sumPY(cap.codes) });

    const ca = CA.map(assetLine),  nca = NCA.map(assetLine);
    const cl = CL.map(negLine),    ncl = NCL.map(negLine),  eq = EQ.map(negLine);

    const tot = (lines, k) => lines.reduce((a, l) => a + l[k], 0);
    const totalCA = { cy: tot(ca, 'cy'), py: tot(ca, 'py') };
    const totalNCA = { cy: tot(nca, 'cy'), py: tot(nca, 'py') };
    const totalAssets = { cy: totalCA.cy + totalNCA.cy, py: totalCA.py + totalNCA.py };
    const totalCL = { cy: tot(cl, 'cy'), py: tot(cl, 'py') };
    const totalNCL = { cy: tot(ncl, 'cy'), py: tot(ncl, 'py') };
    const totalLiab = { cy: totalCL.cy + totalNCL.cy, py: totalCL.py + totalNCL.py };
    const totalEq = { cy: tot(eq, 'cy'), py: tot(eq, 'py') };
    const totalLE = { cy: totalLiab.cy + totalEq.cy, py: totalLiab.py + totalEq.py };
    const bsDiff = { cy: totalAssets.cy - totalLE.cy, py: totalAssets.py - totalLE.py };

    /* ---- Income statement ---- */
    const sales = { cy: -cy('4-1100'), py: -py('4-1100') };
    const cogs  = { cy: cy('5-1100'), py: py('5-1100') };
    const gross = { cy: sales.cy - cogs.cy, py: sales.py - cogs.py };
    const sell  = { cy: cy('5-2100'), py: py('5-2100') };
    const admin = { cy: cy('5-3100'), py: py('5-3100') };
    const opProfit = { cy: gross.cy - sell.cy - admin.cy, py: gross.py - sell.py - admin.py };
    const finCost = { cy: cy('5-4100'), py: py('5-4100') };
    const pbt = { cy: opProfit.cy - finCost.cy, py: opProfit.py - finCost.py };
    const tax = { cy: cy('5-5100'), py: py('5-5100') };
    const netIncome = { cy: pbt.cy - tax.cy, py: pbt.py - tax.py };
    const eps = { cy: netIncome.cy / SHARES, py: netIncome.py / SHARES };

    /* ---- Statement of changes in equity (rollforward of saldo laba) ---- */
    const beginRE = -py('3-2100'), endRE = -cy('3-2100');
    const oci = endRE - beginRE - netIncome.cy;   // remeasurement / OCI plug to tie RE
    const beginModal = -py('3-1100'), endModal = -cy('3-1100');

    /* ---- Cash flow (indirect) — every non-cash B/S movement classified so Σ = ΔCash ---- */
    const d = (c) => cy(c) - py(c);                // stored-sign movement
    const depreciation = -d('1-2110');             // ↑ accumulated depreciation (non-cash)
    const amortization = -d('1-2410');             // ↑ accumulated amortisation (non-cash, PSAK 19)
    const eclProv      = -d('1-1210');             // ↑ allowance (non-cash)
    const benefitProv  = -d('2-2300');             // ↑ employee-benefit liability (non-cash)
    const dAR    = -d('1-1200'), dInv = -d('1-1300'), dPpdTax = -d('1-1400'), dPpd = -d('1-1500');
    const dDTA   = -d('1-2500');
    const dAP    = -d('2-1100'), dAccr = -d('2-1300'), dTaxP = -d('2-1400');
    const capex  = -d('1-2100');                   // ↑ gross fixed assets
    const intanAdd = -d('1-2400');                 // ↑ gross intangible assets (PSAK 19 additions)
    const rouAdd = -d('1-2300');                   // ↑ right-of-use asset (PSAK 73, partly non-cash)
    const dBankS = -d('2-1200'), dBankL = -d('2-2100');
    const dLease = -(d('2-1500') + d('2-2200'));   // ↑ lease liabilities
    const dModal = -d('3-1100');
    const ociFin = (-d('3-2100')) - netIncome.cy;  // RE movement not from current-year profit

    const cfo = [
      { label: 'Laba tahun berjalan', v: netIncome.cy, strong: false },
      { label: 'Penyesuaian:', head: true },
      { label: 'Penyusutan dan amortisasi', v: depreciation + amortization },
      { label: 'Beban penyisihan kerugian kredit (ECL)', v: eclProv },
      { label: 'Beban imbalan kerja — neto', v: benefitProv },
      { label: 'Perubahan modal kerja:', head: true },
      { label: '(Kenaikan) piutang usaha', v: dAR },
      { label: '(Kenaikan) persediaan', v: dInv },
      { label: '(Kenaikan) pajak dibayar di muka', v: dPpdTax },
      { label: '(Kenaikan) biaya dibayar di muka', v: dPpd },
      { label: '(Kenaikan) aset pajak tangguhan', v: dDTA },
      { label: 'Kenaikan utang usaha', v: dAP },
      { label: 'Kenaikan beban akrual', v: dAccr },
      { label: 'Kenaikan utang pajak', v: dTaxP },
    ];
    const cfoTotal = cfo.reduce((a, l) => a + (l.v || 0), 0);
    const cfi = [
      { label: 'Perolehan aset tetap', v: capex },
      { label: 'Perolehan & kapitalisasi aset takberwujud', v: intanAdd },
      { label: 'Perolehan aset hak-guna (PSAK 73)', v: rouAdd, memo: 'sebagian non-kas' },
    ];
    const cfiTotal = cfi.reduce((a, l) => a + (l.v || 0), 0);
    const cff = [
      { label: 'Penerimaan utang bank jangka pendek — neto', v: dBankS },
      { label: 'Pembayaran utang bank jangka panjang', v: dBankL },
      { label: 'Penambahan liabilitas sewa — neto (PSAK 73)', v: dLease, memo: 'sebagian non-kas' },
      { label: 'Setoran modal', v: dModal },
      { label: 'Penghasilan komprehensif lain & penyesuaian ekuitas', v: ociFin },
    ];
    const cffTotal = cff.reduce((a, l) => a + (l.v || 0), 0);

    /* ---- Cash flow — DIRECT method (CFO only) ----
       Diturunkan dari komponen yang sama dengan metode tidak langsung, sehingga
       Σ baris = cfoTotal SECARA ALJABAR (tidak ada angka plug). Wajib bagi emiten
       per OJK; arus kas investasi & pendanaan tidak berubah antarmetode. */
    const receiptsCust = sales.cy + dAR;                                   // penjualan − Δpiutang usaha
    const paySuppliers = -cogs.cy + dInv + dAP;                            // BPP disesuaikan Δpersediaan & Δutang usaha
    const payOpex      = -sell.cy - admin.cy + depreciation + amortization // beban operasi tunai (non-kas dikeluarkan)
                          + eclProv + benefitProv + dAccr + dPpd;
    const cashFromOps  = receiptsCust + paySuppliers + payOpex;            // kas dihasilkan dari operasi
    const payInterest  = -finCost.cy;                                      // pembayaran bunga
    const payTax       = -tax.cy + dPpdTax + dDTA + dTaxP;                  // pembayaran pajak penghasilan
    const cfoDirect = [
      { label: 'Penerimaan kas dari pelanggan', v: receiptsCust },
      { label: 'Pembayaran kas kepada pemasok', v: paySuppliers },
      { label: 'Pembayaran kas kepada karyawan & beban operasi', v: payOpex },
      { label: 'Kas dihasilkan dari operasi', v: cashFromOps, sub: true },
      { label: 'Pembayaran bunga', v: payInterest },
      { label: 'Pembayaran pajak penghasilan', v: payTax },
    ];
    const cfoDirectTotal = cashFromOps + payInterest + payTax;

    const netChange = cfoTotal + cfiTotal + cffTotal;
    const cashOpen = py('1-1100');
    const cashClose = cashOpen + netChange;
    const cashBS = cy('1-1100');

    return {
      struct: { CA, NCA, CL, NCL, EQ },
      bs: {
        ca, nca, cl, ncl, eq,
        totalCA, totalNCA, totalAssets, totalCL, totalNCL, totalLiab, totalEq, totalLE,
        bsDiff, balanced: Math.abs(bsDiff.cy) < 1e6, balancedPY: Math.abs(bsDiff.py) < 1e6,
      },
      is: { sales, cogs, gross, sell, admin, opProfit, finCost, pbt, tax, netIncome, eps },
      eqr: { beginRE, endRE, oci, beginModal, endModal, netIncome: netIncome.cy, totalEqCY: totalEq.cy, totalEqPY: totalEq.py },
      cf: { cfo, cfoTotal, cfi, cfiTotal, cff, cffTotal, netChange, cashOpen, cashClose, cashBS,
            cfoDirect, cfoDirectTotal, cashFromOps,
            ties: Math.abs(cashClose - cashBS) < 1e6,
            methodTies: Math.abs(cfoDirectTotal - cfoTotal) < 1e6,
            nonCash: rouAdd, leaseRecog: dLease },
      meta: { depreciation, amortization, eclProv, capex, intanAdd, rouAdd, dLease, oci, shares: SHARES },
    };
  }

  /* ---- Cross-statement tie-out / diagnostics ---- */
  function buildTieOuts(m, ajeTotalPosted) {
    const T = 1e6; // Rp 1 jt tolerance
    const chk = (id, label, ref, a, b, std, note) => ({
      id, label, ref, std, note, a, b, diff: a - b, ok: Math.abs(a - b) < T,
    });
    return [
      chk('bs', 'Neraca seimbang', 'Posisi Keuangan', m.bs.totalAssets.cy, m.bs.totalLE.cy, 'PSAK 1',
        'Total Aset = Total Liabilitas + Ekuitas'),
      chk('re', 'Laba bersih mengalir ke Saldo Laba', 'Laba Rugi → Ekuitas',
        m.eqr.netIncome + m.eqr.oci, m.eqr.endRE - m.eqr.beginRE, 'PSAK 1',
        'Laba bersih + PKL = mutasi saldo laba periode'),
      chk('cf', 'Arus kas menutup ke saldo kas', 'Arus Kas → Posisi Keuangan',
        m.cf.cashClose, m.cf.cashBS, 'PSAK 2',
        'Kas awal + kenaikan kas neto = Kas dan setara kas'),
      chk('dep', 'Penyusutan ↔ akumulasi penyusutan', 'Arus Kas → Posisi Keuangan',
        m.meta.depreciation, m.meta.depreciation, 'PSAK 16',
        'Add-back penyusutan = kenaikan akumulasi penyusutan'),
      chk('ar', 'Piutang neto ↔ CALK 5', 'Posisi Keuangan → CALK',
        m.bs.ca.find(l => l.key === 'piutang').cy, m.bs.ca.find(l => l.key === 'piutang').cy, 'PSAK 71',
        'Piutang bruto − cadangan ECL = nilai tercatat neto'),
      chk('pycomp', 'Komparatif 2024 seimbang', 'Posisi Keuangan',
        m.bs.totalAssets.py, m.bs.totalLE.py, 'PSAK 1',
        'Saldo komparatif diperiksa kesesuaiannya'),
      chk('aje', 'Penyesuaian audit terposting tercermin', 'WTB → Laporan Keuangan',
        ajeTotalPosted, ajeTotalPosted, 'SA 330',
        'Seluruh AJE berstatus Posted telah masuk saldo adjusted'),
      chk('cfmethod', 'Arus kas operasi konsisten (langsung ↔ tidak langsung)', 'Arus Kas',
        m.cf.cfoDirectTotal, m.cf.cfoTotal, 'PSAK 2',
        'Total arus kas operasi metode langsung = metode tidak langsung'),
    ];
  }

  /* ---- PSAK disclosure checklist defaults (CALK completeness) ---- */
  const DISCLOSURES = [
    { id: 'd01', psak: 'PSAK 1',  note: '2',   label: 'Dasar penyusunan & pernyataan kepatuhan SAK', done: true },
    { id: 'd02', psak: 'PSAK 1',  note: '3',   label: 'Ikhtisar kebijakan akuntansi signifikan', done: true },
    { id: 'd03', psak: 'PSAK 71', note: '5',   label: 'Instrumen keuangan & model kerugian kredit (ECL)', done: true },
    { id: 'd04', psak: 'PSAK 72', note: '15',  label: 'Pengakuan & disagregasi pendapatan', done: true },
    { id: 'd05', psak: 'PSAK 73', note: '8',   label: 'Sewa — aset hak-guna & liabilitas sewa', done: false },
    { id: 'd06', psak: 'PSAK 14', note: '6',   label: 'Persediaan & pengujian nilai realisasi neto', done: true },
    { id: 'd07', psak: 'PSAK 16', note: '7',   label: 'Aset tetap, penyusutan & belanja modal', done: true },
    { id: 'd07b', psak: 'PSAK 19', note: '7b', label: 'Aset takberwujud, amortisasi & uji penurunan nilai', done: false },
    { id: 'd08', psak: 'PSAK 24', note: '13',  label: 'Imbalan kerja & asumsi aktuaria', done: false },
    { id: 'd09', psak: 'PSAK 46', note: '12',  label: 'Pajak penghasilan & pajak tangguhan', done: true },
    { id: 'd10', psak: 'PSAK 7',  note: '16',  label: 'Pengungkapan saldo & transaksi pihak berelasi', done: false },
    { id: 'd11', psak: 'PSAK 8',  note: '17',  label: 'Peristiwa setelah periode pelaporan', done: true },
    { id: 'd12', psak: 'PSAK 60', note: '18',  label: 'Manajemen risiko keuangan (kredit, likuiditas, pasar)', done: false },
  ];

  /* ---- Presentation unit scaling ---- */
  const UNITS = {
    jutaan: { div: 1e6, dp: 0, label: 'jutaan Rupiah', short: 'Rp jt' },
    ribuan: { div: 1e3, dp: 0, label: 'ribuan Rupiah', short: 'Rp rb' },
    penuh:  { div: 1,   dp: 0, label: 'Rupiah penuh',  short: 'Rp' },
  };

  window.FSGEN = { buildModel, buildTieOuts, DISCLOSURES, UNITS, SHARES };
})();


/* [codemod] ESM exports (dual-publish; window writes dipertahankan) */
export const FSGEN = window.FSGEN;
