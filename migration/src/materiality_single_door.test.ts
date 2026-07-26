/* PR-6b · K8 — INVARIAN STATIK: satu pintu materialitas untuk view.
   ------------------------------------------------------------------
   `materialityFor()` membaca konfigurasi dari cache localStorage, dan cache `mat.*`
   hanya terisi bila modul Materialitas pernah dirender di browser itu. Karena itu
   pemanggilan LANGSUNG dari sebuah view memakai default 75% pada cache dingin —
   senyap, dan berbeda antar-mesin. View WAJIB memakai `useMateriality()`, yang
   mengirim konfigurasi ter-hidrasi server secara eksplisit.

   Uji ini menjaga agar migrasi PR-6b tak membusuk: satu view baru yang memanggil
   `materialityFor()` langsung akan MENGGAGALKAN gerbang, bukan diam-diam
   memperkenalkan kembali cacatnya. (Cacat aslinya bertahan lama justru karena tak
   ada yang memaksa arah pemanggilan.) */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));

/* Berkas yang MEMANG lapisan selektor/kanon & pemanggil non-React — bukan view. */
const ALLOWED = new Set(['canon_selectors.ts', 'contexts.tsx']);

function viewFiles(): string[] {
  return readdirSync(SRC).filter(f => /^view_.*\.tsx$/.test(f));
}

/* Buang komentar agar penyebutan `materialityFor()` dalam catatan sejarah tak
   dihitung sebagai pemanggilan. */
function stripComments(s: string): string {
  return s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

describe('K8 — view memakai useMateriality(), bukan materialityFor() langsung', () => {
  it('tak ada view_*.tsx yang memanggil materialityFor(', () => {
    const offenders = viewFiles().filter(f => {
      if (ALLOWED.has(f)) return false;
      return /materialityFor\s*\(/.test(stripComments(readFileSync(join(SRC, f), 'utf8')));
    });
    expect(offenders).toEqual([]);
  });

  it('uji ini benar-benar mampu mendeteksi (guard atas regex-nya sendiri)', () => {
    expect(/materialityFor\s*\(/.test(stripComments('const m = materialityFor({});'))).toBe(true);
    expect(/materialityFor\s*\(/.test(stripComments('/* materialityFor() dulu dipakai */'))).toBe(false);
    expect(/materialityFor\s*\(/.test(stripComments('// materialityFor() historis'))).toBe(false);
  });

  it('ada view yang memang memakai useMateriality (uji tak lulus karena kosong)', () => {
    const users = viewFiles().filter(f => /useMateriality\s*\(/.test(readFileSync(join(SRC, f), 'utf8')));
    expect(users.length).toBeGreaterThanOrEqual(8);
  });
});
