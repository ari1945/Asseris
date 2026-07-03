# DEPLOY.md — Asseris single-tenant runbook

> **Satu instance per firma** (bukan multi-tenant). Seluruh app — SPA + API tRPC + Postgres + TLS —
> di **satu kotak** lewat docker-compose, dengan **Caddy** menyajikan satu origin (SPA statis +
> reverse-proxy `/trpc`). Hasil dari PRD *Deploy-Readiness Single-Tenant*. Ikuti dari atas ke bawah.
>
> **Dokumen ini untuk operator/IT** (instalasi, backup, kunci, kapasitas). Mencari cara MEMAKAI
> aplikasi sebagai Partner/Manager/Auditor/staf firma? Lihat **`docs/USER-GUIDE.md`**. Menyiapkan
> training firma pilot pertama? Lihat **`docs/PILOT-ONBOARDING-PLAN.md`**.

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
Dump ke `./backups/asseris-<UTC>.sql.gz.enc` — **relatif ke cwd tempat skrip dijalankan**, bukan
`deploy/aws-ec2-test/backups/` kecuali dijalankan dari situ; pola crontab di atas `cd` ke
repo-root dulu, jadi dump mendarat di `<repo-root>/backups/` (root-anchored di `.gitignore` sejak
2026-07-02 — direktori ini tak pernah tertelan `.git`). Yang > 30 hari otomatis di-prune
(`RETENTION_DAYS`).

**Salinan off-box (S3, opt-in, 2026-07-02):** set `BACKUP_S3_BUCKET=<nama-bucket>` (+ opsional
`BACKUP_S3_ENDPOINT` untuk target S3-compatible non-AWS, mis. pengujian) agar tiap backup lokal
langsung disalin ke S3 lewat AWS CLI default credential chain (IAM instance profile EC2 — tanpa
access key hardcoded, pola sama `SECRETS_PROVIDER` §13). Default kosong = perilaku lama, tak
berubah. Kegagalan salin off-box **loud**: skrip exit non-zero + baris log `BACKUP_OFFBOX_FAILED`
(backup lokal tetap ada, hanya salinan off-box yang gagal) — supaya kegagalan muncul di log cron,
bukan diam-diam hilang; alerting-ke-manusia sungguhan (mis. `MAILTO` cron atau paging) tetap gap
terpisah, belum dibangun. **Belum live-verified terhadap AWS S3 sungguhan** (nol kredensial AWS di
lingkungan kerja manapun sejauh ini) — teruji end-to-end (upload sukses + kegagalan loud) vs MinIO
(S3-compatible lokal) di CI `restore-drill.yml`, pola gap yang sama seperti Secrets Manager §13.
Detail: `docs/prd-backup-restore-dr-hardening.md`.

## 6a. Ekspor audit-log append-only off-box (K5, 2026-07-02)

Terpisah dari backup penuh §6 (yang jalan harian, mencakup seluruh DB): skrip
`deploy/aws-ec2-test/export-audit-log.sh` mengekspor HANYA rantai `AuditLog` (hash-chained) ke
JSONL, lebih murah sehingga bisa dijalankan lebih sering — poinnya: penyerang yang mengkompromikan
host DB harus ALSO mengkompromikan lokasi off-box ini (prefix S3 terpisah) untuk menghapus semua
salinan jejak audit. Integritas rantai diverifikasi SERVER-SIDE (`audit/export.ts`,
`verifyAuditChain()`) **sebelum** ekspor — rantai rusak/ter-tamper menolak ekspor (skrip exit
non-zero), tak pernah diam-diam mengirim data yang sudah tak valid.

Inkremental via cursor lokal (`.since-seq` di `AUDIT_EXPORT_DIR`) — tiap run hanya mengekspor baris
baru sejak run terakhir; run yang gagal (mis. koneksi S3 putus) TIDAK memajukan cursor, jadi run
berikutnya otomatis mengulang rentang yang sama (crash-safe).

```cron
0 * * * *  cd /home/ubuntu/Asseris && BACKUP_ENCRYPTION_KEY=<hex> \
           sh deploy/aws-ec2-test/export-audit-log.sh >> /var/log/asseris-audit-export.log 2>&1
```

Off-box (opt-in, pola sama §6): `BACKUP_S3_BUCKET=<nama-bucket>` → tersalin ke
`s3://<bucket>/audit-log/…` — prefix TERPISAH dari dump DB penuh (`s3://<bucket>/asseris-…`) agar
bisa diberi kebijakan retensi/Object Lock sendiri. Untuk WORM (write-once-read-many) sungguhan,
aktifkan **S3 Object Lock (Compliance mode)** pada prefix ini — konfigurasi bucket sekali via
`aws s3api put-object-lock-configuration`, **bukan** sesuatu yang bisa dilakukan skrip ini (bucket
harus dibuat dengan versioning+Object Lock enabled sejak awal; tak bisa diaktifkan retroaktif di
bucket existing). Belum live-verified terhadap AWS S3 sungguhan — gap yang sama seperti §6/§13.

## 7. Restore drill & Recovery Objectives (RTO/RPO)

**Status: dieksekusi nyata pertama kali 2026-07-02** (sebelumnya cuma instruksi tak tersentuh,
lihat riwayat di bawah) — dan kini **otomatis**, bukan lagi bergantung ingatan manusia: CI
`.github/workflows/restore-drill.yml` menjalankan siklus penuh backup→hancurkan→restore→verifikasi
terjadwal **mingguan** (Senin 03:17 UTC) + tiap kali `backup.sh`/`restore.sh`/compose file berubah.
CI juga mensimulasikan **kehilangan total** (`DROP SCHEMA public CASCADE`, bukan cuma sebagian) dan
memverifikasi row-count tabel kunci + `audit.verify` secara headless (login + `curl`, bukan klik
UI). Bukti lengkap + metodologi: `docs/prd-backup-restore-dr-hardening.md`.

**Drill manual (rujukan/darurat), pada instance kosong/standby:**
```bash
BACKUP_ENCRYPTION_KEY=<hex> sh deploy/aws-ec2-test/restore.sh \
  backups/asseris-<UTC>.sql.gz.enc     # path relatif-cwd — lihat catatan §6
curl -k https://$PUBLIC_HOST/healthz        # → db:up
```
Lalu **verifikasi integritas jejak audit**: buka app → **Jejak Audit** → `audit.verify` harus
melaporkan **`ok`** (rantai hash-chained `AuditLog` utuh — backup transaksional menjaganya).

**Gotcha ditemukan saat drill pertama (2026-07-02):** working-tree Windows lokal bisa
terkorupsi CRLF secara senyap (blob git-nya tetap bersih LF — cuma checkout lokal yang rusak),
membuat `sh backup.sh` gagal `illegal option -` di WSL. `.gitattributes` (`*.sh text eol=lf`)
ditambahkan supaya kelas bug ini tak bisa lagi ke-commit ke depannya.

### Recovery Objectives (RTO/RPO) — PROPOSAL, menunggu sign-off Ari
Angka di bawah adalah **usulan berbasis kemampuan teknis yang benar-benar terukur**, BUKAN
komitmen final/kontraktual ke klien — target akhir adalah keputusan bisnis Ari.

| Metrik | Nilai | Dasar |
|---|---|---|
| **RPO** (maks. data hilang) | ≤ 24 jam (usulan) | Backup harian (§6 crontab). Memperketat → naikkan frekuensi backup, biaya storage/S3 naik sebanding. |
| **RTO — mekanika restore saja** | ~2 detik (terukur, drill 2026-07-02: 7 User, 4.351 baris AuditLog, 123 StateDoc) | `restore.sh` end-to-end pada instance yang SUDAH berjalan. Akan naik sebanding ukuran DB produksi sungguhan — bukan angka flat. |
| **RTO — total (skenario EC2 hilang total)** | **BELUM terukur** | Drill di atas jalan di WSL Docker Compose LOKAL (instance sudah ada) — TIDAK mengukur waktu provisioning instance/environment baru dari nol (install Docker, build/pull image, terbit sertifikat TLS). Justru itu yang mendominasi RTO nyata pada insiden kehilangan total. Perlu EC2 pilot sungguhan untuk divalidasi (prioritas go-live #4, terpisah — lihat memori `neosuite-ams-next-session`). |

**Keputusan yang perlu Ari buat:** (1) apakah RPO ≤24 jam cukup, atau perlu diperketat; (2)
publikasikan RTO final ke klien sekarang (dengan disclaimer "belum divalidasi di EC2 produksi
penuh") atau tunggu validasi nyata dulu.

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
- **Satu box**: tanpa replikasi; durabilitas bergantung backup + salinan off-box. Salinan off-box
  ke S3 kini ada (opt-in `BACKUP_S3_BUCKET`, §6) tapi **belum live-verified terhadap AWS
  sungguhan** — baru teruji vs MinIO di CI.
- **TLS internal (default)**: peringatan browser sekali. Cocok pilot tertutup; klien eksternal →
  `CADDY_TLS_MODE=acme` (§2, §13) begitu ada domain publik.
- **Secrets berbasis `.env` (default)**: cukup untuk pilot terbatas dengan akses host dibatasi.
  Data klien sungguhan → `SECRETS_PROVIDER=aws-sm` (§13) sebelum onboarding, bukan setelahnya.
- **Rate-limit edge (§14) hanya per-IP, application-layer**: melindungi dari brute-force/abuse
  wajar, BUKAN proteksi DDoS layer-jaringan (L3/L4). Untuk itu perlu layanan terpisah di depan EC2
  (mis. AWS Shield/CloudFront) — di luar cakupan single-instance Caddy ini.
- **Kunci produksi single-active** (§15): tak ada dukungan multi-key/versioned di
  `secretbox.ts`/`signing.ts`. Lihat `docs/KEY-ROTATION.md` §0 untuk implikasinya per kunci.

## 11. Referensi
- Paket & langkah EC2 rinci: `deploy/aws-ec2-test/README.md`
- Guard fail-fast: `server/src/prodConfig.ts` · Provisioning: `server/src/bootstrapFirm.ts`
- Migrasi: `server/prisma/migrations/` + `server/prisma/gen-pg-migrations.sh`
- CI yang memverifikasi build+boot+seed+login + guard fail-fast: `.github/workflows/deploy-smoke.yml`
  (job `deploy-smoke`, server+db langsung di :5181 — TANPA edge) + job `edge-smoke` (login lewat
  Caddy same-origin/`tls internal`, §12 di bawah, + rate-limit §14).
- Rotasi kunci: `docs/KEY-ROTATION.md` (§15) · Kesiapan pentest independen: `docs/PENTEST-READINESS.md`
- Alerting (§16): `.github/workflows/uptime-alert.yml` · Log retensi (§17): `docs/LOGGING.md` ·
  Respons insiden (§18): `docs/INCIDENT-RESPONSE.md`
- Baseline performa & kapasitas (§19): `deploy/aws-ec2-test/loadtest/README.md` ·
  `docs/prd-performance-baseline-capacity.md`
- Kepatuhan UU PDP & lokasi data (§20): `docs/PDP-COMPLIANCE-ASSESSMENT.md` ·
  `docs/DATA-HANDLING-COMMITMENT.md` · `docs/DATA-RETENTION-POLICY.md` ·
  `docs/HOSTING-DATA-RESIDENCY-REVIEW.md`
- **Dokumentasi end-user (BUKAN dokumen ini — ini untuk operator/IT):** panduan pengguna per-peran
  (Partner/Manager/Senior/Junior/Admin & HR/Finance) → `docs/USER-GUIDE.md` · rencana training &
  onboarding firma pilot pertama → `docs/PILOT-ONBOARDING-PLAN.md`

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
- Restore drill nyata (2026-07-02). **Kajian gap UU PDP + lokasi hosting ditutup 2026-07-03**
  (§20, `docs/PDP-COMPLIANCE-ASSESSMENT.md`) — gap analysis + kebijakan retensi/DPA-internal
  selesai, TAPI belum direview pengacara dan sejumlah item operasional (DSR belum wired ke data
  produksi, transfer LLM lintas-batas belum berbasis hukum) masih terbuka, lihat dokumen itu §5.
  **Alerting + log retensi ditutup 2026-07-03** (§16, §17, `docs/INCIDENT-RESPONSE.md`) —
  kode+CI-verified (mocked SMTP/MinIO),
  TAPI belum live-verified terhadap deploy produksi sungguhan (perlu `HEALTHZ_URL`/secret SMTP
  nyata diisi di repo, dan crontab `ship-logs.sh` nyata di box) — pola gap yang sama seperti
  Secrets Manager/TLS publik di bawah. Secrets Manager & TLS publik ditutup sesi berikutnya
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

## 14. Rate-limit edge (Caddy) — go-live gap ditutup

Sebelum ini, `/trpc/auth.login` — dan seluruh endpoint tRPC lain — **tak punya proteksi
brute-force apa pun**, baik di edge maupun di app layer (satu-satunya rate limiter yang ada,
`server/src/llm/ratelimit.ts`, hanya menutupi endpoint proxy LLM/W8). Ditutup dengan
[`mholt/caddy-ratelimit`](https://github.com/mholt/caddy-ratelimit) — plugin pihak ketiga, jadi
`deploy/aws-ec2-test/web.Dockerfile` kini build Caddy lewat `xcaddy` (image `caddy:2-builder-alpine`
sebagai build stage, binary hasil compile disalin ke image final `caddy:2-alpine` — tak ada Go
toolchain yang ikut ke image produksi).

Dua zona di `deploy/aws-ec2-test/Caddyfile`, key per-IP (`{remote_host}`):
- `/trpc/auth.login` — **5 permintaan/menit/IP**. Ambang ketat karena ini satu-satunya endpoint
  yang sebelumnya nol-proteksi sama sekali.
- `/trpc/*` (sisanya) — **60 permintaan/menit/IP**. Ambang longgar, sekadar jaring pengaman umum.

Kedua ambang adalah default operasional, bukan angka regulasi — sesuaikan langsung di `Caddyfile`
bila terlalu ketat untuk pola pemakaian nyata (mis. banyak staf di belakang satu NAT/IP kantor).

CI (`edge-smoke` di `.github/workflows/deploy-smoke.yml`) memvalidasi `caddy validate` untuk kedua
mode TLS **dan** membuktikan `429` benar-benar muncul setelah burst request ke `/trpc/auth.login` —
bukan cuma "config-nya sah secara sintaks". **Belum diverifikasi**: perilaku di bawah beban nyata
EC2 (ambang bisa perlu disesuaikan setelah observasi pola trafik pilot sungguhan), dan tak ada
proteksi DDoS layer-jaringan (§10) — itu tanggung jawab layanan terpisah di depan EC2 bila/ketika
dibutuhkan.

## 15. Rotasi kunci produksi

`APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY` (§1, §13) sebelumnya hanya punya prosedur *generate sekali*
— tak ada kebijakan rotasi. Kebijakan lengkap (cadence, prosedur, siapa approve, kenapa
`APP_SIGNING_KEY` tak bisa dirotasi transparan) + skrip pendukung
(`deploy/aws-ec2-test/rotate-keys.sh`) ada di **`docs/KEY-ROTATION.md`** — dokumen terpisah karena
isinya operasional-berulang (bukan langkah deploy sekali), sama alasannya dengan `backup.sh`/
`restore.sh` yang juga jadi prosedur berdiri sendiri, bukan bagian §1-§9 di atas.

## 16. Alerting (2026-07-03) — go-live gap ditutup

Sebelum ini, `/healthz` dan `/metrics` (`server/src/server.ts`) sudah ada (format Prometheus text
sungguhan) tapi **tak ada yang men-scrape atau memberi tahu manusia**. Ditutup dengan
`.github/workflows/uptime-alert.yml` — probe eksternal, **sengaja berjalan di luar box** (GitHub
Actions, bukan EC2 instance itu sendiri): pemeriksa yang jalan DI box mati bersama box yang harus
diperiksanya, jadi ini secara arsitektur harus berjalan di luar.

**Cara mengaktifkan** (tak melakukan apa pun sampai dikonfigurasi):
1. Repo → Settings → Secrets and variables → Actions → tab **Variables**:
   `HEALTHZ_URL = https://<PUBLIC_HOST>/healthz`
2. Tab **Secrets**: `ALERT_SMTP_HOST`, `ALERT_SMTP_PORT` (587 atau 465), `ALERT_SMTP_USER`,
   `ALERT_SMTP_PASS`, `ALERT_EMAIL_FROM`, `ALERT_EMAIL_TO`.

Probe tiap 15 menit → gagal (tak terjangkau/HTTP bukan 200/`db` down) → email via SMTP
(`.github/scripts/send-alert-email.py`, stdlib Python `smtplib`, nol dependensi pihak
ketiga/vendor Action) + workflow run ditandai gagal (memicu juga notifikasi kegagalan bawaan
GitHub ke *watcher* repo — lapisan kedua gratis). Logika skrip email diverifikasi via mocked-SMTP
unit test (`.github/scripts/test_send_alert_email.py`) tiap kali skrip berubah — filosofi sama
seperti `restore-drill.yml`: jalur yang tak pernah dieksekusi bisa diam-diam rusak berbulan-bulan.

**Batasan (jujur, bukan dijual berlebihan):**
- `schedule` GitHub Actions best-effort — bisa telat beberapa menit saat platform sibuk; GitHub
  menonaktifkan scheduled workflow setelah 60 hari tanpa aktivitas repo (tak mungkin di repo ini
  mengingat frekuensi commit, tapi perlu diketahui).
- Hanya memeriksa liveness + keterjangkauan DB (dua hal yang dilaporkan `/healthz`) — **tidak**
  menghitung laju error dari `/metrics` (itu butuh time-series persisten, mis. Prometheus
  sungguhan — peningkatan masa depan yang wajar, dicatat sebagai gap, bukan dipalsukan dengan
  pemeriksaan stateless per-run).
- Latensi deteksi = "tick 15 menit berikutnya", bukan real-time.

Postur respons (siapa dihubungi, SLA, eskalasi) → **`docs/INCIDENT-RESPONSE.md`**.

## 17. Log aggregation & retensi (2026-07-03) — go-live gap ditutup

Sebelum ini, log kontainer (`db`/`server`/`web`) hanya ada lewat driver `json-file` default
Docker: **tanpa rotasi** (disk tumbuh tak terbatas) dan **tanpa salinan off-box** (box hilang →
log ikut hilang). Ditutup dua lapis:
1. **Rotasi lokal** — `docker-compose.yml`/`docker-compose.deploy.yml` kini menyetel
   `logging.driver: json-file` dengan `max-size: 20m, max-file: 5` per servis (~100 MB/servis).
2. **Salinan off-box terjadwal** — `deploy/aws-ec2-test/ship-logs.sh` (pola sama `backup.sh`),
   cursor-based, opsional ke S3 (`LOG_S3_BUCKET`/`BACKUP_S3_BUCKET`), retensi lokal 3 hari
   (`LOG_LOCAL_RETENTION_DAYS`), diuji end-to-end vs MinIO di CI
   `.github/workflows/log-shipping-drill.yml` (bulanan + tiap kali skrip berubah).

Detail lengkap (kebijakan retensi, rekomendasi S3 lifecycle, apa yang sengaja TIDAK dibangun) →
**`docs/LOGGING.md`**.

## 18. Incident response — deteksi, respons, eskalasi

Alerting (§16) dan log retention (§17) menjawab "bagaimana tahu ada masalah" dan "bagaimana
menyelidikinya setelah fakta" — **`docs/INCIDENT-RESPONSE.md`** menjawab "lalu apa yang
dilakukan": matriks severitas, runbook mitigasi langkah-demi-langkah, template komunikasi klien,
dan — penting — postur operasional saat ini yang dinyatakan jujur (satu kontak teknis, tanpa
eskalasi sekunder, komitmen respons best-effort jam kerja saja; keputusan eksplisit Ari
2026-07-03, bukan asumsi penulis dokumen).

## 19. Baseline performa & kapasitas instance (2026-07-03) — dua gap go-live ditutup

Sebelum ini, §12.3 sudah mengukur ramp konkurensi tapi terhadap **seed demo kecil** (WTB ~27
baris) dan endpoint generik (`auth.me`/`state.set`) — bukan volume data realistis, dan tak pernah
diterjemahkan ke "firma sebesar apa yang aman". PRD:
[`docs/prd-performance-baseline-capacity.md`](prd-performance-baseline-capacity.md). Tooling
(reusable, di-commit): [`deploy/aws-ec2-test/loadtest/`](../deploy/aws-ec2-test/loadtest/README.md).

### 19.1 Metodologi

- **Data sintetis**: WTB fiktif "grup/konsolidasi" **5.023 baris** (5 sub-entitas × sub-ledger
  piutang/utang/aset-tetap/persediaan per pihak, 1 blok induk dgn 11 kode pemicu WTB_MAP) —
  dibangkitkan (`gen-synthetic-wtb.ts`), lolos parser **nyata** `wtb_import.ts` (`ok=true`,
  balanced, 6/6 engine PSAK menyala), dimuat ke `ENG-2025-014` lewat jalur **nyata** `state.set`
  (bukan insert SQL langsung) — payload 841 KB per JSON. Preset "wajar" (240 baris) dimuat ke
  2 perikatan pendamping (`ENG-2025-040`, `ENG-2025-031`) utk dimensi jumlah-perikatan-aktif.
- **Lingkungan**: stack Docker Compose lokal yang SAMA dgn §12.3 (WSL dockerd), cap
  `docker update --cpus/--memory` identik (server 1.2 vCPU/1.2 GB, db 0.6/0.6, web 0.2/0.2 —
  total meniru t3.small 2 vCPU/2 GiB), target `server:5181` **langsung** (bypass Caddy — sama
  alasan §12.3: mengisolasi bottleneck arsitektur + menghindari rate-limit §14 mencemari hasil).
  **BUKAN EC2 nyata** — approksimasi, sama seperti seluruh angka §12.3/§12.4.
- **Ambang SLA** (disepakati Ari sebelum pengujian, bukan dipilih setelah lihat angka): p95 baca
  <1 detik, p95 tulis <2 detik.

### 19.2 Biaya komputasi kanon (headless, tanpa browser)

`figuresFromWTB`/`reconcile`/`psak65` (`canon_part*.ts`) murni fungsi `wtb`, TANPA memoisasi —
dijalankan langsung di Node (`bench-canon.ts`), 200 repetisi:

| Fungsi | Baseline (28 baris) | Volume besar (5.023 baris) |
|---|---|---|
| `figuresFromWTB` | p50 0,006ms | p50 0,004ms |
| `reconcile` | p50 0,176ms | p50 0,299ms |
| `psak65` (konsolidasi grup) | p50 0,040ms | p50 0,676ms |

**Temuan yang mengoreksi asumsi awal PRD**: `materiality()` TERNYATA tidak menerima parameter
`wtb` sama sekali (config-only via `localStorage`/`window.BENCHMARKS`, O(1) terhadap volume) —
diasumsikan volume-sensitif di PRD, ternyata salah setelah baca kode, dicatat di sini supaya
jujur. Kesimpulan utama: **komputasi kanon BUKAN bottleneck** — bahkan `psak65` (fungsi paling
berat, iterasi per-sub-entitas) tetap sub-milidetik pada 5.023 baris. Bottleneck sesungguhnya ada
di jaringan/DB (§19.3) dan (belum terukur — lihat §19.4) render tabel WTB tak-berpaginasi di
browser.

### 19.3 Volume data (single-session) & konkurensi

**Single-session, `bootstrap` (fetch WTB penuh + seluruh StateDoc perikatan), 30 repetisi:**

| Perikatan | Volume WTB | p50 | p95 | p99 |
|---|---|---|---|---|
| ENG-2025-063 (tak disentuh) | ~0 baris | 8ms | 21ms | 56ms |
| ENG-2025-040 / 031 (preset wajar) | 240 baris | 9ms | 11–16ms | 12–18ms |
| ENG-2025-014 (preset besar) | 5.023 baris | 28ms | 36ms | 39ms |

Delta nyata (~3,5× baseline) tapi jauh di bawah ambang SLA baca (1 detik) bahkan single-session.

**Ramp konkurensi (5→10→20→50 sesi, 15dtk/level, campuran 2-baca:1-tulis), thd perikatan
BESAR (`ENG-2025-014`, 4 user nyata: Partner/Manager/Senior/Junior) vs perikatan RINGAN
(`ENG-2025-063`, 2 user ber-akses-lintas Manager/Partner — Senior/Junior bukan anggota
perikatan itu, `not-engagement-member`, jadi dikeluarkan dari perbandingan ini, bukan
disembunyikan):**

| Konkurensi | Ops/dtk (besar) | Baca p95 (besar) | Tulis p95 (besar) | Ops/dtk (ringan) | Baca p95 (ringan) | Tulis p95 (ringan) |
|---|---|---|---|---|---|---|
| 5  | 37 | 177ms ✓ | 176ms ✓  | 108 | 74ms ✓  | 85ms ✓ |
| 10 | 39 | 295ms ✓ | 365ms ✓  | 87  | 155ms ✓ | 199ms ✓ |
| 20 | 39 | 408ms ✓ | 1.102ms ✓ | 79 | 314ms ✓ | 498ms ✓ |
| 50 | 33 | 1.680ms **✗** | 3.992ms **✗** | 72 | 540ms ✓ | 1.839ms ✓ (mepet) |

✓/✗ terhadap ambang p95 baca<1dtk/tulis<2dtk. Nol error nyata di semua level (kolom Error/CAS-409
skrip = 0 setelah perbaikan bug kunci-StateDoc-dibagi — lihat catatan alat).

**Baca**: perikatan RINGAN tak pernah melanggar ambang bahkan di 50 sesi. Perikatan BESAR
melanggar ambang baca **antara 20 dan 50 sesi konkuren** menyentuh perikatan yang SAMA.
**Tulis**: pola serupa — perikatan BESAR melanggar ambang tulis di level yang sama (50), perikatan
RINGAN nyaris menyentuh ambang di 50 (1.839ms dari batas 2.000ms) tapi masih lolos.

### 19.4 Tabel kapasitas — rekomendasi operasional

| Skenario | t3.small/t4g.small (2 vCPU/2 GiB) | Rekomendasi |
|---|---|---|
| Firma kecil, perikatan bervolume wajar (ratusan baris WTB) | Aman hingga **~40-50 staf konkuren** aktif firma-wide | Cukup di t3.small utk pilot KAP kecil-menengah |
| Firma dgn 1+ perikatan bervolume besar (grup/konsolidasi ribuan baris) sedang dikerjakan intensif | Aman hingga **~15-20 staf konkuren** menyentuh perikatan BESAR yang SAMA secara bersamaan | Bila tim fieldwork besar (>20 org) mengerjakan SATU klien grup secara serentak, pertimbangkan upgrade (`t3.medium`/`t4g.medium`, 2 vCPU/4 GiB atau 4 vCPU) SEBELUM fieldwork puncak, bukan reaktif |
| Banyak perikatan aktif bersamaan (volume campuran, staf tersebar) | Throughput firma-wide tak terikat SATU perikatan — pola realistis (staf tersebar lintas klien) lebih ringan dari worst-case tabel di atas | Estimasi konservatif: `t3.small` cukup utk ~15-20 perikatan aktif bersamaan bila TAK semua bervolume besar sekaligus |

**Keterbatasan yang jujur (bukan dijual berlebihan) — dibaca sebelum memakai tabel di atas**:
1. **Bukan EC2 nyata** — approksimasi WSL Docker Compose lokal, sama seperti §12.3/§12.4. CPU
   burstable EC2 asli bisa lebih baik ATAU lebih buruk tergantung kredit burst tersisa.
2. **Closed-loop, tanpa think-time** — tiap "sesi" bench memanggil `bootstrap`/`state.set` dalam
   loop rapat tanpa jeda, jauh lebih agresif dari pola staf nyata (switch perikatan lalu bekerja
   beberapa menit sebelum switch lagi). Angka "aman hingga N sesi konkuren" di atas adalah
   **plafon saturasi worst-case**, bukan "N staf nyata" 1:1 — kapasitas staf-nyata kemungkinan
   LEBIH TINGGI dari angka mentah tabel di atas.
3. **Render browser TIDAK terukur** — §19.2 hanya computasi kanon headless + §19.3 hanya
   jaringan/DB. Waktu React me-render ribuan baris tabel WTB **tak berpaginasi** (dikonfirmasi
   lewat baca kode: `view_wtb_deep.tsx` tak ada virtualisasi/limit) tetap gap terbuka — kemungkinan
   inilah kontributor terbesar utk "terasa lambat" di sisi pengguna yang belum masuk pengukuran
   manapun di atas. Perbaikan (pagination/virtualisasi) di luar scope PRD ini (murni pengukuran,
   bukan remediasi) — dicatat sebagai temuan follow-up, bukan ditambal diam-diam.
4. **Dua dimensi (volume vs konkurensi) diuji, bukan matriks penuh** — kombinasi "volume besar +
   50 perikatan aktif bersamaan" sekaligus belum diuji (biaya seeding meningkat tajam); tabel di
   atas adalah interpolasi kualitatif dari dua sumbu terukur terpisah, bukan titik data langsung.
5. Reproduksi: `deploy/aws-ec2-test/loadtest/README.md` — seluruh perintah persis yang
   menghasilkan angka di atas, termasuk cara memuat ulang data sintetis.

## 20. Kepatuhan UU PDP & lokasi data (2026-07-03) — kajian awal selesai, belum tuntas

Sebelum ini, tak ada kajian tertulis apa pun soal kepatuhan UU PDP 27/2022, DPA/ToS dengan firma
pilot, kebijakan retensi data pasca-kontrak, atau justifikasi region hosting — empat dokumen
terpisah menutup ini (pola sama `docs/KEY-ROTATION.md`/`docs/PENTEST-READINESS.md`: topik
operasional-berulang berdiri sendiri, bukan bagian runbook deploy §1-§9 di atas):

- **`docs/PDP-COMPLIANCE-ASSESSMENT.md`** — gap analysis pasal-per-pasal UU PDP terhadap kode
  aktual (bukan generik), termasuk temuan baru: transfer data lintas-batas via proksi LLM (W8)
  belum punya basis hukum yang dikonfirmasi.
- **`docs/DATA-HANDLING-COMMITMENT.md`** — komitmen data-handling **internal** (keputusan Ari,
  BUKAN DPA/ToS final yang ditandatangani firma pilot) — kerangka klausul siap-pakai bila/ketika
  diformalkan ke surat perikatan (`TPL-PLN-02`, SA 210) setelah direview pengacara.
- **`docs/DATA-RETENTION-POLICY.md`** — timeline & prosedur (interim manual) untuk backup
  serah-terima + pemusnahan instance EC2/S3 pasca kontrak software SELURUH firma berakhir —
  berbeda dari retensi kertas kerja per-perikatan (SA 230/UU KUP) yang sudah ada di
  `app/data_records.js` dan tidak berubah.
- **`docs/HOSTING-DATA-RESIDENCY-REVIEW.md`** — region default `ap-southeast-3` (Jakarta,
  `deploy/aws-ec2-test/terraform/variables.tf:11-14`) dinilai memadai untuk profil klien
  non-regulasi saat ini; klien ter-regulasi OJK di masa depan butuh kajian ulang terpisah.

**Batasan (jujur)**: keempat dokumen adalah kajian teknis + kebijakan operasional, **BUKAN legal
opinion** — belum direview pengacara Indonesia. Jangan jadikan dasar klaim kepatuhan penuh ke
klien firma pilot sampai `docs/PDP-COMPLIANCE-ASSESSMENT.md` §5 selesai. Ini gap #2 (UU PDP) yang
tersisa dari evaluasi menyeluruh sebelumnya — statusnya bergeser dari "0%" ke "kajian awal +
kebijakan ada, implementasi teknis (DSR wiring, purge otomatis) & review hukum masih terbuka".
