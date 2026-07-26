/* ============================================================
   W4 — Minimal WTB fixture.
   A hand-built trial balance covering exactly the account codes the
   canon engines map via WTB_MAP, with round values so the derived
   figures are pinnable by hand. Values are in FULL rupiah (engines
   normalize to Rp juta via jt() = round(n / 1e6)).

   Used to prove the engines are PURE functions of the WTB they are
   given — not just readers of the AMS.WTB singleton.
   ============================================================ */

// field convention used by the engines: ly = prior year, unadj = client
// pre-audit, aje = audit adjustment, adj = audited (post-AJE).
const row = (code, label, { ly = 0, unadj = 0, aje = 0 } = {}) => ({
  code, label, ly, unadj, aje, adj: unadj + aje,
});

export const FIXTURE_WTB = [
  // Piutang usaha & CKPN (PSAK 71)
  row('1-1200', 'Piutang Usaha',            { ly: 40_000_000_000, unadj: 52_000_000_000, aje: -2_000_000_000 }),
  row('1-1210', 'CKPN Piutang',             { ly: -1_500_000_000, unadj: -1_980_000_000, aje: -620_000_000 }),
  // Aset tetap (PSAK 16)
  row('1-2100', 'Aset Tetap — Perolehan',   { unadj: 50_000_000_000 }),
  row('1-2110', 'Akumulasi Penyusutan',     { unadj: -20_000_000_000 }),
  // Aset hak-guna & liabilitas sewa (PSAK 73)
  row('1-2300', 'Aset Hak-Guna',            { unadj: 12_640_000_000 }),
  row('2-1500', 'Liabilitas Sewa — Pendek', { unadj: -4_000_000_000 }),
  row('2-2200', 'Liabilitas Sewa — Panjang',{ unadj: -8_800_000_000 }),
  // Aset takberwujud (PSAK 19)
  row('1-2400', 'Aset Takberwujud — Perolehan', { unadj: 6_000_000_000 }),
  row('1-2410', 'Akumulasi Amortisasi',     { unadj: -2_000_000_000 }),
  // Imbalan kerja (PSAK 24)
  row('2-2300', 'Liabilitas Imbalan Kerja', { unadj: -13_080_000_000 }),
  // Pajak tangguhan & beban pajak (PSAK 46)
  row('1-2500', 'Aset Pajak Tangguhan',     { unadj: 4_980_000_000 }),
  row('5-5100', 'Beban Pajak Penghasilan',  { unadj: 9_000_000_000 }),
];

/* ============================================================
   PR-A — Neraca saldo LENGKAP untuk entityFigures().
   FIXTURE_WTB di atas hanya memuat pos yang dipetakan WTB_MAP (tanpa
   pendapatan, beban operasi, maupun ekuitas) sehingga tak dapat menguji
   agregasi laba-rugi. Fixture ini sengaja dibuat:
     · SEIMBANG — total debit = total kredit pada kolom unadj DAN kolom aje,
     · BERARTIKULASI — laba neto unadj = pergerakan saldo laba (8.000),
   supaya invarian "Aset = Liabilitas + Ekuitas + Laba" dapat diuji. Invarian
   itu membuktikan TAK ADA akun yang jatuh diam-diam dari agregasi prefiks.
   Nilai bulat dalam Rp penuh; kelipatan miliar agar dapat dihitung tangan.
   ============================================================ */
export const FIXTURE_TB_FULL = [
  // — Aset lancar (1-1) —
  row('1-1100', 'Kas',                { ly:  8_000_000_000, unadj:  9_000_000_000 }),
  row('1-1200', 'Piutang Usaha',      { ly: 25_000_000_000, unadj: 30_000_000_000, aje: -2_000_000_000 }),
  row('1-1210', 'CKPN Piutang',       { ly:   -800_000_000, unadj: -1_000_000_000, aje:   -500_000_000 }),
  row('1-1300', 'Persediaan',         { ly: 18_000_000_000, unadj: 20_000_000_000, aje: -1_500_000_000 }),
  // — Aset tidak lancar (1-2) —
  row('1-2100', 'Aset Tetap',         { ly: 60_000_000_000, unadj: 60_000_000_000 }),
  row('1-2110', 'Ak. Penyusutan',     { ly:-16_000_000_000, unadj:-20_000_000_000, aje: -1_000_000_000 }),
  // — Liabilitas jangka pendek (2-1) —
  row('2-1100', 'Utang Usaha',        { ly:-12_000_000_000, unadj:-15_000_000_000 }),
  row('2-1300', 'Beban Akrual',       { ly: -4_000_000_000, unadj: -5_000_000_000, aje: -1_000_000_000 }),
  // — Liabilitas jangka panjang (2-2) —
  row('2-2100', 'Utang Bank Jk. Panjang', { ly:-22_000_000_000, unadj:-20_000_000_000 }),
  // — Ekuitas (3) — saldo laba = SALDO AWAL (neraca saldo pra-tutup buku) —
  row('3-1100', 'Modal Saham',        { ly:-30_000_000_000, unadj:-30_000_000_000 }),
  row('3-2100', 'Saldo Laba',         { ly:-20_000_000_000, unadj:-20_000_000_000 }),
  // — Laba rugi (4 / 5) —
  row('4-1100', 'Penjualan',          { ly:-90_000_000_000, unadj:-100_000_000_000, aje: 2_000_000_000 }),
  row('5-1100', 'Beban Pokok Penjualan', { ly: 54_000_000_000, unadj: 60_000_000_000, aje: 2_500_000_000 }),
  row('5-2100', 'Beban Penjualan',    { ly: 11_000_000_000, unadj: 12_000_000_000 }),
  row('5-3100', 'Beban Umum & Adm.',  { ly: 13_000_000_000, unadj: 15_000_000_000, aje: 1_500_000_000 }),
  row('5-4100', 'Beban Keuangan',     { ly:  2_000_000_000, unadj:  2_000_000_000 }),
  row('5-5100', 'Beban Pajak Penghasilan', { ly: 2_400_000_000, unadj: 3_000_000_000 }),
];

/* Figur turunan tangan dari FIXTURE_TB_FULL — Rp PENUH (entityFigures tidak
   menormalkan ke juta seperti figuresFromWTB). */
export const FIXTURE_TB_FIGURES = {
  unadj: {
    revenue:     100_000_000_000,
    cogs:         60_000_000_000,
    grossProfit:  40_000_000_000,
    opex:         27_000_000_000,   // 12.000 + 15.000
    financeCost:   2_000_000_000,
    pbt:          11_000_000_000,   // 100.000 − 60.000 − 27.000 − 2.000
    taxExpense:    3_000_000_000,
    netIncome:     8_000_000_000,   // = pergerakan saldo laba (artikulasi)
    curAssets:    58_000_000_000,   // 9.000 + 30.000 − 1.000 + 20.000
    curLiab:      20_000_000_000,   // 15.000 + 5.000
    totalAssets:  98_000_000_000,   // 58.000 + 60.000 − 20.000
    equity:       50_000_000_000,   // 30.000 + 20.000 (pra-tutup buku)
  },
  adj: {
    revenue:      98_000_000_000,
    cogs:         62_500_000_000,
    grossProfit:  35_500_000_000,
    opex:         28_500_000_000,   // 12.000 + 16.500
    financeCost:   2_000_000_000,
    pbt:           5_000_000_000,
    taxExpense:    3_000_000_000,
    netIncome:     2_000_000_000,
    curAssets:    54_000_000_000,
    curLiab:      21_000_000_000,
    totalAssets:  93_000_000_000,
    equity:       50_000_000_000,
  },
};

// Hand-computed expected figures from FIXTURE_WTB (Rp juta), matching
// figuresFromWTB()'s sign/field rules.
export const FIXTURE_FIGURES = {
  dboBooked:     13_080,   // -1 * jt(-13_080M) [adj]
  ckpnBooked:     1_980,   // -1 * jt(-1_980M)  [unadj]
  ckpnAudited:    2_600,   // -1 * jt(-2_600M)  [adj = unadj + aje]
  ppeGross:      50_000,
  ppeAccum:     -20_000,
  ppeNetCarry:   30_000,
  intanGross:     6_000,
  intanAccum:    -2_000,
  intanNetCarry:  4_000,
  rouCarry:      12_640,
  leaseLiab:     12_800,   // -1 * (jt(-4_000M) + jt(-8_800M))
  dtaReported:    4_980,
  taxExpBooked:   9_000,
};
