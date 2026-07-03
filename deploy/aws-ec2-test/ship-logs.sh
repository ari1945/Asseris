#!/usr/bin/env sh
# Off-box shipping for container logs — closes the gap flagged 2026-07-03: docker-compose logs
# (db/server/web) only ever lived on the box (default json-file driver, unbounded until
# docker-compose.deploy.yml added max-size/max-file rotation alongside this script) — if the EC2
# instance is lost, every operational log is lost with it. Same class of durability gap
# backup.sh (M6) and export-audit-log.sh (K5) already closed for the database and audit chain.
#
# Captures each service's stdout/stderr for the window since the last successful run (cursor
# file `.since`, same crash-safe idiom as export-audit-log.sh's `.since-seq` — a failed run
# leaves the cursor untouched so the next run re-ships the same window instead of silently
# dropping it), tars+gzips per run, and optionally copies off-box to S3.
#
# This does NOT replace `docker compose logs` for live debugging — it is durability/retention
# only. There is deliberately no search/aggregation UI (out of scope for a single-box small-firm
# deploy) — download the archive and grep/zgrep it if you need to look something up after the
# fact. Retention policy + rationale: docs/LOGGING.md.
#
# Manual:  sh deploy/aws-ec2-test/ship-logs.sh
# Hourly (host crontab), alongside backup.sh/export-audit-log.sh:
#   15 * * * *  cd /home/ubuntu/Asseris && sh deploy/aws-ec2-test/ship-logs.sh >> /var/log/asseris-log-ship.log 2>&1
#
# Off-box copy (opt-in, same shape as backup.sh): set BACKUP_S3_BUCKET (reused by default — a
# DISTINCT logs/ prefix keeps it separable from DB dumps) or LOG_S3_BUCKET to target a different
# bucket entirely. Default unset = local-only, unchanged behavior. Auth via the AWS CLI's default
# credential chain (EC2 instance profile) — no access keys here. BACKUP_S3_ENDPOINT is for
# S3-compatible test targets (MinIO in CI) — leave unset in production.
set -e
DIR="${LOG_SHIP_DIR:-./logs-shipped}"
CURSOR="$DIR/.since"
COMPOSE="docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env"
RETENTION_DAYS="${LOG_LOCAL_RETENTION_DAYS:-3}"
S3_BUCKET="${LOG_S3_BUCKET:-${BACKUP_S3_BUCKET:-}}"

mkdir -p "$DIR"
SINCE="1970-01-01T00:00:00.000000000Z"
[ -f "$CURSOR" ] && SINCE=$(cat "$CURSOR")
# Nanosecond precision (Docker's --since/--until accept RFC3339Nano) — whole-second precision
# here would truncate the cutoff to e.g. "12:00:01Z" (=12:00:01.000), silently excluding any
# container log line stamped later within that same clock second. Those lines would then
# reappear in the NEXT run's window instead of this one — harmless (duplicates are tolerated,
# see below) but needlessly non-deterministic across back-to-back runs.
UNTIL=$(date -u +%Y-%m-%dT%H:%M:%S.%NZ)

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
WORK=$(mktemp -d)
OUT="$DIR/asseris-logs-$STAMP.tar.gz"

# Any one service failing to produce logs (e.g. not running) must not abort the whole capture —
# ship what's available rather than nothing.
HAVE_LOGS=0
for SVC in db server web; do
  if $COMPOSE logs --no-color --timestamps --since "$SINCE" --until "$UNTIL" "$SVC" > "$WORK/$SVC.log" 2>/dev/null; then
    [ -s "$WORK/$SVC.log" ] && HAVE_LOGS=1
  fi
done

if [ "$HAVE_LOGS" -eq 0 ]; then
  echo "log-ship: nothing new since $SINCE"
  rm -rf "$WORK"
  exit 0
fi

tar -czf "$OUT" -C "$WORK" .
rm -rf "$WORK"
# Cursor only advances after the archive is written — a crash between capture and tar leaves
# $SINCE untouched, so the next run re-captures the same window (duplicates are fine for log
# archival; a gap is not).
echo "$UNTIL" > "$CURSOR"
echo "log-ship → $OUT ($(wc -c < "$OUT") bytes, window $SINCE .. $UNTIL)"

if [ -n "$S3_BUCKET" ]; then
  if aws s3 cp "$OUT" "s3://$S3_BUCKET/logs/$(basename "$OUT")" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}; then
    echo "off-box copy → s3://$S3_BUCKET/logs/$(basename "$OUT")"
  else
    echo "LOG_SHIP_OFFBOX_FAILED: could not copy $OUT to s3://$S3_BUCKET/logs/ — LOCAL ARCHIVE IS STILL INTACT, only the off-box copy failed" >&2
    exit 1
  fi
fi

# Retention: drop local archives older than the window. The off-box copy (if configured) is the
# durable long-term copy — see docs/LOGGING.md for the recommended S3 lifecycle rule.
find "$DIR" -name 'asseris-logs-*.tar.gz' -mtime "+$RETENTION_DAYS" -print -delete 2>/dev/null || true
