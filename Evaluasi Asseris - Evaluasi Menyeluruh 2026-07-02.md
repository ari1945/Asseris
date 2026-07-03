# Evaluasi Menyeluruh Asseris (NeoSuite AMS)
**Tanggal:** 2026-07-02 · **Basis kode:** branch `feat/iac-terraform-ec2-provisioning` (HEAD `5047297`, mencakup master s.d. PR #57)
**Metode:** 5 jalur eksplorasi paralel (metodologi audit, arsitektur, database, keamanan, ops/kepatuhan) + verifikasi silang manual atas temuan kritis. Setiap klaim penting diverifikasi terhadap kode, bukan hanya dokumentasi.

---

## 1. Ringkasan Eksekutif

Asseris adalah platform audit laporan keuangan untuk KAP berbahasa Indonesia yang **secara metodologi sudah matang** (siklus audit A–K tercakup ±90%, SSOT kalkulasi ditegakkan, sign-off dua-lapis UI+server, audit trail hash-chained) dan **secara teknis sudah melewati fase prototipe** (TypeScript full-strict, backend nyata tRPC+Prisma, auth scrypt+TOTP, CI 5 workflow, restore drill mingguan otomatis, RTO/RPO terdokumentasi).

**Kesimpulan tingkat kesiapan:** layak untuk **pilot tertutup satu KAP (< 20 staf) dengan data non-sensitif atau klien terpilih yang sadar risiko** — tetapi **belum siap produksi penuh dengan data klien riil** karena empat blocker: (1) tata kelola UU PDP 0% operasional, (2) alerting/monitoring eksternal 0%, (3) belum pernah divalidasi di EC2 sungguhan (RTO total belum terukur), (4) belum ada pentest independen.

Skor akhir (rincian di §14): **Kesesuaian proses audit 82 · Fitur 78 · Arsitektur 72 · Kualitas kode 74 · Keamanan 70 · Kinerja 65 · Skalabilitas 45 · Maintainability 68 · Dokumentasi 85 · Kesiapan KAP 60 · Kesiapan Internal Audit 50 · Production readiness 58.**

---

## 2. Gambaran Sistem (Tahap 1)

**Tujuan:** operating system audit untuk KAP — standardisasi metodologi (SA/SPAP/ISQM), kualitas dokumentasi, manajemen perikatan, dan pertahanan mutu.

**Pengguna:** 6 peran RBAC — Partner, Manager, Senior, Junior, Admin & HR, Finance Firma — dengan Beranda role-based, sidebar terkurasi per peran, dan agregasi tugas lintas-perikatan (`tasks.mine`). Belum ada portal klien fungsional maupun peran reviewer eksternal terpisah (EQR memakai kapabilitas Partner).

**Arsitektur & teknologi:**
- **Frontend:** React 18.3.1 + Vite 5 + TypeScript full-strict (`migration/src`: 376 file — 197 `.tsx`, 160 `.ts`; 176 view). Lapisan: `data*.ts` (31 file master data) → `canon*.ts` (28 file mesin hitung SSOT, coverage gate 80%) → `contexts.tsx` (persist seam) → view.
- **Backend:** Node 22 + tRPC 11 + Prisma 6 (`server/src`, router 631 baris). 17 tabel, 18 index. SQLite dev → Postgres 16 prod (flip provider satu baris, migrasi `0_init` portable).
- **Persistensi:** `StateDoc` versioned key-value (scope firm/user/engagement) dengan optimistic CAS + conflict toaster; cache localStorage untuk first-paint; ~28 key engagement-scoped via `AMS_PERSIST_SCOPE`.
- **Keamanan inti:** scrypt + TOTP (AES-256-GCM at rest), sesi httpOnly SameSite=Strict, RBAC SSOT `rbac.ts` dipakai UI dan server, `guardSignoffWrite` server-side, audit trail append-only SHA-256 hash-chained, ekspor PDF/XLSX tersegel Ed25519 + verify-seal UI (live — catatan rotasi kunci di §9).
- **Integrasi:** framework konektor W9 (pull → control-total gate → idempotent post → reconcile; webhook HMAC). Bank feed **wired & live-proven**; Coretax/e-Faktur pipeline siap tapi adapter HTTP menunggu sertifikat PKP; konektor lain blueprint. **Tidak ada** integrasi ERP/GL umum, cloud storage, M365/Google.
- **Deploy:** single-tenant per KAP — EC2 + Docker Compose (Caddy edge TLS internal/ACME + rate-limit, server, Postgres) + Terraform provisioning (commit terbaru). CI: `ci.yml`, `deploy-smoke` + `edge-smoke`, `restore-drill` mingguan, `dependency-audit`.
- **Legacy beku:** `app/` + `NeoSuite AMS.html` (buildless era) tersimpan sebagai referensi — tidak dibangun/dikirim.

**Pola desain:** monolit pragmatis ber-SSOT — bukan clean architecture berlapis formal. Tidak ada DI container/repository pattern; Prisma langsung dari router. Event bus ringan via `window` CustomEvent. Pilihan ini sadar dan terdokumentasi; konsekuensinya dibahas di §8.

---

## 3. Temuan Positif

1. **SSOT kalkulasi ditegakkan sungguhan** — angka mengalir WTB → `AMS_CANON` → view; snapshot regression test menggagalkan perubahan angka tak sengaja; nol `as any` di jalur canon.
2. **Sign-off SA 230 dua-lapis nyata** — gate UI `can()` + server `guardSignoffWrite` per slot (Preparer=WP_EDIT, Reviewer=SIGNOFF_REVIEWER, Opini=OPINION_APPROVE Partner-only, EQR=EQR_REVIEW, Surat SA 210=FIRM_ADMIN); matriks dilindungi `rbac.test.ts` dari regresi. Defect SoD historis (P0) sudah diperbaiki dan diuji integrasi.
3. **Audit trail tamper-evident** — SHA-256 chain (seq monoton, prevHash→hash), `verifyAuditChain()` dipakai pasca-restore; detail metadata-only (tidak bocor isi WP).
4. **Isolasi per-perikatan (W7.5)** — `EngagementMember` + `assertEngagementAccess()` di server, teruji integrasi (Junior ditolak di perikatan bukan miliknya).
5. **Disiplin DR terbaik di kelasnya untuk tahap ini** — backup harian terenkripsi (kunci terpisah dari kunci aplikasi), retensi 30 hari, salinan off-box S3 opt-in, **restore drill dieksekusi nyata lalu diotomasi CI mingguan** (backup→destroy→restore→verifikasi chain), RTO mekanis terukur ~2 detik, RPO ≤24 jam (proposal).
6. **Fail-fast produksi (M2)** — boot menolak `NODE_ENV=production` tanpa `APP_ENCRYPTION_KEY`/`APP_SIGNING_KEY`/`COOKIE_SECURE=1`/password DB placeholder — dan ini **diuji di CI**.
7. **Konektor dengan gerbang total-kontrol** — data eksternal tidak diposting bila saldo awal + Σmutasi ≠ saldo akhir; idempoten by natural-key; live-proven untuk bank feed.
8. **Dokumentasi ops kelas produksi** — BUILD.md (917 baris), DEPLOY.md (364 baris, executable, jujur soal apa yang belum terbukti), KEY-ROTATION.md, PENTEST-READINESS.md.
9. **Cakupan siklus audit luas dan sebagian besar persist server** — dari akseptasi (4 gerbang + skor terbobot), materialitas (OM/PM/CTT + memo + approval), RoMM heatmap, WTB ingress CSV + integritas + pemetaan CoA + ledger drill, AJE tie-out, WP kanonik 38 ref + tickmark + review notes, SA 505/530/540/550/560/570/620 auditable, SAD, FS generator + opini (unmodified/qualified/adverse/disclaimer + KAM), management letter SA 265, EQR, gerbang fase lifecycle.

---

## 4. Temuan Kritis

| # | Temuan | Bukti | Dampak |
|---|--------|-------|--------|
| K1 | **UU PDP 27/2022: 0% operasional.** `view_pdp.tsx` hanya display (RoPA/DSR/breach dari seed); tidak ada workflow DSR, notifikasi insiden 3×24 jam, consent, atau penghapusan data | Verifikasi agen ops + memory gap #2 | Blocker legal untuk data klien riil — KAP memproses data pribadi pihak ketiga dalam jumlah besar |
| K2 | **Alerting & monitoring eksternal: 0%.** `/healthz` + `/metrics` ada, tapi tidak ada alert policy, uptime monitor, atau error tracking | Agen ops §3 | Insiden produksi (disk penuh, backup gagal, chain rusak) tidak akan diketahui sampai user mengeluh |
| K3 | **Belum pernah berjalan di EC2 sungguhan.** Semua live-test via Docker Compose lokal (WSL). RTO total (instance hilang) belum terukur; Secrets Manager & ACME belum live-verified AWS | DEPLOY.md §12.4–12.5 | Klaim kesiapan deploy belum terbukti end-to-end; Terraform baru di-commit dan `terraform-validate.yml` masih placeholder |
| K4 | **Rotasi `APP_SIGNING_KEY` mematahkan semua segel lama.** Kunci tunggal tanpa versioning verifikasi — `verifySeal()` → `key-rotated` untuk seluruh arsip | `signing.ts:95-99`, KEY-ROTATION.md §0 | Deliverable tersegel bertahun-tahun (arsip SA 230) tidak dapat diverifikasi setelah rotasi — bertentangan dengan tujuan segel |
| K5 | **Immutabilitas audit log hanya di lapisan aplikasi.** Tidak ada trigger/constraint Postgres yang menolak UPDATE/DELETE pada `AuditLog` | schema.prisma:133-149 | Admin DB (atau penyerang yang mendapat kredensial DB) dapat menulis ulang chain lalu re-hash; mitigasi saat ini hanya backup off-box |
| K6 | **TOTP plaintext bila `APP_ENCRYPTION_KEY` tidak diset** (dev/staging) — fail-closed hanya di `NODE_ENV=production` | `secretbox.ts:44-59` | Kebocoran DB staging = kompromi 2FA seluruh user |
| K7 | **Retensi & riwayat dokumentasi belum memenuhi SA 230 jangka panjang.** StateDoc hanya menyimpan nilai saat ini (tanpa snapshot historis); tidak ada kebijakan retensi ditegakkan (UU 5/2011 + PPPK menuntut retensi tahunan); tidak ada mekanisme *assembly lock* yang membekukan file audit setelah 60 hari | Agen DB §5 | File audit dapat berubah setelah tanggal laporan tanpa jejak versi per-dokumen (audit trail mencatat *bahwa* berubah, bukan *isi* sebelumnya) |
| K8 | **API key LLM (DeepSeek) hidup dalam plaintext di `server/.env.local`.** ✅ Diverifikasi **tidak pernah ter-commit** (`git log -S` seluruh history kosong; hanya `server/.env` berisi DSN SQLite yang ter-track). Tetap: kunci aktif tak terkelola di disk | Verifikasi manual | Risiko kebocoran lokal; harus pindah ke Secrets Manager saat produksi. Catatan: klaim agen keamanan "ter-commit di repo" **keliru** — sudah saya falsifikasi |
| K9 | **Tidak ada pentest independen** — PENTEST-READINESS.md siap, vendor belum ditunjuk | docs/ | Prasyarat wajar sebelum data klien riil |

---

## 5. Analisis Risiko

**Risiko tertinggi bukan teknis, melainkan kepatuhan-operasional:** aplikasi secara fungsional bisa dipakai audit sungguhan besok, tetapi begitu data klien riil masuk, KAP terekspos pada (a) UU PDP tanpa perangkat pemenuhan (K1), (b) insiden senyap tanpa alerting (K2), dan (c) kewajiban retensi dokumentasi yang belum bisa dipenuhi sistem (K7).

**Risiko integritas jangka panjang:** K4 (segel) dan K5 (audit log DB-level) sama-sama soal *durabilitas bukti* — nilai jual utama Asseris sebagai "tax/audit defense system". Keduanya murah diperbaiki sekarang, mahal diperbaiki setelah arsip menumpuk.

**Risiko skalabilitas (diterima secara sadar):** serialisasi `AuditLog.seq` in-process + scrypt CPU-bound membatasi ke satu instance ~150–170 ops/dtk (login p95 4,3 dtk @50 konkuren). Cukup untuk KAP ≤20 staf; menjadi masalah di atas ~50 staf atau multi-instance.

**Risiko model komersial:** single-tenant per instance = biaya ops linear terhadap jumlah KAP (N× backup, monitoring, upgrade). Wajar untuk pilot; keputusan multi-tenant harus diambil **sebelum** basis instalasi membesar.

---

## 6. Analisis Technical Debt (Tahap 8)

| No | Temuan | Dampak | Risiko | Prioritas | Estimasi |
|----|--------|--------|--------|-----------|----------|
| 1 | UU PDP workflow 0% (K1) | Blocker legal go-live data riil | Tinggi | Critical | 3–5 minggu (fase 1: DSR + breach log + retensi-hapus) |
| 2 | Alerting 0% (K2) | Insiden tak terdeteksi | Tinggi | Critical | 3–5 hari (uptime + alert rules dasar) |
| 3 | Validasi EC2 riil + RTO total (K3) | Klaim DR belum terbukti | Tinggi | Critical | 1 minggu (pakai Terraform yang baru di-commit) |
| 4 | Segel tanpa key-versioning (K4) | Arsip tak terverifikasi pasca-rotasi | Tinggi | High | 3–5 hari (arsip pubkey historis + verify per-era) |
| 5 | AuditLog tanpa proteksi DB-level (K5) | Chain bisa ditulis ulang admin DB | Sedang | High | 2–3 hari (trigger Postgres + alert + salinan WAL ke S3) |
| 6 | StateDoc tanpa riwayat + retensi SA 230 (K7) | Kepatuhan dokumentasi jangka panjang | Sedang-Tinggi | High | 2–3 minggu (snapshot/append versi + assembly lock 60 hari) |
| 7 | Baseline `:any` **8.227 suppression di 238 file** (terukur; angka agen 1.024/1.191 keliru) | Type safety semu di lapisan view/data | Sedang | Medium | Berkelanjutan (ratchet per-file saat file disentuh) |
| 8 | Router server monolitik 631 baris tanpa service layer | Maintainability, testability | Sedang | Medium | 1–2 minggu |
| 9 | View tanpa test render sama sekali (test ≈580–590 semuanya unit canon/server) | Regresi UI hanya ketahuan live | Sedang | Medium | 1–2 minggu (smoke render 10–15 view kritis) |
| 10 | View raksasa (`view_wp.tsx` 1.321 baris, `view_execution.tsx` 1.047, dst.) | Biaya perubahan tinggi | Rendah-Sedang | Medium | Bertahap |
| 11 | Legacy beku `app/`+`build/`+HTML evaluasi bercampur di root repo; `connectivity.json` stale | Kebingungan onboarding, false positive "TERISOLASI" | Rendah | Low | 1–2 hari (pindah ke `_archive/`) |
| 12 | `tasks.mine` O(perikatan) per-StateDoc read (paralel, bukan N+1 klasik) | Latensi kecil saat perikatan banyak | Rendah | Low | Opsional (batch query) |
| 13 | Read-then-write tanpa `$transaction` di `state.set` (fetch prevDoc → CAS) | Aman single-process; celah saat multi-instance | Rendah kini | Low | ½ hari |

---

## 7. Evaluasi Modul per Modul (Tahap 2–3)

Status per area siklus audit (bukti detail per file tersedia dari eksplorasi; kolom Persist = server StateDoc):

| Area | Status | Sorotan | Gap utama | Prioritas gap |
|------|--------|---------|-----------|---------------|
| A. Acceptance & Continuance | **Lengkap** | 4 gerbang + skor terbobot + PMPJ/KYC; continuance ISQM 1 dgn pemicu rotasi/PIE/fee dari kanon; gerbang etik/AML blokir sign-off | Threshold pemicu hardcode, safeguard berupa teks bebas | Medium |
| B. Engagement Letter | **Parsial** | Sign-off penerbitan surat SA 210 ter-jejak (FIRM_ADMIN, server-guarded) | Tidak ada generator dokumen, versioning, tanda tangan klien | High |
| C. Perencanaan | **Lengkap** | Materialitas OM/PM/CTT + memo + approval; RoMM heatmap 5×5 + fraud flag; strategi SA 300 approved-gated; ICFR/RCM COSO; timeline 9-milestone; T&B→WIP | Risiko belum auto-link ke prosedur program audit | High |
| D. TB & GL | **Lengkap** | Ingress CSV + integritas footing/balancing + pemetaan CoA + ledger drill + AJE tie-out + ekspor tersegel | Roll-forward antar periode belum otomatis; reklasifikasi tidak terpisah dari AJE | Medium |
| E. Working Papers | **Lengkap** | 38 ref kanonik, indexing tetap, prosedur ber-asersi, 5 tickmark, sign-off dua-lapis, review notes ber-thread | Tickmark bukan anotasi posisional; template tidak customizable per perikatan; version control per-WP tidak ada (lihat K7) | Medium |
| F. Prosedur Audit | **Lengkap** | SA 505 hub (kirim-terima-rekonsiliasi-validasi + populasi), SA 530 MUS sumbu-moneter, SA 540 (ECL/sensitivitas), SA 550/560/570/620 persist, JET SA 240 | Prosedur alternatif konfirmasi bukan workflow; sampling belum menarik populasi langsung dari WTB row | Medium |
| G. Bukti Audit | **Parsial** | Register bukti SA 500 (sumber/tier/asersi/hasil), meteran kecukupan-ketepatan, attachment per WP | **Tidak ada OCR, full-text search, DMS nyata**; file tidak di-hash/di-audit-trail per dokumen | High |
| H. Review | **Lengkap** | Review notes engagement-scoped + prioritas + clearance; gerbang fase sadar-progres (P5); integrasi My Tasks | Tanpa SLA/escalation otomatis | Low |
| I. Completion | **Lengkap** | SAD vs CTT/PM, going concern, subsequent, MRL, EQR ISQM 2, arsip = opini final + 100% review | EQR trigger seed-based (belum rule PIE otomatis); auto-assembly-lock 60 hari belum ada | High (lock) |
| J. Pelaporan | **Lengkap** | FS generator 4 laporan + tie-out, opini 4 tipe + KAM, management letter SA 260/265, ekspor PDF/XLSX **tersegel Ed25519 (live)** | SA 720 boilerplate; nomor laporan/watermark FINAL belum ada. Catatan: klaim satu agen "Ed25519 belum live" **salah** — W10.5 merged & live-smoked | Medium |
| K. Lintas | **Parsial** | Multi-klien/perikatan + isolasi; Beranda role-based; My Tasks lintas-perikatan; multi-periode (LY comparative) | **Multi-office absen; multi-currency belum terverifikasi sungguhan; notifikasi in-app saja (tanpa email); portal klien absen** | Medium |

Fallback: hanya ±3–5 modul StubView/ComplianceView dari ±290 modul terdaftar; 176 view terimplementasi nyata.

---

## 8. Evaluasi Arsitektur (Tahap 4)

**Yang kuat:** pemisahan data→canon→view disiplin; canon murni & ber-snapshot-test (coverage gate 80/70); tRPC + zod (36 schema) memberi kontrak I/O type-safe end-to-end; RBAC satu peta dipakai dua sisi; persist seam terpusat (`useServerState`: cache-first paint → hydrate → debounce 400ms → CAS → conflict toast); TypeScript full-strict satu tsconfig; ratchet `no-explicit-any` mencegah utang baru.

**Yang lemah (dengan koreksi atas laporan agen):**
1. **Router monolitik tanpa service layer** — logika inline per prosedur; unit-test bisnis harus lewat tRPC penuh. → ekstraksi bertahap (contoh di §12).
2. **Pola dokumen-JSON-per-key (StateDoc)** — tepat untuk WP dinamis, tapi: flush seluruh dokumen untuk perubahan satu field; tidak bisa query SQL atas isi (mis. "semua AJE > 1M lintas perikatan"); tidak ada riwayat versi (K7); validasi struktur inner hanya di klien.
3. **Sisa jembatan `window`** — window-strip 11 namespace sudah tuntas, tetapi `window.AMS_API` publish, event bus `ams:*`, dan imperatif `__ams*` masih ada (sadar, ter-typed di `globals.d.ts`).
4. **Single-process by design** — `AuditLog.seq` diserialisasi in-process; rate-limit LLM in-memory. Terdokumentasi di DEPLOY.md; menjadi utang saat butuh HA/multi-instance.
5. **Tanpa async processing/caching/queue** — belum dibutuhkan pada beban pilot; akan relevan untuk OCR/ekspor besar.
6. **Koreksi fakta:** direktori migrasi Prisma **ada** (`0_init`, 352 baris, rapi — klaim agen arsitektur "db push only" salah); W11–W15 (TS strict + ratchet) **sudah tuntas** — kelemahannya bukan "belum TypeScript" melainkan 8.227 baseline suppression yang menetralkan sebagian manfaat strict di lapisan view/data.

---

## 9. Evaluasi Keamanan (Tahap 6)

Temuan setelah verifikasi silang (beberapa klaim agen keamanan saya koreksi):

**Critical — 0 temuan terbuka murni.** Klaim "API key ter-commit di repo" **terfalsifikasi**: `server/.env.local` ter-ignore sejak awal, `git log -S` seluruh history kosong; `server/.env` yang ter-track hanya DSN SQLite tanpa rahasia. Direklasifikasi ke High-hygiene (S1).

**High:**
- **S1. Kunci LLM aktif plaintext di file lokal** → rotasi kunci DeepSeek (sudah tersentuh banyak sesi/agen), pindah ke `SECRETS_PROVIDER=aws-sm` untuk produksi, tambah pre-commit guard pola secret.
- **S2. TOTP plaintext non-prod (K6)** → wajibkan `APP_ENCRYPTION_KEY` juga di staging; warn saat boot bila enkripsi off.
- **S3. Segel vs rotasi kunci (K4)** → simpan arsip public key per `pubKeyId` (kolom sudah ada di tabel `Seal`), verifikasi terhadap kunci era-nya.
- **S4. AuditLog mutable di DB (K5)** → trigger Postgres BEFORE UPDATE/DELETE RAISE + salinan append-only off-box.
- **S5. Bypass rate-limit via X-Forwarded-For** bila kelak di belakang ALB/proxy — konfigurasi `trusted_proxies`; saat ini single-instance aman (Node membaca IP dari socket, bukan header — benar).

**Medium:**
- **S6. XSS potensial:** satu `dangerouslySetInnerHTML` pada elemen contentEditable di `view_misc1.tsx` — sanitasi (DOMPurify) atau ganti ke text node.
- **S7. Prompt injection LLM:** field temuan masuk prompt tanpa pembatas — quote/fence + instruksi anti-injeksi di system prompt (redaksi struktural dua-lapis sudah baik).
- **S8. Webhook tanpa replay protection:** HMAC ada, nonce/idempotency-key belum.
- **S9. TOTP replay window ±1 step:** tambah pencatatan kode terpakai (TTL 90 dtk).
- **S10. Rate-limit LLM in-memory:** reset saat restart — dokumentasikan; Redis hanya bila multi-instance.

**Low:** IP allowlist IPv4-only (dokumentasikan); folder `uploads/` belum punya handler server (pastikan validasi MIME+path saat fitur upload server-side dibangun).

**Yang sudah benar dan patut dipertahankan:** scrypt + `timingSafeEqual`; lockout 5×15 menit + pesan error non-enumerating; sesi opaque 256-bit httpOnly SameSite=Strict (mitigasi CSRF memadai untuk same-origin); fail-fast prod di CI; Prisma tanpa raw SQL; egress redaction LLM allow-list + zod strip; edge rate-limit login 5/menit.

---

## 10. Evaluasi Kepatuhan Standar Audit (Tahap 7)

| Kerangka | Status | Catatan |
|----------|--------|---------|
| SA (ISA) siklus inti | **Baik** | SA 200–720 terpetakan ke modul auditable dengan persist + sign-off; RELATED_SA/LINEAGE menghubungkan modul↔standar |
| SA 230 (dokumentasi) | **Parsial** | Sign-off ber-jejak + audit trail ✔; **assembly lock 60 hari, retensi multi-tahun, riwayat versi dokumen ✘** (K7) |
| SA 220 / ISQM 2 (EQR) | **Baik** | Slot EQR Partner-only server-guarded; trigger EQR masih seed-based, belum rule PIE/risiko otomatis |
| ISQM 1 (SOQM) | **Parsial** | Struktur lengkap (objectives→risiko→respons→monitoring→evaluasi tahunan) menarik dari kanon; **workflow investigasi defisiensi & remediasi masih display/seed** |
| Kode Etik / Independensi | **Baik** | Rotasi 4-tier + alert 6 bulan proaktif, gerbang etik/AML blokir sign-off + override Partner ter-log, CPE auto-sync SKP — semuanya persist server |
| Jejak audit | **Baik** | Hash-chained append-only, verifikasi pasca-restore; penguatan DB-level dibutuhkan (K5) |
| Retensi dokumen | **Belum** | Kelas retensi baru didefinisikan (`view_records.tsx`); enforcement penghapusan/pengarsipan belum ada |
| UU PDP / privasi | **Belum** | Display-only (K1) — gap kepatuhan terbesar |

---

## 11. Rekomendasi Perbaikan & 13. Prioritas Implementasi (Tahap 10)

**Critical (blocker go-live data riil):**
1. **Bangun PDP fase 1** — form DSR + SLA timer, log insiden + notifikasi 3×24 jam, enforcement retensi-hapus. *Manfaat:* legalitas memproses data klien. Kompleksitas sedang, 3–5 minggu, dependensi: tidak ada.
2. **Alerting minimal** — uptime monitor eksternal + alert rules atas `/metrics` (error rate, backup gagal, disk) + notifikasi email/Telegram. Kompleksitas rendah, 3–5 hari.
3. **Pilot EC2 nyata via Terraform** — provisioning, ACME live, Secrets Manager live, restore drill di instance, ukur RTO total, isi DEPLOY.md §12.5. Kompleksitas rendah-sedang, 1 minggu.
4. **Pentest independen** — brief sudah siap; jadwalkan setelah butir 1–3.

**High:**
5. Key-versioning segel (S3/K4) — sebelum arsip membesar. 3–5 hari.
6. Immutabilitas AuditLog DB-level + salinan off-box (S4/K5). 2–3 hari.
7. Assembly lock 60 hari + retensi SA 230 + snapshot versi StateDoc untuk key sign-off-bearing (K7). 2–3 minggu.
8. Rotasi kunci DeepSeek + pre-commit secret guard (S1). ½ hari.
9. `APP_ENCRYPTION_KEY` wajib di staging (S2). ½ hari.
10. Lifecycle surat perikatan (generator dari template + versioning + status ttd klien) — melengkapi area B. 1–2 minggu.
11. Auto-link RoMM → program audit (respons per risiko per asersi) — menutup loop SA 315→330. 1–2 minggu.

**Medium:** sanitasi XSS (S6); prompt-injection & webhook replay (S7/S8); service layer router; smoke test render view kritis; DMS bukti (hash per dokumen + pencarian; OCR menyusul); roll-forward periode; notifikasi email; multi-office; eksekusi UAT 8-bagian yang sudah drafted.

**Low:** ratchet `:any` berkelanjutan; pemecahan view raksasa; relokasi legacy ke `_archive/`; `$transaction` di state.set; IPv6 allowlist; SBOM.

---

## 12. Roadmap Pengembangan (Tahap 9) & Contoh Refactoring (Tahap 11)

**Quick Wins (1–2 minggu):** rekomendasi #2, #5, #6, #8, #9 + sanitasi XSS + webhook nonce + dokumentasi trusted-proxies. Hasil: seluruh temuan keamanan High tertutup tanpa menyentuh arsitektur.

**Jangka Pendek (1–3 bulan):** #3 pilot EC2 + #4 pentest + #1 PDP fase 1 + #7 assembly lock/retensi + #10 surat perikatan + #11 risk→program link + service layer + smoke test view. Milestone keluar: **go-live pilot berbayar 1 KAP**.

**Jangka Menengah (3–6 bulan):** DMS bukti (hash, klasifikasi, pencarian, lalu OCR); konektor Coretax live (sertifikat PKP) + konektor GL/ERP pertama; roll-forward & carry-forward perikatan tahun berikut; dashboard analitik lintas-perikatan (butuh proyeksi typed dari StateDoc — lihat refactor R2); multi-office; notifikasi email; PDP fase 2 (RoPA hidup + consent).

**Jangka Panjang (6–12 bulan):** perluasan diagnostik AI (P4) ke rekomendasi prosedur berbasis risiko; deteksi anomali/continuous auditing di atas konektor GL; integrasi e-sign/PSrE (segel Ed25519 saat ini bukan tanda tangan elektronik tersertifikasi); kolaborasi real-time; **keputusan arsitektur multi-tenant** bila pipeline penjualan >10 KAP.

**Contoh refactoring utama:**

**R1 — Service layer dari router monolitik.** Akar: semua logika inline di `router.ts` (631 baris). Dampak: perubahan kecil berisiko regresi lintas-endpoint, test harus penuh tRPC. Solusi: ekstrak per domain (`services/stateService.ts`, `authService.ts`, `signoffService.ts`) — router tinggal zod-parse → panggil service → map error. Risiko: rendah (perilaku identik, test existing jadi jaring). Migrasi: satu domain per PR, mulai dari `state.set` yang paling padat guard.

**R2 — Proyeksi typed dari StateDoc untuk data pelaporan.** Akar: AJE/SAD/konfirmasi tersimpan sebagai blob JSON → tidak bisa di-query lintas perikatan. Dampak: dashboard firma & analitik SAD lintas-klien harus load semua blob ke aplikasi. Solusi: pertahankan StateDoc sebagai write-model; tambahkan tabel proyeksi read-only (`AjeItem`, `SadItem`) yang di-upsert saat `state.set` sukses (dalam `$transaction`). Risiko: dual-write drift — mitigasi: proyeksi selalu bisa di-rebuild dari StateDoc (job rekonsiliasi). Migrasi: mulai dari SAD (nilai pelaporan tertinggi), tanpa perubahan apa pun di klien.

**R3 — Key-versioning segel.** Akar: verifikasi hanya terhadap kunci aktif. Solusi: tabel `SigningKey(pubKeyId, publicKey, activeFrom, retiredAt)`; `verifySeal` mencari kunci by `row.pubKeyId` (kolom sudah ada). Rotasi = tambah kunci baru, kunci lama tetap memverifikasi arsipnya. Risiko: hampir nol; backward-compatible penuh.

**R4 — Pemecahan `view_wp.tsx` (1.321 baris).** Ekstrak panel prosedur, panel bukti, panel sign-off ke `view_wp_parts.tsx` mengikuti pola parts yang sudah ada. Prasyarat: smoke test render dulu (rekomendasi Medium) agar refactor terlindungi.

---

## 14. Kesimpulan & Penilaian Akhir (Tahap 12)

| Dimensi | Skor | Dasar |
|---------|------|-------|
| Kesesuaian proses audit | **82** | Siklus A–K ±90% tercakup dengan persist + sign-off nyata; minus surat perikatan, assembly lock, risk→program link |
| Kelengkapan fitur | **78** | 176 view nyata, ekspor tersegel, konektor ber-gerbang; minus DMS/OCR, multi-office, notifikasi email, portal klien |
| Arsitektur | **72** | SSOT + strict TS + CAS solid; minus service layer, blob-JSON tanpa proyeksi query, single-process |
| Kualitas kode | **74** | Canon teruji ketat (≈580+ test hijau, snapshot gate); minus 8.227 baseline `:any`, view raksasa, nol test view |
| Keamanan | **70** | Fondasi kuat (scrypt/TOTP/httpOnly/RBAC dua-lapis/hash-chain/fail-fast CI); minus K4–K6, S6–S9, belum pentest |
| Kinerja | **65** | Read p95 <100ms; login scrypt jadi bottleneck @>10 konkuren; ~150–170 ops/dtk plafon |
| Skalabilitas | **45** | Sengaja single-tenant single-process; HA/multi-instance butuh redesign sequencing + rate-limit terdistribusi |
| Kemudahan pemeliharaan | **68** | Konvensi jelas + gate ketat; ditekan oleh router monolitik, suppressions, legacy bercampur di root |
| UX | **±75** *(keyakinan rendah — tidak diuji pengguna dalam evaluasi ini)* | Beranda role-based, sidebar kurasi, ⌘K, breadcrumb; belum ada uji kegunaan formal |
| Dokumentasi | **85** | BUILD/DEPLOY/KEY-ROTATION/PENTEST executable dan jujur; minus API docs & refresh PRD lama |
| Kesiapan KAP | **60** | Pilot tertutup 1 KAP kecil: layak dengan syarat Quick Wins; produksi penuh: setelah Critical #1–4 |
| Kesiapan Internal Audit | **50** | Metodologi berorientasi audit LK eksternal (opini/EQR/ISQM); internal audit butuh lapisan universe-of-risk, rencana audit tahunan, follow-up temuan — sebagian ada, tidak dirancang untuk itu |
| Production readiness | **58** | Infrastruktur & DR di atas rata-rata tahap ini, tetapi K1–K3 + pentest belum; belum pernah hidup di infrastruktur target |

**Kesimpulan:** Asseris berada pada titik yang jarang dicapai produk internal — metodologi audit dalam, disiplin rekayasa nyata (CI, DR drill, fail-fast, SSOT), dan gap yang tersisa **terdefinisi tajam dan hampir semuanya berbiaya rendah-menengah**. Jalur tercepat ke nilai: eksekusi Quick Wins (2 minggu) → pilot EC2 riil + PDP fase 1 + pentest (1–3 bulan) → go-live pilot berbayar. Keputusan strategis yang harus diambil Ari, bukan tim teknis: (1) target tanggal pilot EC2, (2) sign-off RTO/RPO, (3) apakah PDP dibangun paralel atau menunda go-live, (4) kapan keputusan multi-tenant diambil.

---
*Catatan metodologi: temuan agen yang terfalsifikasi saat verifikasi silang telah dikoreksi di laporan ini — (a) "API key ter-commit" → salah, tidak pernah di history; (b) "Ed25519 belum live" → salah, W10.5 merged & live-smoked; (c) "tanpa direktori migrasi Prisma" → salah, `0_init` ada; (d) angka baseline any 1.024/1.191 → yang benar 8.227 pelanggaran di 238 file.*
