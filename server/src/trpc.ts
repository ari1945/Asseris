import { initTRPC } from '@trpc/server';

// W6 has no auth (that is W7) — context is empty. W7 will populate it with the
// authenticated user/role from the session, and updatedBy will come from here.
export type Context = Record<string, never>;

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;
export const createCallerFactory = t.createCallerFactory;
