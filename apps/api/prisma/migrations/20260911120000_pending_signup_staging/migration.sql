-- Staging table for in-flight signups, replacing the external Redis (Upstash) store.
-- Rows live only between "details submitted" and "OTP verified"; `expires_at` is the
-- source of truth for expiry and the application sweeps rows past it.
CREATE TABLE "pending_signups" (
    "key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pending_signups_pkey" PRIMARY KEY ("key")
);

CREATE INDEX "pending_signups_expires_at_idx" ON "pending_signups"("expires_at");
