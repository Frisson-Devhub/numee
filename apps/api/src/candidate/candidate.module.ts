import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CANDIDATE_EMBEDDINGS_QUEUE } from "../queue/queue.module";
import {
  CandidateEmbeddingsProcessor,
  CandidateEmbeddingsService,
} from "./candidate-embeddings.service";
import { CandidateJobMatchService } from "./candidate-job-match.service";
import { CandidateJobsController } from "./candidate-jobs.controller";

@Module({
  imports: [
    BullModule.registerQueue({
      name: CANDIDATE_EMBEDDINGS_QUEUE,
    }),
  ],
  controllers: [CandidateJobsController],
  providers: [
    CandidateEmbeddingsService,
    CandidateEmbeddingsProcessor,
    CandidateJobMatchService,
  ],
  exports: [CandidateEmbeddingsService, CandidateJobMatchService],
})
export class CandidateModule {}
