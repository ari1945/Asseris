/* ============================================================
   Asseris — Rekrutmen & Pelatihan: MESIN MURNI (PRD sdm-kepatuhan PR-6)
   ------------------------------------------------------------
   Tiga cacat yang ditutup.

   (1) PENGHITUNG TANPA ORANG DI BELAKANGNYA. `REQ-2026-06.filled: 2` adalah
       literal; register kandidat menentukan siapa yang benar-benar diterima.
       Memindahkan kandidat ke tahap "Diterima" tidak menggerakkan apa pun.

   (2) PENDAFTARAN PELATIHAN ANONIM. `doEnroll` menaikkan bilangan bulat:

           enrolled: Math.min(seats, e.enrolled + 1)

       Tak ada `empId` di mana pun. Sementara `cpeFromTraining` membaca
       `trainingAttendance.v1` yang BERKUNCI empId. Pendaftaran dan kehadiran
       adalah dua dunia terpisah: 25 orang dapat "terdaftar" dengan nol
       kehadiran, dan kehadiran dapat dikonfirmasi untuk orang yang tak pernah
       mendaftar. "Kursi tersisa" tak dapat ditanya siapa yang mengisinya.

   (3) KOMPETENSI YANG TAK PERNAH BISA MENUTUP. `COMPETENCY_ACTUAL` adalah
       cuplikan beku. Menyelesaikan TR-03 (Audit Data Analytics, `comp: CO-03`)
       tidak menggerakkan level siapa pun, sehingga analisis gap kompetensi
       mustahil menutup apa pun pelatihan yang diikuti.

   Fungsi MURNI; `asOf` selalu argumen.
   ============================================================ */

/* ------------------------------------------------------------------
   1. Requisition — penghitung yang punya nama
   ------------------------------------------------------------------ */

export interface TalentCandidate {
  id: string;
  name: string;
  req: string;
  stage: string;
  rating?: number;
  source?: string;
}

export interface TalentHire {
  id: string;
  name: string;
  /** Requisition yang diisi. Tanpa ini onboarding tak dapat dihubungkan ke lowongan. */
  req?: string;
  /** Kandidat asalnya, bila datang lewat pipeline. */
  cand?: string;
  start?: string;
}

export interface TalentRequisition {
  id: string;
  title?: string;
  count?: number;
  status?: string;
  /** Jumlah lamaran MASUK menurut portal/ATS di luar aplikasi ini. */
  applicantsDeclared?: number;
  opened?: string;
  filledDate?: string;
}

export const STAGE_ACCEPTED = 'Diterima';

export interface RequisitionState {
  id: string;
  count: number;
  /** Kandidat yang benar-benar ada di register pipeline. */
  inPipeline: number;
  /** Lamaran masuk menurut sistem di luar aplikasi (dinyatakan, bukan dihitung). */
  applicantsDeclared: number | null;
  /** Diisi = kandidat pada tahap "Diterima" ∪ onboarding yang menunjuk requisition ini. */
  filled: number;
  remaining: number;
  overfilled: boolean;
  byStage: Record<string, number>;
  filledBy: string[];
}

/**
 * Keadaan satu requisition, DITURUNKAN dari register kandidat & onboarding.
 *
 * `applicantsDeclared` sengaja dipisah dari `inPipeline`: jumlah lamaran masuk
 * memang berasal dari portal di luar aplikasi dan tak dapat diturunkan di sini.
 * Menyatukannya — seperti sebelumnya — membuat "34 pelamar" tampak seolah ada
 * 34 orang di register, padahal registernya berisi empat.
 */
export function requisitionState(
  req: TalentRequisition,
  candidates: readonly TalentCandidate[] | undefined,
  hires: readonly TalentHire[] | undefined,
  stages: readonly string[] = [],
): RequisitionState {
  const mine = (candidates || []).filter((c) => c && c.req === req.id);
  const byStage: Record<string, number> = {};
  for (const st of stages) byStage[st] = 0;
  for (const c of mine) byStage[c.stage] = (byStage[c.stage] || 0) + 1;

  const accepted = mine.filter((c) => c.stage === STAGE_ACCEPTED);
  const filledSet = new Set<string>(accepted.map((c) => c.name));
  for (const h of hires || []) {
    if (h && h.req === req.id) filledSet.add(h.name);
  }
  const count = Math.max(0, req.count || 0);
  const filled = filledSet.size;
  return {
    id: req.id,
    count,
    inPipeline: mine.length,
    applicantsDeclared: Number.isFinite(req.applicantsDeclared as number) ? (req.applicantsDeclared as number) : null,
    filled,
    remaining: Math.max(0, count - filled),
    overfilled: filled > count,
    byStage,
    filledBy: [...filledSet],
  };
}

export interface RecruitmentSummary {
  openRequisitions: number;
  seatsOpen: number;
  inPipeline: number;
  applicantsDeclared: number | null;
  offersOutstanding: number;
  filled: number;
}

export function recruitmentSummary(
  reqs: readonly TalentRequisition[] | undefined,
  candidates: readonly TalentCandidate[] | undefined,
  hires: readonly TalentHire[] | undefined,
): RecruitmentSummary {
  const list = reqs || [];
  const states = list.map((r) => requisitionState(r, candidates, hires));
  const declared = list.map((r) => r.applicantsDeclared).filter((n): n is number => Number.isFinite(n as number));
  return {
    openRequisitions: list.filter((r) => r.status === 'Dibuka').length,
    seatsOpen: states.reduce((a, s) => a + s.remaining, 0),
    inPipeline: (candidates || []).length,
    applicantsDeclared: declared.length ? declared.reduce((a, b) => a + b, 0) : null,
    offersOutstanding: (candidates || []).filter((c) => c.stage === 'Penawaran').length,
    filled: states.reduce((a, s) => a + s.filled, 0),
  };
}

/* ------------------------------------------------------------------
   2. Pendaftaran pelatihan — berkunci empId
   ------------------------------------------------------------------ */

/** `{ [trainingId]: empId[] }`. Bentuk LAMA `[{id, enrolled: number}]` masih dibaca. */
export type EnrolmentMap = Record<string, string[]>;

export type LegacyEnrolment = { id: string; enrolled: number }[];

export interface EnrolmentState {
  trainingId: string;
  seats: number;
  enrolled: string[];
  seatsLeft: number;
  full: boolean;
  /** Bentuk lama hanya menyimpan JUMLAH — siapa-nya tak dapat ditanyakan. */
  anonymousCount: number;
}

function isLegacy(v: unknown): v is LegacyEnrolment {
  return Array.isArray(v) && v.every((x) => x && typeof x === 'object' && 'enrolled' in (x as object));
}

/** Normalisasi kedua bentuk ke peta berkunci empId. Bentuk lama menyumbang
 *  `anonymousCount` — jumlahnya dihormati, tetapi ia TIDAK menjadi nama. */
export function normaliseEnrolment(raw: unknown): { map: EnrolmentMap; anonymous: Record<string, number> } {
  if (isLegacy(raw)) {
    const anonymous: Record<string, number> = {};
    for (const r of raw) anonymous[r.id] = Math.max(0, Number(r.enrolled) || 0);
    return { map: {}, anonymous };
  }
  const map: EnrolmentMap = {};
  const src = (raw && typeof raw === 'object' ? raw as Record<string, unknown> : {});
  for (const [k, v] of Object.entries(src)) {
    if (Array.isArray(v)) map[k] = [...new Set(v.filter((x): x is string => typeof x === 'string'))];
  }
  return { map, anonymous: {} };
}

export function enrolmentState(
  trainingId: string,
  seats: number,
  raw: unknown,
): EnrolmentState {
  const { map, anonymous } = normaliseEnrolment(raw);
  const enrolled = map[trainingId] || [];
  const anon = anonymous[trainingId] || 0;
  const taken = enrolled.length + anon;
  const cap = Math.max(0, seats || 0);
  return {
    trainingId, seats: cap, enrolled,
    seatsLeft: Math.max(0, cap - taken),
    full: taken >= cap,
    anonymousCount: anon,
  };
}

export interface EnrolCheck { ok: boolean; reason: string }

/** Bolehkah `empId` didaftarkan? Gerbang yang sesungguhnya — bentuk lama tak
 *  punya keadaan yang membuatnya menolak selain kursi penuh. */
export function enrolCheck(st: EnrolmentState, empId: string | null | undefined, onRoster: boolean): EnrolCheck {
  if (!empId) return { ok: false, reason: 'Pilih peserta terlebih dahulu.' };
  if (!onRoster) return { ok: false, reason: 'Peserta tidak ada pada roster firma.' };
  if (st.enrolled.includes(empId)) return { ok: false, reason: 'Peserta sudah terdaftar pada pelatihan ini.' };
  if (st.full) return { ok: false, reason: `Kuota ${st.seats} kursi sudah penuh.` };
  return { ok: true, reason: '' };
}

export interface AttendCheck { ok: boolean; reason: string }

/** Kehadiran hanya dapat dikonfirmasi untuk peserta TERDAFTAR.
 *  Sebelumnya kehadiran dapat dibubuhkan kepada siapa pun, termasuk orang yang
 *  tak pernah mendaftar — sehingga kredit SKP muncul tanpa jejak pendaftaran. */
export function attendCheck(st: EnrolmentState, empId: string | null | undefined): AttendCheck {
  if (!empId) return { ok: false, reason: 'Peserta tidak dikenal.' };
  if (!st.enrolled.includes(empId)) {
    return { ok: false, reason: 'Kehadiran hanya dapat dikonfirmasi untuk peserta yang terdaftar pada pelatihan ini.' };
  }
  return { ok: true, reason: '' };
}

/* ------------------------------------------------------------------
   3. Kompetensi yang dapat menutup
   ------------------------------------------------------------------ */

export interface CompetencyCourse { id: string; comp?: string; title?: string }
export type AttendanceMap = Record<string, Record<string, { confirmed?: boolean } | undefined>>;

export const COMPETENCY_MAX = 5;

export interface CompetencyLevel {
  /** Level dasar dari penilaian (COMPETENCY_ACTUAL) atau default jenjang. */
  base: number;
  /** Kenaikan dari pelatihan yang kehadirannya DIKONFIRMASI. */
  credit: number;
  /** Level efektif = min(base + credit, 5). */
  level: number;
  required: number;
  gap: number;
  /** Pelatihan yang menyumbang kenaikan — agar kenaikannya dapat ditanya asalnya. */
  from: string[];
}

/**
 * Level kompetensi efektif.
 *
 * Menyelesaikan pelatihan yang dipetakan ke sebuah kompetensi menaikkan level
 * satu tingkat (dibatasi 5). Tanpa ini matriks kompetensi adalah cuplikan beku
 * dan gap-nya tak pernah dapat menutup, apa pun pelatihan yang diikuti.
 */
export function competencyLevel(args: {
  empId: string;
  compId: string;
  base: number | undefined;
  required: number;
  catalog: readonly CompetencyCourse[] | undefined;
  attendance: AttendanceMap | undefined;
}): CompetencyLevel {
  const base = Number.isFinite(args.base as number) ? (args.base as number) : Math.max(1, args.required - 1);
  const from: string[] = [];
  for (const c of args.catalog || []) {
    if (!c || c.comp !== args.compId) continue;
    if (args.attendance?.[c.id]?.[args.empId]?.confirmed) from.push(c.id);
  }
  const credit = from.length;
  const level = Math.min(COMPETENCY_MAX, base + credit);
  return { base, credit, level, required: args.required, gap: Math.max(0, args.required - level), from };
}

export interface CompetencyCoverage {
  cells: number;
  gaps: number;
  coveragePct: number;
  /** Gap yang TERTUTUP oleh pelatihan terkonfirmasi — nol bila belum ada. */
  closedByTraining: number;
}

export function competencyCoverage(args: {
  roster: readonly { id: string; grade?: string }[] | undefined;
  competencies: readonly { id: string }[] | undefined;
  required: Record<string, Record<string, number>> | undefined;
  actual: Record<string, Record<string, number>> | undefined;
  catalog: readonly CompetencyCourse[] | undefined;
  attendance: AttendanceMap | undefined;
}): CompetencyCoverage {
  let cells = 0, gaps = 0, closed = 0;
  for (const s of args.roster || []) {
    const req = (args.required || {})[String(s.grade)] || {};
    for (const c of args.competencies || []) {
      const required = req[c.id];
      if (!Number.isFinite(required)) continue;
      cells++;
      const lv = competencyLevel({
        empId: s.id, compId: c.id, base: (args.actual || {})[s.id]?.[c.id],
        required, catalog: args.catalog, attendance: args.attendance,
      });
      if (lv.gap > 0) gaps++;
      else if (lv.credit > 0 && lv.base < required) closed++;
    }
  }
  return {
    cells, gaps,
    coveragePct: cells > 0 ? Math.round(((cells - gaps) / cells) * 100) : 0,
    closedByTraining: closed,
  };
}
