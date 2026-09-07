---
name: asseris-w1e-chip-border-dan-geometri-range
description: "W1-E (PR #329) — `<span class=\"chip\">`→`<button class=\"chip\">` MELEBAR 4px karena border UA; cara membuktikan non-regresi visual dengan rect Range; dan tiga jebakan harness peramban"
metadata: 
  node_type: memory
  type: project
  originSessionId: 568722cc-4966-437b-8cfd-a26bf45f2288
  modified: 2026-08-28T14:51:03.583Z
---

**PR #329 MENDARAT `f57c24b`** (W1-E: `view_records` · `view_relatedsvc`).

## ⚠ LINGKUP BERUBAH DI TENGAH JALAN — dan itu pelajaran terpentingnya
Saya mengerjakan E1 (`useFirmName()` per call-site) LEBIH DULU, PR terbuka & hijau.
**40 menit kemudian #330 (`868678d`) mendarat dan MENCABUT E1** dari W1-E: baris itu
milik arc `export_identity.ts` (`claude/intelligent-keller-7b28db`) yang MENGHAPUS
argumen `firm:` dari 123 call-site — arsitektur BERLAWANAN. Kalau saya merge tanpa
memeriksa tip master lebih dulu, master memikul dua arsitektur identitas sekaligus.
**ATURAN: sebelum merge, baca commit BARU di origin/master — prompt bisa dicabut
sesudah kerja dimulai.** Verifikasi tabrakannya lewat POHON cabang arc, bukan
percaya catatan: `git show <arc>:migration/src/view_records.tsx | grep amsExportXlsx`
→ nol argumen `firm:`.

Yang akhirnya mendarat: E2 (dua
`<span onClick>` kertas kerja AUP → `<Check>` + `<button>`) + E3 (sepuluh baris/kartu →
kontrol native `.rr-*`/`.rs-*`), dan MENCABUT satu kontrol mati (`Usul Pemusnahan`
tanpa `onClick`).

## Yang paling berharga untuk arc konversi 88 berkas berikutnya

**1. `<span class="chip">` → `<button class="chip">` MELEBARKAN elemen 4px.**
`.chip` (`styles_ai.css:291`) tidak menyetel `border`, jadi tombol mewarisi border UA
2px per sisi. Di `view_records` tab Pemusnahan itu melebarkan kolom "Tahapan"
**124px → 128px**. Obatnya kelas beriringan `.rr-chipbtn{ border:0 }` — JANGAN ubah
`.chip` global. `button { font-family: inherit }` sudah ada di `styles_base.css:297`,
jadi hanya border yang perlu direset. **Enam `<button class="chip">` lain di
`view_records.tsx` (baris 111, 226, 262, 493–495) masih memikul cacat ini.**

**2. Cara MEMBUKTIKAN "tampilan tidak berubah" saat struktur DOM berubah.**
Rect ELEMEN tak bisa dipakai: `<td>` → `<button>` di dalamnya mengubah kotak yang
diukur ([679,187,97,30] → [688,195,79,14]) walau teksnya diam. Yang benar: **rect
`Range`** — `document.createRange().selectNodeContents(el).getBoundingClientRect()` =
kotak TINTA, kebal perubahan pembungkus. Peta `teks → rect` untuk tiap simpul daun,
lalu `git stash` → ukur ulang → diff. Hasil W1-E: **0 selisih** di 12 keadaan tab.

**3. `document.fonts.ready` WAJIB ditunggu sebelum mengukur.** Tanpa itu muncul
pergeseran ±2px pada tab yang TIDAK disentuh sama sekali (Rekonsiliasi) — itu
pemuatan webfont, bukan layout. Nyaris dikejar sebagai cacat.

## Jebakan harness peramban (bila mengulang cara ini)

- **Login tak bisa ditembus:** aturan keselamatan melarang mengetik kata sandi ke
  form mana pun, dan `app.tsx` menggerbangi seluruh SPA di balik `LoginScreen`.
  Jalan keluarnya BUKAN menjalankan server+seed, melainkan **entry harness sendiri**
  yang mengimpor 52 side-effect FASE 1–3 dari `main.tsx` MINUS `./app`, lalu merender
  view langsung di dalam `<AppProviders me={…}>` + `NavContext.Provider`.
- `vite.config` menyetel `esbuild.include: /src\/.*\.(jsx|js|ts|tsx)$/` — entry harness
  **HARUS di dalam `src/`**, kalau tidak JSX-nya tak ditransform ("invalid JS syntax…
  jsx to preserve"). Tapi `src/` juga dipindai `tsc` + `eslint src`, jadi **cabut
  harness sebelum menjalankan `npm run verify` yang mau diklaim**.
- `NavFromContext` nilainya **string id atau `null`**, bukan objek. `{from:null}`
  meledak jadi "Objects are not valid as a React child" di dalam `SubBar`.
- **Backtick di dalam komentar CSS di dalam template literal MENUTUP literalnya.**
  `` const CSS = `…/* `.chip` tidak… */…` `` = parse error. Taruh penjelasan sebagai
  komentar JS di ATAS konstanta.
- `React.act(() => el.click())` lalu langsung mengukur = membaca DOM LAMA; beri
  `await` + `setTimeout` sebelum snapshot.

Lihat juga [[asseris-w1-identitas-tersegel-paralel]] · [[asseris-procurement-kontrol-baris-native]] ·
[[asseris-pppk-kontrol-native]] · [[asseris-icon-button-names]]
