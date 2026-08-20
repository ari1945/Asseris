/* ============================================================
   Engagement Cockpit — jalur kritis dari data perikatan (MURNI, teruji)
   ------------------------------------------------------------
   PR-C-4.

   SEBELUM PR ini tab "Jalur Kritis" seluruhnya literal:

     CKP_START = new Date('2026-01-06')            // tanggal mulai karangan
     CKP_MILESTONES = [ 9 baris dgn date/owner/status hardcode ]

   Ganti perikatan aktif → tak ada satu pun yang berubah. Badge "LEWAT TARGET"
   dihitung terhadap tanggal yang tak ada hubungannya dengan perikatan yang
   sedang dibuka, dan salah satu `note`-nya ('ICFR 75%') menyalin persentase
   literal CKP_PHASES yang sudah dicabut PR-C-2.

   ── Q1: DARI MANA TANGGAL MULAI? ────────────────────────────────────────
   Usulan awal saya: turunkan dari tanggal surat perikatan. Datanya ternyata
   TIDAK ADA — `ENGAGEMENTS` tak membawa `acceptanceRef` maupun
   `engagementLetter` sama sekali (nol kemunculan di data_part1); field itu
   hanya melekat pada engagement hasil konversi prospek (M3). Jadi surat
   perikatan dipakai KETIKA ADA, dan ada rantai fallback yang setiap
   tingkatnya menyebutkan DASARNYA di layar:

     1. `e.startDate`          — bila suatu saat field ini ada (belum hari ini)
     2. `e.acceptanceRef.date` — tanggal putusan penerimaan/keberlanjutan
     3. akhir tahun buku dari `e.fy` — asumsi entitas tahun kalender

   Tingkat 3 adalah TURUNAN, bukan karangan: audit atas FY2025 tak mungkin
   dimulai sebelum 31 Des 2025. Asumsinya dinyatakan di UI, tidak disembunyikan.
   Yang TIDAK saya lakukan: menaruh tanggal karangan ke dalam seed. Memindahkan
   literal dari view ke data bukan perbaikan — ia hanya memindahkan masalahnya.

   ── TANGGAL MILESTONE ───────────────────────────────────────────────────
   Hanya tiga tanggal yang benar-benar diketahui: mulai (di atas), tenggat
   pelaporan (`e.deadline`, nyata & per-perikatan), dan batas arsip = tenggat
   + 60 hari (ATURAN SMM 1 · SA 230, bukan tebakan). Milestone lain TIDAK
   diberi tanggal — `dateIso: null` → UI menulis "—". Menginterpolasi tanggal
   fase di antara mulai & tenggat akan mengembalikan persis kelas cacat yang
   PR ini cabut.

   Status & pemilik pun turunan: status dari posisi fase perikatan, `risk`
   bila gerbang fase itu punya blocker, pemilik dari `e.partner`/`e.manager`
   yang nyata — bukan enam nama yang dipaku.

   Fungsi di berkas ini MURNI: tak menyentuh React/DOM/window/localStorage.
   ============================================================ */

export const PHASE_SEQUENCE = ['Perencanaan', 'Eksekusi', 'Finalisasi', 'Arsip'] as const;
export type PhaseName = (typeof PHASE_SEQUENCE)[number];

/** SMM 1 · SA 230 — perakitan berkas final ≤60 hari setelah tanggal laporan auditor. */
export const ARCHIVE_WINDOW_DAYS = 60;

export type StartBasis = 'startDate' | 'acceptance' | 'fyEnd';

export interface EngagementStart {
  iso: string;
  basis: StartBasis;
  /** kalimat siap-tampil: dari mana tanggal ini berasal */
  label: string;
}

export interface TimelineEngagement {
  id?: string;
  phase?: string;
  deadline?: string;
  fy?: string;
  partner?: string;
  manager?: string;
  startDate?: string;
  acceptanceRef?: { date?: string } | null;
}

const DAY = 86400000;

/** akhir tahun buku dari 'FY2025' → '2025-12-31' (asumsi entitas tahun kalender) */
export function fyEndOf(fy: string | undefined): string | null {
  const m = /(\d{4})/.exec(fy || '');
  return m ? `${m[1]}-12-31` : null;
}

const valid = (iso: string | undefined | null): boolean =>
  !!iso && !Number.isNaN(new Date(iso).getTime());

/**
 * engagementStart — tanggal mulai perikatan + DASARNYA.
 * Mengembalikan null bila tak satu pun sumber tersedia; pemanggil wajib
 * memperlakukan itu sebagai "tak terukur", bukan mengarang penggantinya.
 */
export function engagementStart(e: TimelineEngagement | null | undefined): EngagementStart | null {
  const eng = e || {};
  if (valid(eng.startDate)) {
    return { iso: eng.startDate as string, basis: 'startDate', label: 'tanggal mulai perikatan' };
  }
  const acc = eng.acceptanceRef && eng.acceptanceRef.date;
  if (valid(acc)) {
    return { iso: acc as string, basis: 'acceptance', label: 'tanggal putusan penerimaan/keberlanjutan (SA 220)' };
  }
  const fy = fyEndOf(eng.fy);
  if (valid(fy)) {
    return { iso: fy as string, basis: 'fyEnd', label: `akhir tahun buku ${eng.fy} — asumsi entitas tahun kalender` };
  }
  return null;
}

/** batas arsip = tenggat pelaporan + 60 hari (SMM 1 · SA 230) */
export function archiveDeadline(deadlineIso: string | undefined): string | null {
  if (!valid(deadlineIso)) return null;
  return new Date(+new Date(deadlineIso as string) + ARCHIVE_WINDOW_DAYS * DAY).toISOString().slice(0, 10);
}

export type MilestoneStatus = 'done' | 'active' | 'risk' | 'upcoming';

export interface GateLike { criteria: { met: boolean }[]; allMet?: boolean }

export interface CockpitMilestone {
  key: string;
  name: string;
  sa: string;
  phase: PhaseName;
  status: MilestoneStatus;
  /** null = tanggalnya TIDAK diketahui; UI menulis "—", bukan menebak */
  dateIso: string | null;
  dateBasis: string;
  owner: string;
  gateMet: number | null;
  gateTotal: number | null;
  blockers: number;
}

export interface MilestoneInput {
  engagement: TimelineEngagement | null | undefined;
  start: EngagementStart | null;
  /** gerbang kanonik per transisi; boleh sebagian */
  gates?: { toEksekusi?: GateLike | null; toFinalisasi?: GateLike | null; toArsip?: GateLike | null };
}

const phaseIndex = (p: string | undefined): number => {
  const i = (PHASE_SEQUENCE as readonly string[]).indexOf(p || '');
  return i < 0 ? 0 : i;
};

function statusFor(phase: PhaseName, current: string | undefined, gate: GateLike | null | undefined): MilestoneStatus {
  const here = phaseIndex(phase);
  const now = phaseIndex(current);
  if (here < now) return 'done';
  if (here > now) return 'upcoming';
  /* fase berjalan: 'risk' bila gerbang keluarnya masih punya blocker —
     turunan, bukan literal `status:'risk'` yang dulu dipaku pada satu baris. */
  const blockers = gate ? gate.criteria.filter((c) => !c.met).length : 0;
  return blockers > 0 ? 'risk' : 'active';
}

/**
 * engagementMilestones — jalur kritis yang seluruhnya turunan.
 * Hanya tiga baris yang punya tanggal, dan ketiganya PUNYA DASAR.
 */
export function engagementMilestones(input: MilestoneInput): CockpitMilestone[] {
  const e = input.engagement || {};
  const g = input.gates || {};
  const partner = (e.partner || '—').split(',')[0];
  const manager = e.manager || '—';
  const arsip = archiveDeadline(e.deadline);

  const row = (
    key: string, name: string, sa: string, phase: PhaseName,
    gate: GateLike | null | undefined, owner: string,
    dateIso: string | null, dateBasis: string,
  ): CockpitMilestone => ({
    key, name, sa, phase,
    status: statusFor(phase, e.phase, gate),
    dateIso, dateBasis, owner,
    gateMet: gate ? gate.criteria.filter((c) => c.met).length : null,
    gateTotal: gate ? gate.criteria.length : null,
    blockers: gate ? gate.criteria.filter((c) => !c.met).length : 0,
  });

  return [
    row('start', 'Mulai perikatan', 'SA 210 · SA 300', 'Perencanaan', null, partner,
      input.start ? input.start.iso : null, input.start ? input.start.label : 'tak terukur'),
    row('perencanaan', 'Perencanaan, risiko & materialitas', 'SA 300 · SA 315 · SA 320', 'Perencanaan',
      g.toEksekusi, manager, null, ''),
    row('eksekusi', 'Eksekusi prosedur substantif', 'SA 330 · SA 500', 'Eksekusi',
      g.toFinalisasi, manager, null, ''),
    row('finalisasi', 'Finalisasi, review partner & EQR', 'SA 450 · SA 220 · SMM 2', 'Finalisasi',
      g.toArsip, partner, null, ''),
    row('opini', 'Tenggat penerbitan laporan auditor', 'SA 700', 'Finalisasi',
      null, partner, e.deadline || null, 'tenggat perikatan'),
    row('arsip', 'Perakitan berkas final', 'SA 230 · SMM 1', 'Arsip',
      null, manager, arsip, `tenggat + ${ARCHIVE_WINDOW_DAYS} hari (SMM 1 · SA 230)`),
  ];
}

export interface TimelineSpan {
  startIso: string | null;
  endIso: string | null;
  /** posisi 0–100 pada rail; null bila span tak terukur atau tanggal tak ada */
  posOf: (iso: string | null | undefined) => number | null;
  elapsedPct: number | null;
  daysLeftToDeadline: number | null;
}

/** span rail: mulai → batas arsip. Tanpa tanggal mulai, TAK ADA rail. */
export function timelineSpan(
  start: EngagementStart | null,
  deadlineIso: string | undefined,
  todayIso: string,
): TimelineSpan {
  const endIso = archiveDeadline(deadlineIso);
  const s = start ? +new Date(start.iso) : NaN;
  const en = endIso ? +new Date(endIso) : NaN;
  const total = en - s;
  const ok = Number.isFinite(total) && total > 0;
  const today = +new Date(todayIso);
  const dl = valid(deadlineIso) ? +new Date(deadlineIso as string) : NaN;
  return {
    startIso: start ? start.iso : null,
    endIso,
    posOf: (iso) => (ok && valid(iso) ? Math.min(100, Math.max(0, ((+new Date(iso as string) - s) / total) * 100)) : null),
    /* waktu berjalan diukur terhadap TENGGAT PELAPORAN, bukan batas arsip:
       yang ditanya auditor adalah "berapa jauh saya dari terbit", bukan
       "berapa jauh dari selesai mengarsip". */
    elapsedPct: Number.isFinite(dl) && Number.isFinite(s) && dl > s
      ? Math.min(100, Math.max(0, ((today - s) / (dl - s)) * 100))
      : null,
    daysLeftToDeadline: Number.isFinite(dl) ? Math.round((dl - today) / DAY) : null,
  };
}
