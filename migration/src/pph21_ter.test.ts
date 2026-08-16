/* ============================================================
   PRD `docs/prd-sdm-kepatuhan-deepening.md` · PR-5 · SC-12 · SC-13 · SC-14.

   Cacat yang ditutup:
     (1) tarif TER adalah DATA per-pegawai, bukan fungsi (PTKP, bruto) —
         kenaikan gaji tak menggeser tarif, dan tarifnya tak dapat diuji
         terhadap peraturan yang dikutip modul itu sendiri;
     (2) "Posting ke General Ledger" hanya `nav('firmgl')` — beban gaji, utang
         PPh 21, dan utang BPJS tak pernah sampai ke buku besar;
     (3) rekonsiliasi Desember Pasal 17 dijanjikan footer modul dan tak pernah
         dihitung; "Estimasi Tahunan" = PPh bulanan × 12.

   Regresi PR-4 yang ikut ditutup: 59 baris payroll yang ditambahkan tak punya
   `ter`, sehingga `base * undefined` = NaN.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  PASAL17_BRACKETS, PTKP_ANNUAL, TER_TABLE, annualReconciliation, pasal17Tax,
  payrollGlRows, payrollJournal, payrollJournalIds, payrollPostCheck,
  terCategoryOf, terRate,
} from './canon_pph21';
import type { GlJournalRow, TerTable } from './canon_pph21';
import { calcPayslip } from './view_payroll';

const PAY = AMS.PAYROLL as unknown as Record<string, { gross: number; allowance: number; ptkp: string; ter?: number }>;
const RATES = AMS.PAYROLL_RATES as unknown as Record<string, number>;

/* ------------------------------------------------------------------
   1. SC-12 — tarif TER adalah FUNGSI
   ------------------------------------------------------------------ */

describe('SC-12 — kategori TER dari PTKP', () => {
  it('memetakan kesembilan PTKP ke A/B/C', () => {
    expect(['TK/0', 'TK/1', 'K/0'].map(terCategoryOf)).toEqual(['A', 'A', 'A']);
    expect(['TK/2', 'TK/3', 'K/1', 'K/2'].map(terCategoryOf)).toEqual(['B', 'B', 'B', 'B']);
    expect(terCategoryOf('K/3')).toBe('C');
  });

  it('PTKP tak dikenal → null, BUKAN kategori A diam-diam', () => {
    expect(terCategoryOf('X/9')).toBeNull();
    expect(terCategoryOf(undefined)).toBeNull();
    const l = terRate('X/9', 20_000_000);
    expect(l.rate).toBeNull();
    expect(l.note).toMatch(/tak dikenal/);
  });
});

describe('SC-12 — nol-delta: tabel mereproduksi tarif yang sudah dipakai', () => {
  /* Sepuluh baris payroll audit yang punya `ter` tersimpan. */
  const ANCHOR = ['EMP-001', 'EMP-002', 'EMP-003', 'EMP-007', 'EMP-008', 'EMP-012', 'EMP-021', 'EMP-022', 'EMP-031', 'EMP-032'];

  it.each(ANCHOR)('%s tarifnya tidak bergeser', (id) => {
    const p = PAY[id];
    const l = terRate(p.ptkp, p.gross + p.allowance);
    expect(l.rate).toBeCloseTo(p.ter as number, 10);
  });

  /* DUA baris firm-ops SENGAJA bergerak: tarif tersimpannya mustahil menurut
     struktur PMK 168 — kategori B tak boleh melebihi kategori A pada bruto yang
     sama, karena PTKP-nya lebih besar. */
  it('EMP-501 & EMP-601 bergerak — tarif lamanya melanggar struktur kategori', () => {
    for (const id of ['EMP-501', 'EMP-601']) {
      const p = PAY[id];
      const bruto = p.gross + p.allowance;
      const b = terRate(p.ptkp, bruto);
      const a = terRate('TK/0', bruto);
      expect(b.category).toBe('B');
      expect(b.rate).not.toBeCloseTo(p.ter as number, 10);
      /* yang benar: B < A pada bruto yang sama */
      expect(b.rate as number).toBeLessThan(a.rate as number);
      /* yang lama: B ≈ A — mustahil */
      expect(p.ter as number).toBeGreaterThanOrEqual((a.rate as number) - 0.005);
    }
  });
});

describe('SC-12 — kenaikan gaji MENGGESER lapisan', () => {
  it('bruto naik → tarif tak pernah turun (monoton)', () => {
    for (const cat of ['TK/0', 'K/1', 'K/3']) {
      let prev = -1;
      for (let b = 1_000_000; b <= 400_000_000; b += 1_000_000) {
        const r = terRate(cat, b).rate as number;
        expect(r, `${cat} @ ${b}`).toBeGreaterThanOrEqual(prev);
        prev = r;
      }
    }
  });

  it('menaikkan gaji EMP-032 memindahkannya ke lapisan lebih tinggi', () => {
    const p = PAY['EMP-032'];
    const now = terRate(p.ptkp, p.gross + p.allowance).rate as number;
    const naik = terRate(p.ptkp, p.gross + p.allowance + 5_000_000).rate as number;
    expect(naik).toBeGreaterThan(now);
  });

  it('PTKP lebih besar → tarif tak pernah lebih tinggi pada bruto sama', () => {
    for (let b = 5_000_000; b <= 200_000_000; b += 2_500_000) {
      const a = terRate('TK/0', b).rate as number;
      const bb = terRate('K/1', b).rate as number;
      const c = terRate('K/3', b).rate as number;
      expect(bb, `B@${b}`).toBeLessThanOrEqual(a);
      expect(c, `C@${b}`).toBeLessThanOrEqual(bb);
    }
  });

  it('setiap kategori punya lapisan teratas terbuka (upTo null)', () => {
    for (const cat of ['A', 'B', 'C'] as const) {
      const t = TER_TABLE[cat];
      expect(t[t.length - 1].upTo).toBeNull();
      /* batas menaik & tarif menaik */
      for (let i = 1; i < t.length - 1; i++) {
        expect((t[i].upTo as number) > (t[i - 1].upTo as number), `${cat}[${i}]`).toBe(true);
        expect(t[i].rate >= t[i - 1].rate, `${cat}[${i}]`).toBe(true);
      }
    }
  });
});

describe('SC-12 — provenans tabel dinyatakan, bukan disembunyikan', () => {
  it('tabel MENANDAI dirinya belum diverifikasi terhadap Lampiran', () => {
    expect(TER_TABLE.verified).toBe(false);
    expect(TER_TABLE.note).toMatch(/GANTI dengan Lampiran/);
  });

  it('setiap pencarian tarif membawa penanda verifikasinya', () => {
    expect(terRate('TK/0', 20_000_000).verified).toBe(false);
    const palsu: TerTable = { ...TER_TABLE, verified: true, note: '' };
    expect(terRate('TK/0', 20_000_000, palsu).verified).toBe(true);
  });
});

/* ------------------------------------------------------------------
   2. Regresi PR-4 — baris tanpa `ter` tak lagi NaN
   ------------------------------------------------------------------ */

describe('regresi PR-4 — 59 baris payroll tanpa `ter` menghasilkan NaN', () => {
  it('mayoritas baris payroll memang tak punya `ter` tersimpan', () => {
    const tanpa = Object.values(PAY).filter((p) => p.ter == null).length;
    expect(tanpa).toBeGreaterThan(50);
  });

  it('slip gaji mereka kini bernilai, bukan NaN', () => {
    for (const [id, p] of Object.entries(PAY)) {
      if (p.ter != null) continue;
      const s = calcPayslip(p, RATES);
      expect(Number.isFinite(s.pph), id).toBe(true);
      expect(Number.isFinite(s.net), id).toBe(true);
      expect(s.terSource, id).toBe('tabel');
      /* tarifnya BENAR-BENAR ada — bukan sekadar pph 0 yang kebetulan finite */
      expect(typeof s.ter, id).toBe('number');
      expect(s.ter as number, id).toBeGreaterThan(0);
      expect(s.pph, id).toBeGreaterThan(0);
    }
  });

  it('tak satu pun slip di seluruh roster menghasilkan NaN', () => {
    for (const [id, p] of Object.entries(PAY)) {
      const s = calcPayslip(p, RATES);
      for (const k of ['base', 'pph', 'totalDed', 'net', 'employerCost'] as const) {
        expect(Number.isFinite(s[k]), `${id}.${k}`).toBe(true);
      }
    }
  });

  it('PTKP tak dikenal → PPh 0 dengan penanda, bukan NaN diam-diam', () => {
    const s = calcPayslip({ gross: 10_000_000, allowance: 0, ptkp: 'Z/9' }, RATES);
    expect(s.terSource).toBe('tak-tentu');
    expect(s.ter).toBeNull();
    expect(Number.isFinite(s.net)).toBe(true);
  });
});

/* ------------------------------------------------------------------
   3. SC-14 — rekonsiliasi Desember Pasal 17
   ------------------------------------------------------------------ */

describe('SC-14 — Pasal 17 berlapis', () => {
  it('lapisan UU HPP', () => {
    expect(PASAL17_BRACKETS.map((b) => b.rate)).toEqual([0.05, 0.15, 0.25, 0.30, 0.35]);
  });

  it('PKP 60 jt → 5% penuh = 3 jt', () => expect(pasal17Tax(60_000_000)).toBe(3_000_000));

  it('PKP 100 jt → 3 jt + 15% × 40 jt = 9 jt', () => expect(pasal17Tax(100_000_000)).toBe(9_000_000));

  it('PKP 0 / negatif → 0', () => {
    expect(pasal17Tax(0)).toBe(0);
    expect(pasal17Tax(-5_000_000)).toBe(0);
  });

  it('bersifat menaik & kontinu di batas lapisan', () => {
    expect(pasal17Tax(250_000_000)).toBeGreaterThan(pasal17Tax(249_000_000));
    expect(pasal17Tax(500_000_001) - pasal17Tax(500_000_000)).toBeLessThan(1_000);
  });
});

describe('SC-14 — rekonsiliasi tahunan menggantikan "PPh bulanan × 12"', () => {
  it('biaya jabatan 5% ter-cap Rp 6 jt setahun', () => {
    const kecil = annualReconciliation({ ptkp: 'TK/0', brutoMonthly: 5_000_000 });
    expect(kecil.biayaJabatan).toBe(3_000_000);
    const besar = annualReconciliation({ ptkp: 'TK/0', brutoMonthly: 50_000_000 });
    expect(besar.biayaJabatan).toBe(6_000_000);
  });

  it('PTKP dikurangkan menurut statusnya', () => {
    expect(annualReconciliation({ ptkp: 'TK/0', brutoMonthly: 20_000_000 }).ptkp).toBe(PTKP_ANNUAL['TK/0']);
    expect(annualReconciliation({ ptkp: 'K/3', brutoMonthly: 20_000_000 }).ptkp).toBe(PTKP_ANNUAL['K/3']);
  });

  it('kewajiban tahunan BUKAN PPh bulanan × 12', () => {
    const p = PAY['EMP-021'];
    const bruto = p.gross + p.allowance;
    const rec = annualReconciliation({ ptkp: p.ptkp, brutoMonthly: bruto });
    const bulanan = Math.round(bruto * (terRate(p.ptkp, bruto).rate as number));
    expect(rec.annualTax).not.toBe(bulanan * 12);
  });

  it('selisih masa Desember = kewajiban setahun − yang sudah dipotong', () => {
    const rec = annualReconciliation({ ptkp: 'K/1', brutoMonthly: 44_000_000, withheldToDate: 40_000_000 });
    expect(rec.decemberWithholding).toBe(rec.annualTax - 40_000_000);
  });

  it('lebih potong menghasilkan angka NEGATIF, bukan nol', () => {
    const rec = annualReconciliation({ ptkp: 'TK/0', brutoMonthly: 6_000_000, withheldToDate: 50_000_000 });
    expect(rec.decemberWithholding).toBeLessThan(0);
  });

  it('PTKP tak dikenal → dinyatakan tak dapat dihitung', () => {
    const rec = annualReconciliation({ ptkp: 'Z/9', brutoMonthly: 20_000_000 });
    expect(rec.ptkpKnown).toBe(false);
    expect(rec.note).toMatch(/tak dapat dihitung/);
  });
});

/* ------------------------------------------------------------------
   4. SC-13 — jurnal yang benar-benar diposting
   ------------------------------------------------------------------ */

const JV = payrollJournal({ gross: 1_000_000_000, pph: 70_000_000, bpjsEmployee: 30_000_000, bpjsEmployer: 60_000_000, net: 900_000_000 });

describe('SC-13 — jurnal penggajian', () => {
  it('seimbang secara konstruksi', () => {
    expect(JV.balanced).toBe(true);
    expect(JV.totalDr).toBe(JV.totalCr);
  });

  it('menyentuh akun yang ADA di bagan akun firma', () => {
    const coa = new Set((AMS.FIRM_COA as unknown as { code: string }[]).map((a) => a.code));
    for (const l of JV.lines) expect(coa.has(l.ac), l.ac).toBe(true);
  });

  it('nomor jurnal deterministik per periode', () => {
    expect(payrollJournalIds('Maret 2026')).toEqual({
      salary: 'JV-PAY-MARET-2026-GAJI', pph: 'JV-PAY-MARET-2026-PPH21', bpjs: 'JV-PAY-MARET-2026-BPJS',
    });
  });
});

describe('SC-13 — gerbang posting menolak, bukan sekadar bernavigasi', () => {
  const base = { gl: [] as GlJournalRow[], period: 'Maret 2026', runStatus: 'approved', canPost: true, balanced: true };

  it('payroll draft ditolak', () => {
    expect(payrollPostCheck({ ...base, runStatus: 'draft' }).ok).toBe(false);
  });

  it('tanpa kewenangan keuangan firma ditolak', () => {
    const c = payrollPostCheck({ ...base, canPost: false });
    expect(c.ok).toBe(false);
    expect(c.reason).toMatch(/FIRMFIN_EDIT/);
  });

  it('jurnal tak seimbang ditolak', () => {
    expect(payrollPostCheck({ ...base, balanced: false }).ok).toBe(false);
  });

  it('payroll disetujui + berwenang + seimbang → diizinkan', () => {
    expect(payrollPostCheck(base).ok).toBe(true);
  });

  it('POSTING GANDA ditolak — periode yang sama tak dapat masuk dua kali', () => {
    const rows = payrollGlRows(JV, 'Maret 2026', '2026-03-09');
    expect(rows.length).toBeGreaterThan(0);
    const after = payrollPostCheck({ ...base, gl: rows });
    expect(after.ok).toBe(false);
    expect(after.reason).toMatch(/sudah diposting/);
  });

  it('periode BERBEDA tetap boleh diposting', () => {
    const rows = payrollGlRows(JV, 'Maret 2026', '2026-03-09');
    expect(payrollPostCheck({ ...base, gl: rows, period: 'April 2026' }).ok).toBe(true);
  });

  it('baris GL memakai akun nyata & jumlah positif', () => {
    const coa = new Set((AMS.FIRM_COA as unknown as { code: string }[]).map((a) => a.code));
    for (const r of payrollGlRows(JV, 'Maret 2026', '2026-03-09')) {
      expect(coa.has(r.dr), r.dr).toBe(true);
      expect(coa.has(r.cr), r.cr).toBe(true);
      expect(r.amount).toBeGreaterThan(0);
      expect(r.posted).toBe(true);
    }
  });
});

/* ------------------------------------------------------------------
   5. Gerbang cakupan
   ------------------------------------------------------------------ */

const SRC = join(__dirname);
const read = (f: string) => readFileSync(join(SRC, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('gerbang cakupan — tarif & posting', () => {
  it('view payroll tidak lagi mengalikan `p.ter` langsung', () => {
    const src = read('view_payroll.tsx');
    expect(src).not.toMatch(/base \* p\.ter/);
    expect(src).not.toMatch(/r\.p\.ter \* 100/);
  });

  it('tombol posting benar-benar menulis GL, bukan bernavigasi', () => {
    const src = read('view_payroll.tsx');
    expect(src).toMatch(/payrollPostCheck/);
    expect(src).toMatch(/setGl\(/);
    /* pola lama: satu-satunya aksi tombol adalah nav('firmgl') */
    expect(src).toMatch(/onClick=\{postToGl\}/);
  });

  it('"Estimasi Tahunan" = PPh × 12 sudah dicabut', () => {
    expect(read('view_payroll.tsx')).not.toMatch(/pph \* 12/);
  });

  it('spanduk provenans TER ditampilkan selama tabel belum diverifikasi', () => {
    expect(read('view_payroll.tsx')).toMatch(/TER_TABLE\.verified/);
  });
});
