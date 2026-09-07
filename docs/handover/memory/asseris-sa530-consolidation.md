---
name: asseris-sa530-consolidation
description: "Konsolidasi dua modul SA 530 (sampling→sa530) — Opsi B, PRD-first, live-verified, BELUM commit"
metadata: 
  node_type: memory
  type: project
  originSessionId: d940f472-b0a4-40c3-aaec-2b1964ece36f
---

Konsolidasi duplikasi SA 530 di Asseris (ESM-only, `migration/src`). Dua modul overlap: route `sampling` (`SamplingEngine` di view_calc.tsx — MUS inline non-persist, ef=1.6 hardcode, full-Rupiah) vs route `sa530` (`SA530View` — persist `sampling.v1`, SSOT `sampling_select.musPlan`, WpPanel, PDF). PRD disetujui Ari 2026-06-26 → **Opsi B**: gabung, pertahankan `sa530`, deprecate `sampling`.

**Yang dikerjakan (12 file, commit `e35441f` di branch `claude/focused-chaum-938502` (pushed), worktree focused-chaum-938502; [PR #42 OPEN](https://github.com/ari1945/Asseris/pull/42) — **stacked base `feat/w9-coretax-connector`** (di atas PR #41, BUKAN master langsung; akan menyasar master setelah #41 merge)):**
- `view_calc.tsx`: hapus `SamplingEngine`+`NumRow`+`REL_FACTOR` (sisakan `ECLCalculator` route `ecl` + helper bersama `Kv`/`RowKv` — **dipakai ~30 file**, jangan hapus exportnya). Trim import tak terpakai (useFirm/Seg/useMemoS).
- `view_sa530.tsx`: (1) port **default TM = Performance Materiality** = `activeEngagement.materiality*0.75/1e6` (juta) ke seed `useAmsPersist('sampling.v1', …)`. (2) port **viz sumbu-moneter** (bar+tick+legend) ke tab Metode Seleksi via `scalePopulation`/`selectMus` (SSOT, nol angka baru).
- Repoint inbound `sampling`→`sa530`: app.tsx (alias `case 'sampling': return <SA530View/>`), copilot.tsx (dest+alts), view_execution.tsx, view_cockpit2.tsx, data_templates.ts, view_psak71.tsx, related_modules_data.ts (3 dock ref + blok LINEAGE).
- Registry: icons.tsx hapus MODULES item `sampling` + **rename `RELATED_SA.sampling`→`sa530`** (sa530 dulu tak punya key → chip kosong; rename memperbaikinya). wp_signoff.tsx hapus ref `sampling` (ref `sa530` sudah ada).

**Gerbang LULUS:** `npm run typecheck` 0 · ESLint ratchet no-explicit-any 0 (suppressions di-prune: view_calc 45→19) · `npm test` 358/358.

**Live-verified (dev-all, login Partner Hartono):** chip "STANDAR TERKAIT SA 530" render (rename RELATED_SA bekerja); **Ukuran Sampel n=580** membuktikan TM=PM aktif (tm=3188jt; seed lama 7000 → n=145); viz "Peta Seleksi Sistematis — Sumbu Unit Moneter" render (heading+legend+80 tick cap+tabel utuh); nol console error.

**GOTCHA:**
- Tanpa `@types/react`, `useMemo530`/`useState530` (alias React.useMemo/useState) bertipe **any** → variabel yang di-`.map()` WAJIB anotasi tipe eksplisit (mis. `const spans: {…}[] = useMemo530(...)`) atau TS7006 implicit-any. Var ber-anotasi (`selected: SelectedItem[]`) aman.
- `npm install` di worktree mengubah `package-lock.json` (`peer:true` drift) + memunculkan `.snap` phantom CRLF → **revert keduanya** sebelum commit.
- Live smoke butuh stack: server `npm install`+`prisma generate`+`db:reset`(seed) lalu `dev-all`. Server **5181 sudah jalan** dari sesi lain (uptime~30m) → dev-all EADDRINUSE di server tapi vite 5180 tetap pakai 5181 eksisting. Login via cookie sesi persist.

Lihat [[asseris-authoritative-persist-key-recipe]] (key `sampling.v1` engagement-scoped), [[asseris-test-coverage]] (test .ts wajib bebas-any), [[neosuite-ams-arc]].
