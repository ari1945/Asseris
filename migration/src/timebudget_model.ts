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

   ------------------------------------------------------------
   Dua angka karangan berikutnya, dicabut di sini (temuan §12 PRD metode
   masukan PSAK 72 — dilaporkan di sana, di luar lingkupnya):

   TB5  `TB_FEE_FALLBACK = 1_520_000_000` — fee KARANGAN untuk perikatan yang
        kliennya tak ber-fee. Kelas cacat yang persis sama dengan
        `materialitas × 0,4` yang dicabut dari skedul pendapatan (#277), dan
        sama-sama DORMAN pada seed: kedelapan klien seed ber-fee, jadi tak ada
        uji NILAI atas seed yang dapat menangkapnya — ujinya harus MEMBANGUN
        keadaan pemicunya. Nilai kontrak kini datang dari `contractValueOf`,
        fungsi yang sama yang dipakai skedul PSAK 72, dan `null` diteruskan apa
        adanya.

        Perhatikan: sesudah #278, `revRecognized` sudah boleh null karena
        KEMAJUAN belum terukur. Sekarang ia juga boleh null karena NILAI
        KONTRAK belum ditetapkan — dua lubang data yang berbeda, dan layar
        menyebut yang mana. `marginCompletion` dan `realization` ikut nullable
        karena keduanya murni bergantung pada fee.

        Operatornya juga salah: `?.fee || TB_FEE_FALLBACK` menjatuhkan fee 0
        — perikatan pro bono — ke fallback, sehingga pekerjaan cuma-cuma muncul
        sebagai kontrak Rp 1.520 jt. `contractValueOf` menerima 0 sebagai angka
        yang sah dan hanya menolak yang bukan angka berhingga non-negatif.

   TB6  Panel "Penagihan & WIP" menyintesis penagihan dari fee: "Sudah ditagih
        (2 termin)" = `fee × 0,5`, "Sisa nilai kontrak" = `fee × 0,5`, "Termin
        ke-3" = `fee × 0,3` — padahal register faktur NYATA sudah ada dan sudah
        berpintu tunggal (`useInvoiceRegister`, #275). Cacat ini TIDAK dorman:
        pada seed, perikatan demo sudah menerbitkan dua faktur senilai 1.480 jt
        terhadap fee 1.850 jt, jadi `fee × 0,5` = 925 jt salah hari ini juga,
        dan sisa kontraknya 370 jt bukan 925 jt. `tbBilling` di bawah membacanya
        dari register.

        "Termin ke-3" DICABUT tanpa pengganti karangan: tak ada termin ketiga
        di register mana pun (yang dilabelinya justru faktur Termin 2 milik
        perikatan demo), dan tanggal jatuh temponya pun tak pernah diturunkan
        dari data. Yang menggantikannya adalah faktur yang BENAR-BENAR terbit
        dan belum lunas — dengan tanggal jatuh tempo miliknya sendiri — atau
        pernyataan bahwa register tak memuat satu pun.
   ============================================================ */
import { FIRMFIN } from './data_firmfin';
import { UNBILLED_STATUS, contractValueOf, progressOf, type RevenueGap } from './revenue_psak72';
import { phaseRollups, type ModuleWpStatus } from './cockpit_progress';
import {
  PHASE_LABEL, PHASE_ORDER, phaseBudgetHours, phaseHoursOf, type PhaseId,
} from './phase_canon';

export interface TBTimeEntry { id: string; member: string; date: string; phase: string; task: string; hours: number }
export interface TBRosterRow {
  name: string; role: string; budget: number; base: number;
  actual: number; bill: number; cost: number; billVal: number; costVal: number;
  variance: number; util: number;
}
export interface TBWip { roster: TBRosterRow[]; actualHrs: number; budgetHrs: number; stdValue: number; costValue: number }
export interface TBEngagement { id: string; clientId?: string; progress?: number; status?: string | null }
/** Klien — subset yang dipakai model. `fee` opsional karena hidrasi API boleh
    datang tanpa kolom itu; ketiadaannya adalah lubang data, bukan izin menaksir. */
export interface TBClient { id: string; fee?: number | null }
export type TBWipOf = (timeEntries: TBTimeEntry[], engId: string) => TBWip | null;

/**
 * Satu baris fase. HANYA memuat besaran yang punya sumber:
 *
 *   `budget`     model alokasi kanon (`phase_canon`) — sama persis dengan yang
 *                dipakai cockpit; dulu dua layar memakai bobot berbeda.
 *   `actual`     jam timesheet BERTANGGAL pada fase ini — fakta.
 *   `provenPct`  kelengkapan TERBUKTI dari kertas kerja (`phaseRollups`);
 *                `null` bila status kertas kerja tak tersedia.
 *
 * Yang DICABUT beserta alasannya:
 *   `period`  tanggal per-fase tak ada di data mana pun. `engagementMilestones`
 *             (cockpit_timeline) sudah menetapkan preseden: ia memberi
 *             `dateIso: null` untuk perencanaan/eksekusi/finalisasi dan hanya
 *             menambatkan mulai · tenggat opini · batas arsip.
 *   `pct`     dulu literal 100/65/30/20 untuk SETIAP perikatan. Rata-rata
 *             tertimbang-anggarannya 62,07% — persis `e.progress` perikatan
 *             demo, tanda tala yang sama yang sudah dicabut dari cockpit.
 *   `eac`     diturunkan dari `pct` literal itu, jadi ikut karangan. TIDAK
 *             diganti `actual / provenPct`: itu mencampur jam yang dikonsumsi
 *             dengan kelengkapan dokumentasi — percampuran yang cockpit sudah
 *             tolak secara eksplisit (catatan `econBase`, view_cockpit2).
 *   `base`    porsi jam pembuka per fase. Jam pembuka roster tak bertanggal
 *             dan tak berfase; menyebarnya menurut bobot anggaran = mengarang
 *             atribusi. Kini dilaporkan utuh sebagai `TBModel.untaggedHrs`.
 */
export interface TBPhaseRow {
  id: PhaseId; label: string;
  budget: number;
  actual: number;
  provenPct: number | null;
  variance: number;
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
  /**
   * Jam aktual yang TIDAK dapat diatribusikan ke fase mana pun: jam pembuka
   * roster (tak bertanggal, tak berfase) ditambah entri timesheet yang fasenya
   * tak dikenal. Dinyatakan, tidak disebar — pola `untaggedHrs` cockpit.
   *
   * INVARIAN: `Σ phases[].actual + untaggedHrs === actualTotal`.
   */
  untaggedHrs: number;
  stdValue: number; costActual: number; stdValueBudget: number; costBudget: number;
  eacHrs: number; etcHrs: number;
  /** Kemajuan yang MENGAKUI pendapatan — kanon `revenue_psak72.progressOf`.
      `null` = belum terukur. BUKAN `e.progress`; lihat catatan di `tbModel`. */
  recogPct: number | null;
  /** `null` bila kemajuan belum terukur — tak ada taksiran penggantinya. */
  revRecognized: number | null;
  /* --- besaran RUPIAH yang bergantung pada NILAI KONTRAK ---
     `null` = nilai kontrak perikatan ini belum ditetapkan. Bukan nol: nol
     berarti "sudah diukur, hasilnya nihil", dan itu pernyataan yang berbeda. */
  /** Nilai kontrak = fee klien. */
  fee: number | null;
  /** `null` mengikuti `revRecognized`. */
  marginNow: number | null;
  marginCompletion: number | null;
  /** Recovery rate = fee ÷ nilai standar anggaran. `null` juga ketika nilai
      standar anggarannya nol — rasio tak terdefinisi bukan 0%. */
  realization: number | null;
  /** Lubang NILAI KONTRAK. Kosakatanya dibagi dengan skedul pendapatan supaya
      dua layar menamai keadaan yang sama dengan satu nama; lubang KEMAJUAN
      punya salurannya sendiri (`recogPct == null`), jadi hari ini medan ini
      hanya pernah membawa 'contract-unknown'. */
  feeGap: RevenueGap | null;
  blendedBill: number; blendedCost: number;
}

/* TB7 — `TB_PHASE_PROFILE` DICABUT. Ia memasok empat besaran ke tab "Anggaran
   per Fase": bobot anggaran, bobot jam pembuka, % selesai, dan periode
   kalender. Bobotnya adalah kanon KEDUA (cockpit punya sendiri, dengan angka
   berbeda, membagi jam anggaran yang SAMA); dua sisanya karangan. Rinciannya
   di `docs/prd-timebudget-phase-profile.md` dan pada `TBPhaseRow` di atas. */

const defaultWipOf: TBWipOf = (entries, engId) =>
  FIRMFIN.engagementWip(entries, engId) as unknown as TBWip | null;

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

/* ------------------------------------------------------------------
   TB6 · PENAGIHAN — fakta register faktur, bukan pecahan fee.
   ------------------------------------------------------------------ */

/** Faktur — subset yang dipakai panel penagihan. `InvoiceRecord` masuk secara
    struktural, jadi register `useInvoiceRegister()` langsung cocok. */
export interface TBInvoice {
  id: string; eng?: string; status?: string;
  amount?: number; paid?: number; due?: string; milestone?: string;
}

/** Faktur terbit yang masih menyisakan tagihan. */
export interface TBInvoiceDue {
  id: string; milestone: string; due: string; outstanding: number;
}

export interface TBBilling {
  /** Σ nilai faktur perikatan ini yang SUDAH terbit. Fakta register. */
  billed: number;
  /** Banyaknya faktur terbit yang menyusun `billed` — angka untuk label,
      menggantikan "(2 termin)" yang dipaku. */
  issued: number;
  /** Faktur yang masih draf: ada di register, belum menagih apa pun. Dilaporkan
      supaya "belum ada tagihan" tak tertukar dengan "ada draf belum terbit". */
  drafts: number;
  /** Sisa nilai kontrak = nilai kontrak − tertagih. `null` bila nilai
      kontraknya belum ditetapkan. Boleh NEGATIF: penagihan yang melampaui
      nilai kontrak adalah keadaan yang harus terbaca, bukan dijepit ke nol. */
  remainingContract: number | null;
  /**
   * Aset kontrak — pendapatan diakui MELAMPAUI yang ditagih (WIP belum
   * ditagih). `null` bila pendapatan diakui belum terukur.
   *
   * Dilaporkan BERPASANGAN dengan `contractLiab`, bukan sebagai satu angka
   * berlantai nol: panel lama hanya punya baris "WIP belum ditagih" dengan
   * `Math.max(0, …)`, sehingga perikatan yang menagih DI MUKA — keadaan
   * perikatan demo hari ini — menampilkan Rp 0 dan liabilitas kontraknya
   * hilang tanpa suara. Kosakatanya sama dengan skedul PSAK 72
   * (`asset`/`liab`) supaya kedua layar dapat dibandingkan tanpa penerjemahan.
   */
  contractAsset: number | null;
  /** Liabilitas kontrak — ditagih melampaui yang diakui. */
  contractLiab: number | null;
  /**
   * Faktur terbit belum lunas yang paling dekat jatuh tempo — atau `null`.
   *
   * Ini yang menggantikan kalimat "Termin ke-3 (fee × 0,3) jatuh tempo saat
   * fieldwork selesai (31 Mar)": termin ketiga itu tak ada di register mana
   * pun, dan tanggalnya tak pernah diturunkan dari data. Faktur yang
   * benar-benar terbit membawa tanggal jatuh temponya sendiri.
   */
  nextDue: TBInvoiceDue | null;
}

const angka = (v: number | undefined | null): number =>
  typeof v === 'number' && Number.isFinite(v) ? v : 0;

/**
 * Penagihan perikatan ini menurut register faktur.
 *
 * Aturan "apa yang dihitung tertagih" DIPINJAM dari skedul pendapatan
 * (`UNBILLED_STATUS`) alih-alih ditulis ulang: dua aturan status yang
 * menyimpang akan membuat dua layar melaporkan tertagih yang berbeda untuk
 * perikatan yang sama.
 */
export function tbBilling(
  register: readonly TBInvoice[],
  engId: string,
  fee: number | null,
  revRecognized: number | null,
): TBBilling {
  const milik = (register || []).filter((i) => i.eng === engId);
  const terbit = milik.filter((i) => i.status !== UNBILLED_STATUS);
  const billed = terbit.reduce((s, i) => s + angka(i.amount), 0);

  const belumLunas = terbit
    .filter((i) => angka(i.amount) - angka(i.paid) > 0 && !!i.due)
    .sort((a, b) => String(a.due).localeCompare(String(b.due)));
  const n = belumLunas[0];

  return {
    billed,
    issued: terbit.length,
    drafts: milik.length - terbit.length,
    remainingContract: fee == null ? null : fee - billed,
    contractAsset: revRecognized == null ? null : Math.max(0, revRecognized - billed),
    contractLiab: revRecognized == null ? null : Math.max(0, billed - revRecognized),
    nextDue: n
      ? { id: n.id, milestone: n.milestone || '', due: String(n.due),
          outstanding: angka(n.amount) - angka(n.paid) }
      : null,
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
  /** Status kertas kerja untuk kelengkapan terbukti per fase; boleh absen. */
  wpStatuses?: readonly ModuleWpStatus[] | null,
): TBModel | null {
  const ew = wipOf(timeEntries, e.id);
  if (!ew) return null;

  const roster = ew.roster;
  const anggota = new Set(roster.map((r) => r.name));
  /* Hanya jam anggota roster yang masuk `ew.actualHrs`; seri per fase mengikuti
     aturan yang sama supaya jumlah fase menutup ke total perikatan. */
  const live = (timeEntries || []).filter((t) => anggota.has(t.member));
  const liveTotal = live.reduce((s, t) => s + t.hours, 0);

  const budgetTotal = ew.budgetHrs;
  const actualTotal = ew.actualHrs;

  /* Aktual per fase = jam timesheet bertanggal, dikelompokkan lewat kanon
     (`phaseOf`) sehingga ejaan lama seperti 'Pelaporan' tetap mendarat di
     fasenya. Jam pembuka roster tak bertanggal & tak berfase — ia TIDAK
     disebar menurut bobot anggaran, melainkan dinyatakan sebagai `untaggedHrs`
     bersama entri berfase asing. */
  const { byPhase: liveByPhase, untagged: fasenTakDikenal } = phaseHoursOf(live);
  const openingTotal = actualTotal - liveTotal;
  const untaggedHrs = openingTotal + fasenTakDikenal;

  const anggaran = phaseBudgetHours(budgetTotal);
  /* Kelengkapan terbukti per fase — kanon `phaseRollups` (cockpit_progress).
     Tanpa status kertas kerja, `null`: tak terukur, bukan nol persen. */
  const terbukti: Partial<Record<PhaseId, number | null>> = {};
  if (wpStatuses && wpStatuses.length) {
    phaseRollups(wpStatuses as ModuleWpStatus[]).forEach((r) => { terbukti[r.phase] = r.provenPct; });
  }

  const phases: TBPhaseRow[] = PHASE_ORDER.map((id) => {
    const budget = anggaran[id];
    const actual = liveByPhase[id];
    const pp = terbukti[id];
    return {
      id, label: PHASE_LABEL[id], budget, actual,
      provenPct: typeof pp === 'number' ? pp : null,
      variance: budget - actual,
    };
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
  /* Nilai kontrak: SATU sumber (`contractValueOf`), nol proksi. `find` yang
     gagal menghasilkan `undefined` → null, sama seperti klien yang ada tapi tak
     ber-fee. Perhatikan fee 0 (pro bono) LOLOS sebagai 0 — itulah yang dulu
     ditelan operator `||`. */
  const fee = contractValueOf(clients.find((c) => c.id === e.clientId));
  /* SC-5 (PRD metode masukan): SATU ukuran kemajuan untuk pengakuan pendapatan.
     Sampai 2026-08-22 baris "Pendapatan diakui (% completion)" di layar ini
     memakai `fee × e.progress`, sementara modul Pendapatan Firma memakai
     rumusnya sendiri — dua angka "pendapatan diakui" untuk satu perikatan.
     Keduanya kini lewat kanon yang sama, berikut kedua pagarnya. */
  const recog = progressOf(
    { id: e.id, clientId: e.clientId || '', status: e.status },
    { actualHrs: actualTotal, budgetHrs: budgetTotal },
  );
  /* DUA lubang data yang berbeda menghasilkan null yang sama di sini:
     kemajuan belum terukur (#278) ATAU nilai kontrak belum ditetapkan (TB5).
     Layar menyebut yang mana — `recogPct` dan `feeGap` terpisah. */
  const revRecognized = recog.pct == null || fee == null ? null : Math.round(fee * recog.pct);
  return {
    roster, phases, weekly: tbWeekly(timeEntries),
    actualTotal, budgetTotal, remaining: budgetTotal - actualTotal, untaggedHrs,
    burn: budgetTotal ? actualTotal / budgetTotal : 0,
    stdValue, costActual, stdValueBudget, costBudget,
    eacHrs, etcHrs: Math.max(0, eacHrs - actualTotal),
    recogPct: recog.pct, revRecognized,
    fee, marginNow: revRecognized == null ? null : revRecognized - costActual,
    marginCompletion: fee == null ? null : fee - costBudget,
    realization: fee == null || !stdValueBudget ? null : fee / stdValueBudget,
    feeGap: fee == null ? 'contract-unknown' : null,
    blendedBill: actualTotal ? stdValue / actualTotal : 0,
    blendedCost: actualTotal ? costActual / actualTotal : 0,
  };
}
