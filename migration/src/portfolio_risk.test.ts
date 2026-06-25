/* ============================================================
   Portfolio Risk — agregasi RoMM lintas-perikatan.
   Memastikan: angka turun dari register (SSOT), perikatan tanpa
   register ditandai "belum dinilai", band & urutan benar.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { portfolioRisk, riskBand } from './portfolio_risk';

const CLIENTS = [
  { id: 'C-1', name: 'PT Alpha', industry: 'Manufaktur' },
  { id: 'C-2', name: 'PT Beta', industry: 'Properti' },
];

const ENGAGEMENTS = [
  { id: 'E-1', clientId: 'C-1', partner: 'P. Satu', phase: 'Eksekusi', type: 'Audit', risk: 'High' },
  { id: 'E-2', clientId: 'C-2', partner: 'P. Dua', phase: 'Perencanaan', type: 'Audit', risk: 'Medium' },
];

const RISKS = [
  // E-1: register dinilai — satu fraud signifikan (4×5=20), satu moderate (2×3=6)
  { engagementId: 'E-1', likelihood: 4, impact: 5, fraud: true },
  { engagementId: 'E-1', likelihood: 2, impact: 3, fraud: false },
  // E-2: tanpa register
];

describe('riskBand', () => {
  it('memetakan skor ke band sesuai ambang view_risk', () => {
    expect(riskBand(20)).toBe('Significant');
    expect(riskBand(15)).toBe('Significant');
    expect(riskBand(12)).toBe('Elevated');
    expect(riskBand(6)).toBe('Moderate');
    expect(riskBand(4)).toBe('Low');
    expect(riskBand(0)).toBe('Low');
  });
});

describe('portfolioRisk', () => {
  const sum = portfolioRisk(ENGAGEMENTS, CLIENTS, RISKS);

  it('mengagregasi angka per-perikatan dari register (SSOT)', () => {
    const e1 = sum.rows.find((r) => r.engagementId === 'E-1')!;
    expect(e1.assessed).toBe(true);
    expect(e1.total).toBe(2);
    expect(e1.significant).toBe(1); // hanya 20 ≥ 12
    expect(e1.fraud).toBe(1);
    expect(e1.maxScore).toBe(20);
    expect(e1.band).toBe('Significant');
    expect(e1.client).toBe('PT Alpha');
    expect(e1.industry).toBe('Manufaktur');
  });

  it('menandai perikatan tanpa register sebagai belum dinilai', () => {
    const e2 = sum.rows.find((r) => r.engagementId === 'E-2')!;
    expect(e2.assessed).toBe(false);
    expect(e2.total).toBe(0);
    expect(e2.significant).toBe(0);
    expect(e2.maxScore).toBe(0);
    expect(e2.engRating).toBe('Medium'); // rating kasar metadata tetap dibawa
  });

  it('mengurutkan yang dinilai lebih dulu', () => {
    expect(sum.rows[0].engagementId).toBe('E-1');
    expect(sum.rows[1].engagementId).toBe('E-2');
  });

  it('total firma menjumlahkan lintas portofolio', () => {
    expect(sum.engagements).toBe(2);
    expect(sum.assessed).toBe(1);
    expect(sum.unassessed).toBe(1);
    expect(sum.totalRisks).toBe(2);
    expect(sum.significant).toBe(1);
    expect(sum.fraud).toBe(1);
  });

  it('mengabaikan baris register tanpa engagementId', () => {
    const sum2 = portfolioRisk(ENGAGEMENTS, CLIENTS, [...RISKS, { likelihood: 5, impact: 5, fraud: true }]);
    expect(sum2.totalRisks).toBe(2); // baris yatim tak terhitung
  });
});
