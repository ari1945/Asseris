/* ============================================================
   Asseris — Human Capital: MESIN MURNI (PRD sdm-kepatuhan PR-4)
   ------------------------------------------------------------
   Firma ini punya TIGA jumlah karyawan, dan dua di antaranya literal:

     AMS.FIRM                 6 + 11 + 58                    = 75
     HCM_ANALYTICS.gradeMix   6 + 11 + 22 + 30               = 69
     AMS.STAFF                roster yang benar-benar ada

   Dua literal itu bahkan tak sepakat satu sama lain (75 vs 69), dan
   `headcountTrend` menutup di 69 tanpa pernah dihitung dari satu peristiwa
   perekrutan atau pengunduran diri mana pun.

   Lebih jauh: `annualAttrition: 16` dan `regrettable: 62` **mustahil benar
   bersamaan** untuk firma seukuran ini. Pasangan bulat yang memenuhi keduanya
   hanya ada pada headcount 79–83 (13 keluar, 8 regrettable) — sementara
   `gradeMix` di objek yang SAMA berbunyi 69. Ketiganya tak pernah dihitung.

   Di sini semuanya diturunkan dari roster & register peristiwa:

     headcount / komposisi ← roster (grade, joined, born, gender, cert)
     masa kerja            ← `joined`
     attrition             ← register keluar (`EXITS`), bukan konstanta
     time-to-fill          ← requisition (dibuka → terisi)

   Fungsi MURNI: `asOf` selalu argumen.
   ============================================================ */

export interface HcmMember {
  id: string;
  name?: string;
  grade?: string;
  joined?: number;
  born?: number;
  gender?: string;
  cert?: string;
  status?: string;
  unit?: string;
}

export const HCM_GRADES = ['Partner', 'Manager', 'Senior', 'Junior'] as const;
export type HcmGrade = typeof HCM_GRADES[number];

export const TENURE_BANDS = ['< 2 th', '2–5 th', '5–10 th', '> 10 th'] as const;
export const AGE_BANDS = ['20–25', '26–30', '31–40', '> 40'] as const;
export const CERT_BANDS = ['CPA', 'CA', 'Kandidat CPA', 'S.Ak'] as const;

export type Bucket = { k: string; n: number };

/** Tahun kalender dari klok SSOT (`AMS.TODAY`). Diekspor karena bukan hanya
 *  agregat demografi yang butuh "tahun sekarang" — form karyawan baru pun
 *  memakainya alih-alih menuliskan tahun literal yang membeku. */
export const yearOf = (asOf: string): number => {
  const y = Number(String(asOf).slice(0, 4));
  return Number.isFinite(y) && y > 1900 ? y : new Date().getUTCFullYear();
};

/** Masa kerja dalam tahun penuh. `joined` di roster berupa TAHUN. */
export function tenureOf(joined: number | undefined | null, asOf: string): number | null {
  if (!Number.isFinite(joined as number)) return null;
  return Math.max(0, yearOf(asOf) - (joined as number));
}

export function tenureBand(t: number | null): string | null {
  if (t === null) return null;
  return t < 2 ? '< 2 th' : t <= 5 ? '2–5 th' : t <= 10 ? '5–10 th' : '> 10 th';
}

export function ageOf(born: number | undefined | null, asOf: string): number | null {
  if (!Number.isFinite(born as number)) return null;
  return Math.max(0, yearOf(asOf) - (born as number));
}

export function ageBand(a: number | null): string | null {
  if (a === null) return null;
  return a <= 25 ? '20–25' : a <= 30 ? '26–30' : a <= 40 ? '31–40' : '> 40';
}

/** Sertifikasi tertinggi dari teks bebas `cert` roster.
 *  Urutan periksa penting: 'CA (kandidat CPA)' harus jatuh ke Kandidat, bukan CA. */
export function certBand(cert: string | undefined | null): string {
  const c = String(cert || '');
  if (/kandidat/i.test(c)) return 'Kandidat CPA';
  if (/\bCPA\b/.test(c)) return 'CPA';
  if (/\bCA\b/.test(c)) return 'CA';
  return 'S.Ak';
}

/** Hanya personel aktif yang membentuk komposisi. */
export function activeRoster(roster: readonly HcmMember[] | undefined): HcmMember[] {
  return (roster || []).filter((m) => m && m.id && (m.status == null || m.status === 'Aktif' || m.status === 'Cuti'));
}

function tally(rows: readonly (string | null)[], order: readonly string[]): Bucket[] {
  const m = new Map<string, number>();
  for (const k of order) m.set(k, 0);
  for (const k of rows) { if (k != null) m.set(k, (m.get(k) || 0) + 1); }
  return [...m.entries()].map(([k, n]) => ({ k, n }));
}

export interface HcmDemographics {
  total: number;
  gradeMix: Bucket[];
  tenureMix: Bucket[];
  ageMix: Bucket[];
  genderMix: Bucket[];
  certMix: Bucket[];
  /** Rata-rata masa kerja (tahun, 1 desimal); null bila tak ada data. */
  avgTenure: number | null;
  /** Berapa orang yang tanggal lahirnya tak tercatat — komposisi usia tak lengkap. */
  ageUnknown: number;
}

export function hcmDemographics(roster: readonly HcmMember[] | undefined, asOf: string): HcmDemographics {
  const list = activeRoster(roster);
  const tenures = list.map((m) => tenureOf(m.joined, asOf)).filter((t): t is number => t !== null);
  const ages = list.map((m) => ageOf(m.born, asOf));
  return {
    total: list.length,
    gradeMix: tally(list.map((m) => (HCM_GRADES as readonly string[]).includes(String(m.grade)) ? String(m.grade) : null), HCM_GRADES),
    tenureMix: tally(list.map((m) => tenureBand(tenureOf(m.joined, asOf))), TENURE_BANDS),
    ageMix: tally(ages.map(ageBand), AGE_BANDS),
    genderMix: tally(list.map((m) => (m.gender === 'L' ? 'Laki-laki' : m.gender === 'P' ? 'Perempuan' : null)), ['Laki-laki', 'Perempuan']),
    certMix: tally(list.map((m) => certBand(m.cert)), CERT_BANDS),
    /* Rata-rata dari yang DAPAT dihitung; null (bukan NaN) bila tak ada. */
    avgTenure: tenures.length ? Math.round((tenures.reduce((a, b) => a + b, 0) / tenures.length) * 10) / 10 : null,
    ageUnknown: ages.filter((a) => a === null).length,
  };
}

/* ------------------------------------------------------------------
   Register keluar → attrition
   ------------------------------------------------------------------ */

export interface HcmExit {
  id: string;
  emp: string;
  name?: string;
  grade?: string;
  /** 'YYYY-MM-DD' */
  date: string;
  reason: string;
  /** Kepergian yang firma sesalkan (bukan PHK/kinerja). */
  regrettable: boolean;
}

export interface HcmAttrition {
  windowMonths: number;
  exits: number;
  regrettable: number;
  headcount: number;
  /** exits ÷ headcount pada `asOf`, dalam persen bulat. null bila roster kosong. */
  ratePct: number | null;
  regrettablePct: number | null;
  byGrade: Bucket[];
  basis: string;
}

const MS_DAY = 86_400_000;

function within(dateIso: string, asOf: string, months: number): boolean {
  const a = Date.parse(dateIso + 'T00:00:00Z');
  const b = Date.parse(asOf + 'T00:00:00Z');
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  return a <= b && b - a <= months * 30.44 * MS_DAY;
}

/**
 * Attrition dari register keluar — bukan konstanta.
 *
 * Basis dinyatakan eksplisit (`exits ÷ headcount pada tanggal acuan`) karena
 * angka attrition tanpa basis tidak dapat dibandingkan dengan apa pun.
 */
export function hcmAttrition(
  roster: readonly HcmMember[] | undefined,
  exits: readonly HcmExit[] | undefined,
  asOf: string,
  windowMonths = 12,
): HcmAttrition {
  const headcount = activeRoster(roster).length;
  const win = (exits || []).filter((e) => e && within(e.date, asOf, windowMonths));
  const reg = win.filter((e) => e.regrettable).length;
  return {
    windowMonths,
    exits: win.length,
    regrettable: reg,
    headcount,
    ratePct: headcount > 0 ? Math.round((win.length / headcount) * 100) : null,
    regrettablePct: win.length > 0 ? Math.round((reg / win.length) * 100) : null,
    byGrade: tally(win.map((e) => (HCM_GRADES as readonly string[]).includes(String(e.grade)) ? String(e.grade) : null), HCM_GRADES),
    basis: `Keluar ${windowMonths} bulan terakhir ÷ headcount aktif pada ${asOf}`,
  };
}

/** Attrition per jenjang — pembilang dari register keluar, penyebut dari roster. */
export function hcmAttritionByGrade(
  roster: readonly HcmMember[] | undefined,
  exits: readonly HcmExit[] | undefined,
  asOf: string,
  windowMonths = 12,
): { g: string; exits: number; headcount: number; ratePct: number | null }[] {
  const list = activeRoster(roster);
  const win = (exits || []).filter((e) => e && within(e.date, asOf, windowMonths));
  return HCM_GRADES.map((g) => {
    const hc = list.filter((m) => m.grade === g).length;
    const ex = win.filter((e) => e.grade === g).length;
    return { g, exits: ex, headcount: hc, ratePct: hc > 0 ? Math.round((ex / hc) * 100) : null };
  });
}

/* ------------------------------------------------------------------
   Requisition → time-to-fill
   ------------------------------------------------------------------ */

export interface HcmRequisition {
  id: string;
  title?: string;
  grade?: string;
  count?: number;
  status?: string;
  opened?: string;
  /** Tanggal posisi benar-benar terisi. Tanpa ini time-to-fill tak dapat dihitung. */
  filledDate?: string;
}

export interface HcmTimeToFill {
  /** Rata-rata hari dari dibuka sampai terisi; null bila belum ada yang terisi. */
  days: number | null;
  filled: number;
  /** Requisition terisi yang TIDAK punya tanggal terisi — tak dapat dihitung. */
  undated: number;
  open: number;
  basis: string;
}

export function hcmTimeToFill(reqs: readonly HcmRequisition[] | undefined): HcmTimeToFill {
  const list = reqs || [];
  const done = list.filter((r) => r.status === 'Terisi');
  const dated = done.filter((r) => r.opened && r.filledDate);
  const spans = dated.map((r) => {
    const a = Date.parse((r.opened as string) + 'T00:00:00Z');
    const b = Date.parse((r.filledDate as string) + 'T00:00:00Z');
    return Number.isFinite(a) && Number.isFinite(b) && b >= a ? Math.round((b - a) / MS_DAY) : null;
  }).filter((n): n is number => n !== null);
  return {
    days: spans.length ? Math.round(spans.reduce((a, b) => a + b, 0) / spans.length) : null,
    filled: dated.length,
    undated: done.length - dated.length,
    open: list.filter((r) => r.status !== 'Terisi').length,
    basis: 'Rata-rata hari kalender dari requisition dibuka sampai terisi',
  };
}

/* ------------------------------------------------------------------
   Tren headcount dari peristiwa
   ------------------------------------------------------------------ */

export interface HcmTrendPoint { q: string; total: number; hires: number; exits: number }

/**
 * Tren headcount TAHUNAN, dihitung mundur dari roster + register keluar.
 *
 * Presisi sengaja TAHUNAN, bukan kuartalan: roster hanya menyimpan TAHUN
 * bergabung. Versi kuartalan menaruh seluruh perekrutan satu tahun di Q1 dan
 * menghasilkan artefak yang menyesatkan — headcount tampak LEBIH TINGGI di masa
 * lalu daripada hari ini. Lebih baik melaporkan pada presisi yang datanya punya
 * daripada memuluskan kurva dengan tebakan.
 *
 * Titik terakhir = headcount hari ini; tiap langkah mundur memakai
 * total(t−1) = total(t) − masuk(t) + keluar(t). Kurvanya karena itu SELALU
 * menutup ke roster yang nyata, tak seperti `headcountTrend` literal yang
 * digantikannya.
 */
export function hcmHeadcountTrend(
  roster: readonly HcmMember[] | undefined,
  exits: readonly HcmExit[] | undefined,
  asOf: string,
  years = 5,
): HcmTrendPoint[] {
  const list = activeRoster(roster);
  const now = yearOf(asOf);

  const hiresAt = new Map<number, number>();
  for (const m of list) {
    if (!Number.isFinite(m.joined as number)) continue;
    const y = m.joined as number;
    hiresAt.set(y, (hiresAt.get(y) || 0) + 1);
  }
  const exitsAt = new Map<number, number>();
  for (const e of exits || []) {
    const y = Number(String(e.date).slice(0, 4));
    if (!Number.isFinite(y)) continue;
    exitsAt.set(y, (exitsAt.get(y) || 0) + 1);
  }

  const pts: HcmTrendPoint[] = [];
  let total = list.length;
  for (let i = 0; i < years; i++) {
    const y = now - i;
    const hires = hiresAt.get(y) || 0;
    const ex = exitsAt.get(y) || 0;
    pts.unshift({ q: String(y), total, hires, exits: ex });
    total = total - hires + ex;
  }
  return pts;
}
