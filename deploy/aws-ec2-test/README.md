# Deploy Test — AWS EC2 + docker-compose (satu kotak)

Tujuan: menjalankan **seluruh app** (Postgres + API tRPC + SPA terbangun + TLS) di **satu instance EC2**
untuk pengujian/demo. Bukan setup produksi — lihat caveat di bawah.

Arsitektur: satu origin lewat **Caddy** (TLS otomatis) → `/trpc/*`,`/healthz` ke kontainer `server`,
sisanya SPA statis. Browser melihat satu origin → cookie httpOnly auth jalan tanpa CORS.

```
Internet ──443──► Caddy (web) ──► /trpc/* ─► server:5181 ─► db (Postgres)
                       └────────► /*       ─► SPA statis (/srv)
```

> **TLS (default sejak 2026-07-01):** `Caddyfile` default **self-signed (`tls internal`,
> `CADDY_TLS_MODE=internal`)** sesuai keputusan Deploy-Readiness PRD (pilot tertutup) — HTTPS
> langsung jalan tanpa domain/DNS/port-80, browser menampilkan peringatan sertifikat sekali.
> **Punya domain publik?** Set `CADDY_TLS_MODE=acme` di `.env` (bukan lagi edit `Caddyfile` manual
> sejak 2026-07-02 — lihat `docs/DEPLOY.md` §13) untuk sertifikat Let's Encrypt tepercaya; butuh DNS
> A-record + port 80/443 terbuka. Langkah 5/7 di bawah menyebut alur ACME; dengan default
> self-signed sertifikat terbit instan.

---

## 0. Prasyarat
- Akun AWS + EC2 key pair (untuk SSH) — buat dulu di Console/CLI kalau belum ada (Terraform di
  bawah **tidak** membuat key pair baru; private key tak boleh lewat state file).
- Akses ke repo PRIVATE `ari1945/Asseris` dari dalam EC2 (deploy key SSH **atau** GitHub PAT **atau** `gh auth login`).
- Region disarankan **`ap-southeast-3` (Jakarta)** untuk latensi; `ap-southeast-1` (Singapura) alternatif.
- `terraform` (>= 1.5) terpasang di mesin operator (laptop Anda, bukan di EC2).

## 1-2. Provisioning EC2 + Security Group + bootstrap Docker (Terraform)
Model bisnis Asseris adalah **satu instance per firma klien** (`docs/DEPLOY.md`), jadi langkah ini
akan diulang untuk tiap firma baru — dipindah dari klik-manual AWS Console ke `deploy/aws-ec2-test/terraform/`
agar setiap firma diprovisioning identik & bisa di-review (`terraform plan`) sebelum dieksekusi.

```bash
cd deploy/aws-ec2-test/terraform
cp terraform.tfvars.example terraform.tfvars
nano terraform.tfvars     # isi firm_name, key_name, allowed_ssh_cidr (WAJIB IP Anda, bukan 0.0.0.0/0)

terraform init
terraform plan            # review dulu — pastikan resource sesuai ekspektasi sebelum apply
terraform apply
```

Yang dibuat (persis setara langkah manual lama, lihat [`terraform/main.tf`](terraform/main.tf)):
- **EC2 instance** — AMI Ubuntu 22.04 terbaru (data source, bukan ID hardcode), `t3.small` default
  (`instance_type` bisa diganti `t4g.small`/ARM — lebih murah, semua image multi-arch, aman), disk
  20 GB gp3.
- **Security Group** — TCP 22 dari `allowed_ssh_cidr` **saja**, TCP 80+443 dari `0.0.0.0/0` (80
  dibutuhkan untuk tantangan ACME Let's Encrypt).
- **Elastic IP** (default `use_elastic_ip = true`) — agar IP publik tak berubah saat instance
  di-stop/start (`PUBLIC_HOST` terikat ke IP).
- **Bootstrap Docker + docker-compose-v2 + git** otomatis lewat `user_data` saat boot pertama
  (setara langkah SSH manual lama) — verifikasi setelah instance `running`:
  ```bash
  ssh ubuntu@$(terraform output -raw public_ip) 'docker --version && cat /var/log/user-data.log | tail -5'
  ```
  Kalau bootstrap belum selesai (baru boot beberapa detik), tunggu ~1 menit dan ulangi.

> **State Terraform (`terraform.tfstate`) = aset kelas-1**, sama seperti kunci enkripsi di
> `docs/DEPLOY.md` §1 — kalau hilang, Terraform "lupa" resource yang sudah dibuat. File ini
> tersimpan **lokal** (gitignored) untuk versi saat ini; simpan salinannya di tempat aman (password
> manager/secrets store), atau catat sebagai keterbatasan kalau operator berganti mesin. Remote
> state backend (S3+DynamoDB lock) adalah perbaikan lanjutan, belum dibangun di sini.

Selesai provisioning → lanjut ke langkah 3 di bawah (SSH masuk pakai `terraform output -raw ssh_command`).

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
  --env-file deploy/aws-ec2-test/.env run --rm -e ALLOW_DEMO_SEED=1 server npm run seed
```
Mengisi klien/perikatan/pengguna demo + kredensial login. `ALLOW_DEMO_SEED=1` wajib di sini karena
`NODE_ENV=production` di compose ini (M5 fail-closed guard menolak seed destruktif di produksi
tanpa override eksplisit) — instance test ini memang demo, bukan data klien nyata (lihat caveat §7).
Untuk provisioning firma **nyata** (non-demo), pakai `npm run bootstrap` (lihat `docs/DEPLOY.md` §4), BUKAN seed ini.

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
Lalu bongkar infra EC2 + Security Group + Elastic IP (dibuat di langkah 1-2):
```bash
cd deploy/aws-ec2-test/terraform
terraform destroy
```

---

## ⚠️ Caveat (KERAS — ini test, bukan produksi)
- **Data demo saja.** Jangan masukkan data klien nyata: satu kotak, tanpa backup, `down -v` menghapus DB.
- **`.env` memegang secret.** `APP_ENCRYPTION_KEY` mengenkripsi TOTP-at-rest — kalau hilang, akun TOTP tak terbaca. Jangan commit `.env`.
- **`ADMIN_IP_ALLOWLIST` dikosongkan** sengaja: di balik Caddy, server melihat IP proxy via `X-Forwarded-For`, bukan socket — mengisinya bisa mengunci Anda. Penanganan XFF yang benar = pekerjaan produksi.
- **Let's Encrypt gagal?** (rate-limit/sslip.io) → pakai blok `tls internal` di `Caddyfile` (self-signed: peringatan browser, tapi tetap HTTPS sehingga cookie Secure jalan), rebuild `web`.
- **IP berubah** saat stop/start tanpa Elastic IP → `PUBLIC_HOST` jadi salah, sertifikat & cookie domain ikut rusak. Pakai Elastic IP.
- **Biaya:** t4g.small + 20GB gp3 ≈ beberapa USD/minggu bila dibiarkan hidup. Stop/terminate setelah uji.

## Baseline performa & kapasitas
Sebelum onboarding firma dgn volume data besar (grup/konsolidasi ribuan baris WTB) atau tim
fieldwork besar, lihat **`loadtest/README.md`** — skrip reusable (generator WTB sintetis + bench
headless kanon + bench jaringan/konkurensi) yang menghasilkan tabel kapasitas
`docs/DEPLOY.md` §19 ("firma sebesar apa yang aman di t3.small sebelum perlu upgrade").

## Naik kelas ke produksi
Bila test ini meyakinkan, target produksi-AWS = **App Runner (dari ECR) + RDS PostgreSQL + S3/CloudFront**
(CloudFront path-behavior `/trpc/*`→backend menggantikan peran Caddy di sini). Lihat catatan arsitektur
di ringkasan chat. Koordinasikan dokumentasi deploy dengan **Hermes Agent** (pemilik dok deploy).
