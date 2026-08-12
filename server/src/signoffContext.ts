/* ============================================================
   PRD prd-sa620-expert-gate-server · PR-1 — PEMUAT konteks sign-off.
   ------------------------------------------------------------
   Pembagian tugas yang disengaja: `signoff.ts` memuat ATURAN (murni, sinkron,
   teruji tanpa DB), berkas ini memuat PENGAMBILAN DATA-nya. Aturan yang harus
   menyentuh Prisma agar dapat diuji adalah aturan yang tak akan diuji.

   Dipanggil HANYA saat `signoffContextNeeds()` mengembalikan kebutuhan — yakni
   saat sebuah tulisan `wpState` benar-benar memperoleh tanda tangan pada ref
   yang digerbang. Suntingan isi kertas kerja biasa tidak menimbulkan query.
   ============================================================ */
import { prisma } from './db';
import { listAttachments } from './attachments/store';
import type { SignoffContext, SignoffContextNeeds } from './signoff';

/**
 * Baca dokumen saudara + id lampiran hidup pada scope YANG SAMA dengan tulisan.
 *
 * `scope`/`scopeId` diteruskan apa adanya dari tulisan yang sedang dijaga — sudah
 * melewati `assertEngagementAccess` — dan kunci saudaranya berasal dari tabel
 * statis di `signoff.ts`, tak pernah dari input klien. Isolasi W7.5 karenanya
 * berlaku sama untuk pembacaan ini.
 */
export async function loadSignoffContext(
  scope: string, scopeId: string, needs: SignoffContextNeeds,
): Promise<SignoffContext> {
  const siblings: Record<string, unknown> = {};
  if (needs.siblingKeys.length) {
    const rows = await prisma.stateDoc.findMany({
      where: { scope, scopeId, key: { in: [...needs.siblingKeys] } },
      select: { key: true, valueJson: true },
    });
    for (const r of rows) {
      /* Dokumen yang tak ada tetap ABSEN dari peta ini (bukan `{}`/`null`), karena
         perbedaan "belum pernah ditulis" vs "kosong" adalah justru yang membedakan
         `expert-gate:no-register` dari gerbang yang berjalan normal. */
      const parsed: unknown = JSON.parse(r.valueJson);
      if (parsed !== null && parsed !== undefined) siblings[r.key] = parsed;
    }
  }
  const liveAttachmentIds: Record<string, readonly string[]> = {};
  for (const collection of needs.attachmentCollections) {
    const metas = await listAttachments(scope, scopeId, collection);
    liveAttachmentIds[collection] = metas.map((m) => m.id);
  }
  return { siblings, liveAttachmentIds };
}
