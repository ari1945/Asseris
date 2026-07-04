// W7 — typed wrapper over the shared capability CATALOG (CAP keys + capForWrite mapping stay the
// client/server SSOT, imported from the untyped migration module exactly as before). `can()` itself
// no longer delegates to that module's static GRANTS — see roleStore.ts header for why the DB-backed
// swap had to happen here rather than in the shared file (client bundle can't hit the DB, and this
// wrapper is the one place already sitting on the server side of that boundary).
// @ts-ignore — ../../migration/src/rbac is untyped canonical JS shared with the client.
import { CAP as _CAP, capForWrite as _capForWrite, ROLES as _ROLES } from '../../migration/src/rbac';
import { roleCan } from './roleStore';

export type Capability = string;

export const CAP = _CAP as Record<string, Capability>;
export const ROLES = _ROLES as readonly string[];

/** RBAC admin console (PRD docs/prd-rbac-admin-console.md) — DB-backed via roleStore's in-memory
 * cache, NOT the static GRANTS map anymore. Same signature and same "unknown role/cap → deny"
 * semantics, so none of the 18 server call sites needed to change. */
export function can(role: string, cap: Capability): boolean {
  return roleCan(role, cap);
}

/** Capability required to write a StateDoc (scope,key); null = auth-only. */
export function capForWrite(scope: string, key: string): Capability | null {
  return _capForWrite(scope, key) as Capability | null;
}
