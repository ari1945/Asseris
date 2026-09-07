/* ============================================================
   AP/AR Firma — register yang HIDUP menggerakkan rekonsiliasi akun kontrol.

   Modul `apar` memiliki DUA dari EMPAT akun kontrol yang direkonsiliasi seluruh
   aplikasi: Piutang Usaha `1-200` dan Utang Usaha `2-100` (keduanya ber-`owner:
   'apar'` di data_firmfin.ts). Sejak gerbang Q-2 mendarat, kedua baris itu ikut
   menentukan apakah Neraca Saldo & Laporan Keuangan firma boleh keluar sebagai
   kertas kerja.

   Cacat yang dipaku di sini (A1): sisi GL rekonsiliasi hidup — `ctx.coa` berisi
   saldo turunan jurnal terposting — sementara sisi SUB-BUKU beku pada seed:

     · `invOf(ctx) = (ctx && ctx.invoices) || A().INVOICES || []`   (data_firmfin.ts:248)
       membaca ctx, TETAPI tak ada satu pun pemanggil yang mengirim `invoices`.
     · `ap(ctx)` membaca `A().FIRM_AP` TANPA SYARAT (data_firmfin.ts:362) — tak ada
       kunci ctx sama sekali. Premis prompt 29-apar ("pola ctx.x || AMS.X") benar
       untuk AR, tetapi TIDAK untuk AP: di sana kuncinya belum pernah ada.

   Akibatnya membayar utang di modul `apar` mengubah register `firmap`, dan baris
   rekonsiliasi `2-100` tidak bergerak sedikit pun. Gerbang yang mengunci kertas
   kerja firma memeriksa sesuatu yang tak dapat berubah oleh tindakan pengguna.

   Yang wajib dibuktikan di sini bukan keadaan hijaunya, melainkan bahwa barisnya
   BERGERAK mengikuti register — termasuk ke arah yang tidak menyenangkan.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { dpoDays, dsoDays, daysLabel } from './apar_ratios';

interface Invoice {
  id: string; client: string; due: string;
  amount: number; paid: number; status: string;
}
interface ApBill {
  id: string; vendor: string; cat: string; due: string;
  amount: number; paid: number; status: string;
}
interface ReconRow {
  key: string; glCode: string; owner: string;
  control: number; sub: number; bridgeTotal: number; residual: number;
  status: 'tied' | 'bridged' | 'open';
}
interface ArModel { open: number; control: number; bridgeTotal: number; residual: number }
interface Ctx {
  engagements: unknown; clients: unknown;
  invoices?: Invoice[]; firmap?: ApBill[];
}

const seedInv = AMS.INVOICES as unknown as Invoice[];
const seedAp = AMS.FIRM_AP as unknown as ApBill[];

const ctx = (over: Partial<Ctx> = {}): Ctx => ({
  engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, ...over,
});
const recon = (over: Partial<Ctx> = {}): ReconRow[] =>
  FIRMFIN.reconciliations(ctx(over)) as unknown as ReconRow[];
const rowOf = (rows: ReconRow[], key: string): ReconRow => {
  const r = rows.find((x) => x.key === key);
  if (!r) throw new Error('baris rekonsiliasi tak ditemukan: ' + key);
  return r;
};
const arAging = (over: Partial<Ctx> = {}): ArModel =>
  FIRMFIN.arAging(ctx(over)) as unknown as ArModel;

/** Satu tagihan vendor dilunasi — persis yang dilakukan `payAp(id)` di modul. */
const bayar = (list: ApBill[], id: string): ApBill[] =>
  list.map((x) => (x.id === id ? { ...x, paid: x.amount, status: 'Paid' } : x));
/** Satu faktur ditandai lunas — persis yang dilakukan `markPaid(id)` di Billing. */
const lunas = (list: Invoice[], id: string): Invoice[] =>
  list.map((x) => (x.id === id ? { ...x, paid: x.amount, status: 'Paid' } : x));

/* ------------------------------------------------------------------
   (a) Membayar utang menggeser baris rekonsiliasi 2-100.
   ------------------------------------------------------------------ */
describe('A1 · baris 2-100 mengikuti register utang yang hidup', () => {
  it('sub-buku bergerak ketika satu tagihan dilunasi', () => {
    const sebelum = rowOf(recon({ firmap: seedAp }), 'ap');
    const tagihan = seedAp.find((x) => x.status !== 'Paid');
    if (!tagihan) throw new Error('premis gagal: tak ada tagihan terbuka di seed');
    const sesudah = rowOf(recon({ firmap: bayar(seedAp, tagihan.id) }), 'ap');

    expect(sebelum.sub).toBeGreaterThan(0);
    expect(sesudah.sub).toBe(sebelum.sub - (tagihan.amount - tagihan.paid));
    expect(sesudah.sub).not.toBe(sebelum.sub);
  });

  it('residual MELEBAR ketika utang dibayar — konsekuensi A3 (GL tak ikut bergerak)', () => {
    /* Pembayaran menurunkan sub-buku tanpa memposting jurnal apa pun, jadi kontrol
       GL `2-100` diam di tempat. Selisihnya nyata dan wajib terlihat, bukan
       disembunyikan: inilah alasan usulan A3 harus diputuskan, bukan dikarang. */
    const tagihan = seedAp.find((x) => x.status !== 'Paid');
    if (!tagihan) throw new Error('premis gagal: tak ada tagihan terbuka di seed');
    const sebelum = rowOf(recon({ firmap: seedAp }), 'ap');
    const sesudah = rowOf(recon({ firmap: bayar(seedAp, tagihan.id) }), 'ap');

    expect(sebelum.residual).toBe(0);
    expect(sebelum.status).not.toBe('open');
    expect(Math.abs(sesudah.residual)).toBeGreaterThan(Math.abs(sebelum.residual));
    expect(sesudah.status).toBe('open');
  });

  it('kontrol GL 2-100 TIDAK bergerak — sub-buku sendirian yang berubah', () => {
    const tagihan = seedAp.find((x) => x.status !== 'Paid');
    if (!tagihan) throw new Error('premis gagal: tak ada tagihan terbuka di seed');
    const sebelum = rowOf(recon({ firmap: seedAp }), 'ap');
    const sesudah = rowOf(recon({ firmap: bayar(seedAp, tagihan.id) }), 'ap');
    expect(sesudah.control).toBe(sebelum.control);
  });
});

/* ------------------------------------------------------------------
   (b) Menandai faktur lunas menggeser piutang & baris 1-200.
   ------------------------------------------------------------------ */
describe('A1/A2 · baris 1-200 mengikuti register faktur yang hidup', () => {
  it('piutang terbuka & sub-buku 1-200 bergerak ketika faktur ditandai lunas', () => {
    const faktur = seedInv.find((x) => x.status !== 'Paid' && x.status !== 'Draft' && x.amount > x.paid);
    if (!faktur) throw new Error('premis gagal: tak ada faktur terbuka di seed');
    const sisa = faktur.amount - faktur.paid;

    const sebelum = arAging({ invoices: seedInv });
    const sesudah = arAging({ invoices: lunas(seedInv, faktur.id) });
    expect(sesudah.open).toBe(sebelum.open - sisa);

    const bSebelum = rowOf(recon({ invoices: seedInv }), 'ar');
    const bSesudah = rowOf(recon({ invoices: lunas(seedInv, faktur.id) }), 'ar');
    expect(bSesudah.sub).toBe(bSebelum.sub - sisa);
    expect(bSesudah.status).toBe('open');
  });
});

/* ------------------------------------------------------------------
   (c) Satu register, satu angka piutang — untuk `apar` DAN `billing`.
   ------------------------------------------------------------------ */
describe('A2 · satu konsep, satu angka piutang', () => {
  /* Rumus yang DIPAKAI kedua modul sebelum perbaikan — dikutip di sini justru
     untuk membuktikan keduanya bisa menjawab berbeda untuk register yang SAMA,
     sehingga gerbang ini tak dapat dipuaskan dengan menyalin nilai. */
  const rumusApar = (inv: Invoice[]): number => inv
    .filter((x) => x.status !== 'Paid' && x.status !== 'Draft')
    .reduce((s, x) => s + (x.amount - x.paid), 0);
  const rumusBilling = (inv: Invoice[]): number =>
    inv.filter((x) => x.status !== 'Draft').reduce((s, x) => s + x.amount, 0)
    - inv.reduce((s, x) => s + x.paid, 0);

  it('kedua rumus lama BERSELISIH pada faktur draft yang sudah menerima uang muka', () => {
    const reg: Invoice[] = [
      ...seedInv,
      { id: 'INV-UJI-DP', client: 'PT Uji', due: '2026-04-30', amount: 400_000_000, paid: 150_000_000, status: 'Draft' },
    ];
    expect(rumusApar(reg)).not.toBe(rumusBilling(reg));
  });

  it('kedua rumus lama BERSELISIH pada faktur berstatus Paid yang belum lunas penuh', () => {
    const reg: Invoice[] = [
      ...seedInv,
      { id: 'INV-UJI-SISA', client: 'PT Uji', due: '2026-04-30', amount: 400_000_000, paid: 250_000_000, status: 'Paid' },
    ];
    expect(rumusApar(reg)).not.toBe(rumusBilling(reg));
  });

  it('sumber tunggal `FIRMFIN.arAging().open` memberi SATU angka untuk register itu', () => {
    const reg: Invoice[] = [
      ...seedInv,
      { id: 'INV-UJI-DP', client: 'PT Uji', due: '2026-04-30', amount: 400_000_000, paid: 150_000_000, status: 'Draft' },
      { id: 'INV-UJI-SISA', client: 'PT Uji', due: '2026-04-30', amount: 400_000_000, paid: 250_000_000, status: 'Paid' },
    ];
    const satu = arAging({ invoices: reg }).open;
    /* Sub-buku baris 1-200 memakai angka yang SAMA — bukan hitungan kedua. */
    expect(rowOf(recon({ invoices: reg }), 'ar').sub).toBe(satu);
    /* Dan ia memang berbeda dari sedikitnya satu rumus lama, jadi konvergensinya
       bukan kebetulan aritmetika. */
    expect([rumusApar(reg), rumusBilling(reg)]).not.toEqual([satu, satu]);
  });

  it('pada keadaan seed ketiganya sama — perbaikan ini TIDAK menggeser angka yang tampil', () => {
    const satu = arAging({ invoices: seedInv }).open;
    expect(rumusApar(seedInv)).toBe(satu);
    expect(rumusBilling(seedInv)).toBe(satu);
  });
});

/* ------------------------------------------------------------------
   (e) DSO/DPO tak pernah dihitung atas angka karangan.
   ------------------------------------------------------------------ */
describe('A5 · rasio tanpa basis tidak menghasilkan angka', () => {
  it('DSO/DPO null ketika basis laba-rugi tidak tersedia', () => {
    expect(dsoDays(2_695_000_000, null)).toBeNull();
    expect(dpoDays(1_043_000_000, null)).toBeNull();
    expect(dsoDays(2_695_000_000, undefined)).toBeNull();
    expect(dpoDays(1_043_000_000, undefined)).toBeNull();
  });

  it('DSO/DPO null ketika basisnya nol atau tak berhingga — bukan 0 hari, bukan Infinity', () => {
    expect(dsoDays(2_695_000_000, { revenue: 0, totalExpense: 8e9, salary: 5e9 })).toBeNull();
    expect(dpoDays(1_043_000_000, { revenue: 11e9, totalExpense: 5e9, salary: 5e9 })).toBeNull();
    expect(dsoDays(2_695_000_000, { revenue: Number.NaN, totalExpense: 8e9, salary: 5e9 })).toBeNull();
  });

  it('DSO/DPO dihitung ketika basisnya nyata', () => {
    const pl = { revenue: 11_300_000_000, totalExpense: 8_500_000_000, salary: 5_420_000_000 };
    expect(dsoDays(2_695_000_000, pl)).toBe(Math.round(2_695_000_000 / 11_300_000_000 * 365));
    expect(dpoDays(1_043_000_000, pl)).toBe(Math.round(1_043_000_000 / (8_500_000_000 - 5_420_000_000) * 365));
  });

  it('label menyatakan ketidaktersediaan, bukan menampilkan angka telanjang', () => {
    expect(daysLabel('DSO', 87)).toBe('DSO 87 hr');
    expect(daysLabel('DSO', null)).toBe('DSO tak tersedia');
    expect(daysLabel('DPO', null)).not.toMatch(/\d/);
  });

  it('basis laba-rugi dari FIRMFIN memang cocok bentuknya (kontrak, bukan asumsi)', () => {
    const pl = FIRMFIN.pl({ coa: AMS.FIRM_COA }) as unknown as { revenue: number; totalExpense: number; salary: number };
    expect(typeof pl.revenue).toBe('number');
    expect(typeof pl.totalExpense).toBe('number');
    expect(typeof pl.salary).toBe('number');
    expect(dsoDays(2_695_000_000, pl)).not.toBeNull();
  });
});
