/* PR-2b — provenance impor & pratinjau dampak (fungsi murni). */
import { describe, it, expect } from 'vitest';
import { summarizeImport, pushHistory, diffWtb, rawExcerptOf, RAW_EXCERPT_LIMIT } from './wtb_provenance';
import type { ImportProvenance } from './wtb_provenance';

const prov = (at: string): ImportProvenance => summarizeImport({
  importedAt: at, user: { id: 'U1', name: 'Anindya P.', role: 'Audit Manager' },
  unit: 'thousand', unitFactor: 1000, period: 'FY2025', sourceName: 'TB.xlsx', sha256: 'abc',
  rowCount: 3, totalAssets: 1_000, balanced: true,
});

describe('summarizeImport — header provenance', () => {
  it('merekam pengimpor, satuan, periode, sumber & hash', () => {
    const p = prov('2026-01-02T03:04:05.000Z');
    expect(p).toMatchObject({
      userId: 'U1', userName: 'Anindya P.', userRole: 'Audit Manager',
      unit: 'thousand', unitFactor: 1000, period: 'FY2025', sourceName: 'TB.xlsx', sha256: 'abc',
    });
  });

  it('tanpa sesi pengguna → penanda eksplisit, bukan string kosong senyap', () => {
    const p = summarizeImport({
      importedAt: 'x', user: null, unit: 'full', unitFactor: 1,
      rowCount: 0, totalAssets: 0, balanced: false,
    });
    expect(p.userName).toBe('(tak diketahui)');
  });
});

describe('pushHistory — riwayat terbatas, terbaru di depan', () => {
  it('menyisipkan di depan & memangkas ke max', () => {
    let h: ImportProvenance[] = [];
    for (let i = 1; i <= 7; i++) h = pushHistory(h, prov('2026-01-0' + i + 'T00:00:00.000Z'), 5);
    expect(h).toHaveLength(5);
    expect(h[0].importedAt).toBe('2026-01-07T00:00:00.000Z');
    expect(h[4].importedAt).toBe('2026-01-03T00:00:00.000Z');
  });
});

describe('diffWtb — dampak penggantian TB', () => {
  const before = [
    { code: '1-1100', name: 'Kas', adj: 1_000 },
    { code: '1-1200', name: 'Piutang', adj: 2_000 },
    { code: '4-1100', name: 'Penjualan', adj: -5_000 },
    { code: '5-1100', name: 'BPP', adj: 3_000 },
  ];

  it('mengklasifikasi akun baru / hilang / berubah / tetap', () => {
    const after = [
      { code: '1-1100', name: 'Kas', adj: 1_000 },        // tetap
      { code: '1-1200', name: 'Piutang', adj: 2_500 },    // berubah
      { code: '1-1300', name: 'Persediaan', adj: 700 },   // baru
      { code: '4-1100', name: 'Penjualan', adj: -5_000 },
      { code: '5-1100', name: 'BPP', adj: 3_000 },
    ];
    const d = diffWtb(before, after);
    expect(d.changed.map(c => c.code)).toEqual(['1-1200']);
    expect(d.added.map(c => c.code)).toEqual(['1-1300']);
    expect(d.removed).toHaveLength(0);
    expect(d.unchangedCount).toBe(3);
    expect(d.hasChanges).toBe(true);
  });

  it('menghitung Δ total aset & Δ laba berjalan', () => {
    const after = [
      { code: '1-1100', name: 'Kas', adj: 1_500 },
      { code: '1-1200', name: 'Piutang', adj: 2_000 },
      { code: '4-1100', name: 'Penjualan', adj: -6_000 },
      { code: '5-1100', name: 'BPP', adj: 3_000 },
    ];
    const d = diffWtb(before, after);
    expect(d.assetsBefore).toBe(3_000);
    expect(d.assetsAfter).toBe(3_500);
    expect(d.deltaAssets).toBe(500);
    expect(d.profitBefore).toBe(2_000);   // 5.000 − 3.000
    expect(d.profitAfter).toBe(3_000);    // 6.000 − 3.000
    expect(d.deltaProfit).toBe(1_000);
  });

  it('akun yang HILANG terdeteksi (impor baru tak memuatnya)', () => {
    const d = diffWtb(before, before.filter(r => r.code !== '1-1200'));
    expect(d.removed.map(c => c.code)).toEqual(['1-1200']);
    expect(d.deltaAssets).toBe(-2_000);
  });

  it('impor identik → hasChanges false (tak perlu konfirmasi)', () => {
    const d = diffWtb(before, before.map(r => ({ ...r })));
    expect(d.hasChanges).toBe(false);
    expect(d.unchangedCount).toBe(4);
  });

  it('adj diturunkan dari unadj + aje bila tak disediakan', () => {
    const d = diffWtb(
      [{ code: '1-1100', unadj: 900, aje: 100 }],
      [{ code: '1-1100', unadj: 1_000, aje: 0 }],
    );
    expect(d.hasChanges).toBe(false); // 900+100 = 1.000+0
  });

  it('engine PSAK yang PADAM akibat impor baru terdaftar', () => {
    const d = diffWtb(before, before, {
      enginesBefore: [{ id: 'psak71', label: 'PSAK 71 · ECL Piutang', lit: true, missing: [] },
        { id: 'psak73', label: 'PSAK 73 · Sewa', lit: true, missing: [] }],
      enginesAfter: [{ id: 'psak71', label: 'PSAK 71 · ECL Piutang', lit: true, missing: [] },
        { id: 'psak73', label: 'PSAK 73 · Sewa', lit: false, missing: ['1-2300'] }],
    });
    expect(d.enginesLost).toEqual(['PSAK 73 · Sewa']);
    expect(d.enginesGained).toHaveLength(0);
  });

  it('urut menurun berdasar magnitudo perubahan (yang terbesar tampil lebih dulu)', () => {
    const after = [
      { code: '1-1100', name: 'Kas', adj: 1_010 },
      { code: '1-1200', name: 'Piutang', adj: 9_000 },
      { code: '4-1100', name: 'Penjualan', adj: -5_000 },
      { code: '5-1100', name: 'BPP', adj: 3_000 },
    ];
    const d = diffWtb(before, after);
    expect(d.changed.map(c => c.code)).toEqual(['1-1200', '1-1100']);
  });
});

describe('cakupan hash — cuplikan tersimpan vs teks penuh', () => {
  it('rawExcerptOf memotong tepat pada batas', () => {
    const teks = 'x'.repeat(RAW_EXCERPT_LIMIT + 500);
    expect(rawExcerptOf(teks)).toHaveLength(RAW_EXCERPT_LIMIT);
    expect(rawExcerptOf('pendek')).toBe('pendek');
    expect(rawExcerptOf('')).toBe('');
  });

  it('kedua hash & kedua panjang tercatat terpisah — cakupan tak lagi ambigu', () => {
    const p = summarizeImport({
      importedAt: '2026-07-26T00:00:00.000Z', user: null, unit: 'full', unitFactor: 1,
      sha256: 'penuh', sha256Excerpt: 'cuplikan', rawLength: 12_000, excerptLength: RAW_EXCERPT_LIMIT,
      rowCount: 1, totalAssets: 0, balanced: true,
    });
    expect(p.sha256).toBe('penuh');
    expect(p.sha256Excerpt).toBe('cuplikan');
    expect(p.rawLength).toBe(12_000);
    expect(p.excerptLength).toBe(RAW_EXCERPT_LIMIT);
  });

  it('impor tanpa cuplikan (mis. sumber TA-1) tak mengarang hash cuplikan', () => {
    const p = summarizeImport({
      importedAt: '2026-07-26T00:00:00.000Z', user: null, unit: 'full', unitFactor: 1,
      sha256: 'penuh', rawLength: 300, rowCount: 1, totalAssets: 0, balanced: true,
    });
    expect(p.sha256Excerpt).toBe('');
    expect(p.excerptLength).toBe(0);
  });
});
