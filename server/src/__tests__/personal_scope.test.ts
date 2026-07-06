import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { User } from '@prisma/client';
import { appRouter } from '../router';
import { createCallerFactory } from '../trpc';
import { prisma } from '../db';
import { filterPersonalByPopulation, personalPopulation, resolveEmpId, unitSubtree, PERSONAL_KEYS } from '../personalScope';

/* 2026-07-01 — PRD "Restrukturisasi Navigasi & Beranda Berbasis Peran", Fase 3.
   2026-07-05 — PRD "Isolasi Data Personal": diperluas jadi BERJENJANG (self→unit→firm) +
   kategori-cap granular + fallback seed ter-filter. Tes ini memaku properti KEAMANAN
   (isolasi), bukan sekadar "fitur render" — sejajar engagement_isolation.test.ts. */

function callerAs(role: string, id: string, email: string) {
  const user = { id, role, email } as unknown as User;
  return createCallerFactory(appRouter)({ user, token: 'test' });
}

const FIRM = 'PSC-FIRM';
// Email STAFF seed nyata (migration/src/data_part1.ts) — resolveEmpId mencocokkan roster ASLI.
const DIMAS_EMAIL = 'dimas.r@whr-cpa.id'; // EMP-021, Senior, unit U-LEAD
const FAJAR_EMAIL = 'fajar.n@whr-cpa.id'; // EMP-031, Junior, unit U-LEAD
const RUDI_EMAIL = 'rudi.g@whr-cpa.id'; // EMP-002, lead unit U-KOM
const HARTONO_EMAIL = 'hartono.w@whr-cpa.id'; // EMP-001, managing partner
const DIMAS = 'PSC-dimas', FAJAR = 'PSC-fajar', RUDI = 'PSC-rudi', HARTONO = 'PSC-hartono';
const PARTNER = 'PSC-partner', HR = 'PSC-hr', FIN = 'PSC-fin';

beforeAll(async () => {
  await prisma.firm.create({ data: { id: FIRM, name: 'Personal Scope Firm', short: 'PSC' } });
  await prisma.user.create({ data: { id: DIMAS, firmId: FIRM, name: 'Dimas Raharjo', role: 'Senior Auditor', email: DIMAS_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: FAJAR, firmId: FIRM, name: 'Fajar Nugroho', role: 'Junior Auditor', email: FAJAR_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: RUDI, firmId: FIRM, name: 'Rudi Gunawan', role: 'Rekan', email: RUDI_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: HARTONO, firmId: FIRM, name: 'Hartono Wijaya', role: 'Rekan Pemimpin', email: HARTONO_EMAIL, dataJson: '{}' } });
  await prisma.user.create({ data: { id: PARTNER, firmId: FIRM, name: 'Test Partner', role: 'Engagement Partner', email: 'psc.partner@test.local', dataJson: '{}' } });
  await prisma.user.create({ data: { id: HR, firmId: FIRM, name: 'Test HR', role: 'Admin & HR Firma', email: 'psc.hr@test.local', dataJson: '{}' } });
  await prisma.user.create({ data: { id: FIN, firmId: FIRM, name: 'Test Finance', role: 'Finance Firma', email: 'psc.fin@test.local', dataJson: '{}' } });
  await prisma.stateDoc.create({
    data: {
      scope: 'firm', scopeId: FIRM, key: 'leaveReqs', version: 1, updatedBy: HR,
      valueJson: JSON.stringify([
        { id: 'LV-D1', emp: 'EMP-021', type: 'Cuti Tahunan', status: 'Menunggu' }, // Dimas (U-LEAD)
        { id: 'LV-F1', emp: 'EMP-031', type: 'Sakit', status: 'Menunggu' }, // Fajar (U-LEAD)
        { id: 'LV-B1', emp: 'EMP-008', type: 'Cuti Tahunan', status: 'Disetujui' }, // Bayu (U-KOM, unit Rudi)
        { id: 'LV-X1', emp: 'EMP-999', type: 'Cuti Tahunan', status: 'Disetujui' }, // nobody
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
    expect(await resolveEmpId({ email: RUDI_EMAIL })).toBe('EMP-002');
  });
  it('null bila email tak cocok STAFF mana pun (persona firm-ops)', async () => {
    expect(await resolveEmpId({ email: 'psc.hr@test.local' })).toBeNull();
  });
});

describe('unitSubtree — rumah tangga partner (eksplisit UNITS → fallback ORG)', () => {
  it('Rudi (lead U-KOM) → seluruh anggota unit U-KOM, BUKAN unit lain', async () => {
    const set = await unitSubtree({ email: RUDI_EMAIL });
    expect(set.has('EMP-002')).toBe(true); // dirinya
    expect(set.has('EMP-008')).toBe(true); // Bayu, U-KOM
    expect(set.has('EMP-022')).toBe(true); // Sinta, U-KOM
    expect(set.has('EMP-021')).toBe(false); // Dimas, U-LEAD — di luar unitnya
    expect(set.has('EMP-031')).toBe(false); // Fajar, U-LEAD
  });
  it('non-partner (tak memimpin unit) → fallback ORG subtree (mereka yang melapor ke bawahnya)', async () => {
    const set = await unitSubtree({ email: DIMAS_EMAIL }); // EMP-021 → EMP-031 melapor ke dia
    expect(set.has('EMP-021')).toBe(true);
    expect(set.has('EMP-031')).toBe(true);
    expect(set.has('EMP-002')).toBe(false);
  });
});

describe('filterPersonalByPopulation — filter murni per bentuk dokumen', () => {
  const rows = [{ id: 'A', emp: 'EMP-021' }, { id: 'B', emp: 'EMP-031' }, { id: 'C', emp: 'EMP-008' }];
  it("population 'all' → dokumen utuh", () => {
    expect(filterPersonalByPopulation('leaveReqs', rows, 'all')).toEqual(rows);
  });
  it('array-shape → hanya baris yang emp-nya ada di populasi', () => {
    expect(filterPersonalByPopulation('leaveReqs', rows, new Set(['EMP-021']))).toEqual([{ id: 'A', emp: 'EMP-021' }]);
    expect(filterPersonalByPopulation('leaveReqs', rows, new Set(['EMP-021', 'EMP-008']))).toEqual([{ id: 'A', emp: 'EMP-021' }, { id: 'C', emp: 'EMP-008' }]);
  });
  it('object-shape → hanya entri yang key-nya ada di populasi', () => {
    const doc = { 'EMP-021': { gross: 1 }, 'EMP-031': { gross: 2 } };
    expect(filterPersonalByPopulation('payrollData', doc, new Set(['EMP-021']))).toEqual({ 'EMP-021': { gross: 1 } });
  });
  it('populasi kosong → fail-closed (kosong, BUKAN semua)', () => {
    expect(filterPersonalByPopulation('leaveReqs', rows, new Set())).toEqual([]);
    expect(filterPersonalByPopulation('payrollData', { 'EMP-021': {} }, new Set())).toEqual({});
  });
});

describe('personalPopulation — resolusi cakupan per peran/kategori', () => {
  it("Rekan Pemimpin → 'all' (firm) untuk payroll", async () => {
    expect(await personalPopulation({ role: 'Rekan Pemimpin', email: HARTONO_EMAIL }, 'payrollData')).toBe('all');
  });
  it('Finance Firma → firm untuk payroll, tapi self (kosong) untuk data SDM (cuti)', async () => {
    expect(await personalPopulation({ role: 'Finance Firma', email: 'psc.fin@test.local' }, 'payrollData')).toBe('all');
    const leave = await personalPopulation({ role: 'Finance Firma', email: 'psc.fin@test.local' }, 'leaveReqs');
    expect(leave).toBeInstanceOf(Set);
    expect((leave as Set<string>).size).toBe(0); // bukan staf → tak ada empId → kosong
  });
  it('Engagement Partner (default) → self-only, BUKAN firm (decoupling dari FIRM_ADMIN)', async () => {
    const p = await personalPopulation({ role: 'Engagement Partner', email: 'psc.partner@test.local' }, 'payrollData');
    expect(p).toBeInstanceOf(Set);
    expect((p as Set<string>).size).toBe(0);
  });
});

describe('personal.get — isolasi end-to-end lewat router nyata (berjenjang)', () => {
  it('Dimas (self) hanya barisnya sendiri', async () => {
    const r = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect(r.value).toEqual([{ id: 'LV-D1', emp: 'EMP-021', type: 'Cuti Tahunan', status: 'Menunggu' }]);
  });
  it('Rudi (Rekan, unit U-KOM) melihat anggota unitnya (Bayu), TAPI bukan U-LEAD (Dimas/Fajar)', async () => {
    const r = await callerAs('Rekan', RUDI, RUDI_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    const ids = (r.value as Array<{ id: string }>).map((x) => x.id);
    expect(ids).toContain('LV-B1'); // Bayu, U-KOM
    expect(ids).not.toContain('LV-D1'); // Dimas, U-LEAD
    expect(ids).not.toContain('LV-F1'); // Fajar, U-LEAD
  });
  it('Rekan Pemimpin (firm) menerima SEMUA baris', async () => {
    const r = await callerAs('Rekan Pemimpin', HARTONO, HARTONO_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect((r.value as unknown[]).length).toBe(4);
  });
  it('Admin & HR (firm untuk SDM) menerima SEMUA baris', async () => {
    const r = await callerAs('Admin & HR Firma', HR, 'psc.hr@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect((r.value as unknown[]).length).toBe(4);
  });
  it('Engagement Partner default → self-only: TAK menerima baris (decoupling FIRM_ADMIN)', async () => {
    const r = await callerAs('Engagement Partner', PARTNER, 'psc.partner@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'leaveReqs' });
    expect(r.value).toEqual([]); // empId null (bukan staf seed) → kosong
  });
  it('key di luar PERSONAL_KEYS ditolak', async () => {
    await expect(
      callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'wpState' }),
    ).rejects.toMatchObject({ code: 'BAD_REQUEST' });
  });
  it('LUBANG VERSION-0 TERTUTUP: payroll belum ditulis → fallback SEED ter-filter (Dimas hanya barisnya), bukan kosong/semua', async () => {
    const r = await callerAs('Senior Auditor', DIMAS, DIMAS_EMAIL).personal.get({ scope: 'firm', scopeId: FIRM, key: 'payrollData' });
    const keys = Object.keys(r.value as Record<string, unknown>);
    expect(keys).toEqual(['EMP-021']); // hanya barisnya sendiri, dari seed
    expect(r.version).toBe(0);
  });
  it('version-0 seed juga ter-filter untuk HR (semua) & Partner default (kosong)', async () => {
    const hr = await callerAs('Admin & HR Firma', HR, 'psc.hr@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'payrollData' });
    expect(Object.keys(hr.value as Record<string, unknown>).length).toBeGreaterThan(1); // seluruh roster
    const partner = await callerAs('Engagement Partner', PARTNER, 'psc.partner@test.local').personal.get({ scope: 'firm', scopeId: FIRM, key: 'payrollData' });
    expect(partner.value).toEqual({}); // self-only, bukan staf → kosong
  });
});

describe('PERSONAL_KEYS — konsistensi konfigurasi', () => {
  it('memuat key Fase 3 + key baru Isolasi Data Personal (16 total)', () => {
    expect(Object.keys(PERSONAL_KEYS).sort()).toEqual([
      'amlScreening', 'cpeExtra', 'cpeLog', 'hrCases', 'indepAppr', 'indepRotAck', 'indepThreats',
      'independence', 'leaveBalance', 'leaveReqs', 'payrollData', 'pc.ethics', 'pc.gifts',
      'perfGoals', 'perfPeople', 'staffProfile',
    ].sort());
  });
});
