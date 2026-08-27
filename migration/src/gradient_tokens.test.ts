/* ============================================================
   Henti GRADIEN — gerbang anti-kambuh (CLAUDE.md §5)

   Lanjutan dari `on_dark_tokens.test.ts`. Sapuan itu membereskan TEKS di atas
   panel gelap; yang tertinggal adalah LATARNYA. `view_cockpit2` menulis heronya
   dengan token —

       linear-gradient(120deg, var(--navy-700), var(--blue-solid))

   — sedangkan 77 hero lain menyalin nilainya mentah:

       linear-gradient(125deg, #013a52, #005085)

   Di tema TERANG keduanya identik piksel: `--navy-700` MEMANG `#013a52` dan
   `--blue-solid` MEMANG `#005085`. Perbedaannya hanya muncul di tema GELAP,
   tempat `--navy-700` menjadi `#0d1d29`. Artinya panel-panel yang menulis hex
   mentah itu **tidak pernah mengikuti tema gelap** — mereka membawa warna tema
   terang ke dalam tema gelap, dan cacatnya tak terlihat sama sekali di tema
   terang tempat orang biasa memeriksanya. Justru itu yang membuatnya bertahan.

   DUA aturan, dan yang kedua lebih penting daripada yang pertama:

     1. Henti gradien yang nilainya SAMA dengan sebuah token harus memakai
        token itu.
     2. Gradien tidak boleh memakai token TEKS polos (--blue --green --navy …)
        sebagai isian. §5: "token semantik adalah token TEKS; isian solid pakai
        --*-solid". Aturan ini bukan soal kerapian — di `:root.dark` token teks
        DIBALIK supaya terbaca di atas permukaan gelap (`--blue` #005085 →
        #6b9ab8, `--navy` #002C3F → #8298a1). Memakainya sebagai isian membuat
        panel gelap berubah menjadi biru muda / abu terang di tema gelap.
        Pasangan `--*-solid` sengaja TIDAK di-override justru supaya isian
        tetap stabil.

   Aturan 2 menjaga kesalahan yang HAMPIR terjadi saat menyusun sapuan ini:
   pemetaan otomatis "cari token yang nilainya #005085" mengembalikan `--blue`
   lebih dulu, bukan `--blue-solid`. Keduanya bernilai sama di tema terang, jadi
   uji tema-terang mana pun akan tetap hijau.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = __dirname;

const sumber = (): string[] =>
  readdirSync(DIR).filter(
    (f) => /\.(tsx|ts|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== 'styles_base.css',
  );

const kode = (f: string): string =>
  readFileSync(join(DIR, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

/* `repeating-linear-gradient` DIKECUALIKAN: ia dipakai sebagai arsir belang
   (mis. sel cuti di view_capacity) yang memasangkan dua nada terang berdekatan,
   dan hanya SATU dari pasangan itu kebetulan bernilai token. Mentokenkan
   separuh pasangan membuat satu garis mengikuti tema sementara pasangannya
   tidak — belang gelap-vs-terang di tema gelap. Itu regresi, bukan perbaikan;
   arsir perlu pasangan tokennya sendiri, dan itu keputusan desain tersendiri. */
const gradien = (teks: string): string[] =>
  [...teks.matchAll(/(repeating-)?linear-gradient\([^)]*\)/gi)]
    .filter((m) => !m[1])
    .map((m) => m[0]);

/* ============================================================
   1 — henti gradien yang bernilai token harus memakai tokennya
   ============================================================ */
describe('§5 — henti gradien memakai token, bukan nilainya', () => {
  /* Peran ISIAN dipetakan TANGAN. Tidak boleh diturunkan otomatis dari
     "token mana yang nilainya sama": #005085 dimiliki BERSAMA oleh --blue
     (teks) dan --blue-solid (isian), dan memilih yang salah baru terlihat di
     tema gelap. Lihat aturan 2. */
  const ISIAN: Record<string, string> = {
    '#013a52': '--navy-700',
    '#024661': '--navy-600',
    '#002c3f': '--navy-solid',
    '#005085': '--blue-solid',
    '#2f7bb0': '--blue-400',
    '#1f7a4d': '--green-solid',
    '#0a6b73': '--teal-solid',
    '#5b3fa6': '--purple-solid',
    '#b3261e': '--red-solid',
  };

  it('setiap nilai di peta ISIAN benar-benar milik tokennya di stylesheet', () => {
    /* Peta tulis-tangan bisa MELESET dari stylesheet tanpa ada yang tahu.
       Uji ini mengikatnya kembali ke sumber kebenaran. */
    const base = readFileSync(join(DIR, 'styles_base.css'), 'utf8');
    const terang = base.slice(0, base.indexOf(':root.dark'));
    const nilai: Record<string, string> = {};
    for (const m of terang.matchAll(/(--[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
      nilai[m[1]] = m[2].toLowerCase();
    }
    const meleset = Object.entries(ISIAN)
      .filter(([hex, tok]) => nilai[tok] !== hex)
      .map(([hex, tok]) => `${tok} = ${nilai[tok] ?? '(tak ada)'}, diharap ${hex}`);
    expect(meleset, `peta ISIAN meleset dari stylesheet:\n  ${meleset.join('\n  ')}`).toEqual([]);
  });

  it('detektor benar-benar menemukan gradien (gerbang tidak menyapu vakum)', () => {
    const n = sumber().reduce((a, f) => a + gradien(kode(f)).length, 0);
    expect(n, 'tak satu pun linear-gradient ditemukan').toBeGreaterThanOrEqual(50);
  });

  it('nol henti gradien yang menulis nilai token secara mentah', () => {
    const pelanggar: string[] = [];
    for (const f of sumber()) {
      kode(f).split('\n').forEach((ln, i) => {
        for (const g of gradien(ln)) {
          for (const h of g.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
            const v = h[0].toLowerCase();
            if (ISIAN[v]) pelanggar.push(`${f}:${i + 1} ${v} → var(${ISIAN[v]})`);
          }
        }
      });
    }
    expect(pelanggar, `henti gradien mentah:\n  ${pelanggar.join('\n  ')}`).toEqual([]);
  });
});

/* ============================================================
   2 — gradien tak boleh memakai token TEKS sebagai isian
   ============================================================ */
describe('§5 — isian gradien memakai --*-solid, bukan token teks', () => {
  /* Token semantik POLOS. Pasangan berskala (--navy-700, --blue-400) dan
     pasangan isian (--blue-solid) tidak termasuk — merekalah yang benar. */
  const TEKS = /var\(\s*--(navy|blue|green|red|teal|purple|amber)\s*\)/g;

  it('nol token teks polos dipakai sebagai henti gradien', () => {
    const pelanggar: string[] = [];
    for (const f of sumber()) {
      kode(f).split('\n').forEach((ln, i) => {
        for (const g of gradien(ln)) {
          for (const m of g.matchAll(TEKS)) {
            pelanggar.push(`${f}:${i + 1} ${m[0]} → pakai --${m[1]}-solid`);
          }
        }
      });
    }
    expect(
      pelanggar,
      `token TEKS dipakai sbg isian gradien (akan TERBALIK di tema gelap):\n  ${pelanggar.join('\n  ')}`,
    ).toEqual([]);
  });

  it('token isian yang dipakai gradien tidak di-override di :root.dark', () => {
    /* Inilah yang membuat aturan 2 bermakna: `--*-solid` stabil lintas tema,
       sedangkan padanan teksnya tidak. Kalau suatu saat seseorang meng-override
       --*-solid di blok gelap, seluruh alasan memilihnya runtuh dan uji ini
       memberi tahu — alih-alih panel berubah diam-diam. */
    const base = readFileSync(join(DIR, 'styles_base.css'), 'utf8');
    const gelap = base.slice(base.indexOf(':root.dark'));
    const bocor = ['--blue-solid', '--green-solid', '--teal-solid', '--purple-solid', '--red-solid']
      .filter((t) => new RegExp(`${t}\\s*:`).test(gelap));
    expect(bocor, `--*-solid di-override di tema gelap: ${bocor.join(', ')}`).toEqual([]);
  });
});
