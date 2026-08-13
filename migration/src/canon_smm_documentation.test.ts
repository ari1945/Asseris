import { describe, it, expect } from 'vitest';
import {
  auditEqrDocumentation, smmDocCoverage, auditRetention,
  EQR_DOC_DEFECT_LABEL, SMM_DOC_ELEMENT_LABEL, SMM_DOC_ELEMENTS, RETENTION_DEFECT_LABEL,
  type EqrDocumentation, type EqrDocDefect, type SmmDocElement,
} from './canon_smm_documentation';

/* ============================================================
   Dokumentasi SMM 1 ¶57–60 & SMM 2 ¶28–30.

   Cacat yang ditutup: registri EQR hanya menyimpan `clearedBy` +
   `clearedDate`. TIGA dari lima butir ¶30 tak punya tempat sama
   sekali — nama pembantu penelaah (a), identifikasi dokumentasi
   perikatan yang ditelaah (b), dan pemberitahuan ¶26/¶27 (d).

   ¶60 pun tak pernah ditetapkan; aplikasi menyebut "retensi 10 tahun
   (SMM 1)" — mengatribusikan angka kepada standar yang justru
   menyerahkan periodenya kepada KAP.
   ============================================================ */

const DOC: EqrDocumentation = {
  reviewer: 'Hartono Wijaya, CPA',
  assisted: false, assistants: [],
  documentsReviewed: ['WP-3100 Pendapatan', 'WP-5200 Estimasi', 'Laporan auditor draf v3'],
  completionBasis: 'Seluruh prosedur ¶25 dilaksanakan; tak ada kekhawatiran tersisa.',
  concernsRaised: false, notifiedConcerns: null,
  notifiedCompletion: 'Diberitahukan kepada rekan perikatan 2026-02-22.',
  completionDate: '2026-02-22',
};

const doc = (over: Partial<EqrDocumentation> = {}) => auditEqrDocumentation({ ...DOC, ...over });

describe('SMM 2 ¶30 — kelengkapan dokumentasi penelaahan', () => {
  it('dokumentasi lengkap: tanpa cacat', () => {
    expect(doc().complete).toBe(true);
    expect(doc().defects).toEqual([]);
  });

  it('¶30(a) nama penelaah wajib', () => {
    expect(doc({ reviewer: '  ' }).defects).toContain('no-reviewer-name');
  });

  it('¶30(a) DIBANTU tetapi pembantu tak dinamai: cacat', () => {
    expect(doc({ assisted: true, assistants: [] }).defects).toContain('assistants-not-named');
  });

  it('¶30(a) tidak dibantu adalah keadaan SAH', () => {
    expect(doc({ assisted: false, assistants: [] }).complete).toBe(true);
  });

  it('¶30(a) dibantu DAN dinamai: bersih', () => {
    expect(doc({ assisted: true, assistants: ['Bayu Saputra'] }).complete).toBe(true);
  });

  it('¶30(b) dokumentasi perikatan yang ditelaah wajib diidentifikasi', () => {
    /* Tanpa ini, praktisi berpengalaman lain tak dapat memahami LUAS
       prosedur — justru tujuan ¶30. */
    expect(doc({ documentsReviewed: [] }).defects).toContain('no-documents-reviewed');
  });

  it('¶30(c) dasar penentuan ¶27 wajib', () => {
    expect(doc({ completionBasis: '' }).defects).toContain('no-completion-basis');
  });

  it('¶30(d) kekhawatiran DIANGKAT tetapi pemberitahuan ¶26 tak tercatat: cacat', () => {
    expect(doc({ concernsRaised: true, notifiedConcerns: null }).defects).toContain('no-notification-26');
  });

  it('¶30(d) tanpa kekhawatiran: pemberitahuan ¶26 tidak dituntut', () => {
    expect(doc({ concernsRaised: false, notifiedConcerns: null }).complete).toBe(true);
  });

  it('¶30(d) pemberitahuan penyelesaian ¶27 SELALU dituntut', () => {
    expect(doc({ notifiedCompletion: '' }).defects).toContain('no-notification-27');
  });

  it('¶30(e) tanggal penyelesaian wajib', () => {
    expect(doc({ completionDate: null }).defects).toContain('no-completion-date');
  });

  it('dokumentasi kosong: lima butir tercatat sebagai cacat', () => {
    const a = auditEqrDocumentation(null);
    expect(a.complete).toBe(false);
    for (const d of ['no-reviewer-name', 'no-documents-reviewed', 'no-completion-basis',
      'no-notification-27', 'no-completion-date'] as EqrDocDefect[]) {
      expect(a.defects).toContain(d);
    }
  });

  it('setiap cacat punya kalimat siap-tampil', () => {
    const codes = Object.keys(EQR_DOC_DEFECT_LABEL) as EqrDocDefect[];
    expect(codes).toHaveLength(7);
    for (const c of codes) expect(EQR_DOC_DEFECT_LABEL[c].length).toBeGreaterThan(20);
  });
});

describe('SMM 1 ¶58–59 — kelengkapan dokumentasi sistem manajemen mutu', () => {
  const ALL = SMM_DOC_ELEMENTS;

  it('sembilan elemen terdaftar, masing-masing berlabel', () => {
    expect(ALL).toHaveLength(9);
    for (const e of ALL) expect(SMM_DOC_ELEMENT_LABEL[e].length).toBeGreaterThan(20);
  });

  it('KAP jaringan: ¶59 ikut dituntut', () => {
    const c = smmDocCoverage(ALL.filter((e) => e !== 'network-matters'), true);
    expect(c.missing).toEqual(['network-matters']);
    expect(c.complete).toBe(false);
  });

  it('KAP non-jaringan: ¶59 tidak dituntut', () => {
    const c = smmDocCoverage(ALL.filter((e) => e !== 'network-matters'), false);
    expect(c.missing).toEqual([]);
    expect(c.complete).toBe(true);
  });

  it('basis kesimpulan ¶58(e) yang hilang terdeteksi', () => {
    const c = smmDocCoverage(ALL.filter((e) => e !== 'conclusion-basis'), true);
    expect(c.missing).toContain('conclusion-basis');
  });

  it('kosong: seluruh elemen hilang', () => {
    expect(smmDocCoverage([], true).missing).toHaveLength(9);
    expect(smmDocCoverage(null, false).missing).toHaveLength(8);
  });
});

describe('SMM 1 ¶60 — periode retensi dokumentasi SISTEM MANAJEMEN MUTU', () => {
  it('belum ditetapkan: cacat — ¶60 menuntut KAP MENETAPKAN', () => {
    expect(auditRetention(null).defects).toEqual(['not-established']);
    expect(auditRetention({ years: null }).compliant).toBe(false);
    expect(auditRetention({ years: 0 }).compliant).toBe(false);
  });

  it('lima tahun (keputusan Ari, Q-5): patuh', () => {
    const a = auditRetention({ years: 5 });
    expect(a.compliant).toBe(true);
    expect(a.years).toBe(5);
  });

  it('lebih pendek dari minimum peraturan: cacat', () => {
    const a = auditRetention({ years: 3, regulatoryMinimumYears: 5 });
    expect(a.defects).toEqual(['below-regulatory-minimum']);
  });

  it('sama dengan minimum peraturan: patuh', () => {
    expect(auditRetention({ years: 5, regulatoryMinimumYears: 5 }).compliant).toBe(true);
  });

  it('tanpa minimum peraturan: angka KAP yang berlaku', () => {
    expect(auditRetention({ years: 5, regulatoryMinimumYears: null }).compliant).toBe(true);
  });

  it('setiap cacat retensi punya label', () => {
    expect(Object.keys(RETENTION_DEFECT_LABEL)).toHaveLength(2);
  });
});
