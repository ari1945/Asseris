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
