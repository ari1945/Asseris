/* ============================================================
   Engagement Cockpit — model ekonomi perikatan (MURNI, teruji)
   ------------------------------------------------------------
   PR-C-1. Mengekstrak "berapa jam & berapa rupiah pada perikatan ini"
   dari `view_cockpit2.tsx` ke fungsi murni, dan — yang lebih penting —
   memindahkan jawabannya ke SSOT yang sudah ada:
   `FIRMFIN.engagementWip(timeEntries, engId)` (data_firmfin.ts).

   SEBELUM PR ini cockpit membagi ulang total jam perikatan dengan array
   bobot literal:

       CKP_TEAM_W = [0.071, 0.196, 0.261, 0.179, 0.152, 0.141]
       jam_anggota = bobot × e.actualHrs

   Totalnya menutup (bobot berjumlah 1) — itulah yang membuat cacat ini
   lolos bertahun-tahun. Setiap BARISNYA salah; hanya jumlahnya benar.
   Untuk ENG-2025-014 selisihnya sampai +47 jam (Sinta, +30%) dan −43 jam
   (Anindya, −16%) terhadap roster nyata yang dipakai Time & Budget dan
   modul WIP. Cockpit juga membaca `e.actualHrs` STATIS: mencatat jam di
   Time & Budget tidak menggerakkannya sama sekali.

   Angka-angka lama diabadikan sebagai `LEGACY_TEAM_WEIGHTS` di bawah —
   bukan untuk dipakai, tetapi supaya uji dapat membuktikan bahwa kita
   sudah TIDAK memakainya lagi (gerbang anti-kambuh).

   TIGA FIGUR YANG DULU TERCAMPUR — kini dipisah & diberi label benar:
     · nilai WIP   → tarif CHARGE-OUT (WIP_BILL)  — "WIP @ tarif standar"
     · biaya waktu → tarif BIAYA      (WIP_COST)  — "Biaya waktu (aktual)"
     · margin      → biaya pada jam ANGGARAN vs fee
   Dulu ketiganya dihitung pada tarif biaya lalu figur pertama diberi
   label "WIP Terpakai (aktual)" → meleset 2× (Rp 0,48 M vs Rp 0,98 M).

   Fungsi di berkas ini MURNI: tak menyentuh React/DOM/window/localStorage.
   ============================================================ */

/* ---------- bentuk data dari SSOT (data_firmfin.engagementWip) ---------- */

export interface CockpitRosterRow {
  name: string;
  role: string;
  /** jam anggaran anggota ini pada perikatan */
  budget: number;
  /** jam pembuka (sebelum timesheet live) */
  base: number;
  /** jam aktual = base + timesheet live */
  actual: number;
  /** tarif charge-out per jam */
  bill: number;
  /** tarif biaya per jam */
  cost: number;
  billVal: number;
  costVal: number;
  variance: number;
  /** utilisasi PERIKATAN: actual/budget × 100 */
  util: number;
}

export interface CockpitWip {
  roster: CockpitRosterRow[];
  actualHrs: number;
  budgetHrs: number;
  /** nilai WIP pada tarif charge-out */
  stdValue: number;
  /** biaya waktu pada tarif biaya */
  costValue: number;
}

/* ---------- masukan & keluaran model ---------- */

export interface CockpitFirmMember {
  name: string;
  role: string;
  /** utilisasi FIRMA (AMS.TEAM.util) — lingkup berbeda dari `util` roster */
  util?: number;
}

export interface CockpitWpRow { preparer?: string; reviewer?: string }
export interface CockpitProcRow { prep?: string; rev?: string }

export interface CockpitMember extends CockpitRosterRow {
  grade: string;
  /** utilisasi firma bila anggota ini terdaftar di roster firma; null bila tidak */
  firmUtil: number | null;
  wpPrep: number;
  wpRev: number;
  procPrep: number;
  procRev: number;
}

export interface CockpitEconomicsInput {
  /** hasil FIRMFIN.engagementWip(timeEntries, engId); null bila perikatan tak punya roster */
  ew: CockpitWip | null;
  /** cadangan tingkat-perikatan dari seed ENGAGEMENTS bila roster tak ada */
  fallbackBudgetHrs: number;
  fallbackActualHrs: number;
  fee: number;
  firmTeam: CockpitFirmMember[];
  workpapers: CockpitWpRow[];
  procs: CockpitProcRow[];
}

export interface CockpitEconomics {
  /** false → rincian per-anggota TIDAK TERUKUR untuk perikatan ini */
  hasRoster: boolean;
  members: CockpitMember[];
  budgetHrs: number;
  actualHrs: number;
  burnPct: number;
  /** nilai WIP @ charge-out; null bila tak terukur */
  wipStd: number | null;
  /** biaya waktu yang sudah terjadi @ tarif biaya; null bila tak terukur */
  timeCost: number | null;
  /** biaya pada jam ANGGARAN @ tarif biaya; null bila tak terukur */
  budgetCost: number | null;
  fee: number;
  /** margin rencana = (fee − budgetCost) / fee × 100; null bila tak terukur */
  marginPct: number | null;
  /** WIP @ charge-out terhadap fee, dalam %; null bila tak terukur */
  wipVsFeePct: number | null;
}

/* Bobot literal yang DIGANTI PR-C-1. Diekspor HANYA agar uji dapat
   membuktikan model baru tidak menghasilkan angka ini lagi. Jangan pakai. */
export const LEGACY_TEAM_WEIGHTS: readonly number[] = [0.071, 0.196, 0.261, 0.179, 0.152, 0.141];

export function gradeOf(role: string): string {
  if (/Partner/.test(role)) return 'Partner';
  if (/Manager/.test(role)) return 'Manager';
  if (/Senior/.test(role)) return 'Senior';
  return 'Junior';
}

/* Pencocokan penugasan orang↔kertas kerja.
   UTANG DIAKUI (ditutup PR-C-5): register WP menyimpan nama disingkat
   ('Fajar N.') sedangkan roster menyimpan nama lengkap ('Fajar Nugroho'),
   sehingga satu-satunya jembatan yang ada saat ini adalah nama depan.
   Dua "Dimas" di firma akan saling mengklaim kertas kerja. Perilaku ini
   DIPERTAHANKAN apa adanya di PR-C-1 supaya perubahan angka pada PR ini
   murni berasal dari sumber jam — bukan dari perubahan aturan pencocokan. */
function firstName(full: string | undefined): string {
  return (full || '').split(' ')[0];
}

function countBy<T>(rows: T[], pick: (row: T) => string | undefined, first: string): number {
  return rows.filter((row) => firstName(pick(row)) === first).length;
}

/**
 * cockpitEconomics — satu jawaban untuk "berapa jam & berapa rupiah pada
 * perikatan ini", ditarik dari SSOT `engagementWip`.
 *
 * Perikatan TANPA roster (`ew === null`) tidak mengarang rincian: `members`
 * kosong dan seluruh figur rupiah `null`. Membagi rata atau meminjam roster
 * perikatan lain akan menampilkan angka klien lain sebagai milik klien ini.
 */
export function cockpitEconomics(input: CockpitEconomicsInput): CockpitEconomics {
  const { ew, fee } = input;

  if (!ew || !ew.roster.length) {
    const budgetHrs = input.fallbackBudgetHrs;
    const actualHrs = input.fallbackActualHrs;
    return {
      hasRoster: false,
      members: [],
      budgetHrs,
      actualHrs,
      burnPct: budgetHrs ? (actualHrs / budgetHrs) * 100 : 0,
      wipStd: null,
      timeCost: null,
      budgetCost: null,
      fee,
      marginPct: null,
      wipVsFeePct: null,
    };
  }

  const firmUtilOf = (name: string): number | null => {
    const m = input.firmTeam.find((t) => t.name === name);
    return m && typeof m.util === 'number' ? m.util : null;
  };

  const members: CockpitMember[] = ew.roster.map((r) => {
    const first = firstName(r.name);
    return {
      ...r,
      grade: gradeOf(r.role),
      firmUtil: firmUtilOf(r.name),
      wpPrep: countBy(input.workpapers, (w) => w.preparer, first),
      wpRev: countBy(input.workpapers, (w) => w.reviewer, first),
      procPrep: countBy(input.procs, (p) => p.prep, first),
      procRev: countBy(input.procs, (p) => p.rev, first),
    };
  });

  /* biaya pada jam ANGGARAN — dasar margin rencana. Dienumerasi per anggota
     (bukan total jam × satu tarif blended), sehingga bauran peran ikut terhitung. */
  const budgetCost = members.reduce((s, m) => s + m.budget * m.cost, 0);

  return {
    hasRoster: true,
    members,
    budgetHrs: ew.budgetHrs,
    actualHrs: ew.actualHrs,
    burnPct: ew.budgetHrs ? (ew.actualHrs / ew.budgetHrs) * 100 : 0,
    wipStd: ew.stdValue,
    timeCost: ew.costValue,
    budgetCost,
    fee,
    marginPct: fee ? ((fee - budgetCost) / fee) * 100 : null,
    wipVsFeePct: fee ? (ew.stdValue / fee) * 100 : null,
  };
}
