/* ============================================================
   Asseris — Kepatuhan Kode Etik & AML/PMPJ: LOGIKA MURNI (#3)
   ------------------------------------------------------------
   Fungsi murni + resolver identitas, dipisah dari hook (ethics_gate.tsx)
   agar dapat diuji tanpa React/contexts. Dipakai gerbang sign-off WP &
   penerbitan opini. Lihat ethics_gate.tsx untuk lapisan hook/persist.
   ============================================================ */
import { AMS } from './data';

export interface EthicsUser { name?: string; email?: string; employeeId?: string }
export interface EthicsDeclRec { signed?: boolean; date?: string; exceptions?: number }
export interface AmlRec { id: string; result?: string }
export interface OverrideRec { by?: string; at?: string; reason?: string; period?: string }
export interface EthicsCompliance {
  empId: string | null;
  signed: boolean;
  amlOk: boolean;
  overridden: boolean;
  ok: boolean;
  blocked: boolean;
  reason: string;
}

export function ethicsPeriod(): string {
  const y = (AMS as unknown as { CPE_REQ?: { year?: number } }).CPE_REQ?.year || 2026;
  return 'TA ' + y;
}

/* Petakan pengguna sesi → id pegawai (EMP-xxx) via email (SSOT STAFF), fallback nama. */
export function resolveEmpId(user: EthicsUser | null | undefined): string | null {
  if (!user) return null;
  const staff = ((AMS as unknown as { STAFF?: Array<{ id: string; name?: string; email?: string }> }).STAFF) || [];
  const email = (user.email || '').toLowerCase();
  if (email) {
    const byEmail = staff.find(s => (s.email || '').toLowerCase() === email);
    if (byEmail) return byEmail.id;
  }
  const name = (user.name || '').trim().toLowerCase();
  if (name) {
    const byName = staff.find(s => (s.name || '').trim().toLowerCase() === name);
    if (byName) return byName.id;
  }
  return null;
}

/* Evaluasi kepatuhan MURNI (tanpa hook) — dipakai UI, hook & uji.
   Fail-open bila pengguna tak terpetakan (empId null): tak ada dasar menilai → jangan kunci. */
export function ethicsComplianceOf(
  decl: Record<string, EthicsDeclRec> | undefined,
  aml: AmlRec[] | undefined,
  overrides: Record<string, OverrideRec> | undefined,
  empId: string | null,
  period: string,
): EthicsCompliance {
  if (!empId) {
    return { empId: null, signed: true, amlOk: true, overridden: false, ok: true, blocked: false, reason: '' };
  }
  const d = (decl || {})[empId];
  const signed = !!(d && d.signed);
  const a = (aml || []).find(x => x.id === empId);
  const amlOk = !!(a && a.result === 'Bersih');
  const ov = (overrides || {})[empId];
  const overridden = !!(ov && ov.period === period);
  const ok = overridden || (signed && amlOk);
  let reason = '';
  if (!ok) {
    if (!signed && !amlOk) reason = 'Deklarasi Kode Etik tahunan belum ditandatangani & skrining AML/PMPJ belum bersih';
    else if (!signed) reason = 'Deklarasi Kode Etik tahunan belum ditandatangani';
    else reason = 'Skrining AML/PMPJ belum bersih (tertunda)';
  }
  return { empId, signed, amlOk, overridden, ok, blocked: !ok, reason };
}
