/* ============================================================
   Asseris — Asersi Manajemen (SA 315) sebagai SUMBER KEBENARAN TUNGGAL
   ------------------------------------------------------------
   Satu taksonomi asersi kanonik (dwi-kategori SA 315 revisi:
   asersi atas KELOMPOK TRANSAKSI/peristiwa vs asersi atas SALDO
   AKUN/pengungkapan). Tiga vocab lama yang tersebar —
     · Inggris  (RiskRow.assertion: Occurrence/Valuation/…)
     · Indonesia (WP_PROCS: Keberadaan/Pisah Batas/…)
     · singkatan (EvRec.asr: E/O · C · V · R&O · CO · P)
   semuanya DIRESOLVE ke id kanonik di sini, sehingga risiko →
   prosedur (WP) → bukti → koreksi (AJE) → kesimpulan dapat
   diagregasi pada satu asersi. Resolver bersifat MURNI & idempoten;
   tidak menyentuh AMS_CANON (fingerprint regresi tetap utuh) —
   dipublikasikan via ESM + canon_selectors (boundary ber-tipe).

   Disambiguasi kategori: label tunggal seperti "Kelengkapan" /
   "Penyajian" relevan baik untuk transaksi maupun saldo. Kategori
   ditentukan dari KELOMPOK AKUN (Pendapatan/Beban → transaksi;
   Aset/Liabilitas/Ekuitas → saldo), sehingga resolusi tetap
   deterministik tanpa memaksa presisi palsu pada data lama.
   ============================================================ */

export type AssertionGroup = 'transaksi' | 'saldo';

export type AssertionId =
  /* asersi atas kelompok transaksi & peristiwa */
  | 'occurrence' | 'completeness_tx' | 'accuracy' | 'cutoff' | 'classification_tx' | 'presentation_tx'
  /* asersi atas saldo akun & pengungkapan */
  | 'existence' | 'rights_obligations' | 'completeness_bal' | 'valuation' | 'classification_bal' | 'presentation_bal';

export interface AssertionDef {
  id: AssertionId;
  /** label Bahasa Indonesia (SA 315) */
  label: string;
  group: AssertionGroup;
  /** kode ringkas untuk kolom matriks */
  abbr: string;
  /** makna satu baris */
  desc: string;
}

/* ---- Taksonomi kanonik (urutan = urutan tampil matriks) ---- */
export const ASSERTIONS: AssertionDef[] = [
  /* transaksi */
  { id: 'occurrence', label: 'Keterjadian', group: 'transaksi', abbr: 'K-jd', desc: 'Transaksi yang dicatat benar-benar terjadi & milik entitas.' },
  { id: 'completeness_tx', label: 'Kelengkapan (transaksi)', group: 'transaksi', abbr: 'Lkp-T', desc: 'Seluruh transaksi yang seharusnya dicatat telah dicatat.' },
  { id: 'accuracy', label: 'Akurasi', group: 'transaksi', abbr: 'Akr', desc: 'Jumlah & data transaksi dicatat dengan tepat.' },
  { id: 'cutoff', label: 'Pisah Batas', group: 'transaksi', abbr: 'P-bts', desc: 'Transaksi dicatat pada periode akuntansi yang benar.' },
  { id: 'classification_tx', label: 'Klasifikasi (transaksi)', group: 'transaksi', abbr: 'Kls-T', desc: 'Transaksi dicatat pada akun yang tepat.' },
  { id: 'presentation_tx', label: 'Penyajian (transaksi)', group: 'transaksi', abbr: 'Pny-T', desc: 'Transaksi diagregasi/diuraikan & diungkapkan secara relevan.' },
  /* saldo */
  { id: 'existence', label: 'Keberadaan', group: 'saldo', abbr: 'Kbr', desc: 'Aset, liabilitas & ekuitas yang dicatat benar-benar ada.' },
  { id: 'rights_obligations', label: 'Hak & Kewajiban', group: 'saldo', abbr: 'H&K', desc: 'Entitas menguasai/memiliki hak atas aset; liabilitas adalah kewajibannya.' },
  { id: 'completeness_bal', label: 'Kelengkapan (saldo)', group: 'saldo', abbr: 'Lkp-S', desc: 'Seluruh saldo yang seharusnya dicatat telah dicatat.' },
  { id: 'valuation', label: 'Akurasi, Penilaian & Alokasi', group: 'saldo', abbr: 'Pnl', desc: 'Saldo dicantumkan pada jumlah yang tepat; penyesuaian penilaian dicatat.' },
  { id: 'classification_bal', label: 'Klasifikasi (saldo)', group: 'saldo', abbr: 'Kls-S', desc: 'Saldo dicatat pada akun yang tepat (lancar/tak lancar, dst).' },
  { id: 'presentation_bal', label: 'Penyajian & Pengungkapan', group: 'saldo', abbr: 'Pny-S', desc: 'Saldo & pengungkapan disajikan, diuraikan & diungkap secara wajar.' },
];

const ASSERTION_BY_ID: Record<AssertionId, AssertionDef> =
  ASSERTIONS.reduce((m, a) => { m[a.id] = a; return m; }, {} as Record<AssertionId, AssertionDef>);

export const assertionDef = (id: AssertionId): AssertionDef => ASSERTION_BY_ID[id];
export const assertionsByGroup = (g: AssertionGroup): AssertionDef[] => ASSERTIONS.filter(a => a.group === g);

/* ---- Resolver: vocab lama (3 dialek) → id kanonik ----
   `norm` mencocokkan string penuh (bukan substring) agar "Penilaian Risiko"
   (prosedur perencanaan, BUKAN asersi) tidak keliru → valuation. */
const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, ' ').trim();

/* Label tak-ambigu kategori → langsung id. */
const DIRECT: Record<string, AssertionId> = {
  'keberadaan': 'existence', 'existence': 'existence', 'e': 'existence',
  'keterjadian': 'occurrence', 'occurrence': 'occurrence', 'o': 'occurrence',
  'hak & kewajiban': 'rights_obligations', 'hak dan kewajiban': 'rights_obligations',
  'rights & obligations': 'rights_obligations', 'rights and obligations': 'rights_obligations', 'r&o': 'rights_obligations',
  'penilaian': 'valuation', 'penilaian & alokasi': 'valuation', 'akurasi, penilaian & alokasi': 'valuation',
  'valuation': 'valuation', 'allocation': 'valuation', 'v': 'valuation',
  'akurasi': 'accuracy', 'accuracy': 'accuracy',
  'pisah batas': 'cutoff', 'cutoff': 'cutoff', 'co': 'cutoff',
};

/* Konsep yang butuh kategori (transaksi vs saldo) untuk disambiguasi. */
type Concept = 'existence_occurrence' | 'completeness' | 'classification' | 'presentation';
const CONCEPT: Record<string, Concept> = {
  'e/o': 'existence_occurrence',
  'kelengkapan': 'completeness', 'completeness': 'completeness', 'c': 'completeness',
  'klasifikasi': 'classification', 'classification': 'classification',
  'penyajian': 'presentation', 'penyajian & pengungkapan': 'presentation', 'pengungkapan': 'presentation',
  'presentation': 'presentation', 'presentation & disclosure': 'presentation', 'disclosure': 'presentation', 'p': 'presentation',
};

const conceptToId = (c: Concept, group: AssertionGroup): AssertionId => {
  switch (c) {
    case 'existence_occurrence': return group === 'transaksi' ? 'occurrence' : 'existence';
    case 'completeness': return group === 'transaksi' ? 'completeness_tx' : 'completeness_bal';
    case 'classification': return group === 'transaksi' ? 'classification_tx' : 'classification_bal';
    case 'presentation': return group === 'transaksi' ? 'presentation_tx' : 'presentation_bal';
  }
};

/** Resolusi satu label asersi (vocab apa pun) → id kanonik, atau `null`
 *  bila bukan asersi (mis. prosedur perencanaan: "Pemahaman"/"Materialitas").
 *  `group` mendisambiguasi label dwi-kategori; default `saldo` bila tak diberi. */
export function resolveAssertion(label: string, group: AssertionGroup = 'saldo'): AssertionId | null {
  if (!label) return null;
  const k = norm(label);
  if (k in DIRECT) return DIRECT[k];
  if (k in CONCEPT) return conceptToId(CONCEPT[k], group);
  return null;
}

/* ---- Kategori asersi dari akun ---- */
/** Kelompok asersi berdasarkan kode akun WTB (4-/5- = transaksi; sisanya saldo). */
export function groupForAccountCode(code: string): AssertionGroup {
  const c = String(code || '')[0];
  return c === '4' || c === '5' ? 'transaksi' : 'saldo';
}
/** Kelompok asersi dari caption kelompok WTB ("Pendapatan"/"Beban" → transaksi). */
export function groupForWtbGroup(g: string): AssertionGroup {
  const s = String(g || '');
  return s.startsWith('Pendapatan') || s.startsWith('Beban') ? 'transaksi' : 'saldo';
}

/* ---- Peta relevansi asersi per lead schedule (SA 315 "relevant assertions") ----
   Bukan semua asersi relevan untuk semua akun. Daftar di bawah = default ber-
   pertimbangan; lead tak terdaftar jatuh ke seluruh asersi kategorinya. */
export const ASSERTION_RELEVANCE: Record<string, AssertionId[]> = {
  /* Aset */
  A: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'cutoff', 'presentation_bal'],            // Kas & setara
  B: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'cutoff', 'presentation_bal'],            // Piutang & ECL
  C: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'cutoff', 'presentation_bal'],            // Persediaan
  D: ['existence', 'completeness_bal', 'valuation', 'presentation_bal'],                                            // Pajak/Biaya dibayar dimuka
  E: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'presentation_bal'],                      // Aset tetap
  EI: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'presentation_bal'],                     // Aset takberwujud
  F: ['existence', 'completeness_bal', 'valuation', 'classification_bal', 'presentation_bal'],                      // Sewa PSAK 73
  G: ['existence', 'valuation', 'presentation_bal'],                                                                // Aset pajak tangguhan
  /* Liabilitas & Ekuitas */
  AA: ['existence', 'completeness_bal', 'rights_obligations', 'valuation', 'cutoff', 'presentation_bal'],           // Utang usaha
  BB: ['completeness_bal', 'rights_obligations', 'valuation', 'classification_bal', 'presentation_bal'],            // Utang bank
  CC: ['completeness_bal', 'valuation', 'cutoff', 'presentation_bal'],                                              // Beban akrual
  DD: ['completeness_bal', 'valuation', 'presentation_bal'],                                                        // Utang pajak
  H: ['completeness_bal', 'valuation', 'presentation_bal'],                                                         // Imbalan kerja
  K: ['existence', 'completeness_bal', 'rights_obligations', 'presentation_bal'],                                   // Ekuitas
  /* Laba rugi (transaksi) */
  R: ['occurrence', 'completeness_tx', 'accuracy', 'cutoff', 'classification_tx', 'presentation_tx'],               // Pendapatan
  S: ['occurrence', 'completeness_tx', 'accuracy', 'cutoff', 'classification_tx'],                                  // BPP
  T: ['occurrence', 'completeness_tx', 'accuracy', 'cutoff', 'classification_tx'],                                  // Beban penjualan
  U: ['occurrence', 'completeness_tx', 'accuracy', 'cutoff', 'classification_tx'],                                  // Beban operasi
  V: ['occurrence', 'completeness_tx', 'accuracy', 'cutoff'],                                                       // Beban keuangan
  W: ['completeness_tx', 'accuracy', 'presentation_tx'],                                                            // Beban pajak
};

/** Asersi relevan untuk satu lead. Lead tak terdaftar → seluruh asersi kategorinya. */
export function relevanceFor(leadRef: string, group: AssertionGroup): AssertionId[] {
  const seed = ASSERTION_RELEVANCE[leadRef];
  if (seed && seed.length) return seed;
  return assertionsByGroup(group).map(a => a.id);
}

/* ============================================================
   Mesin cakupan asersi (PURE) — gabung risiko + prosedur + bukti +
   kesimpulan jadi status per asersi untuk satu lead schedule.
   ============================================================ */
export interface ProcedureInput {
  text: string;
  /** label asersi mentah dari WP_PROCS (vocab apa pun) */
  assertionLabel: string;
  /** status prosedur turunan: Selesai/Pengecualian/Berjalan/Belum/N/A */
  status: string;
  tested?: number;
  total?: number;
}
export interface RiskInput {
  id: string; area: string; assertion: string; inherent: string; fraud: boolean; desc: string;
}
export interface EvidenceInput { tier: number; asr: string[] }
export interface AssertionConclInput { result?: string; concl?: string; by?: string; at?: string }

export type AssertionStatus = 'gap' | 'planned' | 'in-progress' | 'exception' | 'concluded';

export interface AssertionCell {
  assertion: AssertionDef;
  relevant: boolean;
  risks: RiskInput[];
  procedures: ProcedureInput[];
  evidenceCount: number;
  /** rata-rata tier bukti (1..5) yang ber-tag asersi ini; 0 bila tak ada */
  apprAvg: number;
  status: AssertionStatus;
  /** kesimpulan eksplisit auditor (judgment) bila ada */
  concl: string;
  /** auditor telah menandai kesimpulan (bersih/pengecualian) secara eksplisit */
  signedOff: boolean;
}

export interface LeadAssertionCoverage {
  leadRef: string;
  group: AssertionGroup;
  cells: AssertionCell[];
  relevantCount: number;
  /** relevan & punya ≥1 prosedur */
  coveredCount: number;
  concludedCount: number;
  /** relevan tetapi tanpa prosedur (gap) */
  gapCount: number;
  exceptionCount: number;
}

export interface CoverageInput {
  leadRef: string;
  group: AssertionGroup;
  procedures: ProcedureInput[];
  risks: RiskInput[];
  evidence?: EvidenceInput[];
  /** kesimpulan per asersi (wpState.asrConcl) — keyed by AssertionId */
  concl?: Record<string, AssertionConclInput>;
}

/** Status turunan satu sel dari prosedurnya (sebelum override kesimpulan eksplisit). */
function derivedStatus(procs: ProcedureInput[], relevant: boolean): AssertionStatus {
  if (!procs.length) return relevant ? 'gap' : 'planned';
  if (procs.some(p => p.status === 'Pengecualian')) return 'exception';
  const done = procs.filter(p => p.status === 'Selesai').length;
  const inactive = procs.every(p => p.status === 'Selesai' || p.status === 'N/A');
  if (done > 0 && inactive) return 'concluded';
  if (procs.some(p => p.status === 'Selesai' || p.status === 'Berjalan')) return 'in-progress';
  return 'planned';
}

/** Cakupan asersi satu lead schedule (lihat header modul). */
export function assertionCoverage(input: CoverageInput): LeadAssertionCoverage {
  const { leadRef, group } = input;
  const procedures = input.procedures || [];
  const risks = input.risks || [];
  const evidence = input.evidence || [];
  const concl = input.concl || {};

  const relevant = relevanceFor(leadRef, group);
  const relevantSet = new Set<AssertionId>(relevant);

  /* bucket prosedur/risiko/bukti ke id asersi */
  const procBy = new Map<AssertionId, ProcedureInput[]>();
  procedures.forEach(p => {
    const id = resolveAssertion(p.assertionLabel, group);
    if (!id) return;
    (procBy.get(id) || procBy.set(id, []).get(id)!).push(p);
  });
  const riskBy = new Map<AssertionId, RiskInput[]>();
  risks.forEach(r => {
    const id = resolveAssertion(r.assertion, group);
    if (!id) return;
    (riskBy.get(id) || riskBy.set(id, []).get(id)!).push(r);
  });
  const evBy = new Map<AssertionId, number[]>();
  evidence.forEach(e => (e.asr || []).forEach(code => {
    const id = resolveAssertion(code, group);
    if (!id) return;
    (evBy.get(id) || evBy.set(id, []).get(id)!).push(e.tier || 0);
  }));

  /* id yang ditampilkan = relevan ∪ punya prosedur ∪ punya risiko */
  const ids = new Set<AssertionId>(relevant);
  procBy.forEach((_, id) => ids.add(id));
  riskBy.forEach((_, id) => ids.add(id));

  /* urutkan menurut urutan taksonomi kanonik */
  const ordered = ASSERTIONS.filter(a => ids.has(a.id));

  const cells: AssertionCell[] = ordered.map(def => {
    const procs = procBy.get(def.id) || [];
    const cellRisks = riskBy.get(def.id) || [];
    const tiers = evBy.get(def.id) || [];
    const apprAvg = tiers.length ? tiers.reduce((a, b) => a + b, 0) / tiers.length : 0;
    const isRelevant = relevantSet.has(def.id);

    const c = concl[def.id];
    const signedOff = !!(c && (c.result === 'clean' || c.result === 'exception'));
    let status: AssertionStatus = derivedStatus(procs, isRelevant);
    if (c && c.result === 'exception') status = 'exception';
    else if (c && c.result === 'clean') status = 'concluded';

    return {
      assertion: def, relevant: isRelevant, risks: cellRisks, procedures: procs,
      evidenceCount: tiers.length, apprAvg, status,
      concl: (c && c.concl) || '', signedOff,
    };
  });

  const relevantCount = relevant.length;
  const coveredCount = cells.filter(c => c.relevant && c.procedures.length > 0).length;
  const concludedCount = cells.filter(c => c.relevant && c.status === 'concluded').length;
  const gapCount = cells.filter(c => c.relevant && c.procedures.length === 0).length;
  const exceptionCount = cells.filter(c => c.status === 'exception').length;

  return { leadRef, group, cells, relevantCount, coveredCount, concludedCount, gapCount, exceptionCount };
}

/* Label ringkas status untuk UI (badge). */
export const ASSERTION_STATUS_META: Record<AssertionStatus, { l: string; k: string }> = {
  gap: { l: 'Belum Ditanggapi', k: 'red' },
  planned: { l: 'Direncanakan', k: 'gray' },
  'in-progress': { l: 'Berjalan', k: 'amber' },
  exception: { l: 'Pengecualian', k: 'red' },
  concluded: { l: 'Disimpulkan', k: 'green' },
};
