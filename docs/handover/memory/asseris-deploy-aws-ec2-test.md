---
name: asseris-deploy-aws-ec2-test
description: Paket runbook test-deploy AWS EC2 + docker-compose (Caddy same-origin) + peta target produksi AWS
metadata: 
  node_type: memory
  type: project
  originSessionId: f543801b-3ece-4484-8743-2346e0c9733f
---

2026-06-27: dibuat paket **test-deploy AWS EC2 satu-kotak** di repo `deploy/aws-ec2-test/` (branch **`chore/deploy-aws-ec2-test`** off master `c89b047`, commit `f62c5ea`, PUSHED, **belum PR** — sengaja terpisah dari bundel Coretax PR #41). Berkas: `README.md` (runbook 9-langkah) · `docker-compose.deploy.yml` (db+server+web) · `web.Dockerfile` (build SPA→bakar ke Caddy) · `Caddyfile` (proxy `/trpc`→server) · `.env.example` · `.gitignore`.

**Arsitektur app menentukan pilihan deploy** (penting untuk pertanyaan deploy berikutnya):
- Frontend `migration/` = SPA Vite STATIS, klien tRPC pakai **path relatif `/trpc`** + `credentials:'include'` ([api.ts](migration/src/api.ts)) → butuh disajikan **same-origin** dengan backend (proxy), BUKAN URL absolut.
- Backend `server/` = server Node **panjang-umur** (tRPC/tsx listen :5181) + **Postgres** + secret kripto persisten (APP_ENCRYPTION_KEY TOTP-at-rest, httpOnly cookie, IP-allowlist, audit hash-chain). **Beban kontainer, BUKAN serverless.** Sudah Docker live-proven (W11, [[neosuite-ams-w10-hardening]]); `server/Dockerfile` auto-flip Prisma sqlite→postgres; build context = **root** (server impor `migration/src`).

**Verdict Vercel:** frontend OK (rewrite `/trpc`→backend); **backend JANGAN ke Vercel** (serverless melawan listener panjang-umur + FS ephemeral). Trik same-origin = rewrite Vercel / behavior CloudFront / proxy Caddy — semua ekuivalen.

**Test path (gap diisi):** compose repo HANYA backend; `web.Dockerfile` menambah SPA+Caddy same-origin + TLS otomatis via **sslip.io** (`<ip-dash>.sslip.io`, tanpa beli domain; fallback `tls internal`). **Smoke-built lokal OK** (WSL Docker 27.3.1): web build (vite 786 modul→dist), Caddyfile "Valid configuration", dist di `/srv`. Compose-up penuh diverifikasi di EC2 (butuh env+ACME).

**Target PRODUKSI AWS (bila test meyakinkan):** **App Runner (ECR) + RDS PostgreSQL + S3/CloudFront**; CloudFront path-behavior `/trpc/*`,`/healthz`→backend (ganti peran Caddy). GOTCHA AWS: CloudFront default mencache+menanggalkan cookie → set behavior API "CachingDisabled"+forward-cookies; IP-allowlist butuh baca `X-Forwarded-For` (kosongkan utk test); App Runner↔RDS butuh VPC connector; secret di Secrets Manager; region `ap-southeast-3` Jakarta.

**Batasan:** provisioning nyata (akun/secret/IAM) = tindakan Ari, bukan agen. **Hermes Agent memegang dok deploy** — selaraskan. WSL Alpine: `dockerd` jalan via launch langsung (no OpenRC/sudo, user root) — `nohup dockerd &` lalu poll socket.

Untracked duplikat `deploy/aws-ec2-test/` mungkin masih ada di working tree `feat/w9` (sudah aman di branch). Relasi: [[neosuite-ams-w9-connectors]] (Docker target), [[asseris-tooling-gh]].
