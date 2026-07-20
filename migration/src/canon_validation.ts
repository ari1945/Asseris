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

/* ------------------------------------------------------------
   Validasi silang SA 265 → SA 260 (defisiensi signifikan → TCWG).
   Derivasi murni dari dua SSOT yang sudah ada (tanpa flag baru):
   - register defisiensi (deficiencies.v1): `sig` + `status`;
   - matriks komunikasi TCWG (tcwg.v1): status baris "Temuan
     signifikan dari audit" (SA 260 ¶16), diteruskan pemanggil.
   SA 265 ¶9 mewajibkan defisiensi signifikan dikomunikasikan
   TERTULIS ke TCWG; SA 260 ¶16 mewajibkan temuan signifikan
   (termasuk defisiensi signifikan) disampaikan ke TCWG. Guardrail
   menutup celah: klasifikasi signifikan yang di-set "Lisan"
   (langgar ¶9) & defisiensi signifikan yang belum selesai
   dilaporkan di SA 260. ------------------------------------------------------------ */
/* Bentuk komunikasi tertulis ke TCWG — harus sinkron dengan DEFIC_COMM di view_sa2comm. */
export const DEFIC_WRITTEN = 'Tertulis ke TCWG';
/* Status baris matriks SA 260 yang menandai komunikasi telah tuntas. */
export const TCWG_FINDINGS_DONE = 'Selesai';

export interface DeficiencyCommRow { id: string; sig: boolean; status: string }
export interface DeficiencyCommResult {
  total: number;
  sig: number;
  misclassified: string[]; // signifikan tetapi tidak ditandai "Tertulis ke TCWG" (¶9)
  tcwgReported: boolean;   // SA 260 ¶16 sudah "Selesai"
  tcwgPending: boolean;    // ada defisiensi signifikan tetapi SA 260 ¶16 belum selesai
  coveragePct: number;     // % defisiensi signifikan yang tepat ditandai tertulis (100 bila sig=0)
  issues: number;          // total titik yang perlu ditindaklanjuti
}

export function reconcileDeficiencyComm(input: {
  deficiencies: DeficiencyCommRow[];
  sigFindingsStatus?: string;
}): DeficiencyCommResult {
  const list = input.deficiencies || [];
  const sigList = list.filter(d => d && d.sig);
  const misclassified = sigList.filter(d => (d.status || '').trim() !== DEFIC_WRITTEN).map(d => d.id);
  const written = sigList.length - misclassified.length;
  const tcwgReported = (input.sigFindingsStatus || '').trim() === TCWG_FINDINGS_DONE;
  const tcwgPending = sigList.length > 0 && !tcwgReported;
  return {
    total: list.length,
    sig: sigList.length,
    misclassified,
    tcwgReported,
    tcwgPending,
    coveragePct: sigList.length ? Math.round((written / sigList.length) * 100) : 100,
    issues: misclassified.length + (tcwgPending ? 1 : 0),
  };
}
