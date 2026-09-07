/* ============================================================
   Time & Budget — ISOLASI PER-PERIKATAN (W7.5).

   Cacat yang dipaku di sini (view_timebudget.tsx, s/d 2026-08-15):

     const ew = (FIRMFIN.engagementWip(timeEntries, e.id)
              || FIRMFIN.engagementWip(timeEntries, 'ENG-2025-014'))!;

   `engagementWip` mengembalikan `null` bila perikatan tak punya roster di
   `WIP_ROSTER_ENG`. Hanya ENG-2025-014 yang punya; enam dari tujuh perikatan demo
   tidak. Untuk keenamnya modul Time & Budget karena itu menampilkan roster, jam
   aktual, nilai standar dan biaya MILIK ENG-2025-014 sebagai milik perikatan aktif —
   tanpa penanda apa pun. Angka satu klien tampil di ruang kerja klien lain.

   Uji ini menguji `tbModel` — fungsi yang benar-benar dipakai `<TimeBudget>` untuk
   merender, bukan tiruannya — sehingga memasang kembali fallback apa pun (ke
   ENG-2025-014 atau ke perikatan mana pun) memerahkan berkas ini.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import { tbModel } from './view_timebudget';
import type { TBEngagement, TBModel } from './view_timebudget';

type RosterSeed = { name: string; role: string; budget: number; base: number };
type TimeEntry = { member: string; phase: string; hours: number };

const ENGS = AMS.ENGAGEMENTS as TBEngagement[];
const ROSTERS = FIRMFIN.WIP_ROSTER_ENG as Record<string, RosterSeed[] | undefined>;
const ENTRIES = (AMS.TIME_ENTRIES || []) as TimeEntry[];

/* Roster seed perikatan — pembanding "datanya memang sama". */
const seedOf = (id: string) => JSON.stringify(ROSTERS[id] ?? null);

/* Sidik jari roster TERRENDER: nama + peran + anggaran + jam aktual + nilai/biaya.
   Bukan sekadar daftar nama — kalau dua perikatan meminjam jam yang sama, itu pun
   harus tertangkap. */
const fingerprint = (m: TBModel | null) =>
  m === null ? null
    : JSON.stringify(m.roster.map(r => [r.name, r.role, r.budget, r.actual, r.billVal, r.costVal]));

const withRoster = ENGS.filter(e => ROSTERS[e.id]);
const withoutRoster = ENGS.filter(e => !ROSTERS[e.id]);

describe('Time & Budget — roster tak pernah dipinjam dari perikatan lain', () => {
  /* Prasyarat: kalau seed berubah sehingga SEMUA perikatan punya roster (atau tak
     satu pun), uji di bawah kehilangan gigi tanpa memberi tahu siapa pun. */
  it('data demo masih memuat kedua kasus (ada roster & tanpa roster)', () => {
    expect(withRoster.length).toBeGreaterThan(0);
    expect(withoutRoster.length).toBeGreaterThan(0);
  });

  it('perikatan tanpa roster → model null, bukan roster perikatan lain', () => {
    withoutRoster.forEach(e => {
      expect(FIRMFIN.engagementWip(ENTRIES, e.id), e.id).toBeNull();
      expect(tbModel(ENTRIES, e), e.id).toBeNull();
    });
  });

  it('perikatan dengan roster → model dari rosternya sendiri', () => {
    withRoster.forEach(e => {
      const m = tbModel(ENTRIES, e);
      expect(m, e.id).not.toBeNull();
      expect(m!.roster.map(r => r.name)).toEqual((ROSTERS[e.id] as RosterSeed[]).map(r => r.name));
      expect(m!.budgetTotal).toBe((ROSTERS[e.id] as RosterSeed[]).reduce((s, r) => s + r.budget, 0));
    });
  });

  /* INTI: dua perikatan berbeda tak pernah menghasilkan roster yang sama, kecuali
     seed rosternya memang identik. `null` ≠ roster mana pun, jadi kasus "tanpa
     roster" ikut terjaring di sini. */
  it('dua perikatan berbeda tak menghasilkan roster sama kecuali datanya memang sama', () => {
    const fp = new Map(ENGS.map(e => [e.id, fingerprint(tbModel(ENTRIES, e))]));
    ENGS.forEach((a, i) => ENGS.slice(i + 1).forEach(b => {
      if (seedOf(a.id) === seedOf(b.id)) return;      // data memang sama → boleh sama
      expect(fp.get(a.id), `${a.id} vs ${b.id}`).not.toBe(fp.get(b.id));
    }));
  });

  /* Anti-tautologi: sidik jari di atas tidak "selalu berbeda". Perikatan yang sama,
     dievaluasi dua kali, harus menghasilkan sidik jari yang identik — kalau tidak,
     uji pasangan di atas akan hijau bahkan setelah fallback dipasang kembali. */
  it('sidik jari stabil untuk perikatan yang sama (pembanding bukan selalu-beda)', () => {
    withRoster.forEach(e => {
      expect(fingerprint(tbModel(ENTRIES, e))).toBe(fingerprint(tbModel(ENTRIES, e)));
    });
  });

  /* Regresi bernama atas baris yang dihapus. Jam timesheet live diarahkan ke anggota
     roster ENG-2025-014: bila fallback kembali, perikatan tanpa roster akan memuat
     jam ini — jadi ia bukan sekadar `null` yang kebetulan. */
  it('timesheet live tidak membocorkan jam ENG-2025-014 ke perikatan tanpa roster', () => {
    const live: TimeEntry[] = [
      ...ENTRIES,
      { member: 'Dimas Raharjo', phase: 'Eksekusi', hours: 40 },
    ];
    const leaked = tbModel(live, { id: 'ENG-2025-014', clientId: 'C-014', progress: 62 });
    expect(leaked).not.toBeNull();
    expect(leaked!.actualTotal).toBeGreaterThan(0);

    withoutRoster.forEach(e => {
      const m = tbModel(live, e);
      expect(m, e.id).toBeNull();
    });
  });
});
