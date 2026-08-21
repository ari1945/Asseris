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

   TAHAP A-2 (`docs/prd-regref-tahap-a2.md` · R2). Rezim di bawah adalah data
   REGULATORI — batasnya ditetapkan PP dan POJK, dan keduanya dapat berubah —
   tetapi ia hidup sebagai konstanta tanpa masa berlaku, sementara satu konsumen
   (`data_licensing.ts`) malah memakai fallback literal `ind.rotationLimit || 5`.
   Modul independensi karena itu memunculkan peringatan yang MENGUTIP dasar
   hukum atas angka yang tak tertaut ke satu pun registry.

   Kini rezimnya berkunci masa berlaku (`ROTATION_REGISTRY`) dan `basis` yang
   ditampilkan berasal dari set yang dipilih, bukan dari string yang diketik di
   view. Masa yang tak tercakup MEMBLOKIR: seperti kewajiban PPL, batas rotasi
   adalah premis sebuah verdict — "belum wajib rotasi" yang dihitung dari batas
   rezim yang salah bukan angka kurang teliti, ia nasihat yang keliru.

   Fungsi MURNI.
   ============================================================ */
import { regrefFor } from './canon_regref';
import type { RegRefLookup, RegRefSet } from './canon_regref';

/* ---------- Ambang rotasi AP — SUMBER KEBENARAN TUNGGAL ----------
   Empat tingkat, dipakai lintas view (BO Lisensi · Firm Dashboard ·
   Independence · People) agar batas tidak direplikasi tak-konsisten:
     · due   → tenure ≥ batas            (WAJIB rotasi sekarang)
     · alert → ≤ 6 bulan sebelum batas   (jendela peringatan dini / auto-alert OJK)
     · warn  → tahun terakhir sebelum batas
     · ok    → di luar itu
   6 bulan = 0,5 tahun (tenure dinyatakan dalam tahun).

   Tinggal di modul LEAF ini (bukan `data_licensing`, yang mengimpor `./data`)
   supaya modul aturan yang dibaca server dapat memakainya tanpa menyeret
   lapisan data browser. `data_licensing` me-RE-EXPORT-nya — pengimpor lama utuh. */
/* `tak-dinilai` = tak ada deklarasi independensi bagi AP ini, sehingga batasnya
   TIDAK DIKETAHUI. Dulu keadaan ini memakai fallback literal `|| 5` lalu
   melaporkan "Patuh" — verdict kepatuhan atas angka yang dikarang (Tahap A-2 · R2).
   `rotTier()` sendiri tak pernah mengembalikannya: ia lahir di pemanggil, yang
   tahu batasnya null sebelum sempat bertanya. */
export type RotTier = 'ok' | 'warn' | 'alert' | 'due' | 'tak-dinilai';
export function rotTier(tenure: number, limit: number): RotTier {
  if (!(limit > 0)) return 'ok';
  if (tenure >= limit) return 'due';
  if (tenure >= limit - 0.5) return 'alert';
  if (tenure >= limit - 1) return 'warn';
  return 'ok';
}


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

/** Ketiga rezim yang berlaku bersamaan pada satu masa. */
export interface RotationRegimeSet {
  pie: RotationRegime;
  jk: RotationRegime;
  nonpie: RotationRegime;
}

export const ROTATION_LABEL = 'Batas rotasi Akuntan Publik';

/**
 * Rezim rotasi menurut masa berlakunya.
 *
 * Satu set, dan itu memang keadaannya — tetapi masa SEBELUM POJK 13/2017 tidak
 * tercakup, dan itu disengaja: rezim sektor jasa keuangan belum ada di sana,
 * dan menjawabnya dengan batas 3 tahun adalah "yang terdekat" yang justru
 * hendak dicabut registry ini.
 */
export const ROTATION_REGISTRY: RegRefSet<RotationRegimeSet>[] = [{
  effectiveFrom: '2017-01-01',
  effectiveTo: null,
  basis: 'PP 20/2015 Pasal 11 (PIE umum, 5 th) · POJK 13/POJK.03/2017 (jasa keuangan, 3 th)',
  sourceDoc: '',
  verified: false,
  note: 'Batas 5/3 tahun, masa jeda 2 tahun, dan tanggal mulai berlaku PP 20/2015 serta '
    + 'POJK 13/POJK.03/2017 belum dicocokkan dengan naskahnya; masa sebelum 2017 karena itu '
    + 'tak tercakup, bukan dihitung dengan rezim yang belum ada.',
  value: { pie: REGIME_PIE, jk: REGIME_JK, nonpie: REGIME_NONPIE },
}];

/** Rezim rotasi yang berlaku pada `date`, atau penolakan yang menyebut alasannya. */
export function rotationRegimesOn(date: string | undefined | null): RegRefLookup<RotationRegimeSet> {
  return regrefFor(ROTATION_REGISTRY, String(date ?? ''), { label: ROTATION_LABEL, enforcement: 'block' });
}

/** Rezim yang berlaku pada `date` sebagai NILAI, atau lemparan. */
export function rotationRegimesRequired(date: string): RotationRegimeSet {
  const look = rotationRegimesOn(date);
  if (!look.value) throw new Error(look.note);
  return look.value;
}

/**
 * Rezim untuk satu penugasan.
 *
 * `regimes` DISUNTIKKAN bila pemanggil sudah memilih setnya menurut tanggal;
 * tanpa itu ia memakai konstanta modul — perilaku lama, dipertahankan supaya
 * pemanggil yang belum bertanggal tidak diam-diam berubah maknanya.
 */
export function regimeOf(args: { sektorJK?: boolean; listed?: boolean; regimes?: RotationRegimeSet }): RotationRegime {
  const r = args.regimes || { pie: REGIME_PIE, jk: REGIME_JK, nonpie: REGIME_NONPIE };
  if (args.sektorJK) return r.jk;
  if (args.listed) return r.pie;
  return r.nonpie;
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
  regimes?: RotationRegimeSet;
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
  regimes?: RotationRegimeSet;
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
