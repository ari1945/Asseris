// K5 hardening — defense-in-depth against direct-DB tampering of the AuditLog hash chain.
// audit/log.ts already guarantees APP-LAYER append-only (no update/delete tRPC endpoint); this
// closes the DB-layer gap: a Postgres trigger rejects any UPDATE/DELETE on "AuditLog", even from
// a client holding valid database credentials. Not absolute (a superuser can still DROP TRIGGER),
// but it raises the bar from "any DB write access" to "DDL privilege + intent to defeat the guard".
//
// SQLite (dev/test) has no PL/pgSQL, so this is a deliberate no-op there — detected by inspecting
// DATABASE_URL, not a feature flag, so it self-applies on every Postgres boot with zero deploy-time
// manual steps. Idempotent (CREATE OR REPLACE + DROP TRIGGER IF EXISTS) — safe on every boot,
// including against an already-hardened database.
import { prisma } from './db';
import { log } from './obs/log';

const HARDEN_SQL = `
CREATE OR REPLACE FUNCTION auditlog_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % not permitted (seq=%)', TG_OP, OLD.seq;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog";
CREATE TRIGGER auditlog_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auditlog_append_only();

DROP TRIGGER IF EXISTS auditlog_no_delete ON "AuditLog";
CREATE TRIGGER auditlog_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auditlog_append_only();
`;

/**
 * Apply the Postgres-only AuditLog immutability trigger. No-op on SQLite. Failure is logged
 * loudly but NON-FATAL — the app-layer guarantee (no update/delete endpoint) still holds even
 * if the DB user lacks CREATE TRIGGER privilege; ops should treat a harden_failed log line as
 * an action item (grant privileges), not accept it silently.
 */
export async function hardenAuditLogImmutability(databaseUrl = process.env.DATABASE_URL ?? ''): Promise<void> {
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) return; // SQLite dev/test — nothing to do
  try {
    await prisma.$executeRawUnsafe(HARDEN_SQL);
    log.info('db.hardened', { trigger: 'auditlog_append_only' });
  } catch (e) {
    log.error('db.harden_failed', { error: e instanceof Error ? e.message : String(e) });
  }
}
