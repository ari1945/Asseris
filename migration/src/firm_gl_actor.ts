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

/** Bentuk minimal `auth.user` yang dibutuhkan atribusi tulis. */
export interface SessionUser {
  id?: string;
  name?: string;
}

/**
 * Nama pelaku dari SESI, atau null bila sesi tak menyediakannya.
 * Tidak ada fallback ke data seed dan tidak ada literal 'Pengguna'.
 */
export function glActor(user: SessionUser | null | undefined): string | null {
  if (!user) return null;
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name ? name : null;
}

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
