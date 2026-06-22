/* Wedge MVP F2 · SPIKE R1 — uji derivasi flag risiko jurnal (SA 240 ¶32).
   Membuktikan: GL impor → flags terderivasi ⇒ detektor JET (≥3 flag) dapat
   menyala atas data nyata, BUKAN hanya seed hardcoded. */
import { describe, it, expect } from 'vitest';
import { buildPopulationContext, deriveJournalFlags, parseGlDate } from './derive_flags';
import { amsDiagnostics } from '../diagnostics';

/* Populasi sintetik: 1 jurnal jelas-berisiko + banyak jurnal "bersih". */
function cleanRows(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({
      id: 'C' + i, date: '16-06-2025', time: '10:30', user: 'staff.gl',
      amount: 12_345_678 + i * 137, drAccount: '5-2100', crAccount: '1-1100',
    });
  }
  return out;
}

describe('parseGlDate', () => {
  it('parse dd-mm-yyyy & yyyy-mm-dd', () => {
    expect(parseGlDate('31-12-2025').getFullYear()).toBe(2025);
    expect(parseGlDate('31-12-2025').getMonth()).toBe(11);
    expect(parseGlDate('2025-12-31').getDate()).toBe(31);
    expect(parseGlDate('')).toBeNull();
  });
});

describe('deriveJournalFlags — derivasi dari GL mentah', () => {
  it('jurnal berisiko (akhir-pekan + luar-jam + bulat + tutup-buku) → ≥3 flag', () => {
    const rows = cleanRows(40).concat([{
      id: 'RISK-1', date: '27-12-2025' /* Sabtu */, time: '23:48', user: 'finance.adm2',
      amount: 2_000_000_000, drAccount: '4-1100', crAccount: '1-1200',
    }]);
    const pop = buildPopulationContext(rows);
    const risk = rows[rows.length - 1];
    const flags = deriveJournalFlags(risk, pop);
    expect(flags).toContain('weekend');
    expect(flags).toContain('afterhrs');
    expect(flags).toContain('round');
    expect(flags).toContain('periodend');     // 27-Des dalam 7 hari dari 31-Des
    expect(flags.length).toBeGreaterThanOrEqual(3);
  });

  it('jurnal bersih (hari kerja, jam kerja, nilai ganjil, tengah tahun) → 0 flag', () => {
    const rows = cleanRows(40);
    const pop = buildPopulationContext(rows);
    // pilih baris yang akun & user-nya sering muncul (bukan langka)
    const flags = deriveJournalFlags(rows[20], pop);
    expect(flags).toEqual([]);
  });

  it('rareuser & seldom terderivasi relatif-populasi', () => {
    const rows = cleanRows(40).concat([{
      id: 'RARE-1', date: '16-06-2025', time: '11:00', user: 'ceo.override',
      amount: 12_000_111, drAccount: '9-9999', crAccount: '1-1100',
    }]);
    const pop = buildPopulationContext(rows);
    const flags = deriveJournalFlags(rows[rows.length - 1], pop);
    expect(flags).toContain('rareuser');   // ceo.override hanya 1 entri
    expect(flags).toContain('seldom');     // akun 9-9999 hanya 1 kemunculan
  });

  it('threshold nonaktif tanpa ambang, aktif bila diberikan', () => {
    const rows = cleanRows(10);
    const just = { id: 'T1', date: '16-06-2025', time: '10:00', user: 'staff.gl', amount: 980_000_000, drAccount: '5-2100', crAccount: '1-1100' };
    expect(deriveJournalFlags(just, buildPopulationContext(rows))).not.toContain('threshold');
    const popT = buildPopulationContext(rows, { authThreshold: 1_000_000_000 });
    expect(deriveJournalFlags(just, popT)).toContain('threshold');
  });
});

describe('integrasi: GL impor terderivasi → JET concentration menyala', () => {
  it('≥1 jurnal berisiko ⇒ amsDiagnostics memunculkan temuan jet-concentration', () => {
    const rows = cleanRows(40).concat([
      { id: 'X1', date: '28-12-2025', time: '22:00', user: 'finance.adm2', amount: 1_500_000_000, drAccount: '6-1300', crAccount: '1-1100' },
      { id: 'X2', date: '27-12-2025', time: '23:10', user: 'gl.manager', amount: 985_000_000, drAccount: '6-1900', crAccount: '2-1100' },
    ]);
    const pop = buildPopulationContext(rows);
    const journalPop = rows.map(r => ({ id: r.id, amount: Math.abs(r.amount), flags: deriveJournalFlags(r, pop) }));
    const findings = amsDiagnostics({ journalPop, reconcileRows: [], fig: {} });
    const jet = findings.find(f => f.id === 'jet-concentration');
    expect(jet).toBeTruthy();
    expect(jet.sev).toBe('high');
  });
});
