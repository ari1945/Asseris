/* ============================================================
   Firm GL — gerbang sumber atas `view_firmgl.tsx`.

   Berkas ini membaca SUMBERNYA, bukan hasil render, karena tiga cacat yang
   ditutup arc ini adalah cacat KABEL: mesin yang benar sudah ada, modulnya
   hanya tak pernah menyambungkannya.

     G1  Tab "Laporan Keuangan" merender neraca firma tanpa menyebut apakah
         rekonsiliasinya menutup. `grep -n "reconcil" view_firmgl.tsx` → kosong.
     G2  Empat tab data, nol ekspor. `grep -n "amsExport" view_firmgl.tsx` → kosong.
     G3  Pelaku jejak `GL_POST` diambil dari seed (`AMS.USER`), bukan sesi.

   CATATAN LINGKUP: irisan yang dipindai berhenti tepat sebelum `FirmJVForm`, jadi
   komponen AP/AR (`FirmAPAR`, modul `apar`) di berkas yang SAMA tidak ikut terpindai
   di sini. Cacat `who` yang sama di sana SUDAH ditutup arc `apar` (2026-08-22) dan
   digerbangi terpisah di `apar_conventions.test.ts` — termasuk pelaku sesi, register
   faktur yang hidup, dan ctx rekonsiliasi yang lengkap.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';

const SRC = join(__dirname, 'view_firmgl.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* Komentar dibuang lebih dulu: berkas ini mengutip pola lama sebagai catatan sejarah,
   dan gerbang yang memindai komentar akan menuduh catatan itu sendiri. */
const kodeFile = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Irisan fungsi `FirmGL()` saja — AP/AR di berkas yang sama tidak ikut dipindai. */
const kodeFirmGl = (): string => {
  const k = kodeFile();
  const start = k.indexOf('function FirmGL()');
  const end = k.indexOf('function FirmJVForm', start);
  if (start < 0 || end < 0) throw new Error('irisan FirmGL tak dapat ditentukan');
  return k.slice(start, end);
};

/** Badan satu fungsi-panah bertingkat-dua di dalam FirmGL (sampai `const` berikutnya). */
const badanFungsi = (decl: string): string => {
  const slice = kodeFirmGl();
  const at = slice.indexOf(decl);
  if (at < 0) throw new Error('fungsi tak ditemukan di FirmGL: ' + decl);
  const rest = slice.slice(at);
  const end = rest.indexOf('\n  const ', 1);
  return end > 0 ? rest.slice(0, end) : rest;
};

/* ------------------------------------------------------------------
   G1 — status rekonsiliasi hadir di modul, dari mesin yang sudah ada.
   ------------------------------------------------------------------ */
describe('G1 — laporan keuangan menyebut status rekonsiliasinya', () => {
  it('FirmGL memanggil FIRMFIN.reconciliations()', () => {
    expect(kodeFirmGl()).toMatch(/\breconciliations\s*\(/);
  });

  it('statusnya dievaluasi lewat gerbang bersama, bukan ambang baru di view', () => {
    const k = kodeFirmGl();
    expect(k).toMatch(/statementExportGate\s*\(/);
    /* Tak boleh ada toleransi rekonsiliasi kedua yang diketik di view. */
    const angkaAmbang = [...k.matchAll(/1_?000_?000\b|1e6\s*\)?\s*\?/g)].map((m) => m[0]);
    expect(angkaAmbang, 'ambang rekonsiliasi kedua di view: ' + angkaAmbang.join(' | ')).toEqual([]);
  });

  it('ctx rekonsiliasi disalurkan lengkap (COA turunan ledger + baris rekonsiliasi bank)', () => {
    const k = kodeFirmGl();
    expect(k).toMatch(/reconLines/);
    expect(k).toMatch(/useBankRecon\s*\(/);
  });
});

/* ------------------------------------------------------------------
   G2 — ekspor tersegel untuk keempat tab data, LK tunduk Q-2.
   ------------------------------------------------------------------ */
describe('G2 — ekspor tersegel', () => {
  it('modul memakai amsExportXlsx (bukan amsPrintDoc)', () => {
    const k = kodeFirmGl();
    expect(k).toMatch(/amsExportXlsx\s*\(/);
    expect(k).not.toMatch(/amsPrintDoc\s*\(/);
  });

  it('keempat model ekspor dibangun modul murni, bukan dirakit di view', () => {
    const k = kodeFirmGl();
    ['buildJournalExport', 'buildLedgerExport', 'buildTrialBalanceExport', 'buildStatementsExport']
      .forEach((f) => expect(k, f + ' tak dipakai').toMatch(new RegExp('\\b' + f + '\\s*\\(')));
  });

  it('pemblokiran LK ditegakkan di handler, bukan hanya pada atribut disabled', () => {
    const k = kodeFirmGl();
    /* Hasil `buildStatementsExport` diperiksa sebelum berkas ditulis. */
    expect(k).toMatch(/\.blocked/);
    expect(k).toMatch(/\.model/);
  });

  /* Q-2 diperluas (keputusan Ari 2026-08-22) — lihat firm_gl_export.test.ts. */
  it('Neraca Saldo tunduk gerbang yang SAMA (satu daftar artefak terkunci)', () => {
    const k = kodeFirmGl();
    /* Daftar artefak yang terkunci diturunkan dari satu tempat, bukan dua rantai
       `tab === '…'` yang bisa berpisah diam-diam. */
    expect(k).toMatch(/GATED_EXPORTS/);
    expect(k).toMatch(/GATED_EXPORTS\.(includes|indexOf)/);
  });

  it('pita rekonsiliasi tampil di tab Neraca Saldo maupun Laporan Keuangan', () => {
    const k = kodeFirmGl();
    /* Satu komponen, dirender dua kali — bukan dua salinan tabel yang bisa
       menyimpang. Pemblokiran harus MENJELASKAN, bukan sekadar mematikan tombol. */
    const pakai = [...k.matchAll(/<ReconBand\b/g)].length;
    expect(pakai, `<ReconBand> dirender ${pakai}x, seharusnya 2`).toBe(2);
    expect(k).toMatch(/function ReconBand\b/);
  });

  it('Jurnal Umum & Buku Besar TIDAK ikut terkunci', () => {
    const k = kodeFirmGl();
    const daftar = /const GATED_EXPORTS[^;]*;/.exec(k);
    expect(daftar, 'GATED_EXPORTS tak ditemukan').not.toBe(null);
    const isi = daftar ? daftar[0] : '';
    expect(isi).toContain("'tb'");
    expect(isi).toContain("'statements'");
    expect(isi).not.toContain("'journal'");
    expect(isi).not.toContain("'ledger'");
  });
});

/* ------------------------------------------------------------------
   G3 — pelaku jejak dari sesi.
   ------------------------------------------------------------------ */
describe('G3 — atribusi jejak GL', () => {
  it('FirmGL tidak lagi membaca AMS.USER', () => {
    expect(kodeFirmGl()).not.toMatch(/AMS\.USER/);
  });

  it('tidak ada fallback pelaku berupa literal', () => {
    expect(kodeFirmGl()).not.toMatch(/'Pengguna'/);
  });

  it('pelaku diturunkan glActor(), dari sesi auth', () => {
    const k = kodeFirmGl();
    expect(k).toMatch(/glActor\s*\(/);
    expect(k).toMatch(/auth\s*&&\s*auth\.user|auth\?\.user/);
  });

  it('kedua jalur tulis dijaga glWriteAllowed sebelum menulis & mencatat', () => {
    ['const togglePost', 'const addJV'].forEach((decl) => {
      const body = badanFungsi(decl);
      expect(body, decl + ' tanpa gerbang glWriteAllowed').toMatch(/glWriteAllowed\s*\(/);
      expect(body, decl + ' tak mencatat jejak').toMatch(/logActivity/);
    });
  });
});

/* ------------------------------------------------------------------
   (e) Identitas firma pada payload ekspor WAJIB dari SSOT.
   ------------------------------------------------------------------ */
describe('gerbang sumber — nol literal nama firma di view_firmgl.tsx', () => {
  const firm = (AMS.FIRM || {}) as { name?: string; short?: string; license?: string };

  it('premis — SSOT identitas firma memang berisi', () => {
    expect(firm.name).toBeTruthy();
    expect(firm.short).toBeTruthy();
  });

  it('tak satu pun varian nama firma ditulis sebagai literal', () => {
    const k = kodeFile();
    const varian = [firm.name, firm.short, firm.license, 'Wijaya Hartono', 'KAP Wijaya']
      .filter((v): v is string => !!v);
    const ditemukan = varian.filter((v) => k.includes(v));
    expect(ditemukan, 'literal identitas firma: ' + ditemukan.join(' | ')).toEqual([]);
  });

  it('nama firma pada payload diambil dari AMS.FIRM', () => {
    expect(kodeFirmGl()).toMatch(/AMS\.FIRM/);
  });
});
