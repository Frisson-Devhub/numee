import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JOB_EMBEDDINGS_QUEUE } from "../../queue/queue.module";
import {
  EmbeddingsService,
  JobEmbeddingsProcessor,
} from "./embeddings.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: JOB_EMBEDDINGS_QUEUE,
    }),
  ],
  providers: [EmbeddingsService, JobEmbeddingsProcessor],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
