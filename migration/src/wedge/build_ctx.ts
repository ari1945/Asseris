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
import { buildPopulationContext, deriveJournalFlags, type DeriveOpts, type JetFlag, type RawGlRow } from './derive_flags';
import { wtbOutliers } from './wedge_detectors';
import type { DiagCtx } from '../diagnostics';

/* Konvensi akun kas (COA Indonesia umum: 1-1xxx kas & setara) — untuk arah arus. */
function isCashAccount(acct?: string): boolean {
  const a = (acct || '').trim();
  return /^1-1[01]/.test(a) || /\b(kas|bank|setara kas)\b/i.test(a);
}
/** Arah kas relatif akun: 'out' bila kas dikreditkan (keluar), 'in' bila kas didebit. */
function cashDir(r: RawGlRow): string | undefined {
  if (isCashAccount(r.crAccount)) return 'out';
  if (isCashAccount(r.drAccount)) return 'in';
  return undefined;
}

export interface BuildCtxResult {
  ctx: DiagCtx;
  flaggedHigh: number;           // jurnal dgn ≥3 flag (kandidat jet-concentration)
  flagTally: Record<string, number>;
  journalCount: number;
  rptCount: number;              // arus kas keluar pihak berelasi berisiko (SA 550)
  wtbOutlierCount: number;       // temuan analitik TB (SA 520, via extraFindings)
}

export function buildDiagCtx(parsed: ParsedImport, opts: DeriveOpts = {}): BuildCtxResult {
  const pop = buildPopulationContext(parsed.gl, opts);
  const flagTally: Record<string, number> = {};

  const journalPop = parsed.gl.map(r => {
    const flags: JetFlag[] = deriveJournalFlags(r, pop);
    flags.forEach(f => { flagTally[f] = (flagTally[f] || 0) + 1; });
    const party = (r.party || '').trim();
    const dir = cashDir(r);
    // RPT (SA 550): bila ada pihak berelasi → set rpId/party/dir + forensic dari flag
    // sehingga detektor rpt-exposure eksisting menyala atas arus kas keluar berisiko.
    const rpId = party ? 'RP-' + party : undefined;
    return {
      id: r.id, amount: Math.abs(r.amount || 0), flags,
      party: party || undefined, rpId, dir,
      cash: isCashAccount(r.drAccount) || isCashAccount(r.crAccount),
      forensic: party && flags.length ? flags.slice() : undefined,
    };
  });

  const extraFindings = wtbOutliers(parsed.tb);   // SA 520 analitik pada neraca saldo (H2)

  const ctx: DiagCtx = {
    journalPop,
    fig: { ...parsed.fiskal },     // Rp juta
    reconcileRows: [],             // rekonsiliasi lintas-modul di luar scope TB+GL minimum
    extraFindings,
  };

  return {
    ctx,
    flaggedHigh: journalPop.filter(j => (j.flags || []).length >= 3).length,
    flagTally,
    journalCount: journalPop.length,
    rptCount: journalPop.filter(j => j.rpId && j.dir === 'out' && (j.forensic || []).length > 0).length,
    wtbOutlierCount: extraFindings.length,
  };
}
