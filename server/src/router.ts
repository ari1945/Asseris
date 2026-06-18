import { z } from 'zod';
import { Prisma } from '@prisma/client';
import type { User } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure, protectedProcedure } from './trpc';
import { prisma } from './db';
import { hashPassword, verifyPassword } from './auth/password';
import { generateSecret, verifyTotp as checkTotp, otpauthUrl } from './auth/totp';
import { createSession, revokeSession } from './auth/session';
import { buildSessionCookie, clearSessionCookie } from './auth/cookie';
import { logAuthEvent } from './auth/events';
import { can, capForWrite, CAP } from './rbac';
import { assertEngagementAccess, accessibleEngagementIds } from './engagementAccess';
import { readLlmConfig } from './llm/config';
import { redactFindings, buildNarrationPrompt } from './llm/redact';
import { complete } from './llm/providers';
import { rateLimit } from './llm/ratelimit';
import { logLlmEvent } from './llm/events';
import { appendAudit, verifyAuditChain } from './audit/log';
import { encryptSecret, decryptSecret } from './crypto/secretbox';
import { assertIpAllowed } from './security/ipAllowlist';

const scopeEnum = z.enum(['engagement', 'firm', 'user']);

// W8 — inbound finding shape for LLM narration. zod's default object parse STRIPS unknown
// keys, so any extra field a client tacks on (clientName, npwp, wtbRows, party, …) is gone
// before egress — the first layer of the redaction guarantee (redact.ts is the second).
const findingInput = z.object({
  id: z.string(),
  detector: z.string().optional(),
  sev: z.enum(['high', 'med', 'low']),
  std: z.string().optional(),
  title: z.string(),
  detail: z.string().optional(),
  suggestedProcedure: z.string().optional(),
});

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
        // W10 — optional IP allow-list (off unless ADMIN_IP_ALLOWLIST is set). Rejects an
        // off-network login before credentials are even checked.
        assertIpAllowed(ctx.ip);
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
          const secret = user.totpSecret ? decryptSecret(user.totpSecret) : null;
          if (!input.totp || !secret || !checkTotp(secret, input.totp)) {
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
        await appendAudit({ actorUserId: user.id, actorRole: user.role, action: 'LOGIN' });
        // W10 — issue the session as an httpOnly cookie (the client no longer persists the token
        // in localStorage). The token is still returned in the body for tests/curl Bearer use.
        ctx.setCookie?.(buildSessionCookie(session.token));
        return { token: session.token, user: publicUser(user) };
      }),

    me: publicProcedure.query(({ ctx }) => (ctx.user ? publicUser(ctx.user) : null)),

    logout: protectedProcedure.mutation(async ({ ctx }) => {
      if (ctx.token) await revokeSession(ctx.token);
      await logAuthEvent('LOGOUT', { userId: ctx.user.id, ip: ctx.ip, userAgent: ctx.userAgent });
      await appendAudit({ actorUserId: ctx.user.id, actorRole: ctx.user.role, action: 'LOGOUT' });
      ctx.setCookie?.(clearSessionCookie()); // W10 — drop the httpOnly cookie on logout
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
      // W10 — store the secret encrypted-at-rest; the otpauthUrl/secret returned here (once, to
      // show the QR during enrolment) is the only time it leaves the server in the clear.
      await prisma.user.update({ where: { id: ctx.user.id }, data: { totpSecret: encryptSecret(secret), totpEnabled: false } });
      await logAuthEvent('TOTP_ENROLL', { userId: ctx.user.id, ip: ctx.ip, userAgent: ctx.userAgent });
      return { secret, otpauthUrl: otpauthUrl(secret, ctx.user.email ?? ctx.user.id) };
    }),

    // Step 2: confirm the user can produce a valid code, then arm 2FA.
    verifyTotp: protectedProcedure
      .input(z.object({ token: z.string().min(6) }))
      .mutation(async ({ ctx, input }) => {
        const u = await prisma.user.findUnique({ where: { id: ctx.user.id } });
        const secret = u?.totpSecret ? decryptSecret(u.totpSecret) : null;
        if (!u || !secret || !checkTotp(secret, input.token)) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'invalid-totp' });
        }
        await prisma.user.update({ where: { id: u.id }, data: { totpEnabled: true } });
        await logAuthEvent('TOTP_VERIFY', { userId: u.id, ip: ctx.ip, userAgent: ctx.userAgent });
        return { ok: true };
      }),

    // This user's live sessions (token never leaves the server) — `current` flags this one.
    sessions: protectedProcedure.query(async ({ ctx }) => {
      const rows = await prisma.session.findMany({
        where: { userId: ctx.user.id, revokedAt: null },
        orderBy: { lastSeenAt: 'desc' },
      });
      const now = Date.now();
      return rows
        .filter((r) => r.expiresAt.getTime() > now)
        .map((r) => ({
          id: r.id, createdAt: r.createdAt, lastSeenAt: r.lastSeenAt, expiresAt: r.expiresAt,
          userAgent: r.userAgent, ip: r.ip, current: r.token === ctx.token,
        }));
    }),

    // "Log out everywhere else" — revoke every session except the one making the call.
    revokeOtherSessions: protectedProcedure.mutation(async ({ ctx }) => {
      const res = await prisma.session.updateMany({
        where: { userId: ctx.user.id, revokedAt: null, NOT: { token: ctx.token ?? '' } },
        data: { revokedAt: new Date() },
      });
      return { revoked: res.count };
    }),

    // Recent authentication audit events for this user (login/logout/2FA/password/lockout).
    events: protectedProcedure.query(async ({ ctx }) => {
      const rows = await prisma.authEvent.findMany({
        where: { userId: ctx.user.id },
        orderBy: { ts: 'desc' },
        take: 12,
      });
      return rows.map((e) => ({ kind: e.kind, ts: e.ts, ip: e.ip, detail: e.detail }));
    }),
  }),

  // W8 — server-side LLM proxy. The key lives in server env (never the browser); the
  // server owns the prompt and redacts egress to deterministic finding text only (Q1=A).
  llm: router({
    // Is a real LLM configured? Drives the honest UI badge (configured → narration enabled;
    // not → deterministic-only). No secrets returned — only provider/model labels.
    status: protectedProcedure.query(({ ctx }) => {
      const cfg = readLlmConfig();
      return {
        configured: cfg !== null,
        canUse: can(ctx.user.role, CAP.LLM_USE),
        provider: cfg?.provider ?? null,
        model: cfg?.model ?? null,
      };
    }),

    // Narrate deterministic diagnostic findings. Gated by CAP.LLM_USE, rate-limited per
    // user, egress-redacted, audited (usage only). Returns {status:'not-configured'} when
    // no key is set so the client degrades gracefully instead of erroring.
    complete: protectedProcedure
      .input(z.object({ task: z.literal('narrate-diagnostics'), findings: z.array(findingInput).min(1).max(50) }))
      .mutation(async ({ ctx, input }) => {
        if (!can(ctx.user.role, CAP.LLM_USE)) {
          await logLlmEvent('FORBIDDEN', { userId: ctx.user.id });
          throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${CAP.LLM_USE}` });
        }
        const cfg = readLlmConfig();
        if (!cfg) {
          await logLlmEvent('NOT_CONFIGURED', { userId: ctx.user.id });
          return { status: 'not-configured' as const };
        }
        const rl = rateLimit(ctx.user.id);
        if (!rl.ok) {
          await logLlmEvent('RATE_LIMIT', { userId: ctx.user.id, detail: `retryAfter=${rl.retryAfterSec}s` });
          throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: `retry-after:${rl.retryAfterSec}` });
        }
        const safe = redactFindings(input.findings);
        const { system, user } = buildNarrationPrompt(safe);
        let result;
        try {
          result = await complete(cfg, { system, user });
        } catch (e) {
          await logLlmEvent('ERROR', { userId: ctx.user.id, provider: cfg.provider, model: cfg.model });
          // Generic — never surface the key or raw upstream body to the client.
          throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'llm-request-failed' });
        }
        await logLlmEvent('NARRATE', {
          userId: ctx.user.id, provider: cfg.provider, model: cfg.model,
          detail: `findings=${safe.length}; in=${result.usage?.input ?? '?'} out=${result.usage?.output ?? '?'}`,
        });
        await appendAudit({
          actorUserId: ctx.user.id, actorRole: ctx.user.role, action: 'LLM_NARRATE',
          detail: `findings=${safe.length}; ${cfg.provider}/${cfg.model}`,
        });
        return { status: 'ok' as const, text: result.text, provider: cfg.provider, model: cfg.model, usage: result.usage };
      }),
  }),

  // Reference list for pickers (client roster + engagement select). W7.5: filtered to the
  // engagements the caller may access (oversight roles → all; others → their memberships).
  engagement: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      const acc = await accessibleEngagementIds(ctx.user);
      const where = acc === 'all' ? {} : { id: { in: acc } };
      return prisma.engagement.findMany({ where, include: { client: true }, orderBy: { id: 'asc' } });
    }),
  }),

  // W10 — read-only window onto the server-side append-only audit chain. No mutation path
  // exists (appends happen internally as a side-effect of audited actions), so a client can
  // read and verify history but never rewrite it. Gated by AUDIT_VIEW (Partner/Manager).
  audit: router({
    // Recent chain rows, newest first. `detail` is metadata only (key + version delta), so
    // this is safe to return firm-wide without leaking another engagement's working data.
    list: protectedProcedure
      .input(z.object({ limit: z.number().int().min(1).max(200).default(50) }).optional())
      .query(async ({ ctx, input }) => {
        if (!can(ctx.user.role, CAP.AUDIT_VIEW)) {
          throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${CAP.AUDIT_VIEW}` });
        }
        const rows = await prisma.auditLog.findMany({ orderBy: { seq: 'desc' }, take: input?.limit ?? 50 });
        return rows.map((r) => ({
          seq: r.seq, ts: r.ts, actorUserId: r.actorUserId, actorRole: r.actorRole,
          action: r.action, scope: r.scope, scopeId: r.scopeId, key: r.key, detail: r.detail,
          prevHash: r.prevHash, hash: r.hash,
        }));
      }),

    // Recompute the whole chain server-side and report the first break (tamper-evidence).
    verify: protectedProcedure.query(async ({ ctx }) => {
      if (!can(ctx.user.role, CAP.AUDIT_VIEW)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${CAP.AUDIT_VIEW}` });
      }
      return verifyAuditChain();
    }),
  }),

  // One round-trip boot payload: core entities + this engagement's WTB + its open state docs.
  // Used by the client to hydrate window.AMS before canon computes. Requires a session AND
  // (W7.5) access to the requested engagement.
  bootstrap: protectedProcedure
    .input(z.object({ engagementId: z.string().min(1) }))
    .query(async ({ input, ctx }) => {
      await assertEngagementAccess(ctx.user, input.engagementId);
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
    // W7.5: an engagement-scoped read requires access to that engagement (isolation applies to
    // reads, not just writes — you can't read another engagement's working papers).
    get: protectedProcedure.input(stateKey).query(async ({ input, ctx }) => {
      if (input.scope === 'engagement') await assertEngagementAccess(ctx.user, input.scopeId);
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
        // W7.5 — engagement isolation first (may you touch this engagement at all?), then the
        // W7 capability gate (may your role write this key?).
        if (scope === 'engagement') await assertEngagementAccess(ctx.user, scopeId);
        assertCanWrite(ctx.user, scope, scopeId, key);
        const valueJson = JSON.stringify(input.value ?? null);
        const updatedBy = ctx.user.id;

        if (baseVersion === 0) {
          try {
            const created = await prisma.stateDoc.create({
              data: { scope, scopeId, key, valueJson, version: 1, updatedBy },
            });
            await appendAudit({
              actorUserId: ctx.user.id, actorRole: ctx.user.role, action: 'STATE_SET',
              scope, scopeId, key, detail: 'v0->v1',
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
        await appendAudit({
          actorUserId: ctx.user.id, actorRole: ctx.user.role, action: 'STATE_SET',
          scope, scopeId, key, detail: `v${baseVersion}->v${baseVersion + 1}`,
        });
        return { version: baseVersion + 1 };
      }),
  }),
});

export type AppRouter = typeof appRouter;
