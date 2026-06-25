---
title: PRD — Working Papers · Eksekusi Prosedur & Pengujian Bukti (Full audit-tech)
status: approved (Ari "Full audit-tech" + "Pertahankan terpisah", 2026-06-25)
module: workpapers (view_wp.tsx · WPDrill)
---

# PRD — Menjalankan Prosedur Audit & Mengelola/Menguji Bukti di WP

## Problem
WP Drill ([view_wp.tsx:292](../migration/src/view_wp.tsx)) tidak bisa *menjalankan*
prosedur — tab Prosedur hanya menyimpan satu flag status (`Belum/Selesai/
Pengecualian/N/A`). Tak ada ruang untuk: pilih item/sampel uji, catat hasil,
tautkan bukti ke langkah, atau evaluasi kecukupan & ketepatan bukti (SA 500).
Bukti (`WP_ATTACH`) statis dengan tombol "Unggah" mati. Evidence Evaluation
(SA 500) memakai seed statis, bukan hasil uji nyata.

## Keputusan scoping (Ari)
- **Kedalaman = Full audit-tech** (beberapa iterasi).
- **Sumber prosedur = pertahankan terpisah** → tetap pakai `WP_PROCS[ref]`,
  TIDAK menarik dari Audit Programme. Dua daftar by design.

## Objective
WP Drill jadi surface eksekusi: tiap prosedur dapat dijalankan dengan item uji
bertaut bukti, tickmark otomatis dari hasil, kesimpulan per prosedur, dan
meteran kecukupan & ketepatan bukti (SA 500) tingkat WP. Semua persist SSOT
(`wpState[ref]`, engagement-scope, gate `WP_EDIT`).

## Model data baru (di `wpState[ref]`, via `setWp`)
```
evidence: [{ id, name, source, tier(1..5), type, asr:[], by, at }]   // register bukti per-WP (SA 500)
exec: { ['p'+i]: { items:[{ id, desc, ev:evId|'' , tick, result:'tie'|'exc'|'na'|'', note }], concl } }
```
- Status prosedur DITURUNKAN dari exec items bila ada (≥1 exc → Pengecualian;
  semua item tie & ≥1 → Selesai; ada item belum diuji → Berjalan); jika belum
  ada item, jatuh ke flag lama (`procs['p'+i]`). Backward-compatible.
- Tickmark item OTOMATIS: tie→'✓', exc→'∆', na→'^' (reuse TICKMARKS).

## SA 500 — meteran (tingkat WP)
- **Ketepatan (appropriateness)** = rata-rata reliability tier bukti tertaut.
  Hierarki (mirror EV_HIERARCHY): eksternal/auditor=5, internal-kuat=3,
  internal-lemah=2, manajemen=1.
- **Kecukupan (sufficiency)** = cakupan eksekusi (item teruji / total) + tak ada
  pengecualian terbuka.
- **Verdict** (mirror Evidence Evaluation): Cukup&Tepat (hijau) / Perlu Diperkuat
  (amber) / Belum Memadai (merah).

## Rencana fase
- **Fase 1 (turn ini):** register bukti per-WP + tautan bukti→item, eksekusi
  prosedur (items + hasil + auto-tickmark + kesimpulan + status turunan) +
  meteran SA 500 tingkat WP. Persist + RBAC + verifikasi live.
- **Fase 2 (SELESAI):** SA 530 sample pull (musPlan+selectMus → item uji,
  default params dari sampling.v1) + IPE register/uji akurasi-kelengkapan
  (SA 500 ¶A56). Math MUS dipusatkan ke `sampling_select.ts` (SSOT).
- **Fase 3 (SELESAI):** tracker konfirmasi SA 505 (`wpState.confirms`);
  Evidence Evaluation dinamis via overlay `wpEvidenceEval` (badge "dari WP");
  auto-tickmark item→Lead Schedule (kolom Akun Lead). **ARC TUNTAS.**

## Non-Scope (fase ini)
- Menyatukan prosedur dengan Audit Programme (ditolak Ari).
- Upload berkas nyata (tetap metadata; unggah file = luar scope app saat ini).

## Risks
- Menambah kompleksitas state di `wpState[ref]`. Mitigasi: namespacing (`exec`,
  `evidence`) + backward-compatible fallback ke flag lama.
- Status turunan bisa mengubah angka dashboard. Mitigasi: hanya menurunkan saat
  exec items ADA; default lama tetap untuk WP tak disentuh.

## Verifikasi
- `tsc --noEmit` 0 error; `eslint src` 0 (no `any` baru); `vitest` hijau.
- Live: tambah bukti, jalankan prosedur (tambah item, set hasil → tickmark auto),
  kesimpulan, status turunan, meteran SA 500, persist lintas reload.
