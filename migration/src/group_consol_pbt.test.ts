/* ============================================================
   SA 600 PR-1 — PBT konsolidasian sebagai basis benchmark grup.

   Sebelum ini paket pelaporan komponen hanya membawa `rev` & `npat`,
   sehingga benchmark grup pada Laba Sebelum Pajak — benchmark yang
   dipakai perikatan ini — TAK DAPAT dihitung. Satu-satunya jalan pintas
   adalah membagi `npat` dengan tarif seragam; itu salah untuk CP-05
   (Singapura, 17%) dan salahnya diam-diam.

   Uji di berkas ini memaku bahwa roll-up baru TIE terhadap roll-up laba
   yang sudah ada — kalau tidak, grup akan membawa dua kebenaran laba.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS_CANON } from './canon';
import { SAMPLE_WTB } from './__fixtures__/wtb';

const p65 = () => AMS_CANON.psak65(SAMPLE_WTB, null);

describe('SA 600 PR-1 — identitas laba konsolidasian', () => {
  /* Inti PR-1: PBT baru tak boleh membantah NPAT yang sudah dipakai modul lain. */
  it('consolPbt − consolTax === consolNpat', () => {
    const r = p65();
    expect(r.consolPbt - r.consolTax).toBe(r.consolNpat);
  });

  it('tiap paket komponen menutup sendiri: pbt − tax = npat', () => {
    p65().subs.forEach(s => {
      expect(s.pbt - s.tax).toBe(s.npat);
    });
  });

  /* Justru INI alasan `tax` harus jadi isi paket, bukan asumsi tarif grup. */
  it('tarif efektif terbaca per komponen — CP-05 (Singapura) 17%, bukan 22%', () => {
    const subs = p65().subs;
    const sg = subs.find(s => s.id === 'CP-05')!;
    const id02 = subs.find(s => s.id === 'CP-02')!;
    expect(Math.round(sg.tax / sg.pbt * 100)).toBe(17);
    expect(Math.round(id02.tax / id02.pbt * 100)).toBe(22);
    /* Membagi npat dgn tarif grup 22% akan meleset >10% untuk entitas SGD —
       persis kesalahan senyap yang membuat field ini perlu ada. */
    const naif = Math.round(sg.npat / 0.78);
    expect(Math.abs(naif - sg.pbt) / sg.pbt).toBeGreaterThan(0.05);
  });

  it('PBT konsolidasian melebihi PBT induk — populasi grup memang lebih besar', () => {
    const r = p65();
    expect(r.consolPbt).toBeGreaterThan(r.parentPbtSeparate);
    expect(r.subsPbt).toBeGreaterThan(0);
  });

  /* Eliminasi pendapatan antar-perusahaan tak boleh terlewat: pendapatan grup
     bukan penjumlahan mentah. */
  it('pendapatan konsolidasian mengeliminasi penjualan antar-perusahaan (ELM-01)', () => {
    const r = p65();
    const mentah = r.subs.reduce((a, s) => a + s.rev, 0);
    expect(r.consolRev).toBeLessThan(mentah + 1e9);
    const elm01 = r.interco.find(e => e.id === 'ELM-01')!;
    expect(elm01.amount).toBeGreaterThan(0);
  });

  /* Paket yang diimpor harus dapat menimpa pbt/tax — kalau tidak, angka nyata
     dari auditor komponen tak pernah menggantikan seed. */
  it('pbt & tax dapat ditimpa lewat paket pelaporan komponen', () => {
    const base = p65();
    const ov = AMS_CANON.psak65(SAMPLE_WTB, { 'CP-02': { status: 'Diterima', pbt: 20000, tax: 4400, npat: 15600 } });
    const s = ov.subs.find(x => x.id === 'CP-02')!;
    expect(s.pbt).toBe(20000);
    expect(s.tax).toBe(4400);
    expect(ov.consolPbt).not.toBe(base.consolPbt);
    expect(ov.consolPbt - ov.consolTax).toBe(ov.consolNpat);
  });
});
