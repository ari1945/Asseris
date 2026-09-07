---
name: asseris-deploy-readiness
description: "PRD Deploy-Readiness Single-Tenant Asseris — M1-M7 MERGED ke master via PR #43. Sesi #3: live-test lokal + fix bug edge Caddy 404 (PR #55, MERGED). Sesi #4: AWS Secrets Manager opt-in + toggle TLS internal/acme (PR #56, MERGED) — kode+test+CI verified, belum live-success AWS/domain sungguhan. Sesi #5: rate-limit edge Caddy + kebijakan rotasi kunci + brief pentest (bagian dari PR #56, MERGED, edge-smoke CI hijau). Sesi #6 (2026-07-02): restore drill NYATA dieksekusi+diotomasi CI + off-box S3 backup (opt-in) + RTO/RPO didokumentasikan — PR #57 MERGED. Gap #1 (restore drill) TERTUTUP. Sesi #7 (2026-07-03): alerting (uptime-alert.yml, email SMTP, GH Actions eksternal-sengaja) + log retention/off-box shipping (ship-logs.sh + log-shipping-drill.yml) + docs/INCIDENT-RESPONSE.md (postur: 1 kontak teknis tanpa sekunder, best-effort jam-kerja, keputusan eksplisit Ari) — kode+CI-verified (mocked SMTP/MinIO), belum live-verified. Gap #3 (alerting) SEKARANG TERTUTUP. **✅ COMMITTED+PUSHED `62cb026`** ke `feat/iac-terraform-ec2-provisioning`. HEALTHZ_URL+secret SMTP di GitHub sengaja belum diisi (Ari: 'later'). Sesi #8 (2026-07-03): baseline performa + validasi kapasitas t3.small/t4g.small — PRD `docs/prd-performance-baseline-capacity.md`, tooling reusable `deploy/aws-ec2-test/loadtest/` (generator WTB sintetis 5.023-baris + bench kanon headless + bench jaringan/konkurensi), live-verified thd Docker lokal: bootstrap 28ms p50 pada volume besar (vs 8ms baseline), throughput konkurensi mentok ~37-39 ops/dtk (vs 150-170 di §12.3 data kecil), SLA dilanggar antara 20-50 sesi konkuren pada perikatan besar. Tabel kapasitas di `docs/DEPLOY.md` §19. Sesi #9 (sama hari): dokumentasi end-user + rencana onboarding — `docs/USER-GUIDE.md` (6 peran RBAC persis dari rbac.ts, katalog ~140 modul dari icons.tsx, peran-utama-per-grup dari ROLE_SIDEBAR_GROUPS) + `docs/PILOT-ONBOARDING-PLAN.md` (template fillable, fase 0-5). Temuan produk baru: tak ada jalur tambah-staf pasca bootstrap pertama — di-spawn task `task_b7e55f6e`. Sesi #10 (sama hari): `task_b7e55f6e` DIEKSEKUSI via PRD-first (`docs/prd-add-staff-user-cli.md`) — `server/src/addUser.ts`+`addUserCli.ts` (`npm run add-user`, pola persis bootstrapFirm/bootstrap.ts), 238/238 test server hijau, live-verified thd Docker Postgres SUNGGUHAN (6 peran dibuat+login sukses, TeamMember benar hanya utk 4 peran audit, dibersihkan pasca uji). Gap `task_b7e55f6e` TERTUTUP. **BELUM commit/push (sesi #8+#9+#10 gabung)** — menunggu konfirmasi Ari. Gap #2 (UU PDP) satu-satunya dari 6 gap ASLI yang masih 0%."
metadata: 
  node_type: memory
  type: project
  originSessionId: b4a35af8-fce2-46da-8607-c920b8c70da4
---

# Deploy-Readiness Single-Tenant (Asseris) — progres implementasi

PRD: `PRD - Deploy-Readiness Single-Tenant.md` (di `master`, sudah di-commit). Branch kerja **`feat/deploy-readiness-single-tenant`** (off `master` `d1e6df7`; branch lama `feat/w9-coretax-connector` sudah dihapus). Mulai 2026-07-01.

## Keputusan Ari (§11 OQ, LOCKED)
- **Host:** EC2 single-box (docker-compose) · **TLS:** Caddy internal/self-signed default (ACME = alternatif uncomment) · **Provisioning:** CLI `bootstrap-firm` (bukan UI first-run) · **Backup:** harian, retensi 30 hari · **Kunci backup:** TERPISAH dari `APP_ENCRYPTION_KEY`.

## ✅ P0 SELESAI (M1-M3) — committed di branch, BELUM push
- **M1 edge same-origin** (commit `feat(deploy): M1 edge...`): angkat paket `deploy/aws-ec2-test/` (Caddyfile, docker-compose.deploy.yml, web.Dockerfile, .env.example, README) dari branch `chore/deploy-aws-ec2-test` ke branch ini (folder terisolasi, bukan tulis ulang). Caddy = satu origin: `/trpc`,`/healthz`,`/metrics`→`server:5181`, sisanya SPA statis `/srv`+fallback. **Caddyfile default `tls internal`** (self-signed, sesuai keputusan); blok ACME jadi komentar alternatif. web.Dockerfile build SPA→Caddy. root `docker-compose.yml` = API/DB-only (diberi pointer ke deploy/).
- **M2 fail-fast guard** (commit `feat(deploy): M2...M3`): `server/src/prodConfig.ts` — `prodConfigProblems()`/`configSummary()`/`assertProdConfig()` PURE, reuse `readEncryptionKey`/`readSigningKey` NYATA (gate==runtime). Flag di NODE_ENV=production: `APP_ENCRYPTION_KEY`(32B), `APP_SIGNING_KEY`(Ed25519), `COOKIE_SECURE`=1, `DATABASE_URL`(unset/file:/changeme). `server.ts` panggil sebelum `listen` (exit 1). **+13 uji → 194 server uji hijau.**
- **M3 Dockerfile**: komentar "UNTESTED FROM DEV MACHINE" → "VERIFIED IN CI (deploy-smoke.yml)".

## ⚠️ GOTCHA KRITIS (fail-fast × compose/CI)
Guard bikin `NODE_ENV=production` (yg diset root compose & deploy compose) MENOLAK boot tanpa `APP_ENCRYPTION_KEY`+`APP_SIGNING_KEY`+`COOKIE_SECURE=1`+db≠changeme. Konsekuensi wajib ditangani (SUDAH):
- **`APP_SIGNING_KEY` sebelumnya TAK diteruskan compose** → guard tak akan pernah lolos. Ditambahkan ke root compose (`:-` default kosong), deploy compose (`:?` required), + `.env.example`. Generate: `openssl genpkey -algorithm ed25519 -outform DER | base64 -w0`.
- **`deploy-smoke.yml` CI** akan gagal (dulu COOKIE_SECURE=0, tanpa signing key): kini gen `APP_SIGNING_KEY` per-run + `COOKIE_SECURE=1` (smoke login pakai BODY token, bukan cookie → HTTP runner OK) + **step NEGATIF baru**: `docker compose run --no-deps -e COOKIE_SECURE=0 server npm start` harus exit≠0.

## Batas verifikasi
**Docker TAK tersedia di env dev ini** (`docker: command not found`; memori lama: WSL dockerd nohup). Jadi: M2 diverifikasi PENUH via unit test; M1/M3/compose live-smoke = **deploy-smoke CI** (ubuntu build+boot+seed+login) + operator host. Bukan diklaim "live-proven" dari sini.

## ✅ P1 SELESAI (M4-M7) — 2026-07-01/02, committed di branch, BELUM push
- **M4 Prisma migrate** (keputusan: SQLite dev + Postgres migrations prod): `server/prisma/migrations/0_init/migration.sql` (16 tabel/20 idx/12 FK) di-generate OFFLINE via `migrate diff --from-empty --to-schema-datamodel <schema-provider-postgres> --script` (tak butuh DB). `migration_lock.toml`=postgresql. **DUAL-PROVIDER by design:** `schema.prisma` tetap `sqlite` (dev `db push` tak berubah); prod flip→postgres saat image build (Dockerfile sed) + `migrate deploy`. lock=postgres vs schema=sqlite DISENGAJA. compose `db push`→`migrate deploy`. Helper `server/prisma/gen-pg-migrations.sh` (regen baseline offline; inkremental N→N+1 butuh Postgres shadow). Baseline DB-push lama: `migrate resolve --applied 0_init`.
- **M5 `bootstrap-firm`** (`server/src/bootstrapFirm.ts` pure + `bootstrap.ts` CLI, `npm run bootstrap`): 1 Firm + 1 Partner-admin (role Engagement Partner=FIRM_ADMIN), scrypt hash, TOTP enrol default (BOOTSTRAP_TOTP=0 skip). **MENOLAK bila firma sudah ada.** `seed.ts` di-tandai `[DEMO]` + FAIL-CLOSED di production (butuh ALLOW_DEMO_SEED=1). +6 uji (mock DB + crypto nyata) + smoke sqlite nyata.
- **M6 Backup** (`deploy/aws-ec2-test/backup.sh` + `restore.sh`): pg_dump(--clean --if-exists) → gzip → AES-256 dgn `BACKUP_ENCRYPTION_KEY` (TERPISAH), timestamp UTC, prune 30hr. Jadwal = host cron (contoh di header). restore.sh → psql + WAJIB verify `audit.verify`='ok' pasca-restore. `.gitignore` +backups/. **DoD §3.4 restore end-to-end = tugas operator** (butuh Postgres+Docker).
- **M7 `docs/DEPLOY.md`**: runbook lengkap nol→pilot (keys→env→deploy→bootstrap→verify→backup/cron→restore-drill→upgrade N→N+1→rollback→batasan).
- **SELURUH M1-M7 SELESAI.** Server: typecheck 0 + **200 uji hijau** (+19: 13 prodConfig, 6 bootstrap). Migration tak tersentuh.

## ⚠️ Batas verifikasi (JUJUR)
Docker/Postgres TAK ada di dev env → M2/M5 diverifikasi PENUH via unit+smoke sqlite; M1/M3/M4/M6 live (compose up, migrate deploy pada Postgres, restore) = **deploy-smoke CI + operator host**. Bukan diklaim live-proven dari sini.

## Gate & jalankan
Branch: `feat/deploy-readiness-single-tenant` (off master `d1e6df7`; **BELUM push, belum PR**). Server gate: `cd server; npm run typecheck && npm run test` (200 hijau). 8 commit deploy (M1..M7). Terkait: [[asseris-deploy-aws-ec2-test]] (sumber paket Caddy) · [[neosuite-ams-w10-hardening]] (crypto/env) · [[neosuite-ams-w6-backend]] (Prisma/seed).

## 2026-07-02 — gap-analysis lanjutan pasca-M7 (PAUSED, belum lanjut eksekusi)
Sesi lanjutan (bukan implementasi) meninjau kesiapan deploy **di luar scope PRD M1-M7** — cek nyata terhadap `docs/DEPLOY.md`, `.github/workflows/ci.yml` + `deploy-smoke.yml`. Kesimpulan: infra/deploy-mechanics (M1-M7) solid, tapi ada gap operasional/legal yang PRD asli tak cakup. **Prioritas sebelum go-live dengan data klien riil** (urutan blast-radius):
1. **Restore drill BELUM pernah dieksekusi nyata** — DEPLOY.md §7 baru dokumentasi, DoD §3.4 tetap tugas operator (Docker tak ada di dev env ini).
2. **Kajian kepatuhan UU PDP BELUM dilakukan** — app simpan data pajak/keuangan klien = data pribadi/sensitif; belum ada dasar hukum pemrosesan/retensi/hak-subjek yang didokumentasikan. Risiko legal, bukan teknis — bisa blokir go-live total.
3. **Alerting belum ada** — `/healthz`+`/metrics` ada tapi tanpa dashboard/alert; kegagalan baru diketahui dari komplain klien.
4. **Live smoke test di EC2 sungguhan belum dilakukan** — CI (`deploy-smoke.yml`, ubuntu runner) ≠ kondisi t3.small nyata (network/disk/memory terbatas).
5. **Secrets di `.env` file** (bukan vault/KMS) — didokumentasikan sebagai batasan by-design di DEPLOY.md §10, cukup utk pilot terbatas, TIDAK utk banyak firma.
6. **TLS self-signed default** — cocok pilot internal, perlu domain publik+ACME sebelum klien eksternal.

**8 commit M1-M7 masih lokal, BELUM push/PR** (status tak berubah sejak entri di atas).

## 2026-07-02 — UAT test plan alur audit (drafted, 0% dieksekusi)
Selain gap-analysis deploy, disusun **daftar tugas pengujian fungsional** utk fitur & alur kerja audit (bukan infra) — lihat [[asseris-uat-audit-workflow-plan]]. Terpisah karena beda domain (QA fungsional vs deploy-mechanics), tapi sama-sama prasyarat sebelum go-live.

## 2026-07-02 (sesi lanjutan #2) — ✅ MERGED ke master via PR #43 + 2 defect Critical ditemukan-dan-ditutup pra-push
Sebelum push, dijalankan **peer-review independen** (agent terpisah, baca full diff + file aktual, bukan cuma hunk) atas 8 commit M1-M7. Temuan **2 Critical** (bukan hipotetis — keduanya deterministik):
1. **`bootstrap.ts` (CLI provisioning firma nyata) tak pernah lewat gerbang `assertProdConfig` (M2)** — `APP_ENCRYPTION_KEY` hilang/lemah saat `npm run bootstrap` → secret TOTP Partner-admin nyata tersimpan **plaintext** di Postgres produksi, tanpa error/warning. Ini justru CLI yang DEPLOY.md §4 instruksikan operator jalankan untuk data pilot riil.
2. **Tabrakan seed fail-closed (M5) × `NODE_ENV=production` compose** — `deploy-smoke.yml` dan `deploy/aws-ec2-test/README.md` §6 keduanya menjalankan `npm run seed` tanpa `ALLOW_DEMO_SEED=1`, jadi CI/README akan gagal di run berikutnya (dikonfirmasi: `deploy-smoke.yml` belum pernah run interaksi ini).
Plus 3 **High** (backup-key separation cuma konvensi bukan code-enforced; `restore.sh` tanpa panduan stop-server sebelum restore di topologi single-box → risiko silent data-loss saat live traffic; README seed step sama collision-nya) dan 2 Medium (TOCTOU race check-then-act di `bootstrapFirm`; komentar CI basi `prisma db push`→harusnya `migrate deploy`).

**Diperbaiki sebelum push** (commit `8b683c1`): wire `assertProdConfig` ke `bootstrap.ts` (sebelum tulis DB apa pun) + `ALLOW_DEMO_SEED=1` di `deploy-smoke.yml` & README + fix komentar basi + **step CI baru** yang membuktikan bootstrap sungguh menolak jalan tanpa kunci (mirror pola "boot refuses insecure config" yang sudah ada). Ditambah gap terpisah yang diminta ditutup: **dependency-audit tooling** — `.github/dependabot.yml` (npm+docker+actions, mingguan) + `.github/workflows/dependency-audit.yml` (`npm audit --omit=dev --audit-level=high` tiap push/PR + cron mingguan); 0 kerentanan saat ini di kedua proyek (commit `265c2e8`).

**Live-verified, bukan cuma unit test**: push → PR #43 → **seluruh 5 CI check hijau** (deploy-smoke termasuk step bootstrap fail-fast baru; server typecheck+200 test; migration; 2× npm audit) → **`gh pr merge 43 --merge --delete-branch`** atas approval eksplisit Ari ("Merge it. Proceed") → **merged ke master, commit `62a2e86`, 2026-07-02**. Branch `feat/deploy-readiness-single-tenant` dihapus (remote+lokal). Local repo di-sync (`git pull` fast-forward `d1e6df7..62a2e86`).

**3 gap masih terbuka (didokumentasikan di badan PR #43, TIDAK diblok merge)** — backup-key separation belum code-enforced, `restore.sh` belum ada panduan live-traffic, TOCTOU race `bootstrapFirm` (severity rendah, CLI sekali-jalan manusia). **Dua yang pertama TUMPANG TINDIH dengan prioritas #1 gap-analysis di atas (restore drill belum pernah dieksekusi nyata)** — jangan ditrack terpisah; gabung jadi satu go-live gate. Rekomendasi ke Ari: perbaiki backup-key enforcement + restore.sh guidance SEBELUM restore drill nyata pertama (murah, high-value); TOCTOU boleh ditunda tanpa batas.

**Status gerbang go-live (6 prioritas di atas) TAK BERUBAH** — MERGE ini menutup kualitas-kode M1-M7, BUKAN prasyarat operasional/legal (restore drill nyata, UU PDP, alerting, live smoke EC2, secrets vault, TLS domain publik masih 0% dieksekusi).

## 2026-07-02 (sesi #3) — Docker TERNYATA tersedia (WSL dockerd) → live test lokal nyata, bukan lagi hipotetis; 1 bug deploy-breaking ditemukan+diperbaiki

Sesi sebelumnya berulang kali mencatat "Docker tak tersedia di dev env ini" — **klaim itu stale/salah**: `wsl -d Alpine` di mesin dev ini punya `dockerd` aktif (sudah menjalankan kontainer proyek lain). User minta perbaikan 3 gap spesifik: (1) belum live-tested di host nyata, (2) belum ada UAT E2E browser pasca-deploy, (3) belum ada uji beban/concurrency. Keputusan Ari (AskUserQuestion): pakai Docker Compose lokal via WSL sbg pengganti EC2 (bukan EC2 sungguhan — tak ada kredensial AWS di sesi), cari titik jenuh load test (bukan target angka spesifik), eksekusi langsung tanpa PRD baru (lanjutan PRD yang sudah sign-off).

**Prosedur**: generate `.env` asli (`openssl`) + `docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml up -d --build` (real Postgres, real Caddy, real TLS `tls internal`) → `bootstrap-firm` (proved M5 non-destruktif + guard "refuse if firm exists" keduanya bekerja di Postgres nyata) → `ALLOW_DEMO_SEED=1 npm run seed` (data realistis) → root CA Caddy diinstal ke Windows user cert store (`certutil -user -addstore`) supaya Chrome asli percaya self-signed → E2E via claude-in-chrome browser sungguhan.

### Bug ditemukan: edge Caddy 404 pada SEMUA panggilan tRPC (termasuk login) — sejak paket ini ada
`deploy/aws-ec2-test/Caddyfile` meneruskan `/trpc/*` ke server **tanpa `strip_prefix`**, padahal server memasang prosedur di ROOT (`server/src/server.ts`, kontrak sama dgn proxy dev Vite). `deploy-smoke.yml` CI tak pernah menangkapnya karena job itu memanggil server langsung di `:5181/auth.login` (tanpa Caddy sama sekali) — **CI "deploy-ready" ≠ paket single-tenant yang sebenarnya dipakai pilot pernah teruji lewat edge-nya sendiri**. UI menyamarkan 404 jadi pesan generik "Email atau kata sandi salah", nyaris tak ketahuan tanpa cek network tab. **Diperbaiki**: `Caddyfile` matcher terpisah (`/trpc/*` di-strip, `/healthz`+`/metrics` tidak). **Guardrail permanen**: job baru `edge-smoke` di `deploy-smoke.yml` mem-boot paket asli (server+db+Caddy) dan login lewat `https://localhost/trpc/auth.login` — kelas bug ini sekarang gagal CI otomatis.

### E2E browser (pasca-fix) — lulus semua
Login (Manager) → dashboard nyata → **Impor TB** paste-CSV (`state.set 200`, WTB update live) → **Sign-off Review** WP (status berubah real-time) → **Export+Segel** AJE XLSX (`POST /exporter.seal → 200`, tanda tangan Ed25519 sungguhan). Temuan sampingan (BUKAN diperbaiki, di-spawn sbg task terpisah `task_3a345a01`): tombol "Export Log" di modul Audit Trail (`view_platform3.tsx`) adalah stub tanpa `onClick` — beda dari export+segel register yang nyata.

### Load/concurrency — titik jenuh (approksimasi t3.small via `docker update --cpus/--memory`, BUKAN EC2 nyata)
Ramping 5→10→20→50 sesi konkuren (4 user nyata anggota `ENG-2025-014`), 15dtk/level, langsung ke server (isolasi bottleneck dari Caddy). **Nol error di semua level** — arsitektur tak crash, tapi throughput mentok ~150-170 ops/dtk mulai konkurensi 10 (klasik saturasi). Read (`auth.me`) nyaris tak terpengaruh (p95<100ms bahkan di 50). **Login = bottleneck tertajam** (p50 183ms→4.3dtk dari 5→50 konkuren — dugaan kuat: scrypt hashing CPU-intensif di bawah cap 1.2 vCPU; login massal serentak jam 9 pagi berisiko, login tersebar tak masalah). Write (`state.set`, jalur sama WTB/AJE/sign-off) nyaman (<100ms) sampai ~10 penulis konkuren-persis-bersamaan, terasa (~300-600ms) di 20-50. Kesimpulan: untuk KAP pilot ~10-20 staf dgn pola login tersebar, plausibel cukup — tapi ini sinyal pertama, bukan SLA final tanpa konfirmasi EC2 sungguhan.

**Dituliskan lengkap ke `docs/DEPLOY.md` §12** (bug, E2E, tabel load-test, gap tersisa jujur). Perubahan: `deploy/aws-ec2-test/Caddyfile` (fix) + `.github/workflows/deploy-smoke.yml` (job `edge-smoke` baru) + `docs/DEPLOY.md` (§12) — **✅ COMMITTED (`a0c3d9c`) + PUSHED → PR #55 dibuka** (`fix/deploy-edge-trpc-prefix-live-test` → `master`), belum di-review/merge Ari. CI `edge-smoke` job baru akan run otomatis di PR ini — **belum dikonfirmasi hijau**, cek sebelum merge (job ini justru menguji regresi yang baru saja diperbaiki).

**⚠️ State lingkungan saat pause (2026-07-02):** repo lokal masih di branch `fix/deploy-edge-trpc-prefix-live-test` (BUKAN master). Stack Docker Compose lokal (`asseris-test-db-1`/`-server-1`/`-web-1`) **MASIH HIDUP** via WSL dockerd, resource-capped (~t3.small: server 1.2vCPU/1.2GB, db 0.6/0.6, web 0.2/0.2). Belum di-teardown — sesi berikutnya bisa pakai langsung (`curl -k https://localhost/healthz`) atau matikan (`docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml --env-file deploy/aws-ec2-test/.env down`). `.env` lokal (`deploy/aws-ec2-test/.env`, gitignored) berisi kunci nyata utk stack ini — jangan hilang bila mau lanjut tanpa rebuild.

**Status gerbang go-live update**: gap #4 (live smoke EC2) **sebagian** tertutup — Docker Compose lokal via WSL BUKAN pengganti penuh EC2 (tak ada network/EBS/noisy-neighbor asli), tapi jauh lebih kuat dari CI mock dan sudah menemukan 1 bug deploy-breaking nyata yang lolos 43 PR + merge sebelumnya. Gap #1 (restore drill), #2 (UU PDP), #3 (alerting) **tetap 0%, tak tersentuh sesi ini**. Gap #5 (secrets vault) dan #6 (TLS domain publik) ditutup **hari yang sama, sesi lanjutan #4** — lihat bagian di bawah.

## 2026-07-02 (sesi #4, sama hari dgn sesi #3) — AWS Secrets Manager + toggle TLS internal/acme

User minta perbaikan 2 gap tersisa: (5) secrets berbasis `.env` file — risiko nyata bila host di-compromise setelah ada data klien sungguhan; (6) TLS self-signed default — peringatan browser tiap user, tak cocok klien eksternal. Sama seperti sesi #3: dicek dulu apakah ada kredensial AWS (tak ada — CLI/env/`~/.aws` semua kosong) atau domain publik (tak ada). Keputusan Ari (AskUserQuestion): **bangun layer kode + unit test** utk secrets (bukan cuma dokumentasi, bukan ditunda) — live-test terhadap AWS sungguhan nanti; **toggle aman + perkuat runbook** utk TLS (bukan cuma dokumentasi) — verifikasi ACME sungguhan tetap perlu domain nyata nanti.

Branch **`feat/aws-secrets-manager-and-tls-toggle`** (off master, MERGE dari `fix/deploy-edge-trpc-prefix-live-test` di awal supaya Caddyfile tak konflik dgn PR #55) — **3 commit, ✅ PUSHED → PR #56 dibuka** (base `master`, catatan di body PR: diff akan menyusut otomatis begitu PR #55 merge duluan, tak perlu aksi manual):

### Secrets Manager (`ede4b2d`)
`server/src/secrets.ts` baru — `SECRETS_PROVIDER=aws-sm` (default kosong = `.env` tak berubah) menarik SATU secret JSON dari AWS Secrets Manager, di-merge ke `process.env` SEBELUM `prodConfig.ts`/`db.ts`/`crypto/*` membaca (semua consumer downstream TAK berubah). Auth via default AWS credential chain (IAM role EC2 — bukan access key). Var eksplisit di `.env` SELALU menang atas SM (override 1 kunci tanpa redeploy). **Fail-closed**: fetch/parse gagal → throw → server.ts/bootstrap.ts exit 1 SEBELUM boot lanjut (filosofi sama dgn guard M2 `assertProdConfig`). Wired ke `server.ts` + `bootstrap.ts` (top-level `await`, tsconfig ES2022/ESNext sudah dukung tanpa config berubah). **14 unit test baru (AWS SDK di-mock) + live-verified terhadap stack Docker lokal**: (a) `SECRETS_PROVIDER=aws-sm` tanpa kredensial AWS nyata → boot ditolak bersih SEBELUM `server.listen` (dibuktikan via absennya log line, BUKAN exit-code shell — `docker compose run --rm` exit-code reporting ternyata QUIRK di environment lokal ini, bahkan test COOKIE_SECURE=0 yang SUDAH established lama pun kena artifact yang sama; jangan percaya `$?` dari `docker compose run` di WSL lokal ini, cek log/behavior langsung); (b) jalur default (`SECRETS_PROVIDER` unset) nol-regresi (healthz+login tetap 200). 214/214 server test hijau (200 lama + 14 baru), typecheck bersih. **Verifikasi live TERHADAP AWS SUNGGUHAN (fetch sukses) BELUM dilakukan** — butuh kredensial AWS nyata, di luar sesi manapun sejauh ini.

### TLS toggle internal↔acme (`bf686ef` + CI `56173b5`)
Ganti comment/uncomment manual `Caddyfile` (README lama) jadi **satu baris `.env`**: `CADDY_TLS_MODE=internal` (default) | `acme`. **GOTCHA PENTING (diuji langsung, bukan diasumsikan):** `tls {$VAR}` dengan `$VAR` kosong = **Caddyfile SYNTAX ERROR** ("wrong argument count or unexpected line ending") — placeholder Caddy TAK BISA membuat satu directive jadi kosong-kondisional. Solusi yang TERBUKTI jalan (via `caddy validate` langsung thd image): `import /etc/caddy/tls-{$CADDY_TLS_MODE}.caddy` memilih salah satu dari 2 snippet kecil baru (`tls-internal.caddy`=`tls internal`; `tls-acme.caddy`=kosong/komentar-saja → meniadakan `tls` sepenuhnya → automatic-HTTPS default Caddy=ACME asli jalan). `web.Dockerfile` COPY kedua snippet; `docker-compose.deploy.yml` pass `CADDY_TLS_MODE` ke service `web` + tambah `SECRETS_PROVIDER`/`AWS_SECRETS_MANAGER_SECRET_ID`/`AWS_REGION` opsional ke service `server` + **relaksasi `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY` dari compose-level `:?required` jadi `:-` optional** (gerbang otoritatif tetap `prodConfig.ts`; `:?` compose cuma cek ".env ada isinya" bukan validitas, dan akan salah-blokir jalur Secrets-Manager). **Live-verified**: `caddy validate` lulus KEDUA mode thd image nyata; mode `internal` (default) di-rebuild+recreate di stack lokal → healthz+login lewat `/trpc` tetap 200 (nol regresi, termasuk gabungan dgn fix PR #55 + secrets.ts baru). Mode `acme` tervalidasi STRUKTURAL saja — provisioning Let's Encrypt SUNGGUHAN belum diverifikasi (butuh domain publik nyata). CI baru: `edge-smoke` job kini juga `caddy validate` kedua mode (cepat, tanpa network) — tak lagi bisa regresi diam-diam sampai operator sungguh flip ke `acme` di deploy nyata.

`docs/DEPLOY.md` §13 (baru) + `deploy/aws-ec2-test/README.md` + `.env.example` didokumentasikan lengkap dgn caveat jujur (belum live-verified thd AWS/domain nyata).

**Status gerbang go-live FINAL sesi #3+#4 (hari sama, 2026-07-02):** gap #4 (live EC2) sebagian, #5 (secrets vault) kode+test+fail-closed-verified TAPI belum live-success-AWS, #6 (TLS domain) kode+validate-verified TAPI belum live-ACME-sungguhan. #1 (restore drill), #2 (UU PDP), #3 (alerting) **masih 0%, satu-satunya yang benar-benar tak tersentuh sama sekali**.

**⚠️ State lingkungan saat pause (2026-07-02, akhir sesi #4):** repo lokal masih di branch `feat/aws-secrets-manager-and-tls-toggle` (BUKAN master). **DUA PR terbuka menunggu review/merge**: PR #55 (`fix/deploy-edge-trpc-prefix-live-test`→master) dan **PR #56** (`feat/aws-secrets-manager-and-tls-toggle`→master, sudah termasuk commit PR #55 lewat merge — diff akan menyusut otomatis begitu #55 merge duluan). Stack Docker Compose lokal (`asseris-test-db-1`/`-server-1`/`-web-1`) **MASIH HIDUP** via WSL dockerd. `.env` lokal (`deploy/aws-ec2-test/.env`, gitignored) berisi kunci nyata utk stack ini.

## 2026-07-02 (sesi #5, sama hari dgn #3+#4) — rate-limit edge + kebijakan rotasi kunci + brief pentest — PAUSED atas permintaan Ari

User minta perbaikan 3 gap dari review keamanan awal (bukan hasil pentest — review internal): (1) belum ada penetration test independen, (2) belum ada rate-limiting/DDoS protection di edge Caddy, (3) belum ada kebijakan rotasi `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY`. Survey read-only dulu (Caddy stock `caddy:2-alpine` tanpa plugin, satu-satunya rate limiter yang ada `server/src/llm/ratelimit.ts` cuma menutupi proxy LLM/W8, `/trpc/auth.login` nol proteksi sama sekali) → PRD → **Ari jawab AskUserQuestion**: item #1 = draft scope-of-work saja (bukan kode); item #2 = rate-limit dasar Caddy (bukan DDoS L3/L4 penuh); item #3 = kebijakan tertulis + skrip rotasi manual (bukan cuma dokumen). PRD di-approve ("Proceed.") sebelum bangun — sesuai working policy [[wedge-mvp-build-decision]]-style gate.

**Dibangun (branch SAMA `feat/aws-secrets-manager-and-tls-toggle`, 2 commit lokal — `08d2ca0` feat + `912cfaf` chore exec-bit fix):**
- **Rate-limit edge**: `web.Dockerfile` kini build via `xcaddy` (stage `caddy:2-builder-alpine`) + plugin `mholt/caddy-ratelimit`, binary hasil compile disalin ke image final `caddy:2-alpine` (tak ada Go toolchain ikut ke prod). `Caddyfile`: global `order rate_limit before basicauth` + dua zona per-IP (`{remote_host}`) — `/trpc/auth.login` 5/menit (SEBELUM ini nol proteksi apa pun), `/trpc/*` sisanya 60/menit. CI `edge-smoke` tambah step burst 8 request ke login dan assert `429` benar muncul (bukan cuma `caddy validate` sintaks).
- **Rotasi kunci**: `docs/KEY-ROTATION.md` — kebijakan (cadence 180 hari kalender + event-driven utk `APP_ENCRYPTION_KEY`/`BACKUP_ENCRYPTION_KEY`/`POSTGRES_PASSWORD`; **TANPA cadence rutin utk `APP_SIGNING_KEY`** — hanya event dicurigai bocor). **Temuan arsitektur nyata saat menulis dok ini**: `secretbox.ts`/`signing.ts` cuma dukung SATU kunci aktif, tanpa versioned-decrypt/verify. `APP_ENCRYPTION_KEY` AMAN dirotasi via `server/src/rotateEncryptionKey.ts` (skrip re-encryption pass baru — reuse `encryptSecret`/`decryptSecret` yang SUDAH terima param key eksplisit, nol perubahan ke `secretbox.ts`). `APP_SIGNING_KEY` **TAK BISA dirotasi transparan** — `verifyHash()` cuma cek thd kunci publik proses saat ini, merotasi = semua segel ekspor lama gagal `audit.verify`. Ini dicatat sbg limitasi didokumentasikan, BUKAN dibangun-sekitar (di luar scope PRD sesi ini — kandidat PRD terpisah bila rotasi rutin jadi kebutuhan nyata). Orkestrasi: `deploy/aws-ec2-test/rotate-keys.sh` (dry-run + konfirmasi eksplisit `ROTATE` sebelum menulis apa pun, mirror pola `backup.sh`/`restore.sh`).
- **Pentest readiness**: `docs/PENTEST-READINESS.md` — brief scope-of-work berbahasa Inggris (sengaja, dokumen ini keluar organisasi ke vendor eksternal, beda dari dok internal lain yang berbahasa Indonesia). Area kritis, kriteria vendor, format deliverable, checklist kesiapan lingkungan. Status "not started" — belum ada vendor dikontak.

**Verifikasi**: server `typecheck` + **214 test** hijau lokal. **BELUM diverifikasi: `docker build`/`caddy validate` thd image xcaddy baru** — tak ada Docker di sesi ini (beda dari sesi #3 yang punya WSL dockerd aktif). Job CI `edge-smoke` (dengan step burst-429 baru) adalah verifikasi PERTAMA yang sungguhan thd build+sintaks plugin — **belum di-push, belum ditonton**.

**Update sesi #6**: kedua commit di atas di-push, `gh pr checks 56 --watch` **SEMUA 6 check PASS** (termasuk `edge-smoke` — xcaddy build + `rate_limit` Caddyfile syntax terbukti aman di CI, bukan cuma lokal). **PR #55 DAN #56 keduanya MERGED ke master** (urutan: #55 dulu, lalu #56 fast-forward krn diff menyusut otomatis). Repo lokal sempat stale di branch `feat/aws-secrets-manager-and-tls-toggle` (sudah tak ada di remote) — di-sync `git checkout master && git pull` di awal sesi #6.

## 2026-07-02 (sesi #6, sama hari) — restore drill NYATA + off-box S3 backup (opt-in) + RTO/RPO — PR #57

User minta perbaikan 3 hal spesifik dari gap #1 di atas: (a) restore drill belum benar-benar dieksekusi (item aksi konkret, bukan cuma dokumentasi), (b) backup cuma di satu box tanpa salinan ke lokasi ke-2, (c) RTO/RPO tak terdefinisi. Survey read-only dulu (`backup.sh`/`restore.sh` sudah ada & solid, tapi drill-nya sendiri belum pernah dijalankan sama sekali; nol mention RTO/RPO di repo) → PRD `docs/prd-backup-restore-dr-hardening.md` → Ari **"Proceed."** sebelum bangun.

**4 fase (branch `feat/restore-drill-offbox-backup-rto-rpo`, 1 commit `ae66ad5`, PR #57 dibuka ke master):**
1. **Drill manual nyata dieksekusi** (WSL Docker, stack `asseris-test-*` yang sudah hidup dari sesi #3): backup → `DROP SCHEMA public CASCADE` (kehilangan total disimulasikan, bukan sebagian) → restore → row count identik (User=7, AuditLog=4351, StateDoc=123) + `audit.verify` ok:true dgn chain benar memperpanjang (4351→4352 setelah 1 login baru pasca-restore, EXPECTED bukan anomali). **Bug nyata ditemukan+diperbaiki**: `backup.sh` rusak CRLF di working-tree Windows LOKAL (blob git-nya SUDAH bersih LF — artefak checkout doang, BUKAN bug ter-commit); root cause: `core.autocrlf` aktif di level SYSTEM (tak kelihatan via `git config --get` biasa). Ditambahkan `.gitattributes` (`*.sh text eol=lf`) supaya kelas bug ini tak bisa ke-commit ke depannya.
2. **CI `restore-drill.yml` baru**: siklus sama (backup→destroy→restore→verify) terjadwal mingguan (Senin 03:17 UTC) + on-change ke `backup.sh`/`restore.sh`/compose file — drill kini tak bisa basi lagi tanpa ketahuan.
3. **Off-box S3 (opt-in `BACKUP_S3_BUCKET`)** di `backup.sh` — pola opt-in sama `SECRETS_PROVIDER` (`secrets.ts`), default kosong = tak berubah. Gagal salin off-box = LOUD (`BACKUP_OFFBOX_FAILED` + exit non-zero, backup lokal tetap ada). **Diuji nyata 3 jalur** (sukses, gagal-loud, default-tak-berubah) vs kontainer MinIO disposable SEBELUM di-wire ke CI (termasuk instal sementara `aws-cli` via `apk` di WSL Alpine utk validasi jalur script asli, bukan cuma command setara — lalu dilepas lagi).
4. **RTO/RPO didokumentasikan** di `docs/DEPLOY.md` §7 (digabung dgn restore drill, bukan section baru, utk hindari renumber 16 section existing) — tabel RTO(mekanika restore terukur ~2dtk)/RPO(≤24jam usulan), ditandai eksplisit **PROPOSAL menunggu sign-off Ari**, bukan angka final klien.

**Temuan sampingan (diperbaiki, kecil):** root `.gitignore` tak cakup `<repo-root>/backups/` (cuma versi nested `deploy/aws-ec2-test/.gitignore`) — padahal pola crontab terdokumentasi (`cd repo-root` dulu) bikin dump mendarat di situ. Host deploy nyata yg kebetulan git-checkout bisa ke-`git add` dump terenkripsi tanpa sadar.

**Verifikasi**: seluruh shell logic di-dry-run manual dulu (matching persis command CI) sebelum di-commit; YAML restore-drill.yml divalidasi (`python3 -c yaml.safe_load`, pyyaml diinstal-sementara via apk lalu dilepas). **Push → PR #57 → `gh pr checks 57 --watch` → SEMUA check PASS**, termasuk 2x run job baru "backup -> destroy -> restore -> verify audit hash-chain" (push+PR trigger, 3m57s/3m41s) — bukti pertama restore-drill.yml jalan bersih di GitHub Actions sungguhan, bukan cuma WSL lokal.

**Status gap go-live**: #1 (restore drill) **SEKARANG TERTUTUP** (dieksekusi + diotomasi). #5 (secrets vault)/#6 (TLS) tetap seperti sesi #4 (kode ada, belum live-AWS/ACME). **Masih terbuka murni**: #2 (UU PDP), #3 (alerting — kegagalan off-box S3 di atas baru "loud di log", belum paging manusia sungguhan), plus live-verify S3 terhadap AWS asli (nol kredensial di semua sesi sejauh ini) dan RTO total termasuk provisioning instance baru (butuh EC2 nyata).

**✅ PR #57 MERGED ke master** (`e4224e6`, fast-forward dari `8c14e83`) atas permintaan eksplisit Ari, branch `feat/restore-drill-offbox-backup-rto-rpo` dihapus (remote). Repo lokal perlu `git checkout master && git pull` di sesi berikut.

## 2026-07-03 (sesi #7) — Alerting + log aggregation/retention + incident-response doc — gap #3 SEKARANG TERTUTUP (kode+CI, belum live)

User minta perbaikan 3 temuan evaluasi spesifik: (a) tak ada alerting — siapa tahu server down jam 2 pagi, `/metrics` tanpa dashboard/alert actionable; (b) tak ada log aggregation/retention di luar `docker compose logs` lokal — box hilang = log hilang; (c) tak ada rencana on-call/incident response. Survey read-only dulu (`server/src/server.ts` sudah expose `/healthz`+`/metrics` format Prometheus asli sejak W10, tapi nol scraper/alerter; kedua docker-compose tanpa `logging:` driver = json-file default tanpa rotasi; nol dok runbook/on-call di manapun). **Insight arsitektur kunci sebelum bangun**: alerting TAK BOLEH jalan DI box EC2 itu sendiri — kalau box mati, alerter yang jalan di box itu ikut mati, jadi harus eksternal (GitHub Actions, bukan Prometheus/Alertmanager lokal).

**3 keputusan Ari via AskUserQuestion** (bukan diasumsikan — konsekuensial, termasuk komitmen SLA yg berpotensi dikutip ke klien): saluran alert = **email SMTP polos** (bukan Slack/PagerDuty/GitHub-failure-email-saja); eskalasi = **Ari satu-satunya kontak teknis, TANPA sekunder** (dinyatakan jujur sbg single-point-of-failure di dok, bukan rantai eskalasi fiktif); SLA = **best-effort, jam kerja saja, tanpa jaminan 24/7**.

**Dibangun** (di branch `feat/iac-terraform-ec2-provisioning`, BELUM di-commit di akhir sesi — nunggu konfirmasi Ari):
- **Alerting**: `.github/workflows/uptime-alert.yml` — job `check` (schedule tiap 15 menit + `workflow_dispatch`, `if` di-skip kalau bukan trigger itu) probe eksternal `vars.HEALTHZ_URL`, skip bersih kalau var belum diisi (tak spam gagal di fork/dev), gagal → kirim email via `.github/scripts/send-alert-email.py` (stdlib `smtplib`/`ssl`, NOL dependensi vendor/Action pihak-ketiga — pertimbangan supply-chain sengaja utk app yg pegang data klien) + workflow exit 1 (memicu jg notifikasi kegagalan bawaan GitHub ke watcher, lapisan kedua gratis). Job kedua `test-alert-script` (push/PR/`workflow_dispatch`) menjalankan `.github/scripts/test_send_alert_email.py` (4 test, smtplib di-mock total — STARTTLS 587, SSL 465, config hilang→exit 1, exception SMTP→exit 1 bukan silent) — **dijalankan+lulus lokal sebelum commit** (`python3 .github/scripts/test_send_alert_email.py -v` → OK). Sengaja TIDAK membangun perhitungan laju-error dari `/metrics` lintas-run (butuh state persisten yg GH Actions cache tak cocok — immutable key, fragile) — dicatat eksplisit sbg gap masa depan, bukan dipalsukan.
- **Log retention**: kedua `docker-compose.yml`/`docker-compose.deploy.yml` dapat `logging: {driver: json-file, options: {max-size: 20m, max-file: 5}}` per servis (~100MB/servis, dari sebelumnya tak terbatas) — **divalidasi via `python3 -c yaml.safe_load` dan tampil di output** (Docker sendiri tak ada di Bash tool sesi ini, `docker compose config` gagal `command not found` — pola sama sesi #5). `deploy/aws-ec2-test/ship-logs.sh` baru — pola PERSIS `backup.sh`/`export-audit-log.sh`: cursor `.since` (crash-safe, run gagal tak memajukan cursor), capture `docker compose logs --since/--until` per servis (db/server/web) → tar.gz, off-box opt-in ke S3 (`LOG_S3_BUCKET` fallback `BACKUP_S3_BUCKET`, prefix `logs/` terpisah dari dump DB & ekspor audit), retensi lokal 3 hari (`LOG_LOCAL_RETENTION_DAYS`), gagal off-box = LOUD (`LOG_SHIP_OFFBOX_FAILED` + exit non-zero, arsip lokal tetap ada). CI baru `.github/workflows/log-shipping-drill.yml` (bulanan + on-change, pola sama `restore-drill.yml`: MinIO disposable, uji sukses+gagal-loud+cursor-dedup+retensi-prune) — **belum di-run di GitHub Actions sungguhan** (belum push).
- **Incident response**: `docs/INCIDENT-RESPONSE.md` baru — §0 tabel postur operasional (kontak/SLA/saluran, eksplisit keputusan Ari bukan asumsi), matriks severitas SEV1-3, runbook mitigasi (restart→rollback→restore→rotasi kunci, semua link ke `DEPLOY.md`), template komunikasi klien, tinjauan pasca-insiden. `docs/LOGGING.md` baru — kebijakan retensi lengkap + rekomendasi S3 lifecycle rule + non-goals eksplisit (nol UI pencarian/agregasi, di luar cakupan single-box firma kecil).
- **`docs/DEPLOY.md`**: §16 Alerting, §17 Log retention, §18 Incident response (pointer) ditambahkan; §11 referensi + §12.4 gap-list diperbarui ("alerting produksi masih 0%" → "ditutup 2026-07-03, kode+CI-verified, belum live-verified").
- **`.gitattributes`**: tambah `*.py text eol=lf` (proteksi sama alasan `*.sh` — CRLF pernah nyata membisukan `backup.sh` di sesi #6).

**Batas verifikasi (jujur)**: kode+CI-drill (mocked SMTP/MinIO) — BELUM live-verified terhadap deploy produksi sungguhan (butuh `HEALTHZ_URL`+secret SMTP nyata diisi di GitHub repo settings, dan crontab `ship-logs.sh` nyata terpasang di box). Pola gap yang SAMA seperti Secrets Manager/TLS ACME sesi #4 — kode solid, live-proof menunggu kredensial/lingkungan nyata yang belum tersedia sesi manapun.

**Status gerbang go-live update**: gap #3 (alerting) **SEKARANG TERTUTUP** (kode+CI, pola sama #5/#6 — bukan lagi 0%). Log retention (temuan baru dari evaluasi user, di luar 6 gap asli) turut tertutup pola sama. **Masih terbuka murni**: #2 (UU PDP) — satu-satunya yang benar-benar 0% di seluruh sesi sejauh ini.

**✅ Committed + pushed** (`62cb026`, 12 file, `feat/iac-terraform-ec2-provisioning` 508d730..62cb026) atas konfirmasi eksplisit Ari ("1. Later" utk isi secret GitHub, "2. Push" utk commit). GOTCHA kecil ditemukan+dibersihkan sebelum commit: menjalankan test Python lokal meninggalkan `.github/scripts/__pycache__/*.pyc` yang nyaris ikut ter-`git add` (ditambahkan `__pycache__/` ke root `.gitignore`). `HEALTHZ_URL`+secret `ALERT_SMTP_*`/`ALERT_EMAIL_*` di GitHub repo **sengaja belum diisi** (keputusan Ari "later") — alert workflow di-skip bersih sampai itu dikonfigurasi, bukan gagal.

## 2026-07-03 (sesi #8) — Baseline performa & validasi kapasitas (2 gap evaluasi ❌ ditutup) — PRD-first, live-verified thd Docker lokal

User minta perbaikan 2 temuan evaluasi: (1) belum ada baseline performa (page-load/`/trpc`) dgn volume data realistis (WTB ribuan baris); (2) belum divalidasi seberapa besar firma (user/perikatan aktif) yang bisa ditangani `t3.small`/`t4g.small`. Survey read-only dulu: §12.3 (sesi #3) SUDAH ramp concurrency tapi pakai seed demo kecil (27 baris) + endpoint generik (`auth.me`/`state.set`), dan skrip ramping-nya SENDIRI tak pernah di-commit (cuma ada sbg hasil di riwayat sesi). PRD baru `docs/prd-performance-baseline-capacity.md` (ikuti template PRD proyek ini persis, termasuk §11a "keputusan diambil pada implementasi") → Ari **"Proceed."** sebelum bangun.

**4 keputusan Ari via AskUserQuestion sebelum PRD ditulis**: volume uji = skenario grup/konsolidasi **~5.000+ baris** (bukan kurva bertingkat); ambang SLA = **p95 baca<1dtk, p95 tulis<2dtk**; lingkungan = **lanjutkan WSL Docker Compose cap t3.small** (bukan EC2 nyata — belum ada kredensial di sesi manapun); dimensi kapasitas = **staf konkuren DAN volume-data/jumlah-perikatan** (keduanya, bukan salah satu).

**Riset kode SEBELUM desain skrip** (Explore agent) — mengoreksi asumsi: WTB disimpan RELASIONAL (`WtbRow` table) untuk seed demo, TAPI impor TB nyata (drawer UI, `wtb_import.ts`) menyimpan hasil parse sbg SATU StateDoc JSON (`state.set` key `wtbImport`, engagement-scope) — bootstrap (`router.ts:519-533`) mem-fetch WTB+SEMUA StateDoc perikatan dlm SATU query, tanpa pagination. `figuresFromWTB`/`reconcile`/`psak65` (`canon_part*.ts`) murni fungsi `wtb`, TANPA memoisasi — bisa diukur HEADLESS di Node (tanpa browser), jauh lebih presisi dari coba men-drive view React. **Temuan tak terduga**: `materiality()` TERNYATA tidak menerima `wtb` sama sekali (config-only via `localStorage`/`window.BENCHMARKS`, O(1) thd volume) — diasumsikan PRD sbg proxy volume-sensitif, salah, dikoreksi setelah baca kode `canon_part4.ts`.

**Tooling baru (di-commit, reusable — `deploy/aws-ec2-test/loadtest/`):**
1. `gen-synthetic-wtb.ts` — generator WTB fiktif "grup/konsolidasi" (1 blok induk 11 kode pemicu WTB_MAP + 5 sub-entitas sub-ledger piutang/utang/aset-tetap/persediaan), PRNG deterministik (mulberry32, seed tetap → hasil reproducible), parameterizable via env (`WTB_SUBS`/`WTB_CUST`/dst) utk preset kedua "wajar" (240 baris). **Divalidasi lewat parser NYATA** `wtb_import.ts` (bukan reimplementasi) — `ok=true`, balanced, 6/6 engine PSAK menyala. Fixture (~1,3MB) di-gitignore (`loadtest/fixtures/`, regeneratable).
2. `bench-canon.ts` — bench headless (200 repetisi) `figuresFromWTB`/`reconcile`/`psak65` baseline(28 baris) vs besar(5.023 baris). Hasil: **komputasi kanon BUKAN bottleneck** — `psak65` (fungsi paling berat) tetap p50=0,676ms pada 5.023 baris (17× baseline tapi tetap sub-milidetik). Estimasi awal Explore-agent (~50-100ms) OVERESTIMATE jauh — dikoreksi dgn pengukuran nyata, bukan dibiarkan sbg asumsi.
3. `bench.mjs` — skrip jaringan (Node fetch bawaan, NOL dependensi baru — protokol HTTP tRPC non-batch ditulis manual, bukan `@trpc/client`), mode `login`/`seed-wtb`/`volume`/`concurrency`. Memformalkan (jadi reusable) metodologi ramp §12.3 yang sebelumnya ad hoc.
4. `docker-compose.loadtest-override.yml` — publish port 5181 (server) ke host HANYA utk sesi bench lokal (compose file produksi tetap sengaja internal-only) — dibutuhkan krn hit server LANGSUNG (bypass Caddy) spt §12.3, utk isolasi bottleneck + hindari rate-limit §14 login (5/menit/IP) mencemari ramp.

**Bug ditemukan+diperbaiki DI DALAM skrip bench itu sendiri (bukan di app)**: implementasi pertama `bench.mjs` mode `concurrency` memakai SATU kunci StateDoc dibagi SEMUA worker tulis (`loadtestProbe`) → ratusan CAS-409 palsu tersalah-hitung sbg "error" (artefak desain bench, worker menulis field yg sama scr bersamaan — bukan pola realistis "N staf tulis dokumen masing2"), PLUS `stateGet()` yang throw exception tak tertangkap bisa menjatuhkan seluruh `Promise.all` satu level pengujian. Diperbaiki: kunci per-worker + try/catch per-worker + kolom CAS-409 terpisah dari Error. Setelah fix: nol error/nol conflict semua level 5-50 sesi.

**Hasil terukur (live thd stack Docker `asseris-test-*`, cap t3.small identik §12.3, data dimuat via `state.set` NYATA ke `ENG-2025-014` (5.023 baris)/`ENG-2025-040`+`031` (240 baris masing2)):**
- Single-session bootstrap: baseline(~0 baris) 8ms p50 → 240 baris 9ms → 5.023 baris **28ms p50/36ms p95**. Delta nyata (~3,5×) tapi jauh di bawah ambang 1dtk.
- Ramp konkurensi (5/10/20/50 sesi, 4 user nyata) thd perikatan BESAR: throughput mentok **~37-39 ops/dtk** (vs 150-170 ops/dtk §12.3 pakai data kecil — ~4× lebih rendah, masuk akal krn `bootstrap` jauh lebih berat dari `auth.me`). **Ambang SLA dilanggar ANTARA 20 dan 50 sesi konkuren** menyentuh perikatan besar yang SAMA (baca p95 1.680ms✗, tulis p95 3.992ms✗ di 50; keduanya ✓ di 20). Perikatan RINGAN (`ENG-2025-063`, hanya 2 user broad-access krn RBAC — Senior/Junior BUKAN anggota, `not-engagement-member`, dikeluarkan scr eksplisit bukan disembunyikan) tak pernah melanggar ambang bahkan di 50 sesi (tulis p95=1.839ms, mepet dari batas 2.000ms).
- **Tabel kapasitas** (`docs/DEPLOY.md` §19.4): firma kecil/perikatan volume-wajar → aman ~40-50 staf konkuren firma-wide di t3.small; 1+ perikatan grup/konsolidasi ribuan-baris dikerjakan intensif → aman ~15-20 staf konkuren menyentuh perikatan BESAR yg sama, di atas itu pertimbangkan upgrade `t3.medium`/`t4g.medium` SEBELUM fieldwork puncak (bukan reaktif).

**Keterbatasan diakui eksplisit (§19.4, TIDAK disembunyikan)**: bukan EC2 nyata (approksimasi WSL, sama §12.3/§12.4); closed-loop TANPA think-time (angka = plafon saturasi worst-case, kapasitas staf-nyata kemungkinan LEBIH TINGGI); **render browser tabel WTB tak-berpaginasi TETAP TAK TERUKUR** (`view_wtb_deep.tsx` dikonfirmasi nol virtualisasi — kemungkinan kontributor terbesar "terasa lambat" pengguna, di luar scope PRD ini yg murni pengukuran bukan remediasi — dicatat sbg temuan follow-up); kombinasi volume-besar+50-perikatan-bersamaan sekaligus belum diuji (interpolasi kualitatif dua sumbu terpisah, bukan titik data langsung); 7 perikatan seed existing dipakai (bukan fabrikasi 10-15 baru — OQ#2 PRD diturunkan scope-nya, dicatat di §11a PRD).

**State lingkungan saat pause (2026-07-03, akhir sesi #8)**: stack Docker (`asseris-test-db/server/web-1`) **MASIH HIDUP** via WSL dockerd, DENGAN `docker-compose.loadtest-override.yml` ter-apply (port 5181 published ke host — biasanya internal-only) + cap t3.small (`docker update`) + data sintetis TERSISA di `ENG-2025-014`/`040`/`031` (StateDoc `wtbImport`, bisa dihapus lewat UI "Kembali ke demo" atau `state.set` value=null kalau mau bersih). Belum di-restart tanpa override. **BELUM commit/push** — 2 file baru (`docs/prd-performance-baseline-capacity.md`, `deploy/aws-ec2-test/loadtest/` [5 file, fixtures digitignore]) + 3 file diubah (`docs/DEPLOY.md` §19+referensi, `deploy/aws-ec2-test/README.md` pointer, `deploy/aws-ec2-test/.gitignore`) menunggu konfirmasi Ari.

**Status gerbang go-live update**: 2 gap evaluasi baru (baseline performa + validasi kapasitas) **SEKARANG TERTUTUP** (kode+live-verified thd Docker lokal — pola sama §12.3: approksimasi WSL, bukan EC2 sungguhan, dinyatakan jujur). Gap #2 (UU PDP) **tetap satu-satunya yang benar-benar 0%** di seluruh sesi sejauh ini. Gap render-browser-tak-berpaginasi adalah temuan BARU (bukan salah satu dari 6 gap asli), dicatat sbg follow-up terpisah.

## 2026-07-03 (sesi #9, sama hari) — Dokumentasi end-user + rencana onboarding pilot (2 gap evaluasi ❌ ditutup) — murni dokumentasi, temuan produk baru ditemukan

User minta perbaikan 2 temuan evaluasi: (1) belum ada dokumentasi user-facing (Partner/Manager/
Staff) — `docs/DEPLOY.md` untuk operator, bukan end-user; (2) belum ada training/onboarding plan
untuk firma pilot pertama. Beda karakter dari sesi #1-#8 (bukan infra/kode) — konten dokumentasi.

**Riset ground-truth dulu** (Explore agent, `migration/src/rbac.ts` + `icons.tsx` + gate files):
RBAC sebenarnya **6 peran** (bukan cuma "Partner/Manager/Staff"): Engagement Partner, Audit
Manager, Senior Auditor, Junior Auditor, Admin & HR Firma, Finance Firma — 2 terakhir peran
firm-ops non-auditor (2026-07-01), tak pernah anggota perikatan. `MODULES`/`icons.tsx` = registry
LENGKAP ~140 modul di 24 grup (2 workspace: Perikatan/Firma) — dipakai persis, bukan didaftar
ulang dari ingatan. `ROLE_SIDEBAR_GROUPS` (icons.tsx:331-343) memberi pemetaan **peran→grup
default-visible** yang otoritatif — dipakai utk menentukan "peran utama" tiap grup di katalog
modul TANPA menebak.

**4 keputusan Ari via AskUserQuestion**: cakupan = **SEMUA 6 peran RBAC** (bukan cuma 4 peran
audit inti); kedalaman = **manual lengkap seluruh modul** (bukan cuma alur-kerja inti — pilihan
lebih besar dari yang direkomendasikan, dihormati); konteks pilot = **template generik** (belum
ada firma pilot bernama, konsisten pola RTO/RPO §7 DEPLOY.md); format = **2 dokumen markdown
terpisah** di `docs/` (`USER-GUIDE.md` utk end-user + `PILOT-ONBOARDING-PLAN.md` utk
rencana training Ari).

**Temuan produk BARU (bukan dokumentasi murni — bug/gap arsitektur nyata ditemukan lewat
pembacaan kode)**: **tidak ada jalur menambah staf setelah bootstrap pertama.**
`server/src/bootstrapFirm.ts` cuma bisa dipanggil SEKALI (bikin 1 Firm+1 Partner-admin, menolak
kalau firma sudah ada — sengaja fail-safe). `server/src/seed.ts` destruktif (hapus 11 tabel),
tak bisa dipakai pasca ada data klien nyata. Grep `router.ts` utk `user.create`/invite/add-user —
NIHIL. Konsekuensi: firma pilot dgn >1 staf **tak punya cara resmi** menambah 5+ akun staf selain
insert manual DB (rawan salah hash password, tak scalable). Dicatat eksplisit di
`PILOT-ONBOARDING-PLAN.md` §1 sbg **prasyarat teknis wajib diselesaikan sebelum Fase 0** (2 opsi:
skrip CLI `addUser.ts` pola sama `bootstrapFirm.ts` [direkomendasikan] vs insert manual Prisma
Studio [rawan]) — **BUKAN dibangun sesi ini** (di luar scope "tulis dokumentasi"), di-spawn
sbg task terpisah `task_b7e55f6e` ("Add CLI script to provision additional staff users") supaya
tak hilang begitu sesi ini selesai.

**Dibangun (2 dokumen baru, ~700+ baris gabungan):**
1. **`docs/USER-GUIDE.md`** — Tentang aplikasi §1, tabel 6 peran×kapabilitas §2 (dari `rbac.ts`
   `GRANTS`/`CAP` persis, bukan parafrase kasar), login/TOTP/navigasi §3, siklus hidup 4 fase +
   kriteria gerbang persis dari `engagement_phase_gate.ts`/`engagement_entry_gate.ts` §4, panduan
   day-in-the-life per 6 peran §5, **katalog modul lengkap semua ~140 modul per grup** (fungsi
   singkat + standar SA/PSAK terkait dari `RELATED_SA` di mana tersedia + peran utama per grup
   dari `ROLE_SIDEBAR_GROUPS`) §6, FAQ/troubleshooting §7 (termasuk mengarahkan ke gap add-user
   di atas + status UU PDP jujur — bukan menjanjikan kepatuhan penuh ke end-user).
2. **`docs/PILOT-ONBOARDING-PLAN.md`** — template fillable (§0 tabel data firma pilot kosong),
   §1 prasyarat teknis (gap add-user di atas, opsi A/B), Fase 0-5 (persiapan→kickoff→training
   per kelompok peran [Oversight/Eksekusi Lapangan/HR/Finance, durasi+materi acuan ke
   USER-GUIDE §5]→parallel-run 1 perikatan nyata risiko-rendah→keputusan go-live→dukungan
   pasca), kriteria sukses pilot didefinisikan SEBELUM mulai, risiko&mitigasi (termasuk jujur:
   migrasi data Excel lama di LUAR cakupan — cuma perikatan baru pakai Asseris, bukan proyek
   migrasi retroaktif).

**Cross-link**: `docs/DEPLOY.md` header + §11 referensi kini menunjuk balik ke kedua dokumen
baru (arah dua-arah: DEPLOY.md↔USER-GUIDE.md saling menyatakan "ini BUKAN dokumen itu, cari di
sana").

**Verifikasi**: murni dokumentasi (nol kode diubah), tak ada gate lint/test/build yang relevan —
akurasi diverifikasi lewat pembacaan kode LANGSUNG (rbac.ts/icons.tsx/gate files/router.ts),
bukan ingatan/asumsi, sesuai pola kerja "grep dulu sebelum percaya" yang berulang kali disebut
di memory lain (`asseris-gap-matrix-eval`, dst.).

**BELUM commit/push** — 2 file baru (`docs/USER-GUIDE.md`, `docs/PILOT-ONBOARDING-PLAN.md`) + 1
file diubah (`docs/DEPLOY.md` header+§11) menambah ke tumpukan uncommitted sesi #8 yang juga
belum di-push. Total sekarang menunggu konfirmasi Ari: 4 file baru + 4 file diubah, gabungan
sesi #8+#9 hari yang sama.

**Status gerbang go-live update**: 2 gap evaluasi baru (dokumentasi user-facing + rencana
onboarding) **SEKARANG TERTUTUP**. Gap #2 (UU PDP) tetap satu-satunya dari 6 gap ASLI yang masih
0%. Temuan baru (bukan salah satu 6 gap asli): **tak ada jalur tambah-staf pasca bootstrap**
(task terpisah `task_b7e55f6e`, belum dieksekusi) + render-browser-tak-berpaginasi (sesi #8,
belum dieksekusi) — dua "temuan sampingan" yang terus terkumpul dari sesi-sesi evaluasi
berturut-turut, perlu direncanakan kapan ditindaklanjuti (bukan dibiarkan menumpuk tanpa batas).

## 2026-07-03 (sesi #10, sama hari) — `task_b7e55f6e` DIEKSEKUSI: CLI `add-user` — PRD-first, live-verified thd Docker lokal SUNGGUHAN

User (via task terpisah yang di-spawn sesi #9) minta gap "tak ada jalur tambah-staf pasca
bootstrap" diperbaiki, **eksplisit instruksi: PRD dulu, jangan langsung kode** (mengikuti pola
`docs/prd-iac-ec2-provisioning.md`/`docs/prd-performance-baseline-capacity.md`). PRD baru
`docs/prd-add-staff-user-cli.md` ditulis dulu → Ari **"Proceed."** sebelum bangun.

**Deviasi disengaja dari deskripsi awal task** (dicatat eksplisit di PRD §6 Constraints, bukan
diam-diam diubah): task awal mengusulkan sintaks CLI `npm run add-user -- --email=...` (argv
flags), TAPI `bootstrap.ts` — pola yang SEHARUSNYA ditiru persis — pakai env var
(`FIRM_NAME=... npm run bootstrap`). PRD mengikuti konvensi env var yang sudah established di
repo, BUKAN usulan argv dari deskripsi task.

**Dibangun** (branch SAMA `feat/iac-terraform-ec2-provisioning`, menumpuk di atas
uncommitted sesi #8/#9 — BELUM di-commit):
- **`server/src/addUser.ts`** (pure, pola PERSIS `bootstrapFirm.ts` tapi guard KEBALIKAN: firma
  HARUS sudah ada, bukan harus kosong) — reuse `hashPassword`/`generateSecret`+`otpauthUrl`/
  `encryptSecret` (NOL implementasi kripto baru), validasi `role` thd `ROLES` (`./rbac` — wrapper
  bertipe `server/src/rbac.ts` yang re-export `migration/src/rbac.ts`, SSOT yang sama dipakai
  `router.ts`), tangani email duplikat via `isUniqueViolation` P2002 (salinan lokal 4-baris, BUKAN
  di-export dari `router.ts` — sengaja, `addUser.ts` dijaga tanpa kopling ke file besar itu, pola
  sama `bootstrapFirm.ts` yang juga berdiri sendiri). **Tambahan yang tak diminta eksplisit tapi
  dianggap perlu** (dicatat sbg Scope, bukan diam-diam): 4 peran audit (Partner/Manager/
  Senior/Junior) otomatis dapat baris `TeamMember` (roster Capacity Planning) — Admin&HR/Finance
  SENGAJA TIDAK, mirror keputusan desain `rbac.ts` yang sudah ada.
- **`server/src/addUserCli.ts`** — wrapper CLI env var (pola persis `bootstrap.ts`), termasuk
  `assertProdConfig` SEBELUM tulis DB — **sengaja ditekankan** krn kelas bug ini PERNAH nyata
  terjadi di `bootstrap.ts` sendiri (ditemukan peer-review pra-push PR#43: CLI provisioning bisa
  bypass gerbang M2) — tak boleh terulang di skrip baru ini.
- **`server/package.json`**: `"add-user": "tsx src/addUserCli.ts"`.
- **`docs/PILOT-ONBOARDING-PLAN.md` §1.1**: diubah dari "gap ditemukan, 2 opsi diusulkan" →
  instruksi pakai nyata (`npm run add-user` + contoh env var lengkap); referensi "opsi A" yang
  jadi stale di §2/§9 (tabel Fase 0 + Risiko) turut diperbarui.

**Verifikasi — LEBIH DALAM dari pola PRD sebelumnya (bukan cuma unit test)**:
1. Unit test baru `server/src/__tests__/addUser.test.ts` (9 test, pola sama `bootstrap.test.ts`)
   — **9/9 lulus** tanpa iterasi (benar sejak percobaan pertama).
2. Gate penuh server: `npm run typecheck` (0 error) + `npm test` — **238/238 lulus** (229+9),
   nol regresi terhadap seluruh suite yang ada.
3. **Live-verify thd Docker SUNGGUHAN** (bukan mock, bukan SQLite dev) — image `server`
   di-rebuild (`docker compose ... build server`, memuat kode baru), container di-recreate, cap
   t3.small diterapkan ulang (stack `asseris-test-*` yang sama, masih hidup dari sesi #9).
   Dijalankan `npm run add-user` via `docker compose run --rm -e ...` untuk **6 peran** thd
   firma demo Postgres nyata (`FIRM-WHR`, `NODE_ENV=production`, `assertProdConfig` AKTIF, BUKAN
   dilewati) — **6/6 user berhasil dibuat, 6/6 login berhasil** (diverifikasi pakai `bench.mjs
   login` dari sesi performa sebelumnya — reuse alat, bukan bikin baru). Query SQL langsung ke
   Postgres mengonfirmasi `TeamMember` PERSIS untuk 4 peran audit, NOL untuk Admin&HR/Finance.
4. **Dibersihkan setelah verifikasi** — Session/AuthEvent/TeamMember/User milik 6 akun uji
   dihapus (urutan FK: Session→AuthEvent→TeamMember→User), `User` count kembali ke 7 (baseline
   seed demo) — stack tak tercemar utk sesi berikutnya.

**Gap `task_b7e55f6e` SEKARANG TERTUTUP** — firma pilot bisa menambah staf pasca-bootstrap lewat
`npm run add-user`, bukan lagi insert manual DB. `docs/PILOT-ONBOARDING-PLAN.md` §1.1 tak lagi
menyebut "gap kritis belum ada solusi" — sudah jadi instruksi pakai nyata.

**BELUM commit/push** — 3 file baru (`docs/prd-add-staff-user-cli.md`, `server/src/addUser.ts`,
`server/src/addUserCli.ts`, `server/src/__tests__/addUser.test.ts` — 4 sebenarnya) + 2 file
diubah (`server/package.json`, `docs/PILOT-ONBOARDING-PLAN.md`) menambah ke tumpukan uncommitted
sesi #8+#9+#10 yang juga belum di-push. Total sekarang: 8 file baru + 6 file diubah, menunggu
konfirmasi Ari kapan commit.
