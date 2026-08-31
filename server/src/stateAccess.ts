import { TRPCError } from '@trpc/server';
import { prisma } from './db';
import { assertEngagementAccess, assertFirmScoped } from './engagementAccess';
import { PERSONAL_KEYS } from './personalScope';
import { can, CAP } from './rbac';

export type StateReadTarget = {
  scope: 'engagement' | 'firm' | 'user';
  scopeId: string;
  key: string;
};

/* D3 (fail-closed tenancy) — firmId WAJIB. Lihat catatan pada Principal di engagementAccess.ts:
   selama ia opsional, pembaca tanpa firmId melewati SETIAP cek lintas-firma di berkas ini. */
type StateReader = {
  id: string;
  firmId: string;
  role: string;
};

/*
 * Firm documents are deliberately opt-in. This list is the compatibility surface of
 * the existing client, not a wildcard: a newly introduced key stays unreadable until
 * it is classified here (or moved to engagement/user scope). Personal keys are never
 * included because they must go through personal.get's row filter.
 */
export const FIRM_STATE_READ_KEYS = new Set([
  'clients', 'engagements', 'prospects', 'continuanceDecisions', 'priorYear',
  'schedule', 'capacityPlan.v1', 'deliveryPlan.v1', 'pbc.v2', 'portalMsgs.v2',
  'dms.v2', 'eqrReviews.v2', 'soqmRisks', 'complaints.v2', 'auditcomm.done.v1',
  'ethicsOverride.v1', 'trainingAttendance.v1', 'payrollRun', 'payrollSent.v1',
  'staffExtra', 'pc.cands', 'pc.onboard', 'pc.enroll', 'pipeline', 'invoices',
  'firmgl', 'firmap', 'firmtax', 'bankrecon', 'bankFeed', 'taxFeed', 'wip.adj',
  'framework.judgements.v1',
  'integrations3', 'importmode', 'settings', 'settingsTab', 'rbacConfig',

  // Legacy client keys that are still intentionally persisted at firm scope.
  'approvals_ov_v3', 'ar.sub.ch', 'ar.sub.rate', 'ar.sub.ratio', 'ar.sub.thrA',
  'ar.sub.thrB', 'ar.sub.thrC', 'dd.tab', 'disclosure.status', 'forensic.unit',
  'fsgen.basis', 'fsgen.cfMethod', 'fsgen.comparative', 'fsgen.disclosures',
  'fsgen.rounding', 'fsgen.unit', 'gaComps', 'gaConsolProc', 'gaElimVerify',
  'gaFindings', 'gaPackages', 'isak35.comparative', 'isak35.disc',
  'isak35.expenseView', 'isak35.proc', 'isak35.tab', 'isak35.unit',
  'mt.meta', 'mt.personal', 'mt.view', 'presentasi.included.v1',
  'psak1.comps.v1', 'psak1.disc.v1', 'psak1.feats.v1', 'psak1.lpl.v1',
  'psak1.lsofp.v1', 'psak117.done.v1', 'psak14.disc.v1', 'psak14.formula.v1',
  'psak16.disc.v1', 'psak16.impair.v1', 'psak16.measure.v1', 'psak19.crit.v1',
  'psak19.disc.v1', 'psak19.impair.v1', 'psak19.measure.v1', 'psak2.disc.v1',
  'psak2.method.v1', 'psak22.done.v1', 'psak24.doneA.v1', 'psak24.doneN.v1',
  'psak25.disc.v1', 'psak25.proc.v1', 'psak46.doneD.v1', 'psak46.doneS.v1',
  'psak48.done.v1', 'psak58.crit.v1', 'psak58.disc.v1', 'psak65.done.v1',
  'psak65.elim.v1', 'psak66.disc.v1', 'psak68.done.v1', 'psak71.done.v1',
  'psak71.probs.v1', 'psak72.disc.v1', 'psak72.proc.v1',
  'review2400concl', 'review2400inq', 'sakroadmap.r207.v1', 'sectorck.done.v1',
  'spr2410.concl.v1', 'sustain.done.v1', 'syariah.done.v1', 'tax23.extra',
  'tax23.ov', 'aup4400.custom', 'aup4400.docs', 'aup4400.exec', 'ghg3410.exec',
  'pf3420.exec', 'pfi3400.exec', 'soc3402.exec',

  // Read-through only for data written before these keys moved to engagement scope.
  'mat.appliedOverride', 'mat.benchId', 'mat.components', 'mat.cttPct',
  'mat.memo.signoff', 'mat.pct', 'mat.pmPct', 'mat.quals', 'mat.revisions',
  'mat.specifics', 'mat.tab',
]);

function isAllowlistedFirmKey(key: string): boolean {
  if (FIRM_STATE_READ_KEYS.has(key)) return true;
  // The only dynamic firm key currently emitted by the client.
  return /^firmAttest\.soqmAnnualEval\.\d{4}$/.test(key);
}

async function assertSameFirmUser(reader: StateReader, targetUserId: string): Promise<void> {
  const firmId = assertFirmScoped(reader);
  const target = await prisma.user.findUnique({ where: { id: targetUserId }, select: { firmId: true } });
  if (!target || target.firmId !== firmId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-firm-user' });
  }
}

/** Central read boundary for every StateDoc read exposed to a caller. */
export async function assertStateDocRead(
  reader: StateReader,
  target: StateReadTarget,
  options: { personal?: boolean } = {},
): Promise<void> {
  const personalKey = target.key in PERSONAL_KEYS;
  if (personalKey && !options.personal) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'personal-filter-required' });
  }
  if (options.personal && (!personalKey || target.scope !== 'firm')) {
    throw new TRPCError({ code: 'BAD_REQUEST', message: 'personal-read-requires-firm-personal-key' });
  }

  if (target.scope === 'user') {
    if (target.scopeId === reader.id) return;
    if (!can(reader.role, CAP.FIRM_ADMIN)) {
      throw new TRPCError({ code: 'FORBIDDEN', message: 'not-owner' });
    }
    await assertSameFirmUser(reader, target.scopeId);
    return;
  }

  if (target.scope === 'engagement') {
    await assertEngagementAccess(reader, target.scopeId);
    return;
  }

  if (target.scopeId !== assertFirmScoped(reader)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-firm-state' });
  }
  if (options.personal) return;
  if (!isAllowlistedFirmKey(target.key)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'firm-key-not-allowlisted' });
  }
}
