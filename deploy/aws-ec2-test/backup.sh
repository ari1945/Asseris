#!/usr/bin/env sh
# Deploy-Readiness M6 — encrypted Postgres backup for the single-box deploy.
#
# Runs pg_dump inside the compose `db` container, gzip, then AES-256 encrypt with a SEPARATE key
# (BACKUP_ENCRYPTION_KEY ≠ APP_ENCRYPTION_KEY — separation of duties, PRD decision 2026-07-01),
# writes a UTC-dated file, and prunes dumps older than RETENTION_DAYS (default 30 → daily/30d policy).
# The dump is --clean --if-exists so restore.sh can replay it over an existing (migrated) schema, and
# it covers the WHOLE db incl. the AuditLog hash-chain (verify after restore — see docs/DEPLOY.md).
#
# Manual:  BACKUP_ENCRYPTION_KEY=... sh deploy/aws-ec2-test/backup.sh
# Daily (host crontab — the "scheduled job", low-ops single-box), e.g. 02:30 local:
#   30 2 * * *  cd /home/ubuntu/Asseris && BACKUP_ENCRYPTION_KEY=xxfrom-a-filexx \
#               sh deploy/aws-ec2-test/backup.sh >> /var/log/asseris-backup.log 2>&1
#
# Off-box copy (opt-in, 2026-07-02 — a single EC2 box is not durable, docs/DEPLOY.md §6 flagged
# this for months before it was automated, see docs/prd-backup-restore-dr-hardening.md): set
# BACKUP_S3_BUCKET to also copy the dump to S3 right after it's written. Default unset = fully
# unchanged behavior (local-only), same opt-in shape as SECRETS_PROVIDER in server/src/secrets.ts.
# Auth via the AWS CLI's default credential chain (EC2 instance profile) — no access keys here.
#   BACKUP_ENCRYPTION_KEY=... BACKUP_S3_BUCKET=my-asseris-backups sh deploy/aws-ec2-test/backup.sh
# BACKUP_S3_ENDPOINT is for testing against an S3-compatible target (e.g. MinIO in CI) — leave
# unset in production so the AWS CLI hits real S3.
set -e
: "${BACKUP_ENCRYPTION_KEY:?set BACKUP_ENCRYPTION_KEY (openssl rand -hex 32) — SEPARATE from APP_ENCRYPTION_KEY}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DIR="${BACKUP_DIR:-./backups}"
COMPOSE="docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env"

mkdir -p "$DIR"
STAMP=$(date -u +%Y%m%dT%H%M%SZ)
OUT="$DIR/asseris-$STAMP.sql.gz.enc"

# Transactionally-consistent dump of the entire database → gzip → AES-256-CBC (PBKDF2 + salt).
$COMPOSE exec -T db pg_dump --clean --if-exists -U neosuite -d neosuite \
  | gzip \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY \
  > "$OUT"

echo "backup → $OUT ($(wc -c < "$OUT") bytes, UTC $STAMP)"

# Off-box copy (opt-in — see header). The local file above ALWAYS stays as the interim safety
# net regardless of what happens here; this only ADDS a second copy, never replaces local
# retention. Failure is LOUD (non-zero exit + a distinct, greppable marker) so a cron log/mail
# surfaces it — this script does not page anyone; real alerting is a separate, still-open gap.
if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if aws s3 cp "$OUT" "s3://$BACKUP_S3_BUCKET/$(basename "$OUT")" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}; then
    echo "off-box copy → s3://$BACKUP_S3_BUCKET/$(basename "$OUT")"
  else
    echo "BACKUP_OFFBOX_FAILED: could not copy $OUT to s3://$BACKUP_S3_BUCKET — LOCAL BACKUP IS STILL INTACT, only the off-box copy failed" >&2
    exit 1
  fi
fi

# Retention: drop encrypted dumps older than the window.
find "$DIR" -name 'asseris-*.sql.gz.enc' -mtime "+$RETENTION_DAYS" -print -delete 2>/dev/null || true
