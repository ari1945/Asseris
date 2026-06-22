// W7 — typed wrapper over the shared capability map (single SSOT also imported by the
// client UI). Same cross-package trick as seedData.ts: the migration module is untyped
// JS, so we suppress the resolution error and re-export with explicit types.
// @ts-ignore — ../../migration/src/rbac is untyped canonical JS shared with the client.
import { CAP as _CAP, can as _can, capForWrite as _capForWrite, ROLES as _ROLES } from '../../migration/src/rbac';

export type Capability = string;

export const CAP = _CAP as Record<string, Capability>;
export const ROLES = _ROLES as readonly string[];

export function can(role: string, cap: Capability): boolean {
  return _can(role, cap) as boolean;
}

/** Capability required to write a StateDoc (scope,key); null = auth-only. */
export function capForWrite(scope: string, key: string): Capability | null {
  return _capForWrite(scope, key) as Capability | null;
}
