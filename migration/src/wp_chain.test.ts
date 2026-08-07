/* Uji rantai tanda tangan kertas kerja — PRD docs/prd-wp-signoff-integrity.md (PR-1).
   MURNI (tanpa React/jsdom). Setiap blok menamai aturan yang dipakunya, dan blok
   terakhir mereproduksi probe Lampiran A PRD sebagai uji yang DAPAT GAGAL. */
import { describe, it, expect } from 'vitest';
import {
  WP_SLOT_ORDER, WP_SIGNATURE_SKEW_MS,
  wpContentHash, wpCanonicalContent, wpChainViolations, wpChainLinks, wpChainComplete,
  wpChainSelfReview, wpChainSelfReviewBy, signedByActor, wpSigKey,
  type WpActor, type WpChain, type WpSignature,
} from './wp_chain';

const NOW = Date.parse('2026-08-07T09:00:00.000Z');
const AT = new Date(NOW).toISOString();

const ANINDYA: WpActor = { id: 'usr_ap', name: 'Anindya Pramesti' };
const HARTONO: WpActor = { id: 'usr_hw', name: 'Hartono Wijaya, CPA' };
const DIMAS: WpActor = { id: 'usr_dr', name: 'Dimas Raharja' };

/** Tanda tangan sah oleh `a` pada waktu `at`. */
const sigOf = (a: WpActor, hash = '', at = AT): WpSignature => ({
  by: a === HARTONO ? 'Hartono W.' : a === ANINDYA ? 'Anindya P.' : 'Dimas R.',
  byUserId: a.id,
  at,
  ...(hash ? { contentHash: hash } : {}),
});

const codes = (v: { code: string }[]) => v.map(x => x.code).sort();

const wpState = (ref: string, chain: WpChain, content: object = {}) => ({ [ref]: { ...content, chain } });

/* ============================================================ */
describe('wpContentHash — apa yang diikat sebuah tanda tangan', () => {
  const base = {
    exec: { p0: { items: [{ id: 'it1', desc: 'Uji A', ev: 'EV1', tick: '✓', result: 'ok', note: '' }], concl: 'memadai' } },
    evidence: [{ id: 'EV1', name: 'rekening koran.pdf', source: 'eksternal', tier: 5, type: 'PDF', asr: ['E'], by: 'Dimas R.', at: '2026-02-01' }],
    asrConcl: { E: { result: 'ok', concl: 'wajar' } },
    procs: { p1: 'Selesai' },
  };

  it('deterministik & tak bergantung urutan kunci', () => {
    const reordered = { procs: base.procs, asrConcl: base.asrConcl, evidence: base.evidence, exec: base.exec };
    expect(wpContentHash(base)).toBe(wpContentHash(reordered));
    expect(wpContentHash(base)).toHaveLength(16);
  });

  it('BERUBAH bila hasil item uji berubah', () => {
    const edited = { ...base, exec: { p0: { ...base.exec.p0, items: [{ ...base.exec.p0.items[0], result: 'exc' }] } } };
    expect(wpContentHash(edited)).not.toBe(wpContentHash(base));
  });

  it('BERUBAH bila sebuah bukti dihapus dari register', () => {
    expect(wpContentHash({ ...base, evidence: [] })).not.toBe(wpContentHash(base));
  });

  it('BERUBAH bila kesimpulan asersi atau flag prosedur berubah', () => {
    expect(wpContentHash({ ...base, asrConcl: { E: { result: 'exc', concl: 'wajar' } } })).not.toBe(wpContentHash(base));
    expect(wpContentHash({ ...base, procs: { p1: 'Belum' } })).not.toBe(wpContentHash(base));
  });

  it('TIDAK berubah oleh catatan reviu, status, atau rantai (keputusan Q3 PRD)', () => {
    const noisy = { ...base, notes: [{ id: 'n1', text: 'tolong perluas' }], noteStatus: { n1: 'open' }, status: 'Reviewed', chain: { preparer: sigOf(DIMAS) }, reviewer: 'Anindya P.', signedAt: AT };
    expect(wpContentHash(noisy)).toBe(wpContentHash(base));
  });

  it('input kosong/null tidak melempar', () => {
    expect(wpContentHash(null)).toBe(wpContentHash({}));
    expect(wpCanonicalContent(undefined)).toBe('§§§');
  });
});

/* ============================================================ */
describe('signedByActor — identitas menang atas nama', () => {
  it('memakai byUserId bila ada, dan MENGABAIKAN nama tampilan', () => {
    expect(signedByActor({ by: 'Siapa Saja', byUserId: 'usr_hw', at: AT }, HARTONO)).toBe(true);
    expect(signedByActor({ by: 'Hartono W.', byUserId: 'usr_dr', at: AT }, HARTONO)).toBe(false);
  });

  it('jatuh ke nama HANYA untuk tanda tangan warisan (tanpa byUserId)', () => {
    expect(signedByActor({ by: 'Hartono W.', at: '06 Agu 2026' }, HARTONO)).toBe(true);
    expect(signedByActor({ by: 'Sari D.', at: '06 Agu 2026' }, HARTONO)).toBe(false);
  });

  it('slot kosong bukan tanda tangan', () => {
    expect(signedByActor(null, HARTONO)).toBe(false);
    expect(signedByActor({}, HARTONO)).toBe(false);
  });
});

/* ============================================================ */
describe('wpChainSelfReview — bentuk lama (nama) tetap berperilaku sama', () => {
  const HW = 'Hartono W.';
  it('memblokir slot kedua & simetris terhadap urutan', () => {
    expect(wpChainSelfReview({ partner: { by: HW } }, 'eqr', HW).blocked).toBe(true);
    expect(wpChainSelfReview({ eqr: { by: HW } }, 'partner', HW).blocked).toBe(true);
  });
  it('tak memblokir orang lain, slot kosong, atau sesi kosong', () => {
    expect(wpChainSelfReview({ partner: { by: HW } }, 'eqr', 'Sari D.').blocked).toBe(false);
    expect(wpChainSelfReview({ partner: {} }, 'eqr', HW).blocked).toBe(false);
    expect(wpChainSelfReview({ partner: { by: HW } }, 'eqr', '').blocked).toBe(false);
  });
  it('varian identitas membedakan dua orang ber-nama-singkat sama', () => {
    const chain = { partner: { by: 'Anindya P.', byUserId: 'usr_ap', at: AT } };
    expect(wpChainSelfReviewBy(chain, 'eqr', ANINDYA).blocked).toBe(true);
    // 'Anindya Putri' → 'Anindya P.' juga, tetapi id-nya berbeda → TIDAK terblokir
    expect(wpChainSelfReviewBy(chain, 'eqr', { id: 'usr_ap2', name: 'Anindya Putri' }).blocked).toBe(false);
    // sedangkan varian berbasis nama tak dapat membedakannya (justifikasi byUserId)
    expect(wpChainSelfReview(chain, 'eqr', 'Anindya P.').blocked).toBe(true);
  });
});

/* ============================================================ */
describe('wpChainViolations — R1 identitas', () => {
  it('tanda tangan tanpa byUserId ditolak', () => {
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { preparer: { by: 'Dimas R.', at: AT } }),
      actor: DIMAS, now: NOW,
    });
    expect(codes(v)).toContain('signature-missing-identity');
  });

  it('tanda tangan atas nama pengguna LAIN ditolak (K1)', () => {
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { preparer: sigOf(DIMAS) }),
      actor: ANINDYA, now: NOW,
    });
    expect(codes(v)).toEqual(expect.arrayContaining(['signature-identity-mismatch', 'signature-name-mismatch']));
  });

  it('id benar tetapi nama tampilan palsu ditolak', () => {
    const v = wpChainViolations({
      prev: wpState('B', {}),
      next: wpState('B', { preparer: { by: 'Hartono W.', byUserId: DIMAS.id, at: AT } }),
      actor: DIMAS, now: NOW,
    });
    expect(codes(v)).toContain('signature-name-mismatch');
  });

  it('tanda tangan sendiri yang sah LOLOS', () => {
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { preparer: sigOf(DIMAS) }),
      actor: DIMAS, now: NOW,
    });
    expect(v).toEqual([]);
  });
});

describe('wpChainViolations — R2 waktu', () => {
  const cases: [string, string, string][] = [
    ['mundur setahun (back-dating)', '2025-08-07T09:00:00.000Z', 'signature-stale-timestamp'],
    ['maju sehari', '2026-08-08T09:00:00.000Z', 'signature-future-timestamp'],
    ["bentuk lama tanpa tahun ('07 Agu 2026')", '07 Agu 2026', 'signature-missing-timestamp'],
  ];
  it.each(cases)('%s → %s ditolak', (_label, at, code) => {
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { preparer: sigOf(DIMAS, '', at) }),
      actor: DIMAS, now: NOW,
    });
    expect(codes(v)).toContain(code);
  });

  it('menerima selisih di dalam jendela skew', () => {
    const at = new Date(NOW - WP_SIGNATURE_SKEW_MS + 1000).toISOString();
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { preparer: sigOf(DIMAS, '', at) }),
      actor: DIMAS, now: NOW,
    });
    expect(v).toEqual([]);
  });
});

describe('wpChainViolations — R3 urutan & R4 satu-orang-satu-langkah', () => {
  it('reviewer tak dapat ditandatangani sebelum preparer', () => {
    const v = wpChainViolations({
      prev: wpState('B', {}), next: wpState('B', { reviewer: sigOf(ANINDYA) }),
      actor: ANINDYA, now: NOW,
    });
    expect(codes(v)).toContain('signature-out-of-order');
  });

  it('urutan terpenuhi → lolos', () => {
    const v = wpChainViolations({
      prev: wpState('B', { preparer: sigOf(DIMAS) }),
      next: wpState('B', { preparer: sigOf(DIMAS), reviewer: sigOf(ANINDYA) }),
      actor: ANINDYA, now: NOW,
    });
    expect(v).toEqual([]);
  });

  it('satu orang tak dapat mengisi dua slot pada WP yang sama', () => {
    const v = wpChainViolations({
      prev: wpState('100', { preparer: sigOf(ANINDYA) }),
      next: wpState('100', { preparer: sigOf(ANINDYA), reviewer: sigOf(ANINDYA) }),
      actor: ANINDYA, now: NOW,
    });
    expect(codes(v)).toContain('signature-self-review');
  });
});

describe('wpChainViolations — R6 pencabutan preparer', () => {
  const signed = wpState('B', { preparer: sigOf(DIMAS) });

  it('orang lain tak dapat menarik tanda tangan preparer', () => {
    const v = wpChainViolations({ prev: signed, next: wpState('B', {}), actor: ANINDYA, now: NOW });
    expect(codes(v)).toContain('signature-revoke-not-owner');
  });

  it('penandatangannya sendiri boleh menarik selama belum ada tanda tangan hilir', () => {
    const v = wpChainViolations({ prev: signed, next: wpState('B', {}), actor: DIMAS, now: NOW });
    expect(v).toEqual([]);
  });

  it('tak dapat ditarik setelah reviewer menandatangani', () => {
    const v = wpChainViolations({
      prev: wpState('B', { preparer: sigOf(DIMAS), reviewer: sigOf(ANINDYA) }),
      next: wpState('B', { reviewer: sigOf(ANINDYA) }),
      actor: DIMAS, now: NOW,
    });
    expect(codes(v)).toContain('signature-revoke-downstream-signed');
  });

  it('pencabutan slot reviewer/partner TIDAK diatur di sini (murni kapabilitas, signoff.ts)', () => {
    const v = wpChainViolations({
      prev: wpState('B', { preparer: sigOf(DIMAS), reviewer: sigOf(ANINDYA) }),
      next: wpState('B', { preparer: sigOf(DIMAS) }),
      actor: HARTONO, now: NOW,
    });
    expect(v).toEqual([]);
  });
});

describe('wpChainViolations — toleransi warisan (K9)', () => {
  it('tanda tangan lama yang TAK TERSENTUH tidak pernah diperiksa', () => {
    const legacy = { preparer: { by: 'Dimas R.', at: '06 Feb 2026' }, reviewer: { by: 'Anindya P.', at: '06 Feb 2026' } };
    const v = wpChainViolations({
      prev: wpState('B', legacy, { procs: { p1: 'Belum' } }),
      next: wpState('B', legacy, { procs: { p1: 'Selesai' } }),
      actor: DIMAS, now: NOW,
    });
    expect(v).toEqual([]);
  });

  it('menyunting isi tak menyentuh rantai → tak ada pelanggaran (gugur bersifat TURUNAN)', () => {
    const chain = { preparer: sigOf(DIMAS, 'aaaaaaaaaaaaaaaa') };
    const v = wpChainViolations({
      prev: wpState('B', chain, { evidence: [] }),
      next: wpState('B', chain, { evidence: [{ id: 'EV9', tier: 2 }] }),
      actor: DIMAS, now: NOW,
    });
    expect(v).toEqual([]);
  });

  it('dokumen kosong / bentuk tak terduga tidak melempar', () => {
    expect(wpChainViolations({ prev: null, next: undefined, actor: DIMAS, now: NOW })).toEqual([]);
    expect(wpChainViolations({ prev: 'x', next: { B: 7 }, actor: DIMAS, now: NOW })).toEqual([]);
  });
});

/* ============================================================ */
describe('wpChainLinks — tanda tangan gugur secara turunan (K5)', () => {
  const H = 'abc123abc123abc1';

  it('cocok → signed; tak cocok → voided dengan jejak siapa yang gugur', () => {
    const chain = { preparer: sigOf(DIMAS, H), reviewer: sigOf(ANINDYA, H) };
    const ok = wpChainLinks(chain, H);
    expect(ok.map(l => l.status)).toEqual(['signed', 'signed', 'pending', 'pending']);

    const after = wpChainLinks(chain, 'ffffffffffffffff');
    expect(after.map(l => l.status)).toEqual(['voided', 'voided', 'pending', 'pending']);
    expect(after[1].signed).toBeNull();
    expect(after[1].voidedBy?.by).toBe('Anindya P.');
  });

  it('tanda tangan tanpa contentHash = legacy, BUKAN voided', () => {
    const links = wpChainLinks({ preparer: { by: 'Dimas R.', at: '06 Feb 2026' } }, H);
    expect(links[0].status).toBe('legacy');
    expect(links[0].signed).not.toBeNull();
  });

  it('wpChainComplete menghitung signed & legacy, bukan voided', () => {
    const slots = WP_SLOT_ORDER.slice(0, 2);
    const chain = { preparer: sigOf(DIMAS, H), reviewer: { by: 'Anindya P.', at: 'lama' } };
    expect(wpChainComplete(wpChainLinks(chain, H, slots))).toBe(true);
    expect(wpChainComplete(wpChainLinks(chain, 'ffffffffffffffff', slots))).toBe(false);
    expect(wpChainComplete(wpChainLinks({}, H, slots))).toBe(false);
  });

  it('wpSigKey membedakan perubahan pada setiap field tanda tangan', () => {
    const s = sigOf(DIMAS, H);
    expect(wpSigKey(s)).toBe(wpSigKey({ ...s }));
    expect(wpSigKey(s)).not.toBe(wpSigKey({ ...s, at: '2026-01-01' }));
    expect(wpSigKey(s)).not.toBe(wpSigKey({ ...s, byUserId: 'x' }));
    expect(wpSigKey(s)).not.toBe(wpSigKey({ ...s, contentHash: 'x' }));
    expect(wpSigKey(null)).toBe('');
  });
});

/* ============================================================
   Probe PRD Lampiran A — cacat NYATA yang harus jatuh.
   ============================================================ */
describe('probe PRD — bentuk tulisan quickSign hari ini', () => {
  /* view_wp.tsx:1173 menulis preparer dari NAMA PENUGASAN dan reviewer dari sesi,
     keduanya sekaligus, bertanggal `wpToday()` ('07 Agu 2026'). */
  const quickSignWrite = (assignedPreparer: string, me: string) => ({
    '100': { chain: { preparer: { by: assignedPreparer, at: '07 Agu 2026' }, reviewer: { by: me, at: '07 Agu 2026' } } },
  });

  it('A.1 — reviewer memalsukan preparer atas nama auditor yang ditugaskan', () => {
    const v = wpChainViolations({
      prev: { '100': { chain: {} } }, next: quickSignWrite('Dimas R.', 'Hartono W.'),
      actor: HARTONO, now: NOW,
    });
    expect(codes(v)).toEqual(expect.arrayContaining([
      'signature-missing-identity',    // preparer tanpa identitas
      'signature-name-mismatch',       // preparer bukan pengguna sesi
      'signature-missing-timestamp',   // '07 Agu 2026' tak terbaca sebagai waktu
    ]));
  });

  it('A.2 — Anindya (Manager & preparer WP 100) menandatangani dirinya sendiri', () => {
    const v = wpChainViolations({
      prev: { '100': { chain: {} } }, next: quickSignWrite('Anindya P.', 'Anindya P.'),
      actor: ANINDYA, now: NOW,
    });
    expect(codes(v)).toContain('signature-self-review');
  });

  it('bentuk yang BENAR pada WP yang sama tetap lolos — aturan ini tidak menghalangi kerja sah', () => {
    const hash = wpContentHash({ procs: { p1: 'Selesai' } });
    const v = wpChainViolations({
      prev: { B: { procs: { p1: 'Selesai' }, chain: { preparer: sigOf(DIMAS, hash) } } },
      next: { B: { procs: { p1: 'Selesai' }, chain: { preparer: sigOf(DIMAS, hash), reviewer: sigOf(ANINDYA, hash) } } },
      actor: ANINDYA, now: NOW,
    });
    expect(v).toEqual([]);
  });
});
