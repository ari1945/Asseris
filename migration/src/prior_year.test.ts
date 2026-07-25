/* PR-4c — tie-out saldo awal ke sumber audited TA-1 (SA 510). Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { isTieException, tieOutPriorYear, tieStatusFor } from './prior_year';

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

  it('akun TB berjalan bersaldo yang tak ada di TA-1 → missing (belum tertelusur)', () => {
    const r = tieOutPriorYear(
      [...CURRENT, { code: '1-2400', name: 'Aset Takberwujud', ly: 8_400_000_000 }],
      { rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })) },
    );
    expect(r.missing).toBe(1);
    expect(r.rows.find(x => x.code === '1-2400')!.status).toBe('missing');
  });

  it('baris missing TIDAK dilaporkan sebagai selisih — saldonya masuk untracedTotal', () => {
    const r = tieOutPriorYear(
      [...CURRENT, { code: '1-2400', name: 'Aset Takberwujud', ly: 8_400_000_000 }],
      { rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })) },
    );
    expect(r.rows.find(x => x.code === '1-2400')!.diff).toBe(0);
    expect(r.totalDiff).toBe(0);
    expect(r.untracedTotal).toBe(8_400_000_000);
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

describe('lingkup SA 510 — hanya pos neraca punya saldo awal', () => {
  const SRC = { rows: CURRENT.map(c => ({ code: c.code, amount: c.ly })) };

  it('akun laba-rugi dikecualikan, bukan dilaporkan sebagai pengecualian', () => {
    const r = tieOutPriorYear(
      [...CURRENT,
        { code: '4-1100', name: 'Penjualan', ly: -284_500_000_000, group: 'Pendapatan' },
        { code: '5-1100', name: 'BPP', ly: 198_420_000_000, group: 'Beban' }],
      SRC,
    );
    expect(r.outOfScope).toBe(2);
    expect(r.missing).toBe(0);
    expect(r.untracedTotal).toBe(0);
    expect(r.rows.find(x => x.code === '4-1100')!.status).toBe('out-of-scope');
  });

  it('tanpa `group`, awalan kode CoA menentukan lingkup', () => {
    const r = tieOutPriorYear([...CURRENT, { code: '5-2100', name: 'Beban Penjualan', ly: 22_180_000_000 }], SRC);
    expect(r.outOfScope).toBe(1);
    expect(r.missing).toBe(0);
  });

  it('saldo awal nol tanpa pasangan TA-1 bukan pengecualian (mis. transisi PSAK 73)', () => {
    const r = tieOutPriorYear([...CURRENT, { code: '1-2300', name: 'Aset Hak-Guna', ly: 0, group: 'Aset Tidak Lancar' }], SRC);
    expect(r.nilOpening).toBe(1);
    expect(r.missing).toBe(0);
    expect(r.rows.find(x => x.code === '1-2300')!.status).toBe('nil-opening');
  });

  it('akun laba-rugi di SUMBER tak dilaporkan hilang dari TB', () => {
    const r = tieOutPriorYear(CURRENT, {
      rows: [...SRC.rows, { code: '4-1100', amount: -284_500_000_000 }],
    });
    expect(r.orphan).toBe(0);
  });
});

describe('tieStatusFor — status satu akun untuk kolom TA Lalu', () => {
  const src = { rows: [{ code: '1-1100', amount: 100 }] };
  it('tanpa sumber → no-source', () => {
    expect(tieStatusFor({ code: '1-1100', ly: 100 }, null)).toBe('no-source');
  });
  it('cocok / selisih / belum tertelusur', () => {
    expect(tieStatusFor({ code: '1-1100', ly: 100 }, src)).toBe('tied');
    expect(tieStatusFor({ code: '1-1100', ly: 100_000_000 }, src)).toBe('untied');
    expect(tieStatusFor({ code: '1-9999', ly: 5_000_000_000 }, src)).toBe('missing');
  });
  it('laba-rugi & saldo nol tak pernah jadi pengecualian', () => {
    expect(tieStatusFor({ code: '5-1100', ly: 9_000_000_000 }, src)).toBe('out-of-scope');
    expect(tieStatusFor({ code: '1-9999', ly: 0 }, src)).toBe('nil-opening');
    expect(isTieException('out-of-scope')).toBe(false);
    expect(isTieException('nil-opening')).toBe(false);
    expect(isTieException('missing')).toBe(true);
  });
});
