-- F-3 · versi algoritma payload kanonik pada tiap segel.
--
-- Tanpa kolom ini, mengubah definisi payload membuat segel yang SUDAH TERBIT tak
-- dapat direproduksi — artefak audit yang sah akan tampak palsu (R-1 PRD
-- prd-export-seal-identity-ssot). Baris yang sudah ada ditandatangani dengan
-- algoritma V1, jadi DEFAULT 1 adalah pernyataan fakta, bukan sekadar nilai isian.
ALTER TABLE "Seal" ADD COLUMN "sealFormat" INTEGER NOT NULL DEFAULT 1;
