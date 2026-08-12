import { TRPCError } from '@trpc/server';
import { prisma } from './db';
import { resolveEmpId, seedForKey, filterPersonalByPopulation, personalPopulation } from './personalScope';
import { StateDocTooLargeError } from './payloadLimits';
import { mutateStateDoc, StateDocConflictError } from './stateMutation';

/* ============================================================
   2026-07-06 — SELF-SERVICE pegawai dari halaman "Data Personal Saya".
   Pegawai mengajukan cuti / menandatangani deklarasi (independensi, etik) atas NAMANYA
   SENDIRI. Beda dari state.set (di-gate HR_MANAGE, admin): endpoint ini dibuka utk staf
   biasa TAPI server yang menentukan empId dari SESI dan `updater` HANYA menyentuh baris
   milik empId itu (append cuti sendiri / set flag deklarasi sendiri) — tak bisa mengubah
   atau meng-clobber baris pegawai lain. Read-modify-write penuh dilakukan SERVER (yang
   memang boleh baca dokumen penuh), lalu kembalikan nilai yang SUDAH difilter ke pemanggil.
   ============================================================ */

type Principal = { id: string; role: string; name?: string | null; email?: string | null };

async function firmScopeId(): Promise<string> {
  const f = await prisma.firm.findFirst();
  if (!f) throw new TRPCError({ code: 'PRECONDITION_FAILED', message: 'no-firm' });
  return f.id;
}

/** Read-modify-write sebuah dokumen personal (scope=firm) lalu audit. `updater(current, empId)`
 * WAJIB hanya menyentuh baris milik empId. Kembalikan nilai yang sudah difilter utk caller. */
async function writeOwn(
  user: Principal,
  key: string,
  updater: (current: unknown, empId: string) => unknown,
  auditDetail: string,
): Promise<{ value: unknown; version: number }> {
  const empId = await resolveEmpId(user);
  if (!empId) throw new TRPCError({ code: 'FORBIDDEN', message: 'no-emp-mapping' }); // bukan staf terdaftar
  const scopeId = await firmScopeId();
  let written;
  try {
    written = await mutateStateDoc({
      scope: 'firm', scopeId, key,
      updatedBy: user.id,
      actorUserId: user.id,
      actorRole: user.role,
      action: 'SELF_SERVICE',
      auditDetail,
      seed: () => seedForKey(key),
      mutate: (current) => ({ value: updater(current, empId) }),
      maxRetries: 5,
    });
  } catch (e) {
    if (e instanceof StateDocTooLargeError) {
      throw new TRPCError({ code: 'PAYLOAD_TOO_LARGE', message: e.message });
    }
    if (e instanceof StateDocConflictError) {
      throw new TRPCError({ code: 'CONFLICT', message: `version-mismatch:server=${e.currentVersion}` });
    }
    throw e;
  }
  const population = await personalPopulation(user, key);
  return { value: filterPersonalByPopulation(key, written.value, population), version: written.version };
}

function daysBetween(from: string, to: string): number {
  const a = new Date(from).getTime();
  const b = new Date(to).getTime();
  if (isNaN(a) || isNaN(b) || b < a) return 1;
  return Math.round((b - a) / 86_400_000) + 1; // inklusif
}

export type LeaveInput = { type: string; from: string; to: string; reason?: string };

/** Ajukan cuti sendiri → append baris (status 'Menunggu') ke leaveReqs. HR menyetujui di modul Cuti. */
export async function submitLeaveRequest(user: Principal, input: LeaveInput) {
  return writeOwn(
    user,
    'leaveReqs',
    (current, empId) => {
      const list = Array.isArray(current) ? (current as Array<Record<string, unknown>>) : [];
      const mine = list.filter((r) => r && r.emp === empId).length;
      const row = {
        id: 'LV-' + empId.replace('EMP-', '') + '-' + (mine + 1),
        emp: empId,
        name: user.name || empId,
        type: input.type,
        from: input.from,
        to: input.to,
        days: daysBetween(input.from, input.to),
        reason: input.reason || '',
        status: 'Menunggu',
        approver: '',
      };
      return [row, ...list];
    },
    'leave:' + input.type,
  );
}

/** Tandatangani deklarasi sendiri (independensi / etik). */
export async function declareSelf(user: Principal, kind: 'independence' | 'ethics') {
  const today = new Date().toISOString().slice(0, 10);
  if (kind === 'independence') {
    return writeOwn(
      user,
      'independence',
      (current, empId) => {
        const list = Array.isArray(current) ? (current as Array<Record<string, unknown>>) : [];
        if (list.some((r) => r && r.id === empId)) {
          return list.map((r) => (r && r.id === empId ? { ...r, declared: true } : r));
        }
        // Belum ada baris (mis. staf non-partner tak masuk seed INDEPENDENCE) → buat deklarasi minimal.
        return [...list, { id: empId, name: user.name || empId, declared: true, conflicts: 0, finInterest: 'Tidak ada', rotationClient: '—', tenure: 0, rotationLimit: 5, sektorJK: false, sektor: '—', basis: '—', cooloff: 2, listed: false }];
      },
      'declare:independence',
    );
  }
  return writeOwn(
    user,
    'pc.ethics',
    (current, empId) => {
      const obj = current && typeof current === 'object' ? (current as Record<string, { items?: number[] }>) : {};
      const prev = obj[empId] || { items: [] };
      const items = (prev.items && prev.items.length ? prev.items : [1, 1, 1, 1, 1, 1]).map(() => 1);
      return { ...obj, [empId]: { ...prev, signed: true, date: today, exceptions: 0, items } };
    },
    'declare:ethics',
  );
}
