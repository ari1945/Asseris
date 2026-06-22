/* ============================================================
   Wedge MVP F2 · SPIKE R1 — derivasi flag risiko jurnal (SA 240 ¶32)
   ------------------------------------------------------------
   `forensic_canon` hanya menyimpan `flags` HARDCODED pada populasi seed;
   importer GL nyata butuh fungsi derivasi yang menghitung flag dari baris
   GL mentah. Inilah titik build berisiko tertinggi (PRD §10 R1) — di-spike
   lebih dulu sebelum membangun parser/UI.

   Flag mengikuti kriteria kanonik forensic_canon.JET_CRITERIA:
     round · weekend · afterhrs · periodend · unusual · threshold · rareuser · seldom
   Detektor JET (`amsDiagnostics`) hanya menghitung `flags.length >= 3`
   ⇒ konsentrasi flag = indikasi override manajemen.
   ============================================================ */

export type JetFlag =
  | 'round' | 'weekend' | 'afterhrs' | 'periodend'
  | 'unusual' | 'threshold' | 'rareuser' | 'seldom';

export const JET_FLAG_LABELS: Record<JetFlag, string> = {
  round: 'Nilai bulat besar (round-dollar)',
  weekend: 'Diposting akhir pekan / hari libur',
  afterhrs: 'Diposting di luar jam kerja',
  periodend: 'Jurnal manual dekat tutup buku',
  unusual: 'Kombinasi akun tidak lazim',
  threshold: 'Tepat di bawah ambang otorisasi',
  rareuser: 'Diinput oleh user jarang menjurnal',
  seldom: 'Melibatkan akun yang jarang dipakai',
};

/** Baris GL mentah ternormalisasi (hasil parse importer; lihat F2 parser). */
export interface RawGlRow {
  id?: string;
  date: string;          // 'dd-mm-yyyy' | 'yyyy-mm-dd' | ISO — diparse parseGlDate
  time?: string;         // 'HH:MM' (opsional)
  user?: string;
  amount: number;        // Rupiah penuh (akan di-abs-kan)
  drAccount?: string;
  crAccount?: string;
  desc?: string;
  party?: string;        // lawan transaksi / pihak berelasi (kolom opsional, utk SA 550)
}

export interface DeriveOpts {
  /** Tutup buku fiskal. Bila null → diinfer dari tahun modal pada populasi. */
  fiscalYearEnd?: Date | null;
  /** Ambang otorisasi (Rp). 0/undefined → flag 'threshold' nonaktif (konservatif). */
  authThreshold?: number;
  /** Lebar pita 'periodend' dalam hari sebelum/sesudah tutup buku. */
  periodEndWindowDays?: number;
  /** Lantai nilai 'round' (Rp) — di bawah ini tak dianggap material. */
  roundFloor?: number;
}

export interface PopulationContext {
  fiscalYearEnd: Date | null;
  authThreshold: number;
  periodEndWindowDays: number;
  roundFloor: number;
  total: number;
  userCount: Record<string, number>;
  accountCount: Record<string, number>;
  pairCount: Record<string, number>;
  rareUserMax: number;
  rareAccountMax: number;
  unusualPairMax: number;
}

const ROUND_UNIT = 1_000_000;        // "bulat" = kelipatan satu juta
const DEFAULT_ROUND_FLOOR = 100_000_000;
const DEFAULT_PERIOD_WINDOW = 7;
const THRESHOLD_BAND = 0.05;         // 'threshold' = [ambang*0.95, ambang]

/** Parse 'dd-mm-yyyy' / 'yyyy-mm-dd' / ISO → Date (atau null bila gagal). */
export function parseGlDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const str = String(s).trim();
  let m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(str);     // dd-mm-yyyy
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(str);          // yyyy-mm-dd (+ISO)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

function pairKey(dr?: string, cr?: string): string {
  return `${(dr || '').trim()}|${(cr || '').trim()}`;
}

/** Pra-pass populasi: frekuensi user/akun/pasangan + infer tutup buku & ambang langka. */
export function buildPopulationContext(rows: RawGlRow[], opts: DeriveOpts = {}): PopulationContext {
  const userCount: Record<string, number> = {};
  const accountCount: Record<string, number> = {};
  const pairCount: Record<string, number> = {};
  const yearTally: Record<string, number> = {};

  for (const r of rows) {
    if (r.user) userCount[r.user] = (userCount[r.user] || 0) + 1;
    if (r.drAccount) accountCount[r.drAccount] = (accountCount[r.drAccount] || 0) + 1;
    if (r.crAccount) accountCount[r.crAccount] = (accountCount[r.crAccount] || 0) + 1;
    if (r.drAccount && r.crAccount) {
      const k = pairKey(r.drAccount, r.crAccount);
      pairCount[k] = (pairCount[k] || 0) + 1;
    }
    const d = parseGlDate(r.date);
    if (d) { const y = String(d.getFullYear()); yearTally[y] = (yearTally[y] || 0) + 1; }
  }

  let fye = opts.fiscalYearEnd ?? null;
  if (!fye) {
    const years = Object.keys(yearTally);
    if (years.length) {
      const modalYear = years.reduce((a, b) => (yearTally[b] > yearTally[a] ? b : a));
      fye = new Date(+modalYear, 11, 31);          // asumsi tahun buku kalender (31 Des)
    }
  }

  return {
    fiscalYearEnd: fye,
    authThreshold: opts.authThreshold || 0,
    periodEndWindowDays: opts.periodEndWindowDays ?? DEFAULT_PERIOD_WINDOW,
    roundFloor: opts.roundFloor ?? DEFAULT_ROUND_FLOOR,
    total: rows.length,
    userCount, accountCount, pairCount,
    rareUserMax: 2,        // user dgn ≤2 entri = jarang menjurnal
    rareAccountMax: 2,     // akun dgn ≤2 kemunculan = jarang dipakai
    unusualPairMax: 1,     // pasangan dr/cr unik = kombinasi tidak lazim
  };
}

/** Derivasi flag SA 240 ¶32 untuk satu baris GL terhadap konteks populasi. */
export function deriveJournalFlags(row: RawGlRow, pop: PopulationContext): JetFlag[] {
  const flags: JetFlag[] = [];
  const amt = Math.abs(row.amount || 0);

  // round — bulat & material
  if (amt >= pop.roundFloor && amt % ROUND_UNIT === 0) flags.push('round');

  const d = parseGlDate(row.date);
  // weekend
  if (d && (d.getDay() === 0 || d.getDay() === 6)) flags.push('weekend');

  // afterhrs — di luar 06:00–18:59
  if (row.time) {
    const hh = parseInt(String(row.time).split(':')[0], 10);
    if (!isNaN(hh) && (hh < 6 || hh >= 19)) flags.push('afterhrs');
  }

  // periodend — dalam pita hari dari tutup buku
  if (d && pop.fiscalYearEnd) {
    const diffDays = Math.abs(d.getTime() - pop.fiscalYearEnd.getTime()) / 86_400_000;
    if (diffDays <= pop.periodEndWindowDays) flags.push('periodend');
  }

  // unusual — pasangan dr/cr langka
  if (row.drAccount && row.crAccount) {
    const c = pop.pairCount[pairKey(row.drAccount, row.crAccount)] || 0;
    if (c <= pop.unusualPairMax) flags.push('unusual');
  }

  // threshold — tepat di bawah ambang otorisasi
  if (pop.authThreshold > 0 && amt <= pop.authThreshold && amt >= pop.authThreshold * (1 - THRESHOLD_BAND)) {
    flags.push('threshold');
  }

  // rareuser — user jarang menjurnal
  if (row.user && (pop.userCount[row.user] || 0) <= pop.rareUserMax) flags.push('rareuser');

  // seldom — melibatkan akun jarang dipakai
  const drRare = row.drAccount && (pop.accountCount[row.drAccount] || 0) <= pop.rareAccountMax;
  const crRare = row.crAccount && (pop.accountCount[row.crAccount] || 0) <= pop.rareAccountMax;
  if (drRare || crRare) flags.push('seldom');

  return flags;
}
