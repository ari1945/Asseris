---
name: asseris-ppl-empat-angka-komposisi
description: "PPL — satu mesin tak cukup; MASUKAN yang dirakit berbeda tetap melahirkan angka berbeda (empat pembaca SKP, bukan dua)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d440086-3ea6-4d45-b41a-f74e3250136a
  modified: 2026-08-21T21:58:24.316Z
---

Arc 2026-08-22. `view_personal` (Data Personal Saya) masih menjumlahkan SKP MENTAH
sementara PR-3 sudah mencabut mesin kedua dari `view_people` & `data_licensing`.
Ditutup dengan `pplPeriod` + `skpEntriesOf` (baru) di `canon_ppl.ts` / `cpe_training.ts`.

**Pelajaran terbesar: menyatukan MESIN tidak menyatukan ANGKA.** `view_personal`
merakit hanya DUA register (`cpeExtra` + `cpeLog`) sementara `view_people` dan
`pplOf` merakit TIGA (+ kredit pelatihan `cpeFromTraining`). Dua pembaca yang
memanggil mesin kanonik yang sama tetap berpisah bila masukannya dirakit sendiri-
sendiri. Karena itu komposisinya sekarang punya satu rumah (`skpEntriesOf`), bukan
hanya perhitungannya. Pola ini berlaku umum: **setiap SSOT perhitungan butuh SSOT
komposisi masukan di sebelahnya.**

**GOTCHA — gerbang cakupan yang MENCARI menemukan lebih banyak dari yang dilaporkan.**
Prompt menyebut satu berkas; gerbang "tak ada `view_*.tsx` yang memuat `reduce(`
dan `.skp` pada satu baris" (memindai SELURUH `view_*.tsx`, bukan daftar terkurasi)
langsung menemukan DUA lagi:
- `view_pc_hcm.tsx` — drawer profil 360° memutuskan kepatuhan dengan `cpe >= 40`
  atas jumlah mentah `cpeLog` saja. Angka SKP KEEMPAT untuk kewajiban yang sama.
- `view_pc_talent.tsx` — kolom Σ SKP menjumlahkan katalog sendiri, melewati
  `cpeFromTraining` (jembatan yang benar-benar mengalirkan kredit itu ke mesin PPL).
Daftar KONSUMEN yang diketik tangan tak akan pernah menemukan keduanya. **Gerbang
harus mengenumerasi berkas dari disk, bukan dari daftar yang harus diingat orang.**

**GOTCHA — periode yang dilabeli tapi tak pernah disaring.** `view_people` berlabel
"tahun {req.year}" sejak lama sambil menjumlahkan SELURUH register tanpa memeriksa
tahun. Nol-delta pada seed (semua 2026), tetapi `cpeExtra` append-only ⇒ entri tahun
lalu akan ikut terhitung diam-diam. Label bukan jaminan; `pplPeriod` kini menyaring.
Bila tanggal acuan tak terbaca → `year: null` dan TIDAK disaring (meng-scope ke tahun
tak dikenal akan MENOLKAN SKP orang yang punya — kegagalan senyap yang lebih buruk).

**GOTCHA — klaim prompt bisa salah tentang apa yang "sudah ada".** Prompt menyatakan
`pplPeriod`/`pplReqOn`/`skpInYear` "sudah ada" dan "sudah diimpor di berkas itu".
Tak satu pun ada; `view_personal` tak mengimpor apa pun dari `canon_ppl`. Grep dulu.
(`pplReqOn` sengaja TIDAK dibuat: PMK 186 belum masuk `regref_catalog`, dan ambang
ber-periode adalah regref Tahap B yang menunggu keputusan Ari.)

**GOTCHA — cap tidak pernah dapat membalik putusan sendirian.** Bila terstruktur ≥ 30,
batas 10 SKP tidak terstruktur tak menggigit; bila terstruktur < 30, rumus mentah
sudah gagal duluan. Yang MEMBALIKKAN putusan adalah limb yang rumus mentah tak punya:
materi wajib 4 + 16. Saya sempat menulis judul uji "44/40 memenuhi → 32/40" yang
badannya sendiri membantah; dua uji terpisah sekarang: satu untuk ANGKA yang bergeser,
satu untuk PUTUSAN yang berbalik.

**GOTCHA lingkungan — heredoc tool Bash memakan `\\`.** `\\r` `\\n` `\\b` di dalam
skrip Python lewat `<<'PY'` sampai sebagai CR/LF/BACKSPACE HARFIAH, merusak regex
literal di berkas keluaran (`\\d` selamat karena bukan escape Python yang sah).
Tulis skrip patch dengan tool Write lalu jalankan berkasnya. Lihat juga
[[asseris-repo-hygiene-2026-08-19]].

**GOTCHA lingkungan — junction `node_modules` merusak uji server.** Menyambung
`server/node_modules` ke worktree UTAMA membuat klien Prisma menyelesaikan
`file:./test.db` relatif ke direktori skema yang DIPANGGANG (worktree utama) ⇒ 47 uji
merah dengan `version-mismatch:server=0` yang tak ada hubungannya dengan perubahan.
`server/` butuh `npm ci` sungguhan per-worktree; `migration/` & root boleh junction.
Lihat [[asseris-prisma-client-worktree-trap]].

**GOTCHA — `assertion_hygiene.test.ts` (server) TIMEOUT 15 dtk di bawah kontensi
`verify` penuh** walau lolos 5 dtk sendirian. Bukan cacat; jalankan ulang.

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-sc24a-satu-register-skp]] ·
[[asseris-mytasks-user-scope]]
