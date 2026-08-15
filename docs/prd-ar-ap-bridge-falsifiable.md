# PRD — Jembatan AR & AP yang dapat gagal, dan status rekonsiliasi yang berhenti berbohong

> Wajib diisi sebelum implementasi apa pun. Implementasi TIDAK dimulai sebelum sign-off ("Proceed.").

| Field | Isi |
|---|---|
| Tanggal | 2026-08-15 |
| Pemilik | Ari Widodo |
| Status | **Implemented** — "sesuai rekomendasi" 2026-08-15 (Q-1=a · Q-2=a · Q-3=a). F-1..F-3 SELESAI, `npm run verify` hijau (1781 uji), SC-1..SC-9 tertutup & live-verified. **Catatan: Q-1(a) & Q-3(a) tak bisa keduanya berlaku untuk baris Kas — lihat §12.** |
| Pemicu | Q-1 PRD roll-forward WIP (#239) menunda AR/AP ke arc sendiri |
| PRD terkait | `docs/prd-wip-rollforward-falsifiable.md` (Implemented) — arc ini menerapkan polanya ke dua kontrol sisanya |
| Prasyarat | Di atas `master` `f0f71ce` |

---

## 1. Problem

### 1.1 Plug yang sama, di dua kontrol lain

`arAging()` dan `ap()` menutup ke kontrol GL dengan satu baris yang identik dengan yang
baru dicabut dari WIP:

```
reconciling = control − open
```

Terukur atas seed nyata:

| Sub-buku | Terbuka | Kontrol GL | **Plug** | Plug / sub-buku |
|---|---:|---:|---:|---:|
| **Piutang Usaha** (1-200) | 2.695 | 4.440 | **1.745** | **65%** |
| **Utang Usaha** (2-100) | 1.123 | 1.820 | **697** | **62%** |
| *(WIP 1-300, sudah diperbaiki #239)* | *5.900* | *9.300* | — | — |

Keduanya **lebih besar secara proporsional** daripada plug WIP yang baru dicabut (58%).

Berbeda dari WIP, **sub-bukunya sendiri jujur**: AR menurunkan aging dari `INVOICES`
memakai tanggal jatuh tempo nyata, AP dari `FIRM_AP` memakai status nyata. Yang dikarang
hanya **jembatannya**. Dan pengarangan itu terjadi di VIEW, bukan di mesin —
`view_firmfinance.tsx:266` dan `:279` memberi nama pada angka yang tak pernah dihitung:

> "Sub-buku faktur Rp 2.695 jt **+ termin/retensi Rp 1.745 jt** = kontrol GL 1-200"
> "Vendor terbuka Rp 1.123 jt **+ akrual Rp 697 jt** = kontrol GL 2-100"

"Termin/retensi" dan "akrual" adalah label yang ditempelkan pada selisih. Tak ada satu pun
baris termin, retensi, atau akrual yang benar-benar ada di data.

### 1.2 Temuan yang lebih besar: status rekonsiliasi ditentukan oleh ADA-TIDAKNYA KALIMAT

`FIRMFIN.reconciliations()` — sumber tab **"Sumber Kebenaran"** di Firm Finance —
menetapkan status tiap kontrol begini (`data_firmfin.ts:419`):

```js
status: Math.abs(recon) < 1e6 ? 'tied' : (note ? 'bridged' : 'open')
```

**Keempat baris memiliki `note` yang di-hardcode.** Konsekuensinya: `'open'`
**tidak pernah mungkin terjadi**. Selisih sebesar apa pun — 65%, 200%, berapa pun —
akan selalu mendarat di `'bridged'`, yang dirender sebagai badge biru **"Terjembatani"**
(`view_firmfinance.tsx:311`).

Yang menentukan apakah sebuah akun kontrol dinyatakan terjembatani **bukan** apakah ada
yang menjembataninya, melainkan apakah seorang programmer pernah menuliskan sebuah
kalimat. Empat akun kontrol firma — Kas, Piutang, WIP, Utang — semuanya hijau/biru,
selamanya.

### 1.3 Celah yang saya tinggalkan di #239

PR #239 memperbaiki jembatan WIP di dalam modul WIP, tetapi **tidak menyentuh
`reconciliations()`**. Akibatnya tab "Sumber Kebenaran" di Firm Finance masih menghitung
baris WIP dengan logika lama (`w.control − w.unbilledTotal`) dan tetap membadge
"Terjembatani" — **bertentangan dengan modul WIP** yang kini menyatakan jembatannya
secara terinci. Satu produk, dua jawaban untuk akun yang sama. Ini utang saya, bukan
temuan baru; disebut di sini supaya ditutup bersama.

### 1.4 Kenapa ini merugikan

Sama seperti #239 — dan sekarang lebih tajam, karena setelah WIP diperbaiki, ketiga
kontrol lainnya masih memakai standar lama **berdampingan di layar yang sama**.
Pengguna melihat satu baris yang jujur dan tiga yang tidak, tanpa cara membedakannya.

---

## 2. Objective

Setiap akun kontrol firma menutup lewat **komponen yang dapat dijumlah**, dan statusnya
diturunkan dari **angka**, bukan dari keberadaan kalimat penjelas.

Ukuran keberhasilan sama seperti #239: **harus ada cara membuat baris ini merah.**

## 3. Success Criteria

| # | Kriteria | Cara uji |
|---|---|---|
| SC-1 | Jembatan AR memakai register terenumerasi, bukan `control − open` | uji + grep |
| SC-2 | Jembatan AP memakai register terenumerasi | uji + grep |
| SC-3 | `status` di `reconciliations()` diturunkan dari residual, BUKAN dari ada-tidaknya `note` | uji: baris ber-note dengan residual besar → `'open'` |
| SC-4 | Baris WIP di `reconciliations()` memakai jembatan #239 (konsisten dengan modul WIP) | uji: nilai sama dengan `FIRMFIN.wip()` |
| SC-5 | Residual ≠ 0 terlihat di UI sebagai kegagalan, bukan badge biru | tinjauan visual |
| SC-6 | Kalimat "+ termin/retensi" & "+ akrual" diganti komponen nyata | grep view |
| SC-7 | Uji yang MERUSAK seed menuntut status gagal | uji unit |
| SC-8 | `npm run verify` hijau; ratchet `:any` tidak naik | CI |
| SC-9 | Live-verified DUA keadaan (menutup & tidak) | screenshot |

## 4. Scope

1. Register jembatan baru: **`AR_BRIDGE`** (termin & retensi belum difakturkan) dan
   **`AP_BRIDGE`** (akrual & faktur vendor dalam proses) — baris nyata yang dapat dijumlah.
2. `arAging()` & `ap()` — komponen bernama, `residual`, bendera `reconciles`.
3. `reconciliations()` — status dari residual; baris WIP disambungkan ke hasil #239.
4. UI Firm Finance — kalimat & badge jujur di tab Modal Kerja dan Sumber Kebenaran.
5. Uji falsifiabilitas + verifikasi hidup dua keadaan.

## 5. Non-Scope

- **Kas & Bank (1-100)** — situasinya BERBEDA: sudah ada register `BANK_RECON` dan modul
  pemilik (`cashbank`), dan selisihnya sudah ditunjuk ke modul Rekonsiliasi Bank.
  Yang ikut berubah hanya *status logic*-nya (SC-3), bukan jembatannya. Lihat Q-1.
- Menjadikan saldo kontrol benar-benar terposting dari jurnal (`firm_ledger` → `FIRMFIN`) —
  tetap arc tersendiri, sama seperti di #239.
- Mengubah aging AR, kategori AP, atau angka sub-bukunya — semuanya sudah diturunkan benar.

## 6. Constraints

- CLAUDE.md §3.2 SSOT · §5 token warna · ratchet `:any` · `master` selalu hijau.
- Ambang `< 1e6` yang ada sekarang (Rp 1 jt) dipertahankan sebagai toleransi pembulatan.
- Angka tampil hari ini tidak boleh berubah pada seed bersih (Q-3).

## 7. Existing Solutions

Pola lengkapnya **sudah ada dan terbukti** dari #239: register terenumerasi + `residual` +
bendera `reconciles` + baris alarm + gerbang ekspor. Arc ini menerapkannya, bukan
merancang ulang. `BANK_RECON` juga sudah ada untuk kas.

## 8. Proposed Approach

**F-1 — AR & AP.** Tambah `AR_BRIDGE`/`AP_BRIDGE` di seed; `arAging()`/`ap()`
mengembalikan `bridgeTotal`, `residual`, `reconciles`, dan daftar komponennya.

**F-2 — `reconciliations()` berhenti berbohong.** `status` dihitung dari residual SESUDAH
komponen bernama: `tied` bila |residual| < 1e6, `bridged` bila komponen bernama menutupnya,
`open` bila masih tersisa. Baris WIP memakai `postedAsset + nonMaterialTotal + accrualTotal`
dari #239 sehingga Firm Finance dan modul WIP menjawab sama.

**F-3 — UI & uji.** Kalimat Modal Kerja menyebut komponen sesungguhnya; baris `open`
dirender merah dengan label "BELUM DIJELASKAN". Uji perusak seed + verifikasi hidup.

## 9. Risks

| # | Risiko | Mitigasi |
|---|---|---|
| R-1 | Tab Sumber Kebenaran berubah warna → terlihat "produk rusak" | Q-3: seed disetel menutup; keadaan gagal dibuktikan lewat uji |
| R-2 | `reconciliations()` dipakai konsumen lain | Inventaris dulu; kini hanya `view_firmfinance` |
| R-3 | Lingkup merembet ke kas & ledger | Ditahan di Non-Scope; Q-1 memutuskan |

## 10. Implementation Plan

| Fase | Isi | Kriteria |
|---|---|---|
| F-1 | Register + mesin AR/AP | SC-1, SC-2 |
| F-2 | `reconciliations()` + baris WIP | SC-3, SC-4 |
| F-3 | UI, uji perusak, verifikasi hidup | SC-5..SC-9 |

Satu PR — ketiganya saling membuktikan.

## 11. Open Questions

**Q-1 · Baris Kas ikut sejauh mana?** Kas punya register (`BANK_RECON`) & modul pemilik,
selisih Rp 2.055 jt sudah ditunjuk ke Rekonsiliasi Bank.
- **(a)** Hanya *status logic*-nya yang ikut diperbaiki (SC-3); jembatannya tak disentuh. ← *rekomendasi: jaga PR tetap fokus*
- **(b)** Sekalian sambungkan `BANK_RECON` sebagai komponen bernama seperti AR/AP.

**Q-2 · Konsekuensi saat baris `open`.** Di #239 Anda memilih badge merah + blokir ekspor
tersegel untuk modul WIP.
- **(a)** Konsisten: baris `open` memerahkan tab DAN memblokir ekspor LK/XLSX Firm Finance. ← *rekomendasi*
- **(b)** Badge merah saja; ekspor Firm Finance tetap terbuka.

**Q-3 · Seed jembatan AR/AP.** Sama seperti Q-3 #239.
- **(a)** Disetel agar residual = 0 pada seed bersih; gerbang dibuktikan lewat uji perusak. ← *rekomendasi*
- **(b)** Sengaja menyisakan selisih agar keadaan gagal terlihat di demo.

---

## 12. Hasil & satu konflik jawaban yang perlu keputusan lanjutan

**Terverifikasi hidup** (tab Sumber Kebenaran):

| Akun kontrol | Saldo GL | Sub-buku | Komponen bernama | Sisa | Status |
|---|---:|---:|---:|---:|---|
| Kas & Bank (1-100) | 8.420 | 10.475 | — | **−2.055** | **BELUM DIJELASKAN** |
| Piutang Usaha (1-200) | 4.440 | 2.695 | 1.745 (5 item) | 0 | Terjembatani |
| WIP Belum Ditagih (1-300) | 9.300 | 7.720 | 1.580 | 0 | Terjembatani |
| Utang Usaha (2-100) | 1.820 | 1.123 | 697 (3 item) | 0 | Terjembatani |

**Konflik antar-jawaban.** Q-1(a) berkata jangan sentuh jembatan Kas; Q-3(a) berkata
seed disetel agar demo menutup. Keduanya tak bisa berlaku bersamaan untuk baris Kas —
begitu statusnya diturunkan dari angka, selisih Rp 2.055 jt yang tak dijumlahkan siapa
pun akan tampil merah. Saya memilih **jujur**: barisnya merah, dan ekspor Laporan
Keuangan terkunci karenanya.

**Ini menyingkap temuan lanjutan yang tidak dicari.** `BANK_RECON` — satu-satunya
register yang diklaim menjelaskan selisih kas — hanya mencakup **satu rekening**
(BCA-OPS) untuk **satu periode** (Februari 2026), dengan item belum-cocok berjumlah
**Rp 68 jt**. Itu **3%** dari selisih Rp 2.055 jt. Jadi kalimat lama "Selisih kurs &
item rekonsiliasi bank berjalan" bukan sekadar tak dijumlahkan — ia **tidak didukung
data yang ada**. Menutup baris Kas menuntut register rekonsiliasi bank multi-rekening,
yakni arc tersendiri dengan lingkup datanya sendiri.
