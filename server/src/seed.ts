import { prisma } from './db';
import { loadAmsSeed, loadConnectorSeed } from './seedData';
import { hashPassword } from './auth/password';
import { PERSONAL_KEYS } from './personalScope';
// @ts-ignore — ../../migration/src/rbac is untyped canonical JS shared with the client.
import { ROLES, GRANTS } from '../../migration/src/rbac';

const FIRM_ID = 'FIRM-WHR';
const ACTIVE_ENG = 'ENG-2025-014'; // data.js WTB belongs to the active engagement

// W7 — one login account per RBAC role so authorization (and negative-authz tests) are
// meaningful. The primary user (Anindya, Audit Manager) stays FIRST so bootstrap's users[0]
// still feeds the client's window.AMS.USER hydration unchanged. Dev passwords are
// documented in BUILD.md — NOT production credentials.
type SeedUser = { id: string; name: string; initials: string; role: string; email: string; password: string; title?: string };
const EXTRA_USERS: SeedUser[] = [
  /* 2026-07-05 — PRD Isolasi Data Personal. Hartono (EMP-001) = Rekan Pemimpin (Managing Partner):
     satu-satunya yang melihat data personal SELURUH firma (cap *.viewFirm). Rudi (EMP-002, lead unit
     U-KOM) = Rekan otonom: lihat data personal UNIT-nya saja (*.viewUnit). Sari (EMP-003) tetap
     Engagement Partner default = self-only (mode tersentralisasi) — mendemokan ketiga tingkat. */
  { id: 'WHR-EP-0001', name: 'Hartono Wijaya', initials: 'HW', role: 'Rekan Pemimpin', email: 'hartono.w@whr-cpa.id', password: 'Partner#2025!', title: 'Rekan Pemimpin (Managing Partner)' },
  { id: 'WHR-EP-0002', name: 'Rudi Gunawan', initials: 'RG', role: 'Rekan', email: 'rudi.g@whr-cpa.id', password: 'Rekan#2025!', title: 'Rekan (Partner — Unit Komersial)' },
  { id: 'WHR-EP-0003', name: 'Sari Dewanti', initials: 'SD', role: 'Engagement Partner', email: 'sari.d@whr-cpa.id', password: 'Partner#2025!', title: 'Engagement Partner' },
  { id: 'WHR-SR-0210', name: 'Dimas Raharjo', initials: 'DR', role: 'Senior Auditor', email: 'dimas.r@whr-cpa.id', password: 'Senior#2025!', title: 'Senior Auditor' },
  /* EMP-022 — Senior yang deklarasi Kode Etik tahunannya BELUM sah (ETHICS_DECL seed: signed=false).
     Login demo untuk gerbang #3: sign-off WP & penerbitan opini diblokir hingga deklarasi sah /
     pengecualian Partner. email cocok dgn STAFF EMP-022 → resolveEmpId (ethics_gate). */
  { id: 'WHR-SR-0022', name: 'Sinta Wulandari', initials: 'SW', role: 'Senior Auditor', email: 'sinta.w@whr-cpa.id', password: 'Sinta#2025!', title: 'Senior Auditor' },
  { id: 'WHR-JR-0388', name: 'Fajar Nugroho', initials: 'FN', role: 'Junior Auditor', email: 'fajar.n@whr-cpa.id', password: 'Junior#2025!', title: 'Junior Auditor' },
  /* 2026-07-01 — dua peran firm-ops pertama (PRD Restrukturisasi Navigasi & Beranda Berbasis
     Peran, §0 OQ1). BUKAN staf audit: sengaja TIDAK ditambahkan ke A.TEAM/A.STAFF (roster itu
     audit-staffing shaped — grade/util/engagements/cert; lihat rbac.ts komentar ROLES) atau
     EngagementMember (mereka tak pernah anggota perikatan apa pun). Login mereka bekerja murni
     lewat User + dataJson di bawah. */
  { id: 'WHR-HR-0501', name: 'Yuni Marlina', initials: 'YM', role: 'Admin & HR Firma', email: 'yuni.m@whr-cpa.id', password: 'HrAdmin#2025!', title: 'Admin & HR Firma' },
  { id: 'WHR-FN-0601', name: 'Teguh Prasetyo', initials: 'TP', role: 'Finance Firma', email: 'teguh.p@whr-cpa.id', password: 'Finance#2025!', title: 'Finance Firma' },
];
// Dev password for the primary seed user (Anindya, Audit Manager).
const PRIMARY_PASSWORD = 'Manager#2025!';

async function main() {
  // Deploy-Readiness M5 — this is the DESTRUCTIVE [DEMO] seed (wipes 11 tables → repopulates demo
  // data). It must NEVER run against a real pilot DB. Fail-closed in production unless explicitly
  // forced; for provisioning a real firm use the non-destructive `npm run bootstrap` instead.
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_SEED !== '1') {
    console.error(
      '[DEMO] seed DITOLAK di NODE_ENV=production (destruktif — menghapus SEMUA data). ' +
        'Gunakan `npm run bootstrap` untuk provisioning firma nyata, atau set ALLOW_DEMO_SEED=1 hanya bila DB ini memang demo.',
    );
    process.exit(1);
  }
  console.warn('[DEMO] Menjalankan seed DESTRUKTIF — menghapus lalu mengisi ulang data demo…');
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
  await prisma.role.deleteMany();
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

  // RBAC admin console (PRD docs/prd-rbac-admin-console.md) — port the 6 roles from the OLD static
  // GRANTS map into the new DB-backed Role table, isBuiltIn=true (name/existence locked; capsJson
  // remains admin-editable via roles.updateGrants — PRD §11 Q2). This is what server.ts's
  // refreshRoleCache() hydrates from on next boot; running server instances only pick this up after
  // a restart (same "reseed → restart" operational nuance as every other seeded table here).
  for (const roleName of ROLES as string[]) {
    await prisma.role.create({
      data: { firmId: FIRM_ID, name: roleName, capsJson: JSON.stringify((GRANTS as Record<string, string[]>)[roleName] ?? []), isBuiltIn: true },
    });
  }

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

  // 2026-07-01 — seed StateDoc rows for the row-filtered `personal.get` read path (Fase 3,
  // PRD Restrukturisasi Navigasi & Beranda Berbasis Peran) so there is never a "version 0,
  // fall back to whatever the client computed locally" gap for these keys — the server is
  // the source of truth for personal records from first boot, not just after a first write.
  // (cpeExtra/indepAppr/indepRotAck are additive-only logs — {} is the correct empty state,
  // matching the client's own `() => ({})` initial value; left unseeded on purpose.)
  const seedIndepThreats = (rows: Array<{ id: string; conflicts: number; finInterest: string }>) =>
    rows.filter((r) => r.conflicts > 0).map((r) => ({
      id: 'TH-' + r.id, personId: r.id, type: 'Kedekatan', desc: r.finInterest,
      severity: 'Sedang', safeguard: 'Pengamanan diterapkan & didokumentasikan (telaah independen).',
      status: 'Dimitigasi', by: '', at: '',
    }));
  const Aany = A as unknown as {
    PAYROLL?: Record<string, unknown>; LEAVE_REQUESTS?: unknown[];
    PERF_CYCLE?: { people?: Record<string, unknown> };
    INDEPENDENCE?: Array<{ id: string; conflicts: number; finInterest: string }>;
    ETHICS_DECL?: Record<string, unknown>; GIFTS_REGISTER?: unknown[];
  };
  const personalSeed: Array<[string, unknown]> = [
    ['payrollData', Aany.PAYROLL ?? {}],
    ['leaveReqs', Aany.LEAVE_REQUESTS ?? []],
    ['perfPeople', Aany.PERF_CYCLE?.people ?? {}],
    ['independence', Aany.INDEPENDENCE ?? []],
    ['indepThreats', seedIndepThreats(Aany.INDEPENDENCE ?? [])],
    ['pc.ethics', Aany.ETHICS_DECL ?? {}],
    ['pc.gifts', Aany.GIFTS_REGISTER ?? []],
  ];
  for (const [key, value] of personalSeed) {
    if (!(key in PERSONAL_KEYS)) throw new Error(`personalSeed key "${key}" missing from PERSONAL_KEYS — keep them in sync`);
    await prisma.stateDoc.create({
      data: { scope: 'firm', scopeId: FIRM_ID, key, valueJson: JSON.stringify(value), version: 1, updatedBy: PRIMARY_ID },
    });
  }

  console.log(
    `Seeded: 1 firm, ${1 + EXTRA_USERS.length} users (1 per RBAC role, w/ dev passwords), ` +
      `${A.TEAM.length} team, ${A.CLIENTS.length} clients, ` +
      `${A.ENGAGEMENTS.length} engagements, ${A.WTB.length} WTB rows (${ACTIVE_ENG}), ` +
      `${memberships.length} engagement memberships, ${CONNECTORS.length} connectors, ` +
      `${personalSeed.length} personal-scope documents.`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
