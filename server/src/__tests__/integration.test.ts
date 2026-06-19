import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { loadConnectorSeed } from '../seedData';
import { encryptSecret } from '../crypto/secretbox';

// Same injection trick as llm.test.ts — the integration gates read only ctx.user.{id,role}.
function callerAs(role: string, id = `U-${role}`) {
  const user = { id, role, email: `${id}@test` } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}
const anon = createCallerFactory(appRouter)({ user: null, token: null });

// Two representative connectors inserted directly (the test DB is schema-only; the full seed
// does not run here). 'bank' is connected with a stored (encrypted) token — its secret must
// never appear in the read-model. 'emeterai' is an available, mapping-less connector.
const SECRET_TOKEN = 'super-secret-access-token-xyz';

beforeAll(async () => {
  await prisma.connectorToken.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.connector.create({
    data: {
      id: 'bank',
      name: 'Bank Feed (BCA · Mandiri)',
      category: 'Keuangan',
      target: 'cashbank',
      status: 'connected',
      auth: 'OAuth 2.0 · mTLS',
      endpoint: 'openapi.{bank}.co.id/v2/statements',
      schedule: 'Tiap 15 menit',
      scopesJson: JSON.stringify(['account.balance', 'statement.read']),
      mappingJson: JSON.stringify([['Tgl Transaksi', 'value_date'], ['Nominal', 'amount']]),
      metaJson: JSON.stringify({ icon: 'building', uptime: 99.9, webhooks: [['transaction.posted', true]] }),
      wired: false,
    },
  });
  await prisma.connector.create({
    data: {
      id: 'emeterai',
      name: 'e-Meterai Peruri',
      category: 'Dokumen',
      target: 'opinion',
      status: 'available',
      scopesJson: JSON.stringify(['meterai.affix']),
      mappingJson: JSON.stringify([]),
      metaJson: JSON.stringify({ icon: 'lock' }),
      wired: false,
    },
  });
  await prisma.connectorToken.create({
    data: { connectorId: 'bank', kind: 'oauth', secretEnc: encryptSecret(JSON.stringify({ accessToken: SECRET_TOKEN })) },
  });
});

afterAll(async () => {
  await prisma.connectorToken.deleteMany();
  await prisma.connector.deleteMany();
  await prisma.$disconnect();
});

// ---------------------------------------------------------------------------
describe('connector seed blueprint (byte-faithful source)', () => {
  it('loads the full prototype connector blueprint without touching feedCounts', async () => {
    const seed = await loadConnectorSeed();
    expect(seed.length).toBeGreaterThanOrEqual(8);
    const bank = seed.find((c) => c.id === 'bank');
    expect(bank).toBeDefined();
    expect(bank?.target).toBe('cashbank'); // bank posts into the cashbank SSOT
    expect(bank?.mapping?.length).toBeGreaterThan(0);
    const coretax = seed.find((c) => c.id === 'coretax');
    expect(coretax?.target).toBe('firmtax');
  });
});

// ---------------------------------------------------------------------------
describe('integration router (auth + RBAC + secret egress)', () => {
  it('anonymous → UNAUTHORIZED', async () => {
    await expect(anon.integration.list()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.integration.status()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('deny-by-default: an unknown role → FORBIDDEN on list', async () => {
    await expect(callerAs('Observer', 'U-obs').integration.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('INTEGRATION_VIEW role → registry with parsed scopes/mapping; NO stored secret', async () => {
    const list = await callerAs('Junior Auditor', 'U-jr').integration.list();
    const bank = list.find((c) => c.id === 'bank');
    expect(bank).toBeDefined();
    expect(bank?.target).toBe('cashbank');
    expect(bank?.scopes).toEqual(['account.balance', 'statement.read']);
    expect(bank?.mapping[0]).toEqual(['Tgl Transaksi', 'value_date']);
    expect(bank?.wired).toBe(false);
    // The encrypted token must never ride along in the client-safe view.
    const serialized = JSON.stringify(list);
    expect(serialized).not.toContain(SECRET_TOKEN);
    expect(serialized).not.toContain('secretEnc');
  });

  it('status: manager can manage, junior can only view', async () => {
    const mgr = await callerAs('Audit Manager', 'U-mgr').integration.status();
    expect(mgr.canView).toBe(true);
    expect(mgr.canManage).toBe(true);
    expect(mgr.total).toBe(2);
    expect(mgr.connected).toBe(1);
    expect(mgr.wired).toBe(0);

    const jr = await callerAs('Junior Auditor', 'U-jr2').integration.status();
    expect(jr.canView).toBe(true);
    expect(jr.canManage).toBe(false);
  });
});
