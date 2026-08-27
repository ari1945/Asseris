/* ============================================================
   Asseris — jam benih aplikasi (SATU tanggal)
   K-02 · PRD `docs/prd-regref-tahap-a2.md` · PR-2.
   ------------------------------------------------------------
   K-02 sudah memaku aturannya: satu-satunya anchor "hari ini" adalah
   `AMS.TODAY`. Dua tahun beku tetap hidup di luar anchor itu dan tak pernah
   tersentuh gerbangnya, karena keduanya berbentuk ANGKA TAHUN, bukan tanggal:

       data_part1.ts  const ROTATION_YEAR = 2026;
       data_part1.ts  const CPE_REQ = { …, year: 2026 };

   Keduanya diketik. Keduanya berarti "tahun berjalan". Keduanya akan tetap
   berkata 2026 pada 1 Januari 2027 — `CPE_REQ.year` bahkan menjadi label yang
   dibaca tiga modul lain sebagai tahun atestasi firma.

   `data_part1` tak dapat mengimpor `data_part4` (arah impornya terbalik), jadi
   tanggalnya tinggal di sini: modul terkecil yang keduanya boleh baca.
   `AMS.TODAY` tetap anchor yang sama — nilainya kini bersumber dari satu
   tempat, bukan diketik di dua.
   ============================================================ */

/** Tanggal "hari ini" untuk seluruh data benih. `AMS.TODAY` bersumber dari sini. */
export const SEED_TODAY = '2026-03-09';

/** Tahun berjalan yang DITURUNKAN dari `SEED_TODAY` — tak pernah diketik terpisah. */
export const SEED_YEAR = Number(SEED_TODAY.slice(0, 4));
