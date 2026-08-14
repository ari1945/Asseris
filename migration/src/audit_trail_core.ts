/* ============================================================
   Asseris — Audit Trail core (PRD prd-audit-trail-server-chain.md)
   ------------------------------------------------------------
   Logika MURNI untuk modul Audit Trail (view_platform3.tsx):
   - resolveAuditView: memilih sumber (server chain / fallback lokal)
     dan menyatakan klaim integritas HANYA bila server benar-benar
     diverifikasi (P-1: badge "Terverifikasi" tidak boleh tampil atas
     data pseudo-hash lokal).
   - deriveStats: agregat (total, pengguna unik, byDay, actCounts)
     dari ts ISO sungguhan — bukan literal tanggal beku.

   Kontrak baris mengikuti prosedur tRPC `audit.list`
   (server/src/router.ts) — detail = metadata saja, tanpa isi kertas kerja.
   ============================================================ */

/** Baris jejak server (proyeksi audit.list). */
export interface AuditRow {
  seq: number;
  ts: string;
  actorUserId: string | null;
  actorRole: string | null;
  action: string;
  scope: string;
  scopeId: string | null;
  key: string | null;
  detail: string | null;
  prevHash: string;
  hash: string;
}

/** Hasil verifyAuditChain server (server/src/audit/log.ts). */
export interface VerifyState {
  ok: boolean;
  brokenAt: number | null;
  count: number;
}

export type AuditSource = 'server' | 'fallback';

export interface AuditView {
  rows: AuditRow[];
  source: AuditSource;
  /** true = chain server terverifikasi · false = chain RUSAK · null = tak dapat diklaim */
  verified: boolean | null;
  brokenAt: number | null;
  count: number;
}

/**
 * Satu resolusi sumber + klaim integritas untuk modul Audit Trail.
 *
 * Aturan (P-1):
 * - serverRows != null → source 'server'; rows = serverRows. Fallback lokal
 *   TIDAK pernah menimpa jawaban server (termasuk daftar kosong yang sah).
 * - verified hanya true bila `verify` hadir DAN ok. verify null (list jalan,
 *   verifier gagal/terlarang) → verified null — jangan klaim hijau tanpa bukti.
 * - serverRows == null (server mati / peran tanpa AUDIT_VIEW) → source
 *   'fallback'; verified null — arus lokal TIDAK pernah berlabel terverifikasi.
 */
export function resolveAuditView(
  serverRows: AuditRow[] | null,
  verify: VerifyState | null,
  fallbackRows: AuditRow[],
): AuditView {
  if (serverRows == null) {
    return { rows: fallbackRows, source: 'fallback', verified: null, brokenAt: null, count: fallbackRows.length };
  }
  const verified = verify != null ? verify.ok : null;
  const brokenAt = verify != null && !verify.ok ? verify.brokenAt : null;
  return { rows: serverRows, source: 'server', verified, brokenAt, count: serverRows.length };
}

export interface AuditStats {
  total: number;
  uniqueUsers: number;
  /** [tanggal 'YYYY-MM-DD', jumlah] urut naik — diturunkan dari ts, bukan literal */
  byDay: Array<[string, number]>;
  /** [aksi, jumlah] urut menurun — untuk strip "Sebaran Aksi" */
  actCounts: Array<[string, number]>;
}

/** Agregat deterministik atas rows; rows kosong → stat nol, bukan crash. */
export function deriveStats(rows: AuditRow[]): AuditStats {
  const dayMap = new Map<string, number>();
  const actMap = new Map<string, number>();
  const users = new Set<string>();
  for (const r of rows) {
    const d = r.ts.slice(0, 10);
    dayMap.set(d, (dayMap.get(d) ?? 0) + 1);
    actMap.set(r.action, (actMap.get(r.action) ?? 0) + 1);
    if (r.actorUserId) users.add(r.actorUserId);
  }
  const byDay = [...dayMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const actCounts = [...actMap.entries()].sort((a, b) => b[1] - a[1]);
  return { total: rows.length, uniqueUsers: users.size, byDay, actCounts };
}
