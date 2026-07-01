# PRD — Deploy-Readiness Single-Tenant (Asseris)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-07-01 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (produk internal Asseris) |
| Branch dasar | `feat/w9-coretax-connector` (evaluasi dilakukan di sini); target integrasi ke `master` |

## 1. Problem

Asseris punya fondasi produksi yang kuat (auth nyata, RBAC, SSOT server-side, jejak audit hash-chained, kripto at-rest, Postgres-ready), **tetapi artefak yang bisa dideploy di branch ini tidak menghasilkan aplikasi yang bisa dipakai klien.** Menjalankan `docker compose up` memberi **API tanpa UI dan tanpa HTTPS**, dan server akan boot diam-diam dalam keadaan **tidak aman** bila rahasia produksi tak diset. Belum ada pula jalur untuk mem-provisioning firma KAP nyata (yang ada hanya seed demo destruktif), tak ada strategi backup, dan skema di-apply tanpa riwayat migrasi.

Konsekuensi: sebuah KAP pilot tidak bisa di-onboard tanpa kerja manual ad-hoc yang tak terdokumentasi dan berisiko kehilangan/kebocoran data bukti audit.

## 2. Objective

Menghasilkan **paket deploy single-tenant yang reproducible dan aman-secara-default**: satu perintah membangun instance berisi UI + API same-origin di balik TLS, menolak boot bila konfigurasi produksi tidak aman, punya jalur provisioning firma non-destruktif, backup terjadwal, dan migrasi skema ber-riwayat.

Kenapa ini objective yang benar: single-tenant adalah keputusan arsitektur yang **sudah tepat** (isolasi Asseris bersifat per-engagement di dalam satu firma, bukan per-tenant lintas-firma — tak ada RLS). Maka kesiapan deploy = kualitas *satu instance per klien*, bukan multi-tenancy. Fokusnya operasional & keamanan boot, bukan fitur.

## 3. Success Criteria

Terukur — "selesai" berarti semua ini terbukti:

1. **Edge same-origin**: dari mesin bersih, `docker compose up` (+ satu langkah build UI) menyajikan SPA di `https://<host>/` dan `/trpc/*` di origin yang sama; login → dashboard bekerja lewat HTTPS. Tidak ada CORS, tidak ada URL API absolut di klien.
2. **Fail-fast rahasia**: dengan `NODE_ENV=production`, server **menolak start** (exit ≠ 0, pesan jelas) bila salah satu tak diset/aman: `APP_ENCRYPTION_KEY` (32B valid), `APP_SIGNING_KEY` (Ed25519 valid), `COOKIE_SECURE=1`, `POSTGRES_PASSWORD ≠ changeme`. Log startup mencetak ringkasan konfigurasi (tanpa nilai rahasia).
3. **Provisioning non-destruktif**: perintah `bootstrap-firm` membuat 1 Firm + 1 Partner-admin (email + password + enrol TOTP) **tanpa** menyentuh data demo, dan **menolak** jika DB sudah berisi firma. Seed demo tetap ada tapi terpisah & bertanda demo.
4. **Backup/restore teruji**: job backup Postgres terjadwal (dump terenkripsi ke volume/2nd location) + runbook restore yang **sudah dijalankan sekali end-to-end** (restore ke instance kosong → healthz ok → data utuh).
5. **Migrasi ber-riwayat**: skema di-apply via `prisma migrate deploy` (folder `migrations/` ter-commit), bukan `db push`. Upgrade dari versi N→N+1 pada DB berisi data terbukti tanpa kehilangan data.
6. **Runbook**: satu dokumen `docs/DEPLOY.md` yang bisa diikuti orang lain dari nol sampai instance pilot hidup, termasuk generasi kunci, provisioning, backup, upgrade, dan rollback.

## 4. Scope

- Edge reverse-proxy (Caddy direkomendasikan — TLS otomatis via ACME) menyajikan `migration/dist` + proxy `/trpc/*` → server (strip prefix), dalam `docker-compose` utama.
- Guard konfigurasi produksi di startup server (modul `env`/`server.ts`).
- Perintah CLI `bootstrap-firm` (non-destruktif) + pemisahan seed demo.
- Migrasi Prisma (`prisma migrate`), termasuk migrasi awal dari skema saat ini.
- Backup Postgres terjadwal + skrip & runbook restore.
- `docs/DEPLOY.md` runbook single-tenant.
- Rekonsiliasi klaim Dockerfile "UNTESTED" vs compose "live-proven" (verifikasi ulang build bersih, perbaiki komentar).

## 5. Non-Scope

- **Multi-tenancy / RLS** — ditolak secara eksplisit; single-tenant adalah keputusan.
- **Kebijakan presisi numerik** — PRD terpisah ("Kebijakan Presisi Numerik Asseris").
- Secrets manager terkelola (Vault/AWS Secrets Manager) — berbasis `.env` dulu; integrasi manager = fase lanjutan.
- Auto-scaling / multi-instance — dibatasi oleh serialisasi `AuditLog.seq` single-process (by design); didokumentasikan sebagai batasan, bukan diselesaikan.
- CDN, WAF, observability eksternal (Grafana/Loki) — `/metrics` sudah ada; wiring dashboard di luar scope.
- Compile TS→JS untuk prod (saat ini `tsx` runtime) — perbaikan opsional, tidak memblokir.
- Migrasi/registrasi domain, provisioning host cloud — tanggung jawab operator, bukan repo.

## 6. Constraints

- **Orang**: solo-builder → solusi harus low-ops, reproducible, terdokumentasi (bukan tribal knowledge).
- **Sistem**: klien memakai `url: '/trpc'` relatif (`migration/src/api.ts:35`) → **wajib same-origin**. Server hanya melayani tRPC + `/healthz` + `/metrics` di root (`server/src/server.ts`) → butuh edge terpisah untuk static + TLS.
- **Regulasi**: data bukti audit tunduk retensi legal (SPAP/UU) → backup & integritas bukan opsional. Jejak audit hash-chained sudah ada; jangan sampai backup/restore memutus rantai.
- **Nol-vendor**: konsisten dengan stance kripto Node built-in — hindari dependensi berat baru bila bisa (Caddy adalah binary tunggal, sejalan).
- **Waktu**: target pilot pendek; sebagian P0 sudah ada di branch terpisah `chore/deploy-aws-ec2-test` (paket Caddy) → sebagian ini pekerjaan integrasi, bukan greenfield.

## 7. Existing Solutions

- **`chore/deploy-aws-ec2-test`** (memory `asseris-deploy-aws-ec2-test`): sudah punya paket `deploy/aws-ec2-test/` dengan Caddy same-origin, smoke-built lokal OK. **Belum merge, belum PR.** → Ini sumber utama untuk P0-1; angkat & jadikan bagian compose utama, jangan tulis ulang.
- **`docker-compose.yml` + `server/Dockerfile`** saat ini: server + Postgres jalan, healthz ok, live-proven W11 — tapi **tanpa edge/UI/TLS**.
- **`.env.example`**: sudah mendaftar variabel yang benar, tapi tak ada yang **menegakkan** pengisiannya.
- **`server/src/seed.ts`**: destruktif (wipe + reseed demo) — bukan provisioning; perlu perintah baru non-destruktif.
- **CI `.github/workflows/`**: `ci.yml` + `deploy-smoke.yml` sudah ada → perluas smoke agar mencakup edge + guard fail-fast.

Kesimpulan: ~40% pekerjaan P0 sudah ada terserak; PRD ini mengonsolidasikan + menutup sisa.

## 8. Proposed Approach

Bergerbang: **P0 (blocker keamanan/kepakaian) → P1 (data-lifecycle) → verifikasi pilot**. Tidak lanjut ke P1 sebelum P0 hijau.

**P0 — instance bisa dipakai & aman-default**
1. Angkat Caddy dari `chore/deploy-aws-ec2-test` ke `docker-compose.yml` utama: layanan `edge` (Caddy) menyajikan `migration/dist` sebagai static + `reverse_proxy /trpc/* server:5181` (rewrite strip `/trpc`) + TLS ACME. Build UI (`npm --prefix migration run build`) di-wire ke image/volume edge.
2. Guard startup di `server/src/env.ts`/`server.ts`: fungsi `assertProdConfig()` dipanggil sebelum `listen`; bila `NODE_ENV==='production'` dan syarat §3.2 gagal → `log.error` + `process.exit(1)`. Uji unit + smoke.
3. Rekonsiliasi Dockerfile: build bersih dari root, verifikasi, perbarui komentar "UNTESTED".

**P1 — data lifecycle**
4. `prisma migrate`: buat migrasi awal dari skema kini; ganti perintah compose `db push` → `migrate deploy`; dokumentasikan alur N→N+1.
5. `bootstrap-firm` (CLI, non-destruktif): buat Firm + Partner-admin; guard "refuse if any Firm exists". Pisahkan seed demo (flag/skrip berbeda, tanda `[DEMO]`).
6. Backup: sidecar/cron `pg_dump` terenkripsi (kunci reuse `APP_ENCRYPTION_KEY` atau kunci backup terpisah) + skrip `restore.sh`; jalankan restore end-to-end sekali; catat di runbook.
7. `docs/DEPLOY.md`: runbook lengkap.

Alasan dipilih dibanding alternatif:
- **Caddy vs nginx**: Caddy = TLS otomatis + config minimal (satu binary) → cocok low-ops solo + stance nol-vendor. nginx butuh certbot terpisah + config verbose.
- **Fail-fast vs warning**: audit-product tak boleh boot tidak aman secara diam-diam; menolak start memaksa konfigurasi benar (fail-closed).
- **`migrate` vs tetap `db push`**: begitu ada data klien nyata, `db push` bisa merusak/kehilangan data pada perubahan skema; `migrate` memberi jalur & rollback.

## 9. Risks

| Risiko | Dampak | Mitigasi |
|---|---|---|
| Migrasi awal dari DB `db push` existing tak selaras dengan snapshot migrasi | Drift skema, deploy gagal | Buat baseline migration dari skema kini; uji `migrate deploy` pada DB hasil `db push` sebelum dipakai prod |
| Restore backup memutus rantai `AuditLog` hash-chain | Integritas jejak audit diragukan | Backup = dump konsisten (transaksional) seluruh tabel termasuk AuditLog; runbook verifikasi `audit.verify` pasca-restore |
| Guard fail-fast salah-positif memblokir dev/test | DX rusak, tim frustrasi | Guard hanya aktif saat `NODE_ENV==='production'`; dev/test tak terpengaruh; pesan error menyebut var persis yang kurang |
| Caddy TLS ACME gagal (port 80/443, DNS) di lingkungan operator | Instance tak HTTPS | Runbook cek prasyarat (DNS A-record, port terbuka); sediakan mode TLS internal/self-signed untuk pilot tertutup |
| Kunci `APP_SIGNING_KEY` hilang saat migrasi host | Segel export lama tak terverifikasi | Runbook menekankan kunci = aset backup kelas-1; simpan terpisah dari DB; rotasi = event terdokumentasi |
| Sebagian P0 di branch lain sudah divergen dari `master` | Konflik merge | Integrasikan Caddy sebagai porsi kecil terisolasi; jangan tarik seluruh branch deploy mentah-mentah |

## 10. Implementation Plan

- **M1 (P0-1)** — Edge Caddy same-origin di compose utama + build UI ter-wire; smoke `https://host/` + login. *DoD: §3.1.*
- **M2 (P0-2)** — `assertProdConfig()` + uji; perluas `deploy-smoke.yml` untuk memverifikasi boot menolak config tak aman. *DoD: §3.2.*
- **M3 (P0-3)** — Build Dockerfile bersih dari root, rekonsiliasi komentar. *DoD: image terverifikasi.*
- **M4 (P1-4)** — Prisma `migrate` + baseline + compose `migrate deploy`. *DoD: §3.5.*
- **M5 (P1-5)** — `bootstrap-firm` non-destruktif + pisah seed demo. *DoD: §3.3.*
- **M6 (P1-6)** — Backup terjadwal + restore end-to-end sekali. *DoD: §3.4.*
- **M7** — `docs/DEPLOY.md` + verifikasi seluruh alur oleh pembaca-baru (bisa Claude sebagai proksi). *DoD: §3.6.*
- **Gate pilot** — M1–M7 hijau → onboard 1 KAP pilot.

Estimasi kasar: P0 (M1–M3) ±1–2 hari; P1 (M4–M6) ±2–3 hari; M7 ±0.5 hari.

## 11. Open Questions

1. **Host target pilot**: EC2 single-box (docker-compose, sesuai memory) atau langsung App Runner + RDS? Compose lebih cepat untuk pilot; RDS memberi backup terkelola (bisa menyederhanakan M6). → Keputusan Anda.
2. **Sumber kunci backup**: reuse `APP_ENCRYPTION_KEY` untuk enkripsi dump, atau kunci backup terpisah (pemisahan tugas lebih baik tapi satu rahasia lagi untuk dikelola)?
3. **TLS pilot**: domain publik + ACME, atau instance tertutup (VPN/self-signed) dulu?
4. **Retensi backup**: berapa lama & berapa titik pemulihan (RPO/RTO) yang dapat diterima untuk data bukti audit? Ada implikasi regulasi SPAP.
5. **Provisioning UI**: `bootstrap-firm` cukup CLI, atau perlu halaman first-run admin di UI? CLI lebih cepat; UI lebih ramah operator non-teknis.

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
