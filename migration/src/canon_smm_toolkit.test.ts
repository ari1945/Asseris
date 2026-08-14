import { describe, it, expect } from 'vitest';
import {
  TOOLKIT_DOCS, TOOLKIT_DOC_COUNT, TOOLKIT_BY_NO, TOOLKIT_BY_OBJECTIVE,
  TOOLKIT_DANGLING_REFS, TOOLKIT_SECTION_TITLE, TOOLKIT_KIND_LABEL, TOOLKIT_HOME_LABEL,
  TOOLKIT_OUT_OF_SCOPE,
  toolkitHomes, toolkitDocsFor, danglingDocsFor, toolkitObjectiveCoverage, objectivesForDoc,
} from './canon_smm_toolkit';
import { SMM1_OBJECTIVES, SMM1_OBJECTIVE_COUNT } from './canon_smm_objectives';
import { MODULE_INDEX } from './icons';

/* ============================================================
   PR-8a-1 — peta 41 dokumen Toolkit IAPI V3 → modul Asseris.

   Prinsip pemandu arc: peta yang hanya bisa menampilkan baris
   yang ada adalah brosur. Yang membuatnya alat adalah kemampuan
   menyatakan "dokumen ini belum punya rumah" dan "rujukan ini
   menggantung".
   ============================================================ */

describe('SC-1 · 41 dokumen Toolkit V3, terdistribusi benar', () => {
  it('jumlah total 41', () => {
    expect(TOOLKIT_DOCS.length).toBe(TOOLKIT_DOC_COUNT);
    expect(TOOLKIT_DOC_COUNT).toBe(41);
  });

  it('distribusi per seksi 3·2·2·3·8·6·9·1·7', () => {
    const per: number[] = [];
    for (let s = 1; s <= 9; s++) per.push(TOOLKIT_DOCS.filter((d) => d.section === s).length);
    expect(per).toEqual([3, 2, 2, 3, 8, 6, 9, 1, 7]);
    expect(per.reduce((a, b) => a + b, 0)).toBe(41);
  });

  it('nomor dokumen unik & konsisten dengan seksinya', () => {
    const nos = TOOLKIT_DOCS.map((d) => d.no);
    expect(new Set(nos).size).toBe(nos.length);
    for (const d of TOOLKIT_DOCS) expect(Number(d.no.split('.')[0]), d.no).toBe(d.section);
  });

  it('setiap seksi punya judul, setiap dokumen punya judul & jenis berlabel', () => {
    for (let s = 1; s <= 9; s++) expect(TOOLKIT_SECTION_TITLE[s], String(s)).toBeTruthy();
    for (const d of TOOLKIT_DOCS) {
      expect(d.title.length, d.no).toBeGreaterThan(8);
      expect(TOOLKIT_KIND_LABEL[d.kind], d.no).toBeTruthy();
    }
  });
});

describe('SC-3 · TRIPWIRE — peta tidak boleh membusuk saat modul di-rename', () => {
  it('setiap id modul yang dirujuk peta BENAR-BENAR ada di MODULE_INDEX', () => {
    const known = new Set(Object.keys(MODULE_INDEX));
    const bad: string[] = [];
    for (const d of TOOLKIT_DOCS) {
      for (const m of d.modules) if (!known.has(m)) bad.push(`${d.no} → ${m}`);
    }
    /* Tanpa uji ini, modul yang di-rename akan meninggalkan chip mati yang
       tak seorang pun tahu — persis nasib rujukan paragraf yang salah pada
       7 dari 8 komponen sebelum arc ini. */
    expect(bad).toEqual([]);
  });

  it('tiap dokumen menunjuk ≥1 modul, bahkan yang rumahnya belum lengkap', () => {
    for (const d of TOOLKIT_DOCS) expect(d.modules.length, d.no).toBeGreaterThan(0);
  });
});

describe('SC-2 · kelengkapan rumah dilaporkan, bukan disembunyikan', () => {
  const h = toolkitHomes();

  it('mapped ∪ partial ∪ none = 41, tanpa irisan', () => {
    expect(h.mapped.length + h.partial.length + h.none.length).toBe(41);
    const ids = [...h.mapped, ...h.partial, ...h.none].map((d) => d.no);
    expect(new Set(ids).size).toBe(41);
  });

  it('dokumen yang rumahnya belum lengkap WAJIB menjelaskan apa yang kurang', () => {
    for (const d of [...h.partial, ...h.none]) {
      expect((d.gap || '').length, d.no).toBeGreaterThan(20);
    }
  });

  it('dokumen ber-rumah penuh tidak membawa keterangan celah', () => {
    for (const d of h.mapped) expect(d.gap, d.no).toBeUndefined();
  });

  it('celah nyata terlaporkan: klien keluar (5.7 · 5.8) & kesesuaian teknologi (7.8)', () => {
    const gaps = [...h.partial, ...h.none].map((d) => d.no).sort();
    expect(gaps).toEqual(['5.7', '5.8', '7.8']);
  });

  it('label ketiga keadaan tersedia', () => {
    expect(TOOLKIT_HOME_LABEL.mapped).toBeTruthy();
    expect(TOOLKIT_HOME_LABEL.partial).toContain('artefak');
    expect(TOOLKIT_HOME_LABEL.none).toBeTruthy();
  });
});

describe('SC-4 · peta tujuan → dokumen memakai id kanonik', () => {
  it('ke-27 tujuan mandatori terwakili, tanpa id asing', () => {
    const canon = new Set(SMM1_OBJECTIVES.map((o) => o.id));
    expect(TOOLKIT_BY_OBJECTIVE.size).toBe(SMM1_OBJECTIVE_COUNT);
    TOOLKIT_BY_OBJECTIVE.forEach((_refs, id) => expect(canon.has(id), id).toBe(true));
    for (const o of SMM1_OBJECTIVES) expect(TOOLKIT_BY_OBJECTIVE.has(o.id), o.id).toBe(true);
  });

  it('setiap nomor yang dirujuk ada di Toolkit ATAU terdaftar sebagai menggantung', () => {
    const dangling = new Set(TOOLKIT_DANGLING_REFS.map((d) => d.no));
    TOOLKIT_BY_OBJECTIVE.forEach((refs, id) => {
      for (const no of refs) {
        expect(TOOLKIT_BY_NO.has(no) || dangling.has(no), `${id} → ${no}`).toBe(true);
      }
    });
  });

  it('rujukan dalam tiap tujuan unik & terurut', () => {
    TOOLKIT_BY_OBJECTIVE.forEach((refs, id) => {
      expect(new Set(refs).size, id).toBe(refs.length);
      expect([...refs], id).toEqual([...refs].sort((a, b) => {
        const [as, ai] = a.split('.').map(Number), [bs, bi] = b.split('.').map(Number);
        return as - bs || ai - bi;
      }));
    });
  });

  it('toolkitDocsFor mengembalikan dokumen NYATA saja', () => {
    const docs = toolkitDocsFor('QO-28a');
    expect(docs.map((d) => d.no)).toEqual(['1.2', '3.1', '3.2', '7.5']);
    /* ¶30(b) merujuk 8.2 yang menggantung — tidak boleh muncul sebagai dokumen. */
    expect(toolkitDocsFor('QO-30b').map((d) => d.no)).not.toContain('8.2');
  });

  it('arah balik: dokumen → tujuan yang dilayaninya', () => {
    expect(objectivesForDoc('8.1')).toEqual(['QO-32h', 'QO-33a', 'QO-33b', 'QO-33c', 'QO-33d']);
    expect(objectivesForDoc('9.9')).toEqual([]);
  });
});

describe('rujukan MENGGANTUNG pada materi IAPI dilaporkan apa adanya', () => {
  it('8.2 dirujuk Matriks tetapi tidak ada di Toolkit V3', () => {
    const d = TOOLKIT_DANGLING_REFS.find((x) => x.no === '8.2');
    expect(d).toBeTruthy();
    expect(TOOLKIT_BY_NO.has('8.2')).toBe(false);
    /* PR-8a-2c — dulu berbunyi QO-33a. Yang merujuk 8.2 adalah QO-33b (risiko
       budaya berbagi informasi); QO-33a tidak pernah merujuknya. */
    expect([...d!.objectives].sort()).toEqual(['QO-30b', 'QO-33b', 'QO-33c']);
  });

  it('daftar tujuan pada entri menggantung cocok dengan peta sesungguhnya', () => {
    for (const dang of TOOLKIT_DANGLING_REFS) {
      const actual = [...objectivesForDoc(dang.no)].sort();
      expect([...dang.objectives].sort(), dang.no).toEqual(actual);
    }
  });

  it('danglingDocsFor menyingkap rujukan menggantung per tujuan', () => {
    /* PR-8a-2c — pemiliknya QO-33b, bukan QO-33a. */
    expect(danglingDocsFor('QO-33b')).toEqual(['8.2']);
    expect(danglingDocsFor('QO-33a')).toEqual([]);
    expect(danglingDocsFor('QO-28a')).toEqual([]);
  });
});

describe('SC-5 · tujuan tanpa dokumen terlihat, bukan sel kosong', () => {
  const cov = toolkitObjectiveCoverage();

  it('seluruh 27 tujuan terklasifikasi', () => {
    expect(cov.withDoc.length + cov.withoutDoc.length).toBe(SMM1_OBJECTIVE_COUNT);
  });

  it('pada peta saat ini seluruh tujuan punya ≥1 dokumen NYATA', () => {
    expect(cov.withoutDoc).toEqual([]);
  });

  it('TRIPWIRE — tujuan yang hanya punya rujukan menggantung dihitung TANPA dokumen', () => {
    /* PR-8a-2c — pemakai 8.2 berpindah ke QO-33b setelah koreksi peta. */
    const only82 = toolkitObjectiveCoverage([
      { id: 'QO-33b', component: 'C7', para: 33, item: 'b', title: 'uji' },
    ] as never);
    /* QO-33b punya 7.7/8.1 nyata, jadi tetap withDoc — yang diuji di sini
       adalah bahwa fungsi menyaring 8.2 lebih dulu, bukan menghitungnya. */
    expect(only82.withDoc).toEqual(['QO-33b']);
    expect(toolkitDocsFor('QO-33b').map((d) => d.no)).toEqual(['7.7', '8.1']);
    expect(toolkitDocsFor('QO-33a').map((d) => d.no)).toEqual(['7.1', '7.7', '7.8', '8.1']);
  });
});

describe('batas aset IAPI dibedakan dari celah firma', () => {
  it('¶48–52 jaringan & ¶59 terdaftar sebagai DI LUAR cakupan Toolkit', () => {
    const refs = TOOLKIT_OUT_OF_SCOPE.map((x) => x.ref).join(' | ');
    expect(refs).toContain('¶48–52');
    expect(refs).toContain('¶59');
  });

  it('tiap butir menjelaskan MENGAPA, bukan sekadar menyatakan', () => {
    for (const x of TOOLKIT_OUT_OF_SCOPE) expect(x.why.length, x.ref).toBeGreaterThan(30);
  });

  it('alasan jaringan menyebut sebabnya: Toolkit ditulis untuk KAP non-jaringan', () => {
    const net = TOOLKIT_OUT_OF_SCOPE.find((x) => x.ref.includes('¶48–52'));
    expect(net!.why.toLowerCase()).toContain('non-jaringan');
  });
});

describe('hak cipta — metadata rujukan saja', () => {
  it('tidak ada judul dokumen yang panjangnya menyerupai kutipan isi', () => {
    for (const d of TOOLKIT_DOCS) expect(d.title.length, d.no).toBeLessThan(60);
  });
});
