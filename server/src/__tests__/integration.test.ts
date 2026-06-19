import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { loadConnectorSeed } from '../seedData';
import { encryptSecret } from '../crypto/secretbox';
import { runBankSync, reconcileBank } from '../integrations/sync';
import { applyMapping } from '../integrations/mapping';
import { pullBankStatementBroken } from '../integrations/providers/bankFixture';
import { readBankHttpConfig, makeHttpBankPull } from '../integrations/providers/httpBank';
import { handleWebhook, signWebhook, canonicalBody, webhookSecret } from '../integrations/webhook';

const ENV_KEYS = ['BANK_API_BASE_URL', 'BANK_API_TOKEN', 'BANK_API_ACCOUNT', 'INTEGRATION_WEBHOOK_SECRET'] as const;
function clearEnv() {
  for (const k of ENV_KEYS) delete process.env[k];
}

afterEach(() => {
  vi.restoreAllMocks();
  clearEnv();
});

// A fetch double recording the outgoing request and returning a canned bank response.
function mockFetch(body: unknown, ok = true, status = 200) {
  const calls: { url: string; init: RequestInit }[] = [];
  const fn = vi.fn(async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    return { ok, status, json: async () => body, text: async () => JSON.stringify(body) } as Response;
  });
  return { fn: fn as unknown as typeof fetch, calls };
}

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
  await prisma.stateDoc.deleteMany({ where: { scope: 'firm', scopeId: 'FIRM-WHR', key: 'bankFeed' } });
  await prisma.syncJob.deleteMany();
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
    expect(mgr.wired).toBe(0); // nothing synced yet (runs in the Fase 1 block below)

    const jr = await callerAs('Junior Auditor', 'U-jr2').integration.status();
    expect(jr.canView).toBe(true);
    expect(jr.canManage).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// W9 Fase 1 — the sync runner: pull → map → validate → control-total gate → idempotent post.
const FIRM_BANK_STATE = { scope: 'firm', scopeId: 'FIRM-WHR', key: 'bankFeed' } as const;

async function resetBankPipeline() {
  await prisma.stateDoc.deleteMany({ where: FIRM_BANK_STATE });
  await prisma.syncJob.deleteMany({ where: { connectorId: 'bank' } });
}

describe('field mapping engine', () => {
  it('projects a raw record onto only its mapped target fields, dropping the rest', () => {
    const mapping: Array<[string, string]> = [['Tgl Transaksi', 'value_date'], ['Nominal', 'amount']];
    const raw = { value_date: '2026-03-10', amount: 500, account_no: 'X', smuggled: 'nope' };
    const out = applyMapping(mapping, raw);
    expect(out).toEqual({ value_date: '2026-03-10', amount: 500 });
    expect(out).not.toHaveProperty('account_no'); // unmapped key dropped
    expect(out).not.toHaveProperty('smuggled');
  });
});

describe('bank sync runner (end-to-end against the fixture adapter)', () => {
  it('pulls → maps → control-total gate passes → posts to the cashbank SSOT, tied', async () => {
    await resetBankPipeline();
    const r = await runBankSync({ id: 'U-mgr', role: 'Audit Manager' });
    expect(r.status).toBe('posted');
    expect(r.gatePassed).toBe(true);
    expect(r.rows).toBe(5);
    expect(r.valid).toBe(5);
    expect(r.rejected).toBe(0);
    expect(r.posted).toBe(5);
    expect(r.consumed).toBe(5);
    expect(r.tied).toBe(true); // posted == consumed: SSOT holds exactly what we posted

    // The data really landed in the firm-scoped StateDoc the cashbank module reads.
    const doc = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: FIRM_BANK_STATE } });
    expect(doc).not.toBeNull();
    const state = JSON.parse(doc!.valueJson) as { transactions: Record<string, unknown>; closingBalance: number };
    expect(Object.keys(state.transactions)).toHaveLength(5);
    expect(state.closingBalance).toBe(1_500_000);

    // First successful post marks the connector wired.
    const conn = await prisma.connector.findUnique({ where: { id: 'bank' } });
    expect(conn?.wired).toBe(true);
  });

  it('is idempotent — re-running posts the same rows with zero duplication', async () => {
    await resetBankPipeline();
    const first = await runBankSync({ id: 'U-mgr', role: 'Audit Manager' });
    const second = await runBankSync({ id: 'U-mgr', role: 'Audit Manager' });
    expect(first.consumed).toBe(5);
    expect(second.consumed).toBe(5); // NOT 10 — merged by natural key
    expect(second.posted).toBe(5);
    expect(second.tied).toBe(true);
    const doc = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: FIRM_BANK_STATE } });
    const state = JSON.parse(doc!.valueJson) as { transactions: Record<string, unknown> };
    expect(Object.keys(state.transactions)).toHaveLength(5);
  });

  it('control-total gate BLOCKS posting when the balance does not tie (staged, nothing posted)', async () => {
    await resetBankPipeline();
    const r = await runBankSync({ id: 'U-mgr', role: 'Audit Manager' }, pullBankStatementBroken);
    expect(r.status).toBe('staged');
    expect(r.gatePassed).toBe(false);
    expect(r.posted).toBe(0);
    expect(r.tied).toBe(false);
    expect(r.note).toMatch(/gagal/i);
    // The SSOT must be untouched — tainted data did not get in.
    const doc = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: FIRM_BANK_STATE } });
    expect(doc).toBeNull();
  });

  it('reconcileBank reports the import↔consumption tie-out', async () => {
    await resetBankPipeline();
    await runBankSync({ id: 'U-mgr', role: 'Audit Manager' });
    const recon = await reconcileBank();
    expect(recon).toMatchObject({ connectorId: 'bank', target: 'cashbank', posted: 5, consumed: 5, tied: true, closingBalance: 1_500_000 });
  });

  it('appends a SYNC row to the audit chain (metadata only, no content)', async () => {
    await resetBankPipeline();
    await runBankSync({ id: 'U-audit-sync', role: 'Audit Manager' });
    const ev = await prisma.auditLog.findFirst({ where: { action: 'SYNC', actorUserId: 'U-audit-sync' }, orderBy: { seq: 'desc' } });
    expect(ev).not.toBeNull();
    expect(ev?.scopeId).toBe('FIRM-WHR');
    expect(ev?.key).toBe('bank');
    expect(ev?.detail).toContain('posted=5');
    expect(ev?.detail).toContain('gate=true');
  });
});

describe('integration.sync router (RBAC + wiring)', () => {
  it('manager (INTEGRATION_MANAGE) can trigger sync; junior is FORBIDDEN', async () => {
    await resetBankPipeline();
    await expect(callerAs('Junior Auditor', 'U-jr3').integration.sync({ connectorId: 'bank' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    const r = await callerAs('Audit Manager', 'U-mgr2').integration.sync({ connectorId: 'bank' });
    expect(r.status).toBe('posted');
    expect(r.tied).toBe(true);
  });

  it('an unwired connector id → BAD_REQUEST', async () => {
    await expect(callerAs('Audit Manager', 'U-mgr3').integration.sync({ connectorId: 'coretax' })).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });

  it('jobs + reconcile are VIEW-gated and reflect runs', async () => {
    await resetBankPipeline();
    await callerAs('Audit Manager', 'U-mgr4').integration.sync({ connectorId: 'bank' });
    const jobs = await callerAs('Junior Auditor', 'U-jr4').integration.jobs({ connectorId: 'bank' });
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs[0].status).toBe('posted');
    const recon = await callerAs('Junior Auditor', 'U-jr4').integration.reconcile();
    expect(recon.bank.tied).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// W9 Fase 2 — HTTP adapter (drop-in for the fixture) + webhook receiver.
describe('http bank adapter (shape proven against a mock fetch, no credentials)', () => {
  it('readBankHttpConfig is null until base URL + token are set', () => {
    expect(readBankHttpConfig({} as NodeJS.ProcessEnv)).toBeNull();
    expect(readBankHttpConfig({ BANK_API_BASE_URL: 'https://openapi.bca.co.id/v2' } as NodeJS.ProcessEnv)).toBeNull();
    const cfg = readBankHttpConfig({ BANK_API_BASE_URL: 'https://openapi.bca.co.id/v2', BANK_API_TOKEN: 'tok' } as NodeJS.ProcessEnv);
    expect(cfg).toMatchObject({ baseUrl: 'https://openapi.bca.co.id/v2', token: 'tok' });
  });

  it('makeHttpBankPull GETs /statements with Bearer and parses opening/closing/raw', async () => {
    const m = mockFetch({
      opening_balance: 1_000_000,
      closing_balance: 1_500_000,
      transactions: [{ txn_id: 'X1', value_date: '2026-03-10', amount: 500_000 }],
    });
    const pull = makeHttpBankPull({ baseUrl: 'https://api.bank/v2', token: 'secret-bank-tok' }, m.fn);
    const statement = await pull();
    expect(statement.openingBalance).toBe(1_000_000);
    expect(statement.closingBalance).toBe(1_500_000);
    expect(statement.raw).toHaveLength(1);
    expect(m.calls[0].url).toBe('https://api.bank/v2/statements');
    expect((m.calls[0].init.headers as Record<string, string>).authorization).toBe('Bearer secret-bank-tok');
  });
});

describe('webhook receiver (HMAC-authenticated, triggers the same gated sync)', () => {
  it('webhookSecret/handleWebhook degrade gracefully when no secret is configured', async () => {
    clearEnv();
    expect(webhookSecret()).toBeNull();
    const r = await handleWebhook({ connectorId: 'bank', event: 'transaction.posted' });
    expect(r).toEqual({ status: 'not-configured' });
  });

  it('rejects a missing or wrong signature with UNAUTHORIZED', async () => {
    process.env.INTEGRATION_WEBHOOK_SECRET = 'whsec';
    await expect(handleWebhook({ connectorId: 'bank', event: 'transaction.posted' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(handleWebhook({ connectorId: 'bank', event: 'transaction.posted', signature: 'deadbeef' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('valid signature + a sync-triggering event runs the gated/idempotent sync', async () => {
    await resetBankPipeline();
    process.env.INTEGRATION_WEBHOOK_SECRET = 'whsec';
    const input = { connectorId: 'bank', event: 'transaction.posted' as const };
    const signature = signWebhook('whsec', canonicalBody(input));
    const r = await handleWebhook({ ...input, signature });
    expect(r.status).toBe('ok');
    expect(r.status === 'ok' && r.synced).toBe(true);
    expect(r.status === 'ok' && r.job?.tied).toBe(true);
    // It went through the real runner — a system-actor SYNC row is in the audit chain.
    const ev = await prisma.auditLog.findFirst({ where: { action: 'SYNC', actorUserId: 'system:webhook' }, orderBy: { seq: 'desc' } });
    expect(ev).not.toBeNull();
  });

  it('valid signature + a non-triggering event is acknowledged without syncing', async () => {
    process.env.INTEGRATION_WEBHOOK_SECRET = 'whsec';
    const input = { connectorId: 'bank', event: 'balance.threshold' as const };
    const signature = signWebhook('whsec', canonicalBody(input));
    const r = await handleWebhook({ ...input, signature });
    expect(r).toMatchObject({ status: 'ok', synced: false });
  });

  it('router.postWebhook is public (no session) and honors the signature', async () => {
    await resetBankPipeline();
    process.env.INTEGRATION_WEBHOOK_SECRET = 'whsec';
    const input = { connectorId: 'bank', event: 'transaction.posted' as const };
    const signature = signWebhook('whsec', canonicalBody(input));
    const r = await anon.integration.postWebhook({ ...input, signature });
    expect(r.status === 'ok' && r.synced).toBe(true);
  });
});
