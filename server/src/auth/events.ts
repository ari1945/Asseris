// W7 — append-only authentication audit trail. Records the real auth lifecycle (login,
// failures, lockout, logout, password change, MFA enrol/verify) — the DoD's "jejak audit
// mencatat login nyata, bukan seed". Logging must never break the request it describes, so
// every write is best-effort.
import { prisma } from '../db';

export type AuthEventKind =
  | 'LOGIN'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'PASSWORD_CHANGE'
  | 'TOTP_ENROLL'
  | 'TOTP_VERIFY'
  | 'LOCKOUT'
  // B2 — siklus hidup kredensial tanpa sesi. PASSWORD_RESET_REQUEST dicatat SEKALIPUN alamatnya
  // tak dikenal (userId null), karena pola permintaan ke alamat tak terdaftar justru sinyal
  // pengintaian yang ingin dilihat operator.
  | 'PASSWORD_RESET_REQUEST'
  | 'PASSWORD_RESET'
  | 'INVITE_SENT'
  | 'ACCOUNT_DEACTIVATED'
  | 'ACCOUNT_REACTIVATED';

export async function logAuthEvent(
  kind: AuthEventKind,
  meta: { userId?: string | null; ip?: string | null; userAgent?: string | null; detail?: string | null } = {},
): Promise<void> {
  try {
    await prisma.authEvent.create({
      data: {
        kind,
        userId: meta.userId ?? null,
        ip: meta.ip ?? null,
        userAgent: meta.userAgent ?? null,
        detail: meta.detail ?? null,
      },
    });
  } catch {
    /* audit logging is non-critical to the operation — swallow */
  }
}
