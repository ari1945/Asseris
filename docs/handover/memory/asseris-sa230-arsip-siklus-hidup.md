---
name: asseris-sa230-arsip-siklus-hidup
description: "SA 230 (#286 mendarat 5b73374) — siklus hidup arsip ke kanon RETENTION; agregat hantu \"undefined%\" di memo tersegel; kontradiksi retensi DITUTUP di 7 tahun lewat #291"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3fd8e67b-f7a8-4e7b-9a12-c52293b60313
  modified: 2026-08-22T12:51:54.666Z
---

**Tiga PR, semuanya MENDARAT 2026-08-23:** #286 `5b73374` (siklus hidup arsip) → #291 `13d7493` (satu kebijakan retensi, 7 thn) → #292 `5833ad3` (ARC-014, register bayangan). Master hijau di keempat workflow. Nama berkas prompt: `docs/prompts-perbaikan/86-sa230.md`.

## Penomoran `docs/prompts-perbaikan/NN-<modul>.md` — TERPECAHKAN

`NN` = **urutan deklarasi datar di `MODULES` (`icons.tsx`)**, 1-based. Diverifikasi:
home=1 · wip=11 · billing=12 · hcm=15 · orgchart=16 · succession=19 · independence=25 ·
regref=27 · firmgl=28 · apar=29 · revenue=30 · treasury=31 · cashbank=32 · jet=71 ·
**sa230=86** · firmops=146 · records=150. Hitung dengan regex `\{\s*id:\s*'([a-z0-9_]+)'\s*,\s*label:`.

## Cacat yang ditutup

`grep -n "RETENTION" view_sa230.tsx` → **nol**. Modul ber-judul SA 230 satu-satunya
yang tak memakai lapisan Arsip kanonik `data_records.ts`, padahal kepala berkas kanon
itu menulis aturannya sendiri: *"KEBIJAKAN RETENSI adalah sumber tunggal masa simpan …
bukan di-hardcode ganda."*

- `DEFAULT_RETENTION_YEARS = 10` vs kelas `kk-audit` = **7**, tampil di bawah label
  "Dasar: SMM 1 / Pengaturan Firma" — misatribusi yang `canon_smm_documentation.ts`
  dibangun untuk menutup. **GOTCHA: tripwire `smm_retention_attribution.test.ts`
  MELEWATKANNYA** karena teksnya terpisah di dua simpul JSX, bukan satu frasa. Gerbang
  regex atas teks UI buta terhadap teks yang terbelah antar elemen.
- `DEFAULT_REPORT_DATE = '2026-03-20'` = tanggal laporan PT Sentosa Makmur, dipakai
  sebagai **seed persistensi per-perikatan** ⇒ setiap perikatan lain mewarisi tanggal
  laporan/tenggat/retensi milik perikatan itu. Pola: literal-sebagai-seed lolos dari
  gerbang isolasi karena key-nya SUDAH engagement-scoped — yang bocor nilainya, bukan kunci.
- Akhir retensi dihitung `reportDate + n thn`; kanon memulainya saat **`archivedOn`**.
  Berkas belum dikunci ⇒ akhir retensi **null**, bukan tanggal pasti.
- `const postAssembly: never[] = []` — bertipe `never[]` sehingga tak akan pernah bisa
  berisi apa pun; panel ¶16 SELALU "belum dirakit". **Kalimat yang tak bisa jadi salah
  bukan keadaan.**
- Legal hold (`RETENTION.holdForEng`) tak terlihat sama sekali.

## Temuan besar tak terduga — `undefined%` di dokumen TERSEGEL

Memo SA 230 (PDF tersegel Ed25519) membaca `C.agg.signifPct` / `devPct` / `retPct` —
**tiga properti yang tidak pernah didefinisikan di mana pun**. Tiga dari empat baris
tabel "Status Kelengkapan" mencetak `undefined%` di dalam dokumen bertanda tangan.

**Kenapa lolos bertahun:** `useDocCanon()` mengalir sebagai `any` lewat prop `C`, jadi
setiap nama properti lolos typecheck. Menambahkan anotasi tipe eksplisit pada nilai
`useMemo` (`const arc: T = useMemoD2(...)`) langsung memunculkan error yang tadinya diam.

**Pola gerbang yang menutupnya (dapat dipakai ulang di view lain):** pindai sumber view,
kumpulkan `\bC\.agg\.(\w+)`, bandingkan dengan nama properti pada literal `const agg = {…}`;
selisihnya = hantu. Diuji terhadap `origin/master` → mengembalikan persis
`['signifPct','devPct','retPct']`. Ini gerbang STRUKTURAL, bukan "keberadaan simbol".

## Kontradiksi retensi — DITUTUP (keputusan Ari 2026-08-23: **7 tahun**), #291 mendarat

Ada **enam** tempat yang mengaku menetapkan masa simpan berkas audit:
`data_records.RETENTION_CLASSES` = 7 (dasar tertulis) · `data_backoffice.RETENTION_POLICY`
= 7 (MATI) · `data_part2` tiap dokumen DMS = 10 (tanpa dasar) · `view_dms.tsx:76` = 10
dengan klaim palsu *"SA 230: min. 10 tahun"* (¶A23 menyebut **lima**) ·
`view_crypto` `|| 10` · `view_settings` dropdown **5/10/15** — di mana **7 bahkan tak ada
dalam pilihan**, dan nilainya tak dibaca modul mana pun.

**KEJUTAN TERBESAR: server SUDAH memakai 7 sejak awal.**
`server/src/attachments/retention.ts` `retentionYearsForClass('kk-audit') === 7`, dan
ujinya menyebut dirinya *"mirrors the client registry"*. Klien-lah yang menyimpang.
**Pelajaran: sebelum memutuskan angka kebijakan, periksa apakah SERVER sudah punya
jawabannya** — otoritas penegakan sering lebih benar daripada layar.

**Cacat diam yang ikut terbongkar:** klien mengirim `retentionClass: 'SA230/10y'`;
server hanya mengenal **ID kelas**, jadi `retentionYearsForClass()` diam-diam jatuh ke
default untuk SETIAP lampiran yang pernah diunggah lewat DMS. Angka di layar dan angka
yang menjadwalkan pemusnahan tak pernah merujuk baris registri yang sama. Kini mengirim
id kelas. **Pola: string ber-format sendiri yang dikirim ke API yang mengharap enum =
kegagalan senyap, bukan error.**

Angka 10 tak pernah merupakan kebijakan: ia diterapkan SERAGAM ke semua jenis dokumen,
jadi hanya kebetulan benar untuk Surat Perikatan (kelas `perikatan` = 10) dan salah
untuk Kertas Kerja, Laporan & EQR sekaligus.

**Gerbang baru yang layak ditiru:** paritas registri klien ↔ server — uji klien
mem-parse `server/src/attachments/retention.ts` dengan regex `id:\s*'([\w-]+)'\s*,\s*years:\s*(\d+)`
dan menuntut tiap kelas kanonik ada di sana dengan tahun sama. Dua registri tak bisa
lagi menyimpang diam-diam.

## ARC-014 — register arsip bayangan (#292 `5833ad3`, mendarat)

`BO.ARCHIVES` (data_backoffice) = register arsip STATIS pra-kanon. ARC-014 mengklaim
ENG-2025-014 diarsipkan **2026-02-28** — 20 hari MENDAHULUI tanggal laporannya sendiri
(2026-03-20) — berstatus "Terkunci" padahal kanon bilang "Perakitan" (KK masih disunting),
dan memberi tanggal musnah untuk berkas yang belum pernah diarsipkan. Register memuat
5 kotak dari 10, 2 terkunci dari 5, dan **menyembunyikan satu legal hold AKTIF** (LH-03).

**KOREKSI yang saya buat sendiri di tengah jalan:** dugaan awal saya (angka kokpit firma
salah) SALAH — `view_firmops:106-109` sudah membaca kanon. Yang salah adalah **jalan
mundurnya**: `RET ? RET.total : B.ARCHIVES.length`. **Pelajaran: sebelum menyatakan
sebuah register "hidup", telusuri sampai situs render — pembaca bisa berupa cabang
fallback yang tak pernah diambil.**

**Pola yang dicabut & layak dicari di tempat lain:** `X ? kanon : seedKarangan`.
`main.tsx` mengimpor data_records eager ⇒ cabang else tak terjangkau, tapi bila kanon
gagal dimuat layar TIDAK gagal — ia menyajikan arsip yang tak pernah ada, lengkap dengan
legal hold yang hilang. **Fallback ke data karangan lebih buruk daripada tanpa fallback:
yang pertama menyamar sebagai berhasil.** Obatnya: impor ESM (wajib ada), bukan
`window.X ? … : …`.

**GOTCHA boot order:** membuat `data_firmops` (main.tsx:13) mengimpor `data_records`
(baris 32) menarik evaluasinya lebih awal lewat ESM. Aman di sini karena dependensi
data_records (`./data` baris 8, `./data_backoffice` baris 11) sudah dievaluasi — tapi
WAJIB diperiksa, dan baris importnya dipindah agar urutan tertulis = urutan nyata.

**Uji yang MENDOKUMENTASIKAN cacat sebagai assertion:** 6 dari 10 uji hijau sejak awal
dan memang dimaksudkan begitu — mereka menyatakan kontradiksinya (tanggal arsip < tanggal
laporan · "Terkunci" vs "Perakitan" · kotak & hold hilang). Bila gagal ⇒ registernya
diperbaiki/dicabut ⇒ cabut ujinya. Bentuk ini berguna saat data buruk belum boleh
disentuh karena berebut berkas dengan sesi lain.

**PENUTUP (#294 `71ed377`, MENDARAT):** `RETENTION_POLICY` (#293 `4168e6c`) · `ARCHIVES` + `LEGAL_HOLDS` (#294 `71ed377`)
DICABUT dari data_backoffice, bersama `RecordsRetentionLegacy` (138 baris di view_bo1,
tak diekspor & tak dirutekan; dicabut #293).

**TABRAKAN DUA SESI — pelajaran paling mahal hari ini.** Saya melimpahkan pencabutan
kode mati ke sesi latar (spawn_task) LALU Ari meminta saya mencabut ARCHIVES/LEGAL_HOLDS
juga. #293 mendarat lebih dulu dan gerbangnya menegaskan **"BO tetap membawa ARCHIVES &
LEGAL_HOLDS — gerbang #292 bergantung padanya"** — premis yang benar saat ditulis, lalu
dibatalkan pekerjaan saya sendiri. #294 jadi CONFLICTING. **Resolusinya: BALIK invarian
uji sesi lain, jangan hapus, dan tulis alasan perubahan premisnya di tempatnya.** Lalu
buang assertion DUPLIKAT dari berkas SAYA (yang mendarat belakangan), bukan dari berkas
mereka, dan tulis pembagian tugas antar kedua berkas gerbang secara eksplisit.
**Jangan melimpahkan sub-tugas yang mungkin akan diminta ke saya sendiri beberapa menit
kemudian.**

**Mekanisme yang membuat data salah bertahan bertahun — komentarnya sendiri:**
*"Blok ini dipertahankan sbg referensi, tak diekspor."* **Data yang salah yang disimpan
"sebagai referensi" tetap data yang salah.** Repo nol gerbang variabel mati
(`no-unused-vars` off di DUA blok eslint) ⇒ tak ada yang pernah menunjukkan 138 baris itu
tak terpanggil. Cari pola komentar ini di tempat lain.

**Uji yang menagih janjinya sendiri:** blok "terdokumentasi" di #292 ditulis dengan
"bila uji ini gagal, artinya registernya dicabut — cabut uji ini bersamanya". Di #294
keempatnya MERAH (`Cannot read properties of undefined`) lalu diganti tripwire permanen.
**Pola ini bagus untuk data buruk yang belum boleh disentuh** (mis. sedang berebut berkas
dengan sesi lain): nyatakan cacatnya sebagai assertion + instruksi pencabutannya.

**Masih terbuka:** view_bo1 memuat DUA legacy mati lagi — `ProcurementLegacy` (113 baris),
`FacilitiesLegacy` (117 baris). Tak memuat data yang membantah kanon ⇒ arc terpisah.

## GOTCHA lingkungan — `test.db` bersama antar worktree

36 uji backend merah tanpa satu pun berkas server disentuh. Sebabnya:
`server/src/__tests__/globalSetup.ts` mereset `prisma/test.db` **relatif cwd** (worktree
saya), tetapi klien Prisma membacanya **relatif direktori skema yang dipanggang** —
yaitu checkout ROOT, karena `node_modules` di-junction bersama. Basis data yang direset
bukan yang dipakai ⇒ baris menumpuk ⇒ `TRPCError: version-mismatch:server=0`.
`ensure-prisma-client` melewatkan regenerasi karena memeriksa **provider**, bukan **path**
(lihat [[asseris-prisma-client-worktree-trap]]).

**Obat:** `node server/node_modules/prisma/build/index.js generate` dari worktree sendiri
→ 431/431 hijau. Konsekuensi: worktree lain jadi merah sampai mereka regenerasi juga.

## GOTCHA tooling — heredoc Python menyuntikkan byte kontrol

Menulis regex lewat `python - <<'PY'` dengan string non-raw: `\b` ditafsirkan sebagai
**backspace (0x08)** dan masuk ke berkas sebagai byte kontrol di tengah literal regex.
Uji lalu diam-diam mencocokkan nol dan `.not.toMatch()` **lolos secara vakum**.
Deteksi: `[i for i,c in enumerate(bytes) if c<9 or 13<c<32]`. Pakai string raw (`r'…'`)
atau hindari escape yang valid di Python.

Terkait: [[asseris-lampiran-scope-tulis-ekspor-identitas]] · [[asseris-cockpit-tab-segel]] ·
[[asseris-compliance-identity-literal]] · [[asseris-sesi-paralel-satu-worktree]]
