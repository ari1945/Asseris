/* ============================================================
   Asseris — SA 540 · registri estimasi & pengukuran salah saji
   ------------------------------------------------------------
   Modul MURNI (tanpa React/DOM). Satu-satunya rumah bagi:
     · bentuk & seed registri estimasi (kunci persist `estimates.v1`)
     · dasar pengukuran salah saji estimasi (SA 540 → SA 450)
     · jembatan satuan: registri Rp JUTA → SadEntry Rp PENUH

   ------------------------------------------------------------
   DASAR PENGUKURAN (keputusan Q1 · PRD prd-estimasi-terfalsifikasi §10)
   ------------------------------------------------------------
   Bila titik manajemen berada DI DALAM rentang wajar auditor, rentang itu
   sendiri adalah zona yang dapat diterima — TIDAK ADA salah saji untuk
   diakumulasi ke SA 450. Salah saji timbul hanya ketika titik manajemen
   berada DI LUAR rentang, sebesar jarak ke BATAS TERDEKAT.

   Ini menggantikan rumus lama `mgmt − titik tengah`, yang melebih-lebihkan
   salah saji pada setiap estimasi yang sebetulnya wajar. Kecenderungan titik
   manajemen terhadap titik tengah TETAP diukur — tetapi sebagai indikator
   ARAH/BIAS (SA 540 ¶32), bukan sebagai salah saji: lihat `profitTilt`.

   ------------------------------------------------------------
   ARAH EFEK LABA (`plSign`)
   ------------------------------------------------------------
   Tanda salah saji tak dapat disimpulkan dari jarak saja: menaikkan sebuah
   PENYISIHAN menurunkan laba, sementara menaikkan ASET pada nilai wajar
   menaikkan laba. Karena itu polaritas WAJIB dinyatakan auditor, tidak
   diterka dari nama akun. Default −1 (beban/penyisihan/provisi) adalah pola
   yang lazim dan dipakai kelima estimasi seed.
   ============================================================ */

import type { SadEntry } from './canon_validation';
import type { SensDriver } from './estimate_sensitivity';
import { effectiveRange, type EstimateDerivation } from './canon_range';

/** Rp juta → Rp penuh. SATU-SATUNYA tempat faktor ini hidup. Registri estimasi
 *  & kanon PSAK memakai Rp juta; `SadEntry.pbt`/`na` dan materialitas penuh
 *  memakai Rp penuh. Mencampurnya meleset 10⁶×. */
export const JUTA = 1_000_000;

/** Arah efek terhadap laba ketika NILAI ESTIMASI NAIK.
 *  −1 = beban/penyisihan/provisi/rugi penurunan nilai (naik → laba turun).
 *  +1 = aset atau penghasilan pada nilai wajar (naik → laba naik). */
export type PlSign = -1 | 1;
export const PL_SIGN_DEFAULT: PlSign = -1;

export type Estimate = {
  id: string; name: string; acct: string;
  mgmt: number; lo: number; hi: number;      // Rp juta
  unc: string; risk: string; method: string;
  assump: string[]; approach: string; note: string;
  cplx?: string; subj?: string; by?: string; at?: string;
  plSign?: PlSign;
  /** DASAR rentang (PR-4). Bila metodenya 'scenarios'/'viu' dengan ≥2 skenario,
   *  `lo`/`hi` di atas TIDAK dipakai — rentang dihitung dari skenario. */
  derivation?: EstimateDerivation | null;
};
export type BiasRow = { id: string; t: string; est: string; flag: string; d: string; by?: string; at?: string };
export type EstState = { register: Estimate[]; bias: BiasRow[]; sensitivity: Record<string, SensDriver[]> };

/* ---- Inventaris estimasi (Rp juta) ---- */
const EST_REG: Estimate[] = [
  { id: 'E-01', name: 'CKPN Piutang (ECL · PSAK 71)', acct: 'Cadangan Kerugian', mgmt: 4870, lo: 4600, hi: 6300, unc: 'Tinggi', risk: 'Signifikan', method: 'Model ECL forward-looking; PD × LGD × EAD per staging', assump: ['Probabilitas gagal bayar (PD) per kelompok umur', 'Loss given default (LGD) berbasis recovery historis', 'Overlay makroekonomi (PDB, suku bunga)'], approach: 'Rentang independen', plSign: -1, note: 'Titik manajemen di paruh bawah rentang — indikasi understatement penyisihan (lihat Bias).',
    derivation: { method: 'scenarios', scenarios: [
      { id: 'sc1', label: 'PD dinaikkan ke batas atas kisaran wajar (+10%)', value: 6300, note: 'staging 2–3 memburuk' },
      { id: 'sc2', label: 'LGD pada recovery historis terbaik (−5%)', value: 4600, note: 'agunan terealisasi penuh' },
      { id: 'sc3', label: 'Overlay makro dipertahankan setara PY', value: 5100 },
    ] } },
  { id: 'E-02', name: 'Penyisihan Persediaan Usang', acct: 'Penyisihan Persediaan', mgmt: 2240, lo: 2050, hi: 2600, unc: 'Sedang', risk: 'Signifikan', method: 'Analisis umur & perputaran SKU; net realizable value', assump: ['Klasifikasi lambat-bergerak (> 180 hari)', 'Estimasi nilai jual bersih SKU usang', 'Rencana likuidasi/diskon manajemen'], approach: 'Uji proses manajemen', plSign: -1, note: 'Dalam rentang; konsisten dengan temuan hitung fisik SA 501 (GBJ-03).' },
  { id: 'E-03', name: 'Provisi Garansi Produk', acct: 'Provisi', mgmt: 1080, lo: 980, hi: 1240, unc: 'Sedang', risk: 'Non-signifikan', method: 'Tingkat klaim historis × penjualan bergaransi', assump: ['Rasio klaim historis 36 bulan', 'Periode garansi rata-rata', 'Tren kualitas produk'], approach: 'Uji proses manajemen', plSign: -1, note: 'Telaah retrospektif menunjukkan estimasi PY akurat (selisih −6%).' },
  { id: 'E-04', name: 'Liabilitas Imbalan Kerja (PSAK 24)', acct: 'Liabilitas Imbalan Pasti', mgmt: 9650, lo: 9100, hi: 10400, unc: 'Tinggi', risk: 'Signifikan', method: 'Projected Unit Credit oleh aktuaris independen', assump: ['Tingkat diskonto (obligasi korporasi)', 'Kenaikan gaji jangka panjang', 'Tingkat mortalita & pengunduran diri'], approach: 'Gunakan pakar (SA 620)', plSign: -1, note: 'Asumsi diskonto di kisaran wajar; kompetensi & objektivitas aktuaris dievaluasi.',
    /* rentang manual, tetapi BERALASAN — batas diambil dari tabel sensitivitas
       laporan aktuaris, bukan dari pertimbangan tim (TIER C: modelnya di luar). */
    derivation: { method: 'manual', rationale: 'Batas diambil dari tabel sensitivitas laporan aktuaris independen (diskonto ±50 bps → DBO ∓Rp 550/750 jt). Model aktuaria di luar lingkup aplikasi (SA 620).' } },
  /* Rentang E-05 TIDAK diketik: ia diturunkan HIDUP dari mesin nilai pakai
     PSAK 48 (Tier B). Mengubah WACC di PSAK 48 menggerakkan rentang ini dan,
     bila titik manajemen keluar rentang, salah saji di SAD. `lo`/`hi` di bawah
     hanya jaring bila hasil PSAK 48 tak tersedia. */
  { id: 'E-05', name: 'Uji Penurunan Nilai Goodwill', acct: 'Goodwill', mgmt: 0, lo: 0, hi: 1800, unc: 'Tinggi', risk: 'Signifikan', method: 'Value-in-use; arus kas terdiskonto (DCF) per UPK', assump: ['Tingkat pertumbuhan terminal', 'WACC (tingkat diskonto)', 'Proyeksi arus kas 5 tahun'], approach: 'Rentang independen', plSign: -1, note: 'Tidak ada rugi penurunan nilai diakui; headroom tipis & sensitif terhadap WACC.',
    derivation: { method: 'viu' } },
];

/* ---- Indikator bias manajemen (¶32) ---- */
const BIAS_ROWS: BiasRow[] = [
  { id: 'B-01', t: 'Perubahan estimasi/asumsi yang menggeser laba ke arah menguntungkan', est: 'CKPN Piutang', flag: 'amber', d: 'Titik di paruh bawah rentang; overlay makro dikurangi vs PY.' },
  { id: 'B-02', t: 'Telaah retrospektif — selisih estimasi PY vs realisasi', est: 'CKPN Piutang', flag: 'amber', d: 'Selisih PY belum terhitung dari data — lihat tab Respons (PR-5).' },
  { id: 'B-03', t: 'Seleksi titik dalam rentang tanpa dasar netral', est: 'Goodwill', flag: 'amber', d: 'WACC di batas bawah kisaran wajar — menaikkan value-in-use.' },
  { id: 'B-04', t: 'Konsistensi metode & asumsi antar periode', est: 'Imbalan Kerja', flag: 'green', d: 'Metode & sumber asumsi aktuaria konsisten dengan PY.' },
];

/* default kompleksitas/subjektivitas per estimasi (spektrum risiko bawaan ¶4) */
const EST_CS: Record<string, { cplx: string; subj: string }> = {
  'E-01': { cplx: 'Tinggi', subj: 'Tinggi' }, 'E-02': { cplx: 'Sedang', subj: 'Sedang' },
  'E-03': { cplx: 'Rendah', subj: 'Rendah' }, 'E-04': { cplx: 'Tinggi', subj: 'Sedang' },
  'E-05': { cplx: 'Tinggi', subj: 'Tinggi' },
};

/* seed sensitivitas — driver asumsi (Δ% × Rp jt per 1%) */
const SENS_SEED: Record<string, SensDriver[]> = {
  'E-01': [
    { id: 's1', label: 'Probabilitas gagal bayar (PD) per umur', deltaPct: 10, perPct: 45 },
    { id: 's2', label: 'Loss given default (LGD)', deltaPct: 5, perPct: 60 },
    { id: 's3', label: 'Overlay makroekonomi (PDB)', deltaPct: -5, perPct: 24 },
  ],
  'E-05': [
    { id: 's1', label: 'WACC (tingkat diskonto)', deltaPct: 0.5, perPct: -4200 },
    { id: 's2', label: 'Pertumbuhan terminal', deltaPct: -0.5, perPct: 2800 },
    { id: 's3', label: 'Arus kas tahun-1', deltaPct: -10, perPct: 195 },
  ],
};

export const EST_SEED: EstState = {
  register: EST_REG.map(e => ({ ...e, ...(EST_CS[e.id] || { cplx: 'Sedang', subj: 'Sedang' }) })),
  bias: BIAS_ROWS,
  sensitivity: SENS_SEED,
};

/* ============================================================
   Pengukuran salah saji
   ============================================================ */

export type MisstatementBasis = 'below-lo' | 'above-hi' | 'within-range' | 'indeterminate';

export interface EstimateMisstatement {
  /** Efek terhadap laba sebelum pajak DARI MENGOREKSI salah saji, Rp JUTA,
   *  bertanda (negatif = koreksi menurunkan laba). 0 bila di dalam rentang. */
  amount: number;
  basis: MisstatementBasis;
  /** Batas rentang yang dipakai sebagai titik koreksi (null bila tak ada salah saji). */
  bound: number | null;
  /** Titik tengah rentang — dipakai untuk arah/bias, BUKAN untuk salah saji. */
  midpoint: number;
  /** Keuntungan laba (Rp juta) dari memilih `mgmt` alih-alih titik tengah.
   *  > 0 berarti titik manajemen menghasilkan laba LEBIH TINGGI daripada titik
   *  tengah rentang — indikator arah SA 540 ¶32 bila berulang lintas estimasi. */
  profitTilt: number;
  favoursProfit: boolean;
}

function finite(n: number): boolean {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Salah saji satu estimasi terhadap rentang wajar auditor.
 * Rentang terbalik (lo > hi) atau angka tak-hingga → `indeterminate`, amount 0:
 * registri yang tak koheren TIDAK boleh menghasilkan salah saji bertanda.
 */
export function estimateMisstatement(mgmt: number, lo: number, hi: number, plSign: PlSign = PL_SIGN_DEFAULT): EstimateMisstatement {
  const sign: PlSign = plSign === 1 ? 1 : -1;
  if (!finite(mgmt) || !finite(lo) || !finite(hi) || lo > hi) {
    return { amount: 0, basis: 'indeterminate', bound: null, midpoint: NaN, profitTilt: 0, favoursProfit: false };
  }
  const midpoint = (lo + hi) / 2;
  // `|| 0` menormalkan −0 (hasil −1 × 0) → 0; −0 akan tercetak "-0" di id-ID.
  const profitTilt = sign * (mgmt - midpoint) || 0;

  // jarak bertanda ke luar rentang: < 0 estimasi terlalu RENDAH, > 0 terlalu TINGGI
  const d = mgmt < lo ? mgmt - lo : mgmt > hi ? mgmt - hi : 0;
  const basis: MisstatementBasis = d < 0 ? 'below-lo' : d > 0 ? 'above-hi' : 'within-range';

  // koreksi menggeser estimasi sebesar (−d); efeknya terhadap laba = sign × (−d)
  const amount = d === 0 ? 0 : -sign * d;
  return {
    amount, basis,
    bound: d === 0 ? null : (d < 0 ? lo : hi),
    midpoint, profitTilt,
    favoursProfit: profitTilt > 0,
  };
}

/** Baris SAD turunan — `SadEntry` + field tampilan + penanda asal. */
export interface DerivedSadRow extends SadEntry {
  desc: string; type: string; fsli: string; assertion: string; initiator: string;
  derived: true; estimateId: string; basis: MisstatementBasis;
  /** false bila rentang yang MENGHASILKAN salah saji ini sendiri tak berdasar
   *  (diketik tanpa alasan). Salah saji tetap diakumulasi — menyembunyikannya
   *  justru menghapus temuan nyata — tetapi dasarnya harus terbaca. */
  rangeGrounded: boolean;
}

export const ESTIMATE_SAD_PREFIX = 'EST-';
/** Ref non-jurnal — `ajeRefKey` mengembalikan null, jadi baris ini tidak ikut
 *  rekonsiliasi AJE (pola yang sama dengan 'SA 530' pada salah saji proyeksi). */
export const ESTIMATE_SAD_AJE_REF = 'SA 540';

/**
 * Registri estimasi → baris SAD turunan (Rp PENUH). Hanya estimasi dengan salah
 * saji ≠ 0 yang menghasilkan baris.
 *
 * Disposisi selalu `uncorrected` DAN TIDAK DAPAT DIUBAH DI SAD — by design.
 * Koreksi atas estimasi dinyatakan dengan MEMINDAHKAN titik manajemen di
 * registri SA 540 (mgmt masuk ke dalam rentang), bukan dengan menekan tombol
 * disposisi. Dengan begitu ledger tak pernah menyatakan "dikoreksi" tanpa ada
 * perubahan estimasi yang mendasarinya.
 *
 * `bsEffect` SENGAJA TIDAK diturunkan: efek neraca sebuah estimasi menuntut
 * deklarasi sisi (aset/liabilitas) DAN klasifikasi lancar/tidak-lancar yang
 * tidak ada di registri — menerkanya akan merusak rasio lancar proyeksi secara
 * senyap. Mekanisme `liquidity.missing` yang sudah ada akan menyebut baris ini
 * dan menahan proyeksi; itu perilaku yang benar.
 */
export function estimateMisstatements(register: Estimate[] | null | undefined): DerivedSadRow[] {
  const list = Array.isArray(register) ? register : [];
  const out: DerivedSadRow[] = [];
  for (const e of list) {
    if (!e || !e.id) continue;
    /* PR-4 — rentang yang berlaku bisa TERDERIVASI dari skenario; `lo`/`hi` yang
       diketik hanya dipakai bila tak ada dasar terhitung. */
    const rng = effectiveRange(e);
    const m = estimateMisstatement(e.mgmt, rng.lo, rng.hi, e.plSign);
    if (!m.amount) continue;
    const full = Math.round(m.amount * JUTA);
    out.push({
      id: ESTIMATE_SAD_PREFIX + e.id,
      desc: 'Selisih estimasi — ' + e.name + ' (titik manajemen di luar rentang auditor)',
      type: 'Judgmental',
      fsli: e.acct || e.name,
      assertion: 'Penilaian',
      initiator: 'SA 540 · registri estimasi',
      pbt: full, na: full,
      origin: 'current',
      disp: 'uncorrected',
      aje: ESTIMATE_SAD_AJE_REF,
      qual: ['estimate'],
      derived: true, estimateId: e.id, basis: m.basis, rangeGrounded: rng.grounded,
    });
  }
  return out;
}
