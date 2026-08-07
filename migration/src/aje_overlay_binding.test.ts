/* ============================================================
   PR-2 — pengikatan hash berlaku SAMPAI ANTREAN, bukan hanya di modul murni.

   Uji unit atas `buildAjeChain` tidak cukup: jalur nyata melewati
   `buildApprovals` (keputusan seed) lalu `applyOverlay` (keputusan pengguna).
   Sebelum PR-2, `applyOverlay` menambal rantai per-indeks —
   `if (dec) return { ...c, status: 'approved' }` — sehingga sebuah keputusan
   tercatat SELALU tampil disetujui, betapapun jurnalnya telah berubah sejak
   ditandatangani. Berkas ini memaku bahwa jalur itu tertutup.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import './data_platform';
import { applyOverlay } from './view_platform';
import { makeAjeDecision } from './aje_approval';

interface QueueItem {
  id: string; kind: string; sourceId: string; status: string; step: number;
  chain: { role: string; name: string; status: string; ts: string | null; voided?: boolean; legacy?: boolean }[];
  chainComplete: boolean; postedWithoutFullChain: boolean; hasVoided?: boolean;
  journal: { id: string; amount: number; status: string };
  steps: { role: string; name: string }[];
  decisions: unknown[];
  thread: unknown[];
}

const PLATFORM = (AMS as unknown as {
  PLATFORM: { buildApprovals: (ctx: unknown) => QueueItem[] };
}).PLATFORM;

const build = (aje: unknown[]): QueueItem[] =>
  PLATFORM.buildApprovals({ aje, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS })
    .filter((i) => i.kind === 'AJE');

/** Jurnal buatan pengguna Rp 1,2 M → rantai 3 langkah, tanpa keputusan seed. */
const journal = (over: Record<string, unknown> = {}) => ({
  id: 'AJE-99', desc: 'Jurnal buatan pengguna', ref: 'X-1', status: 'Proposed',
  dr: '5-3100 Beban Umum', cr: '2-1300 Akrual', amount: 1_200_000_000, ...over,
});

describe('applyOverlay — keputusan pengguna atas jurnal yang TIDAK berubah', () => {
  it('langkah yang diputuskan tampil disetujui, langkah berikutnya berjalan', () => {
    const a = journal();
    const [base] = build([a]);
    const dec = makeAjeDecision({ a, idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-08-07T09:00:00.000Z' });
    const it = applyOverlay(base, { decisions: [dec] }) as QueueItem;
    expect(it.chain[1].status).toBe('approved');
    expect(it.chain[1].name).toBe('Anindya Pramesti');
    expect(it.chain[2].status).toBe('current');
    expect(it.status).toBe('pending');
  });

  it('rantai lengkap → status antrean approved', () => {
    const a = journal();
    const [base] = build([a]);
    const decs = [
      makeAjeDecision({ a, idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: 't1' }),
      makeAjeDecision({ a, idx: 2, stepRole: 'Engagement Partner', name: 'Hartono Wijaya', ts: 't2' }),
    ];
    const it = applyOverlay(base, { decisions: decs }) as QueueItem;
    expect(it.chainComplete).toBe(true);
    expect(it.status).toBe('approved');
  });
});

describe('applyOverlay — jurnal BERUBAH setelah disetujui (INTI PR-2)', () => {
  const original = journal();
  const dec = makeAjeDecision({ a: original, idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-08-07T09:00:00.000Z' });

  it('persetujuan Manajer GUGUR ketika nilai jurnal disunting', () => {
    /* Antrean dibangun ulang atas jurnal versi BARU; keputusannya milik versi lama. */
    const [base] = build([journal({ amount: 1_950_000_000 })]);
    const it = applyOverlay(base, { decisions: [dec] }) as QueueItem;
    expect(it.chain[1].status).toBe('current');   // dulu: 'approved'
    expect(it.chain[1].voided).toBe(true);
    expect(it.chainComplete).toBe(false);
    expect(it.status).toBe('pending');
    expect(it.hasVoided).toBe(true);
  });

  it('overlay `status: approved` yang tersimpan TIDAK dapat mengalahkan rantai', () => {
    /* Overlay lama menyimpan status hasil hitungannya sendiri. Bila status itu
       menang, satu jurnal yang disunting akan tetap tampil disetujui. */
    const [base] = build([journal({ amount: 1_950_000_000 })]);
    const it = applyOverlay(base, { decisions: [dec], status: 'approved', step: 3 }) as QueueItem;
    expect(it.status).toBe('pending');
    expect(it.step).toBe(1);
  });

  it('mengembalikan jurnal ke isi semula memulihkan persetujuan', () => {
    const [base] = build([journal()]);
    const it = applyOverlay(base, { decisions: [dec] }) as QueueItem;
    expect(it.chain[1].status).toBe('approved');
    expect(it.hasVoided).toBe(false);
  });
});

describe('applyOverlay — jenis LEGACY tak tersentuh perubahan ini', () => {
  it('item non-AJE tetap memakai jalur penambalan lama', () => {
    const nonAje = {
      id: 'APR-INV-1', kind: 'Faktur', step: 0, status: 'pending', thread: [],
      chain: [{ role: 'Audit Manager', name: 'A', status: 'current', ts: null, note: null },
        { role: 'Finance Lead', name: 'B', status: 'pending', ts: null, note: null }],
    };
    const it = applyOverlay(nonAje, { decisions: [{ idx: 0, name: 'A', ts: 'x', note: 'ok' }], step: 1 }) as QueueItem;
    expect(it.chain[0].status).toBe('approved');
    expect(it.chain[1].status).toBe('current');
  });
});

describe('seed — keputusan warisan tanpa hash tidak digugurkan', () => {
  it('AJE-02 tetap berantai lengkap (keputusan seed = legacy)', () => {
    const it = build(AMS.AJE as unknown[]).find((i) => i.sourceId === 'AJE-02')!;
    expect(it.chain.map((c) => c.status)).toEqual(['approved', 'approved', 'approved']);
    expect(it.chain[1].legacy).toBe(true);
    expect(it.chainComplete).toBe(true);
  });

  /* Eksepsi kontrol yang harus tetap tersingkap setelah refactor. */
  it('AJE-01 (Rp 2,34 M) tetap: 4 langkah, EQR belum, Posted tanpa rantai lengkap', () => {
    const it = build(AMS.AJE as unknown[]).find((i) => i.sourceId === 'AJE-01')!;
    expect(it.chain).toHaveLength(4);
    expect(it.chain[3].role).toBe('EQR Reviewer');
    expect(it.chain[3].status).toBe('current');
    expect(it.postedWithoutFullChain).toBe(true);
  });
});
