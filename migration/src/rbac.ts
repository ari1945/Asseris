/* ============================================================
   W7 — RBAC capability map. SINGLE SOURCE OF TRUTH, imported by BOTH:
     • the client UI (useAuth().can(cap) → enable/disable actions), and
     • the server (server/src/rbac.ts → gates state.set per (scope,key)).
   Keeping one map is what stops UI and server from diverging (PRD R2).

   Plain JS (no TS) so the server can import it across the package boundary the
   same way it imports data.js (../../migration/src/rbac.js, untyped). Mirrors the
   capability cells the prototype already displayed in view_settings.jsx
   (PERM_MATRIX) — W7 makes those cells real instead of cosmetic.
   ============================================================ */

/** The four RBAC roles (order = seniority, matches view_settings dropdown). */
export const ROLES = ['Engagement Partner', 'Audit Manager', 'Senior Auditor', 'Junior Auditor'];

/** Capability keys — the actions that authorization gates on. */
export const CAP = {
  WP_EDIT: 'wp.edit', // kertas kerja & lead schedule, tickmarks, notes, tasks
  AJE_EDIT: 'aje.edit', // jurnal penyesuaian + WTB overrides (changing the numbers)
  SIGNOFF_REVIEWER: 'signoff.reviewer', // reviewer/manager sign-off
  OPINION_APPROVE: 'opinion.approve', // persetujuan & opini (partner)
  FIRMFIN_EDIT: 'firmfin.edit', // keuangan firma (ERP)
  ENGAGEMENT_MANAGE: 'engagement.manage', // tambah/ubah klien & perikatan (roster firma)
  FIRM_ADMIN: 'firm.admin', // pengaturan firma & RBAC
  LLM_USE: 'llm.use', // W8 — panggil proxy LLM (narasi diagnostik). Bantuan baca, di-rate-limit & di-audit.
  ENGAGEMENT_VIEW_ALL: 'engagement.viewAll', // W7.5 — lihat/akses SEMUA engagement tanpa keanggotaan (oversight portofolio)
  AUDIT_VIEW: 'audit.view', // W10 — baca jejak audit server-side append-only (oversight kepatuhan/ISQM)
  EXPORT: 'export.use', // W10.5 — hasilkan & segel artefak ekspor (deliverable/register). Baca-saja terhadap data yang sudah boleh dilihat; ekspor jejak audit tetap di-gate AUDIT_VIEW.
  INTEGRATION_VIEW: 'integration.view', // W9 — lihat status konektor & antrean impor (transparansi data yang dikonsumsi). Baca-saja.
  INTEGRATION_MANAGE: 'integration.manage', // W9 — kelola koneksi & picu sync (tarik data eksternal → posting ke SSOT). Sensitif: hanya oversight/firm-ops.
  EQR_REVIEW: 'eqr.review', // penelaahan pengendalian mutu perikatan (ISQM 2 / SA 220.36) — penanda tangan slot EQR di opini. Penelaah independen ⇒ Partner-level.
  PHASE_OVERRIDE: 'phase.override', // override gerbang transisi fase MESKI ada blocker (mulai Eksekusi tanpa akseptasi/surat SA 210/220; arsip dgn WP belum lengkap/opini belum final). Tindakan otoritatif ⇒ Partner-only.
};

const { WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, OPINION_APPROVE, FIRMFIN_EDIT, ENGAGEMENT_MANAGE, FIRM_ADMIN, LLM_USE, ENGAGEMENT_VIEW_ALL, AUDIT_VIEW, EXPORT, INTEGRATION_VIEW, INTEGRATION_MANAGE, EQR_REVIEW, PHASE_OVERRIDE } = CAP;

/* role → granted capabilities. Mirrors PERM_MATRIX 'edit' cells:
   WP:[P,M,S,J] · Signoff:[P,M] · AJE:[P,M,S] · Opini:[P] · FirmFin:[P] · FirmAdmin:[P]
   ENGAGEMENT_MANAGE (roster) follows ROLE_CAPS ("edit: Engagement & WP" for Manager).
   LLM_USE granted to ALL four roles (W8 Q5) — narasi = bantuan baca, bukan aksi istimewa;
   biaya/abuse dijaga rate-limit + audit, bukan RBAC. The gate still denies by default, so
   unknown/future roles get FORBIDDEN.
   ENGAGEMENT_VIEW_ALL granted to Partner + Manager only (W7.5 Q1) — oversight portofolio;
   Senior/Junior dibatasi ke engagement tempat mereka anggota (per-engagement data isolation).
   AUDIT_VIEW granted to Partner + Manager only (W10 D2) — baca jejak audit server-side (oversight).
   SIGNOFF_REVIEWER (Partner + Manager) — otoritas tanda tangan REVIEWER kertas kerja & slot Reviu Manajer opini
   (mencegah Junior/Senior memalsukan sign-off reviu; dikonsumsi UI via can(), penegakan server lebih halus = fase lanjut).
   EQR_REVIEW granted to Partner only — penanda tangan slot Penelaahan Pengendalian Mutu (EQR, ISQM 2); penelaah
   independen ⇒ Manager/Senior/Junior TAK boleh menandatangani slot EQR.
   EXPORT granted to ALL four roles (W10.5) — ekspor deliverable/register = tugas auditor normal atas
   data yang sudah boleh dilihat; isolasi engagement (W7.5) tetap membatasi engagement mana yang bisa
   diekspor, dan ekspor jejak audit tetap menuntut AUDIT_VIEW di jalurnya sendiri.
   INTEGRATION_VIEW granted to ALL four roles (W9) — status impor/konektor = transparansi atas data
   yang mereka konsumsi; baca-saja. INTEGRATION_MANAGE granted to Partner + Manager only (W9) — memicu
   sync & mengelola koneksi eksternal = operasi firm-ops sensitif (OAuth, posting ke SSOT), sejajar
   ENGAGEMENT_MANAGE/AUDIT_VIEW.
   PHASE_OVERRIDE granted to Partner only — menembus gerbang transisi fase meski ada blocker
   (mulai Eksekusi tanpa akseptasi/surat; arsip dgn WP/opini belum lengkap) = keputusan otoritatif
   tata kelola; Manager/Senior/Junior boleh maju fase saat prasyarat TERPENUHI, tapi tak boleh override. */
const GRANTS = {
  'Engagement Partner': [WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, OPINION_APPROVE, FIRMFIN_EDIT, ENGAGEMENT_MANAGE, FIRM_ADMIN, LLM_USE, ENGAGEMENT_VIEW_ALL, AUDIT_VIEW, EXPORT, INTEGRATION_VIEW, INTEGRATION_MANAGE, EQR_REVIEW, PHASE_OVERRIDE],
  'Audit Manager': [WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, ENGAGEMENT_MANAGE, LLM_USE, ENGAGEMENT_VIEW_ALL, AUDIT_VIEW, EXPORT, INTEGRATION_VIEW, INTEGRATION_MANAGE],
  'Senior Auditor': [WP_EDIT, AJE_EDIT, LLM_USE, EXPORT, INTEGRATION_VIEW],
  'Junior Auditor': [WP_EDIT, LLM_USE, EXPORT, INTEGRATION_VIEW],
};

/** True if `role` is granted `cap`. Unknown role/cap → false (deny by default). */
export function can(role: any, cap: any) {
  const grants = (GRANTS as any)[role];
  return Array.isArray(grants) && grants.includes(cap);
}

/* (scope, key) → capability required to WRITE that StateDoc. The W6 store is one doc
   per key, so enforcement is at document granularity (finer intra-doc gating — e.g.
   the opinion sign-off living inside wpState — is the UI's job via can(), and a future
   finer endpoint). null = no capability needed beyond being authenticated (and, for the
   user scope, being the owner — enforced separately on the server). */
export function capForWrite(scope: any, key: any) {
  if (scope === 'user') return null; // own profile/prefs — ownership checked server-side
  if (scope === 'firm') {
    // clients/engagements = roster; prospects = intake/penerimaan (data-entry Manager).
    // Keputusan otoritatif intra-doc (persetujuan akseptasi / penerbitan surat SA 210)
    // tetap Partner-only via gate klien can(FIRM_ADMIN) + audit-trail ber-jejak (PR#20) —
    // pola "intra-doc gating = tugas UI" yang sama dengan opinion sign-off di wpState.
    return key === 'clients' || key === 'engagements' || key === 'prospects' ? ENGAGEMENT_MANAGE : FIRM_ADMIN;
  }
  // scope === 'engagement'
  switch (key) {
    case 'aje':
    case 'wtbOverrides':
      return AJE_EDIT;
    default:
      // wpState, risks, reviewNotes, noteThreads, timeEntries, taskState, logEntries,
      // diagnostics.v1, and per-module ams.v1.* keys — baseline auditor edit.
      return WP_EDIT;
  }
}
