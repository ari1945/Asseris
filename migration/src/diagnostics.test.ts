/* P4 — Tax Audit Diagnostic engine: detektor murni + orkestrator (ctx sintetik). */
import { describe, it, expect } from 'vitest';
import { benford, bookTaxFlags, amsDiagnostics, DIAG_SEV } from './diagnostics';

/* bangun populasi yang MENGIKUTI hukum Benford (leading digit d, count ∝ log10(1+1/d)) */
function benfordSet(total) {
  const out = [];
  for (let d = 1; d <= 9; d++) {
    const cnt = Math.round(Math.log10(1 + 1 / d) * total);
    for (let i = 0; i < cnt; i++) out.push(d * 1000 + i); // leading digit tetap d (i kecil)
  }
  return out;
}

describe('benford() — uji digit-awal', () => {
  it('populasi kecil (<30) → insufficient', () => {
    const r = benford([100, 200, 350, 9000, 12]);
    expect(r.n).toBe(5);
    expect(r.conformity).toBe('insufficient');
    expect(r.topDeviation).toBeNull();
  });

  it('populasi Benford-conforming → close/acceptable, MAD kecil', () => {
    const r = benford(benfordSet(1000));
    expect(r.n).toBeGreaterThan(900);
    expect(r.mad).toBeLessThan(0.012);
    expect(['close', 'acceptable']).toContain(r.conformity);
    // digit 1 ~ 30.1%
    expect(r.observedPct[0]).toBeGreaterThan(28);
    expect(r.observedPct[0]).toBeLessThan(32);
  });

  it('semua digit-awal = 9 → nonconforming, deviasi pada digit 9', () => {
    const r = benford(Array.from({ length: 100 }, (_v, i) => 9000 + i));
    expect(r.conformity).toBe('nonconforming');
    expect(r.mad).toBeGreaterThan(0.015);
    expect(r.topDeviation && r.topDeviation.digit).toBe(9);
  });

  it('leading digit benar untuk nilai besar (Rp penuh)', () => {
    const r = benford(Array.from({ length: 40 }, () => 2_780_000_000)); // digit 2
    expect(r.counts[1]).toBe(40); // index 1 = digit 2
  });
});

describe('bookTaxFlags() — red-flag fiskal/book-tax', () => {
  it('fig dengan beda permanen besar + ETR menyimpang + DTA atas rugi fiskal → 3 temuan', () => {
    const f = bookTaxFlags({ pbt: 48500, permAdd: 1200, permLess: 3000, taxExpBooked: 5000, dtaReported: 4980, taxLoss: 3000 });
    const ids = f.map(x => x.id).sort();
    expect(ids).toEqual(['bt-dta', 'bt-etr', 'bt-perm']);
    f.forEach(x => { expect(x.detector).toBe('bookTax'); expect(x.drillView).toBe('psak46'); expect(x.suggestedProcedure).toBeTruthy(); });
  });

  it('fig bersih → tak ada temuan', () => {
    const f = bookTaxFlags({ pbt: 100000, permAdd: 100, permLess: 100, taxExpBooked: 22000, dtaReported: 0, taxLoss: 0 });
    expect(f).toHaveLength(0);
  });
});

describe('amsDiagnostics() — orkestrator (ctx sintetik, hermetik)', () => {
  const ctx = {
    journalPop: [
      { id: 'J1', amount: 2_780_000_000, flags: ['afterhrs', 'periodend', 'unusual'], forensic: ['rpt'], rpId: 'RP-05', dir: 'out', party: 'CV Mitra' },
      { id: 'J2', amount: 100, flags: [] },
    ],
    aje: [],
    fig: { pbt: 48500, permAdd: 1200, permLess: 3000, taxExpBooked: 5000, dtaReported: 4980, taxLoss: 3000 },
    reconcileRows: [{ id: 'dbo', pos: 'Liabilitas Imbalan Kerja', variance: 50, status: 'err', ref: 'PSAK 24' }],
  };

  it('menghasilkan temuan dari setiap detektor', () => {
    const f = amsDiagnostics(ctx);
    const ids = f.map(x => x.id);
    expect(ids).toContain('jet-concentration');
    expect(ids).toContain('rpt-exposure');
    expect(ids).toContain('bt-perm');
    expect(ids).toContain('bt-etr');
    expect(ids).toContain('bt-dta');
    expect(ids).toContain('recon-dbo');
    expect(ids).toContain('benford-insufficient'); // hanya 2 nilai → insufficient
  });

  it('tiap temuan punya bentuk lengkap & terurut severity', () => {
    const f = amsDiagnostics(ctx);
    f.forEach(x => {
      expect(x.id).toBeTruthy();
      expect(['high', 'med', 'low']).toContain(x.sev);
      expect(x.std).toBeTruthy();
      expect(x.title).toBeTruthy();
      expect(Array.isArray(x.modules)).toBe(true);
    });
    for (let i = 1; i < f.length; i++) {
      expect(DIAG_SEV[f[i - 1].sev].rank).toBeGreaterThanOrEqual(DIAG_SEV[f[i].sev].rank);
    }
  });

  it('recon err = severity tinggi', () => {
    const f = amsDiagnostics(ctx);
    const recon = f.find(x => x.id === 'recon-dbo');
    expect(recon.sev).toBe('high');
  });

  it('menggabung extraFindings', () => {
    const extra = [{ id: 'x1', detector: 'crossChecks', sev: 'low', std: 'SA 230', title: 't', detail: 'd', modules: [] }];
    const f = amsDiagnostics({ ...ctx, extraFindings: extra });
    expect(f.find(x => x.id === 'x1')).toBeTruthy();
  });
});
