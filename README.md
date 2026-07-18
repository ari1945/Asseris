# Asseris

**Platform audit laporan keuangan untuk Kantor Akuntan Publik (KAP).** Aplikasi web berbahasa Indonesia yang menstandarkan metodologi audit, meningkatkan kualitas kertas kerja, dan menyatukan siklus perikatan — dari akseptasi klien, perencanaan, penilaian risiko, eksekusi prosedur, hingga pelaporan opini, arsip, dan kendali mutu — di atas **satu sumber kebenaran perhitungan (SSOT)** yang deterministik.

> Sasaran jangka panjang: berfungsi sebagai *operating system* setingkat ERP untuk firma audit — bukan sekadar alat kertas kerja.

---

## Daftar Isi

- [Apa itu Asseris](#apa-itu-asseris)
- [Fitur & cakupan modul](#fitur--cakupan-modul)
- [Arsitektur](#arsitektur)
- [Struktur repositori](#struktur-repositori)
- [Menjalankan secara lokal](#menjalankan-secara-lokal)
- [Akun dev](#akun-dev)
- [Kualitas & gerbang CI](#kualitas--gerbang-ci)
- [Deploy](#deploy)
- [Postur keamanan & privasi](#postur-keamanan--privasi)
- [Dokumentasi](#dokumentasi)
- [Status & lisensi](#status--lisensi)

---

## Apa itu Asseris

Asseris adalah *single-page application* (SPA) React untuk pelaksanaan audit yang **taat SPAP / Standar Audit (SA) Indonesia** dan **PSAK**. Prinsip desain intinya:

- **SSOT / "sumber kebenaran tunggal".** Seluruh angka audit (materialitas, PSAK 22/46/48/58/65/71/73, rekonsiliasi, arus kas forensik) berasal dari neraca saldo (WTB) melalui **satu mesin hitung kanonik** (`AMS_CANON`). Tidak ada angka yang di-*hardcode* atau disalin — mengubah WTB menyinkronkan seluruh modul.
- **Auditable by construction.** Status kertas kerja, sign-off, dan opini diturunkan dari state SSOT; setiap perubahan tercatat pada **jejak audit ter-*hash-chain*** di sisi server (SHA-256 berantai, *append-only*, dapat diverifikasi).
- **Segregation of duties (SoD) berbasis peran.** Aksi otoritatif (sign-off reviewer, penerbitan opini, EQR, akseptasi klien, penerbitan surat perikatan) dipagari oleh **kapabilitas peran** yang ditegakkan **dua lapis** — di UI *dan* di server.
- **Isolasi data per-perikatan.** Seorang pengguna hanya menyentuh data kerja perikatan bila ia anggota tim perikatan tersebut, atau perannya punya hak *oversight* (Rekan/Manajer).

Aplikasi berbahasa Indonesia sepenuhnya, dengan format mata uang lokal id-ID (mis. `Rp 1.850.000.000`, nilai negatif dalam kurung).

---

## Fitur & cakupan modul

Sekitar 150+ modul halaman, dikelompokkan ke dalam alur siklus audit:

| Fase | Cakupan |
|---|---|
| **Akseptasi & keberlanjutan** | Onboarding klien, register keberlanjutan (ISQM 1 / SA 220), surat perikatan (SA 210), gerbang pra-akseptasi |
| **Perencanaan** | Strategi audit & memo (SA 300/330), materialitas (memo tersegel), penilaian RoMM (SA 315/330), matriks asersi manajemen, risiko portofolio lintas-klien |
| **Eksekusi** | Ingress neraca saldo (WTB), integritas & pemetaan CoA, kertas kerja + register bukti (SA 500), sampling (SA 530), konfirmasi (SA 505), estimasi (SA 540), fraud (SA 240), pihak berelasi (SA 550), peristiwa kemudian (SA 560), going concern (SA 570), pakar (SA 620), NOCLAR (SA 250), organisasi jasa (SA 402) |
| **PSAK** | Perhitungan kanonik PSAK 22/46/48/58/65/71/73 (kombinasi bisnis, pajak tangguhan, penurunan nilai, konsolidasi, ECL, sewa) + generator laporan keuangan |
| **Pelaporan** | Opini (sign-off berlapis), management letter (SA 260/265), catatan reviu, generator LK 4-laporan |
| **Kendali mutu & arsip** | Gerbang siklus-hidup perikatan, *assembly lock*, jejak audit ter-*hash-chain*, ekspor tersegel |
| **Firma & operasi** | Dashboard firma, penjadwalan/Gantt, WIP & profitabilitas, waktu & anggaran, keuangan firma, SDM (rekrutmen/pembelajaran/suksesi/HCM, ter-kunci peran), data personal per-pengguna |
| **Diagnostik & AI** | Mesin diagnostik pajak deterministik (Benford + book-tax + sintesis JET/RPT/rekonsiliasi); narasi LLM opsional melalui proxy server |
| **Integrasi** | Kerangka konektor sisi-server (bank feed → rekonsiliasi, dengan gerbang total-kontrol & posting idempoten); Coretax/e-Faktur → pajak firma |
| **Ekspor & segel** | Ekspor PDF (memo materialitas, LK, opini) & XLSX (register WTB/AJE/risiko/aset tetap/jejak audit); segel provenans Ed25519 + UI verifikasi |

---

## Arsitektur

Dua paket yang bekerja bersama:

```
┌─────────────────────────┐        /trpc         ┌──────────────────────────┐
│  migration/  (frontend)  │ ───────────────────► │  server/  (backend)       │
│  Vite + React 18 + TS    │ ◄─────────────────── │  Node + tRPC + Prisma     │
│  SPA, ESM, HMR :5180     │   Bearer / cookie    │  SQLite (dev) / PG (prod) │
└─────────────────────────┘                      │  :5181 (localhost)        │
                                                  └──────────────────────────┘
```

### Frontend — `migration/`
- **Vite + React 18 + TypeScript.** *Single-page app* dirakit dari ratusan modul (`migration/src/*`) melalui satu entri `main.jsx` dengan urutan boot tepat.
- **Lapisan kanon = TypeScript penuh (`strict`).** `canon*.ts` + `forensic_canon.ts` + tipe/ selektor — gerbang `tsc --noEmit` wajib 0 error, permukaan tanpa `any`.
- **View = `.jsx/.tsx`,** menarik tipe via `canon_selectors`. Persistensi state melalui hook `useAmsPersist` → server (dengan *cache* localStorage untuk *instant paint* + *compare-and-swap* optimistik).

> **Catatan arsitektur:** aplikasi kini **ESM-only**. `migration/` adalah **sumber kebenaran**. Berkas buildless lama di root (`NeoSuite AMS.html`, `app/*`, `build/`) adalah **referensi beku** — tidak diedit, tidak dibangun, tidak dikirim.

### Backend — `server/`
- **Node + tRPC + Prisma.** State perikatan (SSOT) disimpan sebagai **StateDoc berversi** dengan *atomic compare-and-swap*, bukan localStorage.
- **Auth nol-vendor:** scrypt (hash kata sandi) + TOTP RFC 6238 (HMAC-SHA1) — hanya *built-in* Node, tanpa dependensi kripto native.
- **RBAC** dari peta kapabilitas bersama (SSOT tunggal yang dikonsumsi UI *dan* server).
- **Jejak audit** *append-only* ter-*hash-chain* + endpoint verifikasi.
- **Proxy LLM** (kunci API di env server, RBAC + rate-limit + redaksi *egress* + audit penggunaan).
- **Observability:** `GET /healthz` (cek DB) + `GET /metrics` (teks Prometheus).
- **Database:** SQLite untuk dev nol-ops; *flip* mekanis ke PostgreSQL saat build image Docker.

---

## Struktur repositori

```
/  (root)
  migration/            ⭐ SUMBER KEBENARAN — frontend Vite + React + TS
    src/                    ~311 modul (canon, view_*, data, contexts, ui, shell)
    index.html              entri Vite → src/main.jsx
    package.json            skrip dev/build/lint/typecheck/test
  server/               backend Node + tRPC + Prisma
    src/                    router, auth, rbac, audit, llm, integrations, export
    prisma/                 schema + dev.db (SQLite)
  docs/                 dokumentasi operasional (deploy, keamanan, privasi, panduan)
  deploy/               artefak deploy (mis. provisioning EC2)
  tools/                utilitas (mis. generator Engagement Pack Excel)
  .github/workflows/    CI (typecheck/test/lint/build, deploy-smoke, restore-drill, …)
  docker-compose.yml    app + postgres:16
  BUILD.md              panduan build & alur kerja lengkap (rujukan utama pengembang)
  CLAUDE.md             onboarding agen / konvensi arsitektur
  PRD - *.md            catatan produk per-fitur

  NeoSuite AMS.html, app/, build/   ⚠ REFERENSI BEKU (arsitektur buildless lama)
```

---

## Menjalankan secara lokal

**Prasyarat:** Node ≥ 18.

### 1. Backend (`server/`)

```powershell
cd server
npm install
npm run prisma:generate
npm run db:push          # buat/sinkron dev.db (SQLite)
npm run seed             # isi entitas inti + WTB + akun dev
```

### 2. Frontend + backend bersamaan (`migration/`)

```powershell
cd migration
npm install
npm run dev:all          # concurrently: server (:5181) + Vite (:5180)
```

Buka **http://localhost:5180**, lalu login dengan salah satu akun dev di bawah.

> `npm run dev` saja (tanpa backend) tetap jalan — hook persistensi *degrade* ke *cache-only*; Anda hanya kehilangan sinkronisasi lintas-browser.

> Setelah mengubah `schema.prisma`: `npm run prisma:generate && npm run db:push && npm run seed`.

---

## Akun dev

Diisi oleh `npm run seed`. **Ini kata sandi dev — BUKAN untuk produksi.**

| Peran | Email | Kata sandi |
|---|---|---|
| Engagement Partner | `hartono.w@whr-cpa.id` | `Partner#2025!` |
| Audit Manager | `anindya.p@whr-cpa.id` | `Manager#2025!` |
| Senior Auditor | `dimas.r@whr-cpa.id` | `Senior#2025!` |
| Junior Auditor | `fajar.n@whr-cpa.id` | `Junior#2025!` |

Demo isolasi data: semua akun anggota `ENG-2025-014`; Senior juga anggota `ENG-2025-031` (sehingga Junior→031 ditolak, Senior→031 diizinkan).

---

## Kualitas & gerbang CI

Semua gerbang wajib **hijau** sebelum merge:

**Frontend (`migration/`)**
```powershell
npm run lint         # no-undef + no-dupe-keys = 0 pada .js/.jsx
npm run typecheck    # tsc --noEmit — 0 error (kanon strict penuh)
npm run test         # vitest — jaring "mesin angka" kanon (+ --coverage untuk gerbang ≥80%)
npm run build        # vite build — tanpa gagal resolusi
```

**Backend (`server/`)**
```powershell
npm run typecheck    # tsc --noEmit — 0 error
npm run test         # vitest — StateDoc CAS + integrasi auth/RBAC + rantai audit
```

- **Jaring regresi numerik:** angka kanonik (materialitas OM 4.260 / PM 3.195 / CTT 213, PSAK 46/71/73, rekonsiliasi) *hard-pinned* ke `W0-BASELINE.md` + *snapshot*. Refactor apa pun yang menggeser angka kanonik akan menggagalkan uji.
- **Jaring matriks RBAC:** `rbac.test.ts` memaku matriks kapabilitas — mencegah hak sign-off/opini/EQR bocor ke peran lebih rendah.
- **`no-explicit-any` ratchet:** `:any` baru pada file yang belum di-*baseline* menggagalkan lint.
- **CI (`.github/workflows/`):** typecheck + test + lint + build, plus `deploy-smoke` (boot stack Postgres), `restore-drill` (uji restore backup mingguan), dan alerting uptime.

---

## Deploy

- **Kontainer + Postgres.** `server/Dockerfile` (konteks build = root repo, karena server mengimpor `migration/src`) + `docker-compose.yml` (app + `postgres:16`).
- **Flip Postgres mekanis:** schema repo tetap `sqlite` untuk dev nol-ops; build image mem-*flip* `provider` ke `postgresql` (tanpa SQL vendor-spesifik).
- **Jalankan lokal untuk validasi:**
  ```bash
  # compose membaca .env di sebelahnya (root repo); tidak ada yang di-commit — buat dulu:
  printf 'POSTGRES_PASSWORD=%s\nAPP_ENCRYPTION_KEY=%s\nCOOKIE_SECURE=1\n' "<pw-kuat>" "$(openssl rand -hex 32)" > .env
  docker compose up --build -d
  docker compose run --rm server npm run seed   # seed demo (DESTRUKTIF)
  curl -fsS localhost:5181/healthz              # harapkan 200
  ```
- **Sebelum dipercaya di prod:** set `APP_ENCRYPTION_KEY` + `POSTGRES_PASSWORD` + `COOKIE_SECURE=1` + `APP_SIGNING_KEY`, dan pasang terminator TLS di depan.

Rincian lengkap (RTO/RPO, backup off-box S3, rotasi kunci, kesiapan pentest) di **[`docs/DEPLOY.md`](docs/DEPLOY.md)**.

---

## Postur keamanan & privasi

- **Kustodi rahasia:** kunci LLM & enkripsi hanya di env server, tak pernah ke browser.
- **Kripto nol-vendor:** scrypt + TOTP (built-in Node); TOTP terenkripsi saat-diam (AES-256-GCM).
- **Sesi:** cookie httpOnly (SameSite=Strict), IP-allowlist opsional (*fail-closed*), lockout 5-gagal.
- **Jejak audit** ter-*hash-chain*, *append-only*, `detail` = metadata saja (tak pernah isi kertas kerja).
- **Segel ekspor** = provenans + integritas (Ed25519). **Bukan** e-Meterai (PERURI) / PSrE tersertifikasi — disclaimer wajib.
- **Privasi (UU PDP):** kajian awal terdokumentasi di `docs/PDP-COMPLIANCE-ASSESSMENT.md` dan lampiran — **bukan legal opinion; wajib direview penasihat hukum** sebelum klaim kepatuhan ke klien.

---

## Dokumentasi

| Dokumen | Isi |
|---|---|
| [`BUILD.md`](BUILD.md) | Panduan build & alur kerja lengkap (rujukan utama pengembang) |
| [`CLAUDE.md`](CLAUDE.md) | Onboarding agen — peta arsitektur, aturan anti-tabrakan, cara menambah modul |
| [`docs/DEPLOY.md`](docs/DEPLOY.md) | Runbook deploy, DR, backup/restore |
| [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) | Panduan pengguna |
| [`docs/PILOT-ONBOARDING-PLAN.md`](docs/PILOT-ONBOARDING-PLAN.md) | Rencana onboarding pilot |
| [`docs/KEY-ROTATION.md`](docs/KEY-ROTATION.md), [`PENTEST-READINESS.md`](docs/PENTEST-READINESS.md), [`INCIDENT-RESPONSE.md`](docs/INCIDENT-RESPONSE.md) | Operasi keamanan |
| `PRD - *.md` (root) | Catatan produk per-fitur (PRD-first sebelum build) |
| [`W0-BASELINE.md`](W0-BASELINE.md) | Angka kanonik acuan yang dipaku oleh uji |

---

## Status & lisensi

Pengembangan aktif. Arsitektur telah melewati migrasi ke ESM-only dan TypeScript bertahap (kanon strict penuh); backend, auth/RBAC, isolasi per-perikatan, jejak audit, proxy LLM, konektor, serta ekspor tersegel sudah terpasang. Lihat `BUILD.md` untuk status per-gelombang (W-series).

**Lisensi:** proprietary — hak cipta dilindungi. Tidak ada lisensi sumber terbuka yang diberikan; jangan salin, distribusikan, atau gunakan tanpa izin tertulis pemilik.
