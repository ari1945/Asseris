/* ============================================================
   Asseris — PSAK 48 · asumsi nilai pakai (value-in-use) yang dapat
             dikemudikan auditor  ·  TIER B
   ------------------------------------------------------------
   Modul MURNI. Mesin DCF-nya sendiri (`valueInUse`, canon_part2) TIDAK
   disentuh — matematikanya sudah benar & teruji. Yang kurang selama ini
   adalah KEMUDINYA: `P48` adalah konstanta modul, sementara UI
   menampilkan `p48.params.wacc` seolah-olah asumsi audit.

   Akibatnya, bila auditor menyimpulkan tingkat diskonto yang wajar adalah
   14,5% dan bukan 13,5%, ia tidak punya cara menyatakannya di dalam
   aplikasi — padahal pada headroom yang tipis, pergeseran itu dapat
   membalik kesimpulan dari "tidak ada penurunan nilai" menjadi ada.

   ------------------------------------------------------------
   BATAS TIER B (PRD prd-estimasi-terfalsifikasi §5)
   ------------------------------------------------------------
   Hasilnya adalah **ekspektasi independen auditor** (SA 540 ¶21(b)) —
   BUKAN "nilai wajar". Yang dibuka hanyalah lima parameter dari mesin
   yang sudah ada; tidak ada model baru, tidak ada data pasar berlisensi.

   ------------------------------------------------------------
   KONTRAK PENOLAKAN
   ------------------------------------------------------------
   Override yang tak koheren DITOLAK, bukan dijepit diam-diam ke nilai
   "aman". Menjepit akan menghasilkan angka yang tampak wajar dari asumsi
   yang tak pernah dimaksudkan auditor — persis kelas cacat yang ditutup
   arc ini. Penolakan wajib terbaca di UI.
     · severity 'reject' → override diabaikan (sebagian atau seluruhnya)
     · severity 'warn'   → override DIPAKAI, tetapi disurfacekan
   ============================================================ */

export interface ViuParams {
  /** tingkat diskonto (WACC), desimal — 0,135 = 13,5% */
  wacc: number;
  /** pertumbuhan arus kas selama periode eksplisit, desimal */
  growth: number;
  /** pertumbuhan terminal, desimal — harus DI BAWAH wacc */
  terminal: number;
  /** panjang periode proyeksi eksplisit (tahun) */
  years: number;
  /** arus kas tahun-1 (Rp juta) */
  cf1: number;
}

export type ViuField = keyof ViuParams;
export type ViuSeverity = 'reject' | 'warn';
export interface ViuIssue { field: ViuField | 'model'; severity: ViuSeverity; msg: string }

export interface ViuSanitized {
  params: ViuParams;
  issues: ViuIssue[];
  /** field yang BERBEDA dari basis setelah sanitasi — dasar jejak "diubah auditor" */
  overridden: ViuField[];
  /** true bila ada issue 'reject' */
  rejected: boolean;
}

/** PSAK 48 ¶33 — periode proyeksi eksplisit lazimnya maksimum 5 tahun; di atas
 *  itu diizinkan tetapi harus dapat dibenarkan. Batas keras semata penjaga waras. */
export const VIU_YEARS_MAX = 20;
/** Selisih WACC−terminal di bawah ini membuat nilai terminal amat sensitif. */
export const VIU_SPREAD_WARN = 0.01;

const PCT_FIELDS: ViuField[] = ['wacc', 'growth', 'terminal'];

function finite(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

/**
 * Gabungkan override auditor ke atas basis, tolak yang tak koheren.
 *
 * Basis SELALU menjadi jaring: field yang tak di-override, di-override dengan
 * nilai tak sah, atau ditolak akibat pelanggaran model, kembali ke basis.
 */
export function sanitizeViuParams(base: ViuParams, override?: Partial<ViuParams> | null): ViuSanitized {
  const issues: ViuIssue[] = [];
  const next: ViuParams = { ...base };
  const ov = override || {};

  for (const f of PCT_FIELDS) {
    const v = ov[f];
    if (v === undefined || v === null) continue;
    if (!finite(v)) {
      issues.push({ field: f, severity: 'reject', msg: 'Bukan angka — memakai nilai basis.' });
      continue;
    }
    if (v <= -1 || v >= 1) {
      issues.push({ field: f, severity: 'reject', msg: 'Di luar rentang wajar (−100%..100%) — memakai nilai basis.' });
      continue;
    }
    next[f] = v;
  }

  if (ov.years !== undefined && ov.years !== null) {
    const y = Math.round(Number(ov.years));
    if (!finite(y) || y < 1 || y > VIU_YEARS_MAX) {
      issues.push({ field: 'years', severity: 'reject', msg: `Periode proyeksi harus 1–${VIU_YEARS_MAX} tahun — memakai nilai basis.` });
    } else {
      next.years = y;
    }
  }

  if (ov.cf1 !== undefined && ov.cf1 !== null) {
    if (!finite(ov.cf1)) {
      issues.push({ field: 'cf1', severity: 'reject', msg: 'Bukan angka — memakai nilai basis.' });
    } else {
      next.cf1 = ov.cf1;
    }
  }

  /* Aturan model: nilai terminal = CF/(wacc − g). Bila wacc ≤ g, deret tak
     konvergen — nilai pakainya tak bermakna. Seluruh override digugurkan agar
     angka yang tampil tak pernah berasal dari asumsi yang mustahil. */
  if (next.wacc <= next.terminal) {
    issues.push({
      field: 'model', severity: 'reject',
      msg: 'Tingkat diskonto harus MELEBIHI pertumbuhan terminal; nilai terminal tidak konvergen. Seluruh override diabaikan.',
    });
    return { params: { ...base }, issues, overridden: [], rejected: true };
  }

  const spread = next.wacc - next.terminal;
  if (spread < VIU_SPREAD_WARN) {
    issues.push({
      field: 'model', severity: 'warn',
      msg: `Selisih diskonto−pertumbuhan hanya ${(spread * 100).toFixed(2)} pp — nilai terminal sangat sensitif; pertimbangkan sebagai Hal Audit Utama (SA 701).`,
    });
  }

  const overridden = (Object.keys(next) as ViuField[]).filter(f => next[f] !== base[f]);
  return { params: next, issues, overridden, rejected: issues.some(i => i.severity === 'reject') };
}

/** Apakah override bermakna (ada field yang benar-benar berbeda dari basis). */
export function viuIsOverridden(base: ViuParams, override?: Partial<ViuParams> | null): boolean {
  return sanitizeViuParams(base, override).overridden.length > 0;
}
