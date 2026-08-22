# PRD — Pengakuan pendapatan firma dengan metode masukan berpagar (PSAK 72)

> Implementasi TIDAK dimulai sebelum sign-off (**"Proceed."**).

| Field | Isi |
|---|---|
| Tanggal | 2026-08-22 |
| Pemilik | Ari Widodo |
| Status | Draft |
| Modul | `revenue` (Pendapatan Firma) · `view_firmrevenue.tsx` · `revenue_psak72.ts` |
| Asal | [`usulan-R3-metode-pengukuran-psak72.md`](usulan-R3-metode-pengukuran-psak72.md) — **Opsi A dipilih** (2026-08-22) |
| Prasyarat | PR #277 (`9a4158c`) sudah mendarat: nilai kontrak berhenti dikarang, label berhenti menjamin lebih dari yang diukur |

---

## 1. Problem

Pendapatan firma diakui `nilai kontrak × (engagement.progress / 100)`. `progress`
adalah kolom **status** pada baris perikatan — persentase yang *dilaporkan*, tanpa
dasar terdokumentasi, tanpa jejak, dan tanpa satu pun kontrol yang menahannya.

PSAK 72 ¶B14–B19 hanya mengenal dua keluarga ukuran kemajuan: **metode keluaran**
(survei kinerja, milestone, unit diserahkan) dan **metode masukan** (jam, biaya,
sumber daya yang dikonsumsi). Sebuah persentase yang diketik bukan salah satu pun
dari keduanya. Untuk firma yang benar-benar memakai Asseris, pengakuan pendapatan
tanpa ukuran kemajuan yang dapat diaudit adalah **temuan pengendalian pada kertas
kerja firma sendiri**.

Masalah kedua yang menyertainya: firma ini sudah punya ukuran kemajuan berjejak —
jam dari timesheet — dan sudah memakainya untuk WIP dan profitabilitas. Jadi satu
perikatan hari ini punya **dua ukuran kemajuan** yang tak pernah dipertemukan.

## 2. Objective

Pendapatan firma diakui dari ukuran kemajuan yang **punya jejak per orang per hari**,
dan **ukuran itu satu** untuk WIP, profitabilitas, dan pengakuan pendapatan.

Objective ini benar karena yang dikejar bukan kemurnian PSAK melainkan
**auditabilitas**: hasil akhirnya boleh bergeser sedikit (5 dari 7 perikatan sudah
sepakat dalam ±1 poin persen), yang berubah adalah bahwa angkanya kini dapat
ditelusuri ke bukti alih-alih ke satu bilangan yang diketik.

## 3. Success Criteria

Semua kriteria di bawah **terukur** dan dijaga uji; nomor rujukannya dipakai di PR.

| # | Kriteria | Cara dibuktikan |
|---|---|---|
| SC-1 | Pengakuan diturunkan dari jam (`engagementWip`), bukan `engagement.progress` | Gerbang CAKUPAN: `revenue_psak72.ts` & `view_firmrevenue.tsx` tak menyebut `progress` untuk pengakuan; mesin menerima jam |
| SC-2 | **Pagar 1** — perikatan berstatus selesai/arsip diakui 100% tanpa memandang jam | `ENG-2025-058` (`Completed`, jam 96,4%) mengakui **580,0 jt**, bukan 559,3 jt |
| SC-3 | **Pagar 2a** — jam melebihi anggaran tak menambah pendapatan | Perikatan dengan jam 120% anggaran mengakui 100%, bukan 120% |
| SC-4 | Perikatan tanpa jam/anggaran yang sah = **lubang data**, bukan fallback diam-diam ke `progress` | Baris berkata "kemajuan belum terukur", keluar dari total — pola yang sama dengan lubang nilai kontrak (#277) |
| SC-5 | Satu ukuran kemajuan lintas modul | Uji yang membandingkan kemajuan di `revenue` dengan yang dipakai WIP/T&B untuk perikatan yang sama; keduanya dari fungsi yang sama |
| SC-6 | Perpindahan metode **dinyatakan**, bukan senyap | Layar & (kelak) ekspor memuat kalimat metode; uji teks menjaganya |
| SC-7 | Angka bergerak persis sebesar yang diperkirakan | Uji nilai atas seed: total diakui 4.815,7 jt → **4.942,8 jt** sesudah kedua pagar, dengan rincian per perikatan |
| SC-8 | Tak ada regresi pada modul lain | `npm run verify` hijau; gerbang cakupan faktur (#275) tetap hijau |

Catatan atas SC-3: pada seed **tak satu pun** perikatan melewati anggaran (tertinggi
`ENG-2025-058` 96,4%), jadi Pagar 2a **dorman hari ini**. Uji wajib MEMBANGUN keadaan
120% alih-alih berharap seed memicunya — pelajaran yang sama dengan fallback nilai
kontrak di #277, yang juga dorman dan karena itu tak pernah terlihat.

Catatan atas SC-7: tabel di usulan-R3 menyebut **4.922,1 jt** — itu rasio jam
MENTAH, tanpa pagar. Dengan **Pagar 1** aktif `ENG-2025-058` kembali ke 580,0 jt,
sehingga totalnya **4.942,8 jt** (+127,1 jt · +2,64% terhadap 4.815,7 jt hari ini).
Angka final wajib dihitung ulang oleh uji, bukan disalin dari dokumen ini.

## 4. Scope

1. **Mesin.** `revenue_psak72.ts` menerima jam aktual & anggaran per perikatan dan
   menghitung fraksi kemajuan berpagar. Satu-satunya tempat rumus ini hidup.
2. **Sumber jam.** `FIRMFIN.engagementWip(timeEntries, engId)` — pintu yang sama
   dengan Time & Budget dan WIP, sehingga jam timesheet yang baru masuk ikut
   menggerakkan pengakuan.
3. **Pagar 1** (status selesai/arsip ⇒ 100%) dan **Pagar 2a** (jepit di 100%).
4. **Lubang data** ketika jam/anggaran tak sah — mengikuti pola `gaps` yang sudah ada.
5. **Pengungkapan** di layar: kolom pengukuran, footnote, dan pita ilustrasi
   diperbarui agar menyebut metode yang baru.
6. **Tanda "klasifikasi terbuka"** dicabut atau dipertahankan sesuai jawaban Q3.

## 5. Non-Scope

- **Metode keluaran / milestone berbobot** (Opsi B usulan-R3) — tidak dikerjakan.
- **Pagar 2b (¶B19 penuh)** — pengeluaran jam yang tak berkontribusi. Lihat Q4;
  ia butuh data yang belum ada dan **tidak** masuk fase ini.
- **Rantai otorisasi revisi `budgetHrs`** — lihat Q1; PRD tersendiri bila dipilih.
- **Ekspor XLSX skedul pengakuan** — [`usulan-R6`](usulan-R6-ekspor-dan-gerbang-akses-pendapatan.md),
  sengaja menunggu PRD ini supaya pengungkapan di dalam berkas tak langsung basi.
- **Gerbang akses modul** — juga usulan-R6, keputusan terpisah.
- **Perubahan data seed.** `progress` tetap ada dan tetap dipakai modul lain
  (dashboard, kokpit); yang berubah hanya siapa yang memakainya untuk **pendapatan**.

## 6. Constraints

- **Regulasi:** PSAK 72 ¶B14–B19. Pagar 1 bukan kelonggaran melainkan konsekuensi:
  kewajiban pelaksanaan yang tuntas tak boleh diakui kurang dari penuh.
- **Sistem:** `engagementWip` mengembalikan `null` untuk perikatan tanpa roster.
  Hari ini seluruh perikatan seed punya roster (literal untuk `ENG-2025-014`,
  turunan profil untuk enam sisanya), tetapi jalur `null` **wajib** ditangani
  sebagai lubang data — bukan fallback.
- **Sistem:** repo tak punya gerbang variabel mati dan `:any` ber-ratchet;
  `npm run lint:any-baseline` wajib disinkronkan.
- **Orang:** satu arc, dikerjakan di worktree terisolasi (sesi paralel berbagi
  direktori utama).

## 7. Existing Solutions

| Yang sudah ada | Mengapa tak cukup |
|---|---|
| `engagement.progress` | Angka yang diketik; nol jejak, nol kontrol. Inilah masalahnya. |
| `FIRMFIN.engagementWip` | **Sudah menghitung persis yang dibutuhkan** (`actualHrs`, `budgetHrs` dari roster + timesheet live) dan sudah menjadi SSOT WIP & profitabilitas. Tak ada pekerjaan kustom yang perlu dibenarkan — yang kurang hanya penyambungannya ke pengakuan pendapatan, plus dua pagar. |
| Modul Delivery & Milestones (#264) | Menyimpan komitmen milestone yang tak bisa dihapus — fondasi metode keluaran (Opsi B), **belum** punya bobot. Karena itu B ditunda, bukan ditolak. |
| `wip.adj` (write-down manual) | Menyatakan WIP yang tak terpulihkan — kandidat terkuat untuk ¶B19. Lihat Q4. |

Kesimpulan: ini **penyambungan**, bukan pembangunan. Justifikasi kustom minimal.

## 8. Proposed Approach

```
kemajuan(perikatan) =
    1                                   bila status ∈ {Completed, Arsip}      ← Pagar 1
    min(1, actualHrs / budgetHrs)        bila keduanya angka berhingga > 0     ← Pagar 2a
    LUBANG DATA                          selain itu                            ← SC-4
```

`actualHrs`/`budgetHrs` dari `engagementWip`, bukan dari kolom perikatan, supaya
timesheet yang baru masuk ikut bergerak dan supaya angkanya identik dengan yang
dipakai WIP.

**Mengapa ini dipilih dibanding rasio jam polos:** data seed sendiri memuat dua baris
yang memfalsifikasi rasio polos — `ENG-2025-058` (`Completed`, jam berhenti 96,4% ⇒
akan menahan 3,6% pendapatan atas perikatan yang sudah tuntas) dan `ENG-2025-063`
(jam 95,7% vs dilaporkan 88% ⇒ mengakui pendapatan atas ketidakefisienan). Pagar 1
menutup yang pertama sepenuhnya. Yang kedua **hanya tertutup sebagian** oleh Pagar 2a
dan menunggu Q4 — itu dinyatakan di sini, bukan disembunyikan.

**Mengapa dibanding Opsi B (milestone):** B lebih dekat dengan cara jasa audit dijual
dan kebal ketidakefisienan, tetapi menuntut bobot per milestone yang belum ada.
Tanpa bobot yang disepakati, B hanya memindahkan angka-yang-diketik dari `progress`
ke tabel bobot — masalah yang sama dengan nama yang berbeda.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R1 | **`budgetHrs` menjadi tuas pendapatan.** Menaikkan anggaran menurunkan pendapatan diakui seketika — pintu belakang yang melewati rantai otorisasi write-down WIP ([`usulan-W1`](usulan-W1-wip-writedown-otorisasi.md)). | Q1. Minimal: perubahan `budgetHrs` masuk jejak audit dan terbaca di layar. Rantai persetujuan penuh = PRD sendiri. |
| R2 | **Restatement senyap.** Total bergerak ±127 jt pada saat deploy. | SC-6 + SC-7: pergerakan dinyatakan di layar dan dipaku uji nilai. |
| R3 | **Fallback diam-diam.** Godaan terbesar: `hours ?? progress`. Itu menghidupkan kembali persis cacat yang dicabut #277 (proksi yang menyamar sebagai angka). | SC-4 + gerbang CAKUPAN yang menolak penyebutan `progress` di jalur pengakuan. |
| R4 | **Pendapatan bergerak intraday.** Setiap timesheet menggeser pendapatan diakui. Secara konsep benar; bagi pembaca laporan terasa tak stabil. | Dinyatakan di layar. Bila tak dikehendaki, sumber jam dipindah ke jam yang sudah di-*approve* — perubahan satu baris, tetapi **keputusan**, bukan detail. Angkat bila Ari menghendaki. |
| R5 | **Roster turunan.** Enam dari tujuh roster adalah backfill demo. | Bukan risiko metode: roster menutup eksak ke `actualHrs`/`budgetHrs` seed, jadi yang diuji tetap mekanismenya. Dinyatakan agar tak disalahbaca sebagai data nyata. |

## 10. Implementation Plan

| Fase | Isi | Gerbang |
|---|---|---|
| **PR-1** | Mesin: `progressFraction()` berpagar di `revenue_psak72.ts` + tipe lubang data kedua (`progress-unknown`). Belum disambungkan. | Uji murni SC-2 · SC-3 · SC-4, ditulis **merah lebih dulu** |
| **PR-2** | Penyambungan: `view_firmrevenue` mengirim jam dari `engagementWip`; `progress` dicabut dari jalur pengakuan. | Gerbang CAKUPAN SC-1 · uji nilai SC-7 · uji render jsdom (lubang data tak menggambar `NaN`) |
| **PR-3** | Pengungkapan: kolom pengukuran, footnote, pita, dan tanda klasifikasi (sesuai Q3). | Uji teks SC-6 |
| **PR-4** | Sambungan lintas modul SC-5 + `lint:any-baseline` + `npm run verify`. | SC-5 · SC-8 |

Tiap PR mandiri-hijau (`master` selalu hijau, R-7).

## 11. Open Questions

1. **Revisi `budgetHrs`** — masuk rantai otorisasi (seperti write-down WIP), atau
   kewenangan manajer perikatan dengan jejak audit saja? *(Usulan saya: jejak audit
   dulu di PRD ini; rantai penuh menyusul bersama usulan-W1 agar tak ada dua rantai
   yang berselisih.)*
2. **Pergerakan ±127 jt** — dinyatakan sebagai koreksi metode di layar **dan** ekspor,
   atau cukup catatan rilis? *(Usulan saya: di layar; ekspor menyusul lewat usulan-R6.)*
3. **Perikatan non-audit** (`ENG-2025-047` AUP, `ENG-2025-022` Review SPR 2400) —
   kewajiban pelaksanaannya *over-time* juga, atau *point-in-time* saat laporan
   diserahkan? Jawaban ini mencabut tanda "klasifikasi terbuka" yang dipasang #277.
   **Ini satu-satunya pertanyaan yang mengubah angka**, karena bila *point-in-time*
   maka kedua perikatan itu diakui 0 sampai penyerahan. *(Tak ada usulan dari saya:
   ini pertimbangan kontrak, bukan pertimbangan teknis.)*
4. **¶B19 (Pagar 2b)** — apakah jam yang nilainya sudah di-write-down (`wip.adj`)
   dikeluarkan dari ukuran kemajuan? Ia satu-satunya data yang sudah menyatakan
   "masukan ini tak berkontribusi". Butuh konversi Rp → jam ekuivalen lewat tarif
   charge-out, dan menautkan pendapatan ke write-down berarti **rantai otorisasi
   write-down ikut menggerakkan pendapatan**. *(Usulan saya: fase berikutnya,
   setelah Q1 dijawab.)*

---
**Sign-off:** ditandai dengan balasan **"Proceed."**
