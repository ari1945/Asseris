/* ============================================================
   Asseris — SA 540 · analisis sensitivitas estimasi akuntansi
   ------------------------------------------------------------
   Fungsi MURNI & DETERMINISTIK (diuji unit: estimate_sensitivity.test.ts).
   Tiap driver asumsi: Δ% × dampak per 1% (perPct, Rp jt) → dampak nilai.
   Akumulasi → titik baru estimasi; verdict apakah masih dalam rentang
   auditor [lo, hi] (keluar rentang = sensitif → pertimbangan KAM/SA 701).
   ============================================================ */

export type SensDriver = { id: string; label: string; deltaPct: number; perPct: number };
export type SensComputed = { id: string; label: string; deltaPct: number; perPct: number; impact: number };
export type SensResult = {
  drivers: SensComputed[];
  totalImpact: number;
  newPoint: number;
  withinRange: boolean;
  /* jarak titik baru ke batas rentang terdekat bila keluar (0 bila di dalam) */
  breach: number;
};

export function estimateSensitivity(point: number, lo: number, hi: number, drivers: SensDriver[]): SensResult {
  const computed: SensComputed[] = drivers.map(d => ({
    id: d.id, label: d.label, deltaPct: d.deltaPct, perPct: d.perPct,
    impact: Math.round(d.deltaPct * d.perPct),
  }));
  const totalImpact = computed.reduce((s, d) => s + d.impact, 0);
  const newPoint = point + totalImpact;
  const withinRange = newPoint >= lo && newPoint <= hi;
  const breach = withinRange ? 0 : (newPoint < lo ? lo - newPoint : newPoint - hi);
  return { drivers: computed, totalImpact, newPoint, withinRange, breach };
}
