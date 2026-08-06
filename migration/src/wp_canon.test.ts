import { describe, it, expect } from 'vitest';
import { defaultProcState, procStatusAt, execStatus, wpEvidenceEval, deriveWpStatus } from './wp_canon';
import { AMS } from './data';

describe('defaultProcState — heuristic per WP-level status (characterization)', () => {
  it('Reviewed → semua Selesai', () => {
    expect(defaultProcState('A', 'Reviewed', 0, 5)).toBe('Selesai');
    expect(defaultProcState('A', 'Reviewed', 4, 5)).toBe('Selesai');
  });
  it('In Review → Selesai kecuali prosedur terakhir', () => {
    expect(defaultProcState('A', 'In Review', 3, 5)).toBe('Selesai');
    expect(defaultProcState('A', 'In Review', 4, 5)).toBe('Belum');
  });
  it('In Progress → separuh atas Selesai', () => {
    expect(defaultProcState('R', 'In Progress', 2, 5)).toBe('Selesai');   // i < ceil(5/2)=3
    expect(defaultProcState('R', 'In Progress', 3, 5)).toBe('Belum');
  });
  it('Not Started → Belum; proc tanpa ref → fallback default', () => {
    expect(defaultProcState('X', 'Not Started', 0, 3)).toBe('Belum');
    expect(defaultProcState('900', 'Not Started', 0, 3)).toBe('Belum');
  });
  it('PROC_EXC_SEED memaksa Pengecualian (B[5], C[2])', () => {
    expect(defaultProcState('B', 'In Review', 5, 6)).toBe('Pengecualian');
    expect(defaultProcState('C', 'In Progress', 2, 5)).toBe('Pengecualian');
  });
});

describe('execStatus — derive dari item uji (characterization)', () => {
  it('kosong → null', () => expect(execStatus(undefined)).toBeNull());
  it('ada pengecualian → Pengecualian', () =>
    expect(execStatus({ items: [{ result: 'exc' }] })).toBe('Pengecualian'));
  it('belum semua diuji → Berjalan', () =>
    expect(execStatus({ items: [{ result: 'tie' }, { result: '' }] })).toBe('Berjalan'));
  it('semua N/A → N/A', () =>
    expect(execStatus({ items: [{ result: 'na' }, { result: 'na' }] })).toBe('N/A'));
  it('semua dinilai (non-exc, non-na) → Selesai', () =>
    expect(execStatus({ items: [{ result: 'tie' }, { result: 'tie' }] })).toBe('Selesai'));
});

describe('procStatusAt — prioritas exec → procs manual → heuristic (characterization)', () => {
  const defs = [['a', 'E/O'], ['b', 'E/O'], ['c', 'E/O'], ['d', 'E/O'], ['e', 'E/O'], ['f', 'E/O']];
  it('exec mengalahkan heuristic', () => {
    const st = { exec: { p0: { items: [{ result: 'exc' }] } } };
    expect(procStatusAt('B', st, 'In Review', defs, 0)).toBe('Pengecualian');
  });
  it('st.procs manual mengalahkan heuristic', () => {
    const st = { procs: { p1: 'Pengecualian' } };
    expect(procStatusAt('B', st, 'In Review', defs, 1)).toBe('Pengecualian');
  });
  it('tanpa keduanya → heuristic (seed B p5 = Pengecualian)', () => {
    expect(procStatusAt('B', {}, 'In Review', defs, 5)).toBe('Pengecualian');
  });
});

describe('wpEvidenceEval — kecukupan & ketepatan (characterization)', () => {
  it('tanpa bukti/item → Belum Memadai', () => {
    const r = wpEvidenceEval([], {});
    expect(r.verdict.l).toBe('Belum Memadai'); expect(r.suffPct).toBe(0);
  });
  it('bukti tier-5 + semua teruji → Cukup & Tepat', () => {
    const r = wpEvidenceEval([{ id: 'E1', tier: 5 }], { p0: { items: [{ result: 'tie' }, { result: 'tie' }] } });
    expect(r.appr).toBe(5); expect(r.suffPct).toBe(100); expect(r.verdict.l).toBe('Bukti Cukup & Tepat');
  });
  it('ada pengecualian → tidak pernah Cukup & Tepat', () => {
    const r = wpEvidenceEval([{ id: 'E1', tier: 5 }], { p0: { items: [{ result: 'exc' }, { result: 'tie' }] } });
    expect(r.exc).toBe(1); expect(r.verdict.l).not.toBe('Bukti Cukup & Tepat');
  });
});

describe('deriveWpStatus — SEED ENG-2025-014, wpState kosong (characterization)', () => {
  const audit = { wtb: (AMS as any).WTB, risks: (AMS as any).RISKS, wpState: {} };
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: true } };
  const expectSeed = (ref: string, want: any) => {
    const r = deriveWpStatus(ref, audit, firm);
    expect(r.ref).toBe(ref);
    expect(r.status).toBe(want.status);
    expect(r.done).toBe(want.done);
    expect(r.total).toBe(want.total);
    expect(r.exc).toBe(want.exc);
    expect(r.openNotes).toBe(want.openNotes);
    if (want.coverage) expect(r.coverage).toEqual(want.coverage); else expect(r.coverage).toBeNull();
    expect(r.signedCount).toBe(want.signedCount);
    expect(r.fullySigned).toBe(want.fullySigned);
    expect(r.hasLead).toBe(want.hasLead);
  };
  it('A — Reviewed, 5/5, coverage full, reviewer default saja', () =>
    expectSeed('A', { status: 'Reviewed', done: 5, total: 5, exc: 0, openNotes: 0, coverage: { bal: 21905300000, level: 'full' }, signedCount: 2, fullySigned: false, hasLead: true }));
  it('B — In Review, 5/6, 1 exc seed, 2 catatan terbuka', () =>
    expectSeed('B', { status: 'In Review', done: 5, total: 6, exc: 1, openNotes: 2, coverage: { bal: 46872400000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('C — In Progress, 2/5, 1 exc seed, 1 catatan terbuka', () =>
    expectSeed('C', { status: 'In Progress', done: 2, total: 5, exc: 1, openNotes: 1, coverage: { bal: 76564100000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('E — In Review, 4/5, catatan seed resolved → 0 terbuka', () =>
    expectSeed('E', { status: 'In Review', done: 4, total: 5, exc: 0, openNotes: 0, coverage: { bal: 142039700000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('R — In Progress, 3/5, saldo negatif → abs full, 1 catatan terbuka', () =>
    expectSeed('R', { status: 'In Progress', done: 3, total: 5, exc: 0, openNotes: 1, coverage: { bal: -330050000000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('300 — Reviewed, 3/3, tanpa lead → coverage null', () =>
    expectSeed('300', { status: 'Reviewed', done: 3, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 2, fullySigned: false, hasLead: false }));
  it('810 — Not Started, 0/3, signedCount 1 MESKI belum ada tanda tangan (bug yang akan diperbaiki plan 003)', () =>
    expectSeed('810', { status: 'Not Started', done: 0, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 1, fullySigned: false, hasLead: false }));
});

describe('deriveWpStatus — exec-aware setelah unifikasi (plan 002)', () => {
  const audit = { wtb: (AMS as any).WTB, risks: (AMS as any).RISKS, wpState: {
    B: { exec: { p0: { items: [{ result: 'tie' }] }, p1: { items: [{ result: 'exc' }] } } },
  } };
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: true } };
  it('done/exc dihitung dari st.exec, bukan heuristik', () => {
    const r = deriveWpStatus('B', audit, firm);
    // B punya 6 prosedur: p0 Selesai (exec tie), p1 Pengecualian (exec exc),
    // p2..p4 jatuh ke heuristic In Review (Selesai), p5 seed Pengecualian.
    expect(r.done).toBe(4); // p0 + p2 + p3 + p4
    expect(r.exc).toBe(2);  // p1 + p5
  });
});
