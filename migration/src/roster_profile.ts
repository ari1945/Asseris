/* ============================================================
   Asseris — Roster perikatan: profil grade (derivasi murni, teruji)
   ------------------------------------------------------------
   Sampai 2026-08-21 hanya ENG-2025-014 yang punya roster
   (`FIRMFIN.WIP_ROSTER_ENG`). Enam perikatan lain karena itu tak punya jam
   per-orang, sehingga biaya & nilai WIP-nya hanya dapat DITAKSIR dari mix
   jadwal mingguan — dan modul Profitabilitas menandainya `~`.

   Berkas ini membangun roster untuk keenamnya. Yang perlu dinyatakan terus
   terang: **komposisi timnya adalah DATA DEMO yang di-backfill**, bukan fakta
   yang ditemukan di data. Yang MENGIKAT dan benar-benar berasal dari data
   hanyalah:

     · Σ budget                === ENGAGEMENTS.budgetHrs   (tie-out, diuji)
     · Σ base + jam timesheet  === ENGAGEMENTS.actualHrs   (tie-out, diuji)
     · partner   === ENGAGEMENTS.partner
     · manager   === ENGAGEMENTS.manager
     · senior/junior yang SUDAH disebut AMS.SCHEDULE dipakai apa adanya

   Sisanya — siapa senior & juniornya pada perikatan yang tak menyebut siapa
   pun, dan bagaimana jam terbagi antar grade — diturunkan dari SATU profil:
   komposisi grade roster perikatan demo. Pembilangnya sengaja dibiarkan sama
   dengan jam literal roster itu (120/360/720/640 dan 78/256,5/454,5/309),
   sehingga menerapkannya pada 1840/1098 menghasilkan roster demo PERSIS —
   profil ini dapat diperiksa terhadap satu-satunya roster nyata yang ada.
   Pola & penamaannya mengikuti `TB_PHASE_PROFILE` (bobot, bukan jam).

   DICABUT (2026-08-21) — versi pertama berkas ini menuduh `ENGAGEMENTS.actualHrs`
   tak konsisten: "5.444 jam vs ~3.120 jam kapasitas (13 minggu × 40 jam × 6
   auditor) ⇒ ~1,7× kapasitas". Tuduhan itu SALAH, dan salahnya berasal dari
   angka 13 minggu — yang saya karang sendiri; tak ada panjang musim audit di
   mana pun dalam data. Yang sebenarnya:

     · `actualHrs` konsisten dengan `budgetHrs × progress` pada enam dari tujuh
       perikatan dalam 3,6% (…-047 menyimpang −23,8%, tetapi ia hanya 48 jam
       pada progres 15% — pembulatan mendominasi);
     · 5.444 jam ÷ 301 jam/minggu (supply rata-rata `CAPACITY.grades`) = 18,1
       minggu — musim audit yang biasa saja, bukan kemustahilan;
     · `CAPACITY` memang menunjukkan demand > supply untuk Manager & Senior.
       Itu ISI DEMO YANG DISENGAJA untuk modul perencanaan kapasitas, bukan
       cacat yang perlu ditambal.

   Tidak ada satu pun angka `actualHrs` yang diubah — memang tak perlu.

   Yang TERBUKA (jangan diputuskan sepihak): komposisi tim di sini tetap DATA
   DEMO. Pembagi senior/junior adalah heuristik beban (LPT), bukan penugasan
   yang pernah terjadi.
   ============================================================ */

export interface RPEngagement {
  id: string; partner: string; manager?: string;
  budgetHrs: number; actualHrs: number;
}
export interface RPRosterRow { name: string; role: string; budget: number; base: number }

export const RP_PARTNER = 'Engagement Partner';
export const RP_MANAGER = 'Audit Manager';
export const RP_SENIOR = 'Senior Auditor';
export const RP_JUNIOR = 'Junior Auditor';

/** Profil grade — BOBOT, bukan jam. Pembilang = jam roster perikatan demo. */
export interface RPGradeShare { role: string; budgetShare: number; baseShare: number }
export const RP_GRADE_PROFILE: readonly RPGradeShare[] = [
  { role: RP_PARTNER, budgetShare: 120, baseShare: 78 },
  { role: RP_MANAGER, budgetShare: 360, baseShare: 256.5 },
  { role: RP_SENIOR, budgetShare: 720, baseShare: 454.5 },
  { role: RP_JUNIOR, budgetShare: 640, baseShare: 309 },
];

/** Kolam senior & junior firma (AMS.TEAM). Pembagi = beban, bukan giliran. */
export const RP_SENIORS: readonly string[] = ['Dimas Raharjo', 'Sinta Wulandari'];
export const RP_JUNIORS: readonly string[] = ['Fajar Nugroho', 'Rina Kusuma'];

/**
 * Alokasi EKSAK: n−1 bagian dibulatkan ke `dp` desimal, sisanya masuk ke bagian
 * terakhir. Jumlahnya karena itu SELALU tepat sama dengan `total` — tie-out di
 * gerbang uji bukan hasil kebetulan pembulatan. (Pola `tbAllocate`.)
 */
export function rpAllocate(total: number, shares: readonly number[], dp = 0): number[] {
  const sum = shares.reduce((s, w) => s + w, 0);
  if (!(sum > 0) || shares.length === 0) return shares.map(() => 0);
  const f = Math.pow(10, dp);
  const out = shares.map((w) => Math.round((total * w / sum) * f) / f);
  /* Bagian TERAKHIR sengaja TIDAK dibulatkan (pola `tbAllocate`): ia menyerap
     sisa, sehingga jumlahnya menutup ke `total` tanpa hanyut pembulatan.
     Membulatkannya juga membuat …-058 berjumlah 944,9999999999999. */
  out[out.length - 1] = total - out.slice(0, -1).reduce((s, v) => s + v, 0);
  return out;
}

export interface RPScheduleNames { senior?: string; junior?: string }

/** Anggota kolam dengan beban jam PALING RINGAN; seri → urutan kolam. */
export function rpPickLeast(
  pool: readonly string[], load: Readonly<Record<string, number>>,
): string {
  return pool.reduce((best, n) => ((load[n] || 0) < (load[best] || 0) ? n : best), pool[0]);
}

/** Nama per grade: partner & manager dari perikatan, senior/junior dari jadwal
 *  bila disebut, selain itu dari `fallback` (lihat `rpRosterMap`). */
export function rpNames(
  e: RPEngagement, sched: RPScheduleNames = {}, fallback: RPScheduleNames = {},
): Record<string, string> {
  return {
    [RP_PARTNER]: e.partner,
    [RP_MANAGER]: e.manager || e.partner,
    [RP_SENIOR]: sched.senior || fallback.senior || RP_SENIORS[0],
    [RP_JUNIOR]: sched.junior || fallback.junior || RP_JUNIORS[0],
  };
}

/**
 * Roster satu perikatan dari profil grade.
 *
 * `base` adalah jam PEMBUKA — jam aktual DIKURANGI timesheet bertanggal milik
 * perikatan itu, karena `engagementWip` menambahkan timesheet di atas `base`.
 * Invariannya karena itu `Σbase + jam timesheet === actualHrs`, dan itu berlaku
 * seragam: perikatan demo punya 48 jam timesheet (1098 + 48 = 1146), enam
 * lainnya belum punya satu pun (seed timesheet kini ber-scope, lihat
 * `timesheet_seed_scope.test.ts`), jadi `seedHours` = 0 dan Σbase = actualHrs.
 *
 * Σbudget === e.budgetHrs, EKSAK.
 */
export function rpBuildRoster(
  e: RPEngagement, nama: Record<string, string>, seedHours = 0,
): RPRosterRow[] {
  const budget = rpAllocate(e.budgetHrs, RP_GRADE_PROFILE.map((g) => g.budgetShare), 0);
  const base = rpAllocate(Math.max(0, e.actualHrs - seedHours), RP_GRADE_PROFILE.map((g) => g.baseShare), 1);
  return RP_GRADE_PROFILE.map((g, i) => ({
    name: nama[g.role], role: g.role, budget: budget[i], base: base[i],
  }));
}

export interface RPScheduleAlloc { eng: string }
export interface RPScheduleMember { member: string; role: string; alloc: RPScheduleAlloc[] }

/** Senior/junior yang SUDAH ditugaskan ke perikatan ini menurut AMS.SCHEDULE. */
export function rpScheduleNames(
  schedule: readonly RPScheduleMember[] | null | undefined, engId: string,
): RPScheduleNames {
  const out: RPScheduleNames = {};
  (schedule || []).forEach((m) => {
    if (!m.alloc.some((a) => a.eng === engId)) return;
    if (m.role === 'Senior' && !out.senior) out.senior = m.member;
    if (m.role === 'Junior' && !out.junior) out.junior = m.member;
  });
  return out;
}

/**
 * Roster untuk SEMUA perikatan: yang sudah punya roster nyata dipakai apa
 * adanya (nol-delta), sisanya diturunkan dari profil.
 *
 * Senior & junior dibagi menurut BEBAN JAM, bukan giliran. Rotasi bergilir
 * membagi jumlah PERIKATAN secara merata — dan karena perikatan berbeda jauh
 * ukurannya (…-063 1.588 jam aktual, …-047 hanya 48), giliran yang "adil"
 * menghasilkan beban yang timpang: Sinta 1.418 jam vs Dimas 815 jam, dua orang
 * satu grade, selisih 74% tanpa alasan di data. `CAPACITY.staff.forecast`
 * — data yang sudah ada — menyatakan keduanya diharapkan ~91% dan ~94%.
 *
 * Algoritmanya LPT (longest-processing-time): perikatan TERBESAR dulu, tiap
 * kali ke anggota kolam yang bebannya paling ringan, dengan beban awal diambil
 * dari roster nyata. Nama yang sudah disebut SCHEDULE tetap menang meski
 * menimbulkan ketimpangan — data mengalahkan heuristik.
 *
 * Urutannya ditentukan SENDIRI (jam menurun, seri → id), bukan mengikuti urutan
 * array yang masuk. Itu penting: `hydrateCoreFromApi` mengganti
 * `AMS.ENGAGEMENTS` saat boot dengan salinan basis data yang terurut menurut
 * id — urutan yang berbeda dari berkas seed. Tanpa itu, tim sebuah perikatan
 * berubah tergantung aplikasi berjalan dengan server atau offline:
 * "deterministik" yang hanya berlaku untuk satu urutan kedatangan.
 */
export function rpRosterMap(
  engagements: readonly RPEngagement[],
  literal: Readonly<Record<string, RPRosterRow[]>>,
  schedule: readonly RPScheduleMember[] | null | undefined,
  seedHoursByEng: Readonly<Record<string, number>> = {},
): Record<string, RPRosterRow[]> {
  const out: Record<string, RPRosterRow[]> = {};
  const load: Record<string, number> = {};
  const bump = (rows: readonly RPRosterRow[]): void => {
    rows.forEach((r) => { load[r.name] = (load[r.name] || 0) + r.base; });
  };
  /* roster NYATA lebih dulu: bebannya ikut diperhitungkan saat membagi sisanya */
  (engagements || []).forEach((e) => {
    if (literal[e.id]) { out[e.id] = literal[e.id]; bump(literal[e.id]); }
  });
  const derived = (engagements || []).filter((e) => !literal[e.id]).slice()
    .sort((a, b) => (b.actualHrs - a.actualHrs) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  derived.forEach((e) => {
    const sched = rpScheduleNames(schedule, e.id);
    const nama = rpNames(e, sched, {
      senior: rpPickLeast(RP_SENIORS, load), junior: rpPickLeast(RP_JUNIORS, load),
    });
    out[e.id] = rpBuildRoster(e, nama, seedHoursByEng[e.id] || 0);
    bump(out[e.id]);
  });
  return out;
}

/** Jam timesheet seed per perikatan — pembagi `base` di atas. */
export interface RPTimeEntry { engagementId?: string; hours: number }
export function rpSeedHours(
  entries: readonly RPTimeEntry[] | null | undefined,
): Record<string, number> {
  const out: Record<string, number> = {};
  (entries || []).forEach((t) => {
    if (!t.engagementId) return;
    out[t.engagementId] = (out[t.engagementId] || 0) + (+t.hours || 0);
  });
  return out;
}
