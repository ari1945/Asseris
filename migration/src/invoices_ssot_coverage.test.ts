/* ============================================================
   Modul `billing` · B2 — GERBANG CAKUPAN, bukan tie-out.

   Cacat aslinya: Billing MENULIS dokumen persist `invoices` sementara setiap
   konsumen hilir MEMBACA literal seed (`AMS.INVOICES` / impor `INVOICES` dari
   data_part1). "Tandai Lunas" menggerakkan KPI di layar Billing, dan tab
   Piutang, aging AR, dunning, serta pemicu keberlanjutan klien melihat keadaan
   seed selamanya.

   Yang dijaga di sini bukan NILAI (turunan == turunan selalu hijau — pelajaran
   #242), melainkan SIAPA MEMBACA APA: setiap konsumen register faktur masuk
   lewat satu pintu `useInvoiceRegister`, dan tak ada pintu belakang.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname);
const readRaw = (f: string): string => readFileSync(join(SRC, f), 'utf8');

/**
 * Kode saja — komentar dibuang.
 *
 * Komentar berkas-berkas ini justru MENJELASKAN pola lama yang dicabut
 * (`AMS.INVOICES`); tanpa pembuangan komentar gerbang gagal karena prosanya
 * sendiri, dan menekan gerbang dengan menghapus penjelasan sejarahnya adalah
 * kemunduran, bukan perbaikan.
 */
const read = (f: string): string => readRaw(f)
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');

/** Konsumen angka faktur/piutang. Menambah konsumen baru? Daftarkan di sini. */
const CONSUMERS = [
  'view_pipeline.tsx',     // Billing & Invoicing — penerbit
  'view_firmgl.tsx',       // AP/AR firma — tab Piutang, aging, konsentrasi
  'view_firmrevenue.tsx',  // PSAK 72 (tertagih) + dunning
  'view_firmfinance.tsx',  // ikhtisar keuangan firma — aging piutang (FIRMFIN.arAging)
  'view_continuance.tsx',  // pemicu keberlanjutan: piutang macet
  'view_platform.tsx',     // antrean persetujuan penerbitan faktur
];

describe('B2 — satu register faktur, nol pembaca seed', () => {
  it.each(CONSUMERS)('%s tidak membaca literal AMS.INVOICES', (file) => {
    expect(read(file)).not.toMatch(/AMS\.INVOICES/);
  });

  it.each(CONSUMERS)('%s tidak mengimpor seed INVOICES dari data_part1', (file) => {
    const src = read(file);
    const imports = src.match(/import\s*\{[^}]*\}\s*from\s*'\.\/data_part1'/g) || [];
    imports.forEach((line) => expect(line, file).not.toMatch(/\bINVOICES\b/));
  });

  it.each(CONSUMERS)('%s masuk lewat pintu tunggal useInvoiceRegister', (file) => {
    expect(read(file)).toMatch(/useInvoiceRegister/);
  });

  it('SATU PINTU: hanya use_invoices.ts yang memegang kunci persist `invoices`', () => {
    const holders = ['use_invoices.ts', ...CONSUMERS]
      .filter((f) => /useAmsPersist\(\s*['"]invoices['"]/.test(read(f)));
    expect(holders).toEqual(['use_invoices.ts']);
  });

  it('aritmetika piutang tinggal di kanon, tidak disalin ulang di view', () => {
    /* Pola lama yang disalin di dua berkas: filter status lalu Σ(amount − paid). */
    expect(read('view_firmgl.tsx')).not.toMatch(/status\s*!==\s*'Paid'\s*&&\s*\w+\.status\s*!==\s*'Draft'/);
    expect(read('view_pipeline.tsx')).toMatch(/arOutstanding|invoiceTotals/);
  });
});

describe('SC-9 — gate UI selaras dengan penegakan server', () => {
  it('use_invoices menggate dengan kapabilitas yang sama seperti capForWrite', async () => {
    const { capForWrite, CAP } = await import('./rbac');
    expect(capForWrite('firm', 'invoices')).toBe(CAP.FIRMFIN_EDIT);
    expect(read('use_invoices.ts')).toMatch(/CAP\.FIRMFIN_EDIT/);
  });

  it('penerbitan/pengiriman/pelunasan tak menulis register tanpa memeriksa kewenangan', () => {
    const src = read('view_pipeline.tsx');
    ['markPaid', 'send', 'addInv'].forEach((fn) => {
      expect(src, fn).toMatch(new RegExp(`const ${fn} = \\([^)]*\\) => \\{\\s*\\n\\s*if \\(!canEdit\\) return;`));
    });
  });
});

describe('B3/B5 — identitas pelaku & tanggal tidak boleh literal', () => {
  it('modul tidak mengambil pelaku jejak dari data seed', () => {
    /* `AMS.USER.name` = nama seed; siapa pun yang login, jejak menunjuk orang
       yang sama. Identitas sesi datang dari useCurrentAuditor (W7). */
    expect(read('view_pipeline.tsx')).not.toMatch(/AMS\.USER/);
    expect(read('view_pipeline.tsx')).toMatch(/useCurrentAuditor/);
  });

  it('nilai awal form faktur tidak memuat tanggal literal', () => {
    const src = read('view_pipeline.tsx');
    /* Berkas ini berakhiran CRLF — pola penutup wajib mentoleransi `\r`. */
    const decl = src.match(/(const|function)\s+invFormInit[\s\S]*?\r?\n\}/);
    expect(decl, 'inisialisasi form faktur tidak ditemukan').not.toBeNull();
    expect(decl && decl[0]).not.toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(src).not.toMatch(/INV_FORM_INIT\s*=\s*\{[^}]*\d{4}-\d{2}-\d{2}/);
  });
});
