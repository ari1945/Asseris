import { loadAmsSeed } from './seedData';
import { CAP, can } from './rbac';

/* ============================================================
   2026-07-01 — PRD Restrukturisasi Navigasi & Beranda Berbasis Peran, Fase 3.
   2026-07-05 — PRD Isolasi Data Personal (Privacy): diperluas jadi BERJENJANG
   (self → unit → firm) + kategori-cap granular + fallback ke SEED ter-filter.

   `state.get` (router.ts) is document-granular: it returns the WHOLE StateDoc blob to
   any authenticated caller who may read that scope. That's wrong for documents that are a
   COLLECTION of PERSONAL records (payroll, leave, performance, CPE, sanctions, ethics,
   independence, profile/PII). `personal.get` is the row-filtered read path for exactly
   these keys — state.get's contract is untouched for every other key.

   Akses "melihat baris orang lain" ditentukan DUA SUMBU:
     • KATEGORI (payroll/leave/perf/cpe/conduct/indep/profile) — data apa.
     • CAKUPAN  (self default · unit · firm) — populasi mana, via kapabilitas RBAC
       `personal.<kategori>.viewUnit|viewFirm` (rbac.ts). `viewFirm ⊇ viewUnit ⊇ self`.
   Jalur baca ini TAK lagi memeriksa HR_MANAGE/FIRM_ADMIN (decoupling privasi) — hanya
   cap personal di atas. Tulis TETAP di-gate capForWrite (HR_MANAGE) — lihat rbac.ts.
   ============================================================ */

type ArrayShape = { mode: 'array'; field: string };
type ObjectShape = { mode: 'object' };
export type PersonalShape = ArrayShape | ObjectShape;

/** field/mode = where the EMP-xxx owner id lives in the document (verified against the actual
 * seed shapes in migration/src/data_part1.ts, data_part2.ts, data_people.ts — NOT guessed;
 * 'object' mode = the object KEY is the owner id). Keep in sync with PERSONAL_STATE_KEYS in
 * migration/src/contexts.tsx and with SEED_FOR_KEY below. */
export const PERSONAL_KEYS: Record<string, PersonalShape> = {
  payrollData: { mode: 'object' }, // AMS.PAYROLL — { [empId]: {gross,allowance,...} }
  leaveReqs: { mode: 'array', field: 'emp' }, // AMS.LEAVE_REQUESTS
  leaveBalance: { mode: 'object' }, // AMS.LEAVE_BALANCE — { [empId]: {ent,used,carry} }
  perfPeople: { mode: 'object' }, // AMS.PERF_CYCLE.people — { [empId]: {...} }
  perfGoals: { mode: 'object' }, // AMS.PERF_CYCLE.goals — { [empId]: [...] }
  cpeExtra: { mode: 'object' }, // manual SKP log additions — { [empId]: [...] }
  cpeLog: { mode: 'object' }, // AMS.CPE_LOG — { [empId]: [...] } (kredit SKP dasar)
  independence: { mode: 'array', field: 'id' }, // AMS.INDEPENDENCE
  indepAppr: { mode: 'object' }, // per-person approval trail — { [empId]: n }
  indepThreats: { mode: 'array', field: 'personId' }, // derived from INDEPENDENCE conflicts
  indepRotAck: { mode: 'object' }, // rotation acknowledgement — { [empId]: {...} }
  'pc.ethics': { mode: 'object' }, // AMS.ETHICS_DECL — { [empId]: {signed,...} }
  'pc.gifts': { mode: 'array', field: 'staff' }, // AMS.GIFTS_REGISTER
  hrCases: { mode: 'array', field: 'staff' }, // AMS.HR_CASES — sanksi/disiplin
  amlScreening: { mode: 'array', field: 'id' }, // AMS.AML_SCREENING
  staffProfile: { mode: 'object' }, // AMS.STAFF_PROFILE — PII (NIK, NPWP, kontak darurat)
};

/** key → kategori (menentukan pasangan cap unit/firm yang menggerbanginya). */
const KEY_CATEGORY: Record<string, string> = {
  payrollData: 'payroll',
  leaveReqs: 'leave', leaveBalance: 'leave',
  perfPeople: 'perf', perfGoals: 'perf',
  cpeExtra: 'cpe', cpeLog: 'cpe',
  'pc.ethics': 'conduct', 'pc.gifts': 'conduct', hrCases: 'conduct', amlScreening: 'conduct',
  independence: 'indep', indepAppr: 'indep', indepThreats: 'indep', indepRotAck: 'indep',
  staffProfile: 'profile',
};

/** kategori → { unit cap, firm cap }. */
const CATEGORY_CAP: Record<string, { unit: string; firm: string }> = {
  payroll: { unit: CAP.PERSONAL_PAYROLL_VIEW_UNIT, firm: CAP.PERSONAL_PAYROLL_VIEW_FIRM },
  leave: { unit: CAP.PERSONAL_LEAVE_VIEW_UNIT, firm: CAP.PERSONAL_LEAVE_VIEW_FIRM },
  perf: { unit: CAP.PERSONAL_PERF_VIEW_UNIT, firm: CAP.PERSONAL_PERF_VIEW_FIRM },
  cpe: { unit: CAP.PERSONAL_CPE_VIEW_UNIT, firm: CAP.PERSONAL_CPE_VIEW_FIRM },
  conduct: { unit: CAP.PERSONAL_CONDUCT_VIEW_UNIT, firm: CAP.PERSONAL_CONDUCT_VIEW_FIRM },
  indep: { unit: CAP.PERSONAL_INDEP_VIEW_UNIT, firm: CAP.PERSONAL_INDEP_VIEW_FIRM },
  profile: { unit: CAP.PERSONAL_PROFILE_VIEW_UNIT, firm: CAP.PERSONAL_PROFILE_VIEW_FIRM },
};

/* ---- seed cache (AMS master) ---- */
type Ams = Record<string, any>;
let amsCache: Promise<Ams> | null = null;
function loadAms(): Promise<Ams> {
  if (!amsCache) amsCache = loadAmsSeed().then((a) => a as unknown as Ams);
  return amsCache;
}

type StaffRow = { id: string; email?: string; name?: string; unit?: string };
async function loadStaff(): Promise<StaffRow[]> {
  const ams = await loadAms();
  // STAFF (audit roster) ∪ FIRM_STAFF (pegawai firm-ops Admin&HR/Finance) — keduanya karyawan KAP
  // dengan data personal sendiri, jadi resolveEmpId harus memetakan keduanya (2026-07-06).
  return [...((ams.STAFF as StaffRow[]) || []), ...((ams.FIRM_STAFF as StaffRow[]) || [])];
}

/** Server-side mirror of migration/src/ethics_compliance.ts `resolveEmpId` — maps the session
 * user (email, fallback name) to their EMP-xxx id via the seeded STAFF roster. Returns null for
 * accounts with no STAFF row (firm-ops personas own no personal record; fail-closed). */
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

/** Himpunan empId "rumah tangga" seorang partner (untuk cakupan .viewUnit). OQ5 = KEDUANYA:
 * pakai unit EKSPLISIT (STAFF.unit + AMS.UNITS[].lead) bila partner memimpin sebuah unit; jika
 * tidak, FALLBACK ke subtree reports-to (AMS.ORG). Selalu menyertakan dirinya sendiri. */
export async function unitSubtree(user: { email?: string | null; name?: string | null } | null | undefined): Promise<Set<string>> {
  const empId = await resolveEmpId(user);
  const out = new Set<string>();
  if (!empId) return out;
  out.add(empId);
  const ams = await loadAms();
  const staff = await loadStaff();
  // (a) eksplisit — unit yang dipimpin empId
  const units = (ams.UNITS as Record<string, { name?: string; lead?: string }>) || {};
  const ledUnitIds = Object.keys(units).filter((uid) => units[uid] && units[uid].lead === empId);
  if (ledUnitIds.length) {
    const led = new Set(ledUnitIds);
    for (const s of staff) if (s.unit && led.has(s.unit)) out.add(s.id);
    return out;
  }
  // (b) fallback — subtree reports-to di AMS.ORG (semua yang rantai atasannya bermuara ke empId)
  const org = (ams.ORG as Record<string, { reports?: string | null }>) || {};
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Object.keys(org)) {
      if (out.has(id)) continue;
      const reports = org[id] && org[id].reports;
      if (reports && out.has(reports)) { out.add(id); changed = true; }
    }
  }
  return out;
}

/** Populasi empId yang boleh dilihat caller untuk sebuah key personal:
 *  'all' (cakupan firm) · Set<empId> unit · Set<empId sendiri> (self, default). */
export async function personalPopulation(
  user: { role: string; email?: string | null; name?: string | null },
  key: string,
): Promise<'all' | Set<string>> {
  const cat = KEY_CATEGORY[key];
  const caps = cat ? CATEGORY_CAP[cat] : undefined;
  if (caps && can(user.role, caps.firm)) return 'all';
  if (caps && can(user.role, caps.unit)) return await unitSubtree(user);
  const empId = await resolveEmpId(user);
  return new Set(empId ? [empId] : []); // self-only; non-staf tanpa cap → kosong (fail-closed)
}

/** Filter dokumen personal ke baris yang dimiliki `population` ('all' = tak difilter). */
export function filterPersonalByPopulation(key: string, value: unknown, population: 'all' | Set<string>): unknown {
  if (population === 'all') return value;
  const shape = PERSONAL_KEYS[key];
  if (!shape) return value; // unreachable — router gates on PERSONAL_KEYS first
  if (value == null) return shape.mode === 'array' ? [] : {};
  if (shape.mode === 'array') {
    if (!Array.isArray(value)) return [];
    return (value as Array<Record<string, unknown>>).filter((row) => row && population.has(row[shape.field] as string));
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(obj)) if (population.has(k)) out[k] = obj[k];
  return out;
}

/** Nilai SEED (dari AMS master) untuk sebuah key personal — dipakai sebagai fallback saat belum
 * ada StateDoc, agar isolasi tetap berlaku di DB yang baru di-seed (menutup lubang version-0).
 * Bentuk HARUS cocok dengan PERSONAL_KEYS[key].mode. */
export async function seedForKey(key: string): Promise<unknown> {
  const ams = await loadAms();
  switch (key) {
    case 'payrollData': return ams.PAYROLL || {};
    case 'leaveReqs': return ams.LEAVE_REQUESTS || [];
    case 'leaveBalance': return ams.LEAVE_BALANCE || {};
    case 'perfPeople': return (ams.PERF_CYCLE && ams.PERF_CYCLE.people) || {};
    case 'perfGoals': return (ams.PERF_CYCLE && ams.PERF_CYCLE.goals) || {};
    case 'cpeExtra': return {};
    case 'cpeLog': return ams.CPE_LOG || {};
    case 'independence': return ams.INDEPENDENCE || [];
    case 'indepAppr': return {};
    case 'indepThreats': return seedIndepThreats((ams.INDEPENDENCE as Array<{ id: string; conflicts: number; finInterest: string }>) || []);
    case 'indepRotAck': return {};
    case 'pc.ethics': return ams.ETHICS_DECL || {};
    case 'pc.gifts': return ams.GIFTS_REGISTER || [];
    case 'hrCases': return ams.HR_CASES || [];
    case 'amlScreening': return ams.AML_SCREENING || [];
    case 'staffProfile': return ams.STAFF_PROFILE || {};
    default: {
      const shape = PERSONAL_KEYS[key];
      return shape && shape.mode === 'array' ? [] : {};
    }
  }
}

/** Server-side mirror of view_people.tsx `seedIndepThreats` — keeps the derived-key fallback
 * identical to the client's initializer so a fresh DB renders the same threat rows. */
function seedIndepThreats(rows: Array<{ id: string; conflicts: number; finInterest: string }>): Array<Record<string, unknown>> {
  return rows.filter((r) => r.conflicts > 0).map((r) => ({
    id: 'TH-' + r.id, personId: r.id, type: 'Kedekatan', desc: r.finInterest,
    severity: 'Sedang', safeguard: 'Pengamanan diterapkan & didokumentasikan (telaah independen).',
    status: 'Dimitigasi', by: '', at: '',
  }));
}
