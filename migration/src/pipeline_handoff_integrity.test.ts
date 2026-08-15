/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-3 · SC-6.

   Serah-terima lama mengarang tiga field dan gagal senyap pada yang keempat.
   Uji di bawah menembak keempatnya atas SEED NYATA.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import './data_fpm';
import { pipelineSeed } from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import type { ProspectLike } from './canon_pipeline_acceptance';
import { applyHandoff, blankFactors, partnerFromRoster, planHandoff, standardFor } from './canon_pipeline_handoff';
import type { ClientRow, PipelineOpp, StaffRow } from './ams_types';

const PROSPECTS = (AMS as unknown as { PROSPECTS: ProspectLike[] }).PROSPECTS;
const STAFF = (AMS.STAFF || []) as StaffRow[];
const CLIENTS = AMS.CLIENTS as ClientRow[];
const FACTORS = PROSPECTS[0].acceptance!.factors!;

const REG: Opportunity[] = pipelineSeed({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: CLIENTS,
});
const opp = (id: string) => REG.find((o) => o.id === id)!;
const ctx = (prospects: ProspectLike[] = PROSPECTS) => ({ prospects, clients: CLIENTS, staff: STAFF, factorTemplate: FACTORS });

/** Peluang intake yang BELUM punya prospek pada seed. */
const FRESH = () => opp('OPP-102');

describe('SC-6a — materialitas tidak lagi diturunkan dari fee', () => {
  it('prospek hasil serah-terima TIDAK membawa angka materialitas', () => {
    const plan = planHandoff(FRESH(), ctx());
    expect(plan.kind).toBe('buat');
    expect((plan.draft as unknown as { materiality: number | null }).materiality).toBeNull();
  });

  it('CACAT LAMA: value × 2,5 menghasilkan angka yang TERLIHAT masuk akal', () => {
    /* Justru itu bahayanya: 2,5 adalah rata-rata rasio seed (2,66 · 2,11 · 2,37),
       sehingga hasilnya berada di rentang yang sama dengan materialitas nyata dan
       tak pernah mencurigakan. */
    const o = FRESH();
    const plug = Math.round(o.value * 2.5);
    const nyata = PROSPECTS.map((p) => ({ fee: p.fee || 0, m: (p as unknown as { materiality: number }).materiality }))
      .filter((x) => x.fee > 0 && x.m > 0).map((x) => x.m / x.fee);
    const lo = Math.min(...nyata), hi = Math.max(...nyata);
    expect(plug / o.value).toBeGreaterThan(lo);
    expect(plug / o.value).toBeLessThan(hi);
  });

  it('alasan pengosongan disebut, bukan dibiarkan sebagai nol diam-diam', () => {
    const plan = planHandoff(FRESH(), ctx());
    const m = plan.unset.find((u) => /Materialitas/i.test(u.field));
    expect(m).toBeTruthy();
    expect(m!.reason).toMatch(/benchmark/i);
    expect(m!.reason).toMatch(/bukan dari fee/i);
  });
});

describe('SC-6b — partner dari roster, bukan gelar yang ditempelkan', () => {
  it('Bayu Saputra (Audit Manager) TIDAK diangkat jadi partner meski ber-CPA', () => {
    const bayu = STAFF.find((s) => s.name === 'Bayu Saputra')!;
    expect(bayu.role).toBe('Audit Manager');
    expect(bayu.cert).toContain('CPA');            /* punya CPA, tetap bukan Partner */
    const r = partnerFromRoster('Bayu Saputra', STAFF);
    expect(r.partner).toBeNull();
    expect(r.manager).toBe('Bayu Saputra');
    expect(r.why).toMatch(/bukan Partner/i);
    expect(r.why).toMatch(/SA 220\.14/);
    /* CACAT LAMA menghasilkan "Bayu Saputra, CPA" sebagai Engagement Partner. */
    expect(r.partner).not.toBe('Bayu Saputra, CPA');
  });

  it('Partner sungguhan dipakai dengan gelar yang TERCATAT di roster', () => {
    const r = partnerFromRoster('Sari Dewanti', STAFF);
    const sari = STAFF.find((s) => s.name === 'Sari Dewanti')!;
    expect(r.partner).toBe('Sari Dewanti, ' + sari.cert.split(',')[0].trim());
    expect(r.why).toContain(sari.id);
  });

  it('nama yang tak ada di roster TIDAK diberi gelar karangan', () => {
    const r = partnerFromRoster('Orang Tak Terdaftar', STAFF);
    expect(r.partner).toBeNull();
    expect(r.why).toMatch(/tidak ditemukan di roster/i);
  });

  it('peluang milik non-Partner: partner kosong + alasannya masuk daftar unset', () => {
    const o: Opportunity = { ...FRESH(), owner: 'Bayu Saputra' };
    const plan = planHandoff(o, ctx());
    expect((plan.draft as unknown as { partner: string | null }).partner).toBeNull();
    expect((plan.draft as unknown as { manager: string | null }).manager).toBe('Bayu Saputra');
    expect(plan.unset.some((u) => /Partner/i.test(u.field))).toBe(true);
  });
});

describe('SC-6c — duplikat DITOLAK DENGAN PESAN, tidak senyap', () => {
  it('peluang yang prospeknya sudah ada tidak membuat apa pun & menyebut PROS-nya', () => {
    const plan = planHandoff(opp('OPP-101'), ctx());       /* PROS-03 sudah ada */
    expect(plan.kind).toBe('sudah-ada');
    expect(plan.existing!.id).toBe('PROS-03');
    expect(plan.message).toContain('PROS-03');
    expect(applyHandoff(plan, PROSPECTS)).toBeNull();       /* tak ada tulisan */
  });

  it('4 peluang seed memang sudah punya prospek — cacat lama menyentuh mayoritas', () => {
    const sudah = REG.filter((o) => planHandoff(o, ctx()).kind === 'sudah-ada');
    expect(sudah.map((o) => o.id).sort()).toEqual(['OPP-101', 'OPP-103', 'OPP-104', 'OPP-105', 'OPP-107']);
  });

  it('applyHandoff idempoten — klik dua kali tidak menggandakan prospek', () => {
    const plan = planHandoff(FRESH(), ctx());
    const after = applyHandoff(plan, PROSPECTS)!;
    expect(after).toHaveLength(PROSPECTS.length + 1);
    expect(applyHandoff(plan, after)).toBeNull();
  });

  it('setiap rencana SELALU membawa pesan — kegagalan tak boleh tak terlihat', () => {
    REG.forEach((o) => expect(planHandoff(o, ctx()).message.trim().length, o.id).toBeGreaterThan(0));
  });
});

describe('SC-6d — cross-sell diarahkan ke keberlanjutan, bukan bikin klien ganda', () => {
  it('peluang atas klien eksisting DITOLAK dengan alasan standar', () => {
    const plan = planHandoff(opp('OPP-210'), ctx());
    expect(plan.kind).toBe('tolak');
    expect(plan.draft).toBeNull();
    expect(plan.message).toMatch(/KEBERLANJUTAN/);
    expect(applyHandoff(plan, PROSPECTS)).toBeNull();
  });
});

describe('lain-lain', () => {
  it('standar profesi mengikuti jenis jasa, bukan tebakan substring longgar', () => {
    expect(standardFor('Review (SPR 2400)')).toBe('SPR 2400');
    expect(standardFor('Due Diligence')).toBe('SJAH 3000');
    expect(standardFor('Agreed-Upon Procedures')).toBe('SJAT 4400');
    expect(standardFor('Audit Laporan Keuangan')).toBe('SA');
    expect(standardFor('Audit + Tax')).toBe('SA');
  });

  it('faktor akseptasi lahir KOSONG (skor default tanpa catatan = belum dinilai)', () => {
    const f = blankFactors(FACTORS);
    expect(f).toHaveLength(FACTORS.length);
    f.forEach((x, i) => {
      expect(x.k).toBe(FACTORS[i].k);
      expect(x.w).toBe(FACTORS[i].w);
      expect(x.note).toBe('');
    });
  });

  it('prospek baru membawa lineage `source` sehingga tautannya bukan tebakan nama', () => {
    const plan = planHandoff(FRESH(), ctx());
    expect(plan.draft!.source).toBe('OPP-102');
    expect(plan.draft!.fee).toBe(FRESH().value);
  });
});

describe('gerbang anti-kambuh atas sumber', () => {
  const read = async (f: string) => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    return readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
  };

  it('view_pipeline tak lagi mengarang materialitas / gelar / jam anggaran', async () => {
    const src = await read('view_pipeline.tsx');
    expect(src).not.toMatch(/value\s*\*\s*2\.5/);
    expect(src).not.toMatch(/\+\s*', CPA'/);
    expect(src).not.toMatch(/PIPELINE_BUDGET_RATE/);
    expect(src).not.toMatch(/amsAddProspect/);
  });

  it('jalur tulis prospek lewat useAmsPersist, bukan localStorage mentah', async () => {
    const ob = await read('view_onboarding.tsx');
    expect(ob).not.toMatch(/localStorage\.setItem\(\s*k\s*,/);
    expect(ob).not.toMatch(/window as any\)\.amsAddProspect/);
    const pipe = await read('view_pipeline.tsx');
    expect(pipe).toMatch(/useAmsPersist\(\s*'prospects'/);
  });

  it('serah-terima TIDAK menggeser tahap peluang ke Won', async () => {
    const src = await read('view_pipeline.tsx');
    const body = src.slice(src.indexOf('const toOnboarding'), src.indexOf('const readiness'));
    expect(body).not.toMatch(/onMove\(/);
  });
});
