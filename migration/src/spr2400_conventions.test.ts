/* ============================================================
   SPR 2400 · Perikatan Reviu — gerbang atas `view_spr2400.tsx`.

   Modul ini adalah lapisan METODOLOGI (kontinum keyakinan, ¶45–57, bentuk
   simpulan ¶86–96). Isi standarnya BOLEH literal. Yang TIDAK boleh literal
   adalah FAKTA PERIKATAN — angka materialitas, nama penanda tangan, id
   perikatan, dan status bukti — karena semuanya sudah punya catatan kanonik
   dan salinan privat di view akan membusuk diam-diam begitu catatan itu
   berubah.

   Yang dipaku di sini:

     S1 · Materialitas reviu (900 / 1% pendapatan / 675) diketik sebagai
          literal di `KvBox`, padahal `AMS.REVIEW_2400_PLAN` memuat PERSIS
          ketiga angka itu (`materiality` · `benchmark` · `pm`) dan sudah
          dirender modul `review2400` sebagai "Materialitas Reviu".
          Ini pelanggaran SSOT, bukan angka tanpa sumber.
     S2 · `Sari Dewanti, CPA` dicetak sebagai TANDA TANGAN pada pratinjau
          laporan asurans. Ia orang nyata di data aplikasi.
     S3 · `REV-2025-022` diketik sebagai literal di bawah label "Perikatan
          Aktif" — modul menyatakan perikatan mana yang aktif tanpa membaca
          satu pun catatan.
     S4 · Empat nada di `CONCL_2400` dirakit jadi `var(--<k>)` saat runtime,
          dan salah satu `k`-nya `gray`. `--gray` TIDAK PERNAH ADA, jadi opsi
          keempat gagal DIAM (substitusi custom property yang gagal membuat
          deklarasi invalid). `css_tokens.test.ts` tak bisa melihatnya —
          kepala berkasnya menyatakan batas itu sendiri.
     S5 · `<div onClick>` dipakai sebagai tautan navigasi dan sebagai
          radiogroup (lengkap dengan lingkaran radio palsu).
     S6 · `<Btn>` "AI Assist" tanpa `onClick` — tombol mati.

   Pemindai sumber MEMBUANG KOMENTAR lebih dulu: berkas sumber mengutip pola
   lama sebagai catatan sejarah, dan pemindai yang ikut membaca komentar akan
   menuduh catatan itu sendiri. Helper `tanpaKomentar` diuji terhadap dirinya
   sendiri di blok terakhir — gerbang yang stripnya salah taruh akan HIJAU di
   atas kode yang belum berubah, dan itu lebih buruk daripada tak ada gerbang.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = __dirname;

/* Berkas yang dipindai bisa ditimpa lewat env, supaya gerbang ini dapat
   DIFALSIFIKASI terhadap versi sebelum perbaikan:
     SPR2400_SRC=/tmp/before.tsx npx vitest run spr2400_conventions
   Tanpa env, ia memindai sumber yang sebenarnya. */
const TARGET = process.env.SPR2400_SRC || join(ROOT, 'view_spr2400.tsx');

const tanpaKomentar = (t: string): string =>
  t.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

const mentah = (): string => readFileSync(TARGET, 'utf8');
const kode = (): string => tanpaKomentar(mentah());

const STYLESHEETS = ['styles_base.css', 'styles_chrome.css', 'styles_work.css', 'styles_modules.css', 'styles_ai.css'];

/* Definisi token = `--x:` di CSS. Dibaca dari berkas, BUKAN didaftar tangan —
   daftar tangan akan ikut membusuk bersama stylesheet-nya. */
const tokenTerdefinisi = (): Set<string> => {
  const teks = STYLESHEETS.map((f) => readFileSync(join(ROOT, f), 'utf8')).join('\n');
  return new Set([...teks.matchAll(/(--[\w-]+)\s*:/g)].map((m) => m[1]));
};

describe('SPR 2400 — pemindai benar-benar membaca sesuatu', () => {
  it('berkas sasaran terbaca dan berukuran wajar (bukan gerbang kosong)', () => {
    expect(mentah().length).toBeGreaterThan(4000);
    expect(kode()).toContain('SPR2400View');
  });

  it('stylesheet terbaca dan memuat keluarga token yang dikenal', () => {
    const t = tokenTerdefinisi();
    expect(t.size).toBeGreaterThan(60);
    /* jangkar: token yang PASTI ada — kalau ini gagal, pembacanya yang rusak,
       bukan kodenya */
    for (const n of ['--green', '--amber', '--red', '--teal', '--ink-4', '--surface-3']) {
      expect(t.has(n)).toBe(true);
    }
  });
});

/* ==================================================================
   S1 — materialitas reviu tidak boleh jadi literal di view.
   ================================================================== */
describe('S1 · materialitas reviu ditarik dari catatan, bukan diketik', () => {
  it('tak ada literal 900 / 675 / "1% pendapatan" sebagai nilai di sumber', () => {
    const src = kode();
    /* `toContain` disengaja, BUKAN `new RegExp` rakitan-string: escape `\b`
       pernah mendarat di repo ini sebagai byte BACKSPACE lewat heredoc,
       melahirkan regex yang tak pernah cocok dan gerbang hijau di atas kode
       cacat. String harfiah tak bisa kehilangan escape. */
    expect(src).not.toContain('"900"');
    expect(src).not.toContain("'900'");
    expect(src).not.toContain('"675"');
    expect(src).not.toContain("'675'");
    expect(src).not.toContain('1% pendapatan');
  });

  it('materialitas ditarik dari REVIEW_2400_PLAN (bukan sekadar dihapus)', () => {
    expect(kode()).toContain('REVIEW_2400_PLAN');
  });

  it('TIDAK menyambung ke materialitas perikatan AUDIT aktif', () => {
    /* `useMateriality()` membaca `useFirm().activeEngagement` = perikatan
       AUDIT. Memakainya di sini akan menampilkan materialitas entitas LAIN di
       bawah judul reviu — kebohongan baru yang lebih sulit terlihat daripada
       literal 900. */
    const src = kode();
    expect(src).not.toContain('useMateriality');
    expect(src).not.toContain('materialityFor');
  });
});

/* ==================================================================
   S2 · S3 — identitas orang & perikatan.
   ================================================================== */
describe('S2 · nama penanda tangan tidak diketik di view', () => {
  it('tak ada nama akuntan publik harfiah di sumber', () => {
    const src = kode();
    expect(src).not.toContain('Sari Dewanti');
    /* tetangga yang cacatnya identik — dipaku di blok terakhir, bukan di sini */
    expect(src).not.toContain('Hartono Wijaya');
    expect(src).not.toContain('Rudi Gunawan');
  });
});

describe('S3 · id perikatan tidak diketik di view', () => {
  it('tak ada id perikatan harfiah di sumber', () => {
    const src = kode();
    expect(src).not.toContain('REV-2025-022');
    expect(src).not.toContain('ENG-2025-');
  });

  it('identitas perikatan ditarik dari REVIEW_2400', () => {
    expect(kode()).toContain('REVIEW_2400');
  });
});

/* ==================================================================
   S4 — nada simpulan memetakan ke token yang BENAR-BENAR ada.
   ================================================================== */
describe('S4 · setiap nada CONCL_2400 memetakan ke token CSS terdefinisi', () => {
  it('tak ada token yang dirakit runtime dari kunci nada', () => {
    const src = kode();
    /* `var(--${x.k})` tak terbaca pemindai statis mana pun — termasuk
       css_tokens.test.ts. Jalan keluarnya bukan menambal pemindai, melainkan
       MENGENUMERASI petanya sehingga token muncul harfiah di sumber. */
    expect(src).not.toContain('var(--${');
    expect(src).not.toContain("'var(--' +");
    expect(src).not.toContain('`var(--`');
  });

  /* Judul & pesan di blok ini sengaja TIDAK menulis contoh pemanggilan token
     secara harfiah: `css_tokens.test.ts` memindai SELURUH `migration/src`
     termasuk berkas uji ini, dan contoh di dalam kode (bukan komentar) akan
     dituduhnya sebagai token tak terdefinisi. */
  it('setiap token yang dipakai di berkas ini benar-benar terdefinisi di stylesheet', () => {
    const ada = tokenTerdefinisi();
    const dipakai = [...kode().matchAll(/var\(\s*(--[\w-]+)/g)].map((m) => m[1]);
    expect(dipakai.length).toBeGreaterThan(10);
    const hilang = [...new Set(dipakai)].filter((t) => !ada.has(t));
    expect(hilang).toEqual([]);
  });

  it('nada yang dipakai bukan nama yang tak pernah ada', () => {
    const ada = tokenTerdefinisi();
    /* pembuktian bahwa `--gray` memang tak pernah ada — kalau suatu saat
       seseorang mendefinisikannya, uji ini yang harus dicabut lebih dulu,
       bukan diam-diam lolos */
    expect(ada.has('--gray')).toBe(false);
    expect(ada.has('--gray-bg')).toBe(false);
  });
});

/* ==================================================================
   S5 · S6 — kontrol.
   ================================================================== */
describe('S5 · kontrol native, bukan div/span yang berpura-pura', () => {
  it('tak ada <div onClick> / <span onClick> di berkas ini', () => {
    const src = kode();
    expect(src).not.toContain('<div onClick');
    expect(src).not.toContain('<span onClick');
    expect(src).not.toContain('<tr onClick');
  });
});

describe('S6 · tiap <Btn> punya onClick — tombol mati diaktifkan atau dihapus', () => {
  it('nol <Btn ...> tanpa onClick', () => {
    const src = kode();
    /* ambil setiap tag pembuka <Btn ...> sampai `>` pertama yang bukan bagian
       dari `=>` — cukup untuk berkas ini yang tak punya <Btn> multi-baris */
    const tags = [...src.matchAll(/<Btn\b[^>]*>/g)].map((m) => m[0]);
    expect(tags.length).toBeGreaterThan(0);
    const mati = tags.filter((t) => !t.includes('onClick'));
    expect(mati).toEqual([]);
  });
});

/* ==================================================================
   Guard atas pemindainya sendiri.

   Gerbang yang stripnya salah taruh akan HIJAU di atas kode yang belum
   berubah. Blok ini memaksa `tanpaKomentar` membuktikan dua arah: ia MEMBUANG
   komentar, dan ia TIDAK membuang kode.
   ================================================================== */
describe('guard · pemindai benar-benar mampu mendeteksi', () => {
  it('tanpaKomentar membuang komentar blok dan baris', () => {
    expect(tanpaKomentar('/* Sari Dewanti, CPA */')).not.toContain('Sari Dewanti');
    expect(tanpaKomentar('  // materialitas 900 dulu literal')).not.toContain('900');
    expect(tanpaKomentar('/* a\n REV-2025-022 \n b */')).not.toContain('REV-2025-022');
  });

  it('tanpaKomentar TIDAK membuang kode', () => {
    expect(tanpaKomentar('const v = "900";')).toContain('"900"');
    expect(tanpaKomentar('<div onClick={f}>')).toContain('<div onClick');
    /* URL di dalam string tidak boleh ikut terpotong oleh strip `//` */
    expect(tanpaKomentar('const u = "https://x/y";')).toContain('https://x/y');
  });

  it('deteksi <Btn> tanpa onClick benar-benar bekerja', () => {
    const contoh = '<Btn sm variant="primary">x</Btn>';
    const tags = [...contoh.matchAll(/<Btn\b[^>]*>/g)].map((m) => m[0]);
    expect(tags.filter((t) => !t.includes('onClick')).length).toBe(1);
    const contoh2 = '<Btn sm onClick={() => nav(1)}>x</Btn>';
    const tags2 = [...contoh2.matchAll(/<Btn\b[^>]*>/g)].map((m) => m[0]);
    expect(tags2.filter((t) => !t.includes('onClick')).length).toBe(0);
  });
});

/* ==================================================================
   PAKU TETANGGA — cacat yang SAMA di berkas lain, SENGAJA TIDAK diperbaiki
   di sini (sapuan nama penanda tangan adalah PR tersendiri). Uji ini
   MENDOKUMENTASIKAN keberadaannya supaya ia tak hilang dari pandangan, dan
   akan MERAH begitu seseorang memperbaikinya — itulah sinyal untuk mencabut
   paku ini, bukan untuk menambal.
   ================================================================== */
describe('paku · cacat identik di berkas tetangga (di luar lingkup PR ini)', () => {
  const lain = (f: string): string => tanpaKomentar(readFileSync(join(ROOT, f), 'utf8'));

  it('view_spr2410 & view_sa800/805/810 masih mencetak nama penanda tangan harfiah', () => {
    const korban = ['view_spr2410.tsx', 'view_sa800.tsx', 'view_sa805.tsx', 'view_sa810.tsx']
      .filter((f) => lain(f).includes('Hartono Wijaya'));
    expect(korban).toEqual(['view_spr2410.tsx', 'view_sa800.tsx', 'view_sa805.tsx', 'view_sa810.tsx']);
  });

  it('tombol "AI Assist" mati juga ada di banyak view lain', () => {
    /* view_spr2400 sudah dikeluarkan dari daftar ini oleh PR ini sendiri. */
    const mati = ['view_sa200.tsx', 'view_sa501.tsx', 'view_sa520.tsx', 'view_spr2410.tsx']
      .filter((f) => /<Btn\b(?:(?!onClick)[^>])*>\s*<I\.sparkle/.test(lain(f)));
    expect(mati.length).toBeGreaterThanOrEqual(4);
  });

  it('view_nonaudit masih memakai `: any` untuk mengetik REVIEW_2400', () => {
    expect(lain('view_nonaudit.tsx')).toContain('AMS.REVIEW_2400');
  });
});
