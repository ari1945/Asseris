/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-5 · SC-7 & SC-8.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_fpm';
import { FIRMFIN } from './data_firmfin';
import { pipelineSeed } from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import {
  BLENDED_MIX, DEFAULT_DURATION_WEEKS, GRADE_ROLE, blendedRate,
  demandSplit, effortPlan, feeBasis, rateFor,
} from './canon_pipeline_fee';
import { pipelineDemand } from './canon_capacity';
import type { ClientRow, PipelineOpp } from './ams_types';

const RATES = (FIRMFIN && FIRMFIN.WIP_BILL) as Record<string, number>;
const REG: Opportunity[] = pipelineSeed({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: AMS.CLIENTS as ClientRow[],
});
const opp = (id: string) => REG.find((o) => o.id === id)!;

describe('SC-7 — SATU tarif untuk SATU konversi nilai→jam', () => {
  it('tarif diambil dari FIRMFIN.WIP_BILL, bukan konstanta lepas', () => {
    (Object.keys(GRADE_ROLE) as (keyof typeof GRADE_ROLE)[]).forEach((g) => {
      expect(rateFor(g, RATES), g).toBe(RATES[GRADE_ROLE[g]]);
      expect(rateFor(g, RATES)).toBeGreaterThan(0);
    });
  });

  it('tarif blended DITURUNKAN dari tarif firma — bukan 800.000 yang dipaku', () => {
    const b = blendedRate(RATES);
    const grades = BLENDED_MIX.map((m) => rateFor(m.grade, RATES));
    expect(b).toBeGreaterThan(Math.min(...grades));
    expect(b).toBeLessThan(Math.max(...grades));
    /* Bergerak bila tarif firma bergerak — inilah bedanya dengan konstanta. */
    const naik: Record<string, number> = {};
    Object.keys(RATES).forEach((k) => { naik[k] = RATES[k] * 2; });
    expect(blendedRate(naik)).toBe(b * 2);
  });

  it('DUA konstanta lepas yang lama sudah tidak ada di sumber', () => {
    const cap = readFileSync(join(__dirname, 'canon_capacity.ts'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    const pipe = readFileSync(join(__dirname, 'view_pipeline.tsx'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');
    expect(cap).not.toMatch(/CAP_BLENDED_RATE\s*=/);
    expect(cap).not.toMatch(/800_000/);
    expect(pipe).not.toMatch(/PIPELINE_BUDGET_RATE/);
    expect(pipe).not.toMatch(/700_000/);
  });
});

describe('build-up: nilai yang dapat dipertanggungjawabkan', () => {
  it('peluang ber-build-up menutup ke jam × tarif', () => {
    const fb = feeBasis(opp('OPP-103'), RATES);
    expect(fb.basis).toBe('tercatat');
    const manual = opp('OPP-103').buildUp!.reduce((s, l) => s + l.hours * rateFor(l.grade, RATES), 0);
    expect(fb.standard).toBe(manual);
    expect(fb.hours).toBe(opp('OPP-103').buildUp!.reduce((s, l) => s + l.hours, 0));
    expect(fb.lines).toHaveLength(4);
  });

  it('realisasi mengungkap diskon terhadap tarif standar', () => {
    const fb = feeBasis(opp('OPP-103'), RATES);
    expect(fb.realizationPct).toBe(Math.round(fb.quoted / fb.standard! * 100));
    expect(fb.effectiveRate).toBe(Math.round(fb.quoted / fb.hours!));
    /* seed sengaja menawarkan di bawah tarif standar — itulah yang harus terlihat */
    expect(fb.realizationPct!).toBeLessThan(100);
  });

  it('peluang tanpa build-up ditandai `tanpa-dasar`, BUKAN diberi angka karangan', () => {
    const fb = feeBasis(opp('OPP-102'), RATES);
    expect(fb.basis).toBe('tanpa-dasar');
    expect(fb.hours).toBeNull();
    expect(fb.standard).toBeNull();
    expect(fb.realizationPct).toBeNull();
    expect(fb.quoted).toBe(opp('OPP-102').value);
  });

  it('baris berjam nol diabaikan (bukan dihitung sebagai build-up)', () => {
    const o: Opportunity = { ...opp('OPP-102'), buildUp: [{ grade: 'Senior', hours: 0 }] };
    expect(feeBasis(o, RATES).basis).toBe('tanpa-dasar');
  });
});

describe('SC-8 — kapasitas memakai yang TERCATAT, estimasi ditandai', () => {
  it('peluang ber-build-up: jam & durasi DIBACA, bukan ditebak', () => {
    const o = opp('OPP-103');
    const ep = effortPlan(o, RATES);
    expect(ep.estimated).toBe(false);
    expect(ep.hours).toBe(o.buildUp!.reduce((s, l) => s + l.hours, 0));
    expect(ep.weeks).toBe(o.durationWeeks);
    expect(ep.start).toBe(o.startPlanned);
    expect(ep.hrsPerWeek).toBe(Math.round(ep.hours / ep.weeks));
    expect(ep.basis).toMatch(/build-up/);
  });

  it('peluang tanpa build-up: estimasi, DITANDAI, dan basisnya disebut', () => {
    const ep = effortPlan(opp('OPP-102'), RATES);
    expect(ep.estimated).toBe(true);
    expect(ep.weeks).toBe(DEFAULT_DURATION_WEEKS);
    expect(ep.basis).toMatch(/^ESTIMASI/);
    expect(ep.basis).toMatch(/tarif blended/);
  });

  it('build-up tanpa durasi/mulai tercatat TETAP ditandai estimasi (sebagian)', () => {
    const o: Opportunity = { ...opp('OPP-103'), durationWeeks: undefined, startPlanned: undefined };
    const ep = effortPlan(o, RATES);
    expect(ep.estimated).toBe(true);
    expect(ep.basis).toMatch(/durasi diasumsikan/);
    expect(ep.basis).toMatch(/mulai diasumsikan/);
  });

  it('demand DIPISAH tercatat vs estimasi — tidak dicampur diam-diam (Q-3a)', () => {
    const s = demandSplit(REG, RATES);
    expect(s.recordedCount).toBeGreaterThan(0);
    expect(s.estimatedCount).toBeGreaterThan(0);
    expect(s.total).toBe(s.recorded + s.estimated);
    /* hanya peluang terbuka yang menyumbang */
    const terbuka = REG.filter((o) => o.stage !== 'Won' && o.stage !== 'Lost' && o.prob > 0 && o.value > 0);
    expect(s.recordedCount + s.estimatedCount).toBe(terbuka.length);
  });

  it('pipelineDemand membawa penanda `estimated` ke lapisan kapasitas', () => {
    const d = pipelineDemand(REG, RATES);
    expect(d.length).toBeGreaterThan(0);
    d.forEach((x) => {
      expect(typeof x.estimated).toBe('boolean');
      expect(String(x.basis).length).toBeGreaterThan(0);
    });
    expect(d.some((x) => x.estimated === false)).toBe(true);
    expect(d.some((x) => x.estimated === true)).toBe(true);
  });

  it('jam kapasitas untuk peluang ber-build-up TIDAK sama dengan tebakan lama', () => {
    /* Rumus lama: value / 800_000 / 24. Bila hasilnya kebetulan sama, uji ini
       tak membuktikan apa pun — jadi pastikan memang berbeda. */
    const o = opp('OPP-103');
    const lama = Math.max(1, Math.round(o.value / 800_000 / 24));
    const baru = pipelineDemand([o], RATES)[0].hrs;
    expect(baru).not.toBe(lama);
    expect(baru).toBe(Math.round(o.buildUp!.reduce((s, l) => s + l.hours, 0) / o.durationWeeks!));
  });

  it('peluang tertutup tak pernah menyumbang kebutuhan', () => {
    expect(pipelineDemand(REG.filter((o) => o.stage === 'Won' || o.stage === 'Lost'), RATES)).toHaveLength(0);
    const s = demandSplit(REG.filter((o) => o.stage === 'Won'), RATES);
    expect(s.total).toBe(0);
  });
});
