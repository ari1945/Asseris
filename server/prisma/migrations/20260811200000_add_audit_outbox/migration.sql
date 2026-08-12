-- Stage 4: transactional audit outbox + exactly-once link into AuditLog.
ALTER TABLE "AuditLog" ADD COLUMN "outboxId" TEXT;

CREATE TABLE "AuditOutbox" (
    "id" TEXT NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "enqueuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),
    "checkpointedAt" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "actorUserId" TEXT,
    "actorRole" TEXT,
    "action" TEXT NOT NULL,
    "scope" TEXT,
    "scopeId" TEXT,
    "key" TEXT,
    "detail" TEXT,

    CONSTRAINT "AuditOutbox_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AuditLog_outboxId_key" ON "AuditLog"("outboxId");
CREATE UNIQUE INDEX "AuditOutbox_idempotencyKey_key" ON "AuditOutbox"("idempotencyKey");
CREATE INDEX "AuditOutbox_checkpointedAt_enqueuedAt_idx" ON "AuditOutbox"("checkpointedAt", "enqueuedAt");
