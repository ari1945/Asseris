---
name: wedge-mvp-build-decision
description: "Ari memutuskan BUILD Wedge MVP (Diagnostik TB+GL lokal) meng-override gerbang validasi §11 — konteks, risiko yang diterima, jalur PRD-first"
metadata: 
  node_type: memory
  type: project
  originSessionId: 9ddb2d07-2104-4a6f-a1f8-8b074cf563a5
---

**Keputusan 2026-06-22:** Ari memilih "full develop" = **arah A: bangun Wedge MVP** (handoff 2026-07-03 (dihapus)), produk lokal TB+GL → JET/Benford/analitik → temuan ter-SA (240/520/530) → ekspor kertas kerja tersegel, offline.

**SADAR meng-override gerbang validasi §11** wedge-doc (`Wedge MVP — Diagnostik & Analitik Audit (SA 240-520-530).md`, status doc = "JANGAN DIBANGUN sebelum Discovery lolos"). Tidak ada Sprint Discovery / wawancara KAP / pilot data nyata yang dilakukan.

**Tesis pasar Ari (2026-06-22):** KAP kecil–menengah hanya Excel; tak ada pemain lokal; WTP ada. **Mekanisme WTP (Ari, diperkuat):** PPPK dapat menjatuhkan sanksi berat s.d. PENCABUTAN IZIN bila KAP tak menjalankan prosedur audit — dan itu HANYA dapat dibuktikan dgn kertas kerja yang baik. ⇒ WTP = risiko eksistensial regulatori (survival), bukan hemat-waktu. **Penilaian Claude (di-update):** ini pengungkit WTP terkuat; kekhawatiran WTP sebelumnya melemah signifikan — produk menghasilkan persis artефак yang dituntut inspeksi (kertas kerja ter-SA, tersegel, dapat diverifikasi). Sisa risiko = ANGKA harga, bukan APAKAH ada kemauan bayar. De-risk: 1 obrolan ber-anchor-harga dgn 2–3 partner KAP via Ecovis (konfirmasi titik harga, bukan eksistensi WTP).

**Why:** Ari secara eksplisit menerima risiko build-tanpa-validasi-pasar (ditanya via AskUserQuestion, jawab "A — Bangun Wedge MVP (override gerbang)"). Risiko ini = miliknya, sudah diterima sadar.

## STATUS: F1–F6 + Phase 2 (G1–G2) SELESAI & MERGED ke master (2026-06-22)
PR [#1](https://github.com/ari1945/Asseris/pull/1) `wedge-mvp`→master MERGED (`376420d`) + PR [#2](https://github.com/ari1945/Asseris/pull/2) `wedge-phase2`→master MERGED (`0a38338`); **CI + deploy-smoke HIJAU di master nyata** (kedua PR).
**Phase 2:** G1 packaging single-file (`vite.wedge.config.mjs`+vite-plugin-singlefile, `npm run build:wedge`→`dist-wedge/wedge.html` 1.66MB klik-buka offline, 0 fetch aset) · G2 verify-seal UI (`VerifySealPanel.tsx`+`verifySignatureHex`/`localPublicKeyHex` di seal.ts; inspektur PPPK tempel kunci/hash/sig→verdikt SAH/TIDAK SAH). GOTCHA: commit Phase2 SEMPAT masuk master lokal langsung (lupa branch-first pasca-merge PR#1)→dikoreksi: branch `wedge-phase2`, `git branch -f master origin/master`, PR. **Perdalam detektor (H1+H2) SELESAI** — PR [#3](https://github.com/ari1945/Asseris/pull/3) `wedge-detectors`→master MERGED (`7d0ba54`, CI+deploy-smoke hijau). H1 RPT/SA 550: importer kolom Pihak Berelasi + build_ctx set rpId/dir(konvensi kas 1-1xxx)/forensic → detektor rpt-exposure EKSISTING menyala (reuse, nol detektor baru). H2 outlier WTB/SA 520 (`wedge_detectors.ts` wtbOutliers: sign-flip/swing/SA450-adj/akun-baru) via ctx.extraFindings (NOL sentuh mesin canon-tier). Sample +kolom Pihak Berelasi & Saldo LY. Live: temuan 4→7 (SA 550 + 2 SA 520) di single-file fresh, 0 fetch aset, 0 console err, 80 vitest. Track LANJUTAN tertunda: FISKAL input form · CSV/toleransi impor · robustness+turunkan :any · Electron · WTB-adj butuh kolom adj di TB. PRD `PRD - Wedge MVP Build (Diagnostik TB-GL Lokal).md`. Commits `65d524c`(F1)·`13f0c01`+`7e9616e`(F2)·`23101ac`(F3)·`fddfb3f`(F4)·`a711ed4`(F5)·`5e77d17`(F6)·`9e08488`(baseline). Semua gerbang HIJAU: typecheck full-strict + lint + 76 vitest + build. **DoD §10 live-proven pada BUNDEL STATIS (`vite preview` :5190, config launch "wedge-dist"): impor→gerbang LULUS→4 temuan→putuskan→ekspor Ed25519 tersegel, `performance` resource eksternal=[] (NOL jaringan).**

**Arsitektur wedge** (`migration/src/wedge/` + `migration/wedge.html`, entry multi di vite.config rollupOptions.input): entry terpisah dari main.tsx (215-import); muat HANYA diagnostics→canon→forensic→data (bundel wedge 24.5kB vs main 4.2MB). `derive_flags.ts` (spike R1: derivasi 8 flag SA240 dari GL mentah—forensic_canon cuma punya flag hardcoded seed), `import_parse.ts` (template D3: sheet TB/GL/FISKAL, mapping PURE atas aoa→teruji, control-total Σ=0), `build_ctx.ts` (→DiagCtx), `sample_workbook.ts` (data contoh, round-trip teruji), `seal.ts` (Ed25519 WebCrypto OFFLINE+fallback sha256-only; seal W10.5 terkopel server jadi DITULIS ULANG), `export_wp.ts` (reuse LIB jspdf/xlsx bukan wrapper ./api), `WedgeApp.tsx`+`use_persist.ts` (review+keputusan persist localStorage).

**GOTCHA bank:** (1) verifikasi 0-jaringan PAKAI `performance.getEntriesByType('resource')` (reset per-navigasi) BUKAN preview_network (kumulatif—tercampur auto-open `/` app penuh). (2) preview screenshot timeout→pakai eval/snapshot/inspect. (3) idiom React tanpa @types/react: hook TANPA type-arg, props/`useState` `:any`. (4) W15 ratchet→`:any` baru=fail; catat via `npx eslint src --suppress-rule @typescript-eslint/no-explicit-any` (script `lint:any-baseline` RUSAK—dua flag inkompatibel). (5) preview server suka mati antar-turn→restart.

**Sisa/ditunda:** book-tax butuh sheet FISKAL (TB saja tak cukup); RPT/forensic (dir/rpId) tak dipetakan dari TB+GL minimum→detektor RPT mati by-design; CSV multi-sheet (template = .xlsx); packaging Electron (D1 pilih static-local dulu); modul logika bisa dipertegas tipe (kurangi :any). **Gerbang validasi §11 TETAP di-skip (override sadar).**

**How to apply:**
- Aturan PRD-first vault TETAP berlaku → wedge-doc jadi basis **PRD build sempit** (§7 MASUK / §8 NON-SCOPE). JANGAN koding sebelum sign-off "Proceed."
- Pegang disiplin wedge §3: ADD-ON bukan pengganti · LOKAL/offline (data klien tak ke cloud, narasi MVP = template deterministik BUKAN LLM) · satu pekerjaan 10× — JANGAN balik ke "everything-app".
- Inti teknis: mesin `amsDiagnostics(ctx)` ([diagnostics.ts:188]) sudah ter-param via `DiagCtx` (journalPop/aje/fig/reconcileRows) → build = importer TB+GL→DiagCtx, BUKAN mesin baru. Reuse canon+forensic+diagnostics+export_pdf/xlsx+seal. Buang backend tRPC/auth/RBAC/konektor + mayoritas view.
- Risiko build teratas: derivasi flag forensik (akhir-pekan/bulat/manual/backdate) atas jurnal IMPOR — saat ini di forensic_canon atas data seed; perlu dibuktikan jalan atas data nyata.
