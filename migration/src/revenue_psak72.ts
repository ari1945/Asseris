import { isCompletedEngagement } from './canon_smm_monitoring';

/* ============================================================
   Asseris — kanon skedul pengakuan pendapatan firma (PSAK 72).

   Logika murni di balik modul "Pendapatan & Penagihan" (`view_firmrevenue`):
   nilai kontrak per perikatan, ukuran kemajuan, pendapatan diakui, aset &
   liabilitas kontrak. Dipisah dari view supaya dapat diuji tanpa DOM — tabel
   yang menyatakan berapa pendapatan firma yang boleh diakui sebelumnya punya
   NOL uji.

   Yang dicabut di sini:

   · **Nilai kontrak tak boleh dikarang.** Rumus lama `c ? c.fee :
     e.materiality * 0.4` mengambil MATERIALITAS — sebuah pertimbangan audit —
     sebagai proksi harga kontrak ketika perikatan tak menemukan kliennya.
     Keduanya tak punya hubungan apa pun. Sebuah baris yang kehilangan kliennya
     sekarang berkata "belum ditetapkan" dan KELUAR dari total.

   · **Kemajuan tak boleh berupa angka yang diketik.**
     (PRD `docs/prd-revenue-input-method-psak72.md`, Opsi A — "Proceed."
     2026-08-22.) Sampai 2026-08-22 setiap baris dihitung `kontrak ×
     engagement.progress/100`; `progress` adalah kolom STATUS — persentase yang
     dilaporkan, tanpa dasar terdokumentasi, tanpa jejak. PSAK 72 ¶B14–B19
     hanya mengenal metode keluaran dan metode masukan; sebuah persentase yang
     diketik bukan salah satu pun. Kemajuan kini METODE MASUKAN: jam aktual
     terhadap jam anggaran, dari SSOT jam yang sama dengan WIP & profitabilitas
     (`hoursOfEngagements` di bawah — baca catatan LINGKUP-nya) — sehingga satu perikatan
     berhenti punya dua ukuran kemajuan yang tak pernah dipertemukan.

     DUA PAGAR, dan keduanya wajib:

       Pagar 1 — perikatan yang kewajiban pelaksanaannya TUNTAS diakui 100%
         tanpa memandang jam. Tanpa ini `ENG-2025-058` (Completed, jam berhenti
         di 96,4% anggaran) akan menahan 3,6% pendapatan atas perikatan yang
         opininya sudah terbit. Predikatnya dipinjam dari kanon yang sudah ada
         (`isCompletedEngagement`, SMM 1 ¶38) — satu definisi "selesai" untuk
         seluruh aplikasi, bukan daftar kedua yang lambat laun menyimpang.

       Pagar 2a — jam yang melewati anggaran TIDAK menambah pendapatan
         (dijepit 100%). Kelebihannya muncul sebagai margin yang turun, bukan
         pendapatan yang naik.

     Pagar 2b (PSAK 72 ¶B19 penuh — mengeluarkan jam yang tak berkontribusi)
     BELUM dikerjakan; ia butuh penautan ke write-down WIP. Lihat PRD Q4.

   · **Tak ada fallback ke `progress`.** Godaan `jam ?? progress` menghidupkan
     kembali persis cacat yang dicabut #277: proksi yang menyamar sebagai
     angka. Perikatan tanpa jam yang sah membawa lubang data yang TERBACA.
   ============================================================ */

const num = (v: number | undefined | null): number | null =>
  typeof v === 'number' && Number.isFinite(v) ? v : null;

/** Perikatan — subset yang dipakai skedul. Struktural: `EngagementRow` masuk.
    Perhatikan: `progress` SENGAJA tidak ada di sini. */
export interface RevEngagement {
  id: string;
  clientId: string;
  type?: string;
  /** Dibaca HANYA oleh Pagar 1, lewat `isCompletedEngagement`. */
  status?: string | null;
  partner?: string;
}

/** Klien — subset yang dipakai skedul. Struktural: `ClientRow` masuk. */
export interface RevClient {
  id: string;
  name: string;
  /** Fee kontrak. Opsional DI SINI karena data runtime (hidrasi API) boleh
      datang tanpa kolom ini; ketiadaannya adalah lubang data, bukan izin
      menaksir. */
  fee?: number | null;
}

/** Faktur — subset yang dipakai skedul. Struktural: `InvoiceRecord` masuk. */
export interface RevInvoice {
  eng?: string;
  status?: string;
  amount?: number;
}

/** Jam satu perikatan. Bentuk ini sengaja sama dengan hasil `engagementWip`. */
export interface RevHours {
  actualHrs?: number | null;
  budgetHrs?: number | null;
}

/**
 * Pembaca jam per perikatan.
 *
 * Pemanggil WAJIB menyerahkan pembaca yang menghormati lingkup: timesheet
 * live adalah state ber-scope perikatan AKTIF, jadi ia hanya boleh diterapkan
 * pada perikatan itu (`pmRosterOf`, profit_model.ts). Mesin ini tak dapat
 * memeriksanya — karena itu dinyatakan di sini dan diuji di pemanggil.
 */
export type RevHoursOf = (engId: string) => RevHours | null | undefined;

/**
 * Baris perikatan sebagaimana ia MENYIMPAN jamnya sendiri.
 * Struktural: `EngagementRow` masuk.
 */
export interface RevHoursSource {
  id: string;
  actualHrs?: number | null;
  budgetHrs?: number | null;
}

/**
 * Pembaca jam firma-luas yang AMAN-LINGKUP.
 *
 * `engagementWip(timeEntries, id)` adalah pintu yang benar untuk layar SATU
 * perikatan (Time & Budget, kokpit) karena ia menumpuk timesheet live di atas
 * jam pembuka roster. Untuk tabel LINTAS perikatan ia salah: timesheet live
 * adalah state ber-scope perikatan AKTIF, sehingga perikatan lain akan dinilai
 * dari jam pembuka saja — angka pendapatan firma berubah hanya karena pengguna
 * membuka perikatan yang berbeda. Cacat sekeluarga itu sudah pernah terjadi
 * (#269, dicabut #274).
 *
 * Bentuk yang dipakai `profit_model` dan dipakai ulang di sini:
 *
 *     jam(perikatan) = e.actualHrs + extraHours[e.id]
 *
 * `e.actualHrs` sudah memuat timesheet seed miliknya sendiri, dan `extraHours`
 * (`pmExtraHours`) hanya mengkreditkan jam yang MELEBIHI baseline seed, itu pun
 * hanya kepada perikatan aktif. Identik dengan `engagementWip` untuk perikatan
 * aktif — invarian `Σbase + timesheet === actualHrs` (roster_profile.ts) —
 * tetapi benar juga untuk enam perikatan lainnya.
 */
export function hoursOfEngagements(
  engagements: readonly RevHoursSource[] | null | undefined,
  extraHours?: Readonly<Record<string, number>> | null,
): RevHoursOf {
  const byId = new Map((engagements || []).map((e) => [e.id, e]));
  return (engId) => {
    const e = byId.get(engId);
    if (!e) return null;
    const base = num(e.actualHrs);
    return {
      actualHrs: base == null ? null : base + ((extraHours || {})[engId] || 0),
      budgetHrs: num(e.budgetHrs),
    };
  };
}

/** Lubang data yang dikenal skedul ini. */
export type RevenueGap = 'contract-unknown' | 'progress-unknown';

export interface RevenueProgress {
  /** Fraksi kemajuan 0..1; `null` = belum terukur (lubang data). */
  pct: number | null;
  /** `true` bila Pagar 1 yang menetapkannya: kewajiban pelaksanaan tuntas. */
  completed: boolean;
  /** `true` bila Pagar 2a menjepit: jam melewati anggaran. */
  capped: boolean;
  actualHrs: number | null;
  budgetHrs: number | null;
}

export interface RevenueRow {
  id: string;
  clientId: string;
  /** Nama klien, atau '—' bila perikatan tak menemukan kliennya. */
  client: string;
  /** Nilai kontrak (Rp). `null` = belum ditetapkan. */
  contract: number | null;
  /** Fraksi kemajuan terukur (0..1). `null` = belum terukur. */
  pct: number | null;
  completed: boolean;
  capped: boolean;
  actualHrs: number | null;
  budgetHrs: number | null;
  /** Pendapatan diakui (Rp). `null` bila kontrak atau kemajuan tak diketahui. */
  recognized: number | null;
  /** Tertagih dari register faktur (Rp) — fakta, bukan turunan. */
  billed: number;
  asset: number | null;
  liab: number | null;
  /** Dasar pengukuran yang BENAR-BENAR dipakai baris ini. */
  measure: string;
  /**
   * `true` bila klasifikasi PSAK 72 baris ini belum ditetapkan: jenis
   * perikatannya bukan audit laporan keuangan, sehingga kewajiban
   * pelaksanaannya mungkin diselesaikan pada SATU titik waktu — dan ukuran
   * kemajuan apa pun bukan ukuran yang tepat untuknya. PRD Q3.
   */
  classificationOpen: boolean;
  partner: string;
  /** Lubang data baris ini; kosong = baris ikut seluruh total. */
  gaps: RevenueGap[];
}

export interface RevenueSchedule {
  rows: RevenueRow[];
  /** Baris yang KELUAR dari total karena lubang data. */
  gapRows: RevenueRow[];
  totContract: number;
  totRecognized: number;
  /** Σ tertagih SELURUH baris — angka register, tak bergantung lubang data. */
  totBilled: number;
  totAsset: number;
  totLiab: number;
  backlog: number;
}

export interface RevenueScheduleInput {
  engagements: RevEngagement[];
  clients: RevClient[];
  invoices: RevInvoice[];
  hoursOf: RevHoursOf;
}

/**
 * Faktur yang belum terbit tidak menagih apa pun.
 *
 * DIEKSPOR supaya "apa yang dihitung tertagih" punya SATU definisi: panel
 * "Penagihan & WIP" di Time & Budget (`tbBilling`) membaca register faktur yang
 * sama, dan dua aturan status yang menyimpang akan membuat dua layar melaporkan
 * tertagih yang berbeda untuk perikatan yang sama.
 */
export const UNBILLED_STATUS = 'Draft';

/** Pengukuran baris yang kemajuannya diukur dari masukan. */
export const MEASURE_INPUT_HOURS = 'Over-time · masukan (jam/anggaran)';
/** Pengukuran baris yang ditetapkan Pagar 1. */
export const MEASURE_COMPLETED = 'Over-time · kewajiban tuntas (100%)';

/**
 * Bentuk MINIMUM yang dibaca `contractValueOf`: apa pun yang mengaku membawa
 * harga kontrak. `RevClient` (skedul pendapatan) dan `TBClient`
 * (`timebudget_model.ts`) keduanya masuk secara struktural — sengaja, supaya
 * kedua modul menurunkan nilai kontrak dari SATU fungsi alih-alih masing-masing
 * menumbuhkan fallback sendiri.
 */
export interface RevPriced { fee?: number | null }

/**
 * Nilai kontrak sebuah perikatan.
 *
 * Satu-satunya sumbernya adalah fee klien. Tidak ada proksi, tidak ada
 * taksiran, tidak ada "yang terdekat": bila fee tak dinyatakan sebagai angka
 * berhingga non-negatif, jawabannya `null` dan pemanggil WAJIB memperlakukan
 * barisnya sebagai lubang data.
 */
export function contractValueOf(client: RevPriced | null | undefined): number | null {
  if (!client) return null;
  const fee = client.fee;
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0) return null;
  return fee;
}

/**
 * Kemajuan satu perikatan — metode masukan berpagar (PSAK 72 ¶B18).
 *
 * Urutannya mengikat: Pagar 1 diperiksa LEBIH DULU, sehingga perikatan yang
 * tuntas tak pernah bergantung pada kelengkapan jamnya. Sebuah perikatan yang
 * sudah diarsipkan tetapi rosternya hilang tetap diakui 100% — dan itu benar:
 * yang menentukan adalah kewajiban pelaksanaannya, bukan pembukuan jamnya.
 */
export function progressOf(
  engagement: RevEngagement,
  hours: RevHours | null | undefined,
): RevenueProgress {
  const actualHrs = num(hours && hours.actualHrs);
  const budgetHrs = num(hours && hours.budgetHrs);

  if (isCompletedEngagement(engagement)) {
    return { pct: 1, completed: true, capped: false, actualHrs, budgetHrs };
  }
  if (actualHrs == null || budgetHrs == null || budgetHrs <= 0 || actualHrs < 0) {
    return { pct: null, completed: false, capped: false, actualHrs, budgetHrs };
  }
  const raw = actualHrs / budgetHrs;
  return { pct: Math.min(1, raw), completed: false, capped: raw > 1, actualHrs, budgetHrs };
}

/**
 * Klasifikasi PSAK 72 baris ini BELUM ditetapkan?
 *
 * Kolom lama memasang 'Point-in-time' untuk perikatan non-audit lalu tetap
 * mengakui `kontrak × pct` untuk baris itu juga — label dan aritmetikanya
 * saling membantah. Di sini ketidaktahuan dinyatakan sebagai ketidaktahuan.
 */
function classificationOpenFor(type: string | undefined): boolean {
  return !(type || '').includes('Audit');
}

/**
 * Skedul pengakuan pendapatan per perikatan.
 *
 * `billed` selalu ikut total (ia fakta register faktur); `contract`,
 * `recognized`, `asset`, `liab` hanya ikut untuk baris TANPA lubang data.
 * Konsekuensinya disengaja: `totAsset − totLiab` boleh berbeda dari
 * `totRecognized − totBilled` ketika ada lubang, dan perbedaannya TERBACA
 * lewat `gapRows` alih-alih tersembunyi di balik angka karangan.
 */
export function recognitionSchedule(input: RevenueScheduleInput): RevenueSchedule {
  const { engagements, clients, invoices, hoursOf } = input;

  const rows: RevenueRow[] = (engagements || []).map((e) => {
    const c = (clients || []).find((x) => x.id === e.clientId) || null;
    const contract = contractValueOf(c);
    const p = progressOf(e, hoursOf ? hoursOf(e.id) : null);
    const recognized = contract == null || p.pct == null ? null : Math.round(contract * p.pct);
    const billed = (invoices || [])
      .filter((i) => i.eng === e.id && i.status !== UNBILLED_STATUS)
      .reduce((s, i) => s + (num(i.amount) || 0), 0);
    const gaps: RevenueGap[] = [];
    if (contract == null) gaps.push('contract-unknown');
    if (p.pct == null) gaps.push('progress-unknown');
    return {
      id: e.id,
      clientId: e.clientId,
      client: c ? c.name : '—',
      contract,
      pct: p.pct,
      completed: p.completed,
      capped: p.capped,
      actualHrs: p.actualHrs,
      budgetHrs: p.budgetHrs,
      recognized,
      billed,
      asset: recognized == null ? null : Math.max(0, recognized - billed),
      liab: recognized == null ? null : Math.max(0, billed - recognized),
      measure: p.completed ? MEASURE_COMPLETED : MEASURE_INPUT_HOURS,
      classificationOpen: classificationOpenFor(e.type),
      partner: (e.partner || '').split(',')[0],
      gaps,
    };
  });

  const measured = rows.filter((r) => r.gaps.length === 0);
  const sum = (pick: (r: RevenueRow) => number | null): number =>
    measured.reduce((s, r) => s + (pick(r) || 0), 0);

  const totContract = sum((r) => r.contract);
  const totRecognized = sum((r) => r.recognized);
  return {
    rows,
    gapRows: rows.filter((r) => r.gaps.length > 0),
    totContract,
    totRecognized,
    totBilled: rows.reduce((s, r) => s + r.billed, 0),
    totAsset: sum((r) => r.asset),
    totLiab: sum((r) => r.liab),
    backlog: totContract - totRecognized,
  };
}
