/* ============================================================
   Asseris — Metrik per-komponen SMM (DITURUNKAN) · SSOT
   ------------------------------------------------------------
   CACAT YANG DITUTUP (V-3, tinjauan visual 2026-08-13)

   `QM_COMPONENTS` membawa tiga field yang dirender sebagai fakta
   padahal tak tertaut register mana pun:

       { id:'C1', …, score: 92, risks: 3, defs: 0, trend:[86,88,90,92] }

   Register risiko mutu hanya berisi 6 baris dan NOL di antaranya
   milik Tata Kelola, sementara kartu C1 berbunyi "3 risiko · 92%"
   dan tab Tujuan Mutu pada layar yang sama berbunyi "C1 · 0/5
   tertangani". Penjumlahan seluruh kartu menghasilkan 35 risiko
   atas register yang berisi 6.

   `view_isqm_parts.tsx` bahkan MENGHITUNG jumlah yang benar
   (`mapName`) lalu tidak pernah memanggilnya — satu-satunya
   kemunculan di seluruh berkas adalah deklarasinya sendiri.

   PR-2 arc SMM sudah menurunkan `obj` dari `canon_smm_objectives`
   dan `ref` dari `canon_smm_refs`, dengan komentar seed yang
   menjelaskan mengapa integer dekoratif berbahaya — lalu
   meninggalkan `score`, `risks`, `defs`, dan `trend` di objek yang
   sama, beberapa baris di sebelahnya.

   ------------------------------------------------------------
   YANG DIGANTIKAN, DAN DENGAN APA

   `risks` / `defs`  → dihitung dari register risiko mutu & mesin
                       ¶54 (A191: terbuka = belum diremediasi ATAU
                       dampaknya belum dikoreksi).

   `score` / `trend` → DICABUT, tidak diganti angka lain. Tidak ada
                       sumber jujur untuk "skor efektivitas
                       komponen": SMM 1 tidak mengenal skor, dan
                       merekayasa formula adalah persis "ambang
                       karangan" yang dilarang PRD arc ini. Yang
                       ditampilkan sebagai gantinya adalah CAKUPAN
                       TUJUAN MANDATORI — besaran kanonik ¶28–33
                       yang memang punya arti dan memang bisa gagal.
                       `trend` adalah riwayat skor yang tak pernah
                       ada; tidak ada tren yang dapat dipulihkan.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */
import type { ComponentCoverage } from './canon_smm_objectives';
import type { SmmEvaluation } from './canon_smm_evaluation';
import type { OriginedDeficiency } from './canon_smm_deficiencies';

/** Bentuk minimal baris `QM_COMPONENTS` yang dipakai modul ini. */
export interface ComponentRowLike {
  readonly id: string;
  readonly name: string;
  readonly ref?: string | null;
  readonly obj?: number | null;
}

/** Bentuk minimal baris `SOQM_RISKS`. */
export interface ComponentRiskLike {
  readonly id: string;
  readonly comp?: string | null;
  readonly monitor?: string | null;
}

/**
 * Status komponen — DITURUNKAN, bukan string seed.
 *
 * `deficient` bila ada defisiensi TERBUKA pada komponen itu.
 * `attention` bila tak ada defisiensi terbuka tetapi masih ada
 * tujuan mandatori yang belum tertangani (defisiensi RANCANGAN ¶25–26).
 * `effective` hanya bila keduanya nihil.
 */
export type ComponentStatus = 'effective' | 'attention' | 'deficient';

export const COMPONENT_STATUS_LABEL: Record<ComponentStatus, string> = {
  effective: 'Efektif',
  attention: 'Perlu Perhatian',
  deficient: 'Defisiensi',
};

export interface ComponentMetric {
  readonly id: string;
  readonly name: string;
  /** Risiko mutu terdaftar pada komponen ini. */
  readonly riskCount: number;
  /** Risiko yang pemantauannya belum dinyatakan efektif. */
  readonly riskNotEffective: number;
  /** Defisiensi TERBUKA (A191) yang menyentuh komponen ini. */
  readonly openDeficiencies: readonly string[];
  /** Tujuan mandatori ¶28–33 pada komponen ini; 0 untuk C2 & C8. */
  readonly objectivesTotal: number;
  /** Tujuan yang punya risiko ATAU waiver ¶17 yang sah. */
  readonly objectivesAddressed: number;
  /** C2 & C8 adalah PROSES (¶23–27 · ¶35–47), bukan pemilik tujuan. */
  readonly isProcess: boolean;
  readonly status: ComponentStatus;
}

/** Cocokkan nama komponen pada baris risiko dengan nama komponen kanonik. */
function riskBelongsTo(riskComp: string | null | undefined, componentName: string): boolean {
  const a = String(riskComp || '').trim().toLowerCase();
  const b = String(componentName || '').trim().toLowerCase();
  if (!a || !b) return false;
  return a === b || b.startsWith(a) || a.startsWith(b);
}

/**
 * Metrik per-komponen yang seluruhnya diturunkan.
 *
 * `coverage` berasal dari `coverageByComponent(objectiveCoverage(...))`;
 * `evaluation` dari `evaluateSmm(collectSmmDeficiencies(...))`;
 * `deficiencies` dipakai untuk memetakan id defisiensi ke komponennya.
 */
export function componentMetrics(
  components: readonly ComponentRowLike[] | null | undefined,
  risks: readonly ComponentRiskLike[] | null | undefined,
  coverage: readonly ComponentCoverage[] | null | undefined,
  evaluation: SmmEvaluation | null | undefined,
  deficiencies: readonly OriginedDeficiency[] | null | undefined,
): readonly ComponentMetric[] {
  const comps = (components || []).filter(Boolean);
  const rows = (risks || []).filter(Boolean);
  /* `coverageByComponent` mengunci pada KODE komponen (C1, C3, …) dan
     sudah menyaring keluar C2 & C8 — keduanya proses (¶23–27 · ¶35–47),
     bukan pemilik tujuan ¶28–33. Ketiadaan entri karena itu BUKAN nol
     cakupan, melainkan penanda `isProcess`. */
  const covByCode = new Map<string, ComponentCoverage>(
    (coverage || []).map((c) => [String(c.component), c]),
  );

  const ev = evaluation;
  const openIds = new Set<string>([
    ...(ev ? ev.openPervasive : []),
    ...(ev ? ev.openSignificant : []),
    ...(ev ? ev.openMinor : []),
  ]);
  const defList = (deficiencies || []).filter((d) => openIds.has(d.id));

  return comps.map((c) => {
    const mine = rows.filter((r) => riskBelongsTo(r.comp, c.name));
    const cov = covByCode.get(c.id);
    const objectivesTotal = cov ? cov.total : 0;
    const objectivesAddressed = cov ? cov.covered + cov.waived : 0;
    const isProcess = objectivesTotal === 0;

    const openDeficiencies = defList
      .filter((d) => riskBelongsTo(d.component, c.name))
      .map((d) => d.id);

    const riskNotEffective = mine.filter((r) => r.monitor !== 'Efektif').length;

    const status: ComponentStatus =
      openDeficiencies.length > 0 ? 'deficient'
      : (!isProcess && objectivesAddressed < objectivesTotal) ? 'attention'
      : 'effective';

    return {
      id: c.id, name: c.name,
      riskCount: mine.length,
      riskNotEffective,
      openDeficiencies,
      objectivesTotal, objectivesAddressed, isProcess,
      status,
    };
  });
}

/** Ringkas satu komponen menjadi teks cakupan siap-tampil. */
export function coverageText(m: ComponentMetric): string {
  return m.isProcess ? 'proses — tanpa tujuan ¶28–33'
    : m.objectivesAddressed + '/' + m.objectivesTotal + ' tujuan tertangani';
}
