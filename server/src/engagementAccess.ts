// W7.5 — per-engagement data isolation. The enforcement boundary that complements W7's
// capability gate: capabilities say "what actions a role may do", this says "which engagements
// a user may touch the working data of". A user has access iff their role has
// ENGAGEMENT_VIEW_ALL (Partner/Manager oversight) OR they are a row in EngagementMember.
import { TRPCError } from '@trpc/server';
import { prisma } from './db';
import { can, CAP } from './rbac';

type Principal = { id: string; role: string };

/** True if (userId, engagementId) is a membership row. */
export async function isEngagementMember(userId: string, engagementId: string): Promise<boolean> {
  const m = await prisma.engagementMember.findUnique({
    where: { engagementId_userId: { engagementId, userId } },
  });
  return m !== null;
}

/** Throw FORBIDDEN unless the user may access this engagement's working data. */
export async function assertEngagementAccess(user: Principal, engagementId: string): Promise<void> {
  if (can(user.role, CAP.ENGAGEMENT_VIEW_ALL)) return;
  if (await isEngagementMember(user.id, engagementId)) return;
  throw new TRPCError({ code: 'FORBIDDEN', message: 'not-engagement-member' });
}

/** The engagements a user may access: 'all' for oversight roles, else the member id list. */
export async function accessibleEngagementIds(user: Principal): Promise<'all' | string[]> {
  if (can(user.role, CAP.ENGAGEMENT_VIEW_ALL)) return 'all';
  const rows = await prisma.engagementMember.findMany({
    where: { userId: user.id },
    select: { engagementId: true },
  });
  return rows.map((r) => r.engagementId);
}
