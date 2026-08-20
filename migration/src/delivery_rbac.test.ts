/* ============================================================
   PRD `docs/prd-delivery-milestones-deepening.md` · PR-1 · SC-1/SC-2.

   Sebelum PR ini, kunci `'deliveryPlan.v1'` tidak punya cabang di `capForWrite`
   dan jatuh ke `return FIRM_ADMIN` (Partner-only). Akibatnya seorang Audit
   Manager menandai milestone selesai / menggeser tanggal, melihatnya berubah di
   layar, lalu tulisannya DITOLAK SENYAP: `assertCanWrite` (server/src/router.ts)
   melempar FORBIDDEN, dan `flush()` (contexts.tsx) hanya menangani
   `isConflict(err)` — FORBIDDEN jatuh ke cabang "offline" yang MEMPERTAHANKAN
   nilai lokal tanpa toast apa pun. Tak ada satu pun sinyal ke pengguna.

   Kelas cacat yang sama persis dengan `priorYear`, `capacityPlan.v1`, dan
   `pipeline` — ketiganya sudah punya cabang; `deliveryPlan.v1` terlewat.
   ============================================================ */
import { describe, expect, it } from 'vitest';
import { CAP, ROLES, can, capForWrite } from './rbac';

const ROLE = {
  partner: 'Engagement Partner',
  manager: 'Audit Manager',
  senior: 'Senior Auditor',
  junior: 'Junior Auditor',
};

describe('capForWrite("firm","deliveryPlan.v1")', () => {
  it('bukan lagi FIRM_ADMIN (default fall-through firm-scope)', () => {
    expect(capForWrite('firm', 'deliveryPlan.v1')).not.toBe(CAP.FIRM_ADMIN);
  });

  it('= ENGAGEMENT_MANAGE — sejajar rencana kapasitas & roster perikatan', () => {
    expect(capForWrite('firm', 'deliveryPlan.v1')).toBe(CAP.ENGAGEMENT_MANAGE);
    expect(capForWrite('firm', 'deliveryPlan.v1')).toBe(capForWrite('firm', 'capacityPlan.v1'));
  });

  it('kunci yang MIRIP tapi tak terdaftar tetap jatuh ke FIRM_ADMIN (cabang tidak kebablasan)', () => {
    expect(capForWrite('firm', 'deliveryPlan')).toBe(CAP.FIRM_ADMIN);
    expect(capForWrite('firm', 'deliveryPlan.v2')).toBe(CAP.FIRM_ADMIN);
  });
});

describe('siapa yang boleh menulis rencana pengiriman', () => {
  const cap = capForWrite('firm', 'deliveryPlan.v1') as string;

  it('Partner & Manajer boleh — merekalah yang memegang komitmen tanggal ke klien', () => {
    expect(can(ROLE.partner, cap)).toBe(true);
    expect(can(ROLE.manager, cap)).toBe(true);
  });

  it('Senior & Junior TIDAK boleh menggeser komitmen pengiriman (Q-4 = opsi a)', () => {
    expect(can(ROLE.senior, cap)).toBe(false);
    expect(can(ROLE.junior, cap)).toBe(false);
  });

  it('peran yang dipakai uji ini benar-benar ada di katalog RBAC', () => {
    Object.values(ROLE).forEach((r) => expect(ROLES).toContain(r));
  });
});
