/* Wedge MVP F3 — round-trip workbook contoh: generate (xlsx write) → parse (xlsx read)
   → control-total → diagnostics. Mengunci sampel sebagai artefak teruji (dipakai F6/DoD). */
import { describe, it, expect } from 'vitest';
import { buildSampleWorkbook } from './sample_workbook';
import { parseImportWorkbook, controlTotals } from './import_parse';
import { buildDiagCtx } from './build_ctx';
import { amsDiagnostics } from '../diagnostics';

describe('buildSampleWorkbook → pipeline impor (round-trip xlsx)', () => {
  it('workbook contoh lolos control-total & menyalakan mesin', async () => {
    const buf = await buildSampleWorkbook();
    const parsed = await parseImportWorkbook(buf);

    expect(parsed.gl.length).toBe(42);          // 38 bersih + 4 berisiko
    expect(parsed.tb.length).toBeGreaterThan(10);
    expect(parsed.fiskal.pbt).toBe(48_500);

    const ct = controlTotals(parsed);
    expect(ct.tbBalanced).toBe(true);           // TB seimbang Σ≈0
    expect(ct.ok).toBe(true);

    const built = buildDiagCtx(parsed);
    expect(built.flaggedHigh).toBeGreaterThanOrEqual(1);
    expect(built.rptCount).toBeGreaterThanOrEqual(1);          // H1: pembayaran afiliasi berisiko
    expect(built.wtbOutlierCount).toBeGreaterThanOrEqual(1);   // H2: outlier neraca saldo

    const findings = amsDiagnostics(built.ctx);
    expect(findings.find((f: any) => f.id === 'jet-concentration')).toBeTruthy();
    expect(findings.find((f: any) => f.id === 'bt-perm')).toBeTruthy();
    expect(findings.find((f: any) => f.id === 'rpt-exposure')).toBeTruthy();          // SA 550 (H1)
    expect(findings.find((f: any) => String(f.id).startsWith('wtb-'))).toBeTruthy();  // SA 520 (H2)
    // kolom Penyesuaian (mutasi -3.5M top-up CKPN) → penyesuaian audit material (SA 450)
    expect(findings.find(f => String(f.id).startsWith('wtb-adj-'))).toBeTruthy();
  });
});
