/* ============================================================
   K7/#4 — Engagement letter (SA 210) canonical payload builder.
   ------------------------------------------------------------
   Pure function: (prospect, letter) → block[] consumed by amsExportPdf() (export_pdf.ts), the
   SAME generator/seal pattern already used for the audit opinion (view_opinion.tsx). This is what
   turns "signed" from a mutable status string on the `prospects` StateDoc into a FROZEN, server-
   verifiable artifact: the content hash sealed at sign-time covers exactly what this function
   returns for the (p, L) pair at that moment — later edits to the prospect (fee, scope, deadline)
   change what buildLetterPayload() returns for the CURRENT prospect, but do not alter the hash
   already sealed for the version that was signed (StateDocHistory, K7, preserves that prior
   prospect/letter shape too, so the exact signed content remains reconstructable for audit).

   Deliberately PURE — no `new Date()`/`Math.random()` — so the same (p, L) always hashes
   identically (reproducible verification), and the module is trivially unit-testable.
   ============================================================ */

export interface LetterProspect {
  id: string;
  name: string;
  city?: string;
  service: string;
  fyEnd?: string;
  standard: string;
  fee: number;
  deadline?: string;
  partner?: string;
}

export interface LetterState {
  version: number;
  status: string;
  scope: string;
  signedBy?: string;
  signedDate?: string;
}

const RESPONSIBILITIES = [
  'Menyusun laporan keuangan sesuai Standar Akuntansi Keuangan yang berlaku di Indonesia;',
  'Merancang, menerapkan, dan memelihara pengendalian internal yang relevan;',
  'Memberi akses tanpa batas atas informasi, catatan, dan personel yang relevan;',
  'Menyediakan representasi tertulis pada akhir perikatan (SA 580).',
];

function fmtRp(n: number | undefined): string {
  const v = typeof n === 'number' ? n : 0;
  return new Intl.NumberFormat('id-ID').format(v);
}

type LetterBlock =
  | { type: 'heading'; text: string }
  | { type: 'para'; text: string }
  | { type: 'signature'; signers: { label: string; name: string; role: string; at: string }[] };

/** Build the SA 210 engagement letter content blocks — mirrors the on-screen paper exactly
 *  (StepLetter in view_onboarding2.tsx), so the sealed PDF and the preview never diverge. */
export function buildLetterPayload(p: LetterProspect, L: LetterState): LetterBlock[] {
  const blocks: LetterBlock[] = [
    { type: 'heading', text: 'SURAT PERIKATAN AUDIT' },
    {
      type: 'para',
      text: `Kepada Yth. Direksi dan Pihak yang Bertanggung Jawab atas Tata Kelola\n${p.name}\n${p.city || ''}`,
    },
    {
      type: 'para',
      text: `Anda telah meminta kami untuk melaksanakan ${(p.service || '').toLowerCase()} atas laporan keuangan ${p.name} yang terdiri dari laporan posisi keuangan per ${p.fyEnd || ''} serta laporan laba rugi, perubahan ekuitas, dan arus kas untuk tahun yang berakhir pada tanggal tersebut, sesuai ${p.standard}. Surat ini menegaskan penerimaan dan pemahaman kami atas perikatan ini (SA 210).`,
    },
    { type: 'heading', text: 'Ruang Lingkup' },
    { type: 'para', text: L.scope || '' },
    { type: 'heading', text: 'Tanggung Jawab Auditor' },
    {
      type: 'para',
      text: 'Kami akan melaksanakan audit dengan tujuan menyatakan opini atas laporan keuangan, berdasarkan Standar Audit yang ditetapkan IAPI. Audit dirancang untuk memperoleh keyakinan memadai, bukan absolut, atas bebasnya laporan keuangan dari kesalahan penyajian material.',
    },
    { type: 'heading', text: 'Tanggung Jawab Manajemen' },
    { type: 'para', text: RESPONSIBILITIES.join(' ') },
    { type: 'heading', text: 'Imbalan Jasa' },
    {
      type: 'para',
      text: `Imbalan jasa profesional sebesar Rp ${fmtRp(p.fee)} (belum termasuk PPN dan biaya langsung), ditagih bertahap sesuai kemajuan pekerjaan. Penyelesaian pelaporan ditargetkan ${p.deadline || ''}.`,
    },
    {
      type: 'signature',
      signers: [
        { label: `Menyetujui untuk KAP`, name: p.partner || '', role: 'Rekan / Partner', at: '' },
        { label: `Menyetujui untuk ${p.name.replace('PT ', '')}`, name: L.signedBy || '', role: 'Direksi', at: L.signedDate || '' },
      ],
    },
  ];
  return blocks;
}
