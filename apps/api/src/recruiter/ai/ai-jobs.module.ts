import { Module } from "@nestjs/common";
import { AiJobsController } from "./ai-jobs.controller";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";

@Module({
  controllers: [AiJobsController],
  providers: [RecruiterGuard],
})
export class AiJobsModule {}
