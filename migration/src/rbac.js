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
};

const { WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, OPINION_APPROVE, FIRMFIN_EDIT, ENGAGEMENT_MANAGE, FIRM_ADMIN, LLM_USE } = CAP;

/* role → granted capabilities. Mirrors PERM_MATRIX 'edit' cells:
   WP:[P,M,S,J] · Signoff:[P,M] · AJE:[P,M,S] · Opini:[P] · FirmFin:[P] · FirmAdmin:[P]
   ENGAGEMENT_MANAGE (roster) follows ROLE_CAPS ("edit: Engagement & WP" for Manager).
   LLM_USE granted to ALL four roles (W8 Q5) — narasi = bantuan baca, bukan aksi istimewa;
   biaya/abuse dijaga rate-limit + audit, bukan RBAC. The gate still denies by default, so
   unknown/future roles get FORBIDDEN. */
const GRANTS = {
  'Engagement Partner': [WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, OPINION_APPROVE, FIRMFIN_EDIT, ENGAGEMENT_MANAGE, FIRM_ADMIN, LLM_USE],
  'Audit Manager': [WP_EDIT, AJE_EDIT, SIGNOFF_REVIEWER, ENGAGEMENT_MANAGE, LLM_USE],
  'Senior Auditor': [WP_EDIT, AJE_EDIT, LLM_USE],
  'Junior Auditor': [WP_EDIT, LLM_USE],
};

/** True if `role` is granted `cap`. Unknown role/cap → false (deny by default). */
export function can(role, cap) {
  const grants = GRANTS[role];
  return Array.isArray(grants) && grants.includes(cap);
}

/* (scope, key) → capability required to WRITE that StateDoc. The W6 store is one doc
   per key, so enforcement is at document granularity (finer intra-doc gating — e.g.
   the opinion sign-off living inside wpState — is the UI's job via can(), and a future
   finer endpoint). null = no capability needed beyond being authenticated (and, for the
   user scope, being the owner — enforced separately on the server). */
export function capForWrite(scope, key) {
  if (scope === 'user') return null; // own profile/prefs — ownership checked server-side
  if (scope === 'firm') {
    return key === 'clients' || key === 'engagements' ? ENGAGEMENT_MANAGE : FIRM_ADMIN;
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
