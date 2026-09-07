// W7.5 — per-engagement data isolation. The enforcement boundary that complements W7's
// capability gate: capabilities say "what actions a role may do", this says "which engagements
// a user may touch the working data of". A user has access iff their role has
// ENGAGEMENT_VIEW_ALL (Partner/Manager oversight) OR they are a row in EngagementMember.
import { TRPCError } from '@trpc/server';
import { prisma } from './db';
import { can, CAP } from './rbac';

/*
 * D3 (fail-closed tenancy) — `firmId` WAJIB, bukan opsional.
 *
 * Sebelumnya tipe ini menerima `firmId?: string | null` dan setiap cek lintas-firma di bawah
 * dibungkus `if (user.firmId) { … }`. Artinya principal tanpa firmId LOLOS tanpa satu pun cek
 * batas firma — gagal TERBUKA. Itu aman selama `User.firmId` non-nullable dan setiap principal
 * berasal dari sesi, tapi itu aman-karena-konvensi: satu pemanggil baru yang merakit principal
 * sendiri (uji, skrip, jalur webhook) cukup untuk membuka batasnya tanpa satu baris pun berubah
 * di berkas ini.
 *
 * Sekarang firmId wajib di TIPE (kompilator menolak pemanggil yang tak memasoknya) DAN diperiksa
 * saat runtime oleh assertFirmScoped (jaring untuk pemanggil JS tak-bertipe). Dua lapis disengaja:
 * batas keamanan tak boleh bergantung pada satu mekanisme saja.
 */
type Principal = { id: string; role: string; firmId: string };

/** Fail-closed: principal tanpa firmId tak pernah lolos batas apa pun. */
export function assertFirmScoped(user: { firmId?: string | null }): string {
  const firmId = user.firmId;
  if (!firmId) throw new TRPCError({ code: 'FORBIDDEN', message: 'firm-unresolved' });
  return firmId;
}

/** True if (userId, engagementId) is a membership row. */
export async function isEngagementMember(userId: string, engagementId: string): Promise<boolean> {
  const m = await prisma.engagementMember.findUnique({
    where: { engagementId_userId: { engagementId, userId } },
  });
  return m !== null;
}

/** Throw FORBIDDEN unless the user may access this engagement's working data. */
export async function assertEngagementAccess(user: Principal, engagementId: string): Promise<void> {
  const firmId = assertFirmScoped(user);
  const engagement = await prisma.engagement.findUnique({
    where: { id: engagementId },
    select: { firmId: true },
  });
  if (!engagement || engagement.firmId !== firmId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'cross-firm-engagement' });
  }
  if (can(user.role, CAP.ENGAGEMENT_VIEW_ALL)) return;
  if (await isEngagementMember(user.id, engagementId)) return;
  throw new TRPCError({ code: 'FORBIDDEN', message: 'not-engagement-member' });
}

/**
 * The engagements a user may access: 'all' for oversight roles, else the member id list.
 *
 * D3 — `'all'` berarti "seluruh perikatan DI DALAM FIRMA PEMANGGIL", tak pernah lintas firma.
 * Nilai itu sendiri tak membawa firmId, jadi setiap pemanggil WAJIB menyilangkannya dengan
 * `firmId: user.firmId` pada query-nya (ketiga pemanggil di router.ts melakukannya). Filter firma
 * pada cabang keanggotaan kini TANPA SYARAT — dulu ia menempel hanya bila firmId kebetulan ada.
 */
export async function accessibleEngagementIds(user: Principal): Promise<'all' | string[]> {
  const firmId = assertFirmScoped(user);
  if (can(user.role, CAP.ENGAGEMENT_VIEW_ALL)) return 'all';
  const rows = await prisma.engagementMember.findMany({
    where: { userId: user.id, engagement: { firmId } },
    select: { engagementId: true },
  });
  return rows.map((r) => r.engagementId);
}
