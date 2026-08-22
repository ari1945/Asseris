/* ============================================================
   Kas, Bank & Rekonsiliasi — GERBANG KONVENSI (CB1 · CB3 · CB4).

   Berkas ini sengaja TIDAK mengimpor satu pun modul baru: seluruh isinya dapat
   dijalankan terhadap HEAD sebelum perbaikan, sehingga merahnya adalah kegagalan
   ASSERTION atas keadaan yang sesungguhnya — bukan "modul tak ditemukan".

   Yang dipaku:
     · tak ada tabel kurs tanpa masa berlaku yang tersisa di sumber (CB1);
     · kurs terdaftar di katalog `regrefCatalog()` dan MEMBLOKIR (CB1);
     · rekonsiliasi bank dapat dikeluarkan sebagai kertas kerja (CB3);
     · jejak pencocokan tidak berasal dari seed `AMS.USER` (CB4).
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { AMS } from './data';
import { REGREF_EXPECTED_IDS, regrefCatalog } from './regref_catalog';
import { regrefFor, regrefSpan } from './canon_regref';

const SRC = __dirname;
/* Komentar DIBUANG lebih dulu — dokumentasi yang menyebut angka kurs bukan tabel
   kurs. Gerbang yang tak membuang komentar akan berisik, lalu dilemahkan. */
const strip = (s: string) => s
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/.*$/gm, '$1');
const read = (f: string) => strip(readFileSync(join(SRC, f), 'utf8'));

/** Potongan `function CashBank()` … sampai fungsi berikutnya di berkas yang sama. */
function cashBankSource(): string {
  const src = readFileSync(join(SRC, 'view_firmtreasury.tsx'), 'utf8');
  const from = src.indexOf('function CashBank()');
  const to = src.indexOf('function FixedAssets()');
  expect(from, 'CashBank() tak ditemukan — berkasnya dipecah?').toBeGreaterThan(-1);
  expect(to, 'FixedAssets() tak ditemukan — batas potongan hilang').toBeGreaterThan(from);
  return strip(src.slice(from, to));
}

/* ------------------------------------------------------------------
   CB1 — kurs tak boleh hidup sebagai record tanpa masa berlaku
   ------------------------------------------------------------------ */

describe('CB1 — kurs adalah data bermasa berlaku, bukan foto lama', () => {
  it('tak ada tabel kurs tanpa masa berlaku di sumber selain registry-nya', () => {
    /* Bentuk yang dicari: peta mata uang → ANGKA (`USD: 16_250`). `CCY_SYMBOL`
       memetakan mata uang → string ('US$') dan karena itu tidak tersangkut.
       Satu-satunya berkas yang boleh memuatnya adalah registry bermasa berlaku. */
    const ALLOWED = 'canon_fx.ts';
    const offenders: string[] = [];
    for (const f of readdirSync(SRC)) {
      if (!/\.(ts|tsx)$/.test(f) || f.endsWith('.test.ts') || f.endsWith('.test.tsx')) continue;
      if (f === ALLOWED) continue;
      for (const m of read(f).matchAll(/\b(USD|SGD|EUR)\s*:\s*[0-9][0-9_.]*/g)) {
        offenders.push(`${f}: ${m[0]}`);
      }
    }
    expect(offenders, 'kurs tanpa masa berlaku masih hidup di sumber').toEqual([]);
  });

  it('kurs terdaftar di katalog regref dan MENGHENTIKAN perhitungan', () => {
    expect([...REGREF_EXPECTED_IDS]).toContain('kurs');
    const c = regrefCatalog().find((x) => x.id === 'kurs');
    expect(c, 'entri katalog `kurs` tak ada').toBeTruthy();
    expect(c?.enforcement, 'kurs menggerakkan jurnal revaluasi — ia harus memblokir').toBe('block');
    expect(c?.module).toBe('cashbank');
    expect((c?.sets || []).length).toBeGreaterThan(0);
  });

  it('klok SSOT hari ini TERCAKUP; sehari setelah masa terakhir ia BERHENTI', () => {
    const c = regrefCatalog().find((x) => x.id === 'kurs');
    expect(c).toBeTruthy();
    const opts = { label: c!.label, enforcement: c!.enforcement };
    const today = String(AMS.TODAY);

    const now = regrefFor(c!.sets, today, opts);
    expect(now.blocked, `kurs untuk ${today} seharusnya tercakup`).toBe(false);
    expect(now.value).toBeTruthy();

    const span = regrefSpan(c!.sets);
    expect(span?.to, 'registry kurs terbuka ke depan = kembali jadi foto lama').toBeTruthy();
    const after = new Date(span!.to + 'T00:00:00Z');
    after.setUTCDate(after.getUTCDate() + 1);
    const besok = after.toISOString().slice(0, 10);

    const later = regrefFor(c!.sets, besok, opts);
    expect(later.status, besok).toBe('no-coverage');
    expect(later.value, 'kurs masa lalu TIDAK boleh diserahkan untuk tanggal tak tercakup').toBeNull();
    expect(later.blocked).toBe(true);
    expect(later.note).toContain(besok);
  });
});

/* ------------------------------------------------------------------
   CB3 — rekonsiliasi bank adalah kertas kerja; ia harus bisa keluar
   ------------------------------------------------------------------ */

describe('CB3 — rekonsiliasi bank dapat dikeluarkan sebagai kertas kerja', () => {
  it('CashBank() memanggil ekspor tersegel', () => {
    expect(cashBankSource(), 'tak ada satu pun amsExport* di CashBank()').toMatch(/amsExportXlsx\s*\(/);
  });

  it('nama firma pada payload TIDAK diketik sebagai literal di CashBank()', () => {
    /* `FirmTreasury()` di berkas yang sama masih memakai literal (lingkup prompt 31).
       Yang dijaga di sini hanya potongan CashBank() — jangan menirunya. */
    expect(cashBankSource()).not.toMatch(/KAP\s+Wijaya/);
  });
});

/* ------------------------------------------------------------------
   CB4 — pelaku jejak = identitas sesi, bukan seed
   ------------------------------------------------------------------ */

describe('CB4 — jejak pencocokan menyebut siapa yang benar-benar melakukannya', () => {
  it('CashBank() tidak membaca `AMS.USER`', () => {
    /* `AMS.USER` adalah data seed: ia sama untuk siapa pun yang login. Mencocokkan
       item rekonsiliasi menggeser residual akun kontrol kas — jejaknya tak boleh
       menamai orang yang tidak melakukannya. */
    expect(cashBankSource()).not.toMatch(/AMS\.USER/);
  });

  it('`useCurrentAuditor()` sendiri masih jatuh ke seed — jadi ia tak cukup', () => {
    /* Dicatat sebagai gerbang supaya premis ini tidak hilang: hook itu memakai
       `auth.user.name || AMS.USER.name`. Memakainya SAJA tidak mencabut cacatnya;
       identitas sesi harus dibaca langsung dan ketiadaannya harus berarti
       "tidak dicatat". Bila suatu hari fallback itu dicabut, gerbang ini merah
       dan boleh dihapus. */
    expect(read('contexts.tsx')).toMatch(/function useCurrentAuditor\(\)[\s\S]{0,240}AMS\.USER/);
  });
});
