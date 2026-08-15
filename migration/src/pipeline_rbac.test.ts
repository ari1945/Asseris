/* ============================================================
   PRD `docs/prd-sales-pipeline-deepening.md` · PR-1 · SC-9.

   Sebelum PR ini, kunci `'pipeline'` tidak punya cabang di `capForWrite` dan
   jatuh ke `return FIRM_ADMIN`. Akibatnya seorang Audit Manager menyeret kartu,
   melihatnya berpindah tahap di layar, lalu tulisannya DITOLAK SENYAP oleh
   server dan kembali saat reload — kelas cacat yang sama persis dengan
   `priorYear`, `capacityPlan.v1`, dan `invoices`.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { CAP, ROLES, can, capForWrite } from './rbac';

const ROLE = {
  partner: 'Engagement Partner',
  manager: 'Audit Manager',
  senior: 'Senior Auditor',
  junior: 'Junior Auditor',
};

describe('capForWrite("firm","pipeline")', () => {
  it('bukan lagi FIRM_ADMIN (default fall-through)', () => {
    expect(capForWrite('firm', 'pipeline')).not.toBe(CAP.FIRM_ADMIN);
  });

  it('= ENGAGEMENT_MANAGE — sejajar roster klien & prospek intake', () => {
    expect(capForWrite('firm', 'pipeline')).toBe(CAP.ENGAGEMENT_MANAGE);
    expect(capForWrite('firm', 'pipeline')).toBe(capForWrite('firm', 'prospects'));
  });
});

describe('siapa yang boleh menulis register peluang', () => {
  const cap = capForWrite('firm', 'pipeline') as string;

  it('Partner & Manajer boleh — business development adalah tugas mereka', () => {
    expect(can(ROLE.partner, cap)).toBe(true);
    expect(can(ROLE.manager, cap)).toBe(true);
  });

  it('Senior & Junior TIDAK boleh menyeret peluang ke Won', () => {
    expect(can(ROLE.senior, cap)).toBe(false);
    expect(can(ROLE.junior, cap)).toBe(false);
  });

  it('peran yang dipakai uji ini benar-benar ada di katalog RBAC', () => {
    Object.values(ROLE).forEach((r) => expect(ROLES).toContain(r));
  });
});
