---
name: asseris-w0-pendaratan-urutan
description: "Gelombang W0 pendaratan — PR #318 MENGGANTIKAN cabang firmgl; kelima cabang TIDAK disjoint; dan urutan smm→regref yang mengikat karena CPE_REQ dipinjam sebagai tahun atestasi SOQM"
metadata: 
  node_type: memory
  type: project
  originSessionId: 0edbff18-499a-462e-8f4e-030b51703141
  modified: 2026-08-27T14:59:49.490Z
---

Disusun 2026-08-27 terhadap `origin/master` = `405cc67`. Prompt:
`docs/prompts-perbaikan/W0-00-PENDARATAN.md` + `W0-1-newdisc` · `W0-2-smm-periode-atestasi`
· `W0-3-hcm` · `W0-4-regref`.

## Tiga koreksi terhadap sensus 2026-08-27

**1 · `fix/firmgl-rekonsiliasi-ekspor` DICORET — digantikan PR #318**
(`fix/firmgl-apar-subbuku-hidup`). Blob `firm_gl_export.ts` **identik** (`8023b9f`) di
cabang lama, di PR #318, DAN di direktori kerja utama — jadi "duplikasi aktif" yang
dicemaskan sensus lama ternyata bukan penulisan ulang, melainkan salinan yang sama.
#318 membawa tambahan apar (`apar_ratios.ts`, `use_firm_ap.ts`, `data_firmfin.ts`,
`view_firmfinance.tsx`) **MENDARAT `62593c4` (2026-08-27)** — squash-merge, cabang remote dihapus lewat
`gh api -X DELETE repos/…/git/refs/heads/…` (bukan `--delete-branch`). Terverifikasi
blob di master: `firm_gl_export.ts` `8023b9f` · `apar_ratios.ts` `af60dc6` ·
`use_firm_ap.ts` `cbe2f21`; `view_firmgl.tsx` kini 8 kemunculan `reconcil|amsExport`
(sebelumnya NOL).
⚠ PR terbuka tidak muncul di sensus cabang lokal — `gh pr list` adalah langkah
terpisah yang wajib.

**2 · Kelima cabang TIDAK disjoint.** Saya sempat menyatakan sebaliknya tanpa
mengukur. Persinggungan nyata:
`eslint-suppressions.json` (hcm × newdisc × #318) · `view_people.tsx` (regref × hcm) ·
`view_newdisc.tsx` (regref × newdisc) · `data_part4.ts` (regref × smm).
`regref` adalah simpulnya (28 berkas, bersinggungan dengan tiga) ⇒ **terakhir**.
Konflik `eslint-suppressions.json` diselesaikan dengan `npm run lint:any-baseline`,
bukan tangan.

**3 · 🔴 Urutan `smm` → `regref` MENGIKAT dan cacatnya SEMANTIK, tak tertangkap gerbang.**
Master menghitung alamat atestasi SOQM begitu:
`attestKeyFor('soqmAnnualEval', period, (A.CPE_REQ || {}).year)` di
`view_isqm.tsx:105` · `view_isqm_deep.tsx:501` · `view_governance.tsx:66`.
`CPE_REQ.year` = tahun kewajiban **PPL Akuntan Publik**, dipinjam jadi tahun atestasi
**mutu firma**. R1 di `fix/regref-tahap-a2` mengubah `CPE_REQ` jadi multi-record ⇒
ketiganya diam-diam menerima `undefined`; `attestKeyFor` **tidak protes** dan **CI
tetap hijau**. Cabang `claude/fervent-tharp-227ee5` melepaskan ketiga view dari
ketergantungan itu lewat `canon_smm_period.ts` — WAJIB mendarat lebih dulu.

⚠ Catatan memori lama menyebut cabang smm "mencabut fallback `new Date().getFullYear()`"
— **tidak akurat**; `getFullYear()` nol hasil di ketiga view pada master. Rumusan lama
mewariskan cacat yang salah.

## Urutan yang dipakai

```
#318 ✅ mendarat ──► { W0-1 newdisc · W0-2 smm · W0-3 hcm } ──► W0-4 regref
```

⚠ **Jebakan polling yang menggigit saya sendiri:** `gh run list --jq '.conclusion // .status'`
mengembalikan **string kosong** untuk run yang masih `in_progress` (bukan kata
"in_progress"), sehingga grep atas kata itu memberi NOL dan loop menyimpulkan
"selesai" secara palsu. Uji yang benar: hitung run dengan `.status != "completed"`.

W1 (A–F, lihat [[asseris-w1-identitas-tersegel-paralel]]) berjalan **serentak** —
nol berkas beririsan, sudah diverifikasi `comm -12`.

Lihat juga [[asseris-sensus-cabang-2026-08-27]] · [[asseris-ci-dispatch-hilang-dan-gh-merge-worktree]].
