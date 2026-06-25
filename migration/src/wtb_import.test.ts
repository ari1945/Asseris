/* W-WTB·1 — parser/validator ingress WTB (paste/CSV). Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { parseTrialBalance, parseAmount, groupFromCode, computeCoverage } from './wtb_import';

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
