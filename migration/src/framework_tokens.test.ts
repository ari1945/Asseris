/* ============================================================
   Penentu Kerangka — gerbang anti-kambuh warna hardcode
   (view_framework.tsx)

   Sebabnya konkret: berkas ini memakai token CSS untuk `tint` tetapi hex
   harfiah untuk `accent` — pada BARIS YANG SAMA. Tokennya sudah ada; ia hanya
   tidak dipakai. Selama nilai terang `--blue-solid` kebetulan sama persis
   dengan `#005085`, cacatnya TAK KELIHATAN di tema terang dan hanya menyala di
   tema gelap, tempat token dipetakan ulang dan hex tidak. Itu kelas cacat yang
   tak akan ditemukan tinjauan mata.

   Dua jebakan yang sengaja dihindari gerbang ini:

   1. Polanya ditulis sebagai regex HARFIAL di bawah, bukan dirakit dari string
      lewat `new RegExp('...')`. Merakit dari string membuat escape hilang satu
      lapis, polanya berubah makna, dan gerbangnya lolos di ruang hampa —
      hijau selamanya tanpa pernah mencocokkan apa pun.

   2. Komentar DIBUANG sebelum pencocokan. Komentar di styles_base.css dan di
      berkas ini mendokumentasikan hex lama sebagai catatan sejarah; tanpa
      langkah ini gerbangnya akan menuduh dokumentasinya sendiri, selamanya.

   Batas yang DIKETAHUI dan disengaja: pola ini menjaring hex 6-digit saja.
   Empat `#fff` (teks di atas isian pekat) sengaja dibiarkan — tidak ada token
   "putih" di styles_base.css, dan `#fff` adalah idiom se-repo (247 pemakaian
   di `.tsx`). Menciptakan token baru hanya untuk berkas ini akan menambah
   kosakata yang tak dipakai siapa pun. Bila token semacam itu kelak lahir,
   naikkan pola ini ke {3,8} dan sapu se-repo, bukan di sini saja.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const BERKAS = join(__dirname, 'view_framework.tsx');
const SUMBER = readFileSync(BERKAS, 'utf8');

/* Komentar blok & baris dibuang lebih dulu — lihat jebakan (2) di atas. */
const tanpaKomentar = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/* Regex HARFIAH — lihat jebakan (1) di atas. Jangan ubah jadi new RegExp(). */
const HEX6 = /#[0-9a-fA-F]{6}/g;

const KODE = tanpaKomentar(SUMBER);

describe('view_framework — warna berasal dari token, bukan hex harfiah', () => {
  /* Gerbang yang memindai berkas kosong lulus dengan gemilang. Angka-angka ini
     ada supaya kegagalan pembacaan tampak MERAH, bukan hijau. */
  it('benar-benar memindai berkas (bukan gerbang hampa)', () => {
    expect(SUMBER.length).toBeGreaterThan(15_000);
    expect(KODE.length).toBeGreaterThan(10_000);
    /* Membuktikan pembuangan komentar tidak melahap kodenya. Jangkarnya sengaja
       bukan `fwDetermine`: mesin itu pindah ke `fw_canon.ts` di PR-1, dan jangkar
       yang menunjuk kode yang berpindah membuat gerbang ini rapuh terhadap
       refactor yang sah. `FrameworkView` & `FW_META` memang milik berkas ini. */
    expect(KODE).toContain('function FrameworkView');
    expect(KODE).toContain('FW_META');
  });

  /* Membuktikan polanya HIDUP: ia harus mencocokkan hex yang nyata. Tanpa uji
     ini, pola yang salah ketik akan membuat gerbang utama hijau selamanya. */
  it('polanya benar-benar mencocokkan hex (bukan lolos ruang hampa)', () => {
    expect('warna: #005085;'.match(HEX6)).toEqual(['#005085']);
    expect('a #0a6b73 b #5b3fa6'.match(HEX6)).toEqual(['#0a6b73', '#5b3fa6']);
    expect('var(--blue-solid)'.match(HEX6)).toBeNull();
  });

  it('nol hex 6-digit di dalam kode', () => {
    const temuan = KODE.match(HEX6) ?? [];
    expect(temuan).toEqual([]);
  });

  /* Peran warna §5: token TEKS untuk teks, `--*-solid` untuk isian. Ketiga
     kerangka harus memikul ketiga peran — bila salah satu hilang, komponen
     yang membacanya jatuh ke `undefined` dan warnanya lenyap tanpa error. */
  it('setiap kerangka memikul tiga peran warna (accent/text/fg) + tint', () => {
    /* Regex HARFIAH satu per peran — SENGAJA tidak dirakit lewat
       `new RegExp(pola + peran)`. Upaya pertama merakitnya dan escape `\b`
       hilang satu lapis dalam perjalanan ke berkas: polanya berubah menjadi
       karakter backspace harfiah, mencocokkan nol, dan seluruh peran terbaca
       0. Itu tepat jebakan (1) di kepala berkas ini — terbukti sendiri. */
    /* Dicocokkan HANYA di dalam literal FW_META. Upaya pertama memindai seluruh
       berkas dan terhitung 4, karena `interface FwMeta` mendeklarasikan
       `accent: string` — deklarasi tipe terbaca sebagai entri kerangka. */
    const awal = KODE.indexOf('const FW_META');
    const akhir = KODE.indexOf('const FW_ORDER');
    expect(awal).toBeGreaterThan(0);
    expect(akhir).toBeGreaterThan(awal);
    const META = KODE.slice(awal, akhir);

    const PERAN: ReadonlyArray<readonly [string, RegExp]> = [
      ['accent', /\baccent: /g],
      ['text', /\btext: /g],
      ['fg', /\bfg: /g],
      ['tint', /\btint: /g],
    ];
    for (const [peran, pola] of PERAN) {
      const n = (META.match(pola) ?? []).length;
      expect({ peran, n }).toEqual({ peran, n: 3 });
    }
  });
});
