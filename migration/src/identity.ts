/* ============================================================
   Asseris — IDENTITAS AUDITOR (modul murni)
   PRD: docs/prd-wp-signoff-integrity.md (PR-1)
   ------------------------------------------------------------
   Diekstraksi dari `contexts.tsx`, yang mengimpor React dan karenanya tak
   dapat dipakai server. Sejak PR-2 server memvalidasi bahwa nama TAMPILAN
   pada sebuah tanda tangan benar-benar milik pengguna sesi; validasi itu
   harus memakai fungsi yang SAMA dengan yang menghasilkannya di klien.

   MURNI: tanpa React, `window`, atau DOM.
   ============================================================ */

/**
 * Sesi (W7) menyimpan nama LENGKAP ('Anindya Pramesti'); data kerja
 * (`WORKPAPERS.preparer/reviewer`, `REVIEW_NOTES.to`, `chain[].by`) memakai
 * bentuk SINGKAT ('Anindya P.'). Fungsi ini menormalkan penuh→singkat.
 * Idempoten: nama yang sudah singkat tetap utuh.
 *
 * ⚠️ LOSSY — DAN ITU PENTING. 'Anindya Pramesti' dan 'Anindya Putri'
 * sama-sama menjadi 'Anindya P.'. Bentuk singkat karena itu TIDAK BOLEH
 * dipakai sebagai kunci identitas; ia hanya label tampilan. Identitas
 * otoritatif adalah `User.id` (lihat `byUserId` pada tanda tangan kertas
 * kerja). Fungsi ini dipakai untuk memverifikasi bahwa label yang ditulis
 * klien cocok dengan pengguna sesi — bukan untuk menentukan siapa dia.
 */
export function amsShortName(full: unknown): string {
  if (!full || typeof full !== 'string') return '';
  const clean = full.replace(/,.*$/, '').trim();        // buang gelar (", CPA")
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return clean;
  const last = parts[parts.length - 1];
  if (/^[A-Z]\.?$/.test(last)) return clean;            // sudah "Nama X." → biarkan
  return `${parts[0]} ${last[0].toUpperCase()}.`;
}

/**
 * Bentuk pembanding untuk nama tampilan: tanpa spasi berlebih, tanpa beda huruf
 * besar-kecil. Dipakai untuk mencocokkan tanda tangan WARISAN yang tak membawa
 * `byUserId` — di mana nama adalah satu-satunya petunjuk yang tersedia.
 *
 * Titik akhir SENGAJA dipertahankan ('anindya p.' ≠ 'anindya p'): membuangnya
 * akan menyatukan dua token yang bisa saja milik orang berbeda, dan pada aturan
 * satu-orang-satu-langkah arah kesalahan yang aman adalah MEMBLOKIR, bukan
 * menggabungkan. Penormalan spasi ditambahkan (bentuk lama di `wp_canon` hanya
 * `trim`) karena '  hartono  w. ' dan 'Hartono W.' adalah orang yang sama, dan
 * gagal mencocokkannya justru MELEWATKAN self-review.
 */
export function normalizeDisplayName(v: unknown): string {
  return String(v == null ? '' : v).trim().replace(/\s+/g, ' ').toLowerCase();
}
