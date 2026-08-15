/* ============================================================
   "AKTUAL" ADALAH BUKU BESAR — PRD budget-actual-ledger-derived 2026-08-15.

   #241 memberi FIRMFIN COA turunan-ledger, tetapi kolom `actual` pada FIRM_BUDGET
   tetap literal dan TIGA modul membacanya mentah tanpa lewat FIRMFIN sama sekali
   (view_bi · view_bi2 · view_firmtreasury). Terukur: memposting JV-0307 (Rp 210 jt)
   membuat headline "Laba Operasi" di BI menyatakan 2.800 jt sementara Firm Finance
   & Firm GL menyatakan 2.590 jt — angka laba kedua untuk satu firma, di layar yang
   justru ditunjukkan ke partner.

   Yang dipaku di sini:
     · aktual bergerak bersama buku besar, DUA ARAH, nol-delta pada seed bersih;
     · kolom literal benar-benar hilang dari seed (bukan sekadar tak dibaca);
     · gerbang penggantinya DAPAT MERAH — sebab setelah aktual diturunkan, gerbang
       lama ("aktual == saldo GL?") adalah tautologi. Uji perusak di bawah menambah
       akun P&L tanpa baris anggaran dan menuntut cakupan memerah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];

/** Meniru `useFirmCoa()`: COA dengan saldo turunan jurnal terposting. */
const derivedCoa = (gl: GlJournal[]): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), gl);
  return seedCoa().map(a => ({ ...a, bal: bal[a.code] }));
};

/** Jurnal berjalan dengan JV-0307 (akrual PPh 21 Rp 210 jt) diposting. */
const glPosted = () => seedGl().map(j => j.id === 'JV-0307' ? { ...j, posted: true } : j);

interface BudgetLine { line: string; acct: string; type: string; budget: number; actual: number; mapped: boolean; acctName: string | null }
interface Budget {
  lines: BudgetLine[];
  unbudgeted: Array<{ code: string; name: string; actual: number }>;
  unmapped: BudgetLine[];
  coverageGap: number;
  covered: boolean;
  actRev: number; actCost: number; actProfit: number;
  budRev: number; budCost: number; budProfit: number;
}
const budgetOf = (coa: CoaAccount[]) => FIRMFIN.budget({ coa }) as unknown as Budget;
const plOf = (coa: CoaAccount[]) => FIRMFIN.pl({ coa }) as unknown as { opProfit: number; revenue: number };

describe('SC-1 — kolom `actual` literal benar-benar hilang dari seed', () => {
  it('tak satu pun baris FIRM_BUDGET membawa `actual`', () => {
    /* Ini yang membuat pelanggaran tak mungkin senyap: selama kolomnya masih ada,
       modul berikutnya akan membacanya lagi — persis yang sudah terjadi tiga kali. */
    for (const b of AMS.FIRM_BUDGET as unknown as Array<Record<string, unknown>>) {
      expect(Object.prototype.hasOwnProperty.call(b, 'actual'), String(b.line)).toBe(false);
      expect(b.acct, String(b.line)).toBeTruthy();
    }
  });

  it('`actual` yang dikembalikan FIRMFIN adalah saldo akun yang dipetakan', () => {
    const coa = derivedCoa(seedGl());
    for (const l of budgetOf(coa).lines) {
      const a = coa.find(x => x.code === l.acct) as CoaAccount;
      expect(l.actual, l.acct).toBe(l.type === 'rev' ? -a.bal : a.bal);
      expect(l.mapped, l.acct).toBe(true);
    }
  });
});

describe('SC-4 — nol-delta pada seed bersih', () => {
  it('angka anggaran-vs-aktual pada keadaan boot tetap seperti sebelum arc ini', () => {
    /* Nilai-nilai ini adalah literal yang DULU tersimpan di FIRM_BUDGET.actual.
       Mengunci keduanya identik membuktikan penurunan tidak menggeser demo. */
    const b = budgetOf(derivedCoa(seedGl()));
    expect(b.actRev).toBe(11_300_000_000);
    /* Beban neto turun sebesar laba selisih kurs yang kini diposting (PSAK 10, #248). */
    expect(b.actCost).toBe(8_500_000_000 - 60_638_000);
    expect(b.actProfit).toBe(2_800_000_000 + 60_638_000);
    expect(b.budProfit).toBe(3_780_000_000 + 40_000_000);
  });

  it('laba anggaran == laba operasi P&L (kedua sisi menutup)', () => {
    const coa = derivedCoa(seedGl());
    expect(budgetOf(coa).actProfit).toBe(plOf(coa).opProfit);
  });
});

describe('SC-2/SC-3/SC-5 — aktual bergerak bersama buku besar, dua arah', () => {
  it('memposting JV-0307 menurunkan laba aktual persis 210 jt', () => {
    const sebelum = budgetOf(derivedCoa(seedGl())).actProfit;
    const sesudah = budgetOf(derivedCoa(glPosted())).actProfit;
    expect(sebelum - sesudah).toBe(210_000_000);
  });

  it('yang bergerak adalah baris beban gaji (5-100), bukan pendapatan', () => {
    const b = budgetOf(derivedCoa(glPosted()));
    const gaji = b.lines.find(l => l.acct === '5-100') as BudgetLine;
    expect(gaji.actual).toBe(5_630_000_000);
    expect(b.actRev).toBe(11_300_000_000);
  });

  it('membatalkan posting mengembalikan angka (bukan sekali jalan)', () => {
    const kembali = glPosted().map(j => j.id === 'JV-0307' ? { ...j, posted: false } : j);
    expect(budgetOf(derivedCoa(kembali)).actProfit).toBe(2_860_638_000);
  });

  it('anggaran & P&L TETAP sepakat setelah posting — tak ada angka laba kedua', () => {
    /* Inti arc ini. Sebelum perubahan, ruas kiri membeku di 2.800 jt. */
    const coa = derivedCoa(glPosted());
    expect(budgetOf(coa).actProfit).toBe(plOf(coa).opProfit);
    expect(budgetOf(coa).coverageGap).toBe(0);
  });
});

describe('SC-6 — gerbang cakupan DAPAT MERAH', () => {
  it('seed apa adanya: cakupan penuh', () => {
    const b = budgetOf(derivedCoa(seedGl()));
    expect(b.covered).toBe(true);
    expect(b.unbudgeted).toHaveLength(0);
    expect(b.unmapped).toHaveLength(0);
  });

  it('akun beban yang diposting tapi TAK dianggarkan memerahkan cakupan', () => {
    /* Uji perusak — inilah yang membedakan gerbang ini dari tie-out tautologis yang
       digantikannya. Tanpa uji ini, badge hijau tak membuktikan apa pun. */
    const coa = [...derivedCoa(seedGl()), { code: '5-700', name: 'Beban Litigasi', type: 'Beban', bal: 300_000_000 }];
    const b = budgetOf(coa);
    expect(b.covered).toBe(false);
    expect(b.unbudgeted.map(u => u.code)).toEqual(['5-700']);
    expect(b.unbudgeted[0].actual).toBe(300_000_000);
    /* Laba anggaran overstated persis sebesar beban yang tak dianggarkan. */
    expect(b.coverageGap).toBe(-300_000_000);
    expect(b.actProfit - plOf(coa).opProfit).toBe(300_000_000);
  });

  it('akun pendapatan yang tak dianggarkan juga memerahkan cakupan', () => {
    const coa = [...derivedCoa(seedGl()), { code: '4-200', name: 'Pendapatan Lain', type: 'Pendapatan', bal: -450_000_000 }];
    const b = budgetOf(coa);
    expect(b.covered).toBe(false);
    expect(b.unbudgeted[0].actual).toBe(450_000_000);
    expect(b.coverageGap).toBe(450_000_000);
  });

  it('baris anggaran yang menunjuk akun tak dikenal ditandai, bukan disamarkan jadi nol', () => {
    /* `acct()` punya fallback `{ bal: 0 }` yang akan menyamarkan pemetaan rusak
       sebagai aktual nol. `budget()` sengaja TIDAK memakainya. */
    const coa = derivedCoa(seedGl()).filter(a => a.code !== '5-400');
    const b = budgetOf(coa);
    expect(b.covered).toBe(false);
    expect(b.unmapped.map(u => u.acct)).toEqual(['5-400']);
    expect(b.lines.find(l => l.acct === '5-400')?.mapped).toBe(false);
  });

  it('`covered` ikut turun ke peta Sumber Kebenaran (provenance)', () => {
    const coa = [...derivedCoa(seedGl()), { code: '5-700', name: 'Beban Litigasi', type: 'Beban', bal: 300_000_000 }];
    const prov = FIRMFIN.provenance({ coa, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Array<{ label: string; tied: boolean }>;
    const row = prov.find(p => p.label === 'Anggaran vs aktual') as { tied: boolean };
    expect(row.tied).toBe(false);
  });
});

describe('SC-7 — varians pendapatan tidak dipoles', () => {
  it('pendapatan aktual ADA DI BAWAH anggaran; variansnya negatif', () => {
    /* Headline Firm Finance dulu menambahkan konstanta `+ 6` sehingga −5,8% tampil
       sebagai "+0,2%" dengan panah hijau. Angkanya dipaku di sini. */
    const b = budgetOf(derivedCoa(seedGl()));
    const varPct = (b.actRev / b.budRev - 1) * 100;
    expect(varPct).toBeLessThan(0);
    expect(varPct).toBeCloseTo(-5.83, 2);
  });
});
