#!/usr/bin/env sh
# Deploy-Readiness M4 — regenerate the Postgres BASELINE migration OFFLINE (no DB needed).
#
# Dual-provider by design: dev stays zero-ops SQLite (schema.prisma provider="sqlite", `prisma db
# push`); PROD uses the versioned Postgres migrations under prisma/migrations/ (`prisma migrate
# deploy`), with the provider flipped to postgresql at IMAGE BUILD time (server/Dockerfile sed).
# migration_lock.toml therefore says postgresql even though the committed schema says sqlite — that
# is intentional and only matters to the prod `migrate` path, never to dev `db push`.
#
# Baseline (0_init) — safe to re-run; overwrites 0_init from the CURRENT models. No database needed
# (migrate diff --from-empty computes the DDL purely from the datamodel):
#   sh prisma/gen-pg-migrations.sh
#
# INCREMENTAL migration (schema change N→N+1) CANNOT be generated fully offline — replaying prior
# migrations needs a throwaway Postgres SHADOW DB (e.g. the compose `db` service):
#   tmp=$(mktemp).prisma; sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > "$tmp"
#   npx prisma migrate diff --shadow-database-url "$SHADOW_URL" \
#     --from-migrations ./prisma/migrations --to-schema-datamodel "$tmp" \
#     --script > "prisma/migrations/$(date +%Y%m%d%H%M%S)_<name>/migration.sql"
# See docs/DEPLOY.md for the full upgrade runbook.
set -e
cd "$(dirname "$0")/.."
tmp="$(mktemp).prisma"
sed 's/provider = "sqlite"/provider = "postgresql"/' prisma/schema.prisma > "$tmp"
mkdir -p prisma/migrations/0_init
npx prisma migrate diff --from-empty --to-schema-datamodel "$tmp" --script > prisma/migrations/0_init/migration.sql
printf 'provider = "postgresql"\n' > prisma/migrations/migration_lock.toml
rm -f "$tmp"
echo "Regenerated prisma/migrations/0_init/migration.sql ($(grep -c 'CREATE TABLE' prisma/migrations/0_init/migration.sql) tables)"
