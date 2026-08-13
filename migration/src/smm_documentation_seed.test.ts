import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import {
  auditEqrDocumentation, auditRetention,
  type EqrDocumentation, type RetentionPolicy,
} from './canon_smm_documentation';

/* ============================================================
   Dokumentasi ¶30 & retensi ¶60 DI ATAS DATA NYATA.

   Keputusan Q-5 (Ari, 2026-08-13): retensi dokumentasi SISTEM
   MANAJEMEN MUTU = 5 tahun. ¶60 tidak menetapkan angka — KAP yang
   menetapkan, dan angka itu kini ADA sebagai kebijakan, bukan absen.

   Satu cacat SENGAJA dipertahankan: EQR-063 masih berjalan dengan
   temuan terbuka, sehingga ¶26 menuntut pemberitahuan kekhawatiran
   yang belum tercatat.
   ============================================================ */

type MetaShape = Record<string, { documentation?: EqrDocumentation } | undefined>;
const META = (AMS as unknown as { EQR_META: MetaShape }).EQR_META;
const REVIEWS = (AMS as unknown as { EQR_REVIEWS: Array<{ id: string; reviewer?: string; cleared?: boolean }> }).EQR_REVIEWS;
const RET = (AMS as unknown as { QM_DOC_RETENTION: RetentionPolicy & { basis?: string } }).QM_DOC_RETENTION;

const docFor = (id: string) => {
  const r = REVIEWS.find((x) => x.id === id);
  return auditEqrDocumentation({ reviewer: r?.reviewer, ...((META[id] || {}).documentation || {}) });
};

describe('¶60 — periode retensi dokumentasi sistem manajemen mutu', () => {
  it('ditetapkan 5 tahun (keputusan Q-5)', () => {
    expect(RET.years).toBe(5);
  });

  it('patuh ¶60 — periodenya ADA, bukan absen', () => {
    const a = auditRetention(RET);
    expect(a.compliant).toBe(true);
    expect(a.defects).toEqual([]);
  });

  it('basis menyebut kebijakan KAP, bukan angka yang ditetapkan standar', () => {
    /* ¶60 menyerahkan periodenya kepada KAP; mengatribusikan angka kepada
       standar adalah kekeliruan yang sudah ada di aplikasi. */
    expect(RET.basis).toMatch('Kebijakan KAP');
    expect(RET.regulatoryMinimumYears).toBeNull();
  });
});

describe('¶30 — dokumentasi penelaahan atas seed', () => {
  it('EQR-040 (selesai): dokumentasi LENGKAP kelima butir', () => {
    const a = docFor('EQR-040');
    expect(a.complete).toBe(true);
    expect(a.defects).toEqual([]);
  });

  it('EQR-040 menyebut nama pembantu penelaah ¶30(a)', () => {
    const d = (META['EQR-040'] || {}).documentation;
    expect(d?.assisted).toBe(true);
    expect(d?.assistants).toContain('Bayu Saputra');
  });

  it('EQR-040 mengidentifikasi dokumentasi perikatan yang ditelaah ¶30(b)', () => {
    const d = (META['EQR-040'] || {}).documentation;
    expect((d?.documentsReviewed || []).length).toBeGreaterThanOrEqual(3);
  });

  it('EQR-063 (berjalan, ada temuan): pemberitahuan ¶26 belum tercatat', () => {
    const a = docFor('EQR-063');
    expect(a.complete).toBe(false);
    expect(a.defects).toContain('no-notification-26');
  });

  it('EQR-063 juga belum punya dasar ¶27, pemberitahuan penyelesaian & tanggal', () => {
    const a = docFor('EQR-063');
    for (const d of ['no-completion-basis', 'no-notification-27', 'no-completion-date']) {
      expect(a.defects).toContain(d);
    }
  });

  it('penelaahan yang sudah ditutup wajib berdokumentasi lengkap', () => {
    /* Invarian: bila cleared === true, ¶30 harus terpenuhi. */
    for (const r of REVIEWS.filter((x) => x.cleared)) {
      expect(docFor(r.id).complete, r.id).toBe(true);
    }
  });
});
