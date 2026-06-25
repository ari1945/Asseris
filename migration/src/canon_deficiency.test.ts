/* ============================================================
   Defisiensi pengendalian (SA 265) + komunikasi tata kelola
   (SA 260) — model severity & rekonsiliasi register defisiensi
   ke surat manajemen. Memastikan klasifikasi, kewajiban TCWG,
   status komunikasi & gap deterministik.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  LEVELS, classifyDeficiency, requiresTcwg, COMMS,
  DEFICIENCIES, DEF_SEED, DEFICIENCY_ML_LINK, reconcileGovernanceComms,
  type MlFindingLite,
} from './canon_deficiency';

describe('classifyDeficiency — matriks 2×2 + kompensasi', () => {
  it('Material × Wajar mungkin → Kelemahan Material', () => {
    expect(classifyDeficiency('Material', 'Wajar mungkin', false)).toBe('Kelemahan Material');
  });
  it('salah satu sumbu tinggi → Defisiensi Signifikan', () => {
    expect(classifyDeficiency('Material', 'Remote', false)).toBe('Defisiensi Signifikan');
    expect(classifyDeficiency('Imaterial', 'Wajar mungkin', false)).toBe('Defisiensi Signifikan');
  });
  it('kedua sumbu rendah → Defisiensi Pengendalian', () => {
    expect(classifyDeficiency('Imaterial', 'Remote', false)).toBe('Defisiensi Pengendalian');
  });
  it('kontrol kompensasi menurunkan satu level (floor di 0)', () => {
    expect(classifyDeficiency('Material', 'Wajar mungkin', true)).toBe('Defisiensi Signifikan');
    expect(classifyDeficiency('Imaterial', 'Remote', true)).toBe('Defisiensi Pengendalian');
  });
});

describe('requiresTcwg & COMMS', () => {
  it('Signifikan & Material wajib TCWG (SA 265.9); Pengendalian tidak (SA 265.10)', () => {
    expect(requiresTcwg('Kelemahan Material')).toBe(true);
    expect(requiresTcwg('Defisiensi Signifikan')).toBe(true);
    expect(requiresTcwg('Defisiensi Pengendalian')).toBe(false);
    expect(COMMS['Defisiensi Signifikan'].ref).toBe('SA 265.9');
    expect(COMMS['Defisiensi Pengendalian'].ref).toBe('SA 265.10');
    expect(LEVELS).toHaveLength(3);
  });
});

const ml = (id: string, stage: string, sev = 'Significant', title = ''): MlFindingLite => ({ id, stage, sev, title });

describe('reconcileGovernanceComms — defisiensi → komunikasi', () => {
  const defs = [{ id: 'D1', src: 's', desc: 'd', kind: 'Operasi' }];
  const seedSig = { D1: { mag: 'Material', lik: 'Remote', comp: false } };       // → Signifikan
  const seedCtrl = { D1: { mag: 'Imaterial', lik: 'Remote', comp: false } };     // → Pengendalian

  it('Signifikan tertaut ML final → communicated, bukan gap', () => {
    const r = reconcileGovernanceComms({ deficiencies: defs, defSeed: seedSig, links: { D1: 'ML-1' }, mlFindings: [ml('ML-1', 'final')] });
    expect(r.rows[0]).toMatchObject({ level: 'Defisiensi Signifikan', requiresTcwg: true, communicated: true, isGap: false });
  });

  it('Signifikan tertaut ML non-final → GAP (SA 265.9)', () => {
    const r = reconcileGovernanceComms({ deficiencies: defs, defSeed: seedSig, links: { D1: 'ML-1' }, mlFindings: [ml('ML-1', 'diskusi')] });
    expect(r.rows[0]).toMatchObject({ communicated: false, isGap: true });
    expect(r.rollup.defGaps).toBe(1);
  });

  it('Signifikan tanpa tautan ML → GAP', () => {
    const r = reconcileGovernanceComms({ deficiencies: defs, defSeed: seedSig, links: {}, mlFindings: [] });
    expect(r.rows[0].isGap).toBe(true);
  });

  it('Defisiensi Pengendalian tak wajib TCWG → tak pernah gap', () => {
    const r = reconcileGovernanceComms({ deficiencies: defs, defSeed: seedCtrl, links: {}, mlFindings: [] });
    expect(r.rows[0]).toMatchObject({ requiresTcwg: false, isGap: false });
    expect(r.rollup.defGaps).toBe(0);
  });

  it('tautan menunjuk ML tak-ada → tidak crash, communicated false', () => {
    const r = reconcileGovernanceComms({ deficiencies: defs, defSeed: seedSig, links: { D1: 'ML-HANTU' }, mlFindings: [ml('ML-9', 'final')] });
    expect(r.rows[0].communicated).toBe(false);
    expect(r.rows[0].isGap).toBe(true);
  });
});

describe('reconcileGovernanceComms — temuan signifikan pending (SA 260)', () => {
  it('temuan Significant berstatus diskusi/draft diangkat; final/tuntas tidak', () => {
    const r = reconcileGovernanceComms({
      deficiencies: [], defSeed: {}, links: {},
      mlFindings: [ml('A', 'diskusi'), ml('B', 'final'), ml('C', 'draft'), ml('D', 'tuntas'), ml('E', 'diskusi', 'Observation')],
    });
    expect(r.pendingFindings.map(f => f.id)).toEqual(['A', 'C']);
    expect(r.rollup.pendingSignificant).toBe(2);
  });
});

describe('integrasi seed kanonik (DEFICIENCIES + DEF_SEED + link)', () => {
  it('register nyata: 3 defisiensi wajib-TCWG semua terkomunikasi (seed ML semua final)', () => {
    const mlFindings: MlFindingLite[] = [
      ml('ML-01', 'final'), ml('ML-02', 'final'), ml('ML-03', 'final', 'Deficiency'),
      ml('ML-04', 'diskusi', 'Significant', 'Pihak berelasi'), ml('ML-05', 'final', 'Observation'),
    ];
    const r = reconcileGovernanceComms({ deficiencies: DEFICIENCIES, defSeed: DEF_SEED, links: DEFICIENCY_ML_LINK, mlFindings });
    const by = Object.fromEntries(r.rows.map(x => [x.defId, x]));
    expect(by['I-02'].level).toBe('Kelemahan Material');
    expect(by['R-03'].level).toBe('Defisiensi Signifikan');
    expect(by['F-01'].level).toBe('Defisiensi Signifikan');
    expect(by['ITGC-SoD'].level).toBe('Defisiensi Pengendalian');
    expect(r.rollup.requiresTcwgCount).toBe(3);
    expect(r.rollup.communicatedCount).toBe(3);
    expect(r.rollup.defGaps).toBe(0);
    // SA 260: ML-04 signifikan masih diskusi
    expect(r.rollup.pendingSignificant).toBe(1);
    expect(r.pendingFindings[0].id).toBe('ML-04');
  });
});
