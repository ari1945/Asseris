/* ============================================================
   BI Firma vs buku besar — satu pendapatan, bukan dua.

   `BI_DATA.fyRevenue` (data_part3.ts) adalah SALINAN KEDUA pendapatan firma:
   ia sama persis dengan kontrol GL `4-100`, dan `revenueByService` menjumlah
   tepat kepadanya. Selama keduanya kebetulan sama, tak ada yang berbunyi —
   dan itulah masalahnya: begitu buku besar bergerak (JV-0321, usulan B6),
   tiga modul BI/Dashboard akan melaporkan angka yang dibantah buku besarnya
   sendiri, tanpa satu pun gerbang memerah.

   Ini gerbang KESAMAAN antar dua register yang seharusnya satu, bukan
   turunan-melawan-turunan (pelajaran #242): sisi kiri data yang diketik,
   sisi kanan mesin GL. Keduanya bisa berbeda — hari ini kebetulan tidak.

   TERBUKA (usulan B6 §R4): salinan ini semestinya DITURUNKAN dari
   `FIRMFIN.pl().revenue`, bukan disalin lalu dijaga. Sampai itu diputuskan,
   gerbang inilah yang menahannya agar tak menyimpang diam-diam.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { BI_DATA } from './data_part3';
import { FIRM_COA } from './data_part1';
import { FIRMFIN } from './data_firmfin';

const bi = BI_DATA as unknown as {
  fyRevenue: number; prevYearRevenue: number; targetRevenue: number;
  revenueByService: { svc: string; amount: number }[];
};
const coa = FIRM_COA as unknown as { code: string; bal: number }[];
const glRevenue = (): number => -coa.find((a) => a.code === '4-100')!.bal;

describe('BI_DATA.fyRevenue == pendapatan buku besar', () => {
  it('sama dengan kontrol GL 4-100', () => {
    expect(bi.fyRevenue).toBe(glRevenue());
  });

  it('sama dengan mesin P&L firma (FIRMFIN.pl)', () => {
    const pl = FIRMFIN.pl({}) as unknown as { revenue: number };
    expect(bi.fyRevenue).toBe(pl.revenue);
  });

  it('gerbang ini bisa merah (anti-tautologi)', () => {
    expect(bi.fyRevenue + 1).not.toBe(glRevenue());
  });
});

describe('bauran lini jasa menutup ke totalnya', () => {
  it('Sigma revenueByService == fyRevenue', () => {
    const sum = bi.revenueByService.reduce((s, r) => s + r.amount, 0);
    expect(sum).toBe(bi.fyRevenue);
  });

  it('setiap lini positif — bukan plug negatif', () => {
    bi.revenueByService.forEach((r) => expect(r.amount, r.svc).toBeGreaterThan(0));
  });

  it('premis: lini Audit LK yang menyerap koreksi JV-0321 (ENG-2025-058 = audit LK)', () => {
    const audit = bi.revenueByService.find((r) => r.svc === 'Audit Laporan Keuangan')!;
    expect(audit.amount).toBe(8_200_000_000 - 492_000_000);
  });
});
