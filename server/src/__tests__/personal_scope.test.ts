import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { filterPersonal, resolveEmpId, PERSONAL_KEYS } from '../personalScope';

/* 2026-07-01 — PRD "Restrukturisasi Navigasi & Beranda Berbasis Peran", Fase 3.
   personal.get is the row-filtered read path that closes the gap state.get can't:
   a capability gate on WRITE never stopped a caller who can merely READ that scope
   from reading every OTHER person's row. These tests pin the security property
   itself (isolation), not just "the feature renders" — mirrors engagement_isolation.test.ts. */

function callerAs(role: string, id: string, email: string) {
  const user = { id, role, email } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const FIRM = 'PSC-FIRM';
// Real seeded STAFF emails (migration/src/data_part1.ts) — resolveEmpId matches the
// AUTHENTIC roster, so the test proves the real resolution path, not a fixture stand-in.
const DIMAS_EMAIL = 'dimas.r@whr-cpa.id'; // EMP-021, Senior Auditor
const FAJAR_EMAIL = 'fajar.n@whr-cpa.id'; // EMP-031, Junior Auditor
const DIMAS = 'PSC-dimas';
const FAJAR = 'PSC-fajar';
const PARTNER = 'PSC-partner';
const HR = 'PSC-hr';

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Personal Scope Firm', short: 'PSC' } });
  await prisma.user.create({ data: { id: DIMAS, firmId: FIRM, name: 'Dimas Raharjo', role: 'Senior Auditor', email: DIMAS_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: FAJAR, firmId: FIRM, name: 'Fajar Nugroho', role: 'Junior Auditor', email: FAJAR_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: PARTNER, firmId: FIRM, name: 'Test Partner', role: 'Engagement Partner', email: 'psc.partner@test.local', dataJson: '{}' } });
  await prisma.user.create({ data: { id: HR, firmId: FIRM, name: 'Test HR', role: 'Admin & HR Firma', email: 'psc.hr@test.local', dataJson: '{}' } });
  await prisma.stateDoc.create({
    data: {
      scope: 'firm', scopeId: FIRM, key: 'leaveReqs', version: 1, updatedBy: PARTNER,
      valueJson: JSON.stringify([
        { id: 'LV-D1', emp: 'EMP-021', type: 'Cuti Tahunan', status: 'Menunggu' }, // Dimas's own
        { id: 'LV-F1', emp: 'EMP-031', type: 'Sakit', status: 'Menunggu' }, // Fajar's own
        { id: 'LV-X1', emp: 'EMP-999', type: 'Cuti Tahunan', status: 'Disetujui' }, // nobody in this test
      ]),
    },
  });
});

afterAll(async () => {
  await prisma.stateDoc.deleteMany({ where: { scopeId: FIRM } });
  await prisma.user.deleteMany({ where: { firmId: FIRM } });
  await prisma.firm.deleteMany({ where: { id: FIRM } });
  await prisma.$disconnect();
});

describe('resolveEmpId — pemetaan sesi → EMP-xxx via STAFF asli (email)', () => {
  it('cocok via email STAFF seed nyata', async () => {
    expect(await resolveEmpId({ email: DIMAS_EMAIL })).toBe('EMP-021');
    expect(await resolveEmpId({ email: FAJAR_EMAIL })).toBe('EMP-031');
  });
  it('null bila email tak cocok STAFF mana pun (persona firm-ops — bukan staf audit)', async () => {
    expect(await resolveEmpId({ email: 'psc.hr@test.local' })).toBeNull();
  });
});

describe('filterPersonal — filter murni per bentuk dokumen', () => {
  const rows = [{ id: 'A', emp: 'EMP-021' }, { id: 'B', emp: 'EMP-031' }];
  it('full=true → dokumen utuh, tanpa filter', () => {
    expect(filterPersonal('leaveReqs', rows, null, true)).toEqual(rows);
  });
  it('array-shape → hanya baris milik empId', () => {
    expect(filterPersonal('leaveReqs', rows, 'EMP-021', false)).toEqual([{ id: 'A', emp: 'EMP-021' }]);
  });
  it('object-shape → hanya entri dengan key = empId', () => {
    const doc = { 'EMP-021': { gross: 1 }, 'EMP-031': { gross: 2 } };
    expect(filterPersonal('payrollData', doc, 'EMP-021', false)).toEqual({ 'EMP-021': { gross: 1 } });
  });
  it('empId null & full=false → fail-closed (kosong, BUKAN semua)', () => {
    expect(filterPersonal('leaveReqs', rows, null, false)).toEqual([]);
    expect(filterPersonal('payrollData', { 'EMP-021': {} }, null, false)).toEqual({});
  });
});

describe('personal.get — isolasi end-to-end lewat router nyata', () => {
  it('Dimas hanya menerima barisnya sendiri, bukan milik Fajar atau baris tak dikenal', async () => {
    const r = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect(r.value).toEqual([{ id: 'LV-D1', emp: 'EMP-021', type: 'Cuti Tahunan', status: 'Menunggu' }]);
  });
  it('Fajar hanya menerima barisnya sendiri', async () => {
    const r = await callerAs('Junior Auditor', FAJAR, FAJAR_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect(r.value).toEqual([{ id: 'LV-F1', emp: 'EMP-031', type: 'Sakit', status: 'Menunggu' }]);
  });
  it('Admin & HR Firma (HR_MANAGE) menerima SEMUA baris', async () => {
    const r = await callerAs('Admin & HR Firma', HR, 'psc.hr@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect((r.value as unknown[]).length).toBe(3);
  });
  it('Partner (FIRM_ADMIN) menerima SEMUA baris', async () => {
    const r = await callerAs('Engagement Partner', PARTNER, 'psc.partner@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect((r.value as unknown[]).length).toBe(3);
  });
  it('key di luar PERSONAL_KEYS ditolak — bukan pintu belakang ke state.get lain', async () => {
    await expect(
      callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'wpState' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
  it('dokumen belum pernah ditulis → default kosong sesuai bentuk, bukan error', async () => {
    const r = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'cpeExtra' });
    expect(r.value).toEqual({});
    expect(r.version).toBe(0);
  });
});

describe('PERSONAL_KEYS — konsistensi konfigurasi', () => {
  it('semua 10 key yang disebut PRD Fase 3 terdaftar', () => {
    expect(Object.keys(PERSONAL_KEYS).sort()).toEqual([
      'cpeExtra', 'indepAppr', 'indepRotAck', 'indepThreats', 'independence',
      'leaveReqs', 'payrollData', 'pc.ethics', 'pc.gifts', 'perfPeople',
    ].sort());
  });
});
