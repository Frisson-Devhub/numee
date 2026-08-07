-- AlterTable
ALTER TABLE "users" DROP COLUMN IF EXISTS "assistant_question_answers",
DROP COLUMN IF EXISTS "dashboard_data",
DROP COLUMN IF EXISTS "milestone_status";
