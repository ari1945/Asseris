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
- Mesin konsolidasi `psak65` itu sendiri — ia sudah sehat (lihat prasyarat di bawah).

## Prasyarat Opsi A — DIPERIKSA, dan sebagian besar sudah ada

Sebelum memilih Opsi A perlu dipastikan figur konsolidasian benar-benar ada dan **tie**; membangun materialitas di atas angka yang tak tie hanya akan melahirkan PBT kelima. Hasil pemeriksaan `canon_part3.ts:387-528`:

- **`psak65(wtb)` menarik induk LANGSUNG dari WTB** (`aj()` basis adjusted) dan mengonsolidasikannya dengan empat anak + lima jurnal eliminasi. Ia bukan seed beku.
- **Neraca konsolidasian menutup**: `balCheck === 0` diuji eksplisit, dan `goodwillTotal` di-tie ke `AMS_CANON.GOODWILL`.
- **Laba neto konsolidasian terderivasi**: `consolNpat = indukSeparate + subsNpat − elimLaba`, lengkap dengan `nciProfit` dan `ownersProfit`.

**Koreksi atas draf pertama PRD ini.** Draf pertama menyatakan jumlah `npat` komponen 40,41 M "tidak pernah direkonsiliasi" dengan laba neto WTB 23,158 M. **Keliru:** `GROUP_SUBS` berisi CP-02…CP-05 saja — **induk sengaja tidak ada di sana** karena ia berasal dari WTB. Draf itu menjumlahkan CP-01 ke dalam komponen padahal CP-01 *adalah* entitas WTB — menghitung induk dua kali. Tidak ada rekonsiliasi yang hilang.

**Satu prasyarat yang BENAR-BENAR kurang: PBT konsolidasian tidak dapat diturunkan.** Paket pelaporan komponen (`GROUP_SUBS`) membawa `rev` dan `npat`, tetapi **tidak** membawa PBT maupun beban pajak per anak. Karena itu benchmark PBT — benchmark yang dipakai perikatan ini — tak dapat dihitung untuk grup tanpa mengasumsikan tarif seragam, dan mengasumsikan tarif atas entitas Singapura jelas salah.

Dua jalan keluar, dan ini **pertanyaan ketiga untuk Anda**:

- **A-1 — perluas paket pelaporan komponen dengan PBT & beban pajak per anak.** Benar secara metodologi (itu memang isi paket pelaporan komponen yang diminta SA 600), sedikit pekerjaan seed + satu kolom impor. **Rekomendasi saya.**
- **A-2 — pindah benchmark grup ke Total Aset atau Pendapatan konsolidasian.** Keduanya sudah dapat diturunkan hari ini (`totals.aset.konsol`; pendapatan = induk + Σ anak − ELM-01). Nol perubahan data, tetapi benchmark grup lalu berbeda jenis dari benchmark perikatan — perbedaan yang harus didokumentasikan, bukan disembunyikan.

### KEPUTUSAN: A-1 (didelegasikan Ari, 2026-07-27)

Ari meminta pilihan diambilkan. **A-1.** Tiga alasan, urut kekuatan:

1. **Data yang hilang adalah data yang memang seharusnya ada di paket.** SA 600 menuntut paket pelaporan komponen memuat apa yang dibutuhkan auditor grup untuk kesimpulannya. PBT dan beban pajak per komponen bukan tambahan mewah — ketiadaannya adalah **cacat paket**, bukan alasan mengganti metodologi. A-2 memperbaiki gejala dengan memilih benchmark yang kebetulan bisa dihitung.
2. **A-2 menciptakan asimetri permanen.** Benchmark perikatan adalah Laba Sebelum Pajak; bila benchmark grup menjadi Total Aset, kedua ambang tak lagi setara jenis — padahal justru hubungan antar keduanya yang ingin ditegakkan SA 600 (komponen < grup, dan komponen selaras dgn audit standalone-nya). Menyimpan dua jenis benchmark demi menghindari empat isian data adalah pertukaran yang buruk.
3. **Entitas Singapura menjadi benar dengan sendirinya.** Dengan PBT + beban pajak per komponen, tarif efektif Sentosa Trading Pte Ltd terbawa dari paketnya sendiri. Di bawah A-2 masalah itu hanya tersembunyi, tak terselesaikan.

Biaya A-1: dua field pada empat seed anak (`GROUP_SUBS`) + dua kolom pada impor paket (`PKG_NUMF`) + roll-up PBT konsolidasian di `psak65`. Kecil, dan seluruhnya di jalur yang sudah ada.

**Tetap memblokir:** Opsi A vs B (populasi ENG-2025-014). A-1 adalah pilihan *di dalam* Opsi A; bila populasinya ternyata induk-standalone (Opsi B), pekerjaan ini tidak diperlukan.

## Cacat tambahan yang tersingkap saat memeriksa prasyarat

`view_groupaudit.tsx` menyimpan **CP-01 sebagai baris hardcode** (`npat: 14_660_000_000`) di `GA_COMPONENTS`, padahal induk semestinya berasal dari WTB lewat `psak65` seperti yang sudah dilakukan `canon_part3`. Jadi modul grup memegang salinan mati entitas yang datanya hidup di modul sebelahnya — kelas cacat yang sama dengan `AJE_META.pbt` yang dibuang PR-D.

## Risks

- Opsi A menaikkan OM, sehingga menggeser kesimpulan SA 450 yang baru saja distabilkan PR-A/PR-C (agregat 220% OM dapat turun di bawah 100%). Pergeseran itu **benar** bila populasinya memang konsolidasian — tetapi harus disadari, bukan ditemukan belakangan.
- Menurunkan materialitas komponen CP-01 dari 4,25 M ke ambang yang selaras akan menaikkan jumlah temuan komponen di demo.

## Open Questions

1. Populasi ENG-2025-014 — Opsi A atau B. **Memblokir.**
2. Metode alokasi materialitas komponen: proporsional terhadap ukuran, atau ditetapkan per signifikansi risiko? SA 600 mengizinkan keduanya; firma perlu satu kebijakan tertulis.
3. Apakah GROUP_CTT tetap 5% dari materialitas grup, atau mengikuti kebijakan CTT perikatan?
