// Deploy-Readiness M5 (PRD §3.3) — NON-DESTRUCTIVE provisioning of a real firm. Unlike seed.ts
// (which wipes 11 tables and repopulates DEMO data), this creates exactly ONE Firm + ONE
// Partner-admin on an EMPTY instance and REFUSES if any Firm already exists — so it can never
// clobber a live pilot's audit evidence. Pure w.r.t. the passed client so it's unit-testable.
import { hashPassword } from './auth/password';
import { generateSecret, otpauthUrl } from './auth/totp';
import { encryptSecret } from './crypto/secretbox';
import type { PrismaClient } from '@prisma/client';
// @ts-ignore — ../../migration/src/rbac is untyped canonical JS shared with the client.
import { ROLES, GRANTS } from '../../migration/src/rbac';

export interface BootstrapInput {
  firm: { id?: string; name: string; short: string };
  admin: { id?: string; name: string; email: string; password: string; initials?: string };
  /** default true — provision + arm TOTP. false → password-only (no 2FA). */
  enrolTotp?: boolean;
}

export interface BootstrapResult {
  firmId: string;
  userId: string;
  /** present when enrolTotp !== false — show ONCE so the admin can add it to an authenticator. */
  totp?: { secret: string; otpauthUrl: string };
}

const slug = (s: string): string => (s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'FIRM';
const initialsOf = (name: string): string =>
  (name || '').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'AD';

/** Create 1 Firm + 1 Partner-admin on an empty DB. Throws (refuses) if any Firm already exists, or
 *  if the password is too short. Returns the created ids + one-time TOTP enrolment material. */
export async function bootstrapFirm(
  db: Pick<PrismaClient, 'firm' | 'user' | 'role'>,
  input: BootstrapInput,
): Promise<BootstrapResult> {
  const existing = await db.firm.count();
  if (existing > 0) {
    throw new Error(
      `bootstrap-firm MENOLAK: DB sudah berisi ${existing} firma. Perintah ini hanya untuk instance kosong ` +
        `(ia tak akan pernah menimpa data firma yang sudah ada). Untuk data demo pakai 'npm run seed' di DB terpisah.`,
    );
  }
  if ((input.admin.password ?? '').length < 12) {
    throw new Error('ADMIN_PASSWORD minimal 12 karakter.');
  }

  const firmId = input.firm.id ?? `FIRM-${slug(input.firm.short)}`;
  const userId = input.admin.id ?? `USER-${slug(input.firm.short)}-ADMIN`;
  const passwordHash = await hashPassword(input.admin.password);

  let totp: BootstrapResult['totp'];
  let totpSecret: string | null = null;
  let totpEnabled = false;
  if (input.enrolTotp !== false) {
    const secret = generateSecret();
    totpSecret = encryptSecret(secret); // encrypted-at-rest when APP_ENCRYPTION_KEY set; plaintext in dev
    totpEnabled = true;
    totp = { secret, otpauthUrl: otpauthUrl(secret, input.admin.email) };
  }

  await db.firm.create({ data: { id: firmId, name: input.firm.name, short: input.firm.short } });
  // RBAC admin console (PRD docs/prd-rbac-admin-console.md) — a real firm needs the same 6
  // built-in Role rows a demo seed gets (seed.ts), otherwise its very first Partner-admin would
  // have zero DB-backed capabilities the moment ANY role's grants get customized elsewhere and the
  // cache is refreshed (until then the roleStore static fallback covers it — see roleStore.ts).
  for (const roleName of ROLES as string[]) {
    await db.role.create({
      data: { firmId, name: roleName, capsJson: JSON.stringify((GRANTS as Record<string, string[]>)[roleName] ?? []), isBuiltIn: true },
    });
  }
  await db.user.create({
    data: {
      id: userId,
      firmId,
      name: input.admin.name,
      initials: input.admin.initials ?? initialsOf(input.admin.name),
      role: 'Engagement Partner', // the FIRM_ADMIN-bearing role (rbac.ts) — the firm's first admin
      email: input.admin.email,
      dataJson: '{}',
      passwordHash,
      totpSecret,
      totpEnabled,
    },
  });

  return { firmId, userId, totp };
}
