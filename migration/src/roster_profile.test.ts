/* ============================================================
   Roster perikatan dari profil grade — tie-out & nol-delta

   Roster keenam perikatan lain adalah DATA DEMO yang di-backfill. Yang membuat
   backfill ini dapat dipertanggungjawabkan bukan angkanya, melainkan gerbang
   di bawah:

     RP1  profil grade, diterapkan pada perikatan demo, menghasilkan roster
          demo PERSIS — jadi profilnya dapat diperiksa terhadap satu-satunya
          roster nyata yang ada, bukan sekadar diklaim wajar;
     RP2  Σbudget === budgetHrs dan Σbase === actualHrs untuk SETIAP perikatan,
          eksak — bukan "mendekati";
     RP3  perikatan demo TIDAK berubah sedikit pun (nol-delta);
     RP4  nama yang sudah disebut AMS.SCHEDULE dipakai apa adanya;
     RP5  penugasan deterministik — dua kali bangun, dua hasil identik.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  RP_GRADE_PROFILE, RP_JUNIOR, RP_JUNIORS, RP_MANAGER, RP_PARTNER, RP_SENIOR, RP_SENIORS,
  rpAllocate, rpBuildRoster, rpNames, rpPickLeast, rpRosterMap, rpScheduleNames, rpSeedHours,
  type RPEngagement, type RPRosterRow, type RPScheduleMember, type RPTimeEntry,
} from './roster_profile';

const DEMO = 'ENG-' + '2025-014';
interface CapStaff { name: string; grade: string; forecast: number[] }
const A = AMS as unknown as {
  ENGAGEMENTS: RPEngagement[]; SCHEDULE: RPScheduleMember[]; TIME_ENTRIES: RPTimeEntry[];
  CAPACITY: { staff: CapStaff[] };
};
const seedHours = (): Record<string, number> => rpSeedHours(A.TIME_ENTRIES);
const engs = (): RPEngagement[] => A.ENGAGEMENTS;
const engById = (id: string): RPEngagement => {
  const e = engs().find((x) => x.id === id);
  if (!e) throw new Error('perikatan tak ada: ' + id);
  return e;
};
const demoRoster = (): RPRosterRow[] =>
  (FIRMFIN as unknown as { WIP_ROSTER_ENG: Record<string, RPRosterRow[]> }).WIP_ROSTER_ENG[DEMO];
/* TANPA pembulatan: bagian terakhir menyerap sisa, jadi jumlahnya menutup
   EKSAK. Membulatkan di sini akan menyembunyikan hanyutnya bila itu kembali. */
const sum = (rows: readonly RPRosterRow[], k: 'budget' | 'base'): number =>
  rows.reduce((s, r) => s + r[k], 0);
const byGrade = (rows: readonly RPRosterRow[], k: 'budget' | 'base'): Record<string, number> => {
  const m: Record<string, number> = {};
  rows.forEach((r) => { m[r.role] = Math.round(((m[r.role] || 0) + r[k]) * 10) / 10; });
  return m;
};

/* ============================================================
   a · RP1 — profilnya dapat diperiksa terhadap roster nyata
   ============================================================ */
describe('RP1 — profil grade direproduksi dari roster demo', () => {
  it('pembilang profil == komposisi grade roster demo', () => {
    const b = byGrade(demoRoster(), 'budget');
    const s = byGrade(demoRoster(), 'base');
    RP_GRADE_PROFILE.forEach((g) => {
      expect(g.budgetShare, g.role + ' budget').toBe(b[g.role]);
      expect(g.baseShare, g.role + ' base').toBe(s[g.role]);
    });
  });

  it('profil diterapkan pada angka perikatan demo → komposisi yang SAMA', () => {
    const r = rpBuildRoster(engById(DEMO), rpNames(engById(DEMO)), seedHours()[DEMO]);
    expect(byGrade(r, 'budget')).toEqual(byGrade(demoRoster(), 'budget'));
    expect(byGrade(r, 'base')).toEqual(byGrade(demoRoster(), 'base'));
  });

  it('anti-tautologi — profil yang diubah TIDAK lagi mereproduksinya', () => {
    const palsu = RP_GRADE_PROFILE.map((g, i) => ({ ...g, budgetShare: i === 0 ? g.budgetShare * 3 : g.budgetShare }));
    const alloc = rpAllocate(1840, palsu.map((g) => g.budgetShare), 0);
    expect(alloc[0]).not.toBe(byGrade(demoRoster(), 'budget')[RP_PARTNER]);
  });
});

/* ============================================================
   b · RP2 — tie-out eksak ke jam perikatan
   ============================================================ */
describe('RP2 — Σroster == jam perikatan, eksak', () => {
  const map = () => rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());

  it('setiap perikatan punya roster', () => {
    const m = map();
    engs().forEach((e) => expect(m[e.id], e.id).toBeDefined());
    expect(Object.keys(m).length).toBe(engs().length);
  });

  engsForEachCase();
  function engsForEachCase(): void {
    /* dibungkus fungsi agar `engs()` dipanggil saat kolektor uji berjalan */
    A.ENGAGEMENTS.forEach((e) => {
      it('Σbudget == budgetHrs — ' + e.id, () => {
        expect(sum(map()[e.id], 'budget')).toBe(e.budgetHrs);
      });
      it('Σbase + jam timesheet == actualHrs — ' + e.id, () => {
        expect(sum(map()[e.id], 'base') + (seedHours()[e.id] || 0)).toBe(e.actualHrs);
      });
    });
  }

  it('premis: hanya perikatan demo yang punya jam timesheet seed', () => {
    expect(Object.keys(seedHours())).toEqual([DEMO]);
    expect(seedHours()[DEMO]).toBeGreaterThan(0);
  });

  it('premis: perikatan uji punya budgetHrs yang BERBEDA-beda', () => {
    expect(new Set(engs().map((e) => e.budgetHrs)).size).toBeGreaterThan(3);
  });

  it('alokasi eksak juga untuk angka yang tak habis dibagi', () => {
    expect(rpAllocate(1_000_001, [1, 1, 1], 0).reduce((s, v) => s + v, 0)).toBe(1_000_001);
    expect(rpAllocate(945, [78, 256.5, 454.5, 309], 1).reduce((s, v) => s + v, 0)).toBe(945);
    expect(rpAllocate(48, [78, 256.5, 454.5, 309], 1).reduce((s, v) => s + v, 0)).toBe(48);
  });

  it('alokasi nol/negatif tidak mengarang', () => {
    expect(rpAllocate(0, [1, 2, 3], 0)).toEqual([0, 0, 0]);
    expect(rpAllocate(100, [], 0)).toEqual([]);
  });
});

/* ============================================================
   c · RP3 — perikatan demo tak tersentuh
   ============================================================ */
describe('RP3 — nol-delta untuk perikatan demo', () => {
  it('roster demo dikembalikan APA ADANYA, objek yang sama', () => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    expect(m[DEMO]).toBe(demoRoster());
  });

  it('jam & nilai FIRMFIN perikatan demo tidak bergeser', () => {
    const ew = FIRMFIN.engagementWip([], DEMO) as { actualHrs: number; budgetHrs: number };
    expect(ew.budgetHrs).toBe(1840);
    expect(ew.actualHrs).toBe(1098);
  });
});

/* ============================================================
   d · RP4/RP5 — nama: jadwal menang, sisanya deterministik
   ============================================================ */
describe('RP4 — nama dari data lebih dulu', () => {
  it('partner & manager selalu dari perikatan itu sendiri', () => {
    engs().forEach((e) => {
      const n = rpNames(e);
      expect(n[RP_PARTNER], e.id).toBe(e.partner);
      if (e.manager) expect(n[RP_MANAGER], e.id).toBe(e.manager);
    });
  });

  it('senior/junior yang disebut SCHEDULE dipakai apa adanya', () => {
    const id40 = 'ENG-' + '2025-040';
    expect(rpScheduleNames(A.SCHEDULE, id40).senior).toBe('Sinta Wulandari');
    expect(rpNames(engById(id40), rpScheduleNames(A.SCHEDULE, id40))[RP_SENIOR])
      .toBe('Sinta Wulandari');
  });

  it('tanpa sebutan jadwal, kolam TEAM dipakai — dan hanya itu', () => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    engs().filter((e) => e.id !== DEMO).forEach((e) => {
      const r = m[e.id];
      expect(RP_SENIORS, e.id).toContain(r.find((x) => x.role === RP_SENIOR)!.name);
      expect(RP_JUNIORS, e.id).toContain(r.find((x) => x.role === RP_JUNIOR)!.name);
    });
  });

  it('pembagian memang MEMBAGI — bukan satu orang untuk semua', () => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    const senior = engs().filter((e) => e.id !== DEMO)
      .map((e) => m[e.id].find((x) => x.role === RP_SENIOR)!.name);
    expect(new Set(senior).size).toBeGreaterThan(1);
  });
});

describe('RP5 — deterministik', () => {
  /* `hydrateCoreFromApi` mengganti AMS.ENGAGEMENTS saat boot dengan salinan dari
     basis data, yang terurut menurut id — urutan yang BERBEDA dari berkas seed.
     Kalau penugasan bergantung pada urutan array, tim sebuah perikatan berubah
     tergantung aplikasi berjalan dengan server atau offline. */
  it('urutan array masuk TIDAK mengubah penugasan', () => {
    const asli = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());
    const acak = rpRosterMap(
      engs().slice().reverse(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());
    engs().forEach((e) => {
      expect(acak[e.id].map((r) => r.name), e.id).toEqual(asli[e.id].map((r) => r.name));
    });
  });

  it('anti-tautologi — urutan yang dibalik memang berbeda', () => {
    expect(engs().slice().reverse().map((e) => e.id)).not.toEqual(engs().map((e) => e.id));
  });

  it('dua kali bangun → hasil identik', () => {
    const a = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    const b = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('roster nyata yang disuntikkan dipakai apa adanya', () => {
    const id31 = 'ENG-' + '2025-031';
    const tambah = rpRosterMap(
      engs(), { [DEMO]: demoRoster(), [id31]: demoRoster() }, A.SCHEDULE, seedHours());
    expect(tambah[id31]).toBe(demoRoster());
  });

  it('pemilih beban-teringan: seri → urutan kolam, bukan acak', () => {
    expect(rpPickLeast(['a', 'b'], {})).toBe('a');
    expect(rpPickLeast(['a', 'b'], { a: 10 })).toBe('b');
    expect(rpPickLeast(['a', 'b'], { a: 10, b: 10 })).toBe('a');
    expect(rpPickLeast(['a', 'b'], { a: 10, b: 3 })).toBe('b');
  });

  it('setiap baris memakai peran yang dikenali kartu tarif FIRMFIN', () => {
    const bill = FIRMFIN.WIP_BILL as Record<string, number>;
    const cost = FIRMFIN.WIP_COST as Record<string, number>;
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE);
    Object.keys(m).forEach((id) => m[id].forEach((r) => {
      expect(bill[r.role], id + ' · ' + r.role).toBeGreaterThan(0);
      expect(cost[r.role], id + ' · ' + r.role).toBeGreaterThan(0);
    }));
  });

  it('peran yang dipakai profil persis empat grade itu', () => {
    expect(RP_GRADE_PROFILE.map((g) => g.role))
      .toEqual([RP_PARTNER, RP_MANAGER, RP_SENIOR, RP_JUNIOR]);
  });
});

/* ============================================================
   e · RP6 — beban antar orang SEGRADE tidak boleh timpang
   ------------------------------------------------------------
   Rotasi bergilir membagi JUMLAH perikatan secara merata, bukan JAM. Karena
   perikatan berbeda jauh ukurannya (…-063 punya 1.588 jam aktual, …-047 hanya
   48), giliran yang "adil" menghasilkan beban yang sangat timpang: Sinta
   Wulandari mendapat 1.418 jam sementara Dimas Raharjo — senior lain, satu
   grade — hanya 815. Selisih 74% tanpa satu pun alasan di data.

   Patokannya BUKAN kalender yang saya karang, melainkan data yang sudah ada:
   `CAPACITY.staff.forecast` menyatakan utilisasi yang diharapkan tiap orang.
   Dimas 94% vs Sinta 91% — nyaris sama, jadi porsi jam mereka pun harus nyaris
   sama. Gerbang di bawah membandingkan PORSI, sehingga ia tak bergantung pada
   panjang musim audit (yang memang tak dinyatakan di mana pun).
   ============================================================ */
describe('RP6 — beban segrade mengikuti forecast CAPACITY', () => {
  const beban = (): Record<string, number> => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());
    const out: Record<string, number> = {};
    Object.keys(m).forEach((id) => m[id].forEach((r) => {
      out[r.name] = (out[r.name] || 0) + r.base;
    }));
    return out;
  };
  const bersih = (n: string): string => n.replace(', CPA', '');
  const forecastOf = (n: string): number | null => {
    const s = A.CAPACITY.staff.find((x) => x.name === bersih(n));
    return s ? s.forecast.reduce((a, b) => a + b, 0) / s.forecast.length : null;
  };

  /* Hanya kolam yang punya >1 anggota & forecast — di seed: Senior & Junior. */
  const kolam: [string, readonly string[]][] = [['Senior', RP_SENIORS], ['Junior', RP_JUNIORS]];

  it('premis: forecast CAPACITY untuk tiap kolam nyaris seimbang', () => {
    kolam.forEach(([grade, pool]) => {
      const f = pool.map((n) => forecastOf(n));
      f.forEach((v, i) => {
        expect(v, grade + ' · ' + pool[i] + ' tak ada di CAPACITY').not.toBeNull();
      });
      const max = Math.max(...(f as number[])), min = Math.min(...(f as number[]));
      expect(max / min, grade).toBeLessThan(1.15);
    });
  });

  /* Ambang mutlak yang longgar SENGAJA: perikatan tak dapat dibelah, jadi
     porsinya melompat sebesar perikatan terbesar (…-063 sendirian = 29% jam
     junior). Gerbang yang MENGIKAT adalah uji berikutnya — optimalitas lokal —
     yang tak punya konstanta untuk dilonggarkan diam-diam. */
  const simpangan = (b: Record<string, number>, pool: readonly string[]): number => {
    const totJam = pool.reduce((s, n) => s + (b[n] || 0), 0);
    const totFc = pool.reduce((s, n) => s + (forecastOf(n) || 0), 0);
    return Math.max(...pool.map((n) =>
      Math.abs((b[n] || 0) / totJam * 100 - (forecastOf(n) || 0) / totFc * 100)));
  };

  it('porsi jam tiap orang tidak jauh dari porsi forecast-nya', () => {
    const b = beban();
    kolam.forEach(([grade, pool]) => {
      expect(simpangan(b, pool), grade).toBeLessThanOrEqual(10);
    });
  });

  /* GERBANG YANG MENGIKAT. Tak ada satu pun pemindahan SATU perikatan antar
     anggota kolam yang memperkecil simpangan terhadap forecast. Kalau ada,
     pembagiannya memang bisa lebih baik dan algoritmanya yang salah — bukan
     ambangnya yang perlu dilonggarkan.

     Penugasan yang DIPAKU AMS.SCHEDULE dikecualikan: ia bukan pilihan
     algoritma, jadi memindahkannya bukan perbaikan melainkan pelanggaran data.
     (Justru di situ letak sisa simpangan junior: SCHEDULE memaku Rina Kusuma
     pada …-022, dan itulah yang menahan Fajar/Rina di 45,9%/54,1% alih-alih
     51,2%/48,8%. Data mengalahkan heuristik — sebagaimana mestinya.) */
  it('tak ada pemindahan satu-perikatan yang memperbaiki pembagian', () => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());
    const b = beban();
    kolam.forEach(([grade, pool]) => {
      const dasar = simpangan(b, pool);
      engs().filter((e) => e.id !== DEMO).forEach((e) => {
        const baris = m[e.id].find((r) => pool.includes(r.name));
        if (!baris) return;
        const paku = rpScheduleNames(A.SCHEDULE, e.id);
        if (paku.senior === baris.name || paku.junior === baris.name) return;
        pool.filter((n) => n !== baris.name).forEach((lain) => {
          const coba = { ...b };
          coba[baris.name] -= baris.base;
          coba[lain] = (coba[lain] || 0) + baris.base;
          expect(simpangan(coba, pool),
            grade + ': memindahkan ' + e.id + ' dari ' + baris.name + ' ke ' + lain
            + ' memperkecil simpangan ' + dasar.toFixed(2) + ' → ' + simpangan(coba, pool).toFixed(2))
            .toBeGreaterThanOrEqual(dasar - 1e-9);
        });
      });
    });
  });

  it('anti-tautologi — kolam memang menerima jam yang berarti', () => {
    const b = beban();
    kolam.forEach(([grade, pool]) => {
      pool.forEach((n) => expect(b[n], grade + ' · ' + n).toBeGreaterThan(0));
    });
  });

  it('nama dari SCHEDULE tetap menang meski menimbulkan ketimpangan', () => {
    const m = rpRosterMap(engs(), { [DEMO]: demoRoster() }, A.SCHEDULE, seedHours());
    const id40 = 'ENG-' + '2025-040', id22 = 'ENG-' + '2025-022';
    expect(m[id40].find((r) => r.role === RP_SENIOR)!.name).toBe('Sinta Wulandari');
    expect(m[id22].find((r) => r.role === RP_JUNIOR)!.name).toBe('Rina Kusuma');
  });

  it('perbaikan nyata: ketimpangan senior runtuh dari 74% ke sekitar nol', () => {
    const b = beban();
    const [a, c] = RP_SENIORS.map((n) => b[n] || 0);
    expect(Math.abs(a - c) / Math.min(a, c), 'selisih relatif senior').toBeLessThan(0.1);
  });
});
