-- Stage 5: safe MFA re-enrolment and persistent per-account TOTP throttling.
ALTER TABLE "User" ADD COLUMN "pendingTotpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN "totpFailedAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "totpLockedUntil" TIMESTAMP(3);
