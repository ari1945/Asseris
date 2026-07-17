import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';

/* 2026-07-06 — SELF-SERVICE dari "Data Personal Saya". Memaku properti keamanan: pegawai hanya
   dapat menambah/menandatangani BARIS MILIKNYA (server men-scope ke empId sesi), isolasi tetap
   terjaga, dan akun non-staf ditolak. */

function callerAs(role: string, id: string, email: string, name: string) {
  const user = { id, role, email, name } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const FIRM = 'PSS-FIRM';
const DIMAS = 'PSS-dimas', FAJAR = 'PSS-fajar', NOBODY = 'PSS-nobody';
const DIMAS_EMAIL = 'dimas.r@whr-cpa.id'; // EMP-021
const FAJAR_EMAIL = 'fajar.n@whr-cpa.id'; // EMP-031

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Self-Service Firm', short: 'PSS' } });
  await prisma.user.create({ data: { id: DIMAS, firmId: FIRM, name: 'Dimas Raharjo', role: 'Senior Auditor', email: DIMAS_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: FAJAR, firmId: FIRM, name: 'Fajar Nugroho', role: 'Junior Auditor', email: FAJAR_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: NOBODY, firmId: FIRM, name: 'Bukan Staf', role: 'Junior Auditor', email: 'pss.nobody@test.local', dataJson: '{}' } });
});

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: FIRM } });
  await prisma.stateDocHistory.deleteMany({ where: { scopeId: FIRM } });
  await prisma.user.deleteMany({ where: { firmId: FIRM } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('personal.submitLeave — ajukan cuti sendiri', () => {
  it('Dimas menambah baris cuti MILIKNYA (status Menunggu, emp=EMP-021)', async () => {
    const res = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL, 'Dimas Raharjo').personal.submitLeave({ type: 'Cuti Tahunan', from: '2026-04-10', to: '2026-04-12', reason: 'Uji' });
    const rows = res.value as Array<{ emp: string; status: string; type: string; days: number }>;
    // hanya baris milik Dimas yang dikembalikan (self-filtered)
    expect(rows.every((r) => r.emp === 'EMP-021')).toBe(true);
    const mine = rows.find((r) => r.type === 'Cuti Tahunan' && r.status === 'Menunggu');
    expect(mine).toBeTruthy();
    expect(mine?.days).toBe(3); // 10..12 inklusif
  });

  it('ISOLASI tetap: Fajar TIDAK melihat baris cuti Dimas', async () => {
    const r = await callerAs('Junior Auditor', FAJAR, FAJAR_EMAIL, 'Fajar Nugroho').personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    const rows = r.value as Array<{ emp: string }>;
    expect(rows.every((x) => x.emp === 'EMP-031')).toBe(true);
    expect(rows.some((x) => x.emp === 'EMP-021')).toBe(false);
  });

  it('akun non-staf (tak terpetakan ke EMP) DITOLAK', async () => {
    await expect(
      callerAs('Junior Auditor', NOBODY, 'pss.nobody@test.local', 'Bukan Staf').personal.submitLeave({ type: 'Izin', from: '2026-04-01', to: '2026-04-01' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
  });
});

describe('personal.declare — deklarasi sendiri', () => {
  it('Dimas menandatangani independensi → barisnya declared=true (baris lain tak tersentuh via self-filter)', async () => {
    const res = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL, 'Dimas Raharjo').personal.declare({ kind: 'independence' });
    const rows = res.value as Array<{ id: string; declared: boolean }>;
    expect(rows.every((r) => r.id === 'EMP-021')).toBe(true);
    expect(rows.find((r) => r.id === 'EMP-021')?.declared).toBe(true);
  });

  it('Dimas menandatangani kode etik → pc.ethics[EMP-021].signed=true', async () => {
    const res = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL, 'Dimas Raharjo').personal.declare({ kind: 'ethics' });
    const obj = res.value as Record<string, { signed: boolean }>;
    expect(Object.keys(obj)).toEqual(['EMP-021']); // self-filtered
    expect(obj['EMP-021'].signed).toBe(true);
  });
});
