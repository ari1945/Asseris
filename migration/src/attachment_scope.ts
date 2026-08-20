/* ============================================================
   Asseris — SATU PINTU unggah lampiran berlingkup perikatan
   ------------------------------------------------------------
   CACAT YANG DITUTUP (sapuan isolasi Time & Budget, 2026-08-20).

   `view_sa580` dan `view_sa720` menghitung scopeId lampiran begini:

       const engId = firm?.activeEngagement?.id || 'ENG-2025-014';
       window.amsAttachmentUpload({ scope:'engagement', scopeId: engId, … })

   Fallback itu bukan sekadar angka yang salah di layar. Ia adalah tujuan
   TULIS: tanpa perikatan aktif, surat representasi manajemen SA 580 dan
   dokumen informasi lain SA 720 milik satu klien mendarat di berkas audit
   klien LAIN — lengkap dengan byte, SHA-256, dan kelas retensi. RBAC server
   tidak akan menangkapnya: `ENG-2025-014` adalah perikatan sah yang boleh
   diakses pengguna, jadi tulisannya diterima dan tercatat di jejak audit
   sebagai bukti yang sah pada berkas yang keliru. Membaca angka klien lain
   itu buruk; MENGARSIPKAN bukti ke berkas klien lain adalah pelanggaran
   isolasi W7.5 yang meninggalkan jejak permanen.

   Jawaban yang benar saat tak ada perikatan aktif adalah MENOLAK menulis
   dengan pesan jujur — bukan memilihkan sebuah perikatan. Modul ini
   memegang penolakan itu di satu tempat sehingga dapat diuji secara
   perilaku (bukan sekadar gerbang teks) dan tidak perlu ditulis ulang di
   tiap pemanggil.
   ============================================================ */

/** Pesan penolakan tunggal — dipakai handler DAN ditampilkan di UI. */
export const NO_ENGAGEMENT_ATTACH_MSG =
  'Tidak ada perikatan aktif — lampiran TIDAK diunggah. Pilih perikatan lebih dulu agar bukti terarsip pada berkas audit yang benar.';

/** Berkas + metadata hasil `FileDropField` (byte opsional: drop bisa metadata-only). */
export interface EngagementAttachmentInput {
  collection: string;
  refId: string;
  name: string;
  sha256: string;
  sizeMB: number;
  file?: File;
  retentionClass?: string;
}

/** Bentuk yang disimpan kertas kerja (rep580.v1 / oi720.v1). */
export interface AttachmentRef {
  attachmentId: string;
  attachmentName: string;
  attachmentSha: string;
  attachmentSizeMB: number;
}

/* Kedua cabang menyebut kedua field (yang tak berlaku = `?: undefined`) supaya
   penyempitan tetap bekerja di gerbang `typecheck:test`, yang sengaja berjalan
   dengan `strictNullChecks:false` — di sana diskriminan boolean tidak menyempit
   dan `res.reason` akan dilaporkan TS2339 walau kodenya benar. */
export type EngagementAttachmentResult =
  | { ok: true; ref: AttachmentRef; reason?: undefined }
  | { ok: false; reason: string; ref?: undefined };

/** scopeId perikatan yang SAH, atau '' bila tak ada. Tidak pernah menebak. */
export function engagementScopeId(activeEngagementId?: string | null): string {
  return typeof activeEngagementId === 'string' ? activeEngagementId.trim() : '';
}

/** Boleh melampirkan? Dipakai UI untuk menyembunyikan zona unggah. */
export function canAttachToEngagement(activeEngagementId?: string | null): boolean {
  return engagementScopeId(activeEngagementId) !== '';
}

/**
 * Unggah lampiran ke lingkup perikatan AKTIF.
 *
 * - Tanpa perikatan aktif → `{ ok:false }`. Tidak ada unggahan, tidak ada
 *   tulisan metadata: pemanggil wajib membatalkan seluruh perubahan.
 * - Server absen / menolak → `{ ok:true }` dengan `attachmentId:''`
 *   (degradasi anggun metadata-only, perilaku F0.1 yang dipertahankan).
 */
export async function uploadEngagementAttachment(
  activeEngagementId: string | null | undefined,
  input: EngagementAttachmentInput,
): Promise<EngagementAttachmentResult> {
  const scopeId = engagementScopeId(activeEngagementId);
  if (!scopeId) return { ok: false, reason: NO_ENGAGEMENT_ATTACH_MSG };

  const metadataOnly: AttachmentRef = {
    attachmentId: '',
    attachmentName: input.name,
    attachmentSha: input.sha256,
    attachmentSizeMB: input.sizeMB,
  };
  const upload = typeof window === 'undefined' ? null : window.amsAttachmentUpload;
  if (!input.file || !upload) return { ok: true, ref: metadataOnly };

  try {
    const up = await upload({
      scope: 'engagement',
      scopeId,
      collection: input.collection,
      refId: input.refId,
      meta: { file: input.file, name: input.name, sha256: input.sha256 },
      retentionClass: input.retentionClass,
    });
    return {
      ok: true,
      ref: {
        attachmentId: up.id,
        attachmentName: input.name,
        attachmentSha: up.sha256,
        attachmentSizeMB: +(up.size / 1048576).toFixed(1),
      },
    };
  } catch (e) {
    /* server absen / ditolak: pertahankan metadata (perilaku lama F0.1) */
    return { ok: true, ref: metadataOnly };
  }
}
