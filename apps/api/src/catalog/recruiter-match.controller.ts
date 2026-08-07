import { Body, Controller, HttpException, Post, UseGuards } from "@nestjs/common";
import { SessionGuard } from "../common/guards/session.guard";
import { RecruiterGuard } from "../common/guards/recruiter.guard";
import { CatalogMatchService } from "./catalog-match.service";

type MatchBody = {
  query?: string;
  limit?: number;
};

@Controller("recruiter/match")
@UseGuards(SessionGuard, RecruiterGuard)
export class RecruiterMatchController {
  constructor(private readonly match: CatalogMatchService) {}

  /** Recruiter catalog-first vector job match for a free-text query. */
  @Post("jobs")
  async matchJobs(@Body() body: MatchBody) {
    try {
      const result = await this.match.matchJobs(
        body.query ?? "",
        body.limit ?? 10,
      );
      return result;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      console.error("Match jobs error:", error);
      throw new HttpException(
        { error: "Failed to match jobs (check Redis/Qdrant/OpenAI)" },
        503,
      );
    }
  }
}
