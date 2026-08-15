/* ============================================================
   PRD `docs/prd-delivery-milestones-deepening.md` · PR-2 · SC-3/SC-4.

   Sebelum PR ini `setMsDate` menimpa `date` DI TEMPAT: tak ada baseline, tak ada
   riwayat, tak ada pencatat. KPI "Milestone Lewat Tempo" dihitung terhadap tanggal
   yang baru saja digeser — tiga lewat tempo menjadi NOL dengan satu tarikan
   date-picker, dan tak ada artefak yang menunjukkan komitmen semula pernah ada.

   Uji inti arc ini ada di `overdueVsBaseline` → "menggeser SEMUA tanggal ke masa
   depan TIDAK menurunkannya".
   ============================================================ */
import { describe, expect, it } from 'vitest';
import {
  deliveryDaysTo,
  milestoneSlip,
  normalizeDeliveryPlan,
  overdueVsBaseline,
  planSlipSummary,
  seedDeliveryPlan,
  shiftMilestone,
  shiftRequiresReason,
  withMilestoneStatus,
  type DeliveryEngPlan,
  type DeliveryMilestone,
  type SeedEngPlan,
} from './canon_delivery';

const TODAY = '2026-03-09';

const ms = (o: Partial<DeliveryMilestone>): DeliveryMilestone => ({
  label: 'X', date: '2026-03-20', baselineDate: '2026-03-20', done: false, shifts: [], ...o,
});

describe('seedDeliveryPlan — baseline lahir dari seed', () => {
  const seed: SeedEngPlan[] = [{
    id: 'E1', phases: [],
    milestones: [{ label: 'Sign-off', date: '2026-03-31', status: 'upcoming' }],
  }];
  it('baselineDate = tanggal seed, dan slip awal NOL', () => {
    const p = seedDeliveryPlan(seed);
    expect(p[0].milestones[0].baselineDate).toBe('2026-03-31');
    expect(milestoneSlip(p[0].milestones[0])).toBe(0);
  });
});

describe('normalizeDeliveryPlan — migrasi maju dokumen LAMA', () => {
  it('dokumen tanpa baselineDate memperolehnya dari date (bukan dianggap tergeser)', () => {
    const legacy = [{ id: 'E1', phases: [], milestones: [{ label: 'EQR', date: '2026-03-26', done: false }] }];
    const out = normalizeDeliveryPlan(legacy);
    expect(out[0].milestones[0].baselineDate).toBe('2026-03-26');
    expect(milestoneSlip(out[0].milestones[0])).toBe(0);
    expect(out[0].milestones[0].shifts).toEqual([]);
  });
  it('baselineDate yang SUDAH ada tidak ditimpa oleh date', () => {
    const stored = [{ id: 'E1', phases: [], milestones: [{ label: 'EQR', date: '2026-04-10', baselineDate: '2026-03-26', done: false }] }];
    expect(milestoneSlip(normalizeDeliveryPlan(stored)[0].milestones[0])).toBe(15);
  });
  it('masukan rusak tidak meledak (bukan array / milestone hilang)', () => {
    expect(normalizeDeliveryPlan(null)).toEqual([]);
    expect(normalizeDeliveryPlan([{ id: 'E1' }])[0].milestones).toEqual([]);
  });
});

describe('milestoneSlip — arah pergeseran', () => {
  it('mundur = positif, maju = negatif, diam = nol', () => {
    expect(milestoneSlip(ms({ date: '2026-03-27', baselineDate: '2026-03-20' }))).toBe(7);
    expect(milestoneSlip(ms({ date: '2026-03-13', baselineDate: '2026-03-20' }))).toBe(-7);
    expect(milestoneSlip(ms({}))).toBe(0);
  });
});

describe('shiftRequiresReason — Q-2 opsi (c)', () => {
  it('mundur WAJIB beralasan; maju & diam tidak', () => {
    expect(shiftRequiresReason('2026-03-20', '2026-03-27')).toBe(true);
    expect(shiftRequiresReason('2026-03-20', '2026-03-13')).toBe(false);
    expect(shiftRequiresReason('2026-03-20', '2026-03-20')).toBe(false);
  });
});

describe('shiftMilestone — pergeseran adalah DATA, bukan penyuntingan', () => {
  const m0 = ms({ label: 'Selesai fieldwork', date: '2026-03-20', baselineDate: '2026-03-20' });
  const m1 = shiftMilestone(m0, '2026-04-03', { at: TODAY, by: 'Anindya P.', reason: 'PBC klien terlambat' });

  it('baselineDate TIDAK IKUT bergerak — komitmen semula kekal', () => {
    expect(m1.baselineDate).toBe('2026-03-20');
    expect(m1.date).toBe('2026-04-03');
    expect(milestoneSlip(m1)).toBe(14);
  });
  it('mencatat siapa - kapan - dari ke - alasan', () => {
    expect(m1.shifts).toEqual([{ at: TODAY, by: 'Anindya P.', from: '2026-03-20', to: '2026-04-03', reason: 'PBC klien terlambat' }]);
  });
  it('pergeseran beruntun menumpuk, tidak menimpa', () => {
    const m2 = shiftMilestone(m1, '2026-04-17', { at: '2026-03-10', by: 'Anindya P.', reason: 'stock opname mundur' });
    expect(m2.shifts).toHaveLength(2);
    expect(m2.shifts?.[0].from).toBe('2026-03-20');
    expect(m2.shifts?.[1].from).toBe('2026-04-03');
    expect(m2.baselineDate).toBe('2026-03-20');
  });
  it('tanggal kosong / tak berubah = no-op (tak mengarang jejak)', () => {
    expect(shiftMilestone(m0, '', { at: 'x', by: 'y' })).toBe(m0);
    expect(shiftMilestone(m0, '2026-03-20', { at: 'x', by: 'y' })).toBe(m0);
  });
});

describe('overdueVsBaseline — keterlambatan yang TAK DAPAT dihapus', () => {
  const plans: DeliveryEngPlan[] = [{
    id: 'E1', phases: [],
    milestones: [
      ms({ label: 'A', date: '2026-03-02', baselineDate: '2026-03-02' }),
      ms({ label: 'B', date: '2026-03-05', baselineDate: '2026-03-05' }),
      ms({ label: 'C', date: '2026-03-20', baselineDate: '2026-03-20' }),
    ],
  }];

  it('menghitung yang lewat komitmen SEMULA', () => {
    expect(overdueVsBaseline(plans, TODAY)).toBe(2);
  });

  it('INTI PR-2: menggeser SEMUA tanggal ke masa depan TIDAK menurunkannya', () => {
    const dragged: DeliveryEngPlan[] = [{
      ...plans[0],
      milestones: plans[0].milestones.map((m) => shiftMilestone(m, '2026-06-30', { at: TODAY, by: 'siapa pun', reason: 'r' })),
    }];
    /* Ukuran LAMA (lewat tempo vs tanggal kini) kini nol — itulah lubangnya. */
    expect(dragged[0].milestones.filter((m) => !m.done && deliveryDaysTo(m.date, TODAY) < 0)).toHaveLength(0);
    /* Ukuran BARU tidak bergeming. */
    expect(overdueVsBaseline(dragged, TODAY)).toBe(2);
  });

  it('MENYELESAIKAN pekerjaannya yang menurunkannya', () => {
    const done: DeliveryEngPlan[] = [{
      ...plans[0],
      milestones: plans[0].milestones.map((m) => m.label === 'A' ? { ...m, done: true } : m),
    }];
    expect(overdueVsBaseline(done, TODAY)).toBe(1);
  });
});

describe('planSlipSummary — perlonggaran komitmen bersih', () => {
  const plans: DeliveryEngPlan[] = [
    { id: 'E1', phases: [], milestones: [
      ms({ label: 'A', date: '2026-04-03', baselineDate: '2026-03-20' }),   // +14
      ms({ label: 'B', date: '2026-03-13', baselineDate: '2026-03-20' }),   //  -7 (maju)
    ] },
    { id: 'E2', phases: [], milestones: [
      ms({ label: 'C', date: '2026-05-01', baselineDate: '2026-04-01' }),   // +30
      ms({ label: 'D', date: '2026-04-01', baselineDate: '2026-04-01' }),   //   0
    ] },
  ];
  const s = planSlipSummary(plans);

  it('menghitung yang bergerak (arah mana pun)', () => expect(s.shiftedCount).toBe(3));
  it('total hari hanya menjumlah pergeseran MUNDUR — maju tidak menutupi mundur', () => expect(s.totalSlipDays).toBe(44));
  it('menamai pergeseran terburuk', () => {
    expect(s.maxSlip).toBe(30);
    expect(s.worst).toEqual({ eng: 'E2', label: 'C', slip: 30 });
  });
  it('rencana bersih -> nol & tanpa terburuk', () => {
    expect(planSlipSummary([{ id: 'E', phases: [], milestones: [ms({})] }]))
      .toEqual({ shiftedCount: 0, totalSlipDays: 0, maxSlip: 0, worst: null });
  });
});

describe('withMilestoneStatus — slip ikut disisipkan', () => {
  it('membawa slip turunan ke konsumen render', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [ms({ date: '2026-04-03', baselineDate: '2026-03-20' })] };
    expect(withMilestoneStatus(plan, TODAY).milestones[0].slip).toBe(14);
  });
});
