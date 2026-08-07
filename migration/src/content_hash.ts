/* ============================================================
   Asseris — SIDIK JARI ISI (primitif bersama)
   PRD: docs/prd-wp-signoff-integrity.md (PR-1)
   ------------------------------------------------------------
   Diekstraksi dari `aje_contract.ts`, tempat ia lahir untuk mengikat
   persetujuan jurnal pada isi yang disetujuinya. Kertas kerja kini menuntut
   mekanisme yang sama, dan dua salinan fungsi hash adalah cara paling andal
   melahirkan dua jawaban atas satu pertanyaan.

   MURNI & LINTAS-LINGKUNGAN: tanpa React, `window`, DOM, `node:crypto`
   (server-saja), maupun `crypto.subtle` (async + browser-saja). Klien dan
   server WAJIB menghitung nilai yang identik secara sinkron — itulah syarat
   agar sebuah tanda tangan dapat diverifikasi di kedua sisi.

   BUKAN hash kriptografis. FNV-1a dapat ditabrak oleh penyerang yang memang
   berusaha. Ia dipakai untuk mendeteksi PERUBAHAN, bukan menahan pemalsuan
   yang disengaja terhadap basis data; penahan itu adalah otorisasi server +
   `AuditLog` hash-chained. Lihat PRD §8.5.
   ============================================================ */

/* FNV-1a 32-bit dalam aritmetika 32-bit murni (tanpa kehilangan presisi float:
   perkalian 16777619 diuraikan menjadi geseran & penjumlahan). */
function fnv1a(s: string, basis: number): number {
  let h = basis >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h >>> 0;
}

function hex8(n: number): string {
  return (n >>> 0).toString(16).padStart(8, '0');
}

/**
 * Sidik jari 16-hex atas sebuah string kanonik.
 *
 * Dua lintasan dengan offset-basis berbeda, lintasan kedua diberi umpan
 * panjang string, lalu digabung — memperlebar ruang keluaran dari 32 ke 64 bit
 * sehingga tabrakan tak sengaja tidak realistis untuk jumlah dokumen yang
 * ditangani sebuah perikatan.
 *
 * NILAINYA MENGIKAT. Rumus ini tidak boleh berubah: hash yang sudah tersimpan
 * di keputusan persetujuan (`approvals_ov_v4[].decisions[].hash`) dibandingkan
 * dengan hasil fungsi ini, dan mengubah rumusnya akan menggugurkan SELURUH
 * persetujuan yang pernah tercatat.
 *
 * PEMISAH `\x01` DISENGAJA — dan ditulis sebagai escape, bukan sebagai byte
 * mentah. Di `aje_contract.ts` ia dulu berupa karakter kontrol LITERAL di dalam
 * string, yang tak terlihat di sebagian besar editor dan diff: menyalin baris
 * itu dengan mata akan menghasilkan `s + '' + s.length` — rumus yang berbeda,
 * hash yang berbeda, dan seluruh persetujuan tercatat gugur secara senyap.
 * Ia dipertahankan (bukan diganti) justru karena nilainya mengikat.
 */
const LEN_SEP = '\x01';

export function fingerprint(s: string): string {
  return hex8(fnv1a(s, 0x811c9dc5)) + hex8(fnv1a(s + LEN_SEP + s.length, 0x01000193));
}
