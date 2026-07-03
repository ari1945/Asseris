-- AlterTable
ALTER TABLE "Engagement" ADD COLUMN "archivedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "StateDocHistory" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "valueJson" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedBy" TEXT,

    CONSTRAINT "StateDocHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StateDocHistory_scope_scopeId_key_idx" ON "StateDocHistory"("scope", "scopeId", "key");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "StateDocHistory_scope_scopeId_key_version_key" ON "StateDocHistory"("scope", "scopeId", "key", "version");
