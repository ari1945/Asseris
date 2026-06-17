/* ============================================================
   W4 — Minimal WTB fixture.
   A hand-built trial balance covering exactly the account codes the
   canon engines map via WTB_MAP, with round values so the derived
   figures are pinnable by hand. Values are in FULL rupiah (engines
   normalize to Rp juta via jt() = round(n / 1e6)).

   Used to prove the engines are PURE functions of the WTB they are
   given — not just readers of the global window.AMS.WTB.
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
