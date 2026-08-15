/* ============================================================
   Asseris — Derivasi Delivery/Milestone (Fase 4 · PR-A2)  [PURE, ESM]
   ------------------------------------------------------------
   SSOT: rencana pengiriman (fase + milestone per perikatan) tersimpan
   di deliveryPlan.v1 (firm-scope, editable, seed dari AMS.DELIVERY);
   STATUS milestone (done/due/upcoming) DITURUNKAN dari flag `done`
   tersimpan × klok tunggal AMS.TODAY — bukan label seed beku. Progres/
   deadline/burn tetap dari AMS.ENGAGEMENTS (sudah nyata).

   PURE (tak menyentuh AMS_CANON) — pola canon_assertions/canon_capacity.
   Konsumen: view_delivery (editable), view_audittimeline (baca-saja).
   ============================================================ */

export interface DeliveryPhase { name: string; start: string; end: string }
/* Satu pergeseran komitmen tanggal — DATA, bukan penyuntingan. */
export interface MilestoneShift { at: string; by: string; from: string; to: string; reason?: string }

export interface DeliveryMilestone {
  label: string;
  /* komitmen KINI — dapat digeser */
  date: string;
  /* komitmen SEMULA — tidak pernah disunting dari UI. Inilah yang membuat
     keterlambatan tak dapat dihapus dengan menarik date-picker. */
  baselineDate: string;
  done: boolean;
  shifts?: MilestoneShift[];
}
export interface DeliveryEngPlan { id: string; phases: DeliveryPhase[]; milestones: DeliveryMilestone[] }
export type MilestoneStatus = 'done' | 'due' | 'upcoming';
/* Milestone seed lama membawa status string; peta ke flag `done` tersimpan. */
export interface SeedMilestone { label: string; date: string; status?: string; done?: boolean }
export interface SeedEngPlan { id: string; phases: DeliveryPhase[]; milestones: SeedMilestone[] }

const DAY = 864e5;
export function deliveryDaysTo(dateStr: string, today: string): number {
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - new Date(today + 'T00:00:00').getTime()) / DAY);
}

/* Status TURUNAN: done tersimpan → 'done'; selain itu ≤7 hari (termasuk lewat
   tempo) → 'due', sisanya 'upcoming'. Lewat-tempo tetap terdeteksi konsumen via
   deliveryDaysTo<0 (warna merah teks + hitung overdue) tanpa nilai status baru. */
export function milestoneStatus(m: { done?: boolean; date: string }, today: string): MilestoneStatus {
  if (m.done) return 'done';
  return deliveryDaysTo(m.date, today) <= 7 ? 'due' : 'upcoming';
}

/* Seed deliveryPlan.v1 dari AMS.DELIVERY: status:'done' → done:true (buang
   label status turunan; date+done adalah satu-satunya state tersimpan). */
export function seedDeliveryPlan(delivery: SeedEngPlan[]): DeliveryEngPlan[] {
  return delivery.map((d) => ({
    id: d.id,
    phases: d.phases.map((p) => ({ name: p.name, start: p.start, end: p.end })),
    /* baselineDate = tanggal seed. Seed ADALAH komitmen semula; sesudah ini hanya
       `date` yang bergerak, dan setiap pergerakan meninggalkan jejak di `shifts`. */
    milestones: d.milestones.map((m) => ({
      label: m.label, date: m.date, baselineDate: m.date,
      done: m.done ?? m.status === 'done', shifts: [],
    })),
  }));
}

/* ------------------------------------------------------------------
   PR-2 — BASELINE & PERGESERAN

   `seedDeliveryPlan` hanya berjalan bila BELUM ada dokumen tersimpan. Dokumen
   `deliveryPlan.v1` yang sudah ada di server (ditulis sebelum PR ini) tidak
   punya `baselineDate` — karena itu normalisasi dijalankan pada setiap PEMBACAAN,
   bukan hanya saat seed. Tanpa ini, rencana lama akan tampak "tak pernah tergeser"
   selamanya: tepat kebohongan yang PR ini cabut.

   Migrasi maju bersifat konservatif: `baselineDate ??= date`. Untuk rencana lama
   ini berarti pergeseran yang SUDAH terjadi sebelum PR ini tidak dapat dipulihkan
   (jejaknya memang tidak pernah ada) — kita tidak mengarangnya. Yang dijamin:
   sejak titik ini, tak ada pergeseran yang tak tercatat.
   ------------------------------------------------------------------ */
export function normalizeDeliveryPlan(raw: unknown): DeliveryEngPlan[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((p): p is DeliveryEngPlan => !!p && typeof p === 'object').map((p) => ({
    id: p.id,
    phases: Array.isArray(p.phases) ? p.phases : [],
    milestones: (Array.isArray(p.milestones) ? p.milestones : []).map((m) => ({
      label: m.label,
      date: m.date,
      baselineDate: m.baselineDate || m.date,
      done: !!m.done,
      shifts: Array.isArray(m.shifts) ? m.shifts : [],
    })),
  }));
}

/* Pergeseran milestone dalam hari: >0 tergeser MUNDUR (melonggar), <0 maju. */
export function milestoneSlip(m: { date: string; baselineDate?: string }): number {
  return m.baselineDate ? deliveryDaysTo(m.date, m.baselineDate) : 0;
}

/* Q-2 = opsi (c): alasan WAJIB hanya untuk pergeseran mundur — friksi diletakkan
   tepat pada tindakan yang melonggarkan komitmen / menghapus kabar buruk.
   Menjadwalkan lebih AWAL tidak perlu dibenarkan. */
export function shiftRequiresReason(from: string, to: string): boolean {
  return deliveryDaysTo(to, from) > 0;
}

/* Terapkan pergeseran tanggal SAMBIL mencatatnya. MURNI: mengembalikan milestone
   baru; tak pernah menyentuh `baselineDate`. */
export function shiftMilestone(
  m: DeliveryMilestone,
  to: string,
  ctx: { at: string; by: string; reason?: string },
): DeliveryMilestone {
  if (!to || to === m.date) return m;
  const rec: MilestoneShift = { at: ctx.at, by: ctx.by, from: m.date, to };
  if (ctx.reason) rec.reason = ctx.reason;
  return { ...m, date: to, shifts: [...(m.shifts || []), rec] };
}

/* LEWAT TEMPO YANG TAK DAPAT DIHAPUS.

   `deliveryDaysTo(m.date, today) < 0` dihitung terhadap tanggal yang baru saja
   digeser — satu tarikan date-picker mengubah 3 lewat-tempo menjadi 0. Angka di
   bawah ini dihitung terhadap KOMITMEN SEMULA, sehingga menggeser tanggal tidak
   menurunkannya. Menyelesaikan pekerjaannya yang menurunkannya. */
export function overdueVsBaseline(plans: DeliveryEngPlan[], today: string): number {
  return plans.reduce((n, p) => n + p.milestones.filter(
    (m) => !m.done && deliveryDaysTo(m.baselineDate || m.date, today) < 0,
  ).length, 0);
}

export interface PlanSlipSummary {
  /* milestone yang tanggalnya bergerak dari baseline (arah mana pun) */
  shiftedCount: number;
  /* jumlah hari pergeseran MUNDUR saja — perlonggaran komitmen bersih */
  totalSlipDays: number;
  /* pergeseran mundur terbesar & pemiliknya (untuk kalimat ringkas) */
  maxSlip: number;
  worst: { eng: string; label: string; slip: number } | null;
}

export function planSlipSummary(plans: DeliveryEngPlan[]): PlanSlipSummary {
  let shiftedCount = 0, totalSlipDays = 0, maxSlip = 0;
  let worst: PlanSlipSummary['worst'] = null;
  plans.forEach((p) => p.milestones.forEach((m) => {
    const slip = milestoneSlip(m);
    if (slip !== 0) shiftedCount++;
    if (slip > 0) {
      totalSlipDays += slip;
      if (slip > maxSlip) { maxSlip = slip; worst = { eng: p.id, label: m.label, slip }; }
    }
  }));
  return { shiftedCount, totalSlipDays, maxSlip, worst };
}

/* Sisipkan status turunan ke tiap milestone (untuk render). */
export function withMilestoneStatus(plan: DeliveryEngPlan, today: string): { id: string; phases: DeliveryPhase[]; milestones: (DeliveryMilestone & { status: MilestoneStatus; slip: number })[] } {
  return {
    id: plan.id,
    phases: plan.phases,
    milestones: plan.milestones.map((m) => ({ ...m, status: milestoneStatus(m, today), slip: milestoneSlip(m) })),
  };
}
