-- D2 — konektor DIMILIKI satu firma.
--
-- Sebelum ini `Connector` tak punya kolom tenant sama sekali dan `id` adalah kunci global
-- ('coretax'). Dua akibatnya nyata: dua firma tak mungkin sama-sama punya konektor Coretax, dan
-- pada database bersama, baris ConnectorToken (kredensial terenkripsi) satu firma terjangkau
-- query firma lain. Pola perbaikannya meniru tabel "Role": surrogate id + identitas alami unik
-- PER FIRMA.
--
-- CATATAN PENTING: migrasi ini TIDAK menulis ulang satu pun foreign key. `Connector.id` tetap
-- primary key bertipe TEXT; baris lama mempertahankan nilai lamanya ('bank'), hanya baris BARU
-- yang memakai cuid. Karena itu "SyncJob"."connectorId" dan "ConnectorToken"."connectorId" tetap
-- valid apa adanya — tak ada rebuild tabel, tak ada jendela di mana FK menggantung.

-- 1) `key` = identitas stabil yang dilihat klien. Untuk baris lama ia PERSIS id lamanya, sehingga
--    kontrak kawat tRPC (connectorId: 'bank') terus menunjuk baris yang sama.
ALTER TABLE "Connector" ADD COLUMN "key" TEXT;
UPDATE "Connector" SET "key" = "id" WHERE "key" IS NULL;

-- 2) `firmId` — backfill ke SATU-SATUNYA firma pada instance. Model deploy hari ini single-tenant
--    (satu EC2 + satu DB per firma, docs/DEPLOY.md), jadi pada instance nyata sub-query ini selalu
--    mengembalikan tepat satu baris. Bila DB punya >1 firma (hanya DB uji/demo), konektor jatuh ke
--    firma dengan id terkecil secara deterministik — bukan acak, dan tetap dapat dipindahkan
--    operator dengan UPDATE setelahnya.
ALTER TABLE "Connector" ADD COLUMN "firmId" TEXT;
UPDATE "Connector" SET "firmId" = (SELECT "id" FROM "Firm" ORDER BY "id" ASC LIMIT 1) WHERE "firmId" IS NULL;

-- 3) Konektor yang TETAP tak ter-atribusi hanya mungkin bila tabel "Firm" kosong — yaitu DB
--    pra-bootstrap. Baris seperti itu tak dapat dijangkau siapa pun (setiap pembacaan kini
--    di-scope firma), jadi ia yatim, bukan data yang hilang. Dihapus beserta anaknya agar
--    constraint NOT NULL di bawah dapat ditegakkan tanpa kompromi.
DELETE FROM "ConnectorToken" WHERE "connectorId" IN (SELECT "id" FROM "Connector" WHERE "firmId" IS NULL);
DELETE FROM "SyncJob"        WHERE "connectorId" IN (SELECT "id" FROM "Connector" WHERE "firmId" IS NULL);
DELETE FROM "Connector"      WHERE "firmId" IS NULL;

-- 4) Kunci kedua kolom.
ALTER TABLE "Connector" ALTER COLUMN "key" SET NOT NULL;
ALTER TABLE "Connector" ALTER COLUMN "firmId" SET NOT NULL;

-- 5) Identitas alami: satu konektor per (firma, key).
CREATE UNIQUE INDEX "Connector_firmId_key_key" ON "Connector"("firmId", "key");
CREATE INDEX "Connector_firmId_idx" ON "Connector"("firmId");

-- 6) Integritas referensial ke Firm. RESTRICT (bukan CASCADE) konsisten dengan "Role": menghapus
--    firma yang masih punya konektor harus GAGAL, bukan diam-diam membuang kredensialnya.
ALTER TABLE "Connector" ADD CONSTRAINT "Connector_firmId_fkey"
  FOREIGN KEY ("firmId") REFERENCES "Firm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
