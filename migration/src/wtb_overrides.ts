/* ============================================================
   Overlay override analitis WTB — fungsi MURNI.
   ------------------------------------------------------------
   Menerapkan (a) override per-akun (catatan/status reviu + nilai AJE manual)
   dan (b) delta dari AJE POSTED terstruktur, di atas WTB dasar (seed / terimpor
   / terpetakan). Di-key per KODE akun (identitas stabil) — BUKAN `row.key` posisi
   — agar override bertahan saat WTB di-impor/petakan ulang (key posisi bergeser
   atau berganti namespace 'wtb'+i → 'imp'+n). Override pada kode yang tak lagi
   ada (yatim) diabaikan dengan aman.

   Dipakai oleh AuditProvider (contexts.jsx) sebagai SSOT `wtb` yang dikonsumsi view.
   ============================================================ */

export interface WtbOverrideEntry {
  aje?: number;
  note?: string;
  revStatus?: string;
  [k: string]: unknown;
}

export interface OverlayWtbRow {
  code: string;
  key?: string;
  aje?: number;
  unadj?: number;
  [k: string]: unknown;
}

/**
 * overlayWtbOverrides — terapkan override (by code) + delta AJE posted (by code)
 * ke WTB dasar. Murni: tak menyentuh React/DOM/window. `adj` dihitung ulang.
 */
export function overlayWtbOverrides(
  baseWtb: OverlayWtbRow[],
  overrides: Record<string, WtbOverrideEntry>,
  postDeltas: Record<string, number>,
): OverlayWtbRow[] {
  return baseWtb.map((r) => {
    const extra = postDeltas[r.code] || 0;
    const o = overrides[r.code] || {};
    const ajeVal = (o.aje != null ? o.aje : (r.aje || 0)) + extra;
    return { ...r, ...o, aje: ajeVal, adj: (r.unadj || 0) + ajeVal };
  });
}
