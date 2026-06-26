# Deploy Test — AWS EC2 + docker-compose (satu kotak)

Tujuan: menjalankan **seluruh app** (Postgres + API tRPC + SPA terbangun + TLS) di **satu instance EC2**
untuk pengujian/demo. Bukan setup produksi — lihat caveat di bawah.

Arsitektur: satu origin lewat **Caddy** (TLS otomatis) → `/trpc/*`,`/healthz` ke kontainer `server`,
sisanya SPA statis. Browser melihat satu origin → cookie httpOnly auth jalan tanpa CORS.

```
Internet ──443──► Caddy (web) ──► /trpc/* ─► server:5181 ─► db (Postgres)
                       └────────► /*       ─► SPA statis (/srv)
```

---

## 0. Prasyarat
- Akun AWS + EC2 key pair (untuk SSH).
- Akses ke repo PRIVATE `ari1945/Asseris` dari dalam EC2 (deploy key SSH **atau** GitHub PAT **atau** `gh auth login`).
- Region disarankan **`ap-southeast-3` (Jakarta)** untuk latensi; `ap-southeast-1` (Singapura) alternatif.

## 1. Luncurkan EC2
- **AMI:** Ubuntu 22.04 atau Amazon Linux 2023.
- **Tipe:** `t3.small` (x86) atau `t4g.small` (ARM — lebih murah; image `node:22`/`postgres`/`caddy` semua multi-arch, aman).
- **Disk:** 20 GB gp3 cukup.
- **Security Group (inbound):**
  - TCP **22** dari **IP Anda saja**.
  - TCP **80** dan **443** dari **0.0.0.0/0** (80 dibutuhkan untuk tantangan ACME Let's Encrypt).
- (Disarankan) **Elastic IP** — agar IP publik tak berubah saat instance di-stop/start (PUBLIC_HOST terikat ke IP).

## 2. Pasang Docker + git (SSH ke instance)
```bash
# Ubuntu
sudo apt-get update && sudo apt-get install -y docker.io docker-compose-v2 git
sudo usermod -aG docker $USER && newgrp docker     # agar tak perlu sudo
# (Amazon Linux 2023: sudo dnf install -y docker git; sudo systemctl enable --now docker;
#  plugin compose: mkdir -p ~/.docker/cli-plugins && curl -SL \
#  https://github.com/docker/compose/releases/latest/download/docker-compose-linux-$(uname -m) \
#  -o ~/.docker/cli-plugins/docker-compose && chmod +x ~/.docker/cli-plugins/docker-compose)
```

## 3. Ambil repo
```bash
git clone https://github.com/ari1945/Asseris.git    # atau git@github.com: dgn deploy key
cd Asseris
git checkout master        # atau branch yang ingin diuji
```

## 4. Siapkan environment
```bash
cp deploy/aws-ec2-test/.env.example deploy/aws-ec2-test/.env
# Generate kunci enkripsi (WAJIB):
echo "APP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> deploy/aws-ec2-test/.env
# Edit sisanya:
nano deploy/aws-ec2-test/.env
#   POSTGRES_PASSWORD = sandi kuat
#   PUBLIC_HOST       = <IP-publik-pakai-dash>.sslip.io   (mis. 13-54-2-9.sslip.io)
#   (hapus baris APP_ENCRYPTION_KEY duplikat bila perlu — sisakan satu)
```
> Belum punya domain? `sslip.io` memetakan `13-54-2-9.sslip.io` → `13.54.2.9` otomatis, jadi Caddy
> bisa terbitkan sertifikat Let's Encrypt nyata tanpa beli domain.

## 5. Build & jalankan
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  --env-file deploy/aws-ec2-test/.env up -d --build
```
Tunggu image ter-build (build pertama beberapa menit) + Caddy ambil sertifikat (~30 dtk).

## 6. Seed data demo (sekali, DESTRUKTIF)
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml \
  --env-file deploy/aws-ec2-test/.env run --rm server npm run seed
```
Mengisi klien/perikatan/pengguna demo + kredensial login.

## 7. Verifikasi
```bash
curl https://$PUBLIC_HOST/healthz        # -> {"status":"ok","db":"up",...}
```
Buka `https://<PUBLIC_HOST>/` di browser. Login (kredensial seed dev):
- Manager `anindya.p@whr-cpa.id` / `Manager#2025!`  ← pakai ini untuk uji RBAC sebenarnya
- Partner `hartono.w@whr-cpa.id` / `Partner#2025!`

> **Verifikasi relokasi kita:** masuk → workspace **Perikatan** → sidebar grup *Engagement Workspace*
> harus memuat **"Jadwal & Lini Masa Audit"** (sebelumnya di workspace Firma).

## 8. Log / troubleshoot
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml logs -f web      # Caddy/TLS
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml logs -f server   # API
```

## 9. Bongkar (hapus semua + data)
```bash
docker compose -f deploy/aws-ec2-test/docker-compose.deploy.yml down -v
```
Lalu **Terminate** instance EC2 (dan lepas Elastic IP) agar tak ditagih.

---

## ⚠️ Caveat (KERAS — ini test, bukan produksi)
- **Data demo saja.** Jangan masukkan data klien nyata: satu kotak, tanpa backup, `down -v` menghapus DB.
- **`.env` memegang secret.** `APP_ENCRYPTION_KEY` mengenkripsi TOTP-at-rest — kalau hilang, akun TOTP tak terbaca. Jangan commit `.env`.
- **`ADMIN_IP_ALLOWLIST` dikosongkan** sengaja: di balik Caddy, server melihat IP proxy via `X-Forwarded-For`, bukan socket — mengisinya bisa mengunci Anda. Penanganan XFF yang benar = pekerjaan produksi.
- **Let's Encrypt gagal?** (rate-limit/sslip.io) → pakai blok `tls internal` di `Caddyfile` (self-signed: peringatan browser, tapi tetap HTTPS sehingga cookie Secure jalan), rebuild `web`.
- **IP berubah** saat stop/start tanpa Elastic IP → `PUBLIC_HOST` jadi salah, sertifikat & cookie domain ikut rusak. Pakai Elastic IP.
- **Biaya:** t4g.small + 20GB gp3 ≈ beberapa USD/minggu bila dibiarkan hidup. Stop/terminate setelah uji.

## Naik kelas ke produksi
Bila test ini meyakinkan, target produksi-AWS = **App Runner (dari ECR) + RDS PostgreSQL + S3/CloudFront**
(CloudFront path-behavior `/trpc/*`→backend menggantikan peran Caddy di sini). Lihat catatan arsitektur
di ringkasan chat. Koordinasikan dokumentasi deploy dengan **Hermes Agent** (pemilik dok deploy).
