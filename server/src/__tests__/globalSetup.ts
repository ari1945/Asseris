import { execFileSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Fresh isolated test DB. We delete the file and run a plain (non-destructive)
// `db push` instead of `--force-reset` — the latter trips Prisma 6.19's AI-action
// guardrail (needs explicit consent). Removing the file + creating tables anew is
// equivalent isolation without the destructive flag. DATABASE_URL=file:./test.db is
// resolved relative to the schema dir (server/prisma/) by both CLI and Client.
export default function setup() {
  for (const f of ['prisma/test.db', 'prisma/test.db-journal']) {
    rmSync(f, { force: true });
  }
  // Prisma's Windows schema engine cannot create a missing SQLite file reliably on
  // every local setup (it exits with the opaque "Schema engine error"). Pre-creating
  // the empty file keeps the setup deterministic. Invoke the project-local CLI with
  // the current Node executable as well: this avoids relying on a global `npx` shim.
  writeFileSync('prisma/test.db', '');
  execFileSync(process.execPath, [resolve('node_modules/prisma/build/index.js'), 'db', 'push', '--skip-generate'], {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL ?? 'file:./test.db' },
  });
}
