import { describe, it, expect } from 'vitest';
import {
  SMM1_SECTIONS, SMM2_SECTIONS, SMM1_COMPONENT_SECTION, SMM1_SIX_COMPONENTS,
  paraLabel, smm1Ref, smm2Ref, componentParaLabel, paraCovers,
  type SmmParaSpan, type SmmComponentCode,
} from './canon_smm_refs';

/* ============================================================
   Rujukan paragraf SMM 1 & SMM 2.

   Cacat yang ditutup di sini: `QM_COMPONENTS[].ref` ditulis tangan
   dan SALAH pada 7 dari 8 komponen — Ketentuan Etika dirujuk
   "¶31–32" (benar ¶29), Pelaksanaan Perikatan "¶35–36" (benar ¶31),
   Informasi & Komunikasi "¶37–38" (benar ¶33), dst. Tidak ada
   oracle untuk membandingkannya, jadi tidak ada uji yang bisa gagal.

   Uji di bawah ADALAH oracle itu: nilai harfiah dipaku, sehingga
   pergeseran rujukan memerahkan CI.
   ============================================================ */

const span = (p: SmmParaSpan): readonly [number, number] =>
  typeof p === 'number' ? [p, p] : p;

describe('SMM1_SECTIONS — struktur paragraf', () => {
  it('setiap span valid: awal ≤ akhir, dan positif', () => {
    for (const [key, sec] of Object.entries(SMM1_SECTIONS)) {
      const [lo, hi] = span(sec.para);
      expect(lo, `${key} awal positif`).toBeGreaterThan(0);
      expect(hi, `${key} akhir ≥ awal`).toBeGreaterThanOrEqual(lo);
    }
  });

  it('tidak ada dua seksi yang tumpang tindih', () => {
    const all = Object.entries(SMM1_SECTIONS)
      .map(([key, sec]) => ({ key, s: span(sec.para) }))
      .sort((a, b) => a.s[0] - b.s[0]);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].s[0], `${all[i].key} mulai setelah ${all[i - 1].key} selesai`)
        .toBeGreaterThan(all[i - 1].s[1]);
    }
  });

  it('memaku paragraf keenam komponen & kedua proses (¶23–47)', () => {
    expect(SMM1_SECTIONS.riskProcess.para).toEqual([23, 27]);
    expect(SMM1_SECTIONS.governance.para).toBe(28);
    expect(SMM1_SECTIONS.ethics.para).toBe(29);
    expect(SMM1_SECTIONS.acceptance.para).toBe(30);
    expect(SMM1_SECTIONS.performance.para).toBe(31);
    expect(SMM1_SECTIONS.resources.para).toBe(32);
    expect(SMM1_SECTIONS.infoComm.para).toBe(33);
    expect(SMM1_SECTIONS.specificResponses.para).toBe(34);
    expect(SMM1_SECTIONS.monitoring.para).toEqual([35, 47]);
  });

  it('memaku seksi jaringan, evaluasi & dokumentasi', () => {
    expect(SMM1_SECTIONS.network.para).toEqual([48, 52]);
    expect(SMM1_SECTIONS.evaluation.para).toEqual([53, 56]);
    expect(SMM1_SECTIONS.documentation.para).toEqual([57, 60]);
  });
});

describe('SMM2_SECTIONS — struktur paragraf', () => {
  it('tidak ada dua seksi yang tumpang tindih', () => {
    const all = Object.entries(SMM2_SECTIONS)
      .map(([key, sec]) => ({ key, s: span(sec.para) }))
      .sort((a, b) => a.s[0] - b.s[0]);
    for (let i = 1; i < all.length; i++) {
      expect(all[i].s[0], `${all[i].key} mulai setelah ${all[i - 1].key} selesai`)
        .toBeGreaterThan(all[i - 1].s[1]);
    }
  });

  it('memaku ketentuan eligibilitas & pelaksanaan penelaahan', () => {
    expect(SMM2_SECTIONS.appointment.para).toBe(17);
    expect(SMM2_SECTIONS.eligibility.para).toBe(18);
    expect(SMM2_SECTIONS.coolingOff.para).toBe(19);       // jeda 2 tahun
    expect(SMM2_SECTIONS.assistantElig.para).toBe(20);
    expect(SMM2_SECTIONS.eligibilityLapse.para).toEqual([22, 23]);
    expect(SMM2_SECTIONS.procedures.para).toBe(25);
    expect(SMM2_SECTIONS.concerns.para).toBe(26);
    expect(SMM2_SECTIONS.completion.para).toBe(27);
    expect(SMM2_SECTIONS.documentation.para).toEqual([28, 30]);
  });
});

describe('paraLabel', () => {
  it('paragraf tunggal tanpa rentang', () => {
    expect(paraLabel(28)).toBe('¶28');
  });
  it('rentang memakai en dash', () => {
    expect(paraLabel([35, 47])).toBe('¶35–47');
    expect(paraLabel([35, 47])).not.toContain('-');   // hyphen ASCII dilarang
  });
});

describe('componentParaLabel — oracle untuk QM_COMPONENTS[].ref', () => {
  /* Kolom "salah" adalah nilai yang BENAR-BENAR ada di data_part4.ts
     sebelum PR ini; dipertahankan sebagai tripwire regresi. */
  const CASES: ReadonlyArray<readonly [SmmComponentCode, string, string]> = [
    ['C1', '¶28',    '¶28–30'],
    ['C2', '¶23–27', '¶25–27'],
    ['C3', '¶29',    '¶31–32'],
    ['C4', '¶30',    '¶33–34'],
    ['C5', '¶31',    '¶35–36'],
    ['C6', '¶32',    '¶32'],     // satu-satunya yang sudah benar
    ['C7', '¶33',    '¶37–38'],
    ['C8', '¶35–47', '¶38–47'],
  ];

  for (const [code, benar, salahLama] of CASES) {
    it(`${code} → ${benar}`, () => {
      expect(componentParaLabel(code)).toBe(benar);
      if (benar !== salahLama) {
        expect(componentParaLabel(code)).not.toBe(salahLama);
      }
    });
  }

  it('kedelapan kode komponen terpetakan', () => {
    expect(Object.keys(SMM1_COMPONENT_SECTION)).toHaveLength(8);
  });

  it('enam komponen sesungguhnya mengecualikan kedua proses (C2 & C8)', () => {
    expect(SMM1_SIX_COMPONENTS).toHaveLength(6);
    expect(SMM1_SIX_COMPONENTS).not.toContain('C2');   // proses penilaian risiko
    expect(SMM1_SIX_COMPONENTS).not.toContain('C8');   // proses pemantauan & remediasi
  });

  it('keenam komponen menempati ¶28–33 secara berurutan tanpa celah', () => {
    const paras = SMM1_SIX_COMPONENTS
      .map((c) => SMM1_SECTIONS[SMM1_COMPONENT_SECTION[c]].para)
      .map((p) => span(p)[0])
      .sort((a, b) => a - b);
    expect(paras).toEqual([28, 29, 30, 31, 32, 33]);
  });
});

describe('smm1Ref / smm2Ref — nomenklatur', () => {
  it('memakai "SMM", bukan "ISQM" atau "SPM"', () => {
    const refs = [smm1Ref('monitoring'), smm1Ref('governance'), smm2Ref('eligibility')];
    for (const r of refs) {
      expect(r).toMatch(/^SMM [12] ¶/);
      expect(r).not.toContain('ISQM');
      expect(r).not.toContain('SPM');
    }
  });

  it('membentuk rujukan lengkap', () => {
    expect(smm1Ref('monitoring')).toBe('SMM 1 ¶35–47');
    expect(smm1Ref('evaluation')).toBe('SMM 1 ¶53–56');
    expect(smm2Ref('coolingOff')).toBe('SMM 2 ¶19');
  });
});

describe('paraCovers', () => {
  it('span tunggal hanya mencakup dirinya', () => {
    expect(paraCovers(28, 28)).toBe(true);
    expect(paraCovers(28, 29)).toBe(false);
  });

  it('rentang mencakup batas inklusif', () => {
    expect(paraCovers([35, 47], 35)).toBe(true);
    expect(paraCovers([35, 47], 47)).toBe(true);
    expect(paraCovers([35, 47], 34)).toBe(false);
    expect(paraCovers([35, 47], 48)).toBe(false);
  });

  it('¶34 (respons spesifik) BUKAN bagian dari proses pemantauan', () => {
    // register keluhan ¶34(c) sempat dilabeli "¶A56" lalu dikira bagian ¶35–47.
    expect(paraCovers(SMM1_SECTIONS.monitoring.para, 34)).toBe(false);
    expect(paraCovers(SMM1_SECTIONS.specificResponses.para, 34)).toBe(true);
  });
});
