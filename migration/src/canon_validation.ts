/* ============================================================
   Asseris — Validasi & Guardrail Input (Fase 4 · PR-B)  [PURE, ESM]
   ------------------------------------------------------------
   Guard input deklaratif yang dipakai bersama form (pola AJEForm/
   firmgl JV). PURE (tak menyentuh AMS_CANON) — sejalan canon_assertions/
   canon_capacity/canon_delivery. Menutup gap P6 (validasi tipis) untuk:
   probabilitas 0–100, urutan tanggal (jatuh tempo ≥ terbit), jam vs
   kapasitas. Linkage silang (risiko→prosedur) memakai
   reconcileRiskResponse (canon_audit_plan) yang sudah ada.
   ============================================================ */

/* Probabilitas peluang harus 0–100%. */
export function probError(n: number): string | null {
  if (!Number.isFinite(n)) return 'Probabilitas harus berupa angka.';
  if (n < 0 || n > 100) return 'Probabilitas harus di rentang 0–100%.';
  return null;
}
export const clampPct = (n: number): number => Math.max(0, Math.min(100, Math.round(n)));

/* Urutan tanggal faktur: jatuh tempo tidak boleh sebelum tanggal terbit. */
export function dueBeforeIssued(issued: string, due: string): boolean {
  if (!issued || !due) return false;
  return new Date(due + 'T00:00:00').getTime() < new Date(issued + 'T00:00:00').getTime();
}

/* Proyeksi alokasi jam anggota bila ditambah addHrs — untuk memperingatkan
   over-booking di form (sebelumnya hanya tampil setelah booking). */
export interface CapacityProjection { projected: number; over: boolean; overBy: number; pct: number }
export function capacityProjection(usedHrs: number, capacity: number, addHrs: number): CapacityProjection {
  const projected = usedHrs + Math.max(0, addHrs || 0);
  const over = capacity > 0 && projected > capacity;
  return {
    projected,
    over,
    overBy: Math.max(0, projected - capacity),
    pct: capacity > 0 ? Math.round((projected / capacity) * 100) : 0,
  };
}

/* ------------------------------------------------------------
   Validasi silang SA 265 → SA 260 (defisiensi signifikan → TCWG).
   Derivasi murni dari dua SSOT yang sudah ada (tanpa flag baru):
   - register defisiensi (deficiencies.v1): `sig` + `status`;
   - matriks komunikasi TCWG (tcwg.v1): status baris "Temuan
     signifikan dari audit" (SA 260 ¶16), diteruskan pemanggil.
   SA 265 ¶9 mewajibkan defisiensi signifikan dikomunikasikan
   TERTULIS ke TCWG; SA 260 ¶16 mewajibkan temuan signifikan
   (termasuk defisiensi signifikan) disampaikan ke TCWG. Guardrail
   menutup celah: klasifikasi signifikan yang di-set "Lisan"
   (langgar ¶9) & defisiensi signifikan yang belum selesai
   dilaporkan di SA 260. ------------------------------------------------------------ */
/* Bentuk komunikasi tertulis ke TCWG — harus sinkron dengan DEFIC_COMM di view_sa2comm. */
export const DEFIC_WRITTEN = 'Tertulis ke TCWG';
/* Status baris matriks SA 260 yang menandai komunikasi telah tuntas. */
export const TCWG_FINDINGS_DONE = 'Selesai';

export interface DeficiencyCommRow { id: string; sig: boolean; status: string }
export interface DeficiencyCommResult {
  total: number;
  sig: number;
  misclassified: string[]; // signifikan tetapi tidak ditandai "Tertulis ke TCWG" (¶9)
  tcwgReported: boolean;   // SA 260 ¶16 sudah "Selesai"
  tcwgPending: boolean;    // ada defisiensi signifikan tetapi SA 260 ¶16 belum selesai
  coveragePct: number;     // % defisiensi signifikan yang tepat ditandai tertulis (100 bila sig=0)
  issues: number;          // total titik yang perlu ditindaklanjuti
}

export function reconcileDeficiencyComm(input: {
  deficiencies: DeficiencyCommRow[];
  sigFindingsStatus?: string;
}): DeficiencyCommResult {
  const list = input.deficiencies || [];
  const sigList = list.filter(d => d && d.sig);
  const misclassified = sigList.filter(d => (d.status || '').trim() !== DEFIC_WRITTEN).map(d => d.id);
  const written = sigList.length - misclassified.length;
  const tcwgReported = (input.sigFindingsStatus || '').trim() === TCWG_FINDINGS_DONE;
  const tcwgPending = sigList.length > 0 && !tcwgReported;
  return {
    total: list.length,
    sig: sigList.length,
    misclassified,
    tcwgReported,
    tcwgPending,
    coveragePct: sigList.length ? Math.round((written / sigList.length) * 100) : 100,
    issues: misclassified.length + (tcwgPending ? 1 : 0),
  };
}

/* ------------------------------------------------------------
   SA 450 — Salah saji tidak dikoreksi: rekonsiliasi 3-arah.
   Menutup split-brain antara TIGA SSOT yang selama ini terputus:
   (1) register jurnal AMS.AJE (status Posted=dikoreksi / Proposed=usulan
       belum diposting = tidak dikoreksi);
   (2) ledger SAD SA 450 (sadItems.v1: disp corrected/uncorrected/passed —
       populasi terlengkap; memuat pula salah saji Projected/sampling &
       carryover tahun lalu yang bukan jurnal);
   (3) opini (opinionDoc.v1.type — SA 705).
   Derivasi MURNI dari data (tanpa flag baru). Tiga cek:
   - completeness: AJE Proposed tanpa representasi di ledger SAD
     (agregat SA 450 understated);
   - staleness: disposisi SAD bertentangan dgn status posting AJE
     (SAD "dikoreksi" padahal AJE masih usulan, atau sebaliknya);
   - konsistensi SA 450→705: agregat uncorrected (SSOT SAD) > materialitas
     keseluruhan tetapi opini masih "tanpa modifikasian" (SA 705.7/.8).
   ------------------------------------------------------------ */
export const AJE_POSTED = 'Posted';
export const AJE_PROPOSED = 'Proposed';
export const SAD_UNCORRECTED = 'uncorrected';
export const SAD_CORRECTED = 'corrected';
export const OPINION_UNMODIFIED = 'unmodified';

export interface AjeEntry { id: string; status?: string; amount?: number }
export interface SadEntry { id: string; disp?: string; aje?: string; pbt?: number; na?: number; origin?: string; qual?: string[] }

/* Normalisasi ref `aje` di ledger SAD → id jurnal AMS.AJE (AJE-NN).
   'PAJE-03' (proposed AJE) & 'AJE-03' sama-sama merujuk jurnal AJE-03;
   ref non-jurnal ('SA 530', 'SUM-PY', 'CTT') → null (proyeksi/carryover/remeh,
   memang bukan jurnal — dikecualikan dari rekonsiliasi AJE). */
export function ajeRefKey(ref: string): string | null {
  const m = /^P?AJE-0*(\d+)$/i.exec((ref || '').trim());
  return m ? 'AJE-' + m[1].padStart(2, '0') : null;
}

export interface UncorrStale { sadId: string; ajeId: string; sadDisp: string; ajeStatus: string; reason: string }
export interface UncorrResult {
  proposed: number;              // jumlah AJE berstatus Proposed (tidak dikoreksi di jurnal)
  missingFromSad: string[];      // id AJE Proposed tanpa item di ledger SAD (understate agregat)
  stale: UncorrStale[];          // disposisi SAD bertentangan dgn status posting AJE
  aggNet: number;                // agregat neto (bertanda) uncorrected dari SAD
  aggAbs: number;
  om: number;
  pctOfOm: number;
  exceedsOm: boolean;
  qualFlags: string[];           // faktor kualitatif (SA 450.A21) pada item uncorrected
  opinionType: string;
  opinionModified: boolean;
  opinionInconsistent: boolean;  // agregat > OM tetapi opini belum dimodifikasi (SA 705)
  issues: number;                // titik objektif yang perlu ditindaklanjuti
}

export function reconcileUncorrectedMisstatements(input: {
  aje: AjeEntry[];
  sad: SadEntry[];
  om: number;
  opinionType: string;
  method?: string;
}): UncorrResult {
  const aje = input.aje || [];
  const sad = input.sad || [];
  const method = input.method === 'ironcurtain' ? 'ironcurtain' : 'rollover';

  // indeks item SAD menurut id jurnal terselesaikan (bisa >1 item per id)
  const sadByAje = new Map<string, SadEntry[]>();
  for (const s of sad) {
    const k = ajeRefKey(s.aje || '');
    if (!k) continue;
    const arr = sadByAje.get(k) || [];
    arr.push(s);
    sadByAje.set(k, arr);
  }

  const proposedAje = aje.filter(a => a && (a.status || '').trim() === AJE_PROPOSED);
  const postedIds = new Set(aje.filter(a => (a.status || '').trim() === AJE_POSTED).map(a => a.id));
  const proposedIds = new Set(proposedAje.map(a => a.id));

  // completeness — AJE Proposed tanpa item SAD sama sekali
  const missingFromSad = proposedAje.filter(a => !sadByAje.has(a.id)).map(a => a.id);

  // staleness — disposisi SAD bertentangan dgn status posting jurnal
  const stale: UncorrStale[] = [];
  sadByAje.forEach((items, ajeId) => {
    for (const s of items) {
      const disp = (s.disp || '').trim();
      if (postedIds.has(ajeId) && disp === SAD_UNCORRECTED) {
        stale.push({ sadId: s.id, ajeId, sadDisp: disp, ajeStatus: AJE_POSTED, reason: 'AJE sudah diposting (dikoreksi) tetapi SAD menandai tidak dikoreksi' });
      } else if (proposedIds.has(ajeId) && disp === SAD_CORRECTED) {
        stale.push({ sadId: s.id, ajeId, sadDisp: disp, ajeStatus: AJE_PROPOSED, reason: 'SAD menandai dikoreksi tetapi AJE belum diposting (masih usulan)' });
      }
    }
  });

  // agregat uncorrected dari ledger SAD (populasi SA 450 terlengkap)
  const uncorr = sad.filter(s => (s.disp || '').trim() === SAD_UNCORRECTED);
  const inScope = method === 'ironcurtain' ? uncorr : uncorr.filter(s => (s.origin || 'current') === 'current');
  const aggNet = inScope.reduce((t, s) => t + (method === 'ironcurtain' ? (s.na || 0) : (s.pbt || 0)), 0);
  const aggAbs = Math.abs(aggNet);
  const om = input.om > 0 ? input.om : 0;
  const exceedsOm = om > 0 && aggAbs > om;
  const qualFlags = [...new Set(inScope.flatMap(s => s.qual || []))];

  const opinionType = (input.opinionType || OPINION_UNMODIFIED).trim();
  const opinionModified = opinionType !== OPINION_UNMODIFIED;
  const opinionInconsistent = exceedsOm && !opinionModified;

  return {
    proposed: proposedAje.length,
    missingFromSad,
    stale,
    aggNet, aggAbs, om,
    pctOfOm: om > 0 ? Math.round((aggAbs / om) * 100) : 0,
    exceedsOm,
    qualFlags,
    opinionType,
    opinionModified,
    opinionInconsistent,
    issues: missingFromSad.length + stale.length + (opinionInconsistent ? 1 : 0),
  };
}

/* ------------------------------------------------------------
   SA 705 — konsistensi opini yang diterapkan vs determinan.
   Guardrail level-modul (persisten, di luar panel Penentuan): opini
   TERSIMPAN (opinionDoc.v1.type) direkonsiliasi dgn rekomendasi determinan
   (recommendOpinion, dihitung view dari salah saji/lingkup/GC) + kelengkapan
   laporan. Menutup celah: opini diterapkan lebih ringan dari yang diimplikasikan
   (under-modification), opini modifikasian tanpa paragraf Basis (SA 705.20),
   ketidakpastian material GC tanpa seksi khusus (SA 570.22), dan — paling
   kritis — laporan DIFINALISASI padahal masih inkonsisten (gerbang mutu).
   PURE: rekomendasi diterima sebagai input (tanpa menduplikasi matriks SA 705). ------------------------------------------------------------ */
export const OPINION_LEVEL: Record<string, number> = { unmodified: 0, qualified: 1, adverse: 2, disclaimer: 2 };
export const OPINION_LABEL: Record<string, string> = {
  unmodified: 'Tanpa Modifikasian (WTP)',
  qualified: 'Wajar Dengan Pengecualian (WDP)',
  adverse: 'Tidak Wajar (TW)',
  disclaimer: 'Tidak Menyatakan Opini (TMO)',
};
const opLabel = (t: string): string => OPINION_LABEL[t] || t;

export interface OpinionIssue { code: string; severe: boolean; text: string }
export interface OpinionConsistencyResult {
  appliedType: string;
  recommendedType: string;
  diverges: boolean;
  underModified: boolean;   // opini diterapkan LEBIH RINGAN dari rekomendasi (risiko material tak tercermin)
  overModified: boolean;    // opini diterapkan lebih berat dari rekomendasi
  issues: OpinionIssue[];
  severe: boolean;          // ada isu berat (under-mod / basis hilang / GC hilang / finalisasi inkonsisten)
  count: number;
}

export function reconcileOpinionConsistency(input: {
  appliedType: string;
  recommendedType: string;
  scope?: string;
  gcStatus?: string;
  gcSectionShown?: boolean;
  basisText?: string;
  finalized?: boolean;
}): OpinionConsistencyResult {
  const applied = (input.appliedType || 'unmodified').trim();
  const recommended = (input.recommendedType || 'unmodified').trim();
  const aLvl = OPINION_LEVEL[applied] ?? 0;
  const rLvl = OPINION_LEVEL[recommended] ?? 0;
  const diverges = applied !== recommended;
  const underModified = aLvl < rLvl;
  const overModified = aLvl > rLvl;
  const issues: OpinionIssue[] = [];

  if (diverges) {
    if (underModified) {
      issues.push({ code: 'under', severe: true, text: `Opini diterapkan "${opLabel(applied)}" lebih ringan dari rekomendasi determinan "${opLabel(recommended)}" — salah saji material / pembatasan lingkup berisiko tak tercermin dalam opini (SA 705.7–10).` });
    } else if (overModified) {
      issues.push({ code: 'over', severe: false, text: `Opini diterapkan "${opLabel(applied)}" lebih berat dari rekomendasi determinan "${opLabel(recommended)}" — pastikan basis modifikasi memang mendukung.` });
    } else {
      issues.push({ code: 'mismatch', severe: false, text: `Jenis opini "${opLabel(applied)}" berbeda dari rekomendasi "${opLabel(recommended)}" meski setingkat — tinjau pemicu (salah saji vs pembatasan ruang lingkup).` });
    }
  }
  if (applied !== 'unmodified' && !(input.basisText || '').trim()) {
    issues.push({ code: 'basis', severe: true, text: 'Opini modifikasian tanpa paragraf Basis — SA 705.20 mewajibkan paragraf "Basis untuk Opini …".' });
  }
  const gc = (input.gcStatus || '').trim();
  if (gc === 'mu' && !input.gcSectionShown) {
    issues.push({ code: 'gc-missing', severe: true, text: 'Ketidakpastian material kelangsungan usaha diungkapkan memadai, namun seksi "Ketidakpastian Material Terkait Kelangsungan Usaha" tidak aktif (SA 570.22).' });
  } else if (input.gcSectionShown && gc !== 'mu') {
    issues.push({ code: 'gc-stray', severe: false, text: 'Seksi Kelangsungan Usaha aktif namun status GC bukan "Ketidakpastian Material" — tinjau relevansi paragraf.' });
  }
  const finalizedInconsistent = !!input.finalized && issues.some(i => i.severe);
  if (finalizedInconsistent) {
    issues.push({ code: 'finalized', severe: true, text: 'Laporan sudah DIFINALISASI namun mengandung inkonsistensi opini di atas — buka finalisasi & perbaiki sebelum penerbitan.' });
  }
  return {
    appliedType: applied,
    recommendedType: recommended,
    diverges,
    underModified,
    overModified,
    issues,
    severe: issues.some(i => i.severe),
    count: issues.length,
  };
}

/* ------------------------------------------------------------
   Validasi silang SA 530 · Salah saji ditoleransi (TM) vs
   Performance Materiality (PM).  [PURE]
   ------------------------------------------------------------
   Dua SSOT yang HARUS rujuk-silang:
   - TM sampel (sampling.v1.params.tm) — di-seed dari PM sekali,
     lalu slider persisten yang bisa digeser independen;
   - PM kanon (AMS_CANON.materiality().pm via canon_selectors),
     satu sumber lintas-modul.
   SA 320 ¶9 & SA 530 ¶7: salah saji ditoleransi untuk suatu
   populasi TIDAK boleh melampaui performance materiality — bila
   TM > PM, penyebut n = (bv·RF)/(TM−EM·EF) membesar → ukuran
   sampel mengecil → bukti kurang → asurans palsu. Guardrail juga
   menutup: proyeksi salah saji ≥ TM namun populasi tetap "diterima"
   (SA 530 ¶A22–A23 / SA 450), dan drift TM jauh di bawah PM
   (over-sampling / inefisiensi — non-severe). Semua nilai Rp juta. ------------------------------------------------------------ */
/* Ambang drift ke bawah yang dianggap material (TM ≤ 85% PM) → catatan efisiensi. */
export const SAMPLING_UNDER_PM_TOL = 0.15;

export interface SamplingToleranceIssue { code: string; severe: boolean; text: string }
export interface SamplingToleranceResult {
  tm: number;
  pm: number | null;
  ratio: number | null;      // TM / PM (null bila PM tak tersedia)
  exceedsPm: boolean;        // TM > PM (defisiensi berat)
  issues: SamplingToleranceIssue[];
  severe: boolean;
  count: number;
}

export function reconcileSamplingTolerance(input: {
  tm: number;
  pm: number | null;
  projectedMisstatement?: number | null;
  accepted?: boolean;        // kesimpulan modul: populasi dapat diterima
  finalized?: boolean;       // kertas kerja SA 530 sudah difinalisasi/ditandatangani
}): SamplingToleranceResult {
  const tm = Number.isFinite(input.tm) ? input.tm : 0;
  const pm = (input.pm != null && Number.isFinite(input.pm)) ? input.pm : null;
  const issues: SamplingToleranceIssue[] = [];
  const ratio = pm && pm > 0 ? tm / pm : null;
  const exceedsPm = pm != null && tm > pm;

  if (pm == null) {
    issues.push({ code: 'pm-missing', severe: false, text: 'Performance materiality belum tersedia (materialitas perikatan/benchmark belum ditetapkan) — TM sampel tidak dapat divalidasi silang terhadap PM (SA 320).' });
  } else {
    if (exceedsPm) {
      issues.push({ code: 'tm-gt-pm', severe: true, text: `Salah saji ditoleransi TM (Rp ${tm.toLocaleString('id-ID')} jt) MELAMPAUI performance materiality PM (Rp ${pm.toLocaleString('id-ID')} jt) — SA 320 ¶9/SA 530 ¶7 melarang TM > PM. Ukuran sampel menjadi terlalu kecil → bukti tidak memadai. Turunkan TM ≤ PM.` });
    } else if (pm > 0 && tm <= pm * (1 - SAMPLING_UNDER_PM_TOL)) {
      issues.push({ code: 'tm-under-pm', severe: false, text: `TM (Rp ${tm.toLocaleString('id-ID')} jt) ≥ ${Math.round(SAMPLING_UNDER_PM_TOL * 100)}% di bawah PM (Rp ${pm.toLocaleString('id-ID')} jt) — sampel mungkin lebih besar dari yang diperlukan (inefisiensi). Pastikan penurunan TM memang disengaja atas pertimbangan risiko.` });
    }
  }

  const proj = (input.projectedMisstatement != null && Number.isFinite(input.projectedMisstatement)) ? input.projectedMisstatement : null;
  if (proj != null && proj >= tm && input.accepted === true) {
    issues.push({ code: 'proj-ge-tm-accepted', severe: true, text: `Proyeksi salah saji (Rp ${proj.toLocaleString('id-ID')} jt) ≥ TM (Rp ${tm.toLocaleString('id-ID')} jt) namun populasi disimpulkan "dapat diterima" — SA 530 ¶A22–A23 menuntut perluasan sampel/prosedur alternatif & salah saji dibawa ke SAD (SA 450).` });
  }

  if (input.finalized && issues.some(i => i.severe)) {
    issues.push({ code: 'finalized', severe: true, text: 'Kertas kerja SA 530 sudah DIFINALISASI namun mengandung inkonsistensi TM/PM berat di atas — buka finalisasi & perbaiki sebelum mengandalkan hasil sampel.' });
  }

  return {
    tm,
    pm,
    ratio,
    exceedsPm,
    issues,
    severe: issues.some(i => i.severe),
    count: issues.length,
  };
}
