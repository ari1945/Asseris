---
name: asseris-regref-annual-arc
description: Arc data referensi regulatori bertahun (PR #259, Tahap A) — canon_regref, BPJS/TER/PTKP berkunci masa, halaman regref
metadata:
  type: project
---

# Arc data regulatori bertahun — Tahap A (PR #259, branch `feat/regref-arc`)

Berawal dari arahan Ari atas dua utang arc SDM: *"biarkan saja atau atur agar dapat
diupdate setiap tahun"*. Jawabannya: **jangan biarkan** — dan pemeriksaannya menemukan
cacat yang belum pernah tercatat.

## Temuan yang paling tajam

`PAYROLL_RATES.kesCap`/`jpCap` **menggerakkan hitungan** di DUA tempat dengan rumus
yang disalin — `view_payroll.tsx:32` dan `view_personal.tsx:188` (slip gaji yang
dilihat pegawai itu sendiri). Field `period: 'Maret 2026'` ADA dan tampak seperti
penjaga, tapi ia hanya kunci masa penggajian (id jurnal, post-check, judul slip) —
**tak pernah dipakai memilih tarif**. Tak ada `ratesFor(period)`. Batas upah JP
disesuaikan tiap tahun ⇒ Januari 2027 akan menghitung potongan semua orang dengan
batas 2026 tanpa satu pun tanda.

Temuan kedua, lebih tua: **TER baru ada sejak 1 Jan 2024**. Masa 2023 dihitung dengan
metode yang belum ada.

## Prinsip yang layak diulang

1. **Tak ada "yang terdekat".** Set yang tak mencakup tanggal bukan jawaban mendekati.
2. **Yang menyangkut uang MEMBLOKIR** (jawaban Q-3 Ari); yang tidak memperingatkan.
3. **Belum-terverifikasi ≠ tak-tercakup.** Yang pertama tetap menghitung dengan penanda
   (keadaan TER hari ini) — memblokirnya akan menggeser angka tanpa alasan.
4. **Migrasikan pernyataan yang ADA, bukan yang seharusnya ada.** Kalender libur punya
   `confirmedThroughYear` ⇒ `verified: true`. BPJS tak punya provenans apa pun ⇒
   `verified: false`. `verifiedBy`/`verifiedAt` DIKOSONGKAN, tidak dikarang.
5. **Migrasi yang paling benar dulu.** Kalender libur dipindahkan pertama justru karena
   ia sudah benar: 60 uji cuti lama tetap hijau = bukti nol-delta yang tak bisa dikarang.
6. **Registry MENUNJUK literal**, diuji `toBe` (identitas objek) bukan `toEqual` —
   salinan lolos `toEqual`. Pelajaran [[asseris-sc24a-satu-register-skp]].
7. **Gerbang cakupan cocokkan TIPE, bukan NAMA.** Gerbang `*_REGISTRY` menyeret
   `STANDARDS_REGISTRY` yang tak ada hubungannya; `: RegRefSet<` presisi. Gerbang berisik
   akan dilemahkan orang berikutnya lalu berhenti menjaga apa pun.
8. **Katalog = daftar yang DITEGAKKAN.** Halaman `regref` merendernya, dan uji menolak
   label yang diketik ulang di view — supaya "yang tampil" dan "yang ditegakkan" tak beda.
9. Deskripsi wajib menyatakan **akibat**, bukan nama: uji menolak `breaksIfStale` yang
   cuma mengulang label.

## Berkas

`canon_regref.ts` (mesin) · `canon_bpjs.ts` (satu pintu iuran) · `regref_catalog.ts`
(katalog + `REGREF_EXPECTED_IDS`) · `view_regref.tsx` (modul `regref`, grup SDM) ·
registry TER/PTKP/biaya jabatan di `canon_pph21.ts`.

## Verifikasi hidup (tanpa login — sandi tak diketik)

`import('/src/regref_catalog.ts')` + `import('/src/canon_regref.ts')` di `javascript_tool`:
2026-03-01 nihil berhenti · 2027-01-01 BPJS berhenti · 2023-06-01 BPJS+TER berhenti.

## Menunggu DATA dari Ari (bukan kode)

Q-1 Lampiran PMK 168 (TER masih `verified:false`) · Q-4 cuti bersama 2026 (hari kerja
cuti masih LEBIH-hitung) · Q-5 pencocokan batas upah BPJS 2026 (`jpCap 10.547.400`).
Ketiganya kini terlihat tiap hari di halaman `regref`, bukan terlupakan.

Q-2 (Tahap B: halaman dapat ditulis admin firma — RBAC, atestasi, jejak audit) =
dinilai ulang setelah Tahap A terbukti.

Terkait: [[asseris-sdm-kepatuhan-arc]] · [[asseris-sc24a-satu-register-skp]] ·
[[asseris-repo-hygiene-2026-08-19]]
