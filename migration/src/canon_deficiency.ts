/* ============================================================
   Asseris — Defisiensi Pengendalian (SA 265) + Komunikasi Tata
   Kelola (SA 260) sebagai SUMBER KEBENARAN TUNGGAL.
   ------------------------------------------------------------
   Model severity SA 265 (klasifikasi 2×2 magnitudo×kemungkinan,
   diturunkan kontrol kompensasi) semula tertanam inline di
   view_icfr.tsx. Diangkat ke sini agar:
     1. view_icfr (tab Evaluasi Defisiensi) & view_final3
        (Management Letter) berbagi SATU model — tak ada duplikasi.
     2. Management Letter dapat MEREKONSILIASI register defisiensi
        terhadap surat manajemen: setiap defisiensi Signifikan /
        Kelemahan Material WAJIB dikomunikasikan tertulis ke TCWG
        (SA 265.9) → cek apakah ia masuk surat FINAL. Sekaligus
        temuan signifikan (SA 260) yang belum difinalkan diangkat.
   Murni & deterministik; tanpa React/efek-samping.
   ============================================================ */

export type DefLevel = 'Defisiensi Pengendalian' | 'Defisiensi Signifikan' | 'Kelemahan Material';

/** urutan = indeks severity (0..2) */
export const LEVELS: DefLevel[] = ['Defisiensi Pengendalian', 'Defisiensi Signifikan', 'Kelemahan Material'];
export const LEVEL_KIND: Record<DefLevel, string> = {
  'Defisiensi Pengendalian': 'gray',
  'Defisiensi Signifikan': 'amber',
  'Kelemahan Material': 'red',
};

/** Klasifikasi severity SA 265: magnitudo × kemungkinan, diturunkan bila ada kontrol kompensasi efektif. */
export function classifyDeficiency(mag: string, lik: string, comp: boolean): DefLevel {
  let lvl = (mag === 'Material' && lik === 'Wajar mungkin') ? 2 : (mag === 'Material' || lik === 'Wajar mungkin') ? 1 : 0;
  if (comp) lvl = Math.max(0, lvl - 1); // kontrol kompensasi efektif menurunkan severity
  return LEVELS[lvl];
}

/** Kewajiban komunikasi per level (SA 265.9 / .10). */
export const COMMS: Record<DefLevel, { who: string; ref: string; resp: string; icon: string; kind: string }> = {
  'Kelemahan Material': { who: 'Tertulis ke TCWG + Manajemen', ref: 'SA 265.9', resp: 'Perluas prosedur substantif; pertimbangkan dampak laporan; tautkan ke SAD.', icon: 'mail', kind: 'red' },
  'Defisiensi Signifikan': { who: 'Tertulis ke TCWG', ref: 'SA 265.9', resp: 'Rancang prosedur substantif responsif; cantumkan di management letter.', icon: 'mail', kind: 'amber' },
  'Defisiensi Pengendalian': { who: 'Management letter (pertimbangan profesional)', ref: 'SA 265.10', resp: 'Catat & pantau; dampak substantif terbatas.', icon: 'doc', kind: 'blue' },
};

/** true bila level mensyaratkan komunikasi tertulis ke TCWG (SA 265.9). */
export function requiresTcwg(level: DefLevel): boolean {
  return level === 'Defisiensi Signifikan' || level === 'Kelemahan Material';
}

export interface DefAssessment {
  mag: string;  // 'Imaterial' | 'Material'
  lik: string;  // 'Remote' | 'Wajar mungkin'
  comp: boolean;
  sad?: string;
  cmp?: string;
}

export interface Deficiency {
  id: string;
  src: string;
  desc: string;
  kind: string; // 'Rancangan' | 'Operasi'
}

/* ---- Register defisiensi kanonik (dari matriks RCM + ITGC ICFR) ---- */
export const DEFICIENCIES: Deficiency[] = [
  { id: 'R-03', src: 'Pendapatan & Piutang', desc: 'Review bulanan aging piutang oleh Finance Controller', kind: 'Operasi' },
  { id: 'I-02', src: 'Persediaan', desc: 'Review keusangan & perhitungan NRV persediaan', kind: 'Rancangan' },
  { id: 'F-01', src: 'Pelaporan Keuangan', desc: 'Review jurnal manual oleh Financial Controller sebelum posting', kind: 'Operasi' },
  { id: 'ITGC-SoD', src: 'ITGC · Akses', desc: 'Segregation of Duties — kombinasi role konflik pada ERP (buat & setujui PO/pembayaran).', kind: 'Rancangan' },
];

/* ---- Seed penilaian per defisiensi (magnitudo/kemungkinan/kompensasi) ---- */
export const DEFAULT_DEF_A: DefAssessment = { mag: 'Material', lik: 'Wajar mungkin', comp: false, sad: '—', cmp: '—' };
export const DEF_SEED: Record<string, DefAssessment> = {
  'R-03': { mag: 'Material', lik: 'Wajar mungkin', comp: true, sad: 'SAD-04', cmp: 'Rekonsiliasi sub-ledger bulanan (R-04) sebagian memitigasi.' },
  'I-02': { mag: 'Material', lik: 'Wajar mungkin', comp: false, sad: 'SAD-07', cmp: 'Tidak ada kontrol kompensasi efektif atas penilaian NRV.' },
  'F-01': { mag: 'Material', lik: 'Remote', comp: false, sad: 'SAD-02', cmp: 'Rekonsiliasi akun (F-02) memberi keyakinan terbatas.' },
  'ITGC-SoD': { mag: 'Imaterial', lik: 'Wajar mungkin', comp: true, sad: 'SAD-05', cmp: 'Reviu detektif manual atas transaksi konflik role.' },
};

/* ---- Tautan eksplisit defisiensi → temuan management letter (id) ----
   ITGC-SoD tak ditautkan: Defisiensi Pengendalian (tak wajib TCWG) & tak
   ada temuan ML khusus SoD ERP pada seed. */
export const DEFICIENCY_ML_LINK: Record<string, string> = {
  'I-02': 'ML-01',
  'R-03': 'ML-03',
  'F-01': 'ML-02',
};

/* ---- bentuk hasil rekonsiliasi ---- */
export interface MlFindingLite {
  id: string;
  stage: string; // 'draft' | 'diskusi' | 'final' | 'tuntas'
  sev?: string;  // 'Significant' | 'Deficiency' | 'Observation'
  title?: string;
}

export interface GovCommRow {
  defId: string;
  src: string;
  desc: string;
  level: DefLevel;
  requiresTcwg: boolean;
  commRef: string;
  mlId?: string;
  mlStage?: string;
  /** tertaut ke temuan ML berstatus final */
  communicated: boolean;
  /** Signifikan+ tapi belum di surat final → pelanggaran kelengkapan SA 265.9 */
  isGap: boolean;
}

export interface PendingFinding { id: string; title?: string; stage: string; }

export interface GovCommRollup {
  totalDef: number;
  requiresTcwgCount: number;
  communicatedCount: number;
  /** Signifikan+ belum dikomunikasikan ke surat final */
  defGaps: number;
  /** temuan signifikan (SA 260) belum difinalkan (draft/diskusi) */
  pendingSignificant: number;
}

export interface GovCommResult {
  rows: GovCommRow[];
  pendingFindings: PendingFinding[];
  rollup: GovCommRollup;
}

/* ============================================================
   reconcileGovernanceComms — register defisiensi ↔ surat manajemen.
     · per defisiensi: level severity (seed) → wajib TCWG? →
       tertaut temuan ML final? → gap bila wajib tapi belum final.
     · plus: temuan ML signifikan (SA 260) yang belum difinalkan.
   ============================================================ */
export function reconcileGovernanceComms(input: {
  deficiencies: Deficiency[];
  defSeed: Record<string, DefAssessment>;
  links: Record<string, string>;
  mlFindings: MlFindingLite[];
}): GovCommResult {
  const { deficiencies, defSeed, links, mlFindings } = input;
  const mlById = new Map<string, MlFindingLite>();
  mlFindings.forEach(f => mlById.set(f.id, f));

  const rows: GovCommRow[] = deficiencies.map(d => {
    const a = defSeed[d.id] || DEFAULT_DEF_A;
    const level = classifyDeficiency(a.mag, a.lik, a.comp);
    const need = requiresTcwg(level);
    const mlId = links[d.id];
    const ml = mlId ? mlById.get(mlId) : undefined;
    const communicated = !!ml && ml.stage === 'final';
    return {
      defId: d.id, src: d.src, desc: d.desc,
      level, requiresTcwg: need, commRef: COMMS[level].ref,
      mlId, mlStage: ml ? ml.stage : undefined,
      communicated, isGap: need && !communicated,
    };
  });

  const pendingFindings: PendingFinding[] = mlFindings
    .filter(f => f.sev === 'Significant' && (f.stage === 'draft' || f.stage === 'diskusi'))
    .map(f => ({ id: f.id, title: f.title, stage: f.stage }));

  const rollup: GovCommRollup = {
    totalDef: rows.length,
    requiresTcwgCount: rows.filter(r => r.requiresTcwg).length,
    communicatedCount: rows.filter(r => r.requiresTcwg && r.communicated).length,
    defGaps: rows.filter(r => r.isGap).length,
    pendingSignificant: pendingFindings.length,
  };

  return { rows, pendingFindings, rollup };
}
