import { describe, it, expect } from 'vitest';
import {
  evaluateSmm, isOpen, isPervasive, isSignificant, significanceFloor,
  pervasivenessReasons, PERVASIVENESS_LABEL, CONCLUSION_PARA,
  type SmmDeficiency, type PervasivenessIndicator,
} from './canon_smm_evaluation';

/* ============================================================
   Mesin kesimpulan ¶54.

   Cacat yang ditutup: mesin lama MENGHITUNG pervasivitas,
   MENAMPILKANNYA sebagai "Faktor Keputusan ¶54", lalu MENGABAIKANNYA
   — kesimpulan hanya membaca defisiensi keparahan Tinggi, inspeksi
   tidak memuaskan, dan jumlah tuduhan. Defisiensi pervasif karena itu
   tidak pernah menghasilkan ¶54(c). Pervasivitasnya sendiri di-hardcode
   ke ID seed (`QR-02`/`QR-04`), sehingga risiko baru tak akan pernah
   dinilai pervasif.

   Uji di bawah memaku bahwa pervasivitas kini MENGIKAT, dan bahwa
   carve-out A191 menuntut DUA syarat.
   ============================================================ */

const D = (over: Partial<SmmDeficiency> = {}): SmmDeficiency => ({
  id: 'D-1', severity: 'Rendah', locus: 'operation',
  compensatingResponse: true, frequency: 'isolated',
  remediated: false, effectCorrected: false, ...over,
});

const ALL_INDICATORS: PervasivenessIndicator[] = [
  'multi-component', 'fundamental-component', 'multi-unit', 'fundamental-unit', 'most-engagements',
];

describe('isPervasive — kelima indikator A192', () => {
  it('tanpa indikator: tidak pervasif', () => {
    expect(isPervasive(D())).toBe(false);
    expect(isPervasive(D({ pervasiveness: [] }))).toBe(false);
    expect(isPervasive(D({ pervasiveness: null }))).toBe(false);
  });

  for (const ind of ALL_INDICATORS) {
    it(`indikator "${ind}" SENDIRIAN sudah membuat pervasif`, () => {
      expect(isPervasive(D({ pervasiveness: [ind] }))).toBe(true);
    });
  }

  it('setiap indikator punya kalimat siap-tampil', () => {
    for (const ind of ALL_INDICATORS) {
      expect(PERVASIVENESS_LABEL[ind].length).toBeGreaterThan(20);
    }
    expect(pervasivenessReasons(D({ pervasiveness: ['multi-unit'] }))).toHaveLength(1);
  });
});

describe('isOpen — carve-out A191 menuntut DUA syarat', () => {
  it('belum diremediasi: terbuka', () => {
    expect(isOpen(D({ remediated: false, effectCorrected: false }))).toBe(true);
  });

  it('diremediasi TETAPI dampak belum dikoreksi: MASIH terbuka', () => {
    /* Inti mitigasi R-8: menandai "sudah diremediasi" saja tidak boleh
       cukup untuk menaikkan kesimpulan. */
    expect(isOpen(D({ remediated: true, effectCorrected: false }))).toBe(true);
  });

  it('dampak dikoreksi TETAPI belum diremediasi: MASIH terbuka', () => {
    expect(isOpen(D({ remediated: false, effectCorrected: true }))).toBe(true);
  });

  it('keduanya terpenuhi: tertutup', () => {
    expect(isOpen(D({ remediated: true, effectCorrected: true }))).toBe(false);
  });
});

describe('significanceFloor — lantai A163 yang tak bisa ditembus', () => {
  it('pervasif SELALU signifikan (implikasi ¶54(b))', () => {
    const d = D({ pervasiveness: ['multi-component'], significant: false });
    expect(significanceFloor(d)).toBe(true);
    expect(isSignificant(d)).toBe(true);   // penilaian firma tak bisa menurunkan
  });

  it('keparahan Tinggi menembus lantai', () => {
    expect(significanceFloor(D({ severity: 'Tinggi' }))).toBe(true);
  });

  it('frekuensi sistemik menembus lantai', () => {
    expect(significanceFloor(D({ frequency: 'systemic' }))).toBe(true);
  });

  it('defisiensi RANCANGAN tanpa respons kompensasi menembus lantai', () => {
    expect(significanceFloor(D({ locus: 'design', compensatingResponse: false }))).toBe(true);
  });

  it('defisiensi rancangan DENGAN respons kompensasi tidak otomatis menembus', () => {
    expect(significanceFloor(D({ locus: 'design', compensatingResponse: true }))).toBe(false);
  });

  it('firma boleh MENAIKKAN signifikansi di atas lantai', () => {
    const d = D({ significant: true });
    expect(significanceFloor(d)).toBe(false);
    expect(isSignificant(d)).toBe(true);
  });

  it('firma TIDAK boleh menurunkan di bawah lantai', () => {
    const d = D({ severity: 'Tinggi', significant: false });
    expect(isSignificant(d)).toBe(true);
  });
});

describe('evaluateSmm — tabel keputusan ¶54', () => {
  it('tanpa defisiensi: ¶54(a)', () => {
    const e = evaluateSmm([]);
    expect(e.conclusion).toBe('reasonable');
    expect(e.paragraph).toBe('¶54(a)');
  });

  it('null/undefined: ¶54(a), bukan lempar', () => {
    expect(evaluateSmm(null).conclusion).toBe('reasonable');
    expect(evaluateSmm(undefined).conclusion).toBe('reasonable');
  });

  it('defisiensi kecil terbuka: tetap ¶54(a)', () => {
    const e = evaluateSmm([D({ id: 'D-minor' })]);
    expect(e.conclusion).toBe('reasonable');
    expect(e.openMinor).toEqual(['D-minor']);
  });

  it('signifikan tak pervasif terbuka: ¶54(b)', () => {
    const e = evaluateSmm([D({ id: 'D-sig', severity: 'Tinggi' })]);
    expect(e.conclusion).toBe('reasonable-except-for');
    expect(e.paragraph).toBe('¶54(b)');
    expect(e.openSignificant).toEqual(['D-sig']);
    expect(e.openPervasive).toEqual([]);
  });

  for (const ind of ALL_INDICATORS) {
    it(`pervasif terbuka via "${ind}": ¶54(c)`, () => {
      const e = evaluateSmm([D({ id: 'D-perv', pervasiveness: [ind] })]);
      expect(e.conclusion).toBe('not-reasonable');
      expect(e.paragraph).toBe('¶54(c)');
      expect(e.openPervasive).toEqual(['D-perv']);
    });
  }

  it('pervasif mengalahkan signifikan: satu pervasif memaksa ¶54(c)', () => {
    const e = evaluateSmm([
      D({ id: 'D-sig', severity: 'Tinggi' }),
      D({ id: 'D-perv', pervasiveness: ['most-engagements'] }),
    ]);
    expect(e.conclusion).toBe('not-reasonable');
    expect(e.openPervasive).toEqual(['D-perv']);
    expect(e.openSignificant).toEqual(['D-sig']);
  });

  it('REGRESI: pervasif TIDAK BOLEH lagi diabaikan', () => {
    /* Mesin lama: pervasivitas dihitung & ditampilkan, lalu kesimpulan
       hanya membaca keparahan Tinggi. Defisiensi pervasif berkeparahan
       SEDANG karena itu menghasilkan ¶54(b) — bukan ¶54(c). */
    const e = evaluateSmm([D({ id: 'QR-02', severity: 'Sedang', pervasiveness: ['multi-component'] })]);
    expect(e.conclusion).toBe('not-reasonable');
    expect(e.conclusion).not.toBe('reasonable-except-for');
  });

  it('REGRESI: pervasivitas tidak lagi terikat ID seed', () => {
    /* Dulu: (r.id === 'QR-02') || (r.id === 'QR-04'). Risiko baru
       dengan indikator A192 harus tetap pervasif. */
    const e = evaluateSmm([D({ id: 'QR-99-baru', pervasiveness: ['fundamental-unit'] })]);
    expect(e.conclusion).toBe('not-reasonable');
  });
});

describe('carve-out A191 — tidak menurunkan kesimpulan, tetap masuk basis', () => {
  it('pervasif yang sudah diremediasi & dikoreksi: kesimpulan naik ke ¶54(a)', () => {
    const e = evaluateSmm([D({
      id: 'D-fixed', pervasiveness: ['multi-component'],
      remediated: true, effectCorrected: true,
    })]);
    expect(e.conclusion).toBe('reasonable');
    expect(e.openPervasive).toEqual([]);
  });

  it('tetapi WAJIB tercantum dalam basis (¶58(e)) lewat carveOut', () => {
    const e = evaluateSmm([D({
      id: 'D-fixed', severity: 'Tinggi', remediated: true, effectCorrected: true,
    })]);
    expect(e.carveOut).toEqual(['D-fixed']);
  });

  it('separuh selesai TIDAK menikmati carve-out', () => {
    const e = evaluateSmm([D({
      id: 'D-half', pervasiveness: ['multi-component'],
      remediated: true, effectCorrected: false,
    })]);
    expect(e.conclusion).toBe('not-reasonable');
    expect(e.carveOut).toEqual([]);
  });

  it('defisiensi kecil yang selesai bukan carve-out (bukan dasar kesimpulan)', () => {
    const e = evaluateSmm([D({ id: 'D-minor', remediated: true, effectCorrected: true })]);
    expect(e.carveOut).toEqual([]);
    expect(e.conclusion).toBe('reasonable');
  });
});

describe('kelengkapan pemetaan paragraf', () => {
  it('ketiga kesimpulan punya rujukan ¶54 yang berbeda', () => {
    const paras = Object.values(CONCLUSION_PARA);
    expect(new Set(paras).size).toBe(3);
    expect(paras).toEqual(['¶54(a)', '¶54(b)', '¶54(c)']);
  });

  it('setiap defisiensi masuk tepat satu ember', () => {
    const defs = [
      D({ id: 'a' }),
      D({ id: 'b', severity: 'Tinggi' }),
      D({ id: 'c', pervasiveness: ['multi-unit'] }),
      D({ id: 'd', severity: 'Tinggi', remediated: true, effectCorrected: true }),
    ];
    const e = evaluateSmm(defs);
    const all = [...e.openMinor, ...e.openSignificant, ...e.openPervasive, ...e.carveOut];
    expect(all.sort()).toEqual(['a', 'b', 'c', 'd']);
    expect(new Set(all).size).toBe(4);
  });
});
