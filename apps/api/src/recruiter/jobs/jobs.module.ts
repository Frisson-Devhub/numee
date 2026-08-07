import { Module } from "@nestjs/common";
import { JobsController } from "./jobs.controller";
import { RecruiterGuard } from "../../common/guards/recruiter.guard";
import { EmbeddingsModule } from "../embeddings/embeddings.module";

@Module({
  imports: [EmbeddingsModule],
  controllers: [JobsController],
  providers: [RecruiterGuard],
})
export class JobsModule {}
