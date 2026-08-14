/* ============================================================
   Asseris — Eligibilitas Penelaah Mutu Perikatan SMM 2 ¶17–23 · SSOT
   ------------------------------------------------------------
   ¶17  Tanggung jawab MENUNJUK penelaah diberikan kepada individu
        yang berkompetensi & berwenang.
   ¶18  Kriteria eligibilitas: penelaah BUKAN anggota tim perikatan, dan
        (a) berkompetensi & berkapabilitas, termasuk WAKTU YANG CUKUP,
            serta WEWENANG yang tepat;
        (b) mematuhi ketentuan etika — termasuk ancaman terhadap
            OBJEKTIVITAS & INDEPENDENSI;
        (c) memenuhi ketentuan peraturan perundang-undangan.
   ¶19  Periode JEDA DUA TAHUN sebelum mantan rekan perikatan dapat
        menjadi penelaah mutu perikatan atas perikatan itu.
   ¶20  Kriteria eligibilitas bagi individu yang MEMBANTU penelaah.
   ¶21  Penelaah bertanggung jawab keseluruhan; mengarahkan, mengawasi
        & menelaah pekerjaan pembantunya.
   ¶22–23 Ketika eligibilitas MENURUN: penelaah memberi tahu individu
        yang tepat, lalu TOLAK penunjukan (bila penelaahan belum mulai)
        atau HENTIKAN pelaksanaannya (bila sudah mulai); KAP menunjuk
        pengganti.

   ------------------------------------------------------------
   CACAT YANG DITUTUP

   `view_eqr.tsx` menutup gerbang dengan:

       canClear = allChecked && openFindings === 0 && !r.cleared

   Eligibilitas TIDAK IKUT SAMA SEKALI. Penelaah yang tidak memenuhi
   syarat tetap dapat menutup gerbang yang mengunci penerbitan opini.

   Lebih dalam: `EQR_META[].coolingOk/compOk/objOk` adalah BOOLEAN YANG
   DITULIS TANGAN di seed, bukan turunan — dan blok eligibilitasnya
   hanya dirender bila `meta.coolingOff || meta.competence`, sehingga
   EQR tanpa meta tidak menampilkan apa pun DAN tetap bisa ditutup.

   ¶19 pun tak pernah dihitung, padahal data masa jabatan rekan sudah
   ada di register firma.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`. SENGAJA dapat diimpor server (pola sama
   `rbac.ts`) agar UI dan server memakai aturan yang sama.
   ============================================================ */

export type EligibilityDefect =
  | 'not-appointed'             // ¶17
  | 'engagement-team-member'    // ¶18
  | 'cooling-off-not-elapsed'   // ¶19
  | 'competence-not-assessed'   // ¶18(a)
  | 'insufficient-time'         // ¶18(a)
  | 'authority-not-established' // ¶18(a)
  | 'objectivity-threat'        // ¶18(b)
  | 'independence-not-confirmed'// ¶18(b)
  | 'regulatory-ineligible'     // ¶18(c)
  | 'eligibility-impaired';     // ¶22–23

export const ELIGIBILITY_DEFECT_LABEL: Record<EligibilityDefect, string> = {
  'not-appointed': 'Belum ditunjuk oleh individu yang berwenang (¶17)',
  'engagement-team-member': 'Penelaah adalah anggota tim perikatan atas perikatan ini (¶18)',
  'cooling-off-not-elapsed': 'Periode jeda dua tahun sejak menjabat rekan perikatan belum terlampaui (¶19)',
  'competence-not-assessed': 'Kompetensi & kapabilitas penelaah belum dinilai (¶18(a))',
  'insufficient-time': 'Penelaah tidak memiliki waktu yang cukup (¶18(a))',
  'authority-not-established': 'Wewenang penelaah belum ditetapkan (¶18(a))',
  'objectivity-threat': 'Terdapat ancaman terhadap objektivitas yang belum diatasi (¶18(b))',
  'independence-not-confirmed': 'Kepatuhan independensi penelaah belum dikonfirmasi (¶18(b))',
  'regulatory-ineligible': 'Tidak memenuhi ketentuan peraturan perundang-undangan (¶18(c))',
  'eligibility-impaired': 'Eligibilitas penelaah menurun — penunjukan harus ditolak atau penelaahan dihentikan (¶22–23)',
};

/** Satu tahun penugasan rekan perikatan — basis perhitungan jeda ¶19. */
export interface PartnerTenureRow {
  /** Perikatan atau klien yang dipimpin. */
  readonly eng?: string | null;
  readonly clientId?: string | null;
  readonly partner: string;
  readonly year: number;
}

export interface EqrReviewerInput {
  readonly reviewer?: string | null;
  /** ¶17 — individu yang menunjuk. */
  readonly appointedBy?: string | null;
  /** ¶18(a) */
  readonly competenceAssessed?: boolean | null;
  readonly sufficientTime?: boolean | null;
  readonly authorityEstablished?: boolean | null;
  /** ¶18(b) */
  readonly objectivityThreat?: boolean | null;
  readonly independenceConfirmed?: boolean | null;
  /** ¶18(c) */
  readonly regulatoryEligible?: boolean | null;
  /** ¶22–23 — eligibilitas menurun setelah penunjukan. */
  readonly impaired?: boolean | null;
}

/** Nama orang dinormalkan (gelar dibuang) agar pembandingan stabil. */
export function normalizeName(name: string | null | undefined): string {
  return String(name || '')
    .replace(/,?\s*(CPA|CA|Ak\.?|S\.E\.?|M\.Ak\.?|BKP)\b/gi, '')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

/* ------------------------------------------------------------
   ¶19 — periode jeda dua tahun
   ------------------------------------------------------------ */

export interface CoolingOffStatus {
  /** Tahun terakhir penelaah menjabat rekan perikatan atas perikatan ini. */
  readonly lastServedYear: number | null;
  readonly yearsSince: number | null;
  readonly elapsed: boolean;
  readonly requiredYears: number;
}

/**
 * Status jeda ¶19, DITURUNKAN dari riwayat penugasan rekan perikatan —
 * bukan boolean yang ditulis tangan.
 *
 * `requiredYears` default 2 sesuai ¶19, tetapi dapat dinaikkan bila
 * peraturan atau ketentuan etika menuntut lebih lama (¶19 mengizinkan).
 */
export function coolingOffStatus(
  reviewer: string | null | undefined,
  engagementId: string | null | undefined,
  clientId: string | null | undefined,
  history: readonly PartnerTenureRow[] | null | undefined,
  currentYear: number,
  requiredYears = 2,
): CoolingOffStatus {
  const who = normalizeName(reviewer);
  if (!who) return { lastServedYear: null, yearsSince: null, elapsed: false, requiredYears };

  const served = (history || [])
    .filter((h): h is PartnerTenureRow => !!h && normalizeName(h.partner) === who)
    .filter((h) => (engagementId && h.eng === engagementId) || (clientId && h.clientId === clientId))
    .map((h) => h.year)
    .filter((y) => Number.isFinite(y));

  if (served.length === 0) {
    return { lastServedYear: null, yearsSince: null, elapsed: true, requiredYears };
  }
  const last = Math.max(...served);
  const since = currentYear - last;
  return { lastServedYear: last, yearsSince: since, elapsed: since >= requiredYears, requiredYears };
}

/* ------------------------------------------------------------
   ¶18 & ¶20 — penilaian eligibilitas
   ------------------------------------------------------------ */

export interface EligibilityResult {
  readonly eligible: boolean;
  readonly defects: readonly EligibilityDefect[];
  readonly coolingOff: CoolingOffStatus;
}

export interface EngagementTeamRef {
  readonly partner?: string | null;
  readonly manager?: string | null;
  readonly team?: readonly string[] | null;
}

/**
 * Eligibilitas penelaah mutu perikatan (¶17–19, ¶22–23).
 *
 * GAGAL-TERTUTUP: setiap penilaian ¶18 yang BELUM dinyatakan dianggap
 * belum terpenuhi. Ketiadaan bukti bukan bukti kepatuhan — kesalahan
 * yang persis sama pernah membuka gerbang EQR untuk perikatan PIE.
 */
export function assessReviewerEligibility(
  input: EqrReviewerInput | null | undefined,
  team: EngagementTeamRef | null | undefined,
  engagementId: string | null | undefined,
  clientId: string | null | undefined,
  history: readonly PartnerTenureRow[] | null | undefined,
  currentYear: number,
  requiredYears = 2,
): EligibilityResult {
  const i = input || {};
  const who = normalizeName(i.reviewer);
  const defects: EligibilityDefect[] = [];

  const cooling = coolingOffStatus(i.reviewer, engagementId, clientId, history, currentYear, requiredYears);

  if (!(i.appointedBy || '').trim()) defects.push('not-appointed');

  if (who && team) {
    const members = [team.partner, team.manager, ...(team.team || [])].map(normalizeName);
    if (members.indexOf(who) >= 0) defects.push('engagement-team-member');
  }

  if (!cooling.elapsed) defects.push('cooling-off-not-elapsed');

  if (i.competenceAssessed !== true) defects.push('competence-not-assessed');
  if (i.sufficientTime !== true) defects.push('insufficient-time');
  if (i.authorityEstablished !== true) defects.push('authority-not-established');
  if (i.objectivityThreat === true) defects.push('objectivity-threat');
  if (i.independenceConfirmed !== true) defects.push('independence-not-confirmed');
  if (i.regulatoryEligible !== true) defects.push('regulatory-ineligible');
  if (i.impaired === true) defects.push('eligibility-impaired');

  return { eligible: defects.length === 0, defects, coolingOff: cooling };
}

/** ¶20 — individu yang membantu penelaah. */
export interface EqrAssistantInput {
  readonly name?: string | null;
  readonly competenceAssessed?: boolean | null;
  readonly sufficientTime?: boolean | null;
  readonly independenceConfirmed?: boolean | null;
}

export function assessAssistantEligibility(
  a: EqrAssistantInput | null | undefined,
  team: EngagementTeamRef | null | undefined,
): EligibilityResult {
  const x = a || {};
  const who = normalizeName(x.name);
  const defects: EligibilityDefect[] = [];
  if (who && team) {
    const members = [team.partner, team.manager, ...(team.team || [])].map(normalizeName);
    if (members.indexOf(who) >= 0) defects.push('engagement-team-member');
  }
  if (x.competenceAssessed !== true) defects.push('competence-not-assessed');
  if (x.sufficientTime !== true) defects.push('insufficient-time');
  if (x.independenceConfirmed !== true) defects.push('independence-not-confirmed');
  return {
    eligible: defects.length === 0, defects,
    coolingOff: { lastServedYear: null, yearsSince: null, elapsed: true, requiredYears: 0 },
  };
}

/* ------------------------------------------------------------
   ¶22–23 — tindakan ketika eligibilitas menurun
   ------------------------------------------------------------ */

export type ImpairmentAction = 'decline-appointment' | 'stop-review' | 'none';

export const IMPAIRMENT_ACTION_LABEL: Record<ImpairmentAction, string> = {
  'decline-appointment': 'Tolak penunjukan — penelaahan belum dimulai (¶23(a))',
  'stop-review': 'Hentikan pelaksanaan penelaahan (¶23(b))',
  'none': 'Tidak ada tindakan yang dituntut',
};

/**
 * Tindakan ¶23 yang dituntut ketika eligibilitas menurun.
 * Bergantung pada apakah penelaahan SUDAH DIMULAI.
 */
export function impairmentAction(impaired: boolean, reviewStarted: boolean): ImpairmentAction {
  if (!impaired) return 'none';
  return reviewStarted ? 'stop-review' : 'decline-appointment';
}

/* ------------------------------------------------------------
   Gerbang penutupan penelaahan
   ------------------------------------------------------------ */

export interface EqrClearInput {
  readonly checklistComplete: boolean;
  readonly openFindings: number;
  readonly alreadyCleared: boolean;
  readonly eligibility: EligibilityResult;
  /** ¶20–21 — pembantu penelaah yang tidak eligible. */
  readonly ineligibleAssistants?: readonly string[] | null;
  /** PR-6 — penilaian eligibilitas ¶18–23 diakui penelaah (ber-atestasi:
      dicatat {by, at} dari sesi, bukan sekadar tampilan turunan). */
  readonly eligibilityAcked: boolean;
}

export type ClearBlocker =
  | 'already-cleared'
  | 'checklist-incomplete'
  | 'open-findings'
  | 'reviewer-ineligible'
  | 'assistant-ineligible'
  | 'eligibility-unconfirmed';

export const CLEAR_BLOCKER_LABEL: Record<ClearBlocker, string> = {
  'already-cleared': 'Penelaahan sudah ditutup.',
  'checklist-incomplete': 'Prosedur penelaahan ¶25 belum lengkap.',
  'open-findings': 'Masih ada hal yang dikhawatirkan dan belum diselesaikan (¶26).',
  'reviewer-ineligible': 'Penelaah tidak memenuhi kriteria eligibilitas (¶18–19, ¶22–23).',
  'assistant-ineligible': 'Terdapat individu pembantu yang tidak memenuhi kriteria eligibilitas (¶20).',
  'eligibility-unconfirmed': 'Penilaian eligibilitas ¶18–23 belum diakui penelaah (ber-atestasi).',
};

export interface EqrClearGate {
  readonly canClear: boolean;
  readonly blockers: readonly ClearBlocker[];
}

/**
 * Bolehkah penelaah menutup penelaahan (¶27)?
 *
 * Eligibilitas kini BAGIAN DARI SYARAT — sebelumnya tidak ikut sama
 * sekali, sehingga penelaah yang tak memenuhi syarat dapat membuka
 * gerbang penerbitan opini.
 */
export function eqrClearGate(input: EqrClearInput): EqrClearGate {
  const blockers: ClearBlocker[] = [];
  if (input.alreadyCleared) blockers.push('already-cleared');
  if (!input.checklistComplete) blockers.push('checklist-incomplete');
  if (input.openFindings > 0) blockers.push('open-findings');
  if (!input.eligibility.eligible) blockers.push('reviewer-ineligible');
  if ((input.ineligibleAssistants || []).length > 0) blockers.push('assistant-ineligible');
  /* PR-6 — penilaian eligibilitas yang TIDAK diakui penelaah (ber-atestasi)
     tidak boleh membuka gerbang: turunan mesin ≠ keputusan yang diambil. */
  if (!input.eligibilityAcked) blockers.push('eligibility-unconfirmed');
  return { canClear: blockers.length === 0, blockers };
}
