/* ============================================================
   Asseris — id firma PEMILIK data seed demo (data_part*.ts)
   ------------------------------------------------------------
   Seed demo (`AMS.CLIENTS/ENGAGEMENTS/TEAM/USER/FIRM`) adalah baris milik SATU firma:
   firma demo yang di-seed server sebagai `FIRM-WHR` (server/src/seed.ts `FIRM_ID`).
   Konstanta ini HANYA menyatakan kepemilikan data seed itu — bukan lingkup firma sesi.

   Lingkup firma sesi datang dari `auth.me().firmId` (persist_scope.ts `sessionFirmId`).
   Dulu keduanya satu konstanta (`FIRM_SCOPE_ID = 'FIRM-WHR'`), sehingga setiap firma
   non-demo menulis ke firma demo dan melihat data demo (PRD prd-identitas-firma-sesi A1/A4).
   ============================================================ */
export const SEED_FIRM_ID = 'FIRM-WHR';

/* Perikatan PEMILIK baris seed yang tak berkunci perikatan: neraca saldo `WTB` (data_part1)
   dan struktur grup kanonik (`AMS_CANON.GROUP_SUBS/INTERCO`). Hanya untuk me-RUTE-kan data
   seed ke pemiliknya (fw_canon `wtbForEngagement`, view_newdisc) — BUKAN perikatan cadangan.
   Dulu nilai yang sama dipakai sebagai `DEFAULT_ENG_ID` = "perikatan bila tak ada yang aktif",
   sehingga firma tanpa perikatan membaca & menulis berkas perikatan demo (PRD
   prd-identitas-firma-sesi A7). */
export const SEED_ENGAGEMENT_ID = 'ENG-2025-014';
