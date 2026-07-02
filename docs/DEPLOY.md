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
**TLS:** `CADDY_TLS_MODE=internal` (default di `.env.example`) = **self-signed** — HTTPS instan
tanpa domain/DNS (peringatan sertifikat sekali di browser). Punya domain publik dan siap klien
eksternal? Set `CADDY_TLS_MODE=acme` (butuh DNS A-record `PUBLIC_HOST` + port 80/443 terbuka ke
publik) untuk sertifikat Let's Encrypt tepercaya — **satu baris di `.env`, bukan lagi edit
`Caddyfile` manual** (comment/uncomment blok lama = risiko salah-edit nyata; kini ditegakkan
lewat `docker compose ... build web` + `up -d web`, tak perlu sentuh file Caddy).

**Secrets:** default = file `.env` di host (cukup untuk pilot terbatas). Menyimpan data klien
sungguhan (pajak/keuangan)? Pertimbangkan `SECRETS_PROVIDER=aws-sm` sebelum onboarding — server
menarik `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY`/dst dari **AWS Secrets Manager** saat boot (auth via
IAM role instance EC2, bukan access key), bukan lagi disimpan mentah di `.env` host. Lihat §11a.

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
- **TLS internal (default)**: peringatan browser sekali. Cocok pilot tertutup; klien eksternal →
  `CADDY_TLS_MODE=acme` (§2, §13) begitu ada domain publik.
- **Secrets berbasis `.env` (default)**: cukup untuk pilot terbatas dengan akses host dibatasi.
  Data klien sungguhan → `SECRETS_PROVIDER=aws-sm` (§13) sebelum onboarding, bukan setelahnya.

## 11. Referensi
- Paket & langkah EC2 rinci: `deploy/aws-ec2-test/README.md`
- Guard fail-fast: `server/src/prodConfig.ts` · Provisioning: `server/src/bootstrapFirm.ts`
- Migrasi: `server/prisma/migrations/` + `server/prisma/gen-pg-migrations.sh`
- CI yang memverifikasi build+boot+seed+login + guard fail-fast: `.github/workflows/deploy-smoke.yml`
  (job `deploy-smoke`, server+db langsung di :5181 — TANPA edge) + job `edge-smoke` (login lewat
  Caddy same-origin/`tls internal`, §12 di bawah).

## 12. Verifikasi Live (2026-07-02) — 3 gap go-live ditutup sebagian

Konteks: CI (`deploy-smoke.yml`) hanya pernah boot `server+db` langsung di `:5181`, tak pernah
lewat edge Caddy — jadi "deploy-ready" sejauh ini = *server siap*, bukan *paket single-tenant
yang sebenarnya dipakai pilot sudah teruji*. Sesi ini menutup itu dengan **Docker Compose lokal
nyata** (bukan CI mock) lewat WSL dockerd yang sudah ada di mesin dev — **bukan EC2 sungguhan**
(tak ada kredensial AWS di sesi ini); caveat ini tetap berlaku, lihat §12.5.

### 12.1 Bug ditemukan & diperbaiki: `/trpc` prefix tak di-strip di edge Caddy

`deploy/aws-ec2-test/Caddyfile` meneruskan `/trpc/*` ke `server:5181` **tanpa** `strip_prefix`,
padahal server memasang prosedur tRPC di **ROOT** (`server/src/server.ts`, kontrak sama dengan
proxy dev Vite). Akibatnya **setiap panggilan tRPC lewat edge — termasuk login — 404**, sejak
paket ini ada. `deploy-smoke.yml` tak pernah menangkapnya karena job itu memanggil server
langsung di `:5181/auth.login` (tanpa prefix `/trpc`, tanpa Caddy sama sekali).

Ditemukan lewat login browser sungguhan (bukan curl) ke stack lokal → `Email atau kata sandi
salah` generik menyamarkan 404 asli (`/trpc/auth.login → 404` di network tab). Diperbaiki:
`Caddyfile` sekarang punya matcher terpisah — `/trpc/*` di-`strip_prefix` sebelum
`reverse_proxy`, `/healthz`+`/metrics` tetap tanpa strip (sudah cocok di root). Diverifikasi ulang
lewat browser: login → dashboard bekerja penuh lewat `https://localhost` (self-signed, root CA
lokal diinstal ke trust store Windows current-user untuk keperluan uji — bukan langkah produksi).

**Guardrail permanen**: job baru `edge-smoke` di `.github/workflows/deploy-smoke.yml` mem-boot
paket `deploy/aws-ec2-test/docker-compose.deploy.yml` (server+db+Caddy) yang SAMA dipakai pilot,
lalu login lewat `https://localhost/trpc/auth.login` (prefix asli, edge asli). Kelas bug ini
sekarang gagal CI, bukan cuma ketahuan saat live-testing manual.

### 12.2 E2E browser (setelah fix) — lulus semua

Login (Manager, `anindya.p@whr-cpa.id`) → dashboard nyata dengan data seed (7 perikatan, 4 risiko
tinggi) → **Impor TB** (paste-CSV contoh, 14 akun, control total seimbang, engine PSAK menyala,
`Terapkan ke WTB` → `state.set 200`, WTB ter-update live) → **Sign-off Review** WP B (Piutang &
ECL) sebagai reviewer → status `IN REVIEW → REVIEWED` real-time → **Export+Segel** register AJE
(XLSX) → `POST /exporter.seal → 200` (tanda tangan Ed25519 sungguhan lewat kunci produksi
container, bukan stub). Semua lewat `https://localhost` sungguhan, sesi cookie httpOnly, Postgres
nyata — bukan dev-server Vite.

Catatan sampingan: tombol "Export Log" di modul Audit Trail (`view_platform3.tsx`) adalah **stub
tanpa handler** (`<Btn sm>...Export Log</Btn>` tanpa `onClick`) — beda dari export+segel register
yang nyata (AJE/WP/dsb via `export_xlsx.ts`/`export_pdf.ts`). Belum diperbaiki (di luar 3 gap yang
diminta); dicatat sebagai temuan kecil terpisah.

### 12.3 Load/concurrency — titik jenuh (approksimasi t3.small, BUKAN EC2 nyata)

Kontainer dibatasi via `docker update --cpus/--memory` meniru total kapasitas `t3.small` (2 vCPU
/ 2 GiB) dibagi ke 3 servis (server 1.2 vCPU/1.2 GB, db 0.6/0.6, Caddy 0.2/0.2 GB — proporsional
ke beban kerja). Skrip ramping (5→10→20→50 sesi konkuren, 15 dtk/level, 4 user nyata anggota
`ENG-2025-014`) langsung ke `server:5181` dalam network compose (mengisolasi bottleneck arsitektur
dari overhead Caddy):

| Konkurensi | Ops/dtk | Login p50/p95 | Read p50/p95 | Write p50/p95/p99 | Error |
|---|---|---|---|---|---|
| 5  | 150 | 183ms / 280ms | 14ms / 61ms | 57ms / 90ms / 109ms | 0 |
| 10 | 169 | 854ms / 1.1s | 15ms / 72ms | 103ms / 183ms / 214ms | 0 |
| 20 | 164 | 1.4s / 1.9s | 15ms / 76ms | 291ms / 398ms / 473ms | 0 |
| 50 | 150 | 4.3s / 6.3s | 11ms / 96ms | 601ms / 1.1s / 1.7s | 0 |

Nol error di semua level — arsitektur tak *crash*, tapi **throughput mentok ~150-170 ops/dtk
mulai konkurensi 10** dan tak pernah naik lagi (klasik tanda saturasi CPU), sementara latensi terus
memburuk linear-ke-atas. Baca:
- **Read** (`auth.me`) nyaris tak terpengaruh (p95 <100ms bahkan di 50 konkuren) — jalur baca aman.
- **Login** adalah bottleneck TERTAJAM: p50 183ms→4.3dtk dari 5→50 konkuren. Penyebab kemungkinan
  besar: **scrypt** (hashing password CPU-intensif by design) memblokir di bawah cap 1.2 vCPU.
  Login massal serentak (mis. jam 9 pagi seluruh staf) berisiko nyata pada instance sekelas
  `t3.small`; login yang tersebar (staf login bertahap) tak masalah.
- **Write** (`state.set`, jalur yang sama dipakai simpan WTB/AJE/sign-off, lewat serialisasi
  `AuditLog.seq`) masih nyaman (<100ms) sampai ~10 penulis konkuren-persis-bersamaan, mulai terasa
  (~300-600ms median) di 20-50. Untuk KAP pilot skala kecil (10-20 staf) dengan pola kerja normal
  (bukan semua orang klik simpan di milidetik yang sama), ini kemungkinan tak terasa — tapi event
  sinkronisasi massal (delta-sync, lihat entri `SYNC` di Audit Trail) bisa memicu burst serentak.

**Kesimpulan operasional**: arsitektur single-process (by design, §10) tak gagal di bawah beban
ini — ia melambat dengan predictable, bukan crash. Untuk KAP pilot ~10-20 staf dengan pola login
tersebar (bukan serentak), ini plausibel cukup. Untuk kepastian, ukur ulang skrip yang sama
(`deploy/aws-ec2-test/README.md` akan merujuk ke sini) di EC2 `t3.small` sungguhan sebelum
onboarding pilot — CPU burstable EC2 nyata bisa lebih baik ATAU lebih buruk dari cap lokal ini
tergantung kredit burst yang tersisa.

### 12.4 Apa yang BELUM terbukti (gap tersisa, jujur)

- **EC2 sungguhan**: sesi ini pakai Docker Compose lokal (WSL dockerd) sebagai pengganti — bukan
  jaringan/EBS/noisy-neighbor EC2 asli. Angka §12.3 adalah sinyal pertama, bukan SLA final.
  Skrip ramping bisa dipakai ulang persis (lihat riwayat sesi/memory) begitu instance pilot ada.
- Restore drill nyata, kepatuhan UU PDP, alerting produksi — **masih 0%**, tak tersentuh sesi ini
  (lihat memory `asseris-deploy-readiness`). Secrets Manager & TLS publik ditutup sesi berikutnya
  (2026-07-02, lanjutan) — lihat §13: kode+unit-test+live-fail-closed-verified, TAPI belum
  live-verified terhadap AWS/domain sungguhan (kredensial/domain nyata tak tersedia di sesi manapun).

## 13. Secrets Manager & TLS publik — go-live dengan data klien sungguhan

Dua batasan §10 yang PALING relevan begitu ada data klien pajak/keuangan nyata di instance (bukan
lagi demo/pilot-tertutup). Keduanya opt-in via `.env` — default tetap `.env`-file + self-signed
(cukup untuk pilot), tak ada perubahan perilaku bila kedua var di bawah dibiarkan kosong.

### Secrets Manager (AWS)
1. Buat satu secret JSON di AWS Secrets Manager, mis. `asseris/prod/keys`:
   ```json
   {"APP_ENCRYPTION_KEY":"<hex-32B>","APP_SIGNING_KEY":"<base64-PKCS8-Ed25519>","BACKUP_ENCRYPTION_KEY":"<hex-32B>","POSTGRES_PASSWORD":"<sandi-kuat>"}
   ```
2. IAM role instance EC2 (bukan access key di `.env`) diberi policy minimal:
   ```json
   {"Effect":"Allow","Action":"secretsmanager:GetSecretValue","Resource":"arn:aws:secretsmanager:<region>:<acct>:secret:asseris/prod/keys-*"}
   ```
3. `.env`: `SECRETS_PROVIDER=aws-sm`, `AWS_SECRETS_MANAGER_SECRET_ID=asseris/prod/keys`,
   `AWS_REGION=<region>` — **kosongkan** `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY`/`POSTGRES_PASSWORD`
   di `.env` (ditarik dari SM saat boot; var `.env` yang TETAP diisi selalu menang atas SM —
   override satu kunci tanpa redeploy SM bila perlu).
4. Fail-closed: bila `SECRETS_PROVIDER=aws-sm` tapi fetch gagal (IAM salah/secret hilang/jaringan),
   server **menolak boot** dengan pesan jelas (`server/src/secrets.ts`) — sama seperti guard M2.
   Live-verified lokal 2026-07-02: boot ditolak bersih (tanpa kredensial AWS nyata) SEBELUM
   `server.listen`; jalur default (`.env`) nol-regresi. Verifikasi live terhadap Secrets Manager
   SUNGGUHAN (fetch sukses) belum dilakukan — butuh akses AWS nyata, di luar sesi yang membangun ini.

### TLS publik (ACME/Let's Encrypt)
1. Arahkan DNS: A-record `PUBLIC_HOST` → IP publik host (atau pakai `sslip.io` tanpa beli domain).
2. Buka port 80+443 ke `0.0.0.0/0` di security group (80 = tantangan ACME HTTP-01).
3. `.env`: `CADDY_TLS_MODE=acme` (dari default `internal`).
4. `docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env up -d --build web`
   — Caddy re-provisioning otomatis (LE cert pertama ~30 detik). Tak perlu edit `Caddyfile`.
5. Rollback ke self-signed: `CADDY_TLS_MODE=internal` lalu ulangi langkah 4.

Catatan desain (Caddyfile): `tls` Caddy tak bisa dibuat kosong-kondisional lewat placeholder
langsung (`tls {$VAR}` dengan `$VAR` kosong = **error sintaks** Caddyfile — diuji langsung, bukan
diasumsikan). Toggle bekerja lewat `import /etc/caddy/tls-{$CADDY_TLS_MODE}.caddy`, memilih salah
satu dari dua snippet kecil (`tls-internal.caddy` = `tls internal`; `tls-acme.caddy` = kosong,
meniadakan `tls` sepenuhnya sehingga automatic-HTTPS default Caddy yang jalan). Live-verified
2026-07-02: `caddy validate` lulus kedua mode + edge nyata (healthz+login lewat `/trpc`) nol-regresi
di mode `internal`; mode `acme` divalidasi struktural (config sah) — provisioning LE sungguhan
BELUM diverifikasi (butuh domain publik nyata, tak tersedia di sesi ini).
