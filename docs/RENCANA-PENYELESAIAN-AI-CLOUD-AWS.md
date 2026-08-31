# Rencana Penyelesaian Pengembangan Asseris — Dikerjakan AI di Cloud, Hosting AWS

| Field | Isi |
|---|---|
| Tanggal | 2026-08-31 |
| Pemilik | Ari Widodo |
| Status | Draft — menunggu sign-off ("Proceed.") |
| Cakupan | Rencana program end-to-end: penuntasan seluruh backlog PRD oleh sesi AI (Claude Code on the web), gerbang mutu, provisioning & go-live AWS, operasional pilot, skala multi-firma |

> Dokumen ini adalah **rencana program**, bukan PRD fitur. Ia merangkai pekerjaan yang
> sudah terdaftar di `docs/PRD-REGISTRY.md`, `docs/UPGRADE-BACKLOG.md`, `docs/DEPLOY.md`
> dan `docs/prd-iac-ec2-provisioning.md` menjadi urutan eksekusi yang bisa dijalankan
> sesi-AI di cloud tanpa mesin dev lokal. Setiap fase punya gerbang keluar yang terukur.

---

## 0. Posisi saat ini (ringkasan jujur)

**Sudah selesai & terbukti:**
- Tahap 0–9 program migrasi terkirim; SPA Vite+ESM+TS strict penuh, ~200 modul lazy,
  gerbang `npm run verify` = cermin persis CI (`master` selalu hijau, R-7).
- Backend tRPC+Prisma live: auth (scrypt+TOTP+lockout), RBAC 6 peran, StateDoc
  append-only + audit hash-chain, isolasi per-engagement, LLM proxy (W8), ekspor
  tersegel Ed25519.
- Paket deploy single-tenant lengkap (`deploy/aws-ec2-test/`): docker-compose +
  Caddy same-origin + TLS toggle internal/ACME, backup terenkripsi + restore drill CI
  mingguan, ekspor audit-log off-box, rate-limit edge, alerting eksternal, log shipping,
  rotasi kunci, loadtest + tabel kapasitas.
- **Terraform EC2 code-complete** (`deploy/aws-ec2-test/terraform/`): validate/plan
  lulus; satu-satunya yang belum = `apply` ke akun AWS asli (belum ada kredensial).

**Belum selesai (inilah isi rencana ini):**
- PRD: **14 In Progress · 5 Approved · 53 Draft** (registri: `docs/PRD-REGISTRY.md`).
- Upgrade mayor tertahan: React 19, Prisma 7, TS 7, Vite 8, ESLint 10
  (`docs/UPGRADE-BACKLOG.md`).
- Seluruh jalur AWS **belum pernah live-verified terhadap AWS sungguhan**: terraform
  apply, salinan backup S3, ekspor audit-log S3 + Object Lock, Secrets Manager,
  ACME/Let's Encrypt, alerting (HEALTHZ_URL + SMTP), loadtest di EC2 nyata, RTO total.
- Kepatuhan UU PDP: kajian & kebijakan ada, review pengacara + wiring DSR + basis hukum
  transfer LLM lintas-batas masih terbuka (`docs/PDP-COMPLIANCE-ASSESSMENT.md` §5).

---

## 1. Model kerja: AI di cloud (cara SEMUA pekerjaan di bawah dieksekusi)

Semua fase pengembangan dijalankan lewat **sesi Claude Code on the web** (claude.ai/code)
terhadap repo `ari1945/Asseris` — tanpa mesin dev lokal. Aturan bakunya:

1. **Satu sesi = satu PRD/arc** (atau satu PR bila PRD dipecah PR-1..PR-n). Sesi membaca
   `CLAUDE.md` + PRD terkait dulu, lalu bekerja di branch `claude/<topik>` atau
   `feat/<topik>` sesuai konvensi PRD-nya.
2. **Gerbang tak bisa ditawar:** `npm run verify` hijau penuh sebelum push
   (lint · typecheck · typecheck:test · ratchet-any · test · build · budget-bundle ·
   server typecheck/test). E2E Playwright+Postgres jalan di CI.
3. **PR + review:** tiap arc dikirim sebagai PR ke `master`; sesi men-subscribe PR-nya
   (autofix CI merah, jawab review) sampai merged. `master` selalu hijau.
4. **Sign-off manusia tetap gerbang:** PRD Draft TIDAK dieksekusi sebelum Ari membalas
   "Proceed." — sesuai konvensi repo. AI boleh menyiapkan/mempertajam PRD Draft dan
   mengajukan rekomendasi prioritas, tapi tidak melompati sign-off.
5. **Live-verify di cloud:** verifikasi hidup memakai `npm run dev:all` + Playwright
   headless dalam sesi (Chromium tersedia); bukti (screenshot/log) dilampirkan di PR.
6. **Pekerjaan paralel:** arc yang tak bertabrakan file (mis. satu arc `view_*` UI vs
   satu arc `server/`) boleh jalan sebagai sesi paralel; arc yang menyentuh kanon/SSOT
   yang sama diserialisasi untuk menghindari konflik merge di `canon*`/`data*`.
7. **Ritme keputusan:** tiap akhir minggu, satu sesi menyusun ringkasan status +
   daftar pertanyaan/sign-off yang menunggu Ari (pola "checkpoint" yang sudah dipakai
   di PRD sdm-kepatuhan Q-6).

---

## 2. Fase A — Tuntaskan yang sedang berjalan (14 PRD In Progress)

**Tujuan keluar fase:** registri tidak lagi punya status In Progress; semua arc yang
setengah jalan ditutup atau secara eksplisit dipecah jadi PRD lanjutan.

Urutan berdasarkan ketergantungan & risiko:

| # | PRD (In Progress) | Langkah penyelesaian | Blocker |
|---|---|---|---|
| A1 | `prd-framework-ssot-hilir` | Eksekusi PR-3..PR-5 (PR-1/2 selesai) | — |
| A2 | `PRD - Penegakan Sign-off Berbasis Peran` | Selesaikan Fase 3 (test+docs, PR #23) | — |
| A3 | `PRD - Restrukturisasi Navigasi & Beranda` | Fase 4–8 setelah tinjauan Fase 0–3 | Tinjauan Ari |
| A4 | `PRD - Kesiapan Pemeriksaan P2PK` | PR-5 (menunggu Q5 substansi POJK 9/2023) + PR-7 | Jawaban Q5 dari Ari |
| A5 | `prd-regref-tahap-a2` | Tutup Q-A1..Q-A3 lalu finalisasi | **Data dari Ari** (naskah UU 36/2008 & UU 7/2021, PMK 186/2021, POJK 13/2017, PMK 136/2024) |
| A6 | `prd-regulatory-reference-annual` | Tutup Q-1·Q-4·Q-5 | **Data dari Ari** (Lampiran PMK 168, cuti bersama, batas upah BPJS 2026) |
| A7 | `PRD - Legacy Track Window-Namespace Strip` | Lanjutkan strip per-slice + audit pembaca `window.*` tersisa (CLAUDE.md §3.1) | — |
| A8 | `PRD - W9 Konektor Data` | Rampungkan adapter tersisa di luar Coretax; atau pecah jadi PRD per-konektor & tandai W9 selesai | Keputusan cakupan |
| A9 | `prd-delivery-milestones-deepening` | Eksekusi sesuai keputusan Q-1..Q-5 yang sudah disetujui | — |
| A10 | `prd-firm-erp-deepening` | Eksekusi keenam PR sesuai keputusan 2026-08-16 | — |
| A11 | `prd-export-seal-identity-ssot` | Selesaikan sisa arc (F-3 sudah masuk #334) | — |
| A12 | `PRD - Wedge MVP Build` | Selesaikan build aktif; definisikan kriteria "selesai" eksplisit | — |
| A13 | `prd-sales-pipeline-deepening` | ARC sudah tuntas (SC-1..16) → verifikasi & ubah status ke Implemented | — |
| A14 | `prd-program-tahap-0-9` | Retrospektif R-1..R-7 sudah dieksekusi → tutup status | — |

**Estimasi:** 3–5 minggu kalender dengan 2–3 sesi paralel (A13/A14 hanya administrasi
registri; A5/A6 menunggu data, jalan paralel begitu data masuk).

---

## 3. Fase B — Eksekusi 5 PRD Approved

Semua sudah punya sign-off; bisa langsung dieksekusi paralel dengan Fase A (file-set
berbeda):

| # | PRD (Approved) | Catatan eksekusi |
|---|---|---|
| B1 | `PRD - SA 570 Going Concern Lanjutan` | "implementasi berjalan" — lanjutkan sampai SC tertutup |
| B2 | `prd-wtb-integrity-falsifiable-gates` | Keputusan terkunci (Q1=a · Q2=blok · Q3=ya) |
| B3 | `prd-audit-programme-add-procedure` | "Paket Lengkap Proceed" sejak 2026-06-25 — tertua, prioritaskan |
| B4 | `prd-wp-procedure-execution` | "Full audit-tech + Pertahankan terpisah" |
| B5 | `prd-phase-gate-override-rbac` | Follow-up RBAC override Partner-only |

**Estimasi:** 2–4 minggu, tumpang-tindih dengan Fase A.

---

## 4. Fase C — Triase & eksekusi 53 PRD Draft (tiga gelombang)

53 Draft tidak dikerjakan sekaligus. Langkah pertama fase ini adalah **sesi triase**:
AI menyusun matriks (nilai go-live × usaha × dependensi) dan Ari men-sign-off per
gelombang — sekali keputusan per gelombang, bukan 53 keputusan terpisah.

**Gelombang C-1 — Jalur go-live & keamanan data** (prasyarat pilot ber-data-nyata):

1. `PRD - Deploy-Readiness Single-Tenant` (item tersisa) + `PRD - CI Deploy-Smoke (W10.1)`.
2. `prd-backup-restore-dr-hardening` (item tersisa; sebagian besar sudah jalan).
3. `PRD - W-WTB-1 Ingress TB Nyata (Paste-CSV)` — tanpa ini pilot tak bisa memuat TB
   klien sungguhan; **prasyarat fungsional go-live**.
4. `prd-rbac-admin-console` (Open Questions sudah terjawab — tinggal "Proceed.").
5. `PRD - Isolasi Data Personal (Privacy) & Halaman Data Personal Saya` +
   wiring DSR dari `PDP-COMPLIANCE-ASSESSMENT.md` §5 — kepatuhan UU PDP.
6. `prd-wp-signoff-integrity` (open question terjawab).

**Gelombang C-2 — Kedalaman audit (SA-*) & integritas angka**, dikerjakan per-cluster
agar SSOT konsisten:

- Cluster AJE: PR-B, PR-C, PR-E.
- Cluster WTB: PR-1/2, PR-3/4, PR-6.
- Cluster SA substantif: SA 240, SA 250, SA 260/265, SA 315, SA 402, SA 505, SA 530,
  SA 540, SA 570 substantif, SA 620, SA-01; `PRD - Materialitas Grup SA 600` +
  `Group Audit CP-01` (menunggu keputusan metodologi Ari).
- Cluster fiskal: `Rekonsiliasi Fiskal PSAK 46` (basis sudah diputus, tinggal
  "Proceed."), `AK-01 Penomoran PSAK`, `Kebijakan Presisi Numerik`.
- Cluster lifecycle: Gerbang Fase Lifecycle (P5), Engagement-Scoping Review Notes,
  `prd-acceptance-to-engagement-flow-sa210`, `prd-continuance-register-isqm`,
  `prd-finalisation-gate-execution-completeness`, `prd-penerimaan-keberlanjutan-detail`.
- Sisa: mgmtletter, related-parties, subsequent-events, strategy-risk, risk-relocation,
  sa510, smm-toolkit-map, Remediasi Gap Matriks FIRM, Intake Manager RBAC,
  Evidence & Sign-off Lintas-WP, Jaring Pengaman Test (P1+P2), Persist Kesimpulan PSAK,
  Cockpit PR-C-8, `AI Tax Audit Diagnostic (P4)`.

**Gelombang C-3 — UX & poles**: Quick-Win Desain Visual, Skala Tipografi,
sidebar-nav-learning-curve, overlay-contract, dan virtualisasi/paginasi tabel WTB
(temuan follow-up §19.4 DEPLOY.md — penting untuk "terasa cepat" di pilot).

**Estimasi:** C-1 = 3–4 minggu; C-2 = 8–12 minggu (paralel per-cluster); C-3 = 2–3
minggu. C-1 wajib selesai sebelum go-live pilot ber-data-nyata; C-2/C-3 boleh berlanjut
setelah go-live (aplikasi sudah dipakai sambil diperdalam).

---

## 5. Fase D — Upgrade teknis (backlog Dependabot)

Dikerjakan **setelah C-1** (jangan menggoyang fondasi tepat sebelum go-live) atau di
sela antrean, satu branch per upgrade, gerbang penuh + live-verify:

| # | Upgrade | Risiko | Catatan |
|---|---|---|---|
| D1 | Prisma 6→7 (`server/`) | Medium | `prisma.config.ts` + driver adapter; sentuh boot+deploy — live-verify jalur edge Caddy |
| D2 | Vite 5→8 + plugin-react 6 | Medium | Build-tool saja; smoke dev+build |
| D3 | React 18→19 | Medium-tinggi | ~200 view; kerjakan saat antrean fitur sepi |
| D4 | TypeScript 7 + @types/node 26 + vitest 4 | Medium-tinggi | Mulai dari `signing.ts:52` |
| D5 | ESLint 10 | Rendah | Tunggu peer support plugin react |

Saat memulai tiap item: cabut entri `ignore`-nya di `.github/dependabot.yml`.

---

## 6. Fase E — Provisioning AWS (pilot) — langkah demi langkah

Arsitektur **sudah diputuskan & LOCKED**: satu EC2 single-box per firma
(SPA+API+Postgres+Caddy via docker-compose), region `ap-southeast-3` (Jakarta).
Fase ini = mengeksekusi kode yang sudah ada terhadap AWS sungguhan dan menutup semua
gap "belum live-verified". Pra-syarat satu-satunya yang benar-benar baru: **akun AWS +
kredensial** (keputusan/tindakan Ari).

**E-0. Akun & fondasi (manual Ari, ± setengah hari):**
1. Buat akun AWS (atau pakai yang ada); aktifkan MFA di root; buat IAM user/role
   operator dengan MFA (jangan pakai root harian).
2. Set **AWS Budget + alert** (mis. US$50/bulan) sejak hari pertama.
3. Putuskan domain publik (beli via Route 53 atau registrar lain) — atau tunda dan
   pakai `sslip.io` untuk pilot tertutup (didukung `deploy/aws-ec2-test/README.md`).

**E-1. Terraform apply pertama (sesi AI + kredensial scoped):**
1. Siapkan kredensial AWS terbatas (IAM policy EC2+VPC+EIP saja) untuk sesi.
2. `cd deploy/aws-ec2-test/terraform` → salin `terraform.tfvars.example` → isi
   `firm_name`, `allowed_ssh_cidr` (IP Ari, BUKAN 0.0.0.0/0), region, EIP=true.
3. `terraform init && terraform plan` → review → `apply`. Verifikasi: instance boot,
   `docker --version` via SSH (user-data bootstrap), catat `public_ip` output.
4. **Amankan `terraform.tfstate`** (aset kelas-1, backup terpisah — Risks PRD IaC §8);
   jadwalkan migrasi ke remote state S3+lock sebagai follow-up.
5. Update status `docs/prd-iac-ec2-provisioning.md` → live-verified.

**E-2. Secrets & bucket (sebelum ada data apa pun):**
1. Generate 3 kunci + sandi DB (DEPLOY.md §1) — di mesin Ari, bukan di chat/log.
2. Buat secret `asseris/prod/keys` di **AWS Secrets Manager**; pasang IAM role instance
   dengan policy `GetSecretValue` minimal (DEPLOY.md §13). `.env`:
   `SECRETS_PROVIDER=aws-sm`. → menutup gap "SM belum live-verified".
3. Buat 1 bucket S3 backup (versioning + SSE + lifecycle 30 hari) dan 1 bucket/prefix
   audit-log **dengan Object Lock (Compliance) sejak pembuatan** — tak bisa retroaktif
   (DEPLOY.md §6a). Set `BACKUP_S3_BUCKET` di `.env`.

**E-3. Deploy stack & TLS:**
1. Clone repo di instance → `.env` dari example → `docker compose ... up -d --build`
   (DEPLOY.md §3). Verifikasi `/healthz` → `db:up`.
2. TLS: pilot tertutup = `CADDY_TLS_MODE=internal`; begitu domain siap →
   A-record → `CADDY_TLS_MODE=acme` → up -d web → **menutup gap ACME**.
3. `npm run bootstrap` provisioning firma (NON-destruktif; JANGAN `npm run seed`).

**E-4. Menutup gap operasional live (checklist, semua sudah ada kodenya):**

| Gap | Cara menutup | Bukti selesai |
|---|---|---|
| Backup → S3 | Crontab §6 + `BACKUP_S3_BUCKET` | Objek muncul di S3; restore drill dari objek S3 sukses |
| Audit-log off-box | Crontab §6a | JSONL di prefix `audit-log/`, Object Lock aktif |
| Alerting | Isi `HEALTHZ_URL` + secrets SMTP di repo (§16) | Uji: matikan server 20 mnt → email alert masuk |
| Log shipping | Crontab `ship-logs.sh` (§17) | Log harian muncul di S3 |
| Loadtest EC2 nyata | Jalankan `deploy/aws-ec2-test/loadtest/` di instance (§12.3/§19) | Tabel kapasitas dikonfirmasi/di-update di DEPLOY.md |
| **RTO total** | Drill kehilangan-total: terraform apply instance baru + restore dari S3, diukur ujung-ke-ujung | Angka RTO nyata → tabel §7 DEPLOY.md → sign-off RPO/RTO Ari |
| Rate-limit | Amati 429 di trafik pilot; kalibrasi ambang §14 (NAT kantor!) | Ambang final di Caddyfile |

**E-5. Keputusan RPO/RTO (Ari):** dengan angka nyata dari E-4, putuskan RPO (≤24 jam
cukup? kalau tidak → naikkan frekuensi backup) dan publikasi RTO ke klien (DEPLOY.md §7).

**Estimasi Fase E:** 1–2 minggu kalender (kebanyakan menunggu verifikasi terjadwal;
kerja aktif ± 3–4 hari), **bisa paralel penuh dengan Fase C-1**.

---

## 7. Fase F — Go-live pilot firma

1. **Prasyarat gabungan:** Fase E selesai + Gelombang C-1 selesai (khususnya W-WTB-1
   ingress TB nyata + isolasi data personal) + review pengacara atas
   `DATA-HANDLING-COMMITMENT.md`/`PDP-COMPLIANCE-ASSESSMENT.md` (tindakan Ari; boleh
   ditunda dengan risiko dicatat eksplisit bila pilot memakai data non-sensitif).
2. Onboarding sesuai **`docs/PILOT-ONBOARDING-PLAN.md`** + `docs/USER-GUIDE.md`
   (training per peran, akun via bootstrap + `prd-add-staff-user-cli`).
3. Minggu 1–2 pilot: sesi AI memantau `/metrics`, log, laporan bug; perbaikan lewat
   alur PR normal (upgrade skema = DEPLOY.md §8: migrasi Postgres ber-riwayat,
   **selalu backup sebelum upgrade**).
4. Ritme rilis pilot: deploy dari `master` yang hijau, maksimal 1×/minggu terjadwal +
   hotfix bila perlu; tiap deploy didahului backup manual.

---

## 8. Fase G — Skala multi-firma & keputusan arsitektur lanjutan

- **Firma baru = ulangi resep**: copy `.tfvars` → `terraform apply` → E-2..E-3 →
  bootstrap. Target: provisioning firma baru < 1 hari kerja. Kunci & bucket **per
  firma terpisah** (blast-radius & retensi pasca-kontrak per `DATA-RETENTION-POLICY.md`).
- **Kapan naik kelas dari single-box** (keputusan masa depan, PRD terpisah — sudah
  dinyatakan non-scope di PRD IaC §5): pemicunya bila (a) firma >20 staf konkuren di
  perikatan besar walau sudah `t3.medium`/`t4g.medium`, (b) tuntutan HA/SLA yang tak
  bisa dijawab backup-restore, atau (c) jumlah firma membuat per-box ops mahal.
  Kandidat arsitektur: RDS Postgres + App Runner/ECS + S3+CloudFront — **jangan**
  dikerjakan diam-diam; batasan single-process `AuditLog.seq` (DEPLOY.md §10) membuat
  ini perubahan arsitektur nyata, bukan sekadar hosting.
- Pengerasan bertahap yang murah dan tak mengubah arsitektur: SSM Session Manager
  menggantikan SSH port 22, snapshot EBS terjadwal (AWS Backup) sebagai lapisan kedua
  di bawah `backup.sh`, CloudFront+Shield di depan Caddy bila ancaman DDoS nyata.

---

## 9. Estimasi biaya AWS per firma (pilot, `ap-southeast-3`, indikatif)

| Komponen | Perkiraan/bulan |
|---|---|
| EC2 `t3.small` (2 vCPU/2 GiB) | ± US$19 |
| EBS 20 GB gp3 | ± US$2 |
| Elastic IP (terpasang ke instance berjalan) | US$0–4 |
| S3 (backup+audit-log+log, puluhan GB) | ± US$1–3 |
| Secrets Manager (1 secret) | ± US$0,40 |
| Route 53 (1 hosted zone, bila pakai domain) | ± US$0,50 |
| **Total** | **± US$25–30/bulan/firma** |

Angka list-price indikatif — validasi di billing bulan pertama; Budget alert E-0
menjaga dari kejutan. Upgrade ke `t3.medium` (4 GiB) menambah ± US$19/bulan.

---

## 10. Timeline indikatif (agresif tapi realistis, dengan 2–3 sesi AI paralel)

```
Minggu  1     : Triase Draft (C-0) + mulai Fase A (In Progress) + Fase B (Approved)
Minggu  1–2   : Fase E (AWS provisioning + tutup gap live-verify)  ← paralel
Minggu  2–5   : Fase A & B tuntas; mulai Gelombang C-1 (jalur go-live)
Minggu  5–8   : C-1 tuntas → GO-LIVE PILOT (Fase F) begitu review hukum siap
Minggu  6–16  : Gelombang C-2 (kedalaman SA-*) berjalan paralel pasca-go-live
Minggu  8–10  : Fase D (upgrade teknis) di sela antrean
Minggu 14–17  : Gelombang C-3 (UX/poles) + kalibrasi kapasitas pilot
Minggu 17+    : Fase G — firma kedua dst.
```

Jalur kritis = **keputusan & data dari Ari** (lihat §11), bukan kapasitas eksekusi AI.
Setiap sign-off yang tertunda menggeser hanya arc terkait, bukan seluruh program
(itulah alasan struktur gelombang/cluster di Fase C).

## 11. Daftar keputusan/tindakan yang MENUNGGU ARI (jalur kritis)

1. **Sign-off dokumen ini** ("Proceed.") + sign-off per-gelombang Fase C.
2. **Akun AWS + kredensial scoped** (E-0/E-1) + keputusan domain publik.
3. **Data regulasi** untuk A5/A6 (naskah UU 36/2008 & UU 7/2021, PMK 186/2021,
   POJK 13/2017, PMK 136/2024, Lampiran PMK 168, cuti bersama, batas upah BPJS 2026).
4. Jawaban pertanyaan PRD yang menggantung: Q5 POJK 9/2023 (P2PK PR-5), Q3 klasifikasi
   perikatan non-audit (PSAK 72), metodologi Materialitas Grup SA 600, tinjauan
   Fase 0–3 Restrukturisasi Navigasi, pertanyaan `sa230` Finalisasi-vs-Arsip.
5. **RPO/RTO final** setelah drill E-4 (publikasi ke klien atau tunggu).
6. **Review pengacara** UU PDP (`PDP-COMPLIANCE-ASSESSMENT.md` §5) sebelum pilot
   ber-data-klien-sensitif; termasuk basis hukum transfer LLM lintas-batas (W8) —
   alternatif mitigasi: matikan/ganti endpoint LLM ke region domestik bila review
   menyimpulkan tidak ada basis.
7. Pemilihan **firma pilot** + jadwal training (PILOT-ONBOARDING-PLAN).

---

*Registri status tetap satu: `docs/PRD-REGISTRY.md`. Dokumen ini tidak menggantikan
PRD mana pun — ia hanya mengurutkan eksekusinya. Bila rencana ini di-sign-off, baris
statusnya diubah ke Approved dan ditambahkan ke registri.*
