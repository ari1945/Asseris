import { prisma } from './db';
import { loadAmsSeed, loadConnectorSeed } from './seedData';
import { hashPassword } from './auth/password';

const FIRM_ID = 'FIRM-WHR';
const ACTIVE_ENG = 'ENG-2025-014'; // data.js WTB belongs to the active engagement

// W7 — one login account per RBAC role so authorization (and negative-authz tests) are
// meaningful. The primary user (Anindya, Audit Manager) stays FIRST so bootstrap's users[0]
// still feeds the client's window.AMS.USER hydration unchanged. Dev passwords are
// documented in BUILD.md — NOT production credentials.
type SeedUser = { id: string; name: string; initials: string; role: string; email: string; password: string; title?: string };
const EXTRA_USERS: SeedUser[] = [
  { id: 'WHR-EP-0001', name: 'Hartono Wijaya', initials: 'HW', role: 'Engagement Partner', email: 'hartono.w@whr-cpa.id', password: 'Partner#2025!', title: 'Engagement Partner' },
  { id: 'WHR-SR-0210', name: 'Dimas Raharjo', initials: 'DR', role: 'Senior Auditor', email: 'dimas.r@whr-cpa.id', password: 'Senior#2025!', title: 'Senior Auditor' },
  { id: 'WHR-JR-0388', name: 'Fajar Nugroho', initials: 'FN', role: 'Junior Auditor', email: 'fajar.n@whr-cpa.id', password: 'Junior#2025!', title: 'Junior Auditor' },
];
// Dev password for the primary seed user (Anindya, Audit Manager).
const PRIMARY_PASSWORD = 'Manager#2025!';

async function main() {
  const A = await loadAmsSeed();

  // Idempotent dev seed: clear in FK-safe order, then repopulate. Session/AuthEvent reference
  // User, so they must be cleared before users (otherwise a re-seed after anyone has logged in
  // trips a foreign-key violation).
  await prisma.stateDoc.deleteMany();
  await prisma.connectorToken.deleteMany();
  await prisma.syncJob.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.engagementMember.deleteMany();
  await prisma.wtbRow.deleteMany();
  await prisma.engagement.deleteMany();
  await prisma.client.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.session.deleteMany();
  await prisma.authEvent.deleteMany();
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
  const PRIMARY_ID = (u.employeeId as string) ?? 'USER-1'; // Anindya (Audit Manager)
  // Primary user first (preserves bootstrap users[0] → client window.AMS.USER hydration).
  await prisma.user.create({
    data: {
      id: PRIMARY_ID,
      firmId: FIRM_ID,
      name: A.USER.name,
      initials: (u.initials as string) ?? null,
      role: A.USER.role,
      email: (u.email as string) ?? null,
      dataJson: JSON.stringify(A.USER),
      passwordHash: await hashPassword(PRIMARY_PASSWORD),
    },
  });

  for (const su of EXTRA_USERS) {
    await prisma.user.create({
      data: {
        id: su.id,
        firmId: FIRM_ID,
        name: su.name,
        initials: su.initials,
        role: su.role,
        email: su.email,
        dataJson: JSON.stringify({ name: su.name, initials: su.initials, role: su.role, email: su.email, employeeId: su.id, title: su.title }),
        passwordHash: await hashPassword(su.password),
      },
    });
  }

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

  // W7.5 — engagement memberships. All four accounts join the active demo engagement
  // (ENG-2025-014) so boot (which always bootstraps it) works for everyone. The Senior also
  // joins a second engagement (ENG-2025-031) to demonstrate isolation: Junior is NOT a member
  // of it, so Junior→ENG-2025-031 is FORBIDDEN while Senior→ENG-2025-031 is allowed.
  // (Partner+Manager have ENGAGEMENT_VIEW_ALL → they see all regardless; their rows here are
  // explicit-but-redundant, kept for clarity/robustness.)
  const SECOND_ENG = 'ENG-2025-031';
  const memberships: Array<{ engagementId: string; userId: string }> = [
    { engagementId: ACTIVE_ENG, userId: PRIMARY_ID }, // Anindya (Manager)
    { engagementId: ACTIVE_ENG, userId: 'WHR-EP-0001' }, // Hartono (Partner)
    { engagementId: ACTIVE_ENG, userId: 'WHR-SR-0210' }, // Dimas (Senior)
    { engagementId: ACTIVE_ENG, userId: 'WHR-JR-0388' }, // Fajar (Junior)
    { engagementId: SECOND_ENG, userId: 'WHR-SR-0210' }, // Senior also on a 2nd engagement
  ];
  for (const m of memberships) {
    await prisma.engagementMember.create({ data: m });
  }

  // W9 — connectors, seeded byte-faithfully from the client blueprint (window.IMPORT.CONNECTORS).
  // Definitions only (identity/target/scopes/mapping + lossless display envelope); no adapter is
  // wired yet (wired=false). Fase 1 flips one connector's `wired` and drives it via a real adapter.
  const CONNECTORS = await loadConnectorSeed();
  for (const c of CONNECTORS) {
    await prisma.connector.create({
      data: {
        id: c.id,
        name: c.name,
        category: c.cat,
        target: c.target,
        status: c.status,
        auth: c.auth ?? null,
        endpoint: c.endpoint ?? null,
        schedule: c.schedule ?? null,
        scopesJson: JSON.stringify(c.scopes ?? []),
        mappingJson: JSON.stringify(c.mapping ?? []),
        metaJson: JSON.stringify({
          desc: c.desc ?? null,
          icon: c.icon ?? null,
          expiry: c.expiry ?? null,
          uptime: c.uptime ?? 0,
          latency: c.latency ?? 0,
          vol: c.vol ?? 0,
          last: c.last ?? null,
          webhooks: c.webhooks ?? [],
          syncs: c.syncs ?? [],
        }),
        wired: false,
      },
    });
  }

  console.log(
    `Seeded: 1 firm, ${1 + EXTRA_USERS.length} users (1 per RBAC role, w/ dev passwords), ` +
      `${A.TEAM.length} team, ${A.CLIENTS.length} clients, ` +
      `${A.ENGAGEMENTS.length} engagements, ${A.WTB.length} WTB rows (${ACTIVE_ENG}), ` +
      `${memberships.length} engagement memberships, ${CONNECTORS.length} connectors.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
