/* ============================================================
   W6 Fase 1 — tRPC client (browser).
   Talks to the server through the Vite dev-proxy at /trpc (→ :5181).
   Plain JS, untyped: contexts.jsx is .jsx, outside the canon tsc gate.
   The whole app degrades gracefully when the server is absent — every
   caller swallows network errors and falls back to the localStorage cache.
   ============================================================ */
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { AMS } from './data';

/* ----- W7 Fase 2 / W10 — session transport -----
   W10 moved the session to an HttpOnly cookie set by the server on login: JavaScript can no
   longer read the token, so an XSS can't steal it from localStorage. The token is NO LONGER
   persisted client-side. We keep it in-memory for the current tab (sent as a Bearer header,
   belt-and-suspenders), but a reload relies purely on the cookie (credentials:'include' →
   browser replays it; auth.me restores the session). A 401 anywhere means the session died →
   broadcast so the boot gate falls back to the login screen. */
const LEGACY_TOKEN_KEY = 'ams.auth.token';
try { localStorage.removeItem(LEGACY_TOKEN_KEY); } catch (e) { /* private mode — nothing to clean */ }
let authToken = null; // in-memory only; intentionally not persisted (httpOnly cookie is the SSOT)

export function setAuthToken(t) { authToken = t || null; }
export function getAuthToken() { return authToken; }

function authFetch(input, init) {
  // credentials:'include' → the HttpOnly session cookie rides along (same-origin via Vite proxy).
  return fetch(input, { ...(init || {}), credentials: 'include' }).then(res => {
    if (res.status === 401) { try { window.dispatchEvent(new CustomEvent('ams:auth-expired')); } catch (e) {} }
    return res;
  });
}

export const api = createTRPCClient({
  links: [httpBatchLink({
    url: '/trpc',
    fetch: authFetch,
    headers() { return authToken ? { authorization: 'Bearer ' + authToken } : {}; },
  })],
});

/* True when a mutation lost an optimistic-concurrency race (server returned 409). */
export function isConflict(err) {
  const code = err && (err.data?.code || err.shape?.data?.code);
  const status = err && (err.data?.httpStatus || err.shape?.data?.httpStatus);
  return code === 'CONFLICT' || status === 409;
}

window.AMS_API = api;

/* ============================================================
   W8 — LLM proxy client. The real key lives on the server; these just call the
   authenticated proxy. Both degrade gracefully: status falls back to "not configured"
   if the server is absent, so the UI honestly shows deterministic-only.
   ============================================================ */
const SEV_OK = { high: 1, med: 1, low: 1 };

/** Server LLM status (configured? which provider/model? may this role use it?). */
export async function llmStatus() {
  try {
    return await api.llm.status.query();
  } catch (e) {
    return { configured: false, canUse: false, provider: null, model: null };
  }
}

/** Narrate deterministic diagnostic findings via the server proxy. Client also slims the
    payload to the allow-listed finding fields (defence in depth; the server re-redacts).
    Returns { status:'ok', text, provider, model, usage } | { status:'not-configured' }. */
export async function llmNarrateDiagnostics(findings) {
  const slim = (findings || []).map(f => ({
    id: String(f.id || ''),
    detector: f.detector ? String(f.detector) : undefined,
    sev: SEV_OK[f.sev] ? f.sev : 'low',
    std: f.std ? String(f.std) : undefined,
    title: String(f.title || ''),
    detail: f.detail ? String(f.detail) : undefined,
    suggestedProcedure: f.suggestedProcedure ? String(f.suggestedProcedure) : undefined,
  }));
  return api.llm.complete.mutate({ task: 'narrate-diagnostics', findings: slim });
}

Object.assign(window, { amsLlmStatus: llmStatus, amsLlmNarrateDiagnostics: llmNarrateDiagnostics });

/* ============================================================
   W10 — server-side append-only audit trail. The real, tamper-evident chain that replaces
   the client pseudo-hash demo. Both degrade gracefully: when the server is absent (or the
   role lacks AUDIT_VIEW), they return null so the UI can fall back to the local demo stream
   instead of erroring. Read-only — there is no client path to write or alter the chain.
   ============================================================ */

/** Recent audit-chain rows (newest first), or null when unavailable/forbidden. */
export async function auditList(limit) {
  try {
    return await api.audit.list.query(limit ? { limit } : undefined);
  } catch (e) {
    return null;
  }
}

/** Server-side chain integrity check → { ok, brokenAt, count }, or null when unavailable. */
export async function auditVerify() {
  try {
    return await api.audit.verify.query();
  } catch (e) {
    return null;
  }
}

Object.assign(window, { amsAuditList: auditList, amsAuditVerify: auditVerify });

/* ============================================================
   W10.5 — export seal + export-event logging. The artifact bytes are built client-side
   (export_pdf.js); these only ask the server to (a) sign a content hash into a verifiable
   provenance seal and (b) record the export to the audit chain. seal() may throw so the
   generator can degrade to an UNSEALED artifact when the server is down; verify/log swallow.
   ============================================================ */

/** Seal a content hash → { sealId, signature, pubKeyId, signedAt, … }. Throws on failure
    (caller degrades to unsealed). */
export async function exportSeal({ kind, contentHash, scope, scopeId }) {
  return api.exporter.seal.mutate({ kind, contentHash, scope, scopeId });
}

/** Verify a seal against a presented hash → result | null when unavailable. */
export async function exportVerifySeal({ sealId, contentHash }) {
  try { return await api.exporter.verifySeal.query({ sealId, contentHash }); } catch (e) { return null; }
}

/** Record an unsealed export to the audit chain (best-effort; null when unavailable). */
export async function exportLogEvent({ kind, format, scope, scopeId, contentHash }) {
  try { return await api.exporter.logEvent.mutate({ kind, format, scope, scopeId, contentHash }); } catch (e) { return null; }
}

Object.assign(window, { amsExportSeal: exportSeal, amsExportVerifySeal: exportVerifySeal, amsExportLogEvent: exportLogEvent });

/* ============================================================
   W9 — data connectors. The server owns connector definitions + the sync pipeline
   (pull→map→control-total gate→idempotent post→reconcile); these are the browser's
   read-model + sync trigger. Queries degrade gracefully (null when the server is
   absent or the role lacks INTEGRATION_VIEW) so the Integrasi tab falls back to the
   simulated blueprint; sync() throws so the UI can surface a real failure.
   ============================================================ */

/** Capability + rollup status (canView/canManage/total/connected/errored/wired), or null. */
export async function integrationStatus() {
  try { return await api.integration.status.query(); } catch (e) { return null; }
}

/** The server connector registry (no secrets), or null when unavailable/forbidden. */
export async function integrationList() {
  try { return await api.integration.list.query(); } catch (e) { return null; }
}

/** Sync-job history (optionally per connector), or null. */
export async function integrationJobs(connectorId) {
  try { return await api.integration.jobs.query(connectorId ? { connectorId } : undefined); } catch (e) { return null; }
}

/** Import↔consumption tie-out per wired connector → { bank:{posted,consumed,tied,…} }, or null. */
export async function integrationReconcile() {
  try { return await api.integration.reconcile.query(); } catch (e) { return null; }
}

/** Trigger a sync — server enforces INTEGRATION_MANAGE. Throws on failure (caller toasts). */
export async function integrationSync(connectorId) {
  return api.integration.sync.mutate({ connectorId });
}

Object.assign(window, {
  amsIntegrationStatus: integrationStatus, amsIntegrationList: integrationList,
  amsIntegrationJobs: integrationJobs, amsIntegrationReconcile: integrationReconcile,
  amsIntegrationSync: integrationSync,
});

/* ============================================================
   W6 Fase 3 — hydrate AMS core entities from the API at boot.
   The DB (seeded byte-identical to data.js) becomes the OPERATIVE source for
   FIRM/USER/CLIENTS/ENGAGEMENTS/WTB/TEAM; the data.js constants stay as the
   offline FALLBACK (already on the AMS singleton when this runs). Schema is lossless
   for all six (User via a dataJson envelope; the rest column-for-column), so the
   overwrite is zero numeric drift vs the W0 baseline.

   MUST run BEFORE the first React render (canon reads AMS.WTB lazily on
   first FIG/SRC access). On any failure we keep the fallback and let the app run.
   WTB is seeded only for the active engagement (ENG-2025-014, == DEFAULT_ENG_ID),
   matching today's single-WTB reality; other engagements return [] → fallback. ============================================================ */
export async function hydrateCoreFromApi(engagementId, userId) {
  if (!AMS) return false;
  const b = await api.bootstrap.query({ engagementId });
  if (!b) return false;

  if (b.firm) {
    AMS.FIRM = { ...AMS.FIRM, name: b.firm.name, short: b.firm.short, license: b.firm.license,
      partners: b.firm.partners, managers: b.firm.managers, staff: b.firm.staff };
  }
  // W7 — AMS.USER reflects the AUTHENTICATED user (so userScopeId / TopBar / sign-offs are
  // "who I logged in as"), falling back to users[0] when no id is given (pre-W7 behavior).
  const users = Array.isArray(b.users) ? b.users : [];
  const mine = (userId && users.find(u => u.id === userId)) || users[0];
  if (mine && mine.dataJson) { try { AMS.USER = JSON.parse(mine.dataJson); } catch (e) { /* keep fallback */ } }

  if (Array.isArray(b.clients) && b.clients.length) {
    AMS.CLIENTS = b.clients.map(c => ({ id: c.id, name: c.name, industry: c.industry, tier: c.tier,
      risk: c.risk, npwp: c.npwp, city: c.city, listed: c.listed, since: c.since,
      partner: c.partner, fee: c.fee, status: c.status }));
  }
  if (Array.isArray(b.engagements) && b.engagements.length) {
    AMS.ENGAGEMENTS = b.engagements.map(e => ({ id: e.id, clientId: e.clientId, type: e.type, fy: e.fy,
      standard: e.standard, status: e.status, phase: e.phase, progress: e.progress, partner: e.partner,
      manager: e.manager, deadline: e.deadline, budgetHrs: e.budgetHrs, actualHrs: e.actualHrs,
      risk: e.risk, materiality: e.materiality }));
  }
  if (Array.isArray(b.team) && b.team.length) {
    AMS.TEAM = b.team.map(t => ({ name: t.name, role: t.role, util: t.util }));
  }
  if (Array.isArray(b.wtb) && b.wtb.length) {
    // Reconstruct the runtime row shape (key + derived adj) the app/canon expect.
    AMS.WTB = b.wtb.map(w => ({ key: 'wtb' + w.ord, group: w.group, code: w.code, name: w.name,
      ly: w.ly, unadj: w.unadj, aje: w.aje, adj: w.unadj + w.aje, lead: w.lead }));
  }

  // WTB just changed identity → drop canon's lazy FIG/SRC memo so the next access
  // rebuilds from the hydrated trial balance (no-op if nothing accessed it yet).
  try { window.amsResetFigures && window.amsResetFigures(); } catch (e) {}
  return true;
}
window.amsHydrateCore = hydrateCoreFromApi;
