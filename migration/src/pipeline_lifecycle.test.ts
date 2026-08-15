/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-4 · SC-11 · SC-12 · SC-13.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
import './data_fpm';
import { PIPE_OPEN_STAGES, openOpportunities, pipelineSeed, weightedValue } from './canon_pipeline';
import type { Crm360Entry, Opportunity, PipeStage } from './canon_pipeline';
import {
  PROB_TOLERANCE, STAGE_DEFAULT_PROB, STALL_DAYS, ageDays, daysBetween, daysInStage,
  decidedAt, enteredStageAt, isOverdue, moveWithHistory, openedAt, probCheck,
  stageFlow, stallInfo, winLossBetween, yearStart,
} from './canon_pipeline_lifecycle';
import type { ClientRow, PipelineOpp } from './ams_types';

const TODAY = AMS.TODAY;
const REG: Opportunity[] = pipelineSeed({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: AMS.CLIENTS as ClientRow[],
});
const opp = (id: string) => REG.find((o) => o.id === id)!;

describe('SC-11 — riwayat tahap adalah DATA, dan turunannya punya isi', () => {
  it('setiap peluang seed membawa riwayat (backfill Q-4)', () => {
    REG.forEach((o) => {
      expect(o.history, o.id).toBeTruthy();
      expect(o.history!.length, o.id).toBeGreaterThan(0);
    });
  });

  it('riwayat berurut menaik & berakhir pada tahap berjalan', () => {
    REG.forEach((o) => {
      const h = o.history!;
      for (let i = 1; i < h.length; i++) expect(h[i].at >= h[i - 1].at, `${o.id} ${h[i].stage}`).toBe(true);
      expect(h[h.length - 1].stage, o.id).toBe(o.stage);
    });
  });

  it('umur & waktu-di-tahap terhitung, bukan "—"', () => {
    const o = opp('OPP-103');
    expect(openedAt(o)).toBe('2025-10-06');
    expect(enteredStageAt(o)).toBe('2026-02-18');
    expect(ageDays(o, TODAY)).toBe(daysBetween('2025-10-06', TODAY));
    expect(daysInStage(o, TODAY)).toBe(daysBetween('2026-02-18', TODAY));
  });

  it('tanpa riwayat, turunan mengembalikan null — TIDAK menebak nol', () => {
    const kosong = { ...opp('OPP-103'), history: undefined };
    expect(ageDays(kosong, TODAY)).toBeNull();
    expect(daysInStage(kosong, TODAY)).toBeNull();
    expect(stallInfo(kosong, TODAY).stalled).toBe(false);
  });

  it('macet = melewati ambang PER TAHAP, dan seed memang punya kasusnya', () => {
    const macet = openOpportunities(REG).filter((o) => stallInfo(o, TODAY).stalled);
    expect(macet.length).toBeGreaterThan(0);
    macet.forEach((o) => {
      const si = stallInfo(o, TODAY);
      expect(si.days!, o.id).toBeGreaterThan(STALL_DAYS[o.stage as PipeStage]);
    });
    /* peluang tertutup tak pernah "macet" */
    REG.filter((o) => o.stage === 'Won' || o.stage === 'Lost')
      .forEach((o) => expect(stallInfo(o, TODAY).stalled, o.id).toBe(false));
  });

  it('conversion antar-tahap diturunkan dari riwayat, bukan cuplikan hari ini', () => {
    const flows = stageFlow(REG);
    expect(flows.map((f) => f.stage)).toEqual(PIPE_OPEN_STAGES);
    flows.forEach((f) => {
      expect(f.advanced).toBeLessThanOrEqual(f.entered);
      if (f.entered) expect(f.conversion).toBe(Math.round(f.advanced / f.entered * 100));
    });
    /* Lead pernah dimasuki SEMUA peluang seed — cuplikan hari ini hanya 2. */
    expect(flows.find((f) => f.stage === 'Lead')!.entered).toBe(REG.length);
    expect(REG.filter((o) => o.stage === 'Lead').length).toBeLessThan(REG.length);
  });

  it('Lost TIDAK dihitung sebagai maju', () => {
    const o106 = opp('OPP-106');                       /* Proposal → Lost */
    const flows = stageFlow([o106]);
    const prop = flows.find((f) => f.stage === 'Proposal')!;
    expect(prop.entered).toBe(1);
    expect(prop.advanced).toBe(0);
  });
});

describe('SC-13 — win rate PER PERIODE & forecast basi', () => {
  it('keputusan menang/kalah punya tanggal', () => {
    expect(decidedAt(opp('OPP-105'))).toBe('2026-03-01');
    expect(decidedAt(opp('OPP-106'))).toBe('2026-02-15');
    expect(decidedAt(opp('OPP-103'))).toBeNull();      /* masih terbuka */
  });

  it('win rate YTD hanya menghitung keputusan DI DALAM periode', () => {
    const ytd = winLossBetween(REG, yearStart(TODAY), TODAY);
    expect(ytd.won).toBe(1);                            /* OPP-105 (1 Mar) */
    expect(ytd.lost).toBe(2);                           /* OPP-106 & OPP-214 (Feb) */
    expect(ytd.winRate).toBe(33);
    /* periode tanpa keputusan ⇒ null, BUKAN 0% yang menyesatkan */
    expect(winLossBetween(REG, '2020-01-01', '2020-12-31').winRate).toBeNull();
  });

  it('peluang lewat target close ditandai — dan seed punya kasusnya setelah waktu berjalan', () => {
    expect(isOverdue(opp('OPP-103'), '2026-05-01')).toBe(true);   /* close 2026-04-10 */
    expect(isOverdue(opp('OPP-103'), TODAY)).toBe(false);
    expect(isOverdue(opp('OPP-105'), '2027-01-01')).toBe(false);  /* Won tak pernah basi */
  });
});

describe('SC-12 — disiplin probabilitas', () => {
  it('tiap tahap punya default, dan seed sebagian besar mengikutinya', () => {
    PIPE_OPEN_STAGES.forEach((s) => expect(STAGE_DEFAULT_PROB[s]).toBeGreaterThan(0));
    const menyimpang = openOpportunities(REG).filter((o) => probCheck(o).deviates);
    expect(menyimpang.length).toBeLessThan(openOpportunities(REG).length);
  });

  it('penyimpangan di luar toleransi ditandai; tanpa alasan ⇒ unexplained', () => {
    const base = opp('OPP-102');                        /* Lead, default 20 */
    const liar = { ...base, prob: 90 };
    const p = probCheck(liar);
    expect(p.expected).toBe(20);
    expect(p.delta).toBe(70);
    expect(p.deviates).toBe(true);
    expect(p.unexplained).toBe(true);
  });

  it('penyimpangan BERALASAN tetap ditandai menyimpang, tapi tidak unexplained', () => {
    const base = opp('OPP-102');
    const beralasan: Opportunity = {
      ...base, prob: 90,
      history: [{ stage: 'Lead', at: '2026-01-22', by: 'Sari Dewanti', prob: 90, reason: 'Komitmen lisan direktur; kontrak menunggu tanda tangan.' }],
    };
    const p = probCheck(beralasan);
    expect(p.deviates).toBe(true);
    expect(p.unexplained).toBe(false);
    expect(p.reason).toMatch(/Komitmen lisan/);
  });

  it('selisih dalam toleransi TIDAK diributkan', () => {
    const o = { ...opp('OPP-102'), prob: STAGE_DEFAULT_PROB.Lead + PROB_TOLERANCE };
    expect(probCheck(o).deviates).toBe(false);
  });
});

describe('moveWithHistory — perpindahan yang mencatat & memulihkan', () => {
  it('mencatat siapa, kapan, dan tahap tujuan', () => {
    const next = moveWithHistory(opp('OPP-104'), 'Proposal', { by: 'Sari Dewanti', at: '2026-03-09' });
    const last = next.history![next.history!.length - 1];
    expect(next.stage).toBe('Proposal');
    expect(last).toMatchObject({ stage: 'Proposal', at: '2026-03-09', by: 'Sari Dewanti' });
  });

  it('Won ⇒ 100, Lost ⇒ 0 (definisi, bukan taksiran)', () => {
    expect(moveWithHistory(opp('OPP-103'), 'Won', { by: 'x', at: TODAY }).prob).toBe(100);
    expect(moveWithHistory(opp('OPP-103'), 'Lost', { by: 'x', at: TODAY }).prob).toBe(0);
  });

  it('CACAT LAMA DITUTUP: kembali dari Won MEMULIHKAN probabilitas lama', () => {
    /* Terbukti hidup pada verifikasi PR-1: OPP-103 (75%) → Won (100%) → kembali
       ke Negotiation membawa 100%, menaikkan tertimbang firma Rp 320 jt. */
    const asli = opp('OPP-103');
    expect(asli.prob).toBe(75);
    const won = moveWithHistory(asli, 'Won', { by: 'x', at: TODAY });
    const balik = moveWithHistory(won, 'Negotiation', { by: 'x', at: TODAY });
    expect(balik.prob).toBe(75);
    /* perilaku lama menghasilkan 100 — dan itulah yang menggeser forecast */
    expect(balik.prob).not.toBe(100);
    expect(weightedValue([balik])).toBe(weightedValue([asli]));
  });

  it('kembali ke tahap yang belum pernah dikunjungi ⇒ default tahap, bukan 100', () => {
    const won = moveWithHistory(opp('OPP-102'), 'Won', { by: 'x', at: TODAY });   /* hanya pernah Lead */
    const balik = moveWithHistory(won, 'Proposal', { by: 'x', at: TODAY });
    expect(balik.prob).toBe(STAGE_DEFAULT_PROB.Proposal);
  });

  it('maju antar-tahap terbuka: keyakinan tahap lama tidak diwariskan diam-diam', () => {
    const liar = { ...opp('OPP-102'), prob: 95 };       /* Lead 95% */
    const naik = moveWithHistory(liar, 'Qualified', { by: 'x', at: TODAY });
    expect(naik.prob).toBe(STAGE_DEFAULT_PROB.Qualified);
  });

  it('probabilitas eksplisit dihormati', () => {
    const naik = moveWithHistory(opp('OPP-102'), 'Qualified', { by: 'x', at: TODAY, prob: 55, reason: 'RFP diterima' });
    expect(naik.prob).toBe(55);
    expect(naik.history![naik.history!.length - 1].reason).toBe('RFP diterima');
  });

  it('probabilitas tahap yang ditinggalkan ikut terekam', () => {
    const asli = { ...opp('OPP-104'), prob: 48 };
    const next = moveWithHistory(asli, 'Proposal', { by: 'x', at: TODAY });
    const qualified = next.history!.filter((e) => e.stage === 'Qualified').pop()!;
    expect(qualified.prob).toBe(48);
  });
});

describe('gerbang anti-kambuh', () => {
  it('papan memindahkan kartu lewat moveWithHistory, bukan patch stage mentah', async () => {
    const { readFileSync } = await import('node:fs');
    const { join } = await import('node:path');
    const src = readFileSync(join(__dirname, 'view_pipeline.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(src).toMatch(/moveWithHistory/);
    expect(src).not.toMatch(/stage,\s*prob:\s*stage === 'Won' \? 100/);
  });
});
