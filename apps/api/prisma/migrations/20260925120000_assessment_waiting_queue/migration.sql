-- Admission control for live assessments. A session holds a LiveKit room and an agent
-- worker for its whole duration, so concurrency is capped (ASSESSMENT_MAX_ACTIVE) and
-- candidates past the cap wait here instead of being handed a degraded session.
--
-- One row per candidate: `user_id` is the primary key, which is what makes claiming
-- idempotent — a refresh or reconnect cannot create a second queue entry.
--
-- `expires_at` is the source of truth for release, not the application's release call:
-- a crashed tab never calls it, so every row must be able to expire on its own. Rows
-- past it are swept on the next claim.
CREATE TABLE "assessment_slots" (
    "user_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    -- "active" = in a live assessment, "waiting" = queued for a slot.
    "state" TEXT NOT NULL,
    "enqueued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_slots_pkey" PRIMARY KEY ("user_id")
);

-- Serves both the capacity count (state) and the position lookup (state, enqueued_at).
CREATE INDEX "assessment_slots_state_enqueued_at_idx" ON "assessment_slots"("state", "enqueued_at");

-- Sweeping expired rows on every claim.
CREATE INDEX "assessment_slots_expires_at_idx" ON "assessment_slots"("expires_at");
