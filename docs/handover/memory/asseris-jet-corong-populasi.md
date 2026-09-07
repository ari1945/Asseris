---
name: asseris-jet-corong-populasi
description: "JET (SA 240 ¶32) — corong populasi karangan dicabut; `+38` ternyata menambal DUA TAHAP YANG RUNTUH JADI SATU, bukan sekadar hiasan"
metadata: 
  node_type: memory
  type: project
  originSessionId: 190bf788-abe4-4692-9d30-c655cef14c31
  modified: 2026-08-22T08:00:15.908Z
---

Arc 2026-08-22, **MENDARAT** di `origin/master` sebagai `7e640a6` (PR #280, squash,
CI 9/9 hijau termasuk playwright/axe; cabang & worktree sudah dibersihkan). Spesifikasi lengkapnya ada di
`docs/prompts-perbaikan/71-jet.md` — prompt Ari hanya kutipan daftar cacatnya.
👉 **Sebelum mengerjakan "perbaikan modul", cek dulu `docs/prompts-perbaikan/<nn>-<modul>.md`.**

## Temuan yang mengubah cara memperbaiki

**`flagged.length + 38` bukan hiasan — ia menambal keruntuhan struktural.**
`flagged` lama menyaring `score > 0 && amount >= minAmt` SEKALIGUS, sehingga tahap
"Memenuhi Kriteria" dan "Dipilih untuk Diuji" secara aljabar SELALU bernilai sama.
Penambah ajaib itu ada supaya keduanya terlihat berbeda. Memisahkan kedua penyaring
membuat slider ambang benar-benar terlihat (8 → 5 pada ambang Rp 1 M) dan penambahnya
tak lagi punya lubang untuk ditambal. **Pola: penambah/pengurang tetap yang "membuat
grafik terlihat benar" biasanya menutupi dua besaran yang sebenarnya satu.**

**Aplikasi sudah tahu populasinya tak memadai — di layar yang sama.** `DiagnosticPanel`
area `jet` mencetak "Hanya 18 nilai valid (< 30) … Tarik populasi jurnal/pembayaran
penuh dari GL". Corong di atasnya mengklaim 18.452. Dua komponen di satu halaman saling
membantah. Cari dulu apakah modul sudah menyatakan kebenarannya di tempat lain.

**Pilihan J1 yang diambil:** (a) turunkan dari populasi nyata, TAPI hanya untuk tahap
yang datanya ada. `JOURNAL_POP` tak punya field manual/otomatis sama sekali, jadi tahap
"Jurnal Manual" tak dapat diturunkan — itu bukan alasan mengarang angka lebih kecil,
melainkan alasan menghapus tahapnya dan menyatakan ketiadaannya (setengah opsi b).
Corong sekarang: dimuat 13 → memenuhi kriteria 9 → dipilih 9 → didisposisi 0.

**Kedua tombol DIHAPUS, bukan diaktifkan.** Skoring dihitung ulang tiap render ⇒
"Jalankan Pengujian" memang tak punya pekerjaan. "Import GL" tak bisa diaktifkan tanpa
alur impor ⇒ kebutuhannya ditulis di `docs/usulan-J-jet-impor-gl-populasi.md`.
Godaan yang saya tolak: membuat dialog "deklarasi populasi" — itu memindahkan karangan
dari kode ke jari auditor.

## GOTCHA yang mahal

- **`key: "Space"` dari alat browser in-app TIDAK mengaktifkan checkbox native.**
  Dibuktikan dengan KONTROL: `<input type=checkbox>` polos yang saya suntikkan sendiri
  juga tidak toggle. Padahal `type` (teks) BEKERJA — jadi "keyboard mati" itu selektif,
  bukan total. Operabilitas papan-ketik tak bisa dibuktikan dengan alat ini; buktikan
  lewat STRUKTUR (`input[role=switch]`, `tabIndex 0`, label terkait) + gerbang.
  Lihat juga [[asseris-succession-kontradiksi-dibuang]], [[asseris-orgchart-divisi-hilang-a11y]].
- **Menjalankan preview server SAAT `npm run verify` berjalan MEMERAHKAN 36 uji
  BACKEND.** Tanda tangannya `expected 'v0->v2' to be 'v0->v1'` — sesi peramban saya
  menulis `state.set` ke dev.db yang sama dengan suite uji. Hentikan `preview_stop`
  dulu; sesudahnya 431/431 hijau tanpa satu baris kode pun berubah.
- **`npm run verify | tail -40` menelan exit code DAN memotong berkas outputnya** —
  daftar kegagalan hilang, dan `[exited with code 0]` berbohong. Redirect ke berkas
  penuh (`> f.txt 2>&1`), jangan pipa.
- **`id="..."` statis pada kontrol `.field` memerahkan `a11y_field_labels.test.ts`** —
  wajib `React.useId()` (`uid + '-note'`). Regresi yang saya buat sendiri saat
  memperbaiki label.
- **Pohon kerja utama merah dari TIGA arc lain** (mytasks_derive · view_mytasks_parts
  61 `:any` · home_composition · wip_writedown_authority). Satu-satunya cara membuktikan
  hijau: worktree terpisah dari `origin/master` + junction `node_modules`. Sesudahnya
  **WAJIB** `npx prisma generate` dari pohon utama (klien terpanggang menunjuk path
  worktree) dan lepaskan junction dengan `cmd /c rmdir` — bukan `rm -rf`.
  Lihat [[asseris-prisma-client-worktree-trap]], [[asseris-sesi-paralel-satu-worktree]].
- Suppression `:any` untuk `src/view_jet.tsx` jadi BASI setelah `(c: any)` dihapus.
  JANGAN jalankan `npm run lint:any-baseline` di pohon bersama — ia akan menelan 61
  error arc lain ke baseline. Cabut entri berkasnya dengan tangan.

## Yang TIDAK dikerjakan (sengaja)

- Impor GL nyata — dilarang prompt; ditulis sebagai usulan.
- `forensic_canon.ts` tak disentuh (populasi bersama dengan modul `forensic`).
- Populasi tetap SAMA untuk setiap perikatan sementara disposisi engagement-scoped;
  dinyatakan di layar, tak dapat diperbaiki tanpa impor.
- Pola `new Date()` untuk stempel masih hidup di ~10 modul saudara (`wpToday`,
  `icfrToday`, `fraudToday`, `estToday`, `gcToday`, `soToday`, `nocToday`, `smpToday`,
  `todayStr` di groupaudit). Hanya `jet` yang dipindah ke `AMS.TODAY` — sapuan K-02
  sisanya adalah PR tersendiri.
