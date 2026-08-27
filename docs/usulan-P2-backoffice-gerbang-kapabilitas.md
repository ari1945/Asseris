# Usulan P2 — Back-office firma: gerbang kapabilitas se-grup (bukan per modul)

> Status: **LAPORAN + USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-26 menjawab temuan 2 pada prompt perbaikan modul `procurement`
> ([`view_procurement.tsx`](../migration/src/view_procurement.tsx) ·
> [`view_procurement2.tsx`](../migration/src/view_procurement2.tsx)).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> Prompt menandainya **LAPORKAN saja** — tak ada satu baris kode gerbang yang diubah
> untuk temuan ini; dokumen ini menyatakan temuannya dan menyiapkan keputusannya.
>
> Ini **saudara** dari [`usulan-R6-ekspor-dan-gerbang-akses-pendapatan.md`](usulan-R6-ekspor-dan-gerbang-akses-pendapatan.md),
> yang menemukan pola struktural yang sama di grup "Keuangan Firma (ERP)".
> Bila keduanya diputuskan terpisah, firma akan punya dua mekanisme berbeda untuk
> satu masalah yang sama. Sebaiknya diputuskan bersama.

---

## 0 · Ralat terhadap rumusan temuan di prompt

Prompt menyebut modul ini punya "ekspor tersegel (`amsExportXlsx`) **tanpa gerbang
kapabilitas**". Setelah ditelusuri, rumusan itu **tidak akurat**, dan ketidakakuratannya
mengubah keputusan yang perlu diambil.

Segelnya **sudah** digerbangi — di server:

```ts
// server/src/router.ts:732 (dan :771)
if (!can(ctx.user.role, CAP.EXPORT)) {
  throw new TRPCError({ code: 'FORBIDDEN', message: `requires:${CAP.EXPORT}` });
}
```

Yang terjadi pada peran tanpa `CAP.EXPORT` bukan penolakan, melainkan **degradasi yang
disengaja** ([`export_xlsx.ts:61-62`](../migration/src/export_xlsx.ts)):

```ts
// Seal first so we can embed it. Degrade to an UNSEALED workbook if the server is down or the
// role lacks CAP.EXPORT — never block the auditor from getting their register.
```

Berkasnya tetap terunduh, dengan lembar `Segel` yang menyatakan **`TIDAK TERSEGEL`**
dan alasannya (`Segel dilewati · peran tanpa kapabilitas ekspor`), plus hash konten
dan pencatatan `EXPORT` ke rantai audit secara best-effort.

Jadi keadaan sebenarnya adalah dua hal terpisah, dan hanya satu di antaranya cacat:

| | Digerbangi? | Oleh apa |
|---|---|---|
| **Segel** (provenans, tanda tangan) | ✅ ya | `CAP.EXPORT` di server |
| **Data register di dalam workbook** | ❌ tidak | — |
| **Membuka modulnya sama sekali** | ❌ tidak | — |

**Yang perlu diputuskan bukan "siapa boleh menyegel"** — itu sudah terjawab.
Yang perlu diputuskan: **siapa boleh melihat dan mengunduh datanya.**

---

## 1 · Temuan — nol gerbang baca, se-grup

Diverifikasi pada `origin/master` = `f650c74`:

```
$ grep -c "can(CAP\." view_procurement.tsx view_procurement2.tsx
0
0
```

Bukan hanya dua berkas itu. Sapuan seluruh grup **"Operasi & Administrasi Firma"**
(13 modul, [`icons.tsx:287-300`](../migration/src/icons.tsx)):

| Berkas | `can(CAP.…)` | Ekspor | `kind` |
|---|---|---|---|
| `view_firmops.tsx` | 0 | 1 | `firmops-paket` |
| `view_firmfinance.tsx` | 0 | 1 | `firm-lk` |
| **`view_procurement.tsx`** | **0** | **1** | **`firm-procurement`** |
| **`view_procurement2.tsx`** | **0** | 0 | — |
| **`view_facilities.tsx`** | **0** | **1** | **`firm-facilities`** |
| `view_facilities2.tsx` | 0 | 0 | — |
| `view_records.tsx` | 1 | 1 | `firm-records` |
| **`view_legal.tsx`** | **0** | 0 | — |
| `view_legal2.tsx` | 0 | 0 | — |
| **`view_insurance.tsx`** | **0** | **1** | **`firm-insurance-risk`** |
| `view_crypto.tsx` | 0 | 2 | `crypto-seal` |
| `view_pdp.tsx` | 0 | 1 | `pdp-ropa` |
| `view_forensic.tsx` | 0 | 0 | — |

**Satu** modul dari tiga belas punya gerbang kapabilitas — dan ia menggerbangi hal
yang berbeda: `view_records.tsx:349` mengunci **aksi arsip** (sebuah *tulis*) di
belakang `CAP.FIRM_ADMIN`. Tak satu pun modul di grup ini menggerbangi **baca**
atau **ekspor**. Jadi tak ada preseden internal yang bisa diikuti — inilah sebabnya
pertanyaannya kebijakan, bukan implementasi.

### Kenapa "tak ada gerbang" berarti "semua peran"

[`shell.tsx:233`](../migration/src/shell.tsx):

```ts
const canOpenModule = (id: string) => { const c = (MODULE_CAP as Record<string, string>)[id]; return !c || id === active || …; };
```

`MODULE_CAP` ([`icons.tsx:339`](../migration/src/icons.tsx)) hanya memuat empat modul
SDM (`hcm`, `recruitment`, `learning`, `succession`), dan `GROUP_CAP` hanya memuat
`'SDM & Kepatuhan'`. Untuk `procurement`, `c` bernilai `undefined` ⇒ `!c` benar ⇒
**setiap peran yang terautentikasi boleh membukanya.**

Kurasi sidebar per peran memang tak menampilkannya untuk semua orang, tetapi kurasi
itu **murni UI** — CLAUDE.md §5 menyatakannya eksplisit ("Kurasi tampilan TIDAK
mengurangi capability"), dan escape hatch "Tampilkan semua modul", ⌘K, serta Matriks
Kepatuhan tetap menjangkaunya. Junior Auditor yang mengetik `procurement` di palet
sampai ke halaman ini.

### Apa yang terlihat, dan apa yang ikut terunduh

Ekspor `firm-procurement` ([`view_procurement.tsx:127-141`](../migration/src/view_procurement.tsx))
menulis kolom: `ID · Vendor · Kategori · **NPWP** · Sejak · Belanja YTD · Share · SLA ·
Risiko · PMPJ · Status`, plus register PO.

Di layar (drawer Vendor 360 & tab Due Diligence) tersedia lebih banyak lagi dari
`data_backoffice.ts`: **nomor rekening bank** vendor, email penagihan, nama PIC,
tanggal onboarding, status PMPJ, dan status pajak.

Ini data **counterparty & perbankan firma**, bukan data audit. Ia terbuka ke bawah
bukan lewat celah, melainkan lewat ketiadaan aturan — dan itu berlaku sama untuk
`facilities` (aset & sewa), `legal` (kontrak & sengketa), dan `insurance` (polis PII).

---

## 2 · Kapabilitas yang relevan di `rbac.ts`

Yang **sudah ada** ([`migration/src/rbac.ts:29-47`](../migration/src/rbac.ts) ↔ `server/src/rbac.ts`):

| `CAP.*` | String | Relevansi |
|---|---|---|
| `EXPORT` | `export.use` | **Sudah menggerbangi segel di server.** Tidak perlu diubah. Pertanyaannya hanya: apakah UI juga harus *menyembunyikan/menonaktifkan* tombolnya, atau membiarkan degradasi tak-tersegel seperti sekarang. |
| `FIRM_ADMIN` | `firm.admin` | Preseden satu-satunya di grup ini (`view_records.tsx`), tapi untuk *tulis*. Terlalu sempit sebagai gerbang **baca** — hanya Partner. |
| `FIRMFIN_EDIT` | `firmfin.edit` | Kapabilitas **tulis** keuangan firma (Partner-only). Salah bentuk untuk gerbang baca. |
| `AUDIT_VIEW` | `audit.view` | Baca jejak audit. Bukan ini. |
| `HR_MODULE_VIEW` | `hr.moduleView` | **Pola yang paling cocok ditiru** — kapabilitas *baca level-modul*, sengaja terpisah dari `HR_MANAGE` (tulis). Komentarnya di `rbac.ts:47` menjelaskan persis logika yang dibutuhkan di sini: data agregat firma, pegawai tak berkepentingan diblokir di level modul, bukan filter baris. |

**Tidak ada kapabilitas baca yang cocok untuk back-office.** Menutup celah ini
kemungkinan besar berarti **menambah satu kapabilitas baru** — sebut saja
`BACKOFFICE_MODULE_VIEW: 'backoffice.moduleView'` — sejajar `hr.moduleView`, lalu satu
entri `GROUP_CAP['Operasi & Administrasi Firma']` plus `MODULE_CAP` per modul agar
deep-link tak melewati gerbang grup.

Menambah kapabilitas berarti menyentuh **kedua** peta RBAC (`migration/src/rbac.ts`
dan `server/src/rbac.ts`) — dan CLAUDE.md §7 mensyaratkan **PRD lebih dulu** untuk
perubahan sekelas ini. Itulah batas dokumen ini.

---

## 3 · Usulan (bukan keputusan)

**A. Gerbangi se-grup, bukan per modul.** Menambal `procurement` sendirian
meninggalkan dua belas tetangga dalam keadaan yang sama, dan `legal` (sengketa
& kontrak) serta `insurance` (polis PII) membawa data yang setara sensitifnya.
Bentuk termurah & paling konsisten: `GROUP_CAP` + `MODULE_CAP`, meniru `hr.moduleView`.

**B. Putuskan bersama R6.** Grup "Keuangan Firma (ERP)" punya masalah identik dan
usulan yang identik. Dua keputusan terpisah berisiko melahirkan dua mekanisme.

**C. Tombol ekspor: biarkan atau gerbangi — ini keputusan tersendiri.** Degradasi
tak-tersegel hari ini adalah desain yang disengaja dan ada argumennya ("never block
the auditor from getting their register"). Tetapi argumen itu ditulis untuk *auditor
yang mengambil registernya sendiri*; ia tak jelas berlaku untuk peran yang seharusnya
tak melihat register itu sama sekali. Bila (A) dikerjakan, (C) sebagian besar terjawab
dengan sendirinya — orang yang tak boleh membuka modulnya tak akan sampai ke tombolnya.

### Risiko yang wajib dinyatakan

Menambahkan gerbang **menghilangkan** modul dari jangkauan peran yang hari ini bisa
membukanya. Bila ada pengguna nyata yang sudah mengandalkannya, itu **regresi
fungsional, bukan pengerasan**. Pada instalasi demo tak ada pengguna semacam itu;
pada pilot, ada. Perlu daftar peran-pemakai sebelum dikirim.

---

## 4 · Pertanyaan terbuka untuk Ari

1. **Gerbang baca se-grup "Operasi & Administrasi Firma", atau per modul?**
   (Usulan saya: se-grup.)
2. **Peran mana yang memegangnya?** Kandidat jelas: `Engagement Partner`,
   `Finance Firma`, `Admin & HR Firma`. Yang **tidak** jelas dan justru menentukan:
   `Audit Manager` — apakah manajer perikatan berkepentingan atas register vendor &
   kontrak firma, atau itu murni urusan operasi firma?
3. **Kapabilitas baru (`backoffice.moduleView`) atau memakai ulang yang ada?**
   Memakai ulang `FIRM_ADMIN` jauh lebih murah tetapi mempersempit ke Partner saja —
   yang hampir pasti terlalu ketat untuk `facilities` dan `travel`.
4. **Tombol ekspor pada peran tanpa `CAP.EXPORT`:** tetap degradasi tak-tersegel
   (status quo), atau dinonaktifkan di UI?
5. **Diputuskan bersama R6 atau terpisah?**

---

## 5 · Yang TIDAK dikerjakan di PR ini

Tidak ada. Nol baris gerbang kapabilitas ditambahkan — sesuai instruksi prompt.
PR yang memuat dokumen ini hanya mencabut **kontrol palsu** (`<tr onClick>`) di
`view_procurement.tsx`; lihat `migration/src/procurement_row_control.test.ts`.

### Temuan sampingan (di luar lingkup, dicatat agar tak hilang)

`view_procurement.tsx:131` menulis identitas firma sebagai **literal** ke dalam
ekspor yang disegel:

```ts
firm: 'KAP Wijaya Hartono & Rekan',
```

Ini pola C-H (nama firma literal di dalam artefak tersegel) — kelas cacat yang sama
dengan yang dicabut di `view_firmtreasury.tsx` (PR #290). Tidak diperbaiki di sini
karena prompt membatasi PR ini pada satu titik dan melarang menyentuh jalur ekspor.
Layak jadi prompt tersendiri, dan kemungkinan besar berlaku se-grup juga.
