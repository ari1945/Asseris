---
name: asseris-test-coverage
description: "Asseris test suite shape, coverage-gap audit, P1+P2 client-layer tests added, and the any-free test convention gotcha"
metadata: 
  node_type: memory
  type: project
  originSessionId: 14531242-7ae1-46de-be2e-44ea5b7ff72a
---

Asseris punya dua suite vitest: **migration** (`cd migration; npm run test`) = unit
"number engines" + client logic; **server** (`cd server; npm run test`) = integration
(tRPC/Prisma). Baseline 2026-06-24: 270 hijau → **306 hijau** setelah P1+P2 (migration
133→169, server 137 tak berubah). Tiga gate WAJIB hijau: `npm run lint` (ESLint),
`npm run typecheck` (tsc 0 error), `npm run test -- --coverage`.

**Gap audit (2026-06-24):** cakupan timpang — kuat di canon + server, **nol di lapis
logika klien**. Ditutup P1+P2 (PRD `PRD - Jaring Pengaman Test Lapis Klien & Branch
Canon (P1+P2).md`):
- **P1** `api.test.ts` (isConflict/degradasi/redaksi LLM slimming), `export_pdf.test.ts`
  + `export_xlsx.test.ts` (SEALED vs degrade-UNSEALED, mock `./api`+lazy libs).
- **P2** `canon_selectors.test.ts` (0→100%), edge crafted-WTB untuk `goingConcern`
  (Altman safe/distress zones), `buildCash` forensik via `FSGEN.buildModel` (62→87% branch).
- `vitest.config.mjs` `coverage.include` dilebarkan + **threshold per-glob** (canon ketat;
  client floor realistis — sisa branch = try/catch defensif + `||` fallback yg butuh lib nyata).

**Gap TERSISA (belum dikerjakan, urut prioritas):** P3 wedge `build_ctx`/`export_wp`/`wtb`;
P4 server infra tipis (`obs/log.ts` healthz/metrics, `env.ts`, `integrations/config.ts`);
P5 **view layer 190 `.tsx` = 0 test** (butuh jsdom — ROI rendah, SSOT canon sudah jamin angka).

**GOTCHA — test `.ts` WAJIB bebas-`any`:** sejak W15, ESLint MEMANG melint `src/**/*.{ts,tsx}`
termasuk test (block `no-explicit-any: error` di `eslint.config.js`). Komentar BUILD.md/CLAUDE.md
"ESLint tak melint .ts" **stale/menyesatkan**. `:any` baru = gate gagal; yg lama di-grandfather
`eslint-suppressions.json` (cuma `wedge/sample_workbook.test.ts`). Pakai `unknown` + cast bertipe
(`as unknown as WTB`) di mock, JANGAN `any`. Lihat [[asseris-gap-matrix-eval]] (pola "grep dulu").
