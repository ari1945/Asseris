# Evaluasi Kesiapan Asseris sebagai Produk SaaS — dan Rencana Hosting AWS

| Field | Isi |
|---|---|
| Jenis dokumen | Evaluasi strategis (bukan PRD — tak masuk `docs/PRD-REGISTRY.md`) |
| Tanggal | 2026-08-31 |
| Penulis | Evaluasi teknis-komersial (dibaca dari kode & dokumen repo, bukan asumsi) |
| Cakupan | Kesiapan jual, arsitektur tenancy, rencana hosting AWS, unit economics, roadmap bergerbang |
| BUKAN cakupan | Legal opinion, riset harga kompetitor terverifikasi, keputusan bisnis final |

---

## 0. Ringkasan eksekutif — jawaban langsung

**Asseris sudah layak dijual, tetapi belum layak dijual sebagai SaaS self-service.**
Yang ada hari ini adalah **produk enterprise siap-pasang single-tenant yang sangat matang secara
audit-compliance** — bukan aplikasi web yang bisa didaftari orang lewat halaman "Coba Gratis".

Rekomendasi: **jual sebagai *managed/hosted single-tenant* ("SaaS silo"), bukan multi-tenant
pooled.** Jangan menulis ulang tenancy. Yang perlu dibangun adalah **lapisan komersial dan
operasional di atas arsitektur yang sudah ada**, bukan di dalamnya.

Tiga kalimat yang menentukan keputusan ini:

1. **Isolasi single-tenant bukan hutang teknis di sini — ia aset jual.** Untuk KAP yang memegang
   data pajak & keuangan klien di bawah UU PDP 27/2022 dan pengawasan P2PK, "database Anda sendiri,
   di Jakarta, tidak bercampur firma lain" adalah argumen penjualan yang sulit dilawan pesaing
   multi-tenant. Ini sudah didokumentasikan sebagai komitmen (`docs/DATA-HANDLING-COMMITMENT.md`).
2. **Rantai audit hash-chain (`AuditLog.seq`) bersifat instance-wide dan diserialisasi satu
   proses.** Memindahkannya ke database bersama berarti membongkar subsistem yang justru menjadi
   pembeda produk — risiko tertinggi pada komponen dengan toleransi cacat terendah.
3. **Biaya infrastruktur per tenant (~USD 25–40/bulan) bukan masalahnya.** Yang mahal adalah
   **waktu operator per tenant**: provisioning, upgrade skema, verifikasi backup, respons insiden.
   Itulah yang harus diotomasi, bukan biaya server yang diperas.

**Blocker jual yang sesungguhnya, berurutan menurut keparahan:**

| # | Blocker | Kelas | Tanpa ini terjadi apa |
|---|---|---|---|
| B1 | Tidak ada UI manajemen pengguna — tambah staf hanya lewat CLI di server | Produk | Setiap penambahan staf = tiket ke Anda. Tidak bisa berskala di luar 3–5 firma |
| B2 | Tidak ada reset password mandiri & tidak ada infrastruktur email transaksional sama sekali | Produk | Staf lupa password pada hari deadline audit → Anda harus SSH ke box |
| B3 | Tidak ada billing, langganan, trial, atau suspensi | Komersial | Tidak ada mekanisme penagihan; PPN & e-Faktur belum terhubung |
| B4 | DPA/kajian PDP belum direview pengacara; transfer LLM lintas batas belum berbasis hukum | Legal | Tidak boleh menjanjikan "patuh UU PDP" ke klien berbayar |
| B5 | Tidak ada SLA yang kredibel — dukungan satu kontak, best-effort | Operasional | Kontrak berbayar akan diminta SLA; saat ini tak ada dasar menjanjikannya |
| B6 | Tabel WTB tanpa virtualisasi/paginasi (`view_wtb_deep.tsx`) | Produk | Klien grup dengan ribuan baris akan merasa aplikasi "lambat" — gap terukur terbesar yang tersisa |

Tidak satu pun dari enam ini menuntut penulisan ulang arsitektur. Semuanya adalah pekerjaan
tambahan yang jelas cakupannya.

---

## 1. Apa yang SUDAH siap — dibaca dari kode, bukan diasumsikan

Ini penting dinyatakan lebih dulu, karena kematangan repo ini di atas rata-rata untuk produk
pra-penjualan, dan menentukan bahwa rekomendasi di §3 bukan "mulai dari nol".

### 1.1 Keamanan & kontrol akses — matang

- Sesi cookie HttpOnly + SameSite=Strict, scrypt, TOTP RFC 6238 dengan throttle terpisah untuk
  password dan OTP (`server/src/auth/*`) — dua penghitung terpisah agar satu limiter tak bisa
  dilewati lewat yang lain. Ini detail yang biasanya baru muncul setelah pentest.
- RBAC dua lapis: kapabilitas (`server/src/rbac.ts`, otoritatif di server) + keanggotaan
  per-engagement (`EngagementMember`). Batas isolasi terpusat di `stateAccess.ts` dan
  `engagementAccess.ts`, bukan tersebar di 1.207 baris `router.ts`.
- Cek lintas-firma **sudah ada** di kedua batas tersebut (`cross-firm-state`,
  `cross-firm-engagement`, `cross-firm-user`).
- Fail-fast konfigurasi produksi (`prodConfig.ts`): server menolak boot tanpa
  `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY`, dengan `COOKIE_SECURE=0`, atau password DB `changeme`.

### 1.2 Jejak audit — inilah pembeda produknya

- `AuditLog` append-only ber-hash-chain SHA-256, dengan **transactional outbox** (`AuditOutbox`)
  sehingga commit bisnis dan penulisan rantai tidak bisa terpisah, dan retry tidak bisa
  menghasilkan duplikat (`AuditLog.outboxId` unik).
- `StateDocHistory` — setiap versi kertas kerja yang pernah ditulis, di transaksi yang sama dengan
  penulisannya. Ini menjawab SA 230 secara harfiah.
- Segel Ed25519 (`Seal`) dengan `sealFormat` sehingga segel lama tetap dapat direproduksi setelah
  definisi payload berubah, dan `SigningKey` yang mengarsipkan setiap kunci publik yang pernah
  aktif — verifikasi tetap jalan melewati berapa pun rotasi kunci.
- Checkpoint rantai audit off-box (`AUDIT_CHECKPOINT_PATH`) yang harus selamat dari hilangnya host DB.

Untuk pembeli KAP, ini bukan fitur — ini alasan membeli. Dan ini juga alasan **jangan** dipooling
(§3).

### 1.3 Deploy & operasi — sudah ada, tinggal diskalakan

- Terraform per-firma (`deploy/aws-ec2-test/terraform/`), default region **`ap-southeast-3`
  (Jakarta)**, validasi menolak `allowed_ssh_cidr = 0.0.0.0/0`.
- Docker Compose lengkap: SPA + tRPC + Postgres + Caddy TLS same-origin, satu perintah.
- Backup harian + retensi 30 hari + opsi S3 off-box; skrip restore; drill restore di CI
  (`.github/workflows/restore-drill.yml`).
- Secrets Manager AWS opsional (`SECRETS_PROVIDER=aws-sm`), rotasi kunci (`rotate-keys.sh`),
  rate-limit edge Caddy, log shipping, uptime alert — masing-masing punya workflow CI sendiri.
- Provisioning non-destruktif: `bootstrapFirm` **menolak** jalan bila DB sudah berisi firma — tak
  bisa menimpa bukti audit pilot yang hidup.

### 1.4 Baseline performa — sudah diukur, bukan ditebak

`docs/DEPLOY.md` §19 memuat pengukuran nyata terhadap WTB sintetis 5.023 baris:

| Skenario | Kapasitas t3.small | Catatan |
|---|---|---|
| Perikatan volume wajar (ratusan baris) | ~40–50 staf konkuren | cukup untuk KAP kecil–menengah |
| Satu perikatan grup besar dikerjakan serentak | ~15–20 staf konkuren | di atas itu p95 tulis > 2 detik |
| Komputasi kanon (`figuresFromWTB`, `psak65`) | sub-milidetik pada 5.023 baris | **bukan** bottleneck |

Dan yang lebih berharga daripada angkanya: dokumen itu jujur menyatakan apa yang **belum**
terbukti (bukan EC2 nyata, closed-loop tanpa think-time, render browser tak terukur). Kejujuran ini
membuat angka di atas bisa dipakai sebagai dasar keputusan.

### 1.5 Gerbang mutu

`npm run verify` mencerminkan CI persis: lint + typecheck full-strict + ratchet `:any` +
unit test + build + budget bundle + server typecheck/test, ditambah e2e Playwright dengan
gerbang aksesibilitas axe (0 critical). Aturan "master SELALU HIJAU" (R-7) ditegakkan alat, bukan
niat baik. Untuk produk berbayar, ini yang membuat rilis berulang tidak menakutkan.

---

## 2. Gap ke SaaS — lengkap, dikategorikan

### 2.1 Arsitektur / tenancy

| Kode | Temuan | Bukti | Dampak |
|---|---|---|---|
| A1 | `AuditLog.seq` monoton **instance-wide** dan diserialisasi satu proses in-memory | `server/src/audit/log.ts`; `docs/DEPLOY.md` §10 | Tidak bisa multi-instance/auto-scale. Pada DB bersama, rantai satu firma akan tercampur firma lain → ekspor audit membocorkan *keberadaan* event firma lain, dan `audit.verify` tak bisa dipisah per firma |
| A2 | `Connector`, `SyncJob`, `ConnectorToken` **tidak punya kolom tenant sama sekali** | `server/prisma/schema.prisma` | Tabel global. Pada DB bersama, kredensial konektor Coretax/bank satu firma terlihat oleh query firma lain kecuali ditambal |
| A3 | Kunci penandatangan & enkripsi tunggal per instance (`APP_SIGNING_KEY`, `APP_ENCRYPTION_KEY`) | `docs/DEPLOY.md` §10, `docs/KEY-ROTATION.md` | Pada DB bersama, satu kunci menandatangani segel semua firma; rotasi jadi peristiwa lintas-tenant |
| A4 | Cek lintas-firma berbentuk `if (user.firmId) { … }` — **gagal terbuka** bila firmId kosong | `stateAccess.ts:assertSameFirmUser`, `engagementAccess.ts` | Aman hari ini (`User.firmId` non-nullable, sesi selalu membawanya), tapi merupakan pola "aman karena konvensi", bukan "aman karena konstruksi". Pada mode pooled ini wajib jadi Postgres RLS |
| A5 | `accessibleEngagementIds` mengembalikan `'all'` tanpa filter firma untuk peran oversight | `engagementAccess.ts` | Pemanggil wajib ingat menambahkan filter `firmId` (`router.ts:838` melakukannya). Latent hazard yang sama kelasnya dengan A4 |
| A6 | `bootstrapFirm` **menolak** bila sudah ada firma | `server/src/bootstrapFirm.ts` | Ini benar dan disengaja untuk model silo — tapi berarti tak ada jalur teknis apa pun untuk firma kedua di satu instance |

**Interpretasi:** A1–A3 adalah *desain silo yang konsisten*, bukan kelalaian. A4–A5 adalah utang
kecil yang harus dibayar **hanya jika** memilih pooled.

### 2.2 Produk — yang menghalangi self-service

| Kode | Gap | Bukti |
|---|---|---|
| P1 | Tidak ada UI "Tambah Pengguna" — hanya `npm run add-user` di server | `docs/PILOT-ONBOARDING-PLAN.md` §1.1 |
| P2 | Tidak ada reset password mandiri | idem, §9 "Risiko" |
| P3 | **Tidak ada infrastruktur email transaksional sama sekali** — tak ada SMTP/SES/nodemailer di `server/src` | pencarian kode |
| P4 | Tidak ada signup/registrasi mandiri | tidak ada prosedur `signup`/`register` di `router.ts` |
| P5 | Tabel WTB tak divirtualisasi/dipaginasi | `docs/DEPLOY.md` §19.4 batasan #3 |
| P6 | Tidak ada konsol admin vendor (Anda) untuk melihat kesehatan seluruh tenant | — |

P3 adalah akar dari P2 dan sebagian P1: tanpa email, tak ada undangan pengguna, tak ada reset,
tak ada notifikasi review, tak ada peringatan kuota. Ini pekerjaan fondasi yang harus lebih dulu.

### 2.3 Komersial

| Kode | Gap |
|---|---|
| K1 | Tidak ada model langganan, trial, suspensi, atau dunning |
| K2 | Tidak ada integrasi pembayaran (Midtrans/Xendit/Stripe) maupun penagihan manual terstruktur |
| K3 | Belum ada penetapan harga, paket, atau batas kuota (jumlah staf/perikatan/penyimpanan) |
| K4 | Kewajiban PPN & e-Faktur/Coretax atas penjualan SaaS belum dipetakan ke alur penagihan |
| K5 | Tidak ada ToS, SLA, order form, atau DPA final |

### 2.4 Legal & kepatuhan

Sudah dikerjakan jauh, tapi belum tuntas — dan ini bukan sesuatu yang bisa "ditutup dengan kode":

- `docs/PDP-COMPLIANCE-ASSESSMENT.md` — gap pasal-per-pasal **selesai, belum direview pengacara**.
- `docs/DATA-HANDLING-COMMITMENT.md` — komitmen internal, **bukan DPA final**.
- `docs/HOSTING-DATA-RESIDENCY-REVIEW.md` — region `ap-southeast-3` dinilai memadai untuk profil
  klien non-regulasi; **PP 71/2019 & UU PDP Ps. 56 perlu konfirmasi pengacara**.
- Transfer LLM lintas batas (W8) — **belum berbasis hukum**. Ini gap residensi data yang nyata,
  dan ia ada di fitur, bukan di pilihan region.
- Segel Ed25519 **bukan** e-Meterai / tanda tangan PSrE — sudah dinyatakan jujur di skema, tapi
  harus dinyatakan sama jujurnya di materi penjualan agar tidak jadi klaim berlebihan.
- Klien firma ter-regulasi OJK **wajib kajian ulang terpisah** sebelum di-onboard.

### 2.5 Operasional

| Kode | Gap |
|---|---|
| O1 | Dukungan satu orang, best-effort jam kerja (`docs/INCIDENT-RESPONSE.md`) — tak cukup mendasari SLA berbayar |
| O2 | Tanpa replikasi; durabilitas bergantung backup (`docs/DEPLOY.md` §10) |
| O3 | Backup S3 & Secrets Manager & TLS ACME sudah berkode + teruji CI, **belum live-verified terhadap AWS sungguhan** |
| O4 | Rate-limit hanya aplikatif per-IP — tanpa proteksi DDoS L3/L4 |
| O5 | Tidak ada status page publik maupun dashboard armada lintas-tenant |
| O6 | Upgrade skema saat ini prosedur manual per box (`docs/DEPLOY.md` §8) |

### 2.6 Utang dependensi (terlacak, bukan tersembunyi)

`docs/UPGRADE-BACKLOG.md`: React 18→19, Prisma 6→7, TypeScript 6→7 + Vitest 2→4, Vite 5→8.
Semua sengaja ditahan dari Dependabot dengan alasan tertulis dan langkah eksekusi. Ini tidak
menghalangi penjualan, tetapi **Prisma 6→7 sebaiknya diselesaikan sebelum armada tumbuh** — makin
banyak instance produksi, makin mahal migrasi lapisan data.

---

## 3. Keputusan arsitektur: silo vs pooled

Ini keputusan yang paling menentukan, jadi dinyatakan eksplisit dengan kriteria **sebelum** skor.

### 3.1 Kriteria penilaian

1. Risiko terhadap subsistem audit (toleransi cacat = nol)
2. Nilai jual ke pembeli KAP Indonesia
3. Biaya infrastruktur per tenant
4. **Biaya waktu operator per tenant** (yang sebenarnya membatasi skala)
5. Waktu ke pendapatan pertama
6. Kemampuan melayani segmen harga rendah

### 3.2 Penilaian

| Kriteria | Silo (1 instance/firma) | Pooled (1 DB, banyak firma) |
|---|---|---|
| 1. Risiko subsistem audit | **Nol perubahan** — rantai tetap per-instance | **Tinggi** — `seq` harus jadi per-firma, checkpoint/ekspor/verify semua ikut berubah (A1) |
| 2. Nilai jual | **Kuat** — "DB Anda sendiri, di Jakarta" | Netral; harus dijelaskan dengan RLS |
| 3. Biaya infra/tenant | ~USD 25–40/bln | ~USD 5–12/bln pada 50+ tenant |
| 4. Biaya waktu operator | **Tinggi bila manual** — ini masalah sebenarnya | Rendah setelah jadi |
| 5. Waktu ke pendapatan | **Sekarang** — Terraform sudah ada | +4–7 bulan rekayasa sebelum rupiah pertama |
| 6. Segmen harga rendah | Lantai biaya ~Rp 450rb/bln menutup tier murah | Bisa melayani tier murah |

### 3.3 Keputusan

**Silo — dengan disiplin "pooling-ready".**

Kriteria 3 kalah oleh kriteria 4: selisih USD 20/tenant/bulan tidak berarti apa-apa bila ACV
berada di kisaran Rp 30–100 juta/tahun. Yang membatasi skala adalah **jam operator**, dan itu
diselesaikan dengan otomasi armada (§4 Tahap 2), bukan dengan menulis ulang tenancy.

Kriteria 1 dan 5 memutuskan sisanya: pooling mempertaruhkan justru subsistem yang jadi alasan
orang membeli, demi penghematan yang belum relevan, dengan menunda pendapatan 4–7 bulan.

**"Pooling-ready" berarti tiga disiplin murah yang dijalankan sekarang**, agar pintu ke pooled
tidak tertutup permanen:

- **D1.** Jangan tambah tabel global baru. Setiap model Prisma baru wajib punya jalur tenant
  (langsung `firmId`, atau `scope`/`scopeId` seperti `StateDoc`).
- **D2.** Tambahkan `firmId` ke `Connector`/`SyncJob`/`ConnectorToken` **sekarang** (A2), selagi
  armada masih 1–3 instance dan migrasinya sepele. Nanti biayanya berlipat per instance.
- **D3.** Ubah `if (user.firmId)` menjadi *fail-closed* (A4/A5): tanpa `firmId` → `FORBIDDEN`,
  bukan lolos. Ini perbaikan yang benar bahkan di mode silo, dan menghapus satu kelas kerentanan
  laten sebelum ia sempat jadi insiden.

**Kapan meninjau ulang:** bila (a) tenant > 40, **atau** (b) muncul permintaan terbukti untuk tier
di bawah Rp 1,5 juta/bulan, **atau** (c) biaya infra melampaui 15% pendapatan berulang. Selama
tiga hal itu belum terjadi, pooling adalah optimasi prematur.

---

## 4. Rencana hosting AWS — tiga tahap bergerbang

Prinsip: **setiap tahap harus dijalankan dengan pendapatan tahap sebelumnya.** Jangan bangun
Tahap 2 sebelum Tahap 1 punya pelanggan membayar.

### Tahap 1 — "Managed Silo Manual" (tenant 1–5) · sudah 90% ada

Bentuk: satu EC2 per firma di `ap-southeast-3`, persis `deploy/aws-ec2-test/`.

```
Internet
   │  HTTPS (ACME/Let's Encrypt, CADDY_TLS_MODE=acme)
   ▼
[ EC2 t3.small — asseris-<firma> ]  ap-southeast-3, Elastic IP
   ├─ Caddy      : TLS + rate-limit + reverse-proxy /trpc
   ├─ web        : SPA hasil vite build (same-origin)
   ├─ server     : tRPC Node :5181
   └─ db         : Postgres 16 (kontainer, volume EBS gp3 20GB)
        │
        ├─→ S3 ap-southeast-3 : backup harian + ekspor audit-log off-box
        ├─→ Secrets Manager   : APP_SIGNING_KEY, APP_ENCRYPTION_KEY, DB password
        └─→ CloudWatch        : healthz alarm + log shipping
```

Yang harus dikerjakan (bukan dibangun dari nol — diverifikasi & dirapikan):

| # | Pekerjaan | Kenapa |
|---|---|---|
| 1.1 | **Live-verify** backup S3, Secrets Manager, TLS ACME terhadap AWS sungguhan | Ketiganya CI-verified tapi belum live (`docs/DEPLOY.md` §12.4, O3). Jangan onboard data klien nyata tanpa ini |
| 1.2 | Ganti SSH key pair dengan **AWS Systems Manager Session Manager** | Menghapus port 22 dari security group sepenuhnya; jejak akses tercatat di CloudTrail — argumen kuat saat pentest/due-diligence klien |
| 1.3 | Pindahkan Terraform ke **backend S3 + DynamoDB lock**, satu workspace per firma | State lokal tidak akan selamat begitu ada 3 firma |
| 1.4 | Aktifkan **EBS snapshot harian via Data Lifecycle Manager** sebagai lapis kedua di atas `backup.sh` | O2 — durabilitas hari ini hanya bergantung backup logis |
| 1.5 | Restore drill nyata di EC2 (bukan CI), catat RTO/RPO terukur | Ubah RTO/RPO dari proposal jadi angka yang boleh ditulis di kontrak |
| 1.6 | Bucket S3 & `AWS_REGION` Secrets Manager **dipaksa `ap-southeast-3`** | `docs/HOSTING-DATA-RESIDENCY-REVIEW.md` §3 temuan #2 & #3 — konsistensi residensi primary *dan* backup |

Ukuran instance mengikuti tabel kapasitas `docs/DEPLOY.md` §19.4: `t3.small` untuk KAP ≤ 40 staf
dengan perikatan volume wajar; naikkan ke `t4g.medium` (ARM, lebih murah per vCPU) **sebelum**
puncak fieldwork bila ada klien grup ribuan baris, bukan reaktif.

**Estimasi biaya per tenant/bulan** — *estimasi kasar, WAJIB diverifikasi di AWS Pricing
Calculator untuk `ap-southeast-3` sebelum dipakai menetapkan harga*:

| Komponen | USD/bln (estimasi) |
|---|---|
| EC2 t3.small on-demand | 18–25 |
| EBS gp3 20 GB + snapshot | 2–4 |
| Elastic IP (IPv4 publik kini berbayar) | ~4 |
| S3 backup (~10 GB) + request | 1–2 |
| Data transfer keluar (~10 GB) | 1–2 |
| CloudWatch logs + alarm | 1–2 |
| **Total** | **~27–39** (≈ Rp 440rb–640rb) |

Penghematan yang tersedia bila arus kas memungkinkan: **Savings Plan/Reserved 1 tahun** menurunkan
komponen EC2 ~30–40%; **Graviton `t4g.small`** ~10–20% lebih murah dari `t3.small`. Keduanya baru
masuk akal setelah tenant stabil ≥ 5 (komitmen 1 tahun atas instance yang mungkin di-churn adalah
risiko, bukan penghematan).

**Gerbang keluar Tahap 1:** 3 firma membayar, restore drill nyata lulus, nol insiden kehilangan data.

---

### Tahap 2 — "Control Plane" (tenant 5–30) · di sinilah SaaS sesungguhnya dibangun

Bentuk **tidak berubah** — tetap satu EC2 per firma. Yang berubah: cara Anda mengelola armadanya.
Ini menyerang biaya sebenarnya (kriteria 4 di §3.1), bukan biaya server.

```
                     ┌──────────────────────────────────┐
                     │   CONTROL PLANE (akun terpisah)  │
                     │  · Terraform workspace per firma │
                     │  · SSM Run Command → upgrade N   │
                     │  · CloudWatch dashboard armada   │
                     │  · Route 53: <firma>.asseris.id  │
                     │  · Konsol admin vendor + billing │
                     └────────────┬─────────────────────┘
                                  │ SSM / Terraform (tanpa SSH)
        ┌─────────────────┬───────┴────────┬─────────────────┐
        ▼                 ▼                ▼                 ▼
  [EC2 firma A]     [EC2 firma B]    [EC2 firma C]     [EC2 firma …]
   DB sendiri        DB sendiri       DB sendiri        DB sendiri
   kunci sendiri     kunci sendiri    kunci sendiri     kunci sendiri
```

| # | Pekerjaan | Menyelesaikan |
|---|---|---|
| 2.1 | **Provisioning satu perintah**: Terraform apply + `pilot:provision` + DNS + sertifikat, dari satu skrip | Onboarding firma baru dari ~1 hari jadi ~1 jam |
| 2.2 | **Upgrade armada via SSM Run Command / Ansible**, bergelombang (canary 1 tenant → sisanya) dengan rollback per-tenant | O6 — hari ini upgrade adalah prosedur manual per box |
| 2.3 | **Route 53 + subdomain per firma** (`<firma>.asseris.id`) + sertifikat ACME otomatis | Menghapus peringatan TLS internal; syarat tampil profesional |
| 2.4 | **Dashboard armada** — healthz, lag outbox audit, umur backup terakhir, disk, kredit burst CPU, semua tenant dalam satu layar | O5 — hari ini kesehatan tenant hanya terlihat dengan SSH satu per satu |
| 2.5 | **Verifikasi backup otomatis**: restore ke instance sekali pakai tiap minggu, alarm bila gagal | Backup yang tak pernah di-restore adalah backup yang belum terbukti |
| 2.6 | **Pindahkan lampiran ke S3** (`ATTACHMENT_STORAGE=s3`, sudah ada di kode) | Menahan pertumbuhan DB; backup/restore tetap cepat (`docs/SPIKE-S3-STORAGE.md`) |
| 2.7 | **CloudFront + AWS WAF** di depan armada | O4 — proteksi L3/L4 + cache aset SPA; satu distribusi melayani semua tenant |
| 2.8 | **Konsol admin vendor** — daftar tenant, status langganan, kuota, tombol suspend | P6, K1 |

Biaya bersama Tahap 2 (dibagi seluruh tenant): Route 53 ~USD 1 + CloudFront/WAF ~USD 15–30 +
control plane t4g.micro ~USD 8 ≈ **USD 25–40/bulan total**, atau ~USD 1–3 per tenant pada 15–30
tenant. Biaya per tenant tetap di kisaran USD 27–39.

**Gerbang keluar Tahap 2:** 15 firma membayar, MTTR insiden < 4 jam terukur, provisioning < 1 jam,
upgrade armada tanpa downtime terjadwal > 30 menit.

---

### Tahap 3 — "Konsolidasi" (tenant 30+) · hanya bila ekonomi menuntutnya

Dua opsi, dipilih berdasarkan data yang saat itu sudah Anda miliki:

**Opsi 3A — Konsolidasi compute, isolasi data tetap.** Beberapa kontainer tenant pada host EC2
lebih besar (mis. `m7g.large` menampung 8–10 tenant) + **RDS Postgres bersama dengan
database-per-tenant**. Rantai audit tetap terpisah per database → **A1 tidak perlu disentuh**.
Biaya turun ke ~USD 10–18/tenant. Ini jalur yang saya rekomendasikan bila konsolidasi diperlukan.

**Opsi 3B — Pooled sejati.** Satu database, `firmId` di semua tabel, Postgres RLS. Menuntut A1
(seq per-firma), A2, A3 (kunci per-tenant), A4, A5 diselesaikan. Biaya ~USD 5–12/tenant. **Hanya
tempuh ini bila ada segmen harga rendah yang terbukti**, bukan demi margin pada tier yang sudah
sehat.

Perbedaan biaya 3A vs 3B pada 50 tenant ≈ USD 300/bulan. Itu tidak sebanding dengan risiko
membongkar rantai audit. **Default: 3A.**

---

## 5. Model harga & unit economics

### 5.1 Kerangka (bukan riset kompetitor — angka di bawah ilustratif)

Harga harus diturunkan dari **nilai**, bukan dari biaya. Nilai Asseris untuk KAP = jam auditor yang
tidak terbuang + risiko pemeriksaan P2PK yang berkurang. Satu auditor senior Indonesia ≈ Rp 15–25
juta/bulan; menghemat 10% waktu 5 orang ≈ Rp 7,5–12,5 juta/bulan. Harga di kisaran Rp 3–6 juta/bulan
untuk KAP 10 staf berada jauh di bawah nilai itu — masuk akal, tapi **wajib divalidasi dengan
2–3 wawancara harga ke KAP nyata sebelum dipublikasikan.**

Ilustrasi paket:

| Paket | Profil | Ilustrasi harga/bln | Biaya infra | Margin kotor infra |
|---|---|---|---|---|
| Praktik Kecil | ≤ 5 staf, ≤ 10 perikatan/th | Rp 2,5 jt | ~Rp 500rb | ~80% |
| Firma | ≤ 20 staf | Rp 6 jt | ~Rp 550rb | ~91% |
| Firma+ | ≤ 50 staf, klien grup | Rp 12 jt | ~Rp 900rb (t4g.medium) | ~93% |
| Enterprise | on-premise / VPC pelanggan | negosiasi | ditanggung pelanggan | — |

Margin kotor *infrastruktur* 80–93% sehat. **Yang akan menggerus margin sesungguhnya adalah
dukungan dan onboarding**, bukan AWS — perkirakan 8–20 jam per onboarding firma pada tahun pertama.
Itu argumen tambahan untuk memprioritaskan B1/B2 (UI pengguna + reset password mandiri): setiap
jam dukungan yang dihapus otomasi bernilai lebih besar daripada seluruh tagihan EC2 tenant itu.

### 5.2 Yang harus dibereskan di sisi penagihan

- Penetapan status PKP dan perlakuan **PPN atas jasa SaaS** (tarif yang berlaku saat penagihan),
  penerbitan **e-Faktur lewat Coretax** untuk setiap invoice langganan.
- Potensi **PPh 23** atas jasa bila pelanggan adalah pemotong — pengaruhi kas, harus tercermin di
  invoice dan rekonsiliasi.
- Kontrak berlangganan: masa, terminasi, dan **kewajiban keluar-data** — untuk KAP ini kritis
  karena kertas kerja wajib diarsip bertahun (lihat `docs/DATA-RETENTION-POLICY.md`).
- Mulai dengan **invoice manual + transfer bank**. Payment gateway (Midtrans/Xendit) baru masuk
  akal setelah > 15 pelanggan; sebelum itu ia hanya menambah permukaan kepatuhan tanpa menghemat waktu.

---

## 6. Roadmap bergerbang

Urutan dipilih berdasarkan **apa yang paling murah menutup ketidakpastian terbesar**, bukan
kemudahan.

### Gelombang 0 — Sebelum rupiah pertama (est. 3–5 minggu)
1. **D3 fail-closed tenancy** (A4/A5) — hapus kerentanan laten selagi murah.
2. **D2 `firmId` pada Connector/SyncJob/ConnectorToken** (A2) — selagi armada masih 1 instance.
3. **Live-verify AWS**: backup S3, Secrets Manager, TLS ACME, + restore drill nyata di EC2 (1.1, 1.5).
4. **SSM Session Manager**, hapus port 22 (1.2); Terraform backend S3 (1.3); DLM snapshot (1.4).
5. **Kirim `docs/PDP-COMPLIANCE-ASSESSMENT.md` + `DATA-HANDLING-COMMITMENT.md` ke pengacara.**
   Ini punya lead time terpanjang dan tidak bergantung pada kode — mulai lebih awal, bukan terakhir.

### Gelombang 1 — Bisa dijual dengan white-glove (est. 6–9 minggu)
6. **Email transaksional (SES di `ap-southeast-3`/`ap-southeast-1`)** — P3, fondasi bagi 7 & 8.
7. **Reset password mandiri** — P2.
8. **UI Manajemen Pengguna** (undang, atur peran, nonaktifkan, reset TOTP) — P1, penghemat jam
   dukungan terbesar.
9. **Route 53 + subdomain + ACME per tenant** (2.3).
10. **ToS + SLA + order form + DPA** berdasarkan hasil review pengacara.
11. **Validasi harga**: 3 wawancara dengan KAP nyata sebelum menetapkan paket.

> **Gerbang: 3 firma membayar.** Jangan lanjut ke Gelombang 2 sebelum ini.

### Gelombang 2 — Bisa berskala (est. 8–12 minggu)
12. **Control plane**: provisioning satu perintah + upgrade armada SSM (2.1, 2.2).
13. **Dashboard armada + verifikasi backup otomatis** (2.4, 2.5).
14. **Lampiran ke S3** (2.6).
15. **CloudFront + WAF** (2.7).
16. **Konsol admin vendor + langganan/suspensi** (2.8, K1).
17. **Virtualisasi tabel WTB** (P5) — begitu ada pelanggan dengan klien grup nyata.
18. **Prisma 6→7** sebelum armada melewati ~10 instance.

### Gelombang 3 — Optimasi (dipicu data, bukan kalender)
19. Savings Plan/Graviton bila tenant stabil ≥ 5.
20. Konsolidasi 3A bila tenant > 30 **atau** biaya infra > 15% MRR.
21. Payment gateway bila pelanggan > 15.

---

## 7. Risiko utama

| Risiko | Kemungkinan | Dampak | Mitigasi |
|---|---|---|---|
| Review pengacara menemukan kewajiban PDP/PP 71 yang mengubah arsitektur | Sedang | Tinggi | Mulai review di Gelombang 0, bukan sebelum go-live. Silo + `ap-southeast-3` sudah posisi paling konservatif yang tersedia |
| Firma pertama meminta SLA yang tak bisa dipenuhi satu orang | **Tinggi** | Sedang | Jual sebagai *pilot dengan dukungan best-effort tertulis*; jangan menandatangani SLA 99,9% dengan on-call satu orang. Naikkan hanya setelah 2.4/2.5 jalan |
| Kehilangan data pada satu tenant | Rendah | **Fatal** — bisa mengakhiri produk | 1.4 + 1.5 + 2.5 adalah item roadmap dengan prioritas absolut. Jangan onboard data klien nyata sebelum restore drill EC2 lulus |
| Klien grup besar membuat aplikasi terasa lambat | Sedang | Sedang | P5 sudah teridentifikasi & terukur; tabel kapasitas §19.4 memberi ambang kapan naik instance |
| Beban dukungan melampaui kapasitas pada 5–8 tenant | **Tinggi** | Sedang | Justru inilah alasan Gelombang 1 (#6–8) mendahului Gelombang 2 |
| Fitur LLM menghalangi penjualan karena transfer lintas batas | Sedang | Rendah | Sudah *graceful-off* tanpa `LLM_API_KEY`. Jual dengan LLM **mati secara default**; nyalakan hanya dengan consent tertulis per firma |
| Klien ter-regulasi OJK masuk lebih cepat dari perkiraan | Rendah | Tinggi | Tolak sampai kajian POJK terpisah selesai — jangan asumsikan profil non-regulasi berlaku |

---

## 8. Alternatif terkuat yang tidak dipilih

**Bangun multi-tenant pooled sekarang, sekalian, mumpung basis kode masih dipegang penuh.**

Argumen terbaiknya nyata: menambal tenancy belakangan pada 30 instance produksi jauh lebih mahal
daripada mengerjakannya hari ini pada satu instance; dan pooled membuka fitur lintas-tenant
(benchmarking industri) yang tak mungkin di silo.

Alasan tidak dipilih: ia menunda pendapatan pertama 4–7 bulan **dan** mempertaruhkan subsistem
rantai audit — satu-satunya bagian sistem yang cacatnya tidak bisa "diperbaiki di rilis berikutnya",
karena bukti audit yang rantainya putus tidak bisa dipulihkan secara retroaktif. Ditambah,
pertanyaan yang belum terjawab bukan "bisakah kita membangunnya" melainkan **"apakah KAP mau
membayar"** — dan itu hanya bisa dijawab dengan menjual, bukan dengan membangun. D1–D3 menjaga
pintu ke pooled tetap terbuka dengan biaya beberapa hari kerja, bukan beberapa bulan.

---

## 9. Batasan evaluasi ini — yang saya TIDAK tahu

Dinyatakan eksplisit agar tidak dibaca lebih kuat dari yang seharusnya:

1. **Angka biaya AWS adalah estimasi**, disusun dari struktur harga yang saya ketahui, **bukan**
   dari AWS Pricing Calculator untuk `ap-southeast-3` pada tanggal ini. Verifikasi sebelum dipakai
   menetapkan harga. Arah kesalahan yang paling mungkin: **under-estimate** pada data transfer dan
   CloudWatch bila trafik lebih besar dari asumsi ~10 GB/bulan.
2. **Angka harga jual sepenuhnya ilustratif.** Tidak ada riset harga kompetitor terverifikasi di
   dalam evaluasi ini. Jangan mempublikasikan paket §5.1 tanpa wawancara pelanggan.
3. **Kesimpulan hukum bukan legal opinion** — mewarisi batasan yang sama seperti
   `docs/PDP-COMPLIANCE-ASSESSMENT.md` dan `docs/HOSTING-DATA-RESIDENCY-REVIEW.md`.
4. **Estimasi durasi Gelombang** mengasumsikan satu pengembang penuh waktu dengan bantuan agen
   pada basis kode yang sudah dikenal. Skalakan sesuai kapasitas nyata.
5. **Angka kapasitas** diwarisi dari `docs/DEPLOY.md` §19 dan membawa batasannya: bukan EC2 nyata,
   closed-loop, render browser belum terukur.
6. Saya membaca skema, batas akses, pipeline audit, konfigurasi deploy, dan dokumen operasional —
   **tidak** seluruh ~200 modul halaman. Penilaian kelengkapan fungsional per modul mengacu pada
   `docs/PRD-KATALOG-EVALUASI-158-MODUL.md`, bukan pembacaan ulang saya.

**Bila evaluasi ini kelak terbukti salah, alasan yang paling mungkin adalah:** beban dukungan
per tenant ternyata jauh lebih besar dari perkiraan, sehingga batas skala tercapai pada 5 firma
alih-alih 30 — dan bottleneck-nya bukan AWS sama sekali, melainkan jam kerja manusia. Karena itu
Gelombang 1 memprioritaskan penghapusan kerja dukungan manual **sebelum** otomasi infrastruktur.

---

## 10. Referensi silang

- Runbook deploy & kapasitas: `docs/DEPLOY.md` (§10 batasan, §12.4 gap, §19 baseline)
- Residensi data: `docs/HOSTING-DATA-RESIDENCY-REVIEW.md`
- Kepatuhan PDP: `docs/PDP-COMPLIANCE-ASSESSMENT.md`, `docs/DATA-HANDLING-COMMITMENT.md`, `docs/DATA-RETENTION-POLICY.md`
- Onboarding & pilot: `docs/PILOT-ONBOARDING-PLAN.md`
- Kesiapan pentest: `docs/PENTEST-READINESS.md`
- Insiden & rotasi kunci: `docs/INCIDENT-RESPONSE.md`, `docs/KEY-ROTATION.md`
- Utang dependensi: `docs/UPGRADE-BACKLOG.md`
- Penyimpanan lampiran: `docs/SPIKE-S3-STORAGE.md`
- Infrastruktur: `deploy/aws-ec2-test/README.md`, `deploy/aws-ec2-test/terraform/`
