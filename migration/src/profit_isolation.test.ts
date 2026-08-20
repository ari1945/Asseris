/* ============================================================
   Profitabilitas — isolasi perikatan & realisasi fee yang bukan karangan

   Dua cacat dari satu keputusan yang sama: menuliskan identitas SATU perikatan
   ke dalam kode yang melayani SELURUH portofolio.

     PF1  extraHours = { 'ENG-…-014': max(0, loggedHours − seedLogged) }
          `loggedHours` menjumlahkan timesheet perikatan AKTIF (useServerState
          scope 'engagement'), tetapi deltanya SELALU dikreditkan ke perikatan
          demo. Mengisi jam pada perikatan mana pun menggelembungkan ekonomi
          perikatan demo di laporan profitabilitas — dan mengecilkan perikatan
          yang jamnya benar-benar diisi. Sekelas TB1: fallback ke id entitas
          literal = kebocoran isolasi yang tidak berbunyi.

     PF2  REALIZATION = { 'ENG-…-014': 0.91, … } — tabel realisasi fee beku di
          dalam view, plus cadangan `|| 0.9` yang MENGARANG tarif untuk
          perikatan yang tak ada di tabel. Perikatan baru tidak menghasilkan
          keadaan kosong; ia menghasilkan angka yang tampak seperti fakta.

   Oracle di berkas ini INDEPENDEN dari implementasi: jadwal, klien, perikatan
   dan tarif realisasi dibangun di sini lalu disuntikkan, sehingga lebih dari
   satu perikatan dapat diuji tanpa menambah data seed.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  pmExtraHours, pmRows, pmTotals, pmPartners, pmBlendedRate, pmRealizationOf,
  type PMTimeEntry, type PMEngagement, type PMClient, type PMScheduleRow, type PMRealizationOf,
} from './profit_model';

/* id dirakit dari potongan agar gerbang sumber di bawah tetap bermakna */
const DEMO = 'ENG-' + '2025-014';
const LAIN = 'ENG-' + '2025-031';
const BARU = 'ENG-' + '2099-001';

const seedEntries = (): PMTimeEntry[] =>
  (AMS as unknown as { TIME_ENTRIES: PMTimeEntry[] }).TIME_ENTRIES.map((t) => ({ ...t }));
const seedTotal = (): number => seedEntries().reduce((s, t) => s + t.hours, 0);
/* Timesheet perikatan `engId` sebagaimana ia dimulai: irisan seed MILIKNYA
   (kosong untuk perikatan selain demo), ditambah jam yang dicatat auditor. */
const liveFor = (engId: string, tambah: number): PMTimeEntry[] => [
  ...seedEntries().filter((t) => t.engagementId === engId),
  { hours: tambah } as PMTimeEntry,
];

/* ---- portofolio sintetis: dua perikatan, dua partner, satu tanpa jadwal ---- */
const ENGS: readonly PMEngagement[] = [
  { id: DEMO, clientId: 'C-A', partner: 'Hartono Wijaya, CPA', actualHrs: 1000, budgetHrs: 1840 },
  { id: LAIN, clientId: 'C-B', partner: 'Sari Dewanti, CPA', actualHrs: 500, budgetHrs: 1480 },
];
const CLIS: readonly PMClient[] = [
  { id: 'C-A', name: 'PT Alpha Tbk', fee: 1_000_000_000 },
  { id: 'C-B', name: 'PT Beta', fee: 800_000_000 },
];
const SCHED: readonly PMScheduleRow[] = [
  { role: 'Senior', alloc: [{ eng: DEMO, hrs: 40 }, { eng: LAIN, hrs: 20 }] },
];
const REAL: Readonly<Record<string, number>> = { [DEMO]: 0.9, [LAIN]: 0.8 };
const realOf: PMRealizationOf = (id) => (id in REAL ? REAL[id] : null);
const rowsOf = (extra?: Readonly<Record<string, number>>, engs: readonly PMEngagement[] = ENGS) =>
  pmRows({ engagements: engs, clients: CLIS, schedule: SCHED, realizationOf: realOf, extraHours: extra });
const byId = (id: string, extra?: Readonly<Record<string, number>>) => {
  const r = rowsOf(extra).find((x) => x.id === id);
  if (!r) throw new Error('baris tak ada: ' + id);
  return r;
};

/* ============================================================
   a · PF1 — jam timesheet masuk ke perikatan AKTIF
   ============================================================ */
describe('PF1 — delta jam timesheet milik perikatan aktif', () => {
  it('dikreditkan ke perikatan aktif, bukan ke id yang dipaku', () => {
    expect(pmExtraHours(liveFor(LAIN, 12), seedEntries(), LAIN)).toEqual({ [LAIN]: 12 });
  });

  it('perikatan LAIN tidak ikut menerima jam itu', () => {
    const extra = pmExtraHours(liveFor(LAIN, 12), seedEntries(), LAIN);
    expect(Object.keys(extra)).toEqual([LAIN]);
    expect(extra[DEMO]).toBeUndefined();
  });

  it('anti-tautologi — ketika perikatan demo yang aktif, ia MEMANG dikredit', () => {
    expect(pmExtraHours(liveFor(DEMO, 12), seedEntries(), DEMO)).toEqual({ [DEMO]: 12 });
  });

  it('tanpa perikatan aktif tak ada yang dikredit — bukan menebak', () => {
    expect(pmExtraHours(liveFor(LAIN, 12), seedEntries(), null)).toEqual({});
    expect(pmExtraHours(liveFor(LAIN, 12), seedEntries(), undefined)).toEqual({});
  });

  it('timesheet sama dengan baseline perikatan itu → delta nol', () => {
    expect(pmExtraHours(seedEntries(), seedEntries(), DEMO)).toEqual({ [DEMO]: 0 });
    expect(pmExtraHours([], seedEntries(), LAIN)).toEqual({ [LAIN]: 0 });
    expect(seedTotal()).toBeGreaterThan(0);   /* premis: seed memang berisi */
  });

  it('jam perikatan aktif naik; jam perikatan lain TIDAK bergerak', () => {
    const extra = pmExtraHours(liveFor(LAIN, 12), seedEntries(), LAIN);
    expect(byId(LAIN, extra).hours).toBe(512);
    expect(byId(DEMO, extra).hours).toBe(1000);
  });

  it('biaya standar ikut naik hanya di perikatan yang jamnya diisi', () => {
    const extra = pmExtraHours(liveFor(LAIN, 12), seedEntries(), LAIN);
    expect(byId(LAIN, extra).stdCost).toBeGreaterThan(byId(LAIN).stdCost);
    expect(byId(DEMO, extra).stdCost).toBe(byId(DEMO).stdCost);
  });
});

/* ============================================================
   b · PF2 — realisasi fee: disuntik, tak pernah dikarang
   ============================================================ */
describe('PF2 — realisasi fee bukan literal beku di view', () => {
  it('mengikuti tarif yang disuntikkan (bukan tabel di dalam modul)', () => {
    expect(byId(DEMO).realized).toBe(0.9);
    expect(byId(LAIN).realized).toBe(0.8);
  });

  it('mengubah tarif suntikan mengubah hasil — bukan angka beku', () => {
    const naik: PMRealizationOf = (id) => {
      const v = realOf(id);
      return v === null ? null : v + 0.05;
    };
    const r = pmRows({ engagements: ENGS, clients: CLIS, schedule: SCHED, realizationOf: naik });
    const demo = r.find((x) => x.id === DEMO);
    expect(demo!.realized).toBeCloseTo(0.95, 10);
  });

  it('perikatan tanpa tarif → null di SELURUH turunan, bukan 90% karangan', () => {
    const engs = [...ENGS, { id: BARU, clientId: 'C-A', partner: 'X, CPA', actualHrs: 100, budgetHrs: 200 }];
    const r = rowsOf(undefined, engs).find((x) => x.id === BARU);
    expect(r!.realized).toBeNull();
    expect(r!.billed).toBeNull();
    expect(r!.margin).toBeNull();
    expect(r!.marginPct).toBeNull();
    expect(r!.effRate).toBeNull();
  });

  it('sumber produksi juga menolak mengarang untuk perikatan tak dikenal', () => {
    expect(pmRealizationOf(BARU)).toBeNull();
  });

  it('anti-tautologi — sumber produksi TETAP menjawab utk perikatan seed', () => {
    const jawab = (AMS as unknown as { ENGAGEMENTS: PMEngagement[] }).ENGAGEMENTS
      .map((e) => pmRealizationOf(e.id));
    expect(jawab.every((v) => typeof v === 'number' && v > 0)).toBe(true);
    expect(new Set(jawab).size).toBeGreaterThan(1);
  });

  /* Mengapa realisasi fee TIDAK diturunkan dari FIRMFIN.wip(): ia mengukur hal
     lain. `wip().realization` = recoverable ÷ nilai standar charge-out; di sini
     penyebutnya FEE KONTRAK. Untuk sebagian perikatan std jauh melampaui fee,
     sehingga memakai angka WIP menghasilkan "fee terealisasi" MELEBIHI fee. */
  it('premis: realisasi WIP bukan realisasi fee — bila dipakai, fee terlampaui', () => {
    const A = AMS as unknown as { ENGAGEMENTS: PMEngagement[]; CLIENTS: PMClient[] };
    const W = FIRMFIN.wip({ engagements: A.ENGAGEMENTS, clients: A.CLIENTS }) as {
      registerAll: { id: string; realization: number }[];
    };
    const lampaui = W.registerAll.filter((w) => w.realization > 1).map((w) => w.id);
    expect(lampaui.length).toBeGreaterThan(0);
  });
});

/* ============================================================
   c · Total & agregat partner tidak menjumlahkan yang tak diketahui
   ============================================================ */
describe('PF3 — total jujur', () => {
  const engs: readonly PMEngagement[] = [
    ...ENGS, { id: BARU, clientId: 'C-A', partner: 'X, CPA', actualHrs: 100, budgetHrs: 200 },
  ];

  it('perikatan tanpa realisasi dilaporkan, bukan dihitung sebagai nol', () => {
    const t = pmTotals(rowsOf(undefined, engs));
    expect(t.incomplete).toEqual([BARU]);
    expect(t.counted).toBe(2);
  });

  it('total terealisasi = jumlah baris yang lengkap saja', () => {
    const t = pmTotals(rowsOf(undefined, engs));
    expect(t.billed).toBe(1_000_000_000 * 0.9 + 800_000_000 * 0.8);
    expect(t.fee).toBe(1_800_000_000);
  });

  it('rata-rata realisasi memakai penyebut baris lengkap', () => {
    const t = pmTotals(rowsOf(undefined, engs));
    expect(t.avgRealizedPct).toBeCloseTo(85, 10);
  });

  it('agregat partner tidak menyerap baris tak lengkap', () => {
    const p = pmPartners(rowsOf(undefined, engs)).find((x) => x.partner === 'X');
    expect(p).toBeUndefined();
  });
});

/* ============================================================
   d · Tarif blended tetap dari SSOT FIRMFIN (nol-delta)
   ============================================================ */
describe('tarif blended', () => {
  it('memakai staffing aktual bila perikatan ada di jadwal', () => {
    expect(pmBlendedRate(SCHED, DEMO).source).toBe('staffing aktual');
  });
  it('jatuh ke mix standar bila tak ada jadwal — dan menyebutnya', () => {
    expect(pmBlendedRate(SCHED, BARU).source).toBe('mix standar');
  });
});

/* ============================================================
   e · Gerbang sumber — nol identitas perikatan yang dipaku
   ============================================================ */
describe('gerbang sumber', () => {
  const berkas = ['view_profit.tsx', 'profit_model.ts'];
  /* kode saja: komentar boleh MENYEBUT id lama sebagai catatan sejarah */
  const kode = (f: string): string =>
    readFileSync(join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
  const idLiteral = /['"]ENG-[\w-]+['"]/g;

  berkas.forEach((f) => {
    it(f + ' — nol literal id perikatan', () => {
      const hit = [...kode(f).matchAll(idLiteral)].map((m) => m[0]);
      expect(hit, 'id perikatan dipaku: ' + hit.join(' | ')).toEqual([]);
    });
  });

  it('view tidak lagi menyimpan tabel realisasi/tarif tingkat-modul', () => {
    const jsx = kode('view_profit.tsx');
    expect(jsx).not.toMatch(/REALIZATION/);
    expect(jsx).not.toMatch(/RATE_CARD|DEFAULT_MIX/);
    /* Yang dilarang adalah view MEMBACA FIRMFIN — maka jalur impornya yang
       digerbang, bukan tokennya. Menggerbang token akan lolos oleh
       `import * as FF from './data_firmfin'`, dan sebaliknya melarang view
       MENYEBUT sumber angka pada keterangan provenance — padahal itu justru
       pola rumah (cockpit_report.ts menulis "… (FIRMFIN.WIP_BILL)"). */
    expect(jsx).not.toMatch(/from '\.\/data_firmfin'/);
  });

  it('gerbang impor FIRMFIN bisa merah (anti-tautologi)', () => {
    expect("import { FIRMFIN } from './data_firmfin';").toMatch(/from '\.\/data_firmfin'/);
    expect(kode('profit_model.ts')).toMatch(/from '\.\/data_firmfin'/);
  });

  /* `(REALIZATION as any)[e.id] || 0.9` — cadangan pecahan yang mengarang tarif.
     Regex sengaja umum (`|| 0.x` / `?? 0.x` apa pun) supaya kelasnya tertutup,
     bukan hanya satu ejaan; hari ini kedua berkas memang tak memuatnya. */
  it('tak ada cadangan pecahan yang dikarang di mana pun', () => {
    berkas.forEach((f) => {
      const hit = [...kode(f).matchAll(/(\|\||\?\?)\s*0?\.\d+/g)].map((m) => m[0]);
      expect(hit, f + ' memuat cadangan: ' + hit.join(' | ')).toEqual([]);
    });
  });

  it('gerbang cadangan bisa merah (anti-tautologi)', () => {
    const palsu = 'const r = TABEL[id] || 0.9;';
    expect([...palsu.matchAll(/(\|\||\?\?)\s*0?\.\d+/g)].length).toBe(1);
  });

  it('gerbang ini benar-benar bisa merah (anti-tautologi)', () => {
    const palsu = 'const x = "ENG-2025-014";';
    expect([...palsu.matchAll(idLiteral)].length).toBe(1);
  });
});
