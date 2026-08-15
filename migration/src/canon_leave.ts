/* ============================================================
   Asseris — Cuti & Kehadiran: MESIN MURNI (PRD sdm-kepatuhan PR-1)
   ------------------------------------------------------------
   Sebelum berkas ini, `LEAVE_BALANCE.used` adalah LITERAL dan
   `LEAVE_REQUESTS` adalah daftar terpisah yang tak pernah
   menyentuhnya. Menyetujui satu permintaan cuti mengubah status
   barisnya dan TIDAK mengubah saldo siapa pun — sementara kolom
   "Sisa", bilah "Pemanfaatan", KPI "Pemanfaatan Kuota", dan
   peringatan `sisa ≤ 2` semuanya dihitung dari angka yang tak
   pernah disentuh persetujuan apa pun.

   `days` pada permintaan juga literal: tak ada yang mencegah baris
   menyatakan 2 hari atas rentang 10 hari.

   Di sini SEMUANYA diturunkan:

     hari kerja  ← rentang tanggal − akhir pekan − hari libur
     terpakai    ← Σ hari kerja permintaan DISETUJUI yang memotong kuota
     hak cuti    ← tahun bergabung (UU 13/2003 Ps. 79 ayat (1) huruf c)
     kuota       ← hak cuti + saldo bawaan yang masih berlaku

   Register peristiwa (`LEAVE_REQUESTS`) adalah SSOT. Yang tersisa
   sebagai data adalah saldo bawaan tahun lalu (`carry`) — satu-satunya
   fakta yang memang tak dapat diturunkan dari peristiwa tahun berjalan.

   Fungsi MURNI: tanpa React, tanpa state, tanpa klok tersembunyi —
   `asOf` selalu argumen.
   ============================================================ */

const DAY_MS = 86_400_000;
/* Batas iterasi rentang (≈3 tahun) — jaring pengaman terhadap data rusak. */
const MAX_SPAN_DAYS = 1100;

/* ------------------------------------------------------------------
   1. Kalender hari libur
   ------------------------------------------------------------------ */

export interface HolidayEntry {
  /** 'YYYY-MM-DD' */
  date: string;
  name: string;
  kind: 'nasional' | 'cuti-bersama';
  /** `tetap`  = tanggalnya ditetapkan dan tidak bergeser antar tahun.
   *  `hisab`  = mengikuti kalender Hijriah/Imlek/Saka atau perhitungan gerejawi;
   *             tanggal FINAL ditetapkan SKB 3 Menteri setiap tahun. */
  penetapan: 'tetap' | 'hisab';
}

export interface HolidayCalendar {
  entries: HolidayEntry[];
  basis: string;
  /** Tahun terakhir yang isinya SUDAH dicocokkan dengan SKB 3 Menteri.
   *  Tahun di atas ini boleh dipakai, tetapi harus dilabeli belum terkonfirmasi. */
  confirmedThroughYear: number;
}

export interface HolidayCoverage {
  year: number;
  entries: number;
  /** Ada entri untuk tahun ini. Bila false, hari kerja hanya mengecualikan akhir pekan. */
  usable: boolean;
  /** Isinya sudah dicocokkan dengan SKB tahun itu. */
  confirmed: boolean;
  note: string;
}

/** Apakah kalender dapat dipertanggungjawabkan untuk tahun tertentu.
 *
 *  Ini bukan hiasan: kalender yang kosong membuat setiap perhitungan hari kerja
 *  melebih-hitung, dan tanpa penanda ini kelebihannya tak terlihat oleh siapa pun. */
export function holidayCoverage(cal: HolidayCalendar | undefined, year: number): HolidayCoverage {
  const entries = (cal?.entries || []).filter((h) => h.date.startsWith(String(year) + '-'));
  const usable = entries.length > 0;
  const confirmed = usable && year <= (cal?.confirmedThroughYear ?? 0);
  let note = '';
  if (!usable) {
    note = `Kalender hari libur ${year} belum diisi — hari kerja dihitung hanya dengan mengecualikan akhir pekan, sehingga cenderung LEBIH BANYAK dari yang sebenarnya.`;
  } else if (!confirmed) {
    note = `Kalender ${year} belum dicocokkan dengan SKB 3 Menteri; tanggal libur berbasis hisab dapat bergeser.`;
  }
  return { year, entries: entries.length, usable, confirmed, note };
}

/* ------------------------------------------------------------------
   2. Hari kerja
   ------------------------------------------------------------------ */

export interface WorkingDaySpan {
  calendarDays: number;
  weekendDays: number;
  /** Hari libur yang JATUH PADA HARI KERJA (libur di akhir pekan tidak dihitung dua kali). */
  holidayDays: number;
  workingDays: number;
  valid: boolean;
  reason: string;
}

const INVALID_SPAN: WorkingDaySpan = {
  calendarDays: 0, weekendDays: 0, holidayDays: 0, workingDays: 0,
  valid: false, reason: '',
};

/** 'YYYY-MM-DD' → epoch UTC, atau null bila bukan tanggal kalender yang nyata. */
function utcOf(iso: string | undefined): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
  const t = Date.UTC(y, mo - 1, d);
  const back = new Date(t);
  /* menolak 2026-02-30 & kawan-kawannya, yang Date.UTC diam-diam geser. */
  if (back.getUTCFullYear() !== y || back.getUTCMonth() !== mo - 1 || back.getUTCDate() !== d) return null;
  return t;
}

function isoOf(t: number): string {
  return new Date(t).toISOString().slice(0, 10);
}

/** Hari kerja dalam rentang INKLUSIF `from`..`to`, mengecualikan Sabtu/Minggu & hari libur. */
export function workingDaySpan(from: string, to: string, cal?: HolidayCalendar): WorkingDaySpan {
  const a = utcOf(from), b = utcOf(to);
  if (a === null || b === null) return { ...INVALID_SPAN, reason: 'Tanggal mulai/selesai tidak valid.' };
  if (b < a) return { ...INVALID_SPAN, reason: 'Tanggal selesai mendahului tanggal mulai.' };
  const calendarDays = Math.round((b - a) / DAY_MS) + 1;
  if (calendarDays > MAX_SPAN_DAYS) {
    return { ...INVALID_SPAN, calendarDays, reason: `Rentang ${calendarDays} hari melampaui batas wajar ${MAX_SPAN_DAYS} hari.` };
  }
  const holidays = new Set((cal?.entries || []).map((h) => h.date));
  let weekendDays = 0, holidayDays = 0, workingDays = 0;
  for (let t = a; t <= b; t += DAY_MS) {
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) { weekendDays++; continue; }
    if (holidays.has(isoOf(t))) { holidayDays++; continue; }
    workingDays++;
  }
  return { calendarDays, weekendDays, holidayDays, workingDays, valid: true, reason: '' };
}

/* ------------------------------------------------------------------
   3. Jenis cuti — mana yang memotong kuota tahunan
   ------------------------------------------------------------------ */

export interface LeaveTypeMeta {
  key: string;
  /** Memotong kuota cuti tahunan. Sakit & cuti penting TIDAK. */
  consumesAnnual: boolean;
  basis: string;
  /** Batas hari per kejadian bila diatur undang-undang. */
  maxDaysPerEvent?: number;
}

/* Sebelum ini seluruh jenis diperlakukan sebagai satu ember. Sakit (Ps. 93 ayat (2)
   huruf a) dan cuti penting (Ps. 93 ayat (4)) adalah hak TERPISAH yang tidak
   mengurangi cuti tahunan; menggabungkannya memotong hak pekerja dua kali. */
export const LEAVE_TYPES: LeaveTypeMeta[] = [
  { key: 'Cuti Tahunan',    consumesAnnual: true,  basis: 'UU 13/2003 Ps. 79 ayat (1) huruf c' },
  { key: 'Izin',            consumesAnnual: true,  basis: 'Kebijakan firma — diperhitungkan sebagai cuti tahunan' },
  { key: 'Sakit',           consumesAnnual: false, basis: 'UU 13/2003 Ps. 93 ayat (2) huruf a — upah tetap dibayar' },
  { key: 'Cuti Menikah',    consumesAnnual: false, basis: 'UU 13/2003 Ps. 93 ayat (4) huruf a', maxDaysPerEvent: 3 },
  { key: 'Cuti Melahirkan', consumesAnnual: false, basis: 'UU 13/2003 Ps. 82 — 1,5 bulan sebelum + 1,5 bulan sesudah' },
  { key: 'Cuti Duka',       consumesAnnual: false, basis: 'UU 13/2003 Ps. 93 ayat (4) huruf f/g', maxDaysPerEvent: 2 },
];

/* Jenis tak terdaftar diperlakukan MEMOTONG kuota — konservatif terhadap kuota,
   dan ia menandai dirinya sendiri alih-alih lolos tanpa jejak. */
export const LEAVE_TYPE_UNKNOWN: LeaveTypeMeta = {
  key: '(tak terdaftar)',
  consumesAnnual: true,
  basis: 'Jenis cuti tidak terdaftar — diperlakukan memotong kuota tahunan sampai dibakukan',
};

export function leaveTypeOf(key: string | undefined): LeaveTypeMeta {
  return LEAVE_TYPES.find((t) => t.key === key) || { ...LEAVE_TYPE_UNKNOWN, key: key || LEAVE_TYPE_UNKNOWN.key };
}

/* ------------------------------------------------------------------
   4. Kebijakan & hak cuti
   ------------------------------------------------------------------ */

export interface LeavePolicy {
  annualDays: number;
  /** Masa kerja berturut sebelum hak cuti tahunan timbul. */
  eligibilityMonths: number;
  /** Batas hari yang boleh dibawa dari tahun sebelumnya. */
  carryForwardCap: number;
  /** Bulan (1–12) saat saldo bawaan HANGUS bila belum dipakai. */
  carryExpiryMonth: number;
  basis: string;
}

export const LEAVE_POLICY: LeavePolicy = {
  annualDays: 12,
  eligibilityMonths: 12,
  carryForwardCap: 6,
  carryExpiryMonth: 6,
  basis: 'UU 13/2003 Ps. 79 ayat (1) huruf c (min. 12 hari kerja setelah 12 bulan berturut); batas & masa berlaku saldo bawaan = kebijakan firma',
};

/** Presisi data masa kerja yang tersedia. */
export type TenurePrecision = 'tanggal' | 'tahun' | 'tidak-tercatat';

export interface Entitlement {
  days: number;
  eligible: boolean;
  precision: TenurePrecision;
  /** Jawaban bergantung pada tanggal yang tidak diketahui — jangan diklaim pasti. */
  assumed: boolean;
  note: string;
}

/** Hak cuti tahunan dari data masa kerja yang ADA.
 *
 *  `joined` di roster berupa TAHUN (mis. 2020). Tahun tidak dapat menjawab
 *  "sudah 12 bulan berturut?" untuk orang yang bergabung tahun lalu. Alih-alih
 *  memalsukan presisi, fungsi ini menandai jawabannya sebagai diasumsikan. */
export function entitlementOf(
  joined: number | string | undefined | null,
  asOf: string,
  policy: LeavePolicy = LEAVE_POLICY,
): Entitlement {
  const asOfT = utcOf(asOf);
  if (asOfT === null) {
    return { days: 0, eligible: false, precision: 'tidak-tercatat', assumed: false, note: 'Tanggal acuan tidak valid.' };
  }
  const asOfD = new Date(asOfT);
  const asOfYear = asOfD.getUTCFullYear();

  /* (a) tanggal penuh → dapat dijawab pasti. */
  if (typeof joined === 'string') {
    const jt = utcOf(joined);
    if (jt !== null) {
      const j = new Date(jt);
      const months = (asOfYear - j.getUTCFullYear()) * 12 + (asOfD.getUTCMonth() - j.getUTCMonth())
        - (asOfD.getUTCDate() < j.getUTCDate() ? 1 : 0);
      const eligible = months >= policy.eligibilityMonths;
      return {
        days: eligible ? policy.annualDays : 0,
        eligible, precision: 'tanggal', assumed: false,
        note: eligible ? '' : `Masa kerja ${Math.max(0, months)} bulan — hak cuti tahunan timbul setelah ${policy.eligibilityMonths} bulan berturut.`,
      };
    }
  }

  /* (b) tahun saja → tiga wilayah, salah satunya tak dapat dipastikan. */
  if (typeof joined === 'number' && Number.isFinite(joined)) {
    const y = Math.trunc(joined);
    if (y >= asOfYear) {
      return {
        days: 0, eligible: false, precision: 'tahun', assumed: false,
        note: `Bergabung ${y} — belum genap ${policy.eligibilityMonths} bulan pada ${asOf}.`,
      };
    }
    if (y === asOfYear - 1) {
      return {
        days: policy.annualDays, eligible: true, precision: 'tahun', assumed: true,
        note: `Tanggal bergabung hanya diketahui tahunnya (${y}); kelayakan ${policy.eligibilityMonths} bulan DIASUMSIKAN terpenuhi. Lengkapi tanggal bergabung untuk kepastian.`,
      };
    }
    return { days: policy.annualDays, eligible: true, precision: 'tahun', assumed: false, note: '' };
  }

  return {
    days: 0, eligible: false, precision: 'tidak-tercatat', assumed: false,
    note: 'Tanggal bergabung tidak tercatat — hak cuti tahunan tak dapat ditentukan.',
  };
}

/* ------------------------------------------------------------------
   5. Buku besar cuti per pegawai
   ------------------------------------------------------------------ */

export interface LeaveRequestInput {
  id: string;
  /** Opsional: baris terpersist/dari server bisa tak lengkap. Baris tanpa `emp`
   *  tidak pernah cocok dengan pegawai mana pun, jadi ia tak masuk buku besar. */
  emp?: string;
  type: string;
  from: string;
  to: string;
  /** Angka yang DINYATAKAN baris. Dipertahankan hanya untuk dibandingkan. */
  days?: number;
  status: string;
  reason?: string;
  approver?: string;
  name?: string;
  /** Jejak keputusan — siapa yang menyetujui/menolak, dan kapan. */
  decidedBy?: string;
  decidedAt?: string;
}

export type LeaveFlag =
  | 'tanggal-tidak-valid'
  | 'hari-tidak-cocok'
  | 'melebihi-batas-jenis'
  | 'kuota-terlampaui';

export const LEAVE_FLAG_LABEL: Record<LeaveFlag, string> = {
  'tanggal-tidak-valid': 'Tanggal permintaan tidak valid',
  'hari-tidak-cocok': 'Jumlah hari yang dinyatakan tidak sama dengan hari kerja dalam rentangnya',
  'melebihi-batas-jenis': 'Melebihi batas hari per kejadian untuk jenis cuti ini',
  'kuota-terlampaui': 'Kuota cuti tahunan terlampaui',
};

export interface LeaveRow {
  id: string;
  emp: string;
  type: string;
  from: string;
  to: string;
  status: string;
  approver?: string;
  /** Yang dinyatakan baris (null bila tak dinyatakan). */
  declaredDays: number | null;
  /** Yang DAPAT DIHITUNG dari rentangnya — inilah yang dipakai buku besar. */
  days: number;
  span: WorkingDaySpan;
  meta: LeaveTypeMeta;
  consumesAnnual: boolean;
  flags: LeaveFlag[];
}

export interface LeaveLedger {
  emp: string;
  year: number;
  entitlement: Entitlement;
  carryIn: number;
  /** Bawaan yang masih boleh dipakai (setelah cap & masa berlaku). */
  carryUsable: number;
  carryForfeited: number;
  /** Tanggal hangusnya saldo bawaan ('YYYY-MM-DD'). */
  carryExpiresOn: string;
  carryExpired: boolean;
  quota: number;
  /** Hari kerja cuti pemotong-kuota yang DISETUJUI pada tahun ini. */
  used: number;
  /** Hari kerja cuti pemotong-kuota yang masih menunggu persetujuan. */
  pending: number;
  remaining: number;
  /** Sisa bila seluruh yang menunggu disetujui — dapat negatif. */
  projected: number;
  /** Cuti disetujui yang TIDAK memotong kuota (sakit, cuti penting). */
  nonQuotaDays: number;
  overdrawn: boolean;
  rows: LeaveRow[];
  flags: LeaveFlag[];
}

const APPROVED = 'Disetujui';
const PENDING = 'Menunggu';

/** Evaluasi satu permintaan menjadi baris ber-hari-kerja-terhitung.
 *  Diekspor agar UI dapat menampilkan baris DI LUAR tahun buku besar berjalan
 *  dengan aturan yang sama persis — bukan dengan salinan logika kedua. */
export function evaluateLeaveRow(r: LeaveRequestInput, cal?: HolidayCalendar): LeaveRow {
  const meta = leaveTypeOf(r.type);
  const span = workingDaySpan(r.from, r.to, cal);
  const declaredDays = typeof r.days === 'number' && Number.isFinite(r.days) ? r.days : null;
  const flags: LeaveFlag[] = [];
  if (!span.valid) flags.push('tanggal-tidak-valid');
  else if (declaredDays !== null && declaredDays !== span.workingDays) flags.push('hari-tidak-cocok');
  if (span.valid && meta.maxDaysPerEvent != null && span.workingDays > meta.maxDaysPerEvent) {
    flags.push('melebihi-batas-jenis');
  }
  return {
    id: r.id, emp: r.emp || '', type: r.type, from: r.from, to: r.to, status: r.status,
    approver: r.approver,
    declaredDays,
    days: span.workingDays,
    span, meta, consumesAnnual: meta.consumesAnnual, flags,
  };
}

/** Saldo bawaan yang masih boleh dipakai pada `asOf`. */
function carryUsableOn(carryIn: number, asOf: string, policy: LeavePolicy): { usable: number; forfeited: number; expiresOn: string; expired: boolean } {
  const asOfT = utcOf(asOf);
  const year = asOfT === null ? new Date().getUTCFullYear() : new Date(asOfT).getUTCFullYear();
  const month = policy.carryExpiryMonth;
  /* hari terakhir bulan kedaluwarsa */
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const expiresOn = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const expT = utcOf(expiresOn);
  const expired = asOfT !== null && expT !== null && asOfT > expT;
  const capped = Math.min(Math.max(0, carryIn), policy.carryForwardCap);
  const usable = expired ? 0 : capped;
  return { usable, forfeited: Math.max(0, carryIn) - usable, expiresOn, expired };
}

/** Buku besar cuti satu pegawai. `requests` boleh berisi baris pegawai lain — ia disaring. */
export function leaveLedgerOf(
  emp: string,
  joined: number | string | undefined | null,
  requests: LeaveRequestInput[] | undefined,
  carryIn: number,
  asOf: string,
  cal?: HolidayCalendar,
  policy: LeavePolicy = LEAVE_POLICY,
): LeaveLedger {
  const asOfT = utcOf(asOf);
  const year = asOfT === null ? new Date().getUTCFullYear() : new Date(asOfT).getUTCFullYear();
  const entitlement = entitlementOf(joined, asOf, policy);
  const carry = carryUsableOn(carryIn, asOf, policy);

  const rows = (requests || [])
    .filter((r) => r && r.emp === emp && String(r.from || '').startsWith(String(year) + '-'))
    .map((r) => evaluateLeaveRow(r, cal))
    .sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0));

  let used = 0, pending = 0, nonQuotaDays = 0;
  for (const row of rows) {
    if (!row.span.valid) continue;
    if (row.consumesAnnual) {
      if (row.status === APPROVED) used += row.days;
      else if (row.status === PENDING) pending += row.days;
    } else if (row.status === APPROVED) {
      nonQuotaDays += row.days;
    }
  }

  const quota = entitlement.days + carry.usable;
  const remaining = quota - used;
  const projected = remaining - pending;
  const flags = Array.from(new Set(rows.flatMap((r) => r.flags)));
  if (remaining < 0) flags.push('kuota-terlampaui');

  return {
    emp, year, entitlement,
    carryIn, carryUsable: carry.usable, carryForfeited: carry.forfeited,
    carryExpiresOn: carry.expiresOn, carryExpired: carry.expired,
    quota, used, pending, remaining, projected, nonQuotaDays,
    overdrawn: remaining < 0,
    rows, flags,
  };
}

export interface LeaveRosterMember { id: string; joined?: number | string }

/** Buku besar seluruh roster, berkunci empId. */
export function leaveLedger(
  roster: LeaveRosterMember[] | undefined,
  requests: LeaveRequestInput[] | undefined,
  carryIn: Record<string, { carry?: number } | undefined> | undefined,
  asOf: string,
  cal?: HolidayCalendar,
  policy: LeavePolicy = LEAVE_POLICY,
): Record<string, LeaveLedger> {
  const out: Record<string, LeaveLedger> = {};
  for (const m of roster || []) {
    if (!m || !m.id) continue;
    out[m.id] = leaveLedgerOf(m.id, m.joined, requests, (carryIn || {})[m.id]?.carry || 0, asOf, cal, policy);
  }
  return out;
}

/* ------------------------------------------------------------------
   6. Gerbang persetujuan
   ------------------------------------------------------------------ */

export interface ApprovalCheck {
  ok: boolean;
  reason: string;
  /** Sisa kuota SETELAH permintaan ini disetujui. */
  wouldRemain: number;
}

/** Bolehkah permintaan ini disetujui?
 *
 *  Ini gerbang yang sesungguhnya, bukan hiasan: sebelum PR ini persetujuan tidak
 *  menyentuh saldo apa pun, sehingga tidak ada keadaan yang membuatnya menolak.
 *  `approverEmp` opsional — bila diisi, persetujuan-diri sendiri ditolak. */
export function approvalCheck(
  ledger: LeaveLedger,
  rowId: string,
  approverEmp?: string | null,
): ApprovalCheck {
  const row = ledger.rows.find((r) => r.id === rowId);
  if (!row) return { ok: false, reason: 'Permintaan tidak ditemukan pada tahun cuti berjalan.', wouldRemain: ledger.remaining };
  if (!row.span.valid) {
    return { ok: false, reason: row.span.reason || LEAVE_FLAG_LABEL['tanggal-tidak-valid'], wouldRemain: ledger.remaining };
  }
  if (approverEmp && approverEmp === row.emp) {
    return { ok: false, reason: 'Permintaan cuti tidak dapat disetujui oleh pemohonnya sendiri.', wouldRemain: ledger.remaining };
  }
  if (row.meta.maxDaysPerEvent != null && row.days > row.meta.maxDaysPerEvent) {
    return {
      ok: false,
      reason: `${row.type} dibatasi ${row.meta.maxDaysPerEvent} hari per kejadian (${row.meta.basis}); permintaan ini ${row.days} hari kerja.`,
      wouldRemain: ledger.remaining,
    };
  }
  if (!row.consumesAnnual) return { ok: true, reason: '', wouldRemain: ledger.remaining };

  if (!ledger.entitlement.eligible) {
    return { ok: false, reason: ledger.entitlement.note || 'Hak cuti tahunan belum timbul.', wouldRemain: ledger.remaining };
  }
  const wouldRemain = ledger.remaining - row.days;
  if (wouldRemain < 0) {
    return {
      ok: false,
      reason: `Kuota tidak cukup: sisa ${ledger.remaining} hari, permintaan ${row.days} hari kerja (kurang ${Math.abs(wouldRemain)} hari).`,
      wouldRemain,
    };
  }
  return { ok: true, reason: '', wouldRemain };
}

/* ------------------------------------------------------------------
   7. Agregat firma
   ------------------------------------------------------------------ */

export interface LeaveFirmSummary {
  people: number;
  quota: number;
  used: number;
  pending: number;
  remaining: number;
  /** Pemanfaatan kuota (%) — 0 bila tak ada kuota sama sekali (hindari NaN). */
  utilisationPct: number;
  overdrawn: string[];
  flagged: string[];
}

export function leaveFirmSummary(ledgers: Record<string, LeaveLedger>): LeaveFirmSummary {
  const all = Object.values(ledgers || {});
  const quota = all.reduce((a, l) => a + l.quota, 0);
  const used = all.reduce((a, l) => a + l.used, 0);
  const pending = all.reduce((a, l) => a + l.pending, 0);
  return {
    people: all.length,
    quota, used, pending,
    remaining: quota - used,
    /* Pembagian nol dulu menghasilkan NaN% yang dirender apa adanya. */
    utilisationPct: quota > 0 ? Math.round((used / quota) * 100) : 0,
    overdrawn: all.filter((l) => l.overdrawn).map((l) => l.emp),
    flagged: all.filter((l) => l.flags.length > 0).map((l) => l.emp),
  };
}

/** Siapa yang sedang cuti pada tanggal tertentu (status disetujui). */
export function onLeaveOn(requests: LeaveRequestInput[] | undefined, iso: string): LeaveRequestInput[] {
  const t = utcOf(iso);
  if (t === null) return [];
  return (requests || []).filter((r) => {
    if (!r || r.status !== APPROVED) return false;
    const a = utcOf(r.from), b = utcOf(r.to);
    return a !== null && b !== null && a <= t && t <= b;
  });
}

/** Apakah `emp` sedang cuti (disetujui ATAU diajukan) pada tanggal itu — untuk strip kalender. */
export function leaveStateOn(
  requests: LeaveRequestInput[] | undefined,
  emp: string,
  iso: string,
): { state: 'none' | 'pending' | 'approved'; type: string } {
  const t = utcOf(iso);
  if (t === null) return { state: 'none', type: '' };
  let out: { state: 'none' | 'pending' | 'approved'; type: string } = { state: 'none', type: '' };
  for (const r of requests || []) {
    if (!r || r.emp !== emp) continue;
    if (r.status !== APPROVED && r.status !== PENDING) continue;
    const a = utcOf(r.from), b = utcOf(r.to);
    if (a === null || b === null || t < a || t > b) continue;
    if (r.status === APPROVED) return { state: 'approved', type: r.type };
    out = { state: 'pending', type: r.type };
  }
  return out;
}
