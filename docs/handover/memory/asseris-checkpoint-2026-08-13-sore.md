---
name: asseris-checkpoint-2026-08-13-sore
description: "Checkpoint 2026-08-13 sore — 7 temuan tinjauan visual TUTUP, #208/#209 merged, #210 terbuka hijau, PR-8 SUDAH di-Proceed tapi BELUM dibangun"
metadata: 
  node_type: memory
  type: project
  originSessionId: bcd1e2f1-feeb-4536-beea-6f13b5cb9ec0
  modified: 2026-08-13T09:17:43.285Z
---

**MULAI DI SINI — 2026-08-13 sore.** `master` = `0ac8e2e`.

## Keadaan

| PR | Isi | Status |
|---|---|---|
| [#208](https://github.com/ari1945/Asseris/pull/208) | V-5/V-6/V-7 | **MERGED** `5f515c1` |
| [#209](https://github.com/ari1945/Asseris/pull/209) | PRD PR-8 Toolkit IAPI | **MERGED** `0ac8e2e` |
| [#210](https://github.com/ari1945/Asseris/pull/210) | V-1..V-4 | **TERBUKA, CI 9/9 hijau** — belum di-merge |

Uji frontend 1552 → **1583**. Ratchet `:any` turun **16** total hari ini (7 di #208, 9 di #210).

**Ketujuh temuan tinjauan visual TERTUTUP** — lihat
[[asseris-tinjauan-visual-smm-2026-08-13]] · [[asseris-v5-v6-v7-remediasi]].

## ⚠ YANG BELUM DIKERJAKAN — PR-8

Ari menjawab **"Proceed."** untuk PRD `docs/prd-smm-toolkit-map.md` pada 2026-08-13,
tetapi **implementasinya BELUM dimulai sama sekali**. Ini pekerjaan besar berikutnya:

- **PR-8a** — `canon_smm_toolkit.ts`: 41 dokumen Toolkit (1.1–9.7, seksi 3·2·2·3·8·6·9·1·7),
  `TOOLKIT_BY_OBJECTIVE` dari Matriks, **risiko ilustratif dirumuskan ulang** (Q-2), tab
  "Dokumentasi SMM" di `soqm`, chip pada panel tujuan mutu. Uji silang WAJIB ke `MODULE_INDEX`.
  PRD memperingatkan: bila volume risiko ilustratif besar, PECAH jadi 8a-1 (peta dokumen) &
  8a-2 (saran risiko) — jangan satu diff raksasa.
- **PR-8b** — pasang `smmDocCoverage()`/`auditRetention()` yang masih KODE MATI ke layar
  (`present` diturunkan dari 9 sumber artefak, BUKAN daftar centang) + cabut misatribusi
  "Retensi 10 tahun (SMM 1)" di `view_crypto.tsx:546`, `:593`, `data_import.ts:50` + tripwire grep.

Rincian & keputusan Q-1/Q-2 ada di [[asseris-pr8-toolkit-map-prd]]. PDF sumber di
`C:\Users\ecovi\Downloads\` (`TOOLKIT MANAJEMEN MUTU (V3).pdf`, `MATRIKS ILUSTRASI RISIKO MUTU (V3).pdf`),
baca dengan `pdftotext -layout`.

## Yang V-1..V-4 ubah (konteks bila menyentuh layar SMM lagi)

`QM_COMPONENTS` **tidak lagi punya** `score`/`risks`/`defs`/`trend` — keempatnya dicabut dari seed.
Penggantinya `canon_smm_component_metrics.ts` (`componentMetrics()`), dipakai `view_governance`,
`view_isqm_parts`, `view_isqm_deep`. Header Governance kini **19% Cakupan Tujuan Mandatori ¶28–33**
(dulu 87% skor karangan) dan **2/8 komponen efektif** (dulu 7/8). Jangan kaget: angka turun karena
jujur, bukan karena regresi.

## GOTCHA sesi ini

- **`npm run verify` MEMBUNUH `dev-all` yang sedang hidup.** Hentikan preview → verify → hidupkan lagi.
  Restart preview MENGHAPUS sesi login (Ari harus login ulang).
- **`computer` klik sering tak terdaftar** karena Browser pane tak ditampilkan; klik pertama bahkan
  bisa mengenai tombol ciutkan sidebar. `screenshot` SELALU gagal. Pakai `javascript_tool` +
  `get_page_text`; deep-link `#/<route>?tab=` juga tak selalu mendarat.
- `npm run lint` di ROOT hanya melint `server e2e tools`; lint frontend ada di `migration/`.
  Melint SEBAGIAN berkas memicu pesan palsu "suppressions left that do not occur anymore".
- `PERSONAS.md` untracked — BUKAN milik sesi ini, jangan di-commit.
