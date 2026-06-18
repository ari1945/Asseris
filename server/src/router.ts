import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from './trpc';
import { prisma } from './db';
import { hashPassword, verifyPassword } from './auth/password';
import { generateSecret, verifyTotp as checkTotp, otpauthUrl } from './auth/totp';
import { createSession, revokeSession } from './auth/session';
import { logAuthEvent } from './auth/events';
import { can, capForWrite, CAP } from './rbac';

const scopeEnum = z.enum(['engagement', 'firm', 'user']);

const stateKey = z.object({
  scope: scopeEnum,
  scopeId: z.string().min(1),
  key: z.string().min(1),
});

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

// Brute-force lockout policy.
const MAX_FAILED = 5;
const LOCK_MINUTES = 15;

// The user shape the client may see — never the passwordHash/totpSecret.
function publicUser(u: User) {
  return { id: u.id, name: u.name, initials: u.initials, role: u.role, email: u.email, totpEnabled: u.totpEnabled };
}

// Generic credential failure — same message for unknown email vs wrong password, so the
// endpoint can't be used to enumerate accounts.
const badCreds = () => new TRPCError({ code: 'UNAUTHORIZED', message: 'invalid-credentials' });

// W7 Fase 1 — server-side RBAC gate for StateDoc writes. The real enforcement boundary:
// the UI's can() is convenience, this is what actually stops a wrong-role write.
function assertCanWrite(user: { id: string; role: string }, scope: string, scopeId: string, key: string) {
  if (scope === 'user') {
    // Own profile/prefs only — unless you administer the firm.
    if (scopeId === user.id || can(user.role, CAP.FIRM_ADMIN)) return;
    throw new TRPCError({ code: 'FORBIDDEN', message: 'not-owner' });
  }
  const cap = capForWrite(scope, key);
  if (cap && !can(user.role, cap)) {
    throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${cap}` });
  }
}

export const appRouter = router({
  // W7 — authentication. login/me are public (no session yet); the rest require one.
  auth: router({
    login: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string().min(1), totp: z.string().optional() }))
      .mutation(async ({ input, ctx }) => {
        const meta = { ip: ctx.ip, userAgent: ctx.userAgent };
        const user = await prisma.user.findUnique({ where: { email: input.email } });
        if (!user || !user.passwordHash) {
          await logAuthEvent('LOGIN_FAIL', { ...meta, detail: `unknown:${input.email}` });
          throw badCreds();
        }
        if (user.lockedUntil && user.lockedUntil.getTime() > Date.now()) {
          throw new TRPCError({ code: 'FORBIDDEN', message: 'account-locked' });
        }
        if (!(await verifyPassword(input.password, user.passwordHash))) {
          const failed = user.failedLogins + 1;
          const lock = failed >= MAX_FAILED;
          await prisma.user.update({
            where: { id: user.id },
            data: lock
              ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MINUTES * 60_000) }
              : { failedLogins: failed },
          });
          await logAuthEvent(lock ? 'LOCKOUT' : 'LOGIN_FAIL', { ...meta, userId: user.id, detail: `failed=${failed}` });
          throw badCreds();
        }
        if (user.totpEnabled) {
          if (!input.totp || !user.totpSecret || !checkTotp(user.totpSecret, input.totp)) {
            await logAuthEvent('LOGIN_FAIL', { ...meta, userId: user.id, detail: 'totp' });
            throw new TRPCError({ code: 'UNAUTHORIZED', message: 'totp-required' });
          }
        }
        // Success — clear the failure counter and open a session.
        if (user.failedLogins !== 0 || user.lockedUntil) {
          await prisma.user.update({ where: { id: user.id }, data: { failedLogins: 0, lockedUntil: null } });
        }
        const session = await createSession(user.id, meta);
        await logAuthEvent('LOGIN', { ...meta, userId: user.id });
        return { token: session.token, user: publicUser(user) };
      }),

    me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.token) await revokeSession(ctx.token);
      await logAuthEvent('LOGOUT', { userId: ctx.user.id, ip: ctx.ip, userAgent: ctx.userAgent });
      return { ok: true };
    }),

    changePassword: protectedProcedure
      .input(z.object({ oldPassword: z.string().min(1), newPassword: z.string().min(12) }))
      .mutation(async ({ ctx, input }) => {
        const u = await prisma.user.findUnique({ where: { id: ctx.user.id } });
        if (!u?.passwordHash || !(await verifyPassword(input.oldPassword, u.passwordHash))) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'wrong-password' });
        }
        await prisma.user.update({ where: { id: u.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
        await logAuthEvent('PASSWORD_CHANGE', { userId: u.id, ip: ctx.ip, userAgent: ctx.userAgent });
        return { ok: true };
      }),

    // Step 1 of TOTP enrolment: mint a secret (totpEnabled stays false until verifyTotp).
    enrollTotp: protectedProcedure.mutation(async ({ ctx }) => {
      const secret = generateSecret();
      await prisma.user.update({ where: { id: ctx.user.id }, data: { totpSecret: secret, totpEnabled: false } });
      await logAuthEvent('TOTP_ENROLL', { userId: ctx.user.id, ip: ctx.ip, userAgent: ctx.userAgent });
      return { secret, otpauthUrl: otpauthUrl(secret, ctx.user.email ?? ctx.user.id) };
    }),

    // Step 2: confirm the user can produce a valid code, then arm 2FA.
    verifyTotp: protectedProcedure
      .input(z.object({ token: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        const u = await prisma.user.findUnique({ where: { id: ctx.user.id } });
        if (!u?.totpSecret || !checkTotp(u.totpSecret, input.token)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'invalid-totp' });
        }
        await prisma.user.update({ where: { id: u.id }, data: { totpEnabled: true } });
        await logAuthEvent('TOTP_VERIFY', { userId: u.id, ip: ctx.ip, userAgent: ctx.userAgent });
        return { ok: true };
      }),
  }),

  // Reference list for pickers (client roster + engagement select). W7 Fase 1: any
  // authenticated role may read (no per-engagement data isolation in W7 — that is W7.5/W9).
  engagement: router({
    list: protectedProcedure.query(() =>
      prisma.engagement.findMany({ include: { client: true }, orderBy: { id: 'asc' } }),
    ),
  }),

  // One round-trip boot payload: core entities + this engagement's WTB + its open state docs.
  // Used by the client to hydrate window.AMS before canon computes. Requires a session.
  bootstrap: protectedProcedure
    .input(z.object({ engagementId: z.string().min(1) }))
    .query(async ({ input }) => {
      const [firm, users, team, clients, engagements, wtb, states] = await Promise.all([
        prisma.firm.findFirst(),
        prisma.user.findMany(),
        prisma.teamMember.findMany(),
        prisma.client.findMany({ orderBy: { id: 'asc' } }),
        prisma.engagement.findMany({ orderBy: { id: 'asc' } }),
        prisma.wtbRow.findMany({ where: { engagementId: input.engagementId }, orderBy: { ord: 'asc' } }),
        prisma.stateDoc.findMany({ where: { scope: 'engagement', scopeId: input.engagementId } }),
      ]);
      return { firm, users, team, clients, engagements, wtb, states };
    }),

  state: router({
    // Read a single versioned doc. Missing → { value: null, version: 0 } (the "create next" signal).
    // W7 Fase 1: requires a session (reads are role-agnostic in W7; data isolation is W7.5/W9).
    get: protectedProcedure.input(stateKey).query(async ({ input }) => {
      const doc = await prisma.stateDoc.findUnique({
        where: { scope_scopeId_key: input },
      });
      if (!doc) return { value: null as unknown, version: 0 };
      return { value: JSON.parse(doc.valueJson) as unknown, version: doc.version };
    }),

    // Optimistic-concurrency write. baseVersion=0 ⇒ expect to create; >0 ⇒ atomic
    // compare-and-swap. A losing writer gets CONFLICT (→ HTTP 409) and must refetch.
    // W7 Fase 1: RBAC-gated by (scope,key); updatedBy comes from the session, not the client.
    set: protectedProcedure
      .input(
        stateKey.extend({
          value: z.unknown(),
          baseVersion: z.number().int().nonnegative(),
        }),
      )
      .mutation(async ({ input, ctx }) => {
        const { scope, scopeId, key, baseVersion } = input;
        assertCanWrite(ctx.user, scope, scopeId, key);
        const valueJson = JSON.stringify(input.value ?? null);
        const updatedBy = ctx.user.id;

        if (baseVersion === 0) {
          try {
            const created = await prisma.stateDoc.create({
              data: { scope, scopeId, key, valueJson, version: 1, updatedBy },
            });
            return { version: created.version };
          } catch (e) {
            if (isUniqueViolation(e)) {
              const current = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: { scope, scopeId, key } } });
              throw new TRPCError({ code: 'CONFLICT', message: `already-exists:server=${current?.version ?? '?'}` });
            }
            throw e;
          }
        }

        // Atomic CAS: the UPDATE only matches when the stored version equals baseVersion.
        const res = await prisma.stateDoc.updateMany({
          where: { scope, scopeId, key, version: baseVersion },
          data: { valueJson, version: { increment: 1 }, updatedBy },
        });
        if (res.count === 0) {
          const current = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: { scope, scopeId, key } } });
          throw new TRPCError({ code: 'CONFLICT', message: `version-mismatch:server=${current?.version ?? 0}` });
        }
        return { version: baseVersion + 1 };
      }),
  }),
});

export type AppRouter = typeof appRouter;
