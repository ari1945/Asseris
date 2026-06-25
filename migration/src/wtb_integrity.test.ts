/* W-WTB·2 — gerbang integritas WTB. Fungsi murni. */
import { describe, it, expect } from 'vitest';
import { checkWtbIntegrity, ajeRegisterByAccount } from './wtb_integrity';
import type { IntegrityWtbRow, IntegrityAjeEntry } from './wtb_integrity';
import { AMS } from './data';

describe('ajeRegisterByAccount — proyeksi register ke delta per akun (Dr +, Cr −)', () => {
  it('bentuk ringkas dr/cr + amount', () => {
    const m = ajeRegisterByAccount([{ id: 'A1', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 }]);
    expect(m.get('5-1100')).toBe(2_340_000_000);
    expect(m.get('1-1300')).toBe(-2_340_000_000);
  });
  it('bentuk terstruktur lines[]', () => {
    const m = ajeRegisterByAccount([{ id: 'A2', lines: [{ code: '5-3100', debit: 620_000_000 }, { code: '1-1210', credit: 620_000_000 }] }]);
    expect(m.get('5-3100')).toBe(620_000_000);
    expect(m.get('1-1210')).toBe(-620_000_000);
  });
});

describe('checkWtbIntegrity — SEED demo (ENG-2025-014) konsisten penuh (A2)', () => {
  /* Penjaga regresi: seed WTB+AJE harus lolos gerbang integritas — Σ kolom AJE = 0,
     kolom AJE ≡ proyeksi register per akun, neraca ter-tie. Mencegah edit seed
     mendatang diam-diam mengembalikan ketidakkonsistenan (sisi debit AJE hilang /
     penyesuaian hantu tanpa jurnal). Gerbang finalisasi (A1) membaca status ini. */
  const r = checkWtbIntegrity(AMS.WTB, AMS.AJE);
  it('status ok — ajeBalanced, registerReconciled, adjConsistent, bsTied', () => {
    expect(r.ajeBalanced).toBe(true);
    expect(r.registerReconciled).toBe(true);
    expect(r.adjConsistent).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.status).toBe('ok');
  });
  it('tak ada akun yang kolom AJE-nya menyimpang dari register', () => {
    expect(r.ajeMismatches).toHaveLength(0);
  });
});

describe('checkWtbIntegrity — TB ter-foot ketat (Σ=0, tanpa AJE)', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 3_000_000_000, aje: 0, adj: 3_000_000_000 },
    { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 },
    { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  it('footed, neraca seimbang, status ok', () => {
    expect(r.footed).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.bsDiff).toBe(0);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — TB pra-tutup (RE saldo awal, laba terbuka)', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
    { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
    { code: '3-2100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 }, // RE saldo awal
    { code: '4-1100', unadj: -3_000_000_000, aje: 0, adj: -3_000_000_000 },
    { code: '5-1100', unadj: 2_000_000_000, aje: 0, adj: 2_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  it('Σ=0 ter-foot; selisih neraca = laba berjalan → dijelaskan & bsTied', () => {
    expect(r.footed).toBe(true);
    expect(r.netIncome).toBe(1_000_000_000);
    expect(r.bsDiff).toBe(1_000_000_000);
    expect(r.bsExplainedByIncome).toBe(true);
    expect(r.bsTied).toBe(true);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — demo-like: neraca pas tapi Σ≠0 (RE memuat laba) + AJE tak seimbang', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 7_000_000_000, aje: 0, adj: 7_000_000_000 },
    { code: '2-1100', unadj: -2_000_000_000, aje: 0, adj: -2_000_000_000 },
    { code: '3-2100', unadj: -5_000_000_000, aje: 0, adj: -5_000_000_000 }, // RE memuat laba
    { code: '4-1100', unadj: -4_000_000_000, aje: 0, adj: -4_000_000_000 },
    { code: '5-1100', unadj: 2_900_000_000, aje: 100_000_000, adj: 3_000_000_000 },
  ];
  const r = checkWtbIntegrity(rows, []);
  it('footing dijelaskan oleh laba (info), neraca pas, AJE tak seimbang → attention', () => {
    expect(r.footed).toBe(false);
    expect(r.footingExplainedByIncome).toBe(true);
    expect(r.bsDiff).toBe(0);
    expect(r.bsTied).toBe(true);
    expect(r.ajeBalanced).toBe(false);
    expect(r.status).toBe('attention');
    expect(r.messages.some(m => m.level === 'info')).toBe(true);
  });
});

describe('checkWtbIntegrity — AJE kolom selaras register → reconciled & ok', () => {
  const rows: IntegrityWtbRow[] = [
    { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
    { code: '1-1300', unadj: 4_340_000_000, aje: -2_340_000_000, adj: 2_000_000_000 },
    { code: '2-1100', unadj: -7_000_000_000, aje: 0, adj: -7_000_000_000 },
    { code: '4-1100', unadj: -2_340_000_000, aje: 0, adj: -2_340_000_000 },
    { code: '5-1100', unadj: 0, aje: 2_340_000_000, adj: 2_340_000_000 },
  ];
  const aje: IntegrityAjeEntry[] = [{ id: 'AJE-01', dr: '5-1100 BPP', cr: '1-1300 Persediaan', amount: 2_340_000_000 }];
  const r = checkWtbIntegrity(rows, aje);
  it('Σ aje=0, tie ke register, neraca pas → ok', () => {
    expect(r.ajeBalanced).toBe(true);
    expect(r.registerReconciled).toBe(true);
    expect(r.ajeMismatches).toHaveLength(0);
    expect(r.status).toBe('ok');
  });
});

describe('checkWtbIntegrity — anomali terdeteksi', () => {
  it('Σ tak nol & bukan laba → footing warn + neraca tak seimbang', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
      { code: '2-1100', unadj: -1_000_000_000, aje: 0, adj: -1_000_000_000 },
    ];
    const r = checkWtbIntegrity(rows, []);
    expect(r.footingExplainedByIncome).toBe(false);
    expect(r.bsTied).toBe(false);
    expect(r.status).toBe('attention');
    expect(r.messages.some(m => m.level === 'warn')).toBe(true);
  });

  it('adjusted ≠ unadjusted + AJE → adjMismatch', () => {
    const rows: IntegrityWtbRow[] = [{ code: '1-1100', unadj: 1_000_000_000, aje: 0, adj: 2_000_000_000 }];
    const r = checkWtbIntegrity(rows, []);
    expect(r.adjConsistent).toBe(false);
    expect(r.adjMismatches[0].code).toBe('1-1100');
  });

  it('kolom AJE WTB tak selaras register → ajeMismatch per akun', () => {
    const rows: IntegrityWtbRow[] = [
      { code: '1-1100', unadj: 5_000_000_000, aje: 0, adj: 5_000_000_000 },
      { code: '1-1300', unadj: 4_340_000_000, aje: -2_340_000_000, adj: 2_000_000_000 },
      { code: '2-1100', unadj: -7_000_000_000, aje: 0, adj: -7_000_000_000 },
      { code: '4-1100', unadj: -2_340_000_000, aje: 0, adj: -2_340_000_000 },
      { code: '5-1100', unadj: 0, aje: 2_340_000_000, adj: 2_340_000_000 },
    ];
    // register memberi 5-1100 +2.34M tapi via akun lain (1-1200, bukan 1-1300) → mismatch
    const aje: IntegrityAjeEntry[] = [{ id: 'AJE-X', dr: '5-1100 BPP', cr: '1-1200 Piutang', amount: 2_340_000_000 }];
    const r = checkWtbIntegrity(rows, aje);
    expect(r.registerReconciled).toBe(false);
    expect(r.ajeMismatches.some(mm => mm.code === '1-1200' || mm.code === '1-1300')).toBe(true);
  });
});
