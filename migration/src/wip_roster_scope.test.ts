/* ============================================================
   WIP — lingkup roster: satu perikatan, SATU nilai

   `WIP_ENG.cost` (1.950 jt untuk …-014) membantah
   `engagementWip().costValue` (492 jt) — dua angka biaya untuk satu perikatan,
   keduanya di `data_firmfin.ts`. Menelusurinya sampai ke bawah, kontradiksi itu
   ternyata bukan satu melainkan DUA cacat, dan keduanya soal LINGKUP:

     WS1  `useFirmWip` hanya meng-overlay perikatan yang sedang AKTIF. Roster
          …-014 selalu ada, tetapi selama perikatan lain yang dipilih, seluruh
          firma (modul WIP, Dashboard, cockpit, Firm Finance) menampilkan std
          seed 3.200 jt / biaya 1.950 jt; begitu …-014 dipilih, angka yang sama
          menjadi 980 jt / 492 jt. WIP firma bergeser 1.820 jt karena pilihan
          UI yang tak ada hubungannya. Nilai satu perikatan tidak boleh
          bergantung pada perikatan mana yang kebetulan sedang dibuka.

     WS2  `pmRosterOf(timeEntries)` (profit_model, PR #269) memanggil
          `engagementWip(timeEntries, id)` untuk SETIAP perikatan — padahal
          `timeEntries` adalah timesheet perikatan AKTIF saja. Jam yang dicatat
          pada perikatan lain karena itu dikreditkan ke perikatan ber-roster.
          Ini PF1/TB1 yang masuk lewat pintu lain: bukan id literal kali ini,
          melainkan timesheet yang salah pemilik.

   Aturan yang diuji di sini: roster berlaku untuk perikatan yang memilikinya,
   SELALU; jam timesheet live hanya berlaku bagi perikatan yang memilikinya.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { wipLiveByEng, type WipLiveEntry } from './use_firm_wip';
import { pmRosterOf, pmRows, type PMClient, type PMEngagement, type PMScheduleRow, type PMTimeEntry } from './profit_model';

const DEMO = 'ENG-' + '2025-014';
const LAIN = 'ENG-' + '2025-063';
const A = AMS as unknown as {
  ENGAGEMENTS: PMEngagement[]; CLIENTS: PMClient[];
  SCHEDULE: PMScheduleRow[]; TIME_ENTRIES: PMTimeEntry[];
};
const seed = (): PMTimeEntry[] => A.TIME_ENTRIES.map((t) => ({ ...t }));
/* 100 jam atas nama anggota roster …-014, dicatat saat perikatan LAIN aktif */
const jamDiLain = (): PMTimeEntry[] =>
  [...seed(), { member: 'Anindya Pramesti', hours: 100 } as PMTimeEntry];

interface Ew { actualHrs: number; costValue: number; stdValue: number }
const ew = (live: PMTimeEntry[] | []): Ew => {
  const w = FIRMFIN.engagementWip(live, DEMO) as Ew | null;
  if (!w) throw new Error('roster demo hilang dari seed');
  return w;
};

/* ============================================================
   a · WS2 — timesheet perikatan lain tidak boleh menyentuh roster
   ============================================================ */
describe('WS2 — jam perikatan lain tak masuk ke perikatan ber-roster', () => {
  const rows = (live: PMTimeEntry[], aktif: string | null) => pmRows({
    engagements: A.ENGAGEMENTS, clients: A.CLIENTS, schedule: A.SCHEDULE,
    rosterOf: pmRosterOf(live, aktif),
  });
  const biaya = (live: PMTimeEntry[], aktif: string | null): number => {
    const r = rows(live, aktif).find((x) => x.id === DEMO);
    if (!r) throw new Error('baris demo hilang');
    return r.stdCost;
  };

  it('premis: jam itu MEMANG menggerakkan biaya bila perikatannya yang aktif', () => {
    expect(biaya(jamDiLain(), DEMO)).toBeGreaterThan(biaya(seed(), DEMO));
  });

  it('mencatat jam saat perikatan LAIN aktif tidak menggerakkan biaya …-014', () => {
    expect(biaya(jamDiLain(), LAIN)).toBe(biaya(seed(), LAIN));
  });

  it('tanpa perikatan aktif, roster dipakai TANPA jam live', () => {
    expect(biaya(jamDiLain(), null)).toBe(ew([]).costValue);
    expect(biaya(seed(), null)).toBe(ew([]).costValue);
  });

  it('perikatan aktif ber-roster memakai jam live-nya sendiri', () => {
    expect(biaya(seed(), DEMO)).toBe(ew(seed()).costValue);
  });
});

/* ============================================================
   b · WS1 — nilai perikatan tidak bergantung pada apa yang dipilih
   ============================================================ */
describe('WS1 — overlay roster berlaku untuk SEMUA perikatan ber-roster', () => {
  const by = (aktif: string | null, live: PMTimeEntry[] = seed()) =>
    wipLiveByEng(A.ENGAGEMENTS, live, aktif);

  it('perikatan ber-roster ada di overlay meski BUKAN yang aktif', () => {
    const m = by(LAIN);
    expect(m).not.toBeNull();
    expect(m![DEMO]).toBeDefined();
  });

  it('perikatan tanpa roster tidak pernah masuk overlay', () => {
    const m = by(LAIN);
    A.ENGAGEMENTS.filter((e) => e.id !== DEMO)
      .forEach((e) => expect(m![e.id], e.id).toBeUndefined());
  });

  it('nilai …-014 SAMA baik ia aktif maupun tidak — kecuali jam live-nya sendiri', () => {
    expect(by(LAIN)![DEMO].cost).toBe(ew([]).costValue);
    expect(by(null)![DEMO].cost).toBe(ew([]).costValue);
    /* aktif → jam timesheetnya sendiri ikut; itu perubahan yang SAH */
    expect(by(DEMO)![DEMO].cost).toBe(ew(seed()).costValue);
  });

  it('jam yang dicatat di perikatan lain tak menggeser …-014', () => {
    expect(by(LAIN, jamDiLain())![DEMO].cost).toBe(by(LAIN, seed())![DEMO].cost);
  });

  it('WIP firma berhenti bergeser karena pilihan UI', () => {
    const ctx = { engagements: A.ENGAGEMENTS, clients: A.CLIENTS };
    const total = (aktif: string | null): number =>
      (FIRMFIN.wip(ctx, undefined, by(aktif)) as { unbilledTotal: number }).unbilledTotal;
    /* dipilih atau tidak, …-014 dinilai pada roster: selisihnya hanya jam live */
    expect(total(LAIN)).toBe(total(null));
    expect(Math.abs(total(DEMO) - total(LAIN))).toBeLessThan(100_000_000);
  });

  it('anti-tautologi — memakai std seed, selisihnya besar sekali', () => {
    const ctx = { engagements: A.ENGAGEMENTS, clients: A.CLIENTS };
    const tanpa = (FIRMFIN.wip(ctx) as { unbilledTotal: number }).unbilledTotal;
    const dgn = (FIRMFIN.wip(ctx, undefined, by(LAIN)) as { unbilledTotal: number }).unbilledTotal;
    expect(Math.abs(tanpa - dgn)).toBeGreaterThan(1_000_000_000);
  });

  it('rekonsiliasi GL tetap menutup dengan overlay penuh', () => {
    const ctx = { engagements: A.ENGAGEMENTS, clients: A.CLIENTS };
    const m = FIRMFIN.wip(ctx, undefined, by(LAIN)) as { glResidual: number; rollForwardResidual: number; reconciles: boolean };
    expect(m.glResidual).toBe(0);
    expect(m.rollForwardResidual).toBe(0);
    expect(m.reconciles).toBe(true);
  });

  it('bentuk entri overlay tetap {std, cost, actualHrs}', () => {
    const e: WipLiveEntry = by(DEMO)![DEMO];
    expect(Object.keys(e).sort()).toEqual(['actualHrs', 'cost', 'std']);
  });
});
