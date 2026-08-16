/* ============================================================
   Asseris — canon_pipeline_fee: NILAI PELUANG YANG PUNYA BUILD-UP.

   PRD `docs/prd-sales-pipeline-deepening.md` · PR-5 (SC-7 · SC-8).

   Nilai peluang adalah angka bebas yang diketik seseorang. Dari angka itu
   sistem lalu MENURUNKAN dua hal penting — dan melakukannya dengan dua tarif
   yang berbeda:

     view_pipeline  budgetHrs = value / 700_000        (tarif Senior Auditor)
     canon_capacity hrs/minggu = value / 800_000 / 24  (tarif "blended" karangan)

   Satu konversi nilai→jam, dua konstanta lepas, keduanya tanpa dasar. Dan
   karena tak ada satu pun peluang yang menyimpan jam atau tanggal mulai,
   kanon kapasitas harus mengakui sendiri (komentar aslinya):

     "pipeline nyata (view_pipeline) TAK punya jam/tgl-mulai. Estimasi ...
      KONSTAN tunable; ini asumsi PERENCANAAN kasar (bukan angka aktual)."

   Perencanaan sumber daya firma berdiri di atas tiga konstanta.

   ATURAN PEMANDU arc ini (dari #247/#251): komponen harus DIENUMERASI, bukan
   diturunkan dari besaran yang hendak dijelaskannya. Terapannya di sini: fee
   dibangun dari jam per grade × tarif tercatat, lalu diskon — bukan angka
   gelondongan yang dibagi konstanta untuk menebak jamnya kembali.

   Build-up bersifat OPSIONAL (Q-3 opsi a). Peluang tanpa build-up TIDAK
   diam-diam dianggap setara: nilainya ditandai `tanpa-dasar`, dan kebutuhan
   sumber dayanya dipisahkan sebagai ESTIMASI, bukan dicampur dengan yang
   tercatat.
   ============================================================ */

import type { Opportunity } from './canon_pipeline';
import { isClosed } from './canon_pipeline';

/** Grade sesuai kapasitas; peta ke peran tarif ada di `GRADE_ROLE`. */
export type FeeGrade = 'Partner' | 'Manager' | 'Senior' | 'Junior';

/** Grade kapasitas → peran pada `FIRMFIN.WIP_BILL` (SSOT tarif charge-out). */
export const GRADE_ROLE: Record<FeeGrade, string> = {
  Partner: 'Engagement Partner',
  Manager: 'Audit Manager',
  Senior: 'Senior Auditor',
  Junior: 'Junior Auditor',
};

export interface BuildUpLine { grade: FeeGrade; hours: number }

/** Tarif charge-out per PERAN (bentuk `FIRMFIN.WIP_BILL`). */
export type BillRates = Record<string, number>;

export function rateFor(grade: FeeGrade, rates: BillRates): number {
  return rates[GRADE_ROLE[grade]] || 0;
}

export interface FeeBasis {
  /** Ada build-up yang dapat dipertanggungjawabkan? */
  basis: 'tercatat' | 'tanpa-dasar';
  /** Total jam menurut build-up; null bila tak ada. */
  hours: number | null;
  /** Nilai pada tarif standar (sebelum diskon); null bila tak ada build-up. */
  standard: number | null;
  /** Nilai yang ditawarkan ke klien = `opp.value`. */
  quoted: number;
  /**
   * quoted / standard × 100 — realisasi terhadap tarif standar. Di bawah 100%
   * berarti firma memberi diskon; jauh di bawah = lowballing yang harus terlihat
   * (dan menjadi bahan faktor "Etika & proporsionalitas imbalan" SA 220).
   */
  realizationPct: number | null;
  /** Tarif efektif per jam yang benar-benar ditawarkan. */
  effectiveRate: number | null;
  lines: { grade: FeeGrade; hours: number; rate: number; amount: number }[];
}

export function feeBasis(opp: Opportunity, rates: BillRates): FeeBasis {
  const lines = (opp.buildUp || []).filter((l) => l && l.hours > 0);
  if (!lines.length) {
    return { basis: 'tanpa-dasar', hours: null, standard: null, quoted: opp.value || 0, realizationPct: null, effectiveRate: null, lines: [] };
  }
  const detail = lines.map((l) => {
    const rate = rateFor(l.grade, rates);
    return { grade: l.grade, hours: l.hours, rate, amount: l.hours * rate };
  });
  const hours = detail.reduce((s, l) => s + l.hours, 0);
  const standard = detail.reduce((s, l) => s + l.amount, 0);
  const quoted = opp.value || 0;
  return {
    basis: 'tercatat', hours, standard, quoted,
    realizationPct: standard ? Math.round(quoted / standard * 100) : null,
    effectiveRate: hours ? Math.round(quoted / hours) : null,
    lines: detail,
  };
}

/**
 * Tarif blended yang DITURUNKAN dari campuran grade lazim sebuah perikatan,
 * bukan konstanta karangan. Dipakai hanya sebagai fallback untuk peluang tanpa
 * build-up — dan hasilnya selalu ditandai sebagai estimasi.
 *
 * Campuran mengikuti bentuk roster perikatan audit tipikal firma ini
 * (`FIRMFIN.WIP_ROSTER_ENG`): partner tipis, manajer sedang, mayoritas
 * senior/junior. Angkanya tetap asumsi — bedanya, asumsinya kini TERBACA dan
 * bergerak mengikuti tarif firma, alih-alih dipaku 800.000 di berkas lain.
 */
export const BLENDED_MIX: { grade: FeeGrade; weight: number }[] = [
  { grade: 'Partner', weight: 0.08 },
  { grade: 'Manager', weight: 0.22 },
  { grade: 'Senior', weight: 0.45 },
  { grade: 'Junior', weight: 0.25 },
];

export function blendedRate(rates: BillRates): number {
  const total = BLENDED_MIX.reduce((s, m) => s + m.weight, 0) || 1;
  return Math.round(BLENDED_MIX.reduce((s, m) => s + rateFor(m.grade, rates) * m.weight, 0) / total);
}

/** Durasi perikatan lazim bila peluang tak mencatatnya sendiri (minggu). */
export const DEFAULT_DURATION_WEEKS = 24;

export interface EffortPlan {
  /** Total jam. */
  hours: number;
  /** Minggu pelaksanaan. */
  weeks: number;
  /** Jam per minggu (belum ditimbang probabilitas). */
  hrsPerWeek: number;
  /** Tanggal mulai rencana. */
  start: string;
  /** `false` = seluruh angka berasal dari catatan peluang. */
  estimated: boolean;
  /** Kalimat yang menyebut DARI MANA angkanya. Tak pernah kosong. */
  basis: string;
}

/**
 * Rencana upaya sebuah peluang. Memakai yang TERCATAT bila ada; bila tidak,
 * jatuh ke estimasi — dan menandainya, bukan menyamarkannya sebagai fakta.
 */
export function effortPlan(opp: Opportunity, rates: BillRates): EffortPlan {
  const fee = feeBasis(opp, rates);
  const weeks = opp.durationWeeks && opp.durationWeeks > 0 ? opp.durationWeeks : DEFAULT_DURATION_WEEKS;
  const start = opp.startPlanned || opp.close || '';
  if (fee.basis === 'tercatat' && fee.hours) {
    const recordedWeeks = !!(opp.durationWeeks && opp.durationWeeks > 0);
    const recordedStart = !!opp.startPlanned;
    return {
      hours: fee.hours, weeks,
      hrsPerWeek: Math.max(1, Math.round(fee.hours / weeks)),
      start,
      estimated: !(recordedWeeks && recordedStart),
      basis: `${fee.hours} jam dari build-up ${fee.lines.length} grade`
        + (recordedWeeks ? ` · ${weeks} minggu tercatat` : ` · durasi diasumsikan ${weeks} minggu`)
        + (recordedStart ? ` · mulai ${start} tercatat` : ` · mulai diasumsikan = target close ${start}`),
    };
  }
  const rate = blendedRate(rates);
  if (!rate) {
    /* Tanpa tarif firma, konversi nilai→jam TIDAK DAPAT dihitung. Mengembalikan
       lantai 1 jam/minggu (perilaku `Math.max(1, …)` yang lama) berarti menyajikan
       angka karangan yang tampak seperti hasil hitungan. Nol + alasan lebih jujur. */
    return {
      hours: 0, weeks, hrsPerWeek: 0, start, estimated: true,
      basis: 'TIDAK DAPAT DIHITUNG — tarif charge-out firma (FIRMFIN.WIP_BILL) tidak tersedia bagi pemanggil ini.',
    };
  }
  const hours = Math.max(1, Math.round((opp.value || 0) / rate));
  return {
    hours, weeks,
    hrsPerWeek: Math.max(1, Math.round(hours / weeks)),
    start,
    estimated: true,
    basis: `ESTIMASI — peluang belum punya build-up jam; nilai Rp ${Math.round((opp.value || 0) / 1e6)} jt dibagi tarif blended Rp ${Math.round(rate / 1000)} rb (turunan tarif firma) dan ${weeks} minggu.`,
  };
}

export interface DemandSplit {
  /** Jam/minggu tertimbang probabilitas, dari peluang ber-build-up. */
  recorded: number;
  /** Jam/minggu tertimbang probabilitas, dari peluang tanpa build-up (estimasi). */
  estimated: number;
  total: number;
  /** Berapa peluang menyumbang tiap bagian. */
  recordedCount: number;
  estimatedCount: number;
}

/**
 * Kebutuhan sumber daya pipeline, DIPISAH antara yang tercatat dan yang
 * diestimasi. Pemisahan inilah yang menjawab Q-3(a): nilai tanpa dasar tidak
 * pernah diam-diam dihitung setara dengan yang punya build-up.
 */
export function demandSplit(reg: Opportunity[], rates: BillRates): DemandSplit {
  let recorded = 0, estimated = 0, recordedCount = 0, estimatedCount = 0;
  (reg || []).forEach((o) => {
    if (isClosed(o.stage) || !(o.prob > 0) || !(o.value > 0)) return;
    const e = effortPlan(o, rates);
    const weighted = e.hrsPerWeek * (o.prob || 0) / 100;
    if (feeBasis(o, rates).basis === 'tercatat') { recorded += weighted; recordedCount += 1; }
    else { estimated += weighted; estimatedCount += 1; }
  });
  /* Total = penjumlahan BAGIAN yang ditampilkan, bukan pembulatan terpisah atas
     jumlah mentah. Membulatkan keduanya sendiri-sendiri menghasilkan pemisahan
     yang tidak menutup ke totalnya (171 vs 172 pada seed) — persis kelas
     kebohongan kecil yang sedang dicabut arc ini. */
  const r = Math.round(recorded), e = Math.round(estimated);
  return { recorded: r, estimated: e, total: r + e, recordedCount, estimatedCount };
}
