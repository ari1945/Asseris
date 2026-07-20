import { describe, it, expect } from 'vitest';
import {
  deliveryDaysTo,
  milestoneStatus,
  seedDeliveryPlan,
  withMilestoneStatus,
  type SeedEngPlan,
  type DeliveryEngPlan,
} from './canon_delivery';

const TODAY = '2026-03-09';

describe('deliveryDaysTo', () => {
  it('menghitung selisih hari (negatif = lewat tempo)', () => {
    expect(deliveryDaysTo('2026-03-16', TODAY)).toBe(7);
    expect(deliveryDaysTo('2026-03-09', TODAY)).toBe(0);
    expect(deliveryDaysTo('2026-03-02', TODAY)).toBe(-7);
  });
});

describe('milestoneStatus — status DITURUNKAN dari done × klok', () => {
  it('done tersimpan → done (apa pun tanggalnya)', () => {
    expect(milestoneStatus({ done: true, date: '2026-01-01' }, TODAY)).toBe('done');
  });
  it('belum done & ≤7 hari (termasuk lewat tempo) → due', () => {
    expect(milestoneStatus({ done: false, date: '2026-03-15' }, TODAY)).toBe('due');   // +6
    expect(milestoneStatus({ done: false, date: '2026-03-05' }, TODAY)).toBe('due');   // -4 (lewat)
  });
  it('belum done & >7 hari → upcoming', () => {
    expect(milestoneStatus({ done: false, date: '2026-03-31' }, TODAY)).toBe('upcoming');
  });
});

describe('seedDeliveryPlan — status seed lama → flag done tersimpan', () => {
  const seed: SeedEngPlan[] = [{
    id: 'E1',
    phases: [{ name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' }],
    milestones: [
      { label: 'Kickoff', date: '2026-01-12', status: 'done' },
      { label: 'EQR', date: '2026-03-26', status: 'upcoming' },
    ],
  }];
  const plan = seedDeliveryPlan(seed);
  it('memetakan status:done → done:true, sisanya false', () => {
    expect(plan[0].milestones[0].done).toBe(true);
    expect(plan[0].milestones[1].done).toBe(false);
  });
  it('mempertahankan fase & tanggal', () => {
    expect(plan[0].phases[0]).toEqual({ name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' });
    expect(plan[0].milestones[1].date).toBe('2026-03-26');
  });
});

describe('withMilestoneStatus — sisip status turunan (INVARIAN klok)', () => {
  const plan: DeliveryEngPlan = {
    id: 'E1',
    phases: [],
    milestones: [{ label: 'Fieldwork', date: '2026-03-14', done: false }],   // +5 dari TODAY
  };
  it('status turunan mengikuti today', () => {
    expect(withMilestoneStatus(plan, TODAY).milestones[0].status).toBe('due');           // +5 → due
    expect(withMilestoneStatus(plan, '2026-02-01').milestones[0].status).toBe('upcoming'); // jauh → upcoming
  });
  it('menandai done → done meski tanggal lewat', () => {
    const donePlan: DeliveryEngPlan = { ...plan, milestones: [{ ...plan.milestones[0], done: true }] };
    expect(withMilestoneStatus(donePlan, TODAY).milestones[0].status).toBe('done');
  });
});
