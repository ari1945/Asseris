---
name: asseris-profit-isolasi-realisasi
description: Modul Profitabilitas — jam timesheet dikreditkan ke id perikatan literal & tabel realisasi fee beku; plus bukti bahwa realisasi WIP BUKAN realisasi fee
metadata: 
  node_type: memory
  type: project
  originSessionId: e344d9a3-c242-4090-ba65-22d58749036c
  modified: 2026-08-20T15:45:52.827Z
---

Arc 2026-08-20/21, **EMPAT PR** di `master` (+ #266 sesi lain di antaranya):
**#268 → `ba2b6a7`** (isolasi jam + realisasi fee),
**#269 → `7cd3b63`** (basis biaya),
**#270 → `077d264`** (lingkup roster),
**#266 → `306b21d`** (Time & Budget, sesi lain),
**#273 → `74021c3`** (roster keenam perikatan + scope seed timesheet),
**#274 → `0c93142`** (pembagian beban + PENCABUTAN tuduhan actualHrs).
Semua CI 9/9. Dua cacat `view_profit.tsx`, keduanya "id satu perikatan
ditulis ke kode yang melayani seluruh portofolio" — sekelas TB1 di
[[asseris-timebudget-engagement-isolation]].

## Yang paling berharga: bukti bahwa DUA angka bernama "realisasi" berbeda

Godaan besarnya adalah menurunkan `REALIZATION` dari `FIRMFIN.wip().realization`
— **key set-nya identik persis** dengan `WIP_ENG` (7 id yang sama), jadi ia
*terlihat* seperti register bayangan. Ternyata bukan: penyebutnya berbeda.

- `wip().realization` = `recoverable / std` (std = nilai **charge-out standar**)
- `REALIZATION` di modul ini dikalikan ke **fee kontrak** (`billed = fee × rate`)

Untuk seed, `std ≫ fee` (mis. …-014: std 3.200 jt vs fee 1.850 jt), dan tiga
perikatan punya write-up ⇒ realisasi WIP > 100%. Memakainya sebagai realisasi
fee menghasilkan pendapatan **melebihi fee kontrak** (…-040: 2.446 vs 2.340;
juga …-063, …-058). Karena itu ia **DATA**, bukan turunan → `ENG_FEE_REALIZATION`
di `data_part4.ts` (di sebelah `WIP_ENG`), nilai identik (nol-delta), cadangan
`|| 0.9` DICABUT. Premisnya dipaku sebagai uji, bukan sekadar komentar.

**Aturan yang bisa dipakai lagi:** kesamaan *key set* bukan bukti kesamaan
*ukuran*. Cek PENYEBUTnya sebelum menyatukan dua register.

## GOTCHA — `str.replace` Python tanpa assert pada berkas CRLF diam-diam no-op

Saya menghapus satu baris untuk menguji keadaan kosong, skrip mencetak
"removed", lalu aplikasi tetap menampilkan angka lama. Sempat saya kira cache
Vite (restart server, `?nocache=`) — padahal **berkasnya tak pernah berubah**:
pola saya memakai `\n`, berkasnya CRLF. `git status` juga bersih.
**Selalu `assert s.count(old)==1` (atau regex `\r?\n`) sebelum menulis.**
Sejalan dengan [[asseris-home-a11y-komposisi]].

## GOTCHA — berkas pola yang dirujuk prompt bisa ada di CABANG LAIN

`migration/src/timebudget_isolation.test.ts` & `docs/prompts-perbaikan/07-time.md`
tak ada di `master`; polanya hidup di `fix/timebudget-engagement-isolation`
(`9dd1e57`, belum di-merge). Baca tanpa checkout: `git show 9dd1e57:<path>`.
Cari dulu dengan `git log --all --oneline -- '*<nama>*'` sebelum menyimpulkan
"tak ada". Lihat juga [[asseris-sesi-paralel-satu-worktree]].

## Bentuk perbaikan (dipakai ulang untuk view lain)

1. Derivasi diangkat ke `profit_model.ts` — bebas-`any`, dependensi disuntik
   (`realizationOf`, `extraHours`, `schedule`) sehingga >1 perikatan bisa diuji
   tanpa menambah seed. Efek samping: **51 `:any` hilang** dari baseline ratchet
   (`npx eslint src --prune-suppressions`, jangan `lint:any-baseline` penuh).
2. `null` MERAMBAT: `realized`/`fee` null ⇒ billed/margin/marginPct/effRate/
   recovery null ⇒ baris `incomplete` ⇒ dikeluarkan dari total, KPI, agregat
   partner, recovery; footer menulis `TOTAL (6/7)` + spanduk menyebut id-nya.
3. Gerbang sumber melarang literal `'ENG-…'` **dan** cadangan `|| 0.x` di kedua
   berkas (komentar di-strip dulu), masing-masing dengan uji anti-tautologi.
4. Merah dibuktikan lebih dulu: model ditulis sebagai transkripsi APA ADANYA
   (cacat utuh) → 17/24 uji merah → baru diperbaiki.

## Temuan sampingan (belum ditutup, di luar lingkup)

- ~~`stdCost` memakai tarif BILL sebagai tarif BIAYA~~ → **DITUTUP #269**.
- ~~`WIP_ENG.cost` membantah `engagementWip().costValue`~~ → **DITUTUP #270**
  (ternyata cacat LINGKUP, bukan nilai seed). Lihat kedua bagian di bawah.
- **`INVOICES` seed tak konsisten:** `INV-2026-012` menagih 1.650 jt "Final
  (100%)" untuk C-058 yang fee-nya 580 jt, sementara `WIP_ENG` …-058 mencatat
  `billed` 2.260 jt. Tiga register berselisih tentang satu perikatan.
- `useMemo` agregat partner dulu ber-deps `[]` → agregat BASI setiap kali jam
  berubah. Sekarang `[rows]`.
- Sumber tarif realisasi fee masih **pertanyaan terbuka untuk Ari** (catatan
  lengkap ada di komentar `ENG_FEE_REALIZATION`, data_part4.ts).

## Verifikasi di aplikasi berjalan

Worktree ini tak punya `server/dev.db` → `npm run db:push && npm run seed` dulu;
login `hartono.w@whr-cpa.id` / `Partner#2025!`. Perikatan aktif default seed
= **ENG-2025-063** (bukan demo) — kebetulan sempurna untuk uji isolasi.
Mencatat 100 jam di `#/time?tab=timesheet` menggeser …-063 dari biaya 1.159 /
margin 136 → 1.232 / 63, sementara …-014 tetap 892 / 791. Sebelum PR ini yang
bergerak justru …-014. Screenshot TIDAK tersedia di sesi ini ("Browser pane is
not displayed"); pakai `javascript_tool` untuk memanen isi tabel sebagai bukti.

## PR #269 — basis biaya (`7cd3b63`, 2026-08-21)

`stdCost = jam × blendedRate` dengan `blendedRate` dari **`WIP_BILL`**: biaya
dibukukan pada HARGA JUAL. …-031 dibebani Rp 1.659k/jam — di atas tarif
**tagihan** Manager — lalu melaporkan margin −43%. Rugi itu artefak, bukan
temuan; …-058 juga (−24%). Keduanya kini positif. Margin rata-rata portofolio
35% → 66%: **angka lama yang diingat orang akan bergerak.**

**Preseden yang menghemat waktu:** `cockpit_model.ts` sudah memperbaiki cacat
yang PERSIS SAMA dari arah sebaliknya ("ketiganya dihitung pada tarif biaya …
meleset 2×"). Grep `WIP_COST` dulu sebelum mendesain apa pun soal tarif.

Empat register → dua kartu SSOT: `PM_COST_CARD`←`WIP_COST`,
`PM_BILL_CARD`←`WIP_BILL`; `CHARGE_MULT = 2.4` DICABUT (rasio bill/cost nyata
1,905–2,273 — 2,4 tak pernah ada); `GRADE_COST` DICABUT (isinya nilai
`WIP_BILL` di bawah nama "COST"); dan **perikatan ber-roster memakai
`engagementWip().costValue/stdValue/actualHrs` apa adanya** → tie-out PERSIS,
bukan "lebih dekat". Tanpa roster: taksiran mix jadwal, ditandai `~` di UI +
`costSource` tiga nilai. Untuk …-014 (satu-satunya yang punya kedua basis) mix
jadwal meleset −8,6% dari roster — pendekatannya wajar, kartunya yang rusak.

**POLA: membalik tanda membongkar asumsi render.** Setelah basisnya benar firma
jadi write-UP agregat, dan baris TOTAL yang memaku `({fmt(...)})` + merah
menulis **`((2.446))`** merah untuk sebuah write-up. Setiap kali sebuah besaran
berubah tanda, cari format yang memaku tanda/warna.

**Gerbang token bisa salah sasaran DUA arah.** `expect(jsx).not.toMatch(/FIRMFIN/)`
lolos oleh `import * as FF from './data_firmfin'`, DAN melarang view menyebut
sumber angka pada keterangan provenance — padahal itu pola rumah
(`cockpit_report.ts`). Gerbang jalur impor (`from './data_firmfin'`) yang benar.

**Masih terbuka:** `WIP_ENG.cost` seed (1.950 jt untuk …-014) membantah
`engagementWip().costValue` (492 jt) **4×** — dua angka biaya untuk satu
perikatan, keduanya di `data_firmfin.ts`. FIRMFIN sudah menampilkan selisihnya
sebagai baris pergerakan bernama (`liveAdj`), jadi diketahui, bukan tersembunyi.
Jam seed `WIP_ENG` berada pada skala lain dari `ENGAGEMENTS.actualHrs` → butuh
keputusan basis seed dari Ari lebih dulu.

## PR #270 — lingkup roster (`077d264`, 2026-08-21)

**PELAJARAN TERBESAR ARC INI: "dua angka yang berselisih" belum tentu soal
MEMILIH salah satu.** Kontradiksi `WIP_ENG.cost` 1.950 jt vs
`engagementWip().costValue` 492 jt ternyata DUA cacat lingkup — satu angka yang
dipakai tak konsisten. **Nol nilai seed diubah.**

**WS1** — `useFirmWip` hanya meng-overlay perikatan AKTIF. Roster …-014 selalu
ada, tapi selama perikatan lain dipilih SELURUH firma (WIP · Dashboard ·
cockpit · Firm Finance · ekspor tersegel) melihat std seed 3.200 jt; begitu
…-014 dipilih jadi 980 jt. **WIP firma bergeser 7,72 M ↔ 5,90 M karena pilihan
UI.** Nilai perikatan tak boleh bergantung pada perikatan mana yang dibuka.

**WS2 — CACAT YANG SAYA BUAT SENDIRI DI #269.** `pmRosterOf(timeEntries)`
memanggil `engagementWip(timeEntries, id)` untuk SETIAP perikatan, padahal
`timeEntries` milik perikatan AKTIF saja. 100 jam Anindya di …-063 menaikkan
biaya …-014 dari 473 → 554 jt. **PF1/TB1 lewat pintu lain: bukan id literal,
melainkan timesheet yang salah pemilik.** Uji #269 mustahil menangkapnya — tak
satu pun menyuntik perikatan aktif, jadi jalur "aktif ≠ perikatan yang dinilai"
tak pernah dicoba. Sama persis dgn gerbang SC-9 di #265 (buta pada kemampuan
yang belum pernah dicoba). **ATURAN: setiap kali sebuah fungsi menerima state
ber-scope, uji jalur di mana scope-nya BUKAN entitas yang sedang dihitung.**

Aturan yang benar, satu kalimat: *roster berlaku bagi SETIAP perikatan yang
memilikinya; jam timesheet live hanya bagi perikatan yang MEMILIKINYA.*
`wipLiveByEng(engagements, timeEntries, activeEngId)` diekstrak dari hook agar
bisa diuji murni; `pmRosterOf(timeEntries, activeEngId)` menutup pintu kedua.

Rekonsiliasi GL TIDAK terganggu — diuji, bukan diasumsikan (`glResidual` 0,
`rollForwardResidual` 0, `reconciles` true). FIRMFIN sudah menyerap selisih std
lewat baris pergerakan BERNAMA (`liveAdj`).

**Masih terbuka (keputusan Ari, bukan kode):** skala seed `WIP_ENG` tak berdamai
dengan register jam. Jam tersirat (`std ÷ STD_RATE`) MELEBIHI anggaran jam pada
**5 dari 7** baris; …-047 menyiratkan 944 jam vs anggaran 420 & aktual 48 (~20×).
Rasio `cost/std` seed 0,591–0,644 ≠ konstanta FIRMFIN 0,700 ≠ roster nyata 0,501
— tiga angka untuk satu hubungan. Tanpa roster, biaya enam perikatan itu tak
DAPAT diturunkan; menambalnya = mengarang. Menutupnya kemungkinan besar berarti
menambah roster = data Ari.

## PR #273 — roster keenam perikatan (`74021c3`, 2026-08-21)

Ari memilih **backfill dari profil grade** ketika ditanya (opsi lain: ia yang
memasok staffing · perbaiki skala seed · biarkan apa adanya). Jadi: boleh
mengarang data DEMO, asal **dinyatakan** sebagai karangan dan **diikat** ke yang
bukan karangan.

**Yang mengikat** (semuanya diuji EKSAK, tanpa toleransi): Σbudget ===
`budgetHrs`; Σbase + jam timesheet === `actualHrs`; partner/manager dari
ENGAGEMENTS; senior/junior yang sudah disebut SCHEDULE. **Yang dikarang**:
komposisi tim sisanya, dari SATU profil = komposisi grade roster perikatan demo.
**Trik yang membuat profil bisa DIPERIKSA**: pembilangnya dibiarkan sama dengan
jam literal roster demo, jadi diterapkan pada 1840/1098 ia mereproduksi roster
itu persis — profil diuji terhadap satu-satunya roster nyata yang ada, bukan
diklaim wajar. (Pola `TB_PHASE_PROFILE`.)

**GOTCHA — "deterministik" bisa berarti "deterministik untuk SATU urutan
kedatangan".** Rotasi senior/junior semula mengikuti urutan array `ENGAGEMENTS`.
`hydrateCoreFromApi` mengganti array itu saat boot dengan salinan basis data
yang terurut **menurut id** — urutan berbeda dari berkas seed. Aplikasi dengan
server memberi …-063 tim yang BERBEDA dari uji offline. Ketahuan hanya karena
saya membandingkan angka di LAYAR dengan fixture uji. Aturan: bila hasil
bergantung pada urutan koleksi, urutkan sendiri dulu (di sini: menurut id), dan
gerbangnya MEMBALIK array masukan.

**GOTCHA — jangan bulatkan bagian TERAKHIR alokasi.** Pola `tbAllocate` membiarkan
bagian terakhir menyerap sisa TANPA pembulatan; saya membulatkannya juga dan base
…-058 jadi `944,9999999999999`. Setelah diperbaiki, gerbang tie-out bisa memakai
`toBe()` telanjang tanpa toleransi.

**PRASYARAT yang ditemukan di jalan:** `TIME_ENTRIES` (timesheet …-014) adalah
nilai awal `useServerState` untuk SETIAP perikatan → 48 jam hantu di mana-mana,
dan `engagementWip` mencocokkan per NAMA anggota. Distempel `engagementId` +
disaring (pola `REVIEW_NOTES` & `risks`). Konsekuensi yang menggigit: baseline
`pmExtraHours` harus ikut ber-scope — tanpa itu `max(0, 10 − 48) = 0` **menelan
sepuluh jam pertama** yang dicatat auditor pada perikatan selain demo.

**Urutan merge penting.** #266 (sesi lain, Time & Budget) HARUS mendarat lebih
dulu: ujinya memakukan premis "hanya satu perikatan punya roster" yang justru
dibatalkan #273. Saya rebase, premisnya diperbarui di tempatnya, dan alasannya
ditulis sebagai komentar di PR agar penulis aslinya bisa melihat. **POLA: bila
perubahanmu membatalkan premis uji orang lain, ganti CARA MEMBUKTIKAN, jangan
sifat yang dijaga** — di sini `toBeNull()` diganti "budgetTotal === budgetHrs
DAN nama roster ≠ roster demo" (dua cara gagal, bukan satu), sementara cabang
"benar-benar tak punya roster → null" tetap hidup lewat id tak dikenal.

~~Masih terbuka: kapasitas~~ → **TUDUHAN ITU SALAH, DICABUT di #274.** Lihat
bagian berikut.

## PR #274 — pencabutan + pembagian beban (`0c93142`, 2026-08-21)

**PELAJARAN PALING MAHAL DI ARC INI, DAN ITU KESALAHAN SAYA SENDIRI.** Di #273
saya menulis ke dalam KODE bahwa `ENGAGEMENTS.actualHrs` tak konsisten: "5.444
jam vs ~3.120 jam kapasitas (**13 minggu** × 40 jam × 6 auditor) ⇒ ~1,7×
kapasitas". **Angka 13 minggu itu saya karang** — tak ada panjang musim audit di
mana pun dalam data. Saya menghabiskan seluruh arc mencabut angka tak berdasar
dari kode orang lain, lalu menanam satu milik saya sendiri.

Yang benar:
- `actualHrs` konsisten dgn `budgetHrs × progress`: selisih 0,5 · −0,2 · 1,6 ·
  8,7 · 0,7 · −3,6% pada enam perikatan (…-047 −23,8% tapi ia 48 jam @15% —
  pembulatan).
- **`CAPACITY.grades` sudah menyatakan supply**: 301 j/minggu ⇒ 5.444 ÷ 301 =
  **18,1 minggu**, musim biasa. Data itu ADA sejak awal; saya tak mencarinya.
- `CAPACITY` sengaja menampilkan demand > supply utk Manager & Senior — isi demo
  modul perencanaan kapasitas, bukan cacat.

**ATURAN: sebelum menuduh data tak konsisten, cari dulu apakah data sudah
menyatakan pembandingnya.** Kalau pembanding harus dikarang, tuduhannya batal.

**Cacat yang nyata (juga buatan saya):** pembagi roster #273 = rotasi bergilir →
membagi rata JUMLAH perikatan, bukan JAM. Perikatan 1.588 j vs 48 j ⇒ Sinta
1.418 j vs Dimas 815 j (selisih 74%) padahal `CAPACITY.staff.forecast` 91% vs
94%. Diganti **LPT** (terbesar dulu → berbeban teringan), beban awal dari roster
NYATA, nama SCHEDULE tetap menang. Sesudah: 1.082 vs 1.151.

**POLA GERBANG YANG PALING BERGUNA DARI ARC INI:** ganti ambang-angka dengan
**optimalitas lokal** — "tak ada pemindahan satu-item yang memperkecil
simpangan". Tak ada konstanta untuk dilonggarkan diam-diam. Ia langsung
menangkap saya: menemukan perbaikan 5,35→0,03 poin yang ternyata penugasan
**DIPAKU SCHEDULE** ⇒ yang salah GERBANGNYA (harus mengecualikan pilihan yang
bukan milik algoritma), bukan algoritmanya. Patokannya juga PORSI terhadap
forecast, bukan kalender — jadi tak bergantung pada asumsi yang tadi bikin
celaka.
