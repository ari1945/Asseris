/* ============================================================
   Wedge MVP F2 — builder DiagCtx dari impor TB+GL
   ------------------------------------------------------------
   Merangkai: ParsedImport (parser) + deriveJournalFlags (spike R1) →
   DiagCtx yang dikonsumsi `amsDiagnostics(ctx)` ([diagnostics.ts]).

   Unit moneter (lihat diagnostics.ts §header):
     · journalPop.amount = Rupiah PENUH (dari GL impor)
     · fig.* (pbt/perm…)  = Rupiah JUTA (dari sheet FISKAL; sesuai canon)
   RPT/forensic (dir/rpId/party) TAK tersedia dari TB+GL minimum (opsional §4) →
   dikosongkan di MVP; detektor RPT tak menyala (by design, bukan bug).
   ============================================================ */
import type { ParsedImport } from './import_parse';
import { buildPopulationContext, deriveJournalFlags, type DeriveOpts, type JetFlag } from './derive_flags';
import type { DiagCtx } from '../diagnostics';

export interface BuildCtxResult {
  ctx: DiagCtx;
  flaggedHigh: number;           // jurnal dgn ≥3 flag (kandidat jet-concentration)
  flagTally: Record<string, number>;
  journalCount: number;
}

export function buildDiagCtx(parsed: ParsedImport, opts: DeriveOpts = {}): BuildCtxResult {
  const pop = buildPopulationContext(parsed.gl, opts);
  const flagTally: Record<string, number> = {};

  const journalPop = parsed.gl.map(r => {
    const flags: JetFlag[] = deriveJournalFlags(r, pop);
    flags.forEach(f => { flagTally[f] = (flagTally[f] || 0) + 1; });
    return { id: r.id, amount: Math.abs(r.amount || 0), flags };
  });

  const ctx: DiagCtx = {
    journalPop,
    fig: { ...parsed.fiskal },     // Rp juta
    reconcileRows: [],             // rekonsiliasi lintas-modul di luar scope TB+GL minimum
  };

  return {
    ctx,
    flaggedHigh: journalPop.filter(j => (j.flags || []).length >= 3).length,
    flagTally,
    journalCount: journalPop.length,
  };
}
