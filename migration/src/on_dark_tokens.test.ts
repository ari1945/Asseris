/* ============================================================
   Peran ON-DARK — gerbang anti-kambuh (CLAUDE.md §5)

   `styles_base.css` menamai tujuh peran warna di atas latar gelap dan mencatat
   utangnya sendiri:

     "Nilai-nilai ini sudah dipakai MENTAH di 58 berkas (122 kemunculan); di sini
      mereka diberi nama satu kali supaya berhenti menjadi hex tercecer.
      Menyapu 57 berkas sisanya adalah sweep tersendiri, bukan bagian PR ini."

   Berkas ini adalah sweep tersebut PLUS gerbangnya. Tanpa gerbang, hex akan
   menetes kembali satu per satu — dan bukti bahwa ia menetes ada di sensus:
   sub-keterangan pada panel hero gelap ditulis dengan EMPAT literal berbeda
   yang mata tak bisa bedakan — #9fc0d2 · #9fc1d4 · #9fc2d4 · #9fb9c8 — di
   samping saudara sebarisnya yang memakai #bcd6e4. Itu bukan hierarki yang
   dirancang; itu penyalinan yang meleset.

   Tiga aturan yang ditegakkan:

     1. Nilai sebuah token TIDAK BOLEH ditulis mentah. Begitu `--on-dark-muted`
        ada, menulis `#bcd6e4` selalu salah — ia lolos tinjauan justru karena
        tampak benar.
     2. Di dalam panel berlatar gelap, setiap `color:` harus `var(--…)`.
        Aturan (1) sendirian tak cukup: ia buta pada nada BARU yang belum
        pernah jadi token (persis keempat varian di atas).
     3. Setiap `var(--on-dark-*)` yang dipakai benar-benar terdefinisi.
        Token salah ketik gagal DIAM — `var(--on-dark-mutedd)` tidak error,
        ia hanya menghasilkan warna kosong. Tanpa (3), mengganti hex dengan
        token justru bisa memperburuk keadaan. (Pola dari cockpit_conventions.)

   Uji ini membaca SUMBERNYA, dengan komentar DIBUANG lebih dulu — kalau tidak,
   kutipan sejarah di kepala berkas ini sendiri akan menggagalkannya.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const DIR = __dirname;

/* Sumber yang diperiksa: seluruh modul tulis-tangan. Berkas uji dikecualikan
   (ia mengutip nilai pelanggaran sebagai data), begitu pula styles_base.css
   yang memang RUMAH definisi token. */
const sumber = (): string[] =>
  readdirSync(DIR).filter(
    (f) => /\.(tsx|ts|css)$/.test(f) && !/\.test\.tsx?$/.test(f) && f !== 'styles_base.css',
  );

/* Komentar dinetralkan menjadi spasi — panjang & jumlah baris dipertahankan
   supaya nomor baris pada pesan kegagalan tetap menunjuk ke tempat aslinya. */
const kode = (f: string): string =>
  readFileSync(join(DIR, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, (m) => ' '.repeat(m.length));

const baris = (f: string): string[] => kode(f).split('\n');

/* ---------- luminansi relatif (WCAG 2.x) ---------- */
const kanal = (c: number): number => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};
const lum = (hex: string): number => {
  let h = hex.slice(1);
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h.slice(0, 6), 16);
  return 0.2126 * kanal((n >> 16) & 255) + 0.7152 * kanal((n >> 8) & 255) + 0.0722 * kanal(n & 255);
};

/* ============================================================
   1 — nilai token tak boleh ditulis mentah
   ============================================================ */
describe('§5 — nilai token on-dark tidak ditulis mentah', () => {
  /* Dibaca dari stylesheet, bukan disalin ke sini: kalau suatu saat nilainya
     berubah, gerbang ikut bergerak sendiri. Salinan literal di berkas uji
     justru akan menjadi hex tercecer yang ke-58. */
  const CSS_BASE = readFileSync(join(DIR, 'styles_base.css'), 'utf8');

  const tokenOnDark = (): Array<[string, string]> =>
    [...CSS_BASE.matchAll(/(--on-dark-[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)]
      .map((m) => [m[1], m[2].toLowerCase()] as [string, string])
      /* #ffffff terlalu umum untuk dilarang mentah-mentah di seluruh repo:
         ia dipakai sah pada latar terang. Peran fg-on-dark ditegakkan oleh
         aturan (2), yang tahu konteksnya. */
      .filter(([, v]) => v !== '#ffffff' && v !== '#fff');

  it('daftar token terbaca dari stylesheet (bukan salinan di uji ini)', () => {
    const t = tokenOnDark();
    expect(t.length, 'tak ada --on-dark-* bernilai hex di styles_base.css').toBeGreaterThanOrEqual(5);
    expect(t.map(([n]) => n)).toContain('--on-dark-muted');
  });

  it('nol kemunculan mentah dari nilai token mana pun', () => {
    const tokens = tokenOnDark();
    const pelanggar: string[] = [];
    for (const f of sumber()) {
      const ls = baris(f);
      ls.forEach((ln, i) => {
        for (const [nama, nilai] of tokens) {
          if (ln.toLowerCase().includes(nilai)) pelanggar.push(`${f}:${i + 1} ${nilai} → var(${nama})`);
        }
      });
    }
    expect(pelanggar, `nilai token ditulis mentah:\n  ${pelanggar.join('\n  ')}`).toEqual([]);
  });
});

/* ============================================================
   2 — di panel gelap, warna teks harus token
   ============================================================ */
describe('§5 — warna teks di atas latar gelap harus token', () => {
  /* Sebuah baris dianggap membuka panel gelap bila ia memasang `background`
     bergradien yang salah satu hentinya GELAP. Ambangnya luminansi, bukan
     daftar hex: gradien baru dengan biru-tua lain ikut tertangkap tanpa
     gerbang ini perlu diubah. Nama token gelap dikenali terpisah karena
     nilainya tak tertulis di situ. */
  const AMBANG = 0.15;
  const TOKEN_GELAP = /var\(--(navy-700|navy-600|navy-800|navy-solid|blue-solid|navy)\)/;

  const bukaPanelGelap = (ln: string): boolean => {
    const m = ln.match(/background:\s*'?([^';]*linear-gradient\([^)]*\))/i);
    if (!m) return false;
    const stops = [...m[1].matchAll(/#[0-9a-fA-F]{3,8}\b/g)].map((x) => x[0]);
    if (stops.some((s) => lum(s) < AMBANG)) return true;
    return TOKEN_GELAP.test(m[1]);
  };

  /* Cakupan blok ditentukan oleh INDENTASI: pemindaian berhenti pada baris
     pertama yang indentasinya <= pembuka, yaitu saat elemennya tertutup.
     Jendela 14 baris menjadi batas atas supaya berkas ber-format aneh tak
     membuat gerbang menyapu setengah modul. */
  const warnaMentahDiPanelGelap = (f: string): string[] => {
    const ls = baris(f);
    const out: string[] = [];
    ls.forEach((ln, i) => {
      if (!bukaPanelGelap(ln)) return;
      const dasar = ln.search(/\S/);
      for (let j = i; j < Math.min(ls.length, i + 14); j++) {
        if (j > i && ls[j].trim() && ls[j].search(/\S/) <= dasar) break;
        for (const m of ls[j].matchAll(/color:\s*'?(#[0-9a-fA-F]{3,8})\b/g)) {
          out.push(`${f}:${j + 1} ${m[1].toLowerCase()}`);
        }
      }
    });
    return out;
  };

  it('detektor benar-benar mengenali panel hero gelap (gerbang tidak menyapu vakum)', () => {
    /* Tanpa uji ini, sebuah regex yang tak pernah cocok akan tampak HIJAU
       selamanya dan tak menjaga apa pun. */
    const total = sumber().filter((f) => baris(f).some(bukaPanelGelap)).length;
    expect(total, 'detektor panel gelap tak menemukan satu berkas pun').toBeGreaterThanOrEqual(30);
  });

  it('nol warna heksadesimal mentah di dalam panel gelap', () => {
    const pelanggar = sumber().flatMap(warnaMentahDiPanelGelap);
    expect(
      pelanggar,
      `warna mentah di panel gelap (pakai var(--on-dark-*)):\n  ${pelanggar.join('\n  ')}`,
    ).toEqual([]);
  });
});

/* ============================================================
   3 — token yang dipakai harus terdefinisi
   ============================================================ */
describe('§5 — setiap var(--on-dark-*) terdefinisi di stylesheet', () => {
  it('nol token on-dark yang dirujuk tapi tak pernah didefinisikan', () => {
    const css = readdirSync(DIR)
      .filter((f) => f.endsWith('.css'))
      .map((f) => readFileSync(join(DIR, f), 'utf8'))
      .join('\n');
    /* Blok <style> di dalam TSX juga sah sebagai tempat definisi. */
    const tsxStyle = readdirSync(DIR)
      .filter((f) => /\.tsx$/.test(f) && !/\.test\.tsx$/.test(f))
      .map((f) => readFileSync(join(DIR, f), 'utf8'))
      .join('\n');

    const dipakai = [
      ...new Set(
        sumber().flatMap((f) => [...kode(f).matchAll(/var\((--on-dark-[\w-]+)/g)].map((m) => m[1])),
      ),
    ];
    expect(dipakai.length, 'tak satu pun token on-dark dipakai — sweep belum jalan').toBeGreaterThan(3);

    const hilang = dipakai.filter((t) => !css.includes(`${t}:`) && !tsxStyle.includes(`${t}:`));
    expect(hilang, `token tak terdefinisi: ${hilang.join(', ')}`).toEqual([]);
  });
});
