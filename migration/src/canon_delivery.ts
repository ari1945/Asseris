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
export interface DeliveryMilestone { label: string; date: string; done: boolean }
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
    milestones: d.milestones.map((m) => ({ label: m.label, date: m.date, done: m.done ?? m.status === 'done' })),
  }));
}

/* Sisipkan status turunan ke tiap milestone (untuk render). */
export function withMilestoneStatus(plan: DeliveryEngPlan, today: string): { id: string; phases: DeliveryPhase[]; milestones: (DeliveryMilestone & { status: MilestoneStatus })[] } {
  return {
    id: plan.id,
    phases: plan.phases,
    milestones: plan.milestones.map((m) => ({ ...m, status: milestoneStatus(m, today) })),
  };
}
