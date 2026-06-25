import { describe, it, expect } from 'vitest';
import {
  APPROACHES, APPROACH_RANK, READY_WP_STATUS,
  defaultApproach, adequateApproach, reconcileRiskResponse,
  type RiskInput, type ApproachId,
} from './canon_audit_plan';

/* Risiko nyata dari seed (data_part1.ts) — sumber kebenaran contoh. */
const R01: RiskInput = { id: 'R-01', area: 'Pendapatan', assertion: 'Occurrence', inherent: 'Significant', fraud: true, likelihood: 4, impact: 5, response: 'Cut-off testing diperluas', wp: 'B-3', proc: 'psak72' };
const R05: RiskInput = { id: 'R-05', area: 'Management Override', assertion: 'Multiple', inherent: 'Significant', fraud: true, likelihood: 3, impact: 5, response: 'JE testing (SA 240)', wp: 'JE-1', proc: 'jet' };
const R08: RiskInput = { id: 'R-08', area: 'Pihak Berelasi', assertion: 'Completeness', inherent: 'Moderate', fraud: false, likelihood: 2, impact: 4, response: 'Pengujian kelengkapan', wp: 'RP-1', proc: 'related' };
const R_MODHI: RiskInput = { id: 'R-X', area: 'X', assertion: 'A', inherent: 'Moderate', fraud: false, likelihood: 3, impact: 3, response: 'x', wp: 'C-2', proc: 'psak14' }; // L×I=9
const R_LOW: RiskInput = { id: 'R-Y', area: 'Y', assertion: 'A', inherent: 'Low', fraud: false, likelihood: 2, impact: 2, response: 'y', wp: 'E-4', proc: 'psak16' }; // L×I=4

describe('konstanta & peringkat', () => {
  it('APPROACHES tiga opsi dengan id stabil', () => {
    expect(APPROACHES.map(a => a.id)).toEqual(['sub', 'ctrl', 'ext']);
  });
  it('peringkat intensitas naik sub<ctrl<ext', () => {
    expect(APPROACH_RANK.sub).toBeLessThan(APPROACH_RANK.ctrl);
    expect(APPROACH_RANK.ctrl).toBeLessThan(APPROACH_RANK.ext);
  });
});

describe('defaultApproach (perilaku lama view)', () => {
  it('signifikan → ext', () => expect(defaultApproach(R01)).toBe('ext'));
  it('L×I≥9 non-signifikan → ctrl', () => expect(defaultApproach(R_MODHI)).toBe('ctrl'));
  it('selain itu → sub', () => expect(defaultApproach(R_LOW)).toBe('sub'));
});

describe('adequateApproach (minimum memadai SA 330)', () => {
  it('signifikan → ext', () => expect(adequateApproach(R01)).toBe('ext'));
  it('kecurangan walau non-signifikan → ext', () => {
    expect(adequateApproach({ ...R_LOW, fraud: true })).toBe('ext');
  });
  it('L×I≥9 → ctrl', () => expect(adequateApproach(R_MODHI)).toBe('ctrl'));
  it('rendah → sub', () => expect(adequateApproach(R_LOW)).toBe('sub'));
});

describe('reconcileRiskResponse — adequacy', () => {
  it('default seluruhnya memadai → 0 under-response', () => {
    const { rows, rollup } = reconcileRiskResponse({ risks: [R01, R05, R08, R_MODHI, R_LOW] });
    expect(rows.every(r => r.adequate)).toBe(true);
    expect(rollup.byKind['under-response']).toBe(0);
  });
  it('override melemahkan risiko signifikan → under-response gap', () => {
    const { rows, rollup } = reconcileRiskResponse({ risks: [R05], overrides: { 'R-05': 'sub' } });
    expect(rows[0].plan).toBe('sub');
    expect(rows[0].adequate).toBe(false);
    expect(rows[0].gaps).toContain('under-response');
    expect(rollup.byKind['under-response']).toBe(1);
  });
  it('override menguatkan (ke atas) tetap memadai', () => {
    const { rows } = reconcileRiskResponse({ risks: [R_MODHI], overrides: { 'R-X': 'ext' as ApproachId } });
    expect(rows[0].plan).toBe('ext');
    expect(rows[0].adequate).toBe(true);
    expect(rows[0].gaps).toHaveLength(0);
  });
  it('moderate sengaja substantif (sub) tetap memadai — bukan false positive', () => {
    const { rows } = reconcileRiskResponse({ risks: [R08] }); // moderate, L×I=8 → min sub
    expect(rows[0].minAdequate).toBe('sub');
    expect(rows[0].adequate).toBe(true);
  });
});

describe('reconcileRiskResponse — tautan rencana', () => {
  it('respons/proc/wp kosong → tiga gap tautan', () => {
    const bare: RiskInput = { id: 'R-Z', area: 'Z', assertion: 'A', inherent: 'Low', fraud: false, likelihood: 1, impact: 1, response: '', wp: '', proc: '' };
    const { rows } = reconcileRiskResponse({ risks: [bare] });
    expect(rows[0].gaps).toEqual(expect.arrayContaining(['no-response', 'no-proc', 'no-wp']));
  });
});

describe('reconcileRiskResponse — status kertas kerja', () => {
  it('KK lead-schedule belum mulai pada risiko signifikan → wp-not-started', () => {
    const { rows } = reconcileRiskResponse({ risks: [R01], wpStatusByRef: { 'B-3': 'Not Started' } });
    expect(rows[0].wpKnown).toBe(true);
    expect(rows[0].wpReady).toBe(false);
    expect(rows[0].gaps).toContain('wp-not-started');
  });
  it('KK sedang dikerjakan → siap, tanpa gap', () => {
    const { rows } = reconcileRiskResponse({ risks: [R01], wpStatusByRef: { 'B-3': 'In Review' } });
    expect(rows[0].wpReady).toBe(true);
    expect(rows[0].gaps).toHaveLength(0);
  });
  it('status tak teridentifikasi (n/a) tidak di-flag — JE-1/RP-1 di luar lead schedule', () => {
    const { rows } = reconcileRiskResponse({ risks: [R05], wpStatusByRef: { 'JE-1': '' } });
    expect(rows[0].wpKnown).toBe(false);
    expect(rows[0].wpStatus).toBe('n/a');
    expect(rows[0].gaps).not.toContain('wp-not-started');
  });
  it('KK belum mulai pada risiko NON-kritis tidak di-flag', () => {
    const { rows } = reconcileRiskResponse({ risks: [R_LOW], wpStatusByRef: { 'E-4': 'Not Started' } });
    expect(rows[0].gaps).not.toContain('wp-not-started');
  });
  it('READY_WP_STATUS memuat status kerja inti', () => {
    expect(READY_WP_STATUS).toEqual(expect.arrayContaining(['In Progress', 'In Review', 'Reviewed']));
  });
});

describe('reconcileRiskResponse — roll-up & cakupan', () => {
  it('cakupan 100% bila tanpa gap', () => {
    const { rollup } = reconcileRiskResponse({ risks: [R01, R_MODHI, R_LOW], wpStatusByRef: { 'B-3': 'In Review', 'C-2': 'In Progress', 'E-4': 'Reviewed' } });
    expect(rollup.coveragePct).toBe(100);
    expect(rollup.gapRisks).toBe(0);
  });
  it('hitung signifikan & fraud; cakupan turun saat ada gap', () => {
    const { rollup } = reconcileRiskResponse({ risks: [R01, R05, R_LOW], overrides: { 'R-05': 'sub' } });
    expect(rollup.total).toBe(3);
    expect(rollup.significant).toBe(2);
    expect(rollup.fraud).toBe(2);
    expect(rollup.gapRisks).toBe(1);
    expect(rollup.coveragePct).toBe(67);
  });
  it('input kosong → roll-up nol aman (tanpa div/0)', () => {
    const { rows, rollup } = reconcileRiskResponse({ risks: [] });
    expect(rows).toHaveLength(0);
    expect(rollup.coveragePct).toBe(0);
    expect(rollup.total).toBe(0);
  });
  it('integrasi seed nyata: R-05 dilemahkan + KK n/a → tepat satu gap (under-response)', () => {
    const { rows } = reconcileRiskResponse({ risks: [R05], overrides: { 'R-05': 'ctrl' }, wpStatusByRef: { 'JE-1': '' } });
    expect(rows[0].gaps).toEqual(['under-response']);
  });
});
