# PRD — IaC (Terraform) untuk Provisioning EC2 Single-Box per Firma

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum ada sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-02 |
| Pemilik | Ari Widodo |
| Status | Implemented — code-complete, `fmt`/`init`/`validate`/`plan`(validasi variabel) teruji nyata; `terraform apply` thd AWS asli belum (tak ada kredensial) |
| Engagement ID terkait | — (infra deploy single-tenant, bukan engagement klien) |
| Keputusan terkunci (AskUserQuestion) | Tool = **Terraform**. Cakupan = **pilot EC2 single-box saja** (bukan jalur produksi App Runner+RDS+CloudFront). |

## 1. Problem
Model bisnis yang sudah **LOCKED** (PRD Deploy-Readiness Single-Tenant §11, dikonfirmasi ulang
sesi ini) adalah **satu instance EC2 per firma klien** (`docs/DEPLOY.md:3` — "Satu instance per
firma, bukan multi-tenant"). Artinya provisioning infra ini **akan diulang setiap kali ada firma
klien baru**, bukan sekali jalan.

Saat ini provisioning itu 100% manual (`deploy/aws-ec2-test/README.md` §1–§2):
- Klik-klik AWS Console untuk buat EC2 (pilih AMI, instance type, disk, security group rules) —
  tak ada catatan konfigurasi yang dipakai selain deskripsi prosa di README.
- SSH manual untuk install Docker/git dengan command berbeda tergantung distro AMI yang dipilih.
- Tak ada cara mengetahui, setelah beberapa bulan, apakah security group instance firma-X masih
  sama persis dengan yang seharusnya (config drift) — atau apakah firma-Y di-provision dengan
  aturan port yang berbeda karena operator lupa satu langkah.

Konsekuensi konkret: makin banyak firma klien = makin banyak kesempatan salah klik (mis. lupa
membatasi port 22 ke IP sendiri → SSH terbuka ke `0.0.0.0/0`, atau lupa Elastic IP → `PUBLIC_HOST`
basi saat instance restart, sudah pernah dicatat sebagai caveat manual di README §7).

## 2. Objective
Provisioning EC2+security group (+ Elastic IP) untuk satu firma baru menjadi **satu perintah,
dapat di-review sebelum dieksekusi, dan diulang identik** — bukan lagi rangkaian keputusan manual
per operator per firma.

## 3. Success Criteria
1. `terraform plan` menunjukkan **persis** resource yang selama ini dibuat manual di README §1
   (EC2 instance, security group dengan 3 rule yang sama: 22/IP-operator, 80/0.0.0.0/0,
   443/0.0.0.0/0, disk 20GB gp3, opsional Elastic IP) — tak ada resource tersembunyi/ekstra.
2. Variabel per-firma (nama/tag, CIDR SSH yang diizinkan, region, apakah pakai Elastic IP) di satu
   file `.tfvars`, bukan diedit di kode Terraform itu sendiri — provisioning firma baru = copy
   `.tfvars`, isi nilai, `terraform apply`.
3. Bootstrap Docker+git (README §2) berjalan otomatis via `user_data` (cloud-init) saat instance
   pertama kali boot — operator tak lagi SSH manual untuk `apt-get install docker`.
4. `terraform destroy` membongkar bersih (mirror README §9) — tak menyisakan resource tak
   ter-track yang tetap kena tagih.
5. README diperbarui: §1–§2 lama (manual) diganti pointer ke langkah Terraform; §3 dan seterusnya
   (env config, `docker compose up`, seed, verifikasi) **tidak berubah** — d luar scope ini.

## 4. Scope
- Direktori baru `deploy/aws-ec2-test/terraform/`:
  - `main.tf` — `aws_security_group` (3 rule sesuai README §1) + `aws_instance` (AMI Ubuntu 22.04
    lewat data source `aws_ami` filter resmi Canonical, bukan ID AMI hardcode yang basi per region)
    + `user_data` (script bootstrap Docker/docker-compose-v2/git, setara README §2) + `aws_eip`
    (opsional via `var.use_elastic_ip`, default true karena README merekomendasikannya).
  - `variables.tf` — `firm_name` (dipakai sbg tag `Name`), `aws_region` (default
    `ap-southeast-3` sesuai README), `instance_type` (default `t3.small`), `allowed_ssh_cidr`
    (WAJIB diisi, tak ada default `0.0.0.0/0` — mencegah lupa-batasi jadi kesalahan defaultnya
    sendiri malah), `use_elastic_ip`.
  - `outputs.tf` — `public_ip` (dari EIP kalau dipakai, else instance) untuk langsung dipakai
    sebagai `PUBLIC_HOST` di `.env` (§4 README existing, kompatibel dgn pola `sslip.io`).
  - `terraform.tfvars.example` — mirror pola `.env.example` yang sudah ada (nilai kosong/placeholder
    + komentar, tak pernah commit `.tfvars` asli berisi CIDR/nama firma sungguhan kalau dianggap
    sensitif — walau CIDR SSH kemungkinan tak rahasia, tetap konsisten dgn `.gitignore` pola app).
  - `README.md` (subfolder) atau bagian baru di `deploy/aws-ec2-test/README.md` — cara pakai:
    `terraform init && terraform plan -var-file=...tfvars && terraform apply`.
- Update `deploy/aws-ec2-test/README.md` §1–§2: ganti instruksi klik-manual dengan pointer ke
  `terraform/`, **tetap jelaskan apa yang terjadi** (bukan cuma "jalankan ini") supaya operator
  paham resource yang dibuat — sejalan dgn gaya dokumentasi existing yang selalu menjelaskan
  *kenapa*, bukan cuma *apa*.
- `.gitignore` root/`terraform/`: `*.tfstate`, `*.tfstate.backup`, `.terraform/`,
  `terraform.tfvars` (state & nilai nyata tak pernah masuk git — beda dari kode `.tf` yang memang
  harus di-commit).

## 5. Non-Scope
- **Remote state backend (S3+DynamoDB lock)** — butuh bucket S3 pra-eksis (chicken-and-egg kalau
  bucket itu sendiri mau di-Terraform-kan) dan kredensial AWS nyata untuk divalidasi hidup-hidup.
  State **lokal** untuk versi ini, didokumentasikan eksplisit sebagai keterbatasan (lihat Risks).
- **VPC/subnet custom** — pakai VPC default region (sama seperti alur manual README saat ini yang
  tak pernah menyinggung VPC kustom). Tak memperluas blast radius jaringan dari yang sudah berjalan.
- **Jalur produksi App Runner+RDS+S3/CloudFront** — sudah diputuskan eksplisit (AskUserQuestion)
  di luar scope sesi ini; itu perubahan arsitektur, bukan sekadar provisioning EC2+SG. Kandidat PRD
  terpisah kalau/ketika Ari memutuskan naik kelas dari pilot.
- **CI yang menjalankan `terraform apply` sungguhan** — akan menyentuh akun AWS nyata dari pipeline
  otomatis, di luar apa yang bisa saya putuskan sepihak (butuh kredensial AWS + persetujuan
  eksplisit soal siapa/apa yang boleh mengubah infra tanpa review manusia). `terraform validate`
  read-only (tanpa kredensial) bisa masuk scope kalau Ari mau (lihat Open Questions #3).
- **Migrasi instance existing yang sudah pernah di-provision manual (kalau ada)** ke bawah kendali
  Terraform (`terraform import`) — tak ada instance produksi berjalan saat ini setahu saya; kalau
  keliru, ini jadi item terpisah, bukan dianggap otomatis dalam scope ini.

## 6. Constraints
- **Tak ada kredensial AWS maupun binary `terraform`/`aws` CLI di environment kerja ini** (dicek
  eksplisit sesi ini: `terraform -version` dan `aws --version` keduanya "command not found") —
  konsisten dengan gap yang sama dicatat berulang di sesi-sesi deploy sebelumnya (Secrets Manager,
  TLS ACME, off-box S3). **Konsekuensi:** `terraform plan`/`apply` sungguhan **tidak bisa
  dijalankan atau dibuktikan hidup-hidup dari sesi ini** — verifikasi terbatas pada review manual
  sintaks + kesesuaian logis terhadap README manual yang sudah ada (lihat §9 Implementation Plan).
  Operator wajib `terraform validate` + `terraform plan` sebelum `apply` pertama di dunia nyata.
- Resource yang didefinisikan harus **identik** dengan apa yang README manual instruksikan
  sekarang (AMI, instance type, disk, 3 SG rule) — ini bukan kesempatan mendesain ulang
  arsitektur pilot, cuma memindahkan langkah manual ke kode.

## 7. Existing Solutions
- `deploy/aws-ec2-test/README.md` §1–§2 — sumber kebenaran untuk resource apa saja yang harus
  direplikasi di Terraform (AMI Ubuntu 22.04/AL2023, `t3.small`/`t4g.small`, 20GB gp3, SG 22/80/443,
  Elastic IP disarankan). PRD ini **memindahkan**, bukan mengganti, keputusan arsitektur yang
  sudah ada di sana.
- Pola opt-in/parameterized yang sudah established di repo (`secrets.ts` `SECRETS_PROVIDER`,
  `CADDY_TLS_MODE`, `.env.example`) — `terraform.tfvars.example` mengikuti pola yang sama: nilai
  kosong + komentar penjelas, bukan format baru yang harus dipelajari ulang.

## 8. Risks
- **State lokal (`terraform.tfstate`) di laptop/mesin operator** — kalau hilang, Terraform
  "lupa" resource yang sudah dibuat (risiko: apply berikutnya bisa mencoba re-create/duplicate,
  atau resource jadi orphan tak tersinkron). Mitigasi realistis untuk versi ini: dokumentasikan
  eksplisit "backup file state ini seperti backup kunci lain" (pola sama seperti pesan
  `APP_SIGNING_KEY`/`BACKUP_ENCRYPTION_KEY` di `docs/DEPLOY.md` §1) — remote backend adalah
  perbaikan lanjutan, bukan diselesaikan diam-diam di sini (lihat Non-Scope).
- **User-data bootstrap gagal senyap** (mis. mirror APT berubah, network saat boot belum siap) —
  mitigasi: `user_data` script pakai `set -e` + log ke `/var/log/user-data.log`, dan README baru
  tetap instruksikan operator memverifikasi `docker --version` via SSH sebelum lanjut ke README
  §3 (bukan asumsi buta bahwa bootstrap selalu sukses).
- **Tak bisa dibuktikan hidup-hidup dari sesi ini** (lihat Constraints) — risiko standar: kode bisa
  salah sintaks/logika yang cuma ketahuan saat operator pertama kali `apply` di dunia nyata. Sama
  seperti pola "code-complete, belum live-verified" yang sudah dipakai jujur di gap Secrets
  Manager/ACME sebelumnya — bukan diklaim selesai sampai ada bukti nyata.
- **AMI filter dinamis (data source) bisa menarik versi Ubuntu 22.04 yang berbeda antar apply**
  (kalau Canonical merilis image baru) — mitigasi: pin ke `most_recent = true` **dengan** filter
  versi mayor eksplisit (`22.04`), didokumentasikan sebagai trade-off sadar (image terbaru dari
  versi yang sama > pin ID persis yang basi/hilang dari region tertentu).

## 9. Implementation Plan
| Fase | Isi | Bukti keberhasilan |
|---|---|---|
| 1 | `variables.tf`+`outputs.tf`+`terraform.tfvars.example` | Review manual: tiap variabel README manual §1 punya padanan, tak ada yg default ke `0.0.0.0/0` untuk SSH |
| 2 | `main.tf` (SG + instance + EIP + user_data) | Review manual line-by-line vs README §1-§2; `user_data` script diuji sintaks shell terpisah (shellcheck kalau tersedia) |
| 3 | Update `deploy/aws-ec2-test/README.md` §1-§2 → pointer Terraform, jelaskan apa yg dibuat | README baru dibaca ulang end-to-end memastikan alur §3 dst masih nyambung tanpa celah instruksi |
| 4 | `.gitignore` state/tfvars asli | Cek `git status` setelah `terraform init` simulasi (kalau ada Terraform lokal) tak menampilkan file sensitif |

**Verifikasi aktual (lebih kuat dari yang diasumsikan di §6 Constraints):** binary `terraform`
ternyata BISA didapat di sesi ini (unduh langsung dari releases.hashicorp.com — jaringan tersedia,
walau `terraform`/`aws` CLI tak terpasang sejak awal). Dijalankan nyata:
- `terraform fmt -check -recursive` → **lulus** (0 diff).
- `terraform init -backend=false` → **lulus**, provider `hashicorp/aws` ter-resolve
  (`~> 5.0` → `5.100.0`), `.terraform.lock.hcl` ter-generate dan **di-commit** (bukan diignore —
  standar praktik pin versi provider).
- `terraform validate` → **lulus**, "The configuration is valid."
- `terraform plan` dgn `.tfvars` **sengaja salah** (`firm_name` mengandung karakter tak valid +
  `allowed_ssh_cidr=0.0.0.0/0`) → **ditolak benar** oleh `validation` block, dgn pesan error yang
  saya tulis, SEBELUM menyentuh AWS API sama sekali.
- `terraform plan` dgn `.tfvars` valid → lolos semua validasi variabel, berhenti tepat di
  `Error: No valid credential sources found` (AWS provider) — ini **satu-satunya** hal yang tak
  bisa dibuktikan dari sesi ini, dan itu murni soal kredensial AWS yang memang tak tersedia
  (bukan cacat konfigurasi).

**Kesimpulan status**: bukan lagi "asumsi review manual" seperti diperkirakan §6 — **struktur,
sintaks, dan validasi variabel Terraform sudah teruji nyata**. Yang tetap belum terbukti hanya
`terraform apply` sungguhan terhadap akun AWS asli (butuh kredensial + biaya nyata) — status
untuk itu saja yang tetap *"code-complete, belum live-verified"*, pola yang sama dengan Secrets
Manager (PR #56) dan ACME TLS (PR #56).

## 10. Open Questions
1. **Nama/skema tagging per-firma** — `firm_name` sebagai tag `Name` saja cukup, atau perlu skema
   tag tambahan (mis. `Environment=pilot`, `ClientId=...`) untuk memudahkan cost-tracking AWS kalau
   nanti ada >1 firma berjalan bersamaan?
2. **Region default** — README menyarankan `ap-southeast-3` (Jakarta) dengan `ap-southeast-1`
   (Singapura) sebagai alternatif. Dijadikan variabel dengan default Jakarta (sesuai README), atau
   Anda ingin default berbeda?
3. **`terraform validate` read-only di CI** — masuk scope sesi ini (tanpa kredensial AWS, cuma cek
   sintaks HCL) sebagai guardrail permanen (pola sama `edge-smoke`/`caddy validate`), atau ditunda
   sampai ada kredensial AWS untuk CI yang lebih berarti (`plan` sungguhan)?
4. **Elastic IP default `true`** — README merekomendasikan tapi tidak mewajibkan (biaya tambahan
   kecil kalau EIP tak terpasang ke instance berjalan). Setuju default `true` (konsisten dgn
   rekomendasi README, mencegah lupa) meski menambah baris biaya AWS kecil per firma?

---
## 11a. Keputusan diambil pada implementasi (Ari menjawab "Proceed." tanpa menjawab §10 satu-satu)
Empat Open Question di atas tidak dijawab eksplisit sebelum "Proceed." — saya melanjutkan dengan
opsi yang sudah saya usulkan sebagai default di PRD ini (bukan diam-diam, dicatat eksplisit di
sini per aturan kerja "No Silent Assumptions"). Semua **mudah diubah** (edit `.tf`/`.tfvars`,
tak ada yang sudah `apply` ke AWS nyata):
1. **Tagging**: `Name`, `ManagedBy=terraform`, `Environment=pilot`, `Project=asseris-single-tenant`
   otomatis + `extra_tags` map opsional per-firma (mis. `ClientId`) — gabungan paling fleksibel
   dari opsi yang disebut di OQ#1, bukan cuma `Name` polos.
2. **Region default**: `ap-southeast-3` (Jakarta) sesuai rekomendasi README — OQ#2 dijawab "tidak
   ada perubahan dari default yang diusulkan".
3. **`terraform validate` masuk CI**: **YA**, ditambahkan (`.github/workflows/terraform-validate.yml`)
   — read-only, tanpa kredensial AWS, konsisten pola `edge-smoke`/`caddy validate`. Kalau Ari tidak
   menghendaki ini, tinggal hapus file workflow-nya.
4. **Elastic IP default `true`**: dipertahankan sesuai usulan (mencegah lupa, biaya tambahan kecil).

**Sign-off:** ditandai dengan balasan **"Proceed."** — DITERIMA (2026-07-02).
