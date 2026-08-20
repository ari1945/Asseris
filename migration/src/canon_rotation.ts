/* ============================================================
   Asseris — Rotasi AP: MESIN MURNI (PRD sdm-kepatuhan PR-7 · SC-23)
   ------------------------------------------------------------
   Ambang rotasi sudah benar dan terdiferensiasi per rezim (PP 20/2015 Ps. 11
   → 5 tahun untuk PIE umum; POJK 13/POJK.03/2017 → 3 tahun untuk sektor jasa
   keuangan), dan `tenure >= rotationLimit` memang diturunkan.

   Yang TIDAK diturunkan adalah `tenure` itu sendiri:

       { id: 'EMP-002', …, rotationClient: 'PT Graha Properti', tenure: 7 }

   Angka 7 diketik. Aplikasi punya riwayat perikatan dan catatan penandatangan,
   tetapi tak pernah menghitung tahun berturut-turut dari sana. Dan `cooloff: 2`
   adalah data yang tak dievaluasi apa pun — masa jeda tak pernah diperiksa.

   Terakhir: pelanggaran (7 ≥ 5) hanya menaikkan spanduk merah. Ia tidak
   memblokir penugasan apa pun.

   Di sini `tenure` DITURUNKAN dari register penandatanganan, cooling-off
   dievaluasi, dan pelanggaran menjadi gerbang yang dapat berkata tidak.

   Fungsi MURNI.
   ============================================================ */

export interface SigningRecord {
  /** empId Akuntan Publik penanda tangan. */
  ap: string;
  /** Klien yang laporannya ditandatangani. */
  client: string;
  /** Tahun buku yang ditandatangani. */
  year: number;
}

export interface RotationRegime {
  limit: number;
  cooloff: number;
  basis: string;
  label: string;
}

/** Rezim rotasi — SATU sumber, dengan dasar hukumnya melekat. */
export const REGIME_PIE: RotationRegime = {
  limit: 5, cooloff: 2, basis: 'PP 20/2015 Pasal 11', label: 'PIE umum',
};
export const REGIME_JK: RotationRegime = {
  limit: 3, cooloff: 2, basis: 'POJK 13/POJK.03/2017', label: 'Jasa keuangan',
};
/** Non-PIE: tak ada batas statutori bagi AP; kebijakan firma yang berlaku. */
export const REGIME_NONPIE: RotationRegime = {
  limit: 0, cooloff: 0, basis: 'Kebijakan firma (tanpa batas statutori)', label: 'Non-PIE',
};

export function regimeOf(args: { sektorJK?: boolean; listed?: boolean }): RotationRegime {
  if (args.sektorJK) return REGIME_JK;
  if (args.listed) return REGIME_PIE;
  return REGIME_NONPIE;
}

export type RotationTier = 'ok' | 'warn' | 'alert' | 'due' | 'tanpa-batas';

export interface RotationState {
  ap: string;
  client: string;
  /** Tahun berturut-turut sampai `asOfYear`, DITURUNKAN dari register. */
  tenure: number;
  /** Tahun-tahun yang membentuk masa tugas berturut itu. */
  years: number[];
  limit: number;
  regime: RotationRegime;
  tier: RotationTier;
  /** Sudah mencapai/melewati batas. */
  breached: boolean;
  /** Tahun buku pertama yang TIDAK boleh lagi ditandatangani AP ini. */
  mustRotateFrom: number | null;
  reason: string;
}

/** Tahun berturut-turut ke belakang dari `asOfYear` (inklusif). */
export function consecutiveYears(history: readonly SigningRecord[] | undefined, ap: string, client: string, asOfYear: number): number[] {
  const set = new Set(
    (history || [])
      .filter((h) => h && h.ap === ap && h.client === client && Number.isFinite(h.year))
      .map((h) => h.year),
  );
  const out: number[] = [];
  for (let y = asOfYear; set.has(y); y--) out.unshift(y);
  return out;
}

export function rotationState(args: {
  ap: string;
  client: string;
  history?: readonly SigningRecord[];
  asOfYear: number;
  sektorJK?: boolean;
  listed?: boolean;
}): RotationState {
  const regime = regimeOf(args);
  const years = consecutiveYears(args.history, args.ap, args.client, args.asOfYear);
  const tenure = years.length;
  const limit = regime.limit;

  let tier: RotationTier;
  if (limit <= 0) tier = 'tanpa-batas';
  else if (tenure >= limit) tier = 'due';
  else if (tenure >= limit - 1) tier = 'alert';
  else if (tenure >= limit - 2) tier = 'warn';
  else tier = 'ok';

  const breached = limit > 0 && tenure >= limit;
  return {
    ap: args.ap, client: args.client, tenure, years, limit, regime, tier, breached,
    mustRotateFrom: breached ? args.asOfYear + 1 : null,
    reason: breached
      ? `Masa tugas ${tenure} tahun berturut mencapai batas ${limit} tahun (${regime.basis}); tahun buku ${args.asOfYear + 1} harus ditandatangani AP lain.`
      : '',
  };
}

/* ------------------------------------------------------------------
   Cooling-off
   ------------------------------------------------------------------ */

export interface CoolOffState {
  /** Tahun terakhir AP ini menandatangani klien tersebut. */
  lastYear: number | null;
  /** Tahun jeda sejak itu. */
  yearsOut: number;
  required: number;
  /** Sudah boleh kembali menandatangani. */
  satisfied: boolean;
  /** Tahun buku paling awal AP ini boleh kembali. */
  eligibleFrom: number | null;
  reason: string;
}

/**
 * Masa jeda setelah rotasi.
 *
 * `cooloff: 2` dulu hanya data. Tanpa evaluasi, seorang AP dapat dirotasi keluar
 * lalu ditugaskan kembali tahun berikutnya tanpa satu pun peringatan.
 */
export function coolOffState(args: {
  ap: string;
  client: string;
  history?: readonly SigningRecord[];
  asOfYear: number;
  regime: RotationRegime;
}): CoolOffState {
  const years = (args.history || [])
    .filter((h) => h && h.ap === args.ap && h.client === args.client && Number.isFinite(h.year))
    .map((h) => h.year);
  const lastYear = years.length ? Math.max(...years) : null;
  const required = args.regime.cooloff;
  if (lastYear === null) {
    return { lastYear: null, yearsOut: Infinity, required, satisfied: true, eligibleFrom: null, reason: '' };
  }
  const yearsOut = args.asOfYear - lastYear;
  const satisfied = required <= 0 || yearsOut > required;
  return {
    lastYear, yearsOut, required, satisfied,
    eligibleFrom: required > 0 ? lastYear + required + 1 : lastYear + 1,
    reason: satisfied ? '' : `Masa jeda ${required} tahun belum terlampaui — terakhir menandatangani ${lastYear}, baru boleh kembali untuk tahun buku ${lastYear + required + 1}.`,
  };
}

/* ------------------------------------------------------------------
   Gerbang penugasan
   ------------------------------------------------------------------ */

export interface RotationAssignCheck {
  ok: boolean;
  reason: string;
  tier: RotationTier;
  tenure: number;
}

/**
 * Bolehkah AP ini ditugaskan menandatangani `client` untuk `year`?
 *
 * Ini gerbang yang dulu tak ada: pelanggaran 7 ≥ 5 hanya menaikkan spanduk merah
 * dan tidak pernah menghentikan penugasan.
 */
export function rotationAssignCheck(args: {
  ap: string;
  client: string;
  history?: readonly SigningRecord[];
  /** Tahun buku yang hendak ditugaskan. */
  year: number;
  sektorJK?: boolean;
  listed?: boolean;
}): RotationAssignCheck {
  const regime = regimeOf(args);
  /* Masa tugas dihitung sampai tahun SEBELUM penugasan baru. */
  const st = rotationState({ ...args, asOfYear: args.year - 1 });
  if (regime.limit <= 0) return { ok: true, reason: '', tier: 'tanpa-batas', tenure: st.tenure };
  if (st.tenure >= regime.limit) {
    return {
      ok: false,
      reason: `${args.ap} sudah menandatangani ${args.client} ${st.tenure} tahun berturut (batas ${regime.limit}, ${regime.basis}) — tahun buku ${args.year} harus AP lain.`,
      tier: 'due', tenure: st.tenure,
    };
  }
  /* Bila sedang di luar (tenure 0), masa jeda harus sudah terlampaui. */
  if (st.tenure === 0) {
    const cool = coolOffState({ ...args, asOfYear: args.year - 1, regime });
    if (!cool.satisfied) return { ok: false, reason: cool.reason, tier: 'due', tenure: 0 };
  }
  return { ok: true, reason: '', tier: st.tier, tenure: st.tenure };
}
