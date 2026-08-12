/* Evaluasi pekerjaan pakar (SA 500 ¶8 / SA 620) — menutup K11 PRD
   prd-estimasi-terfalsifikasi: empat centang tak boleh lagi berupa literal. */
import { describe, it, expect } from 'vitest';
import {
  EXPERT_EVAL_STEPS, EXPERT_APPROACH, expertEvalComplete, expertEvalDone, expertEvalMissing,
  expertGateBlockers, expertRefsOf,
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

describe('expertGateBlockers — gerbang sign-off SA 620 (K11)', () => {
  const full = { competence: true, objectivity: true, scope: true, findings: true };
  const est = [
    { id: 'E-04', name: 'Imbalan Kerja', approach: EXPERT_APPROACH },
    { id: 'E-01', name: 'CKPN', approach: 'Rentang independen' },
  ];

  it('estimasi ber-jalur pakar tanpa apa pun → dua alasan', () => {
    const b = expertGateBlockers(est, {}, []);
    expect(b).toHaveLength(1);
    expect(b[0].id).toBe('E-04');
    expect(b[0].reasons).toHaveLength(2);
    expect(b[0].reasons[0]).toContain('0/4');
    expect(b[0].reasons[1]).toContain('belum ditautkan');
  });

  it('estimasi yang TIDAK memakai pakar tak pernah menghalangi', () => {
    expect(expertGateBlockers([est[1]], {}, [])).toEqual([]);
  });

  it('evaluasi tuntas tetapi dokumen belum ditautkan → tetap terblokir', () => {
    const b = expertGateBlockers(est, { 'E-04': full }, ['ev-1']);
    expect(b[0].reasons).toEqual(['Laporan pakar belum ditautkan dari bukti kertas kerja']);
  });

  it('dokumen ditautkan tetapi sudah dicabut dari DMS → tautan putus dilaporkan', () => {
    const b = expertGateBlockers(est, { 'E-04': { ...full, docUid: 'ev-hilang' } }, ['ev-1']);
    expect(b[0].reasons[0]).toContain('tidak lagi ada');
  });

  it('evaluasi tuntas + dokumen ada → tak ada penghalang', () => {
    expect(expertGateBlockers(est, { 'E-04': { ...full, docUid: 'ev-1' } }, ['ev-1'])).toEqual([]);
  });

  it('tiga dari empat langkah tetap menghalangi meski dokumen ada', () => {
    const b = expertGateBlockers(est, { 'E-04': { competence: true, objectivity: true, scope: true, docUid: 'ev-1' } }, ['ev-1']);
    expect(b[0].reasons[0]).toContain('3/4');
  });

  it('masukan kosong / null aman', () => {
    expect(expertGateBlockers(null, null, null)).toEqual([]);
    expect(expertGateBlockers([], {}, [])).toEqual([]);
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
