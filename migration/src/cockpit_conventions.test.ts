/* ============================================================
   Engagement Cockpit — kepatuhan konvensi repo (PR-C-6)

   Berkas ini adalah GERBANG ANTI-KAMBUH, bukan sekadar catatan bahwa
   pelanggarannya sudah dibereskan. Empat aturan di CLAUDE.md yang dilanggar
   cockpit sejak awal:

     §3.7  kontrol = elemen NATIVE. Empat kartu (`ckp-modrow` `ckp-attn`
           `ckp-risk` `ckp-note`) adalah <div onClick> — tak bisa di-Tab,
           tak bisa ditekan Enter, dan menggagalkan gerbang axe.
     §5    warna dari TOKEN, bukan hex. Hero, palet Donut, dan tujuh warna
           aksen di atas latar gelap ditulis mentah.
     §5    skala tipografi MENGIKAT (8 nilai, lantai 11px). `Gauge` menghitung
           ukuran dari diameter: 14,6px (setengah langkah) & 8,6px.
     §3.1  tulisan `window.*` hanya untuk pembaca yang terdaftar.

   Uji ini membaca SUMBERNYA. Kalau ada yang menulis ulang pola lama, merah.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, 'view_cockpit2.tsx');
const src = (): string => readFileSync(SRC, 'utf8');
/* kode saja — komentar mengutip pola lama sebagai catatan sejarah */
const kode = (): string => src().replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

describe('§3.7 — kontrol interaktif harus elemen native', () => {
  it('nol <div onClick> / <span onClick> di cockpit', () => {
    const jsx = kode();
    const pelanggar = [...jsx.matchAll(/<(div|span)\b[^>]*\sonClick=/g)].map((m) => m[0].slice(0, 70));
    expect(pelanggar, `kontrol palsu: ${pelanggar.join(' | ')}`).toEqual([]);
  });

  /* Tag dicari per-BARIS, bukan dengan regex `[^>]*`: atribut onClick memuat
     panah `=>`, sehingga pemindaian "sampai `>` pertama" berhenti di tengah
     atribut dan melewatkan `title=` yang datang sesudahnya. */
  const barisTag = (cls: string): string =>
    kode().split('\n').find((l) => l.includes(`className="${cls}"`)) || '';

  it('empat kartu yang dulu <div onClick> kini <button>', () => {
    ['ckp-modrow', 'ckp-attn', 'ckp-risk', 'ckp-note'].forEach((cls) => {
      expect(barisTag(cls), `${cls} tak ditemukan`).not.toBe('');
      expect(barisTag(cls).includes('<button'), `${cls} bukan <button>`).toBe(true);
    });
  });

  it('setiap kartu-tombol punya nama yang dapat diakses (title)', () => {
    ['ckp-modrow', 'ckp-attn', 'ckp-risk', 'ckp-note'].forEach((cls) => {
      const t = barisTag(cls);
      expect(/title=|aria-label=/.test(t), `${cls} tanpa title/aria-label`).toBe(true);
    });
  });

  it('cincin fokus terlihat untuk keempatnya', () => {
    const css = src();
    ['ckp-modrow', 'ckp-attn', 'ckp-risk', 'ckp-note'].forEach((cls) => {
      expect(css, `${cls} tanpa :focus-visible`).toMatch(new RegExp(`\\.${cls}[^{]*:focus-visible`));
    });
  });
});

describe('§5 — warna dari token, bukan hex', () => {
  it('nol warna heksadesimal di seluruh berkas', () => {
    const jsx = kode();
    const hex = [...jsx.matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((m) => m[0]);
    expect(hex, `hex tersisa: ${[...new Set(hex)].join(', ')}`).toEqual([]);
  });

  it('nol rgba() mentah — isian tembus-pandang pun bertoken', () => {
    const jsx = kode();
    const rgba = [...jsx.matchAll(/rgba?\([^)]*\)/g)].map((m) => m[0]);
    expect(rgba, `rgba mentah: ${rgba.join(', ')}`).toEqual([]);
  });

  it('palet seri grafik memakai token peran', () => {
    const jsx = kode();
    expect(jsx).toMatch(/CKP_SERIES/);
    expect(jsx).toMatch(/var\(--purple-solid\)/);
    expect(jsx).toMatch(/var\(--teal-solid\)/);
  });

  it('SETIAP token yang dipakai benar-benar terdefinisi di stylesheet', () => {
    /* Token salah ketik gagal DIAM-DIAM: `var(--on-dark-mutedd)` tidak error,
       ia hanya menghasilkan warna kosong. Tanpa gerbang ini, mengganti hex
       dengan token justru bisa memperburuk keadaan. */
    const css = ['styles_base.css', 'styles_chrome.css', 'styles_work.css', 'styles_modules.css', 'styles_ai.css']
      .map((f) => readFileSync(join(__dirname, f), 'utf8')).join('\n');
    const lokal = src();   // token yang didefinisikan di blok <style> cockpit sendiri
    const dipakai = [...new Set([...src().matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]))];
    expect(dipakai.length).toBeGreaterThan(10);
    const hilang = dipakai.filter((t) => !css.includes(`${t}:`) && !lokal.includes(`${t}:`));
    expect(hilang, `token tak terdefinisi: ${hilang.join(', ')}`).toEqual([]);
  });
});

describe('§5 — skala tipografi mengikat (8 nilai, lantai 11px)', () => {
  const DIIZINKAN = new Set([11, 12, 13, 15, 19, 22, 28, 34]);

  it('nol fontSize numerik di luar skala & nol yang di bawah 11px', () => {
    const jsx = kode();
    const nilai = [...jsx.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const nakal = nilai.filter((v) => !DIIZINKAN.has(v));
    expect(nakal, `ukuran di luar skala: ${[...new Set(nakal)].join(', ')}`).toEqual([]);
  });

  it('nol fontSize yang DIHITUNG dari dimensi lain', () => {
    /* pola lama: `fontSize: size * 0.27` → 14,6px pada gauge 54 (setengah
       langkah) dan `size * 0.16` → 8,6px (di bawah lantai). */
    const jsx = kode();
    const dihitung = [...jsx.matchAll(/fontSize:\s*[a-zA-Z_$][\w$]*\s*[*/]/g)].map((m) => m[0]);
    expect(dihitung, `ukuran terhitung: ${dihitung.join(', ')}`).toEqual([]);
  });
});

describe('§3.1 — tanpa tulisan window yang tak terdaftar', () => {
  it('cockpit tak lagi menulis window.EngagementCockpit', () => {
    expect(kode()).not.toMatch(/Object\.assign\(\s*window/);
    expect(kode()).not.toMatch(/window\.EngagementCockpit\s*=/);
  });

  it('ekspor ESM bernama tetap ada (jalan masuk lazy_views)', () => {
    expect(src()).toMatch(/export\s*\{\s*EngagementCockpit\s*\}/);
  });
});
