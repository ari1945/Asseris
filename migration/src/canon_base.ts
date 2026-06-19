/* ============================================================
   NeoSuite AMS — canon base (foundation: helper + konstanta + lease/figures) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import type { WTB, WtbAmountField, Figures, Fig, FsModel } from './canon_types';

  const RATE = 0.22;
  const ASOF = { y: 2025, m: 12 };           // 31 Des 2025

  /* ---------- helper: tarik saldo akun dari WTB (by code) ---------- */
  const jt = (n: number) => Math.round((n || 0) / 1e6);                 // rupiah penuh → juta
  function wtbRow(wtb: WTB | undefined, code: string) {
    const W = (wtb && wtb.length) ? wtb : ((window.AMS && window.AMS.WTB) || []);
    return W.find(r => r.code === code) || null;
  }
  function wtbVal(wtb: WTB | undefined, code: string, field: WtbAmountField) {
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
  function figuresFromWTB(wtb?: WTB): Figures {
    const v = (k: keyof typeof WTB_MAP, field: WtbAmountField) => WTB_MAP[k].sign * jt(wtbVal(wtb, WTB_MAP[k].code, field));
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

  function leaseCalc(termMo: number, pmt: number, ratePct: number) {
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
  function elapsedMonths(start: string) {
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

  /* ---------- FIG / SRC: saldo akhir kanonik tiap pos (Rp juta) ----------
     W6 Fase 3 (W6·2) — dihitung LAZY (saat akses properti pertama), BUKAN saat
     module-load. Sebelumnya `figuresFromWTB()` membaca window.AMS.WTB saat load,
     mengikat canon ke WTB statis data.js. Kini boot menghidrasi window.AMS.WTB
     dari API lebih dulu (lihat api.js · hydrateCoreFromApi); akses pertama lalu
     membangun angka dari WTB ter-hidrasi → nol drift vs baseline W0.
     Tetap berupa OBJEK (lewat Proxy memo) agar `FIG.x`, `Object.assign({}, FIG, …)`,
     spread, dan `AMS_CANON.FIG` bekerja tanpa perubahan di pemanggil.
     Nama field lama dipertahankan agar konsumen (PSAK 46, ECL, Sewa) tetap kompatibel. */
  let _src: Figures | null = null;
  let _fig: Fig | null = null;
  function buildFigures(): void {
    const s = figuresFromWTB();
    _src = s;
    _fig = {
      // —— ditarik dari WTB (buku besar) ——
      dbo:          s.dboBooked,        // 13.080 — WTB 2-2300 (nilai tercatat; dasar pajak 0)
      ckpn:         s.ckpnBooked,       // 1.980  — WTB 1-1210 (saldo dibukukan klien)
      ckpnAudited:  s.ckpnAudited,      // 2.600  — WTB 1-1210 setelah AJE PSAK 71
      ppeCarry:     s.ppeNetCarry,      // nilai tercatat neto aset tetap per WTB
      rouCarry:     s.rouCarry,         // 12.640 — WTB 1-2300
      leaseLiabWTB: s.leaseLiab,        // 12.800 — WTB 2-1500 + 2-2200
      dtaReported:  s.dtaReported,      // 4.980  — WTB 1-2500 (DTA per buku besar)
      taxExpBooked: s.taxExpBooked,     // beban pajak dibukukan (WTB 5-5100)
      // —— dasar pajak / rekonsiliasi fiskal (non-WTB) ——
      ppeBase:      s.ppeNetCarry - FISCAL.ppeTaxBaseDelta, // dasar pajak aset tetap (tercatat − beda temporer)
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
  }
  /* Buang memo agar akses berikutnya membangun ulang dari window.AMS.WTB terbaru.
     Dipanggil boot setelah hidrasi WTB, & oleh test yang mengganti WTB. */
  function resetFigures(): void { _src = null; _fig = null; }
  /* Proxy memo: target kosong, semua trap delegasi ke objek yang dibangun lazy. */
  function lazyFigures<T extends object>(pick: () => T): T {
    return new Proxy({} as T, {
      get: (_t, p) => (pick() as Record<PropertyKey, unknown>)[p],
      has: (_t, p) => p in (pick() as object),
      ownKeys: () => Reflect.ownKeys(pick() as object),
      getOwnPropertyDescriptor: (_t, p) => {
        const d = Object.getOwnPropertyDescriptor(pick() as object, p);
        if (d) d.configurable = true; // invarian Proxy: target kosong → wajib configurable
        return d;
      },
    });
  }
  const SRC: Figures = lazyFigures(() => { if (!_src) buildFigures(); return _src!; });
  const FIG: Fig = lazyFigures(() => { if (!_fig) buildFigures(); return _fig!; });

  /* ---------- pajak tangguhan: saldo akhir per pos (ditarik PSAK 46) ----------
     `wtb` opsional → bila diberi, dbo & ckpn mengikuti WTB reaktif (AJE live). */

  /* ---------- DI seam: generator LK (fsgen_model) mendaftarkan buildModel di sini saat boot app.
     Di headless/test tidak ada yang mendaftar → fsgenModel() = null → jembatan LK kanon inert
     (fingerprint regresi stabil). Menjaga kanon independen dari lapisan view-model — tanpa ini
     canon harus mengimpor view-model (.jsx) dan membalik arah lapisan. ---------- */
  let _fsgenBuildModel: ((wtb?: WTB) => FsModel) | null = null;
  function setFsgenBuilder(fn: ((wtb?: WTB) => FsModel) | null): void { _fsgenBuildModel = fn; }
  function fsgenModel(wtb?: WTB): FsModel | null { return _fsgenBuildModel ? _fsgenBuildModel(wtb) : null; }

export { RATE, ASOF, jt, wtbRow, wtbVal, WTB_MAP, figuresFromWTB, LEASES, leaseCalc, elapsedMonths, leasePortfolio, FISCAL, SRC, FIG, resetFigures, setFsgenBuilder, fsgenModel };
