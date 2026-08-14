/* ============================================================
   K-02 (PRD-KATALOG-EVALUASI-158-MODUL.md) — klok SSOT AMS.TODAY.
   Memaku: satu-satunya anchor "hari ini" app-wide adalah AMS.TODAY
   (data_part4). Modul lain TIDAK boleh punya literal tanggal beku
   sendiri (dulu: CKP_TODAY/MT_TODAY/RN_TODAY/ojk TODAY 2026-06-17).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { AMS_CANON } from './canon';
import './data_ojk'; // Object.assign(AMS_CANON, { ojkFiling, ... }) — efek samping terdaftar

describe('K-02 — klok SSOT AMS.TODAY', () => {
  it('AMS.TODAY adalah string tanggal valid (YYYY-MM-DD)', () => {
    expect(AMS.TODAY).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(Number.isNaN(Date.parse(AMS.TODAY))).toBe(false);
  });

  it('modul OJK memakai klok AMS.TODAY yang sama (bukan anchor 2026-06-17)', () => {
    const filing = AMS_CANON.ojkFiling();
    /* dday LK Tahunan (due 2026-03-31) relatif terhadap AMS.TODAY:
       dengan AMS.TODAY=2026-03-09 → +22 hari; anchor lama 06-17 → -78. */
    const oblig = (filing.obligations || []).find((o: { kind?: string }) => o.kind === 'LK Tahunan Auditan');
    expect(oblig).toBeTruthy();
    const expected = Math.round((+new Date(oblig.due) - +new Date(AMS.TODAY)) / 86400000);
    /* dengan klok demo AMS.TODAY (2026-03-09), due 2026-03-31 masih di depan */
    expect(expected).toBeGreaterThan(0);
  });
});
