/* ============================================================
   Asseris — MASUKAN MESIN DIAGNOSTIK & KEADAAN TIAP DETEKTOR (murni)
   prompt 72-diagnostic D2 + D3.
   ------------------------------------------------------------
   D2. amsDiagnostics(ctx) menerima empat kunci masukan dan menarik BAWAAN
   untuk yang tak dikirim (diagnostics.ts:190-193):

     pop       = c.journalPop    || AMS_FORENSIC.JOURNAL_POP
     fig       = c.fig           || FIG
     reconRows = c.reconcileRows || safeReconcileRows()

   Sampai 2026-08-22 panel hanya mengirim `aje` (+ `extraFindings`). Tiga dari
   empat masukan karena itu jatuh ke bawaan: populasi jurnal ILUSTRATIF yang sama
   untuk setiap perikatan, figur bawaan yang dibangun dari AMS.WTB singleton, dan
   baris rekonsiliasi bawaan. Dua perikatan berbeda melihat temuan yang sebagian
   besar sama — lalu hasilnya disajikan sebagai diagnostik perikatan itu.

   Modul ini merakit ctx dari data perikatan yang MEMANG ada (useAudit().wtb dan
   .aje), dan mencatat mana yang tidak ada. Ia sengaja tidak mengarang satu pun:
   populasi jurnal ENTITAS belum ada di aplikasi (lihat jet_selection.ts dan
   docs/usulan-J-jet-impor-gl-populasi.md), jadi ia dikirim KOSONG — bukan
   diganti populasi demo — dan detektor yang bergantung padanya dilaporkan
   "tidak dapat berjalan".

   D3. Kartu keempat di view agregat dulu berbunyi Object.keys(byDetector).length
   dengan label "Detektor aktif". Itu bukan jumlah detektor yang berjalan; itu
   jumlah detektor yang MENGHASILKAN temuan. Detektor yang berjalan dan bersih
   dan detektor yang tak berjalan sama-sama tak terhitung — keduanya tampak
   identik: angka yang lebih kecil. Untuk modul diagnostik, "berjalan & bersih"
   justru informasi asurans. detectorStatuses() memisahkan ketiga keadaan itu.

   MURNI dari React & window. Ia MEMANG memanggil kanon (figuresFromWTB,
   fiscalReconciliation, reconcile) — dengan argumen eksplisit, sehingga angkanya
   mengikuti perikatan dan bukan singleton mana pun.

   BATAS JUJUR pada `fig`: pbt/pkp/taxExpBooked/dtaReported turunan neraca saldo
   + jurnal perikatan. permAdd/permLess/taxLoss datang dari FISCAL — kertas kerja
   fiskal tunggal yang dipakai SELURUH aplikasi (PSAK 46 membacanya dari sana
   juga). Ia belum per-perikatan; itu di luar lingkup modul ini, dan dinyatakan
   di sini alih-alih disamarkan.
   ============================================================ */
import { FISCAL, figuresFromWTB, fiscalReconciliation } from './canon_base';
import { reconcile } from './canon_part3';
import type { AjeLike } from './canon_base';
import type { WTB, Fig } from './canon_types';
import type { DiagCtx, DiagFinding } from './diagnostics';

/* ---- masukan ----------------------------------------------------------- */

export type DiagInputId = 'journalPop' | 'aje' | 'fig' | 'reconcileRows' | 'crossChecks';

export type DiagAvailability = Record<DiagInputId, boolean>;

export interface DiagSource {
  /** Neraca saldo perikatan aktif (useAudit().wtb). */
  wtb?: WTB;
  /** Register jurnal penyesuaian perikatan aktif (useAudit().aje). */
  aje?: AjeLike[];
  /** Temuan korelasi lintas-modul (amsCrossChecks) yang sudah dihitung pemanggil. */
  extraFindings?: DiagFinding[];
  /** true bila pemanggil benar-benar menjalankan korelasi lintas-modul. */
  crossChecksRan?: boolean;
}

export interface DiagInputs {
  ctx: DiagCtx;
  availability: DiagAvailability;
}

/** Alasan sebuah masukan tidak tersedia — dicetak apa adanya di layar & ekspor. */
export const DIAG_INPUT_ABSENT: Record<DiagInputId, string> = {
  journalPop: 'Populasi jurnal entitas (buku besar klien) belum ada di aplikasi — lihat modul JET.',
  aje: 'Register jurnal penyesuaian perikatan ini kosong.',
  fig: 'Neraca saldo perikatan ini belum memuat figur entitas.',
  reconcileRows: 'Rekonsiliasi lintas-modul tak dapat dihitung tanpa neraca saldo perikatan.',
  crossChecks: 'Korelasi lintas-modul tidak dijalankan.',
};

/**
 * Rakit ctx mesin diagnostik dari data perikatan, beserta peta ketersediaan.
 *
 * `journalPop` SELALU dikirim (sebagai larik kosong bila tak ada) justru agar
 * bawaan ilustratif mesin tidak menyelinap masuk: larik kosong itu truthy,
 * sehingga `c.journalPop || AMS_FORENSIC.JOURNAL_POP` berhenti di larik kosong.
 */
export function engagementDiagInputs(src: DiagSource): DiagInputs {
  const wtb: WTB = src.wtb || [];
  const aje: AjeLike[] = src.aje || [];

  /* ⚠ Kanon jatuh ke SINGLETON pada neraca saldo kosong:
       wtbRows(wtb) = (wtb && wtb.length) ? wtb : AMS.WTB
     Jadi `figuresFromWTB([])` BUKAN "nol" — ia angka milik neraca saldo seed.
     Memanggilnya tanpa baris perikatan berarti mengulang persis cacat yang
     modul ini tutup, satu lapis lebih dalam. Karena itu kanon hanya disentuh
     bila perikatan benar-benar punya neraca saldo; bila tidak, `fig` dikirim
     sebagai objek KOSONG (truthy — mesin tak jatuh ke FIG) dan detektornya
     dilaporkan tidak dapat berjalan. */
  const punyaWtb = wtb.length > 0;
  const fisc = punyaWtb ? fiscalReconciliation(wtb, aje) : null;
  const s = punyaWtb ? figuresFromWTB(wtb, aje) : null;
  const figAvailable = !!(fisc && fisc.available && s);
  const fig: Partial<Fig> = figAvailable ? {
    pbt: fisc!.pbt,
    pkp: fisc!.pkp,
    permAdd: fisc!.permAdd,
    permLess: fisc!.permLess,
    taxExpBooked: s!.taxExpBooked,
    dtaReported: s!.dtaReported,
    taxLoss: FISCAL.taxLoss,
  } : {};

  let reconcileRows: DiagCtx['reconcileRows'] = [];
  if (punyaWtb) {
    try {
      const r = reconcile(wtb, aje) as { accounting?: DiagCtx['reconcileRows'] };
      reconcileRows = Array.isArray(r.accounting) ? r.accounting : [];
    } catch (e) {
      reconcileRows = [];
    }
  }

  const extraFindings = src.extraFindings || [];

  return {
    ctx: {
      journalPop: [],
      aje: aje as DiagCtx['aje'],
      fig,
      reconcileRows,
      extraFindings,
    },
    availability: {
      journalPop: false,
      aje: aje.length > 0,
      fig: figAvailable,
      reconcileRows: figAvailable && (reconcileRows || []).length > 0,
      crossChecks: !!src.crossChecksRan,
    },
  };
}

/* ---- detektor ---------------------------------------------------------- */

export type DiagDetectorState = 'found' | 'clean' | 'unavailable';

export interface DiagDetectorDef {
  id: string;
  label: string;
  std: string;
  needs: readonly DiagInputId[];
  /** 'any' = cukup satu masukan tersedia (Benford menggabungkan populasi + AJE). */
  mode: 'all' | 'any';
}

/* Enam detektor hidup hari ini. Lima menerbitkan `detector:` dari
   diagnostics.ts; `crossChecks` disuntik lapisan panel lewat extraFindings.
   Daftar ini bukan hiasan: gerbang diagnostics_inputs.test.ts mengunci bahwa ia
   mencakup setiap label yang benar-benar diterbitkan mesin. */
export const DIAG_DETECTORS: readonly DiagDetectorDef[] = [
  { id: 'benford', label: 'Benford (digit-awal)', std: 'SA 240 ¶32', needs: ['journalPop', 'aje'], mode: 'any' },
  { id: 'bookTax', label: 'Red-flag fiskal (book-tax)', std: 'PSAK 46', needs: ['fig'], mode: 'all' },
  { id: 'jet', label: 'Konsentrasi jurnal manual', std: 'SA 240 ¶32', needs: ['journalPop'], mode: 'all' },
  { id: 'forensic', label: 'Eksposur pihak berelasi', std: 'SA 550 · PSAK 7', needs: ['journalPop'], mode: 'all' },
  { id: 'reconcile', label: 'Rekonsiliasi lintas-modul', std: 'SA 500', needs: ['reconcileRows'], mode: 'all' },
  { id: 'crossChecks', label: 'Korelasi lintas-modul', std: 'SA 500', needs: ['crossChecks'], mode: 'all' },
];

export interface DiagDetectorStatus extends DiagDetectorDef {
  state: DiagDetectorState;
  /** Jumlah temuan yang diterbitkan detektor ini. */
  count: number;
  /** Masukan yang kurang — kosong bila detektor dapat berjalan. */
  missing: DiagInputId[];
  /** Kalimat siap-cetak: mengapa ia tak dapat berjalan (kosong bila berjalan). */
  reason: string;
}

/**
 * Keadaan tiap detektor: berjalan & menemukan · berjalan & bersih · tidak dapat
 * berjalan. Jumlah temuan SAJA tak pernah cukup untuk membedakan ketiganya —
 * itulah sebabnya peta ketersediaan masukan ikut masuk.
 */
export function detectorStatuses(
  availability: DiagAvailability,
  findings: ReadonlyArray<{ detector?: string }>,
): DiagDetectorStatus[] {
  const hitung: Record<string, number> = {};
  for (const f of findings || []) {
    const d = String((f && f.detector) || '');
    if (d) hitung[d] = (hitung[d] || 0) + 1;
  }
  return DIAG_DETECTORS.map((d) => {
    const missing = d.needs.filter((n) => !availability[n]);
    const dapatBerjalan = d.mode === 'any' ? missing.length < d.needs.length : missing.length === 0;
    const count = hitung[d.id] || 0;
    /* Sebuah detektor yang MENERBITKAN temuan sudah membuktikan dirinya
       berjalan — peta ketersediaan tak boleh menimpanya. */
    const state: DiagDetectorState = count > 0 ? 'found' : dapatBerjalan ? 'clean' : 'unavailable';
    return {
      ...d,
      state,
      count,
      missing: state === 'unavailable' ? missing : [],
      reason: state === 'unavailable' ? missing.map((m) => DIAG_INPUT_ABSENT[m]).join(' ') : '',
    };
  });
}

export interface DiagDetectorSummary {
  total: number;
  /** Detektor yang benar-benar berjalan (menemukan + bersih). */
  ran: number;
  found: number;
  clean: number;
  unavailable: number;
}

export function detectorSummary(statuses: ReadonlyArray<DiagDetectorStatus>): DiagDetectorSummary {
  const found = statuses.filter((s) => s.state === 'found').length;
  const clean = statuses.filter((s) => s.state === 'clean').length;
  const unavailable = statuses.filter((s) => s.state === 'unavailable').length;
  return { total: statuses.length, ran: found + clean, found, clean, unavailable };
}

export const DIAG_STATE_META: Record<DiagDetectorState, { label: string; tone: string }> = {
  found: { label: 'berjalan · menemukan', tone: 'amber' },
  clean: { label: 'berjalan · bersih', tone: 'green' },
  unavailable: { label: 'tidak dapat berjalan', tone: 'ink-3' },
};
