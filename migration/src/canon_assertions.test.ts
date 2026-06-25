/* ============================================================
   Asersi manajemen (SA 315) — resolver lintas-vocab, relevansi,
   & mesin cakupan. Memastikan tiga dialek lama (Inggris/Indonesia/
   singkatan) konvergen ke id kanonik dan status sel benar.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import {
  ASSERTIONS, resolveAssertion, groupForAccountCode, groupForWtbGroup,
  relevanceFor, assertionCoverage,
  type ProcedureInput, type RiskInput,
} from './canon_assertions';

describe('taksonomi', () => {
  it('12 asersi: 6 transaksi + 6 saldo, id unik', () => {
    expect(ASSERTIONS).toHaveLength(12);
    expect(ASSERTIONS.filter(a => a.group === 'transaksi')).toHaveLength(6);
    expect(ASSERTIONS.filter(a => a.group === 'saldo')).toHaveLength(6);
    expect(new Set(ASSERTIONS.map(a => a.id)).size).toBe(12);
  });
});

describe('resolveAssertion — konvergensi tiga vocab', () => {
  it('label Indonesia tak-ambigu', () => {
    expect(resolveAssertion('Keberadaan')).toBe('existence');
    expect(resolveAssertion('Keterjadian')).toBe('occurrence');
    expect(resolveAssertion('Hak & Kewajiban')).toBe('rights_obligations');
    expect(resolveAssertion('Penilaian')).toBe('valuation');
    expect(resolveAssertion('Pisah Batas')).toBe('cutoff');
  });
  it('Inggris (RiskRow) & singkatan (EvRec) ke id sama', () => {
    expect(resolveAssertion('Occurrence')).toBe('occurrence');
    expect(resolveAssertion('Valuation')).toBe('valuation');
    expect(resolveAssertion('R&O')).toBe('rights_obligations');
    expect(resolveAssertion('V')).toBe('valuation');
    expect(resolveAssertion('CO')).toBe('cutoff');
  });
  it('label dwi-kategori disambiguasi oleh kelompok akun', () => {
    expect(resolveAssertion('Kelengkapan', 'saldo')).toBe('completeness_bal');
    expect(resolveAssertion('Kelengkapan', 'transaksi')).toBe('completeness_tx');
    expect(resolveAssertion('Penyajian', 'transaksi')).toBe('presentation_tx');
    expect(resolveAssertion('E/O', 'transaksi')).toBe('occurrence');
    expect(resolveAssertion('E/O', 'saldo')).toBe('existence');
  });
  it('prosedur perencanaan BUKAN asersi → null (tak keliru via substring)', () => {
    expect(resolveAssertion('Penilaian Risiko')).toBeNull();   // mengandung "Penilaian"
    expect(resolveAssertion('Pemahaman')).toBeNull();
    expect(resolveAssertion('Materialitas')).toBeNull();
    expect(resolveAssertion('Multiple')).toBeNull();           // risiko entitas-level
    expect(resolveAssertion('')).toBeNull();
  });
});

describe('kategori akun', () => {
  it('kode 4-/5- = transaksi; sisanya saldo', () => {
    expect(groupForAccountCode('4-1100')).toBe('transaksi');
    expect(groupForAccountCode('5-3100')).toBe('transaksi');
    expect(groupForAccountCode('1-1100')).toBe('saldo');
    expect(groupForWtbGroup('Pendapatan')).toBe('transaksi');
    expect(groupForWtbGroup('Aset Lancar')).toBe('saldo');
  });
});

describe('relevanceFor', () => {
  it('lead terkurasi mengembalikan daftar seed', () => {
    expect(relevanceFor('B', 'saldo')).toContain('valuation');
    expect(relevanceFor('R', 'transaksi')).toContain('cutoff');
  });
  it('lead tak terdaftar → seluruh asersi kategorinya (6)', () => {
    expect(relevanceFor('ZZ', 'saldo')).toHaveLength(6);
    expect(relevanceFor('ZZ', 'transaksi')).toHaveLength(6);
  });
});

describe('assertionCoverage', () => {
  const procs = (rows: Array<[string, string, string]>): ProcedureInput[] =>
    rows.map(([text, assertionLabel, status]) => ({ text, assertionLabel, status }));

  it('relevan tanpa prosedur → gap; gap dihitung', () => {
    const cov = assertionCoverage({ leadRef: 'B', group: 'saldo', procedures: [], risks: [] });
    expect(cov.gapCount).toBe(cov.relevantCount);
    expect(cov.coveredCount).toBe(0);
    cov.cells.filter(c => c.relevant).forEach(c => expect(c.status).toBe('gap'));
  });

  it('prosedur Selesai → concluded; Pengecualian → exception', () => {
    const cov = assertionCoverage({
      leadRef: 'B', group: 'saldo',
      procedures: procs([
        ['Konfirmasi piutang', 'Keberadaan', 'Selesai'],
        ['Re-perform ECL', 'Penilaian', 'Pengecualian'],
      ]),
      risks: [],
    });
    const exist = cov.cells.find(c => c.assertion.id === 'existence');
    const val = cov.cells.find(c => c.assertion.id === 'valuation');
    expect(exist?.status).toBe('concluded');
    expect(val?.status).toBe('exception');
    expect(cov.exceptionCount).toBe(1);
    expect(cov.concludedCount).toBeGreaterThanOrEqual(1);
  });

  it('risiko & bukti ber-tag mengisi sel asersi yang sama', () => {
    const risks: RiskInput[] = [{ id: 'R-03', area: 'Piutang', assertion: 'Valuation', inherent: 'Significant', fraud: false, desc: 'ECL' }];
    const cov = assertionCoverage({
      leadRef: 'B', group: 'saldo',
      procedures: procs([['Re-perform ECL', 'Penilaian', 'Berjalan']]),
      risks,
      evidence: [{ tier: 5, asr: ['V'] }, { tier: 3, asr: ['V'] }],
    });
    const val = cov.cells.find(c => c.assertion.id === 'valuation');
    expect(val?.risks.map(r => r.id)).toContain('R-03');
    expect(val?.evidenceCount).toBe(2);
    expect(val?.apprAvg).toBe(4);
    expect(val?.status).toBe('in-progress');
  });

  it('kesimpulan eksplisit auditor menimpa status turunan', () => {
    const cov = assertionCoverage({
      leadRef: 'B', group: 'saldo',
      procedures: procs([['Konfirmasi piutang', 'Keberadaan', 'Belum']]),
      risks: [],
      concl: { existence: { result: 'clean', concl: 'Bukti konfirmasi cukup.' } },
    });
    const exist = cov.cells.find(c => c.assertion.id === 'existence');
    expect(exist?.status).toBe('concluded');
    expect(exist?.signedOff).toBe(true);
    expect(exist?.concl).toContain('cukup');
  });
});
