/* ============================================================
   Asseris — Memo Saldo Awal / Perikatan Tahun Pertama (SA 510 · kertas kerja SA 230).
   Builder MURNI (tanpa Date/random) → blok PDF (amsExportPdf) & lembar XLSX
   (amsExportXlsx). Deterministik: (input sama) → hash segel sama (verifikasi ulang).
   Pola sama acceptance_continuance_memo.ts.
   ============================================================ */

export interface OpeningMemoFactor { k: string; w: number; s: number; note?: string }
export interface OpeningMemoStep { label: string; done: boolean }

export interface OpeningMemoInput {
  client: string;
  clientId: string;
  partner?: string;
  cycle?: string;                 // FY/siklus (mis. 'FY2025')
  engType: 'lanjutan' | 'awal';
  predecessorName?: string;
  score: number;                  // skor berbobot 0..5
  verdict: string;                // label verdict opening
  factors: OpeningMemoFactor[];
  safeguards?: string;
  predecessorSteps?: OpeningMemoStep[];
  conclusion?: string;
  date?: string;                  // YYYY-MM-DD
}

export type OpeningPdfBlock =
  | { type: 'heading'; text: string }
  | { type: 'para'; text: string }
  | { type: 'kv'; rows: string[][] }
  | { type: 'table'; head: string[]; body: string[][] };

export interface OpeningXlsxSheet {
  name: string; heading?: string; columns?: string[]; rows?: (string | number)[][]; colWidths?: number[];
}

export function openingMemoTitle(i: OpeningMemoInput): string {
  return `Memo Saldo Awal (SA 510) — ${i.client}`;
}
export function openingMemoRefNo(i: OpeningMemoInput): string {
  return `A-510/${i.clientId}/${i.cycle || ''}`.replace(/\/$/, '');
}
export function openingMemoMeta(i: OpeningMemoInput): string[][] {
  return [
    ['Klien', i.client],
    ['Partner', i.partner || '—'],
    ['Siklus', i.cycle || '—'],
    ['Jenis Perikatan', i.engType === 'awal' ? 'Perikatan Tahun Pertama' : 'Lanjutan'],
    ['Auditor Pendahulu', i.predecessorName || '—'],
    ['Skor Risiko Saldo Awal', i.score.toFixed(2) + ' / 5.00'],
    ['Kesimpulan', i.verdict],
    ['Tanggal', i.date || '—'],
  ];
}

const pct = (s: OpeningMemoStep[]): string => {
  if (!s.length) return '—';
  return Math.round((s.filter((x) => x.done).length / s.length) * 100) + '%';
};

export function buildOpeningBlocks(i: OpeningMemoInput): OpeningPdfBlock[] {
  const blocks: OpeningPdfBlock[] = [
    { type: 'heading', text: 'Penilaian Risiko Saldo Awal (SA 510)' },
    { type: 'kv', rows: openingMemoMeta(i) },
    {
      type: 'table',
      head: ['Faktor', 'Bobot', 'Skor', 'Catatan'],
      body: i.factors.map((f) => [f.k, String(f.w), String(f.s), f.note || '—']),
    },
  ];
  if (i.engType === 'awal' && i.predecessorSteps && i.predecessorSteps.length) {
    blocks.push({ type: 'heading', text: `Komunikasi Auditor Pendahulu (SA 510 ¶6) — kesiapan ${pct(i.predecessorSteps)}` });
    blocks.push({
      type: 'table',
      head: ['Langkah', 'Status'],
      body: i.predecessorSteps.map((s) => [s.label, s.done ? 'Selesai' : 'Belum']),
    });
  }
  if (i.safeguards && i.safeguards.trim()) {
    blocks.push({ type: 'heading', text: 'Prosedur Tambahan / Pengaman' });
    blocks.push({ type: 'para', text: i.safeguards });
  }
  blocks.push({ type: 'heading', text: 'Kesimpulan Auditor' });
  blocks.push({ type: 'para', text: i.conclusion || `Berdasarkan penilaian berbobot (skor ${i.score.toFixed(2)}), kesimpulan saldo awal: ${i.verdict}.` });
  return blocks;
}

export function buildOpeningSheets(i: OpeningMemoInput): OpeningXlsxSheet[] {
  const sheets: OpeningXlsxSheet[] = [
    { name: 'Ringkasan', heading: openingMemoTitle(i), columns: ['Atribut', 'Nilai'], rows: openingMemoMeta(i), colWidths: [28, 48] },
    {
      name: 'Faktor Risiko', heading: 'Penilaian Berbobot Risiko Saldo Awal (SA 510)',
      columns: ['Faktor', 'Bobot', 'Skor', 'Catatan'],
      rows: i.factors.map((f) => [f.k, f.w, f.s, f.note || '—']),
      colWidths: [48, 10, 8, 40],
    },
  ];
  if (i.engType === 'awal' && i.predecessorSteps && i.predecessorSteps.length) {
    sheets.push({
      name: 'Auditor Pendahulu', heading: 'Komunikasi Auditor Pendahulu (SA 510 ¶6)',
      columns: ['Langkah', 'Status'],
      rows: i.predecessorSteps.map((s) => [s.label, s.done ? 'Selesai' : 'Belum']),
      colWidths: [60, 14],
    });
  }
  return sheets;
}
