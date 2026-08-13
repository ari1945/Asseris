/* ============================================================
   Asseris — Bukti dokumentasi SMM 1 ¶58/¶59 · DITURUNKAN
   ------------------------------------------------------------
   ¶57(c) menuntut dokumentasi yang **MEMBERIKAN BUKTI** atas
   perancangan, pengimplementasian & pengoperasian respons. Sebuah
   daftar centang manual tidak memenuhi itu: ia adalah pernyataan
   TENTANG bukti, bukan buktinya. Karena itu modul ini menurunkan
   keadaan tiap elemen ¶58 dari ARTEFAK NYATA di modul, dan tidak
   menyediakan satu pun jalur bagi pengguna untuk menandai elemen
   "ada" tanpa artefaknya.

   ------------------------------------------------------------
   TIGA KEADAAN, BUKAN DUA

   `evidenced`       artefaknya ada dan memenuhi syarat elemen.
   `missing`         artefaknya seharusnya ada, tetapi tidak ada.
   `not-automatable` aplikasi BELUM punya artefak terstruktur yang
                     dapat membuktikannya. Ini BUKAN "ada" dan BUKAN
                     kegagalan firma — ini batas aplikasi, dan
                     dinyatakan apa adanya.

   Keadaan ketiga itu keputusan sadar (PRD Q-3). Alternatifnya —
   memberi toggle manual — akan mengubah ¶57(c) menjadi pernyataan
   tentang bukti, yaitu persis cacat yang arc ini berantas. Hanya
   `evidenced` yang boleh dihitung sebagai `present` oleh
   `smmDocCoverage`, sehingga "lengkap" tidak dapat diklaim di atas
   elemen yang tak terbukti.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */
import type { SmmDocElement } from './canon_smm_documentation';

export type EvidenceState = 'evidenced' | 'missing' | 'not-automatable';

export const EVIDENCE_STATE_LABEL: Record<EvidenceState, string> = {
  evidenced: 'Terbukti dari artefak',
  missing: 'Artefaknya tidak ada',
  'not-automatable': 'Belum dapat dibuktikan otomatis',
};

export interface ElementEvidence {
  readonly element: SmmDocElement;
  readonly state: EvidenceState;
  /** Kalimat yang menjelaskan DASAR keadaan itu — bukan sekadar labelnya. */
  readonly detail: string;
  /** Modul/berkas sumber artefaknya, untuk ditelusuri. */
  readonly source: string;
}

/* ------------------------------------------------------------
   Bentuk masukan — sengaja minimal & bertipe
   ------------------------------------------------------------ */

export interface DocEvidenceInput {
  /** `QM_ROLES` — dicek keberadaan ¶20(a) & ¶20(b). */
  readonly roles?: readonly { readonly ref?: string | null; readonly person?: string | null }[] | null;
  /** Hasil `objectiveCoverage()`. */
  readonly coverage?: {
    readonly covered: readonly string[];
    readonly waived: readonly string[];
    readonly uncovered: readonly string[];
  } | null;
  /** `SOQM_RISKS`. */
  readonly risks?: readonly {
    readonly id: string;
    readonly response?: string | null;
    readonly deficiency?: {
      readonly rootCause?: string | null;
      readonly action?: string | null;
      readonly owner?: string | null;
      readonly due?: string | null;
      readonly remediated?: boolean | null;
    } | null;
  }[] | null;
  /** `QM_INSPECTIONS`. */
  readonly inspections?: readonly { readonly id: string; readonly grade?: string | null }[] | null;
  /** `QM_INSP_FINDINGS`. */
  readonly findings?: readonly { readonly ins: string; readonly cause?: string | null }[] | null;
  /** Kesimpulan ¶54 yang TERTULIS & tersimpan (bukan rekomendasi mesin). */
  readonly writtenConclusion?: string | null;
  /** Wadah jaringan ¶48–52. */
  readonly network?: {
    readonly inNetwork?: boolean | null;
    readonly year?: number | null;
    readonly monitoring?: readonly {
      readonly year: number;
      readonly obtainedAt?: string | null;
      readonly communicatedToTeams?: boolean | null;
      readonly effectConsidered?: boolean | null;
    }[] | null;
  } | null;
}

const has = (s: string | null | undefined) => Boolean((s || '').trim());

/**
 * Keadaan bukti tiap elemen ¶58 (+ ¶59 bila berjaringan).
 *
 * Urutannya mengikuti urutan paragraf, supaya layar terbaca sebagai
 * pemeriksaan ¶58(a) → (e) → ¶59, bukan sebagai kumpulan kartu.
 */
export function smmDocEvidence(input: DocEvidenceInput | null | undefined): readonly ElementEvidence[] {
  const x = input || {};
  const roles = x.roles || [];
  const risks = x.risks || [];
  const inspections = x.inspections || [];
  const findings = x.findings || [];
  const out: ElementEvidence[] = [];

  /* ¶58(a) — pemegang tanggung jawab tertinggi & operasional */
  const has20a = roles.some((r) => (r.ref || '').includes('¶20(a)') && has(r.person));
  const has20b = roles.some((r) => (r.ref || '').includes('¶20(b)') && has(r.person));
  out.push({
    element: 'responsibility-holders',
    state: has20a && has20b ? 'evidenced' : 'missing',
    detail: has20a && has20b
      ? 'Pemegang tanggung jawab tertinggi (¶20(a)) dan operasional (¶20(b)) keduanya bernama.'
      : `Belum lengkap — ${!has20a ? '¶20(a) ' : ''}${!has20b ? '¶20(b) ' : ''}tanpa pemegang yang bernama.`,
    source: 'QM_ROLES · Governance',
  });

  /* ¶58(b) — tujuan mutu & risiko mutu.
     Tujuan mandatori tanpa risiko dan tanpa waiver sah berarti risiko
     mutunya BELUM terdokumentasi, betapapun daftar tujuannya lengkap. */
  const cov = x.coverage;
  const uncovered = cov ? cov.uncovered.length : -1;
  out.push({
    element: 'objectives-and-risks',
    state: cov ? (uncovered === 0 ? 'evidenced' : 'missing') : 'missing',
    detail: !cov ? 'Cakupan tujuan tidak dapat dihitung.'
      : uncovered === 0
        ? 'Seluruh tujuan mandatori ¶28–33 punya risiko mutu atau waiver ¶17 yang sah.'
        : `${uncovered} tujuan mandatori belum punya risiko mutu maupun waiver ¶17 yang sah — risikonya belum terdokumentasi.`,
    source: 'SOQM_RISKS · canon_smm_objectives',
  });

  /* ¶58(c) — deskripsi respons */
  const noResponse = risks.filter((r) => !has(r.response)).map((r) => r.id);
  out.push({
    element: 'responses',
    state: risks.length > 0 && noResponse.length === 0 ? 'evidenced' : 'missing',
    detail: risks.length === 0 ? 'Belum ada risiko mutu terdaftar, sehingga tak ada respons yang dideskripsikan.'
      : noResponse.length === 0
        ? `Seluruh ${risks.length} risiko mutu punya deskripsi respons.`
        : `${noResponse.length} risiko tanpa deskripsi respons: ${noResponse.join(' · ')}.`,
    source: 'SOQM_RISKS',
  });

  /* ¶58(d)(i) — bukti aktivitas pemantauan yang DILAKSANAKAN */
  const done = inspections.filter((i) => (i.grade || '') !== 'Dijadwalkan');
  out.push({
    element: 'monitoring-evidence',
    state: done.length > 0 ? 'evidenced' : 'missing',
    detail: done.length > 0
      ? `${done.length} dari ${inspections.length} inspeksi perikatan telah dilaksanakan.`
      : 'Belum ada inspeksi yang dilaksanakan — yang terdaftar semuanya baru dijadwalkan.',
    source: 'QM_INSPECTIONS',
  });

  /* ¶58(d)(ii) — evaluasi temuan & defisiensi beserta AKAR PENYEBABNYA */
  const findingsNoCause = findings.filter((f) => !has(f.cause)).map((f) => f.ins);
  const defsNoRoot = risks.filter((r) => r.deficiency && !has(r.deficiency.rootCause)).map((r) => r.id);
  const okCause = findings.length > 0 && findingsNoCause.length === 0 && defsNoRoot.length === 0;
  out.push({
    element: 'findings-and-deficiencies',
    state: okCause ? 'evidenced' : 'missing',
    detail: findings.length === 0 ? 'Belum ada temuan inspeksi yang tercatat.'
      : okCause
        ? `${findings.length} temuan inspeksi & seluruh defisiensi punya analisis akar penyebab.`
        : `Tanpa akar penyebab — temuan: ${findingsNoCause.join(' · ') || 'nihil'}; defisiensi: ${defsNoRoot.join(' · ') || 'nihil'}.`,
    source: 'QM_INSP_FINDINGS · SOQM_RISKS',
  });

  /* ¶58(d)(iii) — tindakan remedial & evaluasinya (¶43) */
  const defs = risks.filter((r) => r.deficiency);
  const incomplete = defs.filter((r) => {
    const d = r.deficiency!;
    return !has(d.action) || !has(d.owner) || !has(d.due);
  }).map((r) => r.id);
  out.push({
    element: 'remedial-actions',
    state: defs.length > 0 && incomplete.length === 0 ? 'evidenced' : defs.length === 0 ? 'evidenced' : 'missing',
    detail: defs.length === 0 ? 'Tidak ada defisiensi terdaftar, sehingga tidak ada tindakan remedial yang perlu didokumentasikan.'
      : incomplete.length === 0
        ? `Seluruh ${defs.length} defisiensi punya tindakan, pemilik & tenggat.`
        : `Tindakan remedial belum lengkap pada: ${incomplete.join(' · ')}.`,
    source: 'SOQM_RISKS · Defisiensi & Remediasi',
  });

  /* ¶58(d)(iv) — KOMUNIKASI mengenai pemantauan & remediasi.
     Tidak ada artefak terstruktur yang mencatat BAHWA hasil pemantauan
     dikomunikasikan, kepada siapa, dan kapan. `QM_MON_ACTIVITIES`
     mencatat aktivitasnya, bukan komunikasinya. Dinyatakan apa adanya
     alih-alih diberi toggle — lihat kepala berkas. */
  out.push({
    element: 'monitoring-communication',
    state: 'not-automatable',
    detail: 'Aplikasi mencatat aktivitas pemantauan, tetapi belum punya artefak yang membuktikan hasilnya dikomunikasikan — kepada siapa, kapan, dan dalam bentuk apa. Tidak diberi penandaan manual: ¶57(c) menuntut bukti, bukan pernyataan tentang bukti.',
    source: '— (belum ada artefak)',
  });

  /* ¶58(e) — basis kesimpulan ¶54 yang TERTULIS */
  out.push({
    element: 'conclusion-basis',
    state: has(x.writtenConclusion) ? 'evidenced' : 'missing',
    detail: has(x.writtenConclusion)
      ? 'Kesimpulan ¶54 tertulis tersimpan sebagai basis evaluasi.'
      : 'Belum ada kesimpulan ¶54 tertulis yang tersimpan — rekomendasi mesin bukan basis kesimpulan KAP.',
    source: 'firmAttest.soqmAnnualEval · Evaluasi Tahunan SMM',
  });

  /* ¶59 — hal ¶58 terkait jaringan (hanya bila KAP bagian jaringan) */
  const net = x.network;
  if (net && net.inNetwork === true) {
    const year = typeof net.year === 'number' ? net.year : null;
    const row = (net.monitoring || []).find((m) => m && year !== null && m.year === year);
    const ok = Boolean(row && has(row.obtainedAt) && row.communicatedToTeams === true && row.effectConsidered === true);
    out.push({
      element: 'network-matters',
      state: ok ? 'evidenced' : 'missing',
      detail: !row ? `Hasil pemantauan jaringan tahun ${year ?? '—'} belum diperoleh (¶51(b)).`
        : ok ? `Hasil pemantauan jaringan ${year} diperoleh, dikomunikasikan & dipertimbangkan.`
        : `Hasil pemantauan jaringan ${year} belum lengkap — ${!has(row.obtainedAt) ? 'belum diperoleh' : row.communicatedToTeams !== true ? 'belum dikomunikasikan ke tim' : 'pengaruhnya belum dipertimbangkan'}.`,
      source: 'QM_NETWORK · Governance',
    });
  }

  return out;
}

/** Elemen yang boleh dihitung `present` oleh `smmDocCoverage`. */
export function evidencedElements(ev: readonly ElementEvidence[]): readonly SmmDocElement[] {
  return ev.filter((e) => e.state === 'evidenced').map((e) => e.element);
}
