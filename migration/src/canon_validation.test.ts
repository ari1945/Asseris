import { describe, it, expect } from 'vitest';
import { probError, clampPct, dueBeforeIssued, capacityProjection, reconcileDeficiencyComm, ajeRefKey, reconcileUncorrectedMisstatements, reconcileOpinionConsistency, reconcileSamplingTolerance, reconcileConfirmationCoverage, type ConfItem } from './canon_validation';

describe('probError — probabilitas 0–100', () => {
  it('menerima 0/50/100', () => {
    expect(probError(0)).toBeNull();
    expect(probError(50)).toBeNull();
    expect(probError(100)).toBeNull();
  });
  it('menolak <0, >100, NaN', () => {
    expect(probError(-1)).toMatch(/0–100/);
    expect(probError(101)).toMatch(/0–100/);
    expect(probError(NaN)).toMatch(/angka/);
  });
});

describe('clampPct', () => {
  it('membatasi ke 0–100 & membulatkan', () => {
    expect(clampPct(-5)).toBe(0);
    expect(clampPct(150)).toBe(100);
    expect(clampPct(63.4)).toBe(63);
  });
});

describe('dueBeforeIssued — jatuh tempo ≥ terbit', () => {
  it('true bila jatuh tempo sebelum terbit', () => {
    expect(dueBeforeIssued('2026-03-10', '2026-03-09')).toBe(true);
  });
  it('false bila jatuh tempo = / setelah terbit', () => {
    expect(dueBeforeIssued('2026-03-09', '2026-03-09')).toBe(false);
    expect(dueBeforeIssued('2026-03-09', '2026-04-09')).toBe(false);
  });
  it('false bila salah satu kosong (ditangani validasi wajib terpisah)', () => {
    expect(dueBeforeIssued('', '2026-03-09')).toBe(false);
    expect(dueBeforeIssued('2026-03-09', '')).toBe(false);
  });
});

describe('capacityProjection — jam vs kapasitas', () => {
  it('tidak over saat proyeksi ≤ kapasitas', () => {
    const p = capacityProjection(24, 40, 8);
    expect(p).toEqual({ projected: 32, over: false, overBy: 0, pct: 80 });
  });
  it('over saat proyeksi > kapasitas', () => {
    const p = capacityProjection(38, 40, 8);
    expect(p.over).toBe(true);
    expect(p.projected).toBe(46);
    expect(p.overBy).toBe(6);
    expect(p.pct).toBe(115);
  });
  it('addHrs negatif dianggap 0', () => {
    expect(capacityProjection(20, 40, -5).projected).toBe(20);
  });
});

describe('reconcileSamplingTolerance — SA 530 · TM vs PM', () => {
  it('TM > PM → berat (sampel under-powered, SA 320.9/530.7)', () => {
    const r = reconcileSamplingTolerance({ tm: 9000, pm: 6000 });
    expect(r.exceedsPm).toBe(true);
    expect(r.severe).toBe(true);
    expect(r.issues.some(i => i.code === 'tm-gt-pm' && i.severe)).toBe(true);
    expect(r.ratio).toBeCloseTo(1.5, 5);
  });

  it('TM = PM → bersih (batas atas yang diizinkan)', () => {
    const r = reconcileSamplingTolerance({ tm: 6000, pm: 6000 });
    expect(r.exceedsPm).toBe(false);
    expect(r.severe).toBe(false);
    expect(r.count).toBe(0);
    expect(r.ratio).toBe(1);
  });

  it('TM sedikit di bawah PM (dalam toleransi 15%) → bersih', () => {
    const r = reconcileSamplingTolerance({ tm: 5400, pm: 6000 }); // 90% PM
    expect(r.severe).toBe(false);
    expect(r.count).toBe(0);
  });

  it('TM ≥ 15% di bawah PM → catatan efisiensi non-berat', () => {
    const r = reconcileSamplingTolerance({ tm: 3000, pm: 6000 }); // 50% PM
    expect(r.severe).toBe(false);
    expect(r.issues.some(i => i.code === 'tm-under-pm' && !i.severe)).toBe(true);
  });

  it('proyeksi ≥ TM tetapi populasi "diterima" → berat (SA 530.A22/450)', () => {
    const r = reconcileSamplingTolerance({ tm: 6000, pm: 6000, projectedMisstatement: 6500, accepted: true });
    expect(r.severe).toBe(true);
    expect(r.issues.some(i => i.code === 'proj-ge-tm-accepted' && i.severe)).toBe(true);
  });

  it('proyeksi ≥ TM tetapi TIDAK diterima → tak memicu isu proyeksi', () => {
    const r = reconcileSamplingTolerance({ tm: 6000, pm: 6000, projectedMisstatement: 6500, accepted: false });
    expect(r.issues.some(i => i.code === 'proj-ge-tm-accepted')).toBe(false);
  });

  it('PM tak tersedia → catatan non-berat, tak divalidasi', () => {
    const r = reconcileSamplingTolerance({ tm: 7000, pm: null });
    expect(r.exceedsPm).toBe(false);
    expect(r.ratio).toBeNull();
    expect(r.severe).toBe(false);
    expect(r.issues.some(i => i.code === 'pm-missing')).toBe(true);
  });

  it('finalisasi + isu berat → tambah isu "finalized" berat', () => {
    const r = reconcileSamplingTolerance({ tm: 9000, pm: 6000, finalized: true });
    expect(r.issues.some(i => i.code === 'finalized' && i.severe)).toBe(true);
    expect(r.count).toBeGreaterThanOrEqual(2);
  });
});

describe('reconcileConfirmationCoverage — SA 505 · cakupan vs saldo', () => {
  const C = (o: Partial<ConfItem> & { id: string }): ConfItem => ({
    area: 'Piutang', method: 'Positif', amount: 1000, resp: 1000, status: 'Received', validated: true, ...o,
  });
  const AREAS = [{ area: 'Piutang', pop: 10000 }];

  it('non-respons positif ("No Reply") → berat alt-missing (¶12)', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-1', status: 'No Reply', resp: null })],
      areas: AREAS,
    });
    expect(r.altMissing).toEqual(['CF-1']);
    expect(r.severe).toBe(true);
    expect(r.issues.some(i => i.code === 'alt-missing' && i.severe)).toBe(true);
  });

  it('non-respons NEGATIF dikecualikan (¶15) → tidak alt-missing', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-2', method: 'Negatif', status: 'No Reply', resp: null })],
      areas: AREAS,
    });
    expect(r.altMissing).toEqual([]);
    expect(r.severe).toBe(false);
  });

  it('diskrepansi terbuka → warn non-berat disc-open (¶11)', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-3', status: 'Discrepancy', resp: 800 })],
      areas: AREAS,
    });
    expect(r.discOpen).toEqual(['CF-3']);
    expect(r.severe).toBe(false);
    expect(r.issues.some(i => i.code === 'disc-open' && !i.severe)).toBe(true);
  });

  it('respons diterima tapi keandalan belum divalidasi → warn reliability', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-4', validated: false })],
      areas: AREAS,
    });
    expect(r.unreliable).toEqual(['CF-4']);
    expect(r.issues.some(i => i.code === 'reliability' && !i.severe)).toBe(true);
  });

  it('cakupan nilai < 50% saldo populasi → warn coverage-low (SA 330)', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-5', amount: 2000 })], // 2000/10000 = 20%
      areas: AREAS,
    });
    const cov = r.areas[0];
    expect(cov.covSent).toBeCloseTo(0.2, 5);
    expect(cov.low).toBe(true);
    expect(r.issues.some(i => i.code === 'coverage-low' && !i.severe)).toBe(true);
  });

  it('cakupan ≥ 50% → tidak coverage-low', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-6', amount: 6000 })], // 60%
      areas: AREAS,
    });
    expect(r.areas[0].low).toBe(false);
    expect(r.issues.some(i => i.code === 'coverage-low')).toBe(false);
  });

  it('cakupan respons (covResp) hanya menghitung item yang dijawab', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-7', amount: 6000 }), C({ id: 'CF-8', amount: 4000, status: 'No Reply', resp: null })],
      areas: AREAS,
    });
    const cov = r.areas[0];
    expect(cov.covSent).toBeCloseTo(1.0, 5);   // 10000/10000 terkirim
    expect(cov.covResp).toBeCloseTo(0.6, 5);    // hanya CF-7 dijawab
  });

  it('finalisasi + tindak lanjut terbuka → berat finalized', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-9', status: 'No Reply', resp: null })],
      areas: AREAS,
      finalized: true,
    });
    expect(r.issues.some(i => i.code === 'finalized' && i.severe)).toBe(true);
  });

  it('semua bersih (dijawab, tervalidasi, cakupan penuh) → nol isu', () => {
    const r = reconcileConfirmationCoverage({
      items: [C({ id: 'CF-10', amount: 10000 })],
      areas: AREAS,
    });
    expect(r.count).toBe(0);
    expect(r.severe).toBe(false);
  });
});

describe('reconcileDeficiencyComm — SA 265 ¶9 → SA 260 ¶16', () => {
  const D = (id: string, sig: boolean, status: string) => ({ id, sig, status });
  const WRITTEN = 'Tertulis ke TCWG';
  const ORAL = 'Lisan ke manajemen';

  it('bersih: seluruh signifikan tertulis & SA 260 ¶16 selesai', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN), D('D-02', true, WRITTEN), D('D-03', false, ORAL)],
      sigFindingsStatus: 'Selesai',
    });
    expect(r.sig).toBe(2);
    expect(r.misclassified).toEqual([]);
    expect(r.tcwgPending).toBe(false);
    expect(r.coveragePct).toBe(100);
    expect(r.issues).toBe(0);
  });

  it('menandai defisiensi signifikan yang dikomunikasikan lisan (langgar ¶9)', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN), D('D-02', true, ORAL)],
      sigFindingsStatus: 'Selesai',
    });
    expect(r.misclassified).toEqual(['D-02']);
    expect(r.coveragePct).toBe(50);
    expect(r.issues).toBe(1);
  });

  it('menandai SA 260 ¶16 belum selesai saat ada defisiensi signifikan', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', true, WRITTEN)],
      sigFindingsStatus: 'Berlangsung',
    });
    expect(r.tcwgReported).toBe(false);
    expect(r.tcwgPending).toBe(true);
    expect(r.issues).toBe(1);
  });

  it('tanpa status SA 260 → dianggap belum selesai (bila ada signifikan)', () => {
    const r = reconcileDeficiencyComm({ deficiencies: [D('D-01', true, WRITTEN)] });
    expect(r.tcwgPending).toBe(true);
  });

  it('nol defisiensi signifikan → tak ada isu meski SA 260 belum selesai', () => {
    const r = reconcileDeficiencyComm({
      deficiencies: [D('D-01', false, ORAL)],
      sigFindingsStatus: '',
    });
    expect(r.sig).toBe(0);
    expect(r.tcwgPending).toBe(false);
    expect(r.coveragePct).toBe(100);
    expect(r.issues).toBe(0);
  });

  it('list kosong aman', () => {
    const r = reconcileDeficiencyComm({ deficiencies: [] });
    expect(r).toMatchObject({ total: 0, sig: 0, issues: 0, coveragePct: 100 });
  });
});

describe('ajeRefKey — normalisasi ref SAD → id jurnal AMS.AJE', () => {
  it('PAJE-03 & AJE-03 sama-sama → AJE-03', () => {
    expect(ajeRefKey('PAJE-03')).toBe('AJE-03');
    expect(ajeRefKey('AJE-03')).toBe('AJE-03');
    expect(ajeRefKey('aje-3')).toBe('AJE-03');
  });
  it('ref non-jurnal → null', () => {
    expect(ajeRefKey('SA 530')).toBeNull();
    expect(ajeRefKey('SUM-PY')).toBeNull();
    expect(ajeRefKey('CTT')).toBeNull();
    expect(ajeRefKey('')).toBeNull();
  });
});

describe('reconcileUncorrectedMisstatements — SA 450 rekonsiliasi 3-arah', () => {
  const AJE = [
    { id: 'AJE-01', status: 'Posted', amount: 2_340_000_000 },
    { id: 'AJE-02', status: 'Posted', amount: 620_000_000 },
    { id: 'AJE-03', status: 'Proposed', amount: 1_850_000_000 },
    { id: 'AJE-05', status: 'Proposed', amount: 1_120_000_000 },
  ];
  // ledger SAD selaras (tanpa drift): item uncorrected ↔ AJE Proposed, corrected ↔ Posted
  const SAD_OK = [
    { id: 'M-01', disp: 'uncorrected', aje: 'PAJE-03', pbt: -1_950_000_000, na: -1_950_000_000, origin: 'current', qual: [] },
    { id: 'M-02', disp: 'uncorrected', aje: 'AJE-05', pbt: -1_120_000_000, na: -1_120_000_000, origin: 'current', qual: [] },
    { id: 'M-05', disp: 'corrected', aje: 'AJE-01', pbt: -2_340_000_000, na: -2_340_000_000, origin: 'current', qual: [] },
  ];

  it('ledger selaras + agregat < OM + opini konsisten → nol isu', () => {
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad: SAD_OK, om: 4_250_000_000, opinionType: 'unmodified' });
    expect(r.stale).toEqual([]);
    expect(r.missingFromSad).toEqual([]);
    expect(r.aggAbs).toBe(3_070_000_000); // 1.95M + 1.12M uncorrected current
    expect(r.exceedsOm).toBe(false);
    expect(r.opinionInconsistent).toBe(false);
    expect(r.issues).toBe(0);
  });

  it('staleness: SAD "dikoreksi" padahal AJE masih usulan (Proposed)', () => {
    const sad = [{ id: 'M-02', disp: 'corrected', aje: 'AJE-05', pbt: -1_120_000_000, na: -1_120_000_000, origin: 'current', qual: [] }];
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified' });
    expect(r.stale).toHaveLength(1);
    expect(r.stale[0]).toMatchObject({ sadId: 'M-02', ajeId: 'AJE-05', ajeStatus: 'Proposed' });
    expect(r.missingFromSad).toEqual(['AJE-03']); // AJE-03 Proposed tak terwakili di sad ini
    expect(r.issues).toBe(2); // 1 stale + 1 missing
  });

  it('staleness: SAD "tidak dikoreksi" padahal AJE sudah diposting', () => {
    const sad = [{ id: 'M-04', disp: 'uncorrected', aje: 'PAJE-02', pbt: -680_000_000, na: -680_000_000, origin: 'current', qual: [] }];
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified' });
    expect(r.stale).toHaveLength(1);
    expect(r.stale[0]).toMatchObject({ sadId: 'M-04', ajeId: 'AJE-02', ajeStatus: 'Posted' });
  });

  it('completeness: AJE Proposed tanpa item SAD → missingFromSad', () => {
    const sad = [{ id: 'M-01', disp: 'uncorrected', aje: 'PAJE-03', pbt: -1_950_000_000, na: -1_950_000_000, origin: 'current', qual: [] }];
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified' });
    expect(r.missingFromSad).toEqual(['AJE-05']); // AJE-03 terwakili M-01, AJE-05 hilang
  });

  it('SA 450→705: agregat > OM tetapi opini "unmodified" → inconsistent', () => {
    const sad = [{ id: 'M-01', disp: 'uncorrected', aje: 'PAJE-03', pbt: -5_000_000_000, na: -5_000_000_000, origin: 'current', qual: ['fraud'] }];
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified' });
    expect(r.exceedsOm).toBe(true);
    expect(r.opinionInconsistent).toBe(true);
    expect(r.qualFlags).toContain('fraud');
    expect(r.issues).toBeGreaterThanOrEqual(1);
  });

  it('SA 450→705: agregat > OM tetapi opini sudah "qualified" → konsisten', () => {
    const sad = [{ id: 'M-01', disp: 'uncorrected', aje: 'PAJE-03', pbt: -5_000_000_000, na: -5_000_000_000, origin: 'current', qual: [] }];
    const r = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'qualified' });
    expect(r.exceedsOm).toBe(true);
    expect(r.opinionModified).toBe(true);
    expect(r.opinionInconsistent).toBe(false);
  });

  it('iron-curtain memakai efek aset neto & memasukkan carryover PY', () => {
    const sad = [
      { id: 'M-01', disp: 'uncorrected', aje: 'PAJE-03', pbt: -1_000_000_000, na: -1_000_000_000, origin: 'current', qual: [] },
      { id: 'M-08', disp: 'uncorrected', aje: 'SUM-PY', pbt: 0, na: -180_000_000, origin: 'prior', qual: [] },
    ];
    const roll = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified', method: 'rollover' });
    const iron = reconcileUncorrectedMisstatements({ aje: AJE, sad, om: 4_250_000_000, opinionType: 'unmodified', method: 'ironcurtain' });
    expect(roll.aggAbs).toBe(1_000_000_000); // PY dikecualikan
    expect(iron.aggAbs).toBe(1_180_000_000); // PY carryover masuk (na)
  });

  it('input kosong aman', () => {
    const r = reconcileUncorrectedMisstatements({ aje: [], sad: [], om: 0, opinionType: '' });
    expect(r).toMatchObject({ proposed: 0, issues: 0, exceedsOm: false, opinionInconsistent: false });
  });
});

describe('reconcileOpinionConsistency — SA 705 konsistensi opini', () => {
  it('selaras (applied == recommended) → nol isu', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'qualified', recommendedType: 'qualified', basisText: 'Persediaan…' });
    expect(r.diverges).toBe(false);
    expect(r.count).toBe(0);
    expect(r.severe).toBe(false);
  });

  it('under-modification: unmodified diterapkan padahal qualified direkomendasikan → severe', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'unmodified', recommendedType: 'qualified' });
    expect(r.underModified).toBe(true);
    expect(r.overModified).toBe(false);
    expect(r.severe).toBe(true);
    expect(r.issues.map(i => i.code)).toContain('under');
  });

  it('over-modification: adverse diterapkan padahal qualified direkomendasikan → tidak severe', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'adverse', recommendedType: 'qualified', basisText: 'x' });
    expect(r.overModified).toBe(true);
    expect(r.issues.map(i => i.code)).toContain('over');
    expect(r.severe).toBe(false);
  });

  it('opini modifikasian tanpa paragraf Basis → isu basis (SA 705.20)', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'qualified', recommendedType: 'qualified', basisText: '  ' });
    expect(r.issues.map(i => i.code)).toContain('basis');
    expect(r.severe).toBe(true);
  });

  it('GC ketidakpastian material tanpa seksi khusus → isu gc-missing (SA 570.22)', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'unmodified', recommendedType: 'unmodified', gcStatus: 'mu', gcSectionShown: false });
    expect(r.issues.map(i => i.code)).toContain('gc-missing');
    expect(r.severe).toBe(true);
  });

  it('seksi GC aktif tanpa status ketidakpastian material → gc-stray (tidak severe)', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'unmodified', recommendedType: 'unmodified', gcStatus: 'none', gcSectionShown: true });
    expect(r.issues.map(i => i.code)).toContain('gc-stray');
    expect(r.severe).toBe(false);
  });

  it('finalisasi dengan inkonsistensi berat → menambah gerbang finalized', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'unmodified', recommendedType: 'adverse', finalized: true });
    const codes = r.issues.map(i => i.code);
    expect(codes).toContain('under');
    expect(codes).toContain('finalized');
    expect(r.severe).toBe(true);
  });

  it('finalisasi tetapi konsisten → tanpa gerbang finalized', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'unmodified', recommendedType: 'unmodified', finalized: true });
    expect(r.issues).toEqual([]);
  });

  it('disclaimer vs adverse setara level → tidak dianggap under/over', () => {
    const r = reconcileOpinionConsistency({ appliedType: 'disclaimer', recommendedType: 'adverse', basisText: 'x' });
    expect(r.underModified).toBe(false);
    expect(r.overModified).toBe(false);
    expect(r.diverges).toBe(true); // tetap berbeda jenis
  });
});
