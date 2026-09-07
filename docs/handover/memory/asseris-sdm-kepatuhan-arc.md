---
name: asseris-sdm-kepatuhan-arc
description: Arc pendalaman grup SDM & Kepatuhan (12 modul) — PRD + PR-1 cuti terturunkan; keputusan Q-1/Q-4/Q-6 dan gotcha verifikasi hidup
metadata: 
  node_type: memory
  type: project
  originSessionId: 036f053a-2ad5-42e8-801c-00152d40cff3
  modified: 2026-08-16T02:36:49.804Z
---

**STATUS: MERGED** — PR #256 di-squash ke `origin/master` = **`46eb651`** (2026-08-16). Branch `feat/sdm-kepatuhan-pr1-pr3` sudah dihapus. `npm run verify` hijau di master.

Arc **SDM & Kepatuhan** (12 modul: hcm · orgchart · recruitment · learning · succession ·
payroll · leave · performance · cpe · ethics · independence · hrcase). PRD:
`docs/prd-sdm-kepatuhan-deepening.md`, 24 SC, 7 PR. Mulai 2026-08-16 di atas `origin/master`
`1bdc7e8`. Branch PR-1: `feat/sdm-pr1-leave-derived`, commit `0221cf6`.

## Yang MASIH menunggu tindakan manusia (utang terbuka arc ini)
1. **`TER_TABLE.verified = false`** (`canon_pph21.ts`) — lapisan tarif direkonstruksi dari 10 tarif yang
   sudah dipakai app, BUKAN dari Lampiran PMK 168/2023. Ari memutuskan "biarkan, yang penting dapat diedit".
   Ganti angkanya lalu setel `verified: true`. Spanduk permanen tampil di modul Payroll sampai itu terjadi.
2. **Kalender hari libur 2026** (`LEAVE_HOLIDAYS`, data_part2) — tanggal berbasis hisab dari perhitungan,
   belum dicocokkan SKB 3 Menteri. Field `penetapan` tetap/hisab + `confirmedThroughYear` menandainya.
   Cuti bersama SENGAJA kosong.
3. **SC-24a — dua register SKP** masih berdiri: `CPE_LOG` (empId) vs `PPPK_PPL` (nama). Berbeda utk keempat
   orang beririsan. Mesinnya sudah satu; penyatuan register butuh keputusan pemetaan nama→empId.

## Keputusan Ari 2026-08-16
- **Q-1 = (b)** perbesar `AMS.STAFF` ke ~69 orang bernama — dikerjakan di **PR-4**, bukan sekarang.
- **Q-4 = (b)** kasus HR berat aktif memblokir staffing & sign-off **dengan override ber-atestasi
  Partner** (pola `ethicsOverride` yang sudah ada).
- **Q-6 = PR-1..PR-3 dulu lalu checkpoint.** Q-2/Q-3/Q-5 mengikuti rekomendasi
  (register peristiwa `EXITS`; tabel TER PMK 168 PENUH; posting payroll→GL dijangkarkan delta-nol).

## SC-25 — sekuens Q-1 × Q-6 (kunci, jangan dilupakan)
Roster diperbesar di PR-4 sementara PR-1..PR-3 dibangun di atas roster 10 orang. **Bila mesinnya
benar-benar diturunkan, PR-4 tidak boleh menyunting `canon_leave.ts`/`canon_perf.ts` sama sekali.**
`git diff --stat` PR-4 atas berkas kanon itu harus KOSONG. PR-4 = uji retrospektif atas PR-1..PR-3.

## Temuan asesmen yang masih menunggu PR (terverifikasi, jangan di-grep ulang)
- **TIGA headcount untuk satu firma**: `FIRM` 6+11+58=75 · `HCM_ANALYTICS.gradeMix` 69 ·
  `STAFF` sebenarnya 10 (+2 FIRM_STAFF). Dua sumber literal itu bahkan tak sepakat satu sama lain.
- **PPL: mesin benar SUDAH ADA dan modul PPL memakai yang salah.** `canon_ppl.ts:114` meng-cap
  unstructured di 10 (PMK 186 Ps. 37) & dipakai `view_pppk`; `view_people.tsx:221` (CPE Tracker) +
  `data_licensing.pplOf` menjumlahkan MENTAH. EMP-007 = 32/40 di Tracker vs 28/40 di P2PK. → PR-3.
- **Kinerja**: `perf: 4.5` tersimpan vs agregasi tertimbang sasaran = **4,36**; `box` string
  tersimpan vs `band()` yang menghitung sendiri; `advance()` (`view_hrops.tsx`) = satu tombol,
  empat peran, tanpa `can()`. → PR-2.
- **Payroll**: `ter: 0.20` adalah DATA bukan fungsi (tak ada tabel TER di repo);
  "Posting ke General Ledger" hanya `nav('firmgl')` → jurnal gaji tak pernah sampai buku besar. → PR-5.
- **Pendaftaran pelatihan anonim**: `doEnroll` menaikkan integer tanpa empId, sementara
  `cpeFromTraining` membaca `trainingAttendance.v1` berkunci empId — dua dunia terpisah. → PR-6.
- Modul `ethics` **sudah memadai** (fail-closed, teruji) — jangan dibangun ulang, cukup periodisitas AML.

## PR-6 & PR-7 — ARC TUNTAS (`7fab1a0`, `183c94c`)
**PR-6** `canon_talent.ts` — `filled` diturunkan (kandidat tahap Diterima ∪ onboarding ber-`req`, dedup);
`applicants` → `applicantsDeclared` (lamaran portal, EKSTERNAL) dipisah dari `inPipeline`. Pendaftaran
pelatihan jadi daftar NAMA (`TRAINING_ENROLMENT`, kunci persist `pc.enroll.v2`); jumlahnya nol-delta ke
literal lama (22·18·25·31·9·7). **Kehadiran hanya bisa dikonfirmasi untuk peserta TERDAFTAR** — jembatan
yang dulu putus. Kompetensi efektif = dasar + pelatihan terkonfirmasi (cap 5) ⇒ gap bisa menutup.

**PR-7** `canon_succession.ts` + `canon_conduct.ts` + `canon_rotation.ts`. Kesiapan suksesi diturunkan
(tangga karier × kompetensi × IDP) — **KETUJUH klaim berbeda dari turunannya**. Gratifikasi: status dari
nilai vs ambang + SLA 14 hari. AML: masa berlaku 12 bulan; kedaluwarsa MEMBLOKIR seperti tertunda; bersih
tanpa tanggal = tidak sah. Kasus disiplin berat/aktif (independensi/kerahasiaan) memblokir gerbang etik,
override Partner WAJIB ber-alasan. Sanksi: anak tangga DIPILIH + SoD (bukan yang dikenai/pelapor/penyelidik).
Rotasi: `AP_SIGNING_HISTORY` (AP × klien × tahun), tenure = tahun BERTURUT, cooling-off dievaluasi,
`rotationAssignCheck` MEMBLOKIR penugasan. EMP-004 2,5 → 3 (bulat KE ATAS: mengecilkan masa tugas =
mengecilkan risiko) ⇒ pindah ke "wajib rotasi".

**GOTCHA VERIFIKASI HIDUP (baru):** Vite dev **memecah graf modul** — app mengimpor `/src/data.ts?t=<hmr>`
sementara `import('/src/data.ts')` dinamis mengambil instance LAIN. Akibatnya IIFE `data_people` memutasi
AMS yang berbeda ⇒ `AMS.GIFTS_REGISTER` undefined padahal uji hijau. **Perbaikan: preview_stop lalu
preview_start (restart server), bukan reload halaman.**

## PR-4 & PR-5 (commit `c7b8f21`, `0d5b487`)
**PR-4** — roster diperbesar ke **69 orang nyata** (`data_roster.ts`, 59 dibangkitkan) + `canon_hcm.ts`.
Literal `HCM_ANALYTICS` jadi SPESIFIKASI roster lalu dihapus; kelima distribusi + avgTenure 3,8 direproduksi
PERSIS. `FIRM.partners/managers/staff` jadi getter (6+11+52=69; angka lama 58 → total 75 tak menutup ke apa pun).
Register `AMS.EXITS` (11 kepergian). **TEMUAN: `annualAttrition:16` + `regrettable:62` MUSTAHIL bersamaan** —
solusi bulat hanya pada headcount 79–83, sementara `gradeMix` di objek yang sama 69. regrettable → 64%.
`headcountTrend` kuartalan → **TAHUNAN** (roster cuma simpan tahun bergabung; versi kuartalan bikin headcount
masa lalu tampak 78 > hari ini). **SC-25 LULUS: PR-4 tak menyentuh canon_leave/canon_perf sama sekali.**

**PR-5** — `canon_pph21.ts`: TER jadi fungsi (PTKP→kategori→lapisan), Pasal 17 berlapis + rekonsiliasi Desember,
jurnal gaji BENAR-BENAR diposting ke `firmgl` dgn gerbang (draft / CAP.FIRMFIN_EDIT / tak seimbang / **posting ganda**).

⚠ **`TER_TABLE.verified === false` — BUTUH ARI.** Lapisan direkonstruksi agar mereproduksi 10 tarif yang sudah
dipakai app, **BUKAN** disalin dari Lampiran PMK 168/2023. Saya tak dapat memverifikasi 132 batas dari ingatan.
Mekanisme & tempatnya benar; angkanya harus diganti Lampiran resmi lalu `verified: true`. Spanduk permanen di modul.
EMP-501 (9%→5%) & EMP-601 (10%→7%) bergerak: tarif lamanya melanggar struktur (kategori B ≥ A pada bruto sama).

**REGRESI YANG SAYA BUAT DI PR-4:** 59 baris `PAYROLL_EXT` tanpa `ter` ⇒ `base * undefined` = **NaN** untuk PPh 21
& take-home. Tak tertangkap uji apa pun (modul payroll tak punya uji numerik). Ditutup PR-5 lewat tarif turunan.
**PELAJARAN: menambah baris ke peta data yang dikonsumsi rumus = cek field WAJIB-nya, bukan cuma typecheck.**

**GOTCHA KERAS (terulang):** `git checkout -- <berkas>` saat falsifikasi **MENGHAPUS seluruh kerja PR-5 yang belum
di-commit** di `view_payroll.tsx`. Untuk falsifikasi SELALU `cp <berkas> /tmp/x.bak` lalu `cp` balik — jangan git.

**PELAJARAN FALSIFIKASI:** satu falsifikasi awalnya HIJAU → ujinya lemah (memeriksa `terSource` tanpa memeriksa
tarifnya benar-benar ada). Falsifikasi yang tak merah = uji yang salah, bukan kode yang benar.

## PR-3 — yang dikerjakan (commit `3c748ce`)
CPE/PPL Tracker + `pplOf` berhenti menjumlah SKP mentah → `pplStatusFromEntries()`. **EMP-007
32 → 28** (4 SKP hangus), lima lainnya nol-delta. Ambang PPL satu sumber (`CPE_REQ` tinggal
menyumbang TAHUN). Materi wajib Ps. 37 diklasifikasi per entri (`SkpTopic`: pembinaan/akuntansi/lain)
di `CPE_LOG` + `TRAINING_CATALOG`, dibawa lewat `cpeFromTraining`, dan formulir Catat SKP merekamnya.
`pplFromEntries` menuntut SELURUH entri terstruktur terklasifikasi sebelum `topicsTracked` true.
`CpeEntry extends SkpEntry` supaya kompilator menjaga interop.

**KOREKSI PENTING atas asesmen awal saya.** Saya menyatakan "Tracker 32 vs P2PK 28 untuk EMP-007".
SALAH. `view_pppk` TIDAK membaca `CPE_LOG` — ia membaca **`PPPK_PPL` (`data_part4.ts:392`),
register KEDUA berkunci NAMA** dgn agregat s/u sendiri. Sebelum PR-3 keduanya sama-sama 32
(Tracker 18+14 mentah, P2PK 22+min(10,10) benar) — **cocok secara KEBETULAN**, itulah sebabnya
tak pernah disadari. Cacat sesungguhnya: **DUA REGISTER**, berbeda utk keempat orang beririsan —
Hartono 24/32 · Rudi 18/30 · Sari 31/28 · Anindya 28/32 (Bayu hanya ada di PPPK_PPL).
Dipaku uji sebagai **SC-24a**; penyatuan register butuh keputusan pemetaan nama→empId.
**PELAJARAN: jangan simpulkan modul X "memakai mesin Y atas data Z" tanpa melacak SUMBER DATANYA.**

## PR-2 — yang dikerjakan (commit `4104016`)
`canon_perf.ts` + `perf_cycle.test.ts` (48 uji). `perf` & `box` literal dicabut; skor =
Σ(skor×bobot)÷Σ(bobot), 9-box = (skor × potensi) dgn **9 sel bernama** (dulu hanya 3 nama dipakai).
Boolean tahap → `steps` ber-stempel {by,byName,at}; bentuk lama TETAP dibaca tapi
`attributed:false` (pola `seeded` member_independence). SoD: self=diri · manajer=atasan langsung
`AMS.ORG` (**HR SENGAJA tidak dapat menggantikan penilai**) · kalibrasi=HR_MANAGE non-atasan.

**Nol-delta**: 6 dari 7 skor tak bergeser (KPI diseed lewat solver agar tertimbang == `perf` lama).
**EMP-021 SENGAJA bergerak 4,5 → 4,36** — angka lamanya tak pernah cocok dgn KPI-nya; selnya tetap
Bintang jadi tak merembet. **TIGA label `box` lama ternyata bertentangan dgn selnya sendiri**:
EMP-008 (Inti, bukan "Kinerja Tinggi") · EMP-031 & EMP-032 (Pekerja Efektif, bukan "Inti").

**GOTCHA PR-2: `AMS.ORG` hanya ditempelkan IIFE `data_people.ts` yang HANYA dimuat `main.tsx`.**
Uji/modul yang cuma `import './data'` melihat ORG kosong ⇒ `managerOf` null ⇒ gerbang reviu manajer
memblokir seluruh roster. Arah benar (gagal-tertutup) tapi menguji hal yang salah. Perbaikan:
`import './data_people';` efek-samping di uji. Sekelas dgn gotcha `data_fpm` di arc Pipeline.

## PR-1 — yang dikerjakan
`canon_leave.ts` (mesin murni) + `leave_register.test.ts` (60 uji). `LEAVE_BALANCE` menyusut jadi
`{carry}` saja; `used`/`ent` diturunkan. Ditambah `LEAVE_HOLIDAYS` (kalender SKB, field `penetapan`
tetap/hisab + `confirmedThroughYear`; `holidayCoverage()` menolak berpura-pura untuk tahun kosong).
Tiga konsumen dipindah SEKALIGUS: `view_hrops` · `view_pc_hcm` · `view_personal`.

**Nol-delta**: 11 permintaan historis Jan–Feb 2026 dikarang agar Σ hari kerjanya menutup PERSIS ke
`used` lama, per orang (total 40 hari). Rentang tanggalnya diverifikasi skrip SEBELUM ditulis.

**Dua baris seed ternyata cacat** dan SENGAJA dibiarkan sebagai bukti gerbang:
`LV-0050` dinyatakan 4 hari padahal 2 hari kerja (3 Apr Wafat Isa = Jumat, 4 Apr Sabtu) ·
`LV-0049` dinyatakan 2 hari padahal berakhir Sabtu.

## GOTCHA
- **Verifikasi hidup: server tRPC :5181 bisa milik SESI LAIN dengan DB seed LAMA.** Modul tampak
  KOSONG (0 baris) bukan karena kode salah — `personal.get` mengembalikan state doc lama. Jangan
  reseed server sesi lain. Jalan keluar: eksekusi kanon langsung di bundel via
  `import('/src/canon_leave.ts')` + `import('/src/data.ts')` di `javascript_tool` — itu membuktikan
  graf ESM, wiring data, dan mesinnya sekaligus.
- `javascript_tool` **tidak menerima top-level `await` maupun `return`** — bungkus dalam
  `(async () => { ... })()` atau `(() => { ... })()`.
- Screenshot gagal bila Browser pane tak ditampilkan; pakai `get_page_text` / querySelector DOM.
- Port 5180/5186 sering dipegang sesi lain → pakai `vite-5185`.
- Menghapus `any` dari view → **suppression usang** ⇒ `VERIFY FAILED: frontend lint` dengan pesan
  "suppressions left that do not occur anymore". Perbaikannya `npm run lint:any-baseline` (REGENERASI).
- `LeaveRequestInput.emp` dibuat **opsional** karena tipe lokal `LeaveReq` di `view_personal.tsx`
  sudah begitu; data terpersist/dari server memang bisa tak lengkap.

Terkait: [[asseris-sales-pipeline-arc]] · [[asseris-budget-actual-ledger-derived]] ·
[[asseris-wtb-pr3-pr4-sa520-spine]] (pelajaran "SSOT setengah jalan") · [[asseris-tooling-gh]]

> **PEMBARUAN 2026-08-19 — SC-24a DITUTUP.** Dua register SKP disatukan: `PPPK_PPL`
> menjadi populasi saja, realisasi lewat `LICENSING.pplOf`. Arc SDM kini **Implemented**
> (SC-1..SC-25 seluruhnya). Rincian: [[asseris-sc24a-satu-register-skp]].
