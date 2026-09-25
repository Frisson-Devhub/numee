import { Global, Module } from "@nestjs/common";
import { AssessmentQueueController } from "./assessment-queue.controller";
import { AssessmentQueueService } from "./assessment-queue.service";

/** Admission control for live assessments (see AssessmentQueueService). */
@Global()
@Module({
  controllers: [AssessmentQueueController],
  providers: [AssessmentQueueService],
  exports: [AssessmentQueueService],
})
export class AssessmentQueueModule {}
