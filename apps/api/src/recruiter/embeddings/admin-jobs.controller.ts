import { Controller, HttpException, Post, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../../common/guards/session.guard";
import { AdminGuard } from "../../common/guards/admin.guard";
import { EmbeddingsService } from "./embeddings.service";

@Controller("admin/jobs")
@UseGuards(SessionGuard, AdminGuard)
export class AdminJobsController {
  constructor(private readonly embeddings: EmbeddingsService) {}

  /**
   * Enqueue embedding rebuild for all PUBLISHED jobs (Qdrant `jobs` collection).
   * Admin session required; use after changing embedding text shape.
   */
  @Post("reindex-embeddings")
  async reindexEmbeddings() {
    try {
      return await this.embeddings.reindexAllPublishedJobs();
    } catch (error) {
      console.error("Admin job embedding reindex error:", error);
      throw new HttpException(
        { error: "Failed to reindex job embeddings." },
        500,
      );
    }
  }
}
