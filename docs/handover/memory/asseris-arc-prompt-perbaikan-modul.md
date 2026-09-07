---
name: asseris-arc-prompt-perbaikan-modul
description: "Arc multi-sesi menulis prompt perbaikan per modul Asseris — template induk, 24 prompt, 7 usulan menunggu keputusan Ari"
metadata: 
  node_type: memory
  type: project
  originSessionId: 3b95d0e0-b980-43b9-8539-51d09e443612
  modified: 2026-08-23T07:27:35.070Z
---

Ari meminta **prompt perbaikan per modul** untuk 158 modul Asseris, satu per satu
("buat prompt untuk modul #N"). Bukan perbaikan langsung — deliverable-nya adalah
prompt yang dieksekusi agen lain.

- Template induk: `docs/PROMPT-PERBAIKAN-MODUL.md` (Blok A preamble · B inti · C
  adendum per pola gap · D definisi selesai · E versi ringkas).
- Hasil: `docs/prompts-perbaikan/<nn>-<id>.md`. Serah-terima sesi:
  `docs/prompts-perbaikan/00-LANJUTKAN.md` (berisi status + metode + pola cacat).
- Per 2026-08-23: **24 prompt** dibuat, beberapa sudah dieksekusi sesi paralel
  (cockpit #265, time `9dd1e57`, firmtax `0508891`), **7 usulan menunggu keputusan
  Ari** (`docs/usulan-*.md`: M2, TB3, W1, S1, A3, J, O1b).

**Why:** taksonomi kedalaman rumah sudah ada (E-9, L0–L5) tetapi temuannya bertanggal
2026-08-13 dan sebagian besar SUDAH BASI — beberapa modul yang katalognya sebut P0
ternyata sudah diperbaiki (firmgl, fixedassets, cashbank, regref). Prompt yang ditulis
dari katalog tanpa membaca kode akan mengirim agen memperbaiki cacat yang sudah tertutup.

**How to apply:**
- Investigasi kode dulu, selalu; jangan menulis prompt dari nama modul atau katalog.
- Setiap prompt WAJIB memuat blok "keadaan awal yang sudah diverifikasi — jangan
  diperbaiki", karena beberapa modul memang sudah sangat baik.
- Pisahkan "kerjakan" dari "usulkan": apa pun yang mengubah kebijakan, metode
  akuntansi, atau menggeser angka lintas modul → usulan + BERHENTI.
- Larang eksplisit menyelipkan PR-2..PR-6 dari [[asseris-firm-erp-deepening-arc]]
  (urutan mengikat, risiko terdokumentasi).
- Nama berkas usulan sengaja tanpa awalan `prd` agar tak masuk registri status §7.

Pola cacat berulang yang terbukti produktif dicari lebih dulu: angka karangan (dengan
gradasi pengakuannya), pemanggil tak mengirim kunci ctx, identitas pelaku dari
`AMS.USER`/fallback bernama, `new Date()` alih-alih `AMS.TODAY`, id dari panjang array,
literal `ENG-2025-014`/nama firma di ekspor tersegel, kontrol palsu & tombol mati,
nilai berkalender tanpa masa berlaku (rumahnya `regrefCatalog()`), dan sesuatu yang
dihitung lalu dibuang.
