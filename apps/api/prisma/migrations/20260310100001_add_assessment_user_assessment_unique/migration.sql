-- CreateIndex
CREATE UNIQUE INDEX "assessment_user_id_assessment_id_key" ON "assessment"("user_id", "assessment_id");
