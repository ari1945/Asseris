# DEPLOY.md — Asseris single-tenant runbook

> **Satu instance per firma** (bukan multi-tenant). Seluruh app — SPA + API tRPC + Postgres + TLS —
> di **satu kotak** lewat docker-compose, dengan **Caddy** menyajikan satu origin (SPA statis +
> reverse-proxy `/trpc`). Hasil dari PRD *Deploy-Readiness Single-Tenant*. Ikuti dari atas ke bawah.

Arsitektur:

```
Internet ──443(HTTPS)──► Caddy (web) ──► /trpc,/healthz,/metrics ─► server:5181 ─► db (Postgres 16)
                              └────────► /*  (SPA statis /srv, fallback SPA-routing)
```

Kunci desain: klien memanggil `/trpc` **relatif** → wajib **same-origin** (Caddy menyediakannya).
Cookie sesi httpOnly `Secure` bekerja karena semua di balik HTTPS (self-signed pun cukup).

---

## 0. Prasyarat
- Host Docker (EC2 `t3.small`/`t4g.small`, Ubuntu 22.04 / Amazon Linux 2023; 20 GB disk). Detail
  langkah EC2 (security group 80/443, sslip.io, dsb) → `deploy/aws-ec2-test/README.md`.
- `docker` + `docker compose v2` + `git` + `openssl` terpasang.
- Akses clone repo `ari1945/Asseris`.

## 1. Generate kunci (WAJIB — server fail-fast tanpa ini)
Di produksi (`NODE_ENV=production`) server **menolak boot** bila kunci/konfig tak aman (M2).
Generate tiga kunci + sandi DB kuat:
```bash
openssl rand -hex 32                                  # → APP_ENCRYPTION_KEY (TOTP-at-rest)
openssl genpkey -algorithm ed25519 -outform DER | base64 -w0   # → APP_SIGNING_KEY (segel export)
openssl rand -hex 32                                  # → BACKUP_ENCRYPTION_KEY (enkripsi dump; SIMPAN TERPISAH)
openssl rand -hex 24                                  # → POSTGRES_PASSWORD (≠ 'changeme')
```
> **Kunci = aset backup kelas-1.** `APP_SIGNING_KEY` hilang → segel export lama tak terverifikasi.
> `APP_ENCRYPTION_KEY` hilang → TOTP-at-rest tak terbaca. `BACKUP_ENCRYPTION_KEY` hilang → backup
> tak terpulihkan. Simpan **terpisah dari DB & dari host** (mis. password manager / secrets store).

## 2. Konfigurasi environment
```bash
cd Asseris
cp deploy/aws-ec2-test/.env.example deploy/aws-ec2-test/.env
nano deploy/aws-ec2-test/.env     # isi: POSTGRES_PASSWORD, APP_ENCRYPTION_KEY, APP_SIGNING_KEY,
                                  #      BACKUP_ENCRYPTION_KEY, PUBLIC_HOST, COOKIE_SECURE=1
```
**TLS:** default `Caddyfile` = **self-signed** (`tls internal`) — HTTPS instan tanpa domain/DNS
(peringatan sertifikat sekali di browser). Punya domain publik? uncomment blok ACME di `Caddyfile`
(butuh DNS A-record + port 80/443) untuk sertifikat Let's Encrypt tepercaya.

## 3. Deploy (build + boot)
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  --env-file deploy/aws-ec2-test/.env up -d --build
```
Boot menjalankan **`prisma migrate deploy`** (migrasi Postgres ber-riwayat, M4) lalu server.
Bila konfig tak aman, server **exit 1** dengan pesan var yang kurang (cek `docker compose ... logs server`).

## 4. Provision firma (NON-destruktif — BUKAN seed demo)
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env \
  run --rm \
  -e FIRM_NAME='WHR & Rekan' -e FIRM_SHORT=WHR \
  -e ADMIN_NAME='Ari Widodo' -e ADMIN_EMAIL='ari@whr.id' -e ADMIN_PASSWORD='<passphrase-≥12>' \
  server npm run bootstrap
```
Membuat 1 Firm + 1 Partner-admin, meng-**enrol TOTP** (tampilkan otpauth URL + secret **sekali** —
tambahkan ke authenticator SEBELUM login pertama; `BOOTSTRAP_TOTP=0` untuk password-saja).
**MENOLAK** bila DB sudah berisi firma → tak akan menimpa data pilot.

> ⚠️ **JANGAN `npm run seed` di produksi** — itu seed **[DEMO] destruktif** (menghapus semua data).
> Ia fail-closed di `NODE_ENV=production` (butuh `ALLOW_DEMO_SEED=1`). Pakai `bootstrap` di atas.

## 5. Verifikasi
```bash
curl -k https://$PUBLIC_HOST/healthz        # → {"status":"ok","db":"up",...}
```
Buka `https://$PUBLIC_HOST/` → login sbg Partner-admin (+kode TOTP bila di-enrol).

## 6. Backup (terjadwal, harian, retensi 30 hari)
Skrip: `deploy/aws-ec2-test/backup.sh` (pg_dump → gzip → AES-256 dgn `BACKUP_ENCRYPTION_KEY`).
Jadwalkan via **host crontab** (low-ops single-box):
```cron
30 2 * * *  cd /home/ubuntu/Asseris && BACKUP_ENCRYPTION_KEY=<hex> \
            sh deploy/aws-ec2-test/backup.sh >> /var/log/asseris-backup.log 2>&1
```
Dump ke `deploy/aws-ec2-test/backups/asseris-<UTC>.sql.gz.enc`; yang > 30 hari otomatis di-prune
(`RETENTION_DAYS`). **Salin backups ke lokasi ke-2** (S3, dsb) — satu box bukan durable.

## 7. Restore drill (WAJIB dijalankan sekali sebelum percaya backup — DoD §3.4)
Pada instance kosong/standby:
```bash
BACKUP_ENCRYPTION_KEY=<hex> sh deploy/aws-ec2-test/restore.sh \
  deploy/aws-ec2-test/backups/asseris-<UTC>.sql.gz.enc
curl -k https://$PUBLIC_HOST/healthz        # → db:up
```
Lalu **verifikasi integritas jejak audit**: buka app → **Jejak Audit** → `audit.verify` harus
melaporkan **`ok`** (rantai hash-chained `AuditLog` utuh — backup transaksional menjaganya).

## 8. Upgrade skema (N → N+1)
Dev tetap SQLite (`prisma db push`); **prod pakai migrasi Postgres**. Untuk perubahan skema:
1. Ubah `server/prisma/schema.prisma` (provider tetap `sqlite` di file yang ter-commit).
2. Generate migrasi Postgres baru — butuh **Postgres shadow** (mis. layanan `db` compose):
   ```bash
   tmp=$(mktemp).prisma
   sed 's/provider = "sqlite"/provider = "postgresql"/' server/prisma/schema.prisma > "$tmp"
   npx prisma migrate diff --shadow-database-url "$SHADOW_URL" \
     --from-migrations ./server/prisma/migrations \
     --to-schema-datamodel "$tmp" --script > server/prisma/migrations/$(date +%Y%m%d%H%M%S)_<nama>/migration.sql
   ```
   (Baseline `0_init` bisa diregenerasi offline: `sh server/prisma/gen-pg-migrations.sh`.)
3. Commit migrasi baru → deploy ulang: `docker compose ... up -d --build` menjalankan
   `migrate deploy` (menerapkan hanya migrasi yang belum diterapkan; **data lama tetap**).

**DB lama hasil `db push` (belum ada riwayat migrasi)?** Baseline dulu sekali:
```bash
docker compose ... run --rm server npx prisma migrate resolve --applied 0_init
```
(menandai 0_init "sudah diterapkan" tanpa menjalankannya, agar `migrate deploy` lanjut ke berikutnya).

## 9. Rollback
- **App/config buruk:** `docker compose ... up -d` versi/commit sebelumnya (image di-rebuild dari tag lama).
- **Data korup:** restore backup terakhir yang sehat (§7).
- **Migrasi merusak:** migrasi Prisma bersifat maju; rollback data = restore backup pra-upgrade →
  karena itu **selalu backup sebelum upgrade** (§6 manual sekali sebelum §8).

## 10. Batasan (by design, didokumentasikan — bukan bug)
- **Single-process**: `AuditLog.seq` diserialisasi satu proses → **tak** multi-instance/auto-scale.
- **Satu box**: tanpa replikasi; durabilitas bergantung backup + salinan off-box.
- **Self-signed TLS**: peringatan browser sekali (pilot). Domain publik → beralih ACME (§2).
- **Secrets berbasis `.env`**: manajer rahasia terkelola (Vault/AWS SM) = fase lanjutan.

## 11. Referensi
- Paket & langkah EC2 rinci: `deploy/aws-ec2-test/README.md`
- Guard fail-fast: `server/src/prodConfig.ts` · Provisioning: `server/src/bootstrapFirm.ts`
- Migrasi: `server/prisma/migrations/` + `server/prisma/gen-pg-migrations.sh`
- CI yang memverifikasi build+boot+seed+login + guard fail-fast: `.github/workflows/deploy-smoke.yml`
