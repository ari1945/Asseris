import { describe, it, expect } from 'vitest';
import { ILLUSTRATIVE_RISKS, OBJECTIVES_WITH_ILLUSTRATIVE_RISKS, illustrativeDocsFor } from './canon_smm_illustrative_risks';
import { TOOLKIT_BY_OBJECTIVE, TOOLKIT_DOCS } from './canon_smm_toolkit';

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

  it('setiap dokumen yang dirujuk saran benar-benar ada di Toolkit', () => {
    const nomor = new Set(TOOLKIT_DOCS.map((d) => d.no));
    const menggantung: string[] = [];
    for (const r of ILLUSTRATIVE_RISKS) {
      for (const d of r.toolkitDocs) if (!nomor.has(d)) menggantung.push(`${r.id}→${d}`);
    }
    /* Rujukan menggantung pada materi IAPI (mis. 8.2 yang tak ada di Toolkit
       seksi 8) dilaporkan apa adanya di tab Dokumentasi SMM — tetapi komponen
       1 & 2 tidak memuatnya, jadi di sini harus kosong. */
    expect(menggantung, menggantung.join(', ')).toEqual([]);
  });
});
