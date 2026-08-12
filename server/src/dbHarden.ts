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

// The hardening DDL, as INDIVIDUAL statements. They MUST be issued one at a time: Postgres runs
// $executeRawUnsafe over the extended query protocol (prepared statements), which rejects more than
// one command per call — a single multi-statement string fails with `42601: cannot insert multiple
// commands into a prepared statement`, so the trigger silently never installed on any Postgres
// deploy (caught here as harden_failed, non-fatal, hence long unnoticed). The plpgsql body is
// dollar-quoted ($$…$$), so its internal semicolons stay inside one statement.
const HARDEN_STATEMENTS: readonly string[] = [
  `CREATE OR REPLACE FUNCTION auditlog_append_only() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'AuditLog is append-only: % not permitted (seq=%)', TG_OP, OLD.seq;
END;
$$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS auditlog_no_update ON "AuditLog"`,
  `CREATE TRIGGER auditlog_no_update BEFORE UPDATE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auditlog_append_only()`,
  `DROP TRIGGER IF EXISTS auditlog_no_delete ON "AuditLog"`,
  `CREATE TRIGGER auditlog_no_delete BEFORE DELETE ON "AuditLog"
  FOR EACH ROW EXECUTE FUNCTION auditlog_append_only()`,
  `CREATE OR REPLACE FUNCTION auditoutbox_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'AuditOutbox is durable: DELETE not permitted (id=%)', OLD.id;
  END IF;
  IF (NEW.id, NEW."idempotencyKey", NEW."enqueuedAt", NEW."actorUserId", NEW."actorRole", NEW.action, NEW.scope, NEW."scopeId", NEW.key, NEW.detail)
     IS DISTINCT FROM
     (OLD.id, OLD."idempotencyKey", OLD."enqueuedAt", OLD."actorUserId", OLD."actorRole", OLD.action, OLD.scope, OLD."scopeId", OLD.key, OLD.detail) THEN
    RAISE EXCEPTION 'AuditOutbox immutable payload cannot be changed (id=%)', OLD.id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql`,
  `DROP TRIGGER IF EXISTS auditoutbox_guard_update ON "AuditOutbox"`,
  `CREATE TRIGGER auditoutbox_guard_update BEFORE UPDATE ON "AuditOutbox"
  FOR EACH ROW EXECUTE FUNCTION auditoutbox_guard()`,
  `DROP TRIGGER IF EXISTS auditoutbox_guard_delete ON "AuditOutbox"`,
  `CREATE TRIGGER auditoutbox_guard_delete BEFORE DELETE ON "AuditOutbox"
  FOR EACH ROW EXECUTE FUNCTION auditoutbox_guard()`,
];

// Exported for the regression test that pins "one command per call" (see hardening.test.ts).
export { HARDEN_STATEMENTS };

/**
 * Apply the Postgres-only AuditLog immutability trigger. No-op on SQLite (dev/test rely on being
 * able to UPDATE AuditLog to prove the hash-chain tamper-detection tests — see audit.test.ts). Each
 * statement is issued separately (Postgres forbids multiple commands per prepared-statement call).
 * Failure is fatal in production: without these triggers the database is reachable but not ready
 * to uphold its append-only contract. Non-production keeps the old best-effort behavior so a local
 * SQLite-backed test can force this branch without killing its runner.
 */
export async function hardenAuditLogImmutability(
  databaseUrl = process.env.DATABASE_URL ?? '',
  options: { required?: boolean } = {},
): Promise<void> {
  if (!/^postgres(ql)?:\/\//.test(databaseUrl)) return; // SQLite dev/test — nothing to do
  const required = options.required ?? process.env.NODE_ENV === 'production';
  try {
    for (const stmt of HARDEN_STATEMENTS) {
      await prisma.$executeRawUnsafe(stmt);
    }
    log.info('db.hardened', { triggers: ['auditlog_append_only', 'auditoutbox_guard'] });
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    log.error('db.harden_failed', { error: message, fatal: required });
    if (required) {
      throw new Error(`auditlog-trigger-install-failed: ${message}`, { cause: e });
    }
  }
}
