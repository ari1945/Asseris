/* ============================================================
   NeoSuite AMS — canon part1 (engine + seed) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import { ASOF, FIG, RATE, figuresFromWTB, jt, leasePortfolio, wtbVal } from './canon_base';
import type { WTB, AjeRow } from './canon_types';

  function deferredTax(wtb?: WTB) {
    const f = wtb ? (() => {
      const s = figuresFromWTB(wtb);
      return Object.assign({}, FIG, { dbo: s.dboBooked, ckpn: s.ckpnBooked, dtaReported: s.dtaReported });
    })() : FIG;
    const lease = leasePortfolio();
    const mk = (id: string, diff: number, type: string) => {
      const dtRaw = Math.round(diff * RATE);
      return { id, diff: Math.round(diff), dt: type === 'tax' ? -dtRaw : dtRaw, type };
    };
    const items: Array<{ id: string; diff: number; dt: number; type: string; car: number | null; base: number | null }> = [
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

  function inventory(wtb?: WTB) {
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
      const cls   = INV_MIX.find(m => m.id === it.cls)!;   // it.cls selalu salah satu id INV_MIX
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
  const PPE_CLASSES: Array<{ id: string; label: string; pct: number; life: number | null; residual: number; mature: number; note?: string }> = [
    { id: 'tanah',     label: 'Tanah',                         pct: 0.16, life: null, residual: 0.00, mature: 0.00, note: 'HGB · tidak disusutkan (¶58)' },
    { id: 'bangunan',  label: 'Bangunan & prasarana',          pct: 0.40, life: 30,   residual: 0.10, mature: 0.22 },
    { id: 'mesin',     label: 'Mesin & peralatan produksi',    pct: 0.30, life: 16,   residual: 0.05, mature: 0.42 },
    { id: 'kendaraan', label: 'Kendaraan',                     pct: 0.08, life: 10,   residual: 0.10, mature: 0.55 },
    { id: 'inventaris',label: 'Inventaris & peralatan kantor', pct: 0.06, life: 8,    residual: 0.05, mature: 0.62 },
  ];

  function fixedAssets(wtb?: WTB) {
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

  function assetRegister(wtb?: WTB) {
    const fa = fixedAssets(wtb);
    type PpeClass = (typeof fa.classes)[number];
    const byCls: Record<string, PpeClass> = {}; fa.classes.forEach(c => { byCls[c.id] = c; });
    const baseRows = REGISTER_SEED.map(s => {
      const c: Partial<PpeClass> = byCls[s.cls] || {};
      const cost = (c.gross || 0) * s.w;
      const acqYear = Number(s.acq.split('-')[0]);
      const age = c.life ? Math.max(0, ASOF.y - acqYear) : 0;
      const annual = c.life ? cost * (1 - c.residual!) / c.life : 0;
      const rawAccum = c.life ? Math.min(cost * (1 - c.residual!), annual * age) : 0;
      return { ...s, classLabel: c.label, cost, life: c.life, residual: c.residual, acqYear, age, annual, rawAccum };
    });
    /* normalisasi akumulasi per kelompok → Σ sub-ledger = akum GL (rekonsiliasi menutup) */
    const clsRaw: Record<string, number> = {}; baseRows.forEach(r => { clsRaw[r.cls] = (clsRaw[r.cls] || 0) + r.rawAccum; });
    const rows = baseRows.map(r => {
      const c: Partial<PpeClass> = byCls[r.cls] || {};
      const k = clsRaw[r.cls] ? (c.accum || 0) / clsRaw[r.cls] : 0;
      const accum = r.rawAccum * k;
      const nbv = r.cost - accum;
      const rate = (r.life && r.cost) ? r.annual / r.cost : 0;
      return { ...r, accum, nbv, rate, fullyDep: r.life ? (nbv <= r.cost * r.residual! + 1) : false };
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

  function revenue(wtb?: WTB) {
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
    const norm = <T extends { pct: number }>(arr: T[]) => {
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

  function intangibles(wtb?: WTB) {
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

export { deferredTax, INV_MIX, INV_FG_AGING, INV_ITEMS, inventory, PPE_CLASSES, fixedAssets, REGISTER_SEED, REGISTER_MAP, assetRegister, REV_STREAMS, REV_CHANNELS, REV_GEO, REV_VC, REV_SSP_CONTRACT, REV_CONTRACT_BAL, revenue, INTAN_CLASSES, intangibles };
