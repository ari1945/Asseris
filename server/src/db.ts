import { PrismaClient } from '@prisma/client';

// Prisma Client reads DATABASE_URL at init but does NOT auto-load .env (only the CLI
// does). Default to the dev SQLite file so `tsx src/server.ts` works with no env set.
// SQLite relative paths are anchored to the schema dir in both CLI and Client, so this
// stays consistent with `prisma db push`. Tests inject an isolated file via vitest env.
process.env.DATABASE_URL ??= 'file:./dev.db';

export const prisma = new PrismaClient();
