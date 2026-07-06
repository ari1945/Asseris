import { TRPCError } from '@trpc/server';
import { prisma } from './db';
import { appendAudit } from './audit/log';
import { resolveEmpId, seedForKey, filterPersonalByPopulation, personalPopulation } from './personalScope';

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
  const where = { scope: 'firm', scopeId, key };
  const doc = await prisma.stateDoc.findUnique({ where: { scope_scopeId_key: where } });
  const current = doc ? (JSON.parse(doc.valueJson) as unknown) : await seedForKey(key);
  const next = updater(current, empId);
  const valueJson = JSON.stringify(next ?? null);
  const updatedBy = user.id;

  let version: number;
  if (!doc) {
    const created = await prisma.$transaction(async (tx) => {
      const row = await tx.stateDoc.create({ data: { ...where, valueJson, version: 1, updatedBy } });
      await tx.stateDocHistory.create({ data: { ...where, version: 1, valueJson, updatedBy } });
      return row;
    });
    version = created.version;
  } else {
    version = await prisma.$transaction(async (tx) => {
      const res = await tx.stateDoc.updateMany({
        where: { ...where, version: doc.version },
        data: { valueJson, version: { increment: 1 }, updatedBy },
      });
      if (res.count === 0) throw new TRPCError({ code: 'CONFLICT', message: 'version-mismatch' });
      await tx.stateDocHistory.create({ data: { ...where, version: doc.version + 1, valueJson, updatedBy } });
      return doc.version + 1;
    });
  }
  await appendAudit({ actorUserId: user.id, actorRole: user.role, action: 'SELF_SERVICE', scope: 'firm', scopeId, key, detail: auditDetail });
  const population = await personalPopulation(user, key);
  return { value: filterPersonalByPopulation(key, next, population), version };
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
