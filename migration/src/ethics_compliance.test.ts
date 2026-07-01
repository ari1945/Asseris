import { describe, it, expect } from 'vitest';
import { ethicsComplianceOf, resolveEmpId, type EthicsDeclRec, type AmlRec, type OverrideRec } from './ethics_compliance';

const decl: Record<string, EthicsDeclRec> = {
  'EMP-001': { signed: true },
  'EMP-022': { signed: false }, // Sinta — deklarasi belum sah
  'EMP-008': { signed: false },
};
const aml: AmlRec[] = [
  { id: 'EMP-001', result: 'Bersih' },
  { id: 'EMP-022', result: 'Bersih' },
  { id: 'EMP-008', result: 'Tertunda' }, // AML tertunda
];
const PERIOD = 'TA 2026';

describe('ethicsComplianceOf — gerbang sign-off/opini', () => {
  it('LOLOS bila deklarasi sah & AML bersih', () => {
    const c = ethicsComplianceOf(decl, aml, {}, 'EMP-001', PERIOD);
    expect(c.ok).toBe(true);
    expect(c.blocked).toBe(false);
  });

  it('BLOKIR bila deklarasi belum ditandatangani (AML bersih)', () => {
    const c = ethicsComplianceOf(decl, aml, {}, 'EMP-022', PERIOD);
    expect(c.blocked).toBe(true);
    expect(c.signed).toBe(false);
    expect(c.amlOk).toBe(true);
    expect(c.reason).toMatch(/belum ditandatangani/);
  });

  it('BLOKIR ganda bila deklarasi belum sah & AML tertunda', () => {
    const c = ethicsComplianceOf(decl, aml, {}, 'EMP-008', PERIOD);
    expect(c.blocked).toBe(true);
    expect(c.reason).toMatch(/AML/);
  });

  it('LOLOS via pengecualian Partner untuk periode yang sama', () => {
    const ov: Record<string, OverrideRec> = { 'EMP-022': { by: 'Hartono', at: '01 Jul 2026', reason: 'darurat', period: PERIOD } };
    const c = ethicsComplianceOf(decl, aml, ov, 'EMP-022', PERIOD);
    expect(c.ok).toBe(true);
    expect(c.overridden).toBe(true);
    expect(c.blocked).toBe(false);
  });

  it('pengecualian periode LAIN tidak berlaku', () => {
    const ov: Record<string, OverrideRec> = { 'EMP-022': { by: 'Hartono', at: '2025', period: 'TA 2025' } };
    const c = ethicsComplianceOf(decl, aml, ov, 'EMP-022', PERIOD);
    expect(c.blocked).toBe(true);
    expect(c.overridden).toBe(false);
  });

  it('fail-open bila pengguna tak terpetakan ke pegawai (empId null)', () => {
    const c = ethicsComplianceOf(decl, aml, {}, null, PERIOD);
    expect(c.ok).toBe(true);
    expect(c.blocked).toBe(false);
  });
});

describe('resolveEmpId — pemetaan pengguna sesi → EMP via STAFF (email/nama)', () => {
  it('null untuk pengguna kosong', () => {
    expect(resolveEmpId(null)).toBeNull();
    expect(resolveEmpId({})).toBeNull();
  });
  it('cocok via email STAFF seed (SSOT data)', () => {
    // AMS.STAFF di-seed dari data_part1; email → EMP id.
    expect(resolveEmpId({ email: 'hartono.w@whr-cpa.id' })).toBe('EMP-001');
    expect(resolveEmpId({ email: 'SINTA.W@WHR-CPA.ID' })).toBe('EMP-022'); // case-insensitive
  });
  it('fallback via nama bila email tak cocok', () => {
    expect(resolveEmpId({ name: 'Anindya Pramesti' })).toBe('EMP-007');
  });
});
