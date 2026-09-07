---
name: asseris-timebudget-wip-integration
description: "Time & Budget jam aktual → WIP Valuation/WIP & Realisasi (Scope A overlay, SSOT FIRMFIN.engagementWip)"
metadata: 
  node_type: memory
  type: project
  originSessionId: 561d2f91-75d6-4531-b942-3b4da9a26bc4
---

Gap VALID (beda dari My Tasks): jam aktual T&B tak sinkron ke WIP. ENG-2025-014 punya 3 angka jam paralel — `ENGAGEMENTS.actualHrs=1146` statis, T&B live (roster base+`timeEntries`), `WIP_ENG.std=3,2 M` (≈2560 jam, di-derive mundur). `FIRMFIN.wip()` (SSOT bersama WIP Valuation `wip`, WIP & Realisasi `wipreal`, dashboard, cockpit) baca seed `WIP_ENG` hardcoded → catat timesheet, WIP diam.

**Fix Scope A (Ari pilih via AskUserQuestion; commit `e758620` branch feat/w9-coretax-connector, BELUM push/PR, 2026-06-26):**
1. **SSOT bersama** `FIRMFIN.engagementWip(timeEntries, engId)` di [data_firmfin.ts](migration/src/data_firmfin.ts): tarif `WIP_BILL`/`WIP_COST` per-peran + `WIP_ROSTER_ENG` (roster jam-pembuka per eng; demo hanya ENG-014). Hitung jam aktual (base+timesheet) → `{roster, actualHrs, budgetHrs, stdValue, costValue}` | null bila eng tanpa roster.
2. **`FIRMFIN.wip(ctx, provFactor, liveByEng?)`** — param ke-3 opsional `{[engId]:{std,cost,actualHrs}}`; overlay baris eng aktif (std/cost/hours dari jam live), turunan (recoverable/realisasi/margin/aging/mutasi) konsisten. Tanpa arg = perilaku lama (dashboard/cockpit aman).
3. **T&B `useTBModel`** konsumsi `engagementWip` (roster+agregat); konstanta lokal TB_BILL/TB_COST/TB_ROSTER kini = `FIRMFIN.WIP_*` (satu sumber). Fase tetap lokal. Nol perubahan angka T&B.
4. **WIPValuation** ([view_firmfinance.tsx](migration/src/view_firmfinance.tsx)) + **WIPRealization** ([view_wip_firm.tsx](migration/src/view_wip_firm.tsx)) baca `useAudit().timeEntries`+activeEngagement → kirim `liveByEng` ke `FF.wip`. Chip hijau "Sinkron T&B" (deep-link `time`) saat overlay aktif.

**Risiko tie-out GL 1-300 = RENDAH:** `reconciling = control − unbilledTotal` (plug) serap selisih otomatis ([data_firmfin.ts:104](migration/src/data_firmfin.ts#L104)).

**Live-verified (Hartono/Partner):** WIP Valuation ENG-014 std **980 jt = T&B 980 jt** (dulu seed 3.200 jt), cost 492, realisasi 82%, margin 39% — semua dari jam aktual; chip hadir; 7 entri timesheet existing sudah tercermin (1098 base+48=1146 jam). Gates: lint0/typecheck0/test358/build0, nol console err. `:any` baru diserap `eslint-suppressions.json` (script `lint:any-baseline` rusak; pakai `npx eslint src --suppress-rule @typescript-eslint/no-explicit-any`).

**KONSEKUENSI bisnis (perlu keputusan Ari):** std ENG-014 turun 3.200→980 jt ⇒ posisi WIP flip jadi **over-billed** (recoverable 800 < billed 1.200 → deferred income −400). Jujur (billed > nilai jam aktual = progress billing di muka), tapi mengubah narasi WIP demo. Bila ingin ENG-014 tampil aset WIP positif: turunkan seed `WIP_ENG[ENG-014].billed`/sesuaikan, ATAU naikkan jam roster. Belum diubah. Lihat [[asseris-mytasks-integration]] (pola overlay/SSOT serupa).
