/* Evaluasi pekerjaan pakar (SA 500 ¶8 / SA 620) — menutup K11 PRD
   prd-estimasi-terfalsifikasi: empat centang tak boleh lagi berupa literal. */
import { describe, it, expect } from 'vitest';
import {
  EXPERT_EVAL_STEPS, EXPERT_APPROACH, expertEvalComplete, expertEvalDone, expertEvalMissing,
  expertGateBlockers, expertRefsOf,
  expertGateSignatureSlots, expertGateSignatureViolations, isLegacyDocUid,
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
    expect(b[0].reasons).toEqual(['Laporan pakar belum ditautkan dari DMS perikatan']);
  });

  it('dokumen ditautkan tetapi sudah dicabut dari DMS → tautan putus dilaporkan', () => {
    const b = expertGateBlockers(est, { 'E-04': { ...full, docUid: 'att-hilang' } }, ['att-1']);
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

/* PRD prd-sa620-expert-gate-server PR-1 — aturan yang ditegakkan SERVER.
   Yang diuji di sini adalah diff-nya (kapan gerbang berjalan); kapabilitas &
   penolakannya diuji di server/src/__tests__/signoff.test.ts. */
describe('expertGateSignatureSlots — kapan gerbang berjalan', () => {
  const SIG = { by: 'Rina K.', byUserId: 'u-rk', at: '2026-08-12T03:00:00.000Z' };

  it('tanda tangan BARU pada ref digerbang → terdeteksi', () => {
    expect(expertGateSignatureSlots({
      prev: { sa540: { chain: {} } },
      next: { sa540: { chain: { preparer: SIG } } },
    })).toEqual([{ ref: 'sa540', slot: 'preparer' }]);
  });

  it('PENCABUTAN tanda tangan tidak digerbang — gerbang tak boleh menjebak WP (K5)', () => {
    expect(expertGateSignatureSlots({
      prev: { sa540: { chain: { preparer: SIG } } },
      next: { sa540: { chain: { preparer: null } } },
    })).toEqual([]);
    expect(expertGateSignatureSlots({
      prev: { sa540: { chain: { preparer: SIG } } },
      next: { sa540: { chain: {} } },
    })).toEqual([]);
  });

  it('suntingan ISI tanpa perubahan tanda tangan → nol (K7: nol query)', () => {
    expect(expertGateSignatureSlots({
      prev: { sa540: { chain: { preparer: SIG }, conclusion: { text: 'a' } } },
      next: { sa540: { chain: { preparer: SIG }, conclusion: { text: 'b' } } },
    })).toEqual([]);
  });

  it('ref LAIN tak tersentuh — gerbang tak menyentuh yang bukan urusannya', () => {
    expect(expertGateSignatureSlots({
      prev: { B: { chain: {} } }, next: { B: { chain: { preparer: SIG } } },
    })).toEqual([]);
  });

  it('KEEMPAT slot digerbang, termasuk eqr (keputusan Q3)', () => {
    const slots = expertGateSignatureSlots({
      prev: { sa540: { chain: {} } },
      next: { sa540: { chain: { preparer: SIG, reviewer: SIG, partner: SIG, eqr: SIG } } },
    }).map(s => s.slot);
    expect(slots).toEqual(['eqr', 'partner', 'preparer', 'reviewer']);
  });

  it('penggantian tanda tangan (orang lain di slot yang sama) dihitung perolehan', () => {
    expect(expertGateSignatureSlots({
      prev: { sa540: { chain: { preparer: SIG } } },
      next: { sa540: { chain: { preparer: { ...SIG, byUserId: 'u-lain' } } } },
    })).toEqual([{ ref: 'sa540', slot: 'preparer' }]);
  });
});

describe('expertGateSignatureViolations — penegakan server', () => {
  const SIG = { by: 'Rina K.', byUserId: 'u-rk', at: '2026-08-12T03:00:00.000Z' };
  const full = { competence: true, objectivity: true, scope: true, findings: true };
  const est = [
    { id: 'E-04', name: 'Imbalan Kerja', approach: EXPERT_APPROACH },
    { id: 'E-01', name: 'CKPN', approach: 'Rentang independen' },
  ];
  const signWrite = { prev: { sa540: { chain: {} } }, next: { sa540: { chain: { preparer: SIG } } } };

  it('tanda tangan di atas evaluasi kosong → dilanggar, menyebut estimasinya', () => {
    const v = expertGateSignatureViolations({ ...signWrite, estimates: est, expertEval: {}, requireDocument: false });
    expect(v).toHaveLength(1);
    expect(v[0].estimateId).toBe('E-04');
    expect(v[0].slot).toBe('preparer');
    expect(v[0].message).toContain('0/4');
  });

  it('EQR menandatangani di atas evaluasi kosong sama-sama ditolak (Q3)', () => {
    const v = expertGateSignatureViolations({
      prev: { sa540: { chain: {} } }, next: { sa540: { chain: { eqr: SIG } } },
      estimates: est, expertEval: {}, requireDocument: false,
    });
    expect(v.map(x => x.slot)).toEqual(['eqr']);
  });

  it('evaluasi tuntas → lolos meski dokumen belum ditautkan (PR-1: limb dokumen mati)', () => {
    expect(expertGateSignatureViolations({
      ...signWrite, estimates: est, expertEval: { 'E-04': full }, requireDocument: false,
    })).toEqual([]);
  });

  it('limb dokumen menyala (PR-3) → evaluasi tuntas saja tidak cukup', () => {
    const v = expertGateSignatureViolations({
      ...signWrite, estimates: est, expertEval: { 'E-04': full }, liveDocIds: [], requireDocument: true,
    });
    expect(v[0].message).toContain('belum ditautkan');
  });

  it('registri tanpa estimasi berjalur pakar → tak pernah menghalangi (K6)', () => {
    expect(expertGateSignatureViolations({
      ...signWrite, estimates: [est[1]], expertEval: {}, requireDocument: false,
    })).toEqual([]);
  });

  it('PENCABUTAN lolos walau gerbang aktif (K5)', () => {
    expect(expertGateSignatureViolations({
      prev: { sa540: { chain: { preparer: SIG } } },
      next: { sa540: { chain: {} } },
      estimates: est, expertEval: {}, requireDocument: false,
    })).toEqual([]);
  });

  it('alasan berasal dari expertGateBlockers yang SAMA dengan gate UI (K9)', () => {
    const b = expertGateBlockers(est, {}, [], { requireDocument: false });
    const v = expertGateSignatureViolations({ ...signWrite, estimates: est, expertEval: {}, requireDocument: false });
    expect(v[0].message).toBe(`${b[0].name} — ${b[0].reasons.join('; ')}`);
  });
});

/* PR-2 — `docUid` pindah dari uid localStorage ke id lampiran DMS. */
describe('isLegacyDocUid — tautan warisan vs id lampiran DMS', () => {
  it('uid localStorage lama dikenali', () => {
    expect(isLegacyDocUid('ev-1754976000000-4821')).toBe(true);
    expect(isLegacyDocUid('ev-1')).toBe(true);
  });

  it('id lampiran DMS BUKAN warisan', () => {
    expect(isLegacyDocUid('att_9f2c1b')).toBe(false);
    expect(isLegacyDocUid('cuid-abc123')).toBe(false);
  });

  it('kosong / null aman', () => {
    expect(isLegacyDocUid('')).toBe(false);
    expect(isLegacyDocUid(null)).toBe(false);
    expect(isLegacyDocUid(undefined)).toBe(false);
  });

  /* Keduanya sama-sama tak resolve; tindakan yang dituntut BERBEDA, jadi pesannya
     harus berbeda — pesan yang menyuruh menelusuri dokumen yang tak pernah ada di
     server akan membuang waktu auditor. */
  it('tautan WARISAN → pesan "unggah ulang", bukan "dicabut"', () => {
    const est = [{ id: 'E-04', name: 'Imbalan Kerja', approach: EXPERT_APPROACH }];
    const full = { competence: true, objectivity: true, scope: true, findings: true };
    const b = expertGateBlockers(est, { 'E-04': { ...full, docUid: 'ev-lama' } }, ['att-baru']);
    expect(b[0].reasons[0]).toContain('Tautan warisan');
    expect(b[0].reasons[0]).toContain('unggah ulang');
  });

  it('tautan DMS yang DICABUT → pesan "dicabut", bukan "warisan"', () => {
    const est = [{ id: 'E-04', name: 'Imbalan Kerja', approach: EXPERT_APPROACH }];
    const full = { competence: true, objectivity: true, scope: true, findings: true };
    const b = expertGateBlockers(est, { 'E-04': { ...full, docUid: 'att-hilang' } }, ['att-lain']);
    expect(b[0].reasons[0]).toContain('tidak lagi ada');
    expect(b[0].reasons[0]).not.toContain('warisan');
  });
});

describe('expertGateBlockers — opsi requireDocument (PR-1 server & mode offline UI)', () => {
  const est = [{ id: 'E-04', name: 'Imbalan Kerja', approach: EXPERT_APPROACH }];
  const full = { competence: true, objectivity: true, scope: true, findings: true };

  it('requireDocument:false — evaluasi tuntas cukup, dokumen tak dituntut', () => {
    expect(expertGateBlockers(est, { 'E-04': full }, [], { requireDocument: false })).toEqual([]);
  });

  it('requireDocument:false tidak melonggarkan limb EVALUASI', () => {
    const b = expertGateBlockers(est, {}, [], { requireDocument: false });
    expect(b[0].reasons).toEqual(['Evaluasi SA 500 ¶8 belum tuntas (0/4)']);
  });

  it('baku (tanpa opsi) tetap menuntut dokumen — perilaku UI tak berubah diam-diam', () => {
    const b = expertGateBlockers(est, { 'E-04': full }, []);
    expect(b[0].reasons[0]).toContain('belum ditautkan');
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
