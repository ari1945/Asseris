/* ============================================================
   Asseris — canon_pipeline_lifecycle: RIWAYAT TAHAP, umur, velocity, dan
   disiplin probabilitas.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-4 (SC-11 · SC-12 · SC-13).

   Register peluang tidak menyimpan SATU PUN stempel waktu. Akibatnya mustahil
   menjawab pertanyaan paling dasar sebuah pipeline:
     · sudah berapa lama peluang ini diam di tahapnya?
     · mana yang macet?
     · berapa lama rata-rata dari Proposal ke Negotiation?
     · berapa win rate KUARTAL INI (bukan sepanjang masa)?
   Semua di atas hanya butuh satu hal yang belum pernah dicatat: kapan sebuah
   peluang MASUK ke tahapnya.

   Dua cacat turunan yang ikut ditutup di sini:

   1. PROBABILITAS LEPAS DARI TAHAP. Kartu di 'Lead' boleh 90%, sehingga
      "Pipeline Tertimbang" — angka yang dipakai forecast firma, kapasitas, dan
      BI — sepenuhnya sewenang-wenang. Kini tiap tahap punya probabilitas
      DEFAULT; penyimpangan boleh, tetapi DITANDAI dan menuntut alasan.

   2. Won MENGHAPUS probabilitas. `move()` menyetel prob=100 saat Won / 0 saat
      Lost; memindahkan kartu KEMBALI ke tahap terbuka tidak memulihkan angka
      semula — 75% hilang permanen. Terbukti hidup saat verifikasi PR-1: OPP-103
      kembali ke Negotiation dengan 100%, menaikkan tertimbang firma Rp 320 jt
      dari satu perjalanan bolak-balik. Dengan riwayat, angka lama dapat
      DIPULIHKAN karena memang tercatat.
   ============================================================ */

import type { Opportunity, PipeStage, StageEvent } from './canon_pipeline';
import { PIPE_OPEN_STAGES, isClosed } from './canon_pipeline';

export type { StageEvent };

/** Alias historis — `history` kini bagian dari `Opportunity` itu sendiri. */
export type OpportunityWithHistory = Opportunity;

/* ---------------------------------------------------------------
   Disiplin probabilitas
   --------------------------------------------------------------- */

/**
 * Probabilitas default per tahap. Ini KEBIJAKAN FIRMA, bukan tebakan per-deal:
 * dua peluang di tahap yang sama berangkat dari angka yang sama, dan yang
 * berbeda harus dijelaskan.
 */
export const STAGE_DEFAULT_PROB: Record<PipeStage, number> = {
  Lead: 20, Qualified: 40, Proposal: 60, Negotiation: 75, Won: 100, Lost: 0,
};

/** Selisih yang masih dianggap wajar tanpa penjelasan (titik persentase). */
export const PROB_TOLERANCE = 10;

export interface ProbCheck {
  expected: number;
  actual: number;
  delta: number;
  deviates: boolean;
  /** Alasan tercatat pada peristiwa tahap berjalan, bila ada. */
  reason: string | null;
  /** Menyimpang TANPA alasan tercatat — inilah yang membuat forecast tak dapat dipertanggungjawabkan. */
  unexplained: boolean;
}

export function probCheck(opp: OpportunityWithHistory): ProbCheck {
  const stage = opp.stage as PipeStage;
  const expected = STAGE_DEFAULT_PROB[stage] ?? 0;
  const actual = opp.prob || 0;
  const delta = actual - expected;
  const deviates = Math.abs(delta) > PROB_TOLERANCE;
  const reason = currentEvent(opp)?.reason || null;
  return { expected, actual, delta, deviates, reason, unexplained: deviates && !reason };
}

/* ---------------------------------------------------------------
   Riwayat & umur
   --------------------------------------------------------------- */

const dayMs = 86_400_000;

/** Selisih hari kalender antara dua tanggal ISO. Negatif bila `b` lebih awal. */
export function daysBetween(a: string, b: string): number | null {
  if (!a || !b) return null;
  const ta = Date.parse(a + 'T00:00:00Z'), tb = Date.parse(b + 'T00:00:00Z');
  if (Number.isNaN(ta) || Number.isNaN(tb)) return null;
  return Math.round((tb - ta) / dayMs);
}

/** Peristiwa yang menempatkan peluang di tahapnya SEKARANG. */
export function currentEvent(opp: OpportunityWithHistory): StageEvent | null {
  const h = opp.history || [];
  for (let i = h.length - 1; i >= 0; i--) if (h[i].stage === opp.stage) return h[i];
  return null;
}

/** Kapan peluang masuk tahap berjalan. `null` bila riwayat belum ada. */
export function enteredStageAt(opp: OpportunityWithHistory): string | null {
  return currentEvent(opp)?.at || null;
}

/** Kapan peluang pertama kali muncul. `null` bila riwayat belum ada. */
export function openedAt(opp: OpportunityWithHistory): string | null {
  const h = opp.history || [];
  return h.length ? h[0].at : null;
}

export function daysInStage(opp: OpportunityWithHistory, asOf: string): number | null {
  const at = enteredStageAt(opp);
  return at ? daysBetween(at, asOf) : null;
}

export function ageDays(opp: OpportunityWithHistory, asOf: string): number | null {
  const at = openedAt(opp);
  return at ? daysBetween(at, asOf) : null;
}

/**
 * Ambang macet per tahap (hari). Tahap hulu bergerak lambat secara wajar;
 * Negotiation yang diam tiga pekan adalah sinyal, bukan kesabaran.
 */
export const STALL_DAYS: Record<PipeStage, number> = {
  Lead: 45, Qualified: 40, Proposal: 30, Negotiation: 21, Won: Infinity, Lost: Infinity,
};

export interface StallInfo { stalled: boolean; days: number | null; threshold: number }

export function stallInfo(opp: OpportunityWithHistory, asOf: string): StallInfo {
  const threshold = STALL_DAYS[opp.stage as PipeStage] ?? Infinity;
  const days = daysInStage(opp, asOf);
  return { stalled: days !== null && days > threshold && !isClosed(opp.stage), days, threshold };
}

/** Peluang terbuka yang target close-nya sudah lewat — forecast basi. */
export function isOverdue(opp: Opportunity, asOf: string): boolean {
  return !isClosed(opp.stage) && !!opp.close && !!asOf && opp.close < asOf;
}

/* ---------------------------------------------------------------
   Konversi antar-tahap & velocity — dari riwayat, bukan dari cuplikan hari ini
   --------------------------------------------------------------- */

export interface StageFlow {
  stage: PipeStage;
  /** Berapa peluang yang PERNAH masuk tahap ini (menurut riwayat). */
  entered: number;
  /** Berapa di antaranya yang melaju ke tahap berikutnya. */
  advanced: number;
  /** advanced / entered, dalam persen; null bila belum ada yang masuk. */
  conversion: number | null;
  /** Median hari yang dihabiskan di tahap ini (yang sudah keluar). */
  medianDays: number | null;
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = xs.slice().sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2);
}

export function stageFlow(reg: OpportunityWithHistory[], stages: PipeStage[] = PIPE_OPEN_STAGES): StageFlow[] {
  const order = PIPE_OPEN_STAGES;
  return stages.map((stage) => {
    let entered = 0, advanced = 0;
    const durations: number[] = [];
    (reg || []).forEach((o) => {
      const h = o.history || [];
      const idx = h.findIndex((e) => e.stage === stage);
      if (idx < 0) return;
      entered += 1;
      const next = h[idx + 1];
      if (next) {
        /* "Maju" = pindah ke tahap yang lebih hilir, atau menang. Lost bukan maju. */
        const from = order.indexOf(stage), to = order.indexOf(next.stage);
        if (next.stage === 'Won' || (to >= 0 && from >= 0 && to > from)) advanced += 1;
        const d = daysBetween(h[idx].at, next.at);
        if (d !== null && d >= 0) durations.push(d);
      }
    });
    return {
      stage, entered, advanced,
      conversion: entered ? Math.round(advanced / entered * 100) : null,
      medianDays: median(durations),
    };
  });
}

/* ---------------------------------------------------------------
   Win rate PER PERIODE — mungkin hanya karena keputusan punya tanggal
   --------------------------------------------------------------- */

/** Tanggal keputusan menang/kalah menurut riwayat; fallback ke `close`. */
export function decidedAt(opp: OpportunityWithHistory): string | null {
  if (!isClosed(opp.stage)) return null;
  return currentEvent(opp)?.at || opp.close || null;
}

export interface PeriodWinLoss { won: number; lost: number; winRate: number | null; wonValue: number; lostValue: number }

export function winLossBetween(reg: OpportunityWithHistory[], from: string, to: string): PeriodWinLoss {
  const inRange = (reg || []).filter((o) => {
    const d = decidedAt(o);
    return !!d && d >= from && d <= to;
  });
  const won = inRange.filter((o) => o.stage === 'Won');
  const lost = inRange.filter((o) => o.stage === 'Lost');
  const decided = won.length + lost.length;
  return {
    won: won.length, lost: lost.length,
    winRate: decided ? Math.round(won.length / decided * 100) : null,
    wonValue: won.reduce((s, o) => s + (o.value || 0), 0),
    lostValue: lost.reduce((s, o) => s + (o.value || 0), 0),
  };
}

/** Awal tahun takwim dari sebuah tanggal ISO. */
export function yearStart(asOf: string): string { return (asOf || '').slice(0, 4) + '-01-01'; }

/* ---------------------------------------------------------------
   Perpindahan tahap yang MENCATAT — dan memulihkan yang pernah dicatat
   --------------------------------------------------------------- */

export interface MoveOptions { by: string; at: string; reason?: string; prob?: number }

/**
 * Pindahkan peluang, catat peristiwanya, dan tentukan probabilitas baru.
 *
 * Aturan probabilitas:
 *   · Won  ⇒ 100, Lost ⇒ 0 (definisi, bukan taksiran).
 *   · Kembali dari Won/Lost ke tahap terbuka ⇒ PULIHKAN angka yang tercatat pada
 *     kunjungan terakhir ke tahap itu; bila tak ada, pakai default tahap.
 *     `move()` lama membiarkan 100% terbawa keluar dari Won.
 *   · Perpindahan biasa ⇒ pertahankan angka berjalan bila masih dalam toleransi
 *     tahap baru; bila tidak, ikut default agar forecast tidak diam-diam
 *     mewarisi keyakinan tahap lama.
 */
export function moveWithHistory(opp: OpportunityWithHistory, to: PipeStage, opts: MoveOptions): OpportunityWithHistory {
  const h = (opp.history || []).slice();
  /* Rekam probabilitas terakhir pada tahap yang ditinggalkan. */
  const leavingIdx = (() => { for (let i = h.length - 1; i >= 0; i--) if (h[i].stage === opp.stage) return i; return -1; })();
  if (leavingIdx >= 0) h[leavingIdx] = { ...h[leavingIdx], prob: opp.prob };

  let prob: number;
  if (to === 'Won') prob = 100;
  else if (to === 'Lost') prob = 0;
  else if (isClosed(opp.stage)) {
    const prior = (() => { for (let i = h.length - 1; i >= 0; i--) if (h[i].stage === to && typeof h[i].prob === 'number') return h[i].prob as number; return null; })();
    prob = prior !== null ? prior : STAGE_DEFAULT_PROB[to];
  } else if (typeof opts.prob === 'number') prob = opts.prob;
  else {
    const expected = STAGE_DEFAULT_PROB[to];
    prob = Math.abs((opp.prob || 0) - expected) > PROB_TOLERANCE ? expected : (opp.prob || 0);
  }

  h.push({ stage: to, at: opts.at, by: opts.by, prob, reason: opts.reason });
  return { ...opp, stage: to, prob, history: h };
}
