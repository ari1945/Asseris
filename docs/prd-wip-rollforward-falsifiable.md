# PRD — Roll-forward & rekonsiliasi WIP yang DAPAT GAGAL (mencabut empat angka plug)

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — "Proceed." 2026-08-15. Q-1 = WIP saja · Q-2 = badge merah + blokir ekspor · Q-3 = seed disetel menutup. F-1..F-3 SELESAI, `npm run verify` hijau (1769 uji), SC-1..SC-11 tertutup & live-verified DUA keadaan (hijau & merah). |
| Pemicu | Non-Scope yang ditinggalkan dua kali: PRD merge WIP (#237) & tercatat di `docs/PRD-USULAN-PENGEMBANGAN-E9-KEDALAMAN.md` |
| PRD terkait | `docs/prd-wip-merge-valuasi-realisasi.md` (Implemented) — arc ini melanjutkan Non-Scope-nya |
| Prasyarat | Tidak ada. Berdiri sendiri di atas `master` `4437f0c` |

---

## 1. Problem

Tab **"Mutasi & Sumber Kebenaran"** pada modul WIP menyajikan dua panel yang membaca
seperti bukti audit: roll-forward sub-buku, dan **"Rekonsiliasi ke Kontrol GL 1-300 —
bukti satu sumber kebenaran"** lengkap dengan badge **"Terjembatani"**.

Keduanya **tidak bisa gagal**. Empat angka di dalamnya adalah aljabar, bukan data:

| # | Angka | Asal sebenarnya |
|---|---|---|
| P-1 | `additions` = **Rp 10.400 jt** | Literal di `data_firmfin.ts`. Tak ada pemilik data |
| P-2 | `opening` (saldo awal WIP) | **PLUG**: `unbilledTotal − additions − writeUp + writeDown + billed` — didefinisikan agar persamaannya selalu menutup |
| P-3 | `reconciling` = `control − unbilledTotal` | **PLUG**: menyerap selisih berapa pun, tanpa batas & tanpa peringatan |
| P-4 | `otherPortfolio` = `reconciling × **0,82**` | Rasio 82/18 karangan, lalu diberi **dua label yang terdengar spesifik** |

### 1.1 Bukti terukur — bukan dugaan

Dijalankan atas seed nyata (`FIRMFIN.wip`), membandingkan keadaan **tanpa** timesheet
Time & Budget vs **dengan** timesheet pada SATU perikatan (`ENG-2025-014`):

| Baris yang tampil di layar | Tanpa timesheet | Dengan timesheet | Perubahan |
|---|---:|---:|---|
| Nilai standar (total) | 13.580 | 11.360 | −2.220 (memang benar: jam aktual) |
| Saldo WIP belum ditagih | 7.720 | 5.900 | −1.820 (turunan sah) |
| **Saldo AWAL WIP** | **3.200** | **1.380** | **−1.820 ← saldo periode LALU berubah** |
| Nilai standar jam ter-charge | 10.400 | 10.400 | 0 (literal, tak bergerak) |
| **Selisih "teridentifikasi"** | **1.580** | **3.400** | **+115%** |
| **"WIP perikatan portofolio LAIN (di luar sampel material)"** | **1.296** | **2.788** | **+115%** |

Dua baris terakhir adalah inti persoalannya:

1. **Saldo awal periode berubah karena input hari ini.** Auditor mengisi timesheet pada
   satu perikatan, dan angka yang mengaku "Saldo awal WIP belum ditagih" bergeser
   Rp 1.820 jt. Saldo awal adalah fakta periode lalu; ia tidak boleh bergerak.
2. **Baris yang mengaku menjelaskan perikatan LAIN berubah karena perikatan INI.**
   "WIP perikatan portofolio lain (di luar sampel material)" naik 1.296 → 2.788 setelah
   timesheet pada `ENG-2025-014` — perikatan yang justru ADA di dalam sampel. Label itu
   tidak menjelaskan apa pun; ia adalah 82% dari sebuah plug.

### 1.2 "Kontrol GL 1-300" bukan kontrol

`FIRM_GL` berisi 6 jurnal. **Tidak satu pun menyentuh akun 1-300.** Saldo Rp 9.300 jt
seluruhnya berasal dari seed `FIRM_COA`. Jadi panel yang menjanjikan "menutup ke kontrol
GL" sesungguhnya membandingkan sub-buku dengan angka yang tak pernah diposting —
lalu menamai selisihnya sebagai item rekonsiliasi. Selisih itu **Rp 3.400 jt atas sub-buku
Rp 5.900 jt — 58%**.

### 1.3 Kenapa ini merugikan

- **Rekonsiliasi yang tak bisa gagal bukan kontrol.** Ia hanya identitas aljabar berkostum
  kertas kerja. Kalau kelak sub-buku WIP benar-benar salah, panel ini tetap hijau dan tetap
  bertuliskan "Terjembatani".
- **Ini persis kelas cacat yang repo ini berulang kali buru**: chip hijau di atas peringatan
  Rp 11.540 jt (WTB), panel "8/8 lolos" di atas kolom yang tak foot (LPE), header 87% di atas
  cakupan 19% (Governance). Polanya sama — angka yang meyakinkan di atas dasar yang tidak ada.
- **Asseris dijual sebagai bukti disiplin keuangan firma** (kesiapan P2PK/SPM ikut bersandar
  pada tampilan semacam ini). Menyajikan aljabar sebagai rekonsiliasi adalah risiko reputasi,
  bukan sekadar utang teknis.

### 1.4 Temuan sampingan

- **`WIP_AGING` (`data_part4.ts:521`) adalah data MATI dan SALAH.** Diekspor lewat
  `data.ts`, tidak dibaca satu view pun, dan isinya sudah menyimpang: bucket 31–60 hari
  tertulis 2.760 sementara turunan sub-buku menghitung 940. Ia peninggalan sebelum
  `FIRMFIN.wip().aging` menghitung ulang dari sub-buku.
- **Pola plug yang sama ada di dua tempat lain**: `arAging()` (`reconciling = control − open`,
  kontrol 1-200) dan `ap()` (kontrol 2-100). Keduanya di luar lingkup PRD ini — lihat Q-1.

---

## 2. Objective

Roll-forward & rekonsiliasi WIP menjadi **falsifiable**: setiap baris punya pemilik data,
dan bila angka-angkanya tidak menutup, layar **mengatakannya** alih-alih menyerapnya ke
dalam plug.

Ukuran keberhasilannya sederhana: **harus ada cara membuat panel ini merah.**

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | `opening` berasal dari data seed, BUKAN diturunkan dari saldo akhir | uji: ubah `billed`/`writeDown` → `opening` TIDAK bergerak |
| SC-2 | Saldo awal tidak berubah oleh timesheet | uji: dengan & tanpa `liveByEng`, `opening` identik |
| SC-3 | `additions` punya pemilik data, bukan literal | grep + uji turunan |
| SC-4 | Residual roll-forward dihitung & DITAMPILKAN; nol pada data yang menutup | uji unit |
| SC-5 | Residual ≠ 0 membuat panel GAGAL (lihat Q-2), bukan diserap diam-diam | uji: rusakkan satu baris seed → panel merah |
| SC-6 | Rasio 82/18 DICABUT; tiap baris jembatan punya sumber | grep: tak ada `* 0.82` |
| SC-7 | Selisih ke kontrol GL yang tak dijelaskan tampil sebagai "belum dijelaskan", bukan diberi label spesifik | tinjauan + uji |
| SC-8 | Klaim UI jujur: badge/label tidak menyatakan "bukti"/"terjembatani" untuk angka yang tak menutup | tinjauan visual |
| SC-9 | `WIP_AGING` mati dibuang, atau dijadikan turunan | grep |
| SC-10 | `npm run verify` hijau; ratchet `:any` tidak naik | CI |
| SC-11 | Diverifikasi HIDUP, termasuk keadaan GAGAL-nya | screenshot dua keadaan |

## 4. Scope

1. **Seed baru per-perikatan** di `WIP_ENG`: `openingUnbilled` (saldo awal) dan
   `chargedInPeriod` (nilai standar jam ter-charge periode berjalan).
2. **`FIRMFIN.wip()`** — `opening` & `additions` dari seed; `residual` dihitung per-perikatan
   dan firma; `movement` menyertakan baris residual bila ≠ 0.
3. **Jembatan ke kontrol GL** — komponen jembatan diberi pemilik data (lihat Q-3), rasio 82%
   dicabut, sisa yang tak dijelaskan tampil apa adanya.
4. **UI** — panel menampilkan keadaan gagal secara jujur (badge, warna, kalimat).
5. **Uji** — unit falsifiabilitas (SC-1..SC-7), termasuk uji yang MERUSAK seed dan menuntut
   panel gagal.
6. **Pembersihan** `WIP_AGING`.

## 5. Non-Scope

- **AR (1-200) & AP (2-100)** yang memakai plug identik — kelas sama, arc sendiri (Q-1).
- **Menjadikan `1-300` benar-benar terposting dari jurnal.** Itu menuntut jurnal WIP di
  `FIRM_GL` + menyalurkan `firm_ledger` ke `FIRMFIN` (kini hanya `view_firmgl` memakainya).
  Layak, tetapi arc tersendiri; PRD ini cukup membuat selisihnya JUJUR.
- Mengubah valuasi, matriks penyisihan, aging, atau realisasi/margin — semuanya sudah
  diturunkan benar dari sub-buku.
- Mengubah `wip.adj` / gerbang persetujuan (baru selesai di #237).

## 6. Constraints

- CLAUDE.md §3.2 SSOT; §5 token warna & skala tipografi; ratchet `:any`.
- `master` selalu hijau (R-7).
- **Angka yang tampil hari ini akan BERUBAH** bila seed baru tidak disetel agar konsisten —
  ini keputusan produk, bukan teknis (Q-3).
- Snapshot `canon_regression.test.ts` wajib dijalankan; `FIRMFIN` bukan `AMS_CANON` tetapi
  konsumennya banyak.

## 7. Existing Solutions — apa yang sudah ada

- `firm_ledger.ts` **sudah** menurunkan saldo GL dari jurnal (Program E, #234) — tetapi baru
  dipakai `view_firmgl.tsx`. Tidak perlu menulis mesin ledger baru; yang kurang adalah
  jurnal 1-300 dan penyaluran ke `FIRMFIN` (Non-Scope, arc lanjutan).
- `FIRMFIN.wip()` sudah menurunkan valuasi, aging, penyisihan & realisasi dengan benar dari
  sub-buku. Yang rusak **hanya** dua panel terakhir.
- Pola "gerbang yang bisa merah" sudah ada presedennya di repo: `wtb_integrity`,
  `fsgen_tieout`. Tiru bentuknya, jangan cipta baru.

## 8. Proposed Approach

**F-1 — Saldo awal & penambahan punya pemilik.**
`WIP_ENG` mendapat `openingUnbilled` & `chargedInPeriod`. `FIRMFIN.wip()` menjumlahkannya;
`residual = closing − (opening + charged + writeUp − writeDown − billed)` dihitung
per-perikatan dan firma. Roll-forward menampilkan baris residual **hanya bila ≠ 0**, dengan
warna alarm dan kalimat yang menyebut perikatan penyumbangnya.

**F-2 — Jembatan GL berhenti mengarang.**
Rasio 0,82 dicabut. Komponen jembatan menjadi register eksplisit (Q-3); sisa yang tak
tercakup register tampil sebagai **"Selisih belum dijelaskan"** dengan badge gagal.
Kalimat di Firm Finance (`view_firmfinance.tsx:301`) ikut disesuaikan agar tidak menjanjikan
penutupan yang tak terjadi.

**F-3 — Uji falsifiabilitas + pembersihan.**
Uji yang MERUSAK seed (mis. menggeser `billed` satu perikatan) dan menuntut panel gagal —
tanpa ini, SC-5 hanya klaim. `WIP_AGING` dibuang.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Angka demo berubah → screenshot/materi lama tak cocok | Q-3 menentukan; bila "seed konsisten", tampilan tetap sama pada data bersih |
| R-2 | Panel merah pada demo bersih membuat produk terlihat rusak | Q-3(a) menyetel seed agar menutup; keadaan gagal ditunjukkan lewat uji, bukan lewat demo |
| R-3 | Konsumen `movement`/`bridge`/`reconciling` di luar modul WIP ikut berubah (`view_firmfinance.tsx:301`) | Sapu rujukan; sudah diinventaris |
| R-4 | Menambah field seed menyentuh snapshot kanon | Jalankan `canon_regression.test.ts`; perbarui bila memang berubah |
| R-5 | Lingkup merembet ke AR/AP & ledger 1-300 | Ditahan eksplisit di Non-Scope; Q-1 memutuskan |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| F-1 | Seed `openingUnbilled`/`chargedInPeriod` + residual roll-forward + UI | SC-1..SC-5 |
| F-2 | Jembatan GL tanpa 82%, "belum dijelaskan", sapu rujukan | SC-6..SC-8 |
| F-3 | Uji falsifiabilitas + buang `WIP_AGING` + verifikasi hidup dua keadaan | SC-9..SC-11 |

Ketiganya layak satu PR — kecil dan saling membuktikan.

**Verifikasi hidup WAJIB, dalam DUA keadaan**: menutup (hijau) dan tidak menutup (merah).
Menunjukkan yang hijau saja persis kesalahan yang PRD ini perbaiki.

## 11. Open Questions

**Q-1 · Ruang lingkup plug.** `arAging()` (kontrol 1-200) dan `ap()` (kontrol 2-100) memakai
pola `reconciling = control − open` yang identik, dan Firm Finance menampilkan ketiganya
berdampingan dengan kalimat yang sama bentuknya.
- **(a)** WIP saja sekarang; AR/AP arc berikutnya. ← *dugaan saya: jaga PR tetap dapat ditinjau*
- **(b)** Ketiganya sekaligus — konsisten dalam satu tinjauan, tetapi PR jauh lebih besar dan
  menyentuh tiga area keuangan sekaligus.

**Q-2 · Apa yang terjadi saat residual ≠ 0?**
- **(a)** Badge merah + baris "belum dijelaskan"; modul tetap berfungsi penuh.
- **(b)** (a) + **ekspor XLSX diblokir/ditandai** — angka yang tak menutup tak boleh keluar
  sebagai berkas tersegel. ← *dugaan saya: ini yang sesuai untuk produk audit*
- **(c)** Peringatan halus saja (chip kuning), tanpa konsekuensi.

Ini menentukan apakah gerbangnya benar-benar gerbang atau sekadar hiasan.

**Q-3 · Angka seed baru disetel menutup, atau sengaja menyisakan selisih?**
- **(a)** Setel agar **residual = 0** pada seed bersih: tampilan hari ini tak berubah, gerbang
  dibuktikan lewat uji yang merusak data. Demo tetap rapi.
- **(b)** Sengaja sisakan selisih kecil pada satu perikatan supaya keadaan gagal **terlihat
  hidup** di demo — jujur & mendidik, tetapi produk tampak "ada masalah" saat dipresentasikan.
- **(c)** Hibrida: seed menutup, plus satu perikatan contoh di data demo terpisah.

Catatan: apa pun jawabannya, **selisih Rp 3.400 jt ke kontrol GL 1-300 tidak akan hilang**
tanpa arc ledger (Non-Scope). Pertanyaannya adalah apakah ia disebut "item rekonsiliasi
teridentifikasi" (seperti sekarang, dan itu tidak benar) atau **"belum dijelaskan"**.
