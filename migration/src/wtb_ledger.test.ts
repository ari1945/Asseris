/* W-WTB·4 — ingress buku besar + tie-out sub-ledger. Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { parseLedger, ledgerForRow } from './wtb_ledger';

const GL = [
  'Kode\tTanggal\tUraian\tDokumen\tJumlah',
  '1-1100\t2025-12-03\tSetoran tunai\tBKM-001\t600.000.000',
  '1-1100\t2025-12-20\tPembayaran vendor\tBKK-014\t-200.000.000',
  '1-1100\t2025-12-31\tPenerimaan piutang\tBKM-099\t600.000.000',
  '1-1200\t2025-12-10\tPenjualan kredit\tINV-220\t2.000.000.000',
].join('\n');

describe('parseLedger — alur sukses (header + tab)', () => {
  const r = parseLedger(GL);
  it('terbaca tanpa error & terkelompok per akun', () => {
    expect(r.ok).toBe(true);
    expect(r.lineCount).toBe(4);
    expect(r.codeCount).toBe(2);
    expect(r.byCode['1-1100']).toHaveLength(3);
  });
  it('amount bertanda + field terurai', () => {
    const l = r.byCode['1-1100'][1];
    expect(l.amount).toBe(-200_000_000);
    expect(l.ref).toBe('BKK-014');
    expect(l.desc).toBe('Pembayaran vendor');
  });
});

describe('parseLedger — kolom Debit/Kredit', () => {
  it('amount = debit − kredit', () => {
    const dc = ['Kode\tDebit\tKredit', '1-1100\t600.000.000\t0', '1-1100\t0\t200.000.000'].join('\n');
    const r = parseLedger(dc);
    expect(r.ok).toBe(true);
    expect(r.byCode['1-1100'][0].amount).toBe(600_000_000);
    expect(r.byCode['1-1100'][1].amount).toBe(-200_000_000);
  });
});

describe('parseLedger — validasi', () => {
  it('input kosong → tidak ok', () => {
    expect(parseLedger('  ').ok).toBe(false);
  });
  it('jumlah tak terbaca → error', () => {
    const r = parseLedger(['Kode\tJumlah', '1-1100\tabc'].join('\n'));
    expect(r.issues.some(i => i.code === 'bad-amount')).toBe(true);
    expect(r.ok).toBe(false);
  });
  it('fallback posisional tanpa header', () => {
    const r = parseLedger(['1-1100;2025-12-01;Setoran;BKM-1;500.000.000'].join('\n'));
    expect(r.ok).toBe(true);
    expect(r.byCode['1-1100'][0].amount).toBe(500_000_000);
  });
});

describe('ledgerForRow — tie-out ke saldo unadjusted', () => {
  const { byCode } = parseLedger(GL);
  it('Σ baris GL = unadj → tied', () => {
    const t = ledgerForRow(byCode, { code: '1-1100', unadj: 1_000_000_000 });
    expect(t.hasDetail).toBe(true);
    expect(t.total).toBe(1_000_000_000); // 600 − 200 + 600
    expect(t.tied).toBe(true);
    expect(t.diff).toBe(0);
  });
  it('selisih bila tak cocok → untied', () => {
    const t = ledgerForRow(byCode, { code: '1-1100', unadj: 900_000_000 });
    expect(t.tied).toBe(false);
    expect(t.diff).toBe(100_000_000);
  });
  it('tanpa detail GL untuk akun → hasDetail false', () => {
    const t = ledgerForRow(byCode, { code: '9-9999', unadj: 0 });
    expect(t.hasDetail).toBe(false);
    expect(t.lines).toHaveLength(0);
  });
  it('sadar-pemetaan: kumpulkan via srcCodes (W-WTB·3 relabel+merge)', () => {
    const gl = parseLedger(['Kode\tJumlah', '1101\t600.000.000', '1102\t400.000.000'].join('\n'));
    const t = ledgerForRow(gl.byCode, { code: '1-1100', unadj: 1_000_000_000, srcCodes: ['1101', '1102'] });
    expect(t.lines).toHaveLength(2);
    expect(t.total).toBe(1_000_000_000);
    expect(t.tied).toBe(true);
  });
});
