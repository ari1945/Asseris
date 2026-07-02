#!/usr/bin/env sh
# Deploy-Readiness M6 — restore an encrypted backup into the compose Postgres.
#
# DESTRUCTIVE: the dump was taken with --clean --if-exists, so replaying it DROPS then recreates the
# app objects and overwrites current data. Use on a fresh/standby instance for DR drills, or to roll
# back. After restore you MUST verify the audit hash-chain is intact (a valid backup preserves it):
# open the app → Jejak Audit → audit.verify must report `ok` (see docs/DEPLOY.md §restore).
#
#   BACKUP_ENCRYPTION_KEY=... sh deploy/aws-ec2-test/restore.sh deploy/aws-ec2-test/backups/asseris-<stamp>.sql.gz.enc
set -e
: "${BACKUP_ENCRYPTION_KEY:?set BACKUP_ENCRYPTION_KEY (the SAME key used to take the backup)}"
FILE="${1:?usage: restore.sh <encrypted-backup-file>}"
[ -f "$FILE" ] || { echo "file tidak ditemukan: $FILE"; exit 1; }
COMPOSE="docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env"

echo "Restoring $FILE → Postgres (DESTRUKTIF: drop+recreate objek) …"
openssl enc -d -aes-256-cbc -pbkdf2 -pass env:BACKUP_ENCRYPTION_KEY -in "$FILE" \
  | gunzip \
  | $COMPOSE exec -T db psql -v ON_ERROR_STOP=1 -U neosuite -d neosuite

echo "restore selesai."
echo "→ WAJIB verifikasi integritas: buka app → Jejak Audit → 'audit.verify' harus 'ok' (rantai hash utuh)."
