---
name: asseris-tinjauan-visual-toolkit-2026-08-14
description: "Tinjauan visual tab Dokumentasi SMM & panel ¶57–60 (utang PR-8a-1/8b) — LUNAS; 2 temuan: V-8 headline 83% vs cakupan 19%, V-9 alamat berbohong saat ganti tab (app-wide)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d54caf6-a2e8-4953-86e8-ca96e849c109
  modified: 2026-08-13T23:17:02.394Z
---

**Utang tinjauan visual PR-8a-1 & 8b LUNAS (2026-08-14).** Dijalankan dari worktree
`.claude/worktrees/pr8a2` (branch `feat/smm-illustrative-risks` atas `origin/master` = `6c3cbfc`),
vite `:5186` + server pohon utama `:5181` (kode `server/` IDENTIK antara `a2833bc` dan `6c3cbfc` —
`git diff --stat` kosong, jadi server pohon utama sah dipakai tanpa seed ulang).

## Yang TERBUKTI BENAR (jangan diperiksa ulang)

- Panel ¶57–60: 9 elemen, "6 dari 9 terbukti" — hitungannya cocok (6 evidenced · 2 missing ·
  1 not-automatable). ¶58(d)(iv) benar tampil `BELUM DAPAT DIBUKTIKAN OTOMATIS`, bukan toggle.
- Tab Dokumentasi SMM: 41 dok · 38 rumah · 3 celah · 1 rujukan menggantung — konsisten.
- Komponen di luar cakupan Matriks TIDAK tampil kosong: C2 berbunyi "proses — tanpa tujuan
  ¶28–33" + penjelasan; panel "Di luar cakupan Toolkit & Matriks IAPI" menyebut ¶23–27 & ¶35–47
  eksplisit. **SC-15 sudah terpenuhi di tingkat komponen sebelum 8a-2 ditulis.**
- Chip `Ilustrasi respons (Toolkit IAPI): 1.2 3.1 …` sudah hidup di tiap tujuan; rujukan
  menggantung tampil `8.2 ⚠`. Inilah tempat 8a-2 menempel.

## V-8 — headline 83% di atas cakupan 19% (kelas BERULANG)

`view_isqm.tsx:110` `soqmScore = Math.round(effective / risks.length * 100)` → 5/6 = **83%**,
dipasang sebagai KPI kiri-atas "RESPONS MUTU EFEKTIF". Di layar yang SAMA, panel Tujuan Mutu
menyatakan `TERTANGANI 5/27` · `DEFISIENSI RANCANGAN 22` · `CAKUPAN TUJUAN 19%`.
Penyebutnya = 6 risiko terdaftar, bukan 27 tujuan mandatori; respons tak bisa "efektif" untuk
22 tujuan yang responsnya belum ada.

**Ini persis cacat Governance 87%→19% yang sudah ditutup**, dan komentar `view_isqm.tsx:115–118`
di berkas yang SAMA membuktikan penalaran ini sudah diterapkan ke badge tab (`risks.length` →
`SMM1_OBJECTIVE_COUNT`) **tetapi tidak ke KPI header di atasnya**. Perbaikan murah:
`objectiveCoverage(...)` sudah diimpor & dipanggil di baris 97 file itu juga. **Tidak ada uji
yang memaku `soqmScore`** (grep `soqmScore|Respons Mutu Efektif` di `*.test.ts*` = kosong).

## V-9 — alamat berbohong saat ganti tab (APP-WIDE, bukan SMM)

Klik tab mengubah isi tapi TIDAK menulis hash. Dibuktikan di DUA modul: `soqm` (hash tetap
`?tab=objectives` selagi menampilkan Dokumentasi SMM) dan `wtb` (tetap `?tab=drill` setelah klik
Pemetaan FS).

Akar: **satu-satunya penulis hash adalah `navigate()` di `app.tsx:184–194`**; `setTab` lokal modul
tak melewatinya. Dan pembaca `hashchange` (`app.tsx:202–212`) hanya merekonsiliasi `loc.route` —
`loc.tab`/`loc.sel` **diabaikan**. `useInitialTab` (`contexts.tsx:292`) hanya membaca saat mount.

Akibat: bagikan/reload URL → mendarat di tab lain; Back setelah ganti tab → tak terjadi apa-apa.
Melanggar kontrak "objek beralamat" (CLAUDE.md §5, lihat [[asseris-overlay-contract-arc]]).
Perbaikannya menyentuh router global ⇒ **PR/PRD tersendiri, jangan diselundupkan ke 8a-2.**

## GOTCHA sesi ini

- PDF Toolkit/Matriks SEMPAT tak ada di `~/Downloads` lalu Ari letakkan ulang — verifikasi
  keberadaannya sebelum menjanjikan ekstraksi.
- `computer{action:"screenshot"}` GAGAL bila panel Browser tak ditampilkan ("not compositing
  frames"). Pakai `read_page`/`get_page_text`/`javascript_tool` — lebih andal & tekstual.
- `javascript_tool` berbagi scope antar-panggilan: `const t=…` dua kali → `SyntaxError:
  Identifier 't' has already been declared`. Bungkus dalam IIFE.
- Kredensial seed ada di `BUILD.md:122–125` & `server/src/seed.ts:22+`
  (`hartono.w@whr-cpa.id` / `Partner#2025!` = Rekan Pemimpin).

Lihat [[asseris-pr8-toolkit-implementasi]] · [[asseris-checkpoint-2026-08-13-sore]].
