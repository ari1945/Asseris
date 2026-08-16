/* ============================================================
   Asseris — Kepatuhan Kode Etik & AML/PMPJ: LOGIKA MURNI (#3)
   ------------------------------------------------------------
   Fungsi murni + resolver identitas, dipisah dari hook (ethics_gate.tsx)
   agar dapat diuji tanpa React/contexts. Dipakai gerbang sign-off WP &
   penerbitan opini. Lihat ethics_gate.tsx untuk lapisan hook/persist.
   ============================================================ */
import { AMS } from './data';
import { amlState, conductGate } from './canon_conduct';
import type { ConductOverride, HrCase } from './canon_conduct';

export interface EthicsUser { name?: string; email?: string; employeeId?: string }
export interface EthicsDeclRec { signed?: boolean; date?: string; exceptions?: number }
export interface AmlRec { id: string; result?: string; screened?: string }
export interface OverrideRec { by?: string; at?: string; reason?: string; period?: string }
export interface EthicsCompliance {
  empId: string | null;
  signed: boolean;
  amlOk: boolean;
  /** Skrining bersih TETAPI sudah kedaluwarsa (PR-7 · SC-20). */
  amlExpired: boolean;
  /** Kasus disiplin aktif yang memblokir (PR-7 · SC-21). */
  caseBlocked: boolean;
  overridden: boolean;
  ok: boolean;
  blocked: boolean;
  reason: string;
}

export function ethicsPeriod(): string {
  const y = (AMS as unknown as { CPE_REQ?: { year?: number } }).CPE_REQ?.year || 2026;
  return 'TA ' + y;
}

/* Petakan pengguna sesi → id pegawai (EMP-xxx) via email (SSOT STAFF ∪ FIRM_STAFF), fallback nama.
   FIRM_STAFF = pegawai firm-ops (Admin&HR/Finance) yang juga karyawan KAP (data personal sendiri). */
export function resolveEmpId(user: EthicsUser | null | undefined): string | null {
  if (!user) return null;
  const A = AMS as unknown as { STAFF?: Array<{ id: string; name?: string; email?: string }>; FIRM_STAFF?: Array<{ id: string; name?: string; email?: string }> };
  const staff = [...(A.STAFF || []), ...(A.FIRM_STAFF || [])];
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

   GAGAL-TERTUTUP bila pengguna tak terpetakan (empId null). Bentuk lama
   fail-OPEN dengan alasan "tak ada dasar menilai → jangan kunci": akun apa pun
   di luar roster `STAFF ∪ FIRM_STAFF` melewati gerbang Kode Etik/AML tanpa
   jejak, dan `resolveEmpId` mencocokkan email LALU nama — sehingga selisih
   ejaan nama saja sudah cukup membuka gerbang. Untuk gerbang asurans,
   "tak dapat dinilai" tidak boleh berarti "lolos". */
export function ethicsComplianceOf(
  decl: Record<string, EthicsDeclRec> | undefined,
  aml: AmlRec[] | undefined,
  overrides: Record<string, OverrideRec> | undefined,
  empId: string | null,
  period: string,
  /** PR-7 — argumen opsional agar pemanggil lama tetap berjalan. */
  extra?: { asOf?: string; cases?: HrCase[]; caseOverrides?: Record<string, ConductOverride | undefined> },
): EthicsCompliance {
  const asOf = extra?.asOf;
  const cases = extra?.cases;
  const caseOverrides = extra?.caseOverrides;
  if (!empId) {
    return {
      empId: null, signed: false, amlOk: false, amlExpired: false, caseBlocked: false, overridden: false, ok: false, blocked: true,
      reason: 'Identitas pengguna tidak terpetakan ke personel firma — kepatuhan Kode Etik & AML/PMPJ tak dapat dinilai',
    };
  }
  const d = (decl || {})[empId];
  const signed = !!(d && d.signed);
  const a = (aml || []).find(x => x.id === empId);
  /* PR-7 · SC-20 — skrining kedaluwarsa DIPERLAKUKAN SAMA dengan belum bersih.
     Sebelumnya `AML_SCREENING` punya tanggal tanpa masa berlaku, sehingga
     skrining 2026-01-08 berstatus "Bersih" selamanya. */
  const amlSt = amlState(a, asOf || '');
  const amlOk = amlSt.valid;
  const amlExpired = amlSt.clean && amlSt.expired;
  /* PR-7 · SC-21 — kasus disiplin berat/aktif berkategori independensi atau
     kerahasiaan memblokir, dengan override ber-atestasi (keputusan Q-4 b). */
  const cg = conductGate({ emp: empId, cases, overrides: caseOverrides });
  const ov = (overrides || {})[empId];
  const overridden = !!(ov && ov.period === period);
  const ok = overridden || (signed && amlOk && !cg.blocking);
  const why: string[] = [];
  if (!signed) why.push('Deklarasi Kode Etik tahunan belum ditandatangani');
  if (!amlOk) why.push(amlSt.reason || 'Skrining AML/PMPJ belum bersih (tertunda)');
  if (cg.blocking) why.push(cg.reason);
  return {
    empId, signed, amlOk, amlExpired, caseBlocked: cg.blocking, overridden,
    ok, blocked: !ok, reason: ok ? '' : why.join(' · '),
  };
}
