/* ============================================================
   PR-J — neraca saldo per perikatan.

   Kebocorannya bukan angka salah melainkan DATA KLIEN LAIN: ENG-2025-040
   (multifinance) menampilkan bagan akun manufaktur PT Sentosa Makmur, lengkap
   dengan Beban Pokok Penjualan, persediaan, dan aset hak-guna.

   Uji di sini memaku dua hal yang membuat kebocoran serupa TERLIHAT bila terulang:
   (1) tiap neraca saldo benar-benar MENUTUP, dan (2) bagan akunnya memang BERBEDA
   menurut industri — kalau semuanya seragam, kebocoran berikutnya kembali tak
   kasat mata.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { WTB_BY_ENGAGEMENT } from './data_wtb_eng';
import { AMS } from './data';
import { entityFigures } from './canon_base';
import type { WTB } from './canon_types';

const ENG_IDS = Object.keys(WTB_BY_ENGAGEMENT);

describe('PR-J — neraca saldo tiap perikatan menutup', () => {
  it('enam perikatan selain ENG-2025-014 memiliki neraca saldonya sendiri', () => {
    expect(ENG_IDS).toHaveLength(6);
    expect(ENG_IDS).not.toContain('ENG-2025-014');   // tetap tinggal di data_part1
  });

  ENG_IDS.forEach(id => {
    it(`${id} — Σ unadj = 0 dan Σ ly = 0 (neraca saldo seimbang)`, () => {
      const rows = WTB_BY_ENGAGEMENT[id];
      expect(rows.reduce((s, r) => s + r.unadj, 0)).toBe(0);
      expect(rows.reduce((s, r) => s + r.ly, 0)).toBe(0);
    });

    it(`${id} — adj = unadj + aje pada setiap baris`, () => {
      WTB_BY_ENGAGEMENT[id].forEach(r => expect(r.adj).toBe(r.unadj + r.aje));
    });

    it(`${id} — figur entitas dapat diturunkan & laba masuk akal`, () => {
      const f = entityFigures(WTB_BY_ENGAGEMENT[id] as unknown as WTB, 'unadj');
      expect(f.available).toBe(true);
      expect(f.revenue!).toBeGreaterThan(0);
      expect(f.pbt!).toBeGreaterThan(0);                       // seluruh klien seed untung
      expect(f.pbt! / f.revenue!).toBeLessThan(0.6);           // marjin tak absurd
      expect(f.totalAssets!).toBeGreaterThan(0);
    });
  });
});

describe('PR-J — bagan akun memang BERBEDA menurut industri', () => {
  const codes = (id: string) => new Set(WTB_BY_ENGAGEMENT[id].map(r => r.code));

  /* Inti kebocoran lama: perusahaan pembiayaan menampilkan Beban Pokok Penjualan
     dan persediaan. Bila uji ini gagal, kebocoran itu kembali. */
  it('multifinance TIDAK punya persediaan maupun beban pokok penjualan', () => {
    const c = codes('ENG-2025-040');
    expect(c.has('1-1300')).toBe(false);        // persediaan
    expect(c.has('5-1100')).toBe(false);        // beban pokok penjualan
    expect(c.has('1-1150')).toBe(true);         // piutang pembiayaan konsumen
    expect(c.has('4-1200')).toBe(true);         // pendapatan bunga pembiayaan
  });

  it('SaaS punya pendapatan diterima di muka & aset takberwujud, tanpa persediaan', () => {
    const c = codes('ENG-2025-047');
    expect(c.has('2-1800')).toBe(true);         // pendapatan diterima di muka
    expect(c.has('1-2400')).toBe(true);         // perangkat lunak dikembangkan
    expect(c.has('1-1300')).toBe(false);
  });

  it('perkebunan punya tanaman produktif; properti punya persediaan real estat & uang muka pelanggan', () => {
    expect(codes('ENG-2025-031').has('1-2200')).toBe(true);
    expect(codes('ENG-2025-063').has('1-1310')).toBe(true);
    expect(codes('ENG-2025-063').has('2-1700')).toBe(true);
  });

  it('tak ada dua perikatan yang bagan akunnya identik dengan ENG-2025-014', () => {
    const sentosa = new Set((AMS.WTB as Array<{ code: string }>).map(r => r.code));
    ENG_IDS.forEach(id => {
      const c = codes(id);
      const sama = [...c].every(x => sentosa.has(x)) && c.size === sentosa.size;
      expect(sama).toBe(false);
    });
  });

  it('pendapatan tiap perikatan berbeda nominal — bukan salinan yang diskalakan seragam', () => {
    const revs = ENG_IDS.map(id => entityFigures(WTB_BY_ENGAGEMENT[id] as unknown as WTB, 'unadj').revenue!);
    expect(new Set(revs).size).toBe(revs.length);
  });
});
