import { describe, it, expect } from 'vitest';
import { eqrGateFor, eqrGateDetail, EQR_GATE_LABEL, type EqrReviewRow } from './canon_eqr_gate';

/* ============================================================
   Gerbang EQR (SMM 2 / SMM 2) — aturan gagal-TERTUTUP.

   Uji inti di sini adalah "PIE tanpa baris EQR". Terhadap logika
   lama (wp_signoff.eqrStatusFor + view_opinion_parts) kasus itu
   menghasilkan gerbang TERBUKA; di sini ia wajib tertutup.
   ============================================================ */

const REVIEWS: EqrReviewRow[] = [
  { eng: 'ENG-2025-063', cleared: false },
  { eng: 'ENG-2025-014', cleared: true },
  { eng: 'ENG-2025-040', cleared: true },
  { eng: 'ENG-2025-040', cleared: false },
];

describe('eqrGateFor — perikatan WAJIB (PIE)', () => {
  it('PIE tanpa satu pun baris EQR TIDAK lolos gerbang (regresi fail-open)', () => {
    const gate = eqrGateFor('ENG-2025-999', REVIEWS, true);
    expect(gate.applicable).toBe(true);
    expect(gate.cleared).toBe(false);
    expect(gate.reason).toBe('missing-review');
    expect(gate.count).toBe(0);
  });

  it('registri kosong tetap menutup gerbang untuk PIE', () => {
    expect(eqrGateFor('ENG-2025-999', [], true).cleared).toBe(false);
    expect(eqrGateFor('ENG-2025-999', null, true).cleared).toBe(false);
    expect(eqrGateFor('ENG-2025-999', undefined, true).cleared).toBe(false);
  });

  it('PIE dengan baris EQR yang belum lolos → tertutup', () => {
    const gate = eqrGateFor('ENG-2025-063', REVIEWS, true);
    expect(gate).toMatchObject({ applicable: true, cleared: false, count: 1, clearedCount: 0, reason: 'open-review' });
  });

  it('PIE dengan seluruh baris lolos → terbuka', () => {
    const gate = eqrGateFor('ENG-2025-014', REVIEWS, true);
    expect(gate).toMatchObject({ applicable: true, cleared: true, count: 1, clearedCount: 1, reason: 'cleared' });
  });

  it('satu baris terbuka menutup gerbang walau baris lain lolos', () => {
    const gate = eqrGateFor('ENG-2025-040', REVIEWS, true);
    expect(gate.count).toBe(2);
    expect(gate.clearedCount).toBe(1);
    expect(gate.cleared).toBe(false);
    expect(gate.reason).toBe('open-review');
  });
});

describe('eqrGateFor — perikatan TIDAK wajib (non-PIE)', () => {
  it('tanpa baris EQR → gerbang tidak mengikat', () => {
    const gate = eqrGateFor('ENG-2025-999', REVIEWS, false);
    expect(gate).toMatchObject({ applicable: false, cleared: true, reason: 'not-required' });
  });

  it('baris EQR yang ADA tetap mengikat walau non-PIE (EQR sukarela tak boleh setengah jalan)', () => {
    const gate = eqrGateFor('ENG-2025-063', REVIEWS, false);
    expect(gate.applicable).toBe(true);
    expect(gate.cleared).toBe(false);
    expect(gate.reason).toBe('open-review');
  });
});

describe('eqrGateFor — batas', () => {
  it('tanpa perikatan aktif tidak menggerbangi apa pun', () => {
    for (const id of [null, undefined, '']) {
      expect(eqrGateFor(id, REVIEWS, true)).toMatchObject({ applicable: false, cleared: true, reason: 'no-engagement' });
    }
  });

  it('baris rusak/null diabaikan tanpa melempar', () => {
    const dirty = [null, undefined, { eng: null }, { eng: 'ENG-2025-063', cleared: true }] as unknown as EqrReviewRow[];
    const gate = eqrGateFor('ENG-2025-063', dirty, true);
    expect(gate).toMatchObject({ count: 1, clearedCount: 1, cleared: true });
  });

  it('`cleared` yang absen dihitung sebagai BELUM lolos', () => {
    const gate = eqrGateFor('E-1', [{ eng: 'E-1' }], true);
    expect(gate.cleared).toBe(false);
    expect(gate.clearedCount).toBe(0);
  });
});

describe('penyajian', () => {
  it('setiap alasan punya kalimat siap-tampil', () => {
    const reasons = ['no-engagement', 'not-required', 'missing-review', 'open-review', 'cleared'] as const;
    for (const r of reasons) {
      expect(EQR_GATE_LABEL[r].length).toBeGreaterThan(0);
    }
  });

  it('rincian membedakan "belum terdaftar" dari hitungan', () => {
    expect(eqrGateDetail(eqrGateFor('X', [], true))).toContain('Belum ada penelaahan');
    expect(eqrGateDetail(eqrGateFor('ENG-2025-040', REVIEWS, true))).toBe('1/2 EQR lolos gerbang');
  });
});
