import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CATALOG_EMBEDDINGS_QUEUE } from "../queue/queue.module";
import {
  CatalogEmbeddingsProcessor,
  CatalogEmbeddingsService,
} from "./catalog-embeddings.service";
import { CatalogMatchService } from "./catalog-match.service";
import { AdminIndustriesController } from "./admin-industries.controller";
import { AdminJobRolesController } from "./admin-job-roles.controller";
import { RecruiterCatalogController } from "./recruiter-catalog.controller";
import { RecruiterMatchController } from "./recruiter-match.controller";
import { AdminGuard } from "../common/guards/admin.guard";
import { RecruiterGuard } from "../common/guards/recruiter.guard";

@Module({
  imports: [
    BullModule.registerQueue({
      name: CATALOG_EMBEDDINGS_QUEUE,
    }),
  ],
  controllers: [
    AdminIndustriesController,
    AdminJobRolesController,
    RecruiterCatalogController,
    RecruiterMatchController,
  ],
  providers: [
    CatalogEmbeddingsService,
    CatalogEmbeddingsProcessor,
    CatalogMatchService,
    AdminGuard,
    RecruiterGuard,
  ],
  exports: [CatalogEmbeddingsService, CatalogMatchService],
})
export class CatalogModule {}
