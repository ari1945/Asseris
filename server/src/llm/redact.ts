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

const SEV_LABEL: Record<SafeFinding['sev'], string> = { high: 'Tinggi', med: 'Sedang', low: 'Rendah' };

/** Project each finding onto the allow-listed fields ONLY. Anything else is dropped. */
export function redactFindings(findings: InboundFinding[]): SafeFinding[] {
  return findings.map((f) => ({
    id: String(f.id ?? ''),
    detector: String(f.detector ?? ''),
    sev: f.sev,
    std: String(f.std ?? ''),
    title: String(f.title ?? ''),
    detail: String(f.detail ?? ''),
    suggestedProcedure: String(f.suggestedProcedure ?? ''),
  }));
}

const SYSTEM_PROMPT = [
  'Anda adalah asisten audit untuk Kantor Akuntan Publik di Indonesia.',
  'Anda diberi daftar TEMUAN DIAGNOSTIK yang sudah dihitung secara deterministik (berbasis aturan & statistik) dari kertas kerja audit.',
  'Tugas Anda: tuliskan NARASI ringkas berbahasa Indonesia yang menjelaskan temuan-temuan ini kepada auditor —',
  'kelompokkan menurut tema/risiko, jelaskan implikasi terhadap audit, dan rangkum prosedur lanjutan yang relevan.',
  'ATURAN: jangan mengarang angka, nama entitas, atau fakta yang tidak ada dalam temuan; jangan membuat kesimpulan opini audit;',
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
