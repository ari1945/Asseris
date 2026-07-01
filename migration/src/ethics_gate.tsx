/* ============================================================
   Asseris — Gerbang Kode Etik & AML/PMPJ (#3 gap matriks FIRM)
   ------------------------------------------------------------
   Deklarasi Kode Etik tahunan + skrining AML/PMPJ WAJIB sah sebelum
   auditor boleh membubuhkan tanda tangan kertas kerja atau menerbitkan
   opini. Bila belum, aksi diblokir dengan LockBanner + arahan ke modul
   Kode Etik. Partner (FIRM_ADMIN) dapat memberi pengecualian sementara
   yang TER-LOG (append-only) agar tak lock-out saat mendesak.

   Lingkup blokir (keputusan Ari): sign-off WP (wp_signoff) + persetujuan/
   finalisasi opini (view_opinion_parts). Penegakan saat ini di LAPISAN UI
   (data deklarasi = seed klien); pemberian override ditulis ke store
   firm-scope 'ethicsOverride.v1' → capForWrite=FIRM_ADMIN (server-enforced).
   Logika murni + resolver di ethics_compliance.ts (dapat diuji tanpa React).
   ============================================================ */
import { AMS } from './data';
import { useAmsPersist, useAuth } from './contexts';
import { CAP } from './rbac';
import {
  ethicsPeriod, resolveEmpId, ethicsComplianceOf,
  type EthicsUser, type EthicsDeclRec, type AmlRec, type OverrideRec, type EthicsCompliance,
} from './ethics_compliance';

export { ethicsPeriod, resolveEmpId, ethicsComplianceOf };
export type { EthicsCompliance };

/* Hook: kepatuhan etik/AML untuk PENGGUNA SESI aktif (yang membubuhkan tanda tangan). */
export function useEthicsGate(): EthicsCompliance & { name: string } {
  const auth = useAuth();
  const [decl] = useAmsPersist('pc.ethics', () => (AMS as unknown as { ETHICS_DECL?: Record<string, EthicsDeclRec> }).ETHICS_DECL || {});
  const [overrides] = useAmsPersist('ethicsOverride.v1', () => ({}));
  const user = (auth && auth.user) as EthicsUser | undefined;
  const empId = resolveEmpId(user);
  const aml = (AMS as unknown as { AML_SCREENING?: AmlRec[] }).AML_SCREENING || [];
  const c = ethicsComplianceOf(decl as Record<string, EthicsDeclRec>, aml, overrides as Record<string, OverrideRec>, empId, ethicsPeriod());
  return { ...c, name: (user && user.name) || 'Auditor' };
}

/* Hook: kelola pengecualian (grant/revoke) — hanya FIRM_ADMIN (Partner). */
export function useEthicsOverrides() {
  const auth = useAuth();
  const [overrides, setOverrides] = useAmsPersist('ethicsOverride.v1', () => ({}));
  const canGrant = !auth || typeof auth.can !== 'function' || auth.can(CAP.FIRM_ADMIN);
  const me = (auth && auth.user && auth.user.name) || 'Partner';
  const period = ethicsPeriod();
  const today = (() => { try { return new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }); } catch (e) { return ''; } })();
  const grant = (empId: string, reason: string) =>
    setOverrides((o: Record<string, OverrideRec>) => ({ ...o, [empId]: { by: me, at: today, reason: reason || 'Pengecualian sementara', period } }));
  const revoke = (empId: string) =>
    setOverrides((o: Record<string, OverrideRec>) => { const n = { ...o }; delete n[empId]; return n; });
  const activeFor = (empId: string): OverrideRec | null => {
    const ov = (overrides as Record<string, OverrideRec>)[empId];
    return ov && ov.period === period ? ov : null;
  };
  return { overrides: overrides as Record<string, OverrideRec>, canGrant, grant, revoke, period, activeFor };
}
