import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { JOB_EMBEDDINGS_QUEUE } from "../../queue/queue.module";
import { AdminGuard } from "../../common/guards/admin.guard";
import { AdminJobsController } from "./admin-jobs.controller";
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
  controllers: [AdminJobsController],
  providers: [EmbeddingsService, JobEmbeddingsProcessor, AdminGuard],
  exports: [EmbeddingsService],
})
export class EmbeddingsModule {}
