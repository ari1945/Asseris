---
name: asseris-segel-buta-isi-replacer
description: "F-3 (#334) — segel Ed25519 TIDAK PERNAH menutupi isi tabel: argumen kedua JSON.stringify adalah replacer daftar-izin REKURSIF, jadi tiap sheet/blok jadi `{}`. Plus: verifikasi tak pernah menghitung ulang hash."
metadata: 
  node_type: memory
  type: project
  originSessionId: 568722cc-4966-437b-8cfd-a26bf45f2288
  modified: 2026-08-29T02:32:45.582Z
---

**F-3 PRD ekspor** (`docs/prd-export-seal-identity-ssot.md`) — **MENDARAT #334 `052d6c9`** (hijau 9/9; empat workflow master hijau).

## Cacat yang ditemukan (lebih besar daripada yang dicari)

```js
JSON.stringify(pick, Object.keys(pick).sort())   // dipakai KEDUA eksporter
```

Argumen kedua `JSON.stringify` **BUKAN pengurut kunci** — ia **replacer berupa
daftar-izin kunci, dan berlaku REKURSIF ke setiap objek bersarang**. Daftar izinnya hanya
memuat kunci TINGKAT ATAS, jadi tiap sheet & tiap blok PDF jadi `{}`:

    XLSX: {"kind":"x","sheets":[{}],"title":"t"}

⇒ segel menandatangani `kind`, `title`, `refNo`, `meta` (PDF saja) dan **JUMLAH**
sheet/blok — **tidak satu sel pun**. Dibuktikan lewat `amsExportXlsx` sungguhan: dua
register beda baris/nilai/jumlah-baris ⇒ contentHash IDENTIK `6cf8b2f9…` ⇒ **segel
Ed25519 keduanya dapat dipertukarkan**.

**PRD-nya sendiri salah** soal ini: ia menulis "segel membuktikan isi tabelnya, bukan
penerbitnya". Separuh pertama tidak benar. Dikoreksi di §12 PRD.

**Kenapa lolos bertahun-tahun:** uji yang TAMPAK menjaganya (`export_pdf.test.ts` —
"changes when the content changes") mengubah **`title`**, satu dari tiga field yang
kebetulan memang ikut. *Pelajaran umum: uji "X berubah ⇒ hash berubah" harus menyentuh
field BERSARANG, bukan field tingkat atas.*

## Bentuk perbaikannya

`export_seal_payload.ts` — payload kanonik jadi SATU tempat & BERVERSI:
- **V1** = replika BEKU bentuk lama (replacer dan semuanya). Arsip, bukan kode hidup:
  segel lama hanya reproducible dengan algoritma zamannya. **JANGAN DISUNTING.** Dipaku
  uji GOLDEN.
- **V2** = kanonikalisasi rekursif (kunci diurut tiap tingkat, tanpa replacer) +
  identitas (`firm`/`scope`/`scopeId`) + `meta` XLSX (Q-4) + `sealFormat` DI DALAM
  payload (pemisah domain).
- `canonicalSealPayload(format, sealFormat, model, identity)` — versi dipilih ARGUMEN.
- Server: `Seal.sealFormat Int @default(1)` + migrasi; default 1 = pernyataan fakta.

## ⚠ TEMUAN KEDUA — verifikasi tak pernah menghitung ulang hash

Ketiga pemanggil `exportVerifySeal` (`view_onboarding:314` · `view_onboarding2:205` ·
`view_continuance:291`) menyerahkan **hash yang sudah tersimpan di state klien sejak
penyegelan**. Server membandingkan hash tersimpan dengan hash tersimpan — hanya bisa
gagal kalau state klien rusak. Jadi tombol "Verifikasi" membuktikan **baris segel ada &
tanda tangannya sah**, BUKAN artefak masih utuh. Konsekuensi: **R-1 PRD tak pernah
benar-benar terpicu**, dan `sealFormat` adalah PERSIAPAN bagi verifier yang menghitung
ulang — belum dibangun, belum dijadwalkan.

## Jebakan proses yang menggigit di sesi ini

- **`git checkout HEAD -- <berkas>` MENGHAPUS suntingan belum-commit.** Terjadi saat
  memulihkan eksporter sesudah bukti-merah; empat suntingan hilang dan harus diulang.
  **Commit dulu SEBELUM checkout apa pun** (memori lama sudah memperingatkan; terulang).
- **Ratchet `:any` dua arah menggigit saat MENGHAPUS `:any`.** Mencabut
  `canonicalPayload(model: any)` ⇒ suppression basi ⇒ `eslint src` **exit 2** ⇒
  `VERIFY FAILED: frontend lint`. Obat: `npm run lint:any-baseline` (export_pdf 10→7,
  export_xlsx 8→6). Aturan "jangan sunting baseline" hanya berlaku saat banyak paket
  paralel; penulis tunggal = sinkronkan.
- Heredoc `python3 - <<PY` di Bash tool **menggantung 2 menit** lalu timeout — pakai
  Edit tool atau `node -e` satu baris.

Terkait: [[asseris-export-identity-arc-signoff]] · [[asseris-w1e-chip-border-dan-geometri-range]]

## Sisa F-3 yang TIDAK dikerjakan — BUTUH KEPUTUSAN ARI

Amandemen A (#333) menaruh **DUA** kolom di lingkup F-3: `sealFormat` **dan nama firma
penandatangan**. F-3 hanya menambah `sealFormat`. Jadi mitigasi **Q-3** ("rekaman
menyimpan nama saat penandatanganan") **belum terpasang**: baris segel menyimpan
`scope`/`scopeId` tetapi TIDAK menyimpan `firm` — padahal `firm` IKUT DI-HASH sejak V2.
Verifier yang menghitung ulang payload V2 karena itu harus mengambil nama firma dari
artefaknya sendiri, bukan dari state server yang tepercaya.

Ditahan karena menuntut keputusan trust-model yang belum diambil: baris merekam
**klaim klien** (reproducible, tapi tak dapat diverifikasi server) ATAU **fakta server**
(`ctx.user.firmId` → nama firma; dapat diverifikasi, tapi bisa BERBEDA dari yang di-hash,
dan untuk `scope:'firm'` tak sejajar dengan `FIRM_SCOPE_ID` sisi klien). Dicatat di §12 PRD.

## Sisa arc sesudah F-3
**F-4** penolakan terlihat di UI · **F-5** 20 situs `engLabel` ⇒ SC-2 + gerbang repo-lebar
(⚠ #333 §13: JANGAN pakai angka §1 sebagai baseline gerbang — hitung ulang; E-1=0 bukan 1,
E-4a 54/47 bukan 60/51) · **F-6** registri → Implemented.
