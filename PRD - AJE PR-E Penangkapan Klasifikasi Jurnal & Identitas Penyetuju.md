# PRD — AJE PR-E · Penangkapan Klasifikasi Jurnal & Identitas Penyetuju

**Status:** **Draft** — menunggu "Proceed."

## Problem

Dua lubang tersisa setelah arc AJE (#139–#142) mendarat. Keduanya di jalur otorisasi jurnal, keduanya ditemukan lewat verifikasi live, bukan pembacaan kode.

**P-1 — jurnal buatan auditor lahir tanpa klasifikasi.** `AJEForm` (`view_execution.tsx:1476`) hanya menangkap deskripsi, ref WP, dan baris jurnal. Ia tidak pernah menanyakan `kind` (penyesuaian/reklasifikasi), `mis` (salah saji SAD yang dikoreksi), maupun `assertions` (asersi yang dikoreksi). Akibatnya entri buatan pengguna **tak pernah muncul di ledger SAD** (SA 450) maupun di Matriks Asersi (SA 315) — dua modul yang justru menjadi dasar kesimpulan audit. Model sudah menerima ketiga field itu (`addAje` meneruskan seluruh entry); hanya formulirnya yang tak menanyakan.

**P-2 — partner dapat menjadi EQR bagi dirinya sendiri.** `stepAuthority()` (`view_platform.tsx:89`) mencocokkan **kapabilitas**, bukan **identitas**. `EQR_REVIEW` ada di `PARTNER_BASE` (`rbac.ts:99`), dan cek self-approval hanya membandingkan `user.name === it.from` — yakni **penyusun**. Ia tak pernah bertanya apakah orang ini sudah menandatangani langkah lebih awal pada rantai yang sama.

Bukti live (2026-07-27): sebagai Hartono Wijaya, yang menandatangani AJE-01 sebagai Engagement Partner pada 08 Mei, tombol "Setujui & Finalkan" untuk langkah **EQR** aktif penuh. Melanggar ISQM 2 / SA 220.36 — seluruh guna EQR adalah penelaah yang independen dari tim perikatan.

## Objective

Entri jurnal buatan auditor masuk ke SAD dan Matriks Asersi seperti entri seed; dan tidak seorang pun dapat menandatangani dua langkah pada satu rantai persetujuan.

## Success Criteria

1. Jurnal yang dibuat lewat `AJEForm` membawa `kind`, `mis`, `assertions`, dan `preparer`; entri itu muncul di rekonsiliasi SA 450 dan Lensa Asersi tanpa langkah manual.
2. `stepAuthority` menolak pengguna yang sudah tercatat `approved` pada langkah lebih awal rantai yang sama, dengan alasan yang terbaca di UI.
3. Uji memaku skenario AJE-01: Hartono (Partner, sudah tandatangan langkah 3) **ditolak** di langkah EQR; penelaah lain yang berkapabilitas EQR **diterima**.
4. `npm run typecheck` 0 · `npm run lint` 0 · seluruh test hijau · nol `any` baru (ratchet).

## Scope

- `view_execution.tsx` — `AJEForm`: tiga field baru (jenis, salah saji SAD, asersi), `preparer` dari sesi, plus token warna menggantikan gradient/heksa ter-hardcode di header modal (konsisten dgn PR-D).
- `view_platform.tsx` — `stepAuthority`: pemeriksaan "sudah menandatangani langkah lebih awal"; perbaikan salin banner peran yang menyuruh "ganti peran di menu pengguna" (`setRole` mati sejak W7).
- Uji baru untuk kedua perubahan.

## Non-Scope

- **Mewajibkan penyetuju adalah orang yang namanya tertera di langkah.** Ditolak: memblokir setiap partner selain penerima tugas akan mematahkan delegasi sah (cuti, rotasi). Yang diperbaiki adalah pemisahan tugas, bukan penugasan.
- Mengubah `PARTNER_BASE` atau mencabut `EQR_REVIEW` dari peran partner — kapabilitasnya benar; yang salah adalah ketiadaan cek identitas.
- Ledger SAD tidak otomatis menerima item baru dari jurnal; jurnal hanya **merujuk** `mis` yang sudah ada. Membuat item SAD dari formulir jurnal adalah keputusan metodologi tersendiri.

## Constraints

- Ratchet ESLint: satu `any` baru meng-un-suppress seluruh berkas.
- `view_aje` sudah mengimpor `AJEForm` dari `view_execution` → **dilarang** mengimpor balik dari `view_aje` (lingkar). `kind` karenanya menjadi pilihan eksplisit auditor, yang juga sesuai doktrin PR-D bahwa `kind` adalah klasifikasi, bukan turunan.
- Daftar salah saji dibaca dari kunci persist `sadItems.v1` dengan default `SAD_SEED` bersama — dua default berbeda atas satu kunci adalah kelas cacat yang diperbaiki PR-C.

## Risks

- Formulir bertambah panjang → beban input naik. Mitigasi: `mis` dan `assertions` opsional; hanya jenis yang wajib, dan ia sudah punya default.
- Cek identitas dapat memblokir perikatan kecil di mana satu partner memegang dua peran. Itu **memang** yang dituntut ISQM 2; kalau firma perlu jalan keluar, itu keputusan kebijakan yang harus eksplisit, bukan celah senyap.

## Open Questions

Tidak ada yang memblokir. Kedua perubahan mengikuti standar yang sudah dirujuk modulnya sendiri.
