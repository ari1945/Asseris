---
name: asseris-firmtax-bukti-potong-karangan
description: "Arc firmtax (commit 0508891) — bukti potong bernomor karangan dicabut; jebakan useCurrentAuditor, kunci PERSONAL yang meracuni agregat firma, token CSS rakitan-runtime, dan cara staging sebagian berkas baseline bersama."
metadata: 
  node_type: memory
  type: project
  originSessionId: 0ff7c4ae-af89-4ce3-b8e6-43b7fab088f7
  modified: 2026-08-23T04:44:28.008Z
---

Arc `firmtax` (prompt `docs/prompts-perbaikan/34-firmtax.md`), commit **`0508891`** di
`fix/timebudget-engagement-isolation`. FT1–FT3 & FT5 dikerjakan, FT4 dilaporkan.

## Gotcha terbesar — `useCurrentAuditor()` BUKAN identitas sesi untuk atribusi tulis

Prompt FT3 menyuruh memakainya. Itu **salah** dan akan meninggalkan cacatnya utuh:
`contexts.tsx:282` jatuh kembali ke `AMS.USER.name`. Hook itu benar untuk **memfilter
kepemilikan** ("milik saya"), di mana tebakan meleset tak merusak apa pun. Untuk
**atribusi tulis** fallback itu justru cacatnya. Pola yang benar = `glActor` /
`glWriteAllowed` ([[asseris-firmgl-rekonsiliasi-ekspor]], [[asseris-apar-subbuku-hidup]]).
Prompt bertanggal 2026-08-21; presedennya lahir 2026-08-22 — **prompt bisa lebih tua
dari preseden repo; periksa dulu**.

## Gotcha kedua — kunci PERSONAL meracuni agregat FIRMA secara senyap

"Mesin yang benar sudah ada, sambungkan saja" TIDAK selalu benar. Mesin PPh 21 nyata
(`canon_pph21.terRateOn`) tapi tak boleh dipakai firmtax karena tiga alasan independen:
- **masa**: `PAYROLL_RATES.period` = `'Maret 2026'` — payroll POTRET SEBULAN, bukan
  register per-masa. Tabel e-bupot masa Februari.
- **lingkup**: sumbernya `payrollData` = kunci PERSONAL yang **difilter-baris server**
  (`server/src/personalScope.ts`). Agregat firma darinya **MENGECIL mengikuti siapa yang
  melihat** — kelas cacat yang arc ini justru menutup.
- **bentuk**: payroll tak menerbitkan nomor bukti potong; 1721-A1 TAHUNAN.

Mesinnya tetap berguna sebagai **oracle pembantah**: roster **69** pegawai (bukan "38"),
Σ bruto **1.736,9 jt** (bukan 1.400), Σ PPh 21 **175,5 jt** (bukan 210). Itu yang
membenarkan baris jadi `belum-tersedia` alih-alih tetap menampilkan seed.

## Gotcha ketiga — token CSS rakitan-runtime lolos gerbang token repo

`var(--${tone})` dengan tone `'gray'`: **`--gray` & `--gray-bg` TIDAK ADA**. Substitusi
custom property yang gagal tak melempar error (jatuh ke warna warisan / transparan), dan
`css_tokens.test.ts` **menyatakan sendiri** ia buta pada token rakitan-runtime. Solusi:
simpan string `'var(--green)'` UTUH di modul murni supaya ikut terpindai, plus gerbang
yang mencocokkan ke stylesheet nyata. Lihat [[asseris-css-token-ghost-sweep]].

## Membedakan "ilustrasi" dari "belum tersedia" — dan kapan JANGAN menghapus

Tiga keadaan, semuanya berlabel terlihat: `kanonik` · `ilustrasi` · `belum-tersedia`.
Aturan yang saya pakai: **ada mesin yang MEMBANTAH angkanya → buang angkanya**
(belum-tersedia); **tak ada mesin sama sekali → pertahankan agregat, buang identitas
dokumen** (ilustrasi). PPh 4(2) tidak dihapus karena `TAX_OBLIGATIONS` menyatakan
kewajibannya nyata — menghapus = menukar kebohongan TERLIHAT dengan kelalaian TAK
TERLIHAT. Lawan transaksi tidak diklaim: `TAX23.EXCLUSIONS` menyebut DUA pihak sewa
final. Tabel yang SELURUH barisnya seed cukup satu banner "ILUSTRASI demo" (idiom
`view_firmrevenue`/`view_firmtreasury`), bukan chip per-baris yang jadi derau.

## `AMS.EFAKTUR` sengaja TIDAK disentuh

Nomor serinya berpola faktur pajak resmi TAPI **byte-identik dengan fixture konektor
Coretax** (`server/src/integrations/providers/coretaxFixture.ts`) DAN dipaku
`server/src/__tests__/integration.test.ts:475`. Mengubahnya memutus paritas W9.

## Operasional — commit di worktree yang dipakai banyak arc

Worktree utama memegang **44 berkas belum di-commit** dari arc lain. Dua jebakan nyata:

1. **`migration/eslint-suppressions.json` adalah berkas BERSAMA.** Jangan `git add`
   seluruhnya. `npm run lint:any-baseline` LEBIH BERBAHAYA lagi: ia akan menyerap `:any`
   baru arc lain dan memberkati regresi orang. Resep partial-stage tanpa `git add -p`:
   `git show HEAD:<file>` → terapkan HANYA hunk sendiri → tulis ke path → `git add` →
   kembalikan salinan worktree. Turunkan satu entri manual (firmtax 27→21).
2. **Impor ke berkas yang masih UNTRACKED.** `view_firmtax.tsx` mengimpor
   `firm_gl_actor.ts` milik arc lain yang belum pernah masuk HEAD ⇒ commit takkan
   build. Cek WAJIB sebelum commit: resolusi tiap `from './x'` terhadap
   `git write-tree` + `git ls-tree`. Modulnya ikut dikirim; ujinya (yang memindai
   `view_firmgl.tsx` belum di-commit) TIDAK.

## `npm run verify` MERAH — dan nol karenanya milik arc ini

Enam gerbang gagal, semuanya milik arc lain yang belum di-commit: lint (61 `:any` di
`view_mytasks_parts.tsx`) · typecheck & typecheck:test (`mytasks_derive.*`) · frontend
tests (15 gagal di `a11y_anchor_href` · `home_composition` · `wip_writedown_authority`)
· backend typecheck & tests (`mytasks_scope.test.ts` → `persist_scope.userScopedKeys`
tak ada). Gerbang arc ini: eslint 4 berkas exit 0, build ✓, 68 uji hijau. **Kehijauan
commit dibuktikan lewat ATRIBUSI + resolusi impor, bukan run pohon bersih.**

⚠ Verifikasi visual browser TAK TUNTAS: layar terkunci login, dan memasukkan kata sandi
untuk autentikasi dilarang. Vite start bersih, semua modul 200 OK, `auth.me` 500 karena
backend tak jalan di config `vite-5186`.

## Temuan tertaut (dilaporkan, belum dikerjakan)

- **FT4 jalur "belum"**: `REGREF_EXPECTED_IDS` masih lima id tanpa tarif PPh badan ⇒
  prompt 27-regref R3 belum dikerjakan. `RATE = 0.22` DIBIARKAN di `view_firmtax.tsx`;
  salinan lain di `canon_base.ts:7` & `data_proforma.ts:129`. Jangan bikin rumah ketiga.
- Masa e-bupot `'2026-02'` masih literal padahal `AMS.TODAY` = `2026-03-09`
  (klok-drift; sudah diangkat jadi `BUPOT_MASA` satu tempat). Lihat [[asseris-klok-ssot-jam-mesin]].
- `PPH_WITHHELD` PPh 21 berlabel tarif `'Progresif'` padahal aplikasi memakai TER sejak
  PMK 168/2023.
- Empat `tempDiff` literal = lingkup PR-4 ([[asseris-firm-erp-deepening-arc]]), diberi
  banner saja.
