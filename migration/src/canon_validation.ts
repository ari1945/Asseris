/* ============================================================
   Asseris — Validasi & Guardrail Input (Fase 4 · PR-B)  [PURE, ESM]
   ------------------------------------------------------------
   Guard input deklaratif yang dipakai bersama form (pola AJEForm/
   firmgl JV). PURE (tak menyentuh AMS_CANON) — sejalan canon_assertions/
   canon_capacity/canon_delivery. Menutup gap P6 (validasi tipis) untuk:
   probabilitas 0–100, urutan tanggal (jatuh tempo ≥ terbit), jam vs
   kapasitas. Linkage silang (risiko→prosedur) memakai
   reconcileRiskResponse (canon_audit_plan) yang sudah ada.
   ============================================================ */

/* Probabilitas peluang harus 0–100%. */
export function probError(n: number): string | null {
  if (!Number.isFinite(n)) return 'Probabilitas harus berupa angka.';
  if (n < 0 || n > 100) return 'Probabilitas harus di rentang 0–100%.';
  return null;
}
export const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/* Urutan tanggal faktur: jatuh tempo tidak boleh sebelum tanggal terbit. */
export function dueBeforeIssued(issued: string, due: string): boolean {
  if (!issued || !due) return false;
  return new Date(due + 'T00:00:00').getTime() < new Date(issued + 'T00:00:00').getTime();
}

/* Proyeksi alokasi jam anggota bila ditambah addHrs — untuk memperingatkan
   over-booking di form (sebelumnya hanya tampil setelah booking). */
export interface CapacityProjection { projected: number; over: boolean; overBy: number; pct: number }
export function capacityProjection(usedHrs: number, capacity: number, addHrs: number): CapacityProjection {
  const projected = usedHrs + Math.max(0, addHrs || 0);
  const over = capacity > 0 && projected > capacity;
  return {
    projected,
    over,
    overBy: Math.max(0, projected - capacity),
    pct: capacity > 0 ? Math.round((projected / capacity) * 100) : 0,
  };
}
