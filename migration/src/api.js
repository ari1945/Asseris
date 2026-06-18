/* ============================================================
   W6 Fase 1 — tRPC client (browser).
   Talks to the server through the Vite dev-proxy at /trpc (→ :5181).
   Plain JS, untyped: contexts.jsx is .jsx, outside the canon tsc gate.
   The whole app degrades gracefully when the server is absent — every
   caller swallows network errors and falls back to the localStorage cache.
   ============================================================ */
import { createTRPCClient, httpBatchLink } from '@trpc/client';

export const api = createTRPCClient({
  links: [httpBatchLink({ url: '/trpc' })],
});

/* True when a mutation lost an optimistic-concurrency race (server returned 409). */
export function isConflict(err) {
  const code = err && (err.data?.code || err.shape?.data?.code);
  const status = err && (err.data?.httpStatus || err.shape?.data?.httpStatus);
  return code === 'CONFLICT' || status === 409;
}

window.AMS_API = api;

/* ============================================================
   W6 Fase 3 — hydrate window.AMS core entities from the API at boot.
   The DB (seeded byte-identical to data.js) becomes the OPERATIVE source for
   FIRM/USER/CLIENTS/ENGAGEMENTS/WTB/TEAM; the data.js constants stay as the
   offline FALLBACK (already on window.AMS when this runs). Schema is lossless
   for all six (User via a dataJson envelope; the rest column-for-column), so the
   overwrite is zero numeric drift vs the W0 baseline.

   MUST run BEFORE the first React render (canon reads window.AMS.WTB lazily on
   first FIG/SRC access). On any failure we keep the fallback and let the app run.
   WTB is seeded only for the active engagement (ENG-2025-014, == DEFAULT_ENG_ID),
   matching today's single-WTB reality; other engagements return [] → fallback. ============================================================ */
export async function hydrateCoreFromApi(engagementId) {
  const AMS = window.AMS;
  if (!AMS) return false;
  const b = await api.bootstrap.query({ engagementId });
  if (!b) return false;

  if (b.firm) {
    AMS.FIRM = { ...AMS.FIRM, name: b.firm.name, short: b.firm.short, license: b.firm.license,
      partners: b.firm.partners, managers: b.firm.managers, staff: b.firm.staff };
  }
  const u0 = Array.isArray(b.users) && b.users[0];
  if (u0 && u0.dataJson) { try { AMS.USER = JSON.parse(u0.dataJson); } catch (e) { /* keep fallback */ } }

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
