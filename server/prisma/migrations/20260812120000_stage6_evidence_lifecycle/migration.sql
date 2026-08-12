-- Stage 6: audit-evidence lifecycle. Soft-delete keeps bytes; purge is a deliberate,
-- worker-driven, legal-hold-aware step gated by FIRM_ADMIN approval.

-- Attachment gains the purge lifecycle columns. `blob` is no longer nulled by soft-delete;
-- it stays until the retention worker purges (purgedAt set, blob nulled).
ALTER TABLE "Attachment" ADD COLUMN "purgeScheduledAt" TIMESTAMP(3);
ALTER TABLE "Attachment" ADD COLUMN "purgeApprovedAt" TIMESTAMP(3);
ALTER TABLE "Attachment" ADD COLUMN "purgeApprovedBy" TEXT;
ALTER TABLE "Attachment" ADD COLUMN "purgedAt" TIMESTAMP(3);
ALTER TABLE "Attachment" ADD COLUMN "objectKey" TEXT;

CREATE INDEX "Attachment_deletedAt_purgedAt_idx"
    ON "Attachment"("deletedAt", "purgedAt");

-- Server-side legal hold registry (per-engagement). An active hold suspends purge for every
-- soft-deleted attachment of that engagement until the hold is released (status='Dicabut').
CREATE TABLE "LegalHold" (
    "id" TEXT NOT NULL,
    "engagementId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Aktif',
    "since" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "by" TEXT NOT NULL,
    "releasedOn" TIMESTAMP(3),

    CONSTRAINT "LegalHold_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LegalHold_engagementId_key" ON "LegalHold"("engagementId");
