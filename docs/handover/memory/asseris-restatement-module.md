---
name: asseris-restatement-module
description: "Modul standalone \"Penyajian Kembali (Restatement)\" PSAK 25 dibangun 2026-07-18 (PRD signed-off); COMMITTED branch feat/restatement-workpaper (7569b78), belum push/PR"
metadata: 
  node_type: memory
  type: project
  originSessionId: fb56300b-e175-43f5-9952-5acce3b2cad5
---

**2026-07-18 — Modul `restatement` (Penyajian Kembali / Restatement) DIBANGUN. ✅✅ MERGED ke master via PR #90 (merge commit `db921d0`; commits `7569b78` fitur + `69bed45` snapshot-fix). Master sinkron, branch dihapus. Aksi lokal bila belum: `git checkout master && git pull`. Repo bersih, 0 PR terbuka.**

GOTCHA CI (penting): typecheck/lint/build lokal TAK cukup — CI juga `npm test` (vitest). `canon_regression.test.ts` men-snapshot SELURUH permukaan `AMS_CANON` zero-arg; menambah fungsi ke `AMS_CANON` (mis. `restatementEngine`) WAJIB update snapshot via `npx vitest run src/canon_regression.test.ts -u` (verifikasi diff murni aditif dulu). Jalankan `npm test` lokal sebelum push bila menyentuh canon.

Konteks: temuan awal = restatement SUDAH ada tapi sebagai **demo statis** di tab "Penyajian Kembali" [[asseris-eval-menyeluruh-2026-07]] milik `view_psak25.tsx` (hardcoded `RESTATE.errRevenue:2400` di `canon_part2.ts`, persist localStorage firm-scoped, tak editable). Ari pilih scope **"Standalone workpaper"** (bukan upgrade-in-place, bukan full+posting-jurnal) via AskUserQuestion; PRD disetujui ("Proceed.").

Yang dibangun (7 titik, semua di `migration/src`):
1. `canon_types.ts` — interface `RestatementItem` (type: error|policy|reclass; gross Rp juta signed, negatif=laba dikoreksi turun; tax bool).
2. `canon_part2.ts` — `restatementEngine(items?, wtb?, opts?{pm,parValue})` PURE + `RESTATEMENT_SEED` (1 item = skenario channel-stuffing FY2024 lama, kini editable). Baseline PY dari WTB kolom `ly`, tarif `RATE` 22%. Return: items enriched, errGross/errTax/errNet, roll-forward saldo laba (3-2100 ly), impact[] agregat (pbt/tax/net/re), eps (dari 3-1100/parValue), **material/thirdBalanceSheet DINAMIS** (dibanding PM, bukan hardcode true). Export ditambah di export list.
3. `canon.ts` — import + tambah `restatementEngine, RESTATEMENT_SEED` ke `AMS_CANON_BASE`.
4. `contexts.tsx` — `AMS_PERSIST_SCOPE['restatement.v1']='engagement'`.
5. `view_restatement.tsx` (BARU) — register editable (add/edit/hapus item, select jenis, input desc/pos/periode/bruto/checkbox pajak; reclass disable bruto+pajak), 4 tab (Register / Dampak & Roll-forward / Prosedur & Pengungkapan / Kesimpulan), checklist 10 prosedur + 7 pengungkapan, textarea kesimpulan, komposisi, ketertelusuran. Persist `restatement.v1`.
6. `icons.tsx` — MODULES entry `restatement` di grup **Core Specifics** (dekat opening/sad, icon `sync`, tag NEW) + `RELATED_SA.restatement` (SA 710/450/240/510).
7. `app.tsx` — import `RestatementView` + `case 'restatement'`.

Gerbang HIJAU: typecheck 0 (full strict), lint bersih (nol :any baru), build sukses. **Live-verified role Manager (Anindya, anindya.p@whr-cpa.id / Manager#2025!)**: modul render, edit bruto -2400→-5000 recompute (pajak -1100, neto -3900), **materialitas flip Tidak-material→Material** saat neto 3900 ≥ PM 3195, roll-forward + komparatif + EPS + callout neraca ketiga (PSAK 1 ¶40A) benar, **persist bertahan lintas reload** (engagement-scoped server-backed). Seed value dipulihkan ke -2400.

Catatan penting: materialitas dinamis membuat skenario seed kini "Tidak material" (neto 1872 < PM 3195) — DISENGAJA & benar (perbaikan vs hardcode lama `material:true`). Tab PSAK 25 lama SENGAJA dibiarkan apa adanya + deep-link (open question Q2 default); kesimpulan = state persist biasa bukan sign-off ber-gerbang (Q3 default).

GOTCHA proyek tanpa `@types/react`: view .tsx BARU wajib bebas explicit-any (ratchet) → event handler pakai tipe struktural lokal `type InputEvt={target:{value:string}}` / `CheckEvt`; hindari `React.ReactNode`/`React.ComponentType` (namespace react tak ekspor keduanya) → pakai `ReturnType<typeof AMS_CANON.restatementEngine>` untuk M, `typeof I.doc` untuk cast ikon. Navigasi app via NavContext (BUKAN URL/hash) — buka modul via sidebar/⌘K, tak ada global nav.

Opsi lanjutan (belum dikerjakan): arahkan tab PSAK 25 lama memakai engine baru, ATAU naik ke opsi "full+posting jurnal" (perluas AJE dgn dimensi periode/tipe).
