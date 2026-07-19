/* ============================================================
   RBAC capability matrix — regression net for the role-gated
   sign-off fix (PRD "Penegakan Sign-off Berbasis Peran", Fase 3).

   rbac.ts is the SSOT imported by BOTH the client UI (can() → gate
   tombol) and the server (capForWrite → gate state.set). Memaku
   matriks di sini melindungi KEDUA lapis: bila seseorang tak sengaja
   memberi SIGNOFF_REVIEWER ke Junior, atau menggeser capForWrite,
   uji ini gagal. Pure (tanpa window) — fit harness node.
   ============================================================ */
import { describe, it, expect } from 'vitest';
import { ROLES, CAP, can, capForWrite } from './rbac';

const PARTNER = 'Engagement Partner';
const LEAD = 'Rekan Pemimpin';   // Managing Partner (2026-07-05)
const REKAN = 'Rekan';           // partner otonom (2026-07-05)
const MANAGER = 'Audit Manager';
const SENIOR = 'Senior Auditor';
const JUNIOR = 'Junior Auditor';
const HR_FIRMA = 'Admin & HR Firma';
const FIN_FIRMA = 'Finance Firma';
/* Ketiga peran tingkat-partner berbagi PARTNER_BASE (audit + oversight + admin/tulis);
   bedanya HANYA cap BACA personal (lihat blok "Isolasi Data Personal" di bawah). */
const PARTNERS = [PARTNER, LEAD, REKAN];

describe('RBAC — kapabilitas otoritatif sign-off (segregation of duties)', () => {
  /* Tiap baris = [cap, peran yang BERHAK]. Peran lain HARUS ditolak.
     Ini mengunci semantik gating UI: slot opini, sign-off reviewer WP,
     kliring catatan, dan posting AJE. */
  const matrix: Array<[string, string[]]> = [
    // reviewer sign-off WP + slot Reviu Manajer opini + kliring catatan reviu
    [CAP.SIGNOFF_REVIEWER, [...PARTNERS, MANAGER]],
    // slot Rekan Perikatan opini + penerbitan opini (finalisasi)
    [CAP.OPINION_APPROVE, [...PARTNERS]],
    // slot Penelaahan Pengendalian Mutu (EQR) — penelaah independen
    [CAP.EQR_REVIEW, [...PARTNERS]],
    // posting jurnal penyesuaian + WTB overrides
    [CAP.AJE_EDIT, [...PARTNERS, MANAGER, SENIOR]],
    // baseline edit kertas kerja (preparer) — semua auditor
    [CAP.WP_EDIT, [...PARTNERS, MANAGER, SENIOR, JUNIOR]],
    // pengaturan firma & RBAC
    [CAP.FIRM_ADMIN, [...PARTNERS]],
    // override gerbang transisi fase meski ada blocker (mulai Eksekusi tanpa akseptasi/surat; arsip belum lengkap)
    [CAP.PHASE_OVERRIDE, [...PARTNERS]],
    // 2026-07-01 — tulis dokumen People & Compliance firm-wide (payroll/cuti/kinerja/SKP/independensi/etik)
    [CAP.HR_MANAGE, [...PARTNERS, HR_FIRMA]],
    // 2026-07-05 — buka modul manajemen SDM (rekrutmen/pelatihan-kompetensi/suksesi) = Partner + HRD; auditor & Finance DIBLOKIR
    [CAP.HR_MODULE_VIEW, [...PARTNERS, HR_FIRMA]],
    // tulis dokumen Firm Finance (ERP): GL/AP/pajak firma/rekonsiliasi bank
    [CAP.FIRMFIN_EDIT, [...PARTNERS, FIN_FIRMA]],
  ];

  matrix.forEach(([cap, allowed]) => {
    ROLES.forEach((role) => {
      const expected = allowed.includes(role);
      it(`${role} ${expected ? 'BOLEH' : 'TIDAK boleh'} ${cap}`, () => {
        expect(can(role, cap)).toBe(expected);
      });
    });
  });

  it('Junior & Senior TIDAK punya satu pun kapabilitas sign-off otoritatif', () => {
    [JUNIOR, SENIOR].forEach((role) => {
      expect(can(role, CAP.SIGNOFF_REVIEWER)).toBe(false);
      expect(can(role, CAP.OPINION_APPROVE)).toBe(false);
      expect(can(role, CAP.EQR_REVIEW)).toBe(false);
    });
  });

  it('Manager BOLEH slot Manajer tapi TIDAK boleh slot Partner/EQR (regresi exploit)', () => {
    expect(can(MANAGER, CAP.SIGNOFF_REVIEWER)).toBe(true);
    expect(can(MANAGER, CAP.OPINION_APPROVE)).toBe(false);
    expect(can(MANAGER, CAP.EQR_REVIEW)).toBe(false);
  });

  it('deny-by-default: peran/kapabilitas tak dikenal → false', () => {
    expect(can('Hacker', CAP.OPINION_APPROVE)).toBe(false);
    expect(can(PARTNER, 'cap.tidak.ada')).toBe(false);
    expect(can(undefined, CAP.WP_EDIT)).toBe(false);
  });

  it('peran firm-ops (Admin & HR Firma, Finance Firma) TIDAK punya satu pun kapabilitas kerja perikatan', () => {
    [HR_FIRMA, FIN_FIRMA].forEach((role) => {
      expect(can(role, CAP.WP_EDIT)).toBe(false);
      expect(can(role, CAP.AJE_EDIT)).toBe(false);
      expect(can(role, CAP.SIGNOFF_REVIEWER)).toBe(false);
      expect(can(role, CAP.OPINION_APPROVE)).toBe(false);
      expect(can(role, CAP.ENGAGEMENT_VIEW_ALL)).toBe(false);
      expect(can(role, CAP.ENGAGEMENT_MANAGE)).toBe(false);
    });
  });

  it('Admin & HR Firma TIDAK boleh FIRMFIN_EDIT; Finance Firma TIDAK boleh HR_MANAGE (silo lintas-fungsi)', () => {
    expect(can(HR_FIRMA, CAP.FIRMFIN_EDIT)).toBe(false);
    expect(can(FIN_FIRMA, CAP.HR_MANAGE)).toBe(false);
  });
});

describe('RBAC — capForWrite (gate dokumen server, dikonsumsi state.set)', () => {
  /* Mengunci batas saat ini: sign-off hidup di wpState/reviewNotes yang
     hanya butuh WP_EDIT (semua peran) → inilah alasan penegakan per-slot
     WAJIB di-lapis ulang (UI sekarang; server finer = Fase 2). Bila key
     ini berpindah cap, uji ini gagal → perubahan harus disengaja. */
  it('engagement: aje/wtbOverrides → AJE_EDIT; sisanya → WP_EDIT', () => {
    expect(capForWrite('engagement', 'aje')).toBe(CAP.AJE_EDIT);
    expect(capForWrite('engagement', 'wtbOverrides')).toBe(CAP.AJE_EDIT);
    expect(capForWrite('engagement', 'wpState')).toBe(CAP.WP_EDIT);
    expect(capForWrite('engagement', 'opinionDoc.v1')).toBe(CAP.WP_EDIT);
    expect(capForWrite('engagement', 'reviewNotes')).toBe(CAP.WP_EDIT);
  });

  it('firm: roster (clients/engagements/prospects) → ENGAGEMENT_MANAGE; sisanya → FIRM_ADMIN', () => {
    expect(capForWrite('firm', 'clients')).toBe(CAP.ENGAGEMENT_MANAGE);
    expect(capForWrite('firm', 'engagements')).toBe(CAP.ENGAGEMENT_MANAGE);
    expect(capForWrite('firm', 'prospects')).toBe(CAP.ENGAGEMENT_MANAGE);
    // priorYear = kertas kerja pengalaman tahun lalu (SA 220.A24), data-entry tim perikatan —
    // sejajar roster, BUKAN FIRM_ADMIN. Keputusan keberlanjutan otoritatif tetap FIRM_ADMIN.
    expect(capForWrite('firm', 'priorYear')).toBe(CAP.ENGAGEMENT_MANAGE);
    expect(capForWrite('firm', 'continuanceDecisions')).toBe(CAP.FIRM_ADMIN);
    expect(capForWrite('firm', 'eqrReviews.v2')).toBe(CAP.FIRM_ADMIN);
  });

  it('firm: dokumen People & Compliance (payroll/cuti/kinerja/SKP/independensi/etik + key baru Isolasi Data Personal) → HR_MANAGE', () => {
    ['payrollRun', 'payrollData', 'leaveReqs', 'leaveBalance', 'perfPeople', 'perfGoals', 'cpeExtra', 'cpeLog',
      'hrCases', 'amlScreening', 'staffProfile', 'independence', 'indepAppr', 'indepThreats', 'indepRotAck',
      'pc.ethics', 'pc.gifts'].forEach((key) => {
      expect(capForWrite('firm', key)).toBe(CAP.HR_MANAGE);
    });
  });

  it('firm: dokumen Firm Finance/ERP (GL/AP/pajak firma/rekonsiliasi bank) → FIRMFIN_EDIT', () => {
    ['firmgl', 'firmap', 'firmtax', 'bankrecon'].forEach((key) => {
      expect(capForWrite('firm', key)).toBe(CAP.FIRMFIN_EDIT);
    });
  });

  it('user scope → null (kepemilikan dicek terpisah di server)', () => {
    expect(capForWrite('user', 'profile')).toBe(null);
  });
});

describe('RBAC — Isolasi Data Personal (cakupan berjenjang self/unit/firm)', () => {
  const FIRM_CAPS = [CAP.PERSONAL_PAYROLL_VIEW_FIRM, CAP.PERSONAL_LEAVE_VIEW_FIRM, CAP.PERSONAL_PERF_VIEW_FIRM, CAP.PERSONAL_CPE_VIEW_FIRM, CAP.PERSONAL_CONDUCT_VIEW_FIRM, CAP.PERSONAL_INDEP_VIEW_FIRM, CAP.PERSONAL_PROFILE_VIEW_FIRM];
  const UNIT_CAPS = [CAP.PERSONAL_PAYROLL_VIEW_UNIT, CAP.PERSONAL_LEAVE_VIEW_UNIT, CAP.PERSONAL_PERF_VIEW_UNIT, CAP.PERSONAL_CPE_VIEW_UNIT, CAP.PERSONAL_CONDUCT_VIEW_UNIT, CAP.PERSONAL_INDEP_VIEW_UNIT, CAP.PERSONAL_PROFILE_VIEW_UNIT];

  it('Rekan Pemimpin → SELURUH cap *.viewFirm (lihat data personal seluruh firma)', () => {
    FIRM_CAPS.forEach((c) => expect(can(LEAD, c)).toBe(true));
  });
  it('Rekan → SELURUH cap *.viewUnit, TAPI TIDAK *.viewFirm (otonomi unit sendiri)', () => {
    UNIT_CAPS.forEach((c) => expect(can(REKAN, c)).toBe(true));
    FIRM_CAPS.forEach((c) => expect(can(REKAN, c)).toBe(false));
  });
  it('Admin & HR → SELURUH cap *.viewFirm (SDM firma)', () => {
    FIRM_CAPS.forEach((c) => expect(can(HR_FIRMA, c)).toBe(true));
  });
  it('Finance → HANYA payroll.viewFirm; TIDAK data SDM lain (granular per jenis)', () => {
    expect(can(FIN_FIRMA, CAP.PERSONAL_PAYROLL_VIEW_FIRM)).toBe(true);
    [CAP.PERSONAL_PERF_VIEW_FIRM, CAP.PERSONAL_CONDUCT_VIEW_FIRM, CAP.PERSONAL_LEAVE_VIEW_FIRM, CAP.PERSONAL_PROFILE_VIEW_FIRM].forEach((c) => expect(can(FIN_FIRMA, c)).toBe(false));
  });
  it('DECOUPLING: Engagement Partner (punya FIRM_ADMIN) TIDAK otomatis lihat data personal (self-only)', () => {
    expect(can(PARTNER, CAP.FIRM_ADMIN)).toBe(true); // masih admin
    [...FIRM_CAPS, ...UNIT_CAPS].forEach((c) => expect(can(PARTNER, c)).toBe(false)); // tapi tak lihat data personal orang lain
  });
  it('Auditor (Manager/Senior/Junior) → TANPA cap personal (self-only)', () => {
    [MANAGER, SENIOR, JUNIOR].forEach((role) => {
      [...FIRM_CAPS, ...UNIT_CAPS].forEach((c) => expect(can(role, c)).toBe(false));
    });
  });
});
