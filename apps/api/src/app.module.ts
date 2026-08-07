import { Module } from "@nestjs/common";
import { PrismaModule } from "./prisma/prisma.module";
import { RedisModule } from "./redis/redis.module";
import { MailModule } from "./mail/mail.module";
import { CloudinaryModule } from "./cloudinary/cloudinary.module";
import { QueueModule } from "./queue/queue.module";
import { QdrantModule } from "./qdrant/qdrant.module";
import { AssessmentModule } from "./assessment/assessment.module";
import { AuthModule } from "./auth/auth.module";
import { UserModule } from "./user/user.module";
import { QuestionnaireModule } from "./questionnaire/questionnaire.module";
import { VirtualAssistantModule } from "./virtual-assistant/virtual-assistant.module";
import { AnamModule } from "./anam/anam.module";
import { AdminModule } from "./admin/admin.module";
import { UploadModule } from "./upload/upload.module";
import { RecruiterModule } from "./recruiter/recruiter.module";
import { CatalogModule } from "./catalog/catalog.module";
import { CandidateModule } from "./candidate/candidate.module";

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    MailModule,
    CloudinaryModule,
    QueueModule,
    QdrantModule,
    AssessmentModule,
    AuthModule,
    UserModule,
    QuestionnaireModule,
    VirtualAssistantModule,
    AnamModule,
    AdminModule,
    UploadModule,
    RecruiterModule,
    CatalogModule,
    CandidateModule,
  ],
})
export class AppModule {}
