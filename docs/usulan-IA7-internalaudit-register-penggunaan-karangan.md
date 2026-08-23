# Usulan IA7 — tiga register `internalaudit` yang menyatakan pekerjaan audit yang tak pernah dilakukan

> Dibuat 2026-08-23 saat mengerjakan [`prompts-perbaikan/80-internalaudit.md`](prompts-perbaikan/80-internalaudit.md).
> **Status: temuan, belum dikerjakan.** Prompt arc IA1–IA6 **tidak** menyebutnya; ia
> ditemukan saat investigasi. Sengaja TIDAK diperbaiki di PR yang sama — lingkupnya tiga
> register + kontrol penyuntingnya, dan menggabungkannya membuat PR tak dapat direviu.

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
