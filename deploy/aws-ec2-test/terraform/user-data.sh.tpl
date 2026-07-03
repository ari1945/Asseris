#!/bin/bash
# Bootstrap Docker + docker compose v2 + git on first boot — replaces README manual §2 SSH steps.
# Ubuntu 22.04 only (matches the aws_ami data source in main.tf).
set -euxo pipefail
exec > /var/log/user-data.log 2>&1

apt-get update
apt-get install -y docker.io docker-compose-v2 git
usermod -aG docker ubuntu
systemctl enable --now docker

echo "user-data bootstrap complete: $(date -u)"
