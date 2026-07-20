/* ============================================================
   Asseris — Derivasi Kapasitas (Fase 4 · PR-A1)   [PURE, ESM]
   ------------------------------------------------------------
   SSOT: kapasitas MINGGU-BERJALAN diturunkan dari `schedule`
   (booking nyata & tersimpan, key 'schedule' — sama yang dibaca
   Resource Scheduler). Proyeksi minggu KE DEPAN = capacityPlan.v1
   (firm-scope, editable). Minggu-berjalan TAK PERNAH disimpan di
   plan → mustahil lahir model kapasitas tandingan (Aturan Emas
   SSOT; menutup gap "dua model kapasitas terputus", eval 2026-07-19
   Kelas G).

   Helper ini PURE (tak menyentuh AMS_CANON) — sejalan pola
   canon_assertions.ts. Konsumen: view_capacity, view_dashboard2,
   view_scheduler (util minggu-berjalan), view_isqm_parts (soqmPull
   QR-02 utilisasi senior).
   ============================================================ */

export const CAP_GRADES = ['Partner', 'Manager', 'Senior', 'Junior'] as const;
export type CapGrade = typeof CAP_GRADES[number];

/* Bentuk struktural minimal (hindari :any — ratchet no-explicit-any). */
export interface SchedAlloc { eng: string; client: string; hrs: number; color?: string }
export interface SchedMember { member: string; role: string; capacity: number; alloc: SchedAlloc[] }
export interface GradeSeries { grade: string; supply: number[]; demand: number[] }
export interface StaffSeries { name: string; grade: string; forecast: number[]; leave?: boolean }
/* Rencana KE-DEPAN saja (minggu 1..N). Minggu-0 sengaja absen. */
export interface CapacityPlan { weeks: string[]; grades: GradeSeries[]; staff: StaffSeries[]; updatedBy?: string; updatedAt?: string }
/* Bentuk seed AMS.CAPACITY (8 minggu penuh) — sumber default plan. */
export interface CapacitySeed { weeks: string[]; grades: GradeSeries[]; staff: StaffSeries[] }
export interface PipelineRaw { id?: string; name: string; service: string; stage?: string; value?: number; prob: number; close?: string }
export interface PipelineDemand { name: string; service: string; start: string; hrs: number; prob: number }
export interface CapacityModel { weeks: string[]; grades: GradeSeries[]; staff: StaffSeries[]; pipeline: PipelineDemand[] }

const GRADE_LIST: readonly string[] = CAP_GRADES;
const bareName = (n: string): string => (n || '').split(',')[0].trim();
const asGrade = (role: string): string => (GRADE_LIST.includes(role) ? role : 'Junior');
const sum = (xs: number[]): number => xs.reduce((a, b) => a + b, 0);

/* ── Minggu-berjalan: DITURUNKAN dari schedule ──────────────────
   supply per grade  = Σ kapasitas kotor anggota grade tsb (mis. 40h/mgg)
   demand per grade  = Σ jam ter-booking (alloc.hrs)
   forecast per orang = jam ter-booking / kapasitas × 100 (identik rumus
                        Resource Scheduler → satu angka lintas modul).            */
export function currentWeekFromSchedule(
  schedule: SchedMember[],
  leaveOf?: (bareName: string) => boolean,
): { grades: GradeSeries[]; staff: StaffSeries[] } {
  const supply: Record<string, number> = {};
  const demand: Record<string, number> = {};
  for (const g of CAP_GRADES) { supply[g] = 0; demand[g] = 0; }
  const staff: StaffSeries[] = [];
  for (const m of schedule) {
    const grade = asGrade(m.role);
    const used = sum(m.alloc.map((a) => a.hrs || 0));
    supply[grade] += m.capacity || 0;
    demand[grade] += used;
    const nm = bareName(m.member);
    staff.push({
      name: nm,
      grade,
      forecast: [m.capacity ? Math.round((used / m.capacity) * 100) : 0],
      leave: leaveOf ? leaveOf(nm) : false,
    });
  }
  const grades: GradeSeries[] = CAP_GRADES.map((g) => ({ grade: g, supply: [supply[g]], demand: [demand[g]] }));
  return { grades, staff };
}

/* ── Seed rencana KE-DEPAN dari CAPACITY (buang minggu-0) ────────
   Dipakai sebagai default useAmsPersist('capacityPlan.v1'). Minggu-0
   dijatuhkan karena runtime menurunkannya dari schedule.               */
export function seedForwardPlan(cap: CapacitySeed): CapacityPlan {
  return {
    weeks: cap.weeks.slice(1),
    grades: cap.grades.map((g) => ({ grade: g.grade, supply: g.supply.slice(1), demand: g.demand.slice(1) })),
    staff: cap.staff.map((s) => ({ name: bareName(s.name), grade: s.grade, forecast: s.forecast.slice(1), leave: s.leave })),
  };
}

/* ── Demand pipeline (heuristik) ────────────────────────────────
   pipeline nyata (view_pipeline) TAK punya jam/tgl-mulai. Estimasi
   jam/minggu = value / rate-blended / durasi-rerata. KONSTAN tunable;
   ini asumsi PERENCANAAN kasar (bukan angka aktual). Stage 'Lost'
   (kalah) & 'Won' (sudah diperoleh → ada di delivery) dikecualikan.    */
export const CAP_BLENDED_RATE = 800_000;   /* Rp/jam charge-out blended */
export const CAP_EST_WEEKS = 24;           /* durasi rerata perikatan (minggu) */
export function pipelineDemand(pipeline: PipelineRaw[]): PipelineDemand[] {
  const skip = new Set(['lost', 'won']);
  return pipeline
    .filter((p) => !skip.has((p.stage || '').toLowerCase()) && (p.prob || 0) > 0 && (p.value || 0) > 0)
    .map((p) => ({
      name: p.name,
      service: p.service,
      start: p.close || '',
      hrs: Math.max(1, Math.round((p.value || 0) / CAP_BLENDED_RATE / CAP_EST_WEEKS)),
      prob: p.prob,
    }));
}

/* ── Model kapasitas komposit (minggu-0 turunan + minggu ke-depan
   rencana) — bentuk { weeks, grades, staff, pipeline } identik yang
   dipakai view_capacity. ─────────────────────────────────────── */
export function capacityModel(
  schedule: SchedMember[],
  plan: CapacityPlan,
  opts: { nowLabel?: string; pipeline?: PipelineRaw[]; leaveOf?: (bareName: string) => boolean } = {},
): CapacityModel {
  const cur = currentWeekFromSchedule(schedule, opts.leaveOf);
  const weeks = [opts.nowLabel || 'Minggu ini', ...plan.weeks];
  const fwdLen = plan.weeks.length;

  const planGrade: Record<string, GradeSeries> = {};
  for (const g of plan.grades) planGrade[g.grade] = g;
  const grades: GradeSeries[] = CAP_GRADES.map((g) => {
    const c = cur.grades.find((x) => x.grade === g);
    const p = planGrade[g];
    const cs = c ? c.supply[0] : 0;
    const cd = c ? c.demand[0] : 0;
    const ps = p ? p.supply.slice(0, fwdLen) : [];
    const pd = p ? p.demand.slice(0, fwdLen) : [];
    while (ps.length < fwdLen) ps.push(0);
    while (pd.length < fwdLen) pd.push(0);
    return { grade: g, supply: [cs, ...ps], demand: [cd, ...pd] };
  });

  /* Roster = gabungan anggota ter-schedule (minggu-0) ∪ staf rencana
     (ke-depan), dicocokkan by bare-name. */
  const order: string[] = [];
  const curByName: Record<string, StaffSeries> = {};
  for (const s of cur.staff) { curByName[s.name] = s; if (!order.includes(s.name)) order.push(s.name); }
  const planByName: Record<string, StaffSeries> = {};
  for (const s of plan.staff) { const nm = bareName(s.name); planByName[nm] = s; if (!order.includes(nm)) order.push(nm); }

  const staff: StaffSeries[] = order.map((nm) => {
    const c = curByName[nm];
    const p = planByName[nm];
    const grade = (c && c.grade) || (p && p.grade) || 'Junior';
    const cur0 = c ? c.forecast[0] : 0;
    const fwd = p ? p.forecast.slice(0, fwdLen) : [];
    while (fwd.length < fwdLen) fwd.push(0);
    const leave = (c && c.leave) || (p && p.leave) || false;
    return { name: nm, grade, forecast: [cur0, ...fwd], leave };
  });

  const pipeline = opts.pipeline ? pipelineDemand(opts.pipeline) : [];
  return { weeks, grades, staff, pipeline };
}
