/* ============================================================
   Engagement Cockpit — Status Report tersegel (PR-C-7)

   Cacat yang ditutup ada dua lapis:

   1. Payload ekspor dirakit INLINE di dalam handler tombol, sehingga tak ada
      satu pun uji yang bisa menyentuhnya. Satu-satunya cara memeriksa apa yang
      disegel adalah mengunduh berkasnya — dan selama arc ini yang tersegel
      adalah angka fabrikasi. Berkas tersegel yang salah lebih buruk daripada
      tak ada berkas, karena ia terlihat seperti bukti.

   2. Berkas tak menyebutkan BASIS figurnya. "WIP Rp 0,98 M" tak berarti apa-apa
      enam bulan kemudian tanpa "jam aktual × tarif charge-out" di sebelahnya.

   Kriteria S11.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildCockpitStatusReport, NOT_MEASURED, type CockpitReportInput, type ReportRiskRow } from './cockpit_report';
import { cockpitEconomics, cockpitRiskCoverage, type CockpitWip } from './cockpit_model';
import { progressBridge, type ModuleWpStatus } from './cockpit_progress';
import { engagementStart, engagementMilestones } from './cockpit_timeline';

const ENG = { id: 'ENG-2025-014', phase: 'Eksekusi', deadline: '2026-03-31', fy: 'FY2025', partner: 'Hartono Wijaya, CPA', manager: 'Anindya Pramesti' };

const wip = (): CockpitWip => ({
  roster: [
    { name: 'Hartono Wijaya, CPA', role: 'Engagement Partner', budget: 120, base: 78, actual: 78, bill: 2_500_000, cost: 1_100_000, billVal: 195_000_000, costVal: 85_800_000, variance: 42, util: 65 },
    { name: 'Anindya Pramesti', role: 'Audit Manager', budget: 360, base: 256.5, actual: 268, bill: 1_200_000, cost: 620_000, billVal: 321_600_000, costVal: 166_160_000, variance: 92, util: 74 },
  ],
  actualHrs: 346, budgetHrs: 480, stdValue: 516_600_000, costValue: 251_960_000,
});

const statuses = (n: number, done: number): ModuleWpStatus[] =>
  Array.from({ length: n }, (_, k) => ({
    id: `m${k}`, ref: `m${k}`,
    signed: k < done, hasEvidence: k < done, hasConclusion: k < done, notStarted: k >= done,
  }));

const RISKS: ReportRiskRow[] = [
  { id: 'R-01', area: 'Pendapatan', desc: 'Channel stuffing', inherent: 'Significant', fraud: true, response: 'Cut-off', wp: 'B-3', owner: 'Anindya P.' },
  { id: 'R-99', area: 'Tanpa program', desc: 'Yatim', inherent: 'Significant', fraud: false },
];

function input(over: Partial<CockpitReportInput> = {}): CockpitReportInput {
  const econ = cockpitEconomics({
    ew: wip(), fallbackBudgetHrs: 480, fallbackActualHrs: 346, fee: 1_850_000_000,
    firmTeam: [], workpapers: [], procs: [],
  });
  const bridge = progressBridge(statuses(50, 10), 62);
  const start = engagementStart(ENG);
  return {
    engagementId: ENG.id, fy: ENG.fy, clientName: 'PT Sentosa Makmur Tbk',
    firmName: 'KAP Wijaya Hartono & Rekan', phase: ENG.phase, verdict: 'Perlu Perhatian',
    daysLeft: 22, burnPct: 72, overall: Math.round(bridge.provenPct), asserted: 62, bridge, econ,
    phaseRows: [{ phase: 'Eksekusi', pct: 20, wpCount: 11, bud: 198, tsAct: 48 },
      { phase: 'Review & Arsip', pct: 0, wpCount: 0, bud: 26, tsAct: 0 }],
    tsTotal: 48, untaggedHrs: 298, start,
    milestones: engagementMilestones({ engagement: ENG, start }),
    riskCoverage: cockpitRiskCoverage([{ id: 'R-01' }], [{ riskId: 'R-01', area: 'Pendapatan', procs: [{ status: 'done', exc: 2 }, { status: 'open' }] }]),
    gateCriteria: [
      { label: 'Laporan auditor difinalisasi (SA 700)', met: false, detail: 'Opini belum difinalisasi' },
      { label: 'Seluruh kertas kerja kunci ter-review', met: true, detail: '50/50 WP ter-review' },
    ],
    openNotes: 6, highOpen: 3, excTot: 8,
    ...over,
  };
}

const build = (over?: Partial<CockpitReportInput>) => buildCockpitStatusReport(input(over), RISKS);

describe('payload dapat diuji — bukan dirakit inline di handler tombol', () => {
  it('view memanggil pembangun murni, tidak merakit sheet sendiri', () => {
    const src = readFileSync(join(__dirname, 'view_cockpit2.tsx'), 'utf8');
    expect(src).toMatch(/buildCockpitStatusReport\(/);
    /* tak ada lagi perakitan sheet manual di dalam view */
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/colWidths:/);
  });

  /* C-2 · IDENTITAS YANG DISEGEL. `firmName` dulu literal di call-site:
     'KAP Wijaya Hartono & Rekan' ditulis langsung ke payload yang disegel
     Ed25519 dan keluar sebagai artefak. Menyegel identitas yang salah lebih
     buruk daripada tidak menyegel — segelnya memberi otoritas pada isi yang
     keliru, dan pembaca berkas tak punya cara tahu bahwa nama itu tak pernah
     berasal dari profil firma. Gerbang ini statik karena cacatnya ada di
     call-site, bukan di pembangun payload. */
  it('nama firma pada payload tersegel berasal dari SSOT, bukan literal', () => {
    const src = readFileSync(join(__dirname, 'view_cockpit2.tsx'), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    expect(src).toMatch(/firmName:\s*\(AMS\.FIRM/);
    /* tak ada literal nama firma di mana pun di view ini — termasuk sebagai
       fallback: berkas tersegel tidak boleh mengarang identitas. */
    expect(src).not.toMatch(/'KAP [^']*'/);
  });

  it('membawa identitas & lingkup perikatan', () => {
    const r = build();
    expect(r.scope).toBe('engagement');
    expect(r.scopeId).toBe('ENG-2025-014');
    expect(r.fileName).toContain('PT Sentosa Makmur Tbk');
  });

  it('tujuh sheet, tiap sheet punya kolom & lebar yang selaras', () => {
    const r = build();
    expect(r.sheets.map((s) => s.name)).toEqual([
      'Ringkasan', 'Jembatan Progres', 'Fase', 'Tim', 'Jalur Kritis', 'Risiko Signifikan', 'Kesiapan Opini',
    ]);
    r.sheets.forEach((s) => {
      expect(s.colWidths.length, `${s.name}: lebar kolom ≠ jumlah kolom`).toBe(s.columns.length);
      s.rows.forEach((row) => expect(row.length, `${s.name}: baris ≠ jumlah kolom`).toBe(s.columns.length));
    });
  });
});

describe('setiap figur membawa BASIS-nya (S11)', () => {
  it('sheet Ringkasan berbentuk Figur | Nilai | Basis, dan basis tak pernah kosong', () => {
    const s = build().sheets[0];
    expect(s.columns).toEqual(['Figur', 'Nilai', 'Basis / cara hitung']);
    expect(s.rows.length).toBeGreaterThan(10);
    s.rows.forEach((row) => {
      expect(String(row[0]).length, 'nama figur kosong').toBeGreaterThan(2);
      expect(String(row[2]).length, `basis kosong untuk "${row[0]}"`).toBeGreaterThan(8);
    });
  });

  it('WIP menyebut tarif charge-out; biaya waktu menyebut tarif biaya', () => {
    const s = build().sheets[0];
    const wipRow = s.rows.find((r) => String(r[0]).startsWith('WIP @ tarif standar'));
    const costRow = s.rows.find((r) => String(r[0]).startsWith('Biaya waktu'));
    expect(String(wipRow?.[2])).toMatch(/charge-out|WIP_BILL/);
    expect(String(costRow?.[2])).toMatch(/tarif biaya|WIP_COST/);
    expect(wipRow?.[1]).not.toBe(costRow?.[1]);
  });

  it('progres terbukti & di-assert disebut sebagai dua sumber, bukan satu angka', () => {
    const s = build().sheets[0];
    const proven = s.rows.find((r) => String(r[0]).startsWith('Progres terbukti'));
    const asserted = s.rows.find((r) => String(r[0]).startsWith('Progres di-assert'));
    const gap = s.rows.find((r) => String(r[0]).startsWith('Selisih'));
    expect(String(asserted?.[2])).toMatch(/sumber independen/);
    expect(String(gap?.[2])).toMatch(/TIDAK dipecah/);
    expect(proven?.[1]).toBe('20%');   // 10 dari 50 WP × 3 tonggak penuh
  });
});

describe('angka berkas = angka layar, tanpa hitung ulang', () => {
  it('meta memuat progres terbukti, asersi & selisih yang sama', () => {
    const i = input();
    const r = buildCockpitStatusReport(i, RISKS);
    expect(r.meta.join(' ')).toContain(`Progres TERBUKTI ${i.overall}%`);
    expect(r.meta.join(' ')).toContain('di-assert manajer 62%');
    expect(r.meta.join(' ')).toContain(`${(i.bridge.gapPp ?? 0).toFixed(1)} pp`);
  });

  it('baris jembatan = baris tonggak layar + total + selisih', () => {
    const i = input();
    const s = buildCockpitStatusReport(i, RISKS).sheets[1];
    expect(s.rows).toHaveLength(i.bridge.rows.length + 2);
    expect(String(s.rows[s.rows.length - 2][3])).toBe(`${i.bridge.provenPct.toFixed(1)}%`);
  });

  it('baris tim = anggota roster, dengan util perikatan DAN firma terpisah', () => {
    const i = input();
    const s = buildCockpitStatusReport(i, RISKS).sheets[3];
    expect(s.rows).toHaveLength(i.econ.members.length);
    expect(s.columns).toContain('Util perikatan');
    expect(s.columns).toContain('Util firma');
    expect(s.columns).toContain('Tarif charge-out');
    expect(s.columns).toContain('Tarif biaya');
  });

  it('baris jalur kritis = milestone layar, dengan dasar tanggalnya', () => {
    const i = input();
    const s = buildCockpitStatusReport(i, RISKS).sheets[4];
    expect(s.rows).toHaveLength(i.milestones.length);
    expect(s.columns).toContain('Dasar tanggal');
  });

  it('baris kesiapan = kriteria gerbang kanonik yang sama', () => {
    const i = input();
    const s = buildCockpitStatusReport(i, RISKS).sheets[6];
    expect(s.rows).toHaveLength(i.gateCriteria.length);
    expect(s.heading).toMatch(/1\/2 prasyarat/);
  });

  it('risiko membawa cakupan berkunci — dan yang tanpa program tak mengarang', () => {
    const s = build().sheets[5];
    const r01 = s.rows.find((r) => r[0] === 'R-01');
    const r99 = s.rows.find((r) => r[0] === 'R-99');
    expect(r01?.[5]).toBe('1/2');
    expect(r01?.[6]).toBe('Belum tuntas');   // 1 dari 2 prosedur — bukan "tuntas"
    expect(r01?.[7]).toBe(2);
    expect(r99?.[5]).toBe(NOT_MEASURED);
    expect(r99?.[6]).toBe(NOT_MEASURED);
  });
});

describe('tak terukur diekspor sebagai "—", bukan nol', () => {
  const tanpaRoster = () => {
    const econ = cockpitEconomics({
      ew: null, fallbackBudgetHrs: 2200, fallbackActualHrs: 615, fee: 720_000_000,
      firmTeam: [], workpapers: [], procs: [],
    });
    return build({ econ });
  };

  it('perikatan tanpa roster: WIP, biaya & margin "—"', () => {
    const s = tanpaRoster().sheets[0];
    const val = (k: string) => s.rows.find((r) => String(r[0]).startsWith(k))?.[1];
    expect(val('WIP @ tarif standar')).toBe(NOT_MEASURED);
    expect(val('Biaya waktu')).toBe(NOT_MEASURED);
    expect(val('Margin rencana')).toBe(NOT_MEASURED);
    expect(val('Jam aktual')).toBe(615);     // total tetap terukur dari seed
  });

  it('sheet Tim kosong & judulnya mengatakan mengapa', () => {
    const s = tanpaRoster().sheets[3];
    expect(s.rows).toEqual([]);
    expect(s.heading).toMatch(/TAK TERUKUR/);
  });

  it('meta memberi tahu pembaca arti sel "—"', () => {
    expect(build().meta.join(' ')).toMatch(/TAK TERUKUR, bukan nol/);
  });

  it('tanpa tanggal mulai, sheet Ringkasan menulis "—" dan menyebut sebabnya', () => {
    const s = build({ start: null }).sheets[0];
    const row = s.rows.find((r) => String(r[0]).startsWith('Tanggal mulai'));
    expect(row?.[1]).toBe(NOT_MEASURED);
    expect(String(row?.[2])).toMatch(/tak ada sumber/);
  });
});
