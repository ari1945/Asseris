---
name: asseris-excel-engagement-pack
description: "Engagement Pack Excel (36 sheet, turunan workspace Perikatan Asseris) — PRD signed-off, dibangun & terverifikasi 2026-07-09; generator openpyxl di tools/excel-pack/; MERGED ke master via PR #70 (merge commit d255b16, 2026-07-18)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 74ab01d4-015e-4191-b9a0-9f5a0fdb9d1a
---

> **STATUS 2026-07-18:** dulu uncommitted; kini **MERGED ke master**. Branch `feat/excel-engagement-pack` (commit `9932acd`, off `origin/master` — sengaja bukan master lokal agar tak menyeret `b36f6a9`/PR #61) → **PR #70 MERGED** (https://github.com/ari1945/Asseris/pull/70, merge commit `d255b16`). Branch boleh dihapus. Yang di-commit: PRD + `tools/excel-pack/*` (generator+README+recalc-verify) + 2 `.xlsx` root. `tools/excel-pack/dist/` di-**gitignore** (byte-identik deliverable root). `.claude/launch.json` (+profil "server" :5181) sengaja TAK di-commit (dev-env pribadi, masih uncommitted di working tree).

**Asseris Engagement Pack (Excel)** — permintaan Ari 2026-07-09: "template Engagement aplikasi audit versi Excel, fitur persis Asseris". Klaim "persis" dikoreksi di PRD (`docs/PRD-excel-engagement-pack.md`): parity per modul P/D/H; enforcement (SoD/RBAC/gates/audit-trail) TIDAK mungkin di Excel — dinyatakan jujur di sheet PETUNJUK.

**Sign-off Ari (AskUserQuestion):** Full F1+F2 (bukan MVP) · .xlsx tanpa makro · kosong + contoh mini · Proceed.

**Deliverable:** `Asseris Engagement Pack (Excel).xlsx` di root repo (copy dari `tools/excel-pack/dist/`), 36 sheet, 0,33 MB. Generator: `tools/excel-pack/{generate,xhelp,gen_ref_setup,gen_engagement,gen_planning,gen_execution,gen_specifics,gen_final}.py` + `recalc-verify.ps1` (Excel COM — LibreOffice tak terpasang di mesin ini).

**Terverifikasi (Excel COM recalc, TOTAL_ERRORS 0):** OM=40,75jt=5%×PBT 815jt (PBT sudah termasuk AJE 25jt → bukti auto-post SUMIFS 21_AJE→20_WTB), PM=75%, CTT=5% (kanon `canon_part4.ts materiality()`); neraca & arus kas tidak-langsung check=0 (CF level-TB mengikat EXACT: semua baris = −Δ kategori); MUS n=152 (RF Moderat 2,31, TM=PM default kanon); Benford/JET; book-tax; RoMM matrix; SAD iron-curtain/rollover (named `SAD_UNCORR`); opini decision-tree SA705 → teks draf.

**Why:** produk digital potensial / lead magnet Asseris (positioning BELUM diputuskan — open question PRD #1).

**How to apply / GOTCHA:**
- JANGAN `SUMPRODUCT(ISNUMBER(MATCH(...))*N(range))` — N() tidak broadcast atas range → angka SALAH SENYAP (0 error formula tapi nilai ngaco). Pakai `sum_cats()` → `SUM(SUMIFS(col,map,{"kat1","kat2"}))`.
- Verifikasi formula Excel di mesin ini: Excel COM (`recalc-verify.ps1`), bukan skrip LibreOffice skill xlsx.
- Sheet berawalan digit wajib dikutip di formula (`'20_WTB'!`); named ranges hindari nama mirip kolom (pakai `MAT_OM` bukan `OM`).
- Regenerasi = edit builder + `python generate.py` + recalc-verify WAJIB hijau.
- Terkait: [[asseris-personal-data-isolation]] (branch feat/personal-data-isolation masih punya urusan commit terpisah — pack Excel ini di luar app, belum di-commit juga).
