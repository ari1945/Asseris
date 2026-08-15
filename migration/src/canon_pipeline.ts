/* ============================================================
   Asseris — canon_pipeline: REGISTER PELUANG TUNGGAL milik firma.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1.

   Sebelum berkas ini ada, firma memelihara DUA register peluang yang tidak
   pernah bertemu:

     1. `AMS.PIPELINE`            — 7 peluang klien baru (OPP-101..107)
     2. `AMS.CRM_360[*].opps`     — 7 peluang cross-sell klien eksisting
                                    (OPP-201..214), hanya dibaca view_crm2

   Peluang cross-sell — ESG Assurance 480 jt, Audit Kepatuhan OJK 540 jt,
   SOC 1 Type II 620 jt, dan seterusnya — TIDAK PERNAH masuk pipeline firma.
   "Pipeline Tertimbang" di modul Sales Pipeline dan "Tertimbang" di CRM
   Peluang adalah dua angka yang tak pernah dijumlahkan, atas basis klien
   yang sama.

   Lebih buruk: modul pipeline MENULIS ke dokumen persist `pipeline`,
   sementara SETIAP konsumen hilir (view_bi · view_bi2 · view_capacity ·
   data_platform buildApprovals) membaca literal seed `AMS.PIPELINE`. Menarik
   OPP-103 (Rp 1,28 M) dari Negotiation ke Won menggerakkan papan dan TIDAK
   menggerakkan BI Forecast, Kapasitas, maupun antrean Penerimaan Klien.
   Pola identik dengan yang sudah dicabut di WTB (PR-3/4/5) & Firm Finance
   (#241): perbaikan SSOT yang hanya menyentuh sebagian konsumen.

   Berkas ini MURNI (tanpa React, tanpa localStorage) supaya dapat diuji
   langsung; pintu-tunggal state-nya ada di `use_pipeline.ts`.
   ============================================================ */

import type { ClientRow, PipelineOpp } from './ams_types';

/* ---------------------------------------------------------------
   Tahap — SATU definisi. Dulu tiga: view_pipeline (PIPE_STAGES),
   view_crm2 (STAGE_COLOR) & view_bi2 (stColor) masing-masing punya peta
   warna sendiri, dan ketiganya BERBEDA (Lead #8a97a1 vs #9aa7b2;
   Qualified #0a6b73 vs #5b3fa6). Satu konsep, tiga sumber kebenaran.
   Nilai di bawah mengikuti view_crm2/view_bi2 (2 dari 3 sudah sepakat).
   --------------------------------------------------------------- */
export type PipeStage = 'Lead' | 'Qualified' | 'Proposal' | 'Negotiation' | 'Won' | 'Lost';

/** Tahap terbuka, berurut hulu → hilir. */
export const PIPE_OPEN_STAGES: PipeStage[] = ['Lead', 'Qualified', 'Proposal', 'Negotiation'];
/** Seluruh tahap termasuk terminal. */
export const PIPE_STAGES: PipeStage[] = [...PIPE_OPEN_STAGES, 'Won', 'Lost'];

export const PIPE_STAGE_COLOR: Record<PipeStage, string> = {
  Lead: '#9aa7b2', Qualified: '#5b3fa6', Proposal: '#0a6b73',
  Negotiation: '#005085', Won: '#1f7a4d', Lost: '#b3261e',
};

/** Peluang tertutup — tidak lagi menghuni forecast. */
export function isClosed(stage: string): boolean {
  return stage === 'Won' || stage === 'Lost';
}

/* ---------------------------------------------------------------
   Bentuk register
   --------------------------------------------------------------- */

/** Asal peluang: klien baru (intake) vs cross-sell ke klien eksisting. */
export type PipeOrigin = 'baru' | 'cross-sell';

/**
 * Satu perpindahan tahap (PR-4). Ini DATA REGISTER, bukan turunan: tanpa jejak
 * ini umur peluang, waktu-di-tahap, deteksi macet, conversion rate, dan win rate
 * per periode semuanya mustahil dihitung. `prob` merekam keyakinan yang berlaku
 * selama berada di tahap itu, sehingga dapat dipulihkan bila peluang kembali
 * dari Won/Lost.
 */
export interface StageEvent {
  stage: PipeStage;
  /** ISO yyyy-mm-dd. */
  at: string;
  by: string;
  prob?: number;
  /** Alasan penyimpangan probabilitas, atau alasan menang/kalah. */
  reason?: string;
}

export interface Opportunity extends PipelineOpp {
  /** Membedakan intake klien baru dari cross-sell — dulu dua register terpisah. */
  origin: PipeOrigin;
  /** Terisi untuk cross-sell (klien eksisting); null untuk calon klien baru. */
  clientId: string | null;
  history?: StageEvent[];
  /**
   * PR-5 — build-up jam per grade. Nilai peluang yang punya build-up dapat
   * DIPERTANGGUNGJAWABKAN (jam × tarif firma); yang tanpa build-up ditandai
   * `tanpa-dasar` dan kebutuhan sumber dayanya dipisahkan sebagai estimasi.
   */
  buildUp?: { grade: 'Partner' | 'Manager' | 'Senior' | 'Junior'; hours: number }[];
  /** Minggu pelaksanaan yang direncanakan (bukan asumsi 24 minggu). */
  durationWeeks?: number;
  /** Tanggal mulai rencana (bukan asumsi "mulai pada target close"). */
  startPlanned?: string;
}

/* ---------------------------------------------------------------
   Normalisasi cross-sell → bentuk peluang penuh

   Seed CRM_360 menyimpan bentuk yang lebih miskin:
     { id, svc, value, stage, prob, close: '2026-05' }
   Tiga field wajib register tidak ada di sana dan DITURUNKAN dari klien
   pemiliknya — bukan dikarang:
     · name      ← nama klien
     · industry  ← industri klien
     · owner     ← `partnerRel` CRM (partner relasi), fallback partner roster
   `close` bulanan dinormalkan ke AKHIR BULAN supaya aritmetika tanggal
   (jatuh tempo forecast, YTD) punya satu bentuk saja.
   --------------------------------------------------------------- */

/** `'2026-05'` → `'2026-05-31'`. Tanggal lengkap dibiarkan apa adanya. */
export function monthEnd(close: string): string {
  if (!close) return '';
  const m = /^(\d{4})-(\d{2})$/.exec(close);
  if (!m) return close;
  const y = +m[1], mo = +m[2];
  /* hari-0 bulan berikutnya = hari terakhir bulan ini (aman terhadap kabisat) */
  const last = new Date(Date.UTC(y, mo, 0)).getUTCDate();
  return `${m[1]}-${m[2]}-${String(last).padStart(2, '0')}`;
}

/** Bentuk mentah peluang cross-sell di dalam `CRM_360[clientId].opps`. */
export interface CrmOppSeed {
  id: string; svc: string; value: number; stage: string; prob: number; close: string;
  /* PR-4 — jejak perpindahan tahap; dibawa apa adanya ke register. */
  history?: StageEvent[];
}
export interface Crm360Entry { partnerRel?: string; opps?: CrmOppSeed[] }

export function crossSellOpportunities(
  crm360: Record<string, Crm360Entry>,
  clients: ClientRow[],
): Opportunity[] {
  const byId = new Map(clients.map((c) => [c.id, c]));
  const out: Opportunity[] = [];
  Object.keys(crm360 || {}).forEach((clientId) => {
    const entry = crm360[clientId] || {};
    const client = byId.get(clientId);
    if (!client) return;   /* peluang tanpa klien = yatim; jangan karang namanya */
    (entry.opps || []).forEach((o) => {
      out.push({
        id: o.id,
        name: client.name,
        service: o.svc,
        industry: client.industry,
        stage: o.stage,
        value: o.value,
        prob: o.prob,
        /* partnerRel = partner relasi CRM; roster `client.partner` membawa gelar
           (", CPA") — dilepas agar sebanding dengan `owner` peluang intake. */
        owner: entry.partnerRel || (client.partner || '').split(',')[0].trim(),
        close: monthEnd(o.close),
        origin: 'cross-sell',
        clientId,
        ...(o.history ? { history: o.history } : {}),
      });
    });
  });
  return out;
}

/** Peluang intake (klien baru) → bentuk register. */
export function newClientOpportunities(pipeline: PipelineOpp[]): Opportunity[] {
  return (pipeline || []).map((o) => ({
    ...o, close: monthEnd(o.close), origin: 'baru' as PipeOrigin, clientId: null,
    /* Seed menyimpan `stage` sebagai string lebar (ia bukan literal union di
       ams_types); penyempitan terjadi di batas ini, satu kali, bukan `any`. */
    history: o.history as StageEvent[] | undefined,
    buildUp: o.buildUp as Opportunity['buildUp'],
    durationWeeks: o.durationWeeks,
    startPlanned: o.startPlanned,
  }));
}

/**
 * Seed register gabungan — SATU daftar peluang untuk seluruh firma.
 * Urutan: intake dulu, lalu cross-sell (stabil; dipakai uji snapshot).
 */
export function pipelineSeed(ctx: {
  pipeline: PipelineOpp[];
  crm360: Record<string, Crm360Entry>;
  clients: ClientRow[];
}): Opportunity[] {
  return [...newClientOpportunities(ctx.pipeline), ...crossSellOpportunities(ctx.crm360, ctx.clients)];
}

/**
 * Menyembuhkan cache persist yang tertinggal di belakang seed.
 *
 * Pengguna yang sudah memakai aplikasi memegang `ams.v1.pipeline` berisi 7
 * peluang lama; tanpa ini peluang cross-sell tak akan pernah muncul untuk
 * mereka. Pola & BATASANNYA sama dengan `mergeSeedJournals` (#251):
 * menyembuhkan yang HILANG, bukan yang BERUBAH — peluang yang sudah ada di
 * `stored` menang, karena di situlah suntingan pengguna tinggal.
 */
export function mergeSeedOpportunities(stored: Opportunity[] | null | undefined, seed: Opportunity[]): Opportunity[] {
  if (!stored || !stored.length) return seed;
  const have = new Set(stored.map((o) => o.id));
  const missing = seed.filter((o) => !have.has(o.id));
  /* Dokumen lama tak punya `origin`/`clientId`/`history` → isi dari seed bila
     cocok id.

     RIWAYAT (PR-4) butuh kehati-hatian yang tidak diperlukan dua field lainnya:
     `origin`/`clientId` adalah fakta tetap tentang peluang, sedangkan riwayat
     adalah rangkaian peristiwa yang HARUS berakhir pada tahap yang sekarang
     ditempati. Terbukti hidup: dokumen terpersist di lingkungan dev memuat 7
     peluang bentuk lama, salah satunya sudah berpindah tahap (OPP-107 ada di
     Lead sementara seed menaruhnya di Qualified). Menempelkan riwayat seed ke
     peluang itu akan MENGARANG jejak yang bertentangan dengan keadaannya.

     Karena itu riwayat hanya diadopsi bila tahap akhir seed = tahap tersimpan.
     Bila berbeda, riwayat sengaja DIBIARKAN KOSONG: turunan siklus hidup
     mengembalikan null ("—"), yang jujur — kita memang tidak tahu kapan peluang
     itu berpindah. */
  const seedById = new Map(seed.map((o) => [o.id, o]));
  const healed = stored.map((o) => {
    const s = seedById.get(o.id);
    let next = o;
    if (!next.origin) {
      next = { ...next, origin: (s ? s.origin : 'baru') as PipeOrigin, clientId: s ? s.clientId : null };
    }
    if ((!next.history || !next.history.length) && s && s.history && s.history.length) {
      const seedFinal = s.history[s.history.length - 1];
      if (seedFinal.stage === next.stage) next = { ...next, history: s.history };
    }
    return next;
  });
  return [...healed, ...missing];
}

/* ---------------------------------------------------------------
   Turunan — satu-satunya tempat aritmetika pipeline hidup
   --------------------------------------------------------------- */

export function openOpportunities(reg: Opportunity[]): Opportunity[] {
  return (reg || []).filter((o) => !isClosed(o.stage));
}

export function grossValue(list: Opportunity[]): number {
  return (list || []).reduce((s, o) => s + (o.value || 0), 0);
}

/** Nilai tertimbang SATU peluang. Peluang tertutup tidak menyumbang forecast. */
export function weightedOne(o: Opportunity): number {
  return isClosed(o.stage) ? 0 : (o.value || 0) * (o.prob || 0) / 100;
}

/** Nilai tertimbang probabilitas. Peluang tertutup tidak pernah ikut. */
export function weightedValue(list: Opportunity[]): number {
  return (list || []).reduce((s, o) => s + weightedOne(o), 0);
}

export interface StageSummary { stage: PipeStage; items: Opportunity[]; n: number; gross: number; weighted: number }

export function stageSummary(reg: Opportunity[], stages: PipeStage[] = PIPE_OPEN_STAGES): StageSummary[] {
  return stages.map((stage) => {
    const items = (reg || []).filter((o) => o.stage === stage);
    return { stage, items, n: items.length, gross: grossValue(items), weighted: weightedValue(items) };
  });
}

export interface WinLoss { won: number; lost: number; winRate: number; wonValue: number; lostValue: number }

export function winLoss(reg: Opportunity[]): WinLoss {
  const won = (reg || []).filter((o) => o.stage === 'Won');
  const lost = (reg || []).filter((o) => o.stage === 'Lost');
  const decided = won.length + lost.length;
  return {
    won: won.length, lost: lost.length,
    winRate: decided ? Math.round(won.length / decided * 100) : 0,
    wonValue: grossValue(won), lostValue: grossValue(lost),
  };
}

/**
 * Nilai dimenangkan SEJAK AWAL TAHUN `asOf` — benar-benar YTD.
 * KPI lama berlabel "Dimenangkan (YTD)" menjumlahkan SELURUH stage Won tanpa
 * filter periode; seed menyamarkannya karena satu-satunya Won kebetulan
 * jatuh pada 2026.
 */
export function wonYtd(reg: Opportunity[], asOf: string): number {
  const year = (asOf || '').slice(0, 4);
  if (!year) return 0;
  return grossValue((reg || []).filter((o) => o.stage === 'Won' && (o.close || '').slice(0, 4) === year));
}

/** Peluang terbuka yang target close-nya sudah lewat — forecast yang basi. */
export function overdueOpportunities(reg: Opportunity[], asOf: string): Opportunity[] {
  if (!asOf) return [];
  return openOpportunities(reg).filter((o) => !!o.close && o.close < asOf);
}

export interface OwnerRoll { owner: string; n: number; gross: number; weighted: number }

export function byOwner(list: Opportunity[]): OwnerRoll[] {
  const m = new Map<string, OwnerRoll>();
  (list || []).forEach((o) => {
    const key = o.owner || '—';
    const row = m.get(key) || { owner: key, n: 0, gross: 0, weighted: 0 };
    row.n += 1;
    row.gross += o.value || 0;
    row.weighted += weightedOne(o);
    m.set(key, row);
  });
  return [...m.values()].sort((a, b) => b.weighted - a.weighted);
}

/** Peluang cross-sell milik satu klien (menggantikan `CRM_360[id].opps`). */
export function opportunitiesForClient(reg: Opportunity[], clientId: string): Opportunity[] {
  return (reg || []).filter((o) => o.clientId === clientId);
}

/**
 * Id peluang berikutnya. Dulu `'OPP-' + (108 + list.length)`: hapus satu lalu
 * tambah satu ⇒ id bertabrakan dengan yang sudah ada.
 */
export function nextOppId(reg: Opportunity[]): string {
  const nums = (reg || [])
    .map((o) => /^OPP-(\d+)$/.exec(o.id || ''))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => +m[1]);
  const max = nums.length ? Math.max(...nums) : 100;
  return 'OPP-' + (max + 1);
}
