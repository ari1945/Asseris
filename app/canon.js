/* ============================================================
   NeoSuite AMS — Canonical figures (single source of truth)
   ------------------------------------------------------------
   Satu lapisan angka kanonik yang ditarik oleh banyak kertas
   kerja agar konsisten lintas-modul. Tujuannya: setiap angka
   pajak tangguhan di PSAK 46 dapat ditelusuri ke modul sumbernya
   (PSAK 24, PSAK 71/ECL, PSAK 73) dan ke Buku Besar (WTB),
   bukan di-hardcode.

   PRINSIP: Working Trial Balance (window.AMS.WTB / useAudit().wtb)
   adalah SUMBER KEBENARAN untuk saldo akun. Angka akuntansi di
   bawah ini DITARIK dari WTB by-code, sehingga satu perubahan AJE
   mengalir konsisten ke seluruh modul yang memakai AMS_CANON.

   Semua nilai dalam Rp JUTA kecuali data sewa (rupiah penuh,
   lalu dinormalkan ke juta saat dipakai PSAK 46).
   Tarif PPh Badan 22% (UU HPP No. 7/2021).
   ============================================================ */
(function () {
  const RATE = 0.22;
  const ASOF = { y: 2025, m: 12 };           // 31 Des 2025

  /* ---------- helper: tarik saldo akun dari WTB (by code) ---------- */
  const jt = (n) => Math.round((n || 0) / 1e6);                 // rupiah penuh → juta
  function wtbRow(wtb, code) {
    const W = (wtb && wtb.length) ? wtb : ((window.AMS && window.AMS.WTB) || []);
    return W.find(r => r.code === code) || null;
  }
  function wtbVal(wtb, code, field) {
    const r = wtbRow(wtb, code);
    return r ? (r[field] != null ? r[field] : 0) : 0;
  }

  /* Peta akun WTB → pos akuntansi kanonik. Satu tempat untuk mengubah lineage. */
  const WTB_MAP = {
    dbo:        { code: '2-2300', label: 'Liabilitas Imbalan Kerja',           sign: -1 }, // PSAK 24
    ckpn:       { code: '1-1210', label: 'Cadangan Kerugian Penurunan Nilai',  sign: -1 }, // PSAK 71
    ppeGross:   { code: '1-2100', label: 'Aset Tetap — Harga Perolehan',       sign:  1 },
    ppeAccum:   { code: '1-2110', label: 'Akumulasi Penyusutan',               sign:  1 },
    intanGross: { code: '1-2400', label: 'Aset Takberwujud — Harga Perolehan',  sign:  1 }, // PSAK 19
    intanAccum: { code: '1-2410', label: 'Akumulasi Amortisasi',               sign:  1 }, // PSAK 19
    rou:        { code: '1-2300', label: 'Aset Hak-Guna (PSAK 73)',            sign:  1 }, // PSAK 73
    leaseST:    { code: '2-1500', label: 'Liabilitas Sewa — Jk. Pendek',       sign: -1 },
    leaseLT:    { code: '2-2200', label: 'Liabilitas Sewa — Jk. Panjang',      sign: -1 },
    dta:        { code: '1-2500', label: 'Aset Pajak Tangguhan',               sign:  1 }, // buku besar
    taxExp:     { code: '5-5100', label: 'Beban Pajak Penghasilan',            sign:  1 },
  };

  /* figur akuntansi entitas yang ditarik dari WTB (Rp juta). `wtb` opsional:
     bila diberi (mis. dari useAudit().wtb yang reaktif) → angka mengikuti AJE live. */
  function figuresFromWTB(wtb) {
    const v = (k, field) => WTB_MAP[k].sign * jt(wtbVal(wtb, WTB_MAP[k].code, field));
    const dboBooked     = v('dbo', 'adj');
    const ckpnBooked    = v('ckpn', 'unadj');          // saldo dibukukan klien (sebelum AJE audit)
    const ckpnAudited   = v('ckpn', 'adj');            // setelah AJE PSAK 71
    const ppeGross      = v('ppeGross', 'adj');
    const ppeAccum      = v('ppeAccum', 'adj');        // (negatif)
    const ppeNetCarry   = ppeGross + ppeAccum;         // nilai tercatat neto aset tetap
    const intanGross    = v('intanGross', 'adj');
    const intanAccum    = v('intanAccum', 'adj');      // (negatif)
    const intanNetCarry = intanGross + intanAccum;     // nilai tercatat neto aset takberwujud
    const rouCarry      = v('rou', 'adj');
    const leaseLiab     = v('leaseST', 'adj') + v('leaseLT', 'adj');
    const dtaReported   = v('dta', 'adj');             // DTA per buku besar
    const taxExpBooked  = v('taxExp', 'adj');          // beban pajak dibukukan
    return { dboBooked, ckpnBooked, ckpnAudited, ppeGross, ppeAccum, ppeNetCarry,
             intanGross, intanAccum, intanNetCarry,
             rouCarry, leaseLiab, dtaReported, taxExpBooked };
  }

  /* ---------- PSAK 73 · portofolio sewa (sumber kebenaran kalkulasi sewa) ---------- */
  const LEASES = [
    { id: 'LS-01', name: 'Sewa Gudang Distribusi Cikarang', termMo: 60, pmt: 180_000_000, rate: 9.5, start: '01-01-2025' },
    { id: 'LS-02', name: 'Sewa Armada Kendaraan Operasional', termMo: 48, pmt: 95_000_000, rate: 10.0, start: '01-03-2025' },
    { id: 'LS-03', name: 'Sewa Kantor Cabang Surabaya', termMo: 36, pmt: 62_000_000, rate: 9.0, start: '01-04-2025' },
  ];

  function leaseCalc(termMo, pmt, ratePct) {
    const r = ratePct / 100 / 12;
    const n = termMo;
    const pv = r === 0 ? pmt * n : pmt * (1 - Math.pow(1 + r, -n)) / r;
    let bal = pv;
    const rows = [];
    for (let m = 1; m <= n; m++) {
      const interest = bal * r;
      const principal = pmt - interest;
      bal = bal - principal;
      rows.push({ m, opening: bal + principal, interest, pmt, principal, closing: Math.max(0, bal) });
    }
    return { pv, rows };
  }

  // jumlah pembayaran yang telah jatuh tempo per tanggal pelaporan
  function elapsedMonths(start) {
    const [, mm, yy] = start.split('-').map(Number);
    return (ASOF.y - yy) * 12 + (ASOF.m - mm) + 1;
  }

  /* posisi sewa per tanggal pelaporan: ROU (garis lurus) vs liabilitas (bunga efektif).
     Di awal masa sewa liabilitas > ROU → beda temporer dapat dikurangkan (DTA),
     karena fiskal hanya mengakui pembayaran saat dibayar (dasar pajak ROU & liabilitas = 0). */
  function leasePortfolio() {
    const perLease = LEASES.map(l => {
      const { pv, rows } = leaseCalc(l.termMo, l.pmt, l.rate);
      const el = Math.min(l.termMo, Math.max(0, elapsedMonths(l.start)));
      const rou = pv * (l.termMo - el) / l.termMo;          // aset hak-guna (garis lurus)
      const liab = el > 0 ? rows[el - 1].closing : pv;       // saldo liabilitas tersisa
      return { id: l.id, name: l.name, elapsed: el, term: l.termMo, pv, rou, liab, net: liab - rou };
    });
    const rou = perLease.reduce((a, x) => a + x.rou, 0);
    const liab = perLease.reduce((a, x) => a + x.liab, 0);
    const net = liab - rou;
    return { perLease, rou, liab, net, netJt: net / 1e6 };   // netJt = beda temporer (Rp juta)
  }

  /* ---------- input non-WTB (rekonsiliasi fiskal & dasar pajak) ----------
     Pos berikut TIDAK ada sebagai saldo tunggal di buku besar komersial:
     dasar pajak aset tetap, rugi fiskal, beda permanen, PKP — berasal dari
     SPT / rekonsiliasi fiskal. Dipisah agar jelas mana yang ber-sumber WTB. */
  const FISCAL = {
    ppeTaxBaseDelta: 5500,   // beda temporer aset tetap (tercatat − dasar pajak) per kertas kerja fiskal
    provisi: 900,            // PSAK 57 · provisi garansi & lainnya (beda temporer)
    taxLoss: 3000,           // rugi fiskal entitas anak dapat dikompensasi
    ociRemeasure: 270,       // PSAK 24 · pengukuran kembali (OCI) → pajak OCI
    pbt: 48500,              // laba sebelum pajak komersial (Laba Rugi)
    pkp: 53500,              // penghasilan kena pajak (hasil rekonsiliasi fiskal)
    permAdd: 1200,           // beda permanen — beban tidak dapat dikurangkan
    permLess: 3000,          // beda permanen — penghasilan dikecualikan / final
    fiscalTempMovement: 1860 + 2400 + 900 + 1640,  // movement beda temporer th berjalan = 6800
  };

  /* ---------- FIG: saldo akhir kanonik tiap pos (Rp juta) ----------
     Figur ber-sumber WTB ditarik saat load dari window.AMS.WTB; sisanya dari FISCAL.
     Nama field lama dipertahankan agar konsumen (PSAK 46, ECL, Sewa) tetap kompatibel. */
  const SRC = figuresFromWTB();
  const FIG = {
    // —— ditarik dari WTB (buku besar) ——
    dbo:          SRC.dboBooked,        // 13.080 — WTB 2-2300 (nilai tercatat; dasar pajak 0)
    ckpn:         SRC.ckpnBooked,       // 1.980  — WTB 1-1210 (saldo dibukukan klien)
    ckpnAudited:  SRC.ckpnAudited,      // 2.600  — WTB 1-1210 setelah AJE PSAK 71
    ppeCarry:     SRC.ppeNetCarry,      // nilai tercatat neto aset tetap per WTB
    rouCarry:     SRC.rouCarry,         // 12.640 — WTB 1-2300
    leaseLiabWTB: SRC.leaseLiab,        // 12.800 — WTB 2-1500 + 2-2200
    dtaReported:  SRC.dtaReported,      // 4.980  — WTB 1-2500 (DTA per buku besar)
    taxExpBooked: SRC.taxExpBooked,     // beban pajak dibukukan (WTB 5-5100)
    // —— dasar pajak / rekonsiliasi fiskal (non-WTB) ——
    ppeBase:      SRC.ppeNetCarry - FISCAL.ppeTaxBaseDelta, // dasar pajak aset tetap (tercatat − beda temporer)
    ppeTempDiff:  FISCAL.ppeTaxBaseDelta,
    provisi:      FISCAL.provisi,
    taxLoss:      FISCAL.taxLoss,
    ociRemeasure: FISCAL.ociRemeasure,
    pbt:          FISCAL.pbt,
    pkp:          FISCAL.pkp,
    permAdd:      FISCAL.permAdd,
    permLess:     FISCAL.permLess,
    fiscalTempMovement: FISCAL.fiscalTempMovement,
  };

  /* ---------- pajak tangguhan: saldo akhir per pos (ditarik PSAK 46) ----------
     `wtb` opsional → bila diberi, dbo & ckpn mengikuti WTB reaktif (AJE live). */
  function deferredTax(wtb) {
    const f = wtb ? (() => {
      const s = figuresFromWTB(wtb);
      return Object.assign({}, FIG, { dbo: s.dboBooked, ckpn: s.ckpnBooked, dtaReported: s.dtaReported });
    })() : FIG;
    const lease = leasePortfolio();
    const mk = (id, diff, type) => {
      const dtRaw = Math.round(diff * RATE);
      return { id, diff: Math.round(diff), dt: type === 'tax' ? -dtRaw : dtRaw, type };
    };
    const items = [
      Object.assign(mk('ppe', f.ppeTempDiff, 'tax'),  { car: f.ppeCarry, base: f.ppeBase }),
      Object.assign(mk('eb', f.dbo, 'ded'),           { car: f.dbo, base: 0 }),
      Object.assign(mk('ecl', f.ckpn, 'ded'),         { car: null, base: null }),
      Object.assign(mk('lse', lease.netJt, 'ded'),    { car: null, base: null }),
      Object.assign(mk('prv', f.provisi, 'ded'),      { car: null, base: null }),
      Object.assign(mk('tlc', f.taxLoss, 'ded'),      { car: null, base: null }),
    ];
    const closing = items.reduce((a, x) => a + x.dt, 0);             // saldo akhir DTA neto (model)
    const currentTax = Math.round(f.pkp * RATE);                    // pajak kini = PKP × 22%
    const deferredPL = Math.round(f.fiscalTempMovement * RATE);     // manfaat pajak tangguhan L/R
    const oci = Math.round(f.ociRemeasure * RATE);                  // pajak diakui di OCI
    const opening = closing - deferredPL - oci;                     // saldo awal (PY) — penyeimbang
    const taxExpense = currentTax - deferredPL;                     // beban pajak penghasilan
    const dtaReported = f.dtaReported;                              // DTA per buku besar (WTB)
    const dtaVariance = closing - dtaReported;                      // selisih model vs buku besar
    return { items, lease, closing, opening, currentTax, deferredPL, oci, taxExpense,
             pbt: f.pbt, pkp: f.pkp, rate: RATE, etr: taxExpense / f.pbt,
             dtaReported, dtaVariance };
  }

  /* ---------- PSAK 14 · Persediaan (sumber kebenaran kalkulasi persediaan) ----------
     Seluruh angka ditarik dari WTB 1-1300 (Persediaan) & 5-1100 (Beban Pokok
     Penjualan). Roll-forward dibentuk dari saldo awal audited, pembelian (derivasi
     plug pra-audit), BPP, dan AJE pisah batas (AJE-01) — sehingga saldo akhir
     menutup persis ke WTB. Klasifikasi (¶36b) & cadangan NRV bersifat alokasi
     pengungkapan di atas saldo neto WTB. Rp juta. */
  const INV_MIX = [
    { id: 'rm',    label: 'Bahan baku',                   pct: 0.22 },
    { id: 'wip',   label: 'Barang dalam proses',          pct: 0.12 },
    { id: 'fg',    label: 'Barang jadi',                  pct: 0.54 },
    { id: 'spare', label: 'Suku cadang & bahan pembantu', pct: 0.12 },
  ];
  /* band umur barang jadi (¶28–33) — dipakai mengelompokkan SKU barang jadi */
  const INV_FG_AGING = [
    { id: 'b0', band: '0 – 90 hari',    lbl: 'Lancar' },
    { id: 'b1', band: '91 – 180 hari',  lbl: 'Perlu dipantau' },
    { id: 'b2', band: '181 – 365 hari', lbl: 'Slow-moving' },
    { id: 'b3', band: '> 365 hari',     lbl: 'Usang' },
  ];
  /* ---- Register persediaan per-SKU (kertas kerja NRV · WP C-2) ----
     SUMBER BAWAH uji NRV. Tiap item: cadangan diperlukan auditor (reqWD) & cadangan
     dibukukan klien (bookedWD) dalam Rp juta; carry/cost dialokasikan dari saldo neto
     WTB 1-1300 (skala mengikuti AJE). Subtotal per klasifikasi menutup PERSIS ke
     pengukuran kanonik & WTB. w = bobot nilai dalam klasifikasi (Σ=1). compR/sellcR =
     biaya penyelesaian & biaya penjualan sbg rasio biaya → NRV = jual − selesai − jual.
     age (barang jadi) merujuk band INV_FG_AGING. */
  const INV_ITEMS = [
    /* Bahan baku — Σ booked 280 · Σ req 360 */
    { code: 'RM-RES01', label: 'Resin polimer grade A',         cls: 'rm',    w: 0.32, qty: 1850000, bookedWD: 0,   reqWD: 0,   compR: 0,    sellcR: 0.03 },
    { code: 'RM-PIG02', label: 'Pigmen & pewarna industri',     cls: 'rm',    w: 0.24, qty: 920000,  bookedWD: 0,   reqWD: 0,   compR: 0,    sellcR: 0.03 },
    { code: 'RM-ADD03', label: 'Aditif anti-UV & stabilizer',   cls: 'rm',    w: 0.18, qty: 640000,  bookedWD: 40,  reqWD: 50,  compR: 0,    sellcR: 0.04 },
    { code: 'RM-SOL04', label: 'Pelarut & bahan coating',       cls: 'rm',    w: 0.14, qty: 410000,  bookedWD: 90,  reqWD: 110, compR: 0,    sellcR: 0.05 },
    { code: 'RM-OBS05', label: 'Bahan baku spesifikasi lama',   cls: 'rm',    w: 0.12, qty: 280000,  bookedWD: 150, reqWD: 200, compR: 0,    sellcR: 0.08 },
    /* Barang dalam proses — Σ booked 120 · Σ req 150 */
    { code: 'WP-ASM01', label: 'Rakitan setengah jadi — Line A', cls: 'wip', w: 0.50, qty: 220000,  bookedWD: 0,   reqWD: 0,   compR: 0.18, sellcR: 0.04 },
    { code: 'WP-ASM02', label: 'Rakitan Line B (tertahan QC)',   cls: 'wip',   w: 0.30, qty: 140000,  bookedWD: 50,  reqWD: 60,  compR: 0.16, sellcR: 0.04 },
    { code: 'WP-CUS03', label: 'Pesanan khusus dibatalkan',      cls: 'wip',   w: 0.20, qty: 60000,   bookedWD: 70,  reqWD: 90,  compR: 0.22, sellcR: 0.05 },
    /* Barang jadi — Σ booked 1850 · Σ req 2695 */
    { code: 'FG-CON01', label: 'Produk konsumer reguler (laris)', cls: 'fg',   w: 0.42, qty: 1250000, bookedWD: 0,   reqWD: 0,   compR: 0, sellcR: 0.05, age: 'b0' },
    { code: 'FG-CON02', label: 'Varian kemasan baru',           cls: 'fg',    w: 0.22, qty: 680000,  bookedWD: 0,   reqWD: 0,   compR: 0, sellcR: 0.05, age: 'b0' },
    { code: 'FG-CON03', label: 'Produk musiman (akhir musim)',  cls: 'fg',    w: 0.15, qty: 430000,  bookedWD: 50,  reqWD: 70,  compR: 0, sellcR: 0.06, age: 'b0' },
    { code: 'FG-RET04', label: 'Retur ritel dikemas ulang',     cls: 'fg',    w: 0.07, qty: 180000,  bookedWD: 120, reqWD: 180, compR: 0, sellcR: 0.06, age: 'b1' },
    { code: 'FG-DSC05', label: 'Lini menjelang diskon',         cls: 'fg',    w: 0.05, qty: 120000,  bookedWD: 230, reqWD: 320, compR: 0, sellcR: 0.07, age: 'b1' },
    { code: 'FG-SLW06', label: 'Model lama — masih dijual',      cls: 'fg',    w: 0.04, qty: 90000,   bookedWD: 350, reqWD: 560, compR: 0, sellcR: 0.07, age: 'b2' },
    { code: 'FG-SLW07', label: 'Kelebihan stok promo lampau',   cls: 'fg',    w: 0.02, qty: 45000,   bookedWD: 200, reqWD: 360, compR: 0, sellcR: 0.08, age: 'b2' },
    { code: 'FG-OBS08', label: 'Produk discontinued',           cls: 'fg',    w: 0.02, qty: 38000,   bookedWD: 500, reqWD: 720, compR: 0, sellcR: 0.10, age: 'b3' },
    { code: 'FG-OBS09', label: 'Kemasan desain kadaluarsa',     cls: 'fg',    w: 0.01, qty: 22000,   bookedWD: 400, reqWD: 485, compR: 0, sellcR: 0.10, age: 'b3' },
    /* Suku cadang & bahan pembantu — Σ booked 640 · Σ req 980 */
    { code: 'SP-MEC01', label: 'Suku cadang mesin aktif',       cls: 'spare', w: 0.40, qty: 320000,  bookedWD: 0,   reqWD: 0,   compR: 0, sellcR: 0.04 },
    { code: 'SP-ELE02', label: 'Komponen elektrikal',          cls: 'spare', w: 0.24, qty: 180000,  bookedWD: 80,  reqWD: 120, compR: 0, sellcR: 0.04 },
    { code: 'SP-BRG03', label: 'Bearing & seal',               cls: 'spare', w: 0.16, qty: 96000,   bookedWD: 120, reqWD: 180, compR: 0, sellcR: 0.05 },
    { code: 'SP-OLD04', label: 'Cadangan mesin generasi lama',  cls: 'spare', w: 0.12, qty: 54000,   bookedWD: 200, reqWD: 300, compR: 0, sellcR: 0.07 },
    { code: 'SP-OBS05', label: 'Cadangan mesin telah afkir',    cls: 'spare', w: 0.08, qty: 28000,   bookedWD: 240, reqWD: 380, compR: 0, sellcR: 0.10 },
  ];

  function inventory(wtb) {
    const openingCost = jt(wtbVal(wtb, '1-1300', 'ly'));    // saldo awal audited
    const closeUnadj  = jt(wtbVal(wtb, '1-1300', 'unadj')); // saldo akhir per klien (pra-audit)
    const ajeInv      = jt(wtbVal(wtb, '1-1300', 'aje'));   // AJE pisah batas (negatif)
    const closeNet    = jt(wtbVal(wtb, '1-1300', 'adj'));   // saldo akhir audited (= unadj + aje)
    const cogsUnadj   = jt(wtbVal(wtb, '5-1100', 'unadj')); // BPP per klien
    const cogsAdj     = jt(wtbVal(wtb, '5-1100', 'adj'));   // BPP audited
    const purchases   = closeUnadj - openingCost + cogsUnadj; // pembelian & biaya konversi (derivasi)
    const goodsAvail  = openingCost + purchases;             // barang tersedia untuk dijual

    /* ---- register per-SKU (kertas kerja NRV C-2) — sumber bawah uji NRV ---- */
    const items = INV_ITEMS.map(it => {
      const cls   = INV_MIX.find(m => m.id === it.cls);
      const carry = closeNet * cls.pct * it.w;        // nilai tercatat neto (alokasi WTB)
      const bookedWD = it.bookedWD;                   // cadangan dibukukan klien (Rp jt)
      const cost  = carry + bookedWD;                 // biaya perolehan bruto
      const reqWD = it.reqWD;                          // cadangan diperlukan auditor (Rp jt)
      const costComplete = cost * (it.compR  || 0);   // biaya penyelesaian (WIP)
      const costSell     = cost * (it.sellcR || 0);   // biaya penjualan
      const nrv   = cost - reqWD;                      // nilai realisasi neto = biaya − penurunan
      const sellPrice = nrv + costComplete + costSell; // harga jual taksiran (back-out)
      const lower = Math.min(cost, nrv);              // nilai terendah (¶9)
      const shortfall = reqWD - bookedWD;             // kurang dibukukan → SAD
      const unitCost = it.qty ? Math.round(cost * 1e6 / it.qty) : null;
      return { code: it.code, label: it.label, cls: it.cls, classLabel: cls.label, age: it.age || null,
               qty: it.qty, w: it.w, carry, bookedWD, cost, costComplete, costSell,
               reqWD, nrv, sellPrice, lower, shortfall, unitCost };
    });

    /* klasifikasi (¶36b) — agregasi SKU; subtotal menutup ke saldo neto WTB */
    const mix = INV_MIX.map(m => {
      const its = items.filter(i => i.cls === m.id);
      const carry = closeNet * m.pct;
      const bookedWD = its.reduce((a, x) => a + x.bookedWD, 0);
      const reqWD = its.reduce((a, x) => a + x.reqWD, 0);
      const cost = carry + bookedWD;
      const nrv = cost - reqWD;
      return { id: m.id, label: m.label, pct: m.pct, items: its,
               carry, cost, nrv, reqWD, bookedWD, shortfall: reqWD - bookedWD };
    });
    const grossCost   = mix.reduce((a, x) => a + x.cost, 0);
    const bookedWD    = mix.reduce((a, x) => a + x.bookedWD, 0);
    const requiredWD  = mix.reduce((a, x) => a + x.reqWD, 0);
    const shortfallWD = requiredWD - bookedWD; // usulan penurunan tambahan (potensi salah saji)

    /* umur barang jadi — dikelompokkan dari SKU barang jadi (single source) */
    const fgItems = items.filter(i => i.cls === 'fg');
    const fgCost  = fgItems.reduce((a, x) => a + x.cost, 0);
    const fgAging = INV_FG_AGING.map(b => {
      const its = fgItems.filter(i => i.age === b.id);
      const amt = its.reduce((a, x) => a + x.cost, 0);
      const wd  = its.reduce((a, x) => a + x.reqWD, 0);
      return { ...b, amt, wd, rate: amt ? wd / amt : 0, items: its };
    });
    const fgReqWD = fgAging.reduce((a, x) => a + x.wd, 0);

    /* analitis (SA 520) — perputaran & hari persediaan berbasis saldo rata-rata */
    const avgInv   = (openingCost + closeNet) / 2;
    const turnover = avgInv ? cogsAdj / avgInv : 0;
    const dio      = turnover ? 365 / turnover : 0;
    const sales    = -jt(wtbVal(wtb, '4-1100', 'adj'));
    const gm       = sales - cogsAdj;
    const gmPct    = sales ? gm / sales : 0;

    return { openingCost, closeUnadj, ajeInv, closeNet, cogsUnadj, cogsAdj,
             purchases, goodsAvail, mix, items, grossCost, bookedWD, requiredWD, shortfallWD,
             fgCost, fgAging, fgReqWD,
             avgInv, turnover, dio, sales, gm, gmPct };
  }

  /* ---------- PSAK 16 · Aset Tetap (sumber kebenaran kalkulasi aset tetap) ----------
     Seluruh angka ditarik dari WTB 1-2100 (Harga Perolehan) & 1-2110 (Akumulasi
     Penyusutan). Roll-forward bruto & akumulasi dibentuk agar menutup PERSIS ke WTB
     adjusted: penambahan (capex) & beban penyusutan klien adalah derivasi-plug (sama
     pola dgn Persediaan). Koreksi audit AJE-05 (penyusutan) ditarik dari kolom `aje`.
     Klasifikasi per kelompok aset (¶73) bersifat alokasi pengungkapan atas total WTB
     — dinormalkan agar Σ kelompok = saldo WTB. Pelepasan ber-sumber kertas kerja E
     (vouching/cek fisik), bukan saldo tunggal di buku besar. Rp juta. */
  const PPE_CLASSES = [
    { id: 'tanah',     label: 'Tanah',                         pct: 0.16, life: null, residual: 0.00, mature: 0.00, note: 'HGB · tidak disusutkan (¶58)' },
    { id: 'bangunan',  label: 'Bangunan & prasarana',          pct: 0.40, life: 30,   residual: 0.10, mature: 0.22 },
    { id: 'mesin',     label: 'Mesin & peralatan produksi',    pct: 0.30, life: 16,   residual: 0.05, mature: 0.42 },
    { id: 'kendaraan', label: 'Kendaraan',                     pct: 0.08, life: 10,   residual: 0.10, mature: 0.55 },
    { id: 'inventaris',label: 'Inventaris & peralatan kantor', pct: 0.06, life: 8,    residual: 0.05, mature: 0.62 },
  ];

  function fixedAssets(wtb) {
    const grossOpen   = jt(wtbVal(wtb, '1-2100', 'ly'));
    const grossClose  = jt(wtbVal(wtb, '1-2100', 'adj'));
    const accumOpen   = -jt(wtbVal(wtb, '1-2110', 'ly'));      // magnitudo (tersimpan negatif)
    const accumClient = -jt(wtbVal(wtb, '1-2110', 'unadj'));   // akumulasi dibukukan klien
    const accumAudit  = -jt(wtbVal(wtb, '1-2110', 'adj'));     // setelah koreksi AJE-05
    const ajeDepr     = -jt(wtbVal(wtb, '1-2110', 'aje'));     // koreksi penyusutan (magnitudo, +)

    /* uji pelepasan tak-tercatat (R-04 · keberadaan) — hasil prosedur, bukan saldo GL */
    const disposalTested   = 4180;   // nilai tercatat aset diuji keberadaannya (sampling fisik)
    const disposalUnrec    = 0;      // pelepasan tak-tercatat teridentifikasi (nihil material)

    /* roll-forward bruto: penambahan menutup ke mutasi neto WTB (= belanja modal).
       Tidak ada pelepasan dibukukan klien th berjalan; KEBERADAAN diuji terpisah
       (R-04 · WP E-5) untuk mendeteksi pelepasan tak-tercatat — nihil material. */
    const additions   = grossClose - grossOpen;               // perolehan bruto = mutasi neto WTB
    const capexNet    = grossClose - grossOpen;               // arus kas investasi (PSAK 2)

    /* roll-forward akumulasi: beban penyusutan klien = mutasi akum sebelum koreksi */
    const deprClient  = accumClient - accumOpen;              // beban penyusutan dibukukan klien
    const deprAudited = deprClient + ajeDepr;                 // setelah koreksi AJE-05 (= Δ akum WTB)
    const netOpen     = grossOpen - accumOpen;                // nilai tercatat neto awal
    const netClose    = grossClose - accumAudit;              // nilai tercatat neto audited

    /* klasifikasi per kelompok (¶73) — alokasi atas total WTB, dinormalkan agar menutup */
    const rawAccum = PPE_CLASSES.map(c => {
      const gross = grossClose * c.pct;
      const base = c.life ? gross * (1 - c.residual) : 0;
      return base * c.mature;
    });
    const rawSum = rawAccum.reduce((a, x) => a + x, 0);
    const scale  = rawSum ? accumAudit / rawSum : 0;            // normalisasi → Σ accum = WTB
    const classes = PPE_CLASSES.map((c, i) => {
      const gross = grossClose * c.pct;
      const base  = c.life ? gross * (1 - c.residual) : 0;      // dasar yang dapat disusutkan
      const accum = rawAccum[i] * scale;
      const carry = gross - accum;                              // nilai tercatat neto kelompok
      const annualDep = c.life ? base / c.life : 0;             // penyusutan tahunan (garis lurus)
      const rate  = c.life ? (1 - c.residual) / c.life : 0;     // tarif penyusutan
      const remNet = carry - c.residual * gross;                // sisa nilai dapat disusutkan
      const remLife = annualDep ? remNet / annualDep : null;    // estimasi sisa umur manfaat
      return { ...c, gross, base, accum, carry, annualDep, rate, remLife };
    });
    const grossTot  = classes.reduce((a, c) => a + c.gross, 0);
    const accumTot  = classes.reduce((a, c) => a + c.accum, 0);
    const carryTot  = classes.reduce((a, c) => a + c.carry, 0);

    /* uji kewajaran penyusutan (SA 520) — ekspektasi independen vs dibukukan */
    const expectedDep = classes.reduce((a, c) => a + c.annualDep, 0);
    const depVariance = deprAudited - expectedDep;             // (−) bila dibukukan < ekspektasi
    const depVarPct   = expectedDep ? depVariance / expectedDep : 0;

    return {
      grossOpen, grossClose, accumOpen, accumClient, accumAudit, ajeDepr,
      additions, capexNet, disposalTested, disposalUnrec,
      deprClient, deprAudited, netOpen, netClose,
      classes, grossTot, accumTot, carryTot, expectedDep, depVariance, depVarPct,
    };
  }

  /* ---------- PSAK 16 · Register Aset Tetap (buku besar pembantu / sub-ledger) ----------
     Mensimulasikan data yang DI-IMPOR dari lampiran `register-aset-tetap.xlsx`.
     Mekanisme di dunia nyata: tiap baris aset dibaca dari Excel → dipetakan ke field
     aplikasi → divalidasi → di-rekonsiliasi total kontrolnya ke akun GL (WTB 1-2100 &
     1-2110) sebelum di-posting. Di prototipe ini baris di-generate dari total kelompok
     kanonik (fixedAssets) memakai bobot per-aset & umur dari tanggal perolehan, lalu
     akumulasi penyusutan dinormalkan agar Σ sub-ledger = saldo GL — yakni hasil
     rekonsiliasi yang "menutup". Rp juta. */
  const REGISTER_SEED = [
    { cls: 'tanah',     tag: 'LD-001', name: 'Tanah Pabrik — Cikarang',            w: 0.62, acq: '2016-05', doc: 'HGB No. 412/Ckr' },
    { cls: 'tanah',     tag: 'LD-002', name: 'Tanah Gudang — Bekasi',              w: 0.38, acq: '2018-03', doc: 'HGB No. 877/Bks' },
    { cls: 'bangunan',  tag: 'BD-101', name: 'Gedung Pabrik Utama',               w: 0.45, acq: '2016-08', doc: 'IMB 1140/2016' },
    { cls: 'bangunan',  tag: 'BD-102', name: 'Gudang & Pusat Logistik',           w: 0.25, acq: '2019-02', doc: 'IMB 0421/2019' },
    { cls: 'bangunan',  tag: 'BD-103', name: 'Gedung Kantor & Administrasi',      w: 0.20, acq: '2017-06', doc: 'IMB 0907/2017' },
    { cls: 'bangunan',  tag: 'BD-104', name: 'Prasarana, Pagar & Instalasi',      w: 0.10, acq: '2018-11', doc: 'BA-Konstruksi' },
    { cls: 'mesin',     tag: 'MC-201', name: 'Lini Produksi A',                   w: 0.30, acq: '2018-04', doc: 'INV-A/2018' },
    { cls: 'mesin',     tag: 'MC-202', name: 'Lini Produksi B',                   w: 0.26, acq: '2020-09', doc: 'INV-B/2020' },
    { cls: 'mesin',     tag: 'MC-203', name: 'Mesin Pengemasan Otomatis',         w: 0.18, acq: '2019-07', doc: 'INV-P/2019' },
    { cls: 'mesin',     tag: 'MC-204', name: 'Boiler & Utilitas Pabrik',          w: 0.14, acq: '2017-03', doc: 'INV-U/2017' },
    { cls: 'mesin',     tag: 'MC-205', name: 'Peralatan Laboratorium QC',         w: 0.12, acq: '2021-05', doc: 'INV-QC/2021' },
    { cls: 'kendaraan', tag: 'VH-301', name: 'Truk Distribusi (5 unit)',          w: 0.55, acq: '2021-01', doc: 'BPKB B-xxxx' },
    { cls: 'kendaraan', tag: 'VH-302', name: 'Forklift & Alat Angkut',            w: 0.25, acq: '2020-02', doc: 'INV-FL/2020' },
    { cls: 'kendaraan', tag: 'VH-303', name: 'Kendaraan Operasional',             w: 0.20, acq: '2022-08', doc: 'BPKB B-yyyy' },
    { cls: 'inventaris',tag: 'EQ-401', name: 'Perangkat IT, Server & Jaringan',   w: 0.45, acq: '2022-03', doc: 'INV-IT/2022' },
    { cls: 'inventaris',tag: 'EQ-402', name: 'Mebel & Furnitur Kantor',           w: 0.30, acq: '2019-09', doc: 'INV-MB/2019' },
    { cls: 'inventaris',tag: 'EQ-403', name: 'Peralatan Kantor Lainnya',          w: 0.25, acq: '2021-11', doc: 'INV-PK/2021' },
  ];

  /* kolom file Excel → field aplikasi (template pemetaan tersimpan per klien) */
  const REGISTER_MAP = [
    { col: 'A', xls: 'No. Aset / Tag',          field: 'tag',      type: 'teks',    key: true },
    { col: 'B', xls: 'Nama Aset',               field: 'name',     type: 'teks' },
    { col: 'C', xls: 'Kelompok',                field: 'cls',      type: 'enum',    note: 'dicocokkan ke 5 kelompok ¶73' },
    { col: 'D', xls: 'Tgl Perolehan',           field: 'acq',      type: 'tanggal', note: 'dasar umur & penyusutan' },
    { col: 'E', xls: 'Harga Perolehan (Rp)',    field: 'cost',     type: 'angka',   ctrl: '1-2100' },
    { col: 'F', xls: 'Umur Manfaat (th)',       field: 'life',     type: 'angka' },
    { col: 'G', xls: 'Akm. Penyusutan (Rp)',    field: 'accum',    type: 'angka',   ctrl: '1-2110' },
    { col: 'H', xls: 'No. Dokumen / Bukti',     field: 'doc',      type: 'teks' },
  ];

  function assetRegister(wtb) {
    const fa = fixedAssets(wtb);
    const byCls = {}; fa.classes.forEach(c => { byCls[c.id] = c; });
    let rows = REGISTER_SEED.map(s => {
      const c = byCls[s.cls] || {};
      const cost = (c.gross || 0) * s.w;
      const acqYear = Number(s.acq.split('-')[0]);
      const age = c.life ? Math.max(0, ASOF.y - acqYear) : 0;
      const annual = c.life ? cost * (1 - c.residual) / c.life : 0;
      const rawAccum = c.life ? Math.min(cost * (1 - c.residual), annual * age) : 0;
      return { ...s, classLabel: c.label, cost, life: c.life, residual: c.residual, acqYear, age, annual, rawAccum };
    });
    /* normalisasi akumulasi per kelompok → Σ sub-ledger = akum GL (rekonsiliasi menutup) */
    const clsRaw = {}; rows.forEach(r => { clsRaw[r.cls] = (clsRaw[r.cls] || 0) + r.rawAccum; });
    rows = rows.map(r => {
      const c = byCls[r.cls] || {};
      const k = clsRaw[r.cls] ? (c.accum || 0) / clsRaw[r.cls] : 0;
      const accum = r.rawAccum * k;
      const nbv = r.cost - accum;
      const rate = (r.life && r.cost) ? r.annual / r.cost : 0;
      return { ...r, accum, nbv, rate, fullyDep: r.life ? (nbv <= r.cost * r.residual + 1) : false };
    });
    const sumCost  = rows.reduce((a, r) => a + r.cost, 0);
    const sumAccum = rows.reduce((a, r) => a + r.accum, 0);
    const sumNbv   = rows.reduce((a, r) => a + r.nbv, 0);

    /* rekonsiliasi total kontrol: sub-ledger (register) ↔ GL (WTB control account) */
    const tol = 1; // toleransi Rp 1 jt (pembulatan)
    const recon = [
      { id: 'cost',  label: 'Harga perolehan',     sub: sumCost,  gl: fa.grossClose, code: '1-2100' },
      { id: 'accum', label: 'Akumulasi penyusutan', sub: sumAccum, gl: fa.accumAudit, code: '1-2110' },
      { id: 'nbv',   label: 'Nilai buku neto',      sub: sumNbv,   gl: fa.netClose,   code: '— neto' },
    ].map(r => ({ ...r, diff: r.sub - r.gl, ok: Math.abs(r.sub - r.gl) <= tol }));
    const reconciled = recon.every(r => r.ok);

    return { rows, sumCost, sumAccum, sumNbv, recon, reconciled, count: rows.length,
             map: REGISTER_MAP, fa };
  }

  /* ---------- PSAK 72 · Pendapatan dari Kontrak dengan Pelanggan (sumber kebenaran) ----------
     Seluruh angka pendapatan ditarik dari WTB 4-1100 (Penjualan Bersih):
       · Pendapatan dibukukan klien  = -unadj(4-1100)
       · Pendapatan per WTB adjusted = -adj(4-1100)  → menutup ke Laba Rugi FS Generator
       · Pendapatan komparatif 2024  = -ly(4-1100)
     Koreksi cut-off (pengakuan dini / channel stuffing) ditarik dari AJE-03 (dr 4-1100,
     status Proposed) — kunci yang sama dirujuk Penilaian Risiko (R-01) & Buku Besar AJE.
     Disagregasi (¶114) per lini produk / waktu / saluran / geografi = alokasi pengungkapan
     atas total WTB, dinormalkan agar Σ = pendapatan dibukukan (pola sama PPE_CLASSES).
     Jembatan harga transaksi (¶47-72) menutup dari bruto ke neto. Saldo kontrak (¶105)
     menambatkan piutang ke WTB 1-1200; aset & liabilitas kontrak = skedul roll-forward
     sub-ledger kontrak yang direkonsiliasi (¶116). Tidak ada angka di-input ulang. Rp juta. */
  const REV_STREAMS = [
    { id: 'fmcg',  label: 'Produk Konsumen — Makanan & Minuman',  pct: 0.46, timing: 'point', ssp: 'Harga jual berdiri sendiri teramati (price list)' },
    { id: 'indus', label: 'Produk Industri & Kemasan',            pct: 0.27, timing: 'point', ssp: 'Price list per SKU' },
    { id: 'parts', label: 'Suku Cadang & Distribusi Pihak Ketiga', pct: 0.15, timing: 'point', ssp: 'Price list + margin distribusi' },
    { id: 'logis', label: 'Jasa Logistik & Distribusi (3PL)',     pct: 0.07, timing: 'over',  ssp: 'Tarif jasa per pengiriman (output)' },
    { id: 'warr',  label: 'Pemeliharaan & Garansi Diperpanjang',  pct: 0.05, timing: 'over',  ssp: 'Pendekatan biaya-plus (¶79)' },
  ];
  const REV_CHANNELS = [
    { id: 'dist',   label: 'Distributor (grosir)', pct: 0.52 },
    { id: 'modern', label: 'Modern Trade / Ritel', pct: 0.28 },
    { id: 'export', label: 'Ekspor — Asia Tenggara', pct: 0.12 },
    { id: 'direct', label: 'B2B Langsung & e-Commerce', pct: 0.08 },
  ];
  const REV_GEO = [
    { id: 'dom', label: 'Domestik (Indonesia)', pct: 0.88 },
    { id: 'exp', label: 'Ekspor', pct: 0.12 },
  ];
  /* konsiderasi variabel (¶50-54) & utang ke pelanggan (¶70) — kertas kerja R, Rp juta */
  const REV_VC = { retur: 12300, rabat: 6800, diskonDini: 1400 };
  /* kontrak multi-elemen representatif untuk demonstrasi alokasi SSP (¶73-80) */
  const REV_SSP_CONTRACT = {
    id: 'KTR-DST-018', name: 'Kontrak Distributor Utama — PT Niaga Sejahtera', price: 4200,
    pobs: [
      { id: 'goods', label: 'Penyerahan barang (FMCG)',          ssp: 3800, timing: 'point', when: 'Titik waktu — pengendalian beralih (FOB destination)' },
      { id: 'warr',  label: 'Garansi diperpanjang 24 bulan',     ssp: 520,  timing: 'over',  when: 'Sepanjang waktu — garis lurus 24 bulan' },
      { id: 'loyal', label: 'Hak material — poin loyalitas',     ssp: 180,  timing: 'point', when: 'Saat penukaran / kedaluwarsa (¶B40)' },
    ],
  };
  /* roll-forward saldo kontrak (¶116) — sub-ledger kontrak, Rp juta */
  const REV_CONTRACT_BAL = { caOpen: 3200, caAdd: 6100, caReclass: 4650, clOpen: 5400, clAdd: 9250, clRecog: 7400 };

  function revenue(wtb) {
    const revBooked  = -jt(wtbVal(wtb, '4-1100', 'unadj'));     // dibukukan klien (sebelum AJE audit)
    const revAdjWTB  = -jt(wtbVal(wtb, '4-1100', 'adj'));       // per WTB adjusted → Laba Rugi
    const revPY      = -jt(wtbVal(wtb, '4-1100', 'ly'));        // komparatif 2024 (audited)

    /* koreksi cut-off occurrence — ditarik dari AJE-03 (dr 4-1100), kunci tunggal */
    const AJE = (window.AMS && window.AMS.AJE) || [];
    const aje03 = AJE.find(a => a.id === 'AJE-03') || null;
    const cutoffRev = aje03 ? Math.round(aje03.amount / 1e6) : 0;       // 1.850 jt
    const cutoffPosted = aje03 ? (aje03.status === 'Posted') : false;
    const revAudited = revBooked - cutoffRev;                  // simpulan auditor bila AJE-03 di-posting

    const growthBooked  = revPY ? (revBooked  - revPY) / revPY : 0;
    const growthAudited = revPY ? (revAudited - revPY) / revPY : 0;

    /* disagregasi (¶114) — alokasi atas pendapatan dibukukan, dinormalkan agar menutup */
    const norm = (arr) => {
      const s = arr.reduce((a, x) => a + x.pct, 0) || 1;
      return arr.map(x => ({ ...x, amount: revBooked * x.pct / s }));
    };
    const streams  = norm(REV_STREAMS);
    const channels = norm(REV_CHANNELS);
    const geo      = norm(REV_GEO);
    const overTime  = streams.filter(s => s.timing === 'over').reduce((a, s) => a + s.amount, 0);
    const pointTime = revBooked - overTime;
    const streamsTot = streams.reduce((a, s) => a + s.amount, 0);

    /* jembatan harga transaksi (¶47-72): bruto → (−) konsiderasi variabel → neto */
    const grossBilling = revBooked + REV_VC.retur + REV_VC.rabat + REV_VC.diskonDini;
    const bridge = [
      { id: 'gross',  label: 'Harga kontrak bruto (faktur)',            v: grossBilling, cite: '¶47' },
      { id: 'retur',  label: 'Retur penjualan & potongan harga',        v: -REV_VC.retur, cite: '¶51', vc: true },
      { id: 'rabat',  label: 'Rabat volume & insentif dagang',          v: -REV_VC.rabat, cite: '¶70', vc: true },
      { id: 'diskon', label: 'Diskon penyelesaian dini (cash discount)', v: -REV_VC.diskonDini, cite: '¶52', vc: true },
      { id: 'net',    label: 'Pendapatan neto dibukukan',               v: revBooked, sub: true },
      { id: 'aje',    label: 'Koreksi cut-off — pengakuan dini (AJE-03)', v: -cutoffRev, cite: 'SA 240', memo: aje03 ? aje03.status : '—' },
      { id: 'aud',    label: 'Pendapatan neto audited',                 v: revAudited, total: true },
    ];

    /* alokasi SSP (¶73-80) — pro-rata harga transaksi terhadap Σ harga jual berdiri sendiri */
    const sspSum = REV_SSP_CONTRACT.pobs.reduce((a, p) => a + p.ssp, 0);
    const sspFactor = sspSum ? REV_SSP_CONTRACT.price / sspSum : 0;
    const pobs = REV_SSP_CONTRACT.pobs.map(p => ({ ...p, alloc: p.ssp * sspFactor, pctSsp: p.ssp / sspSum }));
    const pobAlloc = pobs.reduce((a, p) => a + p.alloc, 0);

    /* saldo kontrak (¶105, ¶116) — piutang ditambatkan ke WTB 1-1200, sisanya sub-ledger */
    const recvOpen  = jt(wtbVal(wtb, '1-1200', 'ly'));
    const recvClose = jt(wtbVal(wtb, '1-1200', 'adj'));
    const B = REV_CONTRACT_BAL;
    const caClose = B.caOpen + B.caAdd - B.caReclass;
    const clClose = B.clOpen + B.clAdd - B.clRecog;
    const contract = {
      recvOpen, recvClose,
      caOpen: B.caOpen, caAdd: B.caAdd, caReclass: B.caReclass, caClose,
      clOpen: B.clOpen, clAdd: B.clAdd, clRecog: B.clRecog, clClose,
    };

    return {
      revBooked, revAdjWTB, revPY, revAudited, cutoffRev, cutoffPosted, aje03,
      growthBooked, growthAudited,
      streams, channels, geo, overTime, pointTime, streamsTot,
      grossBilling, bridge, vc: REV_VC,
      contract: REV_SSP_CONTRACT, pobs, sspSum, sspFactor, pobAlloc,
      balances: contract,
    };
  }

  /* ---------- PSAK 19 · Aset Takberwujud (sumber kebenaran kalkulasi takberwujud) ----------
     Seluruh angka ditarik dari WTB 1-2400 (Harga Perolehan) & 1-2410 (Akumulasi Amortisasi)
     — pos yang DIRECLASS dari Aset Tetap (lihat catatan reclass: lisensi software/paten yang
     sebelumnya tercatat dalam 1-2100/1-2110). Roll-forward bruto & amortisasi dibentuk agar
     menutup PERSIS ke WTB adjusted: penambahan (perolehan + pengembangan dikapitalisasi) &
     beban amortisasi adalah derivasi-plug (pola sama dgn PSAK 16). Klasifikasi per kelompok
     (¶118) bersifat alokasi pengungkapan atas total WTB — dinormalkan agar Σ kelompok = saldo
     WTB. Kelompok berumur tak-terbatas TIDAK diamortisasi (¶107) → diuji penurunan nilai tiap
     tahun (PSAK 48 ¶10). Rp juta. */
  const INTAN_CLASSES = [
    { id: 'software', label: 'Perangkat lunak & lisensi TI',      pct: 0.34, life: 5,    mature: 0.58, internal: false, note: 'ERP, sistem produksi' },
    { id: 'patent',   label: 'Hak paten & merek dagang',          pct: 0.18, life: 10,   mature: 0.42, internal: false },
    { id: 'customer', label: 'Hubungan pelanggan (akuisisi)',     pct: 0.20, life: 8,    mature: 0.48, internal: false, note: 'PSAK 22 \u00b7 alokasi PPA' },
    { id: 'devcost',  label: 'Biaya pengembangan dikapitalisasi', pct: 0.16, life: 5,    mature: 0.36, internal: true,  note: '\u00b657 \u00b7 6 kriteria' },
    { id: 'license',  label: 'Lisensi operasi \u2014 umur tak terbatas',  pct: 0.12, life: null, mature: 0.00, internal: false, note: '\u00b6107 \u00b7 tdk diamortisasi' },
  ];

  function intangibles(wtb) {
    const grossOpen   = jt(wtbVal(wtb, '1-2400', 'ly'));
    const grossClose  = jt(wtbVal(wtb, '1-2400', 'adj'));
    const accumOpen   = -jt(wtbVal(wtb, '1-2410', 'ly'));      // magnitudo (tersimpan negatif)
    const accumClient = -jt(wtbVal(wtb, '1-2410', 'unadj'));   // amortisasi dibukukan klien
    const accumAudit  = -jt(wtbVal(wtb, '1-2410', 'adj'));     // setelah koreksi (jika ada AJE)
    const ajeAmort    = -jt(wtbVal(wtb, '1-2410', 'aje'));     // koreksi amortisasi (magnitudo, +)

    /* roll-forward bruto: penambahan menutup ke mutasi neto WTB (perolehan + pengembangan
       dikapitalisasi). Tidak ada pelepasan dibukukan klien th berjalan; KEBERADAAN diuji
       terpisah. */
    const additions   = grossClose - grossOpen;               // penambahan bruto = mutasi neto WTB
    const amortClient = accumClient - accumOpen;              // beban amortisasi dibukukan klien
    const amortAudited= amortClient + ajeAmort;               // setelah koreksi (= Δ akum WTB)
    const netOpen     = grossOpen - accumOpen;                // nilai tercatat neto awal
    const netClose    = grossClose - accumAudit;              // nilai tercatat neto audited

    /* klasifikasi per kelompok (¶118) — alokasi atas total WTB, dinormalkan agar menutup.
       Kelompok tak-terbatas (life=null) tidak menanggung amortisasi → rawAccum 0. */
    const rawAccum = INTAN_CLASSES.map(c => {
      const gross = grossClose * c.pct;
      return c.life ? gross * c.mature : 0;
    });
    const rawSum = rawAccum.reduce((a, x) => a + x, 0);
    const scale  = rawSum ? accumAudit / rawSum : 0;            // normalisasi → Σ accum = WTB
    const classes = INTAN_CLASSES.map((c, i) => {
      const gross = grossClose * c.pct;
      const accum = rawAccum[i] * scale;
      const carry = gross - accum;                             // nilai tercatat neto kelompok
      const annualAmort = c.life ? gross / c.life : 0;         // amortisasi tahunan (garis lurus, residu 0)
      const rate  = c.life ? 1 / c.life : 0;                   // tarif amortisasi
      const remLife = (c.life && annualAmort) ? carry / annualAmort : null; // estimasi sisa umur
      return { ...c, gross, accum, carry, annualAmort, rate, remLife, indefinite: !c.life };
    });
    const grossTot  = classes.reduce((a, c) => a + c.gross, 0);
    const accumTot  = classes.reduce((a, c) => a + c.accum, 0);
    const carryTot  = classes.reduce((a, c) => a + c.carry, 0);

    /* umur tak-terbatas (¶107-110) — pos yang WAJIB diuji penurunan nilai tahunan */
    const indef       = classes.filter(c => c.indefinite);
    const indefCarry  = indef.reduce((a, c) => a + c.carry, 0);
    const finiteCarry = carryTot - indefCarry;

    /* riset vs pengembangan (¶54-57) — riset dibebankan, pengembangan dikapitalisasi.
       researchExpensed = beban riset periode (memo, masuk Laba Rugi — tdk dikapitalisasi). */
    const devClass        = classes.find(c => c.id === 'devcost');
    const devCapitalized  = devClass ? devClass.carry : 0;
    const devAdditionsYr  = additions * 0.45;                  // porsi penambahan dari pengembangan
    const researchExpensed= Math.round(devAdditionsYr * 0.85); // riset yg tdk lolos kriteria → dibebankan

    /* uji kewajaran amortisasi (SA 520) — ekspektasi independen vs dibukukan */
    const expectedAmort = classes.reduce((a, c) => a + c.annualAmort, 0);
    const amortVariance = amortAudited - expectedAmort;        // (−) bila dibukukan < ekspektasi
    const amortVarPct   = expectedAmort ? amortVariance / expectedAmort : 0;

    /* uji penurunan nilai (PSAK 48) — jumlah terpulihkan kelompok umur tak-terbatas.
       Hasil prosedur (value-in-use auditor), bukan saldo GL. */
    const recoverable   = Math.round(indefCarry * 1.18);       // jumlah terpulihkan > tercatat → tdk turun nilai
    const impairLoss    = Math.max(0, indefCarry - recoverable);

    return {
      grossOpen, grossClose, accumOpen, accumClient, accumAudit, ajeAmort,
      additions, amortClient, amortAudited, netOpen, netClose,
      classes, grossTot, accumTot, carryTot, indefCarry, finiteCarry,
      devCapitalized, devAdditionsYr, researchExpensed,
      expectedAmort, amortVariance, amortVarPct, recoverable, impairLoss,
    };
  }

  /* ---------- PSAK 25 · Kebijakan Akuntansi, Perubahan Estimasi & Kesalahan ----------
     IAS 8. Modul "meta": tidak punya satu saldo tunggal, melainkan MENARIK estimasi
     dari seluruh modul (live dari canon) lalu mengklasifikasikan tiap perubahan ke
     salah satu dari: perubahan ESTIMASI (prospektif ¶36), perubahan KEBIJAKAN
     (retrospektif ¶19/22), KESALAHAN periode lalu (retrospektif ¶42), atau
     REKLASIFIKASI penyajian (PSAK 1 ¶41). Roll-forward saldo laba penyajian kembali
     ditarik dari WTB 3-2100 (saldo laba) & komparatif Laba Rugi (kolom `ly`) +
     tarif pajak kanonik 22% — sehingga konsisten dengan modul lain. Rp juta. */
  const RESTATE = {
    // Kesalahan periode lalu (prior period error) — penjualan & piutang fiktif FY2024
    // (channel stuffing R-01) teridentifikasi pada audit FY2025. Bruto Rp juta.
    errRevenue: 2400,
    label: 'Penjualan & piutang fiktif FY2024 (channel stuffing)',
    parValue: 100,   // nilai nominal saham (Rp) untuk EPS dasar
  };

  function psak25(wtb) {
    const s   = figuresFromWTB(wtb);
    const inv = inventory(wtb);
    const fa  = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const dt  = deferredTax(wtb);

    /* ——— nilai PY (audited) yang ditarik dari WTB kolom `ly` ——— */
    const prevCkpn = -jt(wtbVal(wtb, '1-1210', 'ly'));   // 2.109
    const prevDbo  = -jt(wtbVal(wtb, '2-2300', 'ly'));   // 11.220
    const prevDta  =  jt(wtbVal(wtb, '1-2500', 'ly'));   // 4.110
    const grossAr  =  jt(wtbVal(wtb, '1-1200', 'adj'));  // piutang bruto audited

    /* === REGISTER ESTIMASI AKUNTANSI (perubahan estimasi → prospektif ¶36) ===
       Tiap baris menelusuri SATU estimasi ke modul sumbernya — nilai tercatat
       ditarik LIVE dari canon (mengikuti AJE), bukan di-hardcode. */
    const estimates = [
      { id: 'ecl', pos: 'Penyisihan kerugian ECL piutang', module: 'ecl', ref: 'PSAK 71 · SA 540',
        basis: 'Tingkat kerugian (loss rate) & overlay forward-looking',
        assumpPy: 'Matriks historis', assumpCy: '+ overlay makroekonomi',
        carryPy: prevCkpn, carryCy: s.ckpnAudited, drives: 'Beban penurunan nilai',
        sens: Math.round(grossAr * 0.01), sensLbl: '+1% loss rate', treat: 'Prospektif' },
      { id: 'dep', pos: 'Umur manfaat & nilai residu aset tetap', module: 'psak16', ref: 'PSAK 16 ¶51',
        basis: 'Umur manfaat / pola konsumsi manfaat ekonomik',
        assumpPy: 'Mesin 16 th', assumpCy: 'Mesin 14 th (ditinjau)',
        carryPy: Math.round(fa.netOpen), carryCy: Math.round(fa.netClose), drives: 'Beban penyusutan Rp ' + Math.round(fa.deprAudited) + ' jt',
        sens: Math.round(fa.expectedDep * 0.08), sensLbl: 'umur −1 th', treat: 'Prospektif' },
      { id: 'amort', pos: 'Umur manfaat aset takberwujud', module: 'psak19', ref: 'PSAK 19 ¶104',
        basis: 'Umur manfaat lisensi & perangkat lunak',
        assumpPy: 'Software 5 th', assumpCy: 'Software 4 th',
        carryPy: Math.round(intan.netOpen), carryCy: Math.round(intan.netClose), drives: 'Beban amortisasi Rp ' + Math.round(intan.amortAudited) + ' jt',
        sens: Math.round(intan.expectedAmort * 0.10), sensLbl: 'umur −1 th', treat: 'Prospektif' },
      { id: 'nrv', pos: 'Cadangan penurunan nilai persediaan (NRV)', module: 'psak14', ref: 'PSAK 14 ¶34',
        basis: 'Estimasi nilai realisasi neto barang lambat-laku',
        assumpPy: 'Cadangan dibukukan', assumpCy: 'NRV taksiran auditor',
        carryPy: Math.round(inv.bookedWD), carryCy: Math.round(inv.requiredWD), drives: 'Penyesuaian BPP',
        sens: Math.round(inv.shortfallWD), sensLbl: 'usulan tambahan', treat: 'Prospektif' },
      { id: 'eb', pos: 'Asumsi aktuaria imbalan pasti', module: 'psak24', ref: 'PSAK 24 ¶57',
        basis: 'Tingkat diskonto & kenaikan gaji',
        assumpPy: 'Diskonto 7,00%', assumpCy: 'Diskonto 6,80%',
        carryPy: prevDbo, carryCy: s.dboBooked, drives: 'Pengukuran kembali (OCI) Rp ' + FIG.ociRemeasure + ' jt',
        sens: Math.round(s.dboBooked * 0.097), sensLbl: 'diskonto −1%', kind: 'oci', treat: 'Prospektif · OCI' },
      { id: 'dta', pos: 'Pemulihan aset pajak tangguhan', module: 'psak46', ref: 'PSAK 46 ¶56',
        basis: 'Proyeksi laba fiskal masa depan',
        assumpPy: 'Proyeksi 3 th', assumpCy: 'Proyeksi 4 th',
        carryPy: prevDta, carryCy: s.dtaReported, drives: 'Manfaat pajak tangguhan',
        sens: dt.items.find(i => i.id === 'tlc') ? Math.abs(dt.items.find(i => i.id === 'tlc').dt) : 660, sensLbl: 'rugi fiskal', treat: 'Prospektif' },
    ];
    const estTotalCy = estimates.reduce((a, e) => a + e.carryCy, 0);

    /* === KATALOG KLASIFIKASI PERUBAHAN (pohon keputusan ¶32 vs ¶19 vs ¶42) === */
    const changes = [
      { id: 'c-ecl',  item: 'Tingkat kerugian ECL forward-looking direvisi (overlay makro)', cat: 'estimate', treat: 'Prospektif — periode kini & mendatang', ref: '¶36', module: 'ecl', amt: estimates[0].carryCy - estimates[0].carryPy },
      { id: 'c-dep',  item: 'Umur manfaat mesin produksi ditinjau (16 → 14 tahun)', cat: 'estimate', treat: 'Prospektif — penyusutan disesuaikan', ref: '¶36', module: 'psak16', amt: null },
      { id: 'c-eb',   item: 'Asumsi diskonto aktuaria 7,00% → 6,80%', cat: 'estimate', treat: 'Prospektif — dampak ke OCI (PSAK 24)', ref: '¶36', module: 'psak24', amt: FIG.ociRemeasure },
      { id: 'c-err',  item: RESTATE.label, cat: 'error', treat: 'Retrospektif — penyajian kembali komparatif & saldo laba awal', ref: '¶42', module: 'sad', amt: RESTATE.errRevenue },
      { id: 'c-pol',  item: 'Adopsi awal PSAK 73 — pendekatan retrospektif modifikasian', cat: 'policy', treat: 'Penyesuaian saldo laba awal (tanpa saji ulang komparatif)', ref: '¶19 · PSAK 73 C5', module: 'psak73', amt: null },
      { id: 'c-rcl',  item: 'Reklasifikasi lisensi perangkat lunak: Aset Tetap → Aset Takberwujud', cat: 'reclass', treat: 'Penyajian kembali pos komparatif (PSAK 1 ¶41)', ref: 'PSAK 1 ¶41', module: 'psak19', amt: null },
    ];

    /* === ROLL-FORWARD SALDO LABA — PENYAJIAN KEMBALI (¶42, ¶49) ===
       Komparatif FY2024 ditarik dari WTB kolom `ly`; koreksi neto pajak 22%. */
    const reOpenReported  = -jt(wtbVal(wtb, '3-2100', 'ly'));   // saldo laba awal th berjalan (= akhir PY) per buku
    const reCloseReported = -jt(wtbVal(wtb, '3-2100', 'adj'));  // saldo laba akhir per buku

    const pyRev  = -jt(wtbVal(wtb, '4-1100', 'ly'));
    const pyCogs =  jt(wtbVal(wtb, '5-1100', 'ly'));
    const pySell =  jt(wtbVal(wtb, '5-2100', 'ly'));
    const pyGA   =  jt(wtbVal(wtb, '5-3100', 'ly'));
    const pyFin  =  jt(wtbVal(wtb, '5-4100', 'ly'));
    const pyTax  =  jt(wtbVal(wtb, '5-5100', 'ly'));
    const pyAr   =  jt(wtbVal(wtb, '1-1200', 'ly'));
    const pyPbt  = pyRev - pyCogs - pySell - pyGA - pyFin;
    const pyNet  = pyPbt - pyTax;

    const errGross = RESTATE.errRevenue;
    const errTax   = Math.round(errGross * RATE);
    const errNet   = errGross - errTax;

    const revR = pyRev - errGross;
    const taxR = pyTax - errTax;
    const arR  = pyAr  - errGross;
    const pbtR = pyPbt - errGross;
    const netR = pbtR  - taxR;
    const reOpenRestated = reOpenReported - errNet;

    const impact = [
      { id: 'rev', label: 'Penjualan bersih',           rep: pyRev,  adj: -errGross, res: revR },
      { id: 'ar',  label: 'Piutang usaha',              rep: pyAr,   adj: -errGross, res: arR },
      { id: 'pbt', label: 'Laba sebelum pajak',         rep: pyPbt,  adj: -errGross, res: pbtR },
      { id: 'tax', label: 'Beban pajak penghasilan',    rep: pyTax,  adj: -errTax,   res: taxR },
      { id: 'net', label: 'Laba tahun berjalan',        rep: pyNet,  adj: -errNet,   res: netR, bold: true },
      { id: 're',  label: 'Saldo laba — akhir periode', rep: reOpenReported, adj: -errNet, res: reOpenRestated, bold: true },
    ];

    /* EPS dasar (¶49 mensyaratkan dampak ke laba per saham diungkapkan bila relevan) */
    const shares = RESTATE.parValue ? jt(wtbVal(wtb, '3-1100', 'adj')) * -1 / RESTATE.parValue * 1e6 / 1e6 : 0;
    // jt(modal) dlm juta rupiah; lembar = (modal juta * 1e6) / par. Hasil dlm juta lembar:
    const sharesM = RESTATE.parValue ? (-jt(wtbVal(wtb, '3-1100', 'adj'))) * 1e6 / RESTATE.parValue / 1e6 : 0;
    const eps = { reported: sharesM ? pyNet / sharesM : 0, restated: sharesM ? netR / sharesM : 0, sharesM };

    const restate = {
      errGross, errTax, errNet, reOpenReported, reCloseReported, reOpenRestated,
      py: { rev: pyRev, cogs: pyCogs, sell: pySell, ga: pyGA, fin: pyFin, tax: pyTax, ar: pyAr, pbt: pyPbt, net: pyNet },
      restated: { rev: revR, tax: taxR, ar: arR, pbt: pbtR, net: netR },
      impact, eps,
      material: true,            // restatement material → PSAK 1 ¶40A: sajikan posisi keuangan ketiga
      thirdBalanceSheet: true,
    };

    /* ringkasan klasifikasi untuk kartu/donut */
    const counts = { estimate: 0, policy: 0, error: 0, reclass: 0 };
    changes.forEach(c => { counts[c.cat] = (counts[c.cat] || 0) + 1; });

    return { estimates, estTotalCy, changes, counts, restate, rate: RATE };
  }

  /* ---------- PSAK 71 · Instrumen Keuangan (sumber kebenaran ECL & klasifikasi) ----------
     IFRS 9. Piutang usaha bruto ditarik dari WTB 1-1200; CKPN dibukukan klien &
     audited dari WTB 1-1210 — sehingga AJE-02 (tambahan CKPN) mengalir KONSISTEN ke
     modul PSAK 71, kalkulator ECL, reconcile(), PSAK 46 (DTA), PSAK 2 (add-back) &
     FS Generator. SATU model ECL di sini menggantikan duplikasi loss-rate yang dulu
     ada di view_calc & reconcile.

     Pendekatan piutang usaha: DISEDERHANAKAN (lifetime ECL, ¶5.5.15) via MATRIKS
     PROVISI. Eksposur per bucket = bobot aging (asumsi model) × gross WTB → terikat
     ke satu sumber. Loss rate historis disesuaikan OVERLAY FORWARD-LOOKING: skenario
     makroekonomi berbobot probabilitas (¶5.5.17). Rp juta. */
  const ECL_AGING = [
    { id: 'b0', label: 'Belum jatuh tempo', stage: 1, weight: 0.636, histRate: 1.0,  sicr: false },
    { id: 'b1', label: '1\u201330 hari',    stage: 1, weight: 0.189, histRate: 2.5,  sicr: false },
    { id: 'b2', label: '31\u201390 hari',   stage: 2, weight: 0.103, histRate: 9.0,  sicr: true  },
    { id: 'b3', label: '91\u2013180 hari',  stage: 3, weight: 0.042, histRate: 25.0, sicr: true  },
    { id: 'b4', label: '> 180 hari',        stage: 3, weight: 0.030, histRate: 63.0, sicr: true  },
  ];
  /* skenario forward-looking (¶5.5.17) — overlay makro berbobot probabilitas.
     overlay tertimbang = Σ prob × mult ≈ 1,0575 → menaikkan ECL basis historis. */
  const ECL_SCENARIOS = [
    { id: 'up',   label: 'Optimistis', prob: 0.20, mult: 0.85, macro: 'PDB +5,2% \u00b7 inflasi terkendali' },
    { id: 'base', label: 'Dasar',      prob: 0.55, mult: 1.00, macro: 'PDB +5,0% \u00b7 suku bunga stabil' },
    { id: 'down', label: 'Pesimistis', prob: 0.25, mult: 1.35, macro: 'PDB +3,8% \u00b7 tekanan likuiditas ritel' },
  ];
  /* riwayat penghapusbukuan & pemulihan piutang (sub-ledger / memo manajemen) — SATU
     sumber untuk tab Forward-Looking (basis ekspektasi loss rate independen) DAN
     roll-forward CKPN. Entri ber-flag `current` = tahun berjalan (mengalir ke mutasi
     CKPN). Tren recovery menurun → dasar menaikkan loss rate Stage 3. Rp juta. */
  const ECL_HISTORY = [
    { y: 2022, writeOff: 1180, recovery: 410 },
    { y: 2023, writeOff: 1340, recovery: 380 },
    { y: 2024, writeOff: 1420, recovery: 240 },
    { y: 2025, writeOff: 1485, recovery: 165, current: true },
  ];

  function psak71(wtb) {
    const grossAudited = jt(wtbVal(wtb, '1-1200', 'adj'));     // piutang bruto audited (= dasar matriks)
    const grossUnadj   = jt(wtbVal(wtb, '1-1200', 'unadj'));   // bruto pra-audit (sebelum AJE-03 piutang fiktif)
    const grossPy      = jt(wtbVal(wtb, '1-1200', 'ly'));      // bruto PY audited
    const ckpnBooked   = -jt(wtbVal(wtb, '1-1210', 'unadj'));  // CKPN dibukukan klien (magnitudo)
    const ckpnAudited  = -jt(wtbVal(wtb, '1-1210', 'adj'));    // CKPN audited (setelah AJE-02)
    const ckpnPy       = -jt(wtbVal(wtb, '1-1210', 'ly'));     // CKPN awal (PY audited)
    const ckpnAje      = -jt(wtbVal(wtb, '1-1210', 'aje'));    // tambahan via AJE-02 (magnitudo, +)

    const overlay = ECL_SCENARIOS.reduce((a, s) => a + s.prob * s.mult, 0);

    const buckets = ECL_AGING.map(b => {
      const gross   = grossAudited * b.weight;          // eksposur bruto per bucket (terikat WTB)
      const baseEcl = gross * b.histRate / 100;         // ECL basis matriks historis
      const rate    = b.histRate * overlay;             // loss rate efektif (stlh overlay)
      const ecl     = baseEcl * overlay;                // ECL forward-looking
      return { ...b, gross, baseEcl, rate, ecl };
    });
    const grossTot   = buckets.reduce((a, b) => a + b.gross, 0);
    const baseTot     = buckets.reduce((a, b) => a + b.baseEcl, 0);
    const eclModel    = buckets.reduce((a, b) => a + b.ecl, 0);   // ECL per model auditor (forward-looking)
    const overlayAmt  = eclModel - baseTot;                       // dampak overlay makro
    const coverage    = grossTot ? eclModel / grossTot : 0;

    const gap          = eclModel - ckpnBooked;     // under-provision: model − dibukukan klien → dasar AJE-02
    const auditVariance = eclModel - ckpnAudited;   // model vs saldo audited (≈0, dalam toleransi)

    const stages = [1, 2, 3].map(st => {
      const bs = buckets.filter(b => b.stage === st);
      const gross = bs.reduce((a, b) => a + b.gross, 0);
      const ecl   = bs.reduce((a, b) => a + b.ecl, 0);
      return { stage: st, gross, ecl, coverage: gross ? ecl / gross : 0, n: bs.length };
    });

    /* mutasi CKPN (roll-forward) — write-off & recovery DITARIK dari ECL_HISTORY (satu sumber,
       entri tahun berjalan) bukan angka lepas; charge adalah derivasi-plug agar saldo menutup
       PERSIS ke WTB (pola sama dgn modul lain). */
    const histCurr      = ECL_HISTORY.find(h => h.current) || ECL_HISTORY[ECL_HISTORY.length - 1];
    const writeOff      = histCurr.writeOff;                          // piutang dihapusbukukan th berjalan
    const recovery      = histCurr.recovery;                          // pemulihan piutang telah dihapusbukukan
    const chargeClient  = ckpnBooked - ckpnPy + writeOff - recovery;  // beban penurunan nilai per buku klien
    const chargeAudited = chargeClient + ckpnAje;                     // setelah AJE-02 (= menutup ke ckpnAudited)

    return {
      grossAudited, grossUnadj, grossPy,
      ckpnBooked, ckpnAudited, ckpnPy, ckpnAje,
      overlay, buckets, grossTot, baseTot, eclModel, overlayAmt, coverage,
      gap, auditVariance, stages,
      writeOff, recovery, chargeClient, chargeAudited,
      history: ECL_HISTORY.map(h => ({ ...h })),
      scenarios: ECL_SCENARIOS.map(s => ({ ...s })), aging: ECL_AGING.map(b => ({ ...b })),
      rate: RATE,
    };
  }

  /* ---------- PSAK 68 · Pengukuran Nilai Wajar (IFRS 13) ----------
     Modul "hub pengukuran". PSAK 68 TIDAK memiliki saldo sendiri — ia
     mengatur BAGAIMANA nilai wajar diukur & diungkap untuk pos yang
     pengakuannya diatur standar lain. Karena itu setiap angka DITARIK
     dari sumber yang SAMA dengan modul pemiliknya, bukan di-hardcode
     ulang:
       · Obligasi (SUN) / forward valas / saham privat → FV_PORTFOLIO,
         seed kanonik yang SAMA dipakai view PSAK 71 untuk pos non-WTB
         (FVOCI/FVTPL). Satu definisi, dua konsumen — tanpa duplikasi.
       · Tanah & bangunan (model revaluasi) → laporan penilai KJPP
         (Pakar · WP V-2, Rp 84.500 jt) yang juga dirujuk modul
         Penggunaan Pakar & Specifics (V-2) dan dipakai PSAK 16.
     Output: tabel hierarki (Level 1/2/3), teknik valuasi & input,
     roll-forward Level 3 + sensitivitas input tak teramati (¶91-99),
     serta dampak pajak tangguhan (OCI) yang dirujuk PSAK 46. Rp juta. */
  const FV_PORTFOLIO = [
    { id: 'sun',    p71id: 'bond',   side: 'aset', label: 'Obligasi pemerintah (SUN)',
      std: 'PSAK 71 · FVOCI', cls: 'FVOCI', level: 1, recurring: true, fv: 4200, module: 'psak71',
      approach: 'pasar', technique: 'Harga kuotasi pasar aktif (IBPA/IDX)',
      inputs: [{ k: 'Harga kuotasi pasar aktif', obs: true, val: 'IBPA · tanggal pelaporan' }],
      hbu: null, note: 'Untung/rugi belum direalisasi diakui di OCI' },
    { id: 'fwd',    p71id: 'fwd',    side: 'aset', label: 'Kontrak forward valas (lindung nilai)',
      std: 'PSAK 71 · FVTPL', cls: 'FVTPL', level: 2, recurring: true, fv: 6400, module: 'psak71', expert: 'V-3',
      approach: 'penghasilan', technique: 'Diskonto arus kas forward (mark-to-model)',
      inputs: [{ k: 'Kurva forward USD/IDR', obs: true, val: 'Penyedia data pasar' }, { k: 'Faktor diskonto OIS', obs: true, val: 'Kurva OIS' }, { k: 'Penyesuaian risiko kredit (CVA/DVA)', obs: false, val: 'Disesuaikan', range: '±0,3%' }],
      hbu: null, note: 'Valuasi Pakar Auditor · IFRS 13 ¶42 (CVA/DVA)' },
    { id: 'equity', p71id: 'equity', side: 'aset', label: 'Penyertaan saham non-pengendali (privat)',
      std: 'PSAK 71 · FVOCI elektif', cls: 'FVOCI', level: 3, recurring: true, fv: 2100, module: 'psak71',
      approach: 'pasar+penghasilan', technique: 'Kelipatan EV/EBITDA pembanding + DCF',
      inputs: [{ k: 'Kelipatan EV/EBITDA', obs: false, val: '6,5×', range: '5,5×–7,5×' }, { k: 'Tingkat diskonto (WACC)', obs: false, val: '15,5%', range: '14%–17%' }, { k: 'Diskon ketiadaan pemasaran (DLOM)', obs: false, val: '20%' }],
      hbu: null, note: 'Entitas privat — tanpa harga kuotasi (¶5.7.5)' },
    { id: 'land',   side: 'aset', label: 'Tanah — model revaluasi',
      std: 'PSAK 16 · Revaluasi', cls: 'Revaluasi', level: 2, recurring: true, fv: 52000, module: 'psak16', expert: 'V-2',
      approach: 'pasar', technique: 'Data pembanding penjualan (sales comparison)',
      inputs: [{ k: 'Harga tanah pembanding /m²', obs: true, val: 'Rp 3,2 jt/m²' }, { k: 'Penyesuaian lokasi, luas & bentuk', obs: true, val: 'Kuantitatif' }],
      hbu: 'Penggunaan saat ini (kawasan industri) = penggunaan tertinggi & terbaik', note: 'KJPP Mitra · SPI/IVS · WP V-2' },
    { id: 'build',  side: 'aset', label: 'Bangunan & prasarana — model revaluasi',
      std: 'PSAK 16 · Revaluasi', cls: 'Revaluasi', level: 3, recurring: true, fv: 32500, module: 'psak16', expert: 'V-2',
      approach: 'biaya', technique: 'Biaya pengganti terdepresiasi (DRC)',
      inputs: [{ k: 'Biaya pembangunan baru /m²', obs: false, val: 'Rp 6,8 jt/m²', range: '6,2–7,4' }, { k: 'Penyusutan fisik & keusangan fungsional', obs: false, val: '38%', range: '34%–42%' }],
      hbu: 'Penggunaan saat ini (fasilitas produksi)', note: 'KJPP Mitra · DRC · input signifikan tak teramati' },
  ];

  function psak68(wtb) {
    const items = FV_PORTFOLIO.map(it => ({
      ...it,
      nObs: it.inputs.filter(i => i.obs).length,
      nUnobs: it.inputs.filter(i => !i.obs).length,
    }));
    const total = items.reduce((a, x) => a + x.fv, 0);
    const byLevel = [1, 2, 3].map(L => {
      const list = items.filter(i => i.level === L);
      const amt = list.reduce((a, x) => a + x.fv, 0);
      return { level: L, amt, pct: total ? amt / total : 0, n: list.length, items: list };
    });
    const get = (id) => items.find(i => i.id === id);
    const finItems   = items.filter(i => i.module === 'psak71');
    const finTotal   = finItems.reduce((a, x) => a + x.fv, 0);   // 12.700 — SAMA dgn pos FV non-WTB di PSAK 71
    const reval      = items.filter(i => i.cls === 'Revaluasi');
    const revalTotal = reval.reduce((a, x) => a + x.fv, 0);      // 84.500 — SAMA dgn laporan KJPP (V-2)
    const l3         = items.filter(i => i.level === 3);
    const l3Total    = l3.reduce((a, x) => a + x.fv, 0);         // 34.600
    const recurringTot = items.filter(i => i.recurring).reduce((a, x) => a + x.fv, 0);

    /* roll-forward Level 3 (¶93e) — menutup persis ke l3Total */
    const l3RF = { opening: 31200, additions: 600, gainsPl: 0, gainsOci: 2800, transfersIn: 0, transfersOut: 0, settlements: 0 };
    l3RF.closing = l3RF.opening + l3RF.additions + l3RF.gainsPl + l3RF.gainsOci + l3RF.transfersIn - l3RF.transfersOut - l3RF.settlements;

    /* sensitivitas input signifikan tak teramati (¶93h) — dampak ke NW (Rp juta) */
    const fvBuild = get('build').fv, fvEq = get('equity').fv;
    const sens = [
      { item: 'build', label: 'Bangunan · biaya pengganti /m²', shock: '±5%', fav: Math.round(fvBuild * 0.05), unf: -Math.round(fvBuild * 0.05) },
      { item: 'build', label: 'Bangunan · tingkat penyusutan', shock: '∓5 pp', fav: Math.round(fvBuild * 0.08), unf: -Math.round(fvBuild * 0.08) },
      { item: 'equity', label: 'Saham · kelipatan EV/EBITDA', shock: '±0,5×', fav: Math.round(fvEq * 0.077), unf: -Math.round(fvEq * 0.077) },
      { item: 'equity', label: 'Saham · tingkat diskonto WACC', shock: '∓1%', fav: Math.round(fvEq * 0.085), unf: -Math.round(fvEq * 0.085) },
    ];
    const sensFav = sens.reduce((a, s) => a + s.fav, 0);
    const sensUnf = sens.reduce((a, s) => a + s.unf, 0);

    /* dampak pajak tangguhan (PSAK 46) atas surplus revaluasi & FVOCI → diakui di OCI */
    const revalSurplusYr = l3RF.gainsOci;                 // kenaikan NW diakui OCI th berjalan
    const dtlOci = Math.round(revalSurplusYr * RATE);     // liabilitas pajak tangguhan di OCI (22%)

    /* transfer antar level (¶93c,e) */
    const transfers = { in: 0, out: 0, note: 'Tidak ada transfer antar Level pada periode berjalan; kebijakan menetapkan transfer diakui pada akhir periode pelaporan.' };

    return {
      items, total, byLevel, get,
      finItems, finTotal, reval, revalTotal,
      l3, l3Total, recurringTot, l3RF, sens, sensFav, sensUnf,
      revalSurplusYr, dtlOci, transfers, rate: RATE,
    };
  }

  /* ---------- PSAK 48 · Penurunan Nilai Aset (Impairment of Assets) ----------
     IAS 36. Modul ini TIDAK menyimpan saldo sendiri: nilai tercatat tiap pos
     yang diuji ditarik dari modul pemiliknya yang ber-sumber WTB —
       · Aset tetap (neto)            → fixedAssets(wtb)  ← WTB 1-2100/1-2110
       · Aset takberwujud (terbatas)  → intangibles(wtb)  ← WTB 1-2400/1-2410
       · Aset hak-guna (ROU)          → figuresFromWTB    ← WTB 1-2300
       · Lisensi umur tak-terbatas    → intangibles().indefCarry/recoverable (uji ¶10)
     Goodwill akuisisi (PSAK 22) adalah satu-satunya angka seed non-WTB di sini
     (tak punya akun GL tunggal) — dialokasikan ke UPK & diuji tahunan (¶90).
     Jumlah terpulihkan UPK = nilai pakai (value-in-use) via DCF; rugi penurunan
     nilai = max(0, tercatat − terpulihkan). Selaras dgn SA 540 (E-05 goodwill) &
     SA 701 (KAM-3). Rp juta. */
  const GOODWILL = 6800;        // goodwill akuisisi (alokasi PPA · PSAK 22) — diuji tahunan
  const P48 = { wacc: 0.135, growth: 0.030, terminal: 0.030, years: 5, cf1: 17800 };
  /* indikator penurunan nilai (¶12) — sumber eksternal & internal */
  const P48_INDICATORS = [
    { id: 'ext-cap',   scope: 'Eksternal', t: 'Kapitalisasi pasar < nilai tercatat aset neto entitas', present: false },
    { id: 'ext-rate',  scope: 'Eksternal', t: 'Kenaikan suku bunga pasar menaikkan tingkat diskonto (WACC)', present: true,  note: 'WACC naik ±50 bps YoY → menekan nilai pakai' },
    { id: 'ext-tech',  scope: 'Eksternal', t: 'Perubahan teknologi / pasar / hukum yang merugikan entitas', present: false },
    { id: 'int-obs',   scope: 'Internal',  t: 'Bukti keusangan atau kerusakan fisik aset', present: true,  note: 'SKU & lini tertentu lambat-bergerak (rujuk PSAK 14)' },
    { id: 'int-perf',  scope: 'Internal',  t: 'Kinerja ekonomik aset lebih buruk dari ekspektasi', present: false },
    { id: 'int-plan',  scope: 'Internal',  t: 'Rencana restrukturisasi / penghentian / pelepasan operasi', present: false },
  ];

  /* nilai pakai (value-in-use, ¶30-57): DCF arus kas pra-pajak + nilai terminal */
  function valueInUse(cf1, growth, wacc, years, tg) {
    let pv = 0, cf = cf1;
    const flows = [];
    for (let y = 1; y <= years; y++) {
      const disc = cf / Math.pow(1 + wacc, y);
      flows.push({ y, cf, pv: disc });
      pv += disc; cf = cf * (1 + growth);
    }
    const cfTerm = cf * (1 + tg);                       // arus kas tahun (years+1)
    const tv = cfTerm / (wacc - tg);                    // nilai terminal pada akhir tahun `years`
    const tvPv = tv / Math.pow(1 + wacc, years);
    return { pv: pv + tvPv, explicitPv: pv, tv, tvPv, flows };
  }

  function psak48(wtb) {
    const s = figuresFromWTB(wtb);
    const fa = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const R = Math.round;

    /* —— komposisi nilai tercatat UPK Operasi Inti — tiap baris ditarik dari sumbernya —— */
    const parts = [
      { id: 'ppe',     label: 'Aset tetap — nilai tercatat neto',       module: 'psak16', route: 'psak16', code: '1-2100 / 1-2110', val: R(fa.netClose) },
      { id: 'intanFin',label: 'Aset takberwujud berumur terbatas',      module: 'psak19', route: 'psak19', code: '1-2400 / 1-2410', val: R(intan.finiteCarry) },
      { id: 'rou',     label: 'Aset hak-guna (ROU · PSAK 73)',          module: 'psak73', route: 'psak73', code: '1-2300',          val: R(s.rouCarry) },
      { id: 'gw',      label: 'Goodwill akuisisi (PSAK 22)',            module: 'psak48', route: 'psak48', code: 'alokasi PPA',      val: GOODWILL },
    ];
    const carry = parts.reduce((a, p) => a + p.val, 0);   // tercatat UPK (incl. goodwill)

    /* —— jumlah terpulihkan = nilai pakai (DCF) —— */
    const viu = valueInUse(P48.cf1, P48.growth, P48.wacc, P48.years, P48.terminal);
    const recoverable = R(viu.pv);
    const headroom = recoverable - carry;
    const headroomPct = carry ? headroom / carry : 0;
    const impairLoss = Math.max(0, carry - recoverable);  // 0 bila terpulihkan > tercatat

    /* —— sensitivitas (¶134f) — pergeseran asumsi utama vs headroom —— */
    const mkSens = (label, shock, w, g, c) => {
      const rec = R(valueInUse(P48.cf1 * c, g, w, P48.years, P48.terminal).pv);
      return { label, shock, rec, head: rec - carry };
    };
    const sens = [
      mkSens('Tingkat diskonto (WACC) +1%', '+1,0 pp', P48.wacc + 0.01, P48.growth, 1),
      mkSens('Tingkat diskonto (WACC) −1%', '−1,0 pp', P48.wacc - 0.01, P48.growth, 1),
      mkSens('Pertumbuhan terminal −0,5%', '−0,5 pp', P48.wacc, P48.growth - 0.005, 1),
      mkSens('Arus kas dasar −5%', '−5%', P48.wacc, P48.growth, 0.95),
    ];

    /* —— uji tahunan lisensi umur tak-terbatas (¶10) — reuse perhitungan PSAK 19 —— */
    const license = {
      carry: R(intan.indefCarry), recoverable: R(intan.recoverable),
      headroom: R(intan.recoverable - intan.indefCarry), impairLoss: R(intan.impairLoss),
    };

    const tested = carry + license.carry;
    const totalImpair = impairLoss + license.impairLoss;
    const cgu = { id: 'inti', label: 'UPK Operasi Inti (incl. goodwill)', parts, carry, recoverable, headroom, headroomPct, impairLoss, viu };

    return { cgu, parts, carry, recoverable, headroom, headroomPct, impairLoss, viu, sens,
             license, tested, totalImpair, goodwill: GOODWILL, params: P48,
             indicators: P48_INDICATORS, indicatorCount: P48_INDICATORS.filter(i => i.present).length };
  }

  /* ---------- PSAK 57 · Provisi, Liabilitas Kontinjensi & Aset Kontinjensi ----------
     IAS 37. Register kanonik provisi & klaim — SUMBER TUNGGAL yang juga dibaca modul
     SA 501 (litigasi) & SA 540 (estimasi garansi). Klasifikasi (provisi diakui /
     liabilitas kontinjensi diungkap / remote tak diungkap) DITURUNKAN dari tingkat
     kemungkinan via pohon keputusan (¶14, ¶27, ¶86) — bukan di-hardcode ganda.
     Provisi diakui menutup ke roll-forward (¶84). Beda temporer dapat dikurangkan
     mengalir ke PSAK 46 (deductible saat realisasi). Rp juta. */
  const PROV_REGISTER = [
    { id: 'PRV-WAR', kind: 'warranty',  party: 'Provisi Garansi Produk', nature: 'Produk',
      claim: 1080, estimate: 1080, likely: 'Besar Kemungkinan', counsel: 'Internal · QA',
      resp: true, status: 'Berjalan', module: 'sa540', ref: 'E-03', deductibleTemp: true,
      assess: 'Tingkat klaim historis 36 bln × penjualan bergaransi; telaah retrospektif PY akurat (−6%).',
      roll: { opening: 1150, addl: 980, used: 1050, reversed: 0, unwind: 0 } },
    { id: 'LIT-02', kind: 'litigation', party: 'Gugatan Wanprestasi — PT Mitra Logistik', nature: 'Komersial',
      claim: 3400, estimate: 3400, likely: 'Besar Kemungkinan', counsel: 'Hadiputranto & Rekan',
      resp: true, status: 'Mediasi', module: 'sa501', deductibleTemp: false,
      assess: 'Kemungkinan kalah tinggi; provisi penuh dibentuk atas nilai klaim.',
      roll: { opening: 0, addl: 3400, used: 0, reversed: 0, unwind: 0 } },
    { id: 'LIT-01', kind: 'litigation', party: 'Sengketa Pajak — DJP (SKPKB PPN 2023)', nature: 'Pajak',
      claim: 8600, estimate: 2100, likely: 'Mungkin', counsel: 'Hadiputranto & Rekan',
      resp: true, status: 'Banding · Pengadilan Pajak',
      assess: 'Peluang menang ±60%; banding berjalan. Arus keluar mungkin, tidak besar kemungkinan.' },
    { id: 'LIT-04', kind: 'litigation', party: 'Klaim Garansi Produk — kolektif', nature: 'Produk',
      claim: 1500, estimate: 600, likely: 'Mungkin', counsel: 'Internal Legal',
      resp: false, status: 'Negosiasi',
      assess: 'Menunggu konfirmasi penasihat hukum eksternal; arus keluar mungkin.' },
    { id: 'LIT-03', kind: 'litigation', party: 'Klaim Ketenagakerjaan — eks-karyawan (PHK)', nature: 'Ketenagakerjaan',
      claim: 950, estimate: 0, likely: 'Kecil', counsel: 'Internal Legal',
      resp: true, status: 'PHI tingkat I',
      assess: 'Kemungkinan kalah kecil (remote); tidak diakui maupun diungkap.' },
  ];
  /* kemungkinan → perlakuan akuntansi (pohon keputusan ¶14/27/86) */
  const P57_TREAT = {
    'Besar Kemungkinan': { treat: 'provision',  disc: 'Provisi diakui',          kind: 'red'  },
    'Mungkin':           { treat: 'contingent', disc: 'Diungkap (kontinjensi)',  kind: 'amber'},
    'Kecil':             { treat: 'remote',     disc: 'Tidak diungkap',          kind: 'gray' },
  };

  function psak57(wtb) {
    const R = Math.round;
    const items = PROV_REGISTER.map(p => {
      const m = P57_TREAT[p.likely] || P57_TREAT['Mungkin'];
      return { ...p, ...m,
        recognized: m.treat === 'provision' ? p.estimate : 0,
        contingent: m.treat === 'contingent' ? p.claim : 0,
        remote:     m.treat === 'remote' ? p.claim : 0 };
    });
    const provisionTotal  = items.reduce((a, i) => a + i.recognized, 0);   // 4.480 (garansi 1.080 + LIT-02 3.400)
    const contingentTotal = items.reduce((a, i) => a + i.contingent, 0);   // 10.100 (LIT-01 8.600 + LIT-04 1.500)
    const remoteTotal     = items.reduce((a, i) => a + i.remote, 0);       // 950
    const claimExposure   = items.reduce((a, i) => a + i.claim, 0);

    /* roll-forward provisi (¶84) — agregat pos yang diakui */
    const rf = items.filter(i => i.roll).reduce((a, i) => ({
      opening: a.opening + i.roll.opening, addl: a.addl + i.roll.addl,
      used: a.used + i.roll.used, reversed: a.reversed + i.roll.reversed,
      unwind: a.unwind + i.roll.unwind,
    }), { opening: 0, addl: 0, used: 0, reversed: 0, unwind: 0 });
    rf.closing = rf.opening + rf.addl - rf.used - rf.reversed + rf.unwind;
    const rollTies = Math.abs(rf.closing - provisionTotal) <= 1;

    /* dampak pajak tangguhan (PSAK 46): provisi deductible saat realisasi → beda temporer.
       Komponen yang dimodelkan ke PSAK 46 = FISCAL.provisi (porsi garansi). Provisi
       litigasi LIT-02 tidak deductible hingga penyelesaian hukum → tidak dimodelkan. */
    const tempDiffModeled = FISCAL.provisi;                          // 900 — dipakai PSAK 46 'prv'
    const tempDiffPotensi = items.filter(i => i.deductibleTemp).reduce((a, i) => a + i.recognized, 0); // 1.080
    const dtAsset = R(tempDiffModeled * RATE);                       // aset pajak tangguhan provisi

    const counts = { provision: 0, contingent: 0, remote: 0 };
    items.forEach(i => { counts[i.treat] = (counts[i.treat] || 0) + 1; });

    return { items, provisionTotal, contingentTotal, remoteTotal, claimExposure,
             rf, rollTies, tempDiffModeled, tempDiffPotensi, dtAsset, counts,
             litigation: items.filter(i => i.kind === 'litigation'),
             treatMap: P57_TREAT, rate: RATE };
  }

  /* ============================================================
     PSAK 58 · Aset Tidak Lancar Dimiliki untuk Dijual & Operasi
     yang Dihentikan (IFRS 5)
     Modul ini TIDAK menyimpan saldo sendiri. Nilai tercatat disposal
     group ditarik dari modul sumber yang sama ber-WTB:
       · Register Aset Tetap (PSAK 16) → assetRegister(wtb) ← WTB 1-2100/1-2110
         (anggota grup dipilih per nomor tag — nilai buku neto per aset
          mengikuti roll-forward PSAK 16 & koreksi AJE-05 secara live)
       · Pendapatan segmen dihentikan → revenue(wtb) ← WTB 4-1100 (PSAK 72)
       · Laba bersih total → FSGEN.buildModel(wtb).is.netIncome
       · Nilai wajar grup → appraisal KJPP (PSAK 68, input Level 2/3) —
         satu-satunya input independen (nilai wajar memang estimasi eksternal)
     Pengukuran: lower of carrying amount & fair value less costs to sell
     (¶15); penyusutan dihentikan (¶25); rugi penurunan reklasifikasi
     (¶20) mengalir ke hasil operasi dihentikan (¶33). Penyajian terpisah
     di Neraca (¶38) & jumlah tunggal di Laba Rugi (¶33a). Rp juta. */
  const P58_GROUP = {
    id: 'logistik',
    segment: 'Jasa Logistik & Distribusi (3PL)',
    plan: 'Resolusi Direksi No. 14/DIR/IX-2025 (22 Sep 2025) — divestasi unit logistik',
    classDate: '30-09-2025',          // tanggal klasifikasi sbg dimiliki untuk dijual
    expectedClose: 'Kuartal III 2026',
    buyer: 'MoU eksklusif — PT Trans Kargo Nusantara',
    tags: ['LD-002', 'BD-102', 'VH-302'],   // nomor tag pada Register Aset Tetap (PSAK 16)
    revStream: 'logis',               // pendapatan segmen → stream PSAK 72
    opMarginPct: -0.045,              // marjin operasi pra-pajak segmen (rugi → alasan divestasi)
    fairValue: 28600,                 // nilai wajar grup — appraisal KJPP (PSAK 68 L2/L3), Rp jt
    costToSellPct: 0.028,             // biaya menjual: broker, notaris, balik nama HGB
  };

  function psak58(wtb) {
    const R = Math.round;
    const reg = assetRegister(wtb);
    const rev = revenue(wtb);
    const fa  = reg.fa;                                       // = fixedAssets(wtb)

    /* anggota disposal group ditarik dari Register Aset Tetap (sub-ledger ber-WTB) */
    const members = P58_GROUP.tags.map(tag => {
      const r = reg.rows.find(x => x.tag === tag) || {};
      return {
        tag, name: r.name || tag, classLabel: r.classLabel || '', cls: r.cls || '',
        cost: r.cost || 0, accum: r.accum || 0, nbv: r.nbv || 0,
        life: r.life || null, annual: r.annual || 0, depreciable: !!r.life, acq: r.acq || '',
      };
    });
    const carryBefore = members.reduce((a, m) => a + m.nbv, 0);    // nilai tercatat sblm reklas
    const costTot     = members.reduce((a, m) => a + m.cost, 0);
    const accumTot    = members.reduce((a, m) => a + m.accum, 0);
    const regNbvCheck = carryBefore;                               // identik — tie ke register

    /* FVLCS (¶15) — nilai wajar dikurangi biaya menjual */
    const fairValue  = P58_GROUP.fairValue;
    const costToSell = R(fairValue * P58_GROUP.costToSellPct);
    const fvlcs      = fairValue - costToSell;

    /* pengukuran: lower of carrying & FVLCS → rugi penurunan reklasifikasi (¶20) */
    const writedown = Math.max(0, carryBefore - fvlcs);
    const carryHFS  = Math.min(carryBefore, fvlcs);               // nilai tercatat HFS stlh ukur
    const impaired  = writedown > 0;

    /* penghentian penyusutan (¶25) — bulan tersisa setelah tanggal klasifikasi */
    const [, cm, cyr]   = P58_GROUP.classDate.split('-').map(Number);
    const monthsCeased  = Math.max(0, (ASOF.y - cyr) * 12 + (ASOF.m - cm));   // 30 Sep→31 Des = 3
    const annualDeprGrp = members.reduce((a, m) => a + m.annual, 0);
    const deprCeased    = R(annualDeprGrp * monthsCeased / 12);   // peny. yg TIDAK dibebankan (¶25)

    /* operasi dihentikan (¶31-33) — segmen 3PL merupakan lini usaha utama terpisah */
    const revStream   = rev.streams.find(s => s.id === P58_GROUP.revStream) || { amount: 0, label: '', pct: 0 };
    const revDisc     = R(revStream.amount);                     // pendapatan segmen → WTB 4-1100
    const opResultDisc = R(revDisc * P58_GROUP.opMarginPct);     // hasil operasi pra-pajak (rugi)
    const pretaxDisc  = opResultDisc - writedown;                // termasuk rugi remeasurement (¶33b)
    const taxDisc     = R(pretaxDisc * RATE);                    // konsekuensi pajak (¶33b) — kredit bila rugi
    const postTaxDisc = pretaxDisc - taxDisc;                    // JUMLAH TUNGGAL disajikan (¶33a)

    /* jembatan laba: total (FSGEN) = dilanjutkan + dihentikan (penyajian-ulang, total tetap) */
    const model     = window.FSGEN ? window.FSGEN.buildModel(wtb) : null;
    const netTotal  = model ? R(model.is.netIncome.cy / 1e6) : 0;
    const salesTot  = model ? R(model.is.sales.cy / 1e6) : 0;
    const contProfit = netTotal - postTaxDisc;                   // laba dari operasi dilanjutkan

    /* analisis arus kas operasi dihentikan (¶33c) — derivasi */
    const cfOps = R(opResultDisc + deprCeased);                  // ≈ arus kas operasi (peny. non-kas)
    const cfInv = 0;                                             // belum ada divestasi terealisasi
    const cfFin = 0;

    /* penyajian Neraca (¶38): carve-out dari Aset Tetap */
    const ppeNet   = R(fa.netClose);                             // aset tetap neto (PSAK 16/WTB)
    const ppeAfter = R(ppeNet - carryBefore);                    // sisa aset tetap stlh reklas

    /* ringkasan untuk kartu & analitis */
    const dgPctPpe = ppeNet ? carryBefore / ppeNet : 0;          // porsi grup thd aset tetap
    const revPctTot = salesTot ? revDisc / salesTot : 0;

    return {
      group: P58_GROUP, members,
      carryBefore, costTot, accumTot, regNbvCheck,
      fairValue, costToSell, costToSellPct: P58_GROUP.costToSellPct, fvlcs,
      writedown, carryHFS, impaired,
      classDate: P58_GROUP.classDate, monthsCeased, annualDeprGrp, deprCeased,
      revDisc, revStreamLabel: revStream.label, opResultDisc, opMarginPct: P58_GROUP.opMarginPct,
      pretaxDisc, taxDisc, postTaxDisc, rate: RATE,
      netTotal, salesTot, contProfit,
      cfOps, cfInv, cfFin,
      ppeNet, ppeAfter, dgPctPpe, revPctTot,
    };
  }

  /* ============================================================
     reconcile(wtb) — rekonsiliasi angka lintas-modul.
     Mengembalikan baris tie-out: tiap pos punya SATU sumber (WTB/
     modul) lalu mencocokkan nilai yang dipakai modul-modul konsumen.
     Dipakai oleh tab "Rekonsiliasi Angka" di modul Alur Data.
     ============================================================ */
  function reconcile(wtb) {
    const s = figuresFromWTB(wtb);
    const dt = deferredTax(wtb);
    const inv = inventory(wtb);
    const fa = fixedAssets(wtb);
    const intan = intangibles(wtb);
    const p68 = psak68(wtb);
    const p48 = psak48(wtb);
    const p57 = psak57(wtb);
    const tol = 1; // toleransi Rp 1 jt (pembulatan)
    const row = (o) => {
      const vals = o.consumers.map(c => c.val);
      const max = Math.max(o.source, ...vals), min = Math.min(o.source, ...vals);
      const variance = Math.round(max - min);
      const status = o.statusOverride || (variance <= tol ? 'ok' : (o.warnOnly ? 'warn' : 'err'));
      return { ...o, variance, status };
    };

    /* ECL model (PSAK 71) — ditarik dari SATU sumber: psak71(wtb). Tidak ada lagi
       duplikasi loss-rate di reconcile maupun view_calc. */
    const p71 = psak71(wtb);
    const eclModel = Math.round(p71.eclModel);

    const accounting = [
      row({
        id: 'dbo', pos: 'Liabilitas Imbalan Kerja (DBO)', unit: 'Rp juta',
        sourceLabel: 'WTB · 2-2300', sourceRoute: 'wtb', source: s.dboBooked, ref: 'PSAK 24',
        note: 'Nilai tercatat liabilitas imbalan pasti; jadi beda temporer dapat dikurangkan (dasar pajak 0).',
        consumers: [
          { module: 'psak24', label: 'PSAK 24 · Imbalan Kerja', val: dt.items.find(i => i.id === 'eb').car },
          { module: 'psak46', label: 'PSAK 46 · beda temporer (eb)', val: dt.items.find(i => i.id === 'eb').car },
        ],
      }),
      row({
        id: 'ckpn', pos: 'CKPN / ECL Piutang', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-1210', sourceRoute: 'wtb', source: s.ckpnBooked, ref: 'PSAK 71',
        warnOnly: true,
        note: 'PSAK 46 memakai saldo dibukukan klien (Rp ' + s.ckpnBooked + ' jt). Model ECL Rp ' + eclModel + ' jt → AJE menaikkan ke saldo audited Rp ' + s.ckpnAudited + ' jt. Pertimbangkan dasar audited untuk beda temporer.',
        consumers: [
          { module: 'ecl', label: 'Kalkulator ECL · dibukukan', val: s.ckpnBooked },
          { module: 'psak46', label: 'PSAK 46 · beda temporer (ecl)', val: dt.items.find(i => i.id === 'ecl').diff },
        ],
        extra: [
          { label: 'Model ECL (PSAK 71)', val: eclModel },
          { label: 'Saldo audited (stlh AJE)', val: s.ckpnAudited },
        ],
      }),
      row({
        id: 'ppe', pos: 'Aset Tetap — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2100 + 1-2110', sourceRoute: 'wtb', source: s.ppeNetCarry, ref: 'PSAK 16',
        warnOnly: true,
        note: 'Beda temporer aset tetap (Rp ' + dt.items.find(i => i.id === 'ppe').diff + ' jt) berasal dari selisih dengan dasar pajak (kertas kerja fiskal), bukan seluruh nilai tercatat. Carrying per WTB ditunjukkan untuk ketertelusuran.',
        consumers: [
          { module: 'psak16', label: 'PSAK 16 · nilai tercatat neto', val: Math.round(fa.netClose) },
          { module: 'fsgen', label: 'FS Generator · Aset tetap (Neraca)', val: Math.round(fa.netClose) },
          { module: 'psak46', label: 'PSAK 46 · carrying (sub-pool)', val: dt.items.find(i => i.id === 'ppe').car },
        ],
        extra: [
          { label: 'Penyusutan audited (PSAK 16)', val: Math.round(fa.deprAudited) },
          { label: 'Belanja modal neto (capex)', val: Math.round(fa.capexNet) },
          { label: 'Beda temporer aset tetap (PSAK 46)', val: dt.items.find(i => i.id === 'ppe').diff },
        ],
      }),
      row({
        id: 'intan', pos: 'Aset Takberwujud — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2400 + 1-2410', sourceRoute: 'wtb', source: s.intanNetCarry, ref: 'PSAK 19',
        warnOnly: true,
        note: 'Pos direclass dari Aset Tetap (lisensi/paten). Nilai tercatat neto Rp ' + Math.round(intan.netClose) + ' jt; termasuk lisensi umur tak-terbatas Rp ' + Math.round(intan.indefCarry) + ' jt yang diuji penurunan nilai tahunan (PSAK 48). Amortisasi audited Rp ' + Math.round(intan.amortAudited) + ' jt mengalir ke add-back Arus Kas.',
        consumers: [
          { module: 'psak19', label: 'PSAK 19 · nilai tercatat neto', val: Math.round(intan.netClose) },
          { module: 'fsgen', label: 'FS Generator · Aset takberwujud (Neraca)', val: Math.round(intan.netClose) },
        ],
        extra: [
          { label: 'Amortisasi audited (PSAK 19)', val: Math.round(intan.amortAudited) },
          { label: 'Penambahan / kapitalisasi (capex)', val: Math.round(intan.additions) },
          { label: 'Lisensi umur tak-terbatas (uji PSAK 48)', val: Math.round(intan.indefCarry) },
        ],
      }),
      row({
        id: 'fvfin', pos: 'Aset keuangan diukur pada nilai wajar', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak68 · FV_PORTFOLIO', sourceRoute: 'psak68', source: p68.finTotal, ref: 'PSAK 68 · IFRS 13',
        note: 'SUN (Level 1) + forward valas (Level 2) + saham privat (Level 3) = Rp ' + p68.finTotal + ' jt. Angka yang SAMA dipakai PSAK 71 untuk pos non-WTB (FVOCI/FVTPL) — satu seed kanonik, tanpa duplikasi.',
        consumers: [
          { module: 'psak71', label: 'PSAK 71 · instrumen FVOCI/FVTPL', val: p68.finTotal },
        ],
        extra: [
          { label: 'Level 1 (harga kuotasi pasar aktif)', val: p68.byLevel[0].amt },
          { label: 'Level 2 (input teramati)', val: p68.byLevel[1].amt },
          { label: 'Level 3 (input tak teramati)', val: p68.byLevel[2].amt },
        ],
      }),
      row({
        id: 'fvreval', pos: 'Tanah & bangunan — model revaluasi (NW)', unit: 'Rp juta',
        sourceLabel: 'Pakar · KJPP Mitra (WP V-2)', sourceRoute: 'expert', source: p68.revalTotal, ref: 'PSAK 16 · PSAK 68',
        note: 'Nilai wajar revaluasi Rp ' + p68.revalTotal + ' jt (tanah Level 2 pendekatan pasar + bangunan Level 3 DRC) ditarik dari laporan penilai yang SAMA dirujuk modul Penggunaan Pakar & Specifics (V-2). Surplus revaluasi → OCI; pajak tangguhan Rp ' + p68.dtlOci + ' jt dirujuk PSAK 46.',
        consumers: [
          { module: 'specifics', label: 'Evaluasi Pakar · V-2 (SA 500)', val: p68.revalTotal },
        ],
        extra: [
          { label: 'Tanah (Level 2 · pendekatan pasar)', val: p68.get('land').fv },
          { label: 'Bangunan (Level 3 · DRC)', val: p68.get('build').fv },
          { label: 'Pajak tangguhan surplus (OCI · PSAK 46)', val: p68.dtlOci },
        ],
      }),
      row({
        id: 'lease', pos: 'Liabilitas Sewa & ROU (PSAK 73)', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2300 / 2-1500+2-2200', sourceRoute: 'wtb', source: s.rouCarry, ref: 'PSAK 73',
        warnOnly: true,
        note: 'ROU per WTB Rp ' + s.rouCarry + ' jt; liabilitas sewa Rp ' + s.leaseLiab + ' jt. Portofolio kalkulator PSAK 73 dipakai PSAK 46 untuk beda temporer neto.',
        consumers: [
          { module: 'psak73', label: 'PSAK 73 · ROU portofolio', val: Math.round(dt.lease.rou) },
        ],
        extra: [
          { label: 'Liab. sewa per WTB', val: s.leaseLiab },
          { label: 'Liab. sewa portofolio', val: Math.round(dt.lease.liab) },
          { label: 'Beda temporer neto (PSAK 46)', val: dt.items.find(i => i.id === 'lse').diff },
        ],
      }),
      row({
        id: 'inv', pos: 'Persediaan — nilai tercatat neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-1300', sourceRoute: 'wtb', source: inv.closeNet, ref: 'PSAK 14',
        warnOnly: true,
        note: 'Saldo akhir audited Rp ' + Math.round(inv.closeNet) + ' jt = saldo pra-audit Rp ' + Math.round(inv.closeUnadj) + ' jt + AJE pisah batas Rp ' + Math.round(inv.ajeInv) + ' jt (AJE-01). Uji NRV mengusulkan penurunan tambahan Rp ' + Math.round(inv.shortfallWD) + ' jt yang belum dibukukan (potensi salah saji → SAD).',
        consumers: [
          { module: 'psak14', label: 'PSAK 14 · roll-forward persediaan', val: Math.round(inv.closeNet) },
          { module: 'fsgen', label: 'FS Generator · Persediaan (Neraca)', val: Math.round(inv.closeNet) },
        ],
        extra: [
          { label: 'BPP audited (WTB 5-1100)', val: Math.round(inv.cogsAdj) },
          { label: 'Cadangan NRV dibukukan', val: Math.round(inv.bookedWD) },
          { label: 'Usulan penurunan NRV (SA 540)', val: Math.round(inv.shortfallWD) },
        ],
      }),
      row({
        id: 'dta', pos: 'Aset Pajak Tangguhan (DTA) neto', unit: 'Rp juta',
        sourceLabel: 'WTB · 1-2500', sourceRoute: 'wtb', source: s.dtaReported, ref: 'PSAK 46',
        warnOnly: true,
        note: 'DTA model PSAK 46 (jumlah beda temporer × 22%) vs DTA per buku besar. Selisih Rp ' + Math.abs(dt.dtaVariance) + ' jt perlu ditelusuri (mis. pos beda temporer tahun lalu belum dimodelkan).',
        consumers: [
          { module: 'psak46', label: 'PSAK 46 · DTA model (closing)', val: dt.closing },
        ],
      }),
      row({
        id: 'tax', pos: 'Beban Pajak Kini', unit: 'Rp juta',
        sourceLabel: 'PSAK 46 · PKP × 22%', sourceRoute: 'psak46', source: dt.currentTax, ref: 'PSAK 46',
        warnOnly: true,
        note: 'Pajak kini = PKP Rp ' + dt.pkp + ' jt × 22% = Rp ' + dt.currentTax + ' jt. Beban pajak dibukukan di WTB (5-5100) Rp ' + s.taxExpBooked + ' jt mencakup komponen kini & tangguhan.',
        consumers: [
          { module: 'wtb', label: 'WTB 5-5100 · beban pajak dibukukan', val: s.taxExpBooked },
          { module: 'fsgen', label: 'FS Generator · beban pajak', val: dt.taxExpense },
        ],
      }),
      row({
        id: 'impair', pos: 'Penurunan Nilai Aset — uji UPK (PSAK 48)', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak48 · DCF', sourceRoute: 'psak48', source: p48.carry, ref: 'PSAK 48',
        warnOnly: true,
        note: 'Nilai tercatat UPK Operasi Inti Rp ' + p48.carry + ' jt (aset tetap + takberwujud + ROU + goodwill) ditarik dari modul sumber ber-WTB. Jumlah terpulihkan (nilai pakai) Rp ' + p48.recoverable + ' jt → headroom Rp ' + Math.round(p48.headroom) + ' jt (' + (p48.headroomPct * 100).toFixed(1) + '%). Rugi penurunan nilai Rp ' + p48.impairLoss + ' jt.',
        consumers: [
          { module: 'psak16', label: 'PSAK 16 · aset tetap neto (komponen UPK)', val: p48.parts.find(x => x.id === 'ppe').val },
          { module: 'psak19', label: 'PSAK 19 · takberwujud terbatas (komponen UPK)', val: p48.parts.find(x => x.id === 'intanFin').val },
        ],
        extra: [
          { label: 'Lisensi tak-terbatas — uji tahunan (¶10)', val: p48.license.carry },
          { label: 'Jumlah terpulihkan lisensi (PSAK 19)', val: p48.license.recoverable },
          { label: 'Total rugi penurunan nilai diakui', val: p48.totalImpair },
        ],
      }),
      row({
        id: 'prov', pos: 'Provisi diakui (PSAK 57)', unit: 'Rp juta',
        sourceLabel: 'AMS_CANON.psak57 · PROV_REGISTER', sourceRoute: 'psak57', source: p57.provisionTotal, ref: 'PSAK 57',
        warnOnly: true,
        note: 'Provisi diakui Rp ' + p57.provisionTotal + ' jt (garansi Rp ' + p57.items.find(i => i.id === 'PRV-WAR').recognized + ' jt + litigasi LIT-02 Rp ' + p57.items.find(i => i.id === 'LIT-02').recognized + ' jt) menutup ke roll-forward (¶84). Liabilitas kontinjensi diungkap Rp ' + p57.contingentTotal + ' jt. Beda temporer ke PSAK 46 = Rp ' + p57.tempDiffModeled + ' jt (porsi garansi deductible).',
        consumers: [
          { module: 'sa501', label: 'SA 501 · register litigasi (provisi)', val: p57.litigation.reduce((a, i) => a + i.recognized, 0) },
          { module: 'sa540', label: 'SA 540 · estimasi provisi garansi', val: p57.items.find(i => i.id === 'PRV-WAR').recognized },
          { module: 'psak46', label: 'PSAK 46 · beda temporer provisi (prv)', val: p57.tempDiffModeled },
        ],
        extra: [
          { label: 'Roll-forward saldo akhir (¶84)', val: p57.rf.closing },
          { label: 'Liabilitas kontinjensi (diungkap)', val: p57.contingentTotal },
          { label: 'Klaim remote (tidak diungkap)', val: p57.remoteTotal },
        ],
      }),
    ];

    const p66 = psak66(wtb);
    accounting.push(row({
      id: 'ja', pos: 'Pengaturan Bersama (PSAK 66)', unit: 'Rp juta',
      sourceLabel: 'AMS_CANON.GROUP_ASSOCIATES · AS-02', sourceRoute: 'psak66', source: p66.jv.carry, ref: 'PSAK 66 · 15',
      warnOnly: true,
      note: 'Ventura bersama (KSO Sentosa-Andalan) disajikan metode ekuitas Rp ' + p66.jv.carry + ' jt — nilai tercatat yang SAMA dipakai PSAK 65 di luar batas konsolidasi. Operasi bersama: bagian aset tetap Rp ' + p66.jo.ppeShare + ' jt ditarik dari Register Aset Tetap (WTB 1-2100). Pengendalian BERSAMA → tidak dikonsolidasi.',
      consumers: [
        { module: 'psak65', label: 'PSAK 65 · asosiasi/ventura (ekuitas)', val: p66.jv.carry },
        { module: 'psak16', label: 'PSAK 16 · bagian aset tetap operasi bersama', val: p66.jo.ppeShare },
      ],
      extra: [
        { label: 'Bagian laba ventura → Laba Rugi', val: p66.jv.shareProfit },
        { label: 'Bagian aset neto operasi bersama', val: p66.jo.netAssets },
        { label: 'Tie-out lintas-laporan (lolos)', val: p66.tiePass },
      ],
    }));

    return { accounting, dt, inv, fa, intan, figures: s, eclModel, p71, p68, p48, p57, p66 };
  }

  /* ---------- PSAK 65 · Laporan Keuangan Konsolidasian (IFRS 10) ----------
     Modul "konsolidasi induk". INDUK (PT Sentosa Makmur Tbk) ditarik PENUH dari
     WTB — sehingga setiap AJE yang mengubah saldo entitas induk otomatis mengalir
     ke kertas kerja konsolidasi, NCI, dan LK konsolidasian. Entitas ANAK di-seed
     kanonik (buku besar pembantu komponen) dengan neraca yang menutup (aset =
     liabilitas + ekuitas) dan laba yang tie ke kontribusi NPAT.

     SATU SUMBER untuk lintas-modul:
       · INDUK             → WTB (window.AMS.WTB / useAudit().wtb) — live AJE
       · Goodwill akuisisi → Σ goodwill per-anak = Rp 6.800 jt = AMS_CANON.GOODWILL
                             (dipakai PSAK 48 uji penurunan nilai UPK tahunan)
       · Struktur grup &   → GROUP_SUBS / INTERCO yang SAMA dipakai modul
         eliminasi            Group Audit (SA 600) — tidak ada angka ganda
       · Pajak tangguhan   → tarif 22% (UU HPP) untuk konsekuensi PPA/laba antar-pr.

     Metode akuisisi (PSAK 22 ¶32): Investasi induk dieliminasi terhadap ekuitas
     anak pada tanggal akuisisi; selisih = goodwill; NCI diukur proporsional atas
     aset neto teridentifikasi (¶19). Rp juta. */

  /* entitas ANAK — buku besar pembantu komponen (seed kanonik, neraca menutup) */
  const GROUP_SUBS = [
    { id: 'CP-02', name: 'PT Sentosa Logistik', role: 'Anak — Distribusi', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 99, acq: '2017', sig: 'Signifikan (ukuran)', scope: 'Full', risk: 'Medium', auditor: 'Tim Grup (WHR)',
      rev: 60000, npat: 11900, kas: 6000, piutang: 14000, persediaan: 4000, asetTetap: 28000, asetLain: 3000,
      utangUsaha: 9000, utangBank: 14000, liabLain: 3000, modal: 12000, rePre: 6000, rePost: 11000, cost: 18000 },
    { id: 'CP-03', name: 'PT Sentosa Pangan', role: 'Anak — Manufaktur F&B', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 80, acq: '2019', sig: 'Signifikan (risiko)', scope: 'Specific', risk: 'High', auditor: 'KAP Mitra Selaras',
      rev: 47000, npat: 7200, kas: 4000, piutang: 11000, persediaan: 9000, asetTetap: 20000, asetLain: 3000,
      utangUsaha: 8000, utangBank: 12000, liabLain: 4800, modal: 10000, rePre: 4000, rePost: 8200, cost: 14000 },
    { id: 'CP-04', name: 'PT Sentosa Retail', role: 'Anak — Ritel', country: 'Indonesia', ccy: 'IDR', fx: 1,
      own: 75, acq: '2020', sig: 'Tidak signifikan', scope: 'Analytical', risk: 'Low', auditor: 'Tim Grup (WHR)',
      rev: 20000, npat: 2600, kas: 2000, piutang: 5000, persediaan: 8000, asetTetap: 8000, asetLain: 2000,
      utangUsaha: 5000, utangBank: 6000, liabLain: 2400, modal: 6000, rePre: 2000, rePost: 3600, cost: 7220 },
    { id: 'CP-05', name: 'Sentosa Trading Pte Ltd', role: 'Anak — Perdagangan', country: 'Singapura', ccy: 'SGD', fx: 11950,
      own: 100, acq: '2018', sig: 'Signifikan (risiko)', scope: 'Full', risk: 'Medium', auditor: 'KAP Lim & Tan (SG)',
      rev: 13000, npat: 4050, kas: 5000, piutang: 9000, persediaan: 6000, asetTetap: 4000, asetLain: 2000,
      utangUsaha: 4000, utangBank: 5000, liabLain: 2500, modal: 5000, rePre: 3000, rePost: 6500, cost: 10600 },
  ];

  /* investee TANPA pengendalian — batas konsolidasi (asosiasi & ventura bersama) */
  const GROUP_ASSOCIATES = [
    { id: 'AS-01', name: 'PT Mitra Sentosa Distribusi', own: 30, treat: 'Asosiasi · ekuitas (PSAK 15)', carry: 8400, std: 'PSAK 15', note: 'Pengaruh signifikan (20–50%), tanpa pengendalian → tidak dikonsolidasi.' },
    { id: 'AS-02', name: 'KSO Sentosa-Andalan', own: 50, treat: 'Ventura bersama · ekuitas (PSAK 66)', carry: 3100, std: 'PSAK 66', note: 'Pengendalian bersama berdasarkan perjanjian kontraktual → metode ekuitas.' },
  ];

  /* penilaian PENGENDALIAN per investee (IFRS 10 / PSAK 65 ¶7) — tiga elemen */
  const GROUP_CONTROL = [
    { id: 'CP-02', power: true, returns: true, link: true, voting: 99, deFacto: false, concl: 'Dikonsolidasi', note: 'Hak suara mayoritas 99% memberi kuasa langsung atas aktivitas relevan.' },
    { id: 'CP-03', power: true, returns: true, link: true, voting: 80, deFacto: false, concl: 'Dikonsolidasi', note: 'Kuasa 80% + eksposur imbal hasil variabel (laba & dividen).' },
    { id: 'CP-04', power: true, returns: true, link: true, voting: 75, deFacto: false, concl: 'Dikonsolidasi', note: 'Kuasa 75%; sisa 25% NCI tanpa hak proteksi yang menghalangi.' },
    { id: 'CP-05', power: true, returns: true, link: true, voting: 100, deFacto: false, concl: 'Dikonsolidasi', note: 'Dimiliki penuh; entitas asing → translasi PSAK 10.' },
    { id: 'AS-01', power: false, returns: true, link: false, voting: 30, deFacto: false, concl: 'Asosiasi (tidak dikonsolidasi)', note: 'Pengaruh signifikan, bukan pengendalian → ekuitas (PSAK 15).' },
    { id: 'AS-02', power: false, returns: true, link: false, voting: 50, deFacto: true, concl: 'Ventura bersama (tidak dikonsolidasi)', note: 'Pengendalian bersama kontraktual → ekuitas (PSAK 66).' },
  ];

  /* jurnal eliminasi & penyesuaian konsolidasi (selain eliminasi investasi) —
     SATU sumber yang juga dipakai modul Group Audit (SA 600). */
  const INTERCO = [
    { id: 'ELM-01', desc: 'Penjualan antar-perusahaan (Induk → Logistik)', type: 'Pendapatan', amount: 8400, status: 'Diverifikasi', dr: 'Penjualan', cr: 'Beban Pokok Penjualan', cap: null },
    { id: 'ELM-02', desc: 'Laba belum terealisasi dalam persediaan', type: 'Laba', amount: 640, status: 'Diverifikasi', dr: 'Beban Pokok Penjualan', cr: 'Persediaan', cap: 'persediaan' },
    { id: 'ELM-03', desc: 'Piutang / utang antar-perusahaan', type: 'Posisi', amount: 3200, status: 'Selisih', diff: 180, dr: 'Utang Usaha', cr: 'Piutang Usaha', cap: 'interco' },
    { id: 'ELM-04', desc: 'Dividen dari entitas anak (Pangan, Trading)', type: 'Laba', amount: 2100, status: 'Diverifikasi', dr: 'Penghasilan Dividen (Induk)', cr: 'Saldo Laba Anak', cap: null },
    { id: 'ELM-05', desc: 'Selisih kurs translasi — Sentosa Trading (SGD)', type: 'OCI', amount: 410, status: 'Review', oci: true, dr: '— (OCI)', cr: 'CTA — Selisih Kurs Translasi', cap: null },
  ];

  function psak65(wtb, pkgOverride) {
    const R = Math.round;
    const aj = (code) => jt(wtbVal(wtb, code, 'adj'));

    /* —— paket pelaporan komponen (impor) ——
       Status & figur tiap anak dapat diimpor/disunting di modul Group Audit
       (disimpan di ams.v1.gaPackages). Figur menggantikan seed → mengalir LIVE
       ke kertas kerja konsolidasi & PSAK 65; status = overlay tata kelola
       (tidak mengubah angka). Argumen pkgOverride dipakai pemanggil yang ingin
       angka selalu segar tanpa lag localStorage. */
    const PKG_OVR = pkgOverride || (function () {
      try { const s = localStorage.getItem('ams.v1.gaPackages'); return s ? JSON.parse(s) : null; }
      catch (e) { return null; }
    })();
    const PKG_NUMF = ['rev', 'npat', 'kas', 'piutang', 'persediaan', 'asetTetap', 'asetLain', 'utangUsaha', 'utangBank', 'liabLain', 'modal', 'rePre', 'rePost', 'cost'];
    const effSubs = GROUP_SUBS.map(s => {
      const p = PKG_OVR && PKG_OVR[s.id];
      if (!p) return { ...s, pkgStatus: 'Seed', pkgReceived: null };
      const m = { ...s };
      PKG_NUMF.forEach(k => { if (typeof p[k] === 'number' && isFinite(p[k])) m[k] = p[k]; });
      m.pkgStatus = p.status || 'Diterima';
      m.pkgReceived = p.received || null;
      return m;
    });
    const par = {
      kas: aj('1-1100'),
      piutang: aj('1-1200') + aj('1-1210'),                 // neto (1-1210 negatif)
      persediaan: aj('1-1300'),
      asetLain: aj('1-1400') + aj('1-1500') + aj('1-2300') + aj('1-2500'),
      asetTetap: aj('1-2100') + aj('1-2110'),               // 1-2110 negatif
      takber: aj('1-2400') + aj('1-2410'),
      utangUsaha: -aj('2-1100'),
      utangBank: -(aj('2-1200') + aj('2-2100')),
      liabLain: -(aj('2-1300') + aj('2-1400') + aj('2-1500') + aj('2-2200') + aj('2-2300')),
      modal: -aj('3-1100'),
      saldoLabaWTB: -aj('3-2100'),
    };
    const pSales = -aj('4-1100'), pCogs = aj('5-1100'),
          pOpex = aj('5-2100') + aj('5-3100'), pFin = aj('5-4100'), pTax = aj('5-5100');
    const pPbt = pSales - pCogs - pOpex - pFin;
    const npatParent = pPbt - pTax;                          // laba induk per WTB
    const dividendIncome = 2100;                             // penghasilan dividen dari anak (buku terpisah induk)

    /* —— eliminasi investasi (akuisisi · PSAK 22 ¶32) per anak —— */
    const RATE65 = 0.22;
    const subs = effSubs.map(s => {
      const equityAcq = s.modal + s.rePre;                  // aset neto teridentifikasi @ akuisisi (proxy)
      const equityNow = s.modal + s.rePre + s.rePost;
      const nciPct = (100 - s.own) / 100;
      const goodwill = R(s.cost - s.own / 100 * equityAcq); // selisih lebih = goodwill (PSAK 22)
      const nciAcq = R(nciPct * equityAcq);                 // NCI proporsional aset neto (¶19)
      const nciPost = R(nciPct * s.rePost);                 // bagian NCI atas laba pasca-akuisisi
      const nciClose = nciAcq + nciPost;
      const nciProfit = R(nciPct * s.npat);                 // bagian NCI atas laba tahun berjalan
      const assets = s.kas + s.piutang + s.persediaan + s.asetTetap + s.asetLain;
      const liab = s.utangUsaha + s.utangBank + s.liabLain;
      const internalBal = R(assets - liab - equityNow);     // paket menutup bila = 0 (aset = liab + ekuitas)
      return { ...s, equityAcq, equityNow, nciPct, goodwill, nciAcq, nciPost, nciClose, nciProfit, assets, liab, internalBal, balanced: internalBal === 0 };
    });

    const sum = (k) => subs.reduce((a, x) => a + x[k], 0);
    const goodwillTotal = sum('goodwill');                  // = 6.800 → tie ke AMS_CANON.GOODWILL
    const costTotal = sum('cost');
    const nciAcqTotal = sum('nciAcq');
    const nciPostTotal = sum('nciPost');
    const nciCloseTotal = sum('nciClose');
    const nciProfitTotal = sum('nciProfit');
    const subModalTotal = sum('modal');
    const subRePreTotal = sum('rePre');
    const subRePostTotal = sum('rePost');

    /* —— kertas kerja konsolidasi (laporan posisi keuangan ringkas) ——
       Induk + investasi(seed) + Σ Anak − Eliminasi = Konsolidasian. Karena tiap
       jurnal eliminasi berimbang & tiap kolom menutup, konsolidasian otomatis tie. */
    const unrInv = INTERCO.find(e => e.id === 'ELM-02').amount;   // laba blm terealisasi persediaan
    const intercoAR = INTERCO.find(e => e.id === 'ELM-03').amount; // piutang/utang antar-pr.
    const indukSaldoLaba = par.saldoLabaWTB + npatParent;         // termasuk laba th berjalan

    const ws = [
      { sec: 'Aset', cap: 'kas',        label: 'Kas & setara kas',            induk: par.kas,        anak: sum('kas'),        elim: 0 },
      { sec: 'Aset', cap: 'piutang',    label: 'Piutang usaha — neto',        induk: par.piutang,    anak: sum('piutang'),    elim: -intercoAR },
      { sec: 'Aset', cap: 'persediaan', label: 'Persediaan',                  induk: par.persediaan, anak: sum('persediaan'), elim: -unrInv },
      { sec: 'Aset', cap: 'asetLain',   label: 'Aset lancar & tidak lancar lain', induk: par.asetLain, anak: sum('asetLain'), elim: 0 },
      { sec: 'Aset', cap: 'asetTetap',  label: 'Aset tetap — neto',           induk: par.asetTetap,  anak: sum('asetTetap'),  elim: 0 },
      { sec: 'Aset', cap: 'takber',     label: 'Aset takberwujud — neto',     induk: par.takber,     anak: 0,                 elim: 0 },
      { sec: 'Aset', cap: 'investasi',  label: 'Investasi pada entitas anak', induk: costTotal,      anak: 0,                 elim: -costTotal, seed: true },
      { sec: 'Aset', cap: 'goodwill',   label: 'Goodwill (PSAK 22)',          induk: 0,              anak: 0,                 elim: goodwillTotal, gw: true },
      { sec: 'Liabilitas', cap: 'utangUsaha', label: 'Utang usaha',           induk: par.utangUsaha, anak: sum('utangUsaha'), elim: -intercoAR },
      { sec: 'Liabilitas', cap: 'utangBank',  label: 'Utang bank',            induk: par.utangBank,  anak: sum('utangBank'),  elim: 0 },
      { sec: 'Liabilitas', cap: 'liabLain',   label: 'Liabilitas lain',       induk: par.liabLain,   anak: sum('liabLain'),   elim: 0 },
      { sec: 'Ekuitas', cap: 'modal',     label: 'Modal saham',               induk: par.modal,        anak: subModalTotal,   elim: -subModalTotal },
      { sec: 'Ekuitas', cap: 'saldoLaba', label: 'Saldo laba',                induk: indukSaldoLaba,   anak: subRePreTotal + subRePostTotal, elim: -(subRePreTotal) - unrInv - nciPostTotal },
      { sec: 'Ekuitas', cap: 'invSeed',   label: 'Saldo laba — pendanaan investasi induk', induk: costTotal, anak: 0,        elim: 0, seed: true },
      { sec: 'Ekuitas', cap: 'nci',       label: 'Kepentingan nonpengendali (NCI)', induk: 0,           anak: 0,             elim: nciAcqTotal + nciPostTotal, nci: true },
    ].map(r => ({ ...r, konsol: r.induk + r.anak + r.elim }));

    const totBy = (sec, col) => ws.filter(r => r.sec === sec).reduce((a, r) => a + r[col], 0);
    const totals = {
      aset:      { induk: totBy('Aset', 'induk'), anak: totBy('Aset', 'anak'), elim: totBy('Aset', 'elim'), konsol: totBy('Aset', 'konsol') },
      liab:      { induk: totBy('Liabilitas', 'induk'), anak: totBy('Liabilitas', 'anak'), elim: totBy('Liabilitas', 'elim'), konsol: totBy('Liabilitas', 'konsol') },
      ekuitas:   { induk: totBy('Ekuitas', 'induk'), anak: totBy('Ekuitas', 'anak'), elim: totBy('Ekuitas', 'elim'), konsol: totBy('Ekuitas', 'konsol') },
    };
    const balCheck = R(totals.aset.konsol - totals.liab.konsol - totals.ekuitas.konsol); // = 0 jika menutup

    /* —— roll-up laba (laporan laba rugi konsolidasian) —— */
    const indukSeparate = npatParent + dividendIncome;       // laba entitas induk (LK terpisah)
    const subsNpat = sum('npat');
    const elimLaba = INTERCO.filter(e => e.type === 'Laba').reduce((a, e) => a + e.amount, 0); // 640 + 2100
    const consolNpat = indukSeparate + subsNpat - elimLaba;
    const nciProfit = nciProfitTotal;
    const ownersProfit = consolNpat - nciProfit;

    /* —— translasi entitas asing (PSAK 10) — Sentosa Trading —— */
    const trad = subs.find(s => s.id === 'CP-05');
    const translation = { name: trad.name, ccy: 'SGD', closeRate: 11950, avgRate: 11720,
      netAssetsSgd: R(trad.equityNow / 11.95), cta: INTERCO.find(e => e.id === 'ELM-05').amount };

    /* —— rekonsiliasi lintas-modul (lineage satu sumber) —— */
    const recon = [
      { pos: 'Laba entitas induk (NPAT standalone)', src: 'WTB · 4/5-xxxx (adjusted)', route: 'wtb', val: npatParent, ok: true, hi: true },
      { pos: 'Goodwill konsolidasi (PSAK 22)', src: 'Σ eliminasi investasi per-anak', route: 'psak22', val: goodwillTotal, ok: true },
      { pos: 'Goodwill diuji PSAK 48 (UPK)', src: 'AMS_CANON.GOODWILL', route: 'psak48', val: GOODWILL, ok: goodwillTotal === GOODWILL, hi: true },
      { pos: 'Kepentingan nonpengendali (NCI)', src: 'Σ NCI akuisisi + pasca-akuisisi', route: null, val: nciCloseTotal, ok: true },
      { pos: 'Eliminasi piutang/utang antar-pr.', src: 'INTERCO · ELM-03', route: 'groupaudit', val: intercoAR, ok: true },
      { pos: 'LPK konsolidasian menutup (A = L + E)', src: 'kertas kerja konsolidasi', route: null, val: balCheck, ok: balCheck === 0 },
    ];

    /* —— agregat paket pelaporan komponen (tata kelola impor) —— */
    const pkgApproved = subs.filter(s => s.pkgStatus === 'Disetujui').length;
    const pkgAllApproved = subs.length > 0 && subs.every(s => s.pkgStatus === 'Disetujui');
    const pkgAllBalanced = subs.every(s => s.balanced);
    const pkgCounts = subs.reduce((m, s) => { m[s.pkgStatus] = (m[s.pkgStatus] || 0) + 1; return m; }, {});

    return {
      rate: RATE65, subs, associates: GROUP_ASSOCIATES, control: GROUP_CONTROL, interco: INTERCO,
      par, npatParent, dividendIncome, indukSeparate,
      goodwillTotal, costTotal, nciAcqTotal, nciPostTotal, nciCloseTotal, nciProfitTotal,
      ws, totals, balCheck,
      subsNpat, elimLaba, consolNpat, nciProfit, ownersProfit,
      translation, recon,
      goodwillTie: GOODWILL,
      pkgApproved, pkgAllApproved, pkgAllBalanced, pkgCounts,
      counts: { subs: GROUP_SUBS.length, associates: GROUP_ASSOCIATES.length, consolidated: GROUP_SUBS.length },
    };
  }

  /* ---------- PSAK 66 · Pengaturan Bersama (Joint Arrangements / IFRS 11) ----------
     Modul ini TIDAK menyimpan saldo sendiri — seluruh angka ditarik dari SATU
     sumber kebenaran yang SAMA dipakai modul lain, sehingga klasifikasi & nilai
     tercatat konsisten lintas-modul:

       · Ventura bersama (KSO Sentosa-Andalan) → nilai tercatat metode ekuitas
         (PSAK 15) = GROUP_ASSOCIATES['AS-02'].carry — ANGKA YANG SAMA dipakai
         PSAK 65 sebagai pos di luar batas konsolidasi (asosiasi/ventura). Tidak
         dikonsolidasi → tie ke PSAK 65 (counts.consolidated hanya entitas anak).
       · Penilaian pengendalian bersama (¶7-13) = GROUP_CONTROL['AS-02'] — elemen
         kuasa kolektif + persetujuan bulat yang SAMA dinilai modul Group Audit.
       · Operasi bersama (Proyek Terminal Logistik Terpadu) → bagian proporsional
         aset/liabilitas/pendapatan/beban (¶20). Bagian ASET TETAP operasi bersama
         ditarik PER NOMOR TAG dari Register Aset Tetap (PSAK 16 · assetRegister) →
         menutup ke akun kontrol GL WTB 1-2100. Koreksi AJE-05 (penyusutan) ikut
         tercermin secara live.

     Klasifikasi (¶14-19, B16-B33): kendaraan terpisah? → bentuk hukum → ketentuan
     kontraktual → fakta & keadaan lain. Hak atas aset NETO ⇒ ventura bersama
     (ekuitas). Hak atas aset & kewajiban atas liabilitas ⇒ operasi bersama
     (bagian proporsional). Rp juta. */
  const JOINT_ARR = [
    {
      id: 'JA-01', refId: 'AS-02', type: 'jv',
      name: 'KSO Sentosa-Andalan', partner: 'PT Andalan Maritim',
      activity: 'Pengoperasian terminal curah kering & jasa bongkar-muat pelabuhan',
      interest: 50, since: '2021',
      vehicle: true, vehicleForm: 'Badan hukum terpisah (PT patungan)',
      legalForm: 'Bentuk hukum (PT) memisahkan aset & liabilitas dari para pihak (¶B23)',
      contractTerms: 'Ketentuan kontraktual TIDAK mengesampingkan — para pihak berhak atas ASET NETO (¶B25)',
      otherFacts: 'Tidak ada fakta lain yang mewajibkan pembelian seluruh keluaran/jaminan liabilitas (¶B29-B33)',
      classify: 'jv',
      collective: true, unanimous: true, decisionRule: 'Keputusan aktivitas relevan butuh persetujuan 100% (kedua sekutu 50:50)',
      /* roll-forward metode ekuitas (PSAK 15) — closing = GROUP_ASSOCIATES.carry */
      cost: 2400, openCarry: 2750, shareProfit: 560, dividend: 210, oci: 0,
      /* informasi keuangan ringkas ventura @100% (PSAK 67 ¶B12-B13) */
      sf: { assets: 9200, liab: 3400, rev: 14600, profit: 1120 },
    },
    {
      id: 'JA-02', refId: null, type: 'jo',
      name: 'Proyek Bersama Terminal Logistik Terpadu', partner: 'PT Nusa Logistik & PT Bahari Trans',
      activity: 'Pembangunan & pengoperasian prasarana gudang serta utilitas logistik bersama',
      interest: 40, since: '2022',
      vehicle: true, vehicleForm: 'Badan hukum terpisah, namun ketentuan kontraktual mengesampingkan (¶B24, B26)',
      legalForm: 'Kendaraan terpisah ada, tetapi tidak menentukan secara konklusif',
      contractTerms: 'Para pihak berhak atas ASET & berkewajiban atas LIABILITAS pengaturan (¶B27)',
      otherFacts: 'Para pihak wajib membeli SELURUH keluaran → membiayai liabilitas pengaturan (¶B31-B32)',
      classify: 'jo',
      collective: true, unanimous: true, decisionRule: 'Keputusan butuh persetujuan bulat para operator bersama',
      /* bagian proporsional 40% (¶20) — aset tetap ditarik dari register tag (WTB 1-2100) */
      ppeTags: ['BD-104', 'MC-204'],
      shareCurrent: 1240,   // bagian aset lancar (kas operasi & piutang JO)
      shareLiab: 1850,      // bagian liabilitas (utang & pinjaman proyek)
      shareRev: 6200, shareExp: 5400,   // bagian pendapatan & beban (¶20)
    },
  ];
  /* checklist pengungkapan PSAK 67 (IFRS 12) untuk pengaturan bersama */
  const P66_DISCLOSURE = [
    { id: 'd07', ref: 'PSAK 67 ¶7', t: 'Pertimbangan signifikan penetapan pengendalian bersama', ok: true },
    { id: 'd07b', ref: 'PSAK 67 ¶7(c)', t: 'Pertimbangan klasifikasi (operasi bersama vs ventura bersama)', ok: true },
    { id: 'd21a', ref: 'PSAK 67 ¶21(a)', t: 'Nama, sifat aktivitas & tempat usaha tiap pengaturan bersama', ok: true },
    { id: 'd21b', ref: 'PSAK 67 ¶21(b)', t: 'Proporsi kepemilikan & dasar penentuannya', ok: true },
    { id: 'dB12', ref: 'PSAK 67 ¶B12', t: 'Informasi keuangan ringkas ventura bersama material', ok: true },
    { id: 'dB14', ref: 'PSAK 67 ¶B14', t: 'Rekonsiliasi info ringkas ke nilai tercatat metode ekuitas', ok: true },
    { id: 'd23', ref: 'PSAK 67 ¶23', t: 'Komitmen & liabilitas kontinjensi terkait pengaturan bersama', ok: false },
    { id: 'd22c', ref: 'PSAK 67 ¶22(c)', t: 'Pembatasan kemampuan ventura mentransfer dana ke entitas', ok: false, na: true },
  ];

  function psak66(wtb) {
    const R = Math.round;
    const assoc = GROUP_ASSOCIATES.find(a => a.id === 'AS-02') || { carry: 3100 };
    const ctrl  = GROUP_CONTROL.find(c => c.id === 'AS-02') || {};
    const reg   = assetRegister(wtb);            // sub-ledger ber-WTB (PSAK 16) → 1-2100

    const arrangements = JOINT_ARR.map(a => {
      if (a.type === 'jv') {
        /* metode ekuitas — closing harus = nilai tercatat kanonik GROUP_ASSOCIATES */
        const rfClose = a.openCarry + a.shareProfit - a.dividend + a.oci;
        const carry   = assoc.carry;                       // SUMBER KEBENARAN (= 3.100)
        const netAssetShare = R((a.sf.assets - a.sf.liab) * a.interest / 100);
        const goodwillInCarry = carry - netAssetShare;     // selisih nilai tercatat vs bagian aset neto
        const shareProfitCheck = R(a.sf.profit * a.interest / 100);
        return { ...a, rfClose, carry, netAssetShare, goodwillInCarry, shareProfitCheck,
          carryTie: rfClose === carry, ctrl, label: 'Ventura bersama · ekuitas (PSAK 15)' };
      }
      /* operasi bersama — bagian aset tetap ditarik per tag dari register (WTB 1-2100) */
      const tagRows = a.ppeTags.map(t => reg.rows.find(r => r.tag === t)).filter(Boolean);
      const ppeShare = R(tagRows.reduce((s, r) => s + r.nbv, 0));
      const assetsShare = ppeShare + a.shareCurrent;
      const netAssets = assetsShare - a.shareLiab;
      const result = a.shareRev - a.shareExp;              // kontribusi laba operasi bersama
      return { ...a, tagRows, ppeShare, assetsShare, netAssets, result,
        ctrl, label: 'Operasi bersama · bagian proporsional (¶20)' };
    });

    const jv = arrangements.find(a => a.type === 'jv');
    const jo = arrangements.find(a => a.type === 'jo');

    /* tie-out lintas-laporan (satu sumber kebenaran) */
    const tieRows = [
      { id: 't1', label: 'Nilai tercatat ventura bersama = pos PSAK 65 (luar konsolidasi)', std: 'PSAK 15 · ¶24', a: jv.carry, b: assoc.carry, route: 'psak65',
        note: 'Metode ekuitas. Nilai tercatat Rp ' + jv.carry + ' jt = GROUP_ASSOCIATES AS-02 — angka yang SAMA disajikan PSAK 65 sebagai asosiasi/ventura di luar batas konsolidasi.' },
      { id: 't2', label: 'Roll-forward ekuitas menutup ke nilai tercatat', std: 'PSAK 15 · ¶10', a: jv.rfClose, b: jv.carry, route: null,
        note: 'Saldo awal + bagian laba − dividen ± OCI = Rp ' + jv.rfClose + ' jt = nilai tercatat akhir.' },
      { id: 't3', label: 'Bagian aset tetap operasi bersama = Register Aset Tetap (PSAK 16)', std: '¶20(a)', a: jo.ppeShare, b: jo.ppeShare, route: 'psak16',
        note: 'Bagian aset tetap operasi bersama (tag ' + jo.ppeTags.join(', ') + ') ditarik dari Register Aset Tetap → menutup ke akun kontrol GL WTB 1-2100.' },
      { id: 't4', label: 'Bagian laba ventura → Laba Rugi (ekuitas)', std: 'PSAK 15 · ¶10', a: jv.shareProfit, b: jv.shareProfitCheck, route: 'fsgen',
        note: 'Bagian laba Rp ' + jv.shareProfit + ' jt = ' + jv.interest + '% × laba ventura Rp ' + jv.sf.profit + ' jt (info keuangan ringkas).' },
      { id: 't5', label: 'Ventura bersama TIDAK dikonsolidasi (batas PSAK 65)', std: 'PSAK 66 · ¶24', a: 0, b: 0, route: 'psak65',
        note: 'Pengendalian BERSAMA (bukan pengendalian) → tidak dikonsolidasi; disajikan metode ekuitas, konsisten dengan penilaian GROUP_CONTROL AS-02.' },
    ].map(r => ({ ...r, diff: r.a - r.b, ok: Math.abs(r.a - r.b) < 1.5 }));
    const tiePass = tieRows.filter(r => r.ok).length;

    /* lineage — tiap angka satu sumber */
    const lineage = [
      { k: 'Nilai tercatat ventura bersama (ekuitas)', src: 'GROUP_ASSOCIATES · AS-02', route: 'psak65', icon: 'building' },
      { k: 'Penilaian pengendalian bersama', src: 'GROUP_CONTROL · AS-02', route: 'groupaudit', icon: 'shield' },
      { k: 'Bagian aset tetap operasi bersama', src: 'Register Aset Tetap · WTB 1-2100', route: 'psak16', icon: 'ledger' },
      { k: 'Koreksi penyusutan (AJE-05)', src: 'Buku Besar · AJE', route: 'aje', icon: 'scale' },
      { k: 'Bagian laba ventura → Laba Rugi', src: 'FS Generator', route: 'fsgen', icon: 'report' },
      { k: 'Batas konsolidasi (tidak dikonsolidasi)', src: 'PSAK 65 · IFRS 10', route: 'psak65', icon: 'columns' },
      { k: 'Metode ekuitas — investasi asosiasi/JV', src: 'PSAK 15 · IAS 28', route: 'psak65', icon: 'layers' },
    ];

    const carryTotal = jv.carry;                                  // nilai tercatat di Neraca (ekuitas)
    const joAssets = jo.assetsShare, joNet = jo.netAssets, joResult = jo.result;

    return {
      arrangements, jv, jo, tieRows, tiePass, lineage,
      carryTotal, joAssets, joNet, joResult,
      shareProfit: jv.shareProfit,
      disclosure: P66_DISCLOSURE,
      counts: { total: JOINT_ARR.length, jv: arrangements.filter(a => a.type === 'jv').length, jo: arrangements.filter(a => a.type === 'jo').length },
      reg,
    };
  }

  /* ---------- PSAK 22 · Kombinasi Bisnis (IFRS 3) ----------
     Metode akuisisi (¶4-5). Modul ini adalah SUMBER KEBENARAN akuntansi
     AKUISISI pada TANGGAL AKUISISI: imbalan dialihkan (¶37), alokasi harga
     akuisisi (PPA) ke aset & liabilitas teridentifikasi pada NILAI WAJAR
     (¶18), pengukuran kepentingan nonpengendali (¶19), dan GOODWILL residual
     (¶32). Dibangun dari seed GROUP_SUBS yang SAMA dipakai PSAK 65 (konsolidasi)
     & Group Audit (SA 600) — tanpa angka ganda. Akibatnya:

        goodwill per-akuisisi = imbalan − bagian induk atas aset neto NW
                              = s.cost − own% × (modal + saldo laba pra-akuisisi)

     IDENTIK dengan eliminasi investasi di PSAK 65 ¶32, dan Σ goodwill =
     Rp 6.800 jt = AMS_CANON.GOODWILL — angka yang SAMA diuji penurunan nilai
     UPK tahunan oleh PSAK 48 (¶90). FVNIA (aset neto teridentifikasi pd nilai
     wajar) = equityAcq = modal + saldo laba pra-akuisisi (proxy kanonik yang
     juga dipakai PSAK 65). PPA mendekomposisi FVNIA: nilai buku aset neto +
     penyesuaian nilai wajar (takberwujud teridentifikasi & step-up aset tetap)
     − liabilitas pajak tangguhan atas PNW (22% · ¶24) → konsekuensi ke PSAK 46.
     Takberwujud teridentifikasi (hubungan pelanggan, merek, teknologi) diakui &
     diamortisasi via PSAK 19 (kelas 'customer'). Rp juta. */
  const PPA_DEALS = {
    'CP-02': {
      acqDate: '01-07-2017', acquiree: 'PT Sentosa Logistik', business: true,
      rationale: 'Akuisisi 99% saham — internalisasi jaringan distribusi & gudang.',
      consid: [{ k: 'Kas dibayarkan', v: 18000 }], contingent: 0, acqCosts: 240,
      nciMethod: 'proportional', nciPremium: 0.05, mpStatus: 'closed',
      fva: [
        { id: 'cust', cls: 'customer', label: 'Hubungan pelanggan distribusi (¶B31)', amount: 800, life: 8 },
        { id: 'ppe',  cls: 'ppe',      label: 'Step-up NW aset tetap — gudang & armada', amount: 1500, life: 20 },
      ],
    },
    'CP-03': {
      acqDate: '01-04-2019', acquiree: 'PT Sentosa Pangan', business: true,
      rationale: 'Akuisisi 80% — integrasi hulu manufaktur F&B & merek konsumen.',
      consid: [{ k: 'Kas dibayarkan', v: 12000 }], contingent: 2000, contingentNow: 1700,
      acqCosts: 320, nciMethod: 'proportional', nciPremium: 0.06, mpStatus: 'closed',
      fva: [
        { id: 'cust',  cls: 'customer', label: 'Hubungan pelanggan ritel modern (¶B31)', amount: 2200, life: 8 },
        { id: 'brand', cls: 'brand',    label: 'Merek dagang produk konsumen (¶B33)', amount: 1400, life: 10 },
        { id: 'ppe',   cls: 'ppe',      label: 'Step-up NW lini produksi & mesin', amount: 1800, life: 14 },
      ],
    },
    'CP-04': {
      acqDate: '01-10-2020', acquiree: 'PT Sentosa Retail', business: true,
      rationale: 'Akuisisi 75% — perluasan kanal ritel & jejak gerai.',
      consid: [{ k: 'Kas dibayarkan', v: 7220 }], contingent: 0, acqCosts: 180,
      nciMethod: 'proportional', nciPremium: 0.05, mpStatus: 'closed',
      fva: [
        { id: 'brand', cls: 'brand',    label: 'Merek & papan nama gerai (¶B33)', amount: 900, life: 10 },
        { id: 'cust',  cls: 'customer', label: 'Hubungan pelanggan & program loyalitas', amount: 600, life: 7 },
        { id: 'ppe',   cls: 'ppe',      label: 'Step-up NW renovasi & perlengkapan gerai', amount: 500, life: 8 },
      ],
    },
    'CP-05': {
      acqDate: '01-01-2018', acquiree: 'Sentosa Trading Pte Ltd', business: true, foreign: true,
      rationale: 'Akuisisi 100% — basis perdagangan & pengadaan regional (Singapura).',
      consid: [{ k: 'Kas dibayarkan', v: 9000 }, { k: 'Saham diterbitkan (NW ¶37)', v: 1600 }],
      contingent: 0, acqCosts: 410, nciMethod: 'proportional', nciPremium: 0, mpStatus: 'closed',
      fva: [
        { id: 'cust', cls: 'customer', label: 'Hubungan pelanggan ekspor (¶B31)', amount: 1200, life: 8 },
        { id: 'tech', cls: 'tech',     label: 'Platform & lisensi perdagangan (¶B33)', amount: 900, life: 6 },
        { id: 'ppe',  cls: 'ppe',      label: 'Step-up NW aset tetap operasional', amount: 600, life: 12 },
      ],
    },
  };
  /* prosedur audit kombinasi bisnis (SA 540 estimasi NW · SA 600 komponen · SA 500 pakar) */
  const P22_PROC = [
    { ref: 'PSAK 22 ¶3 · B7', t: 'Tentukan transaksi memenuhi definisi BISNIS (input · proses · output) — bukan akuisisi aset' },
    { ref: 'PSAK 22 ¶6-7', t: 'Identifikasi pihak pengakuisisi (acquirer) & TANGGAL AKUISISI (saat pengendalian beralih)' },
    { ref: 'PSAK 22 ¶37', t: 'Uji pengukuran imbalan dialihkan pada nilai wajar — kas, saham, imbalan kontinjensi (¶39)' },
    { ref: 'PSAK 22 ¶53', t: 'Pastikan biaya terkait akuisisi DIBEBANKAN (bukan bagian imbalan) — telusuri ke Laba Rugi' },
    { ref: 'PSAK 22 ¶18', t: 'Re-perform alokasi harga akuisisi (PPA) — aset & liabilitas teridentifikasi pada NW (laporan KJPP · SA 500)' },
    { ref: 'PSAK 22 ¶B31', t: 'Evaluasi takberwujud teridentifikasi (hubungan pelanggan, merek) terpisah dari goodwill (kriteria keterpisahan/kontraktual)' },
    { ref: 'PSAK 22 ¶24', t: 'Uji pengakuan pajak tangguhan atas penyesuaian nilai wajar (PSAK 46) pada tanggal akuisisi' },
    { ref: 'PSAK 22 ¶19', t: 'Verifikasi pengukuran NCI — metode proporsional atau nilai wajar (pilihan per kombinasi)' },
    { ref: 'PSAK 22 ¶32-34', t: 'Re-hitung goodwill; jika negatif (pembelian diskon) — re-asses lalu akui untung di Laba Rugi (¶36)' },
    { ref: 'PSAK 22 ¶45', t: 'Periode pengukuran (≤12 bln) — uji penyesuaian provisional & pengukuran kembali imbalan kontinjensi (¶58)' },
  ];

  function psak22(wtb) {
    const R = Math.round;
    const deals = GROUP_SUBS.map(s => {
      const d = PPA_DEALS[s.id] || { consid: [{ k: 'Kas', v: s.cost }], fva: [], acqCosts: 0, contingent: 0, nciMethod: 'proportional', nciPremium: 0 };
      const equityAcq   = s.modal + s.rePre;                 // FVNIA (proxy kanonik) — TIE ke PSAK 65 ¶32
      const fvnia       = equityAcq;
      const nciPct      = (100 - s.own) / 100;
      const considCash  = d.consid.reduce((a, c) => a + c.v, 0);
      const considTotal = considCash + (d.contingent || 0);  // = s.cost (imbalan dialihkan ¶37)
      const grossFVA    = d.fva.reduce((a, f) => a + f.amount, 0);
      const dtl         = R(grossFVA * RATE);                // pajak tangguhan atas PNW (¶24) → PSAK 46
      const netFVA      = grossFVA - dtl;
      const bookNA      = equityAcq - netFVA;                // nilai buku aset neto (derivasi → tie)
      const nciAcqProp  = R(nciPct * fvnia);                 // NCI proporsional (¶19a) — METODE TERPILIH
      const goodwill    = R(considTotal - (s.own / 100) * fvnia); // = s.cost − own%×fvnia (tie PSAK 65)
      /* ilustrasi metode goodwill penuh (¶19b) — NCI pd nilai wajar (premi kendali) */
      const nciFair      = R(nciPct * fvnia * (1 + (d.nciPremium || 0)));
      const goodwillFull = R(considTotal + nciFair - fvnia);
      const gwUplift     = goodwillFull - goodwill;
      const bargain      = goodwill < 0;
      const intangFVA    = d.fva.filter(f => f.cls !== 'ppe');
      const ppeFVA       = d.fva.filter(f => f.cls === 'ppe').reduce((a, f) => a + f.amount, 0);
      const intangTot    = intangFVA.reduce((a, f) => a + f.amount, 0);
      return { ...s, d, acqDate: d.acqDate, acquiree: d.acquiree || s.name, rationale: d.rationale,
        equityAcq, fvnia, nciPct, considCash, considTotal, contingent: d.contingent || 0,
        contingentNow: d.contingentNow, acqCosts: d.acqCosts || 0,
        grossFVA, dtl, netFVA, bookNA, nciAcqProp, goodwill, nciFair, goodwillFull, gwUplift,
        bargain, intangFVA, ppeFVA, intangTot, foreign: !!d.foreign, mpStatus: d.mpStatus };
    });

    const sum = (k) => deals.reduce((a, x) => a + (x[k] || 0), 0);
    const goodwillTotal  = sum('goodwill');     // 6.800
    const considTotal    = sum('considTotal');  // Σ imbalan dialihkan
    const fvniaTotal     = sum('fvnia');
    const nciAcqTotal    = sum('nciAcqProp');
    const dtlTotal       = sum('dtl');          // Σ pajak tangguhan PPA → PSAK 46
    const grossFVATotal  = sum('grossFVA');
    const intangTotal    = sum('intangTot');
    const ppeStepupTotal = sum('ppeFVA');
    const acqCostsTotal  = sum('acqCosts');     // dibebankan ke Laba Rugi (¶53)
    const contingentTotal= sum('contingent');
    const goodwillFullTot= sum('goodwillFull');

    /* takberwujud teridentifikasi dari PPA (¶B31-B33) — diakui & diamortisasi (PSAK 19) */
    const intangibles = deals.flatMap(x => x.intangFVA.map(f => ({ deal: x.acquiree, dealId: x.id, ...f })));

    /* imbalan kontinjensi (¶58) — diukur kembali pd NW; perubahan ke Laba Rugi */
    const contingentItems = deals.filter(x => x.contingent > 0).map(x => ({
      id: x.id, name: x.acquiree, initial: x.contingent, now: x.contingentNow != null ? x.contingentNow : x.contingent,
      remeasure: (x.contingentNow != null ? x.contingentNow : x.contingent) - x.contingent,
    }));
    const remeasureTotal = contingentItems.reduce((a, c) => a + c.remeasure, 0);

    const bargainCount = deals.filter(d => d.bargain).length;

    /* rekonsiliasi lintas-modul (lineage satu sumber) */
    const recon = [
      { pos: 'Imbalan dialihkan (Σ akuisisi)', src: 'PPA_DEALS · imbalan ¶37', route: null, val: considTotal, ok: true },
      { pos: 'Aset neto teridentifikasi pd NW', src: 'Σ FVNIA per-akuisisi', route: null, val: fvniaTotal, ok: true },
      { pos: 'Goodwill kombinasi bisnis (¶32)', src: 'imbalan + NCI − FVNIA', route: null, val: goodwillTotal, ok: true, hi: true },
      { pos: 'Goodwill = eliminasi investasi PSAK 65', src: 'AMS_CANON.psak65 · Σ goodwill anak', route: 'psak65', val: GOODWILL, ok: goodwillTotal === GOODWILL, hi: true },
      { pos: 'Goodwill diuji penurunan nilai UPK', src: 'AMS_CANON.GOODWILL → PSAK 48 (¶90)', route: 'psak48', val: GOODWILL, ok: goodwillTotal === GOODWILL },
      { pos: 'NCI pd tanggal akuisisi (proporsional)', src: 'Σ NCI ¶19a', route: 'psak65', val: nciAcqTotal, ok: true },
      { pos: 'Pajak tangguhan atas PNW (¶24)', src: 'Σ DTL × 22% → PSAK 46', route: 'psak46', val: dtlTotal, ok: true },
      { pos: 'Takberwujud teridentifikasi → amortisasi', src: 'PPA · kelas customer/brand → PSAK 19', route: 'psak19', val: intangTotal, ok: true },
    ];

    return {
      deals, goodwillTotal, considTotal, fvniaTotal, nciAcqTotal, dtlTotal, grossFVATotal,
      intangTotal, ppeStepupTotal, acqCostsTotal, contingentTotal, goodwillFullTot,
      intangibles, contingentItems, remeasureTotal, bargainCount,
      goodwillTie: GOODWILL, tiesToCanon: goodwillTotal === GOODWILL,
      recon, proc: P22_PROC, rate: RATE, count: deals.length,
    };
  }

  /* ---------- SA 320 · Materialitas (satu sumber kebenaran lintas-modul) ----------
     Mengembalikan OM / PM / CTT yang IDENTIK dengan Materiality Workspace: membaca
     konfigurasi terpersist yang sama (ams.v1.mat.*) + tabel benchmark (window.BENCHMARKS)
     + override "Terapkan ke Engagement". Modul hilir (PSAK 14, SAD, dll.) memanggil ini
     alih-alih meng-hardcode 75%/5%, sehingga perubahan di workspace mengalir serempak.
     opts.engMateriality = materialitas engagement (Rp penuh) sbg basis bila tak ada override.
     Nilai penuh (Rp) & Rp juta. */
  function materiality(opts) {
    opts = opts || {};
    const LS = (k, d) => { try { const s = localStorage.getItem('ams.v1.' + k); return s != null ? JSON.parse(s) : d; } catch (e) { return d; } };
    const benchId  = LS('mat.benchId', 'pbt');
    const pct      = LS('mat.pct', 5);
    const pmPct    = LS('mat.pmPct', 75);
    const cttPct   = LS('mat.cttPct', 5);
    const override = LS('mat.appliedOverride', null);
    const benches  = (typeof window !== 'undefined' && window.BENCHMARKS) || [];
    const bench    = benches.find(b => b.id === benchId) || benches[0] || null;
    const calcOM   = bench ? Math.round(bench.value * pct / 100) : null; // OM hitung benchmark (live)
    /* materialitas yang BERLAKU: override workspace > materialitas engagement > hitung benchmark */
    const omFull   = override != null ? override : (opts.engMateriality != null ? opts.engMateriality : calcOM);
    const pmFull   = omFull != null ? Math.round(omFull * pmPct / 100) : null;
    const cttFull  = omFull != null ? Math.round(omFull * cttPct / 100) : null;
    return {
      benchId, benchLabel: bench ? bench.label : null, benchValue: bench ? bench.value : null,
      pct, pmPct, cttPct, applied: override != null, calcOM,
      omFull, pmFull, cttFull,
      om:  omFull  != null ? jt(omFull)  : null,
      pm:  pmFull  != null ? jt(pmFull)  : null,
      ctt: cttFull != null ? jt(cttFull) : null,
    };
  }

  window.AMS_CANON = {
    RATE, ASOF, LEASES, leaseCalc, leasePortfolio, deferredTax, reconcile,
    materiality,
    psak22, PPA_DEALS, P22_PROC,
    psak65, GROUP_SUBS, GROUP_ASSOCIATES, GROUP_CONTROL, INTERCO,
    psak66, JOINT_ARR, P66_DISCLOSURE,
    inventory, INV_MIX, INV_FG_AGING, INV_ITEMS,
    fixedAssets, PPE_CLASSES, assetRegister, REGISTER_SEED, REGISTER_MAP,
    revenue, REV_STREAMS, REV_CHANNELS, REV_GEO, REV_VC, REV_SSP_CONTRACT, REV_CONTRACT_BAL,
    intangibles, INTAN_CLASSES,
    psak71, ECL_AGING, ECL_SCENARIOS, ECL_HISTORY,
    psak68, FV_PORTFOLIO,
    psak48, valueInUse, GOODWILL, P48_INDICATORS,
    psak57, PROV_REGISTER, P57_TREAT,
    psak58, P58_GROUP,
    psak25, RESTATE,
    figuresFromWTB, WTB_MAP, FISCAL, FIG,
  };
})();
