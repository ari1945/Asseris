/* ============================================================
   CB3 & CB4 — KERTAS KERJA REKONSILIASI BANK: payloadnya, dan pelakunya.

   (e) Payload ekspor IDENTIK dengan yang dirender — bukan salinan — dan seimbang:
       saldo buku disesuaikan == saldo bank disesuaikan untuk rekening yang
       dinyatakan rekonsiliasi.
   (f) Tidak ada pencocokan yang tercatat tanpa identitas sesi nyata.

   Angka DIBACA KEMBALI dari sel (bukan dibandingkan dengan `rpCell()` yang sama
   yang membuatnya), supaya perbandingannya tidak tautologis: yang diuji adalah
   "angka di kertas kerja = angka mesin", bukan "formatter sama dengan dirinya".
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import { seedReconLines } from './use_bank_recon';
import { bankReconExportModel } from './bank_recon_export';
import type { ReconExportAccount, ReconExportModel } from './bank_recon_export';
import { reconMatchTrail } from './bank_recon_actor';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), seedGl());
  return seedCoa().map((a) => ({ ...a, bal: bal[a.code] }));
};
const engine = (over: Record<string, unknown> = {}): ReconExportAccount[] =>
  FIRMFIN.bankRecon({ coa: derivedCoa(), ...over }) as unknown as ReconExportAccount[];

const FIRM = String((AMS.FIRM as { name?: string }).name);
const model = (rows: ReconExportAccount[]): ReconExportModel =>
  bankReconExportModel({ accounts: rows, firmName: FIRM, preparedOn: String(AMS.TODAY), preparedBy: 'Dimas Raharjo' });

/** Baca kembali angka rupiah dari sel id-ID: '(70.000.000)' → −70000000. */
function cellNum(cell: string): number {
  const neg = cell.trim().startsWith('(');
  const digits = cell.replace(/[^0-9]/g, '');
  expect(digits.length, `sel '${cell}' tidak memuat angka`).toBeGreaterThan(0);
  return (neg ? -1 : 1) * Number(digits);
}
const COL = (m: ReconExportModel, label: string) => {
  const i = m.sheets[0].columns.indexOf(label);
  expect(i, `kolom '${label}' tak ada`).toBeGreaterThan(-1);
  return i;
};

/* ------------------------------------------------------------------
   (e) Payload = angka mesin, dan seimbang
   ------------------------------------------------------------------ */

describe('CB3/(e) — kertas kerja membawa angka mesin, bukan salinan layar', () => {
  it('setiap kolom angka dapat dibaca kembali sebagai angka `FIRMFIN.bankRecon()`', () => {
    const rows = engine();
    const m = model(rows);
    const cBuku = COL(m, 'Saldo Buku (GL)');
    const cBukuAdj = COL(m, 'Saldo Buku Disesuaikan');
    const cBank = COL(m, 'Saldo Bank');
    const cBankAdj = COL(m, 'Saldo Bank Disesuaikan');
    expect(m.sheets[0].rows).toHaveLength(rows.length);
    rows.forEach((a, i) => {
      const r = m.sheets[0].rows[i];
      expect(cellNum(r[cBuku]), a.id).toBe(Math.round(a.bookIDR));
      expect(cellNum(r[cBukuAdj]), a.id).toBe(Math.round(a.adjustedBook));
      expect(cellNum(r[cBank]), a.id).toBe(Math.round(a.bankIDR));
      expect(cellNum(r[cBankAdj]), a.id).toBe(Math.round(a.adjustedBank));
    });
  });

  it('rekening yang dinyatakan rekonsiliasi SEIMBANG di kertas kerjanya sendiri', () => {
    const rows = engine();
    const m = model(rows);
    const cBukuAdj = COL(m, 'Saldo Buku Disesuaikan');
    const cBankAdj = COL(m, 'Saldo Bank Disesuaikan');
    const cStatus = COL(m, 'Status');
    let seimbang = 0;
    rows.forEach((a, i) => {
      const r = m.sheets[0].rows[i];
      if (!a.reconciled) return;
      seimbang++;
      expect(r[cStatus], a.id).toBe('Seimbang');
      expect(cellNum(r[cBankAdj]), a.id).toBe(cellNum(r[cBukuAdj]));
    });
    expect(seimbang, 'tak ada rekening seimbang pada seed — premis ujinya hilang').toBe(6);
  });

  it('seluruh item rekonsiliasi ikut keluar, dengan sisi & jenisnya', () => {
    const m = model(engine());
    const items = m.sheets[1];
    expect(items.rows).toHaveLength(seedReconLines().length);
    const cek = items.rows.find((r) => r[2] === 'OPS-5');
    expect(cek, 'OPS-5 (cek beredar) tak ada di kertas kerja').toBeTruthy();
    expect(cek![5]).toBe('Bank');
    expect(cek![6]).toBe('Cek beredar');
    expect(cellNum(cek![7])).toBe(-480_000_000);
    const giro = items.rows.find((r) => r[2] === 'OPS-4');
    expect(giro![5]).toBe('Buku');
    expect(cellNum(giro![7])).toBe(3_400_000);
  });

  it('MENGUBAH satu item mengubah kertas kerjanya — ia turunan, bukan salinan beku', () => {
    /* Uji perusak: kalau payload disalin dari tampilan (atau dari angka literal),
       blok ini akan hijau apa pun yang terjadi. */
    const sebelum = model(engine());
    const cBankAdj = COL(sebelum, 'Saldo Bank Disesuaikan');
    const cStatus = COL(sebelum, 'Status');
    const iOps = engine().findIndex((a) => a.id === 'BCA-OPS');

    const dicocokkan = seedReconLines().map((l) => (l.id === 'OPS-6' ? { ...l, matched: true } : l));
    const sesudah = model(engine({ reconLines: dicocokkan }));

    const d = cellNum(sesudah.sheets[0].rows[iOps][cBankAdj]) - cellNum(sebelum.sheets[0].rows[iOps][cBankAdj]);
    /* OPS-6 adalah setoran transit +410 jt di SISI BANK. Menandainya cocok
       mencabutnya dari penyesuaian, jadi saldo bank disesuaikan TURUN 410 jt. */
    expect(d).toBe(-410_000_000);
    expect(sebelum.sheets[0].rows[iOps][cStatus]).toBe('Seimbang');
    expect(sesudah.sheets[0].rows[iOps][cStatus]).toBe('Belum menutup');
    expect(sesudah.meta.some((s) => s.includes('BCA-OPS'))).toBe(true);
  });

  it('nama firma dari SSOT — payload tanpa penerbit DITOLAK, bukan diisi literal', () => {
    expect(model(engine()).firm).toBe(FIRM);
    expect(() => bankReconExportModel({ accounts: engine(), firmName: '  ', preparedOn: '2026-03-09' }))
      .toThrow(/nama firma kosong/);
  });

  it('ekspor satu rekening menamai rekeningnya; ekspor seluruhnya menamai jumlahnya', () => {
    const one = model(engine().filter((a) => a.id === 'BCA-OPS'));
    expect(one.title).toContain('BCA Operasional');
    expect(one.sheets[0].rows).toHaveLength(1);
    const all = model(engine());
    expect(all.title).toContain('seluruh rekening');
    expect(all.meta[0]).toContain('6 rekening');
  });
});

/* ------------------------------------------------------------------
   (f) Tidak ada pencocokan yang tercatat tanpa identitas sesi
   ------------------------------------------------------------------ */

describe('CB4/(f) — jejak pencocokan menolak lahir tanpa identitas sesi', () => {
  const line = { id: 'OPS-6', desc: 'Setoran dalam perjalanan — Graha Properti', matched: false };

  it.each([undefined, null, '', '   ', 0, {}])('identitas %o ⇒ TIDAK dicatat', (bad) => {
    expect(reconMatchTrail(bad, line, true)).toBeNull();
  });

  it('identitas sesi nyata ⇒ dicatat atas namanya, dengan arah perubahannya', () => {
    const t = reconMatchTrail('Dimas Raharjo', line, true);
    expect(t).toBeTruthy();
    expect(t!.who).toBe('Dimas Raharjo');
    expect(t!.action).toBe('RECON_TOGGLE');
    expect(t!.detail).toContain('OPS-6');
    expect(t!.detail).toContain('→ cocok');
    expect(reconMatchTrail('Dimas Raharjo', { ...line, matched: true }, false)!.detail).toContain('→ belum cocok');
  });

  it('nama seed BUKAN jalan masuk: fungsi ini tak pernah membaca AMS', () => {
    /* Ia murni — satu-satunya sumber nama adalah argumennya. Yang menjaga agar
       pemanggilnya tidak menyuapkan `AMS.USER.name` adalah gerbang sumber di
       `cash_bank_conventions.test.ts`. */
    const seedName = String((AMS.USER as { name?: string }).name || '');
    expect(seedName, 'seed AMS.USER tak lagi punya nama — premis gerbang berubah').toBeTruthy();
    expect(reconMatchTrail('', line, true)).toBeNull();
  });
});
