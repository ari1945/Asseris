# PRD — Restrukturisasi Navigasi & Beranda Berbasis Peran

> Revisi pasca sign-off. Keputusan §11 draf awal sudah dijawab Ari (2026-07-01) — dokumen ini
> mencerminkan scope FINAL yang disetujui, bukan lagi rekomendasi minimal.

| Field | Isi |
|---|---|
| Tanggal | 2026-07-01 (revisi 2, pasca "Proceed.") |
| Pemilik | Ari Widodo |
| Status | **Approved — Fase 0-3 SELESAI & live-verified (RBAC 2 peran baru, grup SA salah-tempat, closure baca-personal 10 dokumen). Berhenti di sini atas permintaan Ari untuk ditinjau sebelum Fase 4-8 (agregasi tugas, Beranda, kurasi sidebar, routing).** |
| Sumber masalah | Permintaan Ari: sidebar kompleks, grup SA salah tempat, tak ada titik masuk berbasis peran + 5 keputusan scope (lihat §0) + temuan celah data personal terbuka (§1‑P4) |
| Standar | Bukan prosedur audit teknis — restrukturisasi UX/IA & RBAC. |
| Basis kode | `migration/src` (ESM) + `server/src` (Prisma/tRPC) — scope kini menyentuh KEDUANYA, bukan cuma frontend. |
| Modul terdampak | `icons.tsx`, `shell.tsx`, `app.tsx`, `rbac.ts` (dua sisi), `contexts.tsx`, `data_part1.ts` (STAFF), `server/src/seed.ts`, `server/src/router.ts`/endpoint baru, `view_payroll.tsx` + 6 modul People&Compliance lain, `view_dashboard.tsx`, modul baru `view_home.tsx` |

---

## 0. Keputusan scope (jawaban Ari, 2026-07-01) atas Open Questions draf-1

| # | Pertanyaan | Jawaban Ari | Konsekuensi |
|---|---|---|---|
| 1 | Lingkup peran non-auditor | **Perlu peran baru** | RBAC berkembang dari 4→6 peran. Bukan lagi "PRD terpisah" — masuk scope ini. |
| 2 | Kedalaman "Tugas Saya" lintas-perikatan | **Agregasi penuh** | Endpoint backend baru wajib (Fase 4), bukan opsi minimal "daftar + link". |
| 3 | Payroll self-service | **Ya, self-service** | Payroll pindah dari firm-wide-read-semua ke per-user, kecuali peran HR/oversight. |
| 4 | Grup Firma default-visible untuk Senior/Junior | **People & Compliance, terbatas milik user** | Ini jawaban DATA-scope, bukan sidebar-scope — lihat §1 pergeseran model. Grup TETAP tampil, tapi isinya difilter ke baris milik user. |
| 5 | Default landing setelah login | **Semua peran ke Beranda baru** | Termasuk Partner/Manager — Firm Dashboard lama jadi panel di dalam Beranda, bukan default. |

**Dua keputusan tambahan yang saya ambil sebagai default (diumumkan, bukan didiamkan — koreksi bila salah):**
- **Jumlah persona baru = 2**, dipecah per kelompok modul yang sudah ada di kode (bukan satu "Admin" generik): **Admin & HR Firma** (menguasai grup People & Compliance) dan **Finance Firma** (menguasai grup Firm Finance/ERP + WIP/Billing). Lihat §1‑P4 tabel rasional.
- **Payroll dikerjakan LEBIH DULU** di antara 7 modul yang butuh pola self/all (Fase 3), karena ditemukan sebagai celah data terbuka saat riset (§1‑P4) — bukan ditambal sebagai patch darurat terpisah di luar urutan PRD, karena perbaikannya secara teknis identik dengan pekerjaan self-service yang memang sudah di-scope.

---

## 1. Problem

*(P1-P3 dari draf awal tetap berlaku — lihat riwayat commit dokumen ini. Ditambah satu problem baru yang ditemukan saat verifikasi teknis untuk keputusan #3/#4:)*

### P4 — Data personal firma-wide terbuka ke seluruh peran (BARU, ditemukan 2026-07-01)

Diverifikasi langsung ke kode, bukan dugaan: [`view_payroll.tsx:38-53`](migration/src/view_payroll.tsx) me-render `AMS.STAFF` + `AMS.PAYROLL` (gaji, tunjangan, BPJS, PPh 21, take-home **seluruh 10 staf**) dengan **nol** filter — tak ada `useAuth()`, tak ada `can(CAP...)`, tak ada pencocokan user aktif di file ini sama sekali. Modul `payroll` berada di grup "People & Compliance" (workspace Firma) yang terjangkau oleh **keempat** peran RBAC yang ada — artinya **hari ini, Junior Auditor bisa membuka gaji Partner-nya sendiri**. `rbac.ts` `capForWrite` memang men-gate TULIS ke `FIRM_ADMIN` (default scope=`firm`), tapi tak ada gate BACA setara — pola yang konsisten dengan desain W7.5 "roster firma tetap terlihat semua" yang sengaja dipakai untuk data non-sensitif (nama klien, dsb), namun secara tak sengaja ikut menutupi data personal sensitif (gaji).

**Dampak:** ini bukan cuma soal UX — ini eksposur data personal (kompensasi) lintas-staf tanpa dasar kebutuhan-tahu (need-to-know). Independen dari PRD ini, celah ini sudah ada sebelum permintaan restrukturisasi masuk.

**Kaitan dengan jawaban #3/#4 Ari:** memperbaiki ini **adalah** pekerjaan self-service yang diminta — bukan pekerjaan tambahan. Karena itu diprioritaskan sebagai modul PERTAMA di Fase 3, bukan modul terakhir.

---

## 2. Objective

*(diperluas dari draf awal)* Selain satu titik masuk berbasis peran (Beranda), objective kini eksplisit mencakup: (a) memberi identitas login pada fungsi non-auditor firma (Admin&HR, Finance) yang selama ini tidak terwakili di sistem sama sekali, dan (b) mengganti model "data firma = terlihat semua peran" dengan model "data personal = milik-sendiri kecuali punya alasan oversight" — menutup P4 sebagai bagian dari pekerjaan, bukan proyek terpisah.

## 3. Success Criteria (terukur — superset draf awal)

1. **RBAC 6 peran hidup:** `ROLES` berisi 6 nilai; 2 akun seed baru bisa login (`server/src` `auth.login`); masing-masing mendapat Beranda dengan komposisi berbeda dari 4 peran auditor (nol panel "Perikatan Saya" untuk 2 persona baru).
2. **P4 tertutup, terverifikasi negatif:** login sebagai Junior/Fajar → buka `payroll` → hanya melihat baris miliknya sendiri. Login sebagai Admin&HR Firma atau Partner → melihat semua baris. Pola yang sama dibuktikan bekerja di 6 modul lain (CPE, Cuti, Kinerja, Independence, Ethics, Sanksi) dengan uji negatif sejenis (bukan cuma uji positif "punya akses").
3. **Agregasi lintas-perikatan benar & terisolasi:** untuk user dengan ≥2 keanggotaan perikatan (mis. Dimas — ENG-2025-014 & ENG-2025-031), Beranda menampilkan gabungan tugas dari **kedua** perikatan dalam satu daftar; user LAIN yang bukan anggota salah satu perikatan tsb TIDAK melihat task dari perikatan itu (uji isolasi negatif, bukan cuma uji fungsi).
4. **P2 selesai:** grup "SA · Area Khusus & Perikatan" pindah ke `HIDDEN_GROUPS`; 5 modul Jasa Non-Audit dapat chip `RELATED_SA` baru; nol modul jadi tak-terjangkau (⌘K + Matriks Kepatuhan dibuktikan, bukan diasumsikan).
5. **P1 selesai:** jumlah grup Firma default-visible turun untuk Senior/Junior/2-persona-baru dibanding Partner/Manager; capability (`can()`) tak berkurang untuk siapa pun — hanya default tampilan; escape hatch "tampilkan semua" tersedia & berfungsi.
6. **Routing universal:** keenam peran mendarat di `'home'` setelah login (bukan `'dashboard'`); Firm Dashboard classic tetap reachable 1 klik untuk Partner/Manager.
7. **Live-verified ≥3 peran non-seragam** (bukan cuma Partner) termasuk **minimal 1 dari 2 persona baru**.
8. **Nol regresi:** `typecheck`/`lint`/`test`/`build` hijau di `migration/` **dan** `server/`; `AMS_CANON` tak tersentuh; kontrak sign-off (`SIGNOFF_KEYS`/`guardSignoffWrite`) tak tersentuh.

## 4. Scope

- RBAC: 2 peran baru + capability baru (mis. `HR_MANAGE`) + wiring `capForWrite`/`can()` di kedua sisi (`migration/src/rbac.ts` & `server/src/rbac.ts`, SSOT).
- Data/seed: 2 `STAFF` baru (`data_part1.ts`), 2 akun login baru (`server/src/seed.ts`), password dev sesuai konvensi tabel BUILD.md.
- Pola self/all: helper reusable + penerapan ke 7 modul (Payroll dulu, lalu CPE/Cuti/Kinerja/Independence/Ethics/Sanksi).
- Backend: endpoint agregasi tugas lintas-perikatan baru, isolasi W7.5-consistent.
- Frontend: modul `view_home.tsx` baru (komposisi berbeda per kelompok peran — auditor vs 2 persona baru vs oversight), kurasi sidebar per peran (`groupsVisibleFor`), perbaikan grup SA salah-tempat, routing login universal.
- Gate & verifikasi live lintas-peran penuh.

## 5. Non-Scope (dipersempit dari draf awal — banyak yang tadinya di-exclude kini MASUK scope)

- **UI admin untuk CRUD role/capability** (menambah/mengubah peran lewat UI pengaturan) — mapping role→capability tetap di kode (`GRANTS`), bukan dikonfigurasi via UI. Menambah peran baru berikutnya (di luar 2 ini) tetap kerja developer, bukan self-service admin.
- **Modul self/all di luar 7 yang disebut** — mis. `hcm`/`orgchart`/`recruitment`/`learning`/`succession` (data organisasi, bukan data personal sensitif) tetap firm-wide-visible seperti sekarang; tak diaudit ulang di PRD ini kecuali ditemukan celah setara P4 saat implementasi (bila ditemukan, dilaporkan dulu, tak diam-diam diperluas).
- **Proses approval berlapis baru** untuk cuti/kinerja/payroll-run — reuse status yang sudah ada (draft/approved/paid, dsb), tak membangun workflow baru.
- **Mengubah `AMS_CANON`** atau kontrak sign-off — nol sentuhan (tetap seperti draf awal).
- **Membongkar Firm Dashboard atau My Tasks lama** — tetap di-reuse sebagai komponen/endpoint dasar, bukan dihapus (peran lama `tasks`/`dashboard` tetap ada sebagai modul, Beranda memanggil/merangkumnya).

## 6. Constraints

- **Orang:** solo (Ari). **Sistem:** ESM-only + backend Node/tRPC/Prisma; aturan emas anti-tabrakan tetap berlaku di sisi frontend.
- **Schema:** dikonfirmasi `server/prisma/schema.prisma:38` — `User.role` adalah `String` bebas, **bukan** enum Prisma. Menambah 2 nilai peran baru **tidak butuh migrasi skema** — murni perubahan `ROLES`/`GRANTS` (aplikasi) + baris seed baru. Risiko migrasi destruktif untuk bagian ini rendah.
- **Isolasi:** endpoint agregasi baru (Fase 4) WAJIB reuse `assertEngagementAccess`/`accessibleEngagementIds` W7.5 — dilarang membuka jalur baca perikatan baru yang belum melalui pagar isolasi ini.
- **Mutu:** gate `typecheck`(full strict)/`lint`(ratchet no-explicit-any)/`test`/`build` hijau di **migration/ dan server/**; canon tetap.
- **Bahasa:** UI Bahasa Indonesia; persist `AMS_PERSIST_SCOPE` sesuai data (user untuk preferensi personal, engagement untuk data kerja, firm untuk roster).

## 7. Existing Solutions (reuse — tak berubah dari draf awal, masih berlaku penuh)

| Yang ada | Peran di PRD ini |
|---|---|
| `WORKSPACES`/`GROUP_WS`/`HIDDEN_GROUPS`/`RELATED_SA` | Diperluas (P1/P2), bukan diganti. |
| `EngagementMember` + `accessibleEngagementIds` (W7.5) | Basis isolasi endpoint agregasi Fase 4 + panel "Perikatan Saya". |
| `cpeFromTraining()` | Sumber SKP personal — tinggal difilter self/all. |
| Firm Dashboard portlets | Reuse sebagai panel oversight di dalam Beranda utk Partner/Manager. |
| Komponen My Tasks (`TaskRow`, bucket jatuh-tempo) | Reuse bentuk render; sumber data diganti endpoint Fase 4 utk konteks Beranda. |
| Pola chip "Standar Terkait" (drawer, tak paksa pindah workspace) | Basis jembatan P2. |

## 8. Proposed Approach

**Dua persona baru (default — lihat §0 untuk status "diumumkan, bisa dikoreksi"):**

| Persona | Menguasai (grup modul existing) | Capability baru yang diusulkan |
|---|---|---|
| **Admin & HR Firma** | People & Compliance penuh (hcm, orgchart, recruitment, learning, succession, payroll, leave, performance, cpe, ethics, independence, hrcase) | `HR_MANAGE` — baca-semua + tulis di 7 modul self/all Fase 3, plus modul organisasi (hcm/orgchart/dst) yang sudah firm-wide. |
| **Finance Firma** | Firm Finance/ERP (firmgl, apar, revenue, treasury, cashbank, fixedassets, firmtax, profitability) + WIP/Billing dari Practice Operations | Grant `FIRMFIN_EDIT` yang sudah ada (saat ini Partner-only) ke peran ini juga. |

Kedua persona **tidak** mendapat `ENGAGEMENT_VIEW_ALL`/akses workspace Perikatan secara default (mereka tak pernah jadi anggota perikatan) — Beranda mereka murni firm-ops, tanpa panel "Perikatan Saya"/"Tugas Saya" versi audit.

**Urutan teknis (mengikuti Fase 1-8 di task list, ringkas):** perbaikan sidebar SA (murah, independen) → fondasi RBAC/seed 2 peran baru (schema-safe, lihat §6) → pola self/all mulai dari Payroll (menutup P4) lalu 6 modul lain → endpoint agregasi backend (bagian paling mahal & paling sensitif isolasi) → modul Beranda yang merangkai semua itu per-komposisi-peran → kurasi sidebar per peran → routing universal → gate & verifikasi live lintas-peran.

**Alternatif yang ditolak:** satu role generik "Admin" tanpa pemisahan HR/Finance — ditolak karena kapabilitas yang dibutuhkan (siapa boleh approve payroll vs siapa boleh lihat kas firma) sudah berbeda di `rbac.ts` yang ada (`FIRMFIN_EDIT` vs kandidat `HR_MANAGE`); memisahkan sejak awal menghindari role generik yang jadi tong sampah capability nantinya.

## 9. Risks

| Risiko | Mitigasi |
|---|---|
| **P4 (celah gaji) belum tertutup sampai Fase 3 selesai** — ada jeda waktu selama Fase 0-2 berjalan di mana celah masih hidup di kode | Diprioritaskan sebagai modul PERTAMA Fase 3 (bukan Fase 3 penutup); Fase 1-2 tak memperbesar radius (murni sidebar+RBAC-plumbing, tak menyentuh payroll). |
| Kapabilitas baru (`HR_MANAGE`) salah desain (terlalu luas/sempit dibanding kebutuhan nyata 7 modul) | Uji negatif eksplisit per modul di Success Criteria #2 — bukan cuma "fitur muncul", tapi "yang tak boleh lihat, benar-benar tak bisa lihat". |
| Endpoint agregasi baru (Fase 4) jadi jalur bocor isolasi W7.5 | Wajib reuse `assertEngagementAccess` yang sama, bukan query independen; uji isolasi negatif eksplisit (Success Criteria #3). |
| 2 persona baru menabrak asumsi "selalu ada `activeEngagement`" di hook/komponen lama | Dicek saat Fase 5-6: pastikan Beranda & sidebar mereka tak pernah memanggil path yang mengasumsikan `activeEngagementId` terisi. |
| Scope besar (9 fase, backend+frontend+RBAC) dikerjakan tergesa → regresi senyap | Dikerjakan bertahap dengan gate hijau per fase (task list Fase 0-8), bukan satu commit raksasa; checkpoint dilaporkan ke Ari per fase, bukan di akhir saja. |
| Siapa mengelola akun 2 persona baru ke depannya (aktivasi/nonaktivasi) | Default: tetap `FIRM_ADMIN` (Partner) — sama seperti pengelolaan akun 4 peran lain hari ini; tak membangun UI admin baru (lihat §5 Non-Scope). |
| Verifikasi live keliru hanya pakai Partner (pola berulang di proyek ini) | Success Criteria #7 mewajibkan ≥3 peran termasuk 1 persona baru. |

## 10. Implementation Plan

Lihat task tracker (Fase 0-8, ID #1-#9) — dependensi: Fase 3 butuh Fase 2; Fase 5 butuh Fase 2+3+4; Fase 6 butuh Fase 2; Fase 7 butuh Fase 5; Fase 8 butuh semuanya. Fase 1 (sidebar SA) independen, dikerjakan kapan saja.

*Estimasi kasar (naik dari draf awal karena scope penuh): ~7-10 hari kerja terfokus* — RBAC+seed (~1 hari), self/all 7 modul (~2 hari), endpoint agregasi+isolasi (~1.5 hari), modul Beranda multi-komposisi (~2 hari), kurasi sidebar+routing (~1 hari), gate+live-verify (~1 hari), sidebar SA (~0.5 hari, independen).

## 11. Open Questions tersisa

Kelima OQ draf-1 sudah terjawab (§0). Dua hal yang saya jalankan dengan default eksplisit (bukan pertanyaan blocking, tapi silakan koreksi kapan saja sebelum/selama implementasi):

1. **Nama & pemisahan 2 persona** (Admin&HR Firma / Finance Firma) — benar sesuai kebutuhan, atau perlu dipecah lagi (mis. HR terpisah dari Admin/backoffice-procurement-legal)?
2. **Nama capability baru** (`HR_MANAGE`) — bebas saya pilih namanya selama polanya benar (baca-semua vs baca-sendiri), kecuali Ari punya preferensi penamaan.

---
**Status:** berjalan. Progres dilacak via task tracker, dilaporkan ke Ari per checkpoint fase.
