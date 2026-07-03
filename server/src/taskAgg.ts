import { loadAmsSeed } from './seedData';

/* ============================================================
   2026-07-01 — PRD "Restrukturisasi Navigasi & Beranda Berbasis Peran", Fase 4.

   `tasks.mine` (router.ts) is the cross-engagement task aggregator that feeds the
   role-based Beranda (Fase 5). The legacy client hook `useMyTasks`
   (migration/src/view_mytasks_parts.tsx) only ever derives tasks from ONE engagement —
   the single `activeEngagementId` currently hydrated. A user who is a member of two
   engagements (e.g. Dimas — ENG-2025-014 & ENG-2025-031) never sees both their
   workloads in one place.

   This module holds the PURE derivation helpers; the router owns the isolation gate.
   The security invariant: aggregation NEVER widens read access. It iterates exactly the
   engagements `accessibleEngagementIds` (W7.5) already grants, and each per-engagement
   read is a normal StateDoc read for a scope the caller may see. A non-member therefore
   never receives another engagement's review-note tasks — proven by the negative tests
   in __tests__/task_agg.test.ts (mirrors personal_scope + engagement_isolation).

   Sources (exactly the three the PRD names — review-notes/WP-assignment/deadline):
     · Review notes  — per-engagement StateDoc `reviewNotes` (seed fallback). The ONLY
                       genuinely per-engagement, ownership-tagged source (`to` = short
                       name); this is what makes the aggregation meaningful + isolation-
                       testable. Filtered to open notes addressed to the caller.
     · WP assignment — firm-global WORKPAPERS seed (no per-engagement scoping exists in
                       the data model today), self-scoped by preparer/reviewer = caller.
     · Deadlines     — firm-global DEADLINES seed, scoped to the clients of the caller's
                       accessible engagements (oversight → all), so even this firm-wide
                       source stays isolation-consistent.
   ============================================================ */

export type MineTaskSource = 'Review Note' | 'Siapkan WP' | 'Reviu WP' | 'Deadline';

export interface MineTask {
  id: string; // globally unique across engagements (engId-prefixed for per-engagement sources)
  src: MineTaskSource;
  label: string;
  route: string;
  priority: 'high' | 'medium' | 'low';
  engagementId: string | null; // null = firm-global source (WP assignment / deadline)
  engagementLabel: string | null; // client short label for the Beranda grouping
  wpRef?: string;
  from?: string; // note author
  raised?: string; // ISO date the note was raised (review notes)
  due?: string; // ISO date the note should clear by (review notes)
}

/* Server mirror of migration/src/contexts.tsx `amsShortName`: the session carries the
   FULL name ('Dimas Raharjo'); work data (REVIEW_NOTES.to, WORKPAPERS.preparer/reviewer)
   uses the SHORT form ('Dimas R.'). Normalise full→short so ownership matches the real
   session user, not a hardcoded string. Idempotent on already-short names. */
export function amsShortName(full: unknown): string {
  if (!full || typeof full !== 'string') return '';
  const clean = full.replace(/,.*$/, '').trim(); // drop credentials (", CPA")
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return clean;
  const last = parts[parts.length - 1];
  if (/^[A-Z]\.?$/.test(last)) return clean; // already "Name X." → leave as-is
  return `${parts[0]} ${last[0].toUpperCase()}.`;
}

/* Server mirror of migration/src/contexts.tsx `notesForEngagement`. The client seeds
   EVERY engagement's `reviewNotes` doc from the same full D.REVIEW_NOTES array (all
   ENG-2025-014-tagged) and only filters by engagementId at READ time. Applying the same
   filter here is what stops ENG-014's notes from bleeding into a second engagement's
   aggregation. Legacy notes without an engagementId still surface (nothing is lost). */
function notesForEngagement<T extends { engagementId?: unknown }>(notes: unknown, engId: string): T[] {
  if (!Array.isArray(notes)) return [];
  return (notes as T[]).filter((n) => n.engagementId === engId || n.engagementId == null);
}

type ReviewNote = {
  id: string;
  engagementId?: string;
  module?: string;
  text?: string;
  author?: string;
  to?: string;
  status?: string;
  priority?: MineTask['priority'];
  raised?: string;
  due?: string;
};

type Workpaper = { ref: string; title?: string; status?: string; preparer?: string; reviewer?: string };
type Deadline = { client?: string; task?: string; sev?: string; days?: number };

export interface TaskSeed {
  reviewNotes: ReviewNote[];
  workpapers: Workpaper[];
  deadlines: Deadline[];
}

let seedCache: Promise<TaskSeed> | null = null;
export async function loadTaskSeed(): Promise<TaskSeed> {
  if (!seedCache) {
    seedCache = loadAmsSeed().then((ams) => {
      const a = ams as unknown as { REVIEW_NOTES?: ReviewNote[]; WORKPAPERS?: Workpaper[]; DEADLINES?: Deadline[] };
      return {
        reviewNotes: a.REVIEW_NOTES || [],
        workpapers: a.WORKPAPERS || [],
        deadlines: a.DEADLINES || [],
      };
    });
  }
  return seedCache;
}

/** Open review notes addressed to `me` within one engagement → tasks tagged with it.
 * `notesRaw` is the raw StateDoc value (or seed fallback); filtered by engagement first
 * (see notesForEngagement) so a seed-bled doc can't duplicate another engagement's notes. */
export function deriveReviewNoteTasks(
  engId: string,
  engLabel: string | null,
  notesRaw: unknown,
  me: string,
): MineTask[] {
  return notesForEngagement<ReviewNote>(notesRaw, engId)
    .filter((n) => n.status === 'open' && n.to === me)
    .map((n) => ({
      id: `rn-${engId}-${n.id}`,
      src: 'Review Note' as const,
      label: n.text || '',
      route: n.module || 'workpapers',
      priority: n.priority || 'medium',
      engagementId: engId,
      engagementLabel: engLabel,
      from: n.author,
      raised: n.raised,
      due: n.due,
    }));
}

/** Firm-global WP assignments self-scoped to `me` (preparer of an unfinished WP, or
 * reviewer of a WP awaiting review) — mirrors the legacy My Tasks WP-assignment rule. */
export function deriveWpAssignmentTasks(workpapers: Workpaper[], me: string): MineTask[] {
  const out: MineTask[] = [];
  for (const w of workpapers) {
    if (w.preparer === me && w.status !== 'Reviewed') {
      out.push({
        id: `wp-prep-${w.ref}`,
        src: 'Siapkan WP',
        label: `Siapkan WP ${w.ref} — ${w.title || ''}`.trim(),
        route: 'workpapers',
        priority: w.status === 'In Review' ? 'low' : 'medium',
        engagementId: null,
        engagementLabel: null,
        wpRef: w.ref,
      });
    }
    if (w.reviewer === me && w.status === 'In Review') {
      out.push({
        id: `wp-rev-${w.ref}`,
        src: 'Reviu WP',
        label: `Reviu WP ${w.ref} — ${w.title || ''}`.trim(),
        route: 'workpapers',
        priority: 'high',
        engagementId: null,
        engagementLabel: null,
        wpRef: w.ref,
      });
    }
  }
  return out;
}

/** Firm deadlines scoped to the caller's reachable clients (`'all'` for oversight). Keeps
 * a firm-wide source from surfacing a client the caller has no engagement with.
 * `clientEngagementId` (optional — router has the accessible-engagement list, this module
 * doesn't) resolves a client name to ONE of its engagement ids so the Beranda "Tugas Saya"
 * click can open the right cockpit instead of whatever engagement happens to be active. A
 * client with more than one engagement gets a best-effort pick, not a hard guarantee — this
 * is a navigation convenience, not an isolation boundary. */
export function deriveDeadlineTasks(
  deadlines: Deadline[],
  clientNames: 'all' | Set<string>,
  clientEngagementId?: (client: string) => string | null,
): MineTask[] {
  const sevPrio = (sev?: string): MineTask['priority'] => (sev === 'red' ? 'high' : sev === 'amber' ? 'medium' : 'low');
  return deadlines
    .filter((d) => clientNames === 'all' || (d.client != null && clientNames.has(d.client)))
    .map((d, i) => ({
      id: `dl-${i}`,
      src: 'Deadline' as const,
      label: `${d.task || ''} — ${d.client || ''}`,
      route: 'cockpit',
      priority: sevPrio(d.sev),
      engagementId: (d.client && clientEngagementId ? clientEngagementId(d.client) : null) ?? null,
      engagementLabel: d.client || null,
    }));
}
