/* K7/#4 — buildLetterPayload() harus deterministik (fungsi murni dari prospect+letter) dan
   sensitif terhadap perubahan field yang seharusnya mengubah isi surat, sehingga hash konten
   yang disegel (export_pdf.ts canonicalPayload → sha256) benar-benar mencerminkan apa yang
   ditandatangani, dan verifikasi ulang dari data yang sama menghasilkan hash yang sama. */
import { describe, it, expect } from 'vitest';
import { buildLetterPayload, type LetterProspect, type LetterState } from './letter_payload';

const PROSPECT: LetterProspect = {
  id: 'PR-001', name: 'PT Contoh Sejahtera', city: 'Jakarta', service: 'Audit Laporan Keuangan',
  fyEnd: '31 Desember 2025', standard: 'PSAK', fee: 250000000, deadline: '2026-04-30', partner: 'Rudi Gunawan',
};
const LETTER: LetterState = { version: 1, status: 'draft', scope: 'Audit atas laporan keuangan tahun 2025.' };

describe('buildLetterPayload()', () => {
  it('is deterministic for the same input', () => {
    const a = JSON.stringify(buildLetterPayload(PROSPECT, LETTER));
    const b = JSON.stringify(buildLetterPayload(PROSPECT, LETTER));
    expect(a).toBe(b);
  });

  it('changes when a content-bearing field changes (fee)', () => {
    const a = JSON.stringify(buildLetterPayload(PROSPECT, LETTER));
    const b = JSON.stringify(buildLetterPayload({ ...PROSPECT, fee: 999000000 }, LETTER));
    expect(a).not.toBe(b);
  });

  it('changes when the scope of work changes', () => {
    const a = JSON.stringify(buildLetterPayload(PROSPECT, LETTER));
    const b = JSON.stringify(buildLetterPayload(PROSPECT, { ...LETTER, scope: 'Ruang lingkup berbeda.' }));
    expect(a).not.toBe(b);
  });

  it('includes both signature slots (KAP partner + client director)', () => {
    const blocks = buildLetterPayload(PROSPECT, { ...LETTER, signedBy: 'Budi Santoso (Direksi)', signedDate: '2026-03-01' });
    const sig = blocks.find((b) => b.type === 'signature');
    expect(sig.signers).toHaveLength(2);
    expect(sig.signers[1].name).toBe('Budi Santoso (Direksi)');
  });

  it('the fee is formatted as Indonesian-locale thousands (no raw float leaking into the letter)', () => {
    const blocks = buildLetterPayload(PROSPECT, LETTER);
    const feePara = blocks.find((b) => b.type === 'para' && typeof b.text === 'string' && b.text.includes('Imbalan jasa'));
    expect(feePara.text).toContain('250.000.000');
  });
});
