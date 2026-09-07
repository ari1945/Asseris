---
name: asseris-gradient-token-sweep
description: "Sapuan henti gradien → token — cacat yang HANYA ada di tema gelap, jebakan token TEKS-vs-ISIAN, dan ekstraktor regex yang buta di belakang var()"
metadata: 
  node_type: memory
  type: project
  originSessionId: a88d1ccc-d361-47d8-969b-57f4ccdc6cde
  modified: 2026-08-27T01:25:16.448Z
---

**PR #313** (`84b667c`), lanjutan [[asseris-on-dark-token-sweep]] (#311 `650ce3a`).
172 henti gradien · 63 berkas. `npm run verify` HIJAU; CI 9/9; master hijau.

## Cacat yang tak terlihat di tempat orang memeriksanya
`view_cockpit2`: `linear-gradient(120deg,var(--navy-700),var(--blue-solid))`.
77 hero lain: `linear-gradient(125deg,#013a52,#005085)`.

Di tema **TERANG identik piksel** — `--navy-700` MEMANG `#013a52`. Selisihnya
hanya di **GELAP** (`--navy-700` → `#0d1d29`). Jadi panel-panel itu **tak pernah
mengikuti tema gelap**; mereka membawa warna tema terang ke dalamnya.
**Karena tema terang adalah tempat orang memeriksa, cacatnya tak pernah
terlihat — itulah yang membuatnya bertahan di 63 berkas.**
→ Pola umum: **cacat yang hanya muncul di satu tema akan hidup lama.** Saat
menilai warna, selalu selisihkan nilai TERANG vs GELAP tokennya.

Efek: `--on-dark-muted` pd henti navy **8,03 → 11,33** (gelap); henti `#005085`
tak berubah (kasus terburuk tetap) ; tema terang nol perubahan.

## JEBAKAN UTAMA — token TEKS vs ISIAN bernilai SAMA di tema terang
"Cari token yang nilainya `#005085`" mengembalikan **`--blue` (TEKS)** sebelum
**`--blue-solid` (ISIAN)**. Keduanya `#005085` di terang ⇒ **SELURUH uji
tema-terang tetap hijau**. Tapi `:root.dark` MEMBALIK token teks agar terbaca di
atas permukaan gelap (`--blue`→`#6b9ab8`, `--navy`→`#8298a1`) ⇒ panel gelap jadi
biru muda/abu terang.
→ **JANGAN pernah menurunkan peta warna secara otomatis dari kesamaan nilai.**
Petakan TANGAN per PERAN (§5: semantik polos = TEKS, isian = `--*-solid`), lalu
ikat peta itu kembali ke stylesheet lewat uji.
`--*-solid` aman sebagai isian HANYA karena sengaja tak di-override di
`:root.dark` — itu diuji tersendiri, supaya kalau seseorang meng-override-nya
uji yang bicara, bukan panel yang berubah diam-diam.

Peta ISIAN: `#013a52`→navy-700 · `#024661`→navy-600 · `#002c3f`→navy-solid ·
`#005085`→blue-solid · `#2f7bb0`→blue-400 · `#1f7a4d`→green-solid ·
`#0a6b73`→teal-solid · `#5b3fa6`→purple-solid · `#b3261e`→red-solid.

## `[^)]*` BUTA begitu isinya bersarang — gerbang saya sendiri lolos mutasi
`/linear-gradient\([^)]*\)/` berhenti di `)` milik `var(--navy-700)`. Selama
henti masih hex ia benar; **begitu henti menjadi token, semua sesudah token
pertama tak diperiksa**. Gerbang saya LOLOS mutasi `--blue-solid`→`--blue`, dan
**sapuan saya memakai pola cacat yang sama** ⇒ melewatkan `view_audittimeline.tsx:197`
(`#005085` di belakang sebuah `var()`).
→ Pakai **penghitung kedalaman kurung**. Kasusnya dibekukan jadi uji sendiri.
→ **Pelajaran berulang: uji mutasi menemukan yang pembacaan ulang tak temukan.**
Setiap gerbang baru WAJIB dimutasi, bukan sekadar dilihat merah sekali.
Senada: [[asseris-tipografi-gerbang-buta-ternari]] (regex menuntut digit persis).

## Gerbang yang menuntut perbaikan MUSTAHIL adalah gerbang buruk
`ATL_tint('#005085',.22)` menjalankan `parseInt(hex.slice(1),16)` — diberi
`var()` hasilnya **NaN**. Remedi yang gerbang sarankan justru merusak.
→ Hex sebagai **argumen pemanggilan fungsi** dikecualikan (regex
`\b[A-Za-z_$][\w$]*\(\s*['"]?$` pada teks sebelum hex), didokumentasikan.

## Dikecualikan lainnya
- **`repeating-linear-gradient`** (arsir belang, `view_capacity` sel cuti):
  hanya SEPARUH pasangan bernilai token (`#eef1f4`=--surface-3, pasangannya
  `#e7ebef`/`#e3e7ec` bukan). Mentokenkan separuh ⇒ belang gelap-vs-terang di
  tema gelap. **Regresi.**
- **27 nilai henti bukan-token** — hero ber-rona ungu/hijau/merah/teal. Masih
  menunggu keputusan keluarga token ber-rona (butir 1 di luar-lingkup #311).

## Ritme merge yang terbukti di sesi ini
Master bergerak **3×** saat kerja berjalan (#310, #312, #305). Resep:
`fetch` → cek **irisan berkas** (`comm -12` dua daftar `git diff --name-only`) →
kalau beririsan **rebase + verify ulang**; kalau nol irisan, hijau lama sah →
push → tunggu 9 check → **cek master lagi** → merge.
**CI hijau BASI kalau master bergerak sesudahnya** — dua kali hampir merge basi.
`gh pr merge --squash` TANPA `--delete-branch` (worktree lain memegang master),
hapus cabang remote manual sesudahnya.
