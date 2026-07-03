#!/usr/bin/env python3
"""CI self-test for send-alert-email.py — mocks smtplib so no real network/credentials are
needed. Exercised on every push/pull_request that touches the alert script (see
.github/workflows/uptime-alert.yml) so the alert path is proven working continuously, not just
trusted — the same lesson restore-drill.yml encodes for backup.sh (an unexercised "it should just
work" script hid a real CRLF-corruption bug for months, see docs/prd-backup-restore-dr-hardening.md).
"""
import importlib.util
import os
import unittest
from pathlib import Path
from unittest.mock import patch

SCRIPT_PATH = Path(__file__).parent / "send-alert-email.py"

ALL_ENV_KEYS = [
    "SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS",
    "ALERT_FROM", "ALERT_TO", "TARGET", "REASON",
]


def load_module():
    spec = importlib.util.spec_from_file_location("send_alert_email", SCRIPT_PATH)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class SendAlertEmailTest(unittest.TestCase):
    def setUp(self):
        self._env_backup = dict(os.environ)
        for k in ALL_ENV_KEYS:
            os.environ.pop(k, None)

    def tearDown(self):
        os.environ.clear()
        os.environ.update(self._env_backup)

    def _set_full_config(self):
        os.environ.update({
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "alerts@example.com",
            "SMTP_PASS": "hunter2",
            "ALERT_FROM": "alerts@example.com",
            "ALERT_TO": "ari@example.com",
            "TARGET": "https://asseris.example.com/healthz",
            "REASON": "HTTP 503 - db down",
        })

    def test_missing_config_fails_loudly(self):
        module = load_module()
        self.assertEqual(module.main(), 1)

    def test_sends_via_starttls_on_587(self):
        self._set_full_config()
        module = load_module()
        with patch("smtplib.SMTP") as mock_smtp:
            instance = mock_smtp.return_value.__enter__.return_value
            rc = module.main()
        self.assertEqual(rc, 0)
        instance.starttls.assert_called_once()
        instance.login.assert_called_once_with("alerts@example.com", "hunter2")
        instance.send_message.assert_called_once()
        sent_msg = instance.send_message.call_args[0][0]
        self.assertIn("db down", sent_msg.get_payload(decode=True).decode("utf-8"))
        self.assertEqual(sent_msg["To"], "ari@example.com")

    def test_sends_via_ssl_on_465(self):
        self._set_full_config()
        os.environ["SMTP_PORT"] = "465"
        module = load_module()
        with patch("smtplib.SMTP_SSL") as mock_smtp_ssl:
            instance = mock_smtp_ssl.return_value.__enter__.return_value
            rc = module.main()
        self.assertEqual(rc, 0)
        instance.login.assert_called_once()
        instance.send_message.assert_called_once()

    def test_smtp_exception_fails_loudly_not_silently(self):
        self._set_full_config()
        module = load_module()
        with patch("smtplib.SMTP") as mock_smtp:
            mock_smtp.return_value.__enter__.return_value.login.side_effect = Exception("auth failed")
            rc = module.main()
        self.assertEqual(rc, 1)


if __name__ == "__main__":
    unittest.main()
