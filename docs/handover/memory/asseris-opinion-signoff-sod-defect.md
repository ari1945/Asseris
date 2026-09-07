---
name: asseris-opinion-signoff-sod-defect
description: "P0 — tanda tangan opini bisa dipalsukan lintas-peran (segregation of duties), menembus ke server"
metadata: 
  node_type: memory
  type: project
  originSessionId: 6ed13120-c5a1-4b4a-8abd-7e979d16dac0
---

## STATUS: ✅ RESOLVED — dua-lapis (UI + server) LIVE di master & re-verified di kode 2026-06-25

> Re-verifikasi kode 2026-06-25 (sesi C1): merge `791b23f` ada di master & HEAD feat/wtb-ledger-drill.
> UI `can()` di wp_signoff.tsx:160/239 + view_opinion_parts.tsx:462-463/569 (slot butuh peran DAN urutan)
> + view_workspace.tsx:68/481; server `guardSignoffWrite` (signoff.ts) WIRED di state.set (router.ts:510-513,
> throw FORBIDDEN sebelum persist → versi tak naik). RBAC benar (Manager≠OPINION_APPROVE/EQR_REVIEW; Junior/Senior nol).
> 19/19 test hijau — integration menembus tRPC nyata (Manager ditolak slot Partner, doc tetap v1). Tak ada kerja kode tersisa.
>
> **LIVE WALKTHROUGH (2026-06-25, dev:all :5180/:5181, preview MCP):** (a) Manager (Anindya) di opini: slot Manajer enabled, Partner+EQR disabled dgn title "Hanya otoritas berwenang"; setelah tandatangani slot Manajer, slot Partner TETAP disabled (exploit urutan TERTUTUP); identitas terekam "Ditandatangani oleh Anindya Pramesti" (sesi, bukan slot-hardcode). (b) Junior (Citra) di opini: KETIGA slot disabled+role-hint. (c) SERVER penetration (UI dilewati, fetch /trpc/state.set langsung): Manager forge slot Partner opinionDoc.v1 → **403 requires:opinion.approve**, versi tak naik; Junior forge wpState chain.reviewer → **403 requires:signoff.reviewer**. Semua artefak uji direvert; sesi dikembalikan ke Manager. P0 dikonfirmasi tertutup end-to-end.

## STATUS HISTORIS (2026-06-24): Fase 1 (UI gating) SELESAI & diverifikasi live; server Fase 2 PENDING

PRD: `Audit System/PRD - Penegakan Sign-off Berbasis Peran (Dua-Lapis).md` (Proceed.). Fase 0+1 diimplementasikan:
- `rbac.ts`: tambah `CAP.EQR_REVIEW` (Partner-only); aktifkan `SIGNOFF_REVIEWER` (kini dipakai).
- `wp_signoff.tsx`: baris Reviewer `canSign = !!preparer && can(SIGNOFF_REVIEWER)` (+ Buka di-gate).
- `view_opinion_parts.tsx`: per-slot `SLOT_CAP` {manager→SIGNOFF_REVIEWER, partner→OPINION_APPROVE, eqr→EQR_REVIEW}.
- `view_workspace.tsx`: kliring/buka catatan `can(SIGNOFF_REVIEWER)` (respons tetap terbuka).
Gate hijau: lint 0 / typecheck 0 / test 103→133. Verifikasi live: Senior=semua disabled (preparer/respons enabled); Manager=slot Manajer enabled, Partner/EQR disabled, dan slot Partner TETAP disabled setelah Manajer sign (regresi exploit TERTUTUP).

**Fase 3 (hardening, independen-server) SELESAI:** `src/rbac.test.ts` (+30 uji memaku matriks kapabilitas SSOT) + BUILD.md subsection "Sign-off berbasis peran — INVARIAN" (tabel aksi→cap→peran).

**Fase 2 (lapis SERVER) SELESAI** (Open Q3 → **Opsi B validator delta**, BUKAN A: `state.set` terima dok utuh via CAS, jadi A=refactor besar klien). `server/src/signoff.ts` `guardSignoffWrite(role,key,prev,next)` mem-diff nilai tersimpan vs masuk di `state.set` (router.ts), tuntut cap per-slot: wpState chain reviewer→SIGNOFF_REVIEWER/partner→OPINION_APPROVE/eqr→EQR_REVIEW; opinionDoc signoff+finalized; reviewNotes status→SIGNOFF_REVIEWER. Slot+cap→detail jejak audit (tuntas item Fase 3 audit-trail). Uji: signoff.test.ts (8) + signoff_integration.test.ts (3, tRPC nyata: Manager diblokir slot Partner). Server typecheck 0, test 129.

**PR: [Asseris#23](https://github.com/ari1945/Asseris/pull/23)** (branch `fix/signoff-role-gating` dari master, ter-push). Commit: `ca86e63` (UI Fase0+1) · `0d3d540` (rbac.test+BUILD Fase3) · `ad56e7b` (server Fase2) · `88ca144` (docs). **Belum di-merge.**

**Q4 SELESAI** (`202f036`): OpinionSignoff.sign rekam `auth.user.name` sesi di signoff[role].by + wpState['900'].chain (bukan REVIEW_CHAIN.who hardcode); UI "Ditandatangani oleh <nama>" ungkap divergensi. Live-verified. **Q5 SELESAI**: guardSignoffWrite tangani firm `prospects` — acceptance.approved + letter.status→sent/signed butuh FIRM_ADMIN; intake/PMPJ/draft tetap ENGAGEMENT_MANAGE. Uji signoff.test 13 + integration 6.

**SELURUH PRD TUNTAS (Fase 0–3 + Q1–Q5). PR #23 MERGED ke master 2026-06-24** (merge commit `791b23f`, branch `fix/signoff-role-gating` dihapus). Penegakan dua-lapis (UI `can()` + server `guardSignoffWrite`) LIVE di master. Gotcha ESLint: ratchet `no-explicit-any` per-file — `:any` baru meng-unsuppress SELURUH file (hindari `:any`); menghapus `:any` butuh `npx eslint src --prune-suppressions` (suppression usang = exit 2). Gotcha test-run: vitest menyentuh `canon_regression.snap` (LF→CRLF) — `git checkout` sebelum commit.

## Kelas defect SISTEMIK (audit kode 2026-06-24) — bukan kasus tunggal

Dua surface sign-off otoritatif gate-nya BERBASIS URUTAN/KELENGKAPAN saja, BUKAN peran:
1. **Opini** — `OpinionSignoff.sign()` (view_opinion_parts.tsx:493) tanpa `can()`; tombol per-slot `disabled={!prevDone && !done}` (561). Rekam `by:` = nama slot HARDCODE (impersonasi). `can(OPINION_APPROVE)` hanya gate tombol Finalisasi akhir. Task task_f882b8db.
2. **Kertas kerja BERSAMA (~38 WP)** — `useWpSignoff.sign()` (wp_signoff.tsx:157), tombol reviewer `canSign={!!preparer}` (232), tanpa `can()`. Hilir: memenuhi gerbang Arsip (`engagementGate` butuh `recap.signed===total`, 503) + metrik Cockpit "WP ter-review". Task task_5cf98877.

**Kapabilitas yatim:** `CAP.SIGNOFF_REVIEWER` (granted Partner+Manager, rbac.ts:52-53) didefinisikan tapi TAK PERNAH dicek (grep repo).

**Pola FIX ada di repo:** `firm_attest.tsx` `FirmAttestCard.renderLine` BENAR — `allowed=can(role.cap)` + `disabled={!prevOk||!allowed||!hasConclusion}`. Gate benar lain: AJE `can(AJE_EDIT)`, akseptasi/penerbitan `can(FIRM_ADMIN)`, opini-final `can(OPINION_APPROVE)`.

**Akar server:** `capForWrite` granular per-DOKUMEN; sign-off di `wpState`/`opinionDoc.v1` → default `WP_EDIT` (SEMUA peran) → server terima. rbac.ts:64-67 serahkan intra-doc gating ke UI ("a future finer endpoint"=belum ada). Fix WAJIB dua-lapis (UI cek peran + server lebih halus).

---

Cacat **P0 integritas data / segregation of duties** di Audit Opinion Generator (Asseris), tab "Reviu & Tanda Tangan". Live-verified 2026-06-24 (QC UI/UX walkthrough, 4 peran).

**Root cause:** tombol "Tandatangani" tiap slot (Reviu Manajer / Rekan Perikatan-Partner / Pengendalian Mutu-EQR) di-enable HANYA berdasar **urutan** (slot next-pending), TANPA cek peran/identitas user. Bukti lintas peran: Junior bisa tandatangani slot Manajer; Manager (setelah slotnya) bisa tandatangani slot Partner; Senior (tak punya slot) tetap dapat slot Manajer enabled. Hanya tombol final "Finalisasi Laporan Auditor" yang benar Partner-only + server-enforced.

**Menembus ke data (bukan kosmetik UI):** tanda tangan disimpan di StateDoc `opinionDoc.v1` (engagement). `capForWrite('engagement','opinionDoc.v1')` → `default` → `WP_EDIT` (migration/src/rbac.ts), yang diberikan ke SEMUA peran termasuk Junior → server menerima tulisan (`state.set` → 200, version bump). rbac.ts:64-67 eksplisit menyerahkan "intra-doc gating" ke UI ("a future finer endpoint"). Reload + cache `opinionDoc` dikosongkan → tanda tangan paksa BERTAHAN (hidrasi dari server). Jejak audit W10 mencatat aktor asli tapi `detail` metadata-saja (tak menangkap semantik "tandatangani sebagai Manajer"; UI tetap menampilkan nama Manajer sebagai signer = menyesatkan).

**Fix dua-lapis (task chip task_f882b8db):** (1) UI — gate tombol ke peran pemilik slot (tiru pola AJE view_aje.tsx yang BENAR: banner + tombol disabled). (2) Server — gate per-slot peran↔slot untuk `opinionDoc.v1`, bukan hanya `WP_EDIT` level-dokumen. File: migration/src/view_opinion.tsx + view_opinion_parts.tsx + wp_signoff.tsx; server/src + rbac.

**Kontras (kontrol yang BENAR):** AJE role-aware (Junior=disabled+banner, Senior/Manager=enabled). Skup engagement bertingkat benar (Junior=1, Senior=2/keanggotaan, Manager/Partner=semua/oversight VIEW_ALL). Lihat [[asseris-gap-matrix-eval]] — verifikasi RBAC WAJIB pakai peran non-Partner.

Akun dev: hartono.w (Partner) / anindya.p (Manager) / bagas.n (Senior) / citra.l (Junior) @whr-cpa.id, lihat BUILD.md. Jalankan `npm run dev:all` di migration/.
