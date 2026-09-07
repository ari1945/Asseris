---
name: asseris-acceptance-engagement-flow
description: Remediasi flow akseptasi→perikatan + gerbang masuk Eksekusi SA 210/220 (evaluasi modul isu
metadata: 
  node_type: memory
  type: project
  originSessionId: e60868bc-9ca1-4080-b625-015cd25a8970
---

Remediasi **isu #2** dari evaluasi modul Asseris 2026-06-25: menutup celah flow penerimaan→perikatan. Branch `feat/acceptance-engagement-flow-sa210` (off master) → **PR #27** (open). PRD `docs/prd-acceptance-to-engagement-flow-sa210.md`. **Q1=Opsi A** (gerbang di Perencanaan→Eksekusi, bukan saat penciptaan; graduated override-able).

**Follow-up Q4 (override Partner-only) SELESAI** — branch `feat/phase-gate-override-rbac` (off master) → **PR #28** (open). `CAP.PHASE_OVERRIDE` Partner-only; `PhaseGateDialog`+`usePhaseGate` disable tombol override bila blocker & bukan Partner (semua gerbang: Eksekusi/Finalisasi/Arsip). Live-verified: Manager disabled+nota, Partner enabled. PRD `docs/prd-phase-gate-override-rbac.md`. Batas jujur: server tetap gate `engagements`@ENGAGEMENT_MANAGE (bukan "override butuh Partner"); backstop=jejak audit. Repo remote = `ari1945/Asseris` (gh via `C:\Program Files\GitHub CLI\gh.exe`, [[asseris-tooling-gh]]).

**Selesai M1–M5 (commit di branch, BELUM PR/merge):**
- **M1** `engagement_entry_gate.ts` — `engagementEntryGate(ctx)` murni: prasyarat = akseptasi/keberlanjutan disetujui (SA 220/ISQM 1) + surat perikatan `signed` (SA 210). Output sebentuk kriteria `engagementGate` ({key,label,met,detail,view}).
- **M2** `ams_types.ts` EngagementRow + field opsional `clientKind/originProspectId/acceptanceRef/engagementLetter`; `contexts.tsx addEngagement` stempel **default Pra-akseptasi** (sebelum ...e). Mapper `engagementEntryContext(eng)`.
- **M3** `prospectToEngagementInheritance(p)` + wire ke `StepConvert.doConvert` (`view_onboarding.tsx`) + gate UI `can(ENGAGEMENT_MANAGE)`.
- **M4** wire ke `engagementGate` cabang `→Eksekusi` (`wp_signoff.tsx`); `attempt()` teruskan `engId`. **Severity 'warn' (BUKAN 'confirm' spek PRD)** — alasan: 'confirm' paksa dialog tiap kali + copy-nya hardcoded "pengarsipan/mengunci" (khusus Arsip). 'warn' = happy-path lolos sunyi, blocker→dialog+override ter-log.
- **M5** `isEngagementPreAcceptance(eng)` + badge "Pra-akseptasi" di kartu papan + header detail Engagement Mgmt (`view_firm.tsx`). 25 unit test gerbang.

**🔑 KOREKSI (pelajaran berulang — sama dgn [[asseris-gap-matrix-eval]]):** evaluasi awal & PRD §1.1 klaim "akseptasi↛perikatan terputus" → **SALAH**. Konverter `StepConvert.doConvert` (`view_onboarding.tsx:382`) SUDAH ADA (buat klien+engagement, set converted, gate 3 gerbang front-office). Agen eksplorasi melewatkannya. **Selalu grep dulu sebelum klaim "absen".** Gap riil = konverter tak wariskan provenance + tombol tanpa gate RBAC.

**Verifikasi LIVE (peran Manager, `dev:all` :5180+:5181):** kartu Perencanaan tanpa provenance (seed ENG-2025-040/047 + engagement manual) tampil badge; pindah→Eksekusi munculkan dialog SA 210/220 (akseptasi+surat gagal); "Lanjutkan" advance (graduated). Login form pakai controlled input → fill biasa GAGAL (React state kosong); pakai native-setter+dispatch input/change ATAU `window.AMS_API.auth.login.mutate()` langsung lalu reload (cookie httpOnly). Akun: `anindya.p@whr-cpa.id`/`Manager#2025!`.

**Gotcha verifikasi:** `engagement.list` (tRPC) baca **tabel Prisma Engagement** (seed), TAPI board render dari **StateDoc** (`useServerState('engagements','firm')`). Perubahan fase persist ke StateDoc, jadi `engagement.list` LAG/tak berubah — cek cache `ams.v1.firm.FIRM-WHR.engagements` atau client state, bukan engagement.list. `preview_screenshot` sering timeout di SPA berat → andalkan snapshot/eval teks.

**Status:** M1–M6 SELESAI (PR #27) + Q4 override SELESAI (PR #28). Keduanya open, belum merge. Independen (sentuh fungsi beda di wp_signoff: engagementGate/attempt vs confirm/dialog) → merge urutan apa pun bersih.

**Sisa / deferred:**
- `EngagementForm` manual tetap bypass akseptasi → hanya lewat override ter-log (sengaja: nudge ke alur onboarding).
- Happy-path konversi & M3 convert-RBAC (Senior lihat tombol disabled) hanya unit-tested, belum live-driven (butuh prospek ter-onboarding penuh).
- Penegakan override server-side penuh (server hitung ulang gerbang) — ditunda; UI-gated + jejak audit backstop.
- Review/merge kedua PR.

Pola gate fase: `engagementGate(audit,firm,opts)` → kriteria per `nextPhase`; `usePhaseGate.attempt` → dialog bila severity 'confirm' SELALU / 'warn' hanya saat blocker. Lihat invarian SoD di [[asseris-opinion-signoff-sod-defect]] (jangan tambah sign-off tanpa gate UI+server).
