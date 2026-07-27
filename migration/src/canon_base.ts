/* ============================================================
   Asseris — canon base (foundation: helper + konstanta + lease/figures) (W3 split dari canon.js; perilaku identik).
   ============================================================ */
import type { WTB, WtbAmountField, Figures, Fig, FsModel, EntityFigures, FigureBasis, Benchmark } from './canon_types';
import { AMS } from './data';

  const RATE = 0.22;
  const ASOF = { y: 2025, m: 12 };           // 31 Des 2025

  /* ---------- helper: tarik saldo akun dari WTB (by code) ---------- */
  const jt = (n: number) => Math.round((n || 0) / 1e6);                 // rupiah penuh → juta
  /* Satu aturan fallback WTB, dipakai wtbRow() maupun entityFigures(). */
  function wtbRows(wtb: WTB | undefined): WTB {
    return (wtb && wtb.length) ? wtb : ((AMS && AMS.WTB) || []);
  }
  function wtbRow(wtb: WTB | undefined, code: string) {
    return wtbRows(wtb).find(r => r.code === code) || null;
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

  /* ============================================================
     PR-A · FIGUR ENTITAS TINGKAT-ATAS — SSOT benchmark SA 320
     ------------------------------------------------------------
     Sebelum PR-A, PBT / aset lancar / liabilitas lancar entitas TIDAK punya
     selector: tiap modul mengarangnya sebagai konstanta (view_aje `AJE_PBT_UNADJ`
     89,14 M · view_sad `FS.pbt` 85,2 M · view_materiality `BENCHMARKS.pbt` 85,2 M),
     sementara turunan WTB memberi 29,69 M. Materialitas berdiri di atas angka
     yang tak pernah menyentuh buku besar. Fungsi ini menutup lubang itu.

     Agregasi memakai PREFIKS KODE, bukan daftar akun tetap: akun 5-xxxx yang tak
     dikenal jatuh ke `opex` dan TETAP mengalir ke PBT. Daftar tetap akan
     menjatuhkannya diam-diam — persis kelas kegagalan yang sedang diperbaiki.

     Satuan: **Rp PENUH** (bukan juta seperti FIG/figuresFromWTB) — konsumennya
     BENCHMARKS, jembatan laba AJE, dan rasio lancar semuanya rupiah penuh.
     ============================================================ */
  const EMPTY_FIGURES = (basis: FigureBasis): EntityFigures => ({
    basis, available: false,
    revenue: null, cogs: null, grossProfit: null, opex: null, financeCost: null,
    pbt: null, taxExpense: null, netIncome: null,
    curAssets: null, curLiab: null, currentRatio: null, totalAssets: null, equity: null,
  });

  /* SENGAJA tanpa fallback ke AMS.WTB (beda dari wtbRow/wtbVal yang mempertahankannya
     demi kompatibilitas pemanggil lama). Fungsi baru ini murni terhadap argumennya:
     fallback singleton adalah mekanisme cache-dingin yang justru ditutup PR-6b. */
  function entityFigures(wtb: WTB | undefined, basis: FigureBasis = 'unadj'): EntityFigures {
    const rows = (wtb && wtb.length) ? wtb : [];
    if (!rows.length) return EMPTY_FIGURES(basis);

    const amt = (r: { adj?: number; unadj?: number; ly?: number }) => { const v = r[basis]; return v != null ? v : 0; };
    const sum = (prefix: string) => rows
      .filter(r => String(r.code || '').startsWith(prefix))
      .reduce((s, r) => s + amt(r), 0);

    /* Pendapatan & ekuitas & liabilitas tersimpan sebagai KREDIT (negatif) di WTB. */
    const revenue     = -sum('4');
    const cogs        =  sum('5-1');
    const financeCost =  sum('5-4');
    /* Beban pajak diambil lewat kode terpetakan (WTB_MAP), bukan prefiks — supaya
       lineage-nya sama dengan yang dipakai PSAK 46. */
    const taxRow      = rows.find(r => r.code === WTB_MAP.taxExp.code);
    const taxExpense  = taxRow ? amt(taxRow) : 0;
    const allExpense  = sum('5');
    /* Sisa beban (termasuk akun tak dikenal) → opex. PBT karenanya = pendapatan
       dikurangi SELURUH beban selain pajak, apa pun bagan akunnya. */
    const opex        = allExpense - cogs - financeCost - taxExpense;
    const pbt         = revenue - cogs - opex - financeCost;

    const curAssets   =  sum('1-1');
    const curLiab     = -sum('2-1');

    return {
      basis, available: true,
      revenue, cogs, grossProfit: revenue - cogs, opex, financeCost,
      pbt, taxExpense, netIncome: pbt - taxExpense,
      curAssets, curLiab,
      currentRatio: curLiab !== 0 ? curAssets / curLiab : null,
      totalAssets: sum('1'),
      equity: -sum('3'),
    };
  }

  /* Tabel benchmark SA 320 diturunkan dari WTB. `id`/`lo`/`hi`/`def`/`note`
     dipertahankan persis dari konstanta lama agar `mat.benchId` yang sudah
     terpersist tetap resolve. Benchmark yang figurnya null DIHILANGKAN — lebih
     baik hilang daripada muncul bernilai nol dan tampak otoritatif. */
  function benchmarksFromWTB(wtb: WTB | undefined, basis: FigureBasis = 'unadj'): Benchmark[] {
    const f = entityFigures(wtb, basis);
    if (!f.available) return [];
    const spec: Array<[string, string, number | null, number, number, number, string]> = [
      ['pbt',    'Laba Sebelum Pajak', f.pbt,         5,   10, 5, 'Lazim untuk entitas berorientasi laba'],
      ['rev',    'Total Pendapatan',   f.revenue,     0.5, 1,  1, 'Untuk entitas volume tinggi / margin tipis'],
      ['gp',     'Laba Bruto',         f.grossProfit, 1,   3,  2, 'Alternatif bila laba bersih fluktuatif'],
      ['assets', 'Total Aset',         f.totalAssets, 1,   2,  1, 'Untuk entitas padat aset'],
      ['equity', 'Total Ekuitas',      f.equity,      2,   5,  3, 'Untuk entitas dengan fokus permodalan'],
    ];
    return spec
      .filter((s): s is [string, string, number, number, number, number, string] => s[2] != null)
      .map(([id, label, value, lo, hi, def, note]) => ({ id, label, value, lo, hi, def, note }));
  }

  /* Efek jurnal penyesuaian BERSTATUS TERTENTU terhadap figur entitas.
     ------------------------------------------------------------
     Mengapa ada: kolom `aje` di WTB memuat SELURUH jurnal, termasuk yang masih
     berstatus Proposed (AJE-03 & AJE-05 pada seed). Karena itu `entityFigures(…,'adj')`
     BUKAN "figur dilaporkan" — ia figur seandainya semua usulan disetujui. Figur
     dilaporkan = `unadj` + efek jurnal yang benar-benar DIPOSTING, dan register AJE
     (yang punya field `status`) adalah satu-satunya otoritas atas status itu.

     Tanpa fungsi ini modul AJE dan modul SAD akan menyebut dua "PBT dilaporkan"
     berbeda — persis penyakit yang sedang diobati.

     Baris jurnal ditarik dari `lines` bila ada; entri seed lama hanya punya string
     `dr`/`cr` sehingga di-parse ke bentuk yang sama (satu jalur, bukan dua). */
  interface AjeLine { code: string; debit: number; credit: number }
  interface AjeLike { status?: string; lines?: Array<{ code?: string; debit?: number; credit?: number }>; dr?: string; cr?: string; amount?: number }

  function ajeLinesOf(a: AjeLike): AjeLine[] {
    if (Array.isArray(a.lines) && a.lines.length) {
      return a.lines.map(l => ({ code: String(l.code || ''), debit: +(l.debit || 0), credit: +(l.credit || 0) }));
    }
    const amt = +(a.amount || 0);
    if (!a.dr || !a.cr || !amt) return [];
    return [
      { code: String(a.dr).split(' ')[0], debit: amt, credit: 0 },
      { code: String(a.cr).split(' ')[0], debit: 0, credit: amt },
    ];
  }

  /** Efek agregat jurnal berstatus `status` (default 'Posted') — Rp PENUH, bertanda
      searah `EntityFigures` (pbt naik = laba naik; curLiab naik = liabilitas naik). */
  function ajeEffect(aje: AjeLike[] | undefined, status = 'Posted') {
    const list = (aje || []).filter(a => String(a.status || '').trim() === status);
    let pbt = 0, curAssets = 0, curLiab = 0;
    list.forEach(a => ajeLinesOf(a).forEach(l => {
      const net = l.debit - l.credit;                 // debit positif
      const c = l.code;
      if (c[0] === '4' || c[0] === '5') pbt -= net;   // beban debit / pendapatan debit → laba turun
      if (c.startsWith('1-1')) curAssets += net;
      if (c.startsWith('2-1')) curLiab -= net;        // liabilitas tersimpan kredit
    }));
    return { pbt, curAssets, curLiab };
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
     dasar pajak aset tetap, rugi fiskal, beda permanen — berasal dari
     SPT / rekonsiliasi fiskal. Dipisah agar jelas mana yang ber-sumber WTB.

     `pbt` dan `pkp` TIDAK ADA DI SINI (dulu 48.500 & 53.500): keduanya kini
     DITURUNKAN — lihat fiscalReconciliation(). PBT adalah laba komersial, jadi
     ia milik buku besar; PKP adalah hasil identitas rekonsiliasi, jadi ia
     hitungan. Menyimpannya sebagai konstanta adalah cara sebuah angka yang tak
     pernah menyentuh WTB bertahan lima kali evaluasi. */
  const FISCAL = {
    ppeTaxBaseDelta: 5500,   // beda temporer aset tetap (tercatat − dasar pajak) per kertas kerja fiskal
    provisi: 900,            // PSAK 57 · provisi garansi & lainnya (beda temporer)
    taxLoss: 3000,           // rugi fiskal entitas anak dapat dikompensasi
    ociRemeasure: 270,       // PSAK 24 · pengukuran kembali (OCI) → pajak OCI
    permAdd: 1200,           // beda permanen — beban tidak dapat dikurangkan
    permLess: 3000,          // beda permanen — penghasilan dikecualikan / final
    /* Movement beda temporer tahun berjalan, per pos (kertas kerja fiskal).
       Larik — bukan penjumlahan telanjang — karena view PSAK 46 dulu mengetik
       ulang keempat angka ini untuk menampilkan rinciannya. Satu daftar, dua
       konsumen: total di sini, baris tabel di sana. */
    tempMovementItems: [
      { id: 't1', label: 'Penyisihan imbalan kerja belum direalisasi (PSAK 24)', v: 1860 },
      { id: 't2', label: 'Beban CKPN / kerugian ekspektasian (PSAK 71)',         v: 2400 },
      { id: 't3', label: 'Provisi garansi & liabilitas lain',                    v: 900  },
      { id: 't4', label: 'Selisih penyusutan komersial di atas fiskal',          v: 1640 },
    ],
    /* movement beda temporer th berjalan = 6800 */
    get fiscalTempMovement(): number { return this.tempMovementItems.reduce((s, x) => s + x.v, 0); },
  };

  /* ============================================================
     REKONSILIASI FISKAL (PSAK 46) — laba komersial → PKP
     ------------------------------------------------------------
     POPULASI: laba komersial entitas INDUK STANDALONE. Bukan konsolidasian.
     PPh Badan dinilai per ENTITAS HUKUM (satu SPT per entitas), sedangkan
     materialitas SA 320/600 sejak arc SA 600 berdiri di atas figur
     KONSOLIDASIAN. Dua populasi, dua tujuan, keduanya benar — jangan
     "selaraskan" salah satunya ke yang lain.

     BASIS PBT: figur DILAPORKAN = WTB unadjusted + efek jurnal yang benar-benar
     DIPOSTING. Bukan kolom `adj` WTB — kolom itu memuat usulan yang partner
     belum putuskan, dan memakainya membuat rekonsiliasi fiskal mengandaikan
     keputusan yang belum diambil (sirkularitas yang sama yang ditolak PR-A).

     Rekonsiliasi fiskal karenanya berada DI HILIR finalisasi AJE. Selama masih
     ada jurnal berstatus usulan, hasil fungsi ini belum final — `pendingAje`
     membawa fakta itu agar view dapat menyatakannya, bukan menyembunyikannya.

     Satuan: Rp JUTA (konsumennya FIG & deferredTax), sedangkan entityFigures
     memberi rupiah penuh → pembulatan dilakukan SETELAH penjumlahan.
     ============================================================ */
  interface FiscalReconciliation {
    available: boolean;
    pbtUnadj: number; ajePosted: number; pbt: number;
    permAdd: number; permLess: number; tempMovement: number; pkp: number;
    pendingAje: string[];
  }

  function fiscalReconciliation(wtb?: WTB, aje?: AjeLike[]): FiscalReconciliation {
    /* Fallback singleton DIPERTAHANKAN di sini (beda dari entityFigures): kanon
       punya kontrak "setiap fungsi dapat dipanggil tanpa argumen", dan FIG
       dibangun lewat jalur zero-arg itu. */
    const rows = wtbRows(wtb);
    const list = aje || ((AMS && (AMS.AJE as unknown as AjeLike[])) || []);
    const f = entityFigures(rows, 'unadj');
    const permAdd = FISCAL.permAdd;
    const permLess = FISCAL.permLess;
    const tempMovement = FISCAL.fiscalTempMovement;
    if (!f.available) {
      return { available: false, pbtUnadj: 0, ajePosted: 0, pbt: 0,
               permAdd, permLess, tempMovement, pkp: 0, pendingAje: [] };
    }
    const pbtUnadj = jt(f.pbt!);
    const posted = ajeEffect(list, 'Posted').pbt;
    const pbt = jt(f.pbt! + posted);
    return {
      available: true,
      pbtUnadj, ajePosted: pbt - pbtUnadj, pbt,
      permAdd, permLess, tempMovement,
      pkp: pbt + permAdd - permLess + tempMovement,
      pendingAje: list.filter(a => String(a.status || '').trim() === 'Proposed')
                      .map(a => String((a as { id?: string }).id || '')).filter(Boolean),
    };
  }

  /* ---------- FIG / SRC: saldo akhir kanonik tiap pos (Rp juta) ----------
     W6 Fase 3 (W6·2) — dihitung LAZY (saat akses properti pertama), BUKAN saat
     module-load. Sebelumnya `figuresFromWTB()` membaca AMS.WTB saat load,
     mengikat canon ke WTB statis data.js. Kini boot menghidrasi AMS.WTB
     dari API lebih dulu (lihat api.js · hydrateCoreFromApi); akses pertama lalu
     membangun angka dari WTB ter-hidrasi → nol drift vs baseline W0.
     Tetap berupa OBJEK (lewat Proxy memo) agar `FIG.x`, `Object.assign({}, FIG, …)`,
     spread, dan `AMS_CANON.FIG` bekerja tanpa perubahan di pemanggil.
     Nama field lama dipertahankan agar konsumen (PSAK 46, ECL, Sewa) tetap kompatibel. */
  let _src: Figures | null = null;
  let _fig: Fig | null = null;
  function buildFigures(): void {
    const s = figuresFromWTB();
    const fisc = fiscalReconciliation();
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
      pbt:          fisc.pbt,          // laba komersial DILAPORKAN (WTB unadj + AJE terposting)
      pkp:          fisc.pkp,          // hasil identitas rekonsiliasi — bukan konstanta
      permAdd:      FISCAL.permAdd,
      permLess:     FISCAL.permLess,
      fiscalTempMovement: FISCAL.fiscalTempMovement,
    };
  }
  /* Buang memo agar akses berikutnya membangun ulang dari AMS.WTB terbaru.
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

export type { FiscalReconciliation, AjeLike };
export { RATE, ASOF, jt, wtbRow, wtbVal, WTB_MAP, figuresFromWTB, entityFigures, benchmarksFromWTB, ajeEffect, fiscalReconciliation, LEASES, leaseCalc, elapsedMonths, leasePortfolio, FISCAL, SRC, FIG, resetFigures, setFsgenBuilder, fsgenModel };
