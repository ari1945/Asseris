/* ============================================================
   Token CSS — gerbang anti-kambuh SELURUH `migration/src` (PR-C-6b)

   Dinamai C-6b, BUKAN C-7: PRD arc sudah memesan PR-C-7 untuk "Ekspor mengikuti
   layar". Berkas ini menuntaskan lingkup PR-C-6 (kepatuhan konvensi §5) ke
   seluruh repo, jadi ia turunan C-6 — bukan butir peta jalan yang baru.

   Sebabnya konkret: `--ink-1` tidak pernah ada. Keluarga yang benar adalah
   `--ink` · `--ink-2` · `--ink-3` · `--ink-4` (styles_base.css). Tujuh berkas
   memanggil token itu bertahun-tahun dan TIDAK ADA yang menyadarinya, karena
   substitusi custom property yang gagal TIDAK melempar error: deklarasinya
   menjadi "invalid at computed-value time", lalu propertinya jatuh ke nilai
   warisan (untuk `color`) atau nilai awal (untuk `background-color` →
   transparan). Hasilnya bukan halaman rusak yang kentara, melainkan warna yang
   diam-diam salah — persis kelas cacat yang tak akan ditemukan tinjauan mata.

   Sapuan pertama menemukan bahwa `--ink-1` bukan kasus tunggal:
   `--surface-1` (6 berkas), `--ink-5`, `--blue-bg`, `--navy-050`, `--navy-bg`,
   `--green-050` — semuanya nama yang masuk akal tetapi tak pernah didefinisikan.

   Karena itu gerbangnya menyapu SEMUA berkas, bukan berkas yang kebetulan
   sedang diperbaiki. `cockpit_conventions.test.ts` menjaga hal yang sama untuk
   view_cockpit2.tsx saja; berkas ini adalah versi repo-lebarnya.

   Batas yang diketahui: token yang dirakit saat runtime — `'var(--' + tone +
   ')'` — tak terbaca pemindai statis apa pun dan memang tak dijaga di sini.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = __dirname;
const STYLESHEETS = ['styles_base.css', 'styles_chrome.css', 'styles_work.css', 'styles_modules.css', 'styles_ai.css'];

/** Semua sumber `.ts/.tsx/.css` di bawah `migration/src`, rekursif (termasuk `wedge/`). */
function berkasSumber(dir: string, acc: string[] = []): string[] {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== '__snapshots__') berkasSumber(p, acc); continue; }
    if (/\.(ts|tsx|css)$/.test(e.name)) acc.push(p);
  }
  return acc;
}

/* Komentar DIBUANG lebih dulu: berkas uji (termasuk yang ini) mengutip nama
   token yang salah sebagai catatan sejarah. Tanpa langkah ini gerbangnya
   menuduh dokumentasinya sendiri. */
const tanpaKomentar = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Definisi = `--x:` di CSS, dan juga `'--x':` di objek style inline React
   (view_pc_org menyetel `--g` per-simpul lewat style={{ '--g': … }}). */
const definisiDi = (t: string): Set<string> =>
  new Set([...t.matchAll(/(--[\w-]+)\s*['"]?\s*:/g)].map((m) => m[1]));

const pemakaianDi = (t: string): string[] =>
  [...t.matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);

const GLOBAL = definisiDi(STYLESHEETS.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n'));
const FILES = berkasSumber(ROOT);

/* Judul & pesan di bawah sengaja TIDAK menulis contoh `var(…)` harfiah:
   gerbangnya memindai berkas ini juga, dan contoh dalam kode (bukan komentar)
   akan dituduhnya sebagai token tak terdefinisi. */
describe('token CSS — setiap token yang dipakai benar-benar terdefinisi', () => {
  /* Gerbang yang memindai nol berkas lulus dengan gemilang. Angka-angka ini
     ada supaya kegagalan pemindaian tampak sebagai MERAH, bukan sebagai hijau. */
  it('pemindaian benar-benar mencakup repo (bukan gerbang kosong)', () => {
    expect(FILES.length).toBeGreaterThan(150);
    expect(GLOBAL.size).toBeGreaterThan(60);
    const total = FILES.reduce((n, f) => n + pemakaianDi(tanpaKomentar(readFileSync(f, 'utf8'))).length, 0);
    expect(total).toBeGreaterThan(500);
  });

  it('nol token tak terdefinisi di seluruh migration/src', () => {
    const hilang: string[] = [];
    for (const f of FILES) {
      const teks = tanpaKomentar(readFileSync(f, 'utf8'));
      const lokal = definisiDi(teks);
      for (const t of new Set(pemakaianDi(teks))) {
        if (!GLOBAL.has(t) && !lokal.has(t)) hilang.push(`${f.slice(ROOT.length + 1)} → ${t}`);
      }
    }
    expect(hilang, `token tak terdefinisi:\n  ${hilang.join('\n  ')}`).toEqual([]);
  });

  /* Uji berikut redundan terhadap yang di atas — dan disengaja. Ia menamai
     cacat aslinya, sehingga kegagalannya langsung memberi tahu APA yang salah
     alih-alih sekadar "ada token yang hilang". Berkas ini sendiri dikecualikan:
     ia menyebut nama-nama itu untuk mencarinya. */
  it('nama yang tak pernah ada tetap tak ada: ink-1 · surface-1 · ink-5', () => {
    const TERSANGKA = ['--ink-1', '--surface-1', '--ink-5'];
    const kambuh: string[] = [];
    for (const f of FILES.filter((f) => !f.endsWith('css_tokens.test.ts'))) {
      const teks = tanpaKomentar(readFileSync(f, 'utf8'));
      for (const t of TERSANGKA) if (new RegExp(`${t}\\b`).test(teks)) kambuh.push(`${f.slice(ROOT.length + 1)} → ${t}`);
    }
    expect(kambuh, `token hantu kembali: ${kambuh.join(', ')}`).toEqual([]);
  });

  it('keluarga ink yang SAH persis empat tingkat', () => {
    const ink = [...GLOBAL].filter((t) => /^--ink(-\d+)?$/.test(t)).sort();
    expect(ink).toEqual(['--ink', '--ink-2', '--ink-3', '--ink-4']);
  });

  it('keluarga surface yang SAH persis tiga tingkat', () => {
    const surface = [...GLOBAL].filter((t) => /^--surface(-\d+)?$/.test(t)).sort();
    expect(surface).toEqual(['--surface', '--surface-2', '--surface-3']);
  });
});
