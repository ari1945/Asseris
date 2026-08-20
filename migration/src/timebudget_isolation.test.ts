/* ============================================================
   Time & Budget — isolasi perikatan & tie-out anggaran (TB1–TB4)

   Modul `time` sampai PR ini menampilkan angka perikatan LAIN sebagai angka
   perikatan aktif. Empat cacat dari satu keputusan yang sama:

     TB1  engagementWip(…, e.id) || engagementWip(…, id literal)
          → "tak ada data" menjadi "data milik perikatan demo", seluruh halaman
            dirender dengan judul perikatan aktif. Bukan error, bukan kosong.
     TB2  TB_ROSTER = WIP_ROSTER_ENG[id literal] konstanta tingkat-modul
          → kolom "Nilai (std)" jadi Rp 0 sekolom penuh untuk perikatan lain.
     TB3  TB_PHASES berjumlah 1840 jam = anggaran perikatan demo yang dibekukan
          → tab Ringkasan (anggaran nyata) membantah tab Anggaran per Fase.
     TB4  TB_WEEKLY delapan pasang literal + label puncak "(W4)" yang dipaku.

   Oracle di berkas ini INDEPENDEN dari implementasi: roster sintetis dibangun
   di sini dan disuntikkan lewat `wipOf`, sehingga tie-out dapat diuji untuk
   perikatan yang memang tak punya roster di seed.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  tbModel, tbEntryValue, tbWeekly, tbTanggalPanjang,
  type TBTimeEntry, type TBRosterRow, type TBWip, type TBWipOf,
  type TBEngagement, type TBClient,
} from './timebudget_model';

interface RateMap { [role: string]: number }
const BILL = FIRMFIN.WIP_BILL as unknown as RateMap;
const COST = FIRMFIN.WIP_COST as unknown as RateMap;

const entries = (): TBTimeEntry[] =>
  ((AMS as unknown as { TIME_ENTRIES: TBTimeEntry[] }).TIME_ENTRIES).map((t) => ({ ...t }));
const engagements = (): TBEngagement[] =>
  (AMS as unknown as { ENGAGEMENTS: TBEngagement[] }).ENGAGEMENTS;
const clients = (): TBClient[] => (AMS as unknown as { CLIENTS: TBClient[] }).CLIENTS;
const engById = (id: string): TBEngagement => {
  const e = engagements().find((x) => x.id === id);
  if (!e) throw new Error('perikatan tak ada di seed: ' + id);
  return e;
};
const DEMO = 'ENG-' + '2025-014';   /* dirakit agar gerbang sumber tetap bermakna */

/* ---- roster sintetis: oracle independen, tarif tetap dari SSOT FIRMFIN ---- */
interface RosterSpec { name: string; role: string; budget: number; base: number }
function buildWip(spec: readonly RosterSpec[], live: readonly TBTimeEntry[]): TBWip {
  const byMember: Record<string, number> = {};
  live.forEach((t) => { byMember[t.member] = (byMember[t.member] || 0) + t.hours; });
  const roster: TBRosterRow[] = spec.map((r) => {
    const actual = r.base + (byMember[r.name] || 0);
    const bill = BILL[r.role], cost = COST[r.role];
    return {
      ...r, actual, bill, cost, billVal: actual * bill, costVal: actual * cost,
      variance: r.budget - actual, util: Math.round(actual / r.budget * 100),
    };
  });
  return {
    roster,
    actualHrs: roster.reduce((s, r) => s + r.actual, 0),
    budgetHrs: roster.reduce((s, r) => s + r.budget, 0),
    stdValue: roster.reduce((s, r) => s + r.billVal, 0),
    costValue: roster.reduce((s, r) => s + r.costVal, 0),
  };
}
/* Roster sintetis dipilih agar TOTAL ANGGARANNYA = budgetHrs seed perikatan itu:
   1480 (…-031) dan 640 (…-022) — dua angka yang berbeda dari 1840. */
const SPEC_031: readonly RosterSpec[] = [
  { name: 'Anindya Pramesti', role: 'Audit Manager',  budget: 280, base: 190 },
  { name: 'Dimas Raharjo',    role: 'Senior Auditor', budget: 600, base: 330 },
  { name: 'Fajar Nugroho',    role: 'Junior Auditor', budget: 600, base: 292 },
];
const SPEC_022: readonly RosterSpec[] = [
  { name: 'Bayu Saputra', role: 'Audit Manager',  budget: 140, base: 80 },
  { name: 'Rina Kusuma',  role: 'Junior Auditor', budget: 500, base: 210 },
];
const wipOfSynthetic = (map: Record<string, readonly RosterSpec[]>): TBWipOf =>
  (live, engId) => (map[engId] ? buildWip(map[engId], live) : null);

const seedWipOf: TBWipOf = (live, engId) =>
  FIRMFIN.engagementWip(live, engId) as unknown as TBWip | null;

/* ============================================================
   a · TB1 — perikatan tanpa roster TIDAK mendapat angka perikatan lain
   ============================================================ */
describe('TB1 — perikatan tanpa roster', () => {
  it('seed memang hanya memberi roster pada satu perikatan (premis uji)', () => {
    const punya = engagements().filter((e) => seedWipOf(entries(), e.id) !== null).map((e) => e.id);
    expect(punya).toEqual([DEMO]);
  });

  it('model mengembalikan null — bukan angka perikatan lain', () => {
    engagements().filter((e) => e.id !== DEMO).forEach((e) => {
      const m = tbModel(entries(), e, clients(), seedWipOf);
      expect(m, e.id + ' mendapat model padahal tak punya roster').toBeNull();
    });
  });

  it('perikatan yang PUNYA roster tetap menghasilkan model (anti-tautologi)', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf);
    expect(m).not.toBeNull();
    expect(m!.budgetTotal).toBe(1840);
    expect(m!.actualTotal).toBe(1146);
  });
});

/* ============================================================
   b · TB2 — nilai standar baris timesheet dari roster perikatan AKTIF
   ============================================================ */
describe('TB2 — nilai standar baris timesheet', () => {
  it('anggota roster perikatan aktif bernilai > 0 pada tarif perannya', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf);
    expect(m).not.toBeNull();
    entries().forEach((t) => {
      const val = tbEntryValue(m!.roster, t.member, t.hours);
      expect(val, t.member + ' bernilai 0').toBeGreaterThan(0);
    });
  });

  it('tarif berasal dari roster perikatan itu, bukan konstanta modul', () => {
    const id = 'ENG-' + '2025-031';
    const m = tbModel(entries(), engById(id), clients(), wipOfSynthetic({ [id]: SPEC_031 }));
    expect(m).not.toBeNull();
    /* Dimas ada di roster sintetis sebagai Senior Auditor → tarif SSOT perannya */
    expect(tbEntryValue(m!.roster, 'Dimas Raharjo', 10)).toBe(10 * BILL['Senior Auditor']);
    /* Sinta TIDAK ada di roster itu → 0, dan itu jawaban yang benar */
    expect(tbEntryValue(m!.roster, 'Sinta Wulandari', 10)).toBe(0);
  });
});

/* ============================================================
   c · TB3 — jumlah anggaran fase == anggaran perikatan aktif (>1 perikatan)
   ============================================================ */
describe('TB3 — tie-out anggaran per fase', () => {
  const kasus: [string, readonly RosterSpec[], number][] = [
    ['ENG-' + '2025-031', SPEC_031, 1480],
    ['ENG-' + '2025-022', SPEC_022, 640],
  ];

  it('premis: ketiga perikatan uji punya anggaran jam yang BERBEDA', () => {
    expect(new Set([1840, ...kasus.map((k) => k[2])]).size).toBe(3);
  });

  it('total anggaran fase == budgetHrs perikatan — perikatan demo (seed)', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf);
    expect(m).not.toBeNull();
    expect(m!.phases.reduce((s, p) => s + p.budget, 0)).toBe(m!.budgetTotal);
  });

  kasus.forEach(([id, spec, budget]) => {
    it('total anggaran fase == budgetHrs perikatan — ' + id, () => {
      const m = tbModel(entries(), engById(id), clients(), wipOfSynthetic({ [id]: spec }));
      expect(m).not.toBeNull();
      expect(m!.budgetTotal).toBe(budget);
      expect(m!.phases.reduce((s, p) => s + p.budget, 0)).toBe(budget);
    });

    it('total aktual fase == actualHrs perikatan — ' + id, () => {
      const m = tbModel(entries(), engById(id), clients(), wipOfSynthetic({ [id]: spec }));
      expect(m).not.toBeNull();
      expect(m!.phases.reduce((s, p) => s + p.actual, 0)).toBeCloseTo(m!.actualTotal, 6);
    });
  });

  it('profil fase perikatan demo TIDAK berubah — nol-delta terhadap literal lama', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf);
    expect(m).not.toBeNull();
    expect(m!.phases.map((p) => p.budget)).toEqual([320, 1080, 320, 120]);
    expect(m!.phases.map((p) => p.base)).toEqual([318, 658, 98, 24]);
  });
});

/* ============================================================
   d · TB4 — seri mingguan diturunkan dari timeEntries
   ============================================================ */
describe('TB4 — seri jam mingguan', () => {
  const tot = (s: { weeks: { h: number }[] }): number => s.weeks.reduce((x, w) => x + w.h, 0);

  it('berubah ketika satu entri timesheet berubah', () => {
    const a = tbWeekly(entries());
    const ubah = entries();
    ubah[0] = { ...ubah[0], hours: ubah[0].hours + 40 };
    expect(tot(tbWeekly(ubah)) - tot(a)).toBeCloseTo(40, 6);
  });

  it('total seri == total jam timesheet — tidak ada jam yang dikarang', () => {
    const live = entries();
    expect(tot(tbWeekly(live))).toBeCloseTo(live.reduce((x, t) => x + t.hours, 0), 6);
  });

  it('puncak adalah minggu yang benar-benar tertinggi, bukan label tetap', () => {
    const s = tbWeekly(entries());
    expect(s.peak).not.toBeNull();
    const tertinggi = s.weeks.reduce((best, w) => (w.h > best.h ? w : best), s.weeks[0]);
    expect(s.peak!.wk).toBe(tertinggi.wk);
  });

  it('label puncak mengikuti data — tambah minggu lain, puncaknya ikut pindah', () => {
    const jauh: TBTimeEntry[] = [...entries(),
      { id: 'TE-99', member: 'Dimas Raharjo', date: '2026-01-12', phase: 'Perencanaan', task: 'uji', hours: 999 }];
    const s = tbWeekly(jauh);
    expect(s.peak!.h).toBe(999);
    expect(s.weeks.length).toBeGreaterThan(1);
  });

  it('seri kosong ketika tak ada entri — bukan delapan minggu karangan', () => {
    const s = tbWeekly([]);
    expect(s.weeks).toEqual([]);
    expect(s.peak).toBeNull();
  });
});

describe('tanggal perikatan diformat dari data, bukan dipaku', () => {
  it('tbTanggalPanjang menerjemahkan ISO ke label Indonesia', () => {
    expect(tbTanggalPanjang('2026-03-31')).toBe('31 Mar 2026');
    expect(tbTanggalPanjang('2027-01-05')).toBe('05 Jan 2027');
  });

  it('tenggat tiap perikatan menghasilkan label BERBEDA (anti-tautologi)', () => {
    const label = engagements()
      .map((e) => tbTanggalPanjang((e as { deadline?: string }).deadline))
      .filter(Boolean);
    expect(label.length).toBe(engagements().length);
    expect(new Set(label).size).toBeGreaterThan(1);
  });

  it('tanggal yang tak terbaca menghasilkan kosong, bukan tanggal karangan', () => {
    expect(tbTanggalPanjang(undefined)).toBe('');
    expect(tbTanggalPanjang('bukan-tanggal')).toBe('');
  });
});

/* ============================================================
   e · Gerbang sumber — nol literal id perikatan di kode modul
   ============================================================ */
describe('gerbang sumber — tak ada id perikatan yang dipaku', () => {
  const berkas = ['view_timebudget.tsx', 'timebudget_model.ts'];
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

  /* TB2 — cacatnya bukan hanya id literal, melainkan KONSTANTA TINGKAT-MODUL
     yang mengunci satu perikatan. Kalau seseorang menulis ulang
     `const TB_ROSTER = FIRMFIN.WIP_ROSTER_ENG[…]`, baris ini merah. */
  it('view tidak lagi menyimpan roster/tarif tingkat-modul', () => {
    const jsx = kode('view_timebudget.tsx');
    expect(jsx).not.toMatch(/WIP_ROSTER_ENG/);
    expect(jsx).not.toMatch(/WIP_BILL|WIP_COST/);
    expect(jsx).not.toMatch(/FIRMFIN/);
  });

  /* Tanggal perikatan juga pernah dipaku: "Tenggat fieldwork 31 Mar 2026" —
     benar untuk satu perikatan, diam-diam salah untuk semua yang lain. */
  it('view tidak memuat tahun kalender literal', () => {
    const tahun = [...kode('view_timebudget.tsx').matchAll(/(?:19|20)\d\d/g)].map((m) => m[0]);
    expect(tahun, 'tahun dipaku: ' + tahun.join(' | ')).toEqual([]);
  });

  it('gerbang ini benar-benar bisa merah (anti-tautologi)', () => {
    const palsu = 'const x = "ENG-2025-014";';
    expect([...palsu.matchAll(idLiteral)].length).toBe(1);
  });
});
