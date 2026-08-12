/* Evaluasi pekerjaan pakar (SA 500 ¶8 / SA 620) — menutup K11 PRD
   prd-estimasi-terfalsifikasi: empat centang tak boleh lagi berupa literal. */
import { describe, it, expect } from 'vitest';
import {
  EXPERT_EVAL_STEPS, expertEvalComplete, expertEvalDone, expertEvalMissing, expertRefsOf,
  type ExpertEvalState,
} from './canon_expert_eval';

describe('expertEvalComplete', () => {
  it('state kosong / null / undefined belum tuntas', () => {
    expect(expertEvalComplete(undefined)).toBe(false);
    expect(expertEvalComplete(null)).toBe(false);
    expect(expertEvalComplete({})).toBe(false);
  });

  it('tiga dari empat langkah belum cukup', () => {
    expect(expertEvalComplete({ competence: true, objectivity: true, scope: true })).toBe(false);
  });

  it('keempat langkah → tuntas', () => {
    expect(expertEvalComplete({ competence: true, objectivity: true, scope: true, findings: true })).toBe(true);
  });

  it('nilai selain true tidak dihitung tuntas', () => {
    const partial = { competence: true, objectivity: true, scope: true, findings: undefined };
    expect(expertEvalComplete(partial)).toBe(false);
  });

  it('expertEvalDone menghitung kemajuan', () => {
    expect(expertEvalDone({ competence: true, findings: true })).toBe(2);
    expect(expertEvalDone(undefined)).toBe(0);
    expect(expertEvalDone({})).toBe(0);
  });

  it('daftar langkah tetap empat & bernomor standar', () => {
    expect(EXPERT_EVAL_STEPS).toHaveLength(4);
    expect(EXPERT_EVAL_STEPS.map(s => s.key)).toEqual(['competence', 'objectivity', 'scope', 'findings']);
    expect(EXPERT_EVAL_STEPS.every(s => !!s.ref && !!s.t)).toBe(true);
  });
});

describe('expertEvalMissing', () => {
  const full = { competence: true, objectivity: true, scope: true, findings: true };

  it('state kosong → seluruh rujukan kurang', () => {
    expect(expertEvalMissing({}, ['V-2', 'V-3'])).toEqual(['V-2', 'V-3']);
    expect(expertEvalMissing(null, ['V-2'])).toEqual(['V-2']);
  });

  it('hanya yang belum tuntas yang dilaporkan', () => {
    const st: ExpertEvalState = { 'V-2': full, 'V-3': { competence: true } };
    expect(expertEvalMissing(st, ['V-2', 'V-3'])).toEqual(['V-3']);
  });

  it('seluruhnya tuntas → kosong', () => {
    expect(expertEvalMissing({ 'V-2': full, 'V-3': full }, ['V-2', 'V-3'])).toEqual([]);
  });

  it('tanpa rujukan pakar → tak ada yang kurang', () => {
    expect(expertEvalMissing({}, [])).toEqual([]);
  });

  it('rujukan duplikat tidak dilaporkan dua kali', () => {
    expect(expertEvalMissing({}, ['V-2', 'V-2'])).toEqual(['V-2']);
  });
});

describe('expertRefsOf', () => {
  it('mengumpulkan rujukan unik & mengabaikan pos tanpa pakar', () => {
    expect(expertRefsOf([{ expert: 'V-2' }, {}, { expert: 'V-3' }, { expert: 'V-2' }])).toEqual(['V-2', 'V-3']);
  });

  it('masukan kosong aman', () => {
    expect(expertRefsOf([])).toEqual([]);
    expect(expertRefsOf(null)).toEqual([]);
    expect(expertRefsOf(undefined)).toEqual([]);
  });
});
