import { describe, it, expect } from 'vitest';
import { ILLUSTRATIVE_RISKS, OBJECTIVES_WITH_ILLUSTRATIVE_RISKS, illustrativeDocsFor } from './canon_smm_illustrative_risks';
import { SMM1_OBJECTIVE_COUNT } from './canon_smm_objectives';
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

  it('AUDIT PENUH — ke-27 tujuan tersilang-uji, bukan sampel', () => {
    /* Sejak 8a-2c seluruh komponen Matriks termuat, sehingga gerbang di bawah
       memeriksa SETIAP baris `TOOLKIT_BY_OBJECTIVE`. Bila kelak ada tujuan yang
       kehilangan saran, uji ini memberi tahu bahwa auditnya tak lagi penuh —
       jangan longgarkan, lengkapi salah satu sisinya. */
    expect(OBJECTIVES_WITH_ILLUSTRATIVE_RISKS).toHaveLength(SMM1_OBJECTIVE_COUNT);
    expect(byObjective.size).toBe(SMM1_OBJECTIVE_COUNT);
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

  it('REGRESI: kedelapan baris yang dikoreksi 8a-2c tidak boleh kembali', () => {
    /* Dua arah kesalahan yang sama-sama nyata — dokumen HILANG dan dokumen
       MEREMBES dari tujuan tetangga. Nilai lama dipaku supaya rebase/merge yang
       menghidupkannya kembali langsung merah. */
    expect(byObjective.get('QO-32a')).not.toEqual(['7.1', '7.2', '7.5', '7.7']);        // hilang 7.3 & 7.4
    expect(byObjective.get('QO-32e')).not.toEqual(['6.1', '6.2', '7.1', '7.2', '7.8']); // merembes dari 32f
    expect(byObjective.get('QO-32f')).not.toEqual(['7.1', '7.5', '7.8']);               // merembes dari 32g
    expect(byObjective.get('QO-32g')).not.toEqual(['7.1', '7.8', '7.9']);               // merembes dari 32h
    expect(byObjective.get('QO-33a')).not.toEqual(['7.7', '7.8', '8.1', '8.2']);        // hilang 7.1, kebagian 8.2
    expect(byObjective.get('QO-33b')).not.toEqual(['8.1']);                             // hilang 7.7 & 8.2
    expect(byObjective.get('QO-33c')).not.toEqual(['6.3', '6.4', '7.7', '8.1', '8.2', '9.3']);
    expect(byObjective.get('QO-33d')).not.toEqual(['8.1']);                             // hilang 6.3/6.4/7.7/9.3

    expect(byObjective.get('QO-32a')).toEqual(['7.1', '7.2', '7.3', '7.4', '7.5', '7.7']);
    expect(byObjective.get('QO-32e')).toEqual(['6.1', '6.2', '7.2']);
    expect(byObjective.get('QO-32f')).toEqual(['7.1', '7.8']);
    expect(byObjective.get('QO-32g')).toEqual(['7.1', '7.5']);
    expect(byObjective.get('QO-33a')).toEqual(['7.1', '7.7', '7.8', '8.1']);
    expect(byObjective.get('QO-33b')).toEqual(['7.7', '8.1', '8.2']);
    expect(byObjective.get('QO-33c')).toEqual(['7.7', '8.1', '8.2']);
    expect(byObjective.get('QO-33d')).toEqual(['6.3', '6.4', '7.7', '8.1', '9.3']);
  });

  it('dokumen 7.3 kini punya rumah pada sebuah tujuan — dulu tampil "TUJUAN —"', () => {
    /* Konsekuensi yang TERLIHAT dari 32(a) yang kehilangan 7.3: tab Dokumentasi
       SMM merender "Checklist Wawancara dan Evaluasi Kandidat" seolah tak
       melayani satu tujuan mutu pun. */
    expect(illustrativeDocsFor('QO-32a')).toContain('7.3');
    expect(byObjective.get('QO-32a')).toContain('7.3');
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
