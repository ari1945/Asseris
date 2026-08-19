/* ============================================================
   PRD `docs/prd-regulatory-reference-annual.md` · PR-3 · SC-5 · SC-6.

   Cacat yang ditutup: TER, PTKP dan biaya jabatan adalah konstanta telanjang
   tanpa masa berlaku. Yang disembunyikannya lebih tua daripada "tabelnya
   usang": TER baru ada SEJAK 1 Januari 2024. Menghitung masa 2023 dengan
   tabel ini bukan memakai angka yang salah — ia memakai METODE yang belum
   ada, dan bentuk lama melakukannya tanpa suara.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import {
  BIAYA_JABATAN_CAP_ANNUAL, BIAYA_JABATAN_REGISTRY, PTKP_ANNUAL, PTKP_REGISTRY,
  TER_LABEL, TER_REGISTRY, TER_TABLE, biayaJabatanOn, ptkpTableOn, terRate, terRateOn, terTableOn,
} from './canon_pph21';
import { regrefIssues } from './canon_regref';

const PAY = AMS.PAYROLL as unknown as Record<string, { gross: number; allowance: number; ptkp: string }>;

/* ------------------------------------------------------------------
   1. SC-5 — TER punya awal, dan sebelum awal itu ia tak menjawab
   ------------------------------------------------------------------ */

describe('SC-5 — TER berlaku sejak 1 Januari 2024, tidak sebelumnya', () => {
  it('1 Jan 2024 dan sesudahnya dijawab', () => {
    expect(terTableOn('2024-01-01').status).not.toBe('no-coverage');
    expect(terTableOn('2026-03-01').value).not.toBeNull();
    expect(terTableOn('2030-12-31').value).not.toBeNull();
  });

  it('31 Des 2023 DITOLAK — metodenya belum ada, bukan cuma angkanya beda', () => {
    const look = terTableOn('2023-12-31');
    expect(look.status).toBe('no-coverage');
    expect(look.value).toBeNull();
    expect(look.blocked).toBe(true);
    expect(look.note).toContain(TER_LABEL);
  });

  it('terRateOn menolak memberi tarif untuk masa pra-TER', () => {
    const r = terRateOn('K/3', 92_000_000, '2023-06-01');
    expect(r.rate).toBeNull();
    expect(r.blocked).toBe(true);
    /* nol bukan jawabannya: nol berarti "tidak ada pajak" */
    expect(r.rate).not.toBe(0);
  });

  it('tanggal yang tak dapat dibaca juga ditolak', () => {
    expect(terRateOn('K/3', 92_000_000, undefined).blocked).toBe(true);
    expect(terRateOn('K/3', 92_000_000, '').blocked).toBe(true);
  });
});

/* ------------------------------------------------------------------
   2. NOL-DELTA — masa 2026 menjawab persis seperti sebelum PR-3
   ------------------------------------------------------------------ */

describe('SC-10 — masa berjalan tidak bergeser satu basis poin pun', () => {
  it('terRateOn(2026) identik dengan terRate() untuk SELURUH roster', () => {
    for (const [id, p] of Object.entries(PAY)) {
      const base = p.gross + p.allowance;
      const lama = terRate(p.ptkp, base);
      const baru = terRateOn(p.ptkp, base, '2026-03-01');
      expect(baru.rate, id).toBe(lama.rate);
      expect(baru.category, id).toBe(lama.category);
      expect(baru.bracketUpTo, id).toBe(lama.bracketUpTo);
      expect(baru.verified, id).toBe(lama.verified);
      expect(baru.blocked, id).toBe(false);
    }
  });

  it('PTKP tak dikenal tetap "tak dapat ditentukan", bukan nol', () => {
    const r = terRateOn('Z/9', 10_000_000, '2026-03-01');
    expect(r.rate).toBeNull();
    expect(r.blocked).toBe(false); // tercakup; yang tak dikenal adalah PTKP-nya
    expect(r.note).toContain('tak dikenal');
  });
});

/* ------------------------------------------------------------------
   3. SC-6 — PTKP & biaya jabatan ikut registry yang sama
   ------------------------------------------------------------------ */

describe('SC-6 — PTKP & biaya jabatan tak lagi konstanta telanjang', () => {
  it('PTKP berlaku sejak Tahun Pajak 2016', () => {
    expect(ptkpTableOn('2016-01-01').value).toBe(PTKP_ANNUAL);
    expect(ptkpTableOn('2026-03-01').value).toBe(PTKP_ANNUAL);
    expect(ptkpTableOn('2015-12-31').status).toBe('no-coverage');
    expect(ptkpTableOn('2015-12-31').blocked).toBe(true);
  });

  it('biaya jabatan berlaku sejak 2009 dan menyebut PMK-nya', () => {
    const look = biayaJabatanOn('2026-03-01');
    expect(look.value?.capAnnual).toBe(BIAYA_JABATAN_CAP_ANNUAL);
    expect(look.status).toBe('ok');
    expect(look.set?.basis).toContain('PMK 250');
    expect(biayaJabatanOn('2008-12-31').blocked).toBe(true);
  });
});

/* ------------------------------------------------------------------
   4. Registry MENUNJUK literal yang sama — bukan menyalinnya
   ------------------------------------------------------------------ */

describe('registry tidak melahirkan register kedua', () => {
  it('value adalah OBJEK yang sama dengan konstanta yang sudah ada', () => {
    /* Pelajaran SC-24a (arc SDM): menyalin angka ke tempat kedua adalah cara
       paling mudah membuat dua kebenaran. Identitas objek diuji, bukan kesamaan
       nilai — salinan akan lolos `toEqual` dan gagal di sini. */
    expect(TER_REGISTRY[0].value).toBe(TER_TABLE);
    expect(PTKP_REGISTRY[0].value).toBe(PTKP_ANNUAL);
  });

  it('ketiga registry bersih secara struktural', () => {
    expect(regrefIssues(TER_REGISTRY, 'TER')).toEqual([]);
    expect(regrefIssues(PTKP_REGISTRY, 'PTKP')).toEqual([]);
    expect(regrefIssues(BIAYA_JABATAN_REGISTRY, 'Biaya jabatan')).toEqual([]);
  });

  it('TER masih belum terverifikasi — dan penandanya ikut ke registry', () => {
    expect(TER_REGISTRY[0].verified).toBe(false);
    expect(TER_REGISTRY[0].note).toBe(TER_TABLE.note);
    expect(terTableOn('2026-03-01').status).toBe('unverified');
    /* tetapi ia TIDAK memblokir — angkanya tetap dipakai dengan penanda */
    expect(terTableOn('2026-03-01').blocked).toBe(false);
  });
});

/* ------------------------------------------------------------------
   5. GERBANG CAKUPAN
   ------------------------------------------------------------------ */

const read = (f: string) => readFileSync(join(__dirname, f), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

describe('gerbang cakupan — slip gaji bertanya "masa apa?" lebih dulu', () => {
  it('view_payroll memakai terRateOn/terTableOn, bukan terRate telanjang', () => {
    const src = read('view_payroll.tsx');
    expect(src).toContain('terRateOn(');
    expect(src).toContain('terTableOn(');
    /* `terRate(` tanpa masa tak boleh muncul lagi di modul penggajian */
    expect(src).not.toMatch(/[^O]terRate\(/);
  });

  it('gerbang penggajian menutup BPJS maupun TER', () => {
    const src = read('view_payroll.tsx');
    expect(src).toContain('bpjsGate.blocked');
    expect(src).toContain('terGate.blocked');
  });
});
