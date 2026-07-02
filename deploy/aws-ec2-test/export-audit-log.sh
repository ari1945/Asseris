#!/usr/bin/env sh
# K5 — off-box, append-only export of the AuditLog hash chain, separate from the daily
# full-DB backup.sh. Point: an attacker who compromises the DB host must ALSO compromise
# wherever this export lands (a different S3 prefix, same off-box credential chain) to erase
# every copy of the audit trail. Runs more often than the daily backup (hourly is a reasonable
# default) since it's cheap (JSONL, incremental via a local seq cursor, not a full DB dump).
#
# Chain integrity is verified server-side BEFORE export (audit/export.ts) — a broken/tampered
# chain refuses to export, so this never silently ships corrupted data.
#
# Manual:  BACKUP_ENCRYPTION_KEY=... sh deploy/aws-ec2-test/export-audit-log.sh
# Hourly (host crontab), e.g. every hour on the hour:
#   0 * * * *  cd /home/ubuntu/Asseris && BACKUP_ENCRYPTION_KEY=xxfrom-a-filexx \
#              sh deploy/aws-ec2-test/export-audit-log.sh >> /var/log/asseris-audit-export.log 2>&1
#
# Off-box copy (opt-in, same shape as backup.sh): set BACKUP_S3_BUCKET to also copy to S3, under
# a DISTINCT prefix (audit-log/) so a bucket lifecycle/Object Lock policy can be scoped to it
# independently of the daily full-DB dumps. Auth via the AWS CLI's default credential chain
# (EC2 instance profile) — no access keys here. For true WORM (write-once-read-many) durability,
# enable S3 Object Lock (Compliance mode) on this prefix — that is bucket-level configuration,
# done once via `aws s3api put-object-lock-configuration`, NOT something this script can do.
set -e
: "${BACKUP_ENCRYPTION_KEY:?set BACKUP_ENCRYPTION_KEY (openssl rand -hex 32) — SEPARATE from APP_ENCRYPTION_KEY}"
DIR="${AUDIT_EXPORT_DIR:-./audit-log-exports}"
CURSOR="$DIR/.since-seq"
COMPOSE="docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env"

mkdir -p "$DIR"
SINCE_SEQ=0
[ -f "$CURSOR" ] && SINCE_SEQ=$(cat "$CURSOR")

STAMP=$(date -u +%Y%m%dT%H%M%SZ)
RAW="$DIR/.raw-$STAMP.jsonl"
OUT="$DIR/audit-$STAMP.jsonl.gz.enc"

# Run inside the `server` container (has tsx/Prisma/DATABASE_URL already configured) — refuses
# (non-zero exit, no file written) if the chain fails verification.
$COMPOSE exec -T -e SINCE_SEQ="$SINCE_SEQ" server npm run export-audit-log > "$RAW"

LINES=$(wc -l < "$RAW" | tr -d ' ')
if [ "$LINES" -eq 0 ]; then
  echo "audit-export: nothing new since seq=$SINCE_SEQ"
  rm -f "$RAW"
  exit 0
fi

# Read the highest seq from the plain JSONL while we still have it, THEN gzip+encrypt to $OUT.
# The cursor is only written after encryption succeeds (set -e aborts the script on either
# failing first) — crash-safe: a failed run leaves the cursor untouched, so the next run just
# re-exports the same range instead of silently skipping it.
LAST_SEQ=$(tail -n1 "$RAW" | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).seq)}catch{process.exit(1)}})")
gzip -c "$RAW" | openssl enc -aes-256-cbc -pbkdf2 -salt -pass env:BACKUP_ENCRYPTION_KEY > "$OUT"
rm -f "$RAW"
echo "$LAST_SEQ" > "$CURSOR"
echo "audit-export → $OUT ($LINES row(s), up to seq=$LAST_SEQ, UTC $STAMP)"

if [ -n "${BACKUP_S3_BUCKET:-}" ]; then
  if aws s3 cp "$OUT" "s3://$BACKUP_S3_BUCKET/audit-log/$(basename "$OUT")" ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"}; then
    echo "off-box copy → s3://$BACKUP_S3_BUCKET/audit-log/$(basename "$OUT")"
  else
    echo "AUDIT_EXPORT_OFFBOX_FAILED: could not copy $OUT to s3://$BACKUP_S3_BUCKET/audit-log/ — LOCAL EXPORT IS STILL INTACT, only the off-box copy failed" >&2
    exit 1
  fi
fi
