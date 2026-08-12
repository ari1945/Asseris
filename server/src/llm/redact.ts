// W8 Fase 0 — egress redaction (PRD Q1=A). The confidentiality boundary: the proxy
// only sends a third-party LLM the *deterministic finding text* (title/std/severity/
// detail/suggested procedure) — never raw WTB rows, client names/NPWP, engagement ids,
// or any field beyond the finding shape. Two layers guarantee this:
//   1. the router's zod schema strips unknown keys before this runs (structural), and
//   2. redactFindings() re-projects onto an explicit allow-list (defence in depth, and
//      the thing the anti-leak test asserts against).
// The server also OWNS the prompt — the client cannot supply free-form prompt text — so
// no caller can smuggle extra context past the redactor.

export interface InboundFinding {
  id: string;
  detector?: string;
  sev: 'high' | 'med' | 'low';
  std?: string;
  title: string;
  detail?: string;
  suggestedProcedure?: string;
  // NOTE: any other key (clientName, npwp, wtbRows, party, amounts, …) is intentionally
  // absent from this type and dropped by redactFindings — that is the egress guarantee.
}

export interface SafeFinding {
  id: string;
  detector: string;
  sev: 'high' | 'med' | 'low';
  std: string;
  title: string;
  detail: string;
  suggestedProcedure: string;
}

export interface RedactionReport {
  nominal: number;
  journalId: number;
  npwp: number;
  partyName: number;
}

const EMPTY_REPORT = (): RedactionReport => ({ nominal: 0, journalId: 0, npwp: 0, partyName: 0 });

/**
 * Redact sensitive values embedded inside otherwise allow-listed prose. Structural projection
 * alone is insufficient: a title such as "AJE-05 PT Rahasia Rp 2.000.000" still contains four
 * sensitive semantics in one permitted string.
 */
export function redactSemanticText(value: unknown, report: RedactionReport = EMPTY_REPORT()): string {
  let text = String(value ?? '');
  const replace = (pattern: RegExp, placeholder: string, key: keyof RedactionReport) => {
    text = text.replace(pattern, () => { report[key] += 1; return placeholder; });
  };

  // Both legacy formatted 15-digit NPWP and the newer label + 16-digit form.
  replace(/\b(?:NPWP\s*[:#-]?\s*)?(?:\d{2}[.\- ]?\d{3}[.\- ]?\d{3}[.\- ]?\d[\- ]?\d{3}[.\- ]?\d{3}|\d{16})\b/giu, '[NPWP]', 'npwp');
  // Common Indonesian journal identifiers (AJE-01, PAJE-03, JE/2026/0042, JV_18).
  replace(/\b(?:P?AJE|JE|JV|JRN|JRNL)[\s#:/_.-]*[A-Z0-9][A-Z0-9/_.-]*\b/giu, '[ID_JURNAL]', 'journalId');
  // Explicit currency/scale values first, then grouped rupiah-style numbers.
  replace(/\b(?:Rp|IDR|USD|EUR|SGD|AUD)\s*-?\s*\d[\d.,]*(?:\s*(?:ribu|rb|juta|jt|miliar|milyar|bio|M|B))?\b/giu, '[NOMINAL]', 'nominal');
  replace(/(?<![\p{L}\d])-?\d+(?:[.,]\d+)?\s*(?:ribu|rb|juta|jt|miliar|milyar|bio)\b/giu, '[NOMINAL]', 'nominal');
  replace(/(?<![\p{L}\d])-?\d{1,3}(?:\.\d{3}){1,}(?:,\d+)?(?![\p{L}\d])/gu, '[NOMINAL]', 'nominal');
  // Legal-entity names and names following a party-role label. Keep the role so prose remains useful.
  replace(/\b(?:PT|CV|UD|KAP|Firma|Yayasan|Koperasi|Bank)\.?\s+[\p{Lu}][\p{L}\p{M}0-9&.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}0-9&.'’-]*){0,5}/gu, '[NAMA_PIHAK]', 'partyName');
  // Confirmation diagnostics strip PT/CV before composing "Nama Pihak (37 hr/selisih …)".
  replace(/\b[\p{Lu}][\p{L}\p{M}.'’&-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’&-]*){1,4}(?=\s*\((?:selisih|\d+\s*(?:hr|hari)))/gu, '[NAMA_PIHAK]', 'partyName');
  text = text.replace(/\b(pihak|vendor|pemasok|pelanggan|debitur|kreditur|nasabah|counterparty|kepada|oleh)\s+([\p{Lu}][\p{L}\p{M}.'’-]*(?:\s+[\p{Lu}][\p{L}\p{M}.'’-]*){1,4})/giu,
    (_match, role: string) => { report.partyName += 1; return `${role} [NAMA_PIHAK]`; });
  return text;
}

const SEV_LABEL: Record<SafeFinding['sev'], string> = { high: 'Tinggi', med: 'Sedang', low: 'Rendah' };

/** Project each finding onto the allow-listed fields ONLY. Anything else is dropped. */
export function redactFindings(findings: InboundFinding[]): SafeFinding[] {
  return redactFindingsWithReport(findings).findings;
}

export function redactFindingsWithReport(findings: InboundFinding[]): { findings: SafeFinding[]; redactions: RedactionReport } {
  const redactions = EMPTY_REPORT();
  const safe = findings.map((f) => ({
    // id/detector are retained for local correlation but are never rendered into the provider prompt.
    // Any journal identifiers inside human prose are semantically redacted below.
    id: String(f.id ?? ''),
    detector: String(f.detector ?? ''),
    sev: f.sev,
    std: String(f.std ?? ''),
    title: redactSemanticText(f.title, redactions),
    detail: redactSemanticText(f.detail, redactions),
    suggestedProcedure: redactSemanticText(f.suggestedProcedure, redactions),
  }));
  return { findings: safe, redactions };
}

const SYSTEM_PROMPT = [
  'Anda adalah asisten audit untuk Kantor Akuntan Publik di Indonesia.',
  'Anda diberi daftar TEMUAN DIAGNOSTIK yang sudah dihitung secara deterministik (berbasis aturan & statistik) dari kertas kerja audit.',
  'Tugas Anda: tuliskan NARASI ringkas berbahasa Indonesia yang menjelaskan temuan-temuan ini kepada auditor —',
  'kelompokkan menurut tema/risiko, jelaskan implikasi terhadap audit, dan rangkum prosedur lanjutan yang relevan.',
  'ATURAN: jangan mengarang angka, nama entitas, atau fakta yang tidak ada dalam temuan; jangan membuat kesimpulan opini audit;',
  'Placeholder [NOMINAL], [ID_JURNAL], [NPWP], dan [NAMA_PIHAK] adalah hasil redaksi privasi dan tidak boleh ditebak atau direkonstruksi.',
  'nyatakan secara eksplisit bila bukti tidak memadai. Ini adalah BANTUAN BACA — auditor tetap memutuskan. Maksimal ~250 kata.',
].join(' ');

/**
 * Build the server-controlled narration prompt from redacted findings. The client never
 * supplies prompt text, so egress = exactly these allow-listed fields, nothing more.
 */
export function buildNarrationPrompt(findings: SafeFinding[]): { system: string; user: string } {
  const lines = findings.map((f, i) => {
    const parts = [
      `${i + 1}. [${SEV_LABEL[f.sev]}] ${f.title}`,
      f.std ? `   Standar: ${f.std}` : '',
      f.detail ? `   Detail: ${f.detail}` : '',
      f.suggestedProcedure ? `   Prosedur: ${f.suggestedProcedure}` : '',
    ];
    return parts.filter(Boolean).join('\n');
  });
  const user = `Berikut ${findings.length} temuan diagnostik (deterministik):\n\n${lines.join('\n\n')}`;
  return { system: SYSTEM_PROMPT, user };
}
