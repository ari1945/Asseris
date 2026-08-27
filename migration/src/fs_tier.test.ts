/* ============================================================
   §5 — pemetaan ukuran PROPORSIONAL ke anggota skala

   `fsTier` adalah satu-satunya jalan bagi ukuran huruf yang proporsional
   terhadap dimensi lain (diameter Avatar, tinggi FmtBadge). Uji ini mengunci
   dua hal yang mudah rusak diam-diam:

     1. LANTAI — tak ada masukan, sekecil apa pun, yang boleh mendarat di
        bawah 11px. Inilah cacat yang ditutup PR ini: Avatar 16px dulu
        menghasilkan 6,4px dan FmtBadge 38px menghasilkan 7,03px.
     2. KELAS ADA — setiap tier yang mungkin dipancarkan komponen harus punya
        kelas `.fs-*` di styles_base.css. Tier tanpa kelas = font-size warisan
        (13px body), yaitu kegagalan SENYAP: tak ada yang merah, tampilannya
        yang salah.

   Sensus diameternya dibaca dari SUMBER, bukan didaftar tangan — daftar
   tangan akan basi pada pemanggil `<Avatar>` berikutnya dan uji ini akan
   tetap hijau di atas ukuran yang tak pernah diperiksa.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FS_TIER, fsTier, fsTierPx } from './fs_tier';

const SKALA = FS_TIER.map((c) => c.px);

const baca = (f: string): string => readFileSync(join(__dirname, f), 'utf8');

/* Diameter `<Avatar size={N}>` yang benar-benar dipakai di repo. */
const diameterAvatar = (): number[] => {
  const out = new Set<number>();
  for (const f of readdirSync(__dirname).filter((f) => /\.tsx$/.test(f))) {
    for (const m of baca(f).matchAll(/<Avatar[^/>]*?size=\{(\d+)\}/g)) out.add(Number(m[1]));
  }
  /* `view_pc_org.tsx` melewatkan `size={size}` lewat <RefLine size={N}>. */
  for (const m of baca('view_pc_org.tsx').matchAll(/<RefLine[^/>]*?size=\{(\d+)\}/g)) out.add(Number(m[1]));
  return [...out].sort((a, b) => a - b);
};

describe('§5 — fsTier mendaratkan ukuran proporsional di anggota skala', () => {
  it('sensus diameter benar-benar MENEMUKAN pemanggil (bukan nol kecocokan)', () => {
    const d = diameterAvatar();
    expect(d.length).toBeGreaterThan(12);
    /* jangkarnya nilai yang benar-benar dipakai, bukan ujung rentang: ujung
       bergeser tiap kali satu pemanggil berubah dan uji ini akan ikut basi. */
    expect(d).toEqual(expect.arrayContaining([20, 22, 24, 30, 92]));
  });

  it('setiap diameter Avatar nyata mendarat di anggota skala, nol di bawah 11px', () => {
    const nakal: string[] = [];
    for (const d of diameterAvatar()) {
      const px = fsTierPx(d * 0.4);
      if (!SKALA.includes(px)) nakal.push(`Avatar ${d} → ${px} (bukan anggota skala)`);
      if (px < 11) nakal.push(`Avatar ${d} → ${px} (menembus lantai)`);
    }
    expect(nakal).toEqual([]);
  });

  it('tiap diameter Avatar cukup untuk DUA inisial pada ukuran hasil pemetaan', () => {
    /* Lantai 11px punya konsekuensi geometri: lingkaran yang terlalu kecil
       tak lagi memuat inisialnya, dan `.avatar` tidak memotong — hurufnya
       TUMPAH ke luar lingkaran (teks putih di atas latar halaman). Diukur di
       peramban pada 11px/700: pasangan lazim ("AW", "TW") selebar 18,8px,
       yakni 1,71 × ukuran huruf. Ambang 1,8 memberi sedikit ruang.

       Ini yang memaksa enam diameter pencilan (16 · 17 · 18 × 4) naik ke 20 —
       lihat catatan PR. Pasangan berhuruf lebar ("MW" 21,7px · "WW" 23,1px)
       tetap sesak pada tier 20/22; itu tegangan desain yang SUDAH ADA di 34
       situs dan bukan sesuatu yang PR ini putuskan. */
    const sempit: string[] = [];
    for (const d of diameterAvatar()) {
      const fs = fsTierPx(d * 0.4);
      if (d < 1.8 * fs) sempit.push(`Avatar ${d} pada ${fs}px — butuh ≥ ${(1.8 * fs).toFixed(1)}px`);
    }
    expect(sempit).toEqual([]);
  });

  it('FmtBadge 38px — 7,03px yang dulu menembus lantai — mendarat di 11px', () => {
    expect(38 * 0.185).toBeCloseTo(7.03, 2);
    expect(fsTierPx(38 * 0.185)).toBe(11);
  });

  it('lantai 11px berlaku sampai nol dan negatif', () => {
    for (const px of [0, 0.1, 1, 6.4, 7.03, 10.9]) expect(fsTierPx(px)).toBe(11);
  });

  it('proporsi dipertahankan: pemetaannya monoton tak-menurun', () => {
    let prev = 0;
    for (let d = 8; d <= 200; d++) {
      const px = fsTierPx(d * 0.4);
      expect(px, `diameter ${d} mengecil dari ${prev}`).toBeGreaterThanOrEqual(prev);
      prev = px;
    }
  });

  it('tiap tier punya kelas .fs-* di styles_base.css (tier yatim = gagal SENYAP)', () => {
    const css = baca('styles_base.css');
    /* Rujukan tokennya DIRAKIT, tidak ditulis harfiah: `css_tokens.test.ts`
       memindai berkas ini juga dan akan menuduh contoh harfiah sebagai token
       tak terdefinisi (`--fs-` dengan tier yang masih berupa placeholder). */
    const rujukan = (tier: string) => 'var(' + '--' + 'fs-' + tier + ')';
    const hilang = FS_TIER
      .filter((c) => !css.includes(`.fs-${c.tier} { font-size: ${rujukan(c.tier)}; }`))
      .map((c) => `.fs-${c.tier}`);
    expect(hilang).toEqual([]);
  });

  it('`.avatar` TIDAK lagi menetapkan font-size (ia akan mengalahkan kelas fs-*)', () => {
    /* styles_chrome.css dimuat SESUDAH styles_base.css dan spesifisitasnya
       sama; `font-size` di `.avatar` akan memenangkan cascade dan membekukan
       semua avatar di satu ukuran. */
    const blok = /\.avatar\s*\{([^}]*)\}/.exec(baca('styles_chrome.css'));
    expect(blok, '.avatar hilang dari styles_chrome.css').not.toBeNull();
    expect((blok as RegExpExecArray)[1]).not.toMatch(/font-size/);
  });

  it('fsTier memancarkan tier, fsTierPx memancarkan piksel — keduanya sejalan', () => {
    for (const c of FS_TIER) {
      expect(fsTier(c.px)).toBe(c.tier);
      expect(fsTierPx(c.px)).toBe(c.px);
    }
  });
});
