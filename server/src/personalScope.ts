import { loadAmsSeed } from './seedData';

/* ============================================================
   2026-07-01 — PRD Restrukturisasi Navigasi & Beranda Berbasis Peran, Fase 3.

   `state.get` (router.ts) is document-granular: it returns the WHOLE StateDoc blob to
   any authenticated caller who may read that scope. That's fine for roster/working-paper
   documents, but wrong for documents that are actually a COLLECTION of PERSONAL records
   (payroll, leave, performance, CPE log, independence/ethics declarations, gifts) — a
   capability gate on WRITE never stopped a caller who can merely READ that scope from
   reading every OTHER person's row too.

   PERSONAL_KEYS below is the closed set of (scope='firm') keys that hold personal
   records, plus enough shape info to filter them to one person's row. `personal.get`
   (router.ts) is the row-filtered read path for exactly these keys — state.get's
   contract is untouched for every other key.
   ============================================================ */

type ArrayShape = { mode: 'array'; field: string };
type ObjectShape = { mode: 'object' };
export type PersonalShape = ArrayShape | ObjectShape;

/** field/mode = where the EMP-xxx owner id lives in the document (verified against the
 * actual seed shapes in migration/src/data_part1.ts, data_part2.ts, data_people.ts —
 * NOT guessed; 'object' mode = the object KEY is the owner id). */
export const PERSONAL_KEYS: Record<string, PersonalShape> = {
  payrollData: { mode: 'object' }, // AMS.PAYROLL — { [empId]: {gross,allowance,...} }
  leaveReqs: { mode: 'array', field: 'emp' }, // AMS.LEAVE_REQUESTS
  perfPeople: { mode: 'object' }, // AMS.PERF_CYCLE.people — { [empId]: {...} }
  cpeExtra: { mode: 'object' }, // manual SKP log additions — { [empId]: [...] }
  independence: { mode: 'array', field: 'id' }, // AMS.INDEPENDENCE
  indepAppr: { mode: 'object' }, // per-person approval trail — { [empId]: n }
  indepThreats: { mode: 'array', field: 'personId' }, // derived from INDEPENDENCE conflicts
  indepRotAck: { mode: 'object' }, // rotation acknowledgement — { [empId]: {...} }
  'pc.ethics': { mode: 'object' }, // AMS.ETHICS_DECL — { [empId]: {signed,...} }
  'pc.gifts': { mode: 'array', field: 'staff' }, // AMS.GIFTS_REGISTER
};

type StaffRow = { id: string; email?: string; name?: string };
let staffCache: Promise<StaffRow[]> | null = null;
async function loadStaff(): Promise<StaffRow[]> {
  if (!staffCache) {
    staffCache = loadAmsSeed().then(
      (ams) => ((ams as unknown as { STAFF?: StaffRow[] }).STAFF) || [],
    );
  }
  return staffCache;
}

/** Server-side mirror of migration/src/ethics_compliance.ts `resolveEmpId` — maps the
 * session user (email, fallback name) to their EMP-xxx id via the seeded STAFF roster.
 * Returns null for accounts with no STAFF row — by design, the 2 firm-ops personas
 * ('Admin & HR Firma' / 'Finance Firma', see rbac.ts ROLES comment) aren't audit staff
 * and own no personal record here; they read via HR_MANAGE (full), never via empId. */
export async function resolveEmpId(
  user: { email?: string | null; name?: string | null } | null | undefined,
): Promise<string | null> {
  if (!user) return null;
  const staff = await loadStaff();
  const email = (user.email || '').toLowerCase();
  if (email) {
    const byEmail = staff.find((s) => (s.email || '').toLowerCase() === email);
    if (byEmail) return byEmail.id;
  }
  const name = (user.name || '').trim().toLowerCase();
  if (name) {
    const byName = staff.find((s) => (s.name || '').trim().toLowerCase() === name);
    if (byName) return byName.id;
  }
  return null;
}

/** Filter a personal-scoped document down to the row(s) owned by `empId`. `full=true`
 * (caller holds HR_MANAGE/FIRM_ADMIN) returns the document untouched. `empId=null` with
 * `full=false` (no STAFF match — e.g. a firm-ops persona) sees nothing, not everything:
 * fail-closed, not fail-open. */
export function filterPersonal(key: string, value: unknown, empId: string | null, full: boolean): unknown {
  if (full) return value;
  const shape = PERSONAL_KEYS[key];
  if (!shape) return value; // unreachable in practice — router gates on PERSONAL_KEYS first
  if (!empId) return shape.mode === 'array' ? [] : {};
  if (value == null) return shape.mode === 'array' ? [] : {};
  if (shape.mode === 'array') {
    if (!Array.isArray(value)) return [];
    return (value as Array<Record<string, unknown>>).filter((row) => row && row[shape.field] === empId);
  }
  const obj = value as Record<string, unknown>;
  return Object.prototype.hasOwnProperty.call(obj, empId) ? { [empId]: obj[empId] } : {};
}
