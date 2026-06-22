/* ============================================================
   W10.5 Fase 2 — client-side XLSX register generator + nol-vendor seal.
   Generates a REAL downloadable .xlsx (Blob) from a structured sheet model (SheetJS), asks the
   server to seal its canonical content hash (Ed25519 provenance/integrity), and appends a "Segel"
   metadata sheet carrying the seal id + hash + the honest "BUKAN e-Meterai" disclaimer. The
   SheetJS library is lazy-loaded on first export so app boot is unaffected (own rollup chunk).

   Same HONEST BOUNDARY as the PDF path (see export_pdf.js): the seal proves WHO generated it and
   that the CONTENT-PAYLOAD hash is intact — it is NOT e-Meterai (PERURI) nor a certified PSrE
   signature. The hash covers the canonical sheet model below (not the .xlsx bytes), so re-exporting
   from the same source data reproduces the same hash for verification.

   Numbers are passed in PRE-FORMATTED via rp()/fmt() at the caller (SSOT = AMS_CANON), so cells are
   id-ID text identical to the screen (negatives in parentheses). This favours screen-fidelity over
   spreadsheet arithmetic, consistent with the Fase 1 PDF tables.
   ============================================================ */
import { exportSeal, exportLogEvent } from './api';
import { SEAL_DISCLAIMER } from './export_pdf';

let _xlsx: any = null;
async function loadXlsx() {
  if (_xlsx) return _xlsx;
  const mod = await import('xlsx');
  _xlsx = mod && mod.utils ? mod : (mod.default || mod);
  return _xlsx;
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
    sheets: (model.sheets || []).map((s: any) => ({
      name: s.name || '',
      heading: s.heading || '',
      columns: s.columns || [],
      rows: s.rows || [],
      totals: s.totals || [],
    })),
  };
  return JSON.stringify(pick, Object.keys(pick).sort());
}

/**
 * Generate, seal, download an .xlsx workbook. Returns { sealed, sealId|null, contentHash, reason }.
 * model: { kind, scope?, scopeId?, fileName, firm, title, meta:[…strings],
 *   sheets:[ { name, heading?, columns:[…labels], rows:[[…cells]], totals?:[…cells], colWidths?:[…wch] } ] }
 */
export async function amsExportXlsx(model: any) {
  const XLSX = await loadXlsx();
  const contentHash = await sha256Hex(canonicalPayload(model));

  // Seal first so we can embed it. Degrade to an UNSEALED workbook if the server is down or the
  // role lacks CAP.EXPORT — never block the auditor from getting their register.
  let seal = null;
  let reason = 'ok';
  try {
    seal = await exportSeal({ kind: model.kind, contentHash, scope: model.scope, scopeId: model.scopeId });
  } catch (e: any) {
    reason = (e && (e.data?.code || e.shape?.data?.code)) === 'FORBIDDEN' ? 'forbidden' : 'unavailable';
  }

  const wb = XLSX.utils.book_new();
  const usedNames = new Set();
  const safeName = (n: any) => {
    // Excel sheet names: ≤31 chars, no []:*?/\
    let base = String(n || 'Sheet').replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Sheet';
    let name = base;
    let i = 2;
    while (usedNames.has(name)) { const suf = ' (' + i++ + ')'; name = base.slice(0, 31 - suf.length) + suf; }
    usedNames.add(name);
    return name;
  };

  for (const s of model.sheets || []) {
    const aoa = [];
    if (s.heading) aoa.push([s.heading]);
    if (s.columns && s.columns.length) aoa.push(s.columns);
    for (const r of s.rows || []) aoa.push(r);
    if (s.totals && s.totals.length) aoa.push(s.totals);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    if (s.colWidths) ws['!cols'] = s.colWidths.map((w: any) => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, safeName(s.name));
  }

  // ---- "Segel" metadata sheet (provenance footer, XLSX equivalent of the PDF seal block) ----
  const sealRows = [
    ['Asseris — Ekspor Register'],
    ['Judul', model.title || ''],
    ['Firma', model.firm || ''],
    ...(model.meta || []).map((m: any) => ['', String(m)]),
    [],
    [seal ? 'TERSEGEL · Provenans Asseris' : 'TIDAK TERSEGEL'],
  ];
  if (seal) {
    sealRows.push(['Seal ID', seal.sealId]);
    sealRows.push(['Public Key ID', seal.pubKeyId]);
    sealRows.push(['Hash konten (SHA-256)', contentHash]);
    if (seal.signedAt) sealRows.push(['Ditandatangani (UTC)', new Date(seal.signedAt).toISOString().slice(0, 16).replace('T', ' ')]);
    sealRows.push(['Verifikasi', 'neosuite-seal:' + seal.sealId + ';' + contentHash]);
  } else {
    sealRows.push(['Hash konten (SHA-256)', contentHash]);
    sealRows.push(['Segel dilewati', reason === 'forbidden' ? 'peran tanpa kapabilitas ekspor' : 'server tak tersedia']);
  }
  sealRows.push([]);
  sealRows.push(['Disclaimer', SEAL_DISCLAIMER]);
  const sealWs = XLSX.utils.aoa_to_sheet(sealRows);
  sealWs['!cols'] = [{ wch: 22 }, { wch: 96 }];
  XLSX.utils.book_append_sheet(wb, sealWs, 'Segel');

  XLSX.writeFile(wb, model.fileName || `${model.kind}.xlsx`);

  // If we couldn't seal, still record the export to the audit chain (best-effort). A successful
  // seal already appended a SEAL row server-side, so don't double-log that path.
  if (!seal) {
    await exportLogEvent({ kind: model.kind, format: 'xlsx', scope: model.scope, scopeId: model.scopeId, contentHash });
  }
  return { sealed: !!seal, sealId: seal?.sealId || null, contentHash, reason };
}

Object.assign(window, { amsExportXlsx });
