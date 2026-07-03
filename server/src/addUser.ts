// PRD docs/prd-add-staff-user-cli.md — NON-DESTRUCTIVE provisioning of an ADDITIONAL staff user
// on a firm that already exists. Mirrors bootstrapFirm.ts's shape exactly (pure w.r.t. the passed
// client so it's unit-testable) but with the OPPOSITE guard: bootstrapFirm refuses if a firm
// already exists (first-run only); this refuses if the firm does NOT exist (every subsequent run).
//
// Gap this closes: bootstrapFirm.ts can only ever create ONE Firm + ONE Partner-admin, and
// seed.ts is destructive (wipes 11 tables) — so a pilot firm with >1 staff previously had NO
// supported way to add the other accounts short of a manual DB write.
import { hashPassword } from './auth/password';
import { generateSecret, otpauthUrl } from './auth/totp';
import { encryptSecret } from './crypto/secretbox';
import { ROLES } from './rbac';
import { Prisma, type PrismaClient } from '@prisma/client';

// Roles staffed onto engagements (audit-staffing shaped — grade/util/engagements) get a
// TeamMember roster row too, so they show up in Capacity Planning/Resource Scheduler right away
// instead of "can log in but invisible in rosters". Admin & HR Firma / Finance Firma are
// deliberately excluded — same design decision already encoded in migration/src/rbac.ts's
// comment on ROLES: those two roles never sit on the audit-staffing roster.
const AUDIT_ROLES = new Set(['Engagement Partner', 'Audit Manager', 'Senior Auditor', 'Junior Auditor']);

export interface AddUserInput {
  firmId: string;
  user: { id?: string; name: string; email: string; password: string; role: string; initials?: string };
  /** default true — provision + arm TOTP. false → password-only (no 2FA). */
  enrolTotp?: boolean;
}

export interface AddUserResult {
  firmId: string;
  userId: string;
  /** present when enrolTotp !== false — show ONCE so the new staff member can add it to an authenticator. */
  totp?: { secret: string; otpauthUrl: string };
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

const slug = (s: string): string => (s || '').toUpperCase().replace(/[^A-Z0-9]+/g, '').slice(0, 12) || 'USER';
const initialsOf = (name: string): string =>
  (name || '').trim().split(/\s+/).map((w) => w[0]).join('').toUpperCase().slice(0, 3) || 'ST';

/** Add ONE staff user to a firm that ALREADY exists. Throws (refuses) if the firm is missing, the
 *  role is unknown, the password is too short, or the email is already taken. Returns the created
 *  id + one-time TOTP enrolment material. */
export async function addUser(
  db: Pick<PrismaClient, 'firm' | 'user' | 'teamMember'>,
  input: AddUserInput,
): Promise<AddUserResult> {
  const firm = await db.firm.findUnique({ where: { id: input.firmId } });
  if (!firm) {
    throw new Error(
      `add-user MENOLAK: firma '${input.firmId}' tidak ditemukan. Perintah ini hanya untuk menambah staf ` +
        `ke firma yang SUDAH ada (kebalikan 'bootstrap', yang hanya untuk instance kosong).`,
    );
  }
  if (!ROLES.includes(input.user.role)) {
    throw new Error(`add-user MENOLAK: peran '${input.user.role}' tidak dikenal. Peran valid: ${ROLES.join(', ')}.`);
  }
  if ((input.user.password ?? '').length < 12) {
    throw new Error('USER_PASSWORD minimal 12 karakter.');
  }

  const userId = input.user.id ?? `USER-${slug(input.firmId)}-${slug(input.user.name)}`;
  const passwordHash = await hashPassword(input.user.password);

  let totp: AddUserResult['totp'];
  let totpSecret: string | null = null;
  let totpEnabled = false;
  if (input.enrolTotp !== false) {
    const secret = generateSecret();
    totpSecret = encryptSecret(secret); // encrypted-at-rest when APP_ENCRYPTION_KEY set; plaintext in dev
    totpEnabled = true;
    totp = { secret, otpauthUrl: otpauthUrl(secret, input.user.email) };
  }

  try {
    await db.user.create({
      data: {
        id: userId,
        firmId: input.firmId,
        name: input.user.name,
        initials: input.user.initials ?? initialsOf(input.user.name),
        role: input.user.role,
        email: input.user.email,
        dataJson: '{}', // minimal envelope, mirrors bootstrapFirm.ts's admin (not seed.ts's richer demo shape)
        passwordHash,
        totpSecret,
        totpEnabled,
      },
    });
  } catch (e) {
    if (isUniqueViolation(e)) {
      throw new Error(`add-user MENOLAK: email '${input.user.email}' sudah dipakai user lain.`);
    }
    throw e;
  }

  if (AUDIT_ROLES.has(input.user.role)) {
    await db.teamMember.create({
      data: { firmId: input.firmId, name: input.user.name, role: input.user.role, util: 0 },
    });
  }

  return { firmId: input.firmId, userId, totp };
}
