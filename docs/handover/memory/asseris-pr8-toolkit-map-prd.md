---
name: asseris-pr8-toolkit-map-prd
description: "PRD PR-8 arc SMM (peta Toolkit IAPI + dokumentasi ¶57–60) — Draft, Q-1=Opsi B & Q-2=risiko ilustratif dirumuskan ulang; menunggu \"Proceed.\""
metadata: 
  node_type: memory
  type: project
  originSessionId: bcd1e2f1-feeb-4536-beea-6f13b5cb9ec0
  modified: 2026-08-13T08:37:23.484Z
---

**PRD `docs/prd-smm-toolkit-map.md` ditulis 2026-08-13** untuk PR-8 arc SMM (Fase 5 PRD induk
`docs/prd-smm1-smm2-adoption.md`). Status **Draft — menunggu "Proceed."**. Belum ada kode
ditulis. Sudah di-PR: **[#209](https://github.com/ari1945/Asseris/pull/209)** (branch
`docs/prd-smm-toolkit-map`, commit `749b2cb`, CI 6/6 hijau — docs-only sehingga e2e &
deploy-smoke ter-skip path filter).

**Keputusan Ari (2026-08-13):**
- **Q-1 = Opsi B** — kanon `canon_smm_toolkit.ts` + tab "Dokumentasi SMM" di `soqm`, BUKAN
  dokumen markdown statis (Opsi A) dan BUKAN generator dokumen (Opsi C, tetap Non-Scope).
  Dua PR: **8a** peta Toolkit · **8b** memasang mesin ¶57–60 + cabut misatribusi.
- **Q-2 = Ya** — risiko mutu ilustratif Matriks IAPI **ditampilkan** sebagai saran baca-saja,
  **dirumuskan ulang ringkas-fungsional** (jangan salin teks — UU 28/2014). Ini menaikkan R-2
  jadi risiko utama PR-8a dan menambah SC-13..SC-15.

**Tiga temuan terverifikasi yang mengubah bentuk PR-8 (jangan diukur ulang):**

1. **Separuh PR-7 adalah KODE MATI.** `smmDocCoverage`, `SMM_DOC_ELEMENTS`, `auditRetention`,
   dan `QM_DOC_RETENTION` (`data_part4.ts:240`, 5 tahun) **tidak dikonsumsi view mana pun** —
   hanya oleh uji. Sisi SMM 2-nya hidup (`auditEqrDocumentation` → `view_eqr.tsx:63`).
   Jadi PR-8b bukan membangun mesin; mesinnya ada, tinggal dipasang ke layar.
2. **Misatribusi ¶60 yang PR-7 klaim DITUTUP masih hidup di 3 tempat:**
   `view_crypto.tsx:546`, `view_crypto.tsx:593` ("Retensi 10 tahun (SMM 1)") dan
   `data_import.ts:50` ("retensi 10 tahun sesuai SMM"). Baris `view_crypto.tsx:505` sudah benar.
   Pelajaran: header kanon yang menyatakan "CACAT YANG DITUTUP" bukan bukti sapuannya tuntas.
3. **Matriks IAPI hanya mencakup 6 dari 8 komponen** (tak ada Proses Penilaian Risiko &
   Pemantauan-Remediasi), dan Toolkit ditulis untuk KAP **non-jaringan** sedangkan firma demo
   **berjaringan** (Q-2 PRD induk) ⇒ ¶48–52 & ¶59 TIDAK akan punya dokumen Toolkit. Itu batas
   aset IAPI, bukan celah firma — wajib status ketiga `outOfMatrixScope`/`outOfToolkitScope`,
   jangan tampil merah.

**Aset sumber (PDF, di luar repo):**
`C:\Users\ecovi\Downloads\TOOLKIT MANAJEMEN MUTU (V3).pdf` (41 dokumen, 9 seksi: 3·2·2·3·8·6·9·1·7)
dan `C:\Users\ecovi\Downloads\MATRIKS ILUSTRASI RISIKO MUTU (V3).pdf`.
Baca dengan `pdftotext -layout` (`pdftoppm` tak ada). Kolom ke-3 Matriks = `Tujuan Mutu |
Ilustrasi Risiko Mutu | Ilustrasi Respons (→ nomor dok Toolkit)` — inilah jembatan
`TOOLKIT_BY_OBJECTIVE`; sisi kirinya sudah siap di `SMM1_OBJECTIVES` (`canon_smm_objectives.ts:157`).

**Dokumen Toolkit tanpa rumah di aplikasi (probe grep, temuan produk):**
**5.7** Formulir Klien Keluar · **5.8** Surat Klien Keluar · **7.8** Formulir Permintaan
Akuisisi Teknologi. 5.7/5.8 kandidat kuat PR berikutnya — menyentuh ¶30 SMM 1 dan modul
`continuance` sudah ada.

Lihat juga [[asseris-smm1-smm2-adoption]] · [[asseris-checkpoint-2026-08-13]].
