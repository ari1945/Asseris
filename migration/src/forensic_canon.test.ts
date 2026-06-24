/* W4 — forensic_canon: JET scoring + cash-effect helper.
   P2 — extends coverage into buildCash()'s full cash-bridge path (direct-method
   reconstruction + forensic anomaly scoring) by feeding it a real FSGEN model. */
import { describe, it, expect } from 'vitest';
import { AMS_FORENSIC } from './forensic_canon';
import { FSGEN } from './fsgen_model';
import { AMS } from './data';

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

  it('from a real FSGEN model: cash bridge ties out and anomalies are scored', () => {
    const wtb = AMS.WTB;
    const model = FSGEN.buildModel(wtb);
    const B = buildCash(model, wtb);
    expect(B).not.toBeNull();

    // Direct-method CFO reconstruction must tie to the statement CFO, and the
    // gross-flow bridge must tie to the net change in cash (the forensic guarantee).
    expect(B.cfoTies).toBe(true);
    expect(B.bridgeTies).toBe(true);
    expect(B.cashTies).toBe(true);
    expect(B.bridgeNet).toBeCloseTo(B.totalIn - B.totalOut, 6);

    // Gross flows: every component classified O/I/F; inflows positive, outflows flipped positive.
    expect(B.comps.length).toBeGreaterThan(0);
    expect(B.inflows.every((c: { v: number }) => c.v > 0)).toBe(true);
    expect(B.outflows.every((c: { v: number }) => c.v > 0)).toBe(true);

    // Cash anomaly population: every row scored; flagged = fscore>0, clean = fscore===0.
    expect(B.cashPop.every((j: { fscore: number }) => typeof j.fscore === 'number')).toBe(true);
    expect(B.flagged.every((j: { fscore: number }) => j.fscore > 0)).toBe(true);
    expect(B.clean.every((j: { fscore: number }) => j.fscore === 0)).toBe(true);
    expect(B.flagged.length + B.clean.length).toBe(B.cashPop.length);
    expect(B.anomalyOut).toBeGreaterThanOrEqual(0);
  });
});
