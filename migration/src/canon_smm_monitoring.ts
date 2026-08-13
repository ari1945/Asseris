/* ============================================================
   Asseris — Pemantauan SMM 1 ¶38 & ¶39(b) · SSOT
   ------------------------------------------------------------
   ¶38  KAP harus MENCAKUP INSPEKSI ATAS PERIKATAN YANG TELAH
        SELESAI dalam aktivitas pemantauannya, dan menentukan
        perikatan serta rekan perikatan mana yang dipilih. Dalam
        melaksanakannya KAP harus:
          (c) Memilih setidaknya SATU perikatan yang telah selesai
              untuk SETIAP REKAN PERIKATAN secara berkala yang
              ditentukan oleh KAP.

   ¶39(b) Kebijakan atau prosedur KAP harus MELARANG anggota tim
        perikatan atau penelaah mutu perikatan dari suatu perikatan
        untuk melaksanakan inspeksi atas perikatan tersebut.

   ------------------------------------------------------------
   CACAT YANG DITUTUP

   ¶38(c) sebelumnya hanya berupa STRING di `QM_MON_ACTIVITIES`:
       cover: '≥1 perikatan / partner; seluruh PIE'
   — sebuah klaim cakupan yang tidak pernah dihitung dari data.

   ¶39(b) tidak ditegakkan sama sekali: tak ada aturan yang mencegah
   anggota tim perikatan (atau penelaah mutu perikatannya) menjadi
   inspektur atas perikatan yang sama.

   ------------------------------------------------------------
   DUA SYARAT YANG MUDAH TERLEWAT

   1. ¶38 berbicara tentang perikatan yang telah SELESAI. Inspeksi
      atas perikatan yang masih berjalan ("hot review") adalah
      aktivitas pemantauan yang sah, tetapi TIDAK memenuhi ¶38(c).
   2. Inspeksi yang baru DIJADWALKAN belum dilaksanakan, jadi belum
      memberi basis apa pun untuk mengidentifikasi defisiensi (¶36).

   Keduanya ditegakkan di sini; keduanya dilanggar oleh seed lama.

   Murni & deterministik — tanpa React, efek samping, localStorage,
   atau pembacaan `window`.
   ============================================================ */

/** Nama orang dinormalkan: gelar & spasi ganda dibuang, huruf disamakan. */
export function normalizePerson(name: string | null | undefined): string {
  return String(name || '')
    .replace(/,?\s*(CPA|CA|Ak\.?|S\.E\.?|M\.Ak\.?|BKP)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

export interface MonEngagement {
  readonly id: string;
  readonly partner?: string | null;
  readonly manager?: string | null;
  /** Anggota tim lain, bila terdaftar. */
  readonly team?: readonly string[] | null;
  readonly status?: string | null;
}

export interface MonInspection {
  readonly id: string;
  readonly eng?: string | null;
  readonly inspector?: string | null;
  /** `'Dijadwalkan'` = belum dilaksanakan. */
  readonly grade?: string | null;
}

export interface MonEqrReview {
  readonly eng?: string | null;
  readonly reviewer?: string | null;
}

/** Status perikatan yang dihitung "telah selesai" untuk ¶38. */
const COMPLETED_STATUS = ['completed', 'selesai', 'archived', 'arsip'];

export function isCompletedEngagement(e: MonEngagement): boolean {
  return COMPLETED_STATUS.indexOf(String(e.status || '').toLowerCase()) >= 0;
}

/** Inspeksi yang benar-benar sudah dilaksanakan (bukan sekadar dijadwalkan). */
export function isPerformedInspection(i: MonInspection): boolean {
  return String(i.grade || '').toLowerCase() !== 'dijadwalkan';
}

/* ============================================================
   ¶38(c) — cakupan per rekan perikatan
   ============================================================ */

export interface PartnerCoverage {
  /** Nama rekan perikatan sebagaimana tertulis di register perikatan. */
  readonly partner: string;
  /** Perikatan yang dipimpinnya dan berstatus selesai. */
  readonly completedEngagements: readonly string[];
  /** Perikatan selesai miliknya yang SUDAH diinspeksi (inspeksi terlaksana). */
  readonly inspectedEngagements: readonly string[];
  /** ¶38(c) terpenuhi bila ≥1 perikatan selesai miliknya telah diinspeksi. */
  readonly satisfied: boolean;
  /** Rekan tanpa satu pun perikatan selesai dalam siklus — ¶38(c) belum terterap. */
  readonly noCompletedEngagement: boolean;
}

export interface Para38Coverage {
  readonly partners: readonly PartnerCoverage[];
  /** Rekan yang punya perikatan selesai namun tak satu pun diinspeksi. */
  readonly uncoveredPartners: readonly string[];
  readonly satisfied: boolean;
  /** Inspeksi atas perikatan yang BELUM selesai — sah sebagai pemantauan, tak memenuhi ¶38(c). */
  readonly inspectionsOfIncompleteEngagements: readonly string[];
  /** Inspeksi yang baru dijadwalkan — belum memberi basis apa pun. */
  readonly scheduledNotPerformed: readonly string[];
}

/**
 * Cakupan inspeksi per rekan perikatan menurut ¶38(c).
 *
 * Hanya inspeksi yang (a) sudah DILAKSANAKAN dan (b) atas perikatan yang
 * telah SELESAI yang dihitung. Keduanya syarat eksplisit ¶38 & ¶36 —
 * "hot review" atas perikatan berjalan dan inspeksi yang baru dijadwalkan
 * tidak boleh diam-diam memenuhi kewajiban ini.
 */
export function para38Coverage(
  engagements: readonly MonEngagement[] | null | undefined,
  inspections: readonly MonInspection[] | null | undefined,
): Para38Coverage {
  const engs = (engagements || []).filter(Boolean);
  const insps = (inspections || []).filter(Boolean);
  const engById = new Map(engs.map((e) => [e.id, e]));

  const performed = insps.filter(isPerformedInspection);
  const scheduledNotPerformed = insps.filter((i) => !isPerformedInspection(i)).map((i) => i.id);

  const inspectionsOfIncompleteEngagements = performed
    .filter((i) => {
      const e = i.eng ? engById.get(i.eng) : undefined;
      return !!e && !isCompletedEngagement(e);
    })
    .map((i) => i.id);

  /* perikatan SELESAI yang telah diinspeksi (inspeksi terlaksana) */
  const inspectedCompleted = new Set(
    performed
      .map((i) => (i.eng ? engById.get(i.eng) : undefined))
      .filter((e): e is MonEngagement => !!e && isCompletedEngagement(e))
      .map((e) => e.id),
  );

  /* kelompokkan perikatan per rekan, memakai nama asli untuk tampilan */
  const byPartner = new Map<string, { display: string; engs: MonEngagement[] }>();
  for (const e of engs) {
    const key = normalizePerson(e.partner);
    if (!key) continue;
    const slot = byPartner.get(key) || { display: String(e.partner), engs: [] };
    slot.engs.push(e);
    byPartner.set(key, slot);
  }

  const partners: PartnerCoverage[] = [];
  for (const { display, engs: own } of byPartner.values()) {
    const completed = own.filter(isCompletedEngagement).map((e) => e.id);
    const inspected = completed.filter((id) => inspectedCompleted.has(id));
    partners.push({
      partner: display,
      completedEngagements: completed,
      inspectedEngagements: inspected,
      satisfied: inspected.length > 0,
      noCompletedEngagement: completed.length === 0,
    });
  }
  partners.sort((a, b) => a.partner.localeCompare(b.partner));

  const uncoveredPartners = partners
    .filter((p) => !p.satisfied && !p.noCompletedEngagement)
    .map((p) => p.partner);

  return {
    partners,
    uncoveredPartners,
    satisfied: uncoveredPartners.length === 0,
    inspectionsOfIncompleteEngagements,
    scheduledNotPerformed,
  };
}

/* ============================================================
   ¶39(b) — larangan inspeksi-diri
   ============================================================ */

export type SelfInspectionRole = 'engagement-partner' | 'engagement-manager' | 'engagement-team' | 'quality-reviewer';

export const SELF_INSPECTION_LABEL: Record<SelfInspectionRole, string> = {
  'engagement-partner': 'rekan perikatan atas perikatan yang sama',
  'engagement-manager': 'manajer perikatan atas perikatan yang sama',
  'engagement-team': 'anggota tim perikatan atas perikatan yang sama',
  'quality-reviewer': 'penelaah mutu perikatan atas perikatan yang sama',
};

export interface SelfInspectionBreach {
  readonly inspection: string;
  readonly engagement: string;
  readonly inspector: string;
  /** Peran yang membuat inspektur tidak objektif atas perikatan ini. */
  readonly roles: readonly SelfInspectionRole[];
}

/**
 * Pelanggaran ¶39(b): inspektur yang merupakan anggota tim perikatan
 * atau penelaah mutu perikatan atas perikatan yang diinspeksinya.
 *
 * Inspeksi yang baru dijadwalkan tetap diperiksa — penunjukan inspektur
 * yang tidak eligible harus tertangkap SEBELUM inspeksinya berjalan.
 */
export function para39bBreaches(
  inspections: readonly MonInspection[] | null | undefined,
  engagements: readonly MonEngagement[] | null | undefined,
  eqrReviews: readonly MonEqrReview[] | null | undefined,
): readonly SelfInspectionBreach[] {
  const engById = new Map((engagements || []).filter(Boolean).map((e) => [e.id, e]));
  const reviewersByEng = new Map<string, string[]>();
  for (const r of (eqrReviews || []).filter(Boolean)) {
    if (!r.eng) continue;
    const list = reviewersByEng.get(r.eng) || [];
    if (r.reviewer) list.push(r.reviewer);
    reviewersByEng.set(r.eng, list);
  }

  const out: SelfInspectionBreach[] = [];
  for (const i of (inspections || []).filter(Boolean)) {
    const inspector = normalizePerson(i.inspector);
    if (!inspector || !i.eng) continue;
    const e = engById.get(i.eng);
    if (!e) continue;

    const roles: SelfInspectionRole[] = [];
    if (normalizePerson(e.partner) === inspector) roles.push('engagement-partner');
    if (normalizePerson(e.manager) === inspector) roles.push('engagement-manager');
    if ((e.team || []).some((m) => normalizePerson(m) === inspector)) roles.push('engagement-team');
    if ((reviewersByEng.get(i.eng) || []).some((r) => normalizePerson(r) === inspector)) roles.push('quality-reviewer');

    if (roles.length > 0) {
      out.push({ inspection: i.id, engagement: i.eng, inspector: String(i.inspector), roles });
    }
  }
  return out;
}

/** Kalimat siap-tampil untuk satu pelanggaran ¶39(b). */
export function breachLabel(b: SelfInspectionBreach): string {
  return `${b.inspector} adalah ${b.roles.map((r) => SELF_INSPECTION_LABEL[r]).join(' & ')} (${b.engagement})`;
}
