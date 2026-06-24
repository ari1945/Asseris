/* AK-01 — uji peta padanan penomoran PSAK/ISAK lama↔baru.
   Mengunci nilai PERSIS dokumen resmi IAI (bukti tak ada drift/tebakan). */
import { describe, it, expect } from 'vitest';
import { PSAK_RENUMBER, psakRenumber } from './data_sakroadmap';

describe('AK-01 psakRenumber() — padanan lama↔baru per dokumen IAI', () => {
  it('standar inti app: nomor baru PERSIS dokumen IAI', () => {
    const cases: [string, string][] = [
      ['PSAK 1', 'PSAK 201'], ['PSAK 22', 'PSAK 103'], ['PSAK 24', 'PSAK 219'],
      ['PSAK 25', 'PSAK 208'], ['PSAK 46', 'PSAK 212'], ['PSAK 48', 'PSAK 236'],
      ['PSAK 57', 'PSAK 237'], ['PSAK 58', 'PSAK 105'], ['PSAK 65', 'PSAK 110'],
      ['PSAK 71', 'PSAK 109'], ['PSAK 72', 'PSAK 115'], ['PSAK 73', 'PSAK 116'],
      ['PSAK 74', 'PSAK 117'], ['ISAK 35', 'ISAK 335'], ['ISAK 36', 'ISAK 336'],
    ];
    cases.forEach(([o, n]) => expect(psakRenumber(o)?.neu).toBe(n));
  });

  it('normalisasi spasi/case', () => {
    expect(psakRenumber('psak  71')?.neu).toBe('PSAK 109');
    expect(psakRenumber('  PSAK 73 ')?.title).toBe('Sewa');
  });

  it('kode tak dikenal / kosong → null', () => {
    expect(psakRenumber('PSAK 999')).toBeNull();
    expect(psakRenumber('')).toBeNull();
  });

  it('integritas peta: tak ada nomor lama/baru duplikat', () => {
    const olds = PSAK_RENUMBER.map(r => r.old);
    const news = PSAK_RENUMBER.map(r => r.neu);
    expect(new Set(olds).size).toBe(olds.length);
    expect(new Set(news).size).toBe(news.length);
  });

  it('terekspos via AMS_CANON (SSOT)', async () => {
    const { AMS_CANON } = await import('./canon');
    await import('./data_sakroadmap');
    expect(AMS_CANON.psakRenumber('PSAK 71')?.neu).toBe('PSAK 109');
    expect(Array.isArray(AMS_CANON.PSAK_RENUMBER)).toBe(true);
  });
});
