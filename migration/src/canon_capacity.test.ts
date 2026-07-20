import { describe, it, expect } from 'vitest';
import {
  currentWeekFromSchedule,
  capacityModel,
  seedForwardPlan,
  pipelineDemand,
  CAP_BLENDED_RATE,
  CAP_EST_WEEKS,
  type SchedMember,
  type CapacitySeed,
} from './canon_capacity';

/* Fixtur ringkas meniru bentuk AMS.SCHEDULE (data_part1.ts). */
const SCHEDULE: SchedMember[] = [
  { member: 'Hartono Wijaya, CPA', role: 'Partner', capacity: 40, alloc: [{ eng: 'E1', client: 'A', hrs: 8 }, { eng: 'E2', client: 'B', hrs: 6 }] },
  { member: 'Anindya Pramesti', role: 'Manager', capacity: 40, alloc: [{ eng: 'E1', client: 'A', hrs: 24 }, { eng: 'E2', client: 'B', hrs: 11 }] },
  { member: 'Bayu Saputra', role: 'Manager', capacity: 40, alloc: [{ eng: 'E3', client: 'C', hrs: 22 }] },
  { member: 'Dimas Raharjo', role: 'Senior', capacity: 40, alloc: [{ eng: 'E1', client: 'A', hrs: 38 }] },
];

/* Fixtur ringkas meniru AMS.CAPACITY (8 kolom di data_part4.ts — di sini 3 kolom cukup). */
const CAP_SEED: CapacitySeed = {
  weeks: ['9 Mar', '16 Mar', '23 Mar'],
  grades: [
    { grade: 'Partner', supply: [54, 54, 54], demand: [40, 44, 48] },
    { grade: 'Manager', supply: [80, 80, 80], demand: [96, 104, 112] },
  ],
  staff: [
    { name: 'Hartono Wijaya', grade: 'Partner', forecast: [80, 90, 95] },
    { name: 'Citra Halim', grade: 'Manager', forecast: [0, 0, 0], leave: true },
  ],
};

describe('currentWeekFromSchedule — minggu berjalan diturunkan dari schedule', () => {
  const cur = currentWeekFromSchedule(SCHEDULE);

  it('supply per grade = Σ kapasitas kotor anggota grade', () => {
    const partner = cur.grades.find((g) => g.grade === 'Partner')!;
    const manager = cur.grades.find((g) => g.grade === 'Manager')!;
    expect(partner.supply[0]).toBe(40);   // hanya 1 partner ter-schedule
    expect(manager.supply[0]).toBe(80);   // 2 manager × 40
  });

  it('demand per grade = Σ jam ter-booking (bukan angka fiktif)', () => {
    const partner = cur.grades.find((g) => g.grade === 'Partner')!;
    const manager = cur.grades.find((g) => g.grade === 'Manager')!;
    expect(partner.demand[0]).toBe(14);   // 8 + 6
    expect(manager.demand[0]).toBe(57);   // (24+11) + 22
  });

  it('forecast per orang = util scheduler (jam/kapasitas×100) — angka identik lintas modul', () => {
    const dimas = cur.staff.find((s) => s.name === 'Dimas Raharjo')!;
    expect(dimas.forecast[0]).toBe(95);   // 38/40 → 95%
  });

  it('nama dinormalkan (buang gelar setelah koma)', () => {
    expect(cur.staff.some((s) => s.name === 'Hartono Wijaya')).toBe(true);
  });
});

describe('seedForwardPlan — buang minggu-0 (SSOT: minggu berjalan tak disimpan)', () => {
  const plan = seedForwardPlan(CAP_SEED);
  it('menyisakan hanya minggu ke depan', () => {
    expect(plan.weeks).toEqual(['16 Mar', '23 Mar']);
    expect(plan.grades[0].supply).toEqual([54, 54]);   // week-0 (54) dibuang
    expect(plan.staff[0].forecast).toEqual([90, 95]);
  });
});

describe('capacityModel — komposit minggu-0 turunan + minggu ke depan rencana', () => {
  const plan = seedForwardPlan(CAP_SEED);
  const model = capacityModel(SCHEDULE, plan, { nowLabel: '9 Mar' });

  it('minggu-0 = turunan schedule, bukan seed (Manager demand 57 bukan 96)', () => {
    const manager = model.grades.find((g) => g.grade === 'Manager')!;
    expect(manager.demand[0]).toBe(57);          // dari schedule
    expect(manager.demand.slice(1)).toEqual([104, 112]); // dari plan
  });

  it('INVARIAN SSOT: mengubah rencana TAK mengubah minggu-0', () => {
    const tampered = { ...plan, grades: plan.grades.map((g) => ({ ...g, demand: g.demand.map(() => 999) })) };
    const m2 = capacityModel(SCHEDULE, tampered, { nowLabel: '9 Mar' });
    const mgr = m2.grades.find((g) => g.grade === 'Manager')!;
    expect(mgr.demand[0]).toBe(57);              // tetap dari schedule
    expect(mgr.demand[1]).toBe(999);             // forward ikut rencana
  });

  it('INVARIAN unifikasi: mengubah booking schedule MENGUBAH minggu-0', () => {
    const sched2 = SCHEDULE.map((m) => m.member.startsWith('Dimas') ? { ...m, alloc: [{ eng: 'E1', client: 'A', hrs: 20 }] } : m);
    const m2 = capacityModel(sched2, plan, { nowLabel: '9 Mar' });
    const dimas = m2.staff.find((s) => s.name === 'Dimas Raharjo')!;
    expect(dimas.forecast[0]).toBe(50);          // 20/40 → 50% (berubah dari 95%)
  });

  it('roster = gabungan anggota schedule ∪ staf rencana (Citra dari plan)', () => {
    expect(model.staff.some((s) => s.name === 'Dimas Raharjo')).toBe(true);   // dari schedule
    expect(model.staff.some((s) => s.name === 'Citra Halim')).toBe(true);     // dari plan
  });

  it('weeks = [nowLabel, ...plan.weeks]', () => {
    expect(model.weeks).toEqual(['9 Mar', '16 Mar', '23 Mar']);
  });
});

describe('pipelineDemand — heuristik jam dari value (Q2-a)', () => {
  const raw = [
    { id: 'P1', name: 'PT Alfa', service: 'Audit', stage: 'Proposal', value: 1_280_000_000, prob: 75, close: '2026-04-13' },
    { id: 'P2', name: 'PT Beta', service: 'Audit', stage: 'Lost', value: 540_000_000, prob: 0, close: '2026-02-15' },
    { id: 'P3', name: 'PT Gama', service: 'DD', stage: 'Won', value: 950_000_000, prob: 100, close: '2026-03-01' },
  ];
  const out = pipelineDemand(raw);

  it('mengecualikan stage Lost & Won', () => {
    expect(out.map((p) => p.name)).toEqual(['PT Alfa']);
  });

  it('hrs = value / rate / durasi (dibulatkan, minimal 1)', () => {
    expect(out[0].hrs).toBe(Math.round(1_280_000_000 / CAP_BLENDED_RATE / CAP_EST_WEEKS));
    expect(out[0].start).toBe('2026-04-13');   // start = close
  });
});
