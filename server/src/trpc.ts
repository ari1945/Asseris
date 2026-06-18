import { initTRPC, TRPCError } from '@trpc/server';
import type { User } from '@prisma/client';

// W7 — the context now carries the authenticated user (or null) resolved from the session
// token by createContext (context.ts). W6 left this empty with a TODO pointing here.
export interface Context {
  user: User | null;
  token: string | null;
  ip?: string | null;
  userAgent?: string | null;
  // W10 — set a response cookie (httpOnly session). Present only on the real HTTP path; tests
  // and the protectedProcedure ctx-narrowing omit it, so callers must treat it as optional.
  setCookie?: (cookie: string) => void;
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Requires a valid session. Narrows ctx.user to non-null for downstream resolvers.
// (Fase 1 adds authorizedProcedure(capability) on top of this for RBAC enforcement.)
export const protectedProcedure = t.procedure.use((opts) => {
  const { ctx } = opts;
  if (!ctx.user) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'auth-required' });
  return opts.next({ ctx: { user: ctx.user } });
});

export const createCallerFactory = t.createCallerFactory;
