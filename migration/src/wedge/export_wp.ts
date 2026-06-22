/* ============================================================
   Wedge MVP F5 — ekspor kertas kerja tersegel (XLSX + PDF, OFFLINE)
   ------------------------------------------------------------
   Reuse LIBRARY jspdf/jspdf-autotable/xlsx (lazy), TANPA wrapper export_pdf/
   export_xlsx yang terkopel `./api`→server. Segel = Ed25519 lokal (seal.ts).
   Konten kanonik (deterministik) disegel sekali; XLSX & PDF menanam segel sama.
   ============================================================ */
import { sealText, SEAL_DISCLAIMER, type SealBlock } from './seal';

export interface WpReview {
  ts: string;
  findings: any[];
  report: any;            // { ct, flagTally, journalCount, tbCount, warnings }
  decisions: Record<string, any>;
  auditTrail: any[];
}
export interface WpMeta { firm: string; auditor: string; client?: string; }

const rp = (n: number) => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const verdictLabel = (v: any) => v === 'follow' ? 'Ditindaklanjuti' : v === 'dismiss' ? 'Diabaikan' : '(belum)';
const safe = (s: string) => String(s || '').replace(/[^\w.-]+/g, '-').slice(0, 60);

/* —— konten kanonik untuk segel (deterministik; struktur tetap) —— */
export function canonicalText(rv: WpReview, meta: WpMeta): string {
  return JSON.stringify({
    kind: 'wedge-diagnostic-wp',
    firm: meta.firm, client: meta.client || '', auditor: meta.auditor, ts: rv.ts,
    control: rv.report && rv.report.ct,
    findings: (rv.findings || []).map(f => ({
      id: f.id, sev: f.sev, std: f.std, detector: f.detector, title: f.title, detail: f.detail,
      verdict: (rv.decisions[f.id] || {}).verdict || '', reason: (rv.decisions[f.id] || {}).reason || '',
    })),
  });
}

let _xlsx: any = null;
async function loadXlsx() { if (!_xlsx) { const m: any = await import('xlsx'); _xlsx = m && m.utils ? m : (m.default || m); } return _xlsx; }
let _pdf: any = null;
async function loadPdf() {
  if (_pdf) return _pdf;
  const [j, a] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  _pdf = { jsPDF: (j as any).jsPDF, autoTable: (a as any).default || (a as any).autoTable };
  return _pdf;
}

function sealRows(seal: SealBlock): any[][] {
  return [
    ['Algoritma', seal.alg + (seal.degraded ? ' (Ed25519 tak didukung — integritas saja)' : '')],
    ['Hash konten (SHA-256)', seal.contentHash],
    ['Tandatangan', seal.signature || '—'],
    ['Kunci publik', seal.publicKey || '—'],
    ['Disegel pada', seal.signedAt],
    ['Disclaimer', SEAL_DISCLAIMER],
  ];
}

/** Ekspor XLSX tersegel → unduh. Return seal block (utk UI/verifikasi). */
export async function exportWpXlsx(rv: WpReview, meta: WpMeta): Promise<SealBlock> {
  const XLSX = await loadXlsx();
  const seal = await sealText(canonicalText(rv, meta));
  const wb = XLSX.utils.book_new();

  const fHead = ['No', 'Severity', 'Standar', 'Detektor', 'Judul', 'Detail', 'Keputusan', 'Alasan'];
  const fRows = (rv.findings || []).map((f, i) => {
    const d = rv.decisions[f.id] || {};
    return [i + 1, f.sev, f.std, f.detector, f.title, f.detail, verdictLabel(d.verdict), d.reason || ''];
  });
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    [`Asseris — Diagnostik & Analitik Audit`], [`${meta.firm} · Auditor: ${meta.auditor} · Diimpor: ${rv.ts}`],
    rv.report && rv.report.ct ? [`Control-total: ${rv.report.ct.ok ? 'LULUS' : 'PERLU PERHATIAN'} · Σ saldo ${rp(rv.report.ct.tbUnadjSum)} · ${rv.report.ct.glCount} baris GL`] : [],
    [], fHead, ...fRows,
  ]), 'Temuan');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
    ['Waktu', 'Oleh', 'Aktivitas'], ...(rv.auditTrail || []).map(a => [a.when, a.who, a.what]),
  ]), 'Jejak Audit');

  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Segel provenans'], [], ...sealRows(seal)]), 'Segel');

  XLSX.writeFile(wb, `Asseris-Diagnostik-${safe(rv.ts)}.xlsx`);
  return seal;
}

/** Ekspor PDF tersegel → unduh. Return seal block. */
export async function exportWpPdf(rv: WpReview, meta: WpMeta): Promise<SealBlock> {
  const { jsPDF, autoTable } = await loadPdf();
  const seal = await sealText(canonicalText(rv, meta));
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const M = 40; let y = 48;

  doc.setFontSize(15).setFont(undefined, 'bold').text('Asseris — Diagnostik & Analitik Audit', M, y);
  y += 18; doc.setFontSize(9).setFont(undefined, 'normal');
  doc.text(`${meta.firm} · Auditor: ${meta.auditor} · Diimpor: ${rv.ts}`, M, y);
  if (rv.report && rv.report.ct) {
    y += 14; doc.text(`Control-total: ${rv.report.ct.ok ? 'LULUS' : 'PERLU PERHATIAN'} · Σ saldo ${rp(rv.report.ct.tbUnadjSum)} · ${rv.report.ct.glCount} baris GL · ${rv.findings.length} temuan`, M, y);
  }
  y += 12;

  autoTable(doc, {
    startY: y, styles: { fontSize: 8, cellPadding: 3 }, headStyles: { fillColor: [22, 35, 58] },
    head: [['#', 'Sev', 'Standar', 'Judul', 'Keputusan']],
    body: (rv.findings || []).map((f, i) => [i + 1, f.sev, f.std, f.title, verdictLabel((rv.decisions[f.id] || {}).verdict)]),
  });
  let afterY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 18 : y + 40;

  doc.setFontSize(10).setFont(undefined, 'bold').text('Segel provenans (Ed25519 lokal)', M, afterY);
  afterY += 6;
  autoTable(doc, {
    startY: afterY, styles: { fontSize: 7, cellPadding: 3 }, theme: 'plain',
    body: sealRows(seal).map(r => [r[0], r[1]]),
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 110 } },
  });

  doc.save(`Asseris-Diagnostik-${safe(rv.ts)}.pdf`);
  return seal;
}
