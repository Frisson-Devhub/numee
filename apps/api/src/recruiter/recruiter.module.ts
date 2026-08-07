import { Module } from "@nestjs/common";
import { RecruiterAuthModule } from "./auth/recruiter-auth.module";
import { CompanyModule } from "./company/company.module";
import { TeamModule } from "./team/team.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { JobsModule } from "./jobs/jobs.module";
import { AiJobsModule } from "./ai/ai-jobs.module";
import { EmbeddingsModule } from "./embeddings/embeddings.module";

@Module({
  imports: [
    RecruiterAuthModule,
    CompanyModule,
    TeamModule,
    DashboardModule,
    JobsModule,
    AiJobsModule,
    EmbeddingsModule,
  ],
})
export class RecruiterModule {}
