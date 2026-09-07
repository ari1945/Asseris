---
name: asseris-sa510-indep-fee-prioryear
description: "PRD 4-fitur (SA 510 pendalaman, independensi per-anggota, priorYear server-persist, konsentrasi fee) + progres bertahap per-PR"
metadata: 
  node_type: memory
  type: project
  originSessionId: a5099c75-b371-4b31-8299-a7c6389ddd7a
---

PRD disetujui Ari ("Proceed" 2026-07-19): `docs/prd-sa510-independence-fee-prioryear.md`. Empat fitur, dikerjakan **bertahap 4 PR**. Eksplorasi menemukan: **SA 510 sudah ada** sebagai modul `opening` (`view_opening.tsx`) → F1 = pendalaman, bukan modul baru; **independensi** sekarang per-AP (`INDEPENDENCE` data_part1.ts:321) bukan per-anggota → F2 greenfield; **konsentrasi fee** tak ada kalkulasi (pemicu fee cuma biner overdue di `continuance_engine.ts:151`) → F4 greenfield.

**Urutan PR:** PR-1 priorYear → PR-2 konsentrasi fee → PR-3 independensi per-anggota → PR-4 SA 510. Keterkaitan timeline (`ATL_TASKS` di `view_audittimeline.tsx` + `useInitialTab`/`useInitialSelection`) dilipat ke tiap PR.

## PR-1 — priorYear server-persist ✅ CI HIJAU, 🔵 PR #95 TERBUKA (branch `feat/prioryear-server-persist`, `91fd055`)
`priorYear` (SA 220.A24) dari konstanta hardcode `PRIOR_YEAR` (data_part1.ts:391) → **StateDoc firma** `key='priorYear'` (keyed clientId) via `useAmsPersist('priorYear', PRIOR_YEAR)` di `view_continuance.tsx`. **Tanpa migrasi Prisma** — hydrate-on-first-load (fallback konstanta saat version 0). `PriorYearEditor` baru (opini select WTP/WTP-EoM/WDP/TMP/TW + field) gated `editable`; perubahan opini → pemicu `isOpinionModified`.
- **GOTCHA RBAC:** firm-scope `capForWrite` default = **FIRM_ADMIN** (rbac.ts:163). Key baru firma harus dicabangkan eksplisit atau edit Manajer **gagal senyap (403)**. priorYear → `ENGAGEMENT_MANAGE` (rbac.ts). `continuanceDecisions` juga jatuh ke FIRM_ADMIN default.
- **GOTCHA server proc:** backend (`npm start` :5181) TIDAK hot-reload perubahan `migration/src/rbac`. Setelah ubah RBAC **wajib restart server** (preview_stop+start name:"server") sebelum verifikasi live, atau dapat 403 stale.
- Dev stack: Vite :5180 (UI) proxy `/trpc`→:5181 (backend). Launch config `.claude/launch.json`: name `vite`/`server`/`dev-all`. Login Manajer: `anindya.p@whr-cpa.id` / `Manager#2025!`.

## PR-2 — konsentrasi fee ✅ CI HIJAU, 🔵 PR #96 TERBUKA (branch `feat/fee-concentration`)
`fee_concentration.ts` murni: `feeConcentration(clients, firmRevenue, config)` → rasio firma (fee÷GL 4-100 via `FIRMFIN.pl().revenue`) & partner; PIE breach(≥15%)/watch(≥10%) vs non-PIE informatif(≥30%, tak pernah breach). `FEE_CONCENTRATION_CONFIG` default IESBA 290. `continuance_engine` param opsional ke-6 `concentration`→pemicu `feeKonsentrasi`. Panel di `view_continuance` + tugas timeline A-110. Live: Mandiri 20.7%/Sentosa 16.4% Signifikan, Graha 14.5% Pantau.
- GOTCHA: param baru continuanceFlags WAJIB opsional & di-append terakhir (5-arg lama dipakai view+banyak test).
- Copilot dev crash-loop (copilot.tsx:1366) PRA-ADA, tak terkait (task_45911524); bikin screenshot browser timeout — verifikasi via DOM extraction saja.

## PR-3 — independensi per-anggota ✅ CI HIJAU, 🔵 PR #97 TERBUKA (branch `feat/member-independence`)
`member_independence.ts` murni (5 ancaman IESBA, status per-anggota + roll-up clearance, roster dari SCHEDULE, seed). `view_independence.tsx` = modul **`teamindep`** (BUKAN `independence` — sudah dipakai register rotasi AP!) grup Firm Practice Management; matriks anggota×ancaman, tanda tangan self (Partner atas nama FIRM_ADMIN), persist StateDoc engagement `memberIndep.v1` (capForWrite=WP_EDIT). Integrasi gerbang: `useMemberIndependenceGate`→`view_opinion_parts` canFinalize/canSignSlot `&&= mig.clear` + banner (mirror ethics_gate). Timeline A-105. Live: 6 anggota ENG-014, self-edit gate, ancaman tak-tersafeguard→opini terblokir (tombol Finalisasi disabled).
- GOTCHA: seed all-signed+clean (1 Senior ter-safeguard)→clear=true default→nol regresi finalisasi. `clear = blockers===0` (roster kosong→clear, jangan blok perikatan tanpa staffing).
- GOTCHA: hook defensif `(typeof useFirm==='function')?...` DILARANG (react-hooks/rules-of-hooks lint di migration ESM) — panggil useFirm() tanpa syarat.

## PR-4 — SA 510 pendalaman `opening` ✅ CI HIJAU, 🔵 PR #98 TERBUKA (branch `feat/sa510-opening-deepening`)
`opening_assessment.ts` (OB_RISK_FACTORS 6-faktor Σ100 + skor/verdict + predecessorReadiness), `assessment_model` +kind `opening`, `opening_memo.ts` (blok PDF/XLSX tersegel). `view_opening`: persist engagement `opening.v1`, tab "Penilaian Tahun Pertama" (skor berbobot), checklist pendahulu ber-meter, wire ekspor tersegel + Simpulkan, useInitialTab. LINEAGE.opening up←onboarding/continuance, timeline A-115. Live: 6 faktor→5.00 Andal, checklist 1/4·25%, exporter.seal 200.
- GOTCHA: `:any` baru un-suppress SELURUH view_opening (banyak :any lama baselined) → ketik penuh param baru (OBAssessment/OBConclusion), JANGAN :any.

## STATUS: ✅ SELESAI — seluruh PRD (PR-1..4) MERGED master 2026-07-19 (#95/#96/#97/#98, merge terakhir `c47bf11`). Branch fitur bisa dibersihkan. Cadence: Ari otorisasi merge per-PR.

## Keputusan OQ (default PRD, belum dikoreksi Ari)
- OQ-2 denominator fee = GL revenue `4-100` (11.3B) [rekomendasi], bukan Σ CLIENTS.fee (9.3B).
- OQ-3 ambang PIE 15% berulang 2th — **konfirmasi Ari saat PR-2**.
- OQ-1 independensi granularitas = anggota×perikatan [rekomendasi].

Terkait: [[asseris-deeplink-tab-nav]] [[asseris-penerimaan-keberlanjutan-detail]] [[asseris-continuance-isqm]]
