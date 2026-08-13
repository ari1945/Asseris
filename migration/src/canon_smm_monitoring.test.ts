import { describe, it, expect } from 'vitest';
import {
  para38Coverage, para39bBreaches, breachLabel,
  normalizePerson, isCompletedEngagement, isPerformedInspection,
  SELF_INSPECTION_LABEL,
  type MonEngagement, type MonInspection, type MonEqrReview,
} from './canon_smm_monitoring';

/* ============================================================
   Pemantauan ¶38 & ¶39(b).

   ¶38(c) sebelumnya hanya STRING di `QM_MON_ACTIVITIES`
   ('≥1 perikatan / partner') — klaim cakupan yang tak pernah
   dihitung. ¶39(b) tidak ditegakkan sama sekali.

   Dua syarat yang mudah terlewat dan diuji khusus di sini:
   inspeksi harus atas perikatan yang telah SELESAI (¶38), dan
   inspeksi yang baru DIJADWALKAN belum memberi basis apa pun (¶36).
   ============================================================ */

const eng = (id: string, over: Partial<MonEngagement> = {}): MonEngagement =>
  ({ id, partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', status: 'Completed', ...over });

const insp = (id: string, over: Partial<MonInspection> = {}): MonInspection =>
  ({ id, eng: 'E-1', inspector: 'Citra Halim', grade: 'Memuaskan', ...over });

describe('normalizePerson', () => {
  it('membuang gelar & menyamakan huruf', () => {
    expect(normalizePerson('Rudi Gunawan, CPA')).toBe('rudi gunawan');
    expect(normalizePerson('  RUDI   GUNAWAN ')).toBe('rudi gunawan');
    expect(normalizePerson('Sari Dewanti, CPA')).toBe(normalizePerson('sari dewanti'));
  });

  it('nama kosong / null aman', () => {
    expect(normalizePerson(null)).toBe('');
    expect(normalizePerson(undefined)).toBe('');
  });
});

describe('prasyarat ¶38 & ¶36', () => {
  it('hanya status selesai/arsip yang dihitung selesai', () => {
    expect(isCompletedEngagement(eng('E', { status: 'Completed' }))).toBe(true);
    expect(isCompletedEngagement(eng('E', { status: 'Arsip' }))).toBe(true);
    expect(isCompletedEngagement(eng('E', { status: 'Fieldwork' }))).toBe(false);
    expect(isCompletedEngagement(eng('E', { status: 'Review' }))).toBe(false);
    expect(isCompletedEngagement(eng('E', { status: null }))).toBe(false);
  });

  it('inspeksi berstatus Dijadwalkan belum terlaksana', () => {
    expect(isPerformedInspection(insp('I', { grade: 'Dijadwalkan' }))).toBe(false);
    expect(isPerformedInspection(insp('I', { grade: 'Memuaskan' }))).toBe(true);
  });
});

describe('para38Coverage — ¶38(c) satu perikatan selesai per rekan', () => {
  it('rekan dengan perikatan selesai yang diinspeksi: terpenuhi', () => {
    const c = para38Coverage([eng('E-1')], [insp('I-1', { eng: 'E-1' })]);
    expect(c.satisfied).toBe(true);
    expect(c.uncoveredPartners).toEqual([]);
    expect(c.partners[0].inspectedEngagements).toEqual(['E-1']);
  });

  it('rekan dengan perikatan selesai yang TIDAK diinspeksi: gagal', () => {
    const c = para38Coverage([eng('E-1')], []);
    expect(c.satisfied).toBe(false);
    expect(c.uncoveredPartners).toEqual(['Rudi Gunawan, CPA']);
  });

  it('inspeksi atas perikatan BELUM selesai tidak memenuhi ¶38(c)', () => {
    /* "Hot review" adalah aktivitas pemantauan yang sah, tetapi ¶38
       berbicara tentang perikatan yang telah SELESAI. */
    const c = para38Coverage(
      [eng('E-1', { status: 'Fieldwork' }), eng('E-2')],
      [insp('I-1', { eng: 'E-1' })],
    );
    expect(c.inspectionsOfIncompleteEngagements).toEqual(['I-1']);
    expect(c.uncoveredPartners).toEqual(['Rudi Gunawan, CPA']);   // E-2 selesai & tak diinspeksi
    expect(c.satisfied).toBe(false);
  });

  it('inspeksi yang baru DIJADWALKAN tidak memenuhi ¶38(c)', () => {
    const c = para38Coverage([eng('E-1')], [insp('I-1', { eng: 'E-1', grade: 'Dijadwalkan' })]);
    expect(c.scheduledNotPerformed).toEqual(['I-1']);
    expect(c.satisfied).toBe(false);
    expect(c.uncoveredPartners).toEqual(['Rudi Gunawan, CPA']);
  });

  it('rekan TANPA perikatan selesai: belum terterap, bukan gagal', () => {
    const c = para38Coverage([eng('E-1', { status: 'Planning' })], []);
    expect(c.partners[0].noCompletedEngagement).toBe(true);
    expect(c.uncoveredPartners).toEqual([]);
    expect(c.satisfied).toBe(true);
  });

  it('gagal bila SATU dari beberapa rekan tak tercakup', () => {
    const c = para38Coverage(
      [eng('E-1'), eng('E-2', { partner: 'Sari Dewanti, CPA' })],
      [insp('I-1', { eng: 'E-1' })],
    );
    expect(c.uncoveredPartners).toEqual(['Sari Dewanti, CPA']);
    expect(c.satisfied).toBe(false);
  });

  it('gelar tidak memecah satu rekan menjadi dua', () => {
    const c = para38Coverage(
      [eng('E-1', { partner: 'Rudi Gunawan, CPA' }), eng('E-2', { partner: 'Rudi Gunawan' })],
      [insp('I-1', { eng: 'E-1' })],
    );
    expect(c.partners).toHaveLength(1);
    expect(c.satisfied).toBe(true);
  });

  it('input kosong/null aman', () => {
    expect(para38Coverage(null, null).satisfied).toBe(true);
    expect(para38Coverage([], []).partners).toEqual([]);
  });
});

describe('para39bBreaches — larangan inspeksi-diri', () => {
  const ENGS = [eng('E-1', { partner: 'Rudi Gunawan, CPA', manager: 'Bayu Saputra', team: ['Dimas Raharjo'] })];
  const EQR: MonEqrReview[] = [{ eng: 'E-1', reviewer: 'Hartono Wijaya, CPA' }];

  it('inspektur netral: tidak ada pelanggaran', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Citra Halim' })], ENGS, EQR);
    expect(b).toEqual([]);
  });

  it('rekan perikatan menginspeksi perikatannya sendiri: pelanggaran', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Rudi Gunawan, CPA' })], ENGS, EQR);
    expect(b).toHaveLength(1);
    expect(b[0].roles).toContain('engagement-partner');
  });

  it('MANAJER perikatan menginspeksi perikatannya sendiri: pelanggaran', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Bayu Saputra' })], ENGS, EQR);
    expect(b).toHaveLength(1);
    expect(b[0].roles).toContain('engagement-manager');
  });

  it('anggota tim perikatan menginspeksi perikatannya sendiri: pelanggaran', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Dimas Raharjo' })], ENGS, EQR);
    expect(b[0].roles).toContain('engagement-team');
  });

  it('PENELAAH MUTU perikatan menginspeksi perikatan yang sama: pelanggaran', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Hartono Wijaya, CPA' })], ENGS, EQR);
    expect(b[0].roles).toContain('quality-reviewer');
  });

  it('satu orang bisa melanggar lewat lebih dari satu peran', () => {
    const engs = [eng('E-1', { partner: 'Rudi Gunawan, CPA', manager: 'Rudi Gunawan, CPA' })];
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Rudi Gunawan' })], engs, []);
    expect(b[0].roles).toEqual(['engagement-partner', 'engagement-manager']);
  });

  it('inspeksi yang baru DIJADWALKAN tetap diperiksa', () => {
    /* Penunjukan inspektur yang tak eligible harus tertangkap SEBELUM
       inspeksinya berjalan. */
    const b = para39bBreaches(
      [insp('I-1', { eng: 'E-1', inspector: 'Bayu Saputra', grade: 'Dijadwalkan' })], ENGS, EQR);
    expect(b).toHaveLength(1);
  });

  it('inspeksi atas perikatan yang tak dikenal diabaikan', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-TIDAK-ADA', inspector: 'Bayu Saputra' })], ENGS, EQR);
    expect(b).toEqual([]);
  });

  it('kalimat pelanggaran memuat nama, peran & perikatan', () => {
    const b = para39bBreaches([insp('I-1', { eng: 'E-1', inspector: 'Bayu Saputra' })], ENGS, EQR);
    const s = breachLabel(b[0]);
    expect(s).toContain('Bayu Saputra');
    expect(s).toContain('E-1');
    expect(s).toContain(SELF_INSPECTION_LABEL['engagement-manager']);
  });

  it('input kosong/null aman', () => {
    expect(para39bBreaches(null, null, null)).toEqual([]);
  });
});
