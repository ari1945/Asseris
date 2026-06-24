# PRD — Jaring Pengaman Test: Lapis Logika Klien + Branch Canon (P1+P2)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-06-24 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Engagement ID terkait | — (infrastruktur produk Asseris) |

## 1. Problem
Suite test sehat secara jumlah (270 hijau: 133 unit canon + 137 integration server) tapi **distribusinya timpang**. Cakupan terkonsentrasi di dua pulau — mesin canon dan server — sementara **lapis logika sisi-klien** punya **nol test**:

- `export_pdf.ts` & `export_xlsx.ts` menyusun **deliverable bertanda-tangan** (segel Ed25519, hashing payload kanonik, jalur degradasi UNSEALED, format `rp()`/`fmt()`). Bug = angka/segel salah pada artefak audit final — tanpa jaring pengaman.
- `api.ts` mengangkut **token sesi & batas kerahasiaan** (`isConflict` CAS 409, `authFetch` 401→`ams:auth-expired`, slimming payload LLM = redaksi defence-in-depth W8). Bug = kebocoran data senyap / loop auth / redaksi jebol.

Selain itu, mesin canon (SSOT angka) punya **lubang branch**: cabang tepi (WTB kosong/nol/negatif, akun hilang) tak teruji meski lini/fungsi tinggi.

## 2. Objective
Tutup lubang **berisiko-tinggi, effort-rendah** sehingga regresi pada deliverable, transport auth, dan edge-case SSOT **gagal di CI**, bukan di tangan klien/rekan. Bukan mengejar angka cakupan global — mengejar **risiko nyata**.

## 3. Success Criteria
1. `api.ts`: `isConflict` (varian 409/CONFLICT/non-error), `authFetch` (401 men-dispatch event; non-401 tidak), `llmNarrateDiagnostics` (slimming membuang field non-allowlist; `sev` ilegal → `'low'`) — semua tertest. Degradasi (server absen → fallback) tertest minimal 1 jalur.
2. `export_pdf.ts` & `export_xlsx.ts`: jalur **SEALED** (segel di-embed: sealId/pubKeyId/hash + disclaimer) dan jalur **degradasi UNSEALED** (server mati/peran tanpa EXPORT → `logEvent`) keduanya tertest dengan `exportSeal` di-mock. Format angka id-ID (negatif dalam kurung) di-assert pada ≥1 register.
3. Branch canon naik: `canon_part5` ≥80%, `forensic_canon` ≥80%, `canon_part4`/`canon_part3` ≥80%; `canon_selectors.ts` dari 0% → ≥80% (null-guard aksesor teruji).
4. `npm run test` tetap hijau penuh; `npm run typecheck` 0 error; **nol regresi numerik** (snapshot canon `canon_regression` tetap cocok / hanya berubah bila sengaja di-`-u` setelah re-verifikasi).
5. Total tambahan ~30–40 test, semua deterministik (tanpa jaringan nyata).

## 4. Scope
- Test baru `*.test.ts` di `migration/src/` untuk: `api.ts`, `export_pdf.ts`, `export_xlsx.ts`, `canon_selectors.ts`.
- Tambahan kasus branch tepi di test canon eksisting (`canon_part3/4/5`, `forensic_canon`) — pakai fixtur `src/__fixtures__/wtb.js` (perluas bila perlu, tanpa mengubah baseline audit-verified).
- Perluas `coverage.include` di `vitest.config.mjs` agar mengukur `api.ts`/`export_*.ts`/`canon_selectors.ts` (supaya gate cakupan jujur untuk modul baru).

## 5. Non-Scope
- **View layer (190 `.tsx`)** — tak ada harness jsdom; nilai-per-baris rendah (SSOT canon sudah jamin angka). Ditunda (P5 audit gap).
- Server infra tipis (`obs/log.ts`, `env.ts`, `integrations/config.ts`) — P4, ditunda.
- Wedge `build_ctx`/`export_wp`/`wtb` — P3, ditunda (boleh ikut bila murah, tapi bukan komitmen PRD ini).
- Data statis `data_*.ts` — fixtur, nilai-test rendah.
- Tak mengubah kode produksi kecuali bug nyata ditemukan (bila ada → laporkan & minta keputusan, jangan diam-diam patch).

## 6. Constraints
- **Solo, Ari.** Stack: vitest 2.1.9, env `node` + stub `window`/`localStorage` (`src/__tests__/setup.ts`), tanpa jsdom.
- Lazy `import()` (jspdf/xlsx) & panggilan server (`exportSeal`) **wajib di-mock** — test harus offline & deterministik.
- Gate eksisting tak boleh turun: `lint` (no-undef/no-dupe-keys=0), `typecheck` 0, ratchet ESLint `no-explicit-any` (test-tier di-exclude dari strict, tapi hindari `any` baru gratis).
- Loader esbuild `tsx`: generic telanjang di `.ts` butuh koma `<T,>`.

## 7. Existing Solutions
Pola test sudah mapan di repo: `diagnostics.test.ts` (mock canon), `wedge/seal.test.ts` (segel), `rbac.test.ts` (matriks). Harness `setup.ts` + fixtur `wtb.js` siap pakai. **Tak ada** custom infra baru yang perlu dibangun — cukup ikuti pola eksisting + mock lazy-import/server. Inilah alasan effort rendah.

## 8. Proposed Approach
Ikuti konvensi W4: satu `*.test.ts` per modul, dynamic import setelah stub, deterministik.
- **`api.test.ts`** — uji fungsi murni (`isConflict`, slimming) langsung; `authFetch` via stub `global.fetch` + spy `window.dispatchEvent`; degradasi via `api.*` yang dilempar reject → assert fallback.
- **`export_pdf.test.ts` / `export_xlsx.test.ts`** — mock modul segel (`exportSeal`→sukses / →throw) & lazy `import()`; assert komposisi model (heading/kv/table, sheet "Segel"), embed sealId/hash, jalur UNSEALED+`logEvent`, format `rp()`/`fmt()` id-ID.
- **`canon_selectors.test.ts`** — beri WTB fixtur (lengkap + kosong/akun-hilang) → assert aksesor mengembalikan nilai benar & null-guard tak crash.
- **Branch canon** — tambah `it()` edge (nol/negatif/kosong) ke file test eksisting; pin ke nilai yang dihitung dari fixtur, bukan magic number.

Alternatif ditolak: (a) test E2E view — mahal, ROI rendah (Non-Scope P5); (b) mengejar 100% global — buang waktu pada data statis.

## 9. Risks
| Risk | Mitigasi |
|---|---|
| Mock lazy-import jspdf/xlsx rapuh / bocor ke jaringan | Mock di level modul (`vi.mock`); assert tak ada `fetch` nyata; CI tanpa kredensial. |
| Menulis test menyingkap **bug produksi nyata** | **Jangan diam-diam patch** — hentikan, laporkan, sajikan opsi, minta keputusan (aturan no-silent-assumptions). |
| Test canon edge mengubah snapshot regresi | Snapshot hanya di-`-u` setelah re-verifikasi vs contoh audit-confirmed; nilai edge dihitung dari fixtur, didokumentasikan. |
| Perluasan `coverage.include` menurunkan % global → gate gagal | Set threshold per-modul realistis; atau jaga threshold canon terpisah. Putuskan saat implementasi. |

## 10. Implementation Plan
- **Fase 1 — P1 klien (risiko tertinggi):** `api.test.ts` → `export_pdf.test.ts` → `export_xlsx.test.ts`. Milestone: jalur SEALED+UNSEALED+401+CAS tertest, hijau.
- **Fase 2 — P2 canon branch:** `canon_selectors.test.ts` + edge-case `canon_part3/4/5`+`forensic_canon`. Milestone: keempat target ≥80% branch.
- **Fase 3 — Gate & laporan:** perluas `coverage.include`, jalankan `test --coverage` + `typecheck`, laporkan delta cakupan & temuan (termasuk bug bila ada).

## 11. Open Questions
1. Bila sebuah test menyingkap bug produksi — Anda mau saya **stop & lapor per-bug**, atau kumpulkan jadi satu laporan di akhir fase? (Default: stop & lapor segera untuk yang berisiko-tinggi.)
2. P3 wedge (`build_ctx`/`export_wp`/`wtb`) — ikutkan oportunistik bila murah, atau tegas tunda? (Default: tunda.)
3. Threshold cakupan setelah `coverage.include` diperluas — target global tunggal atau per-modul? (Default: per-modul, jaga gate canon eksisting.)

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
