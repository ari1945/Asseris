/* ============================================================
   Skedul penyusutan — SATU MESIN (lanjutan PR-1).

   Panel drill-down menghitung penyusutannya sendiri (`a.cost / a.life`,
   mengabaikan `residu`) dengan tahun berjalan sebagai literal `2026`. Yang diuji
   di sini bukan "apakah ada fungsinya", melainkan bahwa skedulnya TIDAK DAPAT
   berselisih dengan register yang membukanya.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import {
  FIXED_ASSETS, depreciate, depreciationSchedule, type AssetSeed,
} from './data_fixedassets';

describe('Skedul penyusutan membaca mesin yang sama, bukan mengulanginya', () => {
  it('akumulasi tiap tahun == `accDep` pada 1 Januari tahun berikutnya, untuk SETIAP aset', () => {
    for (const a of FIXED_ASSETS) {
      for (const r of depreciationSchedule(a)) {
        expect(r.acc, `${a.id} tahun ${r.yr}`).toBe(depreciate(a, new Date(r.yr + 1, 0, 1)).accDep);
      }
    }
  });

  it('beban tahun == selisih dua akumulasi, dan totalnya == cost − residu', () => {
    for (const a of FIXED_ASSETS) {
      const rows = depreciationSchedule(a);
      const total = rows.reduce((s, r) => s + r.dep, 0);
      expect(total, `${a.id} total beban`).toBe(a.cost - a.residu);
      expect(rows[rows.length - 1].acc).toBe(a.cost - a.residu);
      expect(rows[rows.length - 1].nbv).toBe(a.residu);
    }
  });

  it('nilai buku tiap tahun == cost − akumulasi (tak pernah menembus residu)', () => {
    for (const a of FIXED_ASSETS) {
      for (const r of depreciationSchedule(a)) {
        expect(r.nbv).toBe(a.cost - r.acc);
        expect(r.nbv).toBeGreaterThanOrEqual(a.residu);
      }
    }
  });
});

describe('Tahun perolehan DIPRORATA — bukan satu tahun penuh', () => {
  it('FA-001 (perolehan Juni 2021) membebankan 7 bulan di 2021, bukan 12', () => {
    /* Mesin lama menulis `cost / life` = 300 jt untuk 2021. Registernya hanya
       membebankan Juni–Desember. Angka inilah yang selama ini berselisih. */
    const a = FIXED_ASSETS.find((x) => x.id === 'FA-001') as AssetSeed;
    const rows = depreciationSchedule(a);
    const bulanan = (a.cost - a.residu) / (a.life * 12);
    expect(rows[0].yr).toBe(2021);
    expect(rows[0].dep).toBe(Math.round(bulanan * 7));
    expect(rows[0].dep).not.toBe(a.cost / a.life);
  });

  it('umur 8 tahun yang tak mulai di Januari menyentuh 9 tahun kalender', () => {
    const a = FIXED_ASSETS.find((x) => x.id === 'FA-001') as AssetSeed;
    expect(depreciationSchedule(a).length).toBe(a.life + 1);
  });

  it('perolehan tepat 1 Januari pas dalam `life` tahun kalender', () => {
    const a: AssetSeed = {
      ...(FIXED_ASSETS[0]), id: 'UJI-JAN', acq: '2022-01-01', cost: 480_000_000, life: 4, residu: 0,
    };
    const rows = depreciationSchedule(a);
    expect(rows.length).toBe(4);
    expect(rows.map((r) => r.yr)).toEqual([2022, 2023, 2024, 2025]);
    expect(rows.every((r) => r.dep === 120_000_000)).toBe(true);
  });
});

describe('`residu` dihormati — mesin lama mengabaikannya', () => {
  it('beban total berhenti di cost − residu, dan nilai buku akhir == residu', () => {
    const a: AssetSeed = {
      ...(FIXED_ASSETS[0]), id: 'UJI-RESIDU', acq: '2022-01-01',
      cost: 500_000_000, life: 5, residu: 100_000_000,
    };
    const rows = depreciationSchedule(a);
    expect(rows.reduce((s, r) => s + r.dep, 0)).toBe(400_000_000);
    expect(rows.every((r) => r.dep === 80_000_000)).toBe(true);
    expect(rows[rows.length - 1].nbv).toBe(100_000_000);
    /* Mesin lama: `cost / life` = 100 jt/th → menyusutkan residu sampai habis. */
    expect(rows[0].dep).not.toBe(a.cost / a.life);
  });
});
