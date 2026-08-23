/* ============================================================
   Time & Budget — nilai kontrak & penagihan (TB5–TB6)

   Dua angka karangan terakhir di modul `time`, dilaporkan §12 PRD metode
   masukan PSAK 72 (#278) dan sengaja tidak dikerjakan di sana:

     TB5  `TB_FEE_FALLBACK = 1_520_000_000` — fee karangan untuk perikatan yang
          kliennya tak ber-fee, dipakai lewat `?.fee || TB_FEE_FALLBACK`. Kelas
          cacat yang sama dengan `materialitas × 0,4` (#277). Cacatnya DORMAN:
          kedelapan klien seed ber-fee, jadi TIDAK ADA uji nilai atas seed yang
          dapat menangkapnya — berkas ini karena itu MEMBANGUN keadaan
          pemicunya, dan membuktikan dulu bahwa seed memang tak bisa.
          Operatornya (`||`, bukan `??`) menambah cacat kedua: fee 0 — perikatan
          pro bono — ikut jatuh ke fallback.

     TB6  Panel "Penagihan & WIP" menyintesis penagihan dari fee: ditagih dan
          sisa kontrak = `fee × 0,5`, "Termin ke-3" = `fee × 0,3`. Cacat ini
          TIDAK dorman — pada seed hari ini perikatan demo sudah menerbitkan
          dua faktur senilai 1.480 jt terhadap fee 1.850 jt — dan register
          faktur nyata sudah berpintu tunggal sejak #275.

   ORACLE INDEPENDEN: angka pembanding dirakit di berkas ini dari register
   seed (Σ nilai faktur, Σ dikurangi lunas), bukan dipanggil dari fungsi yang
   sedang diuji.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  contractValueOf, hoursOfEngagements, progressOf, recognitionSchedule,
  type RevClient, type RevEngagement, type RevInvoice,
} from './revenue_psak72';
import {
  tbModel, tbBilling,
  type TBClient, type TBEngagement, type TBInvoice, type TBTimeEntry, type TBWip, type TBWipOf,
} from './timebudget_model';

const DEMO = 'ENG-' + '2025-014';   /* dirakit agar gerbang sumber tetap bermakna */

const entries = (): TBTimeEntry[] =>
  ((AMS as unknown as { TIME_ENTRIES: TBTimeEntry[] }).TIME_ENTRIES).map((t) => ({ ...t }));
const engagements = (): TBEngagement[] =>
  (AMS as unknown as { ENGAGEMENTS: TBEngagement[] }).ENGAGEMENTS;
const clients = (): TBClient[] => (AMS as unknown as { CLIENTS: TBClient[] }).CLIENTS;
const invoices = (): TBInvoice[] =>
  ((AMS as unknown as { INVOICES: TBInvoice[] }).INVOICES).map((i) => ({ ...i }));
const engById = (id: string): TBEngagement => {
  const e = engagements().find((x) => x.id === id);
  if (!e) throw new Error('perikatan tak ada di seed: ' + id);
  return e;
};
const seedWipOf: TBWipOf = (live, engId) =>
  FIRMFIN.engagementWip(live, engId) as unknown as TBWip | null;
const modelOf = (e: TBEngagement, cs: readonly TBClient[]) =>
  tbModel(entries(), e, cs, seedWipOf);

/* Oracle KEMAJUAN — sesudah #278 pengakuan tak lagi memakai `e.progress`
   melainkan metode masukan berpagar. Oracle di sini memanggil kanonnya dengan
   jam yang dirakit dari roster perikatan itu sendiri, bukan menyalin rumusnya. */
const recogPctOf = (e: TBEngagement): number | null => {
  const w = seedWipOf(entries(), e.id);
  return progressOf(
    { id: e.id, clientId: e.clientId || '', status: (e as { status?: string }).status },
    w ? { actualHrs: w.actualHrs, budgetHrs: w.budgetHrs } : null,
  ).pct;
};

/* ============================================================
   a · TB5 — nilai kontrak tak boleh dikarang
   ============================================================ */
describe('TB5 — nilai kontrak perikatan', () => {
  /* Premis yang menjelaskan MENGAPA uji di bawah harus membangun keadaannya
     sendiri. Kalau suatu hari seed memuat klien tanpa fee, baris ini merah dan
     yang harus diperbarui adalah PREMISNYA, bukan sifat yang dijaga. */
  it('premis: cacatnya DORMAN — setiap klien seed ber-fee', () => {
    const tanpaFee = clients().filter((c) => contractValueOf(c) == null).map((c) => c.id);
    expect(tanpaFee, 'klien seed tanpa fee: ' + tanpaFee.join(' | ')).toEqual([]);
    const yatim = engagements()
      .filter((e) => !clients().some((c) => c.id === e.clientId))
      .map((e) => e.id);
    expect(yatim, 'perikatan seed tanpa klien: ' + yatim.join(' | ')).toEqual([]);
  });

  it('nol-delta: perikatan demo tetap memakai fee kliennya', () => {
    const m = modelOf(engById(DEMO), clients());
    expect(m).not.toBeNull();
    const c = clients().find((x) => x.id === engById(DEMO).clientId);
    expect(m!.fee).toBe(contractValueOf(c));
    expect(m!.feeGap).toBeNull();
    /* Pengakuan mengikuti kanon #278 (metode masukan), dan fee-nya nyata. */
    const pct = recogPctOf(engById(DEMO));
    expect(pct).not.toBeNull();
    expect(m!.recogPct).toBe(pct);
    expect(m!.revRecognized).toBe(Math.round(m!.fee! * pct!));
  });

  /* KEADAAN PEMICU — perikatan yang PUNYA roster (jadi modelnya tetap lahir)
     tetapi kliennya tak ada di register. Di sinilah fallback dulu bekerja. */
  it('klien tak ditemukan → seluruh besaran rupiah null, bukan fee karangan', () => {
    const e = { ...engById(DEMO), clientId: 'C-TIDAK-ADA' };
    const m = modelOf(e, clients());
    expect(m).not.toBeNull();
    expect(m!.fee).toBeNull();
    expect(m!.revRecognized).toBeNull();
    expect(m!.marginNow).toBeNull();
    expect(m!.marginCompletion).toBeNull();
    expect(m!.realization).toBeNull();
    expect(m!.feeGap).toBe('contract-unknown');
    /* Yang TIDAK ikut hilang: jam & biaya waktu memang terukur. */
    expect(m!.actualTotal).toBeGreaterThan(0);
    expect(m!.costActual).toBeGreaterThan(0);
    expect(m!.stdValue).toBeGreaterThan(0);
  });

  it('klien ada tetapi tak ber-fee → null (bukan 1.520 jt, bukan nol)', () => {
    const e = engById(DEMO);
    ([undefined, null, Number.NaN, -1] as (number | null | undefined)[]).forEach((fee) => {
      const m = modelOf(e, [{ id: e.clientId as string, fee }]);
      expect(m!.fee, 'fee=' + String(fee)).toBeNull();
      expect(m!.feeGap, 'fee=' + String(fee)).toBe('contract-unknown');
    });
  });

  /* Cacat kedua TB5: `||` menelan 0. Fee nol adalah PERNYATAAN (pro bono),
     bukan ketiadaan — dan hasilnya margin negatif sebesar biayanya. */
  it('fee 0 (pro bono) bertahan sebagai 0 — inilah yang ditelan operator ||', () => {
    const e = engById(DEMO);
    const m = modelOf(e, [{ id: e.clientId as string, fee: 0 }])!;
    expect(m.fee).toBe(0);
    expect(m.feeGap).toBeNull();
    expect(m.recogPct, 'premis: kemajuan perikatan demo TERUKUR').not.toBeNull();
    expect(m.revRecognized).toBe(0);
    expect(m.marginNow).toBe(-m.costActual);
    expect(m.marginCompletion).toBe(-m.costBudget);
    expect(m.realization).toBe(0);
    /* Anti-tautologi: kalau fallback masih hidup, angka-angka di atas akan
       sama dengan yang dihasilkan fee 1.520 jt. Buktikan keduanya BERBEDA. */
    const palsu = modelOf(e, [{ id: e.clientId as string, fee: 1_520_000_000 }])!;
    expect(palsu.marginCompletion).not.toBe(m.marginCompletion);
  });

  /* Sesudah #278 `revRecognized` sudah boleh null karena KEMAJUAN tak terukur.
     TB5 menambah sebab kedua: NILAI KONTRAK tak ditetapkan. Keduanya harus
     dapat dibedakan di model, kalau tidak layar tak bisa menyebut yang mana. */
  it('lubang kontrak dan lubang kemajuan adalah dua keadaan yang berbeda', () => {
    const e = engById(DEMO);
    const tanpaKontrak = modelOf({ ...e, clientId: 'C-TIDAK-ADA' }, clients())!;
    expect(tanpaKontrak.feeGap).toBe('contract-unknown');
    expect(tanpaKontrak.recogPct, 'kemajuannya justru terukur').not.toBeNull();

    /* roster tanpa anggaran jam → kemajuan tak terukur, kontraknya ada */
    const tanpaKemajuan = tbModel(entries(), e, clients(), () => ({
      roster: [], actualHrs: 0, budgetHrs: 0, stdValue: 0, costValue: 0,
    }))!;
    expect(tanpaKemajuan.feeGap).toBeNull();
    expect(tanpaKemajuan.fee).not.toBeNull();
    expect(tanpaKemajuan.recogPct).toBeNull();
    expect(tanpaKemajuan.revRecognized).toBeNull();
  });

  it('realisasi null ketika nilai standar anggaran nol — bukan 0%', () => {
    const kosong: TBWipOf = () => ({
      roster: [], actualHrs: 0, budgetHrs: 0, stdValue: 0, costValue: 0,
    });
    const m = tbModel(entries(), engById(DEMO), clients(), kosong)!;
    expect(m.stdValueBudget).toBe(0);
    expect(m.realization).toBeNull();
  });
});

/* ============================================================
   b · TB6 — penagihan dari register faktur
   ============================================================ */
describe('TB6 — penagihan perikatan', () => {
  /* Oracle independen: dirakit dari register seed di sini. */
  const seedDemo = () => invoices().filter((i) => i.eng === DEMO);
  const sigma = (xs: TBInvoice[], pick: (i: TBInvoice) => number): number =>
    xs.reduce((s, i) => s + pick(i), 0);

  it('premis: register seed memuat >1 faktur untuk perikatan demo', () => {
    expect(seedDemo().length).toBeGreaterThan(1);
    expect(seedDemo().every((i) => i.status !== 'Draft')).toBe(true);
  });

  it('tertagih = Σ nilai faktur terbit perikatan itu — bukan pecahan fee', () => {
    const m = modelOf(engById(DEMO), clients())!;
    const b = tbBilling(invoices(), DEMO, m.fee, m.revRecognized);
    const oracle = sigma(seedDemo(), (i) => i.amount || 0);
    expect(b.billed).toBe(oracle);
    expect(b.issued).toBe(seedDemo().length);
    /* Falsifikasi rumus lama, dan ia TIDAK dorman: angkanya berselisih hari ini. */
    expect(b.billed, 'fee × 0,5 masih sama dengan register — premis uji runtuh')
      .not.toBe(m.fee! * 0.5);
    expect(b.remainingContract).toBe(m.fee! - oracle);
    expect(b.remainingContract).not.toBe(m.fee! * 0.5);
  });

  /* Panel lama hanya punya "WIP belum ditagih" berlantai nol. Pada seed,
     perikatan demo menagih DI MUKA — liabilitas kontraknya hilang tanpa suara. */
  it('menagih di muka melahirkan liabilitas kontrak, bukan diam-diam nol', () => {
    const m = modelOf(engById(DEMO), clients())!;
    const b = tbBilling(invoices(), DEMO, m.fee, m.revRecognized);
    expect(b.billed).toBeGreaterThan(m.revRecognized!);
    expect(b.contractAsset).toBe(0);
    expect(b.contractLiab).toBe(b.billed - m.revRecognized!);
    expect(b.contractLiab).toBeGreaterThan(0);
  });

  it('aset kontrak muncul ketika pengakuan melampaui tagihan', () => {
    const m = modelOf(engById(DEMO), clients())!;
    const satu = invoices().filter((i) => i.eng !== DEMO)
      .concat([{ id: 'INV-UJI', eng: DEMO, status: 'Sent', amount: 100_000_000, paid: 0, due: '2026-04-30' }]);
    const b = tbBilling(satu, DEMO, m.fee, m.revRecognized);
    expect(b.billed).toBe(100_000_000);
    expect(b.contractAsset).toBe(m.revRecognized! - 100_000_000);
    expect(b.contractLiab).toBe(0);
  });

  it('faktur perikatan LAIN tidak ikut terhitung', () => {
    const lain = invoices().filter((i) => i.eng !== DEMO);
    expect(lain.length).toBeGreaterThan(0);
    const b = tbBilling(lain, DEMO, 1_000_000_000, 0);
    expect(b.billed).toBe(0);
    expect(b.issued).toBe(0);
    expect(b.nextDue).toBeNull();
    expect(b.remainingContract).toBe(1_000_000_000);
  });

  it('faktur draf tak menagih apa pun, tetapi dilaporkan sebagai draf', () => {
    const reg: TBInvoice[] = [
      { id: 'INV-D', eng: DEMO, status: 'Draft', amount: 900_000_000, paid: 0, due: '2026-04-01' },
      { id: 'INV-S', eng: DEMO, status: 'Sent', amount: 100_000_000, paid: 0, due: '2026-04-02' },
    ];
    const b = tbBilling(reg, DEMO, 1_000_000_000, 500_000_000);
    expect(b.billed).toBe(100_000_000);
    expect(b.issued).toBe(1);
    expect(b.drafts).toBe(1);
    expect(b.nextDue!.id).toBe('INV-S');
  });

  it('jatuh tempo terdekat = faktur terbit belum lunas, dari tanggal MILIKNYA', () => {
    const m = modelOf(engById(DEMO), clients())!;
    const b = tbBilling(invoices(), DEMO, m.fee, m.revRecognized);
    const oracle = seedDemo()
      .filter((i) => (i.amount || 0) - (i.paid || 0) > 0)
      .sort((a, c) => String(a.due).localeCompare(String(c.due)))[0];
    expect(b.nextDue).not.toBeNull();
    expect(b.nextDue!.id).toBe(oracle.id);
    expect(b.nextDue!.due).toBe(oracle.due);
    expect(b.nextDue!.outstanding).toBe((oracle.amount || 0) - (oracle.paid || 0));
  });

  it('seluruh faktur lunas → tak ada jatuh tempo, dan itu bukan "belum ada faktur"', () => {
    const reg = seedDemo().map((i) => ({ ...i, paid: i.amount, status: 'Paid' }));
    const b = tbBilling(reg, DEMO, 1_850_000_000, 1_147_000_000);
    expect(b.nextDue).toBeNull();
    expect(b.issued).toBe(reg.length);
    expect(b.drafts).toBe(0);
  });

  it('nilai kontrak / pengakuan yang tak terukur diteruskan sebagai null', () => {
    const b = tbBilling(invoices(), DEMO, null, null);
    expect(b.billed).toBeGreaterThan(0);       // fakta register tetap terukur
    expect(b.remainingContract).toBeNull();
    expect(b.contractAsset).toBeNull();
    expect(b.contractLiab).toBeNull();
  });

  /* Aturan "apa yang dihitung tertagih" hidup di SATU tempat. Kalau salah satu
     modul menambah/mengurangi status yang dihitung, dua layar akan melaporkan
     tertagih yang berbeda untuk perikatan yang sama — baris ini menangkapnya. */
  it('tertagih menutup EKSAK ke skedul pendapatan PSAK 72, tiap perikatan', () => {
    const engs = engagements() as unknown as RevEngagement[];
    const sched = recognitionSchedule({
      engagements: engs,
      clients: clients() as unknown as RevClient[],
      invoices: invoices() as unknown as RevInvoice[],
      hoursOf: hoursOfEngagements(engs as unknown as { id: string }[]),
    });
    expect(sched.rows.length).toBeGreaterThan(1);
    sched.rows.forEach((r) => {
      const b = tbBilling(invoices(), r.id, r.contract, r.recognized);
      expect(b.billed, r.id).toBe(r.billed);
      expect(b.contractAsset, r.id).toBe(r.asset);
      expect(b.contractLiab, r.id).toBe(r.liab);
    });
  });
});

/* ============================================================
   c · Gerbang sumber — angka karangan tak boleh tumbuh kembali
   ============================================================ */
describe('gerbang sumber — nilai kontrak & penagihan', () => {
  /* kode saja: komentar boleh MENYEBUT rumus lama sebagai catatan sejarah */
  const kode = (f: string): string =>
    readFileSync(join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it('TB_FEE_FALLBACK tak ada lagi sebagai KODE (komentar sejarah boleh)', () => {
    ['timebudget_model.ts', 'view_timebudget.tsx'].forEach((f) => {
      expect(kode(f), f).not.toMatch(/TB_FEE_FALLBACK/);
    });
  });

  it('model tak memuat literal rupiah — nilai kontrak hanya dari data', () => {
    const rupiah = [...kode('timebudget_model.ts').matchAll(/\d_000_000\b/g)].map((m) => m[0]);
    expect(rupiah, 'literal rupiah: ' + rupiah.join(' | ')).toEqual([]);
  });

  it('nilai kontrak diturunkan LEWAT contractValueOf, sekali saja', () => {
    const src = kode('timebudget_model.ts');
    expect([...src.matchAll(/contractValueOf\(/g)].length).toBe(1);
    /* tak ada fallback yang menempel pada ekspresi fee */
    expect(src).not.toMatch(/fee\s*(\|\||\?\?)/);
  });

  it('view tak lagi menghitung penagihan dari fee', () => {
    const jsx = kode('view_timebudget.tsx');
    expect(jsx, 'aritmetika atas m.fee').not.toMatch(/m\.fee\s*[*/]/);
    expect(jsx, '"Termin ke-N" yang dikarang').not.toMatch(/Termin ke-/);
  });

  it('view membaca klien dari konteks firma, bukan literal seed', () => {
    expect(kode('view_timebudget.tsx')).not.toMatch(/AMS\.CLIENTS/);
  });

  it('gerbang ini benar-benar bisa merah (anti-tautologi)', () => {
    const palsu = 'const f = c?.fee || 1_520_000_000; const x = m.fee * 0.5;';
    expect([...palsu.matchAll(/\d_000_000\b/g)].length).toBe(1);
    expect(palsu).toMatch(/fee\s*(\|\||\?\?)/);
    expect(palsu).toMatch(/m\.fee\s*[*/]/);
  });
});
