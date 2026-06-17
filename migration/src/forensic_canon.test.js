/* W4 — forensic_canon: JET scoring + cash-effect helper. */
import { describe, it, expect } from 'vitest';
import { AMS_FORENSIC } from './forensic_canon.js';

const { JET_CRITERIA, JOURNAL_POP, score, dmod, buildCash } = AMS_FORENSIC;

describe('forensic_canon — seed', () => {
  it('mengekspos kriteria JET & populasi jurnal', () => {
    expect(Array.isArray(JET_CRITERIA)).toBe(true);
    expect(JET_CRITERIA.length).toBeGreaterThan(0);
    expect(Array.isArray(JOURNAL_POP)).toBe(true);
  });
});

describe('score() — skoring kriteria JET', () => {
  it('skor = jumlah flag aktif yang cocok', () => {
    const pop = [
      { id: 'J1', flags: ['round', 'weekend'] },
      { id: 'J2', flags: ['round'] },
      { id: 'J3', flags: [] },
    ];
    const out = score(pop, ['round']);
    expect(out.map(j => j.score)).toEqual([1, 1, 0]);
    expect(out[0].hit).toEqual(['round']);
  });

  it('default ke kriteria yang aktif (c.on) bila activeIds tidak diberikan', () => {
    const out = score(JOURNAL_POP);
    out.forEach(j => expect(j.score).toBe(j.hit.length));
  });
});

describe('dmod() — efek kas mutasi neraca (−Δsaldo)', () => {
  it('= −(adj − ly)', () => {
    const by = { '1-1200': { adj: 50, ly: 40 } };
    expect(dmod(by, '1-1200')).toBe(-10);
  });
  it('kode tak ada → 0', () => {
    expect(dmod({}, 'x')).toBeCloseTo(0, 10); // (boleh −0)
  });
});

describe('buildCash()', () => {
  it('model null → null (guard)', () => {
    expect(buildCash(null)).toBeNull();
  });
});
