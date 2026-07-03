import { describe, it, expect } from 'vitest';
import { addUser, type AddUserInput } from '../addUser';
import { verifyPassword } from '../auth/password';

/* PRD docs/prd-add-staff-user-cli.md — non-destructive addition of a staff user to a firm that
   ALREADY exists (opposite guard of bootstrapFirm.ts, which only ever runs once on an empty DB).
   Mock DB pattern mirrors __tests__/bootstrap.test.ts — auth/crypto paths are the REAL modules. */

interface Captured {
  users: Array<Record<string, unknown>>;
  teamMembers: Array<Record<string, unknown>>;
}
function mockDb(firmExists: boolean, existingEmails: string[] = []) {
  const cap: Captured = { users: [], teamMembers: [] };
  const db = {
    firm: {
      findUnique: async () => (firmExists ? { id: 'FIRM-WHR', name: 'WHR & Rekan', short: 'WHR' } : null),
    },
    user: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        if (existingEmails.includes(data.email as string)) {
          const { Prisma } = await import('@prisma/client');
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        cap.users.push(data);
        return data;
      },
    },
    teamMember: {
      create: async ({ data }: { data: Record<string, unknown> }) => { cap.teamMembers.push(data); return data; },
    },
  } as unknown as Parameters<typeof addUser>[0];
  return { db, cap };
}

const input = (): AddUserInput => ({
  firmId: 'FIRM-WHR',
  user: { name: 'Dimas Raharjo', email: 'dimas.r@whr-cpa.id', password: 'sebuah-passphrase-kuat', role: 'Senior Auditor' },
});

describe('addUser — provisioning staf tambahan non-destruktif', () => {
  it('firma ada + peran audit → buat 1 User (password ter-hash) + 1 TeamMember', async () => {
    const { db, cap } = mockDb(true);
    const res = await addUser(db, input());
    expect(cap.users).toHaveLength(1);
    const u = cap.users[0];
    expect(u.role).toBe('Senior Auditor');
    expect(u.email).toBe('dimas.r@whr-cpa.id');
    expect(u.passwordHash).not.toBe('sebuah-passphrase-kuat'); // ter-hash
    expect(await verifyPassword('sebuah-passphrase-kuat', u.passwordHash as string)).toBe(true);
    expect(res.firmId).toBe('FIRM-WHR');
    expect(res.userId).toBe('USER-FIRMWHR-DIMASRAHARJO');
    expect(cap.teamMembers).toHaveLength(1); // peran audit → ikut masuk roster
    expect(cap.teamMembers[0]).toMatchObject({ firmId: 'FIRM-WHR', name: 'Dimas Raharjo', role: 'Senior Auditor', util: 0 });
  });

  it('peran firm-ops (Admin & HR Firma) → User dibuat, TAPI TIDAK ikut TeamMember (mirror rbac.ts)', async () => {
    const { db, cap } = mockDb(true);
    await addUser(db, { ...input(), user: { ...input().user, role: 'Admin & HR Firma', email: 'yuni.m@whr-cpa.id' } });
    expect(cap.users).toHaveLength(1);
    expect(cap.teamMembers).toHaveLength(0);
  });

  it('TOTP di-enrol secara default (armed + material sekali-tampil)', async () => {
    const { db, cap } = mockDb(true);
    const res = await addUser(db, input());
    expect(cap.users[0].totpEnabled).toBe(true);
    expect(cap.users[0].totpSecret).toBeTruthy();
    expect(res.totp?.otpauthUrl).toContain('otpauth://');
    expect(res.totp?.secret).toBeTruthy();
  });

  it('enrolTotp:false → password-saja (tak ada TOTP)', async () => {
    const { db, cap } = mockDb(true);
    const res = await addUser(db, { ...input(), enrolTotp: false });
    expect(cap.users[0].totpEnabled).toBe(false);
    expect(cap.users[0].totpSecret).toBeNull();
    expect(res.totp).toBeUndefined();
  });

  it('MENOLAK bila firma TIDAK ada (kebalikan bootstrapFirm)', async () => {
    const { db, cap } = mockDb(false);
    await expect(addUser(db, input())).rejects.toThrow(/tidak ditemukan/);
    expect(cap.users).toHaveLength(0);
  });

  it('MENOLAK peran yang tak dikenal', async () => {
    const { db } = mockDb(true);
    await expect(addUser(db, { ...input(), user: { ...input().user, role: 'Superadmin' } })).rejects.toThrow(/tidak dikenal/);
  });

  it('MENOLAK password < 12 karakter', async () => {
    const { db } = mockDb(true);
    await expect(addUser(db, { ...input(), user: { ...input().user, password: 'pendek' } })).rejects.toThrow(/12 karakter/);
  });

  it('MENOLAK email yang sudah dipakai (P2002)', async () => {
    const { db } = mockDb(true, ['dimas.r@whr-cpa.id']);
    await expect(addUser(db, input())).rejects.toThrow(/sudah dipakai/);
  });

  it('id user bisa di-override', async () => {
    const { db } = mockDb(true);
    const res = await addUser(db, { ...input(), user: { ...input().user, id: 'U-CUSTOM' } });
    expect(res.userId).toBe('U-CUSTOM');
  });
});
