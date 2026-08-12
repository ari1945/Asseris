/* ============================================================
   TRIPWIRE — assertion yang tak pernah menegakkan apa pun.
   PRD: docs/prd-sa620-expert-gate-server.md §10c
   ------------------------------------------------------------
   `expect(x).toMatchObject({ prop: /regex/ })` **selalu lolos**, cocok maupun tidak.
   Ia bukan assertion; ia hiasan. Ditemukan saat sebuah uji penolakan "lulus" dengan
   pola harapan `/PROBE-SENGAJA-SALAH/` — dan uji K4 yang dijaganya ternyata ditolak
   oleh aturan yang sama sekali berbeda (`signature-self-review`), bukan oleh gerbang
   yang diklaimnya diuji. Suite tak dapat menemukannya sendiri: setiap uji hijau.

   Yang SEHAT (terverifikasi lewat probe, bukan diasumsikan):
     · `toMatchObject({ prop: 'string' })`            — menegakkan
     · `toMatchObject({ prop: expect.stringMatching(/re/) })` — menegakkan
     · `toEqual` / `objectContaining` / `toHaveProperty` dengan regex — menegakkan
     · `rejects.toThrow(/re/)`                        — menegakkan
   Yang VAKUM: HANYA regex telanjang di dalam `toMatchObject`.

   Mengapa tripwire dan bukan aturan ESLint: `npm run lint` hanya berjalan atas
   `migration/src` (lihat tools/verify.mjs). `server/` dan `e2e/` — tempat pola ini
   sebenarnya hidup — tidak dilint sama sekali, sehingga aturan lint tak akan pernah
   melihatnya. Tripwire ini ikut gerbang `npm run verify` dan CI.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const REPO_ROOT = resolve(process.cwd(), '..');
const ROOTS = ['server/src', 'migration/src', 'e2e', 'tools'];
const SELF = 'assertion_hygiene.test.ts';

function sourceFiles(dir: string): string[] {
  let out: string[] = [];
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    if (name === 'node_modules' || name === 'dist' || name.startsWith('.')) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) out = out.concat(sourceFiles(full));
    else if ((name.endsWith('.ts') || name.endsWith('.tsx')) && name !== SELF) out.push(full);
  }
  return out;
}

/** Argumen `toMatchObject(...)` dengan kurung SEIMBANG — objek multi-baris ikut terbaca. */
function matchObjectArgs(src: string): { arg: string; offset: number }[] {
  const out: { arg: string; offset: number }[] = [];
  const needle = 'toMatchObject(';
  let from = 0;
  for (;;) {
    const at = src.indexOf(needle, from);
    if (at < 0) break;
    let depth = 0;
    let j = at + needle.length - 1;
    for (; j < src.length; j++) {
      if (src[j] === '(') depth++;
      else if (src[j] === ')') { depth--; if (depth === 0) break; }
    }
    out.push({ arg: src.slice(at, j + 1), offset: at });
    from = j + 1;
  }
  return out;
}

/** Nilai properti berupa RegExp literal: `: /…/flags` diikuti `,` `}` atau `)`. */
const BARE_REGEX_VALUE = /:\s*(\/(?:[^/\\\n]|\\.)+\/[gimsuy]*)\s*[,})]/g;

describe('kebersihan assertion — regex telanjang di dalam toMatchObject', () => {
  it('membuktikan pola itu MEMANG vakum (bukan asumsi)', () => {
    /* Regex dibangun dinamis agar pemindai di bawah tidak menandai berkasnya sendiri. */
    const tidakCocok = new RegExp('TIDAK-AKAN-PERNAH-COCOK');
    /* Keduanya lolos — yang cocok maupun yang tidak. Itulah definisi assertion vakum. */
    expect({ a: 'nilai asli' }).toMatchObject({ a: tidakCocok });
    expect({ a: 'nilai asli' }).toMatchObject({ a: new RegExp('asli') });
    /* Bandingkan dengan bentuk yang benar: ini BENAR-BENAR gagal bila tak cocok. */
    expect(() => expect({ a: 'nilai asli' }).toMatchObject({ a: expect.stringMatching(tidakCocok) })).toThrow();
  });

  it('tidak ada satu pun situs tersisa di repo', () => {
    const offenders: string[] = [];
    let scanned = 0;
    for (const root of ROOTS) {
      for (const file of sourceFiles(join(REPO_ROOT, root))) {
        scanned++;
        const src = readFileSync(file, 'utf8');
        if (!src.includes('toMatchObject(')) continue;
        for (const { arg, offset } of matchObjectArgs(src)) {
          BARE_REGEX_VALUE.lastIndex = 0;
          let m: RegExpExecArray | null;
          while ((m = BARE_REGEX_VALUE.exec(arg)) !== null) {
            const line = src.slice(0, offset + m.index).split('\n').length;
            offenders.push(`${file.slice(REPO_ROOT.length + 1).replace(/\\/g, '/')}:${line} → ${m[1]}`);
          }
        }
      }
    }
    /* Jaring pengaman jaring pengaman: bila pemindai berhenti menemukan berkas apa pun,
       uji ini akan hijau selamanya tanpa memeriksa apa pun — persis cacat yang ia jaga. */
    expect(scanned, 'pemindai tidak menemukan berkas sumber — periksa ROOTS/cwd').toBeGreaterThan(200);
    expect(offenders, [
      'Regex telanjang di dalam toMatchObject SELALU lolos — cocok maupun tidak.',
      'Ganti dengan salah satu yang benar-benar menegakkan:',
      "  · expect(p).rejects.toThrow(/re/)                     — untuk pesan galat",
      "  · toMatchObject({ prop: expect.stringMatching(/re/) }) — untuk properti",
      "  · toMatchObject({ prop: 'string persis' })             — bila cocok penuh",
    ].join('\n')).toEqual([]);
  });
});
