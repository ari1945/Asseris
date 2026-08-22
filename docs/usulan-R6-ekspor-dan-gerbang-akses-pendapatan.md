# Usulan R6 — Pendapatan Firma: nol ekspor, nol gerbang akses

> Status: **LAPORAN + USULAN — menunggu keputusan Ari. Belum dikerjakan.**
> Dibuat 2026-08-22 menjawab V6 pada prompt perbaikan modul `revenue`
> ([`view_firmrevenue.tsx`](../migration/src/view_firmrevenue.tsx)).
> Bukan PRD (nama berkas sengaja tak berawalan `prd` agar tak masuk registri status §7).
> Prompt menandainya **LAPORKAN saja** — karena itu tak ada baris kode yang diubah
> untuk V6; dokumen ini menyatakan temuannya dan menyiapkan keputusannya.

## Temuan 1 — modul tak punya gerbang akses sama sekali

`MODULE_CAP` ([`icons.tsx:339`](../migration/src/icons.tsx)) hanya memuat empat modul
SDM (`hcm`, `recruitment`, `learning`, `succession`). `revenue` tidak ada di dalamnya,
dan grupnya ("Keuangan Firma (ERP)") tidak ada di `GROUP_CAP`. Konsekuensinya persis
seperti yang tertulis di `shell.tsx:233`:

```ts
const canOpenModule = (id: string) => {
  const c = (MODULE_CAP as Record<string, string>)[id];
  return !c || id === active || !!(auth && auth.can(c));
};
```

`c` `undefined` ⇒ `!c` benar ⇒ **setiap peran yang terautentikasi boleh membukanya.**

Kurasi sidebar memang menyembunyikannya: `ROLE_SIDEBAR_GROUPS` hanya memberi grup
"Keuangan Firma (ERP)" kepada `Finance Firma` (Partner & Manager tak dikurasi sama
sekali). Tetapi kurasi itu **murni UI** — komentarnya sendiri menyatakan "capability
utuh", dan escape hatch "Tampilkan semua modul" di `shell.tsx` **selalu tampil**, di
samping ⌘K dan Matriks Kepatuhan. Junior Auditor yang mengetik `revenue` di palet
sampai ke halaman ini.

Yang terlihat di halaman itu:

- **fee kontrak per klien** (Rp 410 jt – Rp 2.340 jt pada seed) — harga yang dinegosiasi
  per klien, satu tabel penuh;
- **portofolio partner** (kolom partner di panel drill);
- **aset & liabilitas kontrak** per perikatan — yaitu perikatan mana yang menagih
  mendahului penyelesaian;
- **seluruh antrean dunning**: klien mana yang menunggak, berapa lama, berapa banyak.

Ini bukan data audit; ini data komersial firma. Ia bocor ke bawah bukan lewat celah,
melainkan lewat ketiadaan aturan.

**Catatan penting:** modul ini **read-only** — ia tak menulis apa pun, jadi tak ada
lubang SoD tulis di sini. Yang hilang adalah gerbang **baca**.

## Temuan 2 — nol ekspor, di modul yang tetangganya semua punya

`view_firmfinance.tsx` dan `view_firmtreasury.tsx` (dua modul di grup yang sama)
memakai `amsExportXlsx` ([`export_xlsx.ts`](../migration/src/export_xlsx.ts)) dan
mengunci ekspornya di belakang syarat: Firm Finance menolak mengekspor Laporan Keuangan
selama masih ada akun kontrol dengan selisih belum dijelaskan. `view_firmrevenue.tsx`
tak mengimpor helper ekspor mana pun.

Akibat praktisnya: skedul pengakuan pendapatan PSAK 72 — dokumen yang justru **diminta
auditor firma sendiri** dan diperlukan untuk menyusun catatan atas laporan keuangan
KAP — hanya dapat dibaca di layar, tak dapat diserahkan.

## Usulan A — gerbang akses

Tambahkan kapabilitas baca untuk seluruh grup Keuangan Firma (ERP), bukan hanya modul
ini. Menambal `revenue` sendirian akan meninggalkan tujuh modul tetangga (`firmgl`,
`apar`, `treasury`, `cashbank`, `fixedassets`, `firmtax`, `profitability`) dalam keadaan
yang sama — dan `apar` serta `profitability` membawa data yang setara sensitifnya.

Bentuk yang paling murah dan paling konsisten dengan yang sudah ada: entri `GROUP_CAP`
untuk grup itu, sejajar dengan `'SDM & Kepatuhan': 'hr.moduleView'`, plus `MODULE_CAP`
per modul agar deep-link tak melewati gerbang grup.

**Yang harus diputuskan, dan tak boleh saya putuskan sendiri:** peran mana yang
memegang kapabilitas itu. Kandidat yang jelas: `Engagement Partner`, `Audit Manager`,
`Finance Firma`. Yang tidak jelas — dan justru menentukan — adalah `Audit Manager`:
manajer perikatan melihat fee **kliennya sendiri** di banyak modul lain, tetapi halaman
ini memperlihatkan fee **seluruh klien firma** sekaligus. Bila jawabannya "hanya
miliknya sendiri", maka yang dibutuhkan bukan gerbang modul melainkan **penyaringan
baris per-partner** — pekerjaan yang jauh lebih besar dan perlu PRD sendiri.

**Risiko yang wajib dinyatakan:** menambahkan gerbang **menghilangkan** modul dari
jangkauan peran yang hari ini bisa membukanya. Bila ada pengguna nyata yang sudah
mengandalkannya, itu regresi fungsional, bukan pengerasan. Pada instalasi demo tak ada
pengguna semacam itu; pada pilot, ada.

## Usulan B — ekspor

Ekspor XLSX skedul pengakuan (per perikatan: nilai kontrak · % · diakui · ditagih ·
aset/liabilitas kontrak), memakai `amsExportXlsx` seperti kedua tetangganya.

Dua syarat yang menurut saya mengikat, meniru pola kunci di Firm Finance:

1. **Terkunci selama ada perikatan tanpa nilai kontrak** (`gaps` — lihat V2). Skedul
   pengakuan yang barisnya tak lengkap tak boleh keluar dari firma sebagai dokumen.
2. **Memuat pengungkapan metodenya di dalam berkas**, bukan hanya di layar: bahwa
   "diakui" adalah fee × persentase yang *dilaporkan*, bukan hasil pengukuran masukan
   atau keluaran. Pengungkapan yang hanya hidup di layar tidak ikut ke dalam berkas
   yang diserahkan — dan berkas itulah yang akan dibaca orang lain.

Syarat ke-2 bergantung pada [`usulan-R3-metode-pengukuran-psak72.md`](usulan-R3-metode-pengukuran-psak72.md):
bila metode berubah, kalimat pengungkapannya ikut berubah. Karena itu **B sebaiknya
dikerjakan setelah R3 diputuskan**, bukan sebelumnya — kalau tidak, ekspor pertama yang
keluar dari firma akan membawa pengungkapan yang seminggu kemudian tak berlaku lagi.

## Pertanyaan terbuka untuk Ari

1. Gerbang akses: seluruh grup Keuangan Firma (ERP) atau `revenue` saja?
2. Peran mana yang memegangnya — dan khususnya, apakah `Audit Manager` melihat
   **seluruh** klien firma atau hanya kliennya sendiri?
3. Ekspor: kerjakan sekarang dengan pengungkapan status quo, atau tunggu keputusan R3?
