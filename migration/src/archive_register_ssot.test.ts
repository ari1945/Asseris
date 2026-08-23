import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BO } from './data_backoffice';
import { RETENTION } from './data_records';

/* ============================================================
   ARC-014 — register arsip bayangan & fallback yang mengarang.

   `data_backoffice.BO.ARCHIVES` / `BO.LEGAL_HOLDS` adalah register
   arsip & legal hold STATIS yang mendahului lapisan Arsip kanonik
   (`data_records.ts`). Sejak kanon ada, keduanya tidak pernah
   diperbarui — dan isinya kini membantah kanon pada hal-hal yang
   tidak mungkin benar (lihat uji "register statis tak dapat
   dipercaya" di bawah).

   Yang membuatnya berbahaya bukan keberadaannya, melainkan
   POLA FALLBACK yang membacanya:

       const RET = window.RETENTION ? window.RETENTION.metrics() : null;
       const recArchives = RET ? RET.total : B.ARCHIVES.length;

   `main.tsx:32` mengimpor `./data_records` secara eager di FASE 1,
   jadi cabang `else` itu tak terjangkau. Tetapi bila suatu saat
   kanon gagal dimuat, aplikasi tidak GAGAL — ia diam-diam menyajikan
   angka arsip karangan sebagai angka firma. Fallback ke data yang
   dikarang lebih buruk daripada tidak ada fallback sama sekali.
   ============================================================ */

const SRC = __dirname;
const readSrc = (f: string) => readFileSync(join(SRC, f), 'utf8');
const stripComments = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

/* Modul yang benar-benar dirender aplikasi (rute hidup). view_bo1.tsx
   sengaja TIDAK di sini: `RecordsRetentionLegacy` di dalamnya tak diekspor
   dan tak terdaftar di lazy_views (rute `records` menuju view_records),
   sehingga ia kode mati. Komponen itu kini SUDAH dicabut — lihat tripwire di bawah. */
const MODUL_HIDUP = ['view_firmops.tsx', 'data_firmops.ts', 'view_records.tsx', 'view_dms.tsx'];

describe('tidak ada modul hidup yang membaca register arsip bayangan', () => {
  for (const f of MODUL_HIDUP) {
    it(`${f} tak menyentuh BO.ARCHIVES / BO.LEGAL_HOLDS`, () => {
      const code = stripComments(readSrc(f));
      expect(code, `${f} membaca register arsip statis`).not.toMatch(/\bB(?:O)?\.ARCHIVES\b/);
      expect(code, `${f} membaca register hold statis`).not.toMatch(/\bB(?:O)?\.LEGAL_HOLDS\b/);
    });
  }

  it('metrik arsip firma tidak punya cabang fallback sama sekali', () => {
    const code = stripComments(readSrc('view_firmops.tsx'));
    /* pola `RET ? RET.x : <sesuatu>` = dua sumber kebenaran untuk satu angka */
    expect(code).not.toMatch(/RET\s*\?\s*RET\./);
    expect(code).not.toMatch(/window\.RETENTION\s*\?/);
    /* kanon dibaca lewat impor ESM, bukan tebakan `window.X` */
    expect(code).toMatch(/from '\.\/data_records'/);
  });

  it('kewajiban pemusnahan firma hanya punya satu sumber', () => {
    const code = stripComments(readSrc('data_firmops.ts'));
    expect(code).not.toMatch(/if\s*\(\s*window\.RETENTION\s*\)/);
    expect(code).toMatch(/disposalObligations/);
  });
});

/* ============================================================
   Register bayangan itu kini TIDAK ADA — dan tak boleh kembali.

   Sampai 2026-08-23 `data_backoffice` memuat tiga register statis
   pra-kanon: RETENTION_POLICY (kebijakan retensi), ARCHIVES (kotak
   arsip) dan LEGAL_HOLDS (penangguhan disposal). Ketiganya dicabut.

   Versi sebelumnya berkas ini MENDOKUMENTASIKAN kontradiksinya
   sebagai assertion — ARC-014 mengklaim diarsipkan 2026-02-28,
   dua puluh hari MENDAHULUI tanggal laporannya sendiri (2026-03-20),
   berstatus "Terkunci" padahal kertas kerjanya masih disunting, dan
   menyembunyikan satu legal hold AKTIF. Uji itu menutup dengan janji:
   "bila suatu hari uji ini gagal, artinya registernya diperbaiki atau
   dicabut — cabut uji ini bersamanya." Hari itu tiba; ini penggantinya.

   Yang membuat register itu bertahan begitu lama tertulis di komentarnya
   sendiri: "Blok ini dipertahankan sbg referensi, tak diekspor."
   Data yang salah yang disimpan "sebagai referensi" tetap data yang
   salah — dan repo ini tidak punya gerbang variabel mati yang akan
   menunjukkannya (no-unused-vars dimatikan di dua blok konfigurasi).
   ============================================================ */
/* Pembagian tugas dengan `backoffice_retention_dead_code.test.ts` (#293): berkas ITU
   menjaga komponen mati view_bo1, daftar ekspornya, rute `records`, dan klaim
   "satu tabel kelas retensi". Berkas INI menjaga registernya sendiri & konsumennya.
   Tak ada assertion yang sengaja diduplikasi antar keduanya. */
describe('register arsip bayangan tidak boleh kembali', () => {
  it('data_backoffice tak lagi mendeklarasikan register arsip/retensi/hold', () => {
    const code = stripComments(readSrc('data_backoffice.ts'));
    for (const nama of ['RETENTION_POLICY', 'ARCHIVES', 'LEGAL_HOLDS']) {
      /* toContain, BUKAN RegExp yang dirakit dari template literal: escape
         word-boundary di dalam template literal JS justru ditafsirkan sebagai
         karakter BACKSPACE, sehingga regex begitu lolos secara VAKUM. */
      expect(code, `${nama} kembali ke data_backoffice`).not.toContain(nama);
    }
  });

  it('BO tidak mengekspor kunci arsip/retensi/hold apa pun', () => {
    const kunci = Object.keys(BO as unknown as Record<string, unknown>);
    const menyerempet = kunci.filter((k) => /ARCHIVE|RETENTION|HOLD/i.test(k));
    expect(menyerempet, `kunci menyerempet arsip: ${menyerempet.join(', ')}`).toEqual([]);
  });

});

/* ============================================================
   Angka arsip di Kokpit Operasi Firma = kanon, dan tetap begitu.
   ============================================================ */
describe('metrik arsip kokpit firma menutup ke kanon', () => {
  it('total / jatuh tempo / hold sama dengan RETENTION.metrics()', () => {
    const m = RETENTION.metrics();
    expect(m.total).toBe(RETENTION.archiveBoxes().length);
    expect(m.due).toBe(RETENTION.disposalQueue().length);
    expect(m.holds).toBe(
      RETENTION.archiveBoxes().filter((b: { status: string }) => b.status === 'Legal Hold').length);
    /* kotak arsip dirakit dari dokumen DMS — bukan daftar yang diketik */
    expect(m.total).toBeGreaterThan(0);
    expect(m.dmsBoxes).toBeGreaterThan(0);
  });

  it('satu legal hold per perikatan yang ditahan, dari registri kanonik', () => {
    const aktif = RETENTION.activeHolds() as ReadonlyArray<{ engId: string }>;
    expect(aktif.length).toBeGreaterThan(0);
    const eng = aktif.map((h) => h.engId);
    expect(new Set(eng).size, 'tak ada hold ganda untuk satu perikatan').toBe(eng.length);
    /* tiap hold aktif benar-benar menahan sebuah kotak arsip */
    for (const id of eng) {
      const box = RETENTION.archiveBoxes().find((b: { engId: string }) => b.engId === id);
      expect(box?.status, `hold ${id} tak tercermin pada kotaknya`).toBe('Legal Hold');
    }
  });
});
