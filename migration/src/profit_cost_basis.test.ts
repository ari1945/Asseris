/* ============================================================
   Profitabilitas — basis BIAYA: tarif biaya, bukan tarif tagihan

   Modul ini menghitung `stdCost = jam × blendedRate`, dan `blendedRate`
   diturunkan dari `FIRMFIN.WIP_BILL` — tarif CHARGE-OUT. Biaya karena itu
   dibukukan pada harga jual. Akibatnya bukan kosmetik:

     PC1  ENG-…-031 dibebani Rp 1.659k/jam — di atas tarif tagihan Manager,
          untuk sebuah perikatan yang jadwalnya hanya berisi Partner+Manager.
          Biayanya 1.347 jt terhadap fee 1.120 jt ⇒ margin −43%. "Rugi" itu
          artefak pertukaran tarif, bukan temuan.
     PC2  `CHARGE_MULT = 2.4` — "standard charge-out vs cost" — adalah pengali
          KARANGAN. Rasio WIP_BILL/WIP_COST yang sebenarnya 1,905–2,273; tak
          satu pun 2,4. Dengan kedua kartu tarif tersedia, charge-out tak perlu
          ditebak: ia jam × tarif bill.
     PC3  `GRADE_COST` di LeverageRecovery memuat NILAI WIP_BILL di bawah nama
          "COST" — register tarif ketiga, menunggu dipakai sebagai aritmetika.
     PC4  Untuk perikatan yang PUNYA roster, FIRMFIN sudah menghitung biaya &
          nilai standar (`engagementWip().costValue/stdValue`) — dipakai Time &
          Budget dan Engagement Cockpit. Modul ini menghitung angkanya sendiri:
          register biaya keempat. Bila roster ada, ia yang berlaku (tie-out);
          bila tidak, mix jadwal dipakai dan DINYATAKAN sebagai pendekatan.

   Preseden: `cockpit_model.ts` memperbaiki cacat yang persis sama dari arah
   sebaliknya ("ketiganya dihitung pada tarif biaya … meleset 2×").
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';
import {
  PM_BILL_CARD, PM_COST_CARD, pmBlendedRate, pmRosterOf, pmRows, pmRecovery, pmRecoveryTotals,
  type PMClient, type PMEngagement, type PMEngRoster, type PMRosterOf,
  type PMScheduleRow, type PMTimeEntry,
} from './profit_model';

const DEMO = 'ENG-' + '2025-014';   /* satu-satunya perikatan seed ber-roster */
const GRADES = ['Partner', 'Manager', 'Senior', 'Junior'] as const;

const A = AMS as unknown as {
  ENGAGEMENTS: PMEngagement[]; CLIENTS: PMClient[];
  SCHEDULE: PMScheduleRow[]; TIME_ENTRIES: PMTimeEntry[];
};
const seed = (): PMTimeEntry[] => A.TIME_ENTRIES.map((t) => ({ ...t }));
const noRoster: PMRosterOf = () => null;
const rows = (rosterOf: PMRosterOf = noRoster) =>
  pmRows({ engagements: A.ENGAGEMENTS, clients: A.CLIENTS, schedule: A.SCHEDULE, rosterOf });
const row = (id: string, rosterOf?: PMRosterOf) => {
  const r = rows(rosterOf).find((x) => x.id === id);
  if (!r) throw new Error('baris tak ada: ' + id);
  return r;
};

/* ============================================================
   a · PC1 — dua kartu tarif yang BERBEDA, masing-masing dari SSOT-nya
   ============================================================ */
describe('PC1 — biaya memakai tarif biaya', () => {
  it('kartu biaya = FIRMFIN.WIP_COST, kartu tagihan = FIRMFIN.WIP_BILL', () => {
    const bill = FIRMFIN.WIP_BILL as Record<string, number>;
    const cost = FIRMFIN.WIP_COST as Record<string, number>;
    expect(PM_BILL_CARD.Partner).toBe(bill['Engagement Partner']);
    expect(PM_BILL_CARD.Manager).toBe(bill['Audit Manager']);
    expect(PM_COST_CARD.Partner).toBe(cost['Engagement Partner']);
    expect(PM_COST_CARD.Manager).toBe(cost['Audit Manager']);
    expect(PM_COST_CARD.Senior).toBe(cost['Senior Auditor']);
    expect(PM_COST_CARD.Junior).toBe(cost['Junior Auditor']);
  });

  it('tarif biaya SELALU di bawah tarif tagihan — dua kartu, bukan satu', () => {
    GRADES.forEach((g) => {
      expect(PM_COST_CARD[g], g).toBeLessThan(PM_BILL_CARD[g]);
    });
  });

  it('blended rate default adalah tarif BIAYA', () => {
    const c = pmBlendedRate(A.SCHEDULE, DEMO, PM_COST_CARD).rate;
    const b = pmBlendedRate(A.SCHEDULE, DEMO, PM_BILL_CARD).rate;
    expect(pmBlendedRate(A.SCHEDULE, DEMO).rate).toBe(c);
    expect(c).toBeLessThan(b);
  });

  it('tak ada perikatan yang dibebani di atas tarif biaya termahal', () => {
    const maxCost = Math.max(...GRADES.map((g) => PM_COST_CARD[g]));
    rows().forEach((r) => {
      expect(r.blendedRate, r.id + ' dibebani di atas tarif biaya Partner').toBeLessThanOrEqual(maxCost);
    });
  });

  /* Konsekuensi yang bisa dinyatakan salah: dua perikatan seed berhenti
     melaporkan rugi begitu biayanya dibukukan pada tarif biaya. */
  it('rugi artefak lenyap — …-031 & …-058 kembali positif', () => {
    [('ENG-' + '2025-031'), ('ENG-' + '2025-058')].forEach((id) => {
      const r = row(id);
      expect(r.margin, id).not.toBeNull();
      expect(r.margin!, id + ' masih rugi').toBeGreaterThan(0);
    });
  });

  it('anti-tautologi — pada tarif TAGIHAN keduanya memang rugi', () => {
    const salah = pmRows({
      engagements: A.ENGAGEMENTS, clients: A.CLIENTS, schedule: A.SCHEDULE,
      rosterOf: noRoster, costCard: PM_BILL_CARD,
    });
    [('ENG-' + '2025-031'), ('ENG-' + '2025-058')].forEach((id) => {
      expect(salah.find((r) => r.id === id)!.margin!, id).toBeLessThan(0);
    });
  });
});

/* ============================================================
   b · PC2 — charge-out dari tarif, bukan dari pengali karangan
   ============================================================ */
describe('PC2 — WIP charge-out tanpa pengali karangan', () => {
  it('premis: rasio bill/cost nyata tak pernah 2,4', () => {
    const bill = FIRMFIN.WIP_BILL as Record<string, number>;
    const cost = FIRMFIN.WIP_COST as Record<string, number>;
    const rasio = Object.keys(bill).map((k) => bill[k] / cost[k]);
    expect(Math.max(...rasio)).toBeLessThan(2.4);
    expect(Math.min(...rasio)).toBeGreaterThan(1.5);
  });

  it('wipCharge = jam × blended tarif TAGIHAN', () => {
    rows().forEach((r) => {
      const b = pmBlendedRate(A.SCHEDULE, r.id, PM_BILL_CARD);
      expect(r.wipCharge, r.id).toBe(Math.round(r.hours * b.rate));
    });
  });

  it('wipCharge di atas stdCost — nilai jual > biaya', () => {
    rows().forEach((r) => expect(r.wipCharge, r.id).toBeGreaterThan(r.stdCost));
  });

  it('pmRecovery tidak lagi menerima pengali', () => {
    expect(pmRecovery.length).toBe(1);
    const rec = pmRecovery(rows());
    rec.forEach((r) => {
      if (r.billed === null) return;
      expect(r.recoveryPct).toBeCloseTo(r.billed / r.wipCharge, 12);
      expect(r.writedown).toBe(r.wipCharge - r.billed);
    });
  });
});

/* ============================================================
   c · PC4 — roster perikatan berlaku bila ada (tie-out ke SSOT)
   ============================================================ */
describe('PC4 — roster perikatan adalah SSOT biaya', () => {
  /* `pmRosterOf` menerima id perikatan AKTIF: jam timesheet live hanya berlaku
     bagi perikatan yang memilikinya (lihat wip_roster_scope.test.ts). */
  const rosterOf = () => pmRosterOf(seed(), DEMO);
  const ew = (): PMEngRoster => {
    const w = FIRMFIN.engagementWip(seed(), DEMO) as PMEngRoster | null;
    if (!w) throw new Error('roster demo hilang dari seed');
    return w;
  };

  it('premis: seed hanya memberi roster pada satu perikatan', () => {
    const punya = A.ENGAGEMENTS.filter((e) => rosterOf()(e.id) !== null).map((e) => e.id);
    expect(punya).toEqual([DEMO]);
  });

  it('biaya perikatan ber-roster == costValue FIRMFIN, persis', () => {
    expect(row(DEMO, rosterOf()).stdCost).toBe(ew().costValue);
  });

  it('nilai WIP-nya == stdValue FIRMFIN, persis', () => {
    expect(row(DEMO, rosterOf()).wipCharge).toBe(ew().stdValue);
  });

  it('jam-nya == actualHrs roster, dan sumbernya dinyatakan', () => {
    const r = row(DEMO, rosterOf());
    expect(r.hours).toBe(ew().actualHrs);
    expect(r.costSource).toMatch(/roster/i);
  });

  it('perikatan TANPA roster tidak memakai angka perikatan ber-roster', () => {
    const lain = A.ENGAGEMENTS.filter((e) => e.id !== DEMO);
    lain.forEach((e) => {
      const r = row(e.id, rosterOf());
      expect(r.stdCost, e.id).not.toBe(ew().costValue);
      expect(r.costSource, e.id).not.toMatch(/roster/i);
    });
  });

  it('anti-tautologi — roster lain menghasilkan biaya lain', () => {
    const palsu: PMRosterOf = (id) => id === DEMO ? { actualHrs: 100, costValue: 111, stdValue: 222 } : null;
    const r = row(DEMO, palsu);
    expect(r.stdCost).toBe(111);
    expect(r.wipCharge).toBe(222);
    expect(r.hours).toBe(100);
  });

  it('tanpa roster sama sekali, biaya tetap terhitung & sumbernya jujur', () => {
    const r = row(DEMO, noRoster);
    expect(r.stdCost).toBeGreaterThan(0);
    expect(r.costSource).not.toMatch(/roster/i);
    expect(r.costSource).toMatch(/staffing aktual|mix standar/);
  });
});

/* ============================================================
   c2 · Dua jalur jam harus SEPAKAT, bukan diam-diam menyimpang
   ------------------------------------------------------------
   Perikatan ber-roster mengambil jam dari roster; sisanya dari
   `e.actualHrs + delta timesheet`. Kalau kedua jalur itu berselisih untuk
   perikatan yang SAMA, salah satunya salah — jadi kesepakatannya diuji.
   ============================================================ */
describe('jam: roster vs actualHrs + delta', () => {
  const wip = (live: PMTimeEntry[]): PMEngRoster => {
    const w = FIRMFIN.engagementWip(live, DEMO) as PMEngRoster | null;
    if (!w) throw new Error('roster demo hilang');
    return w;
  };

  it('pada baseline seed keduanya menghasilkan angka yang sama', () => {
    const e = A.ENGAGEMENTS.find((x) => x.id === DEMO)!;
    expect(wip(seed()).actualHrs).toBe(e.actualHrs);
  });

  it('menambah jam untuk ANGGOTA roster menggerakkan keduanya sama besar', () => {
    const anggota = wip(seed()).actualHrs;
    const live: PMTimeEntry[] = [...seed(), { member: 'Dimas Raharjo', hours: 12 } as PMTimeEntry];
    const e = A.ENGAGEMENTS.find((x) => x.id === DEMO)!;
    const delta = pmRows({
      engagements: [e], clients: A.CLIENTS, schedule: A.SCHEDULE, rosterOf: pmRosterOf(live, DEMO),
    })[0];
    expect(wip(live).actualHrs).toBe(anggota + 12);
    expect(delta.hours).toBe(anggota + 12);
  });

  /* Batas yang diketahui & sengaja dibiarkan: jam yang dicatat atas nama orang
     DI LUAR roster tidak masuk `engagementWip` (ia menjumlah per anggota
     roster). Baris ini memakukan perilaku itu supaya perubahannya disengaja. */
  it('jam anggota NON-roster tidak menambah jam perikatan ber-roster', () => {
    const live: PMTimeEntry[] = [...seed(), { member: 'Orang Luar', hours: 40 } as PMTimeEntry];
    expect(wip(live).actualHrs).toBe(wip(seed()).actualHrs);
  });
});

/* ============================================================
   c3 · Tanda write-up/(down) — agregat firma bisa berbalik arah
   ------------------------------------------------------------
   Dengan charge-out pada tarif yang benar, firma secara AGREGAT write-UP.
   Baris TOTAL dulu memaku tanda kurung + warna merah, jadi ia menulis
   "((2.446))" merah untuk sebuah write-up. Gerbang di bawah memaku bahwa
   tandanya diturunkan, bukan diasumsikan.
   ============================================================ */
describe('tanda write-up/(down)', () => {
  it('premis: total firma memang write-UP pada basis yang benar', () => {
    const t = pmRecoveryTotals(pmRecovery(rows(pmRosterOf(seed(), DEMO))));
    expect(t.writedown).toBeLessThan(0);
    expect(t.recoveryPct!).toBeGreaterThan(1);
  });

  it('view tidak lagi memaku kurung/merah pada baris TOTAL', () => {
    const jsx = readFileSync(join(__dirname, 'view_profit.tsx'), 'utf8');
    expect(jsx).not.toMatch(/\(\{fmt\(t\.writedown/);
    expect(jsx).toMatch(/wdColor\(t\.writedown\)/);
  });
});

/* ============================================================
   d · Gerbang sumber — tak ada kartu tarif / pengali lokal
   ============================================================ */
describe('gerbang sumber — tarif hanya dari FIRMFIN', () => {
  const kode = (f: string): string =>
    readFileSync(join(__dirname, f), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');

  it('view_profit.tsx tak memuat kartu tarif / pengali charge-out', () => {
    const jsx = kode('view_profit.tsx');
    expect(jsx).not.toMatch(/GRADE_COST/);
    expect(jsx).not.toMatch(/CHARGE_MULT/);
  });

  /* PC3 — tarif adalah angka berjuta; bila muncul sebagai literal di view atau
     model, ia register tarif baru. Satu-satunya sumbernya FIRMFIN. */
  it('tak ada literal tarif berjuta di view maupun model', () => {
    ['view_profit.tsx', 'profit_model.ts'].forEach((f) => {
      const hit = [...kode(f).matchAll(/\b\d[\d_]*_\d{3}\b/g)].map((m) => m[0]);
      expect(hit, f + ' memuat literal tarif: ' + hit.join(' | ')).toEqual([]);
    });
  });

  it('model membaca KEDUA kartu FIRMFIN, bukan satu', () => {
    const src = kode('profit_model.ts');
    expect(src).toMatch(/WIP_BILL/);
    expect(src).toMatch(/WIP_COST/);
  });

  it('gerbang literal tarif bisa merah (anti-tautologi)', () => {
    const palsu = 'const GRADE_COST = { Partner: 2_500_000 };';
    expect([...palsu.matchAll(/\b\d[\d_]*_\d{3}\b/g)].length).toBe(1);
  });
});
