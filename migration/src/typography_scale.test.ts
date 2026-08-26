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

   BATAS YANG DINYATAKAN (jangan diklaim lebih):
   - Ukuran yang DIHITUNG dari dimensi lain (`fontSize: size * 0.4`) TIDAK
     dijaga di sini. Itu kelas cacat terpisah; `cockpit_conventions.test.ts`
     menjaganya untuk cockpit saja. Dua situs se-repo masih memikulnya
     (`ui.tsx` Avatar, `view_misc2.tsx` FmtBadge) — sengaja dibiarkan, lihat
     catatan PR. Menambahkannya ke sini akan MEMERAHKAN master.
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

type Pelanggaran = { berkas: string; ekspresi: string; nilai: number };

const sensus = (): Pelanggaran[] => {
  const out: Pelanggaran[] = [];
  for (const f of berkasSumber()) {
    for (const m of kode(f).matchAll(NILAI)) {
      const ekspresi = m[1].trim();
      /* ukuran terhitung: kelas terpisah, lihat BATAS di kepala berkas */
      if (/[*/]/.test(ekspresi)) continue;
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

  it('nol ukuran di bawah lantai 11px', () => {
    const bawah = sensus().filter((p) => p.nilai < 11);
    expect(bawah.map((p) => `${p.berkas}: ${p.ekspresi}`)).toEqual([]);
  });
});
