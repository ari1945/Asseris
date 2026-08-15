/* ============================================================
   Engagement Cockpit — ekonomi perikatan (PR-C-1)

   Cockpit adalah layar yang dibuka partner untuk menjawab "perikatan ini
   sehat atau tidak". Sampai PR ini, jam per anggota di layar itu adalah
   total perikatan yang DIBAGI ULANG dengan array bobot literal:

       CKP_TEAM_W = [0.071, 0.196, 0.261, 0.179, 0.152, 0.141]

   Bobotnya berjumlah 1, jadi TOTALNYA selalu menutup — dan itulah yang
   membuat cacat ini lolos. Setiap barisnya salah. Berkas uji ini memaku
   koreksinya dengan oracle yang INDEPENDEN dari implementasi: jam per
   anggota dihitung tangan dari seed (`WIP_ROSTER_ENG.base` + `TIME_ENTRIES`),
   bukan dibandingkan dengan fungsi yang sedang diuji.

   Rujukan: PRD - Engagement Cockpit Terukur, §1.2 §1.3 §1.4, kriteria
   S1 · S2 · S6 · S7.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  cockpitEconomics, gradeOf, LEGACY_TEAM_WEIGHTS,
  type CockpitEconomicsInput, type CockpitWip, type CockpitFirmMember,
  type CockpitWpRow, type CockpitProcRow,
} from './cockpit_model';

const ENG = 'ENG-2025-014';
const FEE_C014 = 1_850_000_000;

interface TimeEntry { id: string; member: string; date: string; phase: string; task: string; hours: number }

const seedEntries = (): TimeEntry[] => (AMS as unknown as { TIME_ENTRIES: TimeEntry[] }).TIME_ENTRIES;
const firmTeam = (): CockpitFirmMember[] => (AMS as unknown as { TEAM: CockpitFirmMember[] }).TEAM;
const workpapers = (): CockpitWpRow[] => (AMS as unknown as { WORKPAPERS: CockpitWpRow[] }).WORKPAPERS;

const wipFor = (entries: TimeEntry[], engId: string): CockpitWip | null =>
  FIRMFIN.engagementWip(entries, engId) as unknown as CockpitWip | null;

const model = (entries: TimeEntry[], engId: string, over?: Partial<CockpitEconomicsInput>) =>
  cockpitEconomics({
    ew: wipFor(entries, engId),
    fallbackBudgetHrs: 1840,
    fallbackActualHrs: 1146,
    fee: FEE_C014,
    firmTeam: firmTeam(),
    workpapers: workpapers(),
    procs: [],
    ...over,
  });

/* ------------------------------------------------------------------
   ORACLE INDEPENDEN — dihitung tangan dari seed, bukan dari kode:
     jam aktual = WIP_ROSTER_ENG.base + Σ TIME_ENTRIES anggota itu
   base:  Hartono 78 · Anindya 256,5 · Dimas 304 · Sinta 150,5 · Fajar 189 · Rina 120
   live:  Anindya 6,5+5=11,5 · Dimas 8+8=16 · Sinta 7,5 · Fajar 7 · Rina 6  (Σ 48)
   ------------------------------------------------------------------ */
const TRUE_ACTUAL: Record<string, number> = {
  'Hartono Wijaya, CPA': 78,
  'Anindya Pramesti': 268,
  'Dimas Raharjo': 320,
  'Sinta Wulandari': 158,
  'Fajar Nugroho': 196,
  'Rina Kusuma': 126,
};
const TRUE_BUDGET: Record<string, number> = {
  'Hartono Wijaya, CPA': 120,
  'Anindya Pramesti': 360,
  'Dimas Raharjo': 420,
  'Sinta Wulandari': 300,
  'Fajar Nugroho': 360,
  'Rina Kusuma': 280,
};
/* Angka yang DULU ditampilkan cockpit = round(bobot × 1146) / round(bobot × 1840). */
const LEGACY_ACTUAL = [81, 225, 299, 205, 174, 162];
const LEGACY_BUDGET = [131, 361, 480, 329, 280, 259];

describe('cockpit — jam per anggota berasal dari roster, bukan bobot literal', () => {
  it('jam aktual & anggaran tiap anggota sama dengan oracle seed (S1)', () => {
    const m = model(seedEntries(), ENG);
    expect(m.hasRoster).toBe(true);
    expect(m.members).toHaveLength(6);
    m.members.forEach((mem) => {
      expect(TRUE_ACTUAL[mem.name], `aktual ${mem.name}`).toBe(mem.actual);
      expect(TRUE_BUDGET[mem.name], `anggaran ${mem.name}`).toBe(mem.budget);
    });
  });

  it('total menutup — tetapi itu BUKAN yang dibuktikan uji ini', () => {
    const m = model(seedEntries(), ENG);
    expect(m.actualHrs).toBe(1146);
    expect(m.budgetHrs).toBe(1840);
    /* bobot lama juga menutup di total — persis sebabnya cacat lolos */
    const legacyTotal = LEGACY_TEAM_WEIGHTS.reduce((s, w) => s + Math.round(w * 1146), 0);
    expect(legacyTotal).toBe(1146);
  });

  it('angka baru BERBEDA dari pembagian bobot lama (anti-kambuh)', () => {
    const m = model(seedEntries(), ENG);
    const actual = m.members.map((x) => x.actual);
    const budget = m.members.map((x) => x.budget);
    expect(actual).not.toEqual(LEGACY_ACTUAL);
    expect(budget).not.toEqual(LEGACY_BUDGET);
    /* koreksi terbesar: Sinta +47 jam (bobot lama 205 vs roster 158) */
    const sinta = m.members.find((x) => x.name === 'Sinta Wulandari');
    expect(sinta?.actual).toBe(158);
    expect(LEGACY_ACTUAL[3] - (sinta?.actual ?? 0)).toBe(47);
  });

  it('mencatat jam untuk SATU anggota hanya menggeser anggota itu (S2)', () => {
    const before = model(seedEntries(), ENG);
    const after = model(
      [...seedEntries(), { id: 'TE-X', member: 'Dimas Raharjo', date: '2026-03-09', phase: 'Eksekusi', task: 'Uji tambahan', hours: 8 }],
      ENG,
    );
    const by = (mm: typeof before.members, name: string) => mm.find((x) => x.name === name);
    expect(by(after.members, 'Dimas Raharjo')?.actual).toBe(328);
    ['Hartono Wijaya, CPA', 'Anindya Pramesti', 'Sinta Wulandari', 'Fajar Nugroho', 'Rina Kusuma'].forEach((n) => {
      expect(by(after.members, n)?.actual, `${n} tak boleh bergeser`).toBe(by(before.members, n)?.actual);
    });
    expect(after.actualHrs).toBe(1154);
    /* dan cockpit TIDAK LAGI inert: burn ikut bergerak */
    expect(after.burnPct).toBeGreaterThan(before.burnPct);
  });
});

describe('cockpit — WIP, biaya & margin pada tarif yang benar', () => {
  it('WIP dinilai pada CHARGE-OUT, biaya waktu pada tarif BIAYA (S6)', () => {
    const m = model(seedEntries(), ENG);
    /* oracle: Σ jam × WIP_BILL = 78×2,5 + 268×1,2 + 320×0,7 + 158×0,7 + 196×0,4 + 126×0,4 */
    expect(m.wipStd).toBe(980_000_000);
    /* oracle: Σ jam × WIP_COST */
    expect(m.timeCost).toBe(491_660_000);
    /* dua figur berbeda — dulu keduanya dihitung pada tarif biaya lalu yang
       pertama diberi label "WIP Terpakai" → meleset 2× */
    expect(m.wipStd).not.toBe(m.timeCost);
    expect((m.wipStd ?? 0) / (m.timeCost ?? 1)).toBeGreaterThan(1.9);
  });

  it('bar "WIP vs Fee" memakai WIP charge-out — 53%, bukan 26%', () => {
    const m = model(seedEntries(), ENG);
    expect(Math.round(m.wipVsFeePct ?? 0)).toBe(53);
    /* angka lama (biaya/fee) yang selama ini ditampilkan */
    expect(Math.round(((m.timeCost ?? 0) / FEE_C014) * 100)).toBe(27);
  });

  it('biaya anggaran dienumerasi per anggota, bukan jam total × tarif blended', () => {
    const m = model(seedEntries(), ENG);
    const byHand = Object.entries(TRUE_BUDGET).reduce((s, [name, hrs]) => {
      const mem = m.members.find((x) => x.name === name);
      return s + hrs * (mem?.cost ?? 0);
    }, 0);
    expect(m.budgetCost).toBe(byHand);
    expect(m.budgetCost).toBe(748_800_000);
    expect(Math.round(m.marginPct ?? 0)).toBe(60);
  });
});

describe('cockpit — utilisasi perikatan vs utilisasi firma (S7)', () => {
  it('util roster mengukur perikatan; util firma dipisah dan diberi label', () => {
    const m = model(seedEntries(), ENG);
    const dimas = m.members.find((x) => x.name === 'Dimas Raharjo');
    /* pada perikatan ini Dimas memakai 320 dari 420 jam = 76% (DI BAWAH anggaran) */
    expect(dimas?.util).toBe(76);
    /* sementara utilisasi FIRMA-nya 94% — angka inilah yang dulu dipakai
       cockpit untuk memasang badge OVER-UTILIZED pada layar perikatan */
    expect(dimas?.firmUtil).toBe(94);
    expect(dimas?.util).not.toBe(dimas?.firmUtil);
  });

  it('anggota di luar roster firma tetap punya util perikatan, firmUtil null', () => {
    const ew = wipFor(seedEntries(), ENG);
    const m = cockpitEconomics({
      ew, fallbackBudgetHrs: 1840, fallbackActualHrs: 1146, fee: FEE_C014,
      firmTeam: [], workpapers: [], procs: [],
    });
    m.members.forEach((mem) => {
      expect(mem.firmUtil).toBeNull();
      expect(mem.util).toBeGreaterThan(0);
    });
  });
});

describe('cockpit — perikatan tanpa roster tidak mengarang rincian', () => {
  it('engagement tanpa roster → members kosong & figur rupiah null', () => {
    const m = model(seedEntries(), 'ENG-2025-040');
    expect(wipFor(seedEntries(), 'ENG-2025-040')).toBeNull();
    expect(m.hasRoster).toBe(false);
    expect(m.members).toEqual([]);
    expect(m.wipStd).toBeNull();
    expect(m.timeCost).toBeNull();
    expect(m.budgetCost).toBeNull();
    expect(m.marginPct).toBeNull();
    expect(m.wipVsFeePct).toBeNull();
  });

  it('total tingkat-perikatan tetap tampil dari seed, dengan burn yang konsisten', () => {
    const m = model(seedEntries(), 'ENG-2025-040', { fallbackBudgetHrs: 2200, fallbackActualHrs: 615 });
    expect(m.budgetHrs).toBe(2200);
    expect(m.actualHrs).toBe(615);
    expect(Math.round(m.burnPct)).toBe(28);
  });

  it('TIDAK meminjam roster perikatan lain', () => {
    const other = model(seedEntries(), 'ENG-2025-031');
    const target = model(seedEntries(), ENG);
    expect(other.members).toHaveLength(0);
    expect(target.members).toHaveLength(6);
  });
});

describe('cockpit — penugasan & grade', () => {
  it('grade diturunkan dari peran roster', () => {
    expect(gradeOf('Engagement Partner')).toBe('Partner');
    expect(gradeOf('Audit Manager')).toBe('Manager');
    expect(gradeOf('Senior Auditor')).toBe('Senior');
    expect(gradeOf('Junior Auditor')).toBe('Junior');
  });

  it('menghitung penugasan WP & prosedur per anggota', () => {
    const procs: CockpitProcRow[] = [
      { prep: 'Dimas R.', rev: 'Anindya P.' },
      { prep: 'Dimas R.', rev: 'Hartono W.' },
      { prep: 'Rina K.', rev: 'Dimas R.' },
    ];
    const m = model(seedEntries(), ENG, { procs });
    const dimas = m.members.find((x) => x.name === 'Dimas Raharjo');
    expect(dimas?.procPrep).toBe(2);
    expect(dimas?.procRev).toBe(1);
  });
});
