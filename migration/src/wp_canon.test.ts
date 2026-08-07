import { describe, it, expect } from 'vitest';
import { defaultProcState, procStatusAt, execStatus, wpEvidenceEval, deriveWpStatus, wpChainSelfReview } from './wp_canon';
import { wpContentHash } from './wp_chain';
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
  it('A — Reviewed, 5/5, coverage full, hanya reviewer default yang ditandatangani (preparer assigned ≠ signed)', () =>
    expectSeed('A', { status: 'Reviewed', done: 5, total: 5, exc: 0, openNotes: 0, coverage: { bal: 21905300000, level: 'full' }, signedCount: 1, fullySigned: false, hasLead: true }));
  it('B — In Review, 5/6, 1 exc seed, 2 catatan terbuka', () =>
    expectSeed('B', { status: 'In Review', done: 5, total: 6, exc: 1, openNotes: 2, coverage: { bal: 46872400000, level: 'full' }, signedCount: 0, fullySigned: false, hasLead: true }));
  it('C — In Progress, 2/5, 1 exc seed, 1 catatan terbuka', () =>
    expectSeed('C', { status: 'In Progress', done: 2, total: 5, exc: 1, openNotes: 1, coverage: { bal: 76564100000, level: 'full' }, signedCount: 0, fullySigned: false, hasLead: true }));
  it('E — In Review, 4/5, catatan seed resolved → 0 terbuka', () =>
    expectSeed('E', { status: 'In Review', done: 4, total: 5, exc: 0, openNotes: 0, coverage: { bal: 142039700000, level: 'full' }, signedCount: 0, fullySigned: false, hasLead: true }));
  it('R — In Progress, 3/5, saldo negatif → abs full, 1 catatan terbuka', () =>
    expectSeed('R', { status: 'In Progress', done: 3, total: 5, exc: 0, openNotes: 1, coverage: { bal: -330050000000, level: 'full' }, signedCount: 0, fullySigned: false, hasLead: true }));
  it('300 — Reviewed, 3/3, tanpa lead → coverage null', () =>
    expectSeed('300', { status: 'Reviewed', done: 3, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 1, fullySigned: false, hasLead: false }));
  it('810 — Not Started, 0/3, signedCount 0 (assigned ≠ signed; belum ada tanda tangan)', () =>
    expectSeed('810', { status: 'Not Started', done: 0, total: 3, exc: 0, openNotes: 0, coverage: null, signedCount: 0, fullySigned: false, hasLead: false }));
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

describe('wpChainSelfReview — satu orang, satu langkah (ISQM 2 / SA 220.36)', () => {
  const HW = 'Hartono W.';

  it('rantai kosong → tidak memblokir siapa pun', () => {
    expect(wpChainSelfReview({}, 'partner', HW).blocked).toBe(false);
    expect(wpChainSelfReview({}, 'eqr', HW).blocked).toBe(false);
  });

  it('partner yang sudah tanda tangan slot partner TERTUTUP dari slot EQR', () => {
    const chain = { partner: { by: HW, at: '06 Agu 2026' } };
    const r = wpChainSelfReview(chain, 'eqr', HW);
    expect(r.blocked).toBe(true);
    expect(r.priorSlot).toBe('partner');
    expect(r.reason).toContain('Engagement Partner');
  });

  it('simetris terhadap urutan — EQR lebih dulu pun menutup slot partner', () => {
    const chain = { eqr: { by: HW, at: '06 Agu 2026' } };
    expect(wpChainSelfReview(chain, 'partner', HW).blocked).toBe(true);
  });

  it('orang LAIN tidak terblokir oleh tanda tangan partner', () => {
    const chain = { partner: { by: HW, at: '06 Agu 2026' } };
    expect(wpChainSelfReview(chain, 'eqr', 'Sari D.').blocked).toBe(false);
  });

  it('slot yang sedang ditandatangani ulang oleh penandatangannya sendiri tidak memblokir dirinya', () => {
    const chain = { partner: { by: HW, at: '06 Agu 2026' } };
    expect(wpChainSelfReview(chain, 'partner', HW).blocked).toBe(false);
  });

  it('slot MENUNGGU tanpa tanda tangan tidak dihitung (assigned ≠ signed)', () => {
    // `who` penerima tugas tidak pernah masuk `chain`; slot kosong/null diabaikan.
    expect(wpChainSelfReview({ partner: null, reviewer: undefined }, 'eqr', HW).blocked).toBe(false);
    expect(wpChainSelfReview({ partner: {} }, 'eqr', HW).blocked).toBe(false);
  });

  it('identitas sesi kosong → tak memblokir (jangan kunci app saat auth belum siap)', () => {
    const chain = { partner: { by: HW, at: '06 Agu 2026' } };
    expect(wpChainSelfReview(chain, 'eqr', '').blocked).toBe(false);
  });

  it('perbandingan nama tahan spasi & besar-kecil huruf', () => {
    const chain = { reviewer: { by: '  hartono w.  ', at: '06 Agu 2026' } };
    expect(wpChainSelfReview(chain, 'partner', HW).blocked).toBe(true);
  });
});

/* ============================================================
   Tanda tangan Reviewer TIDAK LAGI LAHIR DARI STATUS.
   ------------------------------------------------------------
   Cacat yang ditutup: `status === 'Reviewed'` dulu menerbitkan
   { by: nama yang DITUGASKAN, at: HARI INI } — tanda tangan atas nama orang yang
   tak pernah menandatangani, bertanggal hari layar dibuka, lalu mengalir ke
   signedCount/fullySigned, dasbor SA 230, dan jejak audit. 924 uji melewatkannya
   karena semuanya menguji seed, tempat status dan tanggal kebetulan sejalan.
   ============================================================ */
describe('deriveWpStatus — status tidak melahirkan tanda tangan (SA 230/ISQM)', () => {
  interface Sig { by: string; at: string }
  interface WpSt { status?: string; reviewer?: string; signedAt?: string; chain?: { reviewer?: Sig } }
  const SEED = AMS as unknown as { WTB: unknown[]; RISKS: unknown[] };
  const audit = (wpState: Record<string, WpSt>) => ({ wtb: SEED.WTB, risks: SEED.RISKS, wpState });
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: true } };
  const revOf = (r: { signoff: { key: string; signed: Sig | null }[] }): Sig | null => {
    const slot = r.signoff.find(l => l.key === 'reviewer');
    return slot ? slot.signed : null;
  };

  it('status disetel "Reviewed" tanpa chain → TIDAK ada tanda tangan reviewer', () => {
    /* B tak punya tanggal reviu terdeklarasi; menaikkan statusnya tak boleh memalsukan apa pun. */
    const r = deriveWpStatus('B', audit({ B: { status: 'Reviewed' } }), firm);
    expect(r.status).toBe('Reviewed');
    expect(revOf(r)).toBeNull();
    expect(r.signedCount).toBe(0);
    expect(r.fullySigned).toBe(false);
  });

  it('legacy st.reviewer/st.signedAt tidak lagi menjadi tanda tangan', () => {
    const r = deriveWpStatus('B', audit({ B: { status: 'Reviewed', reviewer: 'Dimas R.', signedAt: '2026-03-01' } }), firm);
    expect(revOf(r)).toBeNull();
  });

  it('tanda tangan seed memakai TANGGAL TERDEKLARASI, bukan tanggal hari ini', () => {
    expect(revOf(deriveWpStatus('A', audit({}), firm))).toEqual({ by: 'Anindya P.', at: '2026-02-06' });
  });

  it('chain yang tercatat tetap menang atas seed', () => {
    const chain = { reviewer: { by: 'Hartono W.', at: '2026-03-09' } };
    const r = deriveWpStatus('A', audit({ A: { status: 'Reviewed', chain } }), firm);
    expect(revOf(r)).toEqual(chain.reviewer);
  });

  it('tak ada tanda tangan yang bertanggal hari ini pada seed kosong', () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const ref of ['100', '200', '300', 'A', 'AA', 'BB', 'K', 'B', 'C', '810']) {
      const r = deriveWpStatus(ref, audit({}), firm);
      for (const l of r.signoff as { signed: Sig | null }[]) if (l.signed) expect(l.signed.at).not.toBe(today);
    }
  });
});

/* ============================================================
   K5 — tanda tangan GUGUR secara TURUNAN saat isi kertas kerja berubah.
   ------------------------------------------------------------
   Tak ada tulisan yang perlu berhasil agar sebuah persetujuan gugur: penggugur
   yang harus DITULIS bisa gagal, offline, atau kalah CAS. Karena itu ia dihitung
   ulang dari `contentHash` setiap kali rantai dibaca — di SEMUA pembaca sekaligus,
   sebab satu penghasil yang sama melayani SignoffTab, WPFooter, dan SA 230.
   ============================================================ */
describe('deriveWpStatus — pengikatan isi (K5)', () => {
  const SEED = AMS as unknown as { WTB: unknown[]; RISKS: unknown[] };
  const firm = { activeEngagement: { materiality: 4260000000 }, activeClient: { listed: false } };
  const st = (extra: object = {}) => ({
    status: 'In Review',
    exec: { p0: { items: [{ id: 'it1', desc: 'Uji A', ev: 'EV1', tick: '✓', result: 'ok', note: '' }] } },
    ...extra,
  });
  const withChain = (base: object, hash: string) => ({
    ...base,
    chain: {
      preparer: { by: 'Dimas R.', byUserId: 'u-dr', at: '2026-03-01T00:00:00.000Z', contentHash: hash },
      reviewer: { by: 'Anindya P.', byUserId: 'u-ap', at: '2026-03-02T00:00:00.000Z', contentHash: hash },
    },
  });
  const run = (wp: object) => deriveWpStatus('B', { wtb: SEED.WTB, risks: SEED.RISKS, wpState: { B: wp } }, firm);

  it('hash cocok → kedua tanda tangan berlaku', () => {
    const base = st();
    const r = run(withChain(base, wpContentHash(base)));
    expect(r.signoff.map((l: { status: string }) => l.status)).toEqual(['signed', 'signed', 'pending']);
    expect(r.signedCount).toBe(2);
    expect(r.hasVoided).toBe(false);
  });

  it('mengubah HASIL item uji menggugurkan keduanya — tanpa tulisan apa pun ke rantai', () => {
    const base = st();
    const signed = withChain(base, wpContentHash(base));
    // preparer menyunting hasil; rantai TIDAK disentuh
    const edited = { ...signed, exec: { p0: { items: [{ ...base.exec.p0.items[0], result: 'exc' }] } } };
    const r = run(edited);
    expect(r.signoff.map((l: { status: string }) => l.status)).toEqual(['voided', 'voided', 'pending']);
    expect(r.signedCount).toBe(0);
    expect(r.fullySigned).toBe(false);
    expect(r.hasVoided).toBe(true);
    // siapa yang gugur tetap dapat ditelusuri
    expect(r.voided.map((l: { voidedBy: { by: string } | null }) => l.voidedBy?.by)).toEqual(['Dimas R.', 'Anindya P.']);
  });

  it('menghapus BUKTI juga menggugurkan; menambah CATATAN REVIU tidak (keputusan Q3)', () => {
    const base = st({ evidence: [{ id: 'EV1', name: 'rekening.pdf', source: 'eksternal', tier: 5, type: 'PDF', asr: ['E'], by: 'Dimas R.', at: '2026-02-01' }] });
    const signed = withChain(base, wpContentHash(base));
    expect(run({ ...signed, evidence: [] }).hasVoided).toBe(true);
    expect(run({ ...signed, notes: [{ id: 'n9', text: 'tolong perluas', status: 'open' }] }).hasVoided).toBe(false);
  });

  it('tanda tangan WARISAN (tanpa contentHash) tidak digugurkan — ia `legacy`', () => {
    const base = st();
    const legacy = { ...base, chain: { preparer: { by: 'Dimas R.', at: '2026-03-01' } } };
    const r = run(legacy);
    expect(r.signoff[0].status).toBe('legacy');
    expect(r.signedCount).toBe(1);
  });
});
