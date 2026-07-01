import { describe, it, expect } from 'vitest';
import { bootstrapFirm, type BootstrapInput } from '../bootstrapFirm';
import { verifyPassword } from '../auth/password';

/* Deploy-Readiness M5 (PRD §3.3) — non-destructive firm provisioning. Pins the properties that make
   it safe for a real pilot: (1) REFUSES if any firm already exists (can't clobber live data),
   (2) creates a Partner-admin with a hashed password (never plaintext), (3) TOTP enrolment.
   Uses a mock DB so the test is hermetic (bootstrapFirm gates on a GLOBAL firm.count that the shared
   test DB would make flaky) — the auth/crypto paths (scrypt hash, TOTP) are the REAL modules. */

interface Captured {
  firms: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
}
function mockDb(firmCount: number) {
  const cap: Captured = { firms: [], users: [] };
  const db = {
    firm: {
      count: async () => firmCount,
      create: async ({ data }: { data: Record<string, unknown> }) => { cap.firms.push(data); return data; },
    },
    user: {
      create: async ({ data }: { data: Record<string, unknown> }) => { cap.users.push(data); return data; },
    },
  } as unknown as Parameters<typeof bootstrapFirm>[0];
  return { db, cap };
}

const input = (): BootstrapInput => ({
  firm: { name: 'WHR & Rekan', short: 'WHR' },
  admin: { name: 'Ari Widodo', email: 'ari@whr.id', password: 'sebuah-passphrase-kuat' },
});

describe('bootstrapFirm — provisioning non-destruktif', () => {
  it('DB kosong → buat 1 Firm + 1 Partner-admin (password ter-hash, bukan plaintext)', async () => {
    const { db, cap } = mockDb(0);
    const res = await bootstrapFirm(db, input());
    expect(cap.firms).toHaveLength(1);
    expect(cap.users).toHaveLength(1);
    const u = cap.users[0];
    expect(u.role).toBe('Engagement Partner'); // pemegang FIRM_ADMIN
    expect(u.email).toBe('ari@whr.id');
    expect(u.passwordHash).not.toBe('sebuah-passphrase-kuat'); // ter-hash
    expect(await verifyPassword('sebuah-passphrase-kuat', u.passwordHash as string)).toBe(true);
    expect(res.firmId).toBe('FIRM-WHR');
    expect(res.userId).toBe('USER-WHR-ADMIN');
  });

  it('TOTP di-enrol secara default (armed + material sekali-tampil)', async () => {
    const { db, cap } = mockDb(0);
    const res = await bootstrapFirm(db, input());
    expect(cap.users[0].totpEnabled).toBe(true);
    expect(cap.users[0].totpSecret).toBeTruthy();
    expect(res.totp?.otpauthUrl).toContain('otpauth://');
    expect(res.totp?.secret).toBeTruthy();
  });

  it('enrolTotp:false → password-saja (tak ada TOTP)', async () => {
    const { db, cap } = mockDb(0);
    const res = await bootstrapFirm(db, { ...input(), enrolTotp: false });
    expect(cap.users[0].totpEnabled).toBe(false);
    expect(cap.users[0].totpSecret).toBeNull();
    expect(res.totp).toBeUndefined();
  });

  it('MENOLAK bila DB sudah berisi firma (anti-clobber data pilot)', async () => {
    const { db, cap } = mockDb(1);
    await expect(bootstrapFirm(db, input())).rejects.toThrow(/MENOLAK/);
    expect(cap.firms).toHaveLength(0); // tak menulis apa pun
    expect(cap.users).toHaveLength(0);
  });

  it('MENOLAK password < 12 karakter', async () => {
    const { db } = mockDb(0);
    await expect(bootstrapFirm(db, { ...input(), admin: { ...input().admin, password: 'pendek' } })).rejects.toThrow(/12 karakter/);
  });

  it('id firm/admin bisa di-override', async () => {
    const { db } = mockDb(0);
    const res = await bootstrapFirm(db, { ...input(), firm: { id: 'FIRM-X', name: 'X', short: 'X' }, admin: { ...input().admin, id: 'U-X' } });
    expect(res.firmId).toBe('FIRM-X');
    expect(res.userId).toBe('U-X');
  });
});
