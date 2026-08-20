/* ============================================================
   Asseris — Suksesi & Karier: MESIN MURNI (PRD sdm-kepatuhan PR-7 · SC-18)
   ------------------------------------------------------------
   `readiness: 'Siap sekarang'` adalah STRING LITERAL. Di berkas yang sama
   tersedia semua yang dibutuhkan untuk menurunkannya:

     CAREER_LADDER      kriteria promosi eksplisit per jenjang
     COMPETENCY_ACTUAL  level kompetensi aktual per orang
     COMPETENCY_REQ     level yang disyaratkan jenjang tujuan
     IDP                progres rencana pengembangan + aksi yang belum selesai

   Tak satu pun dikonsultasikan. EMP-021 dinyatakan "Siap sekarang" untuk Audit
   Manager sementara IDP-nya sendiri berbunyi "Selesaikan ujian CPA (2 dari 4) —
   Berjalan" dan tangga karier mensyaratkan "CPA penuh". Sistem menyimpan kedua
   fakta dan tak pernah membandingkannya.

   Fungsi MURNI.
   ============================================================ */

export type ReadinessKey = 'siap' | 'siap-1-2' | 'siap-2-3' | 'belum';

export const READINESS_LABEL: Record<ReadinessKey, string> = {
  'siap': 'Siap sekarang',
  'siap-1-2': 'Siap 1–2 th',
  'siap-2-3': 'Siap 2–3 th',
  'belum': 'Belum siap',
};

/** Urutan dari paling siap. Dipakai untuk membandingkan dengan klaim lama. */
export const READINESS_ORDER: ReadinessKey[] = ['siap', 'siap-1-2', 'siap-2-3', 'belum'];

export interface LadderRung {
  grade: string;
  next?: string;
  criteria?: string[];
}

export interface IdpRecord {
  target?: string;
  sponsor?: string;
  progress?: number;
  actions?: { a: string; s: string; due?: string }[];
}

export type BlockerKind = 'sertifikasi' | 'kompetensi' | 'idp' | 'jenjang';

export interface ReadinessBlocker {
  kind: BlockerKind;
  detail: string;
}

export interface Readiness {
  key: ReadinessKey;
  label: string;
  blockers: ReadinessBlocker[];
  /** Gap kompetensi terhadap jenjang tujuan. */
  competencyGaps: number;
  /** Aksi IDP yang belum selesai. */
  openIdpActions: number;
  idpProgress: number | null;
  /** Kriteria tangga karier yang menyebut sertifikasi & belum dipenuhi. */
  certRequired: string | null;
  certHeld: string;
  note: string;
}

/** Apakah teks kriteria menuntut CPA penuh? */
function demandsFullCpa(criteria: string[]): string | null {
  for (const c of criteria) {
    if (/CPA\s*penuh/i.test(c)) return c;
    if (/\bCPA\b/i.test(c) && !/kandidat/i.test(c)) return c;
  }
  return null;
}

function holdsFullCpa(cert: string): boolean {
  const c = String(cert || '');
  if (/kandidat/i.test(c)) return false;
  return /\bCPA\b/.test(c);
}

/**
 * Kesiapan suksesi DITURUNKAN.
 *
 * Aturannya sengaja sederhana dan dapat dibantah, bukan pintar:
 *   · ada pemblokir sertifikasi                       → paling cepat "Siap 1–2 th"
 *   · gap kompetensi ≥ 3 ATAU aksi IDP terbuka ≥ 3    → turun satu tingkat lagi
 *   · gap kompetensi = 0, tak ada pemblokir, IDP ≥ 80 → "Siap sekarang"
 *
 * Yang penting bukan kalibrasi angkanya, melainkan bahwa kesiapan berhenti
 * menjadi string yang diketik dan mulai punya sesuatu yang dapat ditunjuk.
 */
export function readinessOf(args: {
  cert?: string;
  currentGrade?: string;
  targetGrade?: string;
  ladder?: readonly LadderRung[];
  competencyActual?: Record<string, number>;
  competencyRequired?: Record<string, number>;
  idp?: IdpRecord;
}): Readiness {
  const blockers: ReadinessBlocker[] = [];
  const cert = String(args.cert || '');

  const rung = (args.ladder || []).find((r) => r.grade === args.currentGrade);
  const criteria = rung?.criteria || [];
  const certCriterion = demandsFullCpa(criteria);
  if (certCriterion && !holdsFullCpa(cert)) {
    blockers.push({ kind: 'sertifikasi', detail: `Tangga karier mensyaratkan "${certCriterion}"; sertifikasi saat ini "${cert || '—'}".` });
  }

  const req = args.competencyRequired || {};
  const act = args.competencyActual || {};
  let gaps = 0;
  for (const [cid, need] of Object.entries(req)) {
    const have = act[cid];
    const level = Number.isFinite(have) ? (have as number) : Math.max(1, need - 1);
    if (level < need) gaps++;
  }
  if (gaps > 0) blockers.push({ kind: 'kompetensi', detail: `${gaps} kompetensi masih di bawah level jenjang ${args.targetGrade || 'tujuan'}.` });

  const actions = args.idp?.actions || [];
  const open = actions.filter((a) => a && a.s !== 'Selesai').length;
  const progress = Number.isFinite(args.idp?.progress as number) ? (args.idp?.progress as number) : null;
  if (open > 0) blockers.push({ kind: 'idp', detail: `${open} aksi rencana pengembangan belum selesai.` });

  let key: ReadinessKey;
  const hasCertBlock = blockers.some((b) => b.kind === 'sertifikasi');
  if (!blockers.length && (progress === null || progress >= 80)) key = 'siap';
  else if (!hasCertBlock && gaps === 0 && open <= 2) key = 'siap-1-2';
  else if (hasCertBlock && gaps < 3 && open < 3) key = 'siap-1-2';
  else if (gaps >= 3 || open >= 3) key = 'siap-2-3';
  else key = 'siap-1-2';

  /* Tanpa data sama sekali kesiapan tak dapat dinyatakan — jangan diam-diam "siap". */
  const noData = !rung && !Object.keys(req).length && !args.idp;
  if (noData) key = 'belum';

  return {
    key, label: READINESS_LABEL[key], blockers,
    competencyGaps: gaps, openIdpActions: open, idpProgress: progress,
    certRequired: certCriterion, certHeld: cert,
    note: noData ? 'Tak ada tangga karier, kompetensi, maupun IDP untuk orang ini — kesiapan tak dapat diturunkan.' : '',
  };
}

export interface SuccessionSuccessor {
  id: string;
  /** Klaim LAMA (literal). Dipertahankan hanya untuk dibandingkan. */
  claimed?: string;
  gaps?: string;
}

export interface SuccessionRoleState {
  role: string;
  incumbent: string;
  readyNow: number;
  successors: { id: string; readiness: Readiness; claimed: string | null; contradicts: boolean }[];
  /** Peran kritikal tanpa satu pun penerus yang siap sekarang. */
  atRisk: boolean;
}

export function successionRoleState(args: {
  role: string;
  incumbent: string;
  critical?: string;
  successors: readonly SuccessionSuccessor[];
  readinessFor: (empId: string) => Readiness;
}): SuccessionRoleState {
  const successors = args.successors.map((s) => {
    const readiness = args.readinessFor(s.id);
    const claimed = s.claimed || null;
    return { id: s.id, readiness, claimed, contradicts: !!claimed && claimed !== readiness.label };
  });
  const readyNow = successors.filter((s) => s.readiness.key === 'siap').length;
  return {
    role: args.role, incumbent: args.incumbent, successors, readyNow,
    atRisk: (args.critical === 'Kritikal') && readyNow === 0,
  };
}
