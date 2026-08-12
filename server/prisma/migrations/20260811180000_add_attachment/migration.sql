-- Production migration for the real attachment store. The model was added to schema.prisma
-- after the Postgres baseline, so a fresh `prisma migrate deploy` previously omitted it.
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "refId" TEXT,
    "name" TEXT NOT NULL,
    "mime" TEXT,
    "size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "retentionClass" TEXT,
    "storageKind" TEXT NOT NULL DEFAULT 'inline',
    "blob" TEXT,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "deletedBy" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Attachment_scope_scopeId_collection_idx"
    ON "Attachment"("scope", "scopeId", "collection");

CREATE INDEX "Attachment_scope_scopeId_refId_idx"
    ON "Attachment"("scope", "scopeId", "refId");
