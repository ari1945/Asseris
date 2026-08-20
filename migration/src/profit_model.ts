/* ============================================================
   Asseris — Profitabilitas Engagement & Partner: derivasi murni (uji di node)
   ------------------------------------------------------------
   Dua cacat yang berasal dari satu keputusan yang sama — menuliskan identitas
   SATU perikatan ke dalam kode yang melayani SELURUH portofolio:

     PF1  extraHours = { '<id demo>': max(0, loggedHours − seedLogged) }
          `loggedHours` menjumlahkan `timeEntries`, yang di-scope PER PERIKATAN
          (`useServerState('timeEntries', …, 'engagement', activeEngagementId)`).
          Deltanya, sebaliknya, selalu dikreditkan ke perikatan demo. Mengisi
          timesheet pada perikatan mana pun akan menggelembungkan ekonomi
          perikatan demo — dan meninggalkan perikatan yang jamnya benar-benar
          diisi tanpa perubahan apa pun. Sekelas TB1 di Time & Budget: fallback
          ke id entitas literal = kebocoran isolasi yang tidak berbunyi.
          `pmExtraHours` kini menerima id perikatan AKTIF; tanpa perikatan aktif
          ia mengembalikan `{}` — tak ada yang ditebak.

     PF2  REALIZATION = { … } beku di dalam view + cadangan `|| 0.9`.
          Tarifnya kini DATA (`AMS.ENG_FEE_REALIZATION`, data_part4.ts) dan
          dapat disuntik (`realizationOf`) supaya lebih dari satu perikatan
          dapat diuji. Perikatan tanpa tarif menghasilkan `null` yang MERAMBAT
          ke seluruh turunan (billed/margin/effRate) — pemanggil wajib merender
          keadaan kosong, bukan menambal dengan 90% atau nol.

   Mengapa realisasi fee TIDAK diturunkan dari `FIRMFIN.wip()`: mesin itu memang
   punya `realization`, tetapi penyebutnya NILAI STANDAR CHARGE-OUT, bukan fee
   kontrak. Untuk tiga perikatan seed hasilnya > 100% (write-up), sehingga
   memakainya di sini akan menghasilkan "fee terealisasi" melebihi fee kontrak.
   Bukti angkanya dipaku sebagai premis di `profit_isolation.test.ts`.
   ============================================================ */
import { AMS } from './data';
import { FIRMFIN } from './data_firmfin';

export interface PMTimeEntry { hours: number; engagementId?: string }
export interface PMEngagement { id: string; clientId?: string; partner: string; actualHrs: number; budgetHrs: number }
export interface PMClient { id: string; name?: string; fee?: number }
export interface PMAlloc { eng: string; hrs: number }
export interface PMScheduleRow { role: string; alloc: PMAlloc[] }
export type PMRates = Readonly<Record<string, number>>;

/* P0-B1 — tarif charge-out dari SSOT FIRMFIN.WIP_BILL (bukan rate card lokal
   yang bisa menyimpang). SCHEDULE memakai role singkat → petakan ke key SSOT. */
const ROLE_SHORT: Readonly<Record<string, string>> = {
  'Engagement Partner': 'Partner', 'Audit Manager': 'Manager',
  'Senior Auditor': 'Senior', 'Junior Auditor': 'Junior',
};
const shortKeys = (src: Record<string, number>): PMRates =>
  Object.fromEntries(Object.entries(src).map(([k, v]) => [ROLE_SHORT[k] || k, v]));
/** tarif CHARGE-OUT per grade (FIRMFIN.WIP_BILL) — untuk NILAI, bukan biaya */
export const PM_BILL_CARD: PMRates = shortKeys(FIRMFIN.WIP_BILL as Record<string, number>);
/** tarif BIAYA per grade (FIRMFIN.WIP_COST) — untuk biaya, bukan nilai.
    Sampai 2026-08-21 modul ini memakai `WIP_BILL` untuk keduanya: biaya
    dibukukan pada harga jual. ENG-…-031 karenanya dibebani Rp 1.659k/jam —
    di atas tarif TAGIHAN Manager — dan melaporkan rugi 43% yang tak pernah
    ada. Preseden pemisahan ini: `cockpit_model.ts` (cacat yang sama, arah
    sebaliknya: nilai WIP dihitung pada tarif biaya, meleset 2×). */
export const PM_COST_CARD: PMRates = shortKeys(FIRMFIN.WIP_COST as Record<string, number>);

/** Roster perikatan dari SSOT (FIRMFIN.engagementWip) — null bila tak ada. */
export interface PMEngRoster { actualHrs: number; costValue: number; stdValue: number }
export type PMRosterOf = (engId: string) => PMEngRoster | null;
/** Pabrik pembaca roster; menyimpan FIRMFIN di LUAR view. */
/**
 * Pabrik pembaca roster; menyimpan FIRMFIN di LUAR view.
 *
 * `timeEntries` adalah timesheet perikatan AKTIF saja (`useServerState` scope
 * 'engagement'), jadi ia hanya boleh diterapkan pada perikatan itu. Meneruskan
 * ke semua perikatan — seperti yang dilakukan PR #269 — mengkreditkan jam
 * perikatan lain ke perikatan ber-roster: PF1 yang masuk lewat pintu lain,
 * bukan id literal melainkan timesheet yang salah pemilik.
 */
export const pmRosterOf = (
  timeEntries: readonly PMTimeEntry[] | null | undefined,
  activeEngId?: string | null,
): PMRosterOf =>
  (engId) => FIRMFIN.engagementWip(
    engId === activeEngId ? timeEntries : [], engId) as PMEngRoster | null;
export const PM_DEFAULT_MIX: PMRates = { Partner: 0.05, Manager: 0.15, Senior: 0.35, Junior: 0.45 };

const sumHours = (rows: readonly PMTimeEntry[] | null | undefined): number =>
  (rows || []).reduce((s, t) => s + (+t.hours || 0), 0);

/**
 * Jam timesheet yang melebihi baseline seed, dikreditkan ke perikatan AKTIF.
 * `{}` bila tak ada perikatan aktif — tidak ada perikatan pengganti.
 *
 * `seed` adalah REGISTER seed penuh (`AMS.TIME_ENTRIES`); baseline yang
 * dikurangkan adalah bagian milik perikatan aktif saja. Baseline global akan
 * salah dua arah begitu seed-nya ber-scope: perikatan tanpa entri seed memulai
 * dari baseline 48 jam, sehingga sepuluh jam pertama yang dicatat auditor
 * ditelan diam-diam (`max(0, 10 − 48) = 0`).
 */
export function pmExtraHours(
  live: readonly PMTimeEntry[] | null | undefined,
  seed: readonly PMTimeEntry[] | null | undefined,
  activeEngId: string | null | undefined,
): Record<string, number> {
  if (!activeEngId) return {};
  const baseline = (seed || []).filter((t) => t.engagementId === activeEngId);
  return { [activeEngId]: Math.max(0, sumHours(live) - sumHours(baseline)) };
}

/** Tarif realisasi fee perikatan; `null` = tak ada tarif utk perikatan ini. */
export type PMRealizationOf = (engId: string) => number | null;

/** Sumber produksi: DATA (`AMS.ENG_FEE_REALIZATION`, data_part4.ts) — dibaca
    saat dipanggil (bukan dibekukan saat modul dimuat), tanpa cadangan karangan. */
export const pmRealizationOf: PMRealizationOf = (engId) => {
  const reg = (AMS as unknown as { ENG_FEE_REALIZATION?: readonly { eng: string; rate: number }[] })
    .ENG_FEE_REALIZATION || [];
  const hit = reg.find((r) => r.eng === engId);
  return hit ? hit.rate : null;
};

export interface PMBlended { rate: number; source: string }
export function pmBlendedRate(
  schedule: readonly PMScheduleRow[] | null | undefined,
  engId: string,
  rateCard: PMRates = PM_COST_CARD,
): PMBlended {
  let wsum = 0, hsum = 0;
  (schedule || []).forEach((m) => m.alloc
    .filter((a) => a.eng === engId)
    .forEach((a) => { const r = rateCard[m.role] || rateCard.Senior; wsum += a.hrs * r; hsum += a.hrs; }));
  if (hsum > 0) return { rate: wsum / hsum, source: 'staffing aktual' };
  const rate = Object.entries(PM_DEFAULT_MIX).reduce((s, [g, p]) => s + p * rateCard[g], 0);
  return { rate, source: 'mix standar' };
}

export interface PMRow {
  id: string; client: string; partner: string;
  /** fee kontrak; `null` bila klien perikatan ini tak punya fee tercatat */
  fee: number | null;
  hours: number; budgetHrs: number;
  stdCost: number; blendedRate: number; costSource: string;
  /** nilai WIP @ tarif charge-out untuk jam yang sama */
  wipCharge: number;
  /** tarif realisasi fee; `null` = tak diketahui → seluruh turunan ikut null */
  realized: number | null;
  billed: number | null; margin: number | null;
  marginPct: number | null; effRate: number | null; recovery: number | null;
  /** true bila baris ini TIDAK boleh dijumlahkan (fee/realisasi tak diketahui) */
  incomplete: boolean;
}
export interface PMInput {
  engagements: readonly PMEngagement[];
  clients: readonly PMClient[];
  schedule: readonly PMScheduleRow[] | null | undefined;
  realizationOf?: PMRealizationOf;
  rosterOf?: PMRosterOf;
  extraHours?: Readonly<Record<string, number>>;
  costCard?: PMRates;
  billCard?: PMRates;
}

export function pmRows(input: PMInput): PMRow[] {
  const { engagements, clients, schedule, extraHours } = input;
  const realizationOf = input.realizationOf || pmRealizationOf;
  const costCard = input.costCard || PM_COST_CARD;
  const billCard = input.billCard || PM_BILL_CARD;
  const rosterOf = input.rosterOf || (() => null);
  return engagements.map((e) => {
    const c = clients.find((x) => x.id === e.clientId);
    const hoursApprox = e.actualHrs + ((extraHours || {})[e.id] || 0);
    /* Bila perikatan punya ROSTER, FIRMFIN sudah menjawab jam, biaya & nilai
       standarnya — angka yang sama dipakai Time & Budget dan Engagement
       Cockpit. Menghitungnya lagi di sini berarti register keempat, jadi
       roster yang berlaku. Tanpa roster: mix jadwal × tarif, dan `costSource`
       mengatakan bahwa itu PENDEKATAN. */
    const roster = rosterOf(e.id);
    const hours = roster ? roster.actualHrs : hoursApprox;
    const br = roster
      ? { rate: roster.actualHrs ? roster.costValue / roster.actualHrs : 0, source: 'roster perikatan' }
      : pmBlendedRate(schedule, e.id, costCard);
    const stdCost = roster ? roster.costValue : Math.round(hours * br.rate);
    const wipCharge = roster
      ? roster.stdValue
      : Math.round(hours * pmBlendedRate(schedule, e.id, billCard).rate);
    /* `c.fee || 0` dulu mengubah "fee tak tercatat" menjadi "fee nol jt" —
       angka yang tampak seperti fakta. Kini ia tak diketahui, dan berkata begitu. */
    const fee = c && typeof c.fee === 'number' ? c.fee : null;
    const realized = realizationOf(e.id);
    const incomplete = fee === null || realized === null;
    const billed = incomplete ? null : fee! * realized!;
    const margin = billed === null ? null : billed - stdCost;
    return {
      id: e.id, client: ((c && c.name) || '').replace(' Tbk', ''), partner: e.partner.split(',')[0],
      fee, hours, budgetHrs: e.budgetHrs, stdCost, blendedRate: br.rate, costSource: br.source, wipCharge,
      realized, billed, margin,
      marginPct: margin === null || !billed ? null : margin / billed * 100,
      effRate: billed === null || !hours ? null : billed / hours,
      recovery: fee === null || !stdCost ? null : fee / stdCost,
      incomplete,
    };
  });
}

export interface PMTotals {
  fee: number; billed: number; margin: number; stdCost: number;
  avgMarginPct: number | null; avgRealizedPct: number | null;
  /** jumlah baris yang benar-benar masuk total */
  counted: number;
  /** id perikatan yang DIKELUARKAN dari total — layar wajib menyebutnya */
  incomplete: string[];
}
/** Total hanya menjumlahkan baris lengkap; sisanya dilaporkan, bukan dinolkan. */
export function pmTotals(rows: readonly PMRow[]): PMTotals {
  const ok = rows.filter((r) => !r.incomplete);
  const fee = ok.reduce((s, r) => s + (r.fee || 0), 0);
  const billed = ok.reduce((s, r) => s + (r.billed || 0), 0);
  const margin = ok.reduce((s, r) => s + (r.margin || 0), 0);
  return {
    fee, billed, margin,
    stdCost: ok.reduce((s, r) => s + r.stdCost, 0),
    avgMarginPct: billed ? margin / billed * 100 : null,
    avgRealizedPct: ok.length ? ok.reduce((s, r) => s + (r.realized || 0), 0) / ok.length * 100 : null,
    counted: ok.length,
    incomplete: rows.filter((r) => r.incomplete).map((r) => r.id),
  };
}

export interface PMPartner {
  partner: string; fee: number; billed: number; margin: number;
  count: number; hours: number; marginPct: number | null;
}
/** Agregat partner dari baris LENGKAP saja — satu baris tak diketahui tidak
    boleh menurunkan margin partner dengan berpura-pura bernilai nol. */
export function pmPartners(rows: readonly PMRow[]): PMPartner[] {
  const m: Record<string, Omit<PMPartner, 'marginPct'>> = {};
  rows.filter((r) => !r.incomplete).forEach((r) => {
    if (!m[r.partner]) m[r.partner] = { partner: r.partner, fee: 0, billed: 0, margin: 0, count: 0, hours: 0 };
    const p = m[r.partner];
    p.fee += r.fee || 0; p.billed += r.billed || 0; p.margin += r.margin || 0; p.count++; p.hours += r.hours;
  });
  return Object.values(m)
    .map((p) => ({ ...p, marginPct: p.billed ? p.margin / p.billed * 100 : null }))
    .sort((a, b) => b.margin - a.margin);
}

/* ---- Leverage & recovery (tab ketiga) ----
   `wipCharge` kini dihitung di `pmRows` pada tarif CHARGE-OUT yang sebenarnya,
   jadi tak ada lagi pengali karangan yang harus diteruskan dari view. */
export interface PMRecoveryRow extends PMRow {
  recoveryPct: number | null; writedown: number | null;
}
export function pmRecovery(rows: readonly PMRow[]): PMRecoveryRow[] {
  return rows.map((r) => ({
    ...r,
    recoveryPct: r.billed === null || !r.wipCharge ? null : r.billed / r.wipCharge,
    writedown: r.billed === null ? null : r.wipCharge - r.billed,
  }));
}
export interface PMRecoveryTotals { wip: number; billed: number; writedown: number; recoveryPct: number | null; incomplete: string[] }
export function pmRecoveryTotals(rows: readonly PMRecoveryRow[]): PMRecoveryTotals {
  const ok = rows.filter((r) => !r.incomplete);
  const wip = ok.reduce((s, r) => s + r.wipCharge, 0);
  const billed = ok.reduce((s, r) => s + (r.billed || 0), 0);
  return {
    wip, billed, writedown: wip - billed,
    recoveryPct: wip ? billed / wip : null,
    incomplete: rows.filter((r) => r.incomplete).map((r) => r.id),
  };
}
