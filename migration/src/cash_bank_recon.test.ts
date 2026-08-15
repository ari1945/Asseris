/* ============================================================
   KAS MENUTUP KE BUKU BESAR — PRD cash-bank-reconciliation-register 2026-08-15.

   Sebelum arc ini: SATU akun `1-100 Kas & Bank` untuk ENAM rekening. Saldo BUKU per
   rekening karena itu tak dapat diturunkan untuk satu rekening pun — rekonsiliasi
   bank lima rekening bukan "belum dikerjakan", ia MUSTAHIL dirumuskan. Σ rekening
   10.475 jt vs kontrol 8.420 jt: selisih Rp 2.055 jt yang 97%-nya tak punya pemilik,
   dan ia SENDIRIAN mengunci ekspor Laporan Keuangan.

   Yang dipaku di sini:
     · saldo buku per rekening DITURUNKAN dari jurnal terposting;
     · Σ sub-akun kas == kontrol kas, secara konstruksi;
     · tiap rekening menutup: bank ± sisi-bank == buku ± sisi-buku;
     · dan yang terpenting — GERBANGNYA DAPAT MERAH. Jembatan Kas DIENUMERASI
       (revaluasi dihitung dari kurs, item rekonsiliasi dijumlah dari baris register).
       Bila ia diturunkan dari selisih yang hendak dijelaskannya, `residual` nol secara
       aljabar dan badge hijau selamanya — persis cacat `note` hardcode #240.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import { mergeSeedReconLines, seedReconLines } from './use_bank_recon';
import type { BankReconLine } from './use_bank_recon';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (gl: GlJournal[] = seedGl()): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), gl);
  return seedCoa().map(a => ({ ...a, bal: bal[a.code] }));
};
const ctxWith = (over: Record<string, unknown> = {}) =>
  ({ coa: derivedCoa(), engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, ...over });

interface Acct { id: string; acct: string; ccy: string; balance: number; bookIDR: number; bankIDR: number; bookSide: number; bankSide: number; adjustedBook: number; adjustedBank: number; residual: number; reconciled: boolean; openCount: number; reval: number }
interface Cash { control: number; totalIDR: number; totalBankBook: number; reval: number; reconItems: number; bridgeTotal: number; residual: number; per: Acct[]; unreconciled: Acct[] }
const cash = (over: Record<string, unknown> = {}) => FIRMFIN.cash(ctxWith(over)) as unknown as Cash;
const recons = (over: Record<string, unknown> = {}) =>
  FIRMFIN.reconciliations(ctxWith(over)) as unknown as Array<{ key: string; status: string; residual: number; bridgeTotal: number }>;
const bankAccounts = () => AMS.BANK_ACCOUNTS as unknown as Array<{ id: string; acct: string; ccy: string; balance: number }>;

describe('SC-1/SC-2 — satu akun buku besar per rekening', () => {
  it('tiap rekening menunjuk akun COA yang benar-benar ada', () => {
    for (const a of bankAccounts()) {
      expect(a.acct, a.id).toBeTruthy();
      expect(seedCoa().some(c => c.code === a.acct), `${a.id} → ${a.acct}`).toBe(true);
    }
  });

  it('akun `1-100` tunggal sudah TIDAK ADA lagi', () => {
    /* Selama ia ada, seseorang akan memakainya lagi sebagai "kas" dan sisi buku
       per rekening kembali mustahil. */
    expect(seedCoa().some(c => c.code === '1-100')).toBe(false);
  });

  it('Σ sub-akun kas == kontrol kas', () => {
    const c = cash();
    const codes = bankAccounts().map(a => a.acct);
    const sum = derivedCoa().filter(a => codes.includes(a.code)).reduce((s, a) => s + a.bal, 0);
    expect(c.control).toBe(sum);
    /* 8.420 jt (nilai `1-100` yang digantikan) + 60,638 jt revaluasi PSAK 10 yang
       kini DIPOSTING (JV-0319/0320) — satu-satunya angka firma yang memang berubah. */
    expect(c.control).toBe(8_480_638_000);
  });

  it('saldo buku tiap rekening = saldo akunnya (turunan jurnal), bukan literal', () => {
    const coa = derivedCoa();
    for (const p of cash().per) {
      expect(p.bookIDR, p.id).toBe((coa.find(a => a.code === p.acct) as CoaAccount).bal);
    }
  });
});

describe('SC-3 — memposting jurnal kas menggeser rekening yang tepat, dua arah', () => {
  const unpost = (id: string) => seedGl().map(j => j.id === id ? { ...j, posted: false } : j);

  it('membatalkan JV-0311 (gaji) menaikkan saldo buku Mandiri, bukan BCA', () => {
    const before = cash().per;
    const coa = derivedCoa(unpost('JV-0311'));
    const after = (FIRMFIN.cash({ coa, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Cash).per;
    const bk = (rows: Acct[], id: string) => (rows.find(r => r.id === id) as Acct).bookIDR;
    expect(bk(after, 'MDR-PAY') - bk(before, 'MDR-PAY')).toBe(1_820_000_000);
    expect(bk(after, 'BCA-OPS')).toBe(bk(before, 'BCA-OPS'));
  });

  it('membatalkan JV-0316 (bayar vendor) menaikkan saldo buku BCA Operasional', () => {
    const coa = derivedCoa(unpost('JV-0316'));
    const after = (FIRMFIN.cash({ coa, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Cash).per;
    const before = cash().per;
    const bk = (rows: Acct[], id: string) => (rows.find(r => r.id === id) as Acct).bookIDR;
    expect(bk(after, 'BCA-OPS') - bk(before, 'BCA-OPS')).toBe(910_000_000);
  });
});

describe('SC-4 — tiap rekening menutup', () => {
  it('keenam rekening `reconciled` pada seed', () => {
    const c = cash();
    expect(c.per).toHaveLength(6);
    expect(c.unreconciled.map(r => r.id)).toEqual([]);
  });

  it('mekanikanya benar: buku + sisi-buku == bank + sisi-bank', () => {
    for (const p of cash().per) {
      expect(p.adjustedBook, p.id).toBe(p.bookIDR + p.bookSide);
      expect(p.adjustedBank, p.id).toBe(p.bankIDR + p.bankSide);
      expect(Math.abs(p.residual), p.id).toBeLessThan(1_000_000);
    }
  });

  it('BCA Operasional: angka rekonsiliasinya persis', () => {
    const p = cash().per.find(r => r.id === 'BCA-OPS') as Acct;
    expect(p.bookIDR).toBe(4_425_000_000);
    expect(p.bankIDR).toBe(4_497_150_000);
    expect(p.bookSide).toBe(2_150_000);      // −1,25 biaya bank + 3,40 jasa giro
    expect(p.bankSide).toBe(-70_000_000);    // −480 cek beredar + 410 setoran transit
    expect(p.adjustedBook).toBe(4_427_150_000);
    expect(p.adjustedBank).toBe(4_427_150_000);
  });

  it('valas dibandingkan pada KURS PENUTUP — buku sudah dijabarkan ulang (PSAK 10)', () => {
    const p = cash().per.find(r => r.id === 'BCA-USD') as Acct;
    expect(p.bankIDR).toBe(48_500 * 16_250);
    expect(p.bookIDR).toBe(48_500 * 16_250);   // termasuk JV-0319
    expect(p.reconciled).toBe(true);
  });

  it('MEMBATALKAN posting revaluasi membuat rekening valas TIDAK menutup', () => {
    /* Konsekuensi yang dikehendaki: tanpa penjabaran ulang, buku ada pada kurs
       perolehan sementara bank pada kurs penutup — memang tak menutup. */
    const gl = seedGl().map(j => j.id === 'JV-0319' ? { ...j, posted: false } : j);
    const coa = derivedCoa(gl);
    const c = FIRMFIN.cash({ coa, engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Cash;
    const p = c.per.find(r => r.id === 'BCA-USD') as Acct;
    expect(p.reconciled).toBe(false);
    expect(p.residual).toBe(22_795_000);
  });
});

describe('SC-5 — baris Kas menutup & ekspor terbuka', () => {
  it('jembatan menutup: residual nol, status bridged', () => {
    const row = recons().find(r => r.key === 'cash') as { status: string; residual: number };
    expect(Math.abs(row.residual)).toBeLessThan(1_000_000);
    expect(row.status).toBe('bridged');
  });

  it('TIDAK ADA baris rekonsiliasi yang `open` ⇒ ekspor Laporan Keuangan terbuka', () => {
    expect(recons().filter(r => r.status === 'open').map(r => r.key)).toEqual([]);
  });

  it('komponen jembatan berjumlah persis selisihnya', () => {
    const c = cash();
    /* Revaluasi TIDAK lagi jadi komponen jembatan — ia sudah ada di dalam saldo buku.
       Yang menjelaskan selisih hanyalah item rekonsiliasi yang dienumerasi:
       BCA-OPS 72,15 + MDR-PAY 23,15 + BNI-TAX 1,60 */
    expect(c.reconItems).toBe(72_150_000 + 23_150_000 + 1_600_000);
    expect(c.bridgeTotal).toBe(-(72_150_000 + 23_150_000 + 1_600_000));
    expect(c.control - c.totalIDR).toBe(c.bridgeTotal);
  });
});

describe('SC-6 — GERBANG DAPAT MERAH (jembatan dienumerasi, bukan diturunkan dari selisih)', () => {
  /* Uji perusak. Bila `bridgeTotal` didefinisikan sebagai `−(reval + (Σbank − kontrol))`,
     seluruh blok ini akan HIJAU apa pun yang terjadi — dan gerbangnya tak menguji apa pun. */
  const bumpBank = (id: string, delta: number) => {
    const orig = bankAccounts();
    const patched = orig.map(a => a.id === id ? { ...a, balance: a.balance + delta } : a);
    return patched;
  };

  it('menaikkan saldo bank TANPA item rekonsiliasi ⇒ rekening itu tak menutup', () => {
    /* Meniru keadaan nyata: uang masuk di rekening koran yang belum dibukukan dan
       belum dicatat sebagai item rekonsiliasi. */
    const orig = AMS.BANK_ACCOUNTS;
    try {
      (AMS as unknown as { BANK_ACCOUNTS: unknown }).BANK_ACCOUNTS = bumpBank('BNI-TAX', 300_000_000);
      const c = cash();
      const p = c.per.find(r => r.id === 'BNI-TAX') as Acct;
      expect(p.reconciled).toBe(false);
      expect(p.residual).toBe(300_000_000);
      expect(c.unreconciled.map(r => r.id)).toEqual(['BNI-TAX']);
    } finally {
      (AMS as unknown as { BANK_ACCOUNTS: unknown }).BANK_ACCOUNTS = orig;
    }
  });

  it('…dan baris Kas kembali `open`, MENGUNCI ekspor Laporan Keuangan', () => {
    const orig = AMS.BANK_ACCOUNTS;
    try {
      (AMS as unknown as { BANK_ACCOUNTS: unknown }).BANK_ACCOUNTS = bumpBank('BNI-TAX', 300_000_000);
      const row = recons().find(r => r.key === 'cash') as { status: string; residual: number };
      expect(Math.abs(row.residual)).toBe(300_000_000);
      expect(row.status).toBe('open');
      expect(recons().some(r => r.status === 'open')).toBe(true);
    } finally {
      (AMS as unknown as { BANK_ACCOUNTS: unknown }).BANK_ACCOUNTS = orig;
    }
  });

  it('mencabut satu item rekonsiliasi memerahkan rekening yang bersangkutan', () => {
    const tanpaCekBeredar = seedReconLines().filter(l => l.id !== 'OPS-5');
    const p = cash({ reconLines: tanpaCekBeredar }).per.find(r => r.id === 'BCA-OPS') as Acct;
    expect(p.reconciled).toBe(false);
    expect(p.residual).toBe(480_000_000);
  });

  it('menandai item terbuka sebagai `matched` juga memerahkan — pencocokan berdampak', () => {
    /* Ini yang membuktikan overrides `bankrecon` benar-benar disalurkan ke lapisan
       kanon: tanpa penyaluran, mengubah `matched` tak akan menggerakkan apa pun. */
    const dicocokkan = seedReconLines().map(l => l.id === 'OPS-6' ? { ...l, matched: true } : l);
    const row = recons({ reconLines: dicocokkan }).find(r => r.key === 'cash') as { status: string };
    expect(row.status).toBe('open');
  });
});

describe('SC-9 — nol-delta di luar Kas', () => {
  it('P&L, laba & modal kerja tidak bergerak', () => {
    const p = FIRMFIN.pl(ctxWith()) as unknown as { revenue: number; opProfit: number; totalExpense: number };
    /* Pendapatan jasa TIDAK bergerak — akun 5-600 sengaja bertipe Beban bersaldo kredit,
       supaya selisih kurs tidak menggelembungkan "Pendapatan KAP (GL 4-100)". */
    expect(p.revenue).toBe(11_300_000_000);
    /* Beban neto turun sebesar laba selisih kurs yang kini DIBUKUKAN (PSAK 10). */
    expect(p.totalExpense).toBe(8_500_000_000 - 60_638_000);
    expect(p.opProfit).toBe(2_800_000_000 + 60_638_000);
  });

  it('ketiga baris rekonsiliasi lain tetap seperti sebelumnya', () => {
    const r = recons();
    for (const key of ['ar', 'wip', 'ap']) {
      expect(r.find(x => x.key === key)?.status, key).toBe('bridged');
    }
  });
});

describe('Cache `bankrecon` basi tidak merusak rekonsiliasi', () => {
  /* Gotcha yang menggigit di #243: kunci persist tertinggal di belakang seed.
     Di sini bahayanya lebih halus — baris seed yang hilang berarti item rekonsiliasi
     hilang, dan rekening jadi MERAH tanpa sebab yang benar. */
  it('baris seed yang hilang digabungkan kembali', () => {
    const basi = seedReconLines().filter(l => l.account !== 'MDR-PAY');
    const sembuh = mergeSeedReconLines(basi, seedReconLines());
    expect(sembuh).toHaveLength(seedReconLines().length);
    expect(cash({ reconLines: sembuh }).unreconciled).toEqual([]);
  });

  it('baris seed yang BERUBAH disegarkan — cache lama tak boleh menang atas isinya', () => {
    /* Ditemukan hidup: penggabungan yang hanya menambahkan baris HILANG membiarkan
       cache lama memenangkan nilai yang sudah berubah. Pada jurnal, itu membuat empat
       posting kas tetap menunjuk `1-100` yang sudah tidak ada. */
    const basi = seedReconLines().map(l => l.id === 'OPS-5' ? { ...l, amount: -1_000_000, ref: '' } : l);
    const sembuh = mergeSeedReconLines(basi, seedReconLines());
    const l = sembuh.find(x => x.id === 'OPS-5') as BankReconLine;
    expect(l.amount).toBe(-480_000_000);
    expect(l.ref).toBe('outstanding');
    expect(cash({ reconLines: sembuh }).unreconciled).toEqual([]);
  });

  it('suntingan pengguna dipertahankan, penggabungan idempoten', () => {
    const disunting: BankReconLine[] = seedReconLines().map(l => l.id === 'OPS-3' ? { ...l, matched: true } : l);
    const sekali = mergeSeedReconLines(disunting, seedReconLines());
    expect(sekali.find(l => l.id === 'OPS-3')?.matched).toBe(true);
    expect(mergeSeedReconLines(sekali, seedReconLines())).toHaveLength(sekali.length);
  });
});

describe('F-4 — revaluasi PSAK 10 DIBUKUKAN, bukan sekadar ditampilkan', () => {
  /* Sebelum ini aplikasi menghitung "+Rp 61 jt selisih kurs belum terealisasi" di satu
     tab dan tak pernah membukukannya: angka di layar yang tidak ada di buku besar —
     kelas cacat yang sama dengan kolom `actual` anggaran (#242) dan `wip.adj` (#237). */
  const gl = () => AMS.FIRM_GL as unknown as GlJournal[];

  it('ada jurnal revaluasi terposting untuk TIAP rekening valas', () => {
    const valas = bankAccounts().filter(a => a.ccy !== 'IDR');
    expect(valas).toHaveLength(2);
    for (const a of valas) {
      const j = gl().filter(x => x.posted && x.dr === a.acct && x.cr === '5-600');
      expect(j.length, a.id).toBe(1);
    }
  });

  it('nilainya = saldo × (kurs penutup − kurs perolehan), bukan angka karangan', () => {
    const usd = gl().find(j => j.id === 'JV-0319') as GlJournal;
    const sgd = gl().find(j => j.id === 'JV-0320') as GlJournal;
    expect(usd.amount).toBe(48_500 * (16_250 - 15_780));
    expect(sgd.amount).toBe(92_300 * (12_050 - 11_640));
  });

  it('akun 5-600 seluruhnya berasal dari jurnal — saldo awalnya NOL', () => {
    /* Bukti bahwa ia tidak diseed sebagai konstanta lalu "dijelaskan" belakangan. */
    const coa = seedCoa();
    const open = coa.map(a => ({ code: a.code, bal: a.bal }));
    const fx = open.find(a => a.code === '5-600') as { bal: number };
    expect(fx.bal).toBe(-(22_795_000 + 37_843_000));
  });

  it('laba operasi naik persis sebesar revaluasi — satu-satunya angka firma yang berubah', () => {
    const p = FIRMFIN.pl(ctxWith()) as unknown as { revenue: number; opProfit: number };
    expect(p.revenue).toBe(11_300_000_000);            // pendapatan jasa TIDAK bergerak
    expect(p.opProfit).toBe(2_860_638_000);
  });

  it('gerbang CAKUPAN anggaran (#242) tetap hijau — 5-600 punya baris anggaran', () => {
    /* Menambah akun P&L tanpa baris anggaran akan MEMERAHKANNYA; itu diuji terpisah di
       `firmfin_budget.test.ts`. Di sini yang dipaku: kita tidak meninggalkannya merah. */
    const b = FIRMFIN.budget(ctxWith()) as unknown as { covered: boolean; lines: Array<{ acct: string }> };
    expect(b.covered).toBe(true);
    expect(b.lines.some(l => l.acct === '5-600')).toBe(true);
  });
});
