import { describe, it, expect } from 'vitest';
import { ILLUSTRATIVE_RISKS, OBJECTIVES_WITH_ILLUSTRATIVE_RISKS, illustrativeDocsFor } from './canon_smm_illustrative_risks';
import { TOOLKIT_BY_OBJECTIVE, TOOLKIT_DOCS, TOOLKIT_DANGLING_REFS } from './canon_smm_toolkit';

/* ============================================================
   GERBANG KONSISTENSI — peta tujuan→dokumen (8a-1) vs saran per-risiko (8a-2).

   Keduanya berasal dari Matriks V3 yang SAMA, dibaca dengan cara berbeda:
   8a-1 membaca kolom respons per BLOK TUJUAN, 8a-2 membacanya per BARIS
   RISIKO. Kalau keduanya sepakat, pembacaannya benar. Kalau tidak, salah
   satunya salah — dan memang begitulah cacat 8a-1 ditemukan:

       QO-28b kehilangan 1.1 · QO-28c mendapat 1.1 yang bukan miliknya ·
       QO-28d mendapat 7.5/7.6/9.2 milik QO-28c.

   Penyebabnya: Matriks menyelaraskan baris respons dengan baris RISIKO,
   bukan dengan blok tujuan; dokumen pada risiko terakhir sebuah tujuan
   mudah terbaca sebagai milik tujuan berikutnya.

   Gerbang ini TUMBUH: setiap tujuan yang ditambahkan 8a-2b/8a-2c otomatis
   ikut tersilang-uji tanpa menyentuh berkas ini.
   ============================================================ */

describe('peta 8a-1 vs saran per-risiko 8a-2', () => {
  const byObjective = new Map(TOOLKIT_BY_OBJECTIVE);

  it('setiap tujuan yang punya saran juga punya baris di TOOLKIT_BY_OBJECTIVE', () => {
    for (const oid of OBJECTIVES_WITH_ILLUSTRATIVE_RISKS) {
      expect(byObjective.has(oid), oid).toBe(true);
    }
  });

  it('union dokumen per-risiko SAMA PERSIS dengan baris peta tujuan', () => {
    const beda: string[] = [];
    for (const oid of OBJECTIVES_WITH_ILLUSTRATIVE_RISKS) {
      const dariRisiko = [...illustrativeDocsFor(oid)];
      const dariPeta = [...(byObjective.get(oid) || [])].sort();
      if (JSON.stringify(dariRisiko) !== JSON.stringify(dariPeta)) {
        beda.push(`${oid}: risiko=[${dariRisiko}] peta=[${dariPeta}]`);
      }
    }
    expect(beda, beda.join(' | ')).toEqual([]);
  });

  it('REGRESI: ketiga baris yang dikoreksi 8a-2a tidak boleh kembali', () => {
    /* Nilai LAMA yang salah — dipaku eksplisit supaya rebase/merge yang
       menghidupkannya kembali langsung merah. */
    expect(byObjective.get('QO-28b')).not.toEqual(['3.2', '9.2']);
    expect(byObjective.get('QO-28c')).not.toEqual(['1.1', '9.2']);
    expect(byObjective.get('QO-28d')).not.toEqual(['1.2', '1.3', '3.2', '7.5', '7.6', '9.2']);

    expect(byObjective.get('QO-28b')).toEqual(['1.1', '3.2', '9.2']);
    expect(byObjective.get('QO-28c')).toEqual(['3.2', '7.5', '7.6', '9.2']);
    expect(byObjective.get('QO-28d')).toEqual(['1.2', '1.3', '3.2']);
  });

  it('dokumen yang dirujuk saran ada di Toolkit, ATAU terdaftar sebagai menggantung', () => {
    /* 8.2 dirujuk Matriks tetapi Toolkit V3 seksi 8 berhenti di 8.1 — rujukan
       menggantung pada materi IAPI, bukan celah Asseris. Ia boleh dirujuk TETAPI
       hanya bila sudah terdaftar di TOOLKIT_DANGLING_REFS, supaya salah ketik
       nomor dokumen tidak lolos dengan menyamar sebagai "menggantung". */
    const dikenal = new Set([
      ...TOOLKIT_DOCS.map((d) => d.no),
      ...TOOLKIT_DANGLING_REFS.map((d) => d.no),
    ]);
    const tak_dikenal: string[] = [];
    for (const r of ILLUSTRATIVE_RISKS) {
      for (const d of r.toolkitDocs) if (!dikenal.has(d)) tak_dikenal.push(`${r.id}→${d}`);
    }
    expect(tak_dikenal, tak_dikenal.join(', ')).toEqual([]);
  });

  it('tujuan yang merujuk dokumen menggantung sama dengan yang dicatat 8a-1', () => {
    /* Silang-uji arah sebaliknya: TOOLKIT_DANGLING_REFS mendaftar tujuan mana
       yang merujuk 8.2. Untuk tujuan yang sudah punya saran termuat, daftar itu
       harus cocok dengan apa yang benar-benar dirujuk entri per-risiko. */
    for (const dr of TOOLKIT_DANGLING_REFS) {
      const dariRisiko = OBJECTIVES_WITH_ILLUSTRATIVE_RISKS
        .filter((oid) => illustrativeDocsFor(oid).includes(dr.no)).sort();
      const dariCatatan = dr.objectives
        .filter((oid) => OBJECTIVES_WITH_ILLUSTRATIVE_RISKS.includes(oid)).sort();
      expect(dariRisiko, `dok ${dr.no}`).toEqual(dariCatatan);
    }
  });
});
