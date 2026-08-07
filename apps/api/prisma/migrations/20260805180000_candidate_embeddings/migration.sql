-- CreateTable
CREATE TABLE "candidate_embeddings" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "qdrant_point_id" TEXT,
    "model" TEXT,
    "status" "EmbeddingStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "candidate_embeddings_user_id_key" ON "candidate_embeddings"("user_id");

-- AddForeignKey
ALTER TABLE "candidate_embeddings" ADD CONSTRAINT "candidate_embeddings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
