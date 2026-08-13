import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import {
  componentMetrics, coverageText, COMPONENT_STATUS_LABEL,
  type ComponentRowLike, type ComponentRiskLike,
} from './canon_smm_component_metrics';
import { objectiveCoverage, coverageByComponent, type ObjectiveLinkedRisk, type ObjectiveWaiver } from './canon_smm_objectives';
import { evaluateSmm } from './canon_smm_evaluation';
import { collectSmmDeficiencies, type RiskRowLike } from './canon_smm_deficiencies';

/* ============================================================
   V-3 (tinjauan visual 2026-08-13) — kartu komponen memakai
   angka karangan.

   Kartu C1 berbunyi "3 risiko · 92%" sementara register hanya
   punya 6 risiko dan NOL di antaranya milik Tata Kelola, dan tab
   Tujuan Mutu pada layar yang SAMA berbunyi "C1 · 0/5 tertangani".
   Penjumlahan seluruh kartu = 35 risiko atas register berisi 6.
   ============================================================ */

const COMPS: ComponentRowLike[] = [
  { id: 'C1', name: 'Tata Kelola & Kepemimpinan' },
  { id: 'C2', name: 'Proses Penilaian Risiko Firma' },
  { id: 'C6', name: 'Sumber Daya' },
];

const RISKS: ComponentRiskLike[] = [
  { id: 'QR-02', comp: 'Sumber Daya', monitor: 'Defisiensi' },
  { id: 'QR-06', comp: 'Pemantauan & Remediasi', monitor: 'Efektif' },
];

describe('metrik komponen DITURUNKAN, bukan seed', () => {
  const m = componentMetrics(COMPS, RISKS, [], null, []);
  const byId = new Map(m.map((x) => [x.id, x]));

  it('komponen tanpa risiko terdaftar melaporkan NOL — bukan 3', () => {
    expect(byId.get('C1')?.riskCount).toBe(0);
  });

  it('komponen dengan risiko melaporkan jumlah nyata', () => {
    expect(byId.get('C6')?.riskCount).toBe(1);
  });

  it('TRIPWIRE — total risiko seluruh kartu tak boleh melebihi register', () => {
    const total = m.reduce((s, x) => s + x.riskCount, 0);
    expect(total).toBeLessThanOrEqual(RISKS.length);
  });

  it('risiko yang pemantauannya belum efektif dihitung terpisah', () => {
    expect(byId.get('C6')?.riskNotEffective).toBe(1);
  });
});

describe('status komponen diturunkan dari defisiensi & cakupan tujuan', () => {
  it('defisiensi TERBUKA pada komponen ⇒ status Defisiensi', () => {
    const ev = evaluateSmm([{ id: 'QR-02', component: 'Sumber Daya', severity: 'Tinggi' }]);
    const m = componentMetrics(COMPS, RISKS, [], ev,
      [{ origin: 'risk', id: 'QR-02', component: 'Sumber Daya' }]);
    expect(m.find((x) => x.id === 'C6')?.status).toBe('deficient');
  });

  it('tanpa defisiensi tetapi tujuan belum tertangani ⇒ Perlu Perhatian', () => {
    const m = componentMetrics(COMPS, RISKS,
      [{ component: 'C1', total: 5, covered: 0, waived: 0, uncovered: 5 }], null, []);
    expect(m.find((x) => x.id === 'C1')?.status).toBe('attention');
  });

  it('tujuan tertangani penuh & tanpa defisiensi ⇒ Efektif', () => {
    const m = componentMetrics(COMPS, RISKS,
      [{ component: 'C1', total: 5, covered: 4, waived: 1, uncovered: 0 }], null, []);
    expect(m.find((x) => x.id === 'C1')?.status).toBe('effective');
  });

  it('C2 & C8 adalah PROSES — ketiadaan entri cakupan bukan nol cakupan', () => {
    const m = componentMetrics(COMPS, RISKS, [], null, []);
    const c2 = m.find((x) => x.id === 'C2');
    expect(c2?.isProcess).toBe(true);
    expect(c2?.status).toBe('effective');            // bukan 'attention'
    expect(coverageText(c2!)).toContain('proses');
  });

  it('label status tersedia untuk ketiga keadaan', () => {
    expect(COMPONENT_STATUS_LABEL.deficient).toBe('Defisiensi');
    expect(COMPONENT_STATUS_LABEL.attention).toBe('Perlu Perhatian');
    expect(COMPONENT_STATUS_LABEL.effective).toBe('Efektif');
  });
});

describe('di atas seed nyata', () => {
  const A = AMS as unknown as {
    QM_COMPONENTS: ComponentRowLike[];
    SOQM_RISKS: Array<ComponentRiskLike & ObjectiveLinkedRisk & RiskRowLike>;
    SMM_OBJECTIVE_WAIVERS?: ObjectiveWaiver[];
    QM_NETWORK?: unknown;
  };
  const cov = objectiveCoverage(A.SOQM_RISKS, A.SMM_OBJECTIVE_WAIVERS || []);
  const defs = collectSmmDeficiencies({ risks: A.SOQM_RISKS, network: A.QM_NETWORK as never });
  const m = componentMetrics(A.QM_COMPONENTS, A.SOQM_RISKS, coverageByComponent(cov), evaluateSmm(defs), defs);

  it('TRIPWIRE — jumlah risiko seluruh kartu = jumlah register, bukan 35', () => {
    const total = m.reduce((s, x) => s + x.riskCount, 0);
    expect(total).toBe(A.SOQM_RISKS.length);
  });

  it('Tata Kelola & Kepemimpinan tidak lagi mengklaim risiko yang tak ada', () => {
    const c1 = m.find((x) => x.id === 'C1');
    expect(c1?.riskCount).toBe(0);
    /* 27 tujuan mandatori sebagian besar belum tertangani — kartu wajib
       mencerminkan itu, bukan menampilkan skor 92%. */
    expect(c1?.objectivesTotal).toBe(5);
    expect(c1?.objectivesAddressed).toBeLessThan(5);
    expect(c1?.status).not.toBe('effective');
  });

  it('kedelapan komponen terwakili', () => {
    expect(m.length).toBe(A.QM_COMPONENTS.length);
  });
});
