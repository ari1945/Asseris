/* ============================================================
   Asseris — Evaluasi Sistem Manajemen Mutu SMM 1 ¶53–54 · SSOT
   ------------------------------------------------------------
   ¶53 mewajibkan pemegang tanggung jawab tertinggi mengevaluasi
   sistem manajemen mutu sekurang-kurangnya setahun sekali. ¶54
   mengharuskan kesimpulan dalam SALAH SATU dari tiga bentuk:

     (a) memberikan keyakinan memadai;
     (b) memberikan keyakinan memadai KECUALI UNTUK defisiensi
         teridentifikasi yang berpengaruh SIGNIFIKAN namun TIDAK
         PERVASIF;
     (c) TIDAK memberikan keyakinan memadai.

   ------------------------------------------------------------
   CACAT YANG DITUTUP

   Mesin lama di `view_isqm_deep.tsx` MENGHITUNG pervasivitas,
   MENAMPILKANNYA sebagai "Faktor Keputusan ¶54", lalu MENGABAIKANNYA:
   logika kesimpulan hanya membaca `defsHighOpen || inspBad ||
   cmpInvest.length > 1`. Defisiensi pervasif karena itu tidak pernah
   menghasilkan ¶54(c) — justru cabang yang paling menentukan.

   Lebih buruk, pervasivitas di-hardcode ke ID seed:
       (r.id === 'QR-02') || (r.id === 'QR-04')
   sehingga risiko mutu baru tidak akan pernah dinilai pervasif.

   ------------------------------------------------------------
   DASAR PENILAIAN — bukan ambang karangan

   PERVASIF: A192 memberi lima indikator eksplisit. Defisiensi
   pervasif bila memenuhi ≥1 indikator (lihat `PERVASIVENESS_LABEL`).

   SIGNIFIKAN: A163 memberi faktor pertimbangan — sifat defisiensi
   (rancangan · implementasi · operasi), ada/tidaknya respons
   kompensasi, akar penyebab, frekuensi, serta besaran & lamanya.
   Standar TIDAK memberi formula: ini pertimbangan profesional.
   Karena itu firma mencatat penilaiannya sendiri (`significant`),
   dan modul ini hanya menegakkan LANTAI yang tak boleh ditembus
   (`significanceFloor`) — firma boleh menaikkan, tidak menurunkan.

   CARVE-OUT A191: defisiensi signifikan — termasuk yang pervasif —
   yang telah diremediasi dengan tepat DAN dampaknya dikoreksi pada
   tanggal evaluasi TIDAK menurunkan kesimpulan. Keduanya adalah
   syarat TERPISAH: `remediated` (¶43 — tindakan remedial dinilai
   dirancang tepat & efektif) DAN `effectCorrected`. Defisiensi
   seperti itu tetap WAJIB muncul dalam basis kesimpulan (¶58(e)),
   jadi ia dikembalikan lewat `carveOut`, bukan dibuang.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

/** Kelima indikator pervasivitas SMM 1 A192. */
export type PervasivenessIndicator =
  | 'multi-component'      // memengaruhi beberapa komponen/aspek SMM
  | 'fundamental-component'// terbatas satu komponen, TETAPI fundamental bagi SMM
  | 'multi-unit'           // memengaruhi beberapa unit bisnis / lokasi geografis
  | 'fundamental-unit'     // terbatas satu unit/lokasi, TETAPI unit itu fundamental
  | 'most-engagements';    // memengaruhi sebagian besar perikatan jenis tertentu

export const PERVASIVENESS_LABEL: Record<PervasivenessIndicator, string> = {
  'multi-component': 'Memengaruhi beberapa komponen atau aspek sistem manajemen mutu',
  'fundamental-component': 'Terbatas pada satu komponen, tetapi fundamental bagi sistem manajemen mutu',
  'multi-unit': 'Memengaruhi beberapa unit bisnis atau lokasi geografis KAP',
  'fundamental-unit': 'Terbatas pada satu unit/lokasi, tetapi unit itu fundamental bagi KAP',
  'most-engagements': 'Memengaruhi sebagian besar perikatan dengan jenis atau sifat tertentu',
};

/** A163 — di mana defisiensi berada. Rancangan dinilai paling berat. */
export type DeficiencyLocus = 'design' | 'implementation' | 'operation';

/** A163 — frekuensi terjadinya masalah yang menyebabkan defisiensi. */
export type DeficiencyFrequency = 'isolated' | 'recurring' | 'systemic';

export interface SmmDeficiency {
  readonly id: string;
  readonly component?: string | null;
  /** A163 · sifat defisiensi. */
  readonly locus?: DeficiencyLocus | null;
  /** A163 · terdapat respons kompensasi atas risiko mutu terkait. */
  readonly compensatingResponse?: boolean | null;
  /** A163 · frekuensi terjadinya. */
  readonly frequency?: DeficiencyFrequency | null;
  /** Penilaian keparahan firma. */
  readonly severity?: 'Rendah' | 'Sedang' | 'Tinggi' | null;
  /** Pertimbangan profesional firma atas signifikansi (boleh menaikkan lantai). */
  readonly significant?: boolean | null;
  /** A192 · indikator pervasivitas yang berlaku; kosong = tidak pervasif. */
  readonly pervasiveness?: readonly PervasivenessIndicator[] | null;
  /** ¶43 · tindakan remedial dinilai dirancang tepat DAN efektif. */
  readonly remediated?: boolean | null;
  /** A191 · dampak defisiensi telah dikoreksi pada tanggal evaluasi. */
  readonly effectCorrected?: boolean | null;
}

/* ------------------------------------------------------------
   Predikat dasar
   ------------------------------------------------------------ */

/** A192 — pervasif bila memenuhi sekurangnya satu indikator. */
export function isPervasive(d: SmmDeficiency): boolean {
  return (d.pervasiveness || []).length > 0;
}

/**
 * A191 — defisiensi masih TERBUKA kecuali sudah diremediasi DAN
 * dampaknya dikoreksi. Dua syarat, sengaja terpisah: menandai
 * "sudah diremediasi" saja tidak boleh cukup untuk menaikkan
 * kesimpulan, karena remediasi yang dampaknya belum dikoreksi
 * belum memulihkan keyakinan memadai.
 */
export function isOpen(d: SmmDeficiency): boolean {
  return !(d.remediated === true && d.effectCorrected === true);
}

/**
 * Lantai signifikansi yang tak boleh ditembus penilaian firma.
 *
 * Diturunkan dari faktor A163 ditambah satu implikasi logis ¶54:
 * ¶54(b) berbicara tentang defisiensi "signifikan namun TIDAK
 * pervasif" — sehingga pervasif SELALU signifikan.
 */
export function significanceFloor(d: SmmDeficiency): boolean {
  if (isPervasive(d)) return true;                 // implikasi ¶54(b)
  if (d.severity === 'Tinggi') return true;
  if (d.frequency === 'systemic') return true;
  // A163: defisiensi pada RANCANGAN tanpa respons kompensasi
  if (d.locus === 'design' && d.compensatingResponse !== true) return true;
  return false;
}

/** Signifikansi efektif: penilaian firma boleh menaikkan, tak boleh menurunkan lantai. */
export function isSignificant(d: SmmDeficiency): boolean {
  return significanceFloor(d) || d.significant === true;
}

/* ------------------------------------------------------------
   Mesin kesimpulan ¶54
   ------------------------------------------------------------ */

export type SmmConclusion = 'reasonable' | 'reasonable-except-for' | 'not-reasonable';

export const CONCLUSION_PARA: Record<SmmConclusion, string> = {
  'reasonable': '¶54(a)',
  'reasonable-except-for': '¶54(b)',
  'not-reasonable': '¶54(c)',
};

export const CONCLUSION_LABEL: Record<SmmConclusion, string> = {
  'reasonable': 'Memberikan keyakinan memadai',
  'reasonable-except-for': 'Memadai, kecuali untuk defisiensi signifikan yang tidak pervasif',
  'not-reasonable': 'Tidak memberikan keyakinan memadai',
};

export interface SmmEvaluation {
  readonly conclusion: SmmConclusion;
  /** Rujukan paragraf siap-tampil, mis. `'¶54(b)'`. */
  readonly paragraph: string;
  readonly label: string;
  /** Defisiensi TERBUKA & pervasif — pemaksa ¶54(c). */
  readonly openPervasive: readonly string[];
  /** Defisiensi TERBUKA & signifikan namun tidak pervasif — pemaksa ¶54(b). */
  readonly openSignificant: readonly string[];
  /** Defisiensi terbuka yang tidak signifikan — tidak menurunkan kesimpulan. */
  readonly openMinor: readonly string[];
  /**
   * A191 — signifikan/pervasif TETAPI sudah diremediasi & dampaknya
   * dikoreksi. Tidak menurunkan kesimpulan, namun WAJIB tercantum
   * dalam basis kesimpulan (¶58(e)).
   */
  readonly carveOut: readonly string[];
}

/**
 * Kesimpulan ¶54 atas nama KAP.
 *
 * Aturannya mengikat, bukan dekoratif:
 *   ada pervasif TERBUKA                 → ¶54(c)
 *   ada signifikan-tak-pervasif TERBUKA  → ¶54(b)
 *   selain itu                           → ¶54(a)
 */
export function evaluateSmm(
  deficiencies: readonly SmmDeficiency[] | null | undefined,
): SmmEvaluation {
  const list = (deficiencies || []).filter(Boolean);

  const openPervasive: string[] = [];
  const openSignificant: string[] = [];
  const openMinor: string[] = [];
  const carveOut: string[] = [];

  for (const d of list) {
    const sig = isSignificant(d);
    if (!isOpen(d)) {
      /* A191: hanya yang signifikan yang layak dicatat sebagai carve-out;
         defisiensi kecil yang sudah selesai bukan bagian dasar kesimpulan. */
      if (sig) carveOut.push(d.id);
      continue;
    }
    if (isPervasive(d)) openPervasive.push(d.id);
    else if (sig) openSignificant.push(d.id);
    else openMinor.push(d.id);
  }

  const conclusion: SmmConclusion =
    openPervasive.length > 0 ? 'not-reasonable'
    : openSignificant.length > 0 ? 'reasonable-except-for'
    : 'reasonable';

  return {
    conclusion,
    paragraph: CONCLUSION_PARA[conclusion],
    label: CONCLUSION_LABEL[conclusion],
    openPervasive, openSignificant, openMinor, carveOut,
  };
}

/** Indikator pervasivitas yang berlaku pada satu defisiensi, siap ditampilkan. */
export function pervasivenessReasons(d: SmmDeficiency): readonly string[] {
  return (d.pervasiveness || []).map((p) => PERVASIVENESS_LABEL[p]).filter(Boolean);
}
