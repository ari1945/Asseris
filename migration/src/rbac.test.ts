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
const MANAGER = 'Audit Manager';
const SENIOR = 'Senior Auditor';
const JUNIOR = 'Junior Auditor';

describe('RBAC — kapabilitas otoritatif sign-off (segregation of duties)', () => {
  /* Tiap baris = [cap, peran yang BERHAK]. Peran lain HARUS ditolak.
     Ini mengunci semantik gating UI: slot opini, sign-off reviewer WP,
     kliring catatan, dan posting AJE. */
  const matrix: Array<[string, string[]]> = [
    // reviewer sign-off WP + slot Reviu Manajer opini + kliring catatan reviu
    [CAP.SIGNOFF_REVIEWER, [PARTNER, MANAGER]],
    // slot Rekan Perikatan opini + penerbitan opini (finalisasi)
    [CAP.OPINION_APPROVE, [PARTNER]],
    // slot Penelaahan Pengendalian Mutu (EQR) — penelaah independen
    [CAP.EQR_REVIEW, [PARTNER]],
    // posting jurnal penyesuaian + WTB overrides
    [CAP.AJE_EDIT, [PARTNER, MANAGER, SENIOR]],
    // baseline edit kertas kerja (preparer) — semua auditor
    [CAP.WP_EDIT, [PARTNER, MANAGER, SENIOR, JUNIOR]],
    // pengaturan firma & RBAC
    [CAP.FIRM_ADMIN, [PARTNER]],
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
    expect(capForWrite('firm', 'eqrReviews.v2')).toBe(CAP.FIRM_ADMIN);
  });

  it('user scope → null (kepemilikan dicek terpisah di server)', () => {
    expect(capForWrite('user', 'profile')).toBe(null);
  });
});
