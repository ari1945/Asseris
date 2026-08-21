import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { attestYear } from './canon_firm_attest';
import {
  smmEvalPeriod, smmEvalPeriodLabel, soqmAnnualAttestKey,
  SOQM_ANNUAL_ATTEST, SOQM_ATTEST_UNSET_KEY, SOQM_PERIOD_UNSET_LABEL,
} from './canon_smm_period';

/* ============================================================
   Periode evaluasi tahunan SMM (¶53) vs tahun kewajiban PPL (PMK 186/2021).

   CACAT: tiga modul mengalamatkan atestasi evaluasi SOQM dengan
   `CPE_REQ.year`. Dua periode tanpa hubungan apa pun, dan alamatnya masuk
   ke persistensi — begitu keduanya berpisah, atestasi lama menempel pada
   periode yang salah dan tak dapat ditemukan lagi.

   Yang dijaga berkas ini: (1) alamat atestasi SOQM tak dapat digerakkan jam
   PPL, (2) jam PPL tak dapat digerakkan periode evaluasi SOQM, (3) alamat
   yang sudah tersimpan tidak berpindah karena perbaikan ini, dan (4) ketiga
   modul itu tak dapat menyentuh register PPL lagi.
   ============================================================ */

const SRC = __dirname;
const ALLOW_LIST_RE = /^firmAttest\.soqmAnnualEval\.\d{4}$/;

/** Komentar dibuang supaya catatan sejarah tak dihitung sebagai kode. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}
const code = (f: string): string => stripComments(readFileSync(join(SRC, f), 'utf8'));

/** Modul yang mengalamatkan atestasi evaluasi SOQM. */
const SOQM_VIEWS = ['view_governance.tsx', 'view_isqm.tsx', 'view_isqm_deep.tsx'];

/* Dirakit dari potongan agar berkas gerbang ini tidak menuduh dirinya sendiri. */
const PPL_REGISTER = ['CPE', 'REQ'].join('_');

const seedEval = (): { period?: string; periodStart?: string; periodEnd?: string } =>
  (AMS as unknown as { QM_EVAL: { period?: string; periodStart?: string; periodEnd?: string } }).QM_EVAL;
const seedPplYear = (): number =>
  (AMS as unknown as { CPE_REQ: { year: number } }).CPE_REQ.year;

/* ------------------------------------------------------------------
   1 · CACAT: label tanpa tahun meminjam jam PPL
   ------------------------------------------------------------------ */
describe('alamat atestasi SOQM tidak meminjam tahun kewajiban PPL', () => {
  /* Ketiga modul menulis `master.period || 'Tahun Berjalan'`. Label itu tak
     memuat empat digit, sehingga fallback `attestKeyFor(name, period, fallback)`
     DIEKSEKUSI — dan fallback yang diisikan ketiganya adalah tahun PPL.
     `attestKeyFor` beserta parameter itu kini dihapus: tak ada lagi tempat
     bagi tahun dari domain lain untuk masuk ke alamat atestasi. */
  it('tak ada lagi jalan bagi tahun asing masuk ke alamat atestasi', () => {
    expect(attestYear.length).toBe(1);
    expect(attestYear('Tahun Berjalan')).toBeNull();
    /* Komentar dibuang — catatan sejarah di berkas itu memang menyebut fallback. */
    const attest = code('canon_firm_attest.ts');
    expect(attest).not.toContain('attestKeyFor');
    expect(attest).not.toContain('fallback');
    expect(attest).not.toContain('getFullYear');
  });

  it('BENTUK BARU tidak mengarang tahun untuk periode yang tak dinyatakan', () => {
    expect(smmEvalPeriod({ period: 'Tahun Berjalan' }).year).toBeNull();
    expect(smmEvalPeriod({}).year).toBeNull();
    expect(smmEvalPeriod(null).year).toBeNull();
    expect(soqmAnnualAttestKey(smmEvalPeriod({ period: 'Tahun Berjalan' }))).toBeNull();
    expect(smmEvalPeriod({}).label).toBe(SOQM_PERIOD_UNSET_LABEL);
  });

  it('turunan periode SOQM tak punya satu pun masukan PPL', () => {
    /* Jam PPL boleh bergerak ke mana pun — alamat SOQM tak melihatnya.
       `soqmAnnualAttestKey` hanya menerima periode; tak ada parameter lain
       yang dapat diisi tahun dari domain lain (itulah tempat cacatnya bersembunyi). */
    expect(soqmAnnualAttestKey.length).toBe(1);
    expect(smmEvalPeriod.length).toBe(1);
    const p = smmEvalPeriod({ periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(soqmAnnualAttestKey(p)).toBe('soqmAnnualEval.2025');
  });

  it('alamat sentinel tetap lolos allow-list server (bukan 403 senyap)', () => {
    expect(ALLOW_LIST_RE.test('firmAttest.' + SOQM_ATTEST_UNSET_KEY)).toBe(true);
    expect(SOQM_ATTEST_UNSET_KEY.startsWith(SOQM_ANNUAL_ATTEST + '.')).toBe(true);
    /* 0000 tak akan pernah bertabrakan dengan periode evaluasi nyata. */
    expect(SOQM_ATTEST_UNSET_KEY).toBe('soqmAnnualEval.0000');
  });
});

/* ------------------------------------------------------------------
   2 · Dua jam yang benar-benar terpisah — pada seed hari ini
   ------------------------------------------------------------------ */
describe('dua periode yang berbeda, pada data yang berlaku sekarang', () => {
  it('tahun evaluasi SMM dan tahun kewajiban PPL memang TIDAK sama', () => {
    /* Justru inilah sebabnya cacatnya berbahaya: keduanya sudah berselisih
       satu tahun hari ini. Yang menyembunyikannya adalah label seed yang
       kebetulan memuat empat digit, sehingga fallback tak pernah dieksekusi. */
    const evalYear = smmEvalPeriod(seedEval()).year;
    expect(evalYear).toBe(2025);
    expect(seedPplYear()).toBe(2026);
    expect(evalYear).not.toBe(seedPplYear());
  });

  it('mengganti periode evaluasi tidak menggerakkan tahun PPL', () => {
    /* Arah sebaliknya: register PPL tidak diturunkan dari QM_EVAL sama sekali. */
    const before = seedPplYear();
    expect(soqmAnnualAttestKey(smmEvalPeriod({ periodEnd: '2031-12-31' }))).toBe('soqmAnnualEval.2031');
    expect(seedPplYear()).toBe(before);
    /* Statik: berkas yang mendefinisikan register PPL tak menyebut QM_EVAL. */
    expect(code('data_part1.ts')).not.toContain('QM_EVAL');
  });

  it('mengganti tahun PPL tidak menggerakkan alamat atestasi SOQM', () => {
    const p = smmEvalPeriod(seedEval());
    const key = soqmAnnualAttestKey(p);
    const A = AMS as unknown as { CPE_REQ: { year: number } };
    const before = A.CPE_REQ.year;
    try {
      A.CPE_REQ.year = 2099;
      expect(soqmAnnualAttestKey(smmEvalPeriod(seedEval()))).toBe(key);
    } finally {
      A.CPE_REQ.year = before;
    }
  });
});

/* ------------------------------------------------------------------
   3 · Alamat yang sudah tersimpan tidak berpindah
   ------------------------------------------------------------------ */
describe('kompatibilitas alamat — tak ada atestasi yang hilang', () => {
  it('seed tetap dialamatkan soqmAnnualEval.2025, persis seperti sebelumnya', () => {
    /* Alamat sebelum perbaikan (lihat server/src/__tests__/signoff.test.ts,
       `firmAttest.soqmAnnualEval.2025`). Bila baris ini berubah, ada atestasi
       tersimpan yang perlu dimigrasikan — bukan sekadar uji yang perlu disetel. */
    expect(soqmAnnualAttestKey(smmEvalPeriod(seedEval()))).toBe('soqmAnnualEval.2025');
    expect(ALLOW_LIST_RE.test('firmAttest.' + soqmAnnualAttestKey(smmEvalPeriod(seedEval())))).toBe(true);
  });

  it('label warisan tanpa dua tanggal tetap dialamatkan sama seperti dulu', () => {
    /* Jalur kompatibilitas: empat digit PERTAMA pada label — perilaku
       `attestYear` dipertahankan persis, agar alamat lama tak berpindah. */
    for (const label of ['1 Jan – 31 Des 2025', 'FY2026', '2024', 'Periode 2023 (audit)']) {
      expect(soqmAnnualAttestKey(smmEvalPeriod({ period: label })))
        .toBe('soqmAnnualEval.' + attestYear(label));
    }
  });

  it('dua tanggal MENANG atas label yang bertentangan', () => {
    const p = smmEvalPeriod({ period: 'Periode 2019', periodStart: '2025-01-01', periodEnd: '2025-12-31' });
    expect(p.year).toBe(2025);
    expect(p.label).toBe('1 Jan – 31 Des 2025');
  });
});

/* ------------------------------------------------------------------
   4 · Label & alamat tak dapat berselisih
   ------------------------------------------------------------------ */
describe('label periode DITURUNKAN dari dua tanggal yang sama', () => {
  it('bentuk label seed tidak berubah oleh penurunan', () => {
    expect(smmEvalPeriodLabel('2025-01-01', '2025-12-31')).toBe('1 Jan – 31 Des 2025');
    expect(seedEval().period).toBe('1 Jan – 31 Des 2025');
  });

  it('periode lintas-tahun menulis tahun di kedua ujung', () => {
    expect(smmEvalPeriodLabel('2025-07-01', '2026-06-30')).toBe('1 Jul 2025 – 30 Jun 2026');
    expect(smmEvalPeriod({ periodStart: '2025-07-01', periodEnd: '2026-06-30' }).year).toBe(2026);
  });

  it('label selalu memuat tahun alamatnya', () => {
    const p = smmEvalPeriod(seedEval());
    expect(p.label).toContain(String(p.year));
  });

  it('tanggal yang bukan kalender ditolak, bukan dibulatkan', () => {
    expect(smmEvalPeriodLabel('2025-02-31', '2025-12-31')).toBe('');
    expect(smmEvalPeriod({ periodEnd: '2025-13-01' }).year).toBeNull();
    expect(smmEvalPeriod({ periodEnd: '31 Des 2025' }).year).toBeNull();
  });
});

/* ------------------------------------------------------------------
   5 · GERBANG STATIK
   ------------------------------------------------------------------ */
describe('GERBANG: modul SOQM tak menyentuh register PPL', () => {
  it('ketiga modul tak menyebut register kewajiban PPL sama sekali', () => {
    for (const f of SOQM_VIEWS) {
      expect(code(f), f).not.toContain(PPL_REGISTER);
    }
  });

  it('ketiga modul mengambil periodenya dari satu turunan kanonik', () => {
    for (const f of SOQM_VIEWS) {
      expect(code(f), f).toContain('smmEvalPeriod(');
      expect(code(f), f).toContain('canon_smm_period');
    }
  });

  it('tak ada modul SOQM yang mengurai tahun dari label tampilan', () => {
    /* `evalPeriod.slice(-4)` di Governance mencetak 'alan' untuk label
       'Tahun Berjalan' — jenis cacat yang sama, dua baris di bawahnya. */
    for (const f of SOQM_VIEWS) {
      expect(code(f), f).not.toMatch(/[Pp]eriod\w*\.slice\(/);
    }
  });

  it('hanya `attestKeyOf` yang merakit alamat atestasi dari sebuah tahun', () => {
    const src = code('canon_smm_period.ts');
    expect(src).toContain('attestKeyOf(');
    /* Tak ada perakit alamat kedua: tak ada template literal yang menyusun
       `soqmAnnualEval.<sesuatu>` sendiri di luar `attestKeyOf`. Sentinel
       'soqmAnnualEval.0000' dirakit dari konstanta nama, bukan diketik utuh. */
    expect(src).not.toMatch(/`\$\{SOQM_ANNUAL_ATTEST\}\.\$\{/);
    expect(src).not.toContain("'soqmAnnualEval.");
  });
});
