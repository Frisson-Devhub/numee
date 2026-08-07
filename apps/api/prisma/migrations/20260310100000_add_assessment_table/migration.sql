-- CreateTable
CREATE TABLE "assessment" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "assessment_question_answers" JSONB,
    "assessment_data" JSONB,
    "milestone_status" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_user_id_idx" ON "assessment"("user_id");

-- AddForeignKey
ALTER TABLE "assessment" ADD CONSTRAINT "assessment_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
