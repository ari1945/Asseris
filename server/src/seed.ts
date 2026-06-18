import { prisma } from './db';
import { loadAmsSeed } from './seedData';

const FIRM_ID = 'FIRM-WHR';
const ACTIVE_ENG = 'ENG-2025-014'; // data.js WTB belongs to the active engagement

async function main() {
  const A = await loadAmsSeed();

  // Idempotent dev seed: clear in FK-safe order, then repopulate.
  await prisma.stateDoc.deleteMany();
  await prisma.wtbRow.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.client.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.firm.deleteMany();

  const f = A.FIRM as Record<string, unknown>;
  await prisma.firm.create({
    data: {
      id: FIRM_ID,
      name: A.FIRM.name,
      short: A.FIRM.short,
      license: (f.license as string) ?? null,
      partners: (f.partners as number) ?? 0,
      managers: (f.managers as number) ?? 0,
      staff: (f.staff as number) ?? 0,
    },
  });

  const u = A.USER as Record<string, unknown>;
  await prisma.user.create({
    data: {
      id: (u.employeeId as string) ?? 'USER-1',
      firmId: FIRM_ID,
      name: A.USER.name,
      initials: (u.initials as string) ?? null,
      role: A.USER.role,
      email: (u.email as string) ?? null,
      dataJson: JSON.stringify(A.USER),
    },
  });

  for (const t of A.TEAM) {
    await prisma.teamMember.create({
      data: { firmId: FIRM_ID, name: t.name, role: t.role, util: t.util ?? 0 },
    });
  }

  for (const c of A.CLIENTS) {
    await prisma.client.create({
      data: {
        id: c.id,
        firmId: FIRM_ID,
        name: c.name,
        industry: (c.industry as string) ?? null,
        tier: (c.tier as string) ?? null,
        risk: (c.risk as string) ?? null,
        npwp: (c.npwp as string) ?? null,
        city: (c.city as string) ?? null,
        listed: Boolean(c.listed),
        since: (c.since as number) ?? null,
        partner: (c.partner as string) ?? null,
        fee: (c.fee as number) ?? null,
        status: (c.status as string) ?? null,
      },
    });
  }

  for (const e of A.ENGAGEMENTS) {
    await prisma.engagement.create({
      data: {
        id: e.id,
        firmId: FIRM_ID,
        clientId: e.clientId,
        type: (e.type as string) ?? null,
        fy: (e.fy as string) ?? null,
        standard: (e.standard as string) ?? null,
        status: (e.status as string) ?? null,
        phase: (e.phase as string) ?? null,
        progress: (e.progress as number) ?? 0,
        partner: (e.partner as string) ?? null,
        manager: (e.manager as string) ?? null,
        deadline: (e.deadline as string) ?? null,
        budgetHrs: (e.budgetHrs as number) ?? null,
        actualHrs: (e.actualHrs as number) ?? null,
        risk: (e.risk as string) ?? null,
        materiality: (e.materiality as number) ?? null,
      },
    });
  }

  let ord = 0;
  for (const w of A.WTB) {
    await prisma.wtbRow.create({
      data: {
        engagementId: ACTIVE_ENG,
        ord: ord++,
        group: w.group,
        code: w.code,
        name: w.name,
        ly: (w.ly as number) ?? 0,
        unadj: (w.unadj as number) ?? 0,
        aje: (w.aje as number) ?? 0,
        lead: (w.lead as string) ?? null,
      },
    });
  }

  console.log(
    `Seeded: 1 firm, 1 user, ${A.TEAM.length} team, ${A.CLIENTS.length} clients, ` +
      `${A.ENGAGEMENTS.length} engagements, ${A.WTB.length} WTB rows (${ACTIVE_ENG}).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
