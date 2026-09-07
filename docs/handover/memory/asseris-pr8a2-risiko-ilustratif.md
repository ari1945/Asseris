---
name: asseris-pr8a2-risiko-ilustratif
description: "PR-8a-2 dipecah TIGA per komponen; 8a-2a (komponen 1–2, 22 saran) di PR #221 + koreksi cacat peta 8a-1 pada QO-28b/c/d"
metadata: 
  node_type: memory
  type: project
  originSessionId: 5d54caf6-a2e8-4953-86e8-ca96e849c109
  modified: 2026-08-14T01:47:52.855Z
---

**PR-8a-2 dipecah TIGA** (keputusan Ari 2026-08-14): Matriks memuat ±100 risiko
ilustratif atas 27 tujuan; satu diff sebesar itu mengubah tinjauan per-entri yang
R-2 syaratkan menjadi tinjauan sampel.

| Bagian | Komponen | Entri | Status |
|---|---|---|---|
| **8a-2a** | 1 (¶28) & 2 (¶29) | 22 atas 7 tujuan | **PR [#221](https://github.com/ari1945/Asseris/pull/221)** CI 9/9 |
| **8a-2b** | 3 (¶30) & 4 (¶31) | 28 atas 8 tujuan | **PR [#222](https://github.com/ari1945/Asseris/pull/222)** CI 9/9 — BERTUMPUK di atas #221 |
| **8a-2c** | 5 (¶32) & 6 (¶33) | 43 atas 12 tujuan | **PR [#223](https://github.com/ari1945/Asseris/pull/223)** CI 9/9 — BERTUMPUK di atas #222 |

**ARC 8a-2 LENGKAP.** Uji 1631 → 1647 → 1651 → **1653**. Kumulatif **93 saran atas KE-27
tujuan**. Urutan merge: **#221 → #222 → #223**.
Berkas: `canon_smm_illustrative_risks.ts` (TERPISAH dari `canon_smm_toolkit.ts`,
menyimpang dari sketsa PRD §4 — alasannya beban tinjauan per-entri).

**SEMUA MERGED 2026-08-14** — master `b2b0608`, uji **1664**, ratchet `:any` **8145**.
Urutan: #221 → #222 → #223 → #219 (V-8). Master diverifikasi lokal hijau tiap tahap.

## Pelajaran merge bertumpuk (2026-08-14) — tiga jebakan berturut-turut

1. **GitHub TIDAK otomatis mengarahkan PR anak ke master** bila cabang induk tak
   dihapus (`deleteBranchOnMerge=false`). #222 berubah `CONFLICTING`/`DIRTY` sampai
   `gh pr edit 222 --base master` dijalankan. Rebase saja TIDAK cukup.
2. **Force-push tak memicu CI** (sudah tercatat, terjadi lagi) — `gh pr checks` berbunyi
   "no checks reported". Wajib close+reopen supaya gerbang jalan di atas head hasil
   rebase; jangan terima hijau lama.
3. **Rebase #223 konflik** di wilayah komentar `Object.freeze`. Resolusi = pertahankan
   KEDUA sisi. Verifikasi bukan cuma penanda konflik tetapi **jumlah deklarasi**:
   `grep -cE "^(export )?(const|function|interface|type) "` harus sama dengan
   `git show <commit-asli>:<berkas>` — 17 di kedua sisi.

**Sebelum merge PR yang CI-nya hijau atas basis LAMA: rebase + uji ulang lokal dulu.**
#219 hijau atas `6c3cbfc` sementara master sudah `d18b6f0`; setelah rebase uji naik
1653 → 1664. Menerima hijau basi melanggar R-7.

Lihat [[asseris-rebase-squash-stacked-prs]].

**Halaman Matriks per komponen** (indeks halaman `pdftotext -table`, 0-basis):
¶28 → 4·5·6 · ¶29 → 7 · ¶30 → 8·9 · ¶31 → 10·11·12 · ¶32 → 13·14·15·16 · ¶33 → 17·18.
Perhatikan ¶31(b) BERLANJUT di halaman 11 sebelum butir (c) — risiko terakhirnya
(4.1/6.1/6.6) mudah terlewat kalau hanya membaca halaman 10.

## ⚠ CACAT 8a-1 YANG DIKOREKSI — jangan diukur ulang

`TOOLKIT_BY_OBJECTIVE` salah untuk TIGA tujuan. **Matriks menyelaraskan baris
respons dengan baris RISIKO, bukan dengan blok tujuan** — dokumen pada risiko
TERAKHIR sebuah tujuan terbaca sebagai milik tujuan BERIKUTNYA:

| Tujuan | master `6c3cbfc` (salah) | benar |
|---|---|---|
| QO-28b | `3.2 9.2` | `1.1 3.2 9.2` |
| QO-28c | `1.1 9.2` | `3.2 7.5 7.6 9.2` |
| QO-28d | `1.2 1.3 3.2 7.5 7.6 9.2` | `1.2 1.3 3.2` |

**REKAP SELURUH ARC — 11 dari 27 tujuan pernah salah:**

| Bagian | Komponen | Tujuan salah |
|---|---|---|
| #221 | ¶28–¶29 | **3** — 28b · 28c · 28d (merembes) |
| #222 | ¶30–¶31 | 0 — bersih |
| #223 | ¶32–¶33 | **8** — 32a·32e·32f·32g · 33a·33b·33c·33d |

**DUA arah kesalahan**, jangan hanya mencari yang merembes:
- **HILANG** — 32a kehilangan 7.3 & 7.4 · 33b kehilangan 7.7 & 8.2 · 33d kehilangan
  6.3/6.4/7.7/9.3 · 33a kehilangan 7.1.
- **MEREMBES** — dokumen milik tujuan sebelumnya/berikutnya ikut tercatat.

**Konsekuensi yang TERLIHAT:** dokumen 7.3 tampil `TUJUAN —` di tab Dokumentasi SMM,
seolah tak melayani tujuan mutu mana pun. Itu gejala yang saya lihat saat tinjauan
visual 2026-08-14 tetapi belum saya kejar — pelajaran: sel "—" pada peta layak
dicurigai, bukan diterima.

Catatan menggantung 8.2 juga salah: pemakainya **QO-33b**, bukan QO-33a.

**Peta 8a-1 tidak pernah tersilang-uji sampai sisi per-risiko dibangun** — itulah yang
membuat cacatnya bertahan melewati CI hijau. `illustrative_toolkit_consistency.test.ts`
kini AUDIT PENUH atas ke-27 baris; ia juga menjaga agar auditnya tidak diam-diam turun
jadi sampel.

**Rujukan menggantung 8.2** (Toolkit seksi 8 berhenti di 8.1) dirujuk QO-30b —
dan nanti QO-33a & QO-33c di 8a-2c. Dipertahankan apa adanya. Gerbangnya menuntut
nomor ada di `TOOLKIT_DOCS` ATAU terdaftar di `TOOLKIT_DANGLING_REFS`, supaya salah
ketik tak lolos menyamar sebagai "menggantung".

## Cara mengekstrak Matriks (yang BERHASIL)

`pdftotext` di mesin ini adalah **Xpdf 4.00, bukan Poppler** — tak ada `-bbox`.
Pakai **`pdftotext -table`**, bukan `-layout`: kolomnya rapi dan tiap risiko
sejajar dengan rujukan dokumennya. `-layout` mencampur kolom karena header
ter-CENTER di atas kolom (bukan rata kiri) sehingga batas kolom dari posisi
header SALAH. Deteksi celah global juga gagal — posisi kolom bergeser antar-seksi.

**GOTCHA: halaman 7 (Ketentuan Etika) punya salah ketik di sumbernya —
"Ilustrasi Risiko *Mtu*"** — regex header yang menuntut "Mutu" akan melewatkan
seluruh komponen 2.

## Pagar yang tak boleh diruntuhkan

`Object.freeze` dipakai, bukan sekadar `readonly` — `readonly` hanya berlaku saat
kompilasi sedangkan SC-14 menuntut sekat saat JALAN. Uji SC-14 **memindai nama
ekspor** terhadap pola `set|add|adopt|apply|push|write|…`; menambah `adoptAll()`
akan memerahkannya, dan memang harus.

Lihat [[asseris-pr8-toolkit-implementasi]] · [[asseris-tinjauan-visual-toolkit-2026-08-14]].
