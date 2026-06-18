// W8 — load env files into process.env at server startup. The Node runtime does NOT
// auto-load .env (only the Prisma CLI does), so without this an LLM_API_KEY placed in
// server/.env(.local) would never reach the running server. Built-in (process.loadEnvFile,
// Node ≥20.12) — no dotenv dep, consistent with the nol-vendor stance.
//
// MUST be imported FIRST (before db.ts/llm/config read process.env). ESM evaluates imported
// modules in source order, so `import './env'` as server.ts's first import guarantees that.
// Order: .env (shared, tracked, DATABASE_URL) then .env.local (gitignored secrets) — the
// later load overrides, so .env.local wins for any shared key.
import { existsSync } from 'node:fs';

for (const file of ['.env', '.env.local']) {
  try {
    if (existsSync(file)) process.loadEnvFile(file);
  } catch {
    /* malformed/locked file — ignore and fall back to whatever is already in process.env */
  }
}
