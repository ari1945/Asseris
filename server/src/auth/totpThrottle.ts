import type { User } from '@prisma/client';
import { prisma } from '../db';

export const MAX_TOTP_FAILURES = 5;
export const TOTP_LOCK_MINUTES = 15;

type TotpThrottleUser = Pick<User, 'id' | 'totpFailedAttempts' | 'totpLockedUntil'>;

export interface TotpThrottleState {
  locked: boolean;
  retryAfterSec?: number;
}

/** Check the persistent per-account OTP lock without consuming an attempt. */
export function totpThrottleState(user: TotpThrottleUser, now = Date.now()): TotpThrottleState {
  const until = user.totpLockedUntil?.getTime() ?? 0;
  if (until > now) return { locked: true, retryAfterSec: Math.max(1, Math.ceil((until - now) / 1000)) };
  return { locked: false };
}

/** Record one invalid OTP. The fifth failure starts a persistent 15-minute lock. */
export async function recordTotpFailure(userId: string, now = Date.now()): Promise<TotpThrottleState> {
  const updated = await prisma.user.update({
    where: { id: userId },
    data: { totpFailedAttempts: { increment: 1 } },
    select: { totpFailedAttempts: true },
  });
  if (updated.totpFailedAttempts < MAX_TOTP_FAILURES) return { locked: false };

  const until = new Date(now + TOTP_LOCK_MINUTES * 60_000);
  await prisma.user.update({ where: { id: userId }, data: { totpLockedUntil: until } });
  return { locked: true, retryAfterSec: TOTP_LOCK_MINUTES * 60 };
}

/** A valid OTP clears both expired/active lock metadata and the failure count. */
export async function clearTotpFailures(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: { totpFailedAttempts: 0, totpLockedUntil: null },
  });
}
