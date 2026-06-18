import { execSync } from 'node:child_process';
import { rmSync } from 'node:fs';

// Fresh isolated test DB. We delete the file and run a plain (non-destructive)
// `db push` instead of `--force-reset` — the latter trips Prisma 6.19's AI-action
// guardrail (needs explicit consent). Removing the file + creating tables anew is
// equivalent isolation without the destructive flag. DATABASE_URL=file:./test.db is
// resolved relative to the schema dir (server/prisma/) by both CLI and Client.
export default function setup() {
  for (const f of ['prisma/test.db', 'prisma/test.db-journal']) {
    rmSync(f, { force: true });
  }
  execSync('npx prisma db push --skip-generate', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'file:./test.db' },
  });
}
