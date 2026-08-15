/* ============================================================
   FIRMFIN membaca BUKU BESAR, bukan seed (PRD 2026-08-15).

   `firm_ledger.ts` sudah benar sejak Program E (#234) — tetapi hanya dipakai
   `view_firmgl`. FIRMFIN membaca `coaOf(ctx) = ctx.coa || AMS.FIRM_COA`, dan tak
   ada satu pun pemanggil yang mengirim `ctx.coa`. Akibatnya memposting `JV-0307`
   (akrual PPh 21 Rp 210 jt) membuat buku besar menyatakan laba bersih 2.800 →
   2.590 jt sementara Firm Finance tetap 2.800 jt: DUA angka laba untuk satu firma.

   Yang dipaku di sini adalah kontrak lapisannya — FIRMFIN dengan `ctx.coa`
   turunan-ledger harus bergerak bersama buku besar, DUA ARAH, dan tetap nol-delta
   pada seed bersih. Uji hook React-nya sendiri tak perlu: hook itu hanya merakit
   `currentBalances()` (sudah diuji `firm_ledger.test.ts`) menjadi ctx.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { currentBalances, statements } from './firm_ledger';
import type { CoaAccount, GlJournal } from './firm_ledger';

const seedCoa = () => AMS.FIRM_COA as unknown as CoaAccount[];
const seedGl = () => AMS.FIRM_GL as unknown as GlJournal[];

/** Meniru `useFirmCoa()`: COA dengan saldo turunan jurnal terposting. */
const derivedCoa = (gl: GlJournal[]): CoaAccount[] => {
  const bal = currentBalances(seedCoa(), seedGl(), gl);
  return seedCoa().map(a => ({ ...a, bal: bal[a.code] }));
};

const ctxWith = (gl: GlJournal[]) =>
  ({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS, coa: derivedCoa(gl) });

/** Jurnal berjalan dengan JV-0307 (akrual PPh 21 Rp 210 jt) diposting. */
const glPosted = () => seedGl().map(j => j.id === 'JV-0307' ? { ...j, posted: true } : j);

type Pl = { revenue: number; opProfit: number; directCost: number };
const pl = (gl: GlJournal[]) => FIRMFIN.pl(ctxWith(gl)) as unknown as Pl;

describe('SC-5 — nol-delta pada seed bersih', () => {
  it('gl == seedGl → saldo turunan IDENTIK dengan seed (tak ada angka yang bergerak)', () => {
    /* Ini yang membuat arc ini aman: opening = seed − efek(seedGl), current =
       opening + efek(gl); saat keduanya sama, current == seed secara aljabar. */
    for (const a of derivedCoa(seedGl())) {
      const asli = seedCoa().find(x => x.code === a.code) as CoaAccount;
      expect(a.bal, a.code).toBe(asli.bal);
    }
  });

  it('FIRMFIN.pl dengan ctx ber-COA = FIRMFIN.pl tanpa ctx, pada keadaan boot', () => {
    const tanpaCoa = FIRMFIN.pl({ engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS }) as unknown as Pl;
    expect(pl(seedGl()).opProfit).toBe(tanpaCoa.opProfit);
  });
});

describe('SC-2 — memposting jurnal menggeser figur Firm Finance', () => {
  it('laba operasi turun persis sebesar jurnal yang diposting', () => {
    const sebelum = pl(seedGl()).opProfit;
    const sesudah = pl(glPosted()).opProfit;
    expect(sebelum - sesudah).toBe(210_000_000);
  });

  it('beban langsung staf naik sebesar jurnal (akun 5-100 yang didebit)', () => {
    expect(pl(glPosted()).directCost - pl(seedGl()).directCost).toBe(210_000_000);
  });

  it('DULU: tanpa `ctx.coa`, angka yang sama TIDAK bergerak sama sekali', () => {
    /* Memaku cacatnya sendiri supaya regresinya terlihat bila seseorang mencabut
       penyaluran `coa` dari salah satu pemanggil. */
    const tanpa = { engagements: AMS.ENGAGEMENTS, clients: AMS.CLIENTS };
    const a = (FIRMFIN.pl(tanpa) as unknown as Pl).opProfit;
    // ctx tanpa coa mengabaikan jurnal apa pun — itulah jalur seed yang ditinggalkan
    expect(a).toBe(pl(seedGl()).opProfit);
    expect(a).not.toBe(pl(glPosted()).opProfit);
  });
});

describe('SC-6 — dua arah, bukan sekali jalan', () => {
  it('membatalkan posting mengembalikan angka semula', () => {
    const naik = pl(glPosted()).opProfit;
    const balik = pl(glPosted().map(j => j.id === 'JV-0307' ? { ...j, posted: false } : j)).opProfit;
    expect(balik).not.toBe(naik);
    expect(balik).toBe(pl(seedGl()).opProfit);
  });

  it('membatalkan jurnal yang SUDAH terposting sejak seed juga menggeser angka', () => {
    /* JV-0309 mengakui pendapatan Rp 555 jt (dr 1-200 / cr 4-100). Membatalkannya
       harus menurunkan pendapatan — membuktikan jangkar saldo awal bekerja. */
    const off = seedGl().map(j => j.id === 'JV-0309' ? { ...j, posted: false } : j);
    expect(pl(seedGl()).revenue - pl(off).revenue).toBe(555_000_000);
  });
});

describe('SC-3 — akun kontrol ikut bergerak, dan rekonsiliasi meresponsnya', () => {
  /** Jurnal buatan yang menggeser kontrol WIP 1-300 tanpa menyentuh sub-buku. */
  const glWip = (): GlJournal[] => [
    ...seedGl(),
    { id: 'JV-TEST-WIP', dr: '1-300', cr: '4-100', amount: 400_000_000, posted: true },
  ];

  it('kontrol 1-300 naik → glResidual WIP ikut naik (sub-buku tak bergerak)', () => {
    type W = { control: number; glResidual: number; reconciles: boolean };
    const a = FIRMFIN.wip(ctxWith(seedGl())) as unknown as W;
    const b = FIRMFIN.wip(ctxWith(glWip())) as unknown as W;
    expect(b.control - a.control).toBe(400_000_000);
    expect(b.glResidual - a.glResidual).toBe(400_000_000);
    expect(a.reconciles).toBe(true);
    expect(b.reconciles).toBe(false);   // jurnal tanpa pasangan sub-buku = selisih nyata
  });

  it('baris rekonsiliasi WIP jadi `open` — bukan diserap diam-diam', () => {
    type R = { key: string; status: string };
    const rows = FIRMFIN.reconciliations(ctxWith(glWip())) as unknown as R[];
    expect((rows.find(r => r.key === 'wip') as R).status).toBe('open');
  });
});

describe('SC-4 — Firm GL & Firm Finance sepakat', () => {
  it('laba bersih buku besar bergerak sejalan dengan laba operasi FIRMFIN', () => {
    const stA = statements(seedCoa(), seedGl(), seedGl());
    const stB = statements(seedCoa(), seedGl(), glPosted());
    const deltaLedger = stA.netProfit - stB.netProfit;
    const deltaFirmfin = pl(seedGl()).opProfit - pl(glPosted()).opProfit;
    expect(deltaLedger).toBe(deltaFirmfin);
  });
});
