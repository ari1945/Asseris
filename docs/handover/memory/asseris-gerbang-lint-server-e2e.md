---
name: asseris-gerbang-lint-server-e2e
description: "Gerbang lint server/+e2e/ (PRD #193) + @types/node + timeout uji server — MERGED 2026-08-13 via #207; ESLint kini di ROOT"
metadata: 
  node_type: memory
  type: project
  originSessionId: 29d50f23-aecc-4c76-8eba-981f0c19004d
  modified: 2026-08-13T07:02:16.947Z
---

**2026-08-13. MERGED — [#207](https://github.com/ari1945/Asseris/pull/207) (master `e2deb29`) +
[#193](https://github.com/ari1945/Asseris/pull/193) PRD ditandai Implemented (master `e57694f`).**
Nol PR terbuka di repo.

## Tiga utang gerbang yang ditutup

**1. Lint menjangkau `server/` & `e2e/`.** Sebelumnya `npm run lint` HANYA `migration/src`.
- **ESLint kini hidup di ROOT**: `eslint.config.mjs` + devDependency root sendiri
  (eslint, typescript-eslint, globals). Opsi A PRD §11 Q1 — gerbang repo tak boleh
  terkopel pada isi `migration/node_modules`.
- Script root: `npm run lint` = `eslint server e2e tools`.
- Langkah `['backend & e2e lint', '.', 'node_modules/eslint/bin/eslint.js', ['server','e2e','tools']]`
  di `tools/verify.mjs`, **DAN** job `lint-backend-e2e` di `.github/workflows/ci.yml`.
  CI kini **9 check**, bukan 8.
- Lingkup sempit: hanya kelas kesalahan yang tsc TIDAK tangkap (unused vars/imports,
  no-empty, no-dupe-keys, no-unreachable, no-constant-condition, no-useless-escape).
  BUKAN gaya, BUKAN type-aware, BUKAN `no-console` (Q3 = tidak).
- **`migration/**` di-ignore** — punya gerbang sendiri dengan ratchet `no-explicit-any`.

**2. `@types/node` di `migration/`.** `tsconfig.test.json` kini `types: ["vitest/globals","node"]`
dan **hanya `setup.ts` yang tersisa di `exclude`**. Tiga berkas keluar: `export_pdf.test.ts`,
`export_xlsx.test.ts`, `materiality_single_door.test.ts`.

**3. `testTimeout` server = 15 dtk** (+ `hookTimeout` 30 dtk) di `server/vitest.config.ts`.
Uji TOTP menjalankan **scrypt yang SENGAJA mahal** (hardening W7): ~1,2–1,7 dtk = ~35% dari
default 5 dtk, habis di bawah kontensi. Lambatnya inheren → naikkan batas, bukan tambal.

## Temuan & jebakan

- **Gerbang langsung menemukan impor mati di `server/src/signoff.ts` dari PR-6 (#205)** —
  merged sejam sebelumnya setelah lolos typecheck, uji, dan CI 8/8. Bukti `server/` memang
  tak pernah dilint. Total utang: **6 error** (PRD memperkirakan 12) + 4 direktif
  `eslint-disable no-console` tak terpakai di `e2e/`.

- **⚠ JEBAKAN `redact.ts` — jangan ikuti pesan lint mentah-mentah.**
  `[.\- ]` ada di dalam *character class*. Menghapus escape membentuk **RENTANG**:
  `[.- ]` = rentang terbalik 0x2E–0x20; `[ -]` = 0x20–0x2D (belasan karakter).
  Regex itu meredaksi **NPWP sebelum data dikirim ke LLM** → kebocoran senyap.
  **Perbaikan: pindahkan `-` ke posisi literal (awal/akhir class), jangan hapus escape.**
  Dibuktikan `server/src/__tests__/llm.test.ts` (menjaga format `01.234.567.8-901.000`).

- **R-7: menambah langkah ke `verify.mjs` WAJIB diikuti job di `ci.yml`.** Kalau tidak,
  verify lebih ketat dari CI → PR dengan impor mati merah lokal tapi HIJAU di CI, lalu merged.

## Keputusan PRD §11
Q1 = **A** (ESLint root) · Q3 = **TIDAK** (`no-console` mati; hapus direktif, jangan nyalakan
aturan) · Q2 = **MENYIMPANG**: langsung `error` tanpa jendela `warn`, karena utang hanya 6 dan
ditutup di PR yang sama — jendela `warn` gunanya memisahkan sebab kegagalan *selagi utang ada*.

Lihat [[asseris-smm1-smm2-adoption]] untuk arc yang memunculkan utang-utang ini.
