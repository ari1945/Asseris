/* ============================================================
   Engagement Cockpit — Status Report tersegel (MURNI, teruji)
   ------------------------------------------------------------
   PR-C-7.

   Ekspor XLSX cockpit menyegel angka. Sebelum arc ini yang tersegel adalah
   angka fabrikasi (bobot jam karangan, progres literal, "WIP" pada tarif
   biaya) — berkas tersegel yang salah lebih buruk daripada tak ada berkas,
   karena ia terlihat seperti bukti.

   Dua hal yang dikerjakan PR ini:

   1. PAYLOAD JADI FUNGSI MURNI. Dulu payload dirakit inline di dalam handler
      tombol, sehingga tak ada satu pun uji yang bisa menyentuhnya: satu-satunya
      cara memeriksanya adalah mengunduh berkasnya. Kini `buildCockpitStatusReport`
      murni → apa yang disegel dapat di-assert.

   2. SETIAP FIGUR MEMBAWA BASISNYA. Berkas tersegel harus berdiri sendiri
      sebagai bukti: pembaca enam bulan lagi tak punya layar untuk dilihat.
      Sheet "Ringkasan" karena itu bukan daftar angka melainkan tabel
      Figur | Nilai | Basis — "WIP @ tarif standar" tak berarti apa-apa tanpa
      "jam aktual × tarif charge-out (WIP_BILL)" di sebelahnya.

   ATURAN: figur yang TAK TERUKUR diekspor sebagai '—', bukan 0. Nol adalah
   pernyataan; tak-terukur bukan.

   Fungsi di berkas ini MURNI: tak menyentuh React/DOM/window/localStorage.
   ============================================================ */
import type { ExportScope } from './export_identity';
import type { CockpitEconomics, CockpitMember, CockpitRiskCoverage } from './cockpit_model';
import type { ProgressBridge } from './cockpit_progress';
import type { CockpitMilestone, EngagementStart } from './cockpit_timeline';

export const NOT_MEASURED = '—';

export type Cell = string | number;

export interface ReportSheet {
  name: string;
  heading: string;
  columns: string[];
  rows: Cell[][];
  colWidths: number[];
}

export interface CockpitReportPayload {
  kind: string;
  scope: ExportScope;
  fileName: string;
  title: string;
  meta: string[];
  sheets: ReportSheet[];
}

export interface ReportPhaseRow {
  phase: string;
  pct: number;
  wpCount: number;
  bud: number;
  tsAct: number;
}

export interface ReportGateCriterion { label: string; met: boolean; detail: string }

export interface CockpitReportInput {
  engagementId: string;
  fy: string;
  clientName: string;
  phase: string;
  verdict: string;
  daysLeft: number;
  burnPct: number;
  /** progres terbukti (%) — sama dengan layar */
  overall: number;
  asserted: number | null;
  bridge: ProgressBridge;
  econ: CockpitEconomics;
  phaseRows: ReportPhaseRow[];
  tsTotal: number;
  untaggedHrs: number;
  start: EngagementStart | null;
  milestones: CockpitMilestone[];
  riskCoverage: CockpitRiskCoverage[];
  gateCriteria: ReportGateCriterion[];
  openNotes: number;
  highOpen: number;
  excTot: number;
}

const num = (v: number | null | undefined): Cell => (v == null ? NOT_MEASURED : Math.round(v));
const pct = (v: number | null | undefined): Cell => (v == null ? NOT_MEASURED : `${Math.round(v)}%`);

/* ---------- sheet 1 · Ringkasan: Figur | Nilai | Basis ---------- */
function sheetRingkasan(i: CockpitReportInput): ReportSheet {
  const b = i.bridge;
  const e = i.econ;
  const rows: Cell[][] = [
    ['Progres terbukti (kertas kerja)', `${i.overall}%`,
      `Σ tonggak terpenuhi ÷ (3 × ${b.total} WP kanonik) — bukti wajib (SA 500) · kesimpulan (SA 230) · sign-off penelaah (SA 220)`],
    ['Progres di-assert manajer', i.asserted == null ? NOT_MEASURED : `${i.asserted}%`,
      'penilaian profesional manajer perikatan (ENGAGEMENTS.progress) — sumber independen, bukan turunan'],
    ['Selisih asersi vs terbukti', b.gapPp == null ? NOT_MEASURED : `${b.gapPp.toFixed(1)} pp`,
      'dinyatakan sebagai satu selisih bernama; TIDAK dipecah karena defisiensi antar-tonggak tumpang tindih'],
    ['Jam anggaran', num(e.budgetHrs),
      e.hasRoster ? 'roster perikatan (FIRMFIN.WIP_ROSTER_ENG)' : 'seed ENGAGEMENTS.budgetHrs — roster belum disiapkan'],
    ['Jam aktual', num(e.actualHrs),
      e.hasRoster ? 'roster (jam pembuka) + timesheet live — SSOT bersama Time & Budget' : 'seed ENGAGEMENTS.actualHrs — roster belum disiapkan'],
    ['Pemakaian anggaran jam', pct(i.burnPct), 'jam aktual ÷ jam anggaran'],
    ['WIP @ tarif standar', num(e.wipStd),
      e.hasRoster ? 'Σ jam aktual × tarif charge-out per peran (FIRMFIN.WIP_BILL) — basis yang sama dengan modul WIP & Realisasi' : 'tak terukur tanpa roster'],
    ['Biaya waktu (aktual)', num(e.timeCost),
      e.hasRoster ? 'Σ jam aktual × tarif biaya per peran (FIRMFIN.WIP_COST)' : 'tak terukur tanpa roster'],
    ['Biaya pada jam anggaran', num(e.budgetCost),
      e.hasRoster ? 'Σ jam anggaran × tarif biaya per peran — dienumerasi per anggota, bukan jam total × tarif blended' : 'tak terukur tanpa roster'],
    ['Fee perikatan', num(e.fee), 'CLIENTS.fee'],
    ['Margin rencana', pct(e.marginPct), '(fee − biaya pada jam anggaran) ÷ fee'],
    ['WIP @ tarif standar vs fee', pct(e.wipVsFeePct), 'WIP charge-out ÷ fee — BUKAN biaya waktu ÷ fee'],
    ['Sisa hari ke tenggat pelaporan', i.daysLeft, 'ENGAGEMENTS.deadline − tanggal hari ini'],
    ['Tanggal mulai perikatan', i.start ? i.start.iso : NOT_MEASURED, i.start ? i.start.label : 'tak ada sumber tanggal mulai'],
    ['Catatan review terbuka', i.openNotes, `berlingkup perikatan ini; ${i.highOpen} berprioritas tinggi`],
    ['Pengecualian prosedur terbuka', i.excTot, 'Σ exc pada prosedur program audit'],
  ];
  return {
    name: 'Ringkasan',
    heading: 'Figur utama + BASIS tiap angka (berkas tersegel harus berdiri sendiri sebagai bukti)',
    columns: ['Figur', 'Nilai', 'Basis / cara hitung'],
    rows,
    colWidths: [34, 18, 86],
  };
}

/* ---------- sheet 2 · Jembatan progres ---------- */
function sheetJembatan(i: CockpitReportInput): ReportSheet {
  const b = i.bridge;
  const rows: Cell[][] = b.rows.map((r) => [r.label, r.sa, `${r.count}/${r.total}`, `+${r.pp.toFixed(1)} pp`]);
  rows.push(['= Progres terbukti', '', '', `${b.provenPct.toFixed(1)}%`]);
  rows.push([
    b.gapPp != null && b.gapPp >= 0 ? 'Asersi manajer yang belum terbukti kertas kerja' : 'Kertas kerja mendahului asersi manajer',
    '', '', b.gapPp == null ? NOT_MEASURED : `${Math.abs(b.gapPp).toFixed(1)} pp`,
  ]);
  return {
    name: 'Jembatan Progres',
    heading: 'Asersi manajer → progres terbukti. Ketiga tonggak MENJUMLAH; selisih tidak dipecah.',
    columns: ['Tonggak', 'Standar', 'Modul', 'Kontribusi'],
    rows,
    colWidths: [44, 12, 12, 16],
  };
}

/* ---------- sheet 3 · Fase ---------- */
function sheetFase(i: CockpitReportInput): ReportSheet {
  const rows: Cell[][] = i.phaseRows.map((p) => [
    p.phase, p.wpCount || NOT_MEASURED, p.wpCount ? `${p.pct}%` : NOT_MEASURED, p.bud, p.tsAct || NOT_MEASURED,
  ]);
  rows.push(['Jam tanpa tag fase (roster pembuka)', NOT_MEASURED, NOT_MEASURED, NOT_MEASURED, i.untaggedHrs]);
  return {
    name: 'Fase',
    heading: `Kelengkapan TERBUKTI per fase. Jam anggaran = MODEL ALOKASI (bobot × total), bukan pengukuran. Jam aktual hanya yang ber-tag fase: ${i.tsTotal} dari ${Math.round(i.econ.actualHrs)}.`,
    columns: ['Fase', 'WP kanonik', 'Terbukti', 'Jam anggaran (model alokasi)', 'Jam ber-tag fase'],
    rows,
    colWidths: [34, 12, 12, 28, 18],
  };
}

/* ---------- sheet 4 · Tim ---------- */
function sheetTim(i: CockpitReportInput): ReportSheet {
  const rows: Cell[][] = i.econ.members.map((m: CockpitMember) => [
    m.name.split(',')[0], m.grade, m.bill, m.cost, Math.round(m.budget), Math.round(m.actual),
    `${m.util}%`, m.firmUtil == null ? NOT_MEASURED : `${m.firmUtil}%`,
    m.wpPrep, m.wpRev, m.procPrep, m.procRev,
  ]);
  return {
    name: 'Tim',
    heading: i.econ.hasRoster
      ? 'Beban tim dari roster + timesheet (SSOT Time & Budget). Utilisasi PERIKATAN dan utilisasi FIRMA adalah dua ukuran berbeda.'
      : 'Roster jam belum disiapkan — beban per anggota TAK TERUKUR (bukan nol).',
    columns: ['Anggota', 'Grade', 'Tarif charge-out', 'Tarif biaya', 'Jam anggaran', 'Jam aktual',
      'Util perikatan', 'Util firma', 'WP prep', 'WP rev', 'Proc prep', 'Proc rev'],
    rows,
    colWidths: [22, 10, 16, 14, 13, 12, 14, 12, 10, 10, 10, 10],
  };
}

/* ---------- sheet 5 · Jalur kritis ---------- */
function sheetJalur(i: CockpitReportInput): ReportSheet {
  const label: Record<string, string> = { done: 'Selesai', active: 'Berjalan', risk: 'Berisiko', upcoming: 'Akan datang' };
  const rows: Cell[][] = i.milestones.map((m) => [
    m.name, m.sa, m.phase, label[m.status] || m.status,
    m.dateIso || NOT_MEASURED, m.dateBasis || NOT_MEASURED,
    m.gateTotal == null ? NOT_MEASURED : `${m.gateMet}/${m.gateTotal}`,
    m.owner,
  ]);
  return {
    name: 'Jalur Kritis',
    heading: 'Tahap tanpa tanggal ditulis "—": hanya mulai, tenggat pelaporan, dan batas arsip (tenggat + 60 hari, SMM 1 · SA 230) yang punya dasar.',
    columns: ['Tahap', 'Standar', 'Fase', 'Status', 'Tanggal', 'Dasar tanggal', 'Gerbang', 'Penanggung jawab'],
    rows,
    colWidths: [40, 22, 14, 14, 14, 46, 12, 22],
  };
}

/* ---------- sheet 6 · Risiko signifikan + cakupan ---------- */
export interface ReportRiskRow { id: string; area?: string; desc?: string; inherent?: string; fraud?: boolean; response?: string; wp?: string; owner?: string }

function sheetRisiko(i: CockpitReportInput, risks: ReportRiskRow[]): ReportSheet {
  const cov = new Map(i.riskCoverage.map((c) => [c.id, c]));
  const rows: Cell[][] = risks.map((r) => {
    const c = cov.get(r.id);
    return [
      r.id, c ? c.area : (r.area || ''), r.desc || '', r.inherent || '', r.fraud ? 'Ya' : 'Tidak',
      c ? `${c.done}/${c.total}` : NOT_MEASURED,
      c ? (c.covered ? 'Tuntas' : 'Belum tuntas') : NOT_MEASURED,
      c ? c.exc : NOT_MEASURED,
      r.response || '', r.wp || '', r.owner || '',
    ];
  });
  return {
    name: 'Risiko Signifikan',
    heading: 'Cakupan dijodohkan lewat KUNCI (RISKS.id = PROGRAMME.riskId). "Tuntas" = SELURUH prosedur selesai, bukan sekadar ada satu yang selesai.',
    columns: ['ID', 'Area program', 'Risiko', 'Inheren', 'Fraud', 'Prosedur selesai', 'Cakupan', 'Pengecualian', 'Respons', 'WP', 'Pemilik'],
    rows,
    colWidths: [8, 24, 48, 12, 8, 16, 14, 14, 40, 10, 16],
  };
}

/* ---------- sheet 7 · Kesiapan opini ---------- */
function sheetKesiapan(i: CockpitReportInput): ReportSheet {
  const rows: Cell[][] = i.gateCriteria.map((c) => [c.label, c.met ? 'Terpenuhi' : 'Belum', c.detail]);
  const met = i.gateCriteria.filter((c) => c.met).length;
  return {
    name: 'Kesiapan Opini',
    heading: `Gerbang KANONIK — sama dengan yang mengikat transisi fase (engagementGate). ${met}/${i.gateCriteria.length} prasyarat penerbitan terpenuhi.`,
    columns: ['Prasyarat', 'Status', 'Rincian'],
    rows,
    colWidths: [56, 14, 62],
  };
}

/**
 * buildCockpitStatusReport — payload XLSX tersegel, seluruhnya dari model layar.
 * Tidak menghitung ulang apa pun: bila layar dan berkas berbeda, itu bug di
 * pemanggil, bukan dua definisi yang bersaing.
 */
export function buildCockpitStatusReport(i: CockpitReportInput, risks: ReportRiskRow[]): CockpitReportPayload {
  const ekonomi = i.econ.hasRoster
    ? `WIP @tarif standar Rp ${Math.round((i.econ.wipStd || 0) / 1e6)} jt · biaya waktu Rp ${Math.round((i.econ.timeCost || 0) / 1e6)} jt`
    : 'roster jam belum disiapkan — ekonomi per-anggota tak terukur';
  return {
    kind: 'cockpit-status',
    scope: 'engagement',
    fileName: `Status Report - ${i.clientName || 'Klien'}.xlsx`,
    title: `Status Report Engagement — ${i.clientName}`,
    meta: [
      `${i.engagementId} · ${i.fy} · fase ${i.phase} · sisa ${i.daysLeft} hari ke tenggat pelaporan`,
      `Progres TERBUKTI ${i.overall}%${i.asserted != null ? ` · di-assert manajer ${i.asserted}% (selisih ${(i.bridge.gapPp ?? 0).toFixed(1)} pp)` : ''}`,
      `Kesimpulan: ${i.verdict} · pemakaian jam ${Math.round(i.burnPct)}% · ${ekonomi}`,
      'Setiap figur pada sheet Ringkasan menyebutkan basisnya. Sel "—" berarti TAK TERUKUR, bukan nol.',
    ],
    sheets: [
      sheetRingkasan(i),
      sheetJembatan(i),
      sheetFase(i),
      sheetTim(i),
      sheetJalur(i),
      sheetRisiko(i, risks),
      sheetKesiapan(i),
    ],
  };
}
