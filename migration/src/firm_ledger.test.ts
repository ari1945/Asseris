/* ============================================================
   Program E — P0 firmgl: komputasi saldo GL dari jurnal.
   Memaku: (1) saldo awal dianker ke seed (jurnal demo) SEKALI →
   saat baru dimuat saldo kini == seed (tanpa migrasi data);
   (2) memposting / membatalkan jurnal LANGSUNG menggeser TB/LK/
   Buku Besar; (3) TB tetap seimbang (double-entry).
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { FIRM_COA, FIRM_GL } from './data_part1';
import {
  netEffect, openingBalances, currentBalances,
  trialBalance, statements, accountLedger,
} from './firm_ledger';

const coa = FIRM_COA;
const seedGl = FIRM_GL;   // jurnal demo: postingsnya SUDAH termuat di coa[].bal
const byCode = (bal: Record<string, number>, code: string) => bal[code];

describe('Program E — firm_ledger: saldo dari jurnal (P0)', () => {
  it('saldo awal = seed − Σ jurnal SEED terposting', () => {
    const open = openingBalances(coa, seedGl);
    /* Kas kini SATU akun per rekening (PRD cash-bank-reconciliation-register); tak ada
       lagi `1-100`. BCA Operasional: JV-0312 dr +925 · JV-0308 cr −480 · JV-0316 cr −910
       → net −465. Penggajian Mandiri: JV-0311 cr −1.820. */
    expect(byCode(open, '1-101')).toBe(4_425_000_000 + 465_000_000);
    expect(byCode(open, '1-102')).toBe(1_180_000_000 + 1_820_000_000);
    // Piutang: JV-0312 cr −925 · JV-0309 dr +555 · JV-0314 dr +1.640 → net +1.270
    expect(byCode(open, '1-200')).toBe(4_440_000_000 - 1_270_000_000);
    // WIP: JV-0313 dr +2.850 · JV-0314 cr −1.640 → net +1.210
    expect(byCode(open, '1-300')).toBe(9_300_000_000 - 1_210_000_000);
    expect(byCode(open, '5-200')).toBe(1_570_000_000 - 820_000_000); // net +820
    // Pendapatan: JV-0309 cr −555 · JV-0313 cr −2.850 → net −3.405
    expect(byCode(open, '4-100')).toBe(-11_300_000_000 + 3_405_000_000);
    // Utang usaha: JV-0310/0315/0317/0318 cr −1.030 · JV-0316 dr +910 → net −120
    expect(byCode(open, '2-100')).toBe(-1_820_000_000 + 120_000_000);
  });

  it('saldo kini == seed saat app baru dimuat (gl == seedGl)', () => {
    const cur = currentBalances(coa, seedGl, seedGl);
    for (const a of coa) {
      expect(byCode(cur, a.code)).toBe(a.bal);
    }
  });

  it('jurnal draft (belum diposting) TIDAK memengaruhi saldo', () => {
    expect(netEffect(seedGl, '2-200')).toBe(0); // JV-0307 (draft) cr 2-200
    expect(byCode(currentBalances(coa, seedGl, seedGl), '2-200')).toBe(-940_000_000);
  });

  it('membatalkan posting jurnal menggeser TB (P0: posting berdampak)', () => {
    const changed = seedGl.map((j) => j.id === 'JV-0312' ? { ...j, posted: false } : j);
    const cur = currentBalances(coa, seedGl, changed);
    expect(byCode(cur, '1-101')).toBe(4_425_000_000 - 925_000_000); // kas turun
    expect(byCode(cur, '1-200')).toBe(4_440_000_000 + 925_000_000); // piutang naik
  });

  it('memposting jurnal draft menggeser TB', () => {
    const changed = seedGl.map((j) => j.id === 'JV-0307' ? { ...j, posted: true } : j);
    const cur = currentBalances(coa, seedGl, changed);
    expect(byCode(cur, '5-100')).toBe(5_420_000_000 + 210_000_000);
    expect(byCode(cur, '2-200')).toBe(-940_000_000 - 210_000_000);
  });

  it('TB tetap seimbang — total debit == total kredit (36.760 M)', () => {
    const tb = trialBalance(coa, seedGl, seedGl);
    expect(tb.balanced).toBe(true);
    /* +60,638 jt setelah revaluasi PSAK 10 diposting (JV-0319/0320, #248). */
    expect(tb.totalDr).toBe(36_820_638_000);
    expect(tb.totalCr).toBe(36_820_638_000);
    // baris TB memakai saldo turunan (bukan seed)
    expect(tb.rows.find((r) => r.code === '1-101')?.bal).toBe(4_425_000_000);
  });

  it('TB tetap seimbang SETELAH ada jurnal baru (double-entry)', () => {
    const withNew = [...seedGl, { id: 'JV-0999', date: '2026-03-09', desc: 'tes', dr: '1-101', cr: '4-100', amount: 100_000_000, posted: true }];
    const tb = trialBalance(coa, seedGl, withNew);
    expect(tb.balanced).toBe(true);
    expect(tb.totalDr).toBe(36_920_638_000);
    expect(tb.rows.find((r) => r.code === '1-101')?.bal).toBe(4_525_000_000);
    expect(tb.rows.find((r) => r.code === '4-100')?.bal).toBe(-11_400_000_000);
  });

  it('LK turun dari TB: pendapatan 11.300, beban 8.500, laba 2.800, aset seimbang', () => {
    const st = statements(coa, seedGl, seedGl);
    expect(st.revenue).toBe(11_300_000_000);
    /* Beban NETO: laba selisih kurs (akun 5-600, saldo kredit) kini dibukukan. */
    expect(st.expense).toBe(8_500_000_000 - 60_638_000);
    expect(st.netProfit).toBe(2_800_000_000 + 60_638_000);
    expect(st.totAset).toBe(28_260_000_000 + 60_638_000);
    expect(st.totLiab).toBe(4_020_000_000);
    expect(st.totEkuitas).toBe(24_240_000_000 + 60_638_000);
    expect(st.balanced).toBe(true);
  });

  it('LK bergeser mengikuti posting jurnal baru (laba 2.900 setelah +100 pendapatan)', () => {
    const withNew = [...seedGl, { id: 'JV-0998', date: '2026-03-09', desc: 'pendapatan tambahan', dr: '1-200', cr: '4-100', amount: 100_000_000, posted: true }];
    const st = statements(coa, seedGl, withNew);
    expect(st.revenue).toBe(11_400_000_000);
    expect(st.netProfit).toBe(2_900_000_000 + 60_638_000);
    expect(st.balanced).toBe(true);
  });

  it('buku besar BCA Operasional: saldo awal 4.890 → berjalan → saldo akhir seed 4.425', () => {
    const lg = accountLedger(coa, seedGl, seedGl, '1-101');
    expect(lg.opening).toBe(4_890_000_000);
    expect(lg.closing).toBe(4_425_000_000);
    expect(lg.totalDr).toBe(925_000_000);   // JV-0312 dr
    expect(lg.totalCr).toBe(1_390_000_000); // JV-0308 + JV-0316 cr
    expect(lg.rows).toHaveLength(3);
    expect(lg.rows[0].id).toBe('JV-0308'); // urut tanggal
    expect(lg.rows[0].running).toBe(4_890_000_000 - 480_000_000);
    expect(lg.rows[2].running).toBe(4_425_000_000);
  });

  it('GL kosong → saldo = SALDO AWAL (bukan seed), TB tetap seimbang', () => {
    const tb = trialBalance(coa, seedGl, []);
    expect(tb.balanced).toBe(true);
    expect(tb.totalDr).toBe(33_235_000_000); // opening: Aset 28.065 + Beban 5.170
    expect(tb.totalCr).toBe(33_235_000_000);
    const st = statements(coa, seedGl, []);
    expect(st.netProfit).toBe(2_725_000_000); // revenue opening 7.895 − beban 5.170
    expect(st.balanced).toBe(true);
  });
});
