/* ============================================================
   Pelaku (actor) untuk ATRIBUSI TULIS — aturan tunggal, murni & dapat diuji.

   Satu kalimat yang berlaku di seluruh aplikasi:

       Nama yang ditulis ke jejak audit berasal HANYA dari sesi terautentikasi.
       Bila sesi tak menyediakannya, aksi tulisnya TIDAK DIJALANKAN — bukan
       dicatat atas nama fallback.

   Aturan ini pertama kali dipaku untuk posting jurnal firma (`firm_gl_actor.ts`,
   yang kini mendelegasikan ke sini agar tak ada dua salinan aturan yang sama)
   dan berlaku sama untuk setiap jejak yang mengklaim "siapa melakukan apa":
   log akses dokumen (SA 230), legal hold, versi unggahan, persetujuan.

   Kenapa TIDAK boleh ada fallback pada jalur tulis: jejak yang salah orang lebih
   buruk daripada tidak ada jejak, karena ia terbaca seolah-olah terbukti. Sebuah
   log yang berbunyi "Anindya Pramesti mengunduh" ketika yang mengunduh orang lain
   bukan sekadar kosmetik — ia bukti palsu di berkas yang justru disiapkan untuk
   diperiksa.

   Catatan lingkup — `useCurrentAuditor()` (contexts.tsx) SENGAJA jatuh kembali ke
   `AMS.USER.name`, dan itu benar untuk tugasnya: memfilter kepemilikan TAMPILAN
   ("tugas saya", "catatan saya"), di mana tebakan yang meleset tak merusak apa pun.
   Untuk atribusi TULIS, fallback itu justru cacatnya. Jangan pakai hook itu di sini.
   ============================================================ */

/** Bentuk minimal `auth.user` yang dibutuhkan atribusi tulis. */
export interface SessionUser {
  id?: string;
  name?: string;
}

/**
 * Nama pelaku dari SESI, atau `null` bila sesi tak menyediakannya.
 * Tidak ada fallback ke data seed dan tidak ada literal pengganti.
 */
export function sessionActor(user: SessionUser | null | undefined): string | null {
  if (!user) return null;
  const name = typeof user.name === 'string' ? user.name.trim() : '';
  return name ? name : null;
}
