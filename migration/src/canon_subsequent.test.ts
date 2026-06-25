/* ============================================================
   Peristiwa kemudian (SA 560 / PSAK 8) — rekonsiliasi peristiwa
   ke laporan keuangan. Memastikan status pembukuan penyesuai
   (posted/proposed/unbooked) & pengungkapan non-penyesuai
   terdeteksi deterministik + roll-up dampak benar.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  SE_EVENTS, scanSubsequent, BOOK_STATUS_META, DISC_STATUS_META,
  type SubsequentEvent, type AjeEntry,
} from './canon_subsequent';
import { AMS } from './data';

const aje = (id: string, status: string, amount = 1_000_000_000): AjeEntry => ({ id, status, amount });
const ev = (over: Partial<SubsequentEvent> & { id: string }): SubsequentEvent => ({
  id: over.id, date: '2026-01-10', day: 10, title: 't', type: 'adjusting',
  amount: 1_000_000_000, desc: '', treatment: '', ...over,
});

describe('daftar kanonik', () => {
  it('5 peristiwa id unik; penyesuai punya field type valid', () => {
    expect(SE_EVENTS).toHaveLength(5);
    expect(new Set(SE_EVENTS.map(e => e.id)).size).toBe(5);
    expect(SE_EVENTS.every(e => e.type === 'adjusting' || e.type === 'nonadjusting')).toBe(true);
  });
});

describe('scanSubsequent — status pembukuan penyesuai', () => {
  it('AJE tertaut Posted → bookStatus posted, bukan gap', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-1', aje: 'AJE-X' })], aje: [aje('AJE-X', 'Posted')] });
    expect(r.reflections[0]).toMatchObject({ bookStatus: 'posted', ajeId: 'AJE-X', isGap: false });
  });

  it('AJE tertaut Proposed → bookStatus proposed, bukan gap', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-1', aje: 'AJE-X' })], aje: [aje('AJE-X', 'Proposed')] });
    expect(r.reflections[0]).toMatchObject({ bookStatus: 'proposed', isGap: false });
  });

  it('penyesuai tanpa tautan AJE → unbooked = gap', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-1' })], aje: [] });
    expect(r.reflections[0]).toMatchObject({ bookStatus: 'unbooked', isGap: true });
    expect(r.reflections[0].ajeId).toBeUndefined();
  });

  it('tautan menunjuk AJE tak-ada → unbooked (bukan crash)', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-1', aje: 'AJE-HANTU' })], aje: [aje('AJE-Y', 'Posted')] });
    expect(r.reflections[0].bookStatus).toBe('unbooked');
  });
});

describe('scanSubsequent — pengungkapan non-penyesuai', () => {
  it('disclosed true → disclosed, bukan gap', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-2', type: 'nonadjusting', disclosed: true })], aje: [] });
    expect(r.reflections[0]).toMatchObject({ discStatus: 'disclosed', isGap: false });
    expect(r.reflections[0].bookStatus).toBeUndefined();
  });

  it('disclosed false/absen → undisclosed = gap', () => {
    const r = scanSubsequent({ events: [ev({ id: 'SE-2', type: 'nonadjusting' })], aje: [] });
    expect(r.reflections[0]).toMatchObject({ discStatus: 'undisclosed', isGap: true });
  });
});

describe('scanSubsequent — roll-up dampak', () => {
  it('memilah dampak posted/proposed/unbooked & menghitung gap', () => {
    const r = scanSubsequent({
      events: [
        ev({ id: 'A', amount: 1e9, aje: 'P1' }),                       // posted
        ev({ id: 'B', amount: 2e9, aje: 'P2' }),                       // proposed
        ev({ id: 'C', amount: 3e9 }),                                  // unbooked
        ev({ id: 'D', type: 'nonadjusting', amount: 9e9, disclosed: false }), // undisclosed
        ev({ id: 'E', type: 'nonadjusting', amount: 5e9, disclosed: true }),  // disclosed
      ],
      aje: [aje('P1', 'Posted'), aje('P2', 'Proposed')],
    });
    expect(r.rollup).toMatchObject({
      events: 5, adjustingCount: 3, nonAdjustingCount: 2,
      adjustingImpact: 6e9, bookedImpact: 1e9, proposedImpact: 2e9, unbookedImpact: 3e9,
      unbookedCount: 1, undisclosedCount: 1, gaps: 2,
    });
  });

  it('input kosong → hasil kosong stabil', () => {
    const r = scanSubsequent({ events: [], aje: [] });
    expect(r.reflections).toEqual([]);
    expect(r.rollup).toMatchObject({ events: 0, adjustingImpact: 0, gaps: 0 });
  });
});

describe('integrasi register AJE kanonik (AMS.AJE)', () => {
  it('seed SE_EVENTS vs AMS.AJE nyata: SE-01 & SE-04 unbooked, SE-02 undisclosed', () => {
    const r = scanSubsequent({ events: SE_EVENTS, aje: AMS.AJE });
    const by = Object.fromEntries(r.reflections.map(x => [x.id, x]));
    expect(by['SE-01']).toMatchObject({ bookStatus: 'unbooked', isGap: true });
    expect(by['SE-04']).toMatchObject({ bookStatus: 'unbooked', isGap: true });
    expect(by['SE-02']).toMatchObject({ discStatus: 'undisclosed', isGap: true });
    expect(by['SE-03'].isGap).toBe(false);
    // dampak belum-dibukukan = SE-01 (2,53 M) + SE-04 (0,85 M)
    expect(r.rollup.unbookedImpact).toBe(2_530_000_000 + 850_000_000);
    expect(r.rollup.gaps).toBe(3);
  });
});

describe('metadata status', () => {
  it('label & severity tersedia', () => {
    expect(BOOK_STATUS_META.unbooked.k).toBe('red');
    expect(BOOK_STATUS_META.posted.k).toBe('green');
    expect(DISC_STATUS_META.undisclosed.k).toBe('red');
  });
});
