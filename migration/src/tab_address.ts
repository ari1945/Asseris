import { buildHash, parseHash } from './route_hash';

/* ============================================================
   Asseris — sumbu TAB sebagai bagian sah dari alamat (PRD V-9).

   Sebelum ini alamat hanya beralamat SATU ARAH, SEKALI, saat mount:
   `useInitialTab` membaca `?tab=` lalu tak pernah menulis balik. Akibatnya
   bilah alamat berbohong begitu pengguna mengklik tab — URL yang disalin
   membuka layar LAIN, reload memindahkan pengguna, dan `hashchange` dari
   Back/Forward tak pernah memulihkan tab.

   Berkas ini menampung dua arah itu, dipisah dari `contexts.tsx` supaya:
   (a) logikanya dapat diuji tanpa menyeret seluruh provider + `api`, dan
   (b) bagian MURNI-nya (`tabFromHash`, `nextTabHash`) teruji di environment
       node biasa, seperti `route_hash.ts` yang ia perluas.

   PENJAGA ANTI-GELUNG (R-1 PRD — ini membekukan app, bukan sekadar
   mengganggu) ada di tiga lapis:
     1. `history.replaceState` TIDAK memicu `hashchange`. Jadi tulisan kita
        tak pernah kembali sebagai pembacaan. Ini penjaga utamanya.
     2. `nextTabHash` mengembalikan null bila hash sudah menyatakan tab itu —
        tak ada tulisan tanpa perubahan.
     3. Pembaca hanya memanggil setState bila nilainya benar-benar berbeda.

   PENJAGA ANTI-BOCOR: setiap fungsi menolak bekerja bila hash saat ini
   menunjuk modul LAIN. Tanpa ini, satu modul yang sedang unmount bisa
   menuliskan tab-nya ke alamat modul yang baru saja dibuka (SC-5).
   ============================================================ */

/** Tab yang diminta URL untuk `moduleId`, atau null bila hash menunjuk modul lain / tanpa tab. */
export function tabFromHash(hash: string | null | undefined, moduleId: string): string | null {
  const loc = parseHash(hash);
  if (!loc || loc.route !== moduleId) return null;
  return loc.tab;
}

/**
 * Hash yang mencerminkan `tab` untuk `moduleId`, dengan `sel` yang ada DIPERTAHANKAN.
 * Mengembalikan **null** bila tak ada yang perlu ditulis:
 *   - hash tak terbaca, atau menunjuk modul lain (jangan rusak alamat orang lain);
 *   - hash sudah menyatakan tab yang sama (penjaga anti-gelung lapis 2).
 */
export function nextTabHash(hash: string | null | undefined, moduleId: string, tab: string): string | null {
  const loc = parseHash(hash);
  if (!loc || loc.route !== moduleId) return null;
  if (loc.tab === tab) return null;
  return buildHash({ route: moduleId, sel: loc.sel, tab });
}

/**
 * Jatuhkan tab yang tak dikenal ke `fallback` (SC-6). Tautan lama yang menunjuk
 * id tab yang sudah di-rename harus mendarat di panel yang berfungsi, bukan panel
 * kosong. `valid` opsional: modul yang tak menyediakannya berperilaku seperti dulu
 * (menerima apa pun) — jadi ini perluasan, bukan perubahan kontrak.
 */
export function coerceTab(tab: string | null, fallback: string, valid?: readonly string[]): string {
  if (tab == null) return fallback;
  if (!valid || valid.length === 0) return tab;
  return valid.indexOf(tab) >= 0 ? tab : fallback;
}

/**
 * Tulis `tab` ke bilah alamat lewat `replaceState`.
 *
 * `replaceState`, BUKAN `pushState` (PRD Q-2 = opsi a): tab di Asseris adalah bagian
 * dari SATU kertas kerja, bukan halaman terpisah. Sepuluh perpindahan tab tak boleh
 * menjadi sepuluh tekan Back sebelum pengguna bisa keluar dari modul. Semantik yang
 * dipilih secara sadar: **Back = keluar dari modul ini.** Back/Forward TETAP
 * memulihkan tab pada jalur yang riwayatnya memang ada (URL ditempel / tautan dibuka),
 * karena di sana peramban sendiri yang membuat entri.
 *
 * Aman dipanggil di luar DOM (uji node, SSR) dan di mode privat — semuanya try/catch.
 * Mengembalikan hash yang ditulis, atau null bila tak menulis apa pun.
 */
export function writeTabToAddress(moduleId: string, tab: string): string | null {
  try {
    if (typeof location === 'undefined' || typeof history === 'undefined') return null;
    const next = nextTabHash(location.hash, moduleId, tab);
    if (next == null) return null;
    history.replaceState(null, '', location.pathname + location.search + next);
    return next;
  } catch (e) {
    return null;   // mode privat / history tak dapat ditulis — navigasi tetap jalan
  }
}
