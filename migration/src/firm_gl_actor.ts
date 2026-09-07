/* ============================================================
   Firm GL — pelaku (actor) jejak aktivitas, murni & dapat diuji.

   Cacat yang dipaku di sini (view_firmgl.tsx:44 sebelum perubahan):

       const who = (AMS.USER && AMS.USER.name) || 'Pengguna';

   `AMS.USER` adalah DATA SEED, bukan sesi. Sejak W7 identitas datang dari sesi
   terautentikasi (`auth.user` = { ...D.USER, ...profile, id: me.id, name: me.name, … }
   di contexts.tsx:894) — tetapi jejak posting jurnal tetap mencatat nama seed. Siapa
   pun yang menekan "Posting", jejaknya berbunyi nama yang sama; dan bila seed kosong,
   ia mencatat literal 'Pengguna'.

   Posting/membatalkan posting jurnal MENGGESER SELURUH angka keuangan firma. Jejak
   yang salah orang pada aksi sebesar itu lebih buruk daripada tidak ada jejak, karena
   ia terbaca seolah-olah terbukti.

   Karena itu: pelaku diturunkan HANYA dari sesi, dan bila sesi tak menyediakannya,
   aksi tulisnya TIDAK DIJALANKAN — bukan dicatat atas nama fallback.

   Catatan lingkup: `useCurrentAuditor()` (contexts.tsx:280) sengaja JATUH KEMBALI ke
   `AMS.USER.name` karena tugasnya memfilter kepemilikan tampilan ("milik saya"), di
   mana tebakan yang meleset tak merusak apa pun. Untuk ATRIBUSI TULIS, fallback itu
   justru cacatnya — jadi di sini sesi dibaca langsung dan tanpa jaring.
   ============================================================ */

import { sessionActor } from './session_actor';
import type { SessionUser } from './session_actor';

export type { SessionUser };

/**
 * Nama pelaku dari SESI, atau null bila sesi tak menyediakannya.
 * Tidak ada fallback ke data seed dan tidak ada literal 'Pengguna'.
 *
 * Aturannya sendiri kini tinggal di `session_actor.ts` — DMS memakai aturan yang
 * sama untuk log akses SA 230, dan dua salinan aturan berarti dua tempat yang bisa
 * berbeda diam-diam. Nama `glActor` dipertahankan karena ia yang dibaca gerbang
 * sumber `apar_conventions.test.ts` dan dipakai di seluruh `view_firmgl.tsx`.
 */
export const glActor = sessionActor;

/**
 * Boleh menulis GL? Butuh KEDUANYA: kapabilitas (SoD finansial, `CAP.FIRMFIN_EDIT`
 * — server `capForWrite` tetap otoritatif) DAN pelaku sesi yang nyata untuk jejaknya.
 */
export function glWriteAllowed(canEdit: boolean, actor: string | null): boolean {
  return !!canEdit && !!actor;
}

/** Alasan tombol tulis GL tak dapat dipakai — dipakai sebagai `title` kontrol. */
export function glWriteBlockReason(canEdit: boolean, actor: string | null): string {
  if (!canEdit) return 'Posting jurnal dibatasi peran Finance Firma / Partner (SoD finansial)';
  if (!actor) return 'Identitas sesi tidak tersedia — aksi tulis GL dinonaktifkan agar jejaknya tidak mencatat nama yang salah';
  return '';
}
