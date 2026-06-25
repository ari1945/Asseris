/* ============================================================
   Asseris — model data master AMS bertipe (W15)
   ------------------------------------------------------------
   Interface untuk koleksi bernilai-tinggi pada `window.AMS`/`export const AMS`
   (data SSOT yang dibaca lintas view & kanon). Permukaan numerik kanon
   (WTB/AJE/Figures/Fig/Materiality/FsModel) TETAP di `canon_types.ts` —
   berkas ini hanya koleksi domain non-kanon.

   Disiplin (D1 W15 = "model + boundary"): field enum-ish/teks-bebas
   diketik `string` (bukan union literal) agar cascade terkendali; field
   yang BENAR-BENAR bervariasi antar baris ditandai opsional. Ekor koleksi
   yang belum dimodelkan tetap lolos via index signature `[k:string]: unknown`
   di `AmsData` (lihat types/globals.d.ts).
   ============================================================ */

/* ---------- Entitas firma & pengguna (objek tunggal, core) ---------- */
export interface FirmInfo {
  name: string;
  short: string;
  license: string;
  partners: number;
  managers: number;
  staff: number;
}

export interface UserInfo {
  name: string;
  initials: string;
  role: string;
  title: string;
  email: string;
  phone: string;
  photo: string | null;
  employeeId: string;
  department: string;
  office: string;
  joinDate: string;
  reportsTo: string;
  apNumber: string;
  stan: string;
  iapiNumber: string;
  cpaSince: string;
  cpeHours: number;
  cpeTarget: number;
  languages: string;
}

/* ---------- Klien & perikatan ---------- */
export interface ClientRow {
  id: string;
  name: string;
  industry: string;
  tier: string;
  risk: string;
  npwp: string;
  city: string;
  listed: boolean;
  since: number;
  partner: string;
  fee: number;
  status: string;
  /** dilampirkan saat normalisasi runtime di beberapa alur. */
  clientId?: string;
}

export interface EngagementRow {
  id: string;
  clientId: string;
  type: string;
  fy: string;
  standard: string;
  status: string;
  phase: string;
  progress: number;
  partner: string;
  manager: string;
  deadline: string;
  budgetHrs: number;
  actualHrs: number;
  risk: string;
  materiality: number;
}

/* ---------- Penilaian risiko (RoMM register) ---------- */
export interface RiskRow {
  /** perikatan pemilik register (di-seed; mengaktifkan agregasi portofolio). */
  engagementId?: string;
  id: string;
  area: string;
  assertion: string;
  desc: string;
  likelihood: number;
  impact: number;
  inherent: string;
  fraud: boolean;
  assertionLvl: boolean;
  response: string;
  wp: string;
  proc: string;
  owner: string;
}

/* ---------- Tim perikatan ---------- */
export interface TeamMember {
  name: string;
  role: string;
  util: number;
}

/* ---------- Indeks kertas kerja (lead schedules) ---------- */
export interface WorkpaperRow {
  ref: string;
  title: string;
  status: string;
  preparer: string;
  reviewer: string;
}

/* ---------- Activity feed ---------- */
export interface ActivityItem {
  who: string;
  what: string;
  when: string;
  icon: string;
}

/* ---------- Deadlines ---------- */
export interface DeadlineRow {
  client: string;
  task: string;
  date: string;
  days: number;
  sev: string;
}

/* ---------- Review notes (coaching/review/EQR/query, lintas-modul) ---------- */
export interface ReviewNoteThreadEntry {
  author: string;
  /** response (preparer) | comment | clear (reviewer clearance) */
  kind: string;
  when: string;
  text: string;
}

export interface ReviewNote {
  /** P5 Fase 2: setiap catatan dimiliki engagement (di-seed via map). */
  engagementId: string;
  id: string;
  module: string;
  moduleLabel: string;
  /** review | coaching | eqr | query */
  type: string;
  ref: string;
  text: string;
  author: string;
  to: string;
  status: string;
  created: string;
  raised: string;
  /** ISO date target clear; null = tanpa SLA. */
  due: string | null;
  priority: string;
  thread: ReviewNoteThreadEntry[];
}

/* ---------- Time entries (timesheet) ---------- */
export interface TimeEntry {
  id: string;
  member: string;
  date: string;
  phase: string;
  task: string;
  hours: number;
}

/* ---------- Sales pipeline (opportunities) ---------- */
export interface PipelineOpp {
  id: string;
  name: string;
  service: string;
  stage: string;
  value: number;
  prob: number;
  owner: string;
  close: string;
  industry: string;
}

/* ---------- Invoices (piutang firma) ---------- */
export interface InvoiceRow {
  id: string;
  clientId: string;
  client: string;
  eng: string;
  issued: string;
  due: string;
  amount: number;
  paid: number;
  status: string;
  milestone: string;
}

/* ---------- Staff (HCM) ---------- */
export interface StaffRow {
  id: string;
  name: string;
  role: string;
  grade: string;
  cert: string;
  joined: number;
  util: number;
  status: string;
  email: string;
  engagements: number;
  rating: number;
}
