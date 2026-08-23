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
   sehingga ia kode mati — dicabut pada arc terpisah. */
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
   Mengapa register statis itu tak boleh dibaca — bukti, bukan
   pendapat. Uji ini menyatakan KONTRADIKSINYA secara eksplisit.

   Bila suatu hari uji ini GAGAL, artinya seseorang memperbaiki
   atau mencabut register statisnya. Itu kabar baik: cabut uji ini
   bersama registernya.
   ============================================================ */
describe('register arsip statis tak dapat dipercaya (terdokumentasi)', () => {
  const arc = () => (BO as unknown as { ARCHIVES: ReadonlyArray<Record<string, string | boolean | number>> }).ARCHIVES;
  const arc014 = () => arc().find((a) => a.id === 'ARC-014');
  const box014 = () => RETENTION.archiveBoxes().find((b: { engId: string }) => b.engId === 'ENG-2025-014');

  it('ARC-014 mengklaim tanggal arsip MENDAHULUI tanggal laporannya sendiri', () => {
    const a = arc014();
    const b = box014();
    expect(a, 'ARC-014 ada di register statis').toBeTruthy();
    expect(b?.reportDate, 'kanon punya tanggal laporan').toBeTruthy();
    /* Berkas final dirakit SETELAH opini ditandatangani (SA 230 ¶14 · ¶A21).
       Register statis mengklaim sebaliknya — itu tak mungkin terjadi. */
    expect(String(a?.arsip) < String(b?.reportDate)).toBe(true);
  });

  it('ARC-014 mengklaim "Terkunci" padahal kanon masih Perakitan', () => {
    expect(arc014()?.status).toBe('Terkunci');
    expect(box014()?.status).toBe('Perakitan');
    /* dan ia memberi tanggal musnah untuk berkas yang belum diarsipkan */
    expect(arc014()?.musnah).toBeTruthy();
    expect(box014()?.retentionUntil).toBeNull();
  });

  it('register statis menyembunyikan kotak arsip dan satu legal hold AKTIF', () => {
    const statis = new Set(arc().map((a) => String(a.eng).split(' · ')[0]));
    const kanon = RETENTION.archiveBoxes().map((b: { engId: string }) => b.engId);
    const hilang = kanon.filter((id: string) => !statis.has(id));
    expect(hilang.length, `kotak arsip tak terlihat: ${hilang.join(', ')}`).toBeGreaterThan(0);

    const holdKanon = RETENTION.activeHolds().map((h: { engId: string }) => h.engId);
    expect(holdKanon.length).toBe(2);
    expect(holdKanon.some((id: string) => !statis.has(id)),
      'ada legal hold aktif yang tak muncul di register statis').toBe(true);
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
    /* dan angka kanon BERBEDA dari register statis — jadi mana yang dibaca
       kokpit bukan perbedaan kosmetik */
    const statisTotal = ((BO as unknown as { ARCHIVES: readonly unknown[] }).ARCHIVES).length;
    expect(m.total).not.toBe(statisTotal);
  });
});
