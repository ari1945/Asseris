/* Wedge MVP F2 — uji mapping impor (PURE, atas aoa) + control-total + build_ctx end-to-end. */
import { describe, it, expect } from 'vitest';
import { mapGlAoa, mapTbAoa, mapFiskalAoa, controlTotals } from './import_parse';
import { buildDiagCtx } from './build_ctx';
import { amsDiagnostics } from '../diagnostics';

const GL_AOA = [
  ['ID', 'Tanggal', 'Jam', 'User', 'Debit', 'Kredit', 'Nilai', 'Keterangan'],
  ['JV-1', '16-06-2025', '10:30', 'staff.gl', '5-2100', '1-1100', '12.345.678', 'beban operasi'],
  ['JV-2', '27-12-2025', '23:48', 'finance.adm2', '4-1100', '1-1200', '2.000.000.000', 'pembalikan pendapatan'],
  ['', '', '', '', '', '', '', ''],   // baris kosong → dilewati
];

const TB_AOA = [
  ['Kode', 'Nama', 'Saldo'],
  ['1-1100', 'Kas', '5.000.000'],
  ['4-1100', 'Pendapatan', '(5.000.000)'],   // kredit dalam kurung → negatif
];

const FISKAL_AOA = [
  ['pbt', '48500'],
  ['permAdd', '4200'],
  ['taxExpBooked', '12000'],
];

describe('mapGlAoa', () => {
  it('memetakan header sinonim + format angka id-ID, lewati baris kosong', () => {
    const { rows } = mapGlAoa(GL_AOA);
    expect(rows.length).toBe(2);
    expect(rows[1].amount).toBe(2_000_000_000);
    expect(rows[0].drAccount).toBe('5-2100');
    expect(rows[1].user).toBe('finance.adm2');
  });
  it('kolom wajib hilang → warning + 0 baris', () => {
    const { rows, warnings } = mapGlAoa([['foo', 'bar'], ['a', 'b']]);
    expect(rows.length).toBe(0);
    expect(warnings.join(' ')).toMatch(/tanggal|nilai/);
  });
});

describe('mapTbAoa', () => {
  it('parse saldo bertanda termasuk kurung-negatif', () => {
    const { rows } = mapTbAoa(TB_AOA);
    expect(rows.length).toBe(2);
    expect(rows[0].unadj).toBe(5_000_000);
    expect(rows[1].unadj).toBe(-5_000_000);
    // tanpa kolom penyesuaian/saldo-adj → adj = unadj
    expect(rows[0].adj).toBe(5_000_000);
  });
  it('kolom penyesuaian (mutasi) → adj = unadj + mutasi', () => {
    const { rows } = mapTbAoa([
      ['Kode', 'Nama', 'Saldo', 'Penyesuaian'],
      ['1-1200', 'Piutang', '12.300.000.000', '(3.500.000.000)'],
    ]);
    expect(rows[0].unadj).toBe(12_300_000_000);
    expect(rows[0].adj).toBe(8_800_000_000);
  });
  it('kolom saldo adj (saldo akhir) dipakai langsung bila tak ada mutasi', () => {
    const { rows } = mapTbAoa([
      ['Kode', 'Nama', 'Saldo', 'Saldo Adj'],
      ['1-1200', 'Piutang', '12.300.000.000', '8.800.000.000'],
    ]);
    expect(rows[0].adj).toBe(8_800_000_000);
  });
});

describe('mapFiskalAoa', () => {
  it('key→nilai untuk fig book-tax', () => {
    const f = mapFiskalAoa(FISKAL_AOA);
    expect(f.pbt).toBe(48500);
    expect(f.permAdd).toBe(4200);
    expect(f.taxExpBooked).toBe(12000);
  });
});

describe('controlTotals', () => {
  it('TB bertanda Σ≈0 → balanced & ok', () => {
    const parsed = { gl: mapGlAoa(GL_AOA).rows, tb: mapTbAoa(TB_AOA).rows, fiskal: {}, warnings: [] };
    const ct = controlTotals(parsed);
    expect(ct.tbBalanced).toBe(true);
    expect(ct.glUnparsedDates).toBe(0);
    expect(ct.ok).toBe(true);
  });
  it('TB tak balance → ok=false', () => {
    const parsed = { gl: mapGlAoa(GL_AOA).rows, tb: [{ code: '1', name: 'x', unadj: 999, adj: 999, ly: 0 }], fiskal: {}, warnings: [] };
    expect(controlTotals(parsed).ok).toBe(false);
  });
});

describe('buildDiagCtx → amsDiagnostics (end-to-end impor)', () => {
  it('GL impor → ctx valid → mesin menyala (book-tax + ≥1 jurnal ber-flag)', () => {
    const parsed = {
      gl: mapGlAoa(GL_AOA).rows,
      tb: mapTbAoa(TB_AOA).rows,
      fiskal: mapFiskalAoa(FISKAL_AOA),
      warnings: [],
    };
    const built = buildDiagCtx(parsed);
    expect(built.journalCount).toBe(2);
    // JV-2: weekend(27-Des Sabtu) + afterhrs(23:48) + round(2M) + periodend(≈31-Des) ⇒ ≥3 flag
    expect(built.flaggedHigh).toBeGreaterThanOrEqual(1);

    const findings = amsDiagnostics(built.ctx);
    expect(findings.find(f => f.id === 'jet-concentration')).toBeTruthy();
    // fig: permAdd/pbt = 4200/48500 = 8.7% > 8% ⇒ bt-perm
    expect(findings.find(f => f.id === 'bt-perm')).toBeTruthy();
  });
});
