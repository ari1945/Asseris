import { describe, it, expect } from 'vitest';
import {
  ILLUSTRATIVE_RISKS, ILLUSTRATIVE_RISK_SOURCE, OBJECTIVES_WITH_ILLUSTRATIVE_RISKS,
  illustrativeRisksFor, illustrativeDocsFor, danglingObjectiveRefs,
} from './canon_smm_illustrative_risks';
import { SMM1_OBJECTIVE_BY_ID } from './canon_smm_objectives';
import * as illustrative from './canon_smm_illustrative_risks';

/* ============================================================
   Risiko mutu ILUSTRATIF (Matriks V3 IAPI) — saran baca-saja.

   Uji ini menjaga tiga pagar yang lebih penting daripada isinya:
   atribusi sumber, ketiadaan jalur tulis, dan pemisahan tegas antara
   "saran IAPI" dengan "risiko yang ditetapkan firma".
   ============================================================ */

describe('bentuk & keterkaitan', () => {
  it('PR-8a-2a memuat komponen 1 & 2 saja — 22 risiko atas 7 tujuan', () => {
    expect(ILLUSTRATIVE_RISKS).toHaveLength(22);
    expect([...OBJECTIVES_WITH_ILLUSTRATIVE_RISKS].sort()).toEqual(
      ['QO-28a', 'QO-28b', 'QO-28c', 'QO-28d', 'QO-28e', 'QO-29a', 'QO-29b'],
    );
  });

  it('setiap entri menunjuk tujuan mandatori yang benar-benar ada (SC-13)', () => {
    expect(danglingObjectiveRefs()).toEqual([]);
    for (const r of ILLUSTRATIVE_RISKS) {
      expect(SMM1_OBJECTIVE_BY_ID.has(r.objectiveId), r.id).toBe(true);
    }
  });

  it('id unik dan berpola IR-<para><butir>-<urut>', () => {
    const ids = ILLUSTRATIVE_RISKS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of ILLUSTRATIVE_RISKS) {
      expect(r.id, r.id).toMatch(/^IR-\d{2}[a-h]-\d+$/);
      expect(r.id.startsWith('IR-' + r.objectiveId.slice(3) + '-'), r.id).toBe(true);
    }
  });

  it('tiap entri punya rumusan & sekurangnya satu dokumen Toolkit', () => {
    for (const r of ILLUSTRATIVE_RISKS) {
      expect(r.summary.trim().length, r.id).toBeGreaterThan(30);
      expect(r.toolkitDocs.length, r.id).toBeGreaterThan(0);
      for (const d of r.toolkitDocs) expect(d, r.id).toMatch(/^\d\.\d+$/);
    }
  });

  it('atribusi sumber tunggal & menyebut bahwa teksnya dirumuskan ulang (SC-13)', () => {
    /* Atribusi disimpan SEKALI di tingkat modul, bukan disalin per entri —
       supaya tidak mungkin ada entri yang lupa mencantumkannya. */
    expect(ILLUSTRATIVE_RISK_SOURCE).toMatch(/Matriks Ilustrasi Risiko Mutu V3/);
    expect(ILLUSTRATIVE_RISK_SOURCE).toMatch(/dirumuskan ulang/i);
  });
});

describe('SC-14 — tidak ada jalur tulis ke register risiko firma', () => {
  it('modul tidak mengekspor mutator apa pun', () => {
    /* Sekat STRUKTURAL, bukan tipografis. Bila kelak ada yang menambahkan
       `adoptAll()` / `toSoqmRisk()` / setter, uji ini gagal — dan memang harus,
       karena Matriks melarang memakai contohnya tanpa pertimbangan relevansi. */
    const terlarang = /^(set|add|adopt|apply|push|write|save|update|remove|delete|import|to)/i;
    const bocor = Object.keys(illustrative).filter((k) => terlarang.test(k));
    expect(bocor, `ekspor bernuansa mutator: ${bocor.join(', ')}`).toEqual([]);
  });

  it('daftar & hasil fungsi tidak dapat diubah pemanggil saat JALAN', () => {
    /* `readonly` hanya berlaku saat kompilasi; SC-14 menuntut sekat yang juga
       berdiri terhadap kode yang menghindari pemeriksaan tipe. */
    const before = ILLUSTRATIVE_RISKS.length;
    expect(() => (ILLUSTRATIVE_RISKS as unknown as IllustrativeRiskArray).push({} as never)).toThrow();
    expect(ILLUSTRATIVE_RISKS).toHaveLength(before);

    const perTujuan = illustrativeRisksFor('QO-28a');
    expect(() => (perTujuan as unknown as IllustrativeRiskArray).push({} as never)).toThrow();
    expect(illustrativeRisksFor('QO-28a')).toHaveLength(8);

    expect(() => { (ILLUSTRATIVE_RISKS[0] as unknown as { summary: string }).summary = 'x'; }).toThrow();
  });

  it('saran TIDAK dihitung sebagai risiko firma — tujuan tetap defisiensi', () => {
    /* Pagar ketiga: ke-27 tujuan tetap "belum tertangani" walau saran ada.
       objectiveCoverage hanya membaca SOQM_RISKS; modul ini tak menyentuhnya. */
    expect(illustrativeRisksFor('QO-28a').length).toBeGreaterThan(0);
    expect(SMM1_OBJECTIVE_BY_ID.has('QO-28a')).toBe(true);
  });
});

describe('illustrativeRisksFor / illustrativeDocsFor', () => {
  it('tujuan yang belum dimuat (komponen 3–6) mengembalikan kosong, bukan melempar', () => {
    expect(illustrativeRisksFor('QO-31a')).toEqual([]);
    expect(illustrativeDocsFor('QO-32d')).toEqual([]);
  });

  it('id tak dikenal / null / undefined aman', () => {
    expect(illustrativeRisksFor('QO-tidak-ada')).toEqual([]);
    expect(illustrativeRisksFor(null)).toEqual([]);
    expect(illustrativeRisksFor(undefined)).toEqual([]);
    expect(illustrativeDocsFor(null)).toEqual([]);
  });

  it('¶28(a) punya delapan saran — blok terpadat di komponen 1', () => {
    expect(illustrativeRisksFor('QO-28a')).toHaveLength(8);
  });

  it('dokumen ter-union, terurut, tanpa duplikat', () => {
    expect(illustrativeDocsFor('QO-28a')).toEqual(['1.2', '3.1', '3.2', '7.5']);
    expect(illustrativeDocsFor('QO-28c')).toEqual(['3.2', '7.5', '7.6', '9.2']);
  });
});

type IllustrativeRiskArray = { push: (x: never) => number };
