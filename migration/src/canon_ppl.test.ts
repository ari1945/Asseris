import { describe, it, expect } from 'vitest';
import { pplStatus, pplFromEntries, PPL_REQ_PMK186, PPL_SHORTFALL_LABEL,
  type PplShortfallCode, type SkpEntry } from './canon_ppl';

/* ============================================================
   PMK 186/2021 Pasal 37 — 40 SKP, ≥30 terstruktur, ≤10 tidak
   terstruktur, materi wajib 4 + 16 di dalam yang terstruktur.

   Uji inti: aturan LAMA aplikasi ("≥20 terstruktur") meluluskan
   orang yang kurang 10 SKP. Kasus 30-vs-20 di bawah memaku itu.
   ============================================================ */

describe('ambang PMK 186/2021 Pasal 37', () => {
  it('minimum terstruktur adalah 30, bukan 20 (materi wajib 4+16 = 20 ada DI DALAMNYA)', () => {
    expect(PPL_REQ_PMK186.structuredMin).toBe(30);
    expect(PPL_REQ_PMK186.topicPembinaanMin + PPL_REQ_PMK186.topicAkuntansiMin).toBe(20);
    expect(PPL_REQ_PMK186.topicPembinaanMin + PPL_REQ_PMK186.topicAkuntansiMin)
      .toBeLessThan(PPL_REQ_PMK186.structuredMin);
  });

  it('40 total · cap tidak terstruktur 10 · carry-forward 10', () => {
    expect(PPL_REQ_PMK186.annual).toBe(40);
    expect(PPL_REQ_PMK186.unstructuredCap).toBe(10);
    expect(PPL_REQ_PMK186.carryForwardCap).toBe(10);
  });
});

describe('pplStatus — limb terstruktur', () => {
  it('20 SKP terstruktur TIDAK memenuhi syarat (regresi ambang lama)', () => {
    const s = pplStatus({ structured: 20, unstructured: 10 });
    expect(s.structured).toBe(20);
    expect(s.shortfalls).toContain('structured');
    expect(s.compliant).toBe(false);
  });

  it('30 SKP terstruktur + 10 tidak terstruktur tepat memenuhi', () => {
    const s = pplStatus({ structured: 30, unstructured: 10 });
    expect(s.countedTotal).toBe(40);
    expect(s.shortfalls).toEqual([]);
    expect(s.compliant).toBe(true);
  });
});

describe('pplStatus — batas atas SKP tidak terstruktur', () => {
  it('kelebihan tidak terstruktur HANGUS, tidak menambal kekurangan terstruktur', () => {
    /* 22 + 22 = "44 SKP" pada tampilan lama → sesungguhnya 22 + 10 = 32. */
    const s = pplStatus({ structured: 22, unstructured: 22 });
    expect(s.countedUnstructured).toBe(10);
    expect(s.forfeitedUnstructured).toBe(12);
    expect(s.countedTotal).toBe(32);
    expect(s.shortfalls).toEqual(expect.arrayContaining(['total', 'structured']));
    expect(s.compliant).toBe(false);
  });

  it('tidak terstruktur di bawah cap dihitung penuh', () => {
    const s = pplStatus({ structured: 34, unstructured: 6 });
    expect(s.countedUnstructured).toBe(6);
    expect(s.forfeitedUnstructured).toBe(0);
    expect(s.countedTotal).toBe(40);
    expect(s.compliant).toBe(true);
  });
});

describe('pplStatus — materi wajib', () => {
  it('tak terlacak → tidak diklaim patuh maupun tidak patuh', () => {
    const s = pplStatus({ structured: 30, unstructured: 10 });
    expect(s.topicsTracked).toBe(false);
    expect(s.shortfalls).not.toContain('topic-pembinaan');
    expect(s.shortfalls).not.toContain('topic-akuntansi');
  });

  it('terlacak dan kurang → shortfall terlaporkan walau total & terstruktur lolos', () => {
    const s = pplStatus({ structured: 30, unstructured: 10, topicPembinaan: 2, topicAkuntansi: 16 });
    expect(s.topicsTracked).toBe(true);
    expect(s.shortfalls).toEqual(['topic-pembinaan']);
    expect(s.compliant).toBe(false);
  });

  it('terlacak dan cukup → patuh penuh', () => {
    const s = pplStatus({ structured: 30, unstructured: 10, topicPembinaan: 4, topicAkuntansi: 16 });
    expect(s.compliant).toBe(true);
    expect(s.topicsTracked).toBe(true);
  });
});

describe('pplStatus — carry-forward', () => {
  it('kelebihan dibawa maksimal 10 SKP', () => {
    expect(pplStatus({ structured: 45, unstructured: 10 }).carryForward).toBe(10);
    expect(pplStatus({ structured: 34, unstructured: 10 }).carryForward).toBe(4);
    expect(pplStatus({ structured: 30, unstructured: 10 }).carryForward).toBe(0);
  });

  it('bawaan tahun lalu ikut diperhitungkan pada total', () => {
    const s = pplStatus({ structured: 30, unstructured: 4, carriedIn: 6 });
    expect(s.countedTotal).toBe(40);
    expect(s.shortfalls).toEqual([]);
  });
});

describe('pplStatus — batas', () => {
  it('nilai negatif/kosong tidak menghasilkan angka mustahil', () => {
    const s = pplStatus({ structured: -5, unstructured: -3 });
    expect(s.structured).toBe(0);
    expect(s.countedTotal).toBe(0);
    expect(s.carryForward).toBe(0);
    expect(s.compliant).toBe(false);
  });

  it('setiap kode kekurangan punya kalimat siap-tampil', () => {
    const codes: PplShortfallCode[] = ['total', 'structured', 'topic-pembinaan', 'topic-akuntansi'];
    for (const c of codes) expect(PPL_SHORTFALL_LABEL[c].length).toBeGreaterThan(0);
  });
});

describe('pplFromEntries — ringkas dari catatan SKP', () => {
  it('memilah Terstruktur vs Tidak Terstruktur', () => {
    /* Bentuk nyata `CPE_LOG`: membawa `t` (judul kegiatan) di samping type/skp. */
    const r = pplFromEntries([
      { t: 'Update SA', type: 'Terstruktur', skp: 8 },
      { t: 'SMM 1', type: 'Terstruktur', skp: 6 },
      { t: 'Jurnal', type: 'Tidak Terstruktur', skp: 10 },
    ] satisfies SkpEntry[]);
    /* PR-3 menambah limb materi wajib. Entri tanpa `topic` ⇒ tak terlacak. */
    expect(r).toMatchObject({ structured: 14, unstructured: 10 });
    expect(r.topicPembinaan).toBeUndefined();
  });

  it('catatan kosong/rusak diabaikan', () => {
    /* PR-3: nol entri terstruktur = terlacak SECARA HAMPA — kedua limb materi
       pasti 0 dan itu dapat dinyatakan dengan pasti, bukan "tak diketahui". */
    expect(pplFromEntries(null)).toEqual({ structured: 0, unstructured: 0, topicPembinaan: 0, topicAkuntansi: 0 });
    expect(pplFromEntries([null, undefined] as unknown as SkpEntry[]))
      .toEqual({ structured: 0, unstructured: 0, topicPembinaan: 0, topicAkuntansi: 0 });
  });

  it('ledger Hartono (EMP-001) nyata: 14 terstruktur, jauh di bawah 30', () => {
    const r = pplFromEntries([
      { type: 'Terstruktur', skp: 8 }, { type: 'Terstruktur', skp: 6 }, { type: 'Tidak Terstruktur', skp: 10 },
    ]);
    const s = pplStatus(r);
    /* PR-3 menambah limb materi wajib. Entri tanpa `topic` ⇒ tak terlacak. */
    expect(r).toMatchObject({ structured: 14, unstructured: 10 });
    expect(r.topicPembinaan).toBeUndefined();
    expect(s.countedTotal).toBe(24);
    expect(s.compliant).toBe(false);
  });
});
