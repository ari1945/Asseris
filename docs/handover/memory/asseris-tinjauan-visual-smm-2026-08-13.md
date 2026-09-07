---
name: asseris-tinjauan-visual-smm-2026-08-13
description: Tinjauan visual arc SMM (soqm/governance/eqr) 2026-08-13 — 7 temuan; utang tinjauan visual LUNAS; V-5 & V-6 kritis
metadata: 
  node_type: memory
  type: project
  originSessionId: bcd1e2f1-feeb-4536-beea-6f13b5cb9ec0
  modified: 2026-08-13T07:47:43.916Z
---

**Tinjauan visual arc SMM dilakukan 2026-08-13** (Ari login sendiri, agen memandu lewat
Browser pane). Utang "tinjauan visual tak pernah dijalankan agen" dari checkpoint sebelumnya
**LUNAS**. Belum ada perbaikan dikerjakan — ketujuh temuan masih terbuka, belum ada PRD/PR.

**Pola induk:** arc SMM memperbaiki MESINNYA dengan benar (`canon_smm_*` semua sehat, gerbang
benar-benar gagal), tetapi **jalur tampilan tidak disapu tuntas** — sebagian permukaan masih
membaca seed. Kalau memperbaiki: cari SEMUA pembaca field seed, bukan hanya yang disebut PRD.

| # | Temuan | Bukti |
|---|---|---|
| V-5 **KRITIS** | Governance menampilkan atestasi tahunan **bertanda tangan & bertanggal** yang tak pernah terjadi (Anindya P · Hartono W · 2026-03-05); SOQM periode sama = "belum ditandatangani" & tanda tangan TERKUNCI. Badge "Memadai" ¶54(a) membantah teksnya sendiri yang berbunyi ¶54(b) | `view_governance.tsx:30` baca `A.QM_EVAL` mentah; `data_part4.ts:248-253` hardcode `by`/`approvedBy`/`date`/`conclusion:'reasonable'`. **`canon_firm_attest.ts` TIDAK diimpor** |
| V-6 **KRITIS** | Cacat jaringan ¶49(b)/¶52(b) dihitung & ditampilkan, tapi `canon_smm_evaluation.ts` **nol rujukan jaringan**. Panel ¶54 MENYATAKAN "Tidak ada defisiensi lain yang terbuka — Nihil 0" padahal ND-01 terbuka tanpa remediasi | `canon_smm_network` hanya diimpor `view_governance.tsx:20` + seed test. D-4 lahir kembali, diperkenalkan oleh PR-5b sendiri |
| V-7 tinggi | Checklist penggerak gerbang opini = `<div onClick>`; nol `<Check>`/`<Switch>` di berkas. Daftar EQR juga `<div onClick>` | `view_eqr.tsx:164` (rantai: 34 `allChecked` → 58 → 60 `canClear` → tombol tutup → opini) & `:85`. Melanggar CLAUDE.md §3 no.7. **Axe lolos justru KARENA elemen tak mengaku kontrol** — `button-name` hanya periksa tombol yang mengaku tombol |
| V-3 tinggi | `QM_COMPONENTS.risks`/`.score` tetap integer dekoratif (C1 "3 risiko/92%" vs 0 risiko nyata; total kartu 35 vs register 6). Skor karangan ikut tampil di **evaluasi tahunan ¶53** | `view_isqm_parts.tsx:103` `mapName` dihitung **tak pernah dipanggil** (1 kemunculan). PR-2 menurunkan `.obj` tapi meninggalkan `.risks`/`.score` di objek yang SAMA |
| V-4 sedang | Seed mustahil: INS-25-01 "Pasca-Terbit (Cold)" atas ENG-2025-040 berstatus `Planning`; INS-25-03 Cold atas ENG-2025-022 `Fieldwork` | `data_part4.ts:258,260`. R-1 PRD induk berbalik arah: status perikatan disetel agar gerbang gagal, field JENIS inspeksi tak ikut disetel |
| V-2 sedang | Pita alur: "Tujuan Mutu **¶25–28**" (seharusnya ¶24+¶28–33), "Respons **¶32–34**" (¶32/¶33 = paragraf TUJUAN) | `view_isqm_parts.tsx:72-77` string hardcode. D-3 yang terlewat PR-1 |
| V-1 rendah | Badge tab "Tujuan Mutu **6**" (= `risks.length`) membantah panel 27 tujuan | `view_isqm.tsx:75` |

**Yang BEKERJA (jangan dibangun ulang / jangan diragukan):** cakupan tujuan 19% + 22 defisiensi
rancangan · ¶38(c) menolak inspeksi atas perikatan berjalan (ketiga rekan gagal) · ¶39(b)
menangkap Bayu Saputra di INS-25-03 · panel ¶54 memisah faktor MENGIKAT vs informatif · tanda
tangan SOQM terkunci sampai kesimpulan tertulis disimpan · jeda 2 th ¶19 diturunkan dari riwayat
peran · dokumentasi ¶30 melaporkan 4 butir kurang · panel jaringan ¶48–52 melaporkan 2 jenis cacat.

**GOTCHA sesi ini:**
- Proses `dev-all` **mati sendiri** di tengah sesi → layar putih + `ERR_CONNECTION_REFUSED` +
  500 pada `view_governance.tsx`. **Bukan cacat aplikasi** — modul terverifikasi transform 200.
  Restart `preview_start` menghapus sesi login; Ari harus login ulang.
- `computer{action:screenshot}` GAGAL sepanjang sesi ("Browser pane is not displayed").
  Pakai `get_page_text` / `read_page` — cukup untuk semua temuan di atas.
- Klik pertama pada koordinat `read_page` yang basi mengenai tombol ciutkan sidebar. Panggil
  `read_page` ulang setelah layout berubah.

Lihat juga [[asseris-smm1-smm2-adoption]] · [[asseris-pr8-toolkit-map-prd]] · [[asseris-p2pk-spm-readiness-arc]].
