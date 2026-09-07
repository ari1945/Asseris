---
name: asseris-export-identity-arc-signoff
description: "Arc identitas ekspor DI-SIGN-OFF & F-1/F-2 MENDARAT (#332 e2f69d6) — tapi SC-4 BELUM: `firm` masih tak ikut di-hash, jadi E-4 masih berlaku. F-3..F-5 sisa."
metadata: 
  node_type: memory
  type: project
  originSessionId: 568722cc-4966-437b-8cfd-a26bf45f2288
  modified: 2026-08-29T00:05:43.635Z
---

**PRD `docs/prd-export-seal-identity-ssot.md` di-sign-off Ari 2026-08-29** ("sign off the
PRD and land the export arc"). Q-1..Q-4 = rekomendasi §11 PRD; Q-5 bukan penghalang.
Status **Draft → In Progress** (BUKAN Implemented). Arc mendarat **#332 `e2f69d6`**
(109 berkas, +1094/−477; 89 view). Empat workflow master hijau.

## Bentuk perbaikannya (kenapa ia menutup kelasnya, bukan gejalanya)

`firm`/`scopeId` berhenti jadi argumen call-site: `ExportModelBase` menandainya
**`?: never`** ⇒ mengirim identitas = **galat `tsc`**, termasuk lewat spread `{...model}`
(yang TIDAK akan tertangkap kalau field-nya sekadar dihapus dari tipe — ini bagian
cerdasnya). `export_pdf/xlsx` memanggil `resolveExportIdentity(scope)` SEBELUM berkas
dibuat; identitas tak dapat diturunkan ⇒ `refused:true`, dibedakan tegas dari
`sealed:false` (berkas ADA tapi tanpa segel). `export_identity.ts` = `let` bermodul
(bukan `window`), satu penulis (`contexts.tsx:1139` efek `FirmProvider`, terbitkan
perikatan **TERSELESAIKAN** bukan yang terpilih, `null` saat provider dilepas), gerbang
melarang penulis kedua.

## ⚠ YANG PALING MUDAH SALAH DIBACA

**SC-4 BELUM TERPENUHI.** `canonicalPayload` **belum v2** ⇒ `firm` MASIH tidak ikut
di-hash. Keluhan inti **E-4 masih berlaku hari ini**: artefak boleh mencantumkan nama
firma apa pun dan verifikasi segelnya tetap **lulus**. Yang tertutup F-2 adalah **SUMBER**
nama (call-site tak bisa mengarang), bukan **CAKUPAN** segel. Jangan katakan "E-4 selesai".

Sisa: **F-3** (`canonicalPayload` v2 + `sealFormat` + verifikasi dua-versi — mengubah
hash, harus bisa di-rollback sendiri) · **F-4** (penolakan terlihat di UI; `emitExportRefusal`
sudah disiarkan, toaster belum ditinjau visual) · **F-5** (20 situs `engLabel` di
`refNo`/`meta` ⇒ **SC-2 belum**; + gerbang repo-lebar) · **F-6** (registri → Implemented).

## Jebakan yang menggigit saat menilai arc ini

- **Sensus mentah MENIPU.** `grep "firm: 'KAP"` → 4 sisa, `scopeId: 'WHR'` → 1,
  pembaca `window.activeEngagement` → 4 berkas. **Semuanya komentar atau fixture uji
  anti-tautologi.** Nyata = 0. Buang komentar dulu, lalu BACA tiap hit.
- **`view_dms.tsx:273` `scopeId: FIRM_SCOPE_ID` bukan pelanggaran** — itu
  `attachmentUpload`, bukan ekspor. Permukaan lain, kontrak lain.
- **Docstring bisa membatalkan tipe.** `export_pdf.ts`/`export_xlsx.ts` masih
  mengiklankan `model: { … scopeId?, … firm … }` di JSDoc tepat di modul yang baru
  menjadikan keduanya `never`. Diperbaiki saat sign-off. Kontrak yang dicabut tapi masih
  didokumentasikan = undangan untuk call-site berikutnya.
- **`prd_registry.test.ts` menghitung ringkasan dari daftarnya** — mengubah satu status
  memerahkan gerbang sampai blok "Ringkasan" ikut digeser (Draft 54→53, In Progress 13→14).
- **Rebase 60-commit ini WAJIB, merge naif MEREGRESI lima arc** (klok SSOT, #293, #289,
  #296, #315). Rebase-nya bersih; nol penanda konflik.

Terkait: [[asseris-w1e-chip-border-dan-geometri-range]] (W1-E #329 — E1-nya dicabut demi
arc ini) · [[asseris-w1-identitas-tersegel-paralel]] (tujuh paket W1 DITAHAN karena arc ini)
