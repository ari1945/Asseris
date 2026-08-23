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
import { PHASE_ORDER, phaseBudgetHours } from './phase_canon';
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
  /* PREMIS DIPERBARUI (#273). Ketika berkas ini ditulis, seed hanya memberi
     roster pada perikatan demo, sehingga "tidak meminjam" paling tajam
     dinyatakan sebagai "mengembalikan null". Sejak roster keenam perikatan lain
     di-backfill (`roster_profile.ts`), SETIAP perikatan seed punya roster
     sendiri — jadi null tak lagi dapat dipakai sebagai buktinya.

     Sifat yang dijaga TB1 tidak berubah sedikit pun: model tidak boleh
     menampilkan angka perikatan LAIN. Yang berubah hanya cara membuktikannya —
     kini dengan menunjukkan bahwa tiap perikatan mendapat angkanya SENDIRI, dan
     bahwa perikatan yang benar-benar tak punya roster tetap null. */
  const TAKDIKENAL = 'ENG-' + '2099-001';

  it('setiap perikatan seed punya roster SENDIRI (premis uji, diperbarui)', () => {
    const tanpa = engagements().filter((e) => seedWipOf(entries(), e.id) === null).map((e) => e.id);
    expect(tanpa).toEqual([]);
  });

  it('model TIDAK meminjam angka perikatan demo', () => {
    const demo = tbModel(entries(), engById(DEMO), clients(), seedWipOf)!;
    engagements().filter((e) => e.id !== DEMO).forEach((e) => {
      const m = tbModel(entries(), e, clients(), seedWipOf);
      expect(m, e.id).not.toBeNull();
      expect(m!.budgetTotal, e.id + ' memakai anggaran perikatan demo').not.toBe(demo.budgetTotal);
      expect(m!.budgetTotal, e.id).toBe((e as TBEngagement & { budgetHrs: number }).budgetHrs);
      expect(m!.roster.map((r) => r.name), e.id + ' memakai roster perikatan demo')
        .not.toEqual(demo.roster.map((r) => r.name));
    });
  });

  it('perikatan yang benar-benar tak punya roster tetap null', () => {
    const palsu = { ...engById(DEMO), id: TAKDIKENAL };
    expect(seedWipOf(entries(), TAKDIKENAL)).toBeNull();
    expect(tbModel(entries(), palsu, clients(), seedWipOf)).toBeNull();
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

    /* PREMIS DIPERBARUI (TB7). Dulu jam PEMBUKA roster disebar ke keempat fase
       menurut bobot, sehingga `Σ aktual fase == actualHrs` berlaku langsung.
       Penyebaran itu mengarang atribusi fase untuk jam yang tak membawanya dan
       kini dicabut: jam pembuka dilaporkan utuh sebagai `untaggedHrs`.

       Sifat yang dijaga TIDAK berubah — nol jam dikarang, nol jam hilang.
       Yang berubah hanya bentuk invariannya. */
    it('Σ aktual fase + jam tanpa fase == actualHrs perikatan — ' + id, () => {
      const m = tbModel(entries(), engById(id), clients(), wipOfSynthetic({ [id]: spec }));
      expect(m).not.toBeNull();
      const perFase = m!.phases.reduce((s, p) => s + p.actual, 0);
      expect(perFase + m!.untaggedHrs).toBeCloseTo(m!.actualTotal, 6);
      /* anti-tautologi: invariannya tak lolos hanya karena semuanya nol */
      expect(m!.actualTotal).toBeGreaterThan(0);
    });
  });

  /* TB7 — angka ini SENGAJA berubah, dan perubahannya didaftar di sini.
     Sampai PRD `prd-timebudget-phase-profile.md`, Time & Budget membagi jam
     anggaran dengan bobotnya sendiri (320/1080/320/120 dari 1840) sementara
     cockpit membagi jam yang SAMA dengan bobot lain (280/760/361/340/99).
     Kini keduanya memanggil `phaseBudgetHours`. */
  it('anggaran fase demo memakai bobot KANON, dan menutup eksak', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf);
    expect(m).not.toBeNull();
    expect(m!.phases.map((p) => p.id)).toEqual([...PHASE_ORDER]);
    const kanon = phaseBudgetHours(1840);
    expect(m!.phases.map((p) => p.budget)).toEqual(PHASE_ORDER.map((id) => kanon[id]));
    expect(m!.phases.reduce((s, p) => s + p.budget, 0)).toBeCloseTo(1840, 9);
    /* delta yang dinyatakan: bobot lama sudah tidak berlaku */
    expect(m!.phases.map((p) => Math.round(p.budget))).not.toEqual([320, 1080, 320, 120]);
  });

  it('jam pembuka roster TIDAK lagi disebar ke fase — ia dinyatakan', () => {
    const m = tbModel(entries(), engById(DEMO), clients(), seedWipOf)!;
    /* seed timesheet perikatan demo seluruhnya berfase Eksekusi */
    expect(m.phases.find((p) => p.id === 'Perencanaan')!.actual).toBe(0);
    expect(m.untaggedHrs).toBeGreaterThan(0);
    expect(m.phases.reduce((s, p) => s + p.actual, 0) + m.untaggedHrs).toBeCloseTo(m.actualTotal, 6);
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
