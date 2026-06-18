import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

// W7 Fase 1 — state.* now require a session. Inject a Partner (all capabilities) so this
// suite tests compare-and-swap, not authorization (that is authz.test.ts).
const partner = { id: 'TEST-PARTNER', role: 'Engagement Partner' } as unknown as User;
const caller = createCallerFactory(appRouter)({ user: partner, token: 'test' });

describe('StateDoc optimistic-concurrency (compare-and-swap)', () => {
  const scope = 'engagement' as const;
  const scopeId = 'TEST-ENG';
  const key = 'cas-probe';

  beforeAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
  });
  afterAll(async () => {
    await prisma.stateDoc.deleteMany({ where: { scope, scopeId } });
    await prisma.$disconnect();
  });

  it('creates a fresh doc at version 1 (baseVersion 0)', async () => {
    const r = await caller.state.set({ scope, scopeId, key, value: { a: 1 }, baseVersion: 0 });
    expect(r.version).toBe(1);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got).toEqual({ value: { a: 1 }, version: 1 });
  });

  it('updates with the current version (1 → 2)', async () => {
    const r = await caller.state.set({ scope, scopeId, key, value: { a: 2 }, baseVersion: 1 });
    expect(r.version).toBe(2);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.value).toEqual({ a: 2 });
    expect(got.version).toBe(2);
  });

  it('rejects a stale write (baseVersion 1 when server is 2) with CONFLICT, value unchanged', async () => {
    await expect(
      caller.state.set({ scope, scopeId, key, value: { a: 99 }, baseVersion: 1 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.value).toEqual({ a: 2 });
    expect(got.version).toBe(2);
  });

  it('rejects creating over an existing doc (baseVersion 0) with CONFLICT', async () => {
    await expect(
      caller.state.set({ scope, scopeId, key, value: { a: 0 }, baseVersion: 0 }),
    ).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('serializes concurrent writes — exactly one of two racing writers wins', async () => {
    // Both read version 2 and try to advance to 3; CAS must let exactly one through.
    const results = await Promise.allSettled([
      caller.state.set({ scope, scopeId, key, value: { a: 'A' }, baseVersion: 2 }),
      caller.state.set({ scope, scopeId, key, value: { a: 'B' }, baseVersion: 2 }),
    ]);
    const ok = results.filter((r) => r.status === 'fulfilled');
    const conflict = results.filter((r) => r.status === 'rejected');
    expect(ok).toHaveLength(1);
    expect(conflict).toHaveLength(1);
    const got = await caller.state.get({ scope, scopeId, key });
    expect(got.version).toBe(3);
  });

  it('get on a missing key returns version 0 / null', async () => {
    const got = await caller.state.get({ scope, scopeId, key: 'does-not-exist' });
    expect(got).toEqual({ value: null, version: 0 });
  });
});
