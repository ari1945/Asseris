/* ============================================================
   Asseris — Sumber defisiensi untuk kesimpulan SMM 1 ¶54 · SSOT
   ------------------------------------------------------------
   Modul ini menjawab satu pertanyaan: APA SAJA yang dihitung sebagai
   defisiensi ketika KAP menyimpulkan ¶54.

   ------------------------------------------------------------
   CACAT YANG DITUTUP

   1. DEFISIENSI JARINGAN TAK PERNAH MASUK HITUNGAN (¶52).
      `canon_smm_network` menilai defisiensi ketentuan/jasa jaringan
      dan `view_governance` menampilkannya, tetapi `evaluateSmm`
      hanya pernah menerima defisiensi dari `SOQM_RISKS`. Akibatnya
      panel "Faktor Keputusan ¶54" MENYATAKAN "Tidak ada defisiensi
      lain yang terbuka — Nihil" sementara layar Governance untuk
      firma yang sama menampilkan defisiensi jaringan terbuka tanpa
      tindakan remedial. Bukan sekadar kelalaian: aplikasi menegaskan
      hal yang tidak benar, lalu menyimpulkan ¶54 di atasnya.

      SMM 1 ¶48 menegaskan KAP TETAP bertanggung jawab atas sistem
      manajemen mutunya dan tidak boleh membiarkan kepatuhan pada
      ketentuan jaringan melanggar ketentuan SMM. Defisiensi dalam
      ketentuan/jasa jaringan yang KAP andalkan karena itu adalah
      defisiensi sistem manajemen mutu KAP — dan ¶52(b) menuntut
      tindakan remedial KAP sendiri, bukan menunggu jaringan.

   2. PEMETAAN TERDUPLIKASI ANTAR-LAYAR. `view_isqm_deep` memetakan
      baris risiko → `SmmDeficiency` di dalam JSX-nya sendiri,
      sementara `view_governance` sama sekali tidak memetakan apa pun
      dan membaca `QM_EVAL.conclusion` dari seed. Dua layar, dua
      kebenaran, untuk satu firma dan satu periode. Pemetaannya kini
      tinggal di sini, sehingga keduanya tidak dapat menyimpang.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */
import type {
  SmmDeficiency, DeficiencyLocus, DeficiencyFrequency, PervasivenessIndicator,
} from './canon_smm_evaluation';
import type { NetworkDeficiency, NetworkItem } from './canon_smm_network';

/** Dari mana sebuah defisiensi berasal — supaya kesimpulan dapat ditelusuri. */
export type DeficiencyOrigin = 'risk' | 'network';

export interface OriginedDeficiency extends SmmDeficiency {
  readonly origin: DeficiencyOrigin;
  /** Kalimat singkat untuk ditampilkan berdampingan dengan id. */
  readonly title?: string | null;
}

/* ------------------------------------------------------------
   Baris risiko mutu (SOQM_RISKS) → SmmDeficiency
   ------------------------------------------------------------ */

/** Bentuk minimal baris `SOQM_RISKS` yang dipakai pemetaan. */
export interface RiskRowLike {
  readonly id: string;
  readonly comp?: string | null;
  readonly risk?: string | null;
  readonly deficiency?: {
    readonly locus?: DeficiencyLocus | null;
    readonly compensatingResponse?: boolean | null;
    readonly frequency?: DeficiencyFrequency | null;
    readonly sev?: 'Rendah' | 'Sedang' | 'Tinggi' | null;
    readonly significant?: boolean | null;
    readonly pervasiveness?: readonly PervasivenessIndicator[] | null;
    readonly remediated?: boolean | null;
    readonly effectCorrected?: boolean | null;
    readonly status?: string | null;
  } | null;
}

export function smmDeficiencyFromRisk(r: RiskRowLike): OriginedDeficiency {
  const d = r.deficiency || {};
  return {
    origin: 'risk',
    id: r.id,
    title: r.risk ?? null,
    component: r.comp ?? null,
    locus: d.locus ?? null,
    compensatingResponse: d.compensatingResponse ?? null,
    frequency: d.frequency ?? null,
    severity: d.sev ?? null,
    significant: d.significant ?? null,
    pervasiveness: (d.pervasiveness || []) as readonly PervasivenessIndicator[],
    /* ¶43 + A191 — DUA syarat terpisah. `status === 'Selesai'` menandai
       tindakan remedial selesai, BUKAN dampaknya sudah dikoreksi. Bila
       field eksplisit tak ada, defisiensi tetap TERBUKA (gagal-tertutup). */
    remediated: d.remediated ?? (d.status === 'Selesai'),
    effectCorrected: d.effectCorrected ?? false,
  };
}

/* ------------------------------------------------------------
   Defisiensi jaringan (¶52) → SmmDeficiency
   ------------------------------------------------------------ */

/** Field penilaian A163/A192 yang boleh dicatat KAP atas defisiensi jaringan. */
export interface NetworkDeficiencyJudgement {
  readonly locus?: DeficiencyLocus | null;
  readonly compensatingResponse?: boolean | null;
  readonly frequency?: DeficiencyFrequency | null;
  readonly severity?: 'Rendah' | 'Sedang' | 'Tinggi' | null;
  readonly significant?: boolean | null;
  readonly pervasiveness?: readonly PervasivenessIndicator[] | null;
  readonly effectCorrected?: boolean | null;
}

export type NetworkDeficiencyLike = NetworkDeficiency & NetworkDeficiencyJudgement;

/**
 * Defisiensi ketentuan/jasa jaringan sebagai defisiensi SMM KAP.
 *
 * Dua field DITURUNKAN, bukan dikarang — keduanya punya dasar tekstual:
 *
 * · `locus = 'design'` (bawaan). Ketentuan/jasa jaringan yang KAP pilih
 *   untuk dipakai ADALAH bagian dari respons yang KAP rancang (¶49(a)).
 *   Cacat di dalamnya karena itu cacat RANCANGAN respons KAP — bukan
 *   cacat implementasi atau pengoperasian. KAP boleh mencatat penilaian
 *   lain secara eksplisit; yang tidak boleh adalah tak menilai sama sekali.
 *
 * · `compensatingResponse` diturunkan dari ¶49(b): bila KAP menilai
 *   ketentuan itu perlu DITAMBAH kontrol KAP sendiri (`supplemented`),
 *   kontrol tambahan itu memang respons kompensasi dalam pengertian A163.
 *   `as-is` / `adapted` / `rejected` tidak dengan sendirinya kompensasi.
 *
 * · `remediated` diturunkan dari ¶52(b): tindakan remedial KAP yang
 *   dirancang & diimplementasikan (¶42). Tanpa tindakan remedial, tidak
 *   ada yang bisa disebut sudah diremediasi.
 *
 * · `effectCorrected` gagal-tertutup ke `false` — sama seperti jalur
 *   risiko mutu. A191 menuntut dampaknya benar-benar dikoreksi, dan itu
 *   tidak boleh disimpulkan dari ketiadaan data.
 */
export function smmDeficiencyFromNetwork(
  d: NetworkDeficiencyLike,
  item?: NetworkItem | null,
): OriginedDeficiency {
  return {
    origin: 'network',
    id: d.id,
    title: d.description ?? null,
    component: item ? (item.component ?? null) : null,
    locus: d.locus ?? 'design',
    compensatingResponse: d.compensatingResponse ?? (item ? item.adaptation === 'supplemented' : null),
    frequency: d.frequency ?? null,
    severity: d.severity ?? null,
    significant: d.significant ?? null,
    pervasiveness: (d.pervasiveness || []) as readonly PervasivenessIndicator[],
    remediated: Boolean((d.remedialAction || '').trim()),
    effectCorrected: d.effectCorrected ?? false,
  };
}

/* ------------------------------------------------------------
   Pengumpul tunggal
   ------------------------------------------------------------ */

export interface SmmDeficiencySources {
  /** Baris `SOQM_RISKS`; hanya yang punya `deficiency` yang dihitung. */
  readonly risks?: readonly RiskRowLike[] | null;
  /** ¶48–52; diabaikan bila KAP bukan bagian jaringan. */
  readonly network?: {
    readonly inNetwork?: boolean | null;
    readonly items?: readonly NetworkItem[] | null;
    readonly deficiencies?: readonly NetworkDeficiencyLike[] | null;
  } | null;
}

/**
 * Seluruh defisiensi yang mengikat kesimpulan ¶54, dari SEMUA sumbernya.
 *
 * Dipakai `view_isqm_deep` (Evaluasi Tahunan) DAN `view_governance`
 * (kartu simpulan) — satu pemetaan, sehingga kedua layar tidak dapat
 * menyatakan kesimpulan yang berbeda untuk periode yang sama.
 */
export function collectSmmDeficiencies(src: SmmDeficiencySources | null | undefined): readonly OriginedDeficiency[] {
  const s = src || {};
  const out: OriginedDeficiency[] = [];

  for (const r of s.risks || []) {
    if (r && r.deficiency) out.push(smmDeficiencyFromRisk(r));
  }

  const net = s.network;
  if (net && net.inNetwork === true) {
    const items = net.items || [];
    for (const d of net.deficiencies || []) {
      if (!d) continue;
      const item = items.find((i) => i && i.id === d.itemId) || null;
      out.push(smmDeficiencyFromNetwork(d, item));
    }
  }

  return out;
}

/** Peta id → defisiensi, untuk melabeli asal pada daftar kesimpulan. */
export function originOf(
  list: readonly OriginedDeficiency[],
  id: string,
): DeficiencyOrigin | null {
  const f = list.find((d) => d.id === id);
  return f ? f.origin : null;
}

export const ORIGIN_LABEL: Record<DeficiencyOrigin, string> = {
  risk: 'Register risiko mutu',
  network: 'Ketentuan/jasa jaringan (¶52)',
};
