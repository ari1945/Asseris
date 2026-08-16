/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1.

   Yang diuji: register peluang TUNGGAL — normalisasi cross-sell, penyembuhan
   cache basi, dan turunan yang dulu ditulis ulang di empat berkas berbeda.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { AMS } from './data';
/* CRM_360 di-merge ke AMS oleh IIFE data_fpm (tanpa ekspor) — wajib diimpor
   eksplisit di luar boot aplikasi, kalau tidak register kehilangan cross-sell. */
import './data_fpm';
import {
  PIPE_OPEN_STAGES, byOwner, crossSellOpportunities, grossValue, isClosed,
  mergeSeedOpportunities, monthEnd, newClientOpportunities, nextOppId,
  openOpportunities, opportunitiesForClient, overdueOpportunities,
  pipelineSeed, stageSummary, weightedValue, winLoss, wonYtd,
} from './canon_pipeline';
import type { Crm360Entry, Opportunity } from './canon_pipeline';
import type { ClientRow, PipelineOpp } from './ams_types';

const CTX = () => ({
  pipeline: AMS.PIPELINE as PipelineOpp[],
  crm360: (AMS as unknown as { CRM_360: Record<string, Crm360Entry> }).CRM_360,
  clients: AMS.CLIENTS as ClientRow[],
});

describe('monthEnd — normalisasi tanggal target close', () => {
  it('bulan → hari terakhir bulan itu', () => {
    expect(monthEnd('2026-05')).toBe('2026-05-31');
    expect(monthEnd('2026-04')).toBe('2026-04-30');
    expect(monthEnd('2026-02')).toBe('2026-02-28');
    expect(monthEnd('2024-02')).toBe('2024-02-29');   /* kabisat */
  });
  it('tanggal lengkap tidak diubah', () => {
    expect(monthEnd('2026-04-10')).toBe('2026-04-10');
  });
});

describe('register gabungan', () => {
  it('menggabungkan intake + cross-sell — DUA register jadi SATU', () => {
    const reg = pipelineSeed(CTX());
    const intake = reg.filter((o) => o.origin === 'baru');
    const cross = reg.filter((o) => o.origin === 'cross-sell');
    expect(intake.length).toBe(AMS.PIPELINE.length);
    expect(cross.length).toBeGreaterThan(0);
    expect(reg.length).toBe(intake.length + cross.length);
    /* id unik — dua seed tak boleh bertabrakan */
    expect(new Set(reg.map((o) => o.id)).size).toBe(reg.length);
  });

  it('peluang cross-sell membawa identitas klien dari roster, bukan karangan', () => {
    const cross = crossSellOpportunities(CTX().crm360, CTX().clients);
    const esg = cross.find((o) => o.id === 'OPP-201');
    expect(esg).toBeTruthy();
    const c014 = (AMS.CLIENTS as ClientRow[]).find((c) => c.id === 'C-014')!;
    expect(esg!.name).toBe(c014.name);
    expect(esg!.industry).toBe(c014.industry);
    expect(esg!.clientId).toBe('C-014');
    expect(esg!.service).toBe('ESG Assurance (SJAH 3000)');
    expect(esg!.close).toBe('2026-05-31');          /* '2026-05' dinormalkan */
    expect(esg!.owner).not.toMatch(/,/);            /* gelar dilepas */
  });

  it('peluang cross-sell tanpa klien di roster DIBUANG, bukan diberi nama karangan', () => {
    const cross = crossSellOpportunities(
      { 'C-999': { partnerRel: 'X', opps: [{ id: 'OPP-999', svc: 'S', value: 1, stage: 'Lead', prob: 10, close: '2026-01' }] } },
      CTX().clients,
    );
    expect(cross).toHaveLength(0);
  });

  it('setiap peluang intake ber-origin "baru" dan tanpa clientId', () => {
    newClientOpportunities(CTX().pipeline).forEach((o) => {
      expect(o.origin).toBe('baru');
      expect(o.clientId).toBeNull();
    });
  });
});

describe('mergeSeedOpportunities — menyembuhkan yang HILANG, bukan yang BERUBAH', () => {
  const seed = pipelineSeed(CTX());

  it('cache kosong → seed penuh', () => {
    expect(mergeSeedOpportunities(null, seed)).toHaveLength(seed.length);
    expect(mergeSeedOpportunities([], seed)).toHaveLength(seed.length);
  });

  it('dokumen lama (hanya intake) tetap mendapat peluang cross-sell', () => {
    const lama = newClientOpportunities(CTX().pipeline);
    const merged = mergeSeedOpportunities(lama, seed);
    expect(merged).toHaveLength(seed.length);
    expect(merged.some((o) => o.origin === 'cross-sell')).toBe(true);
  });

  it('SUNTINGAN pengguna menang atas seed — merge tidak menimpa', () => {
    const stored = seed.map((o) => o.id === 'OPP-103' ? { ...o, stage: 'Won', prob: 100 } : o);
    const merged = mergeSeedOpportunities(stored, seed);
    expect(merged.find((o) => o.id === 'OPP-103')!.stage).toBe('Won');
  });

  it('dokumen lama tanpa field origin di-heal dari seed', () => {
    const tanpaOrigin = [{ ...seed[0] }] as Opportunity[];
    delete (tanpaOrigin[0] as Partial<Opportunity>).origin;
    const merged = mergeSeedOpportunities(tanpaOrigin, seed);
    expect(merged[0].origin).toBe('baru');
  });

  /* PR-4 lanjutan — ditemukan VERIFIKASI HIDUP: dokumen terpersist memuat 7
     peluang bentuk pra-PR-1 tanpa `history`, sehingga backfill riwayat tak
     pernah sampai ke siapa pun yang sudah punya register. */
  it('dokumen lama tanpa history mendapat riwayat seed bila tahapnya masih sama', () => {
    const lama = seed.filter((o) => o.origin === 'baru').map((o) => { const c = { ...o }; delete c.history; return c; });
    expect(lama.every((o) => !o.history)).toBe(true);
    const merged = mergeSeedOpportunities(lama, seed);
    lama.forEach((o) => {
      const m = merged.find((x) => x.id === o.id)!;
      expect(m.history, o.id).toBeTruthy();
      expect(m.history![m.history!.length - 1].stage, o.id).toBe(o.stage);
    });
  });

  it('peluang yang TAHAPNYA sudah bergeser TIDAK diberi riwayat karangan', () => {
    /* Kasus nyata: OPP-107 tersimpan di Lead sementara seed menaruhnya di
       Qualified. Menempelkan riwayat seed = mengarang jejak yang bertentangan
       dengan keadaan peluang. Lebih jujur: tanpa riwayat ⇒ turunan "—". */
    const geser = seed.filter((o) => o.id === 'OPP-107').map((o) => { const c = { ...o, stage: 'Lead' }; delete c.history; return c; });
    const merged = mergeSeedOpportunities(geser, seed);
    const m = merged.find((x) => x.id === 'OPP-107')!;
    expect(m.stage).toBe('Lead');
    expect(m.history).toBeUndefined();
  });

  /* PR-5 — build-up menempuh pertimbangan setara: ia MENJELASKAN `value`. */
  it('build-up seed diadopsi bila nilai peluang belum bergeser', () => {
    const lama = seed.filter((o) => o.buildUp && o.buildUp.length)
      .map((o) => { const c = { ...o }; delete c.buildUp; delete c.durationWeeks; delete c.startPlanned; return c; });
    expect(lama.length).toBeGreaterThan(0);
    const merged = mergeSeedOpportunities(lama, seed);
    lama.forEach((o) => {
      const m = merged.find((x) => x.id === o.id)!;
      expect(m.buildUp, o.id).toBeTruthy();
      expect(m.durationWeeks, o.id).toBeTruthy();
    });
  });

  it('build-up TIDAK diadopsi bila nilai sudah bergeser — ia tak lagi menjelaskan nilainya', () => {
    const asal = seed.find((o) => o.buildUp && o.buildUp.length)!;
    const geser = [{ ...asal, value: asal.value + 250_000_000 }];
    delete geser[0].buildUp; delete geser[0].durationWeeks; delete geser[0].startPlanned;
    const m = mergeSeedOpportunities(geser, seed).find((x) => x.id === asal.id)!;
    expect(m.buildUp).toBeUndefined();
  });

  it('riwayat yang SUDAH ada tidak pernah ditimpa seed', () => {
    const punya = [{ ...seed[0], history: [{ stage: seed[0].stage, at: '2026-03-01', by: 'Pengguna' }] }] as Opportunity[];
    const merged = mergeSeedOpportunities(punya, seed);
    expect(merged[0].history).toHaveLength(1);
    expect(merged[0].history![0].by).toBe('Pengguna');
  });
});

describe('turunan', () => {
  const reg = pipelineSeed(CTX());

  it('peluang tertutup tidak pernah menghuni forecast', () => {
    expect(openOpportunities(reg).every((o) => !isClosed(o.stage))).toBe(true);
    /* weightedValue menolak yang tertutup meski dipaksakan masuk daftar */
    const won = reg.filter((o) => o.stage === 'Won');
    expect(weightedValue(won)).toBe(0);
  });

  it('tertimbang = Σ value × prob, dan ≤ gross', () => {
    const open = openOpportunities(reg);
    const manual = open.reduce((s, o) => s + o.value * o.prob / 100, 0);
    expect(weightedValue(open)).toBeCloseTo(manual, 6);
    expect(weightedValue(open)).toBeLessThanOrEqual(grossValue(open));
  });

  it('stageSummary menutup ke total — tidak ada peluang terbuka yang hilang', () => {
    const open = openOpportunities(reg);
    const rows = stageSummary(open, PIPE_OPEN_STAGES);
    expect(rows.reduce((s, r) => s + r.n, 0)).toBe(open.length);
    expect(rows.reduce((s, r) => s + r.gross, 0)).toBeCloseTo(grossValue(open), 6);
  });

  it('winRate diturunkan dari register, bukan literal', () => {
    const wl = winLoss(reg);
    expect(wl.winRate).toBe(Math.round(wl.won / (wl.won + wl.lost) * 100));
    /* register tanpa keputusan sama sekali ⇒ 0%, bukan pembagian nol */
    expect(winLoss(openOpportunities(reg)).winRate).toBe(0);
  });

  it('wonYtd benar-benar YTD — Won tahun lain TIDAK ikut', () => {
    const withOld: Opportunity[] = [
      ...reg,
      { ...reg[0], id: 'OPP-OLD', stage: 'Won', value: 9_999_000_000, close: '2024-12-31' },
    ];
    expect(wonYtd(withOld, '2026-03-09')).toBe(wonYtd(reg, '2026-03-09'));
    expect(wonYtd(withOld, '2024-06-01')).toBe(9_999_000_000);
  });

  it('overdueOpportunities menandai forecast yang sudah basi', () => {
    const od = overdueOpportunities(reg, '2026-07-01');
    expect(od.every((o) => o.close < '2026-07-01' && !isClosed(o.stage))).toBe(true);
    expect(overdueOpportunities(reg, '2020-01-01')).toHaveLength(0);
  });

  it('byOwner menutup ke total dan tidak menimbang peluang tertutup', () => {
    const rows = byOwner(reg);
    expect(rows.reduce((s, r) => s + r.n, 0)).toBe(reg.length);
    expect(rows.reduce((s, r) => s + r.weighted, 0)).toBeCloseTo(weightedValue(reg), 6);
  });

  it('opportunitiesForClient hanya mengembalikan peluang klien itu', () => {
    const rows = opportunitiesForClient(reg, 'C-014');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((o) => o.clientId === 'C-014')).toBe(true);
  });
});

describe('nextOppId — id tidak bertabrakan setelah penghapusan', () => {
  const reg = pipelineSeed(CTX());

  it('selalu di atas nomor tertinggi yang ada', () => {
    const id = nextOppId(reg);
    expect(reg.some((o) => o.id === id)).toBe(false);
    const nums = reg.map((o) => +(/^OPP-(\d+)$/.exec(o.id)?.[1] ?? 0));
    expect(+id.replace('OPP-', '')).toBeGreaterThan(Math.max(...nums));
  });

  it('CACAT LAMA: `OPP-(108 + list.length)` dapat menerbitkan id yang SUDAH ADA', () => {
    /* Skenario nyata: tujuh peluang seed dihapus, tersisa satu yang pernah dibuat
       pengguna (OPP-109). Rumus lama: 108 + 1 = OPP-109 — persis yang sudah ada. */
    const sisa = [{ ...reg[0], id: 'OPP-109' }];
    const idLama = 'OPP-' + (108 + sisa.length);
    expect(sisa.some((o) => o.id === idLama)).toBe(true);        /* bentrok */
    expect(sisa.some((o) => o.id === nextOppId(sisa))).toBe(false);
  });

  it('register kosong tetap menghasilkan id sah', () => {
    expect(nextOppId([])).toBe('OPP-101');
  });
});
