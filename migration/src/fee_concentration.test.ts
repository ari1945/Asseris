/* ============================================================
   Konsentrasi Imbalan (Kode Etik/IESBA 290) — mesin murni.
   Memastikan: rasio firma & partner benar, klasifikasi PIE (breach/watch)
   vs non-PIE (informatif, tak pernah breach), hanya klien aktif, urutan
   menurun, ringkasan, dan integrasi seed CLIENTS nyata.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { feeConcentration, feeConcentrationMap, FEE_CONCENTRATION_CONFIG } from './fee_concentration';
import { CLIENTS } from './data_part1';

const REV = 10_000;
const CLI = [
  { id: 'C-1', name: 'PT Alpha', partner: 'P.A', listed: true, fee: 2_000, status: 'Active' },  // 20% → breach (PIE)
  { id: 'C-2', name: 'PT Beta', partner: 'P.B', listed: true, fee: 1_200, status: 'Active' },   // 12% → watch (PIE)
  { id: 'C-3', name: 'PT Gamma', partner: 'P.A', listed: true, fee: 500, status: 'Active' },     // 5% → ok (PIE)
  { id: 'C-4', name: 'PT Delta', partner: 'P.C', listed: false, fee: 3_500, status: 'Active' },  // 35% → watch (non-PIE)
  { id: 'C-5', name: 'PT Epsilon', partner: 'P.C', listed: false, fee: 1_000, status: 'Active' },// 10% → ok (non-PIE)
  { id: 'C-6', name: 'PT Zeta', partner: 'P.B', listed: true, fee: 9_999, status: 'Proposal' },  // dikecualikan
];

describe('feeConcentration — rasio & klasifikasi', () => {
  const sum = feeConcentration(CLI, REV);
  const byId = feeConcentrationMap(sum);

  it('hanya klien Active (Proposal dikecualikan)', () => {
    expect(sum.rows.map((r) => r.clientId)).not.toContain('C-6');
    expect(sum.rows.length).toBe(5);
  });

  it('rasio-firma = fee / pendapatan firma', () => {
    expect(byId['C-1'].ratioFirm).toBeCloseTo(0.20, 6);
    expect(byId['C-4'].ratioFirm).toBeCloseTo(0.35, 6);
  });

  it('PIE ≥ 15% → breach; 10–15% → watch; < 10% → ok', () => {
    expect(byId['C-1'].level).toBe('breach');
    expect(byId['C-2'].level).toBe('watch');
    expect(byId['C-3'].level).toBe('ok');
  });

  it('non-PIE tidak pernah breach — hanya watch di atas ambang informatif', () => {
    expect(byId['C-4'].level).toBe('watch'); // 35% ≥ 30% nonPieWatch
    expect(byId['C-5'].level).toBe('ok');    // 10% < 30%
    // meski 35% > ambang PIE 15%, non-PIE tak boleh 'breach'
    expect(byId['C-4'].level).not.toBe('breach');
  });

  it('rasio-partner = fee / Σ fee klien partner tsb', () => {
    // P.A = C-1(2000)+C-3(500) = 2500 → C-1 = 0.8, C-3 = 0.2
    expect(byId['C-1'].ratioPartner).toBeCloseTo(0.8, 6);
    expect(byId['C-3'].ratioPartner).toBeCloseTo(0.2, 6);
  });

  it('ambang efektif mengikuti status PIE', () => {
    expect(byId['C-1'].threshold).toBe(FEE_CONCENTRATION_CONFIG.pieBreach);
    expect(byId['C-4'].threshold).toBe(FEE_CONCENTRATION_CONFIG.nonPieWatch);
  });

  it('urut menurun berdasar rasio-firma & ringkasan benar', () => {
    expect(sum.rows[0].clientId).toBe('C-4'); // 35% tertinggi
    expect(sum.topRatio).toBeCloseTo(0.35, 6);
    expect(sum.breaches).toBe(1); // hanya C-1
    expect(sum.watches).toBe(2);  // C-2, C-4
    expect(sum.totalFee).toBe(2000 + 1200 + 500 + 3500 + 1000);
    expect(sum.firmRevenue).toBe(REV);
  });

  it('pendapatan firma 0 → rasio 0 aman (tanpa div-by-zero)', () => {
    const s0 = feeConcentration(CLI, 0);
    expect(s0.rows.every((r) => r.ratioFirm === 0)).toBe(true);
    expect(s0.breaches).toBe(0);
  });

  it('override config ambang dipatuhi', () => {
    const strict = feeConcentration(CLI, REV, { pieBreach: 0.10, pieWatch: 0.04, nonPieWatch: 0.20 });
    const m = feeConcentrationMap(strict);
    expect(m['C-2'].level).toBe('breach'); // 12% ≥ 10%
    expect(m['C-3'].level).toBe('watch');  // 5% ≥ 4%
  });
});

describe('feeConcentration — integrasi seed nyata', () => {
  it('menghasilkan baris untuk klien aktif seed & rasio wajar (0..1)', () => {
    const sum = feeConcentration(CLIENTS, 11_300_000_000);
    expect(sum.rows.length).toBeGreaterThan(0);
    expect(sum.rows.every((r) => r.ratioFirm >= 0 && r.ratioFirm <= 1)).toBe(true);
    // C-052 berstatus Proposal → tak boleh muncul
    expect(sum.rows.map((r) => r.clientId)).not.toContain('C-052');
  });
});
