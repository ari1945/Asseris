# PRD — CI Deploy-Smoke Job (W10.1)

> Status: **DRAFT — menunggu sign-off ("Proceed.")**. Penulis: Claude Code. Tanggal: 2026-06-21.
> Builds on [[neosuite-ams-w10-hardening]]. Branch kerja: `master`.

## Problem
Path deploy container (Dockerfile + docker-compose.yml + Postgres flip) **tidak punya penjaga
otomatis**. Bukti: bug `migration/package.json` tak ter-COPY ke image (`a4222f9`) lolos dari audit
statis **dan** CI yang ada — baru ketahuan saat container benar-benar di-build & di-boot (sesi
2026-06-21, ditemukan Hermes). CI sekarang hanya menjalankan `server` (typecheck+vitest, **sqlite**)
dan `migration` (lint+typecheck+tests+build) — tak satu pun mem-build image, mem-boot container, atau
menyentuh Postgres. Footgun deploy berikutnya (COPY hilang, dep resolusi, schema flip, ESM/CJS) akan
lolos dengan pola yang sama.

## Objective
Ubah bukti live-smoke manual (sekali jalan, 2026-06-21) menjadi **gate CI permanen**: setiap
push/PR mem-build image dari `server/Dockerfile`, mem-boot stack compose lawan `postgres:16`,
lalu meng-assert rantai `db push → healthz → seed → login` hijau — persis rantai yang dijalankan
manual hari ini.

## Success Criteria
1. Job baru `deploy-smoke` di `.github/workflows/ci.yml` LULUS pada commit `HEAD` saat ini.
2. Job **GAGAL** bila `COPY migration/package.json` dihapus dari Dockerfile (mensimulasikan footgun
   `a4222f9` → membuktikan gate benar-benar menangkap kelas bug itu). [uji regresi sekali, lalu revert]
3. Assertion yang ditegakkan, semua dari dalam runner:
   - `docker compose up --build -d` sukses (image ter-build, db+server start).
   - `GET /healthz` → `200` `{"status":"ok","db":"up"}` (server ↔ Postgres tersambung).
   - `docker compose run --rm server npm run seed` → exit 0 + baris "Seeded: …" (membuktikan
     `tsx` resolve `.js→.ts` untuk `data.ts`/`data_import.ts` + tulis ke Postgres).
   - `POST /auth.login` (akun Partner ter-seed) → `200` berisi `token` (auth baca Postgres).
4. Teardown bersih (`docker compose down -v`) + dump `docker compose logs` saat gagal (debuggability).
5. Tidak mengubah/menurunkan job `server` & `migration` yang ada (zero regression CI).

## Scope
- Satu job `deploy-smoke` (ubuntu-latest) di file CI yang sama.
- Env in-job: `POSTGRES_PASSWORD` (dummy kuat), `APP_ENCRYPTION_KEY` (hex 32B dibangkitkan di step),
  `COOKIE_SECURE=0` (HTTP di runner).
- Polling healthz dengan retry (hormati `start-period` HEALTHCHECK ~20s).
- (Opsional, dianjurkan) ekstrak langkah ke skrip kecil (`scripts/deploy-smoke.sh`) agar lokal & CI
  pakai jalur sama — *bisa di-skip bila ingin minimal-diff*.

## Non-Scope
- Smoke lapisan UI (audit-chain/export via app Vite) — compose hanya sajikan API+DB; UI terpisah.
- Deploy cloud nyata, TLS, registry push, image signing.
- Migration history Prisma (`prisma migrate` dir) — tetap `db push`, di luar PRD ini.
- Konektor W9·2+, fitur produk, track TS (W11 lanjut/W13).

## Constraints
- Runner `ubuntu-latest` GitHub Actions: Docker + compose v2 sudah terpasang.
- `npm start`/`db push` di container pakai `tsx`/`prisma` (kini di `dependencies` — aman `--omit=dev`).
- Build image ~2–4 mnt (node:22 + npm ci + prisma generate); dapat di-cache sebagian via layer.
- Konvensi repo: commit hanya bila diminta; branch `master` (branch kerja, bukan `main`).

## Existing Solutions (dipertimbangkan lebih dulu)
- **GH `services: postgres:16`** (service container bawaan Actions) — DITOLAK: mem-bypass konfigurasi
  `db` di compose; kita justru ingin menguji **artefak compose apa adanya**. Pakai db milik compose.
- **`docker build` + `docker run` manual** (tanpa compose) — DITOLAK: tak menguji `depends_on`/
  healthcheck/`db push`-on-start yang merupakan bagian artefak deploy.
- **Hanya healthz** (tanpa seed/login) — DITOLAK: seed adalah satu-satunya yang menyentuh permukaan
  `.js→.ts` (kekhawatiran W11) + jalur tulis Postgres; murah untuk disertakan.

## Proposed Approach
Tambah job `deploy-smoke` yang menjalankan, berurutan, dengan teardown `always()`:
```yaml
deploy-smoke:
  name: deploy-smoke (docker build + postgres boot + healthz/seed/login)
  runs-on: ubuntu-latest
  env:
    POSTGRES_PASSWORD: ci-smoke-pw
    COOKIE_SECURE: "0"
  steps:
    - uses: actions/checkout@v4
    - run: echo "APP_ENCRYPTION_KEY=$(openssl rand -hex 32)" >> "$GITHUB_ENV"
    - run: docker compose up --build -d
    - name: wait for healthz                # poll s/d ~60s
      run: |
        for i in $(seq 1 30); do
          curl -fsS localhost:5181/healthz && exit 0 || sleep 2
        done; echo "healthz never came up"; exit 1
    - run: docker compose run --rm server npm run seed
    - name: assert healthz + login
      run: |
        curl -fsS localhost:5181/healthz | grep -q '"db":"up"'
        curl -fsS -X POST 'localhost:5181/auth.login?batch=1' \
          -H 'content-type: application/json' \
          -d '{"0":{"email":"hartono.w@whr-cpa.id","password":"Partner#2025!"}}' \
          | grep -q '"token"'
    - name: dump logs on failure
      if: failure()
      run: docker compose logs --no-color
    - name: teardown
      if: always()
      run: docker compose down -v
```
(Kredensial seed adalah kredensial **dev**, sudah terdokumentasi di BUILD.md — bukan rahasia prod.)

## Risks
| Risiko | Mitigasi |
|---|---|
| Flaky timing (server belum siap saat curl) | Polling retry 30×2s; hormati HEALTHCHECK start-period. |
| Build lambat menambah waktu CI tiap commit | (Open Q3) opsi `paths:` filter agar hanya jalan saat file deploy/server/migration berubah. |
| Hardcode `Partner#2025!` di CI usang bila seed berubah | Kredensial dev di SSOT BUILD.md; bila berubah, update bersamaan (catat di seed.ts komentar). |
| Port 5181 bentrok di runner | Runner bersih per job; tak ada layanan lain. |
| Seed destruktif | Aman — DB CI fana, dibuang `down -v` tiap kali. |

## Implementation Plan
1. Tambah job `deploy-smoke` ke `.github/workflows/ci.yml` (tanpa menyentuh 2 job lain).
2. (Opsional) ekstrak ke `scripts/deploy-smoke.sh` bila disepakati (Open Q2).
3. Push ke branch, amati Actions hijau (SC#1).
4. Uji regresi SC#2: hapus sementara COPY package.json → CI merah → revert. [bukti gate bekerja]
5. Update BUILD.md §W10 "Honest gaps" (1): sqlite-only → deploy-smoke menutupnya; update memory.

## Open Questions
1. **Trigger:** jalan tiap push/PR (konsisten dgn job lain, +~3–4 mnt/commit) **atau** `paths:`-filter
   (hanya saat `server/**`, `migration/**`, `Dockerfile`, `docker-compose.yml` berubah)?
   → *Rekomendasi: paths-filter* (hemat menit CI untuk commit dokumen).
2. **Skrip bersama** `scripts/deploy-smoke.sh` (lokal==CI) atau inline di YAML saja?
   → *Rekomendasi: inline dulu* (minimal-diff; ekstrak nanti bila perlu).
3. **Uji regresi SC#2** dijalankan (hapus-COPY → merah → revert) atau lewati?
   → *Rekomendasi: jalankan sekali* (bukti gate sahih, lalu revert dalam commit yang sama tak masuk).
