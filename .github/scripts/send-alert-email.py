#!/usr/bin/env python3
"""Send a plain-text alert email via SMTP — stdlib only (smtplib/ssl/email), no third-party
GitHub Action or package, to keep this on the same trusted supply chain as the rest of the repo
rather than adding a new external dependency for something this small.

Used by .github/workflows/uptime-alert.yml when the external /healthz probe fails. Config comes
from environment variables (set as GitHub repo secrets — see docs/DEPLOY.md Alerting section):
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, ALERT_FROM, ALERT_TO
Context about the failure (set by the workflow, not secret):
  TARGET  - the URL that was probed
  REASON  - why the probe was considered failed

Exits non-zero (with a distinct, greppable marker) and prints why on any problem — misconfigured
or missing SMTP settings, or a failed send — rather than silently no-op-ing. An alert script that
pretends to succeed when it can't actually reach anyone is worse than one that fails loudly in the
Actions log, same philosophy as deploy/aws-ec2-test/backup.sh's BACKUP_OFFBOX_FAILED handling.
"""
import os
import smtplib
import ssl
import sys
from datetime import datetime, timezone
from email.mime.text import MIMEText

REQUIRED = ["SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS", "ALERT_FROM", "ALERT_TO"]


def build_message() -> MIMEText:
    target = os.environ.get("TARGET", "(unknown target)")
    reason = os.environ.get("REASON", "(no reason provided)")
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    body = (
        "Automated uptime check failed.\n\n"
        f"Target: {target}\n"
        f"Time:   {now}\n"
        f"Reason: {reason}\n\n"
        "This is a synthetic external check (.github/workflows/uptime-alert.yml) — it does not "
        "replace looking at the box directly. See docs/INCIDENT-RESPONSE.md for the response "
        "runbook.\n"
    )
    msg = MIMEText(body, "plain", "utf-8")
    msg["Subject"] = f"[Asseris ALERT] {target} health check failed"
    msg["From"] = os.environ["ALERT_FROM"]
    msg["To"] = os.environ["ALERT_TO"]
    return msg


def send(msg: MIMEText) -> None:
    host = os.environ["SMTP_HOST"]
    port = int(os.environ["SMTP_PORT"])
    user = os.environ["SMTP_USER"]
    password = os.environ["SMTP_PASS"]
    context = ssl.create_default_context()

    if port == 465:
        with smtplib.SMTP_SSL(host, port, timeout=15, context=context) as server:
            server.login(user, password)
            server.send_message(msg)
    else:
        with smtplib.SMTP(host, port, timeout=15) as server:
            server.starttls(context=context)
            server.login(user, password)
            server.send_message(msg)


def main() -> int:
    missing = [k for k in REQUIRED if not os.environ.get(k)]
    if missing:
        print(
            f"ALERT_SEND_FAILED: missing required env var(s): {', '.join(missing)} — "
            "set these as GitHub repo secrets (see docs/DEPLOY.md Alerting section)",
            file=sys.stderr,
        )
        return 1

    msg = build_message()
    try:
        send(msg)
    except Exception as e:  # noqa: BLE001 - deliberately broad: any SMTP failure must be loud, not silent
        print(f"ALERT_SEND_FAILED: could not send via SMTP: {e}", file=sys.stderr)
        return 1

    print(f"Alert email sent to {os.environ['ALERT_TO']} re: {os.environ.get('TARGET', '?')}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
