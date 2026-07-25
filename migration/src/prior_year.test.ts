/* PR-4c — tie-out saldo awal ke sumber audited TA-1 (SA 510). Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { tieOutPriorYear, tieStatusFor } from './prior_year';

const CURRENT = [
  { code: '1-1100', name: 'Kas', ly: 18_420_500_000 },
  { code: '1-1200', name: 'Piutang', ly: 42_180_900_000 },
  { code: '2-1100', name: 'Utang Usaha', ly: -38_220_700_000 },
];

describe('tieOutPriorYear — TANPA sumber tak boleh menyimpulkan cocok', () => {
  const r = tieOutPriorYear(CURRENT, null);

  it('seluruh baris berstatus no-source, bukan tied', () => {
    expect(r.hasSource).toBe(false);
    expect(r.rows.every(x => x.status === 'no-source')).toBe(true);
    expect(r.tied).toBe(0);
  });

  it('sumber kosong diperlakukan sama dengan tak ada sumber', () => {
    expect(tieOutPriorYear(CURRENT, { rows: [] }).hasSource).toBe(false);
  });
});

describe('tieOutPriorYear — dengan sumber independen', () => {
  it('saldo identik → tied', () => {
    const r = tieOutPriorYear(CURRENT, {
      rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })),
    });
    expect(r.tied).toBe(3);
    expect(r.untied).toBe(0);
    expect(r.totalDiff).toBe(0);
  });

  it('SELISIH nyata terdeteksi — inti perbaikan (dulu selalu nol secara konstruksi)', () => {
    const r = tieOutPriorYear(CURRENT, {
      rows: [
        { code: '1-1100', amount: 18_420_500_000 },
        { code: '1-1200', amount: 40_000_000_000 },   // beda 2.180.900.000
        { code: '2-1100', amount: -38_220_700_000 },
      ],
    });
    expect(r.untied).toBe(1);
    const p = r.rows.find(x => x.code === '1-1200')!;
    expect(p.status).toBe('untied');
    expect(p.diff).toBe(2_180_900_000);
    expect(r.totalDiff).toBe(2_180_900_000);
  });

  it('selisih di bawah toleransi pembulatan diabaikan', () => {
    const r = tieOutPriorYear(
      [{ code: '1-1100', ly: 1_000_000_500 }],
      { rows: [{ code: '1-1100', amount: 1_000_000_000 }] },
    );
    expect(r.tied).toBe(1);
  });

  it('akun TB berjalan yang tak ada di TA-1 → missing (akun baru)', () => {
    const r = tieOutPriorYear(
      [...CURRENT, { code: '1-2300', name: 'Aset Hak-Guna', ly: 0 }],
      { rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })) },
    );
    expect(r.missing).toBe(1);
    expect(r.rows.find(x => x.code === '1-2300')!.status).toBe('missing');
  });

  it('akun TA-1 yang hilang dari TB berjalan → orphan (saldo awal tak terbawa)', () => {
    const r = tieOutPriorYear(CURRENT.slice(0, 2), {
      rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })),
    });
    expect(r.orphan).toBe(1);
    const o = r.rows.find(x => x.status === 'orphan')!;
    expect(o.code).toBe('2-1100');
    expect(o.opening).toBe(0);
  });
});

describe('tieStatusFor — status satu akun untuk kolom TA Lalu', () => {
  const src = { rows: [{ code: '1-1100', amount: 100 }] };
  it('tanpa sumber → no-source', () => {
    expect(tieStatusFor('1-1100', 100, null)).toBe('no-source');
  });
  it('cocok / selisih / tak ada', () => {
    expect(tieStatusFor('1-1100', 100, src)).toBe('tied');
    expect(tieStatusFor('1-1100', 100_000_000, src)).toBe('untied');
    expect(tieStatusFor('9-9999', 0, src)).toBe('missing');
  });
});
