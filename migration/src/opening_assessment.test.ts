/* ============================================================
   Penilaian Risiko Saldo Awal (SA 510) — mesin murni.
   Memastikan: template faktor (Σ bobot=100), skor & verdict opening,
   kesiapan komunikasi auditor pendahulu (¶6).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  OB_RISK_FACTORS, openingScore, openingVerdict, predecessorReadiness, PREDECESSOR_STEPS,
} from './opening_assessment';

describe('OB_RISK_FACTORS & skor/verdict', () => {
  it('template 6 faktor, Σ bobot = 100', () => {
    const f = OB_RISK_FACTORS();
    expect(f).toHaveLength(6);
    expect(f.reduce((s, x) => s + x.w, 0)).toBe(100);
  });

  it('override per-indeks diterapkan', () => {
    const f = OB_RISK_FACTORS({ 0: { s: 5, note: 'pendahulu KAP besar' } });
    expect(f[0].s).toBe(5);
    expect(f[0].note).toBe('pendahulu KAP besar');
  });

  it('semua skor 5 → Andal (green); semua 2 → Risiko Tinggi (red)', () => {
    const hi = OB_RISK_FACTORS({ 0: { s: 5 }, 1: { s: 5 }, 2: { s: 5 }, 3: { s: 5 }, 4: { s: 5 }, 5: { s: 5 } });
    expect(openingScore(hi)).toBeCloseTo(5, 6);
    expect(openingVerdict(openingScore(hi))).toEqual({ k: 'green', l: 'Saldo Awal Andal' });

    const lo = OB_RISK_FACTORS({ 0: { s: 2 }, 1: { s: 2 }, 2: { s: 2 }, 3: { s: 2 }, 4: { s: 2 }, 5: { s: 2 } });
    expect(openingVerdict(openingScore(lo)).k).toBe('red');
  });
});

describe('predecessorReadiness (SA 510 ¶6)', () => {
  it('kosong → 0%, tidak ready', () => {
    const r = predecessorReadiness({});
    expect(r).toEqual({ done: 0, total: PREDECESSOR_STEPS.length, pct: 0, ready: false });
  });

  it('sebagian selesai → pct proporsional', () => {
    const r = predecessorReadiness({ consent: true, review: true });
    expect(r.done).toBe(2);
    expect(r.pct).toBe(Math.round((2 / PREDECESSOR_STEPS.length) * 100));
    expect(r.ready).toBe(false);
  });

  it('semua langkah selesai → 100%, ready', () => {
    const all: Record<string, boolean> = {};
    PREDECESSOR_STEPS.forEach((s) => { all[s.id] = true; });
    const r = predecessorReadiness(all);
    expect(r.pct).toBe(100);
    expect(r.ready).toBe(true);
  });

  it('id tak dikenal diabaikan', () => {
    expect(predecessorReadiness({ bogus: true }).done).toBe(0);
  });
});
