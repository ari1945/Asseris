/* ============================================================
   PRD `docs/prd-delivery-milestones-deepening.md` · PR-3 · SC-7/SC-8.

   D-4: `view_audittimeline` — linimasa yang DIHADAPKAN KE KLIEN — mencari tanggal
   tanda tangan dengan REGEX ATAS LABEL. Mengganti label "Sign-off" menjadi
   "Penerbitan laporan" membuatnya kehilangan tanggal tanda tangan, diam-diam.

   D-5: milestone adalah daftar datar tanpa relasi; tanda tangan boleh dijadwalkan
   mendahului selesainya fieldwork, fase boleh tumpang-tindih, dan milestone boleh
   jatuh setelah tenggat perikatan — tak satu pun terdeteksi.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  MILESTONE_KIND_LABEL,
  inferKindFromLabel,
  milestoneOfKind,
  milestoneRank,
  normalizeDeliveryPlan,
  planConsistency,
  planConsistencyAll,
  seedDeliveryPlan,
  type DeliveryEngPlan,
  type DeliveryMilestone,
  type MilestoneKind,
  type SeedEngPlan,
} from './canon_delivery';
import { AMS } from './data';

const SRC = dirname(fileURLToPath(import.meta.url));

const ms = (o: Partial<DeliveryMilestone>): DeliveryMilestone => ({
  label: 'X', kind: 'other', date: '2026-03-20', baselineDate: '2026-03-20', done: false, shifts: [], ...o,
});

describe('inferKindFromLabel — dipakai SEKALI untuk migrasi, bukan kontrak permanen', () => {
  it('mengenali jenis bergerbang mutu', () => {
    expect(inferKindFromLabel('EQR (SA 220)')).toBe('eqr');
    expect(inferKindFromLabel('EQR')).toBe('eqr');
    expect(inferKindFromLabel('Penelaahan mutu perikatan')).toBe('eqr');
  });
  it('SPESIFISITAS: "Sign-off opini" adalah signoff, bukan tertangkap aturan lain', () => {
    expect(inferKindFromLabel('Sign-off opini')).toBe('signoff');
    expect(inferKindFromLabel('Tanda tangan opini')).toBe('signoff');
    expect(inferKindFromLabel('Laporan reviu')).toBe('signoff');
    expect(inferKindFromLabel('Laporan temuan faktual')).toBe('signoff');
  });
  it('EQR menang atas signoff — "EQR" tak boleh jadi signoff', () => {
    expect(inferKindFromLabel('EQR & sign-off')).toBe('eqr');
  });
  it('sisanya', () => {
    expect(inferKindFromLabel('Kickoff')).toBe('kickoff');
    expect(inferKindFromLabel('Interim review')).toBe('interim');
    expect(inferKindFromLabel('Observasi stock opname')).toBe('stocktake');
    expect(inferKindFromLabel('Stock opname CPO')).toBe('stocktake');
    expect(inferKindFromLabel('Konfirmasi piutang')).toBe('confirmation');
    expect(inferKindFromLabel('Selesai fieldwork')).toBe('fieldwork-end');
    expect(inferKindFromLabel('Selesai prosedur')).toBe('fieldwork-end');
    expect(inferKindFromLabel('Arsip (SMM)')).toBe('archive');
  });
  it('yang tak dikenali JATUH ke other — bukan ditebak', () => {
    expect(inferKindFromLabel('Walkthrough pengendalian')).toBe('other');
    expect(inferKindFromLabel('Scoping AUP')).toBe('other');
    expect(inferKindFromLabel('')).toBe('other');
  });
});

describe('seed AMS.DELIVERY — kind EKSPLISIT, tidak bergantung inferensi', () => {
  const seed = AMS.DELIVERY as unknown as SeedEngPlan[];
  const all = seed.flatMap((d) => d.milestones);

  it('setiap milestone seed menyatakan kind-nya sendiri', () => {
    const tanpaKind = all.filter((m) => !m.kind).map((m) => m.label);
    expect(tanpaKind).toEqual([]);
  });
  it('kind eksplisit SEPAKAT dengan inferensi — bila salah satu bergeser, gerbang ini merah', () => {
    const beda = all.filter((m) => m.kind !== inferKindFromLabel(m.label))
      .map((m) => `${m.label}: eksplisit=${m.kind} inferensi=${inferKindFromLabel(m.label)}`);
    expect(beda).toEqual([]);
  });
  it('setiap perikatan seed punya tepat satu milestone tanda tangan (kontrak linimasa klien)', () => {
    seed.forEach((d) => {
      const n = d.milestones.filter((m) => m.kind === 'signoff').length;
      expect(`${d.id}:${n}`).toBe(`${d.id}:1`);
    });
  });
  it('seluruh kind terpakai punya label tampil', () => {
    all.forEach((m) => expect(MILESTONE_KIND_LABEL[m.kind as MilestoneKind]).toBeTruthy());
  });
});

describe('normalizeDeliveryPlan — dokumen LAMA memperoleh kind', () => {
  it('menurunkan kind dari label sekali, lalu label bebas berubah', () => {
    const legacy = [{ id: 'E1', phases: [], milestones: [{ label: 'Tanda tangan opini', date: '2026-03-15', done: false }] }];
    expect(normalizeDeliveryPlan(legacy)[0].milestones[0].kind).toBe('signoff');
  });
  it('kind yang SUDAH ada tidak ditimpa oleh label', () => {
    const stored = [{ id: 'E1', phases: [], milestones: [{ label: 'Penerbitan laporan', kind: 'signoff', date: '2026-03-15', done: false }] }];
    expect(normalizeDeliveryPlan(stored)[0].milestones[0].kind).toBe('signoff');
  });
});

describe('milestoneOfKind — kontrak menggantikan tebakan teks', () => {
  const list = [ms({ label: 'Kickoff', kind: 'kickoff' }), ms({ label: 'Penerbitan laporan auditor', kind: 'signoff', date: '2026-03-31' })];
  it('menemukan tanda tangan meski labelnya TIDAK memuat kata "sign" atau "opini"', () => {
    const found = milestoneOfKind(list, 'signoff');
    expect(found?.date).toBe('2026-03-31');
    /* justru inilah label yang membuat regex lama gagal: */
    expect(/sign|opini/i.test(found!.label)).toBe(false);
  });
  it('mengembalikan undefined bila tak ada — bukan menebak yang terdekat', () => {
    expect(milestoneOfKind(list, 'eqr')).toBeUndefined();
  });
});

describe('milestoneRank — `other` tak berperingkat', () => {
  it('jenis kerja punya urutan; other tidak', () => {
    expect(milestoneRank('kickoff')).toBe(0);
    expect(milestoneRank('signoff')).toBeGreaterThan(milestoneRank('fieldwork-end') as number);
    expect(milestoneRank('eqr')).toBeGreaterThan(milestoneRank('fieldwork-end') as number);
    expect(milestoneRank('signoff')).toBeGreaterThan(milestoneRank('eqr') as number);
    expect(milestoneRank('other')).toBeNull();
  });
});

describe('planConsistency — rencana kini DAPAT dinyatakan tidak konsisten', () => {
  const phasesOk = [
    { name: 'Perencanaan', start: '2026-01-05', end: '2026-02-06' },
    { name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' },
  ];

  it('rencana sehat -> NOL temuan (tak berisik)', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: phasesOk, milestones: [
      ms({ label: 'Selesai fieldwork', kind: 'fieldwork-end', date: '2026-03-20' }),
      ms({ label: 'EQR', kind: 'eqr', date: '2026-03-24' }),
      ms({ label: 'Sign-off', kind: 'signoff', date: '2026-03-30' }),
    ] };
    expect(planConsistency(plan, { deadline: '2026-03-31' })).toEqual([]);
  });

  it('URUTAN: tanda tangan mendahului selesai fieldwork', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [
      ms({ label: 'Selesai fieldwork', kind: 'fieldwork-end', date: '2026-03-20' }),
      ms({ label: 'Sign-off', kind: 'signoff', date: '2026-03-10' }),
    ] };
    const found = planConsistency(plan, null);
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe('sequence');
    expect(found[0].detail).toContain('mendahului');
  });

  it('URUTAN: EQR sesudah tanda tangan juga tertangkap', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [
      ms({ label: 'EQR', kind: 'eqr', date: '2026-04-02' }),
      ms({ label: 'Sign-off', kind: 'signoff', date: '2026-03-30' }),
    ] };
    expect(planConsistency(plan, null).map((x) => x.kind)).toEqual(['sequence']);
  });

  it('`other` tak pernah memicu temuan urutan', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [
      ms({ label: 'Scoping', kind: 'other', date: '2026-12-31' }),
      ms({ label: 'Kickoff', kind: 'kickoff', date: '2026-01-05' }),
    ] };
    expect(planConsistency(plan, null)).toEqual([]);
  });

  it('FASE tumpang-tindih dinamai beserta jumlah harinya', () => {
    const plan: DeliveryEngPlan = { id: 'E1', milestones: [], phases: [
      { name: 'Perencanaan', start: '2026-01-05', end: '2026-02-20' },
      { name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' },
    ] };
    const found = planConsistency(plan, null);
    expect(found[0].kind).toBe('phase-overlap');
    expect(found[0].detail).toContain('11 hari');
  });

  it('LUBANG fase besar dilaporkan; jeda akhir pekan TIDAK', () => {
    const gap: DeliveryEngPlan = { id: 'E1', milestones: [], phases: [
      { name: 'Perencanaan', start: '2026-01-05', end: '2026-02-06' },
      { name: 'Eksekusi', start: '2026-03-02', end: '2026-03-20' },
    ] };
    expect(planConsistency(gap, null).map((x) => x.kind)).toEqual(['phase-gap']);

    /* Jum'at 6 Feb -> Senin 9 Feb = 3 hari: jeda wajar, bukan temuan. */
    const weekend: DeliveryEngPlan = { id: 'E1', milestones: [], phases: [
      { name: 'Perencanaan', start: '2026-01-05', end: '2026-02-06' },
      { name: 'Eksekusi', start: '2026-02-09', end: '2026-03-20' },
    ] };
    expect(planConsistency(weekend, null)).toEqual([]);
  });

  it('LEWAT TENGGAT: rencana yang, bila dijalankan sesuai rencana, tetap terlambat', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [
      ms({ label: 'Sign-off', kind: 'signoff', date: '2026-04-10' }),
    ] };
    const found = planConsistency(plan, { deadline: '2026-03-31' });
    expect(found).toHaveLength(1);
    expect(found[0].kind).toBe('past-deadline');
    expect(found[0].detail).toContain('10 hari SETELAH');
  });

  it('tanpa tenggat, temuan lewat-tenggat tidak dikarang', () => {
    const plan: DeliveryEngPlan = { id: 'E1', phases: [], milestones: [ms({ kind: 'signoff', date: '2099-01-01' })] };
    expect(planConsistency(plan, { deadline: null })).toEqual([]);
  });

  it('planConsistencyAll membawa id perikatan pada tiap temuan', () => {
    const plans: DeliveryEngPlan[] = [
      { id: 'E1', phases: [], milestones: [ms({ kind: 'signoff', date: '2026-04-10' })] },
      { id: 'E2', phases: [], milestones: [ms({ kind: 'signoff', date: '2026-01-10' })] },
    ];
    const found = planConsistencyAll(plans, (id) => (id === 'E1' ? { deadline: '2026-03-31' } : null));
    expect(found.map((x) => x.eng)).toEqual(['E1']);
  });
});

describe('seed nyata melewati gerbang konsistensinya sendiri', () => {
  it('AMS.DELIVERY tidak memuat pelanggaran urutan/fase (kalau ada, seed yang salah)', () => {
    const plans = seedDeliveryPlan(AMS.DELIVERY as unknown as SeedEngPlan[]);
    const struktural = planConsistencyAll(plans, () => null);   // tanpa tenggat: urutan & fase saja
    expect(struktural.map((x) => `${x.eng} ${x.kind}: ${x.detail}`)).toEqual([]);
  });
});

/* ------------------------------------------------------------------
   GERBANG REPO-LEBAR — tak ada konsumen yang kembali menebak dari label.

   Pola dirakit dari potongan agar berkas gerbang ini tidak MENUDUH DIRINYA
   SENDIRI (gotcha yang sudah pernah menggigit di repo ini), dan komentar
   dibuang supaya catatan sejarah tak dihitung sebagai kode.
   ------------------------------------------------------------------ */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('GERBANG: milestone dikenali lewat kind, bukan regex atas label', () => {
  /* Dirakit dari potongan; berkas uji juga dikecualikan dari pemindaian, jadi
     gerbang ini tak mungkin menuduh dirinya sendiri. */
  const FORBIDDEN = new RegExp(['sign', 'opini'].join('\\|'));

  it('tak ada sumber non-uji yang mencocokkan label milestone dengan regex teks', () => {
    const offenders: string[] = [];
    readdirSync(SRC)
      .filter((f) => /\.(ts|tsx)$/.test(f) && !/\.test\.tsx?$/.test(f))
      .forEach((f) => {
        const body = stripComments(readFileSync(join(SRC, f), 'utf8'));
        if (FORBIDDEN.test(body)) offenders.push(f);
      });
    expect(offenders).toEqual([]);
  });

  it('gerbang ini BISA merah — pola yang dilarang memang cocok bila ada', () => {
    expect(FORBIDDEN.test('const m = /sign|opini/i.test(x.label);')).toBe(true);
    expect(FORBIDDEN.test('const k = m.kind === "signoff";')).toBe(false);
  });
});
