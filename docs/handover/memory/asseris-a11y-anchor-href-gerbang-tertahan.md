---
name: asseris-a11y-anchor-href-gerbang-tertahan
description: "Gerbang `a11y_anchor_href.test.ts` sudah selesai & terbukti bisa MERAH, tapi belum bisa dikirim — satu pelanggaran hidup di view_home.tsx:209 yang perbaikannya tak pernah ditulis"
metadata: 
  node_type: memory
  type: project
  originSessionId: 68d92f5f-046d-449d-9456-f298b2b39e0a
  modified: 2026-08-24T00:59:08.882Z
---

**Status per 2026-08-24: DIPARKIR di direktori kerja utama** (`migration/src/a11y_anchor_href.test.ts`,
belum di-commit). Cadangan di scratchpad sesi `…/scratchpad/gel0-snapshot/`.

Gerbang statik ini melarang `<a>` TANPA `href` dipakai sebagai kontrol (axe:
`anchor-is-valid`) — tanpa `href` sebuah anchor tak masuk urutan tab, tak fokusabel, tak
menanggapi Enter, dan tak punya peran `link`. Ia berpasangan dengan `a11y_icon_buttons`
dan `a11y_field_labels` yang sudah ada.

**Ia GERBANG SUNGGUHAN** — dijalankan pada `origin/master` = `500beeb` ia MERAH,
menunjuk tepat satu pelanggaran:
```
view_home.tsx:209  <a style={{ color: 'var(--blue)', cursor: 'pointer' }} onClick={() => nav('tasks'…
```
Itu fallback offline "Server tak tersambung — buka **My Tasks**": satu-satunya jalan
pintas ke daftar tugas lokal saat server mati, dan **hanya bisa diklik tetikus**.

**Kenapa tidak dikirim.** Mengirimnya apa adanya membuat master MERAH (melanggar
BUILD.md §R-7). Dua jalan keluar, keduanya di luar lingkup tugas pengiriman:
1. perbaiki `view_home.tsx:209` (`<button type="button" className="linkbtn">`) lalu kirim
   gerbang bersama perbaikannya — **ini yang benar**, dan cukup satu baris; atau
2. kirim ter-karantina `it.fails()`. **Nilainya nyaris nol**: di bawah `it.fails()` gerbang
   tetap "lulus" walau pelanggaran BERTAMBAH, jadi ia berhenti melindungi apa pun.

**Why:** gerbang tanpa perbaikan pasangannya bukan pekerjaan selesai — separuhnya hilang.
Dan karantina yang menetralkan gerbang lebih buruk daripada menundanya, karena ia
terlihat seperti perlindungan.

**How to apply:** kirim sebagai satu PR kecil: perbaiki anchor di `view_home.tsx:209`
menjadi tombol native bergaya tautan, lalu tambahkan gerbangnya — dan buktikan gerbang
MERAH pada kode sebelum perbaikan (`git stash` → jalankan → harus gagal).

Lihat juga [[asseris-a11y-badge-button-native]] · [[asseris-icon-button-names]] ·
[[asseris-field-label-sweep]] · [[asseris-home-a11y-komposisi]]
