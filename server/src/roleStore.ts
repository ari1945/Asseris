// RBAC admin console (PRD docs/prd-rbac-admin-console.md) — DB-backed replacement for the static
// GRANTS map that used to live in migration/src/rbac.ts. That file is shared verbatim with the
// CLIENT bundle (no DB access there, and its own can() stays a cosmetic sync lookup — see rbac.ts
// header comment), so the DB-backed swap happens ONLY here, server-side.
//
// Design goal: zero changes to the 73 existing `can(role, cap)` call sites (18 server, 55 client).
// That's only possible if `can()` stays SYNCHRONOUS — so roles are hydrated into an in-memory
// Map<roleName, Set<cap>> once at boot (awaited before the HTTP server starts listening in
// server.ts) and refreshed in full after every roles.create/updateGrants/delete mutation. This is a
// single-process cache: it does NOT propagate across instances, which is fine today (single-box
// deploy per docs/DEPLOY.md) and is called out as an explicit limitation in the PRD (§9).
//
// Single-firm assumption: like the rest of this codebase (see server/src/router.ts bootstrap's
// `prisma.firm.findFirst()`), this cache is a flat Map keyed by role NAME only, not (firmId, name).
// That mirrors the old static GRANTS object exactly and matches the app's single-tenant-per-instance
// reality — there has only ever been one Firm row. Multi-firm-per-instance is explicit Non-Scope.
//
// NEVER-HYDRATED FALLBACK: cache starts as `null`, not an empty Map. A LOT of existing server tests
// (__tests__/authz.test.ts, state.test.ts, task_agg.test.ts, …) talk to the Prisma test DB directly
// via router procedures and never boot server.ts — so refreshRoleCache() is never called and no Role
// rows necessarily exist. Treating `null` as "fall back to the pre-migration static GRANTS lookup"
// keeps every one of those tests passing unchanged (PRD §3 success criterion 7: zero regression
// across the 73 call sites). Once refreshRoleCache() hydrates AT LEAST ONE Role row (real server boot
// after seed, or a test that explicitly seeds Role rows + calls it), the DB takes over completely —
// including an explicit empty capsJson array, which correctly denies everything for that role. A
// refresh that finds an EMPTY table is treated as still-not-seeded and preserves the static fallback
// (cache stays null) rather than denying everything — see refreshRoleCache() below for why.
import { prisma } from './db';
// @ts-ignore — ../../migration/src/rbac is untyped canonical JS shared with the client.
import { GRANTS as STATIC_GRANTS } from '../../migration/src/rbac';

const staticGrants = STATIC_GRANTS as Record<string, string[]>;

let cache: Map<string, Set<string>> | null = null;

/** True if `role` is granted `cap` per the current cache (or the static fallback — see header
 * comment). Unknown role/cap → false (deny by default), same semantics as before this migration. */
export function roleCan(role: string, cap: string): boolean {
  if (cache === null) return (staticGrants[role] ?? []).includes(cap);
  return cache.get(role)?.has(cap) ?? false;
}

/** All capabilities currently granted to `role` (empty array for an unknown role). Used by the
 * roles.list endpoint and by the FIRM_ADMIN-retention guardrail in roles.updateGrants. */
export function roleCaps(role: string): string[] {
  if (cache === null) return [...(staticGrants[role] ?? [])];
  return Array.from(cache.get(role) ?? []);
}

/** Every role name currently known (DB rows once hydrated, else the static catalog's keys). Used
 * by the guardrail to check "does ANY role still hold FIRM_ADMIN". */
export function cachedRoleNames(): string[] {
  if (cache === null) return Object.keys(staticGrants);
  return Array.from(cache.keys());
}

async function loadFromDb(): Promise<Map<string, Set<string>>> {
  const rows = await prisma.role.findMany();
  const next = new Map<string, Set<string>>();
  for (const r of rows) {
    let caps: unknown;
    try {
      caps = JSON.parse(r.capsJson);
    } catch {
      caps = [];
    }
    next.set(r.name, new Set(Array.isArray(caps) ? (caps as string[]) : []));
  }
  return next;
}

/** Hydrate the cache from the DB. MUST be awaited before the server starts accepting requests
 * (server.ts) — otherwise the cache would still be the (safe) static fallback rather than
 * reflecting any admin customization already saved to Postgres/SQLite. Also called by roles.*
 * mutations (server/src/router.ts) after a successful write, so a capability change is visible to
 * the very next request — no restart, no TTL lag. */
export async function refreshRoleCache(): Promise<void> {
  const next = await loadFromDb();
  // EMPTY-TABLE = NOT-YET-SEEDED: keep the static-fallback (cache === null) rather than clobbering it
  // with an empty Map that would deny every capability. This is the normal `docker compose up` order
  // on a fresh deploy — the long-running server boots and hydrates BEFORE `npm run seed` populates
  // the Role table, and the cache is only refreshed again on a roles.* mutation (never on an external
  // seed). Hydrating to an empty Map there left the whole instance deny-all until restart (a Managing
  // Partner could not even read the audit trail — surfaced by the restore-drill: audit.verify → 403).
  // An admin can never leave ZERO roles (the FIRM_ADMIN-retention guardrail in roles.updateGrants),
  // so a truly empty table only ever means "pre-seed". Once ANY role row exists the DB takes over
  // completely — including a role whose capsJson is an explicit `[]`, which still denies (size > 0).
  cache = next.size === 0 ? null : next;
}

/** Test-only escape hatch: force the cache back to "never hydrated" so a test can verify the
 * static-fallback path in isolation. Not used by production code. */
export function __resetRoleCacheForTests(): void {
  cache = null;
}
