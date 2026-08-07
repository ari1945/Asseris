/* ============================================================
   PR-4 — tab AJE membaca ANTREAN HIDUP, bukan metadata seed (PRD §S4/§S5).

   Cacat yang ditutup: `AjeApprovals` menyusun jejaknya dari `AJE_META`
   (`reviewer`/`partner`/`reviewedOn`/`postedOn`) dan menandai langkah Partner
   selesai semata dari `status === 'Posted'`. Ia tak pernah membaca
   `approvals_ov_v4`. Akibat yang terukur pada seed:

     antrean  → AJE-01: 4 langkah, `EQR Reviewer: current`
     tab AJE  → AJE-01: 3 langkah, ketiganya hijau — "selesai"

   Berkas ini menguji sumber data tab yang baru (`ajeTrailFrom`) atas
   keluaran antrean yang sama, sehingga kedua permukaan tak dapat lagi
   menjawab berbeda tanpa menggagalkan uji.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import './data_platform';
import { applyAjeOverlay, makeAjeDecision } from './aje_approval';
import type { AjeQueueItem } from './aje_approval';
import { ajeTrailFrom } from './view_aje';

const PLATFORM = (AMS as unknown as { PLATFORM: { buildApprovals: (ctx: unknown) => AjeQueueItem[] } }).PLATFORM;

const build = (aje: unknown[]): AjeQueueItem[] =>
  PLATFORM.buildApprovals({ aje, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS })
    .filter((i) => i.kind === 'AJE');

const journal = (over: Record<string, unknown> = {}) => ({
  id: 'AJE-99', desc: 'Jurnal buatan pengguna', ref: 'X-1', status: 'Proposed',
  dr: '5-3100 Beban Umum', cr: '2-1300 Akrual', amount: 1_200_000_000,
  proposedOn: '2026-08-01 09:00', preparer: 'Dimas Raharjo', ...over,
});

describe('rantai yang dilihat tab AJE = rantai yang dilihat antrean', () => {
  it('AJE-01 (Rp 2,34 M, Posted): 4 langkah dan EQR BELUM menelaah', () => {
    const it01 = build(AMS.AJE as unknown[]).find((i) => i.sourceId === 'AJE-01')!;
    expect(it01.chain).toHaveLength(4);
    expect(it01.chain[3].role).toBe('EQR Reviewer');
    expect(it01.chain[3].status).not.toBe('approved');
    /* Eksepsi yang dulu tersembunyi di balik "3 langkah hijau". */
    expect(it01.postedWithoutFullChain).toBe(true);
  });

  it('jurnal di bawah ambang EQR tetap 3 langkah', () => {
    const [it] = build([journal({ amount: 400_000_000 })]);
    expect(it.chain).toHaveLength(3);
  });
});

describe('ajeTrailFrom — jejak dari keputusan NYATA', () => {
  it('pengajuan memakai tanggal jurnal, bukan konstanta bersama', () => {
    const rows = ajeTrailFrom(build([journal()]));
    const submit = rows.find((r) => r.act.includes('menyiapkan'))!;
    expect(submit.on).toBe('2026-08-01 09:00');
    expect(submit.who).toBe('Dimas Raharjo');
  });

  it('persetujuan tercatat muncul dengan NAMA & WAKTU keputusannya', () => {
    const a = journal();
    const [base] = build([a]);
    const dec = makeAjeDecision({ a, idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-08-05T10:20:00.000Z' });
    const rows = ajeTrailFrom([applyAjeOverlay(base, { decisions: [dec] })]);
    const approved = rows.find((r) => r.act.includes('menyetujui langkah Audit Manager'))!;
    expect(approved.who).toBe('Anindya Pramesti');
    expect(approved.on).toBe('2026-08-05T10:20:00.000Z');
  });

  /* Yang paling penting untuk penelaah: pembatalan yang dapat ditelusuri. */
  it('persetujuan yang GUGUR muncul sebagai barisnya sendiri', () => {
    const a = journal();
    const dec = makeAjeDecision({ a, idx: 1, stepRole: 'Audit Manager', name: 'Anindya Pramesti', ts: '2026-08-05T10:20:00.000Z' });
    const [edited] = build([journal({ amount: 1_950_000_000 })]);
    const rows = ajeTrailFrom([applyAjeOverlay(edited, { decisions: [dec] })]);
    const voided = rows.find((r) => r.act.includes('GUGUR'))!;
    expect(voided).toBeTruthy();
    expect(voided.who).toBe('Anindya Pramesti');
    expect(rows.some((r) => r.act.includes('menyetujui langkah Audit Manager'))).toBe(false);
  });

  it('keputusan warisan ditandai apa adanya, bukan disamakan dengan yang terverifikasi', () => {
    const rows = ajeTrailFrom(build(AMS.AJE as unknown[]));
    expect(rows.some((r) => r.act.includes('jejak warisan'))).toBe(true);
  });

  it('urut terbaru dulu — entri terbaru tidak tenggelam ke dasar', () => {
    const rows = ajeTrailFrom(build(AMS.AJE as unknown[]));
    const stamps = rows.map((r) => Date.parse(String(r.on || '').replace(' ', 'T'))).filter(Number.isFinite);
    const sorted = [...stamps].sort((x, y) => y - x);
    expect(stamps).toEqual(sorted);
  });
});
