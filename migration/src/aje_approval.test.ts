/* ============================================================
   PR-2 — Persetujuan terikat pada VERSI jurnal (PRD §S2).

   Cacat yang ditutup: keputusan persetujuan tersimpan di StateDoc
   `approvals_ov_v4`, jurnalnya di `aje`. Mengubah isi jurnal yang masih
   `Proposed` karenanya TIDAK menyentuh keputusan yang sudah tercatat — rantai
   tetap memperlihatkan tanda tangan Manajer atas jurnal yang, setelah
   disunting, bukan lagi jurnal yang ia setujui.

   Pembatalan lintas-dokumen tak dapat dijamin atomik, jadi ia dibuat TURUNAN:
   setiap keputusan membawa hash isi jurnal yang disetujuinya.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { ajeContentHash } from './aje_contract';
import type { AjeContractEntry } from './aje_contract';
import {
  AJE_EQR_THRESHOLD, ajeChainBlocker, ajeChainSteps, buildAjeChain, makeAjeDecision,
} from './aje_approval';
import type { AjeDecision } from './aje_approval';

const ROLES = {
  preparer: 'Dimas Raharjo', manager: 'Anindya Pramesti',
  partner: 'Hartono Wijaya', eqr: 'Rudi Gunawan, CPA',
  submittedAt: '2026-05-04 16:40', submitNote: 'AJE diajukan dari kertas kerja B-3.',
};

const J = (over: Partial<AjeContractEntry> = {}): AjeContractEntry => ({
  id: 'AJE-01', status: 'Proposed', desc: 'Koreksi pisah batas', ref: 'B-3',
  kind: 'adjusting', amount: 1_200_000_000, dr: '5-3100 Beban', cr: '2-1300 Akrual', ...over,
});

const decide = (a: AjeContractEntry, idx: number, stepRole: string, name: string, ts = '2026-05-06T10:20:00.000Z'): AjeDecision =>
  makeAjeDecision({ a, idx, stepRole, name, role: stepRole, ts, note: 'Disetujui.' });

describe('ajeChainSteps — panjang rantai mengikuti nilai', () => {
  it('di bawah ambang EQR: 3 langkah', () => {
    expect(ajeChainSteps(J({ amount: 400_000_000 }), ROLES).map((s) => s.role))
      .toEqual(['Penyusun', 'Audit Manager', 'Engagement Partner']);
  });
  it('pada/di atas ambang EQR: 4 langkah', () => {
    const steps = ajeChainSteps(J({ amount: AJE_EQR_THRESHOLD }), ROLES);
    expect(steps).toHaveLength(4);
    expect(steps[3]).toMatchObject({ role: 'EQR Reviewer', name: 'Rudi Gunawan, CPA' });
  });
  it('AJE-01 seed (Rp 2,34 M) menuntut langkah EQR', () => {
    expect(ajeChainSteps(J({ amount: 2_340_000_000 }), ROLES)).toHaveLength(4);
  });
});

describe('buildAjeChain — status posting BUKAN masukan', () => {
  it('jurnal Posted tanpa satu pun keputusan: hanya Penyusun yang selesai', () => {
    const a = J({ status: 'Posted', amount: 3_500_000_000 });
    const r = buildAjeChain(a, ajeChainSteps(a, ROLES), []);
    expect(r.chain.filter((c) => c.status === 'approved')).toHaveLength(1);
    expect(r.chain[0].role).toBe('Penyusun');
    expect(r.chain.slice(1).every((c) => c.ts === null)).toBe(true);
    expect(r.postedWithoutFullChain).toBe(true);
    expect(r.chainComplete).toBe(false);
  });

  it('langkah berjalan adalah langkah pertama yang belum disetujui', () => {
    const a = J();
    const steps = ajeChainSteps(a, ROLES);
    const r = buildAjeChain(a, steps, [decide(a, 1, 'Audit Manager', 'Anindya Pramesti')]);
    expect(r.step).toBe(2);
    expect(r.chain[1].status).toBe('approved');
    expect(r.chain[2].status).toBe('current');
    expect(ajeChainBlocker(r)).toEqual({ role: 'Engagement Partner', name: 'Hartono Wijaya' });
  });

  it('rantai lengkap → chainComplete & tak ada langkah current', () => {
    const a = J();
    const steps = ajeChainSteps(a, ROLES);
    const r = buildAjeChain(a, steps, [
      decide(a, 1, 'Audit Manager', 'Anindya Pramesti'),
      decide(a, 2, 'Engagement Partner', 'Hartono Wijaya'),
    ]);
    expect(r.chainComplete).toBe(true);
    expect(r.chain.every((c) => c.status === 'approved')).toBe(true);
    expect(ajeChainBlocker(r)).toBeNull();
  });

  it('nama pada langkah yang belum diputuskan adalah PENUGASAN, bukan tanda tangan', () => {
    const a = J();
    const r = buildAjeChain(a, ajeChainSteps(a, ROLES), []);
    expect(r.chain[1].name).toBe('Anindya Pramesti');   // ditugasi
    expect(r.chain[1].ts).toBeNull();                    // tetapi belum bertanda tangan
    expect(r.chain[1].note).toBeNull();
  });
});

describe('PENGIKATAN HASH — persetujuan gugur saat jurnal berubah (INTI PR-2)', () => {
  const a0 = J();
  const dec = [decide(a0, 1, 'Audit Manager', 'Anindya Pramesti')];

  it('jurnal tak berubah → persetujuan tetap berlaku', () => {
    const r = buildAjeChain(a0, ajeChainSteps(a0, ROLES), dec);
    expect(r.chain[1].status).toBe('approved');
    expect(r.hasVoided).toBe(false);
  });

  it('NILAI diubah setelah disetujui → persetujuan Manajer GUGUR, langkah kembali menunggu', () => {
    const edited = J({ amount: 1_900_000_000 });
    const r = buildAjeChain(edited, ajeChainSteps(edited, ROLES), dec);
    expect(r.chain[1].status).toBe('current');
    expect(r.chain[1].voided).toBe(true);
    expect(r.chainComplete).toBe(false);
    expect(r.hasVoided).toBe(true);
    expect(r.step).toBe(1);
  });

  it('tanda tangan yang gugur tetap TERLIHAT (dapat ditelusuri, bukan dihapus)', () => {
    const edited = J({ amount: 1_900_000_000 });
    const r = buildAjeChain(edited, ajeChainSteps(edited, ROLES), dec);
    expect(r.chain[1].voidedBy).toMatchObject({ name: 'Anindya Pramesti', ts: '2026-05-06T10:20:00.000Z' });
    expect(r.chain[1].ts).toBeNull();        // tetapi ia BUKAN tanda tangan yang berlaku
  });

  it('mengubah AKUN (bukan nilai) juga menggugurkan', () => {
    const rerouted = J({ dr: '5-9999 Beban Lain' });
    expect(buildAjeChain(rerouted, ajeChainSteps(rerouted, ROLES), dec).chain[1].voided).toBe(true);
  });

  it('mengubah tautan SAD atau ref WP juga menggugurkan', () => {
    [J({ mis: 'M-99' }), J({ ref: 'Z-1' })].forEach((v) => {
      expect(buildAjeChain(v, ajeChainSteps(v, ROLES), dec).chain[1].voided).toBe(true);
    });
  });

  /* Batas yang harus dijaga: memposting jurnal TIDAK boleh menggugurkan
     persetujuan yang justru menghasilkan posting itu. */
  it('MEMPOSTING tidak menggugurkan apa pun (status di luar hash)', () => {
    const postedNow = J({ status: 'Posted' });
    const r = buildAjeChain(postedNow, ajeChainSteps(postedNow, ROLES), dec);
    expect(r.chain[1].status).toBe('approved');
    expect(r.hasVoided).toBe(false);
  });

  it('menyunting lalu MENGEMBALIKAN isi ke semula memulihkan persetujuan', () => {
    /* Hash adalah fungsi isi, bukan riwayat: jurnal yang identik dengan yang
       disetujui memang jurnal yang disetujui. */
    const r = buildAjeChain(J(), ajeChainSteps(J(), ROLES), dec);
    expect(r.chain[1].status).toBe('approved');
  });

  it('langkah yang disetujui SETELAH perubahan tetap berlaku; yang sebelum gugur', () => {
    const edited = J({ amount: 1_900_000_000 });
    const mixed = [
      decide(a0, 1, 'Audit Manager', 'Anindya Pramesti'),       // atas versi lama
      decide(edited, 2, 'Engagement Partner', 'Hartono Wijaya'), // atas versi baru
    ];
    const r = buildAjeChain(edited, ajeChainSteps(edited, ROLES), mixed);
    expect(r.chain[1].voided).toBe(true);
    expect(r.chain[2].status).toBe('approved');
    /* Rantai TIDAK lengkap meski langkah terakhir bertanda tangan — ada lubang. */
    expect(r.chainComplete).toBe(false);
    expect(r.step).toBe(1);
  });
});

describe('keputusan WARISAN tanpa hash (migrasi)', () => {
  const legacyDec: AjeDecision[] = [
    { idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-05-06 10:20', note: 'Reviu manajer.' },
  ];

  it('tetap dihitung disetujui — tidak digugurkan massal saat rilis', () => {
    const a = J({ amount: 1_900_000_000 });      // isi berbeda dari kapan pun
    const r = buildAjeChain(a, ajeChainSteps(a, ROLES), legacyDec);
    expect(r.chain[1].status).toBe('approved');
  });

  it('DITANDAI `legacy` — tak diklaim terverifikasi terhadap isi jurnal', () => {
    const a = J();
    expect(buildAjeChain(a, ajeChainSteps(a, ROLES), legacyDec).chain[1].legacy).toBe(true);
  });

  it('keputusan seed tanpa `idx` diperlakukan posisional', () => {
    const a = J();
    const seedStyle: AjeDecision[] = [
      { stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-05-06 10:20' },
      { stepRole: 'Engagement Partner', name: 'Hartono Wijaya', ts: '2026-05-08 14:05' },
    ];
    const r = buildAjeChain(a, ajeChainSteps(a, ROLES), seedStyle);
    expect(r.chain.map((c) => c.status)).toEqual(['approved', 'approved', 'approved']);
    expect(r.chainComplete).toBe(true);
  });
});

describe('makeAjeDecision', () => {
  it('mengikat hash isi jurnal saat keputusan diambil', () => {
    const a = J();
    expect(makeAjeDecision({ a, idx: 1, stepRole: 'Audit Manager', ts: 'x' }).hash).toBe(ajeContentHash(a));
  });
  it('stepRole terbawa (server memakainya untuk menentukan kapabilitas)', () => {
    const d = makeAjeDecision({ a: J(), idx: 2, stepRole: 'Engagement Partner', ts: 'x' });
    expect(d.stepRole).toBe('Engagement Partner');
    expect(d.idx).toBe(2);
  });
  it('catatan kosong → teks baku, bukan string kosong', () => {
    expect(makeAjeDecision({ a: J(), idx: 1, stepRole: 'Audit Manager', ts: 'x', note: '  ' }).note).toBe('Disetujui.');
  });
});
