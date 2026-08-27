/* ============================================================
   §5 — SKALA TIPOGRAFI MENGIKAT, se-REPO (bukan satu berkas)

   CLAUDE.md §5 mengunci delapan ukuran: teks 11 · 12 · 13 · 15 · 19
   (--fs-xs/sm/md/lg/xl) dan angka display 22 · 28 · 34 (--fs-d1/d2/d3).
   Lantai 11px; setengah langkah (11,5 · 12,5 · 13,5 …) DILARANG eksplisit,
   dan aturan itu berlaku untuk CSS *maupun* `fontSize` inline.

   MENGAPA GERBANG INI ADA (dan mengapa yang lama tak cukup):
   `cockpit_conventions.test.ts` sudah memuat aturan §5 sejak PR-C-6, tetapi
   ia buta dua kali:

     1. LINGKUP — ia hanya membaca `view_cockpit2.tsx`. Dua puluh berkas lain
        memikul setengah langkah tanpa ada yang melihat.
     2. BENTUK — regexnya `/fontSize:\s*(\d+(?:\.\d+)?)/` menuntut ANGKA
        persis sesudah titik dua. Bentuk yang sebenarnya dipakai di repo ini
        adalah TERNARI:

            fontSize: strong ? 14 : 12.5

        di sini yang menyusul `fontSize:` adalah `strong`, bukan digit —
        sehingga regex itu mengembalikan NOL kecocokan. Setiap pelanggaran
        nyata di repo berbentuk ternari, jadi gerbang lama melewatkan
        SELURUHNYA. Ia hijau di atas kode yang bocor.

   Gerbang ini membaca EKSPRESI nilai `fontSize` (sampai koma/kurung penutup)
   lalu memeriksa SETIAP literal angka di dalamnya — termasuk kedua cabang
   ternari.

   UKURAN TERHITUNG — KINI DIJAGA (dulu dikecualikan):
   Sampai PR sebelumnya gerbang ini melewati setiap ekspresi yang memuat `*`
   atau `/`, karena dua situs se-repo masih memikulnya dan memasukkannya akan
   memerahkan master. Keduanya sudah ditutup:

     ui.tsx        Avatar    fontSize: size * 0.4    → 6,4px pada diameter 16
     view_misc2    FmtBadge  fontSize: size * 0.185  → 7,03px pada size 38

   Keduanya kini memancarkan KELAS `fs-*` (nilainya `var(--fs-*)`) lewat
   `fsTier` di fs_tier.ts: proporsinya tetap, hasilnya mendarat di anggota skala.
   Pengecualiannya dicabut, jadi kelas cacat ini benar-benar dijaga.

   DUA BENTUK diperiksa, karena satu saja tak cukup:
     1. LITERAL — setiap angka di dalam ekspresi `fontSize` (kedua cabang
        ternari termasuk) harus anggota skala. Ini menangkap `size * 0.4`,
        yang memuat literal 0,4.
     2. BENTUK  — ekspresi `fontSize` tak boleh mengandung `*` atau `/` sama
        sekali. Perlu terpisah karena `fontSize: size * ratio` tak memuat SATU
        PUN literal angka: sensus literal akan hijau di atasnya.

   BATAS YANG DINYATAKAN (jangan diklaim lebih):
   - Gerbang ini membaca TEKS berkas, bukan aliran nilai. `const fs = size *
     0.4;` lalu `fontSize: fs` akan lolos. Yang dijaga adalah bentuk di situs
     `fontSize:` itu sendiri.
   - `export_pdf.ts` dikecualikan: `fontSize` di sana adalah POIN jsPDF, bukan
     piksel CSS, dan tidak tunduk pada skala ini.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const DIIZINKAN = new Set([11, 12, 13, 15, 19, 22, 28, 34]);

/* jsPDF memakai poin, bukan piksel CSS — di luar yurisdiksi skala. */
const DIKECUALIKAN = new Set(['export_pdf.ts']);

const berkasSumber = (): string[] =>
  readdirSync(__dirname)
    .filter((f) => /\.tsx?$/.test(f))
    .filter((f) => !/\.test\.tsx?$/.test(f))
    .filter((f) => !DIKECUALIKAN.has(f));

/* komentar dibuang: commit yang baik MENGUTIP pola lama sebagai catatan
   sejarah, dan gerbang yang membaca komentar akan menuduh perbaikannya. */
const kode = (f: string): string =>
  readFileSync(join(__dirname, f), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

/* nilai `fontSize` = segalanya sampai koma / kurung kurawal penutup / akhir
   baris. Cukup untuk menangkap kedua cabang ternari satu baris, yang adalah
   satu-satunya bentuk yang dipakai repo ini. */
const NILAI = /fontSize:\s*([^,}\n]+)/g;
const ANGKA = /(?<![\w.])(\d+(?:\.\d+)?)(?![\w.]*\s*[*/])/g;

/* Bentuk terhitung: apa pun yang mengalikan/membagi di situs `fontSize:`.
   Diperiksa terpisah dari literal — lihat "DUA BENTUK" di kepala berkas. */
const TERHITUNG = /[*/]/;

type Pelanggaran = { berkas: string; ekspresi: string; nilai: number };

const sensus = (): Pelanggaran[] => {
  const out: Pelanggaran[] = [];
  for (const f of berkasSumber()) {
    for (const m of kode(f).matchAll(NILAI)) {
      const ekspresi = m[1].trim();
      for (const a of ekspresi.matchAll(ANGKA)) {
        const nilai = Number(a[1]);
        if (!DIIZINKAN.has(nilai)) out.push({ berkas: f, ekspresi, nilai });
      }
    }
  }
  return out;
};

describe('§5 — skala tipografi mengikat di SELURUH migration/src', () => {
  it('gerbang ini benar-benar MENCARI (bukan lolos karena nol berkas)', () => {
    const berkas = berkasSumber();
    expect(berkas.length).toBeGreaterThan(150);
    expect(berkas).toContain('view_calc.tsx');
    /* dan ia benar-benar melihat ekspresi fontSize, bukan nol kecocokan */
    const total = berkasSumber().reduce(
      (n, f) => n + [...kode(f).matchAll(NILAI)].length, 0);
    expect(total).toBeGreaterThan(500);
  });

  it('regex NILAI menangkap kedua cabang ternari (yang regex lama lewatkan)', () => {
    /* uji-atas-uji: kalau ini putus, sensus di bawah jadi hijau palsu. */
    const contoh = "x={{ fontSize: strong ? 14 : 12.5, color: 'red' }}";
    const m = [...contoh.matchAll(NILAI)];
    expect(m).toHaveLength(1);
    const angka = [...m[0][1].matchAll(ANGKA)].map((a) => Number(a[1]));
    expect(angka).toEqual([14, 12.5]);
    /* bentuk lama TIDAK melihat apa pun di sini — inilah lubangnya */
    expect([...contoh.matchAll(/fontSize:\s*(\d+(?:\.\d+)?)/g)]).toHaveLength(0);
  });

  it('nol fontSize di luar delapan ukuran skala (setengah langkah termasuk)', () => {
    const nakal = sensus();
    const ringkas = [...new Set(nakal.map((p) => `${p.berkas}: ${p.ekspresi}`))];
    expect(nakal.length, `${nakal.length} pelanggaran:\n  ${ringkas.join('\n  ')}`).toBe(0);
  });

  it('nol fontSize yang DIHITUNG dari dimensi lain (se-repo, bukan cockpit saja)', () => {
    /* `size * 0.4` (Avatar) & `size * 0.185` (FmtBadge) mendarat di 6,4px dan
       7,03px — di bawah lantai. Keduanya kini lewat kelas `fs-*`. Bentuk ini
       diperiksa sendiri karena `size * ratio` nol literal angka. */
    const terhitung: string[] = [];
    for (const f of berkasSumber()) {
      for (const m of kode(f).matchAll(NILAI)) {
        const ekspresi = m[1].trim();
        if (TERHITUNG.test(ekspresi)) terhitung.push(`${f}: ${ekspresi}`);
      }
    }
    expect([...new Set(terhitung)]).toEqual([]);
  });

  it('sensus BENTUK itu benar-benar melihat pola terhitung (bukan regex mati)', () => {
    /* uji-atas-uji: kalau TERHITUNG putus, uji di atas jadi hijau palsu. */
    const contoh = "style={{ fontSize: size * ratio, color: 'red' }}";
    const m = [...contoh.matchAll(NILAI)];
    expect(m).toHaveLength(1);
    expect(TERHITUNG.test(m[0][1].trim())).toBe(true);
    /* dan sensus LITERAL memang buta pada bentuk ini — sebab ia ada */
    expect([...m[0][1].matchAll(ANGKA)]).toHaveLength(0);
  });

  it('nol ukuran di bawah lantai 11px', () => {
    const bawah = sensus().filter((p) => p.nilai < 11);
    expect(bawah.map((p) => `${p.berkas}: ${p.ekspresi}`)).toEqual([]);
  });
});
