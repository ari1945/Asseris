// CI acceptance gate for a freshly migrated Postgres instance. This runs inside the production
// image after demo provisioning and exercises the application boundary (not raw SQL): login,
// StateDoc CAS, attachment upload/download, and audit-chain verification.
import './env';
import { createHash } from 'node:crypto';
import { appRouter } from './router';
import { createCallerFactory } from './trpc';
import { contextForToken } from './context';
import { prisma } from './db';
import { refreshRoleCache } from './roleStore';

function invariant(value: unknown, message: string): asserts value {
  if (!value) throw new Error(`deployment-smoke:${message}`);
}

async function main(): Promise<void> {
  await refreshRoleCache();
  const makeCaller = createCallerFactory(appRouter);
  let sessionToken = '';
  const anonymous = makeCaller({
    user: null, token: null,
    setCookie(cookie: string) {
      const match = /ams_session=([^;]+)/.exec(cookie);
      if (match) sessionToken = decodeURIComponent(match[1]);
    },
  });
  const login = await anonymous.auth.login({
    email: 'hartono.w@whr-cpa.id',
    password: 'Partner#2025!',
  });
  invariant(!('token' in login), 'login-body-leaked-token');
  invariant(sessionToken, 'login-no-session-cookie');

  const ctx = await contextForToken(sessionToken);
  invariant(ctx.user, 'session-not-resolved');
  const caller = makeCaller(ctx);

  const engagement = await prisma.engagement.findFirst({ orderBy: { id: 'asc' }, select: { id: true } });
  invariant(engagement, 'no-engagement-after-seed');

  const stateKey = { scope: 'engagement' as const, scopeId: engagement.id, key: 'deployment.smoke' };
  const before = await caller.state.get(stateKey);
  const expected = { saved: true, marker: 'fresh-postgres' };
  const written = await caller.state.set({ ...stateKey, value: expected, baseVersion: before.version });
  const after = await caller.state.get(stateKey);
  invariant(after.version === written.version, 'state-version-mismatch');
  invariant(JSON.stringify(after.value) === JSON.stringify(expected), 'state-roundtrip-mismatch');

  const bytes = Buffer.from('attachment smoke on freshly migrated postgres', 'utf8');
  const sha256 = createHash('sha256').update(bytes).digest('hex');
  const uploaded = await caller.attachment.upload({
    scope: 'engagement',
    scopeId: engagement.id,
    collection: 'deployment-smoke',
    name: 'smoke.txt',
    mime: 'text/plain',
    sha256,
    dataBase64: bytes.toString('base64'),
  });
  const downloaded = await caller.attachment.download({ id: uploaded.id });
  invariant(downloaded.sha256 === sha256, 'attachment-sha-mismatch');
  invariant(Buffer.from(downloaded.dataBase64, 'base64').equals(bytes), 'attachment-bytes-mismatch');

  const audit = await caller.audit.verify();
  invariant(audit.ok, `audit-chain-broken-at-${audit.brokenAt ?? 'unknown'}`);
  invariant(audit.count > 0, 'audit-chain-empty');

  process.stdout.write(JSON.stringify({
    ok: true,
    login: true,
    stateVersion: after.version,
    attachmentId: uploaded.id,
    attachmentBytes: uploaded.size,
    auditRows: audit.count,
  }) + '\n');
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    await prisma.$disconnect();
    process.exit(1);
  });
