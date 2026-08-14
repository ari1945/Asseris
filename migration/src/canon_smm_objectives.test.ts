import { describe, it, expect } from 'vitest';
import {
  SMM1_OBJECTIVES, SMM1_OBJECTIVE_COUNT, SMM1_OBJECTIVE_BY_ID,
  objectivesForComponent, objectiveCoverage, coverageByComponent, effectiveResponseCoverage,
  type ObjectiveLinkedRisk, type ObjectiveWaiver, type MonitoredObjectiveRisk,
} from './canon_smm_objectives';
import { SMM1_COMPONENT_SECTION, type SmmComponentCode } from './canon_smm_refs';

/* ============================================================
   27 tujuan mutu mandatori SMM 1 ¶28–33.

   Cacat yang ditutup: tujuan mutu di aplikasi adalah teks BEBAS pada
   enam baris `SOQM_RISKS`, dan `QM_COMPONENTS[].obj` adalah integer
   dekoratif tak tertaut apa pun. Metrik "Cakupan Komponen" membagi
   komponen-yang-punya-risiko dengan jumlah komponen — sehingga SATU
   risiko per komponen sudah menghasilkan 100%, sementara 21 tujuan
   mandatori tak pernah dipertimbangkan.

   Uji `metrik lama vs metrik tujuan` di bawah memaku selisih itu.
   ============================================================ */

const ALL_IDS = SMM1_OBJECTIVES.map((o) => o.id);

const risk = (...objectives: string[]): ObjectiveLinkedRisk => ({ id: 'QR-x', objectives });
const fullWaiver = (objectiveId: string): ObjectiveWaiver => ({
  objectiveId,
  justification: 'Praktisi tunggal tanpa staf — tak ada tim untuk diarahkan atau disupervisi.',
  proposedBy: 'Anindya Pramesti, CPA (¶20(b))',
  approvedBy: 'Hartono Wijaya, CPA (¶20(a))',
});

describe('SMM1_OBJECTIVES — kelengkapan enumerasi', () => {
  it('berjumlah tepat 27', () => {
    expect(SMM1_OBJECTIVES).toHaveLength(27);
    expect(SMM1_OBJECTIVE_COUNT).toBe(27);
  });

  it('sebaran per paragraf sesuai ¶28–33 (5·2·2·6·8·4)', () => {
    const per = (p: number) => SMM1_OBJECTIVES.filter((o) => o.para === p).length;
    expect(per(28)).toBe(5);
    expect(per(29)).toBe(2);
    expect(per(30)).toBe(2);
    expect(per(31)).toBe(6);
    expect(per(32)).toBe(8);
    expect(per(33)).toBe(4);
    expect(per(28) + per(29) + per(30) + per(31) + per(32) + per(33)).toBe(SMM1_OBJECTIVE_COUNT);
  });

  it('tidak ada tujuan di luar ¶28–33', () => {
    const stray = SMM1_OBJECTIVES.filter((o) => o.para < 28 || o.para > 33);
    expect(stray.map((o) => o.id)).toEqual([]);
  });

  it('id unik & berbentuk QO-<para><butir>', () => {
    expect(new Set(ALL_IDS).size).toBe(ALL_IDS.length);
    for (const o of SMM1_OBJECTIVES) {
      expect(o.id).toBe(`QO-${o.para}${o.item}`);
      expect(o.id).toMatch(/^QO-3?[0-9]{1,2}[a-h]$/);
    }
  });

  it('butir tiap paragraf berurutan mulai dari "a" tanpa lompatan', () => {
    for (const p of [28, 29, 30, 31, 32, 33] as const) {
      const items = SMM1_OBJECTIVES.filter((o) => o.para === p).map((o) => o.item);
      const expected = items.map((_, i) => String.fromCharCode(97 + i));
      expect(items, `butir ¶${p}`).toEqual(expected);
    }
  });

  it('setiap tujuan punya judul yang bermakna', () => {
    for (const o of SMM1_OBJECTIVES) {
      expect(o.title.trim().length, o.id).toBeGreaterThan(20);
    }
  });

  it('peta id → tujuan konsisten dengan daftar', () => {
    expect(SMM1_OBJECTIVE_BY_ID.size).toBe(27);
    for (const o of SMM1_OBJECTIVES) expect(SMM1_OBJECTIVE_BY_ID.get(o.id)).toBe(o);
  });
});

describe('pemetaan tujuan → komponen', () => {
  it('tiap paragraf memetakan ke komponen yang benar', () => {
    const compOf = (p: number): string => SMM1_OBJECTIVES.find((o) => o.para === p)!.component;
    expect(compOf(28)).toBe('C1');   // Tata Kelola & Kepemimpinan
    expect(compOf(29)).toBe('C3');   // Ketentuan Etika
    expect(compOf(30)).toBe('C4');   // Penerimaan & Keberlanjutan
    expect(compOf(31)).toBe('C5');   // Pelaksanaan Perikatan
    expect(compOf(32)).toBe('C6');   // Sumber Daya
    expect(compOf(33)).toBe('C7');   // Informasi & Komunikasi
  });

  it('semua tujuan satu paragraf berada di komponen yang sama', () => {
    for (const p of [28, 29, 30, 31, 32, 33] as const) {
      const comps = new Set(SMM1_OBJECTIVES.filter((o) => o.para === p).map((o) => o.component));
      expect(comps.size, `¶${p}`).toBe(1);
    }
  });

  it('C2 & C8 adalah PROSES — tidak memiliki tujuan ¶28–33', () => {
    expect(objectivesForComponent('C2')).toHaveLength(0);   // proses penilaian risiko ¶23–27
    expect(objectivesForComponent('C8')).toHaveLength(0);   // pemantauan & remediasi ¶35–47
  });

  it('keenam komponen pemilik tujuan menjumlah 27', () => {
    const codes = Object.keys(SMM1_COMPONENT_SECTION) as SmmComponentCode[];
    const total = codes.reduce((s, c) => s + objectivesForComponent(c).length, 0);
    expect(total).toBe(27);
  });

  it('jumlah per komponen sesuai standar', () => {
    expect(objectivesForComponent('C1')).toHaveLength(5);
    expect(objectivesForComponent('C3')).toHaveLength(2);
    expect(objectivesForComponent('C4')).toHaveLength(2);
    expect(objectivesForComponent('C5')).toHaveLength(6);
    expect(objectivesForComponent('C6')).toHaveLength(8);
    expect(objectivesForComponent('C7')).toHaveLength(4);
  });
});

describe('objectiveCoverage — gerbang yang bisa GAGAL', () => {
  it('tanpa risiko & tanpa waiver: 27 tujuan tak tertangani', () => {
    const cov = objectiveCoverage([], []);
    expect(cov.uncovered).toHaveLength(27);
    expect(cov.covered).toEqual([]);
    expect(cov.addressedPct).toBe(0);
    expect(cov.complete).toBe(false);
  });

  it('input null/undefined diperlakukan sebagai kosong, bukan lolos', () => {
    expect(objectiveCoverage(null, null).complete).toBe(false);
    expect(objectiveCoverage(undefined, undefined).uncovered).toHaveLength(27);
  });

  it('lengkap hanya ketika ke-27 tujuan tertangani', () => {
    const cov = objectiveCoverage([risk(...ALL_IDS)], []);
    expect(cov.covered).toHaveLength(27);
    expect(cov.uncovered).toEqual([]);
    expect(cov.addressedPct).toBe(100);
    expect(cov.complete).toBe(true);
  });

  it('menghapus satu tautan risiko menurunkan cakupan & membuka defisiensi', () => {
    const minusOne = ALL_IDS.filter((id) => id !== 'QO-32d');
    const cov = objectiveCoverage([risk(...minusOne)], []);
    expect(cov.uncovered).toEqual(['QO-32d']);
    expect(cov.complete).toBe(false);
    expect(cov.addressedPct).toBeLessThan(100);
  });

  it('beberapa risiko boleh menunjuk tujuan yang sama tanpa dihitung ganda', () => {
    const cov = objectiveCoverage([risk('QO-28a'), risk('QO-28a'), risk('QO-28b')], []);
    expect(cov.covered).toEqual(['QO-28a', 'QO-28b']);
  });

  it('id tujuan yang tidak dikenal pada risiko diabaikan — tidak menaikkan cakupan', () => {
    const cov = objectiveCoverage([risk('QO-99z', 'TIDAK-ADA')], []);
    expect(cov.covered).toEqual([]);
    expect(cov.uncovered).toHaveLength(27);
  });

  it('risiko tanpa tautan tujuan tidak menutupi apa pun', () => {
    const cov = objectiveCoverage([{ id: 'QR-01' }, { id: 'QR-02', objectives: null }], []);
    expect(cov.covered).toEqual([]);
    expect(cov.complete).toBe(false);
  });
});

describe('waiver ¶17 — hanya yang berjustifikasi DAN berjenjang yang menutupi', () => {
  it('waiver lengkap menutupi tujuan sebagai "dikesampingkan", bukan "tercakup"', () => {
    const cov = objectiveCoverage([], [fullWaiver('QO-31b')]);
    expect(cov.waived).toEqual(['QO-31b']);
    expect(cov.covered).toEqual([]);
    expect(cov.uncovered).not.toContain('QO-31b');
    expect(cov.waiverAudit[0].valid).toBe(true);
  });

  it('tanpa justifikasi: TIDAK sah, tujuan tetap defisiensi', () => {
    const cov = objectiveCoverage([], [{ ...fullWaiver('QO-31b'), justification: '   ' }]);
    expect(cov.waived).toEqual([]);
    expect(cov.uncovered).toContain('QO-31b');
    expect(cov.waiverAudit[0].defects).toContain('no-justification');
  });

  it('tanpa pengusul ¶20(b): TIDAK sah', () => {
    const cov = objectiveCoverage([], [{ ...fullWaiver('QO-31b'), proposedBy: null }]);
    expect(cov.uncovered).toContain('QO-31b');
    expect(cov.waiverAudit[0].defects).toContain('not-proposed');
  });

  it('tanpa penyetuju ¶20(a): TIDAK sah — satu tanda tangan tidak cukup', () => {
    const cov = objectiveCoverage([], [{ ...fullWaiver('QO-31b'), approvedBy: '' }]);
    expect(cov.uncovered).toContain('QO-31b');
    expect(cov.waiverAudit[0].defects).toContain('not-approved');
  });

  it('waiver atas tujuan yang tidak dikenal ditandai cacat', () => {
    const cov = objectiveCoverage([], [fullWaiver('QO-99z')]);
    expect(cov.waiverAudit[0].valid).toBe(false);
    expect(cov.waiverAudit[0].defects).toContain('unknown-objective');
    expect(cov.uncovered).toHaveLength(27);
  });

  it('risiko + waiver bersama-sama bisa mencapai lengkap', () => {
    const linked = ALL_IDS.filter((id) => id !== 'QO-31b');
    const cov = objectiveCoverage([risk(...linked)], [fullWaiver('QO-31b')]);
    expect(cov.covered).toHaveLength(26);
    expect(cov.waived).toEqual(['QO-31b']);
    expect(cov.complete).toBe(true);
    expect(cov.addressedPct).toBe(100);
  });
});

describe('REGRESI — metrik lama vs metrik tujuan', () => {
  it('satu risiko per komponen: metrik lama 100%, metrik tujuan JAUH dari lengkap', () => {
    /* Register seed lama: enam risiko, satu per komponen. Metrik
       "Cakupan Komponen" = komponen-punya-risiko / komponen = 100%,
       sementara hanya 6 dari 27 tujuan mandatori tersentuh. */
    const onePerComponent = [
      risk('QO-28a'), risk('QO-29a'), risk('QO-30a'),
      risk('QO-31a'), risk('QO-32a'), risk('QO-33a'),
    ];
    const cov = objectiveCoverage(onePerComponent, []);

    // metrik lama: keenam komponen pemilik tujuan semuanya "tercakup"
    const byComp = coverageByComponent(cov);
    expect(byComp.every((c) => c.covered > 0)).toBe(true);

    // metrik tujuan: 21 dari 27 tak tertangani
    expect(cov.covered).toHaveLength(6);
    expect(cov.uncovered).toHaveLength(21);
    expect(cov.complete).toBe(false);
    expect(cov.addressedPct).toBe(22);
  });
});

describe('coverageByComponent', () => {
  it('hanya komponen pemilik tujuan yang muncul (C2 & C8 dikecualikan)', () => {
    const byComp = coverageByComponent(objectiveCoverage([], []));
    expect(byComp.map((c) => c.component)).toEqual(['C1', 'C3', 'C4', 'C5', 'C6', 'C7']);
  });

  it('total per komponen menjumlah 27 dan konsisten dengan covered+waived+uncovered', () => {
    const cov = objectiveCoverage([risk('QO-32a', 'QO-32b')], [fullWaiver('QO-31b')]);
    const byComp = coverageByComponent(cov);
    expect(byComp.reduce((s, c) => s + c.total, 0)).toBe(27);
    for (const c of byComp) {
      expect(c.covered + c.waived + c.uncovered, c.component).toBe(c.total);
    }
    expect(byComp.find((c) => c.component === 'C6')!.covered).toBe(2);
    expect(byComp.find((c) => c.component === 'C5')!.waived).toBe(1);
  });
});

describe('effectiveResponseCoverage', () => {
  const mrisk = (monitor: string, ...objectives: string[]): MonitoredObjectiveRisk =>
    ({ id: 'QR-x', objectives, monitor });

  it('tanpa risiko sama sekali: nol efektif atas 27, bukan 100%', () => {
    /* Penyebut kosong dulu berarti NaN/100%. Tak ada respons ≠ semua efektif. */
    const e = effectiveResponseCoverage([], []);
    expect(e.effective).toEqual([]);
    expect(e.noResponse).toHaveLength(SMM1_OBJECTIVE_COUNT);
    expect(e.requiring).toBe(SMM1_OBJECTIVE_COUNT);
    expect(e.effectivePct).toBe(0);
  });

  it('satu respons defisiensi membatalkan tujuannya walau ada respons lain yang efektif', () => {
    /* Tujuan hanya terlindungi bila SELURUH responsnya bekerja. */
    const e = effectiveResponseCoverage(
      [mrisk('Efektif', 'QO-32a'), mrisk('Defisiensi', 'QO-32a')], [],
    );
    expect(e.effective).toEqual([]);
    expect(e.notEffective).toEqual(['QO-32a']);
  });

  it("'Belum Diuji' tidak dihitung efektif", () => {
    const e = effectiveResponseCoverage([mrisk('Belum Diuji', 'QO-32a')], []);
    expect(e.notEffective).toEqual(['QO-32a']);
    expect(e.effective).toEqual([]);
  });

  it('risiko tanpa tujuan mandatori tidak menaikkan pembilang', () => {
    /* Risiko proses ¶35–47 (`objectives: []`) dan tautan menggantung. */
    const e = effectiveResponseCoverage(
      [mrisk('Efektif'), mrisk('Efektif', 'QO-tidak-ada')], [],
    );
    expect(e.effective).toEqual([]);
    expect(e.effectivePct).toBe(0);
  });

  it('waiver ¶17 yang SAH mengecilkan penyebut, bukan menambah pembilang', () => {
    const e = effectiveResponseCoverage([mrisk('Efektif', 'QO-32a')], [fullWaiver('QO-31b')]);
    expect(e.waived).toEqual(['QO-31b']);
    expect(e.effective).toEqual(['QO-32a']);
    expect(e.requiring).toBe(SMM1_OBJECTIVE_COUNT - 1);
  });

  it('waiver CACAT tidak mengecilkan penyebut', () => {
    /* Waiver tanpa justifikasi/persetujuan bukan pengesampingan yang sah;
       tujuannya tetap menuntut respons. */
    const e = effectiveResponseCoverage([], [{ objectiveId: 'QO-31b' } as ObjectiveWaiver]);
    expect(e.waived).toEqual([]);
    expect(e.requiring).toBe(SMM1_OBJECTIVE_COUNT);
    expect(e.noResponse).toContain('QO-31b');
  });

  it('keempat keranjang selalu menjumlah 27, tanpa tumpang tindih', () => {
    const e = effectiveResponseCoverage(
      [mrisk('Efektif', 'QO-32a'), mrisk('Defisiensi', 'QO-29a')], [fullWaiver('QO-31b')],
    );
    const all = [...e.effective, ...e.notEffective, ...e.noResponse, ...e.waived];
    expect(all).toHaveLength(SMM1_OBJECTIVE_COUNT);
    expect(new Set(all).size).toBe(SMM1_OBJECTIVE_COUNT);
  });
});
