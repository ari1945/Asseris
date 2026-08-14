/* ============================================================
   P-1 (PRD prd-audit-trail-server-chain.md) — repro-dulu.
   Audit Trail WAJIB jujur: badge "Terverifikasi" hanya boleh
   tampil bila server chain benar-benar diverifikasi. Uji ini
   GAGAL hari ini karena view_platform3.tsx memakai pseudoHash
   FNV-1a lokal + badge statis (lihat P-1 di PRD).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { resolveAuditView, deriveStats, type AuditRow, type VerifyState } from './audit_trail_core';

/* baris server = bentuk nyata prosedur audit.list (server/src/router.ts:583) */
function serverRow(seq: number, ts: string, action = 'EDIT'): AuditRow {
  return {
    seq, ts, actorUserId: 'u-1', actorRole: 'Manager', action,
    scope: 'engagement', scopeId: 'ENG-2025-014', key: 'mat.pct', detail: 'x',
    prevHash: `p${seq}`, hash: `h${seq}`,
  };
}

describe('resolveAuditView — sumber kebenaran & klaim integritas', () => {
  it('server tersedia → rows dari server, source=server', () => {
    const rows = [serverRow(1, '2026-08-13T09:00:00Z'), serverRow(2, '2026-08-13T10:00:00Z')];
    const v = resolveAuditView(rows, { ok: true, brokenAt: null, count: 2 }, []);
    expect(v.source).toBe('server');
    expect(v.rows).toBe(rows);
    expect(v.verified).toBe(true);
  });

  it('server TIDAK tersedia (null) → fallback lokal, TAPI verified=null (bukan hijau)', () => {
    const fb = [serverRow(1, '2026-03-09T00:00:00Z')];
    const v = resolveAuditView(null, null, fb);
    expect(v.source).toBe('fallback');
    expect(v.rows).toBe(fb);
    /* klaim integritas TIDAK boleh diucapkan atas data lokal */
    expect(v.verified).toBeNull();
  });

  it('chain RUSAK → verified=false + brokenAt teridentifikasi', () => {
    const rows = [serverRow(1, '2026-08-13T09:00:00Z'), serverRow(2, '2026-08-13T10:00:00Z')];
    const verify: VerifyState = { ok: false, brokenAt: 2, count: 2 };
    const v = resolveAuditView(rows, verify, []);
    expect(v.verified).toBe(false);
    expect(v.brokenAt).toBe(2);
  });

  it('list tersedia tapi verify gagal (null) → jangan klaim hijau', () => {
    const rows = [serverRow(1, '2026-08-13T09:00:00Z')];
    const v = resolveAuditView(rows, null, []);
    expect(v.source).toBe('server');
    expect(v.verified).toBeNull(); // tidak boleh hijau tanpa bukti
  });

  it('rows kosong dari server tetap source=server (jangan jatuh ke fallback)', () => {
    const v = resolveAuditView([], { ok: true, brokenAt: null, count: 0 }, [serverRow(99, '2026-03-09T00:00:00Z')]);
    expect(v.source).toBe('server');
    expect(v.rows).toEqual([]);
  });
});

describe('deriveStats — agregat dari rows (bukan seed hardcode)', () => {
  it('total, pengguna unik, byDay dari ts ISO sungguhan', () => {
    const rows = [
      serverRow(1, '2026-08-13T09:00:00Z', 'EDIT'),
      serverRow(2, '2026-08-13T10:00:00Z', 'EDIT'),
      serverRow(3, '2026-08-12T10:00:00Z', 'SIGN'),
    ];
    const s = deriveStats(rows);
    expect(s.total).toBe(3);
    expect(s.uniqueUsers).toBe(1);
    /* byDay memakai tanggal TANGGAL NYATA dari ts, bukan literal '2026-03-09' */
    expect(s.byDay).toEqual([
      ['2026-08-12', 1],
      ['2026-08-13', 2],
    ]);
    expect(s.actCounts).toEqual([
      ['EDIT', 2],
      ['SIGN', 1],
    ]);
  });

  it('rows kosong → stat nol, bukan crash', () => {
    const s = deriveStats([]);
    expect(s.total).toBe(0);
    expect(s.uniqueUsers).toBe(0);
    expect(s.byDay).toEqual([]);
    expect(s.actCounts).toEqual([]);
  });
});
