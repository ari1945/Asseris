import { describe, it, expect } from 'vitest';
import { AMS } from './data';
import {
  para38Coverage, para39bBreaches, normalizePerson,
  type MonEngagement, type MonInspection, type MonEqrReview,
} from './canon_smm_monitoring';

/* ============================================================
   ¶38(c) & ¶39(b) DI ATAS DATA NYATA.

   Uji ini memaku dua temuan yang hanya muncul setelah klaim cakupan
   dihitung, bukan ditulis:

   1. ¶38(c) — hanya SATU perikatan berstatus selesai di register
      (ENG-2025-058, rekan Rudi Gunawan), dan perikatan itu TIDAK
      diinspeksi. Ketiga inspeksi yang terlaksana justru menyasar
      perikatan yang MASIH BERJALAN, sehingga tak satu pun memenuhi
      ¶38(c).

   2. ¶39(b) — INS-25-03 diinspeksi oleh Bayu Saputra atas
      ENG-2025-022, padahal Bayu adalah MANAJER perikatan itu.
      Larangan inspeksi-diri dilanggar oleh seed sendiri.

   Angka & nama di bawah SENGAJA dipaku. Bila berubah, itu harus
   karena register perikatan/inspeksi memang berubah — bukan karena
   gerbangnya dilonggarkan.
   ============================================================ */

const ENGS = (AMS as unknown as { ENGAGEMENTS: MonEngagement[] }).ENGAGEMENTS;
const INSPS = (AMS as unknown as { QM_INSPECTIONS: MonInspection[] }).QM_INSPECTIONS;
const EQRS = (AMS as unknown as { EQR_REVIEWS: MonEqrReview[] }).EQR_REVIEWS;

describe('register perikatan — prasyarat ¶38', () => {
  it('tepat satu perikatan berstatus selesai', () => {
    const completed = ENGS.filter((e) => String(e.status).toLowerCase() === 'completed');
    expect(completed.map((e) => e.id)).toEqual(['ENG-2025-058']);
  });

  it('perikatan selesai itu dipimpin Rudi Gunawan', () => {
    const e = ENGS.find((x) => x.id === 'ENG-2025-058');
    expect(normalizePerson(e?.partner)).toBe('rudi gunawan');
  });

  it('terdapat tiga rekan perikatan aktif', () => {
    const partners = new Set(ENGS.map((e) => normalizePerson(e.partner)).filter(Boolean));
    expect([...partners].sort()).toEqual(['hartono wijaya', 'rudi gunawan', 'sari dewanti']);
  });
});

describe('¶38(c) atas data nyata — GAGAL yang nyata', () => {
  const cov = para38Coverage(ENGS, INSPS);

  it('Rudi Gunawan punya perikatan selesai yang TIDAK diinspeksi', () => {
    const rudi = cov.partners.find((p) => normalizePerson(p.partner) === 'rudi gunawan');
    expect(rudi?.completedEngagements).toEqual(['ENG-2025-058']);
    expect(rudi?.inspectedEngagements).toEqual([]);
    expect(rudi?.satisfied).toBe(false);
  });

  it('gerbang ¶38(c) TIDAK terpenuhi', () => {
    expect(cov.satisfied).toBe(false);
    expect(cov.uncoveredPartners).toEqual(['Rudi Gunawan, CPA']);
  });

  it('Hartono & Sari belum punya perikatan selesai — belum terterap, bukan gagal', () => {
    for (const name of ['hartono wijaya', 'sari dewanti']) {
      const p = cov.partners.find((x) => normalizePerson(x.partner) === name);
      expect(p?.noCompletedEngagement, name).toBe(true);
    }
  });

  it('ketiga inspeksi yang terlaksana menyasar perikatan yang MASIH BERJALAN', () => {
    /* Sah sebagai aktivitas pemantauan, tetapi tak satu pun memenuhi
       ¶38(c) yang menuntut perikatan telah SELESAI. */
    expect([...cov.inspectionsOfIncompleteEngagements].sort())
      .toEqual(['INS-25-01', 'INS-25-02', 'INS-25-03']);
  });

  it('INS-25-04 baru dijadwalkan — belum memberi basis apa pun', () => {
    expect(cov.scheduledNotPerformed).toEqual(['INS-25-04']);
  });
});

describe('¶39(b) atas data nyata — larangan inspeksi-diri DILANGGAR seed', () => {
  const breaches = para39bBreaches(INSPS, ENGS, EQRS);

  it('tepat satu pelanggaran: INS-25-03', () => {
    expect(breaches.map((b) => b.inspection)).toEqual(['INS-25-03']);
  });

  it('Bayu Saputra menginspeksi perikatan yang ia manajeri sendiri', () => {
    const b = breaches[0];
    expect(b.engagement).toBe('ENG-2025-022');
    expect(normalizePerson(b.inspector)).toBe('bayu saputra');
    expect(b.roles).toEqual(['engagement-manager']);
  });

  it('penelaah mutu perikatan tidak merangkap inspektur di perikatan mana pun', () => {
    const qr = breaches.filter((b) => b.roles.indexOf('quality-reviewer') >= 0);
    expect(qr).toEqual([]);
  });
});
