/* INVARIAN STATIK — tombol IKON-SAJA wajib punya nama aksesibel.
   ------------------------------------------------------------------------
   `<button><I.x size={18} /></button>` tidak menyumbang teks apa pun: nama
   aksesibelnya "" dan pembaca layar hanya mengumumkan "tombol". axe menyebutnya
   `button-name`, impact CRITICAL.

   Sama seperti [pola .field], kelas ini bertahan karena sebagian besar hidup di
   dalam DIALOG yang tak pernah terbuka saat pemindaian axe berjalan — jadi
   gerbang runtime tak pernah melihatnya. Ditemukan 2026-08-15 saat memverifikasi
   #248: dialog "Peluang Baru" bersih dari pelanggaran label, tetapi menyisakan
   `button-name×1` dari tombol tutupnya.

   CAKUPAN SENGAJA SEMPIT — hanya tombol yang isinya PERSIS satu elemen
   self-closing (`<I.x …/>`, `<RI …/>`). Definisi longgar ("tak ada teks
   harfiah") menghasilkan 187 temuan yang MAYORITAS PALSU: tombol seperti
   `<button>{m.label}</button>` atau `<button>{busy ? 'Mengekstrak…' : …}</button>`
   memang merender teks, hanya saja lewat ekspresi. Gerbang yang berisik akan
   dimatikan orang; gerbang ini menangkap 68 situs nyata tanpa satu pun palsu.

   Kalau sebuah tombol memang ikon-saja, beri `aria-label` (atau `title`). Untuk
   TOGGLE, nama harus mengikuti keadaan — lihat `view_mytasks.tsx` (bintang):
   `aria-label={t.starred ? 'Hapus tanda bintang' : 'Beri tanda bintang'}`. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));

/* Kosongkan komentar TANPA mengubah panjang — sebutan `<button>` di dalam
   komentar bukan pelanggaran, dan indeks/nomor baris harus tetap sahih. */
function blankComments(src: string): string {
  let out = '';
  let i = 0;
  let mode: '' | 'block' | 'line' = '';
  let quote = '';
  while (i < src.length) {
    const c = src[i];
    const d = src[i + 1];
    if (mode === 'block') {
      if (c === '*' && d === '/') { out += '  '; i += 2; mode = ''; continue; }
      out += (c === '\n' ? '\n' : ' '); i += 1; continue;
    }
    if (mode === 'line') {
      if (c === '\n') { out += '\n'; i += 1; mode = ''; continue; }
      out += ' '; i += 1; continue;
    }
    if (quote) {
      out += c;
      if (c === quote && src[i - 1] !== '\\') quote = '';
      i += 1; continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; i += 1; continue; }
    if (c === '/' && d === '*') { out += '  '; i += 2; mode = 'block'; continue; }
    if (c === '/' && d === '/') { out += '  '; i += 2; mode = 'line'; continue; }
    out += c; i += 1;
  }
  return out;
}

/* Akhir tag JSX: menghormati kutip dan kedalaman `{}` agar `>` di dalam
   `onClick={(e) => …}` tidak disalahartikan sebagai penutup tag. */
function tagEnd(src: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open + 1; i < src.length; i += 1) {
    const c = src[i];
    if (quote) { if (c === quote && src[i - 1] !== '\\') quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') { depth += 1; continue; }
    if (c === '}') { depth -= 1; continue; }
    if (c === '>' && depth === 0) return i + 1;
  }
  return src.length;
}

const ICON_ONLY = /^<[A-Za-z][A-Za-z0-9_.]*\b[^<>]*\/>$/;
const HAS_NAME = /\baria-label\s*=|\btitle\s*=|\baria-labelledby\s*=/;

function unnamedIconButtons(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(SRC).filter(n => /\.tsx$/.test(n))) {
    const src = blankComments(readFileSync(join(SRC, f), 'utf8'));
    const re = /<button\b/g;
    let m: RegExpExecArray | null = re.exec(src);
    while (m !== null) {
      const end = tagEnd(src, m.index);
      const attrs = src.slice(m.index, end);
      re.lastIndex = end;
      const close = src.indexOf('</button>', end);
      if (close !== -1) {
        const inner = src.slice(end, close).trim();
        if (ICON_ONLY.test(inner) && !HAS_NAME.test(attrs)) {
          out.push(`  ${f}:${src.slice(0, m.index).split('\n').length}  ${inner.slice(0, 44)}`);
        }
      }
      m = re.exec(src);
    }
  }
  return out;
}

describe('aksesibilitas — tombol ikon-saja', () => {
  it('setiap tombol berisi ikon tunggal punya nama aksesibel', () => {
    const bad = unnamedIconButtons();
    expect(
      bad,
      bad.length === 0 ? '' :
        `${bad.length} tombol ikon-saja tanpa nama aksesibel (axe: button-name, ` +
        `impact CRITICAL) — pembaca layar hanya mendengar "tombol":\n${bad.join('\n')}\n\n` +
        `Beri aria-label yang menerangkan AKSINYA, bukan ikonnya:\n` +
        `  <button aria-label="Tutup"><I.x size={18} /></button>\n` +
        `Untuk toggle, nama mengikuti keadaan:\n` +
        `  aria-label={on ? 'Hapus tanda bintang' : 'Beri tanda bintang'}`,
    ).toHaveLength(0);
  });
});
