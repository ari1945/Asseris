import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { contextForToken } from '../context';
import { prisma } from '../db';
import { hashPassword } from '../auth/password';
import { totp } from '../auth/totp';

const FIRM_ID = 'TEST-FIRM-AUTH';
const anon = createCallerFactory(appRouter)({ user: null, token: null });
// A caller whose context is resolved from a session token (mirrors the HTTP path).
async function authed(token: string) {
  return createCallerFactory(appRouter)(await contextForToken(token));
}

let seq = 0;
async function makeUser(password: string, role = 'Junior Auditor') {
  const id = `TEST-U-${seq++}`;
  const email = `${id.toLowerCase()}@test.dev`;
  await prisma.user.create({
    data: { id, firmId: FIRM_ID, name: id, role, email, dataJson: '{}', passwordHash: await hashPassword(password) },
  });
  return { id, email };
}

beforeAll(async () => {
  await prisma.firm.upsert({
    where: { id: FIRM_ID },
    create: { id: FIRM_ID, name: 'Test Firm', short: 'TF' },
    update: {},
  });
});

afterAll(async () => {
  // FK-safe teardown of everything this suite created.
  const users = await prisma.user.findMany({ where: { firmId: FIRM_ID }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await prisma.authEvent.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { firmId: FIRM_ID } });
  await prisma.firm.deleteMany({ where: { id: FIRM_ID } });
  await prisma.$disconnect();
});

describe('auth.login', () => {
  it('issues a token on correct credentials; me() returns the user', async () => {
    const { id, email } = await makeUser('Correct#Horse1');
    const r = await anon.auth.login({ email, password: 'Correct#Horse1' });
    expect(r.token).toBeTruthy();
    expect(r.user.id).toBe(id);
    expect(r.user).not.toHaveProperty('passwordHash');

    const me = await (await authed(r.token)).auth.me();
    expect(me?.id).toBe(id);
  });

  it('rejects a wrong password with UNAUTHORIZED', async () => {
    const { email } = await makeUser('Correct#Horse2');
    await expect(anon.auth.login({ email, password: 'nope' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });

  it('rejects an unknown email with the same generic error (no enumeration)', async () => {
    await expect(anon.auth.login({ email: 'ghost@test.dev', password: 'whatever' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'invalid-credentials',
    });
  });

  it('locks the account after 5 failures, then refuses even the right password', async () => {
    const { email } = await makeUser('Right#Pass123');
    for (let i = 0; i < 5; i++) {
      await expect(anon.auth.login({ email, password: 'wrong' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    }
    await expect(anon.auth.login({ email, password: 'Right#Pass123' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('records LOGIN and LOGIN_FAIL in the audit trail', async () => {
    const { id, email } = await makeUser('Audit#Trail12');
    await anon.auth.login({ email, password: 'Audit#Trail12' });
    await expect(anon.auth.login({ email, password: 'x' })).rejects.toBeTruthy();
    const events = await prisma.authEvent.findMany({ where: { userId: id } });
    const kinds = events.map((e) => e.kind);
    expect(kinds).toContain('LOGIN');
    expect(kinds).toContain('LOGIN_FAIL');
  });
});

describe('protected procedures require a session', () => {
  it('me() is null and logout/changePassword reject without a token', async () => {
    expect(await anon.auth.me()).toBeNull();
    await expect(anon.auth.logout()).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    await expect(anon.auth.changePassword({ oldPassword: 'a', newPassword: 'b'.repeat(12) })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
    });
  });
});

describe('session lifecycle', () => {
  it('logout revokes the token (me → null afterwards)', async () => {
    const { email } = await makeUser('Logout#Test12');
    const { token } = await anon.auth.login({ email, password: 'Logout#Test12' });
    expect(await (await authed(token)).auth.me()).not.toBeNull();
    await (await authed(token)).auth.logout();
    expect(await (await authed(token)).auth.me()).toBeNull();
  });

  it('an expired session does not resolve to a user', async () => {
    const { email } = await makeUser('Expire#Test12');
    const { token } = await anon.auth.login({ email, password: 'Expire#Test12' });
    await prisma.session.update({ where: { token }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await (await authed(token)).auth.me()).toBeNull();
  });
});

describe('changePassword', () => {
  it('actually changes the credential (old fails, new works)', async () => {
    const { email } = await makeUser('Old#Password1');
    const { token } = await anon.auth.login({ email, password: 'Old#Password1' });
    await (await authed(token)).auth.changePassword({ oldPassword: 'Old#Password1', newPassword: 'New#Password99' });
    await expect(anon.auth.login({ email, password: 'Old#Password1' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
    const r = await anon.auth.login({ email, password: 'New#Password99' });
    expect(r.token).toBeTruthy();
  });

  it('rejects a wrong old password', async () => {
    const { email } = await makeUser('Keep#Password1');
    const { token } = await anon.auth.login({ email, password: 'Keep#Password1' });
    await expect(
      (await authed(token)).auth.changePassword({ oldPassword: 'wrong', newPassword: 'New#Password99' }),
    ).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});

describe('TOTP 2FA', () => {
  it('enrol → verify arms 2FA; login then requires a valid code', async () => {
    const { email } = await makeUser('Totp#Account1');
    const { token } = await anon.auth.login({ email, password: 'Totp#Account1' });
    const caller = await authed(token);

    const { secret } = await caller.auth.enrollTotp();
    expect(secret).toBeTruthy();
    // Not yet armed — login without a code still works.
    expect((await anon.auth.login({ email, password: 'Totp#Account1' })).token).toBeTruthy();

    await caller.auth.verifyTotp({ token: totp(secret) });

    // Now armed: missing code is rejected, correct code passes.
    await expect(anon.auth.login({ email, password: 'Totp#Account1' })).rejects.toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'totp-required',
    });
    const ok = await anon.auth.login({ email, password: 'Totp#Account1', totp: totp(secret) });
    expect(ok.token).toBeTruthy();
  });

  it('rejects a bad code at verify', async () => {
    const { email } = await makeUser('Totp#Account2');
    const { token } = await anon.auth.login({ email, password: 'Totp#Account2' });
    const caller = await authed(token);
    await caller.auth.enrollTotp();
    await expect(caller.auth.verifyTotp({ token: '000000' })).rejects.toMatchObject({ code: 'UNAUTHORIZED' });
  });
});
