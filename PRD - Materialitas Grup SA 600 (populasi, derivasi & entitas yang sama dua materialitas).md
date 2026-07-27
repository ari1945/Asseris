# PRD — Materialitas Grup SA 600

Status: **menunggu keputusan metodologi Ari** · Basis: master `4f98fdb` (setelah #139–#142)

## Koreksi atas perumusan sebelumnya

Catatan arc sebelumnya menyatakan seluruh materialitas komponen "berada DI ATAS OM grup 1,4845 M — mustahil menurut SA 600". **Perumusan itu keliru dan tidak boleh dipakai sebagai dasar kerja.**

Dua hal yang salah di sana:

1. **1,4845 M bukan materialitas grup.** Ia diturunkan dari WTB, dan modul grup sendiri menyatakan WTB adalah **saldo standalone entitas induk** (`view_groupaudit.tsx:47`). Materialitas grup berlaku atas laporan keuangan **konsolidasian**, yang populasinya lebih besar. Materialitas grup melebihi OM induk-standalone karena itu wajar, bukan mustahil.
2. **Syarat SA 600 yang sesungguhnya justru terpenuhi.** SA 600 menuntut materialitas komponen lebih rendah dari materialitas grup untuk menekan risiko agregasi. Faktanya: 4,25 · 2,1 · 1,65 · 1,4 M — seluruhnya **di bawah** GROUP_MAT 6,2 M.

Cacatnya nyata, tetapi letaknya lain.

## Problem

**P-1 — satu entitas hukum, dua materialitas, selisih 2,9×.** CP-01 adalah "PT Sentosa Makmur", yaitu **entitas yang sama** dengan perikatan ENG-2025-014. Sebagai perikatan, materialitas keseluruhannya kini **Rp 1,4845 M** (diturunkan dari WTB-nya sendiri, PR-A). Sebagai komponen grup, materialitasnya **Rp 4,25 M** (`view_groupaudit.tsx:26`). Auditor yang sama, entitas yang sama, periode yang sama, dua ambang berbeda 2,9×. Salah saji Rp 3 M pada induk adalah material di satu modul dan tidak material di modul lain.

**P-2 — angka 4,25 M itu warisan yang sudah didiskreditkan.** OM fantasi pra-PR-A adalah 4,26 M, dan `ENG-2025-014.materiality` ditala ke 4,25 M agar detektor drift diam. Materialitas komponen CP-01 adalah **angka yang sama**. PR-A mencabut basisnya di modul materialitas; salinannya di modul grup tak tersentuh.

**P-3 — GROUP_MAT tidak diturunkan dari apa pun.** `GROUP_MAT = 6_200_000_000` adalah konstanta telanjang. Tidak ada figur konsolidasian yang menjadi basisnya, tidak ada persentase, tidak ada benchmark. GROUP_PM (4,65 M = 75%) dan GROUP_CTT (310 jt = 5%) konsisten *terhadapnya*, sehingga seluruh piramida rapi di atas fondasi yang tak pernah dihitung — kelas cacat yang persis sama dengan PBT 85,2 M yang dicabut PR-A.

**P-4 — default lingkup memakai angka ajaib.** `view_groupaudit.tsx:137`: komponen yang naik dari `Analytical` mendapat `Math.round(GROUP_MAT * 0.35)`. Angka 0,35 tak berdasar apa pun dan tak terdokumentasi.

## Objective

Materialitas grup dan komponen diturunkan dari figur yang dapat ditelusuri, dan satu entitas hukum tidak pernah membawa dua ambang materialitas yang berbeda dalam satu periode.

## KEPUTUSAN YANG SAYA MINTA — populasi ENG-2025-014

Ini menentukan seluruh sisa desain, dan bukan keputusan saya.

**PT Sentosa Makmur Tbk adalah entitas tercatat** (faktor kualitatif "Entitas tercatat (publik)" aktif di modul materialitas), dan entitas tercatat di Indonesia menerbitkan **laporan keuangan konsolidasian**. Namun WTB perikatan ini adalah **standalone induk**. Salah satu dari dua hal berikut benar, dan keduanya menuntut pekerjaan berbeda:

**Opsi A — perikatan ini adalah audit atas LK konsolidasian.** Maka OM 1,4845 M dihitung atas populasi yang salah: benchmark seharusnya PBT konsolidasian, bukan PBT induk-standalone. Konsekuensi: WTB perlu figur konsolidasian (atau `entityFigures` menerima basis konsolidasi dari mesin PSAK 65 yang sudah ada), OM naik, dan GROUP_MAT menjadi turunan OM itu — bukan konstanta. CP-01 lalu memperoleh materialitas komponen sebagai porsi dari materialitas grup, dan kontradiksi P-1 lenyap karena hanya ada satu materialitas grup.

**Opsi B — perikatan ini adalah audit induk-standalone; audit grup adalah perikatan lain.** Maka OM 1,4845 M benar, tetapi modul grup sedang menampilkan data perikatan yang berbeda di dalam ruang kerja perikatan ini. Konsekuensi: modul grup harus terikat pada perikatan grup tersendiri (dengan WTB konsolidasiannya sendiri), dan materialitas komponen CP-01 harus **direkonsiliasi** dengan OM induk-standalone — SA 600 menuntut komponen yang juga diaudit standalone tidak memakai ambang lebih longgar daripada audit standalone-nya sendiri.

**Rekomendasi saya: Opsi A.** Entitas tercatat diaudit atas LK konsolidasiannya; itu opini yang diterbitkan. Opsi B memperlakukan modul grup sebagai perikatan hantu yang tak punya tempat bergantung, dan menambah satu regime materialitas lagi ke sistem yang baru saja dikurangi dari lima menjadi dua. Opsi A juga memakai mesin yang sudah ada (`psak65`) alih-alih membuat sumber baru.

**Saya tidak melanjutkan desain sampai Anda memilih.** Menebak di sini berarti mengarang metodologi audit, bukan menulis kode.

## Scope (setelah opsi dipilih)

- Derivasi GROUP_MAT/GROUP_PM/GROUP_CTT dari figur yang dapat ditelusuri, di `canon_*`, bukan konstanta di view.
- Materialitas komponen sebagai fungsi dari materialitas grup + signifikansi komponen, menggantikan lima konstanta dan faktor ajaib 0,35.
- Detektor inkonsistensi: entitas yang muncul sebagai komponen **dan** sebagai perikatan tersendiri tidak boleh membawa dua ambang.
- Uji regresi: seluruh angka yang ditampilkan modul grup tie ke sumber kanonik.

## Non-Scope

- Mengubah mesin konsolidasi PSAK 65 itu sendiri.
- Menyelaraskan `npat` komponen dengan laba WTB. Jumlah `npat` komponen = 40,41 M sedangkan laba neto WTB = 23,158 M; selisihnya wajar bila ada eliminasi intragrup, tetapi angka-angka itu **tidak pernah direkonsiliasi** di mana pun. Itu temuan tersendiri, bukan bagian PRD ini.

## Risks

- Opsi A menaikkan OM, sehingga menggeser kesimpulan SA 450 yang baru saja distabilkan PR-A/PR-C (agregat 220% OM dapat turun di bawah 100%). Pergeseran itu **benar** bila populasinya memang konsolidasian — tetapi harus disadari, bukan ditemukan belakangan.
- Menurunkan materialitas komponen CP-01 dari 4,25 M ke ambang yang selaras akan menaikkan jumlah temuan komponen di demo.

## Open Questions

1. Populasi ENG-2025-014 — Opsi A atau B. **Memblokir.**
2. Metode alokasi materialitas komponen: proporsional terhadap ukuran, atau ditetapkan per signifikansi risiko? SA 600 mengizinkan keduanya; firma perlu satu kebijakan tertulis.
3. Apakah GROUP_CTT tetap 5% dari materialitas grup, atau mengikuti kebijakan CTT perikatan?
