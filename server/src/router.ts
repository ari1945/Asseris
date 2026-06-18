import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from './trpc';
import { prisma } from './db';

const scopeEnum = z.enum(['engagement', 'firm', 'user']);

const stateKey = z.object({
  scope: scopeEnum,
  scopeId: z.string().min(1),
  key: z.string().min(1),
});

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
}

export const appRouter = router({
  // Reference list for pickers (client roster + engagement select).
  engagement: router({
    list: publicProcedure.query(() =>
      prisma.engagement.findMany({ include: { client: true }, orderBy: { id: 'asc' } }),
    ),
  }),

  // One round-trip boot payload: core entities + this engagement's WTB + its open state docs.
  // Used by the client to hydrate window.AMS before canon computes (Fase 3).
  bootstrap: publicProcedure
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
    get: publicProcedure.input(stateKey).query(async ({ input }) => {
      const doc = await prisma.stateDoc.findUnique({
        where: { scope_scopeId_key: input },
      });
      if (!doc) return { value: null as unknown, version: 0 };
      return { value: JSON.parse(doc.valueJson) as unknown, version: doc.version };
    }),

    // Optimistic-concurrency write. baseVersion=0 ⇒ expect to create; >0 ⇒ atomic
    // compare-and-swap. A losing writer gets CONFLICT (→ HTTP 409) and must refetch.
    set: publicProcedure
      .input(
        stateKey.extend({
          value: z.unknown(),
          baseVersion: z.number().int().nonnegative(),
          updatedBy: z.string().optional(),
        }),
      )
      .mutation(async ({ input }) => {
        const { scope, scopeId, key, baseVersion } = input;
        const valueJson = JSON.stringify(input.value ?? null);
        const updatedBy = input.updatedBy ?? null;

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
