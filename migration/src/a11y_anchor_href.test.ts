/* INVARIAN STATIK — `<a>` TANPA `href` bukan kontrol.
   ------------------------------------------------------------------------
   `<a onClick={…}>Buka</a>` terlihat seperti tautan dan bereaksi terhadap klik
   tetikus, tetapi tanpa `href` ia BUKAN elemen interaktif menurut HTML: tak
   masuk urutan tab, tak fokusabel, tak menanggapi Enter, dan tak punya peran
   `link` di pohon aksesibilitas. Pengguna papan ketik & pembaca layar tak punya
   jalan sama sekali ke aksinya. axe menyebutnya `anchor-is-valid`.

   Ditemukan 2026-08-20 di `view_home.tsx` (fallback offline "Server tak
   tersambung — buka My Tasks"): satu-satunya jalan pintas ke daftar tugas lokal
   pada saat server mati, dan hanya bisa diklik.

   Aturan: navigasi internal berbasis hash & aksi in-app memakai
   `<button type="button" className="linkbtn">`. `<a>` hanya untuk yang benar-benar
   punya alamat — dan alamat itu ditulis di `href`.

   Berpasangan dengan gerbang `a11y_icon_buttons` (nama aksesibel) & `a11y_field_labels`
   (label kontrol form): keduanya menangkap kelas cacat yang hidup di jalur yang
   jarang terbuka saat pemindaian axe e2e berjalan — di sini, cabang OFFLINE. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));

/* Kosongkan komentar TANPA mengubah panjang — `<a href=…>` di dalam komentar/prosa
   bukan kode, dan nomor baris harus tetap sahih. (Sama seperti a11y_icon_buttons.) */
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

/* Akhir tag pembuka JSX: menghormati kutip & kedalaman `{}` agar `>` di dalam
   `onClick={(e) => …}` tak disalahartikan sebagai penutup tag. */
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

/* `<a` diikuti pembatas — jangan tertangkap `<article>`/`<aside>`/`<audio>`. */
const A_OPEN = /<a(?=[\s/>])/g;
const HAS_HREF = /\bhref\s*=/;
/* Spread `{...props}` bisa membawa href dari luar; jangan menuduh tanpa bukti. */
const HAS_SPREAD = /\{\s*\.\.\./;

function anchorsWithoutHref(): string[] {
  const out: string[] = [];
  for (const f of readdirSync(SRC).filter((n) => /\.tsx$/.test(n))) {
    const src = blankComments(readFileSync(join(SRC, f), 'utf8'));
    let m: RegExpExecArray | null = A_OPEN.exec(src);
    while (m !== null) {
      const end = tagEnd(src, m.index);
      const attrs = src.slice(m.index, end);
      A_OPEN.lastIndex = end;
      if (!HAS_HREF.test(attrs) && !HAS_SPREAD.test(attrs)) {
        const line = src.slice(0, m.index).split('\n').length;
        out.push(`  ${f}:${line}  ${attrs.replace(/\s+/g, ' ').slice(0, 72)}`);
      }
      m = A_OPEN.exec(src);
    }
  }
  return out;
}

describe('aksesibilitas — <a> tanpa href', () => {
  it('tidak ada anchor yang dipakai sebagai kontrol', () => {
    const bad = anchorsWithoutHref();
    expect(
      bad,
      bad.length === 0 ? '' :
        `${bad.length} <a> tanpa href (axe: anchor-is-valid) — tak fokusabel, tak bisa ` +
        `Enter, tak punya peran link:\n${bad.join('\n')}\n\n` +
        `Untuk aksi/navigasi internal pakai tombol native yang bergaya tautan:\n` +
        `  <button type="button" className="linkbtn" onClick={…}>My Tasks</button>\n` +
        `Untuk tautan sungguhan, tulis alamatnya:\n` +
        `  <a href="#/tasks">My Tasks</a>`,
    ).toHaveLength(0);
  });
});
