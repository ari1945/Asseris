/* INVARIAN STATIK — <label> WAJIB terkait ke kontrolnya, bukan sekadar berdekatan.
   ------------------------------------------------------------------------------
   Pola `.field` di repo ini menaruh <label> BERSAUDARA dengan kontrolnya:

       <div className="field"><label>Akun Debit</label><select className="select" …>

   Tanpa pasangan htmlFor/id, kaitan keduanya MURNI VISUAL. Pembaca layar hanya
   mendengar "combo box"; axe melaporkannya `label` / `select-name` — keduanya
   impact CRITICAL.

   Cacat ini bertahan lama karena dua sebab, dan uji ini menutup keduanya:

   1) Sebagian besar blok `.field` hidup di dalam DIALOG. Gerbang axe e2e hanya
      memindai halaman yang berhasil dibuka, dan dialog tak pernah terbuka di
      dalam pemindaian → seluruh kelas cacat ini TAK TERLIHAT oleh gerbang
      runtime. Pemindai SUMBER tak punya titik buta itu.
   2) Sebagian kontrol lolos KEBETULAN karena punya `placeholder`, yang diterima
      axe sebagai nama (lemah). Jadi cacatnya tampak sporadis, bukan sistematis.
      Uji ini TIDAK menerima placeholder sebagai pengganti label.

   Ditemukan 2026-08-15 saat memigrasikan FirmJVForm ke <Overlay> (#246): begitu
   dialognya dapat dipindai, tiga pelanggaran critical langsung muncul.

   CATATAN TEKNIK: sengaja TIDAK memakai satu regex besar. Regex ber-grup lazy
   melompati pasangan lain saat gagal — versi pertama uji ini melaporkan 161
   situs, sebagian palsu (label yang diikuti <div>, bukan kontrol). Pemindai tag
   di bawah menghormati kutip dan ekspresi JSX `{…}`, sehingga `>` di dalam arrow
   function tidak disalahartikan sebagai akhir tag. */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = dirname(fileURLToPath(import.meta.url));
const CONTROLS = ['input', 'select', 'textarea'];

function tsxFiles(): string[] {
  return readdirSync(SRC).filter(f => /\.tsx$/.test(f));
}

/* Kosongkan isi komentar TANPA mengubah panjangnya, supaya seluruh indeks dan
   nomor baris tetap sahih. Wajib: `<label>` yang cuma DISEBUT di komentar bukan
   pelanggaran — dan codemod yang tidak buta-komentar sempat menghasilkan dua
   edit tumpang tindih yang merusak view_firmgl.tsx. */
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

/* Akhir sebuah tag JSX yang dibuka di `open` (indeks '<'). Mengembalikan indeks
   TEPAT SESUDAH '>' penutup. Menghormati '…' "…" `…` dan kedalaman `{}`, supaya
   `onChange={(e) => …}` tidak memutus tag di tengah. */
function tagEnd(src: string, open: number): number {
  let depth = 0;
  let quote = '';
  for (let i = open + 1; i < src.length; i += 1) {
    const c = src[i];
    if (quote) {
      if (c === quote && src[i - 1] !== '\\') quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') { depth += 1; continue; }
    if (c === '}') { depth -= 1; continue; }
    if (c === '>' && depth === 0) return i + 1;
  }
  return src.length;
}

type Site = { file: string; line: number; label: string; control: string; why: string; staticId: string | null };

function scanFile(file: string, src: string): Site[] {
  const out: Site[] = [];
  const openRe = /<label\b/g;
  let m: RegExpExecArray | null = openRe.exec(src);
  while (m !== null) {
    const attrsEnd = tagEnd(src, m.index);
    const labelAttrs = src.slice(m.index, attrsEnd);
    const close = src.indexOf('</label>', attrsEnd);
    if (close !== -1) {
      const text = src.slice(attrsEnd, close).replace(/\s+/g, ' ').trim();
      const after = src.slice(close + '</label>'.length).replace(/^\s*/, '');
      const control = CONTROLS.find(c => after.startsWith('<' + c) &&
        /[\s/>]/.test(after.charAt(c.length + 1)));
      if (control) {
        const ctrlOpen = src.length - after.length;
        const ctrlAttrs = src.slice(ctrlOpen, tagEnd(src, ctrlOpen));
        const hasFor = /\bhtmlFor\s*=/.test(labelAttrs);
        const hasId = /\bid\s*=/.test(ctrlAttrs);
        const staticId = (/\bid\s*=\s*"([^"]*)"/.exec(ctrlAttrs) || [])[1] ?? null;
        if (!hasFor || !hasId) {
          out.push({
            file,
            line: src.slice(0, m.index).split('\n').length,
            label: text.slice(0, 40),
            control,
            why: !hasFor && !hasId ? 'label tanpa htmlFor & kontrol tanpa id'
              : !hasFor ? 'label tanpa htmlFor' : 'kontrol tanpa id',
            staticId: null,
          });
        } else if (staticId !== null) {
          out.push({
            file,
            line: src.slice(0, m.index).split('\n').length,
            label: text.slice(0, 40),
            control,
            why: 'id statis',
            staticId,
          });
        }
      }
    }
    openRe.lastIndex = attrsEnd;
    m = openRe.exec(src);
  }
  return out;
}

function allSites(): Site[] {
  return tsxFiles().flatMap(f => scanFile(f, blankComments(readFileSync(join(SRC, f), 'utf8'))));
}

/* view_login.tsx sengaja memakai id statis: layar tunggal yang tak pernah
   dirender dua kali, dan #lg-email/#lg-pw adalah kontrak yang dipakai helper e2e. */
const STATIC_ID_ALLOWED = new Set(['view_login.tsx']);

describe('aksesibilitas — pasangan <label>/kontrol pada pola .field', () => {
  it('tiap <label> bersaudara punya htmlFor DAN kontrolnya punya id', () => {
    const bad = allSites().filter(s => s.why !== 'id statis');
    const report = bad.map(s => `  ${s.file}:${s.line} <${s.control}> "${s.label}" — ${s.why}`).join('\n');
    expect(
      bad,
      bad.length === 0 ? '' :
        `${bad.length} kontrol form tanpa kaitan label yang sesungguhnya ` +
        `(axe: label / select-name, impact CRITICAL):\n${report}\n\n` +
        `Perbaiki dengan pasangan htmlFor/id, mis.\n` +
        `  const uid = React.useId();\n` +
        `  <label htmlFor={uid+'-tier'}>Tier</label><select id={uid+'-tier'} …>`,
    ).toHaveLength(0);
  });

  /* BATAS UJI INI — dibaca sebelum menambah field baru.
     `useId()` unik per INSTANS KOMPONEN, bukan per ITERASI. Sebuah `.field` di
     dalam `.map()` karenanya tetap bisa menghasilkan id kembar untuk seluruh
     baris (terjadi di view_psak48.tsx: 5 baris VIU berbagi satu id, dan semua
     label menunjuk input pertama). Pemindai sumber TIDAK dapat memutuskan ini
     dengan andal — percobaan deteksi otomatis ikut menandai view_serviceorg.tsx,
     yang ternyata memakai seleksi tunggal (`sel`), bukan perulangan.
     Jadi: bila field dirender di dalam perulangan, SERTAKAN kunci barisnya —
     `uid+'-viu-'+f.k`, bukan `uid+'-viu'`. Penjaga runtime-nya adalah uji e2e
     yang memeriksa id kembar pada halaman yang dipindai. */

  /* Pasangan tak berguna bila id-nya kembar: htmlFor menunjuk instans PERTAMA.
     Karena itu id diturunkan dari React.useId() (unik per instans), bukan literal. */
  it('id kontrol .field diturunkan dari useId(), bukan literal statis', () => {
    const bad = allSites().filter(s => s.why === 'id statis' && !STATIC_ID_ALLOWED.has(s.file));
    const report = bad.map(s => `  ${s.file}:${s.line} id="${s.staticId}"`).join('\n');
    expect(bad, bad.length === 0 ? '' : `id statis pada kontrol .field (rawan kembar):\n${report}`).toHaveLength(0);
  });
});
