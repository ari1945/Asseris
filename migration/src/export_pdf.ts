/* ============================================================
   W10.5 Fase 1 — client-side PDF generator + nol-vendor seal.
   Generates a REAL downloadable PDF (Blob) from a structured document model, asks the server
   to seal its canonical content hash (Ed25519 provenance/integrity), and embeds the seal +
   verify-QR + the honest "BUKAN e-Meterai" disclaimer. Libraries (jspdf, jspdf-autotable,
   qrcode) are lazy-loaded on first export so app boot is unaffected.

   HONEST BOUNDARY: the seal proves WHO generated it and that the CONTENT PAYLOAD hash is intact
   — it is NOT e-Meterai (PERURI) nor a certified PSrE (PrivyID/VIDA) signature, and carries no
   legal stamp-duty weight. The hash covers the canonical content model below (not the rendered
   bytes); re-exporting from the same source data reproduces the same hash for verification.
   ============================================================ */
import { exportSeal, exportLogEvent } from './api';

export const SEAL_DISCLAIMER =
  'Segel provenans Asseris (Ed25519) — membuktikan pembuat & integritas konten. ' +
  'BUKAN e-Meterai/PERURI atau tanda tangan elektronik tersertifikasi (PSrE). Tanpa kekuatan bea meterai.';

// Lazy-load the heavy libs once. Kept out of the boot bundle (dynamic import → its own chunk).
let _libs: any = null;
async function loadLibs() {
  if (_libs) return _libs;
  const [jspdfMod, autoTableMod, qrMod] = await Promise.all([
    import('jspdf'),
    import('jspdf-autotable'),
    import('qrcode'),
  ]);
  _libs = {
    jsPDF: jspdfMod.jsPDF,
    autoTable: autoTableMod.default || autoTableMod.autoTable,
    QR: qrMod.default || qrMod,
  };
  return _libs;
}

async function sha256Hex(str: any) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

// Deterministic JSON over the CONTENT-bearing fields only (sorted keys) — the seal must be
// reproducible from the same source data, so we exclude anything render/seal-specific.
function canonicalPayload(model: any) {
  const pick = {
    kind: model.kind,
    title: model.title,
    refNo: model.refNo || '',
    meta: model.meta || [],
    blocks: (model.blocks || []).map((b: any) => ({
      type: b.type,
      text: b.text || '',
      rows: b.rows || [],
      head: b.head || [],
      body: b.body || [],
      signers: (b.signers || []).map((s: any) => ({ name: s.name || '', role: s.role || '', at: s.at || '' })),
    })),
  };
  return JSON.stringify(pick, Object.keys(pick).sort());
}

const MARGIN = 48; // pt
const NAVY = [26, 39, 48];
const MUTED = [122, 136, 147];
const LINE = [210, 216, 222];

/**
 * Generate, seal, download. Returns { sealed, sealId|null, contentHash, reason }.
 * model: { kind, scope?, scopeId?, fileName, firm, title, refNo?, meta:[], blocks:[
 *   {type:'heading', text} | {type:'para', text} | {type:'kv', rows:[[label,value],…]} |
 *   {type:'table', head:[…], body:[[…]]} | {type:'signature', signers:[{name,role,at}]}
 * ] }
 */
export async function amsExportPdf(model: any) {
  const { jsPDF, autoTable, QR } = await loadLibs();
  const contentHash = await sha256Hex(canonicalPayload(model));

  // Seal first (so we can embed it). Degrade to an UNSEALED artifact if the server is down or
  // the role lacks CAP.EXPORT — never block the auditor from getting their document.
  let seal = null;
  let reason = 'ok';
  try {
    seal = await exportSeal({ kind: model.kind, contentHash, scope: model.scope, scopeId: model.scopeId });
  } catch (e: any) {
    reason = (e && (e.data?.code || e.shape?.data?.code)) === 'FORBIDDEN' ? 'forbidden' : 'unavailable';
  }

  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  let y = MARGIN;

  const ensure = (need: any) => { if (y + need > pageH - MARGIN) { doc.addPage(); y = MARGIN; } };

  // Firm header.
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...MUTED);
  doc.text(String(model.firm || '').toUpperCase(), MARGIN, y); y += 16;
  // Title.
  doc.setFont('helvetica', 'bold'); doc.setFontSize(17); doc.setTextColor(...NAVY);
  const titleLines = doc.splitTextToSize(model.title || '', contentW);
  doc.text(titleLines, MARGIN, y); y += titleLines.length * 20;
  if (model.refNo) { doc.setFont('courier', 'normal'); doc.setFontSize(9); doc.setTextColor(...MUTED); doc.text(model.refNo, MARGIN, y); y += 13; }
  // Meta lines.
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.setTextColor(...MUTED);
  for (const m of model.meta || []) { const ls = doc.splitTextToSize(m, contentW); doc.text(ls, MARGIN, y); y += ls.length * 12; }
  y += 6;
  doc.setDrawColor(...LINE); doc.line(MARGIN, y, pageW - MARGIN, y); y += 14;

  for (const b of model.blocks || []) {
    if (b.type === 'heading') {
      ensure(26); doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5); doc.setTextColor(...NAVY);
      const ls = doc.splitTextToSize(b.text, contentW); doc.text(ls, MARGIN, y); y += ls.length * 14 + 4;
    } else if (b.type === 'para') {
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 50, 58);
      const ls = doc.splitTextToSize(b.text, contentW);
      for (const line of ls) { ensure(14); doc.text(line, MARGIN, y); y += 14; }
      y += 6;
    } else if (b.type === 'kv') {
      autoTable(doc, {
        startY: y, margin: { left: MARGIN, right: MARGIN }, theme: 'grid',
        styles: { fontSize: 10, cellPadding: 5, lineColor: LINE, lineWidth: 0.5 },
        columnStyles: { 0: { textColor: [70, 80, 88] }, 1: { halign: 'right', font: 'courier', fontStyle: 'bold', textColor: NAVY } },
        body: b.rows,
      });
      y = doc.lastAutoTable.finalY + 12;
    } else if (b.type === 'table') {
      const bold = new Set(b.boldRows || []); // row indices to render bold (FS sections/totals)
      autoTable(doc, {
        startY: y, margin: { left: MARGIN, right: MARGIN }, theme: 'striped',
        headStyles: { fillColor: NAVY, fontSize: 9.5 },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: b.columnStyles || {},
        head: [b.head], body: b.body,
        didParseCell: bold.size ? (data: any) => { if (data.section === 'body' && bold.has(data.row.index)) data.cell.styles.fontStyle = 'bold'; } : undefined,
      });
      y = doc.lastAutoTable.finalY + 12;
    } else if (b.type === 'signature') {
      ensure(70); y += 6;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY);
      const cols = (b.signers || []).length || 1;
      const colW = contentW / cols;
      (b.signers || []).forEach((s: any, i: any) => {
        const x = MARGIN + i * colW; let sy = y;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        doc.text(String(s.label || '').toUpperCase(), x, sy); sy += 28;
        doc.setDrawColor(...LINE); doc.line(x, sy, x + colW - 24, sy); sy += 13;
        doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...NAVY);
        doc.text(s.name || '—', x, sy); sy += 12;
        doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(...MUTED);
        if (s.role) { doc.text(s.role, x, sy); sy += 11; }
        if (s.at) { doc.text(s.at, x, sy); }
      });
      y += 64;
    }
  }

  // ---- Seal footer (last page, pinned to the bottom) ----
  const footTop = pageH - MARGIN - 92;
  if (y > footTop - 8) { doc.addPage(); }
  let fy = pageH - MARGIN - 92;
  doc.setDrawColor(...LINE); doc.line(MARGIN, fy, pageW - MARGIN, fy); fy += 16;

  let qrDataUrl = null;
  if (seal) {
    try { qrDataUrl = await QR.toDataURL(`neosuite-seal:${seal.sealId};${contentHash}`, { margin: 0, width: 160 }); } catch (e) { /* QR optional */ }
  }
  const qrSize = 64;
  if (qrDataUrl) { try { doc.addImage(qrDataUrl, 'PNG', pageW - MARGIN - qrSize, fy, qrSize, qrSize); } catch (e) {} }

  const tx = MARGIN; let ty = fy + 4;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...NAVY);
  doc.text(seal ? 'TERSEGEL · Provenans Asseris' : 'TIDAK TERSEGEL', tx, ty); ty += 13;
  doc.setFont('courier', 'normal'); doc.setFontSize(7.5); doc.setTextColor(...MUTED);
  if (seal) {
    doc.text(`Seal: ${seal.sealId}`, tx, ty); ty += 10;
    doc.text(`Key: ${seal.pubKeyId}  ·  Hash: ${contentHash.slice(0, 32)}…`, tx, ty); ty += 10;
    if (seal.signedAt) { doc.text(`Ditandatangani: ${new Date(seal.signedAt).toISOString().slice(0, 16).replace('T', ' ')} UTC`, tx, ty); ty += 12; }
  } else {
    const why = reason === 'forbidden' ? 'peran tanpa kapabilitas ekspor' : 'server tak tersedia';
    doc.text(`Hash konten: ${contentHash.slice(0, 32)}…  (segel dilewati — ${why})`, tx, ty); ty += 12;
  }
  doc.setFont('helvetica', 'italic'); doc.setFontSize(6.8); doc.setTextColor(...MUTED);
  const disc = doc.splitTextToSize(SEAL_DISCLAIMER, contentW - (qrDataUrl ? qrSize + 12 : 0));
  doc.text(disc, tx, ty);

  doc.save(model.fileName || `${model.kind}.pdf`);

  // If we couldn't seal, still record the export to the audit chain (best-effort). A successful
  // seal already appended a SEAL row server-side, so don't double-log that path.
  if (!seal) {
    await exportLogEvent({ kind: model.kind, format: 'pdf', scope: model.scope, scopeId: model.scopeId, contentHash });
  }
  return { sealed: !!seal, sealId: seal?.sealId || null, contentHash, reason };
}

Object.assign(window, { amsExportPdf, AMS_SEAL_DISCLAIMER: SEAL_DISCLAIMER });
