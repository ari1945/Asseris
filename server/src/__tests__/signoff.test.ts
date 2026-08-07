/* Fase 2 — uji penegakan SERVER sign-off per-slot (intra-dokumen).
   Pure (tanpa DB): mem-validasi guardSignoffWrite mendiff & menuntut kapabilitas
   yang tepat, sejajar gate UI. Menutup celah capForWrite per-dokumen (WP_EDIT). */
import { describe, it, expect } from 'vitest';
import { guardSignoffWrite } from '../signoff';
import { CAP } from '../rbac';

const PARTNER = 'Engagement Partner';
const MANAGER = 'Audit Manager';
const SENIOR = 'Senior Auditor';
const JUNIOR = 'Junior Auditor';
const SIG = { by: 'Anindya P.', at: '2026-03-14' };

describe('guardSignoffWrite — wpState rantai sign-off', () => {
  it('tanda tangan REVIEWER butuh SIGNOFF_REVIEWER (Junior/Senior ditolak)', () => {
    const prev = { B: { chain: { preparer: SIG } } };
    const next = { B: { chain: { preparer: SIG, reviewer: SIG } } };
    expect(() => guardSignoffWrite(JUNIOR, 'wpState', prev, next)).toThrow(/requires:signoff\.reviewer/);
    expect(() => guardSignoffWrite(SENIOR, 'wpState', prev, next)).toThrow(/requires/);
    expect(guardSignoffWrite(MANAGER, 'wpState', prev, next)).toEqual([{ what: 'wp:B.reviewer', cap: CAP.SIGNOFF_REVIEWER }]);
    expect(() => guardSignoffWrite(PARTNER, 'wpState', prev, next)).not.toThrow();
  });

  it('slot partner/eqr (wpState["900"] mirror opini) butuh OPINION_APPROVE/EQR_REVIEW (Manager ditolak)', () => {
    const pPartner = { '900': { chain: { reviewer: SIG } } };
    const nPartner = { '900': { chain: { reviewer: SIG, partner: SIG } } };
    expect(() => guardSignoffWrite(MANAGER, 'wpState', pPartner, nPartner)).toThrow(/requires:opinion\.approve/);
    expect(() => guardSignoffWrite(PARTNER, 'wpState', pPartner, nPartner)).not.toThrow();

    const nEqr = { '900': { chain: { reviewer: SIG, eqr: SIG } } };
    expect(() => guardSignoffWrite(MANAGER, 'wpState', pPartner, nEqr)).toThrow(/requires:eqr\.review/);
    expect(() => guardSignoffWrite(PARTNER, 'wpState', pPartner, nEqr)).not.toThrow();
  });

  it('PREPARER & perubahan non-slot (tickmark) = WP_EDIT — Junior boleh, tanpa requirement', () => {
    const prep = guardSignoffWrite(JUNIOR, 'wpState', { B: { chain: {} } }, { B: { chain: { preparer: SIG } } });
    expect(prep).toEqual([]);
    // reviewer TAK berubah; field lain berubah → tak memicu guard
    const tick = guardSignoffWrite(JUNIOR, 'wpState',
      { B: { chain: { preparer: SIG, reviewer: SIG }, tickmarks: {} } },
      { B: { chain: { preparer: SIG, reviewer: SIG }, tickmarks: { a: 1 } } });
    expect(tick).toEqual([]);
  });

  it('MENGHAPUS tanda tangan reviewer (Buka) juga butuh SIGNOFF_REVIEWER', () => {
    const prev = { B: { chain: { preparer: SIG, reviewer: SIG } } };
    const next = { B: { chain: { preparer: SIG } } };
    expect(() => guardSignoffWrite(JUNIOR, 'wpState', prev, next)).toThrow(/requires:signoff\.reviewer/);
  });
});

describe('guardSignoffWrite — opinionDoc.v1 slot & finalisasi', () => {
  it('slot manager→SIGNOFF_REVIEWER, partner→OPINION_APPROVE, eqr→EQR_REVIEW', () => {
    const base = { signoff: {} };
    expect(() => guardSignoffWrite(SENIOR, 'opinionDoc.v1', base, { signoff: { manager: { date: 'x' } } })).toThrow(/signoff\.reviewer/);
    expect(() => guardSignoffWrite(MANAGER, 'opinionDoc.v1', base, { signoff: { manager: { date: 'x' } } })).not.toThrow();
    expect(() => guardSignoffWrite(MANAGER, 'opinionDoc.v1', base, { signoff: { partner: { date: 'x' } } })).toThrow(/opinion\.approve/);
    expect(() => guardSignoffWrite(MANAGER, 'opinionDoc.v1', base, { signoff: { eqr: { date: 'x' } } })).toThrow(/eqr\.review/);
    expect(() => guardSignoffWrite(PARTNER, 'opinionDoc.v1', base, { signoff: { partner: { date: 'x' }, eqr: { date: 'x' } } })).not.toThrow();
  });

  it('finalisasi opini butuh OPINION_APPROVE', () => {
    expect(() => guardSignoffWrite(MANAGER, 'opinionDoc.v1', { finalized: false }, { finalized: true })).toThrow(/opinion\.approve/);
    expect(() => guardSignoffWrite(PARTNER, 'opinionDoc.v1', { finalized: false }, { finalized: true })).not.toThrow();
  });
});

describe('guardSignoffWrite — reviewNotes kliring', () => {
  it('mengubah status (kliring/buka) butuh SIGNOFF_REVIEWER; menambah catatan tidak', () => {
    const prev = [{ id: 'RN-1', status: 'open' }];
    const resolved = [{ id: 'RN-1', status: 'resolved' }];
    expect(() => guardSignoffWrite(JUNIOR, 'reviewNotes', prev, resolved)).toThrow(/signoff\.reviewer/);
    expect(() => guardSignoffWrite(MANAGER, 'reviewNotes', prev, resolved)).not.toThrow();
    // menambah catatan baru (raise) = WP_EDIT → tak memicu
    const added = [{ id: 'RN-1', status: 'open' }, { id: 'RN-2', status: 'open' }];
    expect(guardSignoffWrite(JUNIOR, 'reviewNotes', prev, added)).toEqual([]);
  });
});

describe('guardSignoffWrite — prospects (akseptasi & penerbitan surat = FIRM_ADMIN)', () => {
  const base = { id: 'PR-1', acceptance: { approved: false }, letter: { status: 'draft' } };
  it('menyetujui akseptasi (approved false→true) butuh FIRM_ADMIN — Manager ditolak', () => {
    const next = [{ ...base, acceptance: { approved: true } }];
    expect(() => guardSignoffWrite(MANAGER, 'prospects', [base], next)).toThrow(/requires:firm\.admin/);
    expect(() => guardSignoffWrite(PARTNER, 'prospects', [base], next)).not.toThrow();
  });
  it('membuka kembali akseptasi (true→false) juga butuh FIRM_ADMIN', () => {
    const approved = [{ ...base, acceptance: { approved: true } }];
    const reopened = [{ ...base, acceptance: { approved: false } }];
    expect(() => guardSignoffWrite(MANAGER, 'prospects', approved, reopened)).toThrow(/firm\.admin/);
  });
  it('menerbitkan surat (status draft→sent/signed) butuh FIRM_ADMIN — Manager ditolak', () => {
    expect(() => guardSignoffWrite(MANAGER, 'prospects', [base], [{ ...base, letter: { status: 'sent' } }])).toThrow(/firm\.admin/);
    expect(() => guardSignoffWrite(MANAGER, 'prospects', [base], [{ ...base, letter: { status: 'signed' } }])).toThrow(/firm\.admin/);
    expect(() => guardSignoffWrite(PARTNER, 'prospects', [base], [{ ...base, letter: { status: 'sent' } }])).not.toThrow();
  });
  it('INTAKE tidak di-gate: tambah prospek baru (approved:false, surat draft) — Manager boleh', () => {
    expect(guardSignoffWrite(MANAGER, 'prospects', [], [base])).toEqual([]);
  });
  it('data-entry tidak di-gate: ubah faktor PMPJ / draft surat (status tetap) — Manager boleh', () => {
    const edited = [{ ...base, acceptance: { approved: false, decision: 'Terima' }, letter: { status: 'draft', version: 2 } }];
    expect(guardSignoffWrite(MANAGER, 'prospects', [base], edited)).toEqual([]);
  });
});

describe('guardSignoffWrite — strategyApproved.v1 (persetujuan strategi SA 300 = SIGNOFF_REVIEWER)', () => {
  it('menyetujui strategi (null→{by,at}) butuh SIGNOFF_REVIEWER — Junior/Senior ditolak', () => {
    const next = { by: 'Anindya P.', at: '2026-02-02T00:00:00.000Z' };
    expect(() => guardSignoffWrite(JUNIOR, 'strategyApproved.v1', null, next)).toThrow(/requires:signoff\.reviewer/);
    expect(() => guardSignoffWrite(SENIOR, 'strategyApproved.v1', null, next)).toThrow(/signoff\.reviewer/);
    expect(guardSignoffWrite(MANAGER, 'strategyApproved.v1', null, next)).toEqual([{ what: 'strategi:approved', cap: CAP.SIGNOFF_REVIEWER }]);
    expect(() => guardSignoffWrite(PARTNER, 'strategyApproved.v1', null, next)).not.toThrow();
  });
  it('mencabut persetujuan ({by,at}→null) juga butuh SIGNOFF_REVIEWER', () => {
    const prev = { by: 'Anindya P.', at: '2026-02-02T00:00:00.000Z' };
    expect(() => guardSignoffWrite(JUNIOR, 'strategyApproved.v1', prev, null)).toThrow(/signoff\.reviewer/);
    expect(() => guardSignoffWrite(MANAGER, 'strategyApproved.v1', prev, null)).not.toThrow();
  });
  it('nilai tak berubah (sig sama) → tanpa requirement', () => {
    const v = { by: 'Anindya P.', at: '2026-02-02T00:00:00.000Z' };
    expect(guardSignoffWrite(JUNIOR, 'strategyApproved.v1', v, { ...v })).toEqual([]);
  });
});

/* PR-6a — sebelum ini `mat.memo.signoff` tak ada di SIGNOFF_KEYS DAN UI-nya tak punya
   satu pun gate `can()`, sehingga Junior Auditor dapat mengisi slot "Disetujui — Partner"
   dan tanda tangan itu ikut ke PDF memo yang tersegel Ed25519. */
describe('guardSignoffWrite — mat.memo.signoff (memo materialitas SA 320/230)', () => {
  const KEY = 'mat.memo.signoff';
  const prep = { name: 'Anindya Pramesti', role: 'Audit Manager', at: '2026-02-18 09:40' };
  const base = { preparer: prep, manager: null, partner: null };
  const mgrSign = { name: 'Anindya Pramesti', role: 'Audit Manager', at: '2026-02-19 10:00' };
  const ptrSign = { name: 'Hartono Wijaya', role: 'Rekan Pemimpin', at: '2026-02-20 11:00' };

  it('slot partner butuh OPINION_APPROVE — Junior/Senior/Manager ditolak, Partner boleh', () => {
    const next = { ...base, partner: ptrSign };
    expect(() => guardSignoffWrite(JUNIOR, KEY, base, next)).toThrow(/requires:opinion\.approve/);
    expect(() => guardSignoffWrite(SENIOR, KEY, base, next)).toThrow(/opinion\.approve/);
    expect(() => guardSignoffWrite(MANAGER, KEY, base, next)).toThrow(/opinion\.approve/);
    expect(guardSignoffWrite(PARTNER, KEY, base, next)).toEqual([{ what: 'matMemo:partner', cap: CAP.OPINION_APPROVE }]);
  });

  it('slot manager butuh SIGNOFF_REVIEWER — Junior/Senior ditolak, Manager & Partner boleh', () => {
    const next = { ...base, manager: mgrSign };
    expect(() => guardSignoffWrite(JUNIOR, KEY, base, next)).toThrow(/requires:signoff\.reviewer/);
    expect(() => guardSignoffWrite(SENIOR, KEY, base, next)).toThrow(/signoff\.reviewer/);
    expect(() => guardSignoffWrite(MANAGER, KEY, base, next)).not.toThrow();
    expect(() => guardSignoffWrite(PARTNER, KEY, base, next)).not.toThrow();
  });

  it('MENCABUT tanda tangan sama otoritatifnya dengan memberi (doSign adalah toggle)', () => {
    const signed = { ...base, partner: ptrSign };
    expect(() => guardSignoffWrite(MANAGER, KEY, signed, base)).toThrow(/opinion\.approve/);
    expect(() => guardSignoffWrite(PARTNER, KEY, signed, base)).not.toThrow();
  });

  it('mengganti NAMA penanda tangan pada `at` yang sama tetap terdeteksi (bukan lolos)', () => {
    const signed = { ...base, partner: ptrSign };
    const forged = { ...base, partner: { ...ptrSign, name: 'Fajar Nugraha', role: 'Junior Auditor' } };
    expect(() => guardSignoffWrite(JUNIOR, KEY, signed, forged)).toThrow(/opinion\.approve/);
  });

  it('slot preparer TIDAK di-gate di sini (WP_EDIT, sudah lewat capForWrite)', () => {
    expect(guardSignoffWrite(JUNIOR, KEY, { preparer: null, manager: null, partner: null }, base)).toEqual([]);
  });

  it('menyunting isi memo tanpa menyentuh slot → tanpa requirement', () => {
    expect(guardSignoffWrite(JUNIOR, KEY, base, { ...base })).toEqual([]);
  });
});

describe('guardSignoffWrite — non-sensitif / no-op', () => {
  it('key tak dikenal → tanpa requirement', () => {
    expect(guardSignoffWrite(JUNIOR, 'risks', { a: 1 }, { a: 2 })).toEqual([]);
  });
});

/* ============================================================
   PR-B — penegakan SERVER atas posting jurnal & keputusan rantai.
   Sebelum PR-B, `aje` maupun `approvals_ov_*` tidak ada di SIGNOFF_KEYS:
   guard ini tak pernah berjalan untuk jurnal, sehingga satu-satunya gerbang
   server adalah capForWrite=AJE_EDIT — yang dimiliki Senior Auditor.
   ============================================================ */
describe('guardSignoffWrite — transisi status AJE (PR-B)', () => {
  const proposed = [{ id: 'AJE-09', status: 'Proposed', amount: 1_000_000 }];
  const posted = [{ id: 'AJE-09', status: 'Posted', amount: 1_000_000 }];

  it('Proposed → Posted menuntut AJE_POST', () => {
    expect(() => guardSignoffWrite(JUNIOR, 'aje', proposed, posted)).toThrow(/requires:aje\.post/);
    expect(() => guardSignoffWrite(SENIOR, 'aje', proposed, posted)).toThrow(/requires:aje\.post/);
    expect(() => guardSignoffWrite(MANAGER, 'aje', proposed, posted)).toThrow(/requires:aje\.post/);
    expect(guardSignoffWrite(PARTNER, 'aje', proposed, posted)).toEqual([{ what: 'aje:AJE-09.post', cap: CAP.AJE_POST }]);
  });

  /* Menarik kembali jurnal yang sudah diposting sama otoritatifnya: angkanya
     sudah mengalir ke WTB dan mungkin sudah dirujuk SAD/opini. */
  it('Posted → Proposed (membatalkan posting) juga menuntut AJE_POST', () => {
    expect(() => guardSignoffWrite(SENIOR, 'aje', posted, proposed)).toThrow(/requires:aje\.post/);
    expect(guardSignoffWrite(PARTNER, 'aje', posted, proposed)).toEqual([{ what: 'aje:AJE-09.unpost', cap: CAP.AJE_POST }]);
  });

  it('mengubah isi jurnal yang masih Proposed tidak menuntut AJE_POST', () => {
    const edited = [{ id: 'AJE-09', status: 'Proposed', amount: 2_000_000 }];
    expect(guardSignoffWrite(SENIOR, 'aje', proposed, edited)).toEqual([]);
  });

  it('jurnal baru yang lahir Proposed tidak menuntut apa pun', () => {
    expect(guardSignoffWrite(SENIOR, 'aje', [], proposed)).toEqual([]);
  });

  it('jurnal baru yang lahir Posted DITOLAK bagi non-partner', () => {
    expect(() => guardSignoffWrite(SENIOR, 'aje', [], posted)).toThrow(/requires:aje\.post/);
  });
});

/* ============================================================
   PR-1 — IMUTABILITAS JURNAL POSTED.
   ------------------------------------------------------------
   Uji lama di blok atas berbunyi "mengubah isi jurnal TANPA mengubah status
   tidak menuntut AJE_POST" dan memaku perilaku itu sebagai BENAR. Probe (PRD
   Lampiran A.1) menunjukkan artinya: satu tulisan `state.set` mengganti nilai
   2.340 jt → 9.999 jt dan KEDUA akun sebuah jurnal `Posted`, guard menuntut
   nol kapabilitas, jurnal tetap `Posted` dengan tanda tangan Partner utuh, dan
   baris barunya mengalir ke WTB lewat `userPostDeltas`.

   Gerbang yang tersisa hanyalah capForWrite = AJE_EDIT — dimiliki Senior
   Auditor. Jadi yang dijaga bukan hipotesis "klien dimodifikasi", melainkan
   peran yang memang ada di setiap tim lapangan.
   ============================================================ */
describe('guardSignoffWrite — jurnal Posted IMUTABEL (PR-1)', () => {
  const base = {
    id: 'AJE-01', status: 'Posted', desc: 'Koreksi pisah batas', ref: 'B-3',
    kind: 'adjusting', amount: 2_340_000_000, mis: 'M-05',
    dr: '5-3100 Beban Pokok', cr: '1-1400 Persediaan',
  };
  const postedLedger = [base];
  const tampered = [{ ...base, amount: 9_999_000_000, desc: 'diubah setelah disetujui partner', dr: '1-1100 Kas', cr: '4-1000 Pendapatan' }];

  /* Inti PR-1: ini ATURAN, bukan otoritas. Tak ada kapabilitas yang dapat
     memuaskannya — termasuk milik peran tertinggi. Koreksi lewat pembalikan. */
  it('SETIAP peran ditolak — termasuk Rekan Pemimpin & Engagement Partner', () => {
    [JUNIOR, SENIOR, MANAGER, PARTNER, 'Rekan Pemimpin'].forEach((role) => {
      expect(() => guardSignoffWrite(role, 'aje', postedLedger, tampered)).toThrow(/posted-immutable:AJE-01/);
    });
  });

  it('perubahan sekecil apa pun pada jurnal Posted ditolak (deskripsi saja)', () => {
    const reworded = [{ ...base, desc: 'redaksional' }];
    expect(() => guardSignoffWrite(PARTNER, 'aje', postedLedger, reworded)).toThrow(/posted-immutable/);
  });

  it('memindahkan ref WP atau tautan SAD jurnal Posted juga ditolak', () => {
    expect(() => guardSignoffWrite(PARTNER, 'aje', postedLedger, [{ ...base, ref: 'Z-9' }])).toThrow(/posted-immutable/);
    expect(() => guardSignoffWrite(PARTNER, 'aje', postedLedger, [{ ...base, mis: 'M-01' }])).toThrow(/posted-immutable/);
  });

  /* Batas yang harus dijaga agar aturan ini tidak melumpuhkan kerja sah. */
  it('tulisan yang TIDAK mengubah isi tetap lolos (simpan ulang dokumen)', () => {
    expect(guardSignoffWrite(SENIOR, 'aje', postedLedger, [{ ...base }])).toEqual([]);
  });

  it('menulis ulang jurnal Posted dalam bentuk lines[] yang setara TIDAK ditolak', () => {
    const asLines = [{
      ...base, dr: undefined, cr: undefined,
      lines: [{ code: '5-3100', name: 'Beban Pokok', debit: 2_340_000_000, credit: 0 },
        { code: '1-1400', name: 'Persediaan', debit: 0, credit: 2_340_000_000 }],
    }];
    expect(guardSignoffWrite(SENIOR, 'aje', postedLedger, asLines)).toEqual([]);
  });

  it('menyunting jurnal yang masih Proposed tetap bebas', () => {
    const prop = [{ ...base, status: 'Proposed' }];
    const edited = [{ ...base, status: 'Proposed', amount: 5 }];
    expect(guardSignoffWrite(SENIOR, 'aje', prop, edited)).toEqual([]);
  });

  /* Unpost + sunting dalam satu tulisan: yang berlaku adalah gerbang AJE_POST,
     bukan imutabilitas — jurnal tak lagi Posted saat isinya berubah. Persetujuan
     lamanya gugur lewat pengikatan hash (PR-2), bukan lewat aturan ini. */
  it('menarik posting sambil menyunting = gerbang AJE_POST (Senior ditolak, Partner boleh)', () => {
    const unpostedEdit = [{ ...base, status: 'Proposed', amount: 1 }];
    expect(() => guardSignoffWrite(SENIOR, 'aje', postedLedger, unpostedEdit)).toThrow(/requires:aje\.post/);
    expect(guardSignoffWrite(PARTNER, 'aje', postedLedger, unpostedEdit))
      .toEqual([{ what: 'aje:AJE-01.unpost', cap: CAP.AJE_POST }]);
  });

  /* Pembalikan: jurnal asal utuh + satu jurnal baru Proposed. Inilah jalan
     koreksi yang sah, dan ia harus lolos tanpa menuntut AJE_POST. */
  it('PEMBALIKAN lolos: jurnal asal utuh, jurnal balik lahir Proposed', () => {
    const withReversal = [base, {
      id: 'AJE-06', status: 'Proposed', desc: 'Pembalikan AJE-01 — salah akun', ref: 'B-3',
      reverses: 'AJE-01', amount: 2_340_000_000,
      lines: [{ code: '5-3100', debit: 0, credit: 2_340_000_000 }, { code: '1-1400', debit: 2_340_000_000, credit: 0 }],
    }];
    expect(guardSignoffWrite(SENIOR, 'aje', postedLedger, withReversal)).toEqual([]);
  });
});

describe('guardSignoffWrite — keputusan rantai persetujuan (PR-B)', () => {
  /* PR-3 — keputusan kini WAJIB bertanggal nyata; `ts` ditambahkan agar uji ini
     tetap menguji hal yang dimaksudnya (kapabilitas per-langkah), bukan tersandung
     gerbang waktu. Gerbang waktu itu sendiri diuji di blok berikutnya. */
  const dec = (stepRole: string) => ({ 'APR-AJE-09': { decisions: [{ idx: 1, stepRole, name: 'X', ts: new Date().toISOString() }] } });

  it('langkah Audit Manager menuntut SIGNOFF_REVIEWER', () => {
    expect(() => guardSignoffWrite(SENIOR, 'approvals_ov_v4', {}, dec('Audit Manager'))).toThrow(/requires:signoff\.reviewer/);
    expect(guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, dec('Audit Manager')))
      .toEqual([{ what: 'approval:APR-AJE-09.Audit Manager', cap: CAP.SIGNOFF_REVIEWER }]);
  });

  /* Inti otoritas per-langkah: Manager TIDAK dapat menyelesaikan langkah Partner. */
  it('langkah Engagement Partner menuntut AJE_POST — Manager ditolak', () => {
    expect(() => guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, dec('Engagement Partner'))).toThrow(/requires:aje\.post/);
    expect(guardSignoffWrite(PARTNER, 'approvals_ov_v4', {}, dec('Engagement Partner')))
      .toEqual([{ what: 'approval:APR-AJE-09.Engagement Partner', cap: CAP.AJE_POST }]);
  });

  it('langkah EQR menuntut EQR_REVIEW — Manager ditolak', () => {
    expect(() => guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, dec('EQR Reviewer'))).toThrow(/requires:eqr\.review/);
    expect(guardSignoffWrite(PARTNER, 'approvals_ov_v4', {}, dec('EQR Reviewer')))
      .toEqual([{ what: 'approval:APR-AJE-09.EQR Reviewer', cap: CAP.EQR_REVIEW }]);
  });

  /* Fail-closed: keputusan yang tak menyebutkan langkahnya tak dapat diotorisasi. */
  it('keputusan tanpa stepRole DITOLAK, bahkan bagi Partner', () => {
    const noRole = { 'APR-AJE-09': { decisions: [{ idx: 1, name: 'X', ts: new Date().toISOString() }] } };
    expect(() => guardSignoffWrite(PARTNER, 'approvals_ov_v4', {}, noRole)).toThrow(/FORBIDDEN|requires/);
  });

  it('komentar/thread tanpa keputusan baru tidak menuntut kapabilitas', () => {
    const before = dec('Audit Manager');
    const after = { 'APR-AJE-09': { ...before['APR-AJE-09'], thread: [{ text: 'catatan' }] } };
    expect(guardSignoffWrite(SENIOR, 'approvals_ov_v4', before, after)).toEqual([]);
  });
});

/* ============================================================
   PR-3 — WAKTU KEPUTUSAN.
   ------------------------------------------------------------
   Klien lama mencap SETIAP keputusan dengan konstanta `'10 Mar 09:00'`
   (view_platform.tsx:20) — persetujuan yang diberikan hari ini tercatat
   "10 Mar 09:00", selamanya, untuk semua orang, untuk semua jurnal. Jejak
   keputusan yang salah tanggal bukan bukti audit (SA 230 ¶8-11).
   ============================================================ */
describe('guardSignoffWrite — stempel waktu keputusan (PR-3)', () => {
  const NOW = Date.parse('2026-08-07T09:00:00.000Z');
  const at = (ts: unknown) => ({ 'APR-AJE-09': { decisions: [{ idx: 1, stepRole: 'Audit Manager', name: 'Anindya P.', ts }] } });

  it('stempel nyata di dalam jendela diterima', () => {
    expect(guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, at(new Date(NOW - 60_000).toISOString()), NOW))
      .toEqual([{ what: 'approval:APR-AJE-09.Audit Manager', cap: CAP.SIGNOFF_REVIEWER }]);
  });

  /* Inti PR-3: bentuk stempel lama tak lagi dapat masuk. */
  it('konstanta lama `10 Mar 09:00` DITOLAK — tak terbaca sebagai waktu', () => {
    expect(() => guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, at('10 Mar 09:00'), NOW))
      .toThrow(/decision-missing-timestamp/);
  });

  it('keputusan tanpa stempel DITOLAK (fail-closed) — juga bagi Partner', () => {
    expect(() => guardSignoffWrite(PARTNER, 'approvals_ov_v4', {}, at(undefined), NOW))
      .toThrow(/decision-missing-timestamp/);
  });

  it('BACK-DATING di luar jendela DITOLAK', () => {
    expect(() => guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, at(new Date(NOW - 3 * 3.6e6).toISOString()), NOW))
      .toThrow(/decision-stale-timestamp/);
  });

  it('FORWARD-DATING di luar jendela DITOLAK', () => {
    expect(() => guardSignoffWrite(MANAGER, 'approvals_ov_v4', {}, at(new Date(NOW + 3 * 3.6e6).toISOString()), NOW))
      .toThrow(/decision-future-timestamp/);
  });

  /* Keputusan yang SUDAH tersimpan tidak divalidasi ulang: yang diperiksa hanya
     yang baru. Jejak historis tak boleh menjadi tak-dapat-ditulis hanya karena
     aturan baru — yang penting adalah keputusan berikutnya jujur. */
  it('keputusan lama yang sudah tersimpan tidak diperiksa ulang', () => {
    const before = at('10 Mar 09:00');
    const after = {
      'APR-AJE-09': {
        decisions: [...before['APR-AJE-09'].decisions,
          { idx: 2, stepRole: 'Engagement Partner', name: 'Hartono W.', ts: new Date(NOW).toISOString() }],
      },
    };
    expect(guardSignoffWrite(PARTNER, 'approvals_ov_v4', before, after, NOW))
      .toEqual([{ what: 'approval:APR-AJE-09.Engagement Partner', cap: CAP.AJE_POST }]);
  });
});
