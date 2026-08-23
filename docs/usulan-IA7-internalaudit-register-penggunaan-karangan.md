# IA7 — tiga register `internalaudit` yang menyatakan pekerjaan audit yang tak pernah dilakukan

> Dibuat 2026-08-23 saat mengerjakan [`prompts-perbaikan/80-internalaudit.md`](prompts-perbaikan/80-internalaudit.md);
> prompt arc IA1–IA6 **tidak** menyebutnya — ia ditemukan saat investigasi dan mula-mula
> dipisahkan agar PR IA1–IA5 tetap dapat direviu.
>
> **Status: DIKERJAKAN** atas permintaan Ari (2026-08-23), sebagai arc terpisah di atas
> `ab3ce02`. Dokumen ini dipertahankan sebagai catatan temuan & keputusan desain;
> bagian **[Yang dikerjakan](#yang-dikerjakan)** di akhir mencatat apa yang benar-benar
> mendarat dan apa yang tetap di luar lingkup.

## Temuan

Arc IA1–IA5 mencabut dua karangan dari `view_internalaudit.tsx`: profil fungsi audit
internal klien (`IA_PROFILE`) dan seed evaluasi ¶16 yang sudah berisi jawaban
(`IA_FACTORS_SEED`). **Tiga konstanta modul dengan kelas cacat yang sama masih berdiri**,
dan lingkupnya lebih besar daripada keduanya:

### 1 · `IA_USE_AREAS` — lima area penggunaan, lengkap dengan hasilnya

```
{ id:'U1', area:'Pengujian pengendalian siklus penggajian', …, reperf:0.20, result:'Memadai',
  desc:'SPI telah menguji efektivitas operasi pengendalian … sepanjang tahun.' }
```

`result: 'Memadai'` adalah **kesimpulan yang sudah terisi** — persis pola yang gerbang
`opening_conventions.test.ts` larang (`nol disposisi kesimpulan sebagai nilai konstanta`).
`desc` menyatakan dalam bentuk telah-dikerjakan (*"SPI telah menguji …"*, *"Rekonsiliasi
bulanan diuji SPI atas 6 rekening utama"*). Lima area yang sama, dengan tingkat
reperformansi yang sama, untuk setiap klien dan setiap perikatan.

Kolom `lead` (`PR-3` · `A-2` · `C-1` · `PR-1` · `B-4`) menjanjikan rujukan kertas kerja
yang **tidak ada di register mana pun**:

```
migration/src/data_part1.ts   WORKPAPERS  → ref: A · B · C · E · F · R  (huruf saja)
migration/src/wp_signoff.tsx  WP_MODULE_MAP → tak satu pun 'PR-3'/'A-2'/'C-1'/'PR-1'/'B-4'
```

Itulah sebabnya tombol **"Buka WP {lead}"** dicabut di arc IA1–IA5 alih-alih diaktifkan:
menamai tujuan yang tak pernah ada lebih buruk daripada tidak menamainya.

### 2 · `IA_REPERF` — lima pos reperformansi beserta hasil auditor

```
{ id:'RP-04', item:'Hitung ulang 12 item persediaan', iaConcl:'Akurat',
  reperf:'1 selisih minor', exc:1, status:'Selisih < CTT' }
```

Ini adalah **bukti audit**: pernyataan bahwa auditor melaksanakan kembali pekerjaan
fungsi audit internal (SA 610 ¶24) dan apa hasilnya. Angka `exc` mengalir ke tiga kartu
statistik di layar. Paragraf di bawah tabel menyatakan temuan spesifik (*"Pada siklus
pendapatan, ditemukan 2 kekurangan dokumentasi"*) untuk setiap perikatan.

`status: 'Selisih < CTT'` bahkan menyandarkan diri pada **clearly trivial threshold**
perikatan — angka yang hidup di kanon materialitas dan tak pernah dibaca di sini.

### 3 · `IA_DIRECT` — tiga individu bernama, dengan jam

```
{ id:'DA-1', name:'Sari Anjani (QIA)', task:'Pendampingan observasi opname cabang Surabaya',
  superv:'Dimas R.', review:'Penuh', hours:24, status:'Selesai' }
```

Nama orang, nama penyelia, jumlah jam, dan status *Selesai* — pernyataan bahwa individu
tertentu mengerjakan prosedur audit tertentu di bawah supervisi orang tertentu. Total
52 jam dirender di kepala panel. SA 610 ¶33 menuntut persetujuan tertulis entitas **dan**
individu sebelum bantuan langsung diberikan; panel "Prasyarat" di sebelahnya dulu
mencentang keempat prasyarat itu sebagai `ok: true` (dicabut di arc IA1–IA5 menjadi
daftar tuntutan, bukan daftar centang).

## Mengapa ini lebih berat daripada seed evaluasi ¶16

Seed evaluasi setidaknya **dapat disunting dan ter-persist** — auditor bisa mengubahnya.
Ketiga register di atas **tidak punya satu pun kontrol penyunting**: tak ada cara
menambah area penggunaan, mencatat hasil reperformansi yang sebenarnya, atau mendaftarkan
individu yang benar-benar memberi bantuan langsung. Yang tampil adalah satu-satunya yang
bisa tampil.

Dan ia **ikut tersegel**: memo SA 610 belum membawanya hari ini, tetapi setiap penambahan
"lengkapi memo dengan area penggunaan & reperformansi" akan mengirim ketiganya ke dalam
berkas bersegel — kelas cacat yang persis sama dengan `predecessorName` di modul `opening`
(fabrikasi yang dikira berhenti di layar, ternyata tidak).

## Yang diusulkan

1. **Register penggunaan** (`IA_USE_AREAS`) → dokumen `internalAudit.v1.useAreas`,
   ter-persist per perikatan, diseed **kosong**, dengan kontrol tambah/sunting/hapus.
   `result` menjadi taksonomi pilihan (Memadai · Perlu Perluasan · Dikecualikan), bukan
   nilai bawaan. Kolom `lead` menjadi **tautan ke kertas kerja yang ada** (pilih dari
   `WORKPAPERS`/`WP_MODULE_MAP`) atau dihapus — bukan string bebas yang menjanjikan
   rujukan karangan.
2. **Register reperformansi** (`IA_REPERF`) → sama; `exc` dan status diturunkan dari
   isian, dan ambang *clearly trivial* dibaca dari kanon materialitas perikatan, bukan
   ditulis di dalam string status.
3. **Register bantuan langsung** (`IA_DIRECT`) → sama; ditambah gerbang ¶33: baris tak
   dapat berstatus *Selesai* sebelum kedua persetujuan tertulis tercatat.
4. **Gerbang sumber**, mengikuti `opening_conventions.test.ts`:
   nol `result:`/`status:` berisi disposisi sebagai nilai konstanta · nol nama personel
   literal · nol jam sebagai konstanta · nol rujukan kertas kerja yang tak resolve.

Perkiraan: satu arc setara `opening` (O1–O4) — tiga register, tiga set kontrol, satu
gerbang. **Bukan** tambahan yang layak ditempelkan ke PR IA1–IA5.

---

## Yang dikerjakan

Ketiga register kini hidup di dokumen `internalAudit.v1` (naik ke `ver: 3`),
ter-persist per perikatan, **diseed kosong**, dengan tabel master + panel detail
berisi kontrol native berlabel. Model & mesinnya di `internalaudit_memo.ts` (murni,
diuji); `view_internalaudit.tsx` hanya merender & menyunting.

**Yang melampaui rencana di atas — dan sebabnya.** Rencana awal hanya menyebut tiga
register. Saat mengerjakannya, tiga permukaan lain ternyata *menyatakan hasil dari
register yang sama* dan akan tertinggal sebagai kebohongan yang bertahan:

| Permukaan | Dulu | Sekarang |
|---|---|---|
| Tabel dampak ¶18 | 5 baris literal (*"40 sampel sendiri" → "20 sampel + reperform 20%"*) | satu baris per area, efek dari `iaUseAreaImpact()` |
| Daftar dokumentasi ¶36–37 | 4 butir + indeks arsip `A-610.1`…`A-610.4` yang tak ada di register mana pun, tanpa keadaan "belum" | 5 butir ¶36/¶37 dengan status turunan `iaDocumentationChecklist(doc)` |
| Panel reviu bantuan langsung | *"Seluruh pekerjaan bantuan langsung direviu 100%"* | kutipan tuntutan ¶32/¶34 + hitungan `n dari m` baris yang direviu penuh |

Ditambah paragraf naratif yang menyimpulkan hasil reperformansi (*"Reperformansi
mengonfirmasi simpulan … ditemukan 2 kekurangan dokumentasi"*) dan kartu statistik
`'1'` yang tak ikut bergerak — keduanya dicabut/diturunkan.

### Keputusan desain yang berbeda dari rencana

**Mesin MEMBANTAH, bukan mengisi.** Godaan terbesar arc ini adalah membiarkan mesin
*menjawab* — mis. memaksa `result = 'Dikecualikan'` ketika `judgment = 'Tinggi'`. Itu
akan mengulang cacat yang sedang dicabut, hanya dengan pengarang yang berbeda. Yang
dipilih: auditor menjawab, mesin **menyatakan ketika jawaban itu bertentangan** dengan
SA 610 atau dengan angka perikatan — `iaUseAreaConflicts` (¶18/¶19/¶24),
`iaReperfConflicts`, `iaDirectBlockers` (¶29/¶33/¶34). Jawaban yang dibantah tetap
boleh dikirim; yang tak boleh adalah bantahannya tidak terlihat. Bantahan itu **ikut
tersegel di memo** — memo tidak boleh lebih rapi daripada kertas kerjanya.

**Satu pengecualian: status bantuan langsung DIGERBANG, bukan sekadar dibantah.**
`Berlangsung`/`Selesai` tak dapat dipilih sebelum ¶29 + ¶33(a) + ¶33(b) + penyelia ¶34
tercatat, dan `Selesai` menuntut reviu **Penuh**. Alasannya bukan gaya: ¶33 menuntut
persetujuan tertulis **sebelum** bantuan diberikan, jadi baris yang berstatus berjalan
tanpa persetujuan bukan jawaban yang keliru melainkan urutan yang mustahil. Dokumen
warisan yang terlanjur melampaui prasyarat tidak diam-diam dibetulkan — ia dilaporkan
lewat `iaDirectViolations`.

**`clearly trivial` dibaca, bukan diklaim.** Status lama `'Selisih < CTT'` menyebut
ambang yang tak pernah dibaca dari mana pun. Sekarang baris reperformansi punya kolom
selisih moneter, diuji terhadap `useMateriality().cttFull` perikatan aktif; tanpa
ambang atau tanpa selisih terkuantifikasi jawabannya **`unknown`**, bukan `below` —
dan klaim "di bawah ambang" yang tak dapat diuji ikut dibantah.

**Rujukan kertas kerja dipilih, bukan diketik.** `wpRef` berasal dari
`useAudit().workpapers` perikatan. Menghapus sebuah area juga **melepas** tautan pos
reperformansi yang menunjuknya — tautan ke area yang tak ada lagi terbaca sebagai
reperformansi atas sesuatu yang tak pernah dicatat.

**Penomoran id dari register, bukan dari `list.length`.** Menghapus baris tengah lalu
menambah baris baru akan melahirkan id kembar, dan id kembar memutus tautan
reperformansi→area ke baris yang salah.

### Kompatibilitas

`normalizeIaDoc` membaca tiga bentuk: larik faktor telanjang (pra-IA1), objek `ver 2`
(IA1–IA5, tanpa register), dan `ver 3`. Register lahir kosong pada dua bentuk pertama.
Baris tanpa `id` dibuang; nilai taksonomi yang tak dikenali jatuh ke **kosong**, bukan
ditebak; angka di luar rentang (mis. `reperfPct: 500`, `hours: -5`) menjadi `null`.

### Tetap di luar lingkup

`IA_PROHIBIT` (larangan ¶30–31) dan daftar strategi koordinasi tetap konstanta: keduanya
kutipan **tuntutan** standar, bukan pernyataan tentang pekerjaan yang sudah dilakukan.
Rantai sign-off `WpPanel` dan pemindahan ambang skor ke `assessment_model` tetap
menunggu keputusan — lihat [`usulan-IA6`](usulan-IA6-internalaudit-skor-dan-signoff.md).
