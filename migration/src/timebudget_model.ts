/* ============================================================
   Asseris — Time & Budget: derivasi murni (dapat diuji di node)
   ------------------------------------------------------------
   Modul `time` dulu meminjam angka perikatan demo ketika perikatan aktif tak
   punya roster:

       const ew = (engagementWip(entries, e.id) || engagementWip(entries, '…-014'))!;

   Operator `||` itu membuat "tidak ada data" tak dapat dibedakan dari "data
   milik orang lain" — kebocoran isolasi W7.5 yang tidak berbunyi: bukan error,
   bukan kosong, melainkan angka yang tampak masuk akal di bawah judul
   perikatan yang salah. Kontrak `FIRMFIN.engagementWip` sendiri sudah jujur:
   ia mengembalikan `null` untuk perikatan tanpa roster (data_firmfin.ts:57).
   Yang salah adalah pembacanya. Karena itu `tbModel` di sini **meneruskan
   null** — pemanggil wajib merender keadaan kosong, bukan menambal.

   Konsekuensi kedua: apa pun yang dulu dikunci ke satu perikatan lewat
   konstanta tingkat-modul (roster, anggaran per fase, seri mingguan) kini
   diturunkan dari perikatan aktif. Yang tersisa sebagai literal hanyalah
   PROFIL ALOKASI (`TB_PHASE_PROFILE`) — bobot relatif, bukan jam — dan ia
   diberi label demikian di UI, mengikuti pola `PHASE_BUDGET_WEIGHT` di
   cockpit_progress.ts. Lihat catatan di profil itu: sumber bobotnya masih
   pertanyaan terbuka.
   ============================================================ */
import { FIRMFIN } from './data_firmfin';
import { progressOf } from './revenue_psak72';

export interface TBTimeEntry { id: string; member: string; date: string; phase: string; task: string; hours: number }
export interface TBRosterRow {
  name: string; role: string; budget: number; base: number;
  actual: number; bill: number; cost: number; billVal: number; costVal: number;
  variance: number; util: number;
}
export interface TBWip { roster: TBRosterRow[]; actualHrs: number; budgetHrs: number; stdValue: number; costValue: number }
export interface TBEngagement { id: string; clientId?: string; progress?: number; status?: string | null }
export interface TBClient { id: string; fee?: number }
export type TBWipOf = (timeEntries: TBTimeEntry[], engId: string) => TBWip | null;

export interface TBPhaseRow {
  id: string; label: string; budget: number; base: number; pct: number; period: string;
  actual: number; eac: number; variance: number;
}
export interface TBWeekBucket { wk: string; h: number; start: string; end: string }
export interface TBWeeklySeries {
  weeks: TBWeekBucket[];
  avg: number;
  /** minggu tertinggi menurut DATA — bukan label tetap; null bila seri kosong */
  peak: TBWeekBucket | null;
  from: string | null;
  to: string | null;
}
export interface TBModel {
  roster: TBRosterRow[]; phases: TBPhaseRow[]; weekly: TBWeeklySeries;
  actualTotal: number; budgetTotal: number; remaining: number; burn: number;
  stdValue: number; costActual: number; stdValueBudget: number; costBudget: number;
  eacHrs: number; etcHrs: number;
  /** Kemajuan yang MENGAKUI pendapatan — kanon `revenue_psak72.progressOf`.
      `null` = belum terukur. BUKAN `e.progress`; lihat catatan di `tbModel`. */
  recogPct: number | null;
  /** `null` bila kemajuan belum terukur — tak ada taksiran penggantinya. */
  revRecognized: number | null;
  fee: number;
  /** `null` mengikuti `revRecognized`. */
  marginNow: number | null;
  marginCompletion: number; realization: number;
  blendedBill: number; blendedCost: number;
}

/* Fee cadangan untuk baris klien lama tanpa `fee` — bukan angka perikatan lain. */
export const TB_FEE_FALLBACK = 1_520_000_000;

/* ------------------------------------------------------------------
   PROFIL FASE — BOBOT, bukan jam.
   `budgetShare`/`openingShare` dipakai sebagai proporsi: jam anggaran &
   jam pembuka perikatan AKTIF dibagi menurut bobot ini, sehingga totalnya
   selalu menutup ke `ew.budgetHrs` / `ew.actualHrs`. Angka pembilangnya
   sengaja dibiarkan sama dengan jam literal yang dulu dipaku (320/1080/320/120
   dan 318/658/98/24) supaya perikatan demo — satu-satunya yang punya roster —
   menampilkan angka yang PERSIS sama seperti sebelum PR ini (nol-delta),
   sementara perikatan lain berhenti mewarisi anggaran 1840 jam milik demo.

   TERBUKA (butuh keputusan Ari, jangan diputuskan sepihak):
     · dari mana bobot ini seharusnya berasal. `PHASE_BUDGET_WEIGHT`
       (cockpit_progress.ts) sudah ada TAPI taksonomi fasenya berbeda —
       ia punya 'Specifics' & 'Review & Arsip', profil ini punya 'Pelaporan'.
       Memetakan diam-diam antar dua taksonomi = asumsi senyap.
     · `pct` (% selesai per fase) masih profil tetap. Untuk perikatan demo
       rata-rata tertimbang-anggarannya = 62% dan itu persis `e.progress`;
       untuk perikatan lain ia akan membantah progres perikatan.
     · `period` masih kalender perikatan demo.
   ------------------------------------------------------------------ */
export interface TBPhaseProfile {
  id: string; label: string; period: string;
  budgetShare: number; openingShare: number; pct: number;
}
export const TB_PHASE_PROFILE: readonly TBPhaseProfile[] = [
  { id: 'Perencanaan', label: 'Perencanaan',          period: '02–20 Feb',    budgetShare: 320,  openingShare: 318, pct: 100 },
  { id: 'Eksekusi',    label: 'Eksekusi (Fieldwork)', period: '24 Feb–20 Mar', budgetShare: 1080, openingShare: 658, pct: 65 },
  { id: 'Finalisasi',  label: 'Finalisasi & Review',  period: '21–28 Mar',    budgetShare: 320,  openingShare: 98,  pct: 30 },
  { id: 'Pelaporan',   label: 'Pelaporan & Arsip',    period: '29–31 Mar',    budgetShare: 120,  openingShare: 24,  pct: 20 },
];

const defaultWipOf: TBWipOf = (entries, engId) =>
  FIRMFIN.engagementWip(entries, engId) as unknown as TBWip | null;

/* Alokasi EKSAK: n−1 bagian dibulatkan 2 desimal, sisanya masuk ke bagian
   terakhir. Jumlahnya karena itu SELALU tepat sama dengan `total` — tie-out
   di gerbang uji bukan hasil kebetulan pembulatan. */
export function tbAllocate(total: number, shares: readonly number[]): number[] {
  const sum = shares.reduce((s, w) => s + w, 0);
  if (!(sum > 0) || shares.length === 0) return shares.map(() => 0);
  const out = shares.map((w) => Math.round((total * w / sum) * 100) / 100);
  out[out.length - 1] = total - out.slice(0, -1).reduce((s, v) => s + v, 0);
  return out;
}

/** Nilai standar satu baris timesheet — tarif dari roster perikatan AKTIF. */
export function tbEntryValue(roster: readonly TBRosterRow[], member: string, hours: number): number {
  const r = roster.find((x) => x.name === member);
  return r ? hours * r.bill : 0;
}

/* ---- seri mingguan: diturunkan dari tanggal entri, bukan dikarang ---- */
const BULAN_ID = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI_MS = 86_400_000;

const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);
/** Senin (UTC) dari minggu yang memuat tanggal ini. */
function seninDari(tanggal: string): number {
  const d = Date.parse(tanggal + 'T00:00:00Z');
  if (Number.isNaN(d)) return NaN;
  const dow = new Date(d).getUTCDay();          // 0=Minggu … 6=Sabtu
  return d - ((dow + 6) % 7) * HARI_MS;
}
/** '2026-03-31' → '31 Mar 2026'. Kosong bila tanggalnya tak terbaca. */
export function tbTanggalPanjang(isoDate: string | undefined): string {
  if (!isoDate) return '';
  const ms = Date.parse(isoDate + 'T00:00:00Z');
  if (Number.isNaN(ms)) return '';
  const d = new Date(ms);
  return String(d.getUTCDate()).padStart(2, '0') + ' ' + BULAN_ID[d.getUTCMonth()] + ' ' + d.getUTCFullYear();
}

export function tbLabelMinggu(isoDate: string): string {
  const d = new Date(Date.parse(isoDate + 'T00:00:00Z'));
  return String(d.getUTCDate()).padStart(2, '0') + ' ' + BULAN_ID[d.getUTCMonth()];
}

/**
 * Jam tercatat per minggu kalender, dari `timeEntries`.
 * Minggu tanpa entri di TENGAH rentang tetap muncul (nilai 0) supaya sumbu
 * waktunya tidak memampat; di luar rentang tidak ada apa-apa. Jam PEMBUKA
 * (roster `base`) tidak punya tanggal, jadi tidak ikut — itu keterbatasan
 * data, dan UI menyebutnya alih-alih menambalnya dengan literal.
 */
export function tbWeekly(timeEntries: readonly TBTimeEntry[]): TBWeeklySeries {
  const perSenin = new Map<number, number>();
  (timeEntries || []).forEach((t) => {
    const s = seninDari(t.date);
    if (Number.isNaN(s)) return;
    perSenin.set(s, (perSenin.get(s) || 0) + t.hours);
  });
  if (perSenin.size === 0) return { weeks: [], avg: 0, peak: null, from: null, to: null };

  const kunci = [...perSenin.keys()].sort((a, b) => a - b);
  const awal = kunci[0], akhir = kunci[kunci.length - 1];
  const weeks: TBWeekBucket[] = [];
  for (let s = awal; s <= akhir; s += 7 * HARI_MS) {
    weeks.push({ wk: tbLabelMinggu(iso(s)), h: perSenin.get(s) || 0, start: iso(s), end: iso(s + 6 * HARI_MS) });
  }
  const peak = weeks.reduce((best, w) => (w.h > best.h ? w : best), weeks[0]);
  return {
    weeks,
    avg: weeks.reduce((s, w) => s + w.h, 0) / weeks.length,
    peak,
    from: weeks[0].start,
    to: weeks[weeks.length - 1].end,
  };
}

/**
 * Model Time & Budget untuk perikatan aktif.
 * `null` = perikatan ini tak punya roster/timesheet. Pemanggil WAJIB merender
 * keadaan kosong; tidak ada perikatan pengganti.
 */
export function tbModel(
  timeEntries: TBTimeEntry[],
  e: TBEngagement,
  clients: readonly TBClient[],
  wipOf: TBWipOf = defaultWipOf,
): TBModel | null {
  const ew = wipOf(timeEntries, e.id);
  if (!ew) return null;

  const roster = ew.roster;
  const anggota = new Set(roster.map((r) => r.name));
  /* Hanya jam anggota roster yang masuk `ew.actualHrs`; seri per fase mengikuti
     aturan yang sama supaya jumlah fase menutup ke total perikatan. */
  const live = (timeEntries || []).filter((t) => anggota.has(t.member));
  const liveByPhase: Record<string, number> = {};
  live.forEach((t) => { liveByPhase[t.phase] = (liveByPhase[t.phase] || 0) + t.hours; });
  const liveTotal = live.reduce((s, t) => s + t.hours, 0);

  const budgetTotal = ew.budgetHrs;
  const actualTotal = ew.actualHrs;
  /* jam pembuka = aktual − jam timesheet bertanggal; dibagi menurut profil */
  const openingTotal = actualTotal - liveTotal;
  const anggaran = tbAllocate(budgetTotal, TB_PHASE_PROFILE.map((p) => p.budgetShare));
  const pembuka = tbAllocate(openingTotal, TB_PHASE_PROFILE.map((p) => p.openingShare));

  const phases: TBPhaseRow[] = TB_PHASE_PROFILE.map((p, i) => {
    const budget = anggaran[i], base = pembuka[i];
    const actual = base + (liveByPhase[p.id] || 0);
    const eac = p.pct > 0 ? actual / (p.pct / 100) : budget;
    return { id: p.id, label: p.label, period: p.period, pct: p.pct, budget, base, actual, eac, variance: budget - actual };
  });

  const stdValue = ew.stdValue;
  const costActual = ew.costValue;
  const stdValueBudget = roster.reduce((s, r) => s + r.budget * r.bill, 0);
  const costBudget = roster.reduce((s, r) => s + r.budget * r.cost, 0);
  /* EAC memakai `e.progress` DENGAN SENGAJA, dan itu bukan kelalaian.
     Proyeksi jam-pada-penyelesaian butuh taksiran kemajuan yang BEBAS dari jam;
     memakai kemajuan metode-masukan membuatnya tautologis:
     actual / (actual/budget) === budget, untuk perikatan apa pun, selamanya.
     `progress` tetap berguna justru di sini — sebagai pertimbangan, bukan
     sebagai dasar pengakuan pendapatan. */
  const prog = (e.progress || 0) / 100;
  const eacHrs = prog > 0 ? actualTotal / prog : budgetTotal;
  const fee = clients.find((c) => c.id === e.clientId)?.fee || TB_FEE_FALLBACK;
  /* SC-5 (PRD metode masukan): SATU ukuran kemajuan untuk pengakuan pendapatan.
     Sampai 2026-08-22 baris "Pendapatan diakui (% completion)" di layar ini
     memakai `fee × e.progress`, sementara modul Pendapatan Firma memakai
     rumusnya sendiri — dua angka "pendapatan diakui" untuk satu perikatan.
     Keduanya kini lewat kanon yang sama, berikut kedua pagarnya. */
  const recog = progressOf(
    { id: e.id, clientId: e.clientId || '', status: e.status },
    { actualHrs: actualTotal, budgetHrs: budgetTotal },
  );
  const revRecognized = recog.pct == null ? null : Math.round(fee * recog.pct);
  return {
    roster, phases, weekly: tbWeekly(timeEntries),
    actualTotal, budgetTotal, remaining: budgetTotal - actualTotal,
    burn: budgetTotal ? actualTotal / budgetTotal : 0,
    stdValue, costActual, stdValueBudget, costBudget,
    eacHrs, etcHrs: Math.max(0, eacHrs - actualTotal),
    recogPct: recog.pct, revRecognized,
    fee, marginNow: revRecognized == null ? null : revRecognized - costActual,
    marginCompletion: fee - costBudget, realization: stdValueBudget ? fee / stdValueBudget : 0,
    blendedBill: actualTotal ? stdValue / actualTotal : 0,
    blendedCost: actualTotal ? costActual / actualTotal : 0,
  };
}
