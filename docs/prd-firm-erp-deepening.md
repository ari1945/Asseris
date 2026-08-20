# PRD — Pendalaman Grup "Keuangan Firma (ERP)"

| Field | Value |
|---|---|
| Status | In Progress — Approved ("Proceed sesuai rekomendasi" 2026-08-16). Q-1 = keenam PR satu arc · Q-2 = BLOKIR ekspor LK · Q-3 = dimensi periode dicatat sebagai utang · Q-4 = bentuk data register B diisi aset A · Q-5 = tetap read-only |
| Tanggal | 2026-08-16 |
| Pemilik | Ari Widodo |
| Modul terdampak | `firmgl` · `apar` · `revenue` · `treasury` · `cashbank` · `fixedassets` · `firmtax` · `profitability` |
| Prasyarat | #240 (jembatan AR/AP) · #241 (FIRMFIN dari buku besar) · #242/#243 (aktual = buku besar) · #247/#249/#251 (register rekonsiliasi bank) · #239 (roll-forward WIP tanpa plug) |

---

## 1. Problem

Grup ini sudah setengah jalan. Lima arc terakhir (#239–#251) menutup pola yang sama
berulang kali: **angka yang tampil meyakinkan di atas dasar yang tidak ada**. Kas, AR,
AP dan WIP kini punya sub-buku yang menutup ke akun kontrol, dan gerbangnya bisa
MERAH. Anggaran vs aktual kini menarik "aktual" dari buku besar dengan gerbang cakupan.

**Tiga modul tidak ikut disapu, dan di ketiganya polanya masih utuh.** Survei
2026-08-16 (bukti di §9) menemukan:

### 1.1 Aset Tetap — dua register, akun hantu, dan selisih Rp 3.374 jt yang tak dimiliki siapa pun

Firma punya **DUA** register aset tetap yang tidak saling kenal:

| Register | Sumber | Isi | Konsumen |
|---|---|---|---|
| A | `AMS.FIXED_ASSETS` (`data_part2.ts:114`) | 6 aset · perolehan **6.510 jt** · NBV **2.726 jt** | modul `fixedassets` (grup ini) |
| B | `BO.FIXED_ASSETS` (`data_backoffice.ts:94`) | 7 aset · perolehan **2.591,5 jt** · NBV **1.431 jt** (literal) | `view_bo1` · `view_firmops` · `view_firmops2` · `data_firmops` |

Tidak satu aset pun beririsan. Konsekuensi berantai:

- **Kontrol GL tak pernah ditutup.** `1-400 Aset Tetap — neto` = **6.100 jt**. Register A
  menghitung NBV **2.726 jt**. Selisih **3.374 jt (55% dari kontrol)** — tanpa jembatan,
  tanpa gerbang, tanpa satu pun badge yang bisa memerah. Ini persis keadaan Kas sebelum
  #247 dan AR/AP sebelum #240, kecuali di sini bahkan `reconciliations()` tidak
  menyebut akun `1-400` sama sekali: ia hanya mengurus `1-101…1-106`, `1-200`, `1-300`,
  `2-100`.
- **Register B menunjuk akun yang tidak ada.** Tiap baris membawa `gl: '1-2100'` dan
  `ASSET_GL` memetakan keenam kategori ke `'1-2100'`. **`1-2100` tidak ada di
  `FIRM_COA`.** Ia gagal DIAM-DIAM — persis kelas cacat token CSS hantu.
- **Penyusutan tidak pernah masuk laba rugi.** Tidak ada akun `5-xxx` beban penyusutan
  di `FIRM_COA`. Register A menghitung **993 jt/tahun**; `data_firmops.ts:41` menghitung
  angka lain lagi dari register B. Keduanya hanya ditampilkan. Laba operasi firma
  (**2.860,6 jt**) karena itu overstated sebesar beban penyusutan yang tak pernah
  dibukukan — dan gerbang CAKUPAN #242 tidak bisa menangkapnya, karena gerbang itu
  bertanya "adakah akun P&L tanpa baris anggaran", bukan "adakah beban yang tak punya
  akun sama sekali".
- **Roll-forward adalah PLUG.** `view_firmtreasury.tsx:463–471` menulis
  `NBV awal = totNbv + totAnnual`, `capex = Rp 0` dan `pelepasan = Rp 0` sebagai literal
  — sehingga ia menutup secara aljabar dan tak pernah bisa salah. Ini cacat yang
  dicabut dari WIP di #239, masih berdiri di sini. `DISPOSALS` (register B) justru
  memuat usulan pelepasan aktif; roll-forward register A menyatakan nol.
- Label `"per 1 Mar 2026"` di-hardcode di lima tempat sementara perhitungan memakai
  `AMS.TODAY`. Bila klok bergerak, judulnya berbohong.

### 1.2 Profitability — "biaya" diukur dengan tarif TAGIH

`view_profit.tsx:19–24` membangun `RATE_CARD` dari **`FIRMFIN.WIP_BILL`** (tarif
charge-out), lalu `buildEngEcon` memakainya sebagai `stdCost` dan melabelinya
**"Biaya Standar"** di tabel dan di ekspor Excel.

| Tarif | Nilai (mix standar) | Peran sebenarnya |
|---|---|---|
| `WIP_BILL` blended | **730 rb/jam** | tarif TAGIH — dipakai sebagai "biaya" |
| `WIP_COST` blended | **369 rb/jam** | biaya waktu sesungguhnya — **tak pernah dipakai di modul ini** |
| `FIRMFIN.STD_RATE` | **1.250 rb/jam** | nilai standar WIP (dipakai modul WIP) |
| `blendedRate × CHARGE_MULT 2,4` | **1.752 rb/jam** | "WIP Charge-out" tab Leverage |

Akibatnya margin engagement salah ~2× ke arah pesimis, dan tab **Leverage & Recovery**
menilai jam yang sama **40% lebih tinggi** daripada modul WIP menilai jam itu — dua
jawaban untuk "berapa nilai WIP charge-out kita". `GRADE_COST` di `LeverageRecovery`
adalah salinan literal `WIP_BILL` yang dilabeli COST dan hanya dipakai untuk uji
keanggotaan peran — kode mati yang menyesatkan pembaca.

Selain itu:
- `REALIZATION` adalah **tujuh literal per-engagement** (`0,91`/`0,88`/…) dengan
  fallback `0,9`. Firma punya register `INVOICES` (`amount`, `paid`) dan
  `CREDIT_NOTES` — realisasi DAPAT diturunkan. Ini kelas cacat yang sama dengan
  `note` hardcode #240 dan kolom `actual` #242.
- `partners` memakai `useMemoPRF(..., [])` sementara badan-nya membaca `rows`. Jam
  timesheet yang dicatat menggeser tab **Per Engagement** tapi **tidak** menggeser tab
  **Per Partner** — dua angka berbeda dalam satu layar.
- Total margin tidak pernah direkonsiliasi ke `pl().opProfit`. Tak ada absorpsi
  overhead; jumlah margin engagement dan laba firma hidup di dua dunia.

### 1.3 PPh Badan Firma — pajak tangguhan atas empat literal, dua di antaranya akun hantu

`view_firmtax.tsx:68–72` menghitung aset/liabilitas pajak tangguhan dari:

| Pos beda temporer | `carry` | `taxbase` | Keadaan |
|---|---|---|---|
| Penyusutan aset tetap | 6.100 jt | 5.620 jt | `carry` = literal GL `1-400`; register menyatakan 2.726 jt. `taxbase` literal — **tak ada register penyusutan fiskal**. |
| Penyisihan WIP tak tertagih | 1.395 jt | 0 | literal; modul WIP punya provisi nyata (`WIP_PROV_MATRIX`) — angka kedua |
| Liabilitas imbalan kerja (PSAK 24) | 920 jt | 0 | **tak ada akun di `FIRM_COA`** |
| Penyisihan penurunan nilai piutang | 320 jt | 0 | **tak ada akun**; `1-200` dicatat bruto |

Ditambah:
- **SPT Tahunan Badan Rp 1.240 jt adalah literal** (`TAX_OBLIGATIONS`). 22% × laba
  operasi buku besar = **629,3 jt**. Selisihnya hampir 2× dan tak ada satu pun
  rekonsiliasi fiskal yang menjelaskannya — padahal modul PSAK 46 untuk KLIEN
  (`canon_deferredTax`, arc PR-F/PR-G1/PR-H) sudah punya mesin rekonsiliasi
  komersial→fiskal yang lengkap. Firma tidak memakai mesinnya sendiri.
- `2-200 Utang Pajak` (940 jt) adalah satu-satunya akun kontrol material yang **tidak
  punya baris di `reconciliations()`** — tak ada sub-buku, tak ada gerbang.
- `ppnTrend` — 5 dari 6 bulan literal.

### 1.4 Pendapatan (PSAK 72) — dua jawaban untuk "pendapatan firma", satu liabilitas tanpa akun

- Pendapatan diakui = `Σ CLIENTS.fee × progress/100`. GL `4-100` = 11.300 jt. **Tidak
  pernah direkonsiliasi.**
- Nilai kontrak jatuh ke fallback `e.materiality × 0,4` bila klien tak punya `fee` —
  materialitas dikarang jadi nilai kontrak.
- **Liabilitas kontrak (pendapatan diterima dimuka) tidak punya akun di `FIRM_COA`.**
  Modul melaporkan liabilitas yang neraca firma tidak bawa.
- Aset kontrak (`recognized − billed`) dan `1-300 WIP Belum Ditagih` (9.300 jt, sub-buku
  WIP) mengukur hal yang sama dengan dua cara tanpa saling menunjuk.
- Roll-forward aset/liabilitas kontrak **mengaku sendiri disintesis** (faktor
  ×0,74/×0,32/×0,28/×1,4/×0,9/×1,3 "agar menutup ke saldo akhir"). Jujur dilabeli —
  tetap plug.

### 1.5 Arus Kas — forecast yang tidak bermula dari kas firma

`CASH_FORECAST[0].open` = **8.575 jt**; kontrol kas buku besar = **8.480,638 jt**.
Selisih **94,4 jt** tanpa penjelasan. `kpis().runway` memakai `F[0].open` sebagai basis,
jadi KPI runway berdiri di atas saldo kas yang bukan saldo kas firma. Inflow/outflow
adalah 12 literal yang mengabaikan `INVOICES` (punya `due`), `FIRM_AP` (punya `due`) dan
`TAX_OBLIGATIONS` (punya `due`) — ketiga register yang sesungguhnya tahu kapan kas
bergerak. Skenario Optimis/Konservatif adalah pengali datar (×1,12/×0,85) di atas
literal itu.

---

## 2. Objective

Menyelesaikan sapuan yang sudah berjalan di grup ini: **setiap angka headline di
delapan modul "Keuangan Firma (ERP)" harus diturunkan dari register, dan setiap akun
kontrol material harus punya sub-buku yang dapat MEMERAH.**

Bukan menambah layar baru. Menutup dasar dari layar yang sudah ada.

---

## 3. Success Criteria

Tiap kriteria harus dapat DIGAGALKAN oleh perubahan data (bukan tautologi):

| # | Kriteria | Cara membuktikan gagal |
|---|---|---|
| SC-1 | Ada **satu** register aset tetap. `AMS.FIXED_ASSETS` dan `BO.FIXED_ASSETS` menjadi satu sumber; seluruh konsumen membaca sumber itu | Hapus satu aset → NBV di `fixedassets`, `firmops`, `bo1`, `firmops2` bergerak serempak |
| SC-2 | `1-400` punya baris di `reconciliations()` dengan status diturunkan dari angka (`tied`/`bridged`/`open`) | Ubah `cost` satu aset → baris jadi `open` & merah |
| SC-3 | Tidak ada baris register menunjuk akun di luar `FIRM_COA`; gerbang repo-lebar menguji ini | Tambah `gl: '9-999'` → uji merah |
| SC-4 | Beban penyusutan punya akun `5-xxx`, DIPOSTING, dan masuk `pl()`; laba operasi turun sebesar beban itu | Bandingkan `opProfit` sebelum/sesudah; gerbang cakupan #242 tetap hijau (baris anggaran ditambahkan) |
| SC-5 | Roll-forward NBV dienumerasi dari register (saldo awal · capex · penyusutan · pelepasan), bukan `akhir + dep` | Tambah pelepasan → roll-forward tidak menutup kecuali komponennya benar |
| SC-6 | `view_profit` memakai `FIRMFIN.WIP_COST` untuk biaya dan `FIRMFIN.STD_RATE` untuk charge-out; `CHARGE_MULT` & `GRADE_COST` dicabut | Grep: nol literal tarif di `view_profit.tsx` |
| SC-7 | WIP charge-out di tab Leverage = nilai WIP yang sama dengan modul `wip` untuk jam yang sama | Uji lintas-modul membandingkan keduanya |
| SC-8 | Realisasi diturunkan dari `INVOICES` (+`CREDIT_NOTES`), bukan literal per-engagement | Tandai satu faktur lunas → realisasi bergerak |
| SC-9 | Tab **Per Partner** bergerak saat jam timesheet dicatat (deps `useMemo` benar) | Catat jam → kedua tab bergeser |
| SC-10 | Margin engagement direkonsiliasi ke `pl().opProfit` lewat jembatan bernama (overhead tak terserap, engagement non-material) dengan residual yang bisa merah | Ubah satu beban → residual bergerak |
| SC-11 | Beda temporer pajak tangguhan diturunkan dari register (aset tetap komersial vs fiskal, provisi WIP dari `WIP_PROV_MATRIX`); pos tanpa akun dicabut atau diberi akun | Ubah umur satu aset → DTL bergerak |
| SC-12 | PPh Badan diturunkan dari laba buku besar lewat rekonsiliasi fiskal bernama, bukan literal | Posting jurnal → beban pajak bergerak |
| SC-13 | `2-200 Utang Pajak` punya baris di `reconciliations()` terhadap `TAX_OBLIGATIONS` | Ubah satu kewajiban → residual bergerak |
| SC-14 | Pendapatan PSAK 72 menutup ke `4-100` lewat jembatan bernama; liabilitas kontrak punya akun `2-xxx` | Ubah `progress` satu perikatan → jembatan bergerak, residual bisa merah |
| SC-15 | Roll-forward aset/liabilitas kontrak dienumerasi; faktor sintetis ×0,74 dst. dicabut | Grep: nol faktor sintetis |
| SC-16 | Forecast arus kas bermula dari kontrol kas buku besar; inflow/outflow diturunkan dari `INVOICES.due` · `FIRM_AP.due` · `TAX_OBLIGATIONS.due` | Geser satu jatuh tempo → bulan yang terpengaruh bergerak |
| SC-17 | `npm run verify` hijau penuh; ratchet `:any` tidak naik | — |

---

## 4. Scope

Enam PR, masing-masing satu kelas cacat, urutan mengikuti ketergantungan data:

| PR | Isi | Modul |
|---|---|---|
| **PR-1** | **Satu register aset tetap.** Gabungkan A+B; petakan ke akun `FIRM_COA` nyata; gerbang "akun register harus ada di COA" (repo-lebar) | `fixedassets` + `firmops`/`bo1` |
| **PR-2** | **Aset tetap menutup ke buku besar.** Akun bruto + akumulasi penyusutan; beban penyusutan DIPOSTING ke `5-xxx`; baris `1-400` di `reconciliations()`; roll-forward dienumerasi (capex & pelepasan dari register `DISPOSALS`) | `fixedassets`, `firmgl`, `treasury` |
| **PR-3** | **Biaya adalah biaya.** `WIP_COST`/`STD_RATE` dari SSOT; `CHARGE_MULT`, `GRADE_COST`, `REALIZATION` dicabut; realisasi dari `INVOICES`; `useMemo` deps diperbaiki; jembatan margin → `opProfit` | `profitability` |
| **PR-4** | **PPh Badan firma memakai mesin PSAK 46 milik firma sendiri.** Beda temporer dari register; rekonsiliasi fiskal komersial→fiskal; baris `2-200` di `reconciliations()` | `firmtax` |
| **PR-5** | **PSAK 72 menutup ke `4-100`.** Jembatan pendapatan; akun liabilitas kontrak; roll-forward dienumerasi; fallback `materiality × 0,4` dicabut | `revenue` |
| **PR-6** | **Forecast arus kas dari register.** Basis = kontrol kas; inflow/outflow dari jatuh tempo AR/AP/pajak; skenario jadi asumsi bernama atas komponen, bukan pengali datar | `treasury` |

## 5. Non-Scope

- Modul di luar grup "Keuangan Firma (ERP)" — kecuali sentuhan yang **wajib** karena
  SSOT bersama (`firmops`/`bo1` di PR-1, `wip` sebagai pembanding di PR-3).
- Menjadikan modul read-only menjadi read-write (`revenue`, `fixedassets` bertanda
  "Read-only — dikelola di CoreSys"). Keputusan produk terpisah.
- Multi-periode / komparatif tahun lalu. `FIRM_COA` hanya membawa satu saldo per akun;
  menambah dimensi periode adalah arc tersendiri (lihat §8 Q-3).
- Backend: tidak ada perubahan skema Prisma. Seluruh pekerjaan di lapisan
  data/kanon/view.

## 6. Constraints

- **`master` SELALU HIJAU (R-7).** Repro cacat yang belum ditutup pakai `it.fails()`.
- SSOT: angka dari `canon*`/`FIRMFIN`, bukan hardcode. Menurunkan literal→turunan
  membuat gerbang tie-out TAUTOLOGIS — ganti dengan gerbang **cakupan**, jangan dibuang
  (pelajaran #242).
- Menyentuh `AMS_CANON` → WAJIB perbarui snapshot `canon_regression.test.ts`.
- Angka seed harus **menutup** setelah migrasi (pola nol-delta aljabar #241): jangkar
  saldo awal ke seed-journal agar migrasi seed→turunan tidak menggeser angka yang
  terlihat pengguna. Bila menggeser (PR-2 pasti menggeser laba karena penyusutan mulai
  dibukukan), pergeseran itu **disengaja dan didokumentasikan**, bukan efek samping.
- Ratchet `:any`: berkas yang disentuh sebaiknya turun, tidak naik.
- Kontrol form native; tombol ikon ber-`aria-label`; skala tipografi 8 ukuran.

## 7. Existing Solutions (dipakai ulang, bukan dibangun ulang)

| Kebutuhan | Yang sudah ada |
|---|---|
| Rekonsiliasi fiskal komersial→fiskal & pajak tangguhan | `canon_deferredTax` / arc PSAK 46 PR-F·G1·H — **dipakai untuk klien, belum untuk firma sendiri** |
| Pola jembatan bernama + status dari angka | `FIRMFIN.reconciliations()` `mk()` — tinggal ditambah baris `1-400` & `2-200` |
| Pola roll-forward tanpa plug | arc WIP #239 |
| Pola gerbang CAKUPAN pengganti tie-out tautologis | arc anggaran #242 |
| Tarif SSOT | `FIRMFIN.WIP_BILL` / `WIP_COST` / `STD_RATE` |
| Provisi WIP berjenjang + antrean persetujuan | `WIP_PROV_MATRIX`, `WIP_WRITEOFF_APPROVAL_MIN` |
| Register pelepasan aset | `BO.DISPOSALS` (sudah ada, belum tersambung) |

## 8. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | **PR-2 menggeser laba firma** (penyusutan mulai dibukukan) → memerahkan snapshot kanon, gerbang cakupan anggaran, dan angka di modul BI/cockpit | Sapu konsumen `pl()`/`opProfit` SEBELUM posting; tambah baris anggaran `5-6xx`; perbarui snapshot; live-verify dua keadaan |
| R-2 | Menggabungkan dua register aset (PR-1) mengubah angka di 4 modul di luar grup | Nol-delta aljabar: pilih satu register sebagai basis, bawa aset register lain sebagai penambahan, jangkar total ke kontrol |
| R-3 | Selisih `1-400` sebesar 3.374 jt mungkin **tidak dapat dijembatani** dengan data yang ada → gerbang lahir MERAH | Itu hasil yang benar. Putuskan di muka apakah merah memblokir ekspor LK (lih. Q-2) |
| R-4 | Menurunkan realisasi dari `INVOICES` (PR-3) mengubah margin yang selama ini ditampilkan | Sama seperti #240: pergeseran adalah koreksi, bukan regresi — dokumentasikan delta per engagement |
| R-5 | Gerbang repo-lebar "akun register ada di COA" menuduh DIRINYA SENDIRI (judul `describe` adalah kode) | Pelajaran token CSS hantu: kecualikan berkas uji secara eksplisit |
| R-6 | Ada worktree/junction `node_modules` aktif → `prisma generate` menulis ke pohon lain | Verifikasi klien Prisma sebelum menyalahkan uji backend merah |

## 9. Bukti survei (2026-08-16)

Semua angka di bawah dihitung ulang dari seed pada `AMS.TODAY = 2026-03-09`:

```
Aset tetap
  AMS.FIXED_ASSETS   perolehan 6.510 jt · akumulasi 3.784 jt · NBV 2.726 jt · dep 993 jt/th
  GL 1-400                                                     6.100 jt
  SELISIH                                                      3.374 jt  (55% kontrol, tanpa jembatan)
  BO.FIXED_ASSETS    perolehan 2.591,5 jt · NBV literal 1.431 jt · gl '1-2100' (TIDAK ADA di FIRM_COA)

Laba rugi firma
  Pendapatan 4-100                     11.300,0 jt
  Sigma beban 5-100..5-600              8.439,4 jt   (TIDAK ADA akun penyusutan)
  Laba operasi                          2.860,6 jt
  x 22%                                   629,3 jt   vs SPT Badan literal 1.240,0 jt

Kas
  Kontrol 1-101..1-106                  8.480,638 jt
  CASH_FORECAST[0].open                 8.575,0   jt   selisih 94,4 jt (basis KPI runway)

Tarif per jam (mix standar)
  WIP_BILL  blended     730 rb   <- view_profit melabelinya "Biaya Standar"
  WIP_COST  blended     369 rb   <- biaya sesungguhnya, tak dipakai di view_profit
  STD_RATE            1.250 rb   <- nilai charge-out SSOT (dipakai modul wip)
  blended x 2,4       1.752 rb   <- "WIP Charge-out" tab Leverage (+40% vs SSOT)
```

Rujukan berkas: `data_part2.ts:114` · `data_backoffice.ts:90,94,104` · `data_part1.ts:515-542`
· `data_firmfin.ts:44,254,506,568` · `data_firmops.ts:41` · `view_firmtreasury.tsx:407-471`
· `view_profit.tsx:19-31,45-56,86,230-248` · `view_firmtax.tsx:61-77` · `view_firmrevenue.tsx:27-43,110-131`

## 10. Implementation Plan

Enam PR berurutan (§4). Tiap PR: uji repro cacat dulu (merah), lalu perbaikan, lalu
`npm run verify` hijau, lalu live-verify **dua keadaan** (menutup & TIDAK menutup) —
gerbang yang belum pernah terlihat MERAH belum membuktikan apa pun.

Urutan mengikat: PR-1 → PR-2 (register tunggal dulu, baru menutup ke GL) ·
PR-2 → PR-4 (beda temporer penyusutan butuh register & akun yang benar) ·
PR-3, PR-5, PR-6 independen setelah PR-2.

## 11. Open Questions

- **Q-1 — Cakupan.** Kerjakan keenam PR sebagai satu arc, atau berhenti setelah PR-1..PR-3
  (aset tetap + profitability) dan nilai ulang? *Rekomendasi: keenam — PR-4 dan PR-5
  bergantung pada dasar yang sama dan meninggalkannya berarti membiarkan pajak tangguhan
  berdiri di atas literal.*
- **Q-2 — Konsekuensi gerbang merah.** Bila `1-400` atau `4-100` **tidak menutup**, apakah
  itu memblokir ekspor laporan keuangan firma (seperti #239 memblokir), atau cukup badge
  merah? *Rekomendasi: blokir — konsisten dengan WIP dan Kas.*
- **Q-3 — Dimensi periode.** `FIRM_COA` hanya membawa satu saldo per akun, sehingga tidak
  ada P&L bulanan, YTD, maupun komparatif tahun lalu di seluruh grup ini. Menambahkannya
  adalah arc tersendiri yang menyentuh setiap modul. Masuk sekarang, atau dicatat sebagai
  utang? *Rekomendasi: dicatat sebagai utang — pekerjaan §4 lebih dulu, karena dasar yang
  salah dikali 12 periode tetap salah.*
- **Q-4 — Register mana yang jadi basis PR-1?** Register A (`AMS.FIXED_ASSETS`, 6 aset,
  dipakai grup ini) atau B (`BO.FIXED_ASSETS`, 7 aset, punya kustodian/vendor/asuransi/
  pelepasan)? *Rekomendasi: B sebagai bentuk data (lebih kaya, punya `DISPOSALS`), diisi
  aset dari A — tapi ini menggeser angka di modul ini, jadi butuh keputusan Anda.*
- **Q-5 — Read-only.** `revenue` dan `fixedassets` bertanda "dikelola di CoreSys (roadmap)".
  Tetap read-only, atau PR ini sekalian membuka penambahan aset/pelepasan dengan RBAC
  `FIRMFIN_EDIT` + jejak audit? *Rekomendasi: tetap read-only — jangan mencampur
  perbaikan dasar dengan penambahan permukaan tulis.*

---

Catatan status: baris di `docs/PRD-REGISTRY.md` harus konsisten dengan tabel di kepala
dokumen ini.
