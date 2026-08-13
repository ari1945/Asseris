import { describe, it, expect } from 'vitest';
import {
  assessReviewerEligibility, assessAssistantEligibility, coolingOffStatus,
  impairmentAction, eqrClearGate, normalizeName,
  ELIGIBILITY_DEFECT_LABEL, IMPAIRMENT_ACTION_LABEL, CLEAR_BLOCKER_LABEL,
  type EqrReviewerInput, type PartnerTenureRow, type EngagementTeamRef, type EligibilityDefect,
} from './canon_eqr_eligibility';

/* ============================================================
   Eligibilitas penelaah mutu perikatan ¶17–23.

   Cacat yang ditutup: `view_eqr.tsx` menutup gerbang dengan
       canClear = allChecked && openFindings === 0 && !r.cleared
   — eligibilitas TIDAK IKUT SAMA SEKALI, sehingga penelaah yang tak
   memenuhi syarat dapat membuka gerbang penerbitan opini.

   `coolingOk/compOk/objOk` pun boolean yang DITULIS TANGAN di seed,
   dan ¶19 tak pernah dihitung.
   ============================================================ */

const YEAR = 2026;

const OK: EqrReviewerInput = {
  reviewer: 'Hartono Wijaya, CPA', appointedBy: 'QM Leader',
  competenceAssessed: true, sufficientTime: true, authorityEstablished: true,
  objectivityThreat: false, independenceConfirmed: true, regulatoryEligible: true,
  impaired: false,
};

const TEAM: EngagementTeamRef = { partner: 'Rudi Gunawan, CPA', manager: 'Citra Halim', team: ['Dimas Raharjo'] };

const HIST: PartnerTenureRow[] = [
  { eng: 'ENG-2025-063', clientId: 'C-063', partner: 'Rudi Gunawan, CPA', year: 2025 },
  { eng: 'ENG-2025-063', clientId: 'C-063', partner: 'Sari Dewanti, CPA', year: 2023 },
];

const assess = (over: Partial<EqrReviewerInput> = {}, hist = HIST, year = YEAR) =>
  assessReviewerEligibility({ ...OK, ...over }, TEAM, 'ENG-2025-063', 'C-063', hist, year);

describe('normalizeName', () => {
  it('gelar dibuang & huruf disamakan', () => {
    expect(normalizeName('Hartono Wijaya, CPA')).toBe('hartono wijaya');
    expect(normalizeName(null)).toBe('');
  });
});

describe('¶19 — periode jeda dua tahun DITURUNKAN', () => {
  it('tak pernah menjabat rekan perikatan: jeda terpenuhi', () => {
    const c = coolingOffStatus('Hartono Wijaya, CPA', 'ENG-2025-063', 'C-063', HIST, YEAR);
    expect(c.lastServedYear).toBeNull();
    expect(c.elapsed).toBe(true);
  });

  it('menjabat TAHUN LALU: jeda BELUM terpenuhi', () => {
    const c = coolingOffStatus('Rudi Gunawan, CPA', 'ENG-2025-063', 'C-063', HIST, YEAR);
    expect(c.lastServedYear).toBe(2025);
    expect(c.yearsSince).toBe(1);
    expect(c.elapsed).toBe(false);
  });

  it('menjabat tepat dua tahun lalu: terpenuhi', () => {
    const c = coolingOffStatus('Rudi Gunawan, CPA', 'ENG-2025-063', 'C-063', HIST, 2027);
    expect(c.yearsSince).toBe(2);
    expect(c.elapsed).toBe(true);
  });

  it('menjabat tiga tahun lalu: terpenuhi', () => {
    const c = coolingOffStatus('Sari Dewanti, CPA', 'ENG-2025-063', 'C-063', HIST, YEAR);
    expect(c.lastServedYear).toBe(2023);
    expect(c.elapsed).toBe(true);
  });

  it('periode lebih panjang bila diharuskan peraturan (¶19 mengizinkan)', () => {
    const c = coolingOffStatus('Sari Dewanti, CPA', 'ENG-2025-063', 'C-063', HIST, YEAR, 5);
    expect(c.requiredYears).toBe(5);
    expect(c.elapsed).toBe(false);
  });

  it('riwayat KLIEN ikut dihitung, bukan hanya perikatan', () => {
    const h: PartnerTenureRow[] = [{ clientId: 'C-063', partner: 'Budi Santoso', year: 2025 }];
    expect(coolingOffStatus('Budi Santoso', 'ENG-LAIN', 'C-063', h, YEAR).elapsed).toBe(false);
  });

  it('riwayat perikatan/klien LAIN tidak menghalangi', () => {
    const h: PartnerTenureRow[] = [{ eng: 'ENG-LAIN', clientId: 'C-999', partner: 'Budi Santoso', year: 2025 }];
    expect(coolingOffStatus('Budi Santoso', 'ENG-2025-063', 'C-063', h, YEAR).elapsed).toBe(true);
  });
});

describe('¶18 — kriteria eligibilitas, GAGAL-TERTUTUP', () => {
  it('seluruh syarat terpenuhi: eligible', () => {
    const r = assess();
    expect(r.eligible).toBe(true);
    expect(r.defects).toEqual([]);
  });

  it('penelaah adalah REKAN PERIKATAN: tidak eligible', () => {
    const r = assess({ reviewer: 'Rudi Gunawan, CPA' });
    expect(r.defects).toContain('engagement-team-member');
    expect(r.defects).toContain('cooling-off-not-elapsed');
    expect(r.eligible).toBe(false);
  });

  it('penelaah adalah MANAJER perikatan: tidak eligible', () => {
    expect(assess({ reviewer: 'Citra Halim' }).defects).toContain('engagement-team-member');
  });

  it('penelaah adalah anggota tim: tidak eligible', () => {
    expect(assess({ reviewer: 'Dimas Raharjo' }).defects).toContain('engagement-team-member');
  });

  const OMITTED: Array<[keyof EqrReviewerInput, EligibilityDefect]> = [
    ['competenceAssessed', 'competence-not-assessed'],
    ['sufficientTime', 'insufficient-time'],
    ['authorityEstablished', 'authority-not-established'],
    ['independenceConfirmed', 'independence-not-confirmed'],
    ['regulatoryEligible', 'regulatory-ineligible'],
  ];
  for (const [field, defect] of OMITTED) {
    it(`"${String(field)}" belum dinyatakan ⇒ ${defect} (ketiadaan bukti bukan bukti)`, () => {
      const r = assess({ [field]: null } as Partial<EqrReviewerInput>);
      expect(r.defects).toContain(defect);
      expect(r.eligible).toBe(false);
    });
  }

  it('ancaman objektivitas teridentifikasi: tidak eligible', () => {
    expect(assess({ objectivityThreat: true }).defects).toContain('objectivity-threat');
  });

  it('belum ditunjuk individu berwenang ¶17: tidak eligible', () => {
    expect(assess({ appointedBy: '  ' }).defects).toContain('not-appointed');
  });

  it('input kosong: TIDAK eligible, bukan lolos', () => {
    const r = assessReviewerEligibility(null, TEAM, 'E', 'C', [], YEAR);
    expect(r.eligible).toBe(false);
    expect(r.defects.length).toBeGreaterThan(4);
  });

  it('setiap cacat punya kalimat siap-tampil', () => {
    const codes = Object.keys(ELIGIBILITY_DEFECT_LABEL) as EligibilityDefect[];
    expect(codes).toHaveLength(10);
    for (const c of codes) expect(ELIGIBILITY_DEFECT_LABEL[c].length).toBeGreaterThan(20);
  });
});

describe('¶20 — eligibilitas individu yang membantu penelaah', () => {
  it('pembantu yang memenuhi syarat: eligible', () => {
    const r = assessAssistantEligibility(
      { name: 'Bayu Saputra', competenceAssessed: true, sufficientTime: true, independenceConfirmed: true }, TEAM);
    expect(r.eligible).toBe(true);
  });

  it('pembantu yang anggota tim perikatan: tidak eligible', () => {
    const r = assessAssistantEligibility(
      { name: 'Dimas Raharjo', competenceAssessed: true, sufficientTime: true, independenceConfirmed: true }, TEAM);
    expect(r.defects).toContain('engagement-team-member');
  });

  it('pembantu tanpa penilaian kompetensi: tidak eligible', () => {
    const r = assessAssistantEligibility({ name: 'Bayu Saputra' }, TEAM);
    expect(r.defects).toContain('competence-not-assessed');
    expect(r.defects).toContain('insufficient-time');
  });
});

describe('¶22–23 — tindakan ketika eligibilitas menurun', () => {
  it('belum menurun: tak ada tindakan', () => {
    expect(impairmentAction(false, true)).toBe('none');
  });

  it('menurun SEBELUM penelaahan dimulai: tolak penunjukan ¶23(a)', () => {
    expect(impairmentAction(true, false)).toBe('decline-appointment');
  });

  it('menurun SESUDAH penelaahan dimulai: hentikan ¶23(b)', () => {
    expect(impairmentAction(true, true)).toBe('stop-review');
  });

  it('penelaah yang eligibilitasnya menurun tidak lagi eligible', () => {
    expect(assess({ impaired: true }).defects).toContain('eligibility-impaired');
  });

  it('setiap tindakan punya label', () => {
    expect(Object.keys(IMPAIRMENT_ACTION_LABEL)).toHaveLength(3);
  });
});

describe('eqrClearGate — eligibilitas kini BAGIAN DARI SYARAT', () => {
  const eligible = assess();
  const ineligible = assess({ competenceAssessed: null });

  it('checklist lengkap + tanpa temuan + penelaah eligible: boleh ditutup', () => {
    const g = eqrClearGate({ checklistComplete: true, openFindings: 0, alreadyCleared: false, eligibility: eligible });
    expect(g.canClear).toBe(true);
    expect(g.blockers).toEqual([]);
  });

  it('REGRESI: checklist lengkap & tanpa temuan TETAPI penelaah tidak eligible ⇒ TERKUNCI', () => {
    /* Aturan lama akan mengembalikan canClear=true di sini. */
    const g = eqrClearGate({ checklistComplete: true, openFindings: 0, alreadyCleared: false, eligibility: ineligible });
    expect(g.canClear).toBe(false);
    expect(g.blockers).toContain('reviewer-ineligible');
  });

  it('pembantu yang tidak eligible juga mengunci (¶20)', () => {
    const g = eqrClearGate({
      checklistComplete: true, openFindings: 0, alreadyCleared: false,
      eligibility: eligible, ineligibleAssistants: ['Dimas Raharjo'],
    });
    expect(g.canClear).toBe(false);
    expect(g.blockers).toContain('assistant-ineligible');
  });

  it('temuan terbuka mengunci (¶26)', () => {
    const g = eqrClearGate({ checklistComplete: true, openFindings: 1, alreadyCleared: false, eligibility: eligible });
    expect(g.blockers).toContain('open-findings');
  });

  it('checklist belum lengkap mengunci (¶25)', () => {
    const g = eqrClearGate({ checklistComplete: false, openFindings: 0, alreadyCleared: false, eligibility: eligible });
    expect(g.blockers).toContain('checklist-incomplete');
  });

  it('sudah ditutup tidak bisa ditutup ulang', () => {
    const g = eqrClearGate({ checklistComplete: true, openFindings: 0, alreadyCleared: true, eligibility: eligible });
    expect(g.blockers).toContain('already-cleared');
  });

  it('setiap penghalang punya kalimat siap-tampil', () => {
    expect(Object.keys(CLEAR_BLOCKER_LABEL)).toHaveLength(5);
  });
});
