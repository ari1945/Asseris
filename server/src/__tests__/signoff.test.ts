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

  it('mengubah isi jurnal TANPA mengubah status tidak menuntut AJE_POST', () => {
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

describe('guardSignoffWrite — keputusan rantai persetujuan (PR-B)', () => {
  const dec = (stepRole: string) => ({ 'APR-AJE-09': { decisions: [{ idx: 1, stepRole, name: 'X' }] } });

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
    const noRole = { 'APR-AJE-09': { decisions: [{ idx: 1, name: 'X' }] } };
    expect(() => guardSignoffWrite(PARTNER, 'approvals_ov_v4', {}, noRole)).toThrow(/FORBIDDEN|requires/);
  });

  it('komentar/thread tanpa keputusan baru tidak menuntut kapabilitas', () => {
    const before = dec('Audit Manager');
    const after = { 'APR-AJE-09': { ...before['APR-AJE-09'], thread: [{ text: 'catatan' }] } };
    expect(guardSignoffWrite(SENIOR, 'approvals_ov_v4', before, after)).toEqual([]);
  });
});
