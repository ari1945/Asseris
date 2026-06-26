/* W-WTB·3 — pemetaan bagan akun klien → CoA standar. Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { STANDARD_COA, autoMap, applyMapping, mappingCoverage } from './wtb_mapping';

describe('STANDARD_COA — katalog + canonKey dari WTB_MAP', () => {
  it('memuat 28 akun standar', () => {
    expect(STANDARD_COA.length).toBe(28);
  });
  it('akun pemicu PSAK ber-canonKey, lainnya null', () => {
    const byCode = (c: string) => STANDARD_COA.find(a => a.code === c)!;
    expect(byCode('1-1210').canonKey).toBe('ckpn');
    expect(byCode('2-2300').canonKey).toBe('dbo');
    expect(byCode('1-2500').canonKey).toBe('dta');
    expect(byCode('1-1100').canonKey).toBeNull();
  });
});

describe('autoMap — saran otomatis', () => {
  it('identitas untuk kode yang sudah standar', () => {
    const m = autoMap([{ code: '1-1100', name: 'Kas' }, { code: '5-5100', name: 'Pajak' }]);
    expect(m['1-1100']).toBe('1-1100');
    expect(m['5-5100']).toBe('5-5100');
  });
  it('cocokkan via nama ter-normalisasi untuk kode klien non-standar', () => {
    const m = autoMap([{ code: '1101', name: 'Kas dan Setara Kas' }, { code: '9999', name: 'Akun Aneh' }]);
    expect(m['1101']).toBe('1-1100');
    expect(m['9999']).toBeUndefined();
  });
});

describe('applyMapping — relabel + merge', () => {
  it('me-relabel kode klien ke kode standar', () => {
    const rows = [{ code: '1101', name: 'Kas Klien', unadj: 1_000_000_000, aje: 0 }];
    const out = applyMapping(rows, { '1101': '1-1100' });
    expect(out).toHaveLength(1);
    expect(out[0].code).toBe('1-1100');
    expect(out[0].name).toBe('Kas dan Setara Kas'); // label standar
    expect(out[0].mapped).toBe(true);
    expect(out[0].adj).toBe(1_000_000_000);
  });

  it('menggabung dua akun klien yang menuju kode standar sama (Σ)', () => {
    const rows = [
      { code: '1101', name: 'Kas BCA', unadj: 600_000_000, aje: 0 },
      { code: '1102', name: 'Kas Mandiri', unadj: 400_000_000, aje: 0 },
    ];
    const out = applyMapping(rows, { '1101': '1-1100', '1102': '1-1100' });
    expect(out).toHaveLength(1);
    expect(out[0].unadj).toBe(1_000_000_000);
    expect(out[0].srcCodes).toEqual(['1101', '1102']);
  });

  it('mempertahankan baris tak terpetakan (tak hilang dari total)', () => {
    const rows = [{ code: '8888', name: 'Akun Tak Dikenal', unadj: 500_000_000, aje: 0 }];
    const out = applyMapping(rows, {});
    expect(out[0].code).toBe('8888');
    expect(out[0].mapped).toBe(false);
    expect(out[0].adj).toBe(500_000_000);
  });

  it('adj = unadj + aje setelah merge', () => {
    const rows = [
      { code: '1201', name: 'Piutang', unadj: 2_000_000_000, aje: -100_000_000 },
      { code: '1202', name: 'Piutang lain', unadj: 500_000_000, aje: 0 },
    ];
    const out = applyMapping(rows, { '1201': '1-1200', '1202': '1-1200' });
    expect(out[0].unadj).toBe(2_500_000_000);
    expect(out[0].aje).toBe(-100_000_000);
    expect(out[0].adj).toBe(2_400_000_000);
  });
});

describe('mappingCoverage — ringkasan + kejujuran PSAK', () => {
  const rows = [
    { code: '1101', name: 'Kas' },
    { code: '1210', name: 'CKPN' },
    { code: '9999', name: 'Belum dipetakan' },
  ];
  const mapping = { '1101': '1-1100', '1210': '1-1210' }; // 9999 tak dipetakan
  const cov = mappingCoverage(rows, mapping);

  it('menghitung terpetakan vs belum', () => {
    expect(cov.total).toBe(3);
    expect(cov.mappedCount).toBe(2);
    expect(cov.unmappedCodes).toEqual(['9999']);
    expect(cov.fsLinesCovered).toBe(2);
    expect(cov.fsLinesTotal).toBe(28);
  });
  it('menyalakan engine PSAK via kode standar hasil pemetaan', () => {
    expect(cov.psak.engines.find(e => e.id === 'psak71')!.lit).toBe(true); // 1-1210 ckpn
    expect(cov.psak.engines.find(e => e.id === 'psak16')!.lit).toBe(false); // ppe belum
  });
});
