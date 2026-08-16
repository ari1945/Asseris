/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-6 · SC-3 · SC-14 · SC-15.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import './data_fpm';
import { pipelineSeed } from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import {
  LOSS_REASON_PRESETS, LOSS_REASON_UNRECORDED, WIN_REASON_PRESETS,
  decidedAt, lastQuarters, lossReasons, moveWithHistory, quarterOf, quarterStart, winLossByQuarter,
} from './canon_pipeline_lifecycle';
import type { ClientRow, PipelineOpp } from './ams_types';

const TODAY = AMS.TODAY;
const REG: Opportunity[] = pipelineSeed({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: AMS.CLIENTS as ClientRow[],
});
const read = (f: string) => readFileSync(join(__dirname, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, ' ');

describe('SC-3 — BI_WINLOSS literal DICABUT, analitik diturunkan', () => {
  it('literalnya benar-benar hilang dari data & tak ada yang membacanya', () => {
    const fpm = read('data_fpm.ts');
    expect(fpm).not.toMatch(/BI_WINLOSS\s*=/);
    expect(fpm).not.toMatch(/lossReasons:\s*\[/);
    expect(read('view_bi2.tsx')).not.toMatch(/AMS\.BI_WINLOSS/);
    expect((AMS as unknown as Record<string, unknown>).BI_WINLOSS).toBeUndefined();
  });

  it('kuartal dihitung dari TANGGAL KEPUTUSAN, bukan dari daftar tetap', () => {
    expect(quarterOf('2026-03-01')).toBe('2026-Q1');
    expect(quarterOf('2025-12-12')).toBe('2025-Q4');
    expect(quarterOf('2025-07-01')).toBe('2025-Q3');
    expect(quarterOf('')).toBeNull();
    expect(quarterStart('2025-Q3')).toBe('2025-07-01');
    expect(quarterStart('2026-Q1')).toBe('2026-01-01');
  });

  it('lastQuarters mundur melintasi batas tahun', () => {
    expect(lastQuarters('2026-03-09', 4)).toEqual(['2025-Q2', '2025-Q3', '2025-Q4', '2026-Q1']);
  });

  it('win/loss per kuartal punya ISI di seed (backfill Q-5a) dan menutup ke populasi', () => {
    const qs = lastQuarters(TODAY, 4);
    const rows = winLossByQuarter(REG, qs);
    const total = rows.reduce((s, r) => s + r.won + r.lost, 0);
    expect(total).toBeGreaterThan(0);
    /* setiap keputusan di jendela itu terhitung TEPAT sekali */
    const inWindow = REG.filter((o) => {
      const q = quarterOf(decidedAt(o) || '');
      return !!q && qs.includes(q);
    });
    expect(total).toBe(inWindow.length);
    rows.forEach((r) => {
      if (r.won + r.lost === 0) expect(r.winRate).toBeNull();
      else expect(r.winRate).toBe(Math.round(r.won / (r.won + r.lost) * 100));
    });
  });

  it('kuartal tanpa keputusan ⇒ winRate null, BUKAN 0% yang menyesatkan', () => {
    const rows = winLossByQuarter(REG, ['2019-Q1']);
    expect(rows[0]).toMatchObject({ won: 0, lost: 0, winRate: null });
  });

  it('alasan kalah dari peristiwa TERCATAT, bukan daftar literal', () => {
    const rs = lossReasons(REG);
    expect(rs.length).toBeGreaterThan(0);
    rs.forEach((r) => {
      expect(r.n).toBeGreaterThan(0);
      expect(r.value).toBeGreaterThan(0);
    });
    /* jumlah peluang pada seluruh alasan = jumlah peluang Lost */
    expect(rs.reduce((s, r) => s + r.n, 0)).toBe(REG.filter((o) => o.stage === 'Lost').length);
  });

  it('kalah TANPA alasan tercatat MUNCUL sebagai "Tidak dicatat", tidak disembunyikan', () => {
    const tanpaAlasan: Opportunity = {
      ...REG.find((o) => o.stage === 'Lost')!,
      id: 'OPP-TANPA', history: [{ stage: 'Lost', at: '2026-02-01', by: 'X' }],
    };
    const rs = lossReasons([tanpaAlasan]);
    expect(rs).toHaveLength(1);
    expect(rs[0].reason).toBe(LOSS_REASON_UNRECORDED);
  });

  it('jendela periode dihormati', () => {
    expect(lossReasons(REG, '2019-01-01', '2019-12-31')).toHaveLength(0);
    expect(lossReasons(REG, '2025-01-01', TODAY).length).toBeGreaterThan(0);
  });
});

describe('alasan DITANGKAP saat transisi', () => {
  it('moveWithHistory menyimpan alasan pada peristiwa Lost', () => {
    const o = REG.find((x) => x.stage === 'Negotiation')!;
    const kalah = moveWithHistory(o, 'Lost', { by: 'Rudi', at: TODAY, reason: LOSS_REASON_PRESETS[0] + ' — pesaing 12% lebih murah' });
    const last = kalah.history![kalah.history!.length - 1];
    expect(last.stage).toBe('Lost');
    expect(last.reason).toMatch(/Imbalan/);
    /* dan analitiknya langsung memungutnya */
    expect(lossReasons([kalah])[0].reason).toBe(last.reason);
  });

  it('taksonomi tertutup tersedia untuk kedua arah keputusan', () => {
    expect(LOSS_REASON_PRESETS.length).toBeGreaterThan(3);
    expect(WIN_REASON_PRESETS.length).toBeGreaterThan(3);
    expect(new Set<string>(LOSS_REASON_PRESETS).size).toBe(LOSS_REASON_PRESETS.length);
  });
});

describe('SC-14 — papan dapat dioperasikan keyboard', () => {
  const src = read('view_pipeline.tsx');

  it('kartu peluang adalah <button> native, bukan <div onClick>', () => {
    expect(src).toMatch(/<button[^>]*className="panel opp-card"/);
    expect(src).not.toMatch(/<div key=\{o\.id\} className="panel" draggable/);
  });

  it('kartu membawa nama yang dapat dibacakan (gerbang axe button-name)', () => {
    expect(src).toMatch(/aria-label=\{`\$\{o\.name\}/);
  });

  it('ADA jalur pindah-tahap tanpa drag: select native di sheet detail', () => {
    expect(src).toMatch(/Pindahkan ke tahap/);
    expect(src).toMatch(/PIPE_STAGES\.map\(\(st\) => <option/);
  });

  it('cincin fokus kartu tidak dimatikan', () => {
    const css = readFileSync(join(__dirname, 'styles_chrome.css'), 'utf8');
    expect(css).toMatch(/\.opp-card:focus-visible/);
    expect(css).not.toMatch(/\.opp-card[^{]*\{[^}]*outline:\s*none/);
  });
});

describe('SC-15 — sheet detail beralamat', () => {
  const src = read('view_pipeline.tsx');

  it('seleksi disemai dari hash & ditulis balik saat dibuka/ditutup', () => {
    expect(src).toMatch(/useInitialSelection\('pipeline'\)/);
    expect(src).toMatch(/nav\('pipeline',\s*\{\s*sel:\s*id\s*\}\)/);
    expect(src).toMatch(/nav\('pipeline',\s*\{\s*sel:\s*null\s*\}\)/);
  });

  it('kartu membuka lewat openDetail (yang beralamat), bukan setDetail telanjang', () => {
    expect(src).toMatch(/onClick=\{\(\) => openDetail\(o\.id\)\}/);
  });
});
