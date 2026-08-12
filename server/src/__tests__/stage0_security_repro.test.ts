import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { hashPassword } from '../auth/password';

const FIRM = 'S0-SEC-FIRM';
const CLIENT = 'S0-SEC-CLIENT';
const ENG_A = 'S0-SEC-ENG-A';
const ENG_B = 'S0-SEC-ENG-B';
const USER_A = 'S0-SEC-USER-A';
const USER_B = 'S0-SEC-USER-B';
const PASSWORD_HASH = 's0-password-hash-must-never-leave-server';
const TOTP_SECRET = 's0-totp-secret-must-never-leave-server';

function callerAs(user: Pick<User, 'id' | 'firmId' | 'role'>) {
  return createCallerFactory(appRouter)({ user: user as User, token: 'stage0-test' });
}

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Stage 0 Security', short: 'S0' } });
  await prisma.client.create({ data: { id: CLIENT, firmId: FIRM, name: 'Stage 0 Client' } });
  await prisma.engagement.createMany({
    data: [
      { id: ENG_A, firmId: FIRM, clientId: CLIENT },
      { id: ENG_B, firmId: FIRM, clientId: CLIENT },
    ],
  });
  await prisma.user.createMany({
    data: [
      {
        id: USER_A, firmId: FIRM, name: 'User A', role: 'Junior Auditor',
        email: 'stage0-a@test.local', dataJson: '{}', passwordHash: await hashPassword('stage0-password-a'),
      },
      {
        id: USER_B, firmId: FIRM, name: 'User B', role: 'Junior Auditor',
        email: 'stage0-b@test.local', dataJson: '{}', passwordHash: PASSWORD_HASH,
        totpSecret: TOTP_SECRET, totpEnabled: true,
      },
    ],
  });
  await prisma.engagementMember.create({ data: { engagementId: ENG_A, userId: USER_A } });
  await prisma.stateDoc.createMany({
    data: [
      { scope: 'user', scopeId: USER_B, key: 'profile', valueJson: JSON.stringify({ private: 'user-b' }), updatedBy: USER_B },
      { scope: 'engagement', scopeId: ENG_B, key: 'wpState', valueJson: JSON.stringify({ private: 'engagement-b' }), updatedBy: USER_B },
    ],
  });
});

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: { in: [USER_B, ENG_B] } } });
  await prisma.engagementMember.deleteMany({ where: { engagementId: { in: [ENG_A, ENG_B] } } });
  await prisma.user.deleteMany({ where: { id: { in: [USER_A, USER_B] } } });
  await prisma.engagement.deleteMany({ where: { id: { in: [ENG_A, ENG_B] } } });
  await prisma.client.deleteMany({ where: { id: CLIENT } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('Tahap 0 — reproduksi boundary keamanan', () => {
  it('bootstrap tidak pernah mengembalikan credential pengguna', async () => {
    const payload = await callerAs({ id: USER_A, firmId: FIRM, role: 'Junior Auditor' }).bootstrap({ engagementId: ENG_A });
    const serialized = JSON.stringify(payload);

    expect(serialized).not.toContain(PASSWORD_HASH);
    expect(serialized).not.toContain(TOTP_SECRET);
    expect(payload.users.every((user) => !('passwordHash' in user) && !('totpSecret' in user))).toBe(true);
  });

  it('pengguna tidak bisa membaca StateDoc milik pengguna atau engagement lain', async () => {
    const caller = callerAs({ id: USER_A, firmId: FIRM, role: 'Junior Auditor' });

    const reads = await Promise.allSettled([
      caller.state.get({ scope: 'user', scopeId: USER_B, key: 'profile' }),
      caller.state.get({ scope: 'engagement', scopeId: ENG_B, key: 'wpState' }),
    ]);

    expect(reads.map((read) => read.status)).toEqual(['rejected', 'rejected']);
    for (const read of reads) {
      expect(read).toMatchObject({ status: 'rejected', reason: { code: 'FORBIDDEN' } });
    }
  });
});
