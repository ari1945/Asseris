/* Wedge MVP H2 — uji detektor outlier neraca saldo (SA 520). */
import { describe, it, expect } from 'vitest';
import { wtbOutliers } from './wedge_detectors';

const row = (code, name, unadj, ly, adj) => ({ code, name, unadj, ly, adj: adj == null ? unadj : adj });

describe('wtbOutliers', () => {
  it('deteksi swing YoY & sign-flip, abaikan akun stabil', () => {
    const tb = [
      row('4-1100', 'Pendapatan', -78_500_000_000, -45_000_000_000),   // swing ~74%
      row('2-1300', 'Beban akrual', -3_100_000_000, 3_500_000_000),    // sign-flip
      row('1-1100', 'Kas', 18_500_000_000, 17_900_000_000),            // stabil (~3%)
    ];
    const f = wtbOutliers(tb);
    expect(f.find(x => x.id === 'wtb-swing-4-1100')).toBeTruthy();
    expect(f.find(x => x.id === 'wtb-flip-2-1300')).toBeTruthy();
    expect(f.some(x => x.id.includes('1-1100'))).toBe(false);
  });

  it('penyesuaian audit material → wtb-adj (SA 450)', () => {
    const f = wtbOutliers([row('5-1100', 'Beban pokok', 10_000_000_000, 10_000_000_000, 13_000_000_000)]);
    expect(f.find(x => x.id === 'wtb-adj-5-1100')).toBeTruthy();
  });

  it('akun material baru tanpa LY → wtb-new', () => {
    const f = wtbOutliers([
      row('7-9000', 'Akun baru', 5_000_000_000, 0),
      row('1-1100', 'Kas', 5_000_000_000, 4_900_000_000),
    ]);
    expect(f.find(x => x.id === 'wtb-new-7-9000')).toBeTruthy();
  });

  it('TB kosong → tak ada temuan', () => {
    expect(wtbOutliers([])).toEqual([]);
  });
});
