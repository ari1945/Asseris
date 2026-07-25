/* PR-1a — rantai baca-lewat cache terpersist (perikatan → firma → legacy → default). */
import { describe, it, expect, beforeEach } from 'vitest';
import { readPersisted, persistCacheKey, legacyCacheKey, FIRM_SCOPE_ID } from './persist_scope';

const ENG = 'ENG-2025-014';
const put = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v));

describe('readPersisted — rantai baca-lewat', () => {
  beforeEach(() => localStorage.clear());

  it('tanpa nilai tersimpan → default', () => {
    expect(readPersisted('mat.pmPct', 75, ENG)).toBe(75);
  });

  it('tier perikatan menang atas firma & legacy', () => {
    put(legacyCacheKey('mat.pmPct'), 50);
    put(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), 60);
    put(persistCacheKey('engagement', ENG, 'mat.pmPct'), 70);
    expect(readPersisted('mat.pmPct', 75, ENG)).toBe(70);
  });

  it('jatuh ke firma bila tier perikatan kosong (migrasi non-destruktif)', () => {
    put(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), 60);
    expect(readPersisted('mat.pmPct', 75, ENG)).toBe(60);
  });

  it('jatuh ke legacy pra-W6 bila perikatan & firma kosong', () => {
    put(legacyCacheKey('mat.pmPct'), 50);
    expect(readPersisted('mat.pmPct', 75, ENG)).toBe(50);
  });

  it('tanpa engagementId → tier perikatan DILEWATI (tak menebak perikatan)', () => {
    put(persistCacheKey('engagement', ENG, 'mat.pmPct'), 70);
    put(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), 60);
    expect(readPersisted('mat.pmPct', 75)).toBe(60);
  });

  it('perikatan berbeda tidak saling bocor (isolasi SA 320 per-perikatan)', () => {
    put(persistCacheKey('engagement', ENG, 'mat.pmPct'), 70);
    expect(readPersisted('mat.pmPct', 75, 'ENG-2025-099')).toBe(75);
  });

  it('nilai null yang tersimpan adalah HIT, bukan lanjut ke tier berikut', () => {
    // `mat.appliedOverride: null` berarti "tanpa override" pada perikatan ini —
    // jangan sampai override firma lama menyelinap masuk.
    put(persistCacheKey('engagement', ENG, 'mat.appliedOverride'), null);
    put(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.appliedOverride'), 2_000_000_000);
    expect(readPersisted<number | null>('mat.appliedOverride', null, ENG)).toBeNull();
  });

  it('nilai korup (JSON tak sah) dilewati, bukan melempar', () => {
    localStorage.setItem(persistCacheKey('engagement', ENG, 'mat.pmPct'), '{rusak');
    put(persistCacheKey('firm', FIRM_SCOPE_ID, 'mat.pmPct'), 60);
    expect(readPersisted('mat.pmPct', 75, ENG)).toBe(60);
  });

  it('bentuk objek & array ikut terbaca utuh', () => {
    put(persistCacheKey('engagement', ENG, 'mat.quals'), { listed: false, fraud: true });
    expect(readPersisted('mat.quals', { listed: true, fraud: true }, ENG)).toEqual({ listed: false, fraud: true });
  });
});
