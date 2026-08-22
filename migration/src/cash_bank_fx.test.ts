/* ============================================================
   CB1 — KURS BERMASA BERLAKU: (a) tak tercakup ⇒ tak ada angka revaluasi,
   (b) memajukan klok SSOT mengubah modul dari "terhitung" jadi "tak tercakup".

   Cacat yang ditutup: `FX_RATES`/`FX_BOOK` adalah dua record tanpa tanggal, tanpa
   dasar, tanpa masa. Yang berdiri di atasnya bukan hiasan — sejak #249 selisihnya
   DIBUKUKAN (JV-0319/JV-0320 → GL 5-600). Ketika klok bergerak, aplikasi tetap
   merevaluasi pada kurs Maret 2026 dan memposting selisihnya, tanpa satu pun tanda.

   Yang dipaku di sini adalah PERILAKUnya, bukan hanya bentuk datanya.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';
import { regrefIssues, regrefSpan } from './canon_regref';
import { FX_ENFORCEMENT, FX_LABEL, FX_REGISTRY, fxAt, fxRequired, fxRevaluation } from './canon_fx';
import type { FxPosition } from './canon_fx';

const accounts = () => AMS.BANK_ACCOUNTS as unknown as FxPosition[];
const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];
const derivedCoa = (): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), seedGl());
  return seedCoa().map((a) => ({ ...a, bal: bal[a.code] }));
};
interface ReconRow { id: string; ccy: string; bankIDR: number; reconciled: boolean; fxCovered: boolean; fxNote: string; closingRate: number; periodEnd: string }
const bankRecon = () => FIRMFIN.bankRecon({ coa: derivedCoa() }) as unknown as ReconRow[];

/** Ganti sebuah kunci AMS untuk satu blok uji, lalu kembalikan apa pun yang terjadi. */
function withAms<T>(key: string, value: unknown, fn: () => T): T {
  const store = AMS as unknown as Record<string, unknown>;
  const before = store[key];
  store[key] = value;
  try { return fn(); } finally { store[key] = before; }
}

/* ------------------------------------------------------------------
   Bentuk registry — tak ada kurs yang dikarang
   ------------------------------------------------------------------ */

describe('CB1 — registry kurs: satu masa yang diketahui, sisanya sengaja kosong', () => {
  it('bersih secara struktural (tanpa tumpang tindih, punya dasar hukum)', () => {
    expect(regrefIssues(FX_REGISTRY, FX_LABEL)).toEqual([]);
    expect(FX_ENFORCEMENT).toBe('block');
  });

  it('rentangnya DITUTUP — tidak ada set terbuka yang berlaku selamanya', () => {
    /* Set terbuka (`effectiveTo: null`) akan mengembalikan cacat aslinya dalam
       bentuk yang lebih sulit dilihat: ia punya tanggal mulai, tapi tak pernah
       kedaluwarsa. */
    expect(FX_REGISTRY.every((s) => s.effectiveTo != null)).toBe(true);
    expect(regrefSpan(FX_REGISTRY)).toEqual({ from: '2026-03-01', to: '2026-03-31' });
  });

  it('hanya SATU periode yang diketahui aplikasi ini, dan hanya itu yang didaftarkan', () => {
    expect(FX_REGISTRY).toHaveLength(1);
    expect(FX_REGISTRY[0].verified, 'dasar kutipannya belum dicocokkan — katakan begitu').toBe(false);
    expect(FX_REGISTRY[0].note).toBeTruthy();
  });

  it('nilainya = kurs yang SUDAH dipakai pembukuan firma (JV-0319/0320)', () => {
    /* Nol-delta: kalau angka di registry berbeda dari yang diposting, revaluasi di
       layar akan berselisih dengan buku besar — kelas cacat yang dicabut #249. */
    const v = fxRequired('2026-03-31');
    const gl = AMS.FIRM_GL as unknown as GlJournal[];
    const usd = gl.find((j) => j.id === 'JV-0319') as GlJournal;
    const sgd = gl.find((j) => j.id === 'JV-0320') as GlJournal;
    expect(48_500 * (v.closing.USD - v.book.USD)).toBe(usd.amount);
    expect(92_300 * (v.closing.SGD - v.book.SGD)).toBe(sgd.amount);
  });
});

/* ------------------------------------------------------------------
   (a) Tak tercakup ⇒ TIDAK ADA angka revaluasi
   ------------------------------------------------------------------ */

describe('CB1/(a) — tanggal di luar masa terdaftar tidak menghasilkan angka revaluasi', () => {
  it('revaluasi 2026-04-01 BERHENTI dan menyebut sebabnya', () => {
    const r = fxRevaluation(accounts(), '2026-04-01');
    expect(r.covered).toBe(false);
    expect(r.status).toBe('no-coverage');
    expect(r.rows).toEqual([]);
    /* `null`, BUKAN 0: nol adalah angka, ketiadaan jawaban bukan. */
    expect(r.total).toBeNull();
    expect(r.note).toContain('2026-04-01');
    expect(r.note).toMatch(/DITOLAK/);
  });

  it('…dan TIDAK jatuh ke kurs periode terakhir', () => {
    const maret = fxRevaluation(accounts(), '2026-03-09');
    const april = fxRevaluation(accounts(), '2026-04-01');
    expect(maret.total).toBe(60_638_000);
    expect(april.total).not.toBe(maret.total);
    expect(april.total).toBeNull();
  });

  it('tanggal sebelum masa terdaftar juga tak tercakup — bukan hanya sesudahnya', () => {
    expect(fxRevaluation(accounts(), '2026-02-28').total).toBeNull();
    expect(fxAt('2026-02-28').status).toBe('no-coverage');
  });

  it('tanggal tak terbaca ditolak, tidak ditebak', () => {
    for (const bad of ['', 'kemarin', '2026-3-1']) {
      const r = fxRevaluation(accounts(), bad);
      expect(r.status, bad).toBe('bad-date');
      expect(r.total, bad).toBeNull();
    }
  });

  it('mata uang yang dipegang tetapi tak ada di set BERHENTI — bukan dinilai 1:1', () => {
    /* `fx[ccy] || 1` adalah bentuk karangan yang paling sulit terlihat: JPY 5 juta
       muncul sebagai Rp 5 juta dan tak ada yang berteriak. */
    const withJpy = [...accounts(), { id: 'X-JPY', ccy: 'JPY', balance: 5_000_000 }];
    const r = fxRevaluation(withJpy, '2026-03-09');
    expect(r.covered).toBe(false);
    expect(r.status).toBe('missing-currency');
    expect(r.missing).toEqual(['JPY']);
    expect(r.total).toBeNull();
    expect(r.note).toContain('JPY');
  });

  it('`fxRequired` melempar untuk masa yang tak tercakup — lapisan seed tak punya layar', () => {
    expect(() => fxRequired('2027-01-01')).toThrow(/belum ada di registry/);
  });
});

/* ------------------------------------------------------------------
   (b) Memajukan klok SSOT mengubah keadaan modul
   ------------------------------------------------------------------ */

describe('CB1/(b) — memajukan AMS.TODAY mengubah modul dari "terhitung" ke "tak tercakup"', () => {
  it('hari ini modul terhitung; setelah masa kurs terakhir ia tidak', () => {
    const sekarang = fxRevaluation(accounts(), String(AMS.TODAY));
    expect(sekarang.covered).toBe(true);
    expect(sekarang.rows).toHaveLength(2);
    expect(sekarang.total).toBe(60_638_000);

    const nanti = withAms('TODAY', '2026-06-30', () => fxRevaluation(accounts(), String(AMS.TODAY)));
    expect(nanti.covered).toBe(false);
    expect(nanti.total).toBeNull();
    expect(nanti.rows).toEqual([]);
  });

  it('klok SSOT hari ini memang berada DI DALAM masa terdaftar (premisnya nyata)', () => {
    const span = regrefSpan(FX_REGISTRY);
    expect(String(AMS.TODAY) >= span!.from).toBe(true);
    expect(String(AMS.TODAY) <= String(span!.to)).toBe(true);
  });
});

/* ------------------------------------------------------------------
   Rekonsiliasi memakai kurs PERIODENYA — bukan kurs hari ini
   ------------------------------------------------------------------ */

describe('CB1 — rekonsiliasi bank terikat pada periode yang direkonsiliasi', () => {
  it('tiap rekening menyatakan periode akhirnya dan kursnya tercakup', () => {
    for (const r of bankRecon()) {
      expect(r.periodEnd, r.id).toBe('2026-03-31');
      expect(r.fxCovered, r.id).toBe(true);
      expect(r.fxNote, r.id).toBe('');
    }
  });

  it('memajukan klok TIDAK menulis ulang kertas kerja Maret yang sudah selesai', () => {
    /* Kertas kerja periode Maret 2026 memakai kurs penutup Maret 2026 selamanya.
       Kalau ia mengikuti klok, rekonsiliasi yang sudah menutup bisa "membuka"
       sendiri berbulan-bulan kemudian tanpa satu pun transaksi baru. */
    const sebelum = bankRecon().map((r) => r.bankIDR);
    const sesudah = withAms('TODAY', '2027-02-01', () => bankRecon().map((r) => r.bankIDR));
    expect(sesudah).toEqual(sebelum);
  });

  it('periode yang kursnya TAK terdaftar membuat rekening valas tidak menutup — dan berkata mengapa', () => {
    /* Jalur pertahanan `fx[ccy] || 1` yang dicabut: dulu ia menghasilkan angka yang
       tampak sah. Kini rekening itu MEMERAH, dan `reconciliations()` ikut `open`
       sehingga ekspor Laporan Keuangan terkunci. */
    const bergeser = (AMS.BANK_RECONS as unknown as Array<{ account: string; periodEnd: string }>)
      .map((r) => ({ ...r, periodEnd: '2026-07-31' }));
    withAms('BANK_RECONS', bergeser, () => {
      const rows = bankRecon();
      const usd = rows.find((r) => r.id === 'BCA-USD') as ReconRow;
      expect(usd.fxCovered).toBe(false);
      expect(Number.isFinite(usd.bankIDR)).toBe(false);
      expect(usd.reconciled).toBe(false);
      expect(usd.fxNote).toContain('2026-07-31');
      /* Rekening rupiah tak butuh kurs — ia tetap menutup. */
      const idr = rows.find((r) => r.id === 'BNI-TAX') as ReconRow;
      expect(idr.fxCovered).toBe(true);
      expect(idr.reconciled).toBe(true);
      /* …dan baris Kas mengunci ekspor LK. */
      const recon = FIRMFIN.reconciliations({ coa: derivedCoa(), engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Array<{ key: string; status: string }>;
      expect(recon.find((x) => x.key === 'cash')?.status).toBe('open');
    });
  });
});
