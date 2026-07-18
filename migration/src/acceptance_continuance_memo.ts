/* ============================================================
   Asseris — Memo Penerimaan & Keberlanjutan Klien (kertas kerja SA 230).
   Builder MURNI (tanpa Date/random) → blok PDF (amsExportPdf) & lembar XLSX
   (amsExportXlsx), pola sama letter_payload.ts. Satu generator, dua "kind":
   'acceptance' (dari prospek/onboarding) & 'continuance' (dari register).
   Dipakai kedua sisi agar satu format kertas kerja & satu jalur segel.
   Deterministik: (input yang sama) → hash segel yang sama (verifikasi ulang).
   ============================================================ */

export interface MemoFactor { k: string; w: number; s: number; note?: string }
export interface MemoTrigger { label: string; detail: string; severity?: string }
export interface MemoPriorYear {
  fy?: string; opinion?: string; findings?: number; findingsNote?: string;
  uncorrected?: number; changed?: string; difficulties?: string;
}
export interface MemoTrailEntry { action: string; by: string; at: string }

export interface MemoInput {
  kind: 'acceptance' | 'continuance';
  client: string;
  clientId: string;
  industry?: string;
  partner?: string;
  cycle?: string;            // FY/siklus (mis. 'FY2025' atau '2026')
  score: number;             // skor berbobot 0..5
  verdict: string;           // label verdict (Terima / Lanjut / …)
  factors: MemoFactor[];
  decision?: string;
  approver?: string;
  date?: string;             // YYYY-MM-DD
  approved?: boolean;
  safeguards?: string;
  triggers?: MemoTrigger[];       // keberlanjutan
  priorYear?: MemoPriorYear | null; // keberlanjutan
  trail?: MemoTrailEntry[];
}

/* ---- blok PDF (amsExportPdf) ---- */
export type MemoPdfBlock =
  | { type: 'heading'; text: string }
  | { type: 'para'; text: string }
  | { type: 'kv'; rows: string[][] }
  | { type: 'table'; head: string[]; body: string[][] }
  | { type: 'signature'; signers: { label: string; name: string; role: string; at: string }[] };

/* ---- lembar XLSX (amsExportXlsx) ---- */
export interface MemoXlsxSheet {
  name: string; heading?: string; columns?: string[]; rows?: (string | number)[][]; colWidths?: number[];
}

const rp = (n: number | undefined): string => 'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));
const isAcc = (k: MemoInput['kind']) => k === 'acceptance';

export function memoTitle(m: MemoInput): string {
  return isAcc(m.kind) ? 'MEMORANDUM PENERIMAAN KLIEN' : 'MEMORANDUM KEBERLANJUTAN KLIEN';
}
export function memoRefNo(m: MemoInput): string {
  const yr = (m.date || m.cycle || '').replace(/[^0-9]/g, '').slice(0, 4) || '____';
  return `No. ${m.clientId}/${isAcc(m.kind) ? 'ACC' : 'CONT'}/${yr}`;
}
export function memoMeta(m: MemoInput): string[] {
  const std = isAcc(m.kind) ? 'SA 220 · SA 300 · ISQM 1 ¶30' : 'SA 220 · ISQM 1 ¶33–34 · SA 220.A24';
  return [
    `${m.client}${m.industry ? ' · ' + m.industry : ''}`,
    `Partner: ${m.partner || '—'}${m.cycle ? ' · Siklus ' + m.cycle : ''}`,
    `Basis: ${std}`,
  ];
}

/** Blok konten memo (PDF). Cermin isi kertas kerja layar. */
export function buildMemoBlocks(m: MemoInput): MemoPdfBlock[] {
  const blocks: MemoPdfBlock[] = [];
  blocks.push({ type: 'heading', text: memoTitle(m) });
  blocks.push({
    type: 'kv',
    rows: [
      ['Klien', m.client],
      ['Industri', m.industry || '—'],
      ['Rekan penanggung jawab', m.partner || '—'],
      ['Siklus / Tahun Buku', m.cycle || '—'],
      ['Skor penilaian berbobot', m.score.toFixed(2) + ' / 5'],
      ['Rekomendasi (verdict)', m.verdict],
      ['Keputusan', m.decision || 'Tertunda'],
      ['Status', m.approved ? 'Disetujui & terkunci' : 'Draft (belum dikunci)'],
      ['Disetujui oleh', m.approver || '—'],
      ['Tanggal', m.date || '—'],
    ],
  });

  blocks.push({ type: 'heading', text: 'Penilaian Berbobot Faktor' });
  blocks.push({
    type: 'table',
    head: ['Faktor', 'Bobot', 'Skor', 'Catatan / justifikasi'],
    body: m.factors.map((f) => [f.k, String(f.w), String(f.s), f.note || '—']),
  });

  if (!isAcc(m.kind) && m.priorYear) {
    const py = m.priorYear;
    blocks.push({ type: 'heading', text: 'Pengalaman Tahun Lalu (SA 220.A24)' });
    blocks.push({
      type: 'kv',
      rows: [
        ['Opini ' + (py.fy || 'tahun lalu'), py.opinion || '—'],
        ['Temuan signifikan', String(py.findings ?? 0) + (py.findingsNote ? ' — ' + py.findingsNote : '')],
        ['Salah saji tak dikoreksi', rp(py.uncorrected)],
        ['Perubahan keadaan', py.changed || '—'],
        ['Kesulitan / keterbatasan', py.difficulties || '—'],
      ],
    });
  }

  if (!isAcc(m.kind) && m.triggers && m.triggers.length) {
    blocks.push({ type: 'heading', text: 'Pemicu Keberlanjutan' });
    blocks.push({
      type: 'table',
      head: ['Pemicu', 'Tingkat', 'Rincian'],
      body: m.triggers.map((t) => [t.label, sevLabel(t.severity), t.detail]),
    });
  }

  blocks.push({ type: 'heading', text: 'Safeguard / Syarat' });
  blocks.push({ type: 'para', text: m.safeguards && m.safeguards.trim() ? m.safeguards : 'Tidak ada safeguard/syarat tambahan yang diidentifikasi.' });

  if (m.trail && m.trail.length) {
    blocks.push({ type: 'heading', text: 'Jejak Persetujuan' });
    blocks.push({
      type: 'table',
      head: ['Tindakan', 'Oleh', 'Tanggal'],
      body: m.trail.map((t) => [t.action, t.by, t.at]),
    });
  }

  blocks.push({
    type: 'signature',
    signers: [{ label: 'Disetujui — Otoritas Firma', name: m.approver || '—', role: 'Rekan / Partner', at: m.date || '' }],
  });
  return blocks;
}

/** Lembar workbook memo (XLSX). Ringkasan + faktor (+ tahun-lalu/pemicu utk keberlanjutan) + jejak. */
export function buildMemoSheets(m: MemoInput): MemoXlsxSheet[] {
  const sheets: MemoXlsxSheet[] = [];
  sheets.push({
    name: 'Ringkasan', heading: memoTitle(m), colWidths: [28, 60],
    columns: ['Item', 'Nilai'],
    rows: [
      ['Klien', m.client],
      ['Industri', m.industry || '—'],
      ['Rekan', m.partner || '—'],
      ['Siklus / TB', m.cycle || '—'],
      ['Skor berbobot', m.score.toFixed(2)],
      ['Verdict', m.verdict],
      ['Keputusan', m.decision || 'Tertunda'],
      ['Status', m.approved ? 'Disetujui & terkunci' : 'Draft'],
      ['Disetujui oleh', m.approver || '—'],
      ['Tanggal', m.date || '—'],
    ],
  });
  sheets.push({
    name: 'Faktor', heading: 'Penilaian Berbobot Faktor', colWidths: [52, 8, 8, 60],
    columns: ['Faktor', 'Bobot', 'Skor', 'Catatan'],
    rows: m.factors.map((f) => [f.k, f.w, f.s, f.note || '']),
  });
  if (!isAcc(m.kind) && m.priorYear) {
    const py = m.priorYear;
    sheets.push({
      name: 'Tahun Lalu', heading: 'Pengalaman Tahun Lalu (SA 220.A24)', colWidths: [28, 60],
      columns: ['Item', 'Nilai'],
      rows: [
        ['Opini ' + (py.fy || ''), py.opinion || '—'],
        ['Temuan signifikan', py.findings ?? 0],
        ['Catatan temuan', py.findingsNote || ''],
        ['Salah saji tak dikoreksi', py.uncorrected ?? 0],
        ['Perubahan keadaan', py.changed || ''],
        ['Kesulitan / keterbatasan', py.difficulties || ''],
      ],
    });
  }
  if (!isAcc(m.kind) && m.triggers && m.triggers.length) {
    sheets.push({
      name: 'Pemicu', heading: 'Pemicu Keberlanjutan', colWidths: [40, 12, 70],
      columns: ['Pemicu', 'Tingkat', 'Rincian'],
      rows: m.triggers.map((t) => [t.label, sevLabel(t.severity), t.detail]),
    });
  }
  if (m.trail && m.trail.length) {
    sheets.push({
      name: 'Jejak', heading: 'Jejak Persetujuan', colWidths: [48, 28, 14],
      columns: ['Tindakan', 'Oleh', 'Tanggal'],
      rows: m.trail.map((t) => [t.action, t.by, t.at]),
    });
  }
  return sheets;
}

function sevLabel(s?: string): string {
  return s === 'high' ? 'Tinggi' : s === 'med' ? 'Sedang' : s === 'low' ? 'Rendah' : '—';
}
