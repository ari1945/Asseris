/* W-WTB·1 — parser/validator ingress WTB (paste/CSV). Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { parseTrialBalance, parseAmount, groupFromCode, computeCoverage, leadFromCode } from './wtb_import';

/* TB mini SEIMBANG (Dr +, Cr −). unadj Σ=0; AJE pasangan ganda (Dr beban / Cr
   piutang) net 0 → adj Σ=0. */
const BALANCED_TB = [
  'Kode\tNama\tTA Lalu\tUnadjusted\tAJE',
  '1-1100\tKas\t900.000.000\t1.000.000.000\t0',
  '1-1200\tPiutang Usaha\t1.800.000.000\t2.000.000.000\t-100.000.000',
  '2-1100\tUtang Usaha\t-1.200.000.000\t-1.500.000.000\t0',
  '3-2100\tSaldo Laba\t-2.800.000.000\t-3.000.000.000\t0',
  '4-1100\tPenjualan\t-1.800.000.000\t-2.000.000.000\t0',
  '5-1100\tBeban Pokok\t3.000.000.000\t3.500.000.000\t100.000.000',
].join('\n');

describe('parseAmount — toleran format id-ID', () => {
  it('ribuan titik, desimal koma, Rp, kurung negatif, dash kosong', () => {
    expect(parseAmount('1.850.000.000')).toBe(1_850_000_000);
    expect(parseAmount('Rp 620.000.000')).toBe(620_000_000);
    expect(parseAmount('(620.000.000)')).toBe(-620_000_000);
    expect(parseAmount('1.234,50')).toBeCloseTo(1234.5, 4);
    expect(parseAmount('—')).toBe(0);
    expect(parseAmount('-')).toBe(0);
    expect(parseAmount('')).toBe(0);
    expect(parseAmount('-500')).toBe(-500);
    expect(parseAmount('500-')).toBe(-500);
  });
  it('mengembalikan null untuk token benar-benar tak terbaca', () => {
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12x34')).toBeNull();
  });
});

describe('groupFromCode — infer grup FS dari prefix', () => {
  it('memetakan prefix ke caption neraca/laba-rugi', () => {
    expect(groupFromCode('1-1100')).toBe('Aset Lancar');
    expect(groupFromCode('1-2300')).toBe('Aset Tidak Lancar');
    expect(groupFromCode('2-1500')).toBe('Liabilitas Jk. Pendek');
    expect(groupFromCode('2-2200')).toBe('Liabilitas Jk. Panjang');
    expect(groupFromCode('3-2100')).toBe('Ekuitas');
    expect(groupFromCode('4-1100')).toBe('Pendapatan');
    expect(groupFromCode('5-1100')).toBe('Beban');
    expect(groupFromCode('9-9999')).toBe('Lainnya');
  });
});

describe('parseTrialBalance — alur sukses (header + tab)', () => {
  const res = parseTrialBalance(BALANCED_TB);

  it('terbaca tanpa error & seimbang', () => {
    expect(res.ok).toBe(true);
    expect(res.meta.hadHeader).toBe(true);
    expect(res.meta.delimiterLabel).toBe('Tab');
    expect(res.meta.balanced).toBe(true);
    expect(res.issues.filter(i => i.level === 'error')).toHaveLength(0);
  });

  it('adj = unadj + aje untuk tiap baris', () => {
    for (const r of res.rows) expect(r.adj).toBe(r.unadj + r.aje);
    const piutang = res.rows.find(r => r.code === '1-1200')!;
    expect(piutang.unadj).toBe(2_000_000_000);
    expect(piutang.aje).toBe(-100_000_000);
    expect(piutang.adj).toBe(1_900_000_000);
  });

  it('grup ter-infer & nama terisi', () => {
    expect(res.rows.find(r => r.code === '1-1100')!.group).toBe('Aset Lancar');
    expect(res.rows.find(r => r.code === '4-1100')!.name).toBe('Penjualan');
  });
});

describe('parseTrialBalance — gerbang validasi', () => {
  /* PR-4c — sumber saldo audited TA-1 adalah ekstrak sebagian; Σ = 0 tak berlaku di sana. */
  it('requireBalanced:false → ketidak-seimbangan jadi peringatan, bukan penolakan', () => {
    const sebagian = ['Kode\tNama\tSaldo', '1-1100\tKas\t900.000.000', '1-1200\tPiutang\t1.800.000.000'].join('\n');
    const ketat = parseTrialBalance(sebagian);
    const longgar = parseTrialBalance(sebagian, { requireBalanced: false });
    expect(ketat.ok).toBe(false);
    expect(longgar.ok).toBe(true);
    expect(longgar.issues.some(i => i.code === 'unbalanced' && i.level === 'warn')).toBe(true);
    expect(longgar.meta.balanced).toBe(false);   // fakta tetap dilaporkan apa adanya
  });

  it('menandai TB tak seimbang sebagai error', () => {
    const unbal = ['Kode\tUnadjusted', '1-1100\t1.000.000.000', '2-1100\t-400.000.000'].join('\n');
    const res = parseTrialBalance(unbal);
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === 'unbalanced')).toBe(true);
  });

  it('menandai kode akun ganda', () => {
    const dup = ['Kode\tUnadjusted', '1-1100\t1.000.000.000', '1-1100\t-1.000.000.000'].join('\n');
    const res = parseTrialBalance(dup);
    expect(res.issues.some(i => i.code === 'duplicate-code')).toBe(true);
  });

  it('menandai angka tak terbaca', () => {
    const bad = ['Kode\tUnadjusted', '1-1100\tabc'].join('\n');
    const res = parseTrialBalance(bad);
    expect(res.issues.some(i => i.code === 'bad-number')).toBe(true);
    expect(res.ok).toBe(false);
  });

  it('input kosong → tidak ok', () => {
    const res = parseTrialBalance('   \n  ');
    expect(res.ok).toBe(false);
    expect(res.issues.some(i => i.code === 'empty')).toBe(true);
  });

  it('header dikenali tapi tanpa kolom saldo → error', () => {
    // header valid (kode + TA Lalu) namun tak ada unadjusted/debit/kredit
    const res = parseTrialBalance(['Kode\tTA Lalu', '1-1100\t900.000.000'].join('\n'));
    expect(res.issues.some(i => i.code === 'no-balance-column')).toBe(true);
  });
});

describe('parseTrialBalance — kolom Debit/Kredit', () => {
  it('saldo bertanda = debit − kredit', () => {
    const dc = ['Kode\tDebit\tKredit', '1-1100\t1.000.000.000\t0', '2-1100\t0\t1.000.000.000'].join('\n');
    const res = parseTrialBalance(dc);
    expect(res.ok).toBe(true);
    expect(res.rows.find(r => r.code === '1-1100')!.unadj).toBe(1_000_000_000);
    expect(res.rows.find(r => r.code === '2-1100')!.unadj).toBe(-1_000_000_000);
    expect(res.meta.balanced).toBe(true);
  });
});

describe('parseTrialBalance — fallback posisional (tanpa header) & delimiter ;', () => {
  it('memetakan kolom secara posisional dan deteksi titik-koma', () => {
    const pos = ['1-1100;Kas;0;1.000.000.000;0', '2-1100;Utang;0;-1.000.000.000;0'].join('\n');
    const res = parseTrialBalance(pos);
    expect(res.meta.hadHeader).toBe(false);
    expect(res.meta.delimiterLabel).toBe('Titik koma');
    expect(res.rows).toHaveLength(2);
    expect(res.rows[0].name).toBe('Kas');
    expect(res.ok).toBe(true);
  });
});

/* PR-2a — gerbang skala. Uji keseimbangan INVARIAN terhadap skala: TB "dalam ribuan"
   lolos bersih dengan control total seimbang ✓ sambil understated 1.000×. */
describe('parseTrialBalance — satuan penyajian (PR-2a)', () => {
  /* TB yang sama, ditulis dalam RIBUAN (tiga nol dipangkas) */
  const TB_RIBUAN = [
    'Kode\tNama\tTA Lalu\tUnadjusted\tAJE',
    '1-1100\tKas\t900.000\t1.000.000\t0',
    '1-1200\tPiutang Usaha\t1.800.000\t2.000.000\t-100.000',
    '2-1100\tUtang Usaha\t-1.200.000\t-1.500.000\t0',
    '3-2100\tSaldo Laba\t-2.800.000\t-3.000.000\t0',
    '4-1100\tPenjualan\t-1.800.000\t-2.000.000\t0',
    '5-1100\tBeban Pokok\t3.000.000\t3.500.000\t100.000',
  ].join('\n');

  it('default = Rupiah penuh (nol regresi)', () => {
    const r = parseTrialBalance(BALANCED_TB);
    expect(r.meta.unit).toBe('full');
    expect(r.meta.unitFactor).toBe(1);
    expect(r.rows.find(x => x.code === '1-1100')!.unadj).toBe(1_000_000_000);
  });

  it('satuan ribuan dikalikan sekali di parser → hilir selalu Rupiah penuh', () => {
    const r = parseTrialBalance(TB_RIBUAN, { unit: 'thousand' });
    expect(r.ok).toBe(true);
    expect(r.meta.unitFactor).toBe(1000);
    expect(r.rows.find(x => x.code === '1-1100')!.unadj).toBe(1_000_000_000);
    expect(r.rows.find(x => x.code === '1-1200')!.aje).toBe(-100_000_000);
    // identik dengan TB Rupiah penuh
    const full = parseTrialBalance(BALANCED_TB);
    expect(r.meta.totalAssets).toBe(full.meta.totalAssets);
  });

  it('satuan jutaan dikalikan 1.000.000', () => {
    const r = parseTrialBalance('1-1100\tKas\t0\t5\t0\n2-1100\tUtang\t0\t-5\t0', { unit: 'million' });
    expect(r.rows[0].unadj).toBe(5_000_000);
  });

  it('SEIMBANG walau salah satuan — bukti gerbang balance tak bisa menangkapnya', () => {
    const salah = parseTrialBalance(TB_RIBUAN); // seharusnya 'thousand', dibiarkan 'full'
    expect(salah.meta.balanced).toBe(true);     // ← lolos bersih
    // total aset = saldo ADJUSTED: 1.000.000 + (2.000.000 − 100.000)
    expect(salah.meta.totalAssets).toBe(2_900_000);           // understated 1.000×…
    expect(parseTrialBalance(BALANCED_TB).meta.totalAssets).toBe(2_900_000_000); // …vs yang benar
  });

  it('total aset < materialitas perikatan → BLOKIR (error), bukan sekadar peringatan', () => {
    const salah = parseTrialBalance(TB_RIBUAN, { engMateriality: 150_000_000 });
    expect(salah.ok).toBe(false);
    expect(salah.issues.some(i => i.code === 'scale-below-materiality' && i.level === 'error')).toBe(true);
  });

  it('satuan benar + materialitas wajar → lolos tanpa isu skala', () => {
    const benar = parseTrialBalance(TB_RIBUAN, { unit: 'thousand', engMateriality: 150_000_000 });
    expect(benar.ok).toBe(true);
    expect(benar.issues.some(i => i.code.startsWith('scale-'))).toBe(false);
  });

  it('rasio total aset : materialitas < 10× → peringatan (klien kecil sah tak diblokir)', () => {
    const r = parseTrialBalance(BALANCED_TB, { engMateriality: 500_000_000 }); // aset 3 M → 6×
    expect(r.ok).toBe(true);
    expect(r.issues.some(i => i.code === 'scale-suspect' && i.level === 'warn')).toBe(true);
  });

  it('tanpa materialitas perikatan gerbang skala nonaktif (tak ada acuan → tak menuduh)', () => {
    const r = parseTrialBalance(TB_RIBUAN);
    expect(r.issues.some(i => i.code.startsWith('scale-'))).toBe(false);
  });
});

/* PR-4a — dulu setiap baris terimpor ber-lead '' sehingga strip asersi SA 315 hilang
   total dan kolom WP kosong untuk TB klien nyata. */
describe('leadFromCode — lead schedule tebakan (PR-4a)', () => {
  it('memetakan keluarga kode ke huruf lead kanonik', () => {
    expect(leadFromCode('1-1100')).toBe('A');   // kas
    expect(leadFromCode('1-1210')).toBe('B');   // CKPN ikut piutang
    expect(leadFromCode('1-1300')).toBe('C');   // persediaan
    expect(leadFromCode('1-2110')).toBe('E');   // akumulasi penyusutan ikut aset tetap
    expect(leadFromCode('1-2400')).toBe('EI');  // takberwujud
    expect(leadFromCode('2-2200')).toBe('F');   // liabilitas sewa jk panjang
    expect(leadFromCode('2-2300')).toBe('H');   // imbalan kerja
    expect(leadFromCode('4-1100')).toBe('R');
    expect(leadFromCode('5-5100')).toBe('W');
  });

  it('menerima kode tanpa tanda hubung', () => {
    expect(leadFromCode('11100')).toBe('A');
    expect(leadFromCode('5 1100')).toBe('S');
  });

  it('keluarga tak dikenali → kosong (bukan tebakan asal)', () => {
    expect(leadFromCode('9-9999')).toBe('');
    expect(leadFromCode('')).toBe('');
  });

  it('baris hasil impor membawa lead, bukan string kosong', () => {
    const r = parseTrialBalance(BALANCED_TB);
    expect(r.rows.find(x => x.code === '1-1100')!.lead).toBe('A');
    expect(r.rows.find(x => x.code === '5-1100')!.lead).toBe('S');
    expect(r.rows.every(x => x.lead !== '')).toBe(true);
  });
});

describe('computeCoverage — kejujuran engine PSAK', () => {
  it('semua kode WTB_MAP hadir → seluruh engine menyala', () => {
    const full = new Set(['2-2300', '1-1210', '1-2100', '1-2110', '1-2400', '1-2410', '1-2300', '2-1500', '2-2200', '1-2500', '5-5100']);
    const cov = computeCoverage(full);
    expect(cov.matchedPct).toBe(100);
    expect(cov.engines.every(e => e.lit)).toBe(true);
  });

  it('kode hilang → engine terkait tidak menyala & ada kode missing', () => {
    const cov = computeCoverage(new Set(['1-1210'])); // hanya CKPN (PSAK 71)
    expect(cov.engines.find(e => e.id === 'psak71')!.lit).toBe(true);
    expect(cov.engines.find(e => e.id === 'psak16')!.lit).toBe(false);
    expect(cov.missingCodes.length).toBeGreaterThan(0);
    expect(cov.matchedPct).toBeLessThan(100);
  });
});
