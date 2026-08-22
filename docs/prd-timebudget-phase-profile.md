# PRD — Anggaran & progres per fase di Time & Budget: satu taksonomi, satu kanon bobot, nol tanggal karangan

> **Keputusan Ari 2026-08-22:** **Opsi B** (taksonomi DATA) dengan peta bobot
> `Specifics → Eksekusi` · `Review & Arsip → Arsip`. SC-1..SC-7 tertutup &
> terverifikasi; rinciannya di §12. Satu pertanyaan BARU muncul saat eksekusi
> dan TETAP TERBUKA — lihat §11 Q4.

| Field | Isi |
|---|---|
| Tanggal | 2026-08-22 |
| Pemilik | Ari Widodo |
| Status | Implemented |
| Modul | `time` (Time & Budget) · `timebudget_model.ts` · `view_timebudget.tsx` — bersinggungan dengan `cockpit_progress.ts` · `view_cockpit2.tsx` |
| Asal | Pertanyaan terbuka yang ditinggalkan pada `TB_PHASE_PROFILE` (#273), disebut ulang di #279 |
| Prasyarat | PR #279 (`fb4127d`) sudah mendarat |

---

## 1. Problem

`TB_PHASE_PROFILE` (`timebudget_model.ts`) adalah profil tetap empat baris yang
memasok **tiga** besaran ke tab "Anggaran per Fase": bobot anggaran jam
(`budgetShare`), bobot jam pembuka (`openingShare`), persentase selesai (`pct`),
dan label periode kalender (`period`). Ketiganya dipakai untuk SETIAP perikatan.

Empat masalah, semuanya dapat difalsifikasi hari ini di seed.

### P1 — dua alokasi anggaran fase untuk satu perikatan

Cockpit (`view_cockpit2.tsx:259`) dan Time & Budget sama-sama membagi **jam
anggaran yang sama** — keduanya membaca `FIRMFIN.engagementWip(...).budgetHrs`
— tetapi dengan bobot yang berbeda. Untuk perikatan demo (1.840 jam):

| Fase | Cockpit (`PHASE_BUDGET_WEIGHT`) | Time & Budget (`budgetShare`) |
|---|---:|---:|
| Perencanaan | 280 j | **320 j** |
| Eksekusi | 760 j | **1.080 j** |
| Specifics | 361 j | *(tak ada)* |
| Finalisasi | 340 j | **320 j** |
| Review & Arsip / Pelaporan | 99 j | **120 j** |

Dua layar, satu perikatan, dua jawaban untuk pertanyaan yang sama
("berapa jam yang dianggarkan untuk fase ini"). Pelanggaran SSOT — kelas cacat
yang sama dengan yang sudah berulang kali dicabut di repo ini.

### P2 — empat daftar fase, dan jam yang hilang di antaranya

| # | Sumber | Isi |
|---|---|---|
| 1 | `TB_PHASE_PROFILE[].id` | Perencanaan · Eksekusi · Finalisasi · **Pelaporan** |
| 2 | `phaseOpts` (`view_timebudget.tsx:457`) | salinan literal dari (1) — daftar kedua yang bisa menyimpang |
| 3 | `PhaseKey` + `'Review & Arsip'` (`cockpit_progress.ts`) | Perencanaan · Eksekusi · **Specifics** · Finalisasi · **Review & Arsip** |
| 4 | `ENGAGEMENTS.phase` · `engagementGate(fromPhase/nextPhase)` · `PhaseName` | Perencanaan · Eksekusi · Finalisasi · **Arsip** |

Akibat yang terukur: formulir timesheet di Time & Budget menulis
`phase: 'Pelaporan'`. Cockpit membuat ember `tsByPhase` lalu **hanya membaca
lima kunci taksonominya sendiri**, sehingga jam berfase 'Pelaporan' tak pernah
terbaca dan jatuh ke `untaggedHrs` ("jam tak bertanda"). Jam yang sama tampil
sebagai fase Pelaporan di satu layar dan sebagai jam tanpa fase di layar lain.

Taksonomi (4) adalah yang dipakai **data** dan **gerbang fase** — ia yang
menentukan perpindahan status perikatan. Taksonomi (1) memakai 'Pelaporan' untuk
hal yang seluruh sisa aplikasi menyebut 'Arsip'.

### P3 — `pct` per fase adalah literal, padahal ukuran terbukti SUDAH ADA

`pct` tetap 100 / 65 / 30 / 20 untuk setiap perikatan, dan `eac` per fase
diturunkan darinya (`eac = actual / (pct/100)`), sehingga proyeksi per fase ikut
karangan.

Dua hal yang membuat ini bukan sekadar "data demo":

- **Rata-rata tertimbang-anggarannya = 62,07% → 62%, persis `e.progress`
  perikatan demo.** Itu tanda tala yang sama yang sudah dicabut dari cockpit
  (`CKP_PHASES`: 20 literal dengan rata-rata 62,1). Profil ini ditala ke satu
  perikatan, lalu diberlakukan untuk semua.
- **Kanon pengukurannya sudah ada.** `phaseRollups()` (`cockpit_progress.ts`)
  menghitung kelengkapan **terbukti** per fase dari tonggak kertas kerja
  (bukti · kesimpulan · sign-off). Time & Budget menampilkan literal di sebelah
  kanon yang mengukur hal yang sama.

### P4 — `period` adalah tanggal karangan

`'02–20 Feb'`, `'24 Feb–20 Mar'`, `'21–28 Mar'`, `'29–31 Mar'` — kalender
perikatan demo, ditampilkan untuk setiap perikatan apa pun tenggatnya.

Tidak ada data tanggal per-fase di mana pun. Dan modul yang tugasnya justru
lini masa **sudah menolak mengarangnya**: `engagementMilestones()`
(`cockpit_timeline.ts`) memberi `dateIso: null` untuk perencanaan/eksekusi/
finalisasi, dan hanya menambatkan tiga tanggal nyata — mulai (turunan), tenggat
opini (`e.deadline`), dan batas arsip (`deadline + ARCHIVE_WINDOW_DAYS`).

---

## 2. Objective

Tab "Anggaran per Fase" hanya menampilkan besaran yang punya sumber, dan setiap
besaran yang juga muncul di layar lain berasal dari kanon yang sama.

## 3. Success Criteria (falsifiable)

| # | Kriteria | Cara membuktikan |
|---|---|---|
| SC-1 | Nol bobot anggaran fase kedua di repo | Gerbang sumber: `timebudget_model.ts` tak memuat tabel bobot sendiri; satu-satunya kanon dipanggil dari `cockpit_progress.ts` |
| SC-2 | Anggaran per fase untuk perikatan yang sama IDENTIK di T&B dan cockpit | Uji yang menghitung keduanya dari satu `engagementWip` dan membandingkan per fase |
| SC-3 | Nol daftar fase literal kedua | `phaseOpts` diturunkan dari kanon; gerbang sumber menolak array fase literal di view |
| SC-4 | Jam berfase apa pun yang dapat ditulis pengguna TERBACA di cockpit | Uji: setiap opsi pada formulir timesheet muncul sebagai kunci yang dibaca `tsByPhase`; `untaggedHrs` tidak bertambah karenanya |
| SC-5 | `pct` per fase berasal dari kertas kerja, bukan literal | Uji: mengubah status kertas kerja MENGGERAKKAN `pct` fase; nol literal `pct` di profil |
| SC-6 | Nol tanggal/periode karangan | Gerbang sumber: nol literal bulan/tanggal di `timebudget_model.ts`; layar menampilkan tanggal hanya untuk tonggak yang benar-benar bertanggal |
| SC-7 | Nol-delta yang dinyatakan | Perubahan angka pada perikatan demo didaftar eksplisit (angka ini AKAN berubah — lihat §9) |

## 4. Scope

- `TB_PHASE_PROFILE` dan seluruh turunannya di `tbModel`.
- Tab "Anggaran per Fase" (`TBPhase`) dan panel "Anggaran vs Aktual per Fase"
  di tab Ringkasan.
- `phaseOpts` pada formulir timesheet.
- Kolom "Fase" pada ekspor XLSX timesheet.

## 5. Non-Scope

- Mengubah bagaimana cockpit menghitung progres terbukti.
- Menambah **data** anggaran per fase yang nyata (kolom baru pada perikatan) —
  itu perubahan model data, PRD terpisah bila Opsi C dipilih.
- `activeClient?.fee || 0` di `view_cockpit2.tsx:208` — fallback fee sekeluarga
  TB5 yang masih hidup di cockpit. **Dilaporkan, tidak dikerjakan di sini.**

## 6. Constraints

- `Σ anggaran fase` WAJIB tetap menutup eksak ke `budgetHrs` perikatan, dan
  `Σ aktual fase` ke `actualHrs` (invarian yang dijaga TB3 hari ini).
- Taksonomi (4) mengendalikan gerbang perpindahan fase — mengubahnya menyentuh
  `engagementGate`, karena itu ia batas keras, bukan pilihan bebas.
- `master` selalu hijau (R-7).

## 7. Existing Solutions (dicek dulu, sesuai aturan)

- `PHASE_BUDGET_WEIGHT` — model alokasi, **sudah ada**, sudah berlabel "model
  alokasi, bukan pengukuran".
- `phaseRollups()` — pengukuran progres per fase dari kertas kerja, **sudah ada
  dan teruji**.
- `engagementMilestones()` — tonggak bertanggal, **sudah ada**, dan sudah
  menetapkan preseden untuk menolak tanggal per-fase yang tak terukur.

Tidak ada yang perlu dibangun dari nol. Yang diperlukan adalah **membuang
salinan kedua** dan menyambungkan T&B ke kanon yang sudah ada.

## 8. Proposed Approach — dan SATU keputusan yang saya tidak ambil sepihak

P3 dan P4 tidak butuh keputusan: `pct` diganti `phaseRollups().provenPct`,
`period` dicabut (mengikuti preseden `engagementMilestones`). Keduanya akan
dikerjakan apa pun pilihan di bawah.

P1 dan P2 butuh keputusan Anda, karena menyatukan taksonomi mengubah layar lain:

**Opsi A — T&B ikut taksonomi cockpit (5 fase).**
Termurah. Tapi memaksa formulir timesheet menawarkan 'Specifics', istilah yang
tak dikenal `ENGAGEMENTS.phase` maupun gerbang fase, dan menambah taksonomi
kelima ke tempat pengguna mengetik.

**Opsi B — cockpit & T&B ikut taksonomi DATA (4 fase: Perencanaan · Eksekusi ·
Finalisasi · Arsip).** ← *rekomendasi saya*
Satu taksonomi untuk data, gerbang, timesheet, dan kedua layar. Menuntut satu
keputusan turunan: ke mana bobot 'Specifics' (0,196) dan 'Review & Arsip'
(0,054) dilipat. Usul: 'Specifics' → Eksekusi, 'Review & Arsip' → Arsip; keduanya
**dinyatakan sebagai peta terdaftar dan diuji**, bukan pemetaan diam-diam.
Angka cockpit akan berubah — itu konsekuensi yang harus disetujui, bukan efek
samping.

**Opsi C — cabut anggaran per fase dari T&B seluruhnya.**
Paling konsisten dengan prinsip "jangan mengarang": tak ada data anggaran per
fase di mana pun, jadi jangan tampilkan. Yang tersisa tetap nyata dan berguna —
aktual per fase dari timesheet (fakta) dan progres terbukti per fase (kanon).
Biayanya: bagan "Anggaran vs Aktual per Fase" kehilangan batang anggarannya
sampai data anggaran per fase benar-benar ada.

## 9. Risks

- **Angka berubah, dan itu disengaja.** Opsi B mengubah anggaran per fase di
  cockpit; Opsi A/B mengubah T&B. Nol-delta TIDAK mungkin di sini — yang bisa
  dijanjikan adalah daftar perubahan yang eksplisit.
- `pct` dari kertas kerja akan **jauh lebih rendah** daripada literal 100/65/30/20
  untuk perikatan yang dokumentasinya tertinggal. Itu memang pesannya, tapi ia
  akan terbaca sebagai regresi kalau tidak dijelaskan di layar.
- Menyatukan taksonomi menyentuh `engagementGate`; perlu diperiksa bahwa tak ada
  gerbang yang bergantung pada string 'Specifics'.

## 10. Implementation Plan (sesudah "Proceed.")

1. **PR-1** — kanon fase tunggal: satu daftar fase + satu tabel bobot, dengan
   peta yang dienumerasi & diuji (SC-1..SC-4). Termasuk mencabut `phaseOpts`.
2. **PR-2** — `pct` per fase dari `phaseRollups()`; `eac` per fase mengikuti
   atau dicabut bila tak bermakna (SC-5).
3. **PR-3** — `period` dicabut; tonggak bertanggal diambil dari
   `engagementMilestones()` bila layar ini memang perlu menampilkannya (SC-6).

Tiap PR berdiri sendiri, uji merah lebih dulu, `npm run verify` hijau.

## 11. Open Questions

- **Q1 (memblokir): Opsi A, B, atau C?** Rekomendasi saya: **B**.
- **Q2 (memblokir bila B):** benarkah 'Specifics' → Eksekusi dan
  'Review & Arsip' → Arsip? Ini pertanyaan metodologi audit, bukan teknis.
- **Q3 (tidak memblokir):** kalau kelak ada anggaran jam per fase yang nyata
  (dicatat manajer perikatan saat perencanaan), ia menggantikan seluruh bobot —
  apakah itu arah yang Anda inginkan? Kalau ya, Opsi C jadi lebih menarik karena
  ia tak menambah kanon yang nantinya dibuang.

---

## 12. Hasil eksekusi (2026-08-22)

Semuanya dikerjakan dalam satu perubahan karena `TB_PHASE_PROFILE` lenyap
seluruhnya — memecahnya akan menampilkan angka setengah-karangan di antara PR.

| SC | Hasil |
|---|---|
| SC-1 | `phase_canon.ts` jadi satu-satunya taksonomi & tabel bobot; gerbang sumber menolak profil/bobot kedua di Time & Budget |
| SC-2 | Cockpit & T&B sama-sama memanggil `phaseBudgetHours`; gerbang membuktikan keduanya mengimpor kanon, bukan sekadar kebetulan sepakat |
| SC-3 | `phaseOpts` diturunkan dari `PHASE_ORDER`; gerbang menolak daftar fase literal di kedua view |
| SC-4 | Setiap nilai `phase` di seed (`ENGAGEMENTS`, `TIME_ENTRIES`) dan setiap opsi formulir terbukti dikenal `phaseOf` |
| SC-5 | `pct` literal dicabut → `phaseRollups().provenPct`; `null` bila tak terukur |
| SC-6 | `period` dan panel "Timeline Fase" dicabut; gerbang menolak literal periode & geometri Gantt |
| SC-7 | Delta dinyatakan di bawah |

### Delta yang disengaja (perikatan demo, 1.840 jam)

| Fase | Anggaran lama (T&B) | Anggaran baru (kanon) |
|---|---:|---:|
| Perencanaan | 320 | 279,68 |
| Eksekusi | 1.080 | 1.120,56 |
| Finalisasi | 320 | 340,40 |
| Pelaporan → **Arsip** | 120 | 99,36 |

Aktual per fase juga berubah bentuk: jam pembuka roster tidak lagi disebar
(dulu 318/658/98/24) melainkan dilaporkan utuh sebagai `untaggedHrs`.
Invarian yang dijaga berubah dari `Σ fase == actualHrs` menjadi
`Σ fase + untaggedHrs == actualHrs` — sifatnya sama (nol jam dikarang, nol jam
hilang), pembuktiannya yang berbeda.

### Temuan baru saat eksekusi

1. **`progressBridge` atas himpunan kosong mengembalikan 0%.** Penyebutnya nol
   ⇒ tiap baris `pp: 0` ⇒ `provenPct: 0`. "Tak ada yang diukur" karena itu tak
   dapat dibedakan dari "semua kertas kerja belum disentuh". Cacat ini DORMAN
   sampai 'Arsip' menjadi fase tersendiri. `phaseRollups` kini `null` untuk
   fase tanpa kertas kerja.
2. **Tambalan lintas-taksonomi di cockpit** —
   `p.phase === e.phase || (e.phase === 'Eksekusi' && p.phase === 'Specifics')`
   ada semata-mata karena cockpit dan data memakai taksonomi berbeda. Dengan
   satu kanon ia tak perlu lagi.
3. **Fabrikasi kelima yang tak terdaftar di §1** — panel "Timeline Fase"
   menggambar Gantt dari `left=[4,30,67,86]` / `width=[24,36,16,12]`: posisi
   yang tak berasal dari tanggal mana pun.

### Ditambahkan ke §11

**Q4 (baru, TERBUKA):** fase 'Arsip' tidak punya satu pun kertas kerja kanonik
— `sa230` (dokumentasi & perakitan berkas) terpetakan ke Finalisasi. Apakah
`sa230`, dan mungkin `sa580`/`sa710`/`sa720`, seharusnya pindah ke Arsip adalah
pertanyaan **metodologi audit**, bukan kerapian peta. Sampai dijawab, keadaannya
didaftarkan di `PHASES_WITHOUT_WP` sehingga fase yang kosong karena KELALAIAN
tetap memerahkan gerbang cakupan, dan daftar itu sendiri diuji agar tak
menyimpan fase yang sudah terisi.
