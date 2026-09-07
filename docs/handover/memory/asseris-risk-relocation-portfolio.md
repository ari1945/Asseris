---
name: asseris-risk-relocation-portfolio
description: RoMM dipindah ke Core Planning + tab Risiko Portofolio lintas-klien di Firm Dashboard
metadata: 
  node_type: memory
  type: project
  originSessionId: 023ccf1e-116b-4332-b38e-b12e3ff039d1
---

SELESAI 2026-06-25 (PRD-first, sign-off "Proceed."). Dua perubahan, gate hijau (typecheck 0, lint bersih, 187 test migration):

**Bagian A — relokasi.** Modul `risk` ("Risk Assessment") isinya RoMM SA 315/330 **per-perikatan** (`view_risk.tsx`, scoped ke `activeEngagement`), tapi salah-tempat di grup `Firm Practice Management` → dipetakan `WORKSPACES` ke workspace `firm` (tata kelola firma), bukan `engagement`. Dipindah di `icons.tsx` ke grup `Core Planning` (sebelum `materiality`) → kini di workspace Perikatan, alur SA 315→320→300→330 utuh. Route/view/data tak berubah.

**Bagian B — Portfolio Risk View.** `portfolio_risk.ts` (util murni bertipe, bebas-any + test) = `portfolioRisk(engagements, clients, RISKS)` agregasi RoMM lintas-engagement (total/signifikan(L×I≥12)/fraud/maxScore/band). Band ikut `scoreColor` view_risk (≥15 Significant…). Tab "Risiko Portofolio" di `view_dashboard.tsx`, **gated `CAP.ENGAGEMENT_VIEW_ALL`** (Partner+Manager; lihat [[asseris-opinion-signoff-sod-defect]] utk pola RBAC). Drill-down baris → `setActiveEngagementId` + `nav('risk',{from:'dashboard'})`.

**1b SELESAI (push + seed):** branch `feat/risk-relocation-portfolio-view` (commit pertama `8874f85` di-push). Lalu opsi 1b: temuan saat implementasi — baris `RISKS` data_part1 **tak punya `engagementId`** sama sekali (yg `.map(engagementId)` itu REVIEW_NOTES) → agregator awalnya tandai SEMUA "belum dinilai". Fix: tag `RISKS` ENG-2025-014 + `RISKS_PORTFOLIO` (RoMM ringkas ENG-2025-040/031/063) + union `ENG_RISK_SEED`. `AMS.RISKS` TETAP ENG-2025-014 (konsumen langsung opini/presentasi/psak via `AMS.RISKS.filter`/`.find` tak berubah — JANGAN campur engagement lain ke AMS.RISKS). Seed contexts di-filter `engagementId` (drill-down konsisten). `RiskRow.engagementId?` di ams_types. 190 test (3 integrasi). Portfolio kini 4 Dinilai + 3 Belum.

**Gotcha penting:**
- **Kendala data (RESOLVED via 1b):** register risk persist per-engagement (`useServerState('risks',…,'engagement',id)`). `AMS.RISKS` = ENG-2025-014; union `ENG_RISK_SEED` (dari data_part1) untuk portfolio + seed kontekstual.
- **Ratchet `no-explicit-any` (W15)** menggigit: `any` baru di `.tsx` = lint FAIL (view lama ber-`:any` sudah baseline). Additions WAJIB bebas-any → tipe props eksplisit + impor `RISKS` dari `data_part1` (bukan `AMS.RISKS` yg bertipe `unknown` via index-sig `AmsData`).
- Verifikasi live TERHALANG auth wall (W7: butuh backend `dev-all` + kredensial/TOTP). Diverifikasi via typecheck/lint/test + boot bersih (login render, nol error konsol). Belum di-commit.
- Slot FPM yg ditinggalkan → kandidat modul "Penerimaan & Keberlanjutan (ISQM 1/SA 220)" = risiko firm-level yg SAH di FPM; perlu PRD sendiri (non-scope).

PRD: `docs/prd-risk-relocation-and-portfolio-risk.md`.
