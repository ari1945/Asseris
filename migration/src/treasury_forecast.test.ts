/* ============================================================
   Forecast Arus Kas — derivasi MURNI (TR2 · TR3, gerbang a–d).

   Modul `treasury` tidak punya satu pun uji khusus sebelum ini
   (`ls migration/src | grep -i treasury` → hanya `view_firmtreasury.tsx`).

   Yang dipaku:
     a. ambang zona perhatian dari SATU sumber (lapisan data), bukan angka ajaib;
     b. label periode mengikuti klok SSOT — dan BERHENTI mengklaim tahun bila
        deret seed tak lagi sejalan dengan klok;
     c. deret berjalan konsisten (gerbang BENTUK, bukan nilai — ia harus tetap
        hijau setelah PR-6 mengganti sumber angkanya);
     d. skenario tidak menggeser saldo awal periode pertama.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import { FIRM_CASH_POLICY, cashWatchFloorJt } from './data_firmfin';
import { CASH_SCENARIOS, cashForecast, periodLabels, scenarioByKey } from './treasury_forecast';
import type { ForecastSeedRow } from './treasury_forecast';

const seed = (): ForecastSeedRow[] => (AMS.CASH_FORECAST as unknown as ForecastSeedRow[]).map((r) => ({ ...r }));
const basis = () => scenarioByKey('base');
const HARI_INI = String(AMS.TODAY);
const opts = (over: Partial<{ today: string; watchFloor: number }> = {}) =>
  ({ today: HARI_INI, watchFloor: cashWatchFloorJt(), ...over });

/* ------------------------------------------------------------------
   Nol-delta — angka hari ini tidak boleh bergeser oleh ekstraksi ini
   ------------------------------------------------------------------ */

describe('ekstraksi murni tidak menggeser satu angka pun', () => {
  it('deret basis persis seperti yang dirender sebelum arc ini', () => {
    const f = cashForecast(seed(), basis(), opts());
    expect(f.rows.map((r) => r.close)).toEqual([9045, 9925, 9725, 10005, 10125, 9875]);
    expect(f.minClose).toBe(9045);
    expect(f.netGen).toBe(1300);
    expect(Math.round(f.avgOutflow)).toBe(2197);
    expect(f.runway).toBeCloseTo(8575 / (13180 / 6), 6);
  });

  it('skenario memakai pengali yang sama seperti sebelumnya', () => {
    expect(CASH_SCENARIOS.map((s) => [s.key, s.inF, s.outF]))
      .toEqual([['base', 1.0, 1.0], ['opt', 1.12, 0.97], ['cons', 0.85, 1.06]]);
    const optimis = cashForecast(seed(), scenarioByKey('opt'), opts());
    expect(optimis.rows[0].inflow).toBe(Math.round(2480 * 1.12));
    expect(optimis.rows[0].outflow).toBe(Math.round(2010 * 0.97));
  });
});

/* ------------------------------------------------------------------
   (a) Ambang zona perhatian — satu sumber, di lapisan data
   ------------------------------------------------------------------ */

describe('(a) ambang zona perhatian berasal dari satu parameter bernama', () => {
  it('nilainya TIDAK berubah oleh pemindahan: Rp 7 M', () => {
    /* Memindahkan bukan menetapkan ulang. */
    expect(FIRM_CASH_POLICY.watchFloorIdr).toBe(7_000_000_000);
    expect(cashWatchFloorJt()).toBe(7000);
  });

  it('dasarnya BELUM dinyatakan, dan berkata begitu', () => {
    /* Angka tanpa dasar yang diberi alasan karangan terdengar berdasar — itu
       lebih berbahaya daripada angka yang jujur mengaku belum punya dasar. */
    expect(FIRM_CASH_POLICY.basis).toBe('');
    expect(FIRM_CASH_POLICY.open.length).toBeGreaterThan(80);
  });

  it('mengubah kebijakan menggeser SEMUA penanda sekaligus', () => {
    const rendah = cashForecast(seed(), basis(), opts({ watchFloor: 7000 }));
    expect(rendah.rows.filter((r) => r.watch)).toEqual([]);
    expect(rendah.minCloseWatch).toBe(false);

    const tinggi = cashForecast(seed(), basis(), opts({ watchFloor: 12_000 }));
    expect(tinggi.rows.every((r) => r.watch)).toBe(true);
    expect(tinggi.minCloseWatch).toBe(true);
  });

  it('satuan juta diturunkan dari rupiah, bukan diketik terpisah', () => {
    const asli = FIRM_CASH_POLICY.watchFloorIdr;
    try {
      FIRM_CASH_POLICY.watchFloorIdr = 9_000_000_000;
      expect(cashWatchFloorJt()).toBe(9000);
    } finally {
      FIRM_CASH_POLICY.watchFloorIdr = asli;
    }
  });
});

/* ------------------------------------------------------------------
   (b) Label periode mengikuti klok SSOT
   ------------------------------------------------------------------ */

describe('(b) label periode mengikuti klok SSOT', () => {
  it('klok hari ini (2026-03) melabeli deret Mar–Agu 2026', () => {
    const f = cashForecast(seed(), basis(), opts());
    expect(f.aligned).toBe(true);
    expect(f.rows.map((r) => r.period))
      .toEqual(['Mar 2026', 'Apr 2026', 'Mei 2026', 'Jun 2026', 'Jul 2026', 'Agu 2026']);
    expect(f.note).toBe('');
  });

  it('MEMAJUKAN klok satu tahun memajukan tahun pada label', () => {
    const f = cashForecast(seed(), basis(), opts({ today: '2027-03-09' }));
    expect(f.aligned).toBe(true);
    expect(f.rows.map((r) => r.period)).toEqual(
      ['Mar 2027', 'Apr 2027', 'Mei 2027', 'Jun 2027', 'Jul 2027', 'Agu 2027'],
    );
  });

  it('horizon yang melewati pergantian tahun ikut berganti tahun', () => {
    expect(periodLabels('2026-11-01', 4)).toEqual(['Nov 2026', 'Des 2026', 'Jan 2027', 'Feb 2027']);
  });

  it('deret yang TIDAK lagi sejalan klok berhenti mengklaim tahun — dan mengatakannya', () => {
    /* Inilah yang membedakan perbaikan ini dari sekadar menempelkan tahun klok:
       menempelkan tahun akan melabeli angka Maret sebagai "September". */
    const f = cashForecast(seed(), basis(), opts({ today: '2026-09-30' }));
    expect(f.aligned).toBe(false);
    expect(f.rows.map((r) => r.period)).toEqual(['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu']);
    expect(f.rows.every((r) => !/\d{4}/.test(r.period))).toBe(true);
    expect(f.note).toContain('Mar');
    expect(f.note).toContain('Sep 2026');
  });

  it('tanggal yang tak terbaca tidak melahirkan label karangan', () => {
    expect(periodLabels('kemarin', 6)).toEqual([]);
    const f = cashForecast(seed(), basis(), opts({ today: '' }));
    expect(f.aligned).toBe(false);
    expect(f.rows.map((r) => r.period)).toEqual(['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu']);
  });
});

/* ------------------------------------------------------------------
   (c) Bentuk deret berjalan — harus tetap hijau setelah PR-6
   ------------------------------------------------------------------ */

describe('(c) deret berjalan konsisten (gerbang BENTUK, bukan nilai)', () => {
  it.each(CASH_SCENARIOS.map((s) => s.key))('skenario %s: saldo akhir n == saldo awal n+1', (key) => {
    const f = cashForecast(seed(), scenarioByKey(key), opts());
    for (let i = 1; i < f.rows.length; i++) {
      expect(f.rows[i].open, `baris ${i}`).toBe(f.rows[i - 1].close);
    }
  });

  it.each(CASH_SCENARIOS.map((s) => s.key))('skenario %s: akhir == awal + bersih', (key) => {
    const f = cashForecast(seed(), scenarioByKey(key), opts());
    for (const r of f.rows) {
      expect(r.net, r.m).toBe(r.inflow - r.outflow);
      expect(r.close, r.m).toBe(r.open + r.net);
    }
  });

  it('berlaku juga untuk deret yang sama sekali berbeda (PR-6 mengganti sumbernya)', () => {
    /* Gerbang bentuk: ia tidak boleh bergantung pada angka seed hari ini. */
    const lain: ForecastSeedRow[] = [
      { m: 'Mar', open: 1_000, inflow: 100, outflow: 400 },
      { m: 'Apr', open: 0, inflow: 900, outflow: 50 },
    ];
    const f = cashForecast(lain, basis(), opts({ watchFloor: 800 }));
    expect(f.rows.map((r) => r.close)).toEqual([700, 1550]);
    expect(f.rows[1].open).toBe(700);          // saldo awal seed baris 2 DIABAIKAN
    expect(f.rows.map((r) => r.watch)).toEqual([true, false]);
    expect(f.minClose).toBe(700);
  });
});

/* ------------------------------------------------------------------
   (d) Invarian skenario — LAHIR HIJAU
   ------------------------------------------------------------------ */

describe('(d) skenario tidak menggeser saldo awal periode pertama', () => {
  /* Invarian ini sudah benar sebelum arc ini; ia ditulis supaya PR-6 tidak
     merusaknya diam-diam. Ia TIDAK pernah merah — dan itu dikatakan apa adanya. */
  it.each(CASH_SCENARIOS.map((s) => s.key))('skenario %s memakai saldo awal yang sama', (key) => {
    const f = cashForecast(seed(), scenarioByKey(key), opts());
    expect(f.rows[0].open).toBe(seed()[0].open);
  });

  it('…dan hanya saldo awal baris PERTAMA yang berasal dari seed', () => {
    const f = cashForecast(seed(), scenarioByKey('cons'), opts());
    const seedOpens = seed().map((r) => r.open);
    expect(f.rows[0].open).toBe(seedOpens[0]);
    expect(f.rows[1].open).not.toBe(seedOpens[1]);   // konservatif menggeser deretnya
  });
});
