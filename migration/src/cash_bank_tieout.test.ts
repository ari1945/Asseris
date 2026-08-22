/* ============================================================
   CB2 — HUBUNGAN ANTARA "Total Kas (ekuivalen IDR)" DAN AKUN KONTROLNYA.

   Angka utama modul ini (KPI Total Kas) adalah Σ saldo menurut BANK; akun kontrol
   yang dimiliki modul ini (`1-101…1-106`) adalah Σ saldo menurut BUKU. Keduanya
   memang TIDAK sama — kalau sama, tak akan ada yang namanya rekonsiliasi bank.
   Yang harus benar adalah: selisihnya dijelaskan SELURUHNYA oleh item rekonsiliasi
   yang dienumerasi, hingga sisa nol.

   Karena itu ada DUA angka di sini, dan keduanya ditulis eksplisit: selisih kotor
   (yang bukan cacat) dan sisa yang tak dijelaskan siapa pun (yang harus nol).

   Uji ini LAHIR HIJAU pada HEAD — ia berdiri sebagai gerbang anti-kambuh, bukan
   sebagai bukti bahwa ada yang diperbaiki. Yang membuatnya dapat MERAH: mengubah
   dasar kurs salah satu sisi, atau mencabut satu item rekonsiliasi (dibuktikan
   di bawah).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import { seedReconLines } from './use_bank_recon';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), seedGl());
  return seedCoa().map((a) => ({ ...a, bal: bal[a.code] }));
};
const ctxWith = (over: Record<string, unknown> = {}) =>
  ({ coa: derivedCoa(), engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, ...over });

interface CashRow { id: string; ccy: string; balance: number; bankIDR: number; bookIDR: number; bookSide: number; bankSide: number; reconciled: boolean }
interface Cash { control: number; totalIDR: number; reconItems: number; bridgeTotal: number; residual: number; per: CashRow[] }
const cash = (over: Record<string, unknown> = {}) => FIRMFIN.cash(ctxWith(over)) as unknown as Cash;
const recons = (over: Record<string, unknown> = {}) =>
  FIRMFIN.reconciliations(ctxWith(over)) as unknown as Array<{ key: string; status: string; residual: number; control: number; sub: number }>;

/* ------------------------------------------------------------------
   (c) Total Kas ↔ akun kontrol — dengan ANGKA
   ------------------------------------------------------------------ */

describe('CB2 — Total Kas yang ditampilkan menutup ke akun kontrolnya', () => {
  it('KPI Total Kas = Σ ekuivalen IDR per rekening dari mesin, bukan hitungan kedua', () => {
    const c = cash();
    expect(c.totalIDR).toBe(c.per.reduce((s, r) => s + r.bankIDR, 0));
    expect(c.totalIDR).toBe(8_577_538_000);
  });

  it('akun kontrol kas = Σ saldo buku `1-101…1-106`', () => {
    const c = cash();
    expect(c.control).toBe(c.per.reduce((s, r) => s + r.bookIDR, 0));
    expect(c.control).toBe(8_480_638_000);
  });

  it('selisih kotor Rp 96,9 jt — dan seluruhnya BERPEMILIK', () => {
    /* Inilah pembuktiannya: bukan "keduanya sama" (itu akan salah), melainkan
       "selisihnya persis sama dengan Σ item rekonsiliasi yang dienumerasi". */
    const c = cash();
    expect(c.totalIDR - c.control).toBe(96_900_000);
    expect(c.reconItems).toBe(96_900_000);
    expect(c.reconItems).toBe(72_150_000 + 23_150_000 + 1_600_000); // BCA-OPS · MDR-PAY · BNI-TAX
    expect(c.control - c.totalIDR).toBe(c.bridgeTotal);
    expect(c.residual).toBe(0);
  });

  it('valas dibandingkan pada dasar yang SAMA — buku sudah dijabarkan ulang', () => {
    /* Tersangka pertama bila keduanya berselisih adalah kurs pasar vs kurs buku.
       Di sini ia dibantah dengan angka: untuk kedua rekening valas, sisi bank dan
       sisi buku sama persis, sehingga tak satu rupiah pun dari selisih 96,9 jt
       berasal dari perbedaan kurs. */
    for (const r of cash().per.filter((x) => x.ccy !== 'IDR')) {
      expect(r.bankIDR, r.id).toBe(r.bookIDR);
      expect(r.reconciled, r.id).toBe(true);
    }
  });

  it('baris Kas di Sumber Kebenaran memakai kedua angka yang sama', () => {
    const c = cash();
    const row = recons().find((r) => r.key === 'cash');
    expect(row?.control).toBe(c.control);
    expect(row?.sub).toBe(c.totalIDR);
    expect(row?.status).toBe('bridged');
  });
});

/* ------------------------------------------------------------------
   (d) Mencocokkan satu item MENGGESER residual baris Kas
   ------------------------------------------------------------------ */

describe('CB2/(d) — pencocokan di modul ini benar-benar menggeser akun kontrol', () => {
  /* Kemungkinan besar sudah hijau berkat #251; ia tetap berharga sebagai gerbang
     anti-kambuh, karena "tombol yang berhenti di batas modulnya" sudah tiga kali
     lahir kembali di repo ini. */
  it('menandai setoran transit sebagai cocok memindahkan residual sebesar jumlahnya', () => {
    const before = recons().find((r) => r.key === 'cash');
    expect(before?.residual).toBe(0);

    const dicocokkan = seedReconLines().map((l) => (l.id === 'OPS-6' ? { ...l, matched: true } : l));
    const after = recons({ reconLines: dicocokkan }).find((r) => r.key === 'cash');
    expect(after?.status).toBe('open');
    expect(Math.abs(after!.residual)).toBe(410_000_000);
  });

  it('mencocokkan SELURUH item membuat selisih kotor tak lagi berpemilik', () => {
    const semua = seedReconLines().map((l) => ({ ...l, matched: true }));
    const c = cash({ reconLines: semua });
    expect(c.reconItems).toBe(0);
    expect(c.residual).toBe(-96_900_000);
    expect(recons({ reconLines: semua }).find((r) => r.key === 'cash')?.status).toBe('open');
  });
});
