/* ============================================================
   B1 (Manajemen Pengguna) + B2 (reset password mandiri).

   Dua alur ini dapat memberi ATAU mencabut akses ke seluruh kertas kerja sebuah firma tanpa
   pernah melewati layar login, jadi yang diuji di sini bukan "jalur bahagia" melainkan tepatnya
   hal-hal yang membuat alur semacam ini bocor di produk lain: enumerasi akun, token yang dapat
   dipakai ulang, token lama yang tetap hidup, reset yang melewati 2FA, sesi yang selamat dari
   pergantian password, dan admin terakhir yang tak sengaja mengunci firmanya sendiri.
   ============================================================ */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { hashPassword } from '../auth/password';
import { createSession, resolveSession } from '../auth/session';
import { hashToken, issueCredentialToken, RESET_MAX_PER_HOUR } from '../auth/credentialToken';
import { setMailTransport, type OutgoingMail } from '../mail/send';
import { encryptSecret } from '../crypto/secretbox';
import { generateSecret, totp } from '../auth/totp';

const FIRM = 'UC-FIRM';
const OTHER_FIRM = 'UC-FIRM-LAIN';
const ADMIN = 'UC-admin';
const ADMIN2 = 'UC-admin2';
const STAFF = 'UC-staff';
const TOTP_USER = 'UC-totp';
const OUTSIDER = 'UC-outsider'; // pengguna firma LAIN

const PASSWORD = 'password-lama-yang-panjang';
const NEW_PASSWORD = 'password-baru-yang-panjang';

// Env email uji. PUBLIC_BASE_URL wajib — readMailConfig menolak tanpa itu (host-header injection).
const MAIL_ENV = {
  MAIL_SMTP_HOST: 'smtp.uji.local',
  MAIL_FROM: 'noreply@uji.local',
  PUBLIC_BASE_URL: 'https://kap.uji.local',
};

let sent: OutgoingMail[] = [];

function mailOn() { Object.assign(process.env, MAIL_ENV); }
function mailOff() { for (const k of Object.keys(MAIL_ENV)) delete process.env[k]; }

const caller = (id: string, role: string, firmId = FIRM) =>
  createCallerFactory(appRouter)({ user: { id, role, firmId } as unknown as User, token: 'uc-test' });
const anon = createCallerFactory(appRouter)({ user: null, token: null });

let totpSecret = '';

beforeAll(async () => {
  setMailTransport(async (m) => { sent.push(m); });
  await prisma.firm.createMany({
    data: [
      { id: FIRM, name: 'Firma Kredensial', short: 'UC' },
      { id: OTHER_FIRM, name: 'Firma Lain', short: 'UCL' },
    ],
  });
  const passwordHash = await hashPassword(PASSWORD);
  totpSecret = generateSecret();
  await prisma.user.createMany({
    data: [
      { id: ADMIN, firmId: FIRM, name: 'Admin Satu', role: 'Engagement Partner', email: 'admin@uc.local', dataJson: '{}', passwordHash },
      { id: ADMIN2, firmId: FIRM, name: 'Admin Dua', role: 'Engagement Partner', email: 'admin2@uc.local', dataJson: '{}', passwordHash },
      { id: STAFF, firmId: FIRM, name: 'Staf Biasa', role: 'Junior Auditor', email: 'staf@uc.local', dataJson: '{}', passwordHash },
      {
        id: TOTP_USER, firmId: FIRM, name: 'Staf Ber-2FA', role: 'Senior Auditor', email: 'totp@uc.local',
        dataJson: '{}', passwordHash, totpEnabled: true, totpSecret: encryptSecret(totpSecret),
      },
      { id: OUTSIDER, firmId: OTHER_FIRM, name: 'Orang Luar', role: 'Engagement Partner', email: 'luar@uc.local', dataJson: '{}', passwordHash },
    ],
  });
});

afterAll(async () => {
  setMailTransport(null);
  mailOff();
  /* Dibersihkan berdasarkan FIRMA, bukan daftar id yang ditulis tangan: suite ini MEMBUAT
     pengguna (alur undangan) yang idnya belum ada saat daftar itu disusun, dan pengguna itu
     kemudian punya sesi + authEvent sendiri. Daftar tetap akan meninggalkan baris anak yang
     membuat penghapusan induknya melanggar foreign key — persis kegagalan yang terjadi. */
  const firms = [FIRM, OTHER_FIRM];
  const ids = (await prisma.user.findMany({ where: { firmId: { in: firms } }, select: { id: true } }))
    .map((u) => u.id);
  await prisma.credentialToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.session.deleteMany({ where: { userId: { in: ids } } });
  await prisma.authEvent.deleteMany({ where: { userId: { in: ids } } });
  await prisma.teamMember.deleteMany({ where: { firmId: { in: firms } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.firm.deleteMany({ where: { id: { in: firms } } });
});

beforeEach(async () => {
  sent = [];
  mailOn();
  await prisma.credentialToken.deleteMany({ where: { user: { firmId: { in: [FIRM, OTHER_FIRM] } } } });
});

/** Ambil token MENTAH dari tautan pada email yang tertangkap. */
function tokenFromMail(m: OutgoingMail): string {
  const found = /token=([A-Za-z0-9_-]+)/.exec(m.text);
  if (!found) throw new Error('email tidak memuat tautan token');
  return decodeURIComponent(found[1]);
}

describe('B2 — permintaan reset tidak dapat dipakai mengenumerasi akun', () => {
  it('alamat TAK DIKENAL menghasilkan balasan yang sama persis, tanpa token, tanpa email', async () => {
    const known = await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const unknown = await anon.auth.requestPasswordReset({ email: 'tidak-ada@uc.local' });
    expect(unknown).toEqual(known); // bentuk balasan identik — tak ada oracle
    expect(sent).toHaveLength(1); // hanya yang dikenal menerima email
    expect(sent[0].to).toBe('staf@uc.local');
  });

  it('akun NONAKTIF juga tak dibedakan: balasan sama, tanpa token', async () => {
    await prisma.user.update({ where: { id: STAFF }, data: { deactivatedAt: new Date() } });
    const r = await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    expect(r.ok).toBe(true);
    expect(sent).toHaveLength(0);
    expect(await prisma.credentialToken.count({ where: { userId: STAFF } })).toBe(0);
    await prisma.user.update({ where: { id: STAFF }, data: { deactivatedAt: null } });
  });

  it('token MENTAH tak pernah tersimpan — hanya SHA-256-nya', async () => {
    await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const raw = tokenFromMail(sent[0]);
    const row = await prisma.credentialToken.findFirst({ where: { userId: STAFF } });
    expect(row!.tokenHash).toBe(hashToken(raw));
    expect(row!.tokenHash).not.toBe(raw);
    // Tak ada satu kolom pun pada baris itu yang memuat token mentah.
    expect(JSON.stringify(row)).not.toContain(raw);
  });

  it('permintaan baru MEMBUNUH tautan sebelumnya (tautan lama yang bocor tak tetap hidup)', async () => {
    await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const first = tokenFromMail(sent[0]);
    await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const second = tokenFromMail(sent[1]);
    expect(second).not.toBe(first);
    expect(await anon.auth.inspectCredentialToken({ token: first })).toMatchObject({ valid: false, reason: 'already-used' });
    expect(await anon.auth.inspectCredentialToken({ token: second })).toMatchObject({ valid: true });
  });

  it(`berhenti menerbitkan token setelah ${RESET_MAX_PER_HOUR} permintaan dalam sejam`, async () => {
    for (let i = 0; i < RESET_MAX_PER_HOUR; i++) await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    expect(sent).toHaveLength(RESET_MAX_PER_HOUR);
    const r = await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    expect(r.ok).toBe(true); // balasannya TETAP sama — batas tak boleh terlihat dari luar
    expect(sent).toHaveLength(RESET_MAX_PER_HOUR); // tapi tak ada email tambahan
  });

  it('melaporkan email mati lewat emailConfigured, dan tak menerbitkan token', async () => {
    mailOff();
    const r = await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    expect(r).toEqual({ ok: true, emailConfigured: false });
    expect(await prisma.credentialToken.count({ where: { userId: STAFF } })).toBe(0);
  });
});

describe('B2 — penebusan token', () => {
  it('menyetel password, mencabut SEMUA sesi, dan menandai token terpakai', async () => {
    const live = await createSession(STAFF);
    await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const raw = tokenFromMail(sent[0]);

    const r = await anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD });
    expect(r).toMatchObject({ ok: true, purpose: 'reset' });

    // Sesi yang sudah dipegang penyusup mati — inilah gunanya reset pada akun yang dikuasai.
    expect(await resolveSession(live.token)).toBeNull();
    expect(await prisma.credentialToken.findFirst({ where: { userId: STAFF } })).toMatchObject({ usedAt: expect.any(Date) });

    // Password baru berlaku, yang lama tidak.
    await expect(anon.auth.login({ email: 'staf@uc.local', password: PASSWORD })).rejects.toMatchObject({ message: 'invalid-credentials' });
    const ok = await anon.auth.login({ email: 'staf@uc.local', password: NEW_PASSWORD });
    expect(ok.user.id).toBe(STAFF);

    await prisma.user.update({ where: { id: STAFF }, data: { passwordHash: await hashPassword(PASSWORD) } });
  });

  it('token SEKALI PAKAI — percobaan kedua ditolak', async () => {
    await anon.auth.requestPasswordReset({ email: 'staf@uc.local' });
    const raw = tokenFromMail(sent[0]);
    await anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD });
    await expect(
      anon.auth.completeCredentialToken({ token: raw, newPassword: 'password-ketiga-panjang' }),
    ).rejects.toMatchObject({ message: 'token-already-used' });
    await prisma.user.update({ where: { id: STAFF }, data: { passwordHash: await hashPassword(PASSWORD) } });
  });

  it('token KEDALUWARSA ditolak', async () => {
    const { raw } = await issueCredentialToken({ userId: STAFF, purpose: 'reset', ttlMs: -1000 });
    await expect(
      anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD }),
    ).rejects.toMatchObject({ message: 'token-expired' });
  });

  it('token acak yang tak pernah diterbitkan ditolak', async () => {
    await expect(
      anon.auth.completeCredentialToken({ token: 'token-karangan', newPassword: NEW_PASSWORD }),
    ).rejects.toMatchObject({ message: 'token-not-found' });
  });
});

describe('B2 — reset TIDAK melewati 2FA', () => {
  it('akun ber-TOTP menolak penyetelan tanpa kode', async () => {
    await anon.auth.requestPasswordReset({ email: 'totp@uc.local' });
    const raw = tokenFromMail(sent[0]);
    expect(await anon.auth.inspectCredentialToken({ token: raw })).toMatchObject({ valid: true, totpRequired: true });
    await expect(
      anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD }),
    ).rejects.toMatchObject({ message: 'totp-required' });
  });

  it('kode SALAH tidak membakar token — tautannya masih dapat dipakai dengan kode benar', async () => {
    await anon.auth.requestPasswordReset({ email: 'totp@uc.local' });
    const raw = tokenFromMail(sent[0]);
    await expect(
      anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD, totp: '000000' }),
    ).rejects.toMatchObject({ message: 'invalid-totp' });

    // Inilah yang dijaga: satu salah ketik tak boleh memaksa seluruh alur diulang dari email.
    expect(await anon.auth.inspectCredentialToken({ token: raw })).toMatchObject({ valid: true });
    const r = await anon.auth.completeCredentialToken({
      token: raw, newPassword: NEW_PASSWORD, totp: totp(totpSecret),
    });
    expect(r.ok).toBe(true);
    await prisma.user.update({
      where: { id: TOTP_USER },
      data: { passwordHash: await hashPassword(PASSWORD), totpFailedAttempts: 0, totpLockedUntil: null },
    });
  });
});

describe('B1 — gerbang manajemen pengguna', () => {
  it('bukan FIRM_ADMIN ditolak', async () => {
    await expect(caller(STAFF, 'Junior Auditor').users.list()).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      caller(STAFF, 'Junior Auditor').users.invite({ name: 'X', email: 'x@uc.local', role: 'Junior Auditor' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });

  it('admin firma LAIN tak dapat menyentuh pengguna firma ini', async () => {
    await expect(
      caller(OUTSIDER, 'Engagement Partner', OTHER_FIRM).users.setRole({ userId: STAFF, role: 'Senior Auditor' }),
    ).rejects.toMatchObject({ message: 'cross-firm-user' });
    await expect(
      caller(OUTSIDER, 'Engagement Partner', OTHER_FIRM).users.setActive({ userId: STAFF, active: false }),
    ).rejects.toMatchObject({ message: 'cross-firm-user' });
  });

  it('daftar hanya memuat firma pemanggil, tanpa satu pun kolom rahasia', async () => {
    const rows = await caller(ADMIN, 'Engagement Partner').users.list();
    expect(rows.map((r) => r.id).sort()).toEqual([ADMIN, ADMIN2, STAFF, TOTP_USER].sort());
    expect(JSON.stringify(rows)).not.toContain('scrypt$');
    expect(Object.keys(rows[0])).not.toContain('passwordHash');
    expect(Object.keys(rows[0])).not.toContain('totpSecret');
  });
});

describe('B1 — undangan', () => {
  const NEW_EMAIL = 'baru@uc.local';

  it('membuat akun TANPA password yang belum dapat login, lalu dihidupkan oleh tautannya', async () => {
    const inv = await caller(ADMIN, 'Engagement Partner').users.invite({
      name: 'Staf Baru', email: NEW_EMAIL, role: 'Senior Auditor',
    });
    expect(inv.delivery).toBe('sent');
    const created = await prisma.user.findUnique({ where: { id: inv.userId } });
    expect(created!.passwordHash).toBeNull();
    // TOTP TIDAK dipersenjatai: rahasia yang tak pernah dilihat pemiliknya = akun terkunci.
    expect(created!.totpEnabled).toBe(false);

    await expect(
      anon.auth.login({ email: NEW_EMAIL, password: NEW_PASSWORD }),
    ).rejects.toMatchObject({ message: 'invalid-credentials' });

    const raw = tokenFromMail(sent[0]);
    expect(await anon.auth.inspectCredentialToken({ token: raw })).toMatchObject({ valid: true, purpose: 'invite' });
    await anon.auth.completeCredentialToken({ token: raw, newPassword: NEW_PASSWORD });

    const ok = await anon.auth.login({ email: NEW_EMAIL, password: NEW_PASSWORD });
    expect(ok.user.id).toBe(inv.userId);
    // Peran audit → muncul di roster kapasitas tanpa langkah manual.
    expect(await prisma.teamMember.count({ where: { firmId: FIRM, name: 'Staf Baru' } })).toBe(1);
  });

  it('email ganda ditolak dengan sebab yang dapat ditindaklanjuti', async () => {
    await expect(
      caller(ADMIN, 'Engagement Partner').users.invite({ name: 'Kembar', email: 'staf@uc.local', role: 'Junior Auditor' }),
    ).rejects.toMatchObject({ message: 'email-taken' });
  });

  it('ketika email MATI, tautan dikembalikan ke admin agar undangan tetap dapat diserahkan', async () => {
    mailOff();
    const inv = await caller(ADMIN, 'Engagement Partner').users.invite({
      name: 'Tanpa Email', email: 'tanpa-email@uc.local', role: 'Junior Auditor',
    });
    expect(inv.delivery).toBe('not-configured');
    expect(inv.link).toBeNull(); // tak ada PUBLIC_BASE_URL → tautan tak dapat dirakit dengan jujur
  });
});

describe('B1 — perubahan peran & penonaktifan', () => {
  it('perubahan peran menggeser roster kapasitas, bukan hanya label', async () => {
    await caller(ADMIN, 'Engagement Partner').users.setRole({ userId: STAFF, role: 'Senior Auditor' });
    expect(await prisma.teamMember.count({ where: { firmId: FIRM, name: 'Staf Biasa', role: 'Senior Auditor' } })).toBe(1);
    // Pindah ke peran firm-ops MENGHAPUS baris roster (peran itu tak duduk di roster audit).
    await caller(ADMIN, 'Engagement Partner').users.setRole({ userId: STAFF, role: 'Finance Firma' });
    expect(await prisma.teamMember.count({ where: { firmId: FIRM, name: 'Staf Biasa' } })).toBe(0);
    await caller(ADMIN, 'Engagement Partner').users.setRole({ userId: STAFF, role: 'Junior Auditor' });
  });

  it('admin tak dapat menonaktifkan dirinya sendiri', async () => {
    await expect(
      caller(ADMIN, 'Engagement Partner').users.setActive({ userId: ADMIN, active: false }),
    ).rejects.toMatchObject({ message: 'cannot-deactivate-self' });
  });

  it('firma tak dapat kehilangan admin AKTIF terakhirnya — lewat nonaktif MAUPUN turun peran', async () => {
    await caller(ADMIN, 'Engagement Partner').users.setActive({ userId: ADMIN2, active: false });
    // ADMIN kini satu-satunya admin aktif. Keduanya harus ditolak:
    await expect(
      caller(ADMIN2, 'Engagement Partner').users.setActive({ userId: ADMIN, active: false }),
    ).rejects.toMatchObject({ message: 'last-firm-admin' });
    await expect(
      caller(ADMIN2, 'Engagement Partner').users.setRole({ userId: ADMIN, role: 'Junior Auditor' }),
    ).rejects.toMatchObject({ message: 'last-firm-admin' });
    await caller(ADMIN, 'Engagement Partner').users.setActive({ userId: ADMIN2, active: true });
  });

  it('penonaktifan mencabut sesi hidup, mematikan undangan tertunda, dan menolak login', async () => {
    const live = await createSession(STAFF);
    await caller(ADMIN, 'Engagement Partner').users.sendPasswordReset({ userId: STAFF });
    const pendingToken = tokenFromMail(sent[0]);

    const r = await caller(ADMIN, 'Engagement Partner').users.setActive({ userId: STAFF, active: false });
    expect(r.sessionsRevoked).toBeGreaterThanOrEqual(1);

    expect(await resolveSession(live.token)).toBeNull();
    expect(await anon.auth.inspectCredentialToken({ token: pendingToken })).toMatchObject({ valid: false });
    await expect(
      anon.auth.login({ email: 'staf@uc.local', password: PASSWORD }),
    ).rejects.toMatchObject({ message: 'invalid-credentials' });

    await caller(ADMIN, 'Engagement Partner').users.setActive({ userId: STAFF, active: true });
    const ok = await anon.auth.login({ email: 'staf@uc.local', password: PASSWORD });
    expect(ok.user.id).toBe(STAFF);
  });

  it('clearTotp melepas 2FA tanpa pernah memperlihatkan rahasianya kepada admin', async () => {
    const res = await caller(ADMIN, 'Engagement Partner').users.clearTotp({ userId: TOTP_USER });
    expect(JSON.stringify(res)).not.toContain(totpSecret);
    const u = await prisma.user.findUnique({ where: { id: TOTP_USER } });
    expect(u!.totpEnabled).toBe(false);
    expect(u!.totpSecret).toBeNull();
    await prisma.user.update({
      where: { id: TOTP_USER }, data: { totpEnabled: true, totpSecret: encryptSecret(totpSecret) },
    });
  });
});
